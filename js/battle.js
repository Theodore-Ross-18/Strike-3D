class BattleManager {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.enemyBuildings = [];
    this.deployedUnits = [];
    this.availableArmy = {};
    this.availableSpells = {
      ORBITAL_STRIKE: 2,
      NANITE_REPAIR: 2,
      OVERDRIVE: 1,
      CRYO_FREEZE: 1
    };

    this.selectedMode = 'TROOPS';
    this.selectedTroopTypeId = null;
    this.selectedSpellTypeId = null;

    this.initialBuildingCount = 0;
    this.timerSeconds = 180;
    this.timerInterval = null;

    this.raidTargetType = 'BOT';
    this.baseDifficultyTier = 'MEDIUM';
    this.targetCommanderName = 'AI Outpost';
    this.lootedCredits = 0;
    this.lootedPlasma = 0;
    this.totalEnemyCredits = 0;
    this.totalEnemyPlasma = 0;
  }

  startBattle(playerArmy, raidTargetType = 'BOT') {
    this.active = true;
    this.raidTargetType = raidTargetType;
    this.deployedUnits = [];
    this.availableArmy = { ...playerArmy };

    const keys = Object.keys(this.availableArmy);
    this.selectedTroopTypeId = keys.length > 0 ? keys[0] : null;
    this.selectedMode = 'TROOPS';

    // Generate or Load Enemy Base based on choice
    this.generateAndLoadEnemyBase(this.baseDifficultyTier);

    this.timerSeconds = 180;
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timerSeconds--;
      this.game.updateBattleTimerUI(this.timerSeconds);
      if (this.timerSeconds <= 0) {
        this.endBattle();
      }
    }, 1000);

    this.game.renderTroopSelectorUI();
  }

  cycleNextBase() {
    if (!this.active) return;
    if (this.game.credits < 50) {
      alert('Insufficient Credits (50 needed) to scout Next Base!');
      return;
    }

    this.game.credits -= 50;
    this.game.updateResourceUI();

    this.clearEnemyBase3DMeshes();
    this.deployedUnits = [];

    const tiers = ['EASY', 'MEDIUM', 'HARD'];
    const nextIdx = (tiers.indexOf(this.baseDifficultyTier) + 1) % tiers.length;
    this.baseDifficultyTier = tiers[nextIdx];

    this.generateAndLoadEnemyBase(this.baseDifficultyTier);
    if (window.soundEngine) window.soundEngine.playClick();
  }

  async generateAndLoadEnemyBase(difficultyTier) {
    if (this.raidTargetType === 'PLAYER') {
      this.enemyBuildings = await this.findActivePlayerBase(difficultyTier);
    } else {
      this.enemyBuildings = this.generateAIBotBase(difficultyTier);
    }

    this.initialBuildingCount = this.enemyBuildings.length;

    if (this.game.threeEngine) {
      for (const b of this.enemyBuildings) {
        if (b.mesh3D) {
          this.game.threeEngine.scene.add(b.mesh3D);
          b.update3DPosition(this.game.threeEngine);
        }
      }
    }
  }

  async findActivePlayerBase(tier = 'MEDIUM') {
    const currentUsername = this.game.accountProfile ? this.game.accountProfile.username : null;

    // Fetch Global Bases from Firebase Cloud
    if (window.cloudSync) {
      const cloudBases = await window.cloudSync.fetchGlobalPlayerBases(currentUsername);
      if (cloudBases && cloudBases.length > 0) {
        const targetData = cloudBases[Math.floor(Math.random() * cloudBases.length)];
        this.targetCommanderName = targetData.username;
        this.totalEnemyCredits = targetData.credits || 2500;
        this.totalEnemyPlasma = targetData.plasma || 2000;

        document.getElementById('current-mode-label').innerText = `FIREBASE PVP RAID: COMMANDER ${targetData.username.toUpperCase()}`;

        return targetData.buildings.map(b => new Building(b.typeId, b.x, b.y, b.level));
      }
    }

    // Fallback to AI Base
    return this.generateAIBotBase('HARD');
  }

  generateAIBotBase(tier = 'MEDIUM') {
    this.targetCommanderName = `AI Bot Outpost (${tier})`;
    document.getElementById('current-mode-label').innerText = `PVE RAID: ${this.targetCommanderName.toUpperCase()}`;

    if (tier === 'EASY') {
      this.totalEnemyCredits = 1000;
      this.totalEnemyPlasma = 800;
    } else if (tier === 'MEDIUM') {
      this.totalEnemyCredits = 1800;
      this.totalEnemyPlasma = 1500;
    } else {
      this.totalEnemyCredits = 3000;
      this.totalEnemyPlasma = 2500;
    }

    const buildings = [];
    buildings.push(new Building('HQ', 14, 14, tier === 'HARD' ? 3 : 2, 'enemy_hq'));

    buildings.push(new Building('CREDIT_MINE', 10, 12, 2, 'e_cm1'));
    buildings.push(new Building('CREDIT_MINE', 18, 12, 2, 'e_cm2'));
    buildings.push(new Building('PLASMA_SYNTH', 10, 16, 2, 'e_ps1'));
    buildings.push(new Building('PLASMA_SYNTH', 18, 16, 2, 'e_ps2'));

    buildings.push(new Building('GATLING', 12, 10, 2, 'e_gat1'));
    buildings.push(new Building('GATLING', 16, 10, 2, 'e_gat2'));

    buildings.push(new Building('TESLA', 14, 11, 2, 'e_tes1'));
    buildings.push(new Building('LANDMINE', 14, 9, 1, 'e_mine1'));
    buildings.push(new Building('LANDMINE', 11, 14, 1, 'e_mine2'));

    if (tier === 'HARD') {
      buildings.push(new Building('PLASMA_CANNON', 14, 18, 2, 'e_can1'));
      buildings.push(new Building('TESLA', 14, 17, 2, 'e_tes2'));
    }

    for (let x = 9; x <= 20; x++) {
      if (x % 2 === 0) {
        buildings.push(new Building('WALL', x, 7, 1, `e_w_${x}_7`));
        buildings.push(new Building('WALL', x, 21, 1, `e_w_${x}_21`));
      }
    }

    return buildings;
  }

  handleGridClick(gridX, gridY) {
    if (!this.active) return;

    if (this.selectedMode === 'TROOPS') {
      this.deployTroop(gridX, gridY);
    } else if (this.selectedMode === 'SPELLS') {
      this.castSpell(gridX, gridY);
    }
  }

  deployTroop(gridX, gridY) {
    if (!this.selectedTroopTypeId) return;
    if (!this.availableArmy[this.selectedTroopTypeId] || this.availableArmy[this.selectedTroopTypeId] <= 0) {
      return;
    }

    this.availableArmy[this.selectedTroopTypeId]--;
    if (this.availableArmy[this.selectedTroopTypeId] <= 0) {
      delete this.availableArmy[this.selectedTroopTypeId];
      const remainingKeys = Object.keys(this.availableArmy);
      this.selectedTroopTypeId = remainingKeys.length > 0 ? remainingKeys[0] : null;
    }

    const researchLvl = this.game.labResearch[this.selectedTroopTypeId] || 1;
    const newUnit = new Unit(this.selectedTroopTypeId, gridX, gridY, researchLvl);
    this.deployedUnits.push(newUnit);

    if (this.game.threeEngine && newUnit.mesh3D) {
      this.game.threeEngine.scene.add(newUnit.mesh3D);
      newUnit.update3DPosition();
    }

    this.game.renderTroopSelectorUI();
  }

  castSpell(gridX, gridY) {
    if (!this.selectedSpellTypeId) return;
    if (!this.availableSpells[this.selectedSpellTypeId] || this.availableSpells[this.selectedSpellTypeId] <= 0) {
      return;
    }

    this.availableSpells[this.selectedSpellTypeId]--;
    SpellManager.castSpell(this.selectedSpellTypeId, gridX, gridY, this);
    this.game.renderTroopSelectorUI();
  }

  triggerHeroAbility() {
    const hero = this.deployedUnits.find(u => u.isHero && u.hp > 0);
    if (hero) {
      hero.activateHeroShield();
      if (window.soundEngine) window.soundEngine.playVictory();
    } else {
      alert('Deploy your Strike Commander Hero Mech onto the battlefield first!');
    }
  }

  update(dt) {
    if (!this.active) return;

    const heroDeployed = this.deployedUnits.some(u => u.isHero && u.hp > 0);
    const heroBtn = document.getElementById('btn-hero-ability');
    if (heroBtn) {
      if (heroDeployed) heroBtn.classList.remove('hidden');
      else heroBtn.classList.add('hidden');
    }

    for (let i = this.deployedUnits.length - 1; i >= 0; i--) {
      const unit = this.deployedUnits[i];
      if (unit.hp <= 0) {
        if (unit.mesh3D && this.game.threeEngine) {
          this.game.threeEngine.scene.remove(unit.mesh3D);
        }
        this.deployedUnits.splice(i, 1);
        continue;
      }

      for (const b of this.enemyBuildings) {
        if (b.hp <= 0 || !b.isTrap) continue;
        const bCenterX = b.gridX + b.sizeX / 2;
        const bCenterY = b.gridY + b.sizeY / 2;
        const dist = Math.hypot(unit.x - bCenterX, unit.y - bCenterY);

        if (dist <= 1.8 && !b.isRevealed) {
          b.revealTrap();

          if (b.typeId === 'LANDMINE') {
            unit.takeDamage(250);
            b.takeDamage(999);
            if (this.game.threeEngine) {
              const uWPos = this.game.threeEngine.gridToWorld(unit.x, unit.y);
              this.game.threeEngine.spawnExplosion(uWPos);
            }
            if (window.soundEngine) window.soundEngine.playExplosion();
          }
        }
      }

      unit.update(dt, this.enemyBuildings);
    }

    for (const b of this.enemyBuildings) {
      if (b.hp <= 0 || !b.isDefense || !b.isRevealed) continue;

      if (b.cooldown > 0) {
        b.cooldown -= dt;
      }

      if (b.cooldown <= 0) {
        let targetUnit = null;
        let minDist = Infinity;
        const bCenterX = b.gridX + b.sizeX / 2;
        const bCenterY = b.gridY + b.sizeY / 2;

        for (const u of this.deployedUnits) {
          if (u.hp <= 0) continue;
          const dist = Math.hypot(u.x - bCenterX, u.y - bCenterY);
          if (dist <= b.attackRange && dist < minDist) {
            minDist = dist;
            targetUnit = u;
          }
        }

        if (targetUnit) {
          b.cooldown = b.attackSpeed;
          targetUnit.takeDamage(b.attackDmg);

          if (this.game.threeEngine) {
            const engine = this.game.threeEngine;
            const uWPos = engine.gridToWorld(targetUnit.x, targetUnit.y);
            b.aimTurret3D(uWPos);

            const bWPos = engine.gridToWorld(bCenterX, bCenterY);
            engine.spawnLaserBeam(bWPos, uWPos, 0xff0055);
          }

          if (window.soundEngine) {
            window.soundEngine.playLaserShot();
          }

          if (targetUnit.hp <= 0 && this.game.threeEngine) {
            const engine = this.game.threeEngine;
            const uWPos = engine.gridToWorld(targetUnit.x, targetUnit.y);
            engine.spawnExplosion(uWPos);
          }
        }
      }
    }

    const destroyedCount = this.enemyBuildings.filter(b => b.hp <= 0).length;
    const destructionPct = Math.min(100, Math.floor((destroyedCount / this.initialBuildingCount) * 100));

    const hqBuilding = this.enemyBuildings.find(b => b.typeId === 'HQ');
    const isHqDestroyed = hqBuilding ? hqBuilding.hp <= 0 : true;

    this.game.updateBattleHUD(destructionPct, isHqDestroyed);

    const remainingTroopsCount = Object.values(this.availableArmy).reduce((a, b) => a + b, 0);
    if (destructionPct >= 100 || (this.deployedUnits.length === 0 && remainingTroopsCount === 0)) {
      this.endBattle();
    }
  }

  clearEnemyBase3DMeshes() {
    if (!this.game.threeEngine) return;
    for (const b of this.enemyBuildings) {
      if (b.mesh3D) {
        this.game.threeEngine.scene.remove(b.mesh3D);
      }
    }
    for (const u of this.deployedUnits) {
      if (u.mesh3D) {
        this.game.threeEngine.scene.remove(u.mesh3D);
      }
    }
  }

  endBattle() {
    if (!this.active) return;
    this.active = false;
    if (this.timerInterval) clearInterval(this.timerInterval);

    const destroyedCount = this.enemyBuildings.filter(b => b.hp <= 0).length;
    const destructionPct = Math.min(100, Math.floor((destroyedCount / this.initialBuildingCount) * 100));
    const hqBuilding = this.enemyBuildings.find(b => b.typeId === 'HQ');
    const isHqDestroyed = hqBuilding ? hqBuilding.hp <= 0 : true;

    let stars = 0;
    if (isHqDestroyed) stars++;
    if (destructionPct >= 50) stars++;
    if (destructionPct >= 100) stars++;

    const lootRatio = destructionPct / 100;
    this.lootedCredits = Math.round(this.totalEnemyCredits * lootRatio);
    this.lootedPlasma = Math.round(this.totalEnemyPlasma * lootRatio);

    if (stars > 0 && window.soundEngine) {
      window.soundEngine.playVictory();
    }

    this.game.showBattleResultModal({
      stars,
      destructionPct,
      lootedCredits: this.lootedCredits,
      lootedPlasma: this.lootedPlasma
    });
  }
}

window.BattleManager = BattleManager;
