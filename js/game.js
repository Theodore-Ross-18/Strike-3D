class StrikeGame {
  constructor() {
    this.mode = 'BASE';

    // Account Profile
    this.accountProfile = null;

    // Resources
    this.credits = 1000;
    this.maxCredits = 3000;
    this.plasma = 1000;
    this.maxPlasma = 3000;
    this.gems = 50;

    // Laboratory Research Levels
    this.labResearch = {
      ENFORCER: 1,
      JUGGERNAUT: 1,
      SPECTRE: 1,
      DRONE: 1,
      HERO_COMMANDER: 1
    };

    // Player Base Buildings
    this.buildings = [];
    this.selectedBuilding = null;
    this.placingBuildingType = null;

    // Player Trained Army & Hero
    this.army = {
      HERO_COMMANDER: 1,
      ENFORCER: 4,
      JUGGERNAUT: 1,
      SPECTRE: 2
    };

    // 3D Three Engine Initialization
    const container = document.getElementById('three-canvas-container');
    this.threeEngine = new ThreeEngine(container);

    this.gridRenderer = new IsoGridRenderer();
    this.battleManager = new BattleManager(this);

    this.lastTime = performance.now();
    this.floatingBadgesMap = new Map();

    this.init();
  }

  init() {
    this.startLoadingSequence(() => {
      this.checkAccountRegistration(() => {
        this.loadState();

        if (this.buildings.length === 0 || this.hasOverlappingBuildings(this.buildings)) {
          this.buildings = [
            new Building('HQ', 13, 13, 1),
            new Building('CREDIT_MINE', 8, 9, 1),
            new Building('PLASMA_SYNTH', 19, 9, 1),
            new Building('GATLING', 8, 18, 1),
            new Building('BARRACKS', 18, 18, 1),
            new Building('LABORATORY', 7, 13, 1),
            new Building('BUILDER_HUT', 19, 14, 1)
          ];
        }

        this.addPlayerBuildingsToScene();

        this.bindEvents();
        this.updateResourceUI();
        this.renderShopItems();
        this.renderArmyBarracks();
        this.renderLabResearch();

        // Subscribe to live Firebase active player counts
        if (window.cloudSync) {
          window.cloudSync.startActivePlayersListener((count) => {
            const label = document.getElementById('active-players-count-label');
            if (label) label.innerText = `🔥 FIREBASE PLAYERS: ${count} ONLINE`;
          });
          window.cloudSync.publishBaseToCloud(this.accountProfile, this.buildings, this.credits, this.plasma);
        }

        setInterval(() => this.passiveResourceTick(), 5000);

        requestAnimationFrame(t => this.gameLoop(t));
      });
    });
  }

  checkAccountRegistration(onReady) {
    const json = localStorage.getItem('strike_commander_profile');
    if (json) {
      try {
        this.accountProfile = JSON.parse(json);
        this.updateProfileUI();
        if (onReady) onReady();
        return;
      } catch (e) {
        console.error('Error reading commander profile', e);
      }
    }

    const modal = document.getElementById('account-modal');
    modal.classList.remove('hidden');

    const form = document.getElementById('account-form');
    form.onsubmit = (e) => {
      e.preventDefault();
      const username = document.getElementById('input-username').value.trim();
      const faction = document.getElementById('input-faction').value;

      if (!username) return;

      this.accountProfile = {
        username: username,
        faction: faction,
        createdAt: new Date().toISOString()
      };

      localStorage.setItem('strike_commander_profile', JSON.stringify(this.accountProfile));
      modal.classList.add('hidden');

      if (window.soundEngine) window.soundEngine.playVictory();
      this.updateProfileUI();
      if (onReady) onReady();
    };
  }

  updateProfileUI() {
    if (!this.accountProfile) return;
    document.getElementById('hud-username').innerText = this.accountProfile.username.toUpperCase();
    document.getElementById('profile-modal-username').innerText = this.accountProfile.username;
    document.getElementById('profile-modal-faction').innerText = this.accountProfile.faction;
  }

  startLoadingSequence(onComplete) {
    const fillEl = document.getElementById('loading-bar-fill');
    const statusEl = document.getElementById('loading-status-text');
    const screenEl = document.getElementById('loading-screen');

    const steps = [
      { pct: 25, msg: 'INITIALIZING 3D WEBGL ENGINE...' },
      { pct: 55, msg: 'CONNECTING FIREBASE CLOUD DATABASE...' },
      { pct: 85, msg: 'LOADING BARRACKS & HERO COMMANDER...' },
      { pct: 100, msg: 'BASE COMMAND ESTABLISHED!' }
    ];

    let currentStep = 0;
    const stepInterval = setInterval(() => {
      if (currentStep < steps.length) {
        const item = steps[currentStep];
        if (fillEl) fillEl.style.width = `${item.pct}%`;
        if (statusEl) statusEl.innerText = item.msg;
        currentStep++;
      } else {
        clearInterval(stepInterval);
        setTimeout(() => {
          if (screenEl) screenEl.classList.add('fade-out');
          if (onComplete) onComplete();
        }, 300);
      }
    }, 450);
  }

  hasOverlappingBuildings(buildingList) {
    for (let i = 0; i < buildingList.length; i++) {
      for (let j = i + 1; j < buildingList.length; j++) {
        const b1 = buildingList[i];
        const b2 = buildingList[j];
        if (!(b1.gridX + b1.sizeX <= b2.gridX || b1.gridX >= b2.gridX + b2.sizeX ||
              b1.gridY + b1.sizeY <= b2.gridY || b1.gridY >= b2.gridY + b2.sizeY)) {
          return true;
        }
      }
    }
    return false;
  }

  addPlayerBuildingsToScene() {
    for (const b of this.buildings) {
      if (b.mesh3D) {
        this.threeEngine.scene.add(b.mesh3D);
        b.update3DPosition(this.threeEngine);
      }
    }
  }

  removePlayerBuildingsFromScene() {
    for (const b of this.buildings) {
      if (b.mesh3D) {
        this.threeEngine.scene.remove(b.mesh3D);
      }
    }
  }

  gameLoop(currentTime) {
    const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    const timeSec = currentTime * 0.001;
    const activeBuildings = this.mode === 'BASE' ? this.buildings : this.battleManager.enemyBuildings;
    for (const b of activeBuildings) {
      if (!b.mesh3D || b.hp <= 0) continue;
      const radar = b.mesh3D.getObjectByName('radar_dish');
      if (radar) {
        radar.rotation.y = timeSec * 2;
      }
      const core = b.mesh3D.getObjectByName('plasma_core');
      if (core) {
        core.position.y = 1.0 + Math.sin(timeSec * 4) * 0.08;
      }
    }

    if (this.mode === 'BATTLE') {
      this.battleManager.update(dt);
    }

    this.threeEngine.render();

    this.updateFloatingBadges();

    requestAnimationFrame(t => this.gameLoop(t));
  }

  updateFloatingBadges() {
    const container = document.getElementById('floating-labels-container');
    const activeIds = new Set();

    const camera = this.threeEngine.camera;
    const width = window.innerWidth;
    const height = window.innerHeight;

    const buildings = this.mode === 'BASE' ? this.buildings : this.battleManager.enemyBuildings;
    for (const b of buildings) {
      if (b.hp <= 0 || !b.mesh3D || !b.isRevealed) continue;

      activeIds.add(b.id);
      let el = this.floatingBadgesMap.get(b.id);

      if (!el) {
        el = document.createElement('div');
        el.className = 'badge-3d';
        container.appendChild(el);
        this.floatingBadgesMap.set(b.id, el);
      }

      const heightOffset = b.typeId === 'HQ' ? 2.2 : b.typeId === 'BARRACKS' ? 1.8 : 1.4;
      const worldPos = new THREE.Vector3(b.mesh3D.position.x, b.mesh3D.position.y + heightOffset, b.mesh3D.position.z);
      worldPos.project(camera);

      if (worldPos.z > 1.0) {
        el.style.opacity = '0';
        continue;
      }

      const screenX = (worldPos.x * 0.5 + 0.5) * width;
      const screenY = (-(worldPos.y * 0.5) + 0.5) * height;

      el.style.left = `${screenX}px`;
      el.style.top = `${screenY}px`;
      el.style.opacity = '1';

      const hpPct = Math.max(0, (b.hp / b.maxHp) * 100);
      const hpColor = hpPct > 50 ? '#00e676' : hpPct > 25 ? '#ffd166' : '#ff3366';

      let harvestHtml = '';
      if (b.isResource && b.uncollectedAmount >= 10) {
        const icon = b.resourceType === 'credits' ? '💎' : '⚡';
        harvestHtml = `<div class="badge-harvest">${icon} +${Math.floor(b.uncollectedAmount)}</div>`;
      }

      el.innerHTML = `
        ${harvestHtml}
        <div class="badge-title">
          <span>${b.icon} ${b.name}</span>
          <span class="lvl">L${b.level}</span>
        </div>
        <div class="badge-hp-track">
          <div class="badge-hp-fill" style="width: ${hpPct}%; background-color: ${hpColor};"></div>
        </div>
      `;
    }

    if (this.mode === 'BATTLE') {
      for (const u of this.battleManager.deployedUnits) {
        if (u.hp <= 0 || !u.mesh3D) continue;

        activeIds.add(u.id);
        let el = this.floatingBadgesMap.get(u.id);

        if (!el) {
          el = document.createElement('div');
          el.className = 'badge-3d';
          container.appendChild(el);
          this.floatingBadgesMap.set(u.id, el);
        }

        const heightOffset = u.isFlying ? 1.4 : u.isHero ? 1.6 : 0.8;
        const worldPos = new THREE.Vector3(u.mesh3D.position.x, u.mesh3D.position.y + heightOffset, u.mesh3D.position.z);
        worldPos.project(camera);

        if (worldPos.z > 1.0) {
          el.style.opacity = '0';
          continue;
        }

        const screenX = (worldPos.x * 0.5 + 0.5) * width;
        const screenY = (-(worldPos.y * 0.5) + 0.5) * height;

        el.style.left = `${screenX}px`;
        el.style.top = `${screenY}px`;
        el.style.opacity = '1';

        const hpPct = Math.max(0, (u.hp / u.maxHp) * 100);

        el.innerHTML = `
          <div class="badge-title">
            <span>${u.icon} ${u.name} (L${u.researchLevel})</span>
          </div>
          <div class="badge-hp-track">
            <div class="badge-hp-fill" style="width: ${hpPct}%; background-color: ${u.isHero ? '#ffd166' : '#00ffaa'};"></div>
          </div>
        `;
      }
    }

    for (const [id, el] of this.floatingBadgesMap.entries()) {
      if (!activeIds.has(id)) {
        if (el.parentNode) el.parentNode.removeChild(el);
        this.floatingBadgesMap.delete(id);
      }
    }
  }

  passiveResourceTick() {
    if (this.mode !== 'BASE') return;

    for (const b of this.buildings) {
      if (b.isResource && b.hp > 0) {
        b.uncollectedAmount += b.productionRate;
      }
    }
  }

  bindEvents() {
    const container = document.getElementById('three-canvas-container');

    container.addEventListener('mousemove', (e) => {
      const gPos = this.threeEngine.updateRaycast(e.clientX, e.clientY);
      if (this.placingBuildingType && gPos) {
        const isValid = this.canPlaceBuilding(this.placingBuildingType, gPos.x, gPos.z);
        this.threeEngine.showHoverPlacement(this.placingBuildingType, isValid);
      } else {
        this.threeEngine.hideHoverPlacement();
      }
    });

    let pointerDownPos = { x: 0, y: 0 };
    container.addEventListener('pointerdown', (e) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    container.addEventListener('pointerup', (e) => {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 5) return;

      const gPos = this.threeEngine.updateRaycast(e.clientX, e.clientY);
      if (gPos && gPos.x >= 0 && gPos.z >= 0) {
        this.handleCanvasClick(gPos.x, gPos.z);
      }
    });

    const volSlider = document.getElementById('audio-volume-slider');
    volSlider.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value) / 100;
      window.soundEngine.setVolume(vol);
    });

    const todBtns = {
      'tod-morning': 'MORNING',
      'tod-noon': 'NOON',
      'tod-night': 'NIGHT'
    };

    for (const [btnId, preset] of Object.entries(todBtns)) {
      document.getElementById(btnId).addEventListener('click', () => {
        if (window.soundEngine) window.soundEngine.playClick();
        Object.keys(todBtns).forEach(id => document.getElementById(id).classList.remove('active'));
        document.getElementById(btnId).classList.add('active');
        this.threeEngine.setTimeOfDay(preset);
      });
    }

    document.getElementById('btn-profile').addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playClick();
      this.updateProfileUI();
      document.getElementById('profile-modal').classList.remove('hidden');
    });

    document.getElementById('btn-close-profile').addEventListener('click', () => {
      document.getElementById('profile-modal').classList.add('hidden');
    });

    document.getElementById('btn-switch-account').addEventListener('click', () => {
      if (confirm('Create a new account? Your current progress is safely saved.')) {
        localStorage.removeItem('strike_commander_profile');
        location.reload();
      }
    });

    document.getElementById('tab-deploy-troops').addEventListener('click', () => {
      document.getElementById('tab-deploy-troops').classList.add('active');
      document.getElementById('tab-deploy-spells').classList.remove('active');
      this.battleManager.selectedMode = 'TROOPS';
      this.renderTroopSelectorUI();
    });

    document.getElementById('tab-deploy-spells').addEventListener('click', () => {
      document.getElementById('tab-deploy-spells').classList.add('active');
      document.getElementById('tab-deploy-troops').classList.remove('active');
      this.battleManager.selectedMode = 'SPELLS';
      this.renderTroopSelectorUI();
    });

    document.getElementById('btn-next-base').addEventListener('click', () => {
      this.battleManager.cycleNextBase();
    });

    document.getElementById('btn-hero-ability').addEventListener('click', () => {
      this.battleManager.triggerHeroAbility();
    });

    document.getElementById('btn-toggle-audio').addEventListener('click', () => {
      const state = window.soundEngine.toggleAudio();
      document.getElementById('btn-toggle-audio').innerText = state ? '🔊 SFX ON' : '🔇 SFX OFF';
    });

    document.getElementById('btn-reset-cam').addEventListener('click', () => {
      this.threeEngine.resetCamera();
    });

    document.getElementById('btn-save-game').addEventListener('click', () => {
      this.saveState();
      alert('Game state successfully saved & synced to Firebase Cloud!');
    });

    document.getElementById('btn-open-shop').addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playClick();
      document.getElementById('shop-modal').classList.remove('hidden');
    });

    document.getElementById('btn-close-shop').addEventListener('click', () => {
      document.getElementById('shop-modal').classList.add('hidden');
    });

    document.getElementById('btn-open-army').addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playClick();
      this.renderArmyBarracks();
      document.getElementById('army-modal').classList.remove('hidden');
    });

    document.getElementById('btn-close-army').addEventListener('click', () => {
      document.getElementById('army-modal').classList.add('hidden');
    });

    document.getElementById('btn-open-lab').addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playClick();
      this.renderLabResearch();
      document.getElementById('lab-modal').classList.remove('hidden');
    });

    document.getElementById('btn-close-lab').addEventListener('click', () => {
      document.getElementById('lab-modal').classList.add('hidden');
    });

    document.getElementById('btn-clear-army').addEventListener('click', () => {
      this.army = { HERO_COMMANDER: 1 };
      this.renderArmyBarracks();
      this.updateResourceUI();
    });

    document.getElementById('btn-start-attack').addEventListener('click', () => {
      const totalUnits = Object.values(this.army).reduce((a, b) => a + b, 0);
      if (totalUnits === 0) {
        alert('Your army is empty! Train units in the Barracks before launching a raid.');
        return;
      }

      if (window.soundEngine) window.soundEngine.playClick();

      const activeCount = window.cloudSync ? window.cloudSync.onlinePlayerCount : 14;
      document.getElementById('active-players-count-label').innerText = `🔥 FIREBASE PLAYERS: ${activeCount} ONLINE`;

      document.getElementById('raid-mode-modal').classList.remove('hidden');
    });

    document.getElementById('btn-close-raid-mode').addEventListener('click', () => {
      document.getElementById('raid-mode-modal').classList.add('hidden');
    });

    document.getElementById('btn-raid-bot').addEventListener('click', () => {
      document.getElementById('raid-mode-modal').classList.add('hidden');
      this.switchMode('BATTLE');
      this.battleManager.startBattle(this.army, 'BOT');
    });

    document.getElementById('btn-raid-player').addEventListener('click', () => {
      document.getElementById('raid-mode-modal').classList.add('hidden');
      this.switchMode('BATTLE');
      this.battleManager.startBattle(this.army, 'PLAYER');
    });

    document.getElementById('btn-retreat').addEventListener('click', () => {
      if (confirm('Are you sure you want to surrender the raid?')) {
        this.battleManager.endBattle();
      }
    });

    document.getElementById('btn-return-base').addEventListener('click', () => {
      document.getElementById('battle-result-modal').classList.add('hidden');
      this.switchMode('BASE');
    });

    document.getElementById('btn-upgrade-building').addEventListener('click', () => {
      if (!this.selectedBuilding) return;
      const cost = this.selectedBuilding.getUpgradeCost();
      if (this.credits >= cost) {
        this.credits -= cost;
        this.selectedBuilding.upgrade();
        if (window.soundEngine) window.soundEngine.playPlaceBuilding();
        this.updateResourceUI();
        this.saveState();
        this.openInspector(this.selectedBuilding);
      } else {
        alert('Insufficient Credits for upgrade!');
      }
    });

    document.getElementById('btn-sell-building').addEventListener('click', () => {
      if (!this.selectedBuilding) return;
      if (this.selectedBuilding.typeId === 'HQ') {
        alert('You cannot sell your Command Center!');
        return;
      }
      const val = this.selectedBuilding.getSellValue();
      this.credits += val;
      if (this.selectedBuilding.mesh3D) {
        this.threeEngine.scene.remove(this.selectedBuilding.mesh3D);
      }
      this.buildings = this.buildings.filter(b => b !== this.selectedBuilding);
      this.closeInspector();
      this.updateResourceUI();
      this.saveState();
    });

    document.getElementById('btn-close-inspector').addEventListener('click', () => {
      this.closeInspector();
    });
  }

  handleCanvasClick(gx, gz) {
    if (window.soundEngine) window.soundEngine.playClick();

    if (this.mode === 'BATTLE') {
      this.battleManager.handleGridClick(gx, gz);
      return;
    }

    if (this.placingBuildingType) {
      const proto = this.placingBuildingType;
      if (this.canPlaceBuilding(proto, gx, gz)) {
        this.credits -= proto.baseCost;
        const newBuilding = new Building(proto.id, gx, gz, 1);
        this.buildings.push(newBuilding);

        if (newBuilding.mesh3D) {
          this.threeEngine.scene.add(newBuilding.mesh3D);
          newBuilding.update3DPosition(this.threeEngine);
        }

        if (window.soundEngine) window.soundEngine.playPlaceBuilding();
        this.placingBuildingType = null;
        this.threeEngine.hideHoverPlacement();
        this.updateResourceUI();
        this.saveState();
      } else {
        alert('Cannot place building here! Invalid location or overlapping structures.');
      }
      return;
    }

    const clickedBuilding = this.buildings.find(b => 
      gx >= b.gridX && gx < b.gridX + b.sizeX &&
      gz >= b.gridY && gz < b.gridY + b.sizeY
    );

    if (clickedBuilding) {
      if (clickedBuilding.isResource && clickedBuilding.uncollectedAmount > 0) {
        if (clickedBuilding.resourceType === 'credits') {
          this.credits = Math.min(this.maxCredits, this.credits + clickedBuilding.uncollectedAmount);
        } else {
          this.plasma = Math.min(this.maxPlasma, this.plasma + clickedBuilding.uncollectedAmount);
        }
        clickedBuilding.uncollectedAmount = 0;
        if (window.soundEngine) window.soundEngine.playCollectResource();
        this.updateResourceUI();
        this.saveState();
      }
      this.openInspector(clickedBuilding);
    } else {
      this.closeInspector();
    }
  }

  canPlaceBuilding(proto, gx, gz) {
    if (gx < 0 || gz < 0 || gx + proto.sizeX > this.threeEngine.gridSize || gz + proto.sizeY > this.threeEngine.gridSize) {
      return false;
    }
    for (const b of this.buildings) {
      if (!(gx + proto.sizeX <= b.gridX || gx >= b.gridX + b.sizeX || gz + proto.sizeY <= b.gridY || gz >= b.gridY + b.sizeY)) {
        return false;
      }
    }
    return true;
  }

  openInspector(building) {
    this.selectedBuilding = building;
    document.getElementById('inspector-name').innerText = `${building.name} (LVL ${building.level})`;
    document.getElementById('inspector-desc').innerText = BUILDING_TYPES[building.typeId].desc;
    document.getElementById('upgrade-cost').innerText = building.getUpgradeCost();
    document.getElementById('sell-value').innerText = building.getSellValue();
    document.getElementById('inspector-panel').classList.remove('hidden');
  }

  closeInspector() {
    this.selectedBuilding = null;
    document.getElementById('inspector-panel').classList.add('hidden');
  }

  switchMode(newMode) {
    if (this.mode === 'BASE' && newMode === 'BATTLE') {
      this.removePlayerBuildingsFromScene();
    } else if (this.mode === 'BATTLE' && newMode === 'BASE') {
      this.battleManager.clearEnemyBase3DMeshes();
      this.addPlayerBuildingsToScene();
    }

    this.mode = newMode;
    document.getElementById('current-mode-label').innerText = newMode === 'BASE' ? 'BASE COMMAND' : 'RAID OPERATION';

    if (newMode === 'BASE') {
      document.getElementById('base-overlay').classList.remove('hidden');
      document.getElementById('battle-overlay').classList.add('hidden');
    } else {
      document.getElementById('base-overlay').classList.add('hidden');
      document.getElementById('battle-overlay').classList.remove('hidden');
      this.closeInspector();
    }
  }

  updateResourceUI() {
    document.getElementById('credits-amount').innerText = this.credits.toLocaleString();
    document.getElementById('plasma-amount').innerText = this.plasma.toLocaleString();

    let builderHuts = this.buildings.filter(b => b.typeId === 'BUILDER_HUT').length;
    let totalBuilders = 2 + builderHuts;
    document.getElementById('builders-amount').innerText = `${totalBuilders} / ${totalBuilders}`;

    document.getElementById('credits-bar').style.width = `${Math.min(100, (this.credits / this.maxCredits) * 100)}%`;
    document.getElementById('plasma-bar').style.width = `${Math.min(100, (this.plasma / this.maxPlasma) * 100)}%`;

    const currentHousing = this.getCurrentHousingUsed();
    const maxHousing = this.getMaxHousingCapacity();
    document.getElementById('army-capacity-count').innerText = `${currentHousing}/${maxHousing}`;
    document.getElementById('army-modal-housing').innerText = `${currentHousing} / ${maxHousing}`;
  }

  getCurrentHousingUsed() {
    let total = 0;
    for (const [typeId, count] of Object.entries(this.army)) {
      total += (UNIT_TYPES[typeId].housingSpace * count);
    }
    return total;
  }

  getMaxHousingCapacity() {
    let cap = 20;
    for (const b of this.buildings) {
      if (b.typeId === 'BARRACKS') {
        cap += 10 * b.level;
      }
      if (b.typeId === 'CLAN_HUB') {
        cap += 15 * b.level;
      }
    }
    return cap;
  }

  renderShopItems() {
    const container = document.getElementById('shop-items-container');
    container.innerHTML = '';

    for (const key of Object.keys(BUILDING_TYPES)) {
      const b = BUILDING_TYPES[key];
      if (b.id === 'HQ') continue;

      const card = document.createElement('div');
      card.className = 'shop-item-card';
      card.innerHTML = `
        <div class="icon">${b.icon}</div>
        <div class="title">${b.name}</div>
        <div class="desc">${b.desc}</div>
        <div class="cost-row">💎 ${b.baseCost} Credits</div>
        <button class="btn btn-primary btn-buy">BUILD</button>
      `;

      card.querySelector('.btn-buy').addEventListener('click', () => {
        if (this.credits >= b.baseCost) {
          this.placingBuildingType = b;
          document.getElementById('shop-modal').classList.add('hidden');
        } else {
          alert('Insufficient Credits to build this structure!');
        }
      });

      container.appendChild(card);
    }
  }

  renderArmyBarracks() {
    const container = document.getElementById('troop-train-container');
    container.innerHTML = '';

    for (const key of Object.keys(UNIT_TYPES)) {
      const u = UNIT_TYPES[key];
      const count = this.army[key] || 0;

      const card = document.createElement('div');
      card.className = 'troop-train-card';
      card.innerHTML = `
        <div class="icon">${u.icon}</div>
        <div class="name">${u.name} (L${this.labResearch[key] || 1})</div>
        <div class="cost">⚡ ${u.trainCostPlasma} Plasma | 🏠 ${u.housingSpace} space</div>
        <div class="count-badge">Trained: ${count}</div>
        <button class="btn btn-primary btn-train">+ RECRUIT</button>
      `;

      card.querySelector('.btn-train').addEventListener('click', () => {
        if (u.isHero && count >= 1) {
          alert('You can only have 1 Strike Commander Hero deployed per raid!');
          return;
        }
        const spaceNeeded = u.housingSpace;
        if (this.getCurrentHousingUsed() + spaceNeeded > this.getMaxHousingCapacity()) {
          alert('Not enough Barracks housing capacity! Upgrade or build more Barracks.');
          return;
        }
        if (this.plasma >= u.trainCostPlasma) {
          this.plasma -= u.trainCostPlasma;
          this.army[key] = (this.army[key] || 0) + 1;
          if (window.soundEngine) window.soundEngine.playClick();
          this.updateResourceUI();
          this.renderArmyBarracks();
        } else {
          alert('Insufficient Plasma Energy to recruit this unit!');
        }
      });

      container.appendChild(card);
    }
  }

  renderLabResearch() {
    const container = document.getElementById('lab-research-container');
    container.innerHTML = '';

    for (const key of Object.keys(UNIT_TYPES)) {
      const u = UNIT_TYPES[key];
      const currentLvl = this.labResearch[key] || 1;
      const upgradeCost = Math.round(300 * Math.pow(1.5, currentLvl));

      const card = document.createElement('div');
      card.className = 'shop-item-card';
      card.innerHTML = `
        <div class="icon">${u.icon}</div>
        <div class="title">${u.name}</div>
        <div class="desc">Current Level: <strong>L${currentLvl}</strong> (+25% Stats per Level)</div>
        <div class="cost-row">⚡ ${upgradeCost} Plasma</div>
        <button class="btn btn-primary btn-research">RESEARCH L${currentLvl + 1}</button>
      `;

      card.querySelector('.btn-research').addEventListener('click', () => {
        if (this.plasma >= upgradeCost) {
          this.plasma -= upgradeCost;
          this.labResearch[key] = currentLvl + 1;
          if (window.soundEngine) window.soundEngine.playVictory();
          this.updateResourceUI();
          this.renderLabResearch();
        } else {
          alert('Insufficient Plasma Energy for Research!');
        }
      });

      container.appendChild(card);
    }
  }

  renderTroopSelectorUI() {
    const container = document.getElementById('troop-selector-bar');
    container.innerHTML = '';

    if (this.battleManager.selectedMode === 'TROOPS') {
      const armyEntries = Object.entries(this.battleManager.availableArmy);
      if (armyEntries.length === 0) {
        container.innerHTML = '<span style="color:#8b949e; font-family:Orbitron;">ALL TROOPS DEPLOYED</span>';
        return;
      }

      for (const [typeId, count] of armyEntries) {
        if (count <= 0) continue;
        const u = UNIT_TYPES[typeId];
        const isSelected = this.battleManager.selectedTroopTypeId === typeId;

        const card = document.createElement('div');
        card.className = `troop-card-btn ${isSelected ? 'selected' : ''}`;
        card.innerHTML = `
          <span style="font-size:1.5rem;">${u.icon}</span>
          <span class="count-badge">x${count}</span>
          <span style="font-size:0.75rem;">${u.name}</span>
        `;

        card.addEventListener('click', () => {
          this.battleManager.selectedTroopTypeId = typeId;
          this.renderTroopSelectorUI();
        });

        container.appendChild(card);
      }
    } else if (this.battleManager.selectedMode === 'SPELLS') {
      const spellEntries = Object.entries(this.battleManager.availableSpells);

      for (const [typeId, count] of spellEntries) {
        const s = SPELL_TYPES[typeId];
        const isSelected = this.battleManager.selectedSpellTypeId === typeId;

        const card = document.createElement('div');
        card.className = `troop-card-btn ${isSelected ? 'selected' : ''}`;
        card.innerHTML = `
          <span style="font-size:1.5rem;">${s.icon}</span>
          <span class="count-badge">x${count}</span>
          <span style="font-size:0.75rem;">${s.name}</span>
        `;

        card.addEventListener('click', () => {
          this.battleManager.selectedSpellTypeId = typeId;
          this.renderTroopSelectorUI();
        });

        container.appendChild(card);
      }
    }
  }

  updateBattleHUD(destructionPct, isHqDestroyed) {
    document.getElementById('battle-destruction-percent').innerText = `${destructionPct}%`;

    let stars = 0;
    if (isHqDestroyed) stars++;
    if (destructionPct >= 50) stars++;
    if (destructionPct >= 100) stars++;

    const starEls = document.querySelectorAll('#battle-stars .star');
    starEls.forEach((el, idx) => {
      if (idx < stars) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  updateBattleTimerUI(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    document.getElementById('battle-timer').innerText = `${mins}:${secs}`;
  }

  showBattleResultModal(result) {
    const modal = document.getElementById('battle-result-modal');
    document.getElementById('result-title').innerText = result.stars > 0 ? 'VICTORY!' : 'RAID DEFEATED';
    document.getElementById('result-destruction').innerText = `${result.destructionPct}%`;
    document.getElementById('result-credits').innerText = `+${result.lootedCredits}`;
    document.getElementById('result-plasma').innerText = `+${result.lootedPlasma}`;

    const starEls = document.querySelectorAll('#result-stars .star-big');
    starEls.forEach((el, idx) => {
      if (idx < result.stars) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    this.credits = Math.min(this.maxCredits, this.credits + result.lootedCredits);
    this.plasma = Math.min(this.maxPlasma, this.plasma + result.lootedPlasma);
    this.updateResourceUI();
    this.saveState();

    modal.classList.remove('hidden');
  }

  saveState() {
    const data = {
      credits: this.credits,
      plasma: this.plasma,
      gems: this.gems,
      labResearch: this.labResearch,
      buildings: this.buildings.map(b => ({
        typeId: b.typeId,
        x: b.gridX,
        y: b.gridY,
        level: b.level
      })),
      army: this.army
    };
    const key = this.accountProfile ? `strike_save_${this.accountProfile.username}` : 'strike_game_save';
    localStorage.setItem(key, JSON.stringify(data));

    if (window.cloudSync) {
      window.cloudSync.publishBaseToCloud(this.accountProfile, this.buildings, this.credits, this.plasma);
    }
  }

  loadState() {
    const key = this.accountProfile ? `strike_save_${this.accountProfile.username}` : 'strike_game_save';
    const json = localStorage.getItem(key);
    if (!json) return;
    try {
      const data = JSON.parse(json);
      this.credits = data.credits ?? 1000;
      this.plasma = data.plasma ?? 1000;
      this.gems = data.gems ?? 50;
      this.labResearch = data.labResearch ?? { ENFORCER: 1, JUGGERNAUT: 1, SPECTRE: 1, DRONE: 1, HERO_COMMANDER: 1 };
      this.army = data.army ?? { HERO_COMMANDER: 1, ENFORCER: 4, JUGGERNAUT: 1, SPECTRE: 2 };
      if (data.buildings && Array.isArray(data.buildings)) {
        this.buildings = data.buildings.map(b => new Building(b.typeId, b.x, b.y, b.level));
      }
    } catch (e) {
      console.error('Failed loading save state', e);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.strikeGame = new StrikeGame();
});
