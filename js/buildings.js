const BUILDING_TYPES = {
  HQ: {
    id: 'HQ',
    name: 'Command Center',
    desc: 'The heart of your base ops. Protect this at all costs.',
    icon: '🏛️',
    sizeX: 3,
    sizeY: 3,
    costType: 'credits',
    baseCost: 0,
    maxHp: 2000,
    color: '#00f0ff',
    secondaryColor: '#0066aa',
    isDefense: false,
    isResource: false
  },
  CREDIT_MINE: {
    id: 'CREDIT_MINE',
    name: 'Credit Refinery',
    desc: 'Generates Credits steadily over time.',
    icon: '💎',
    sizeX: 2,
    sizeY: 2,
    costType: 'credits',
    baseCost: 200,
    maxHp: 600,
    color: '#ffd166',
    secondaryColor: '#b8860b',
    isDefense: false,
    isResource: true,
    resourceType: 'credits',
    productionRate: 10
  },
  PLASMA_SYNTH: {
    id: 'PLASMA_SYNTH',
    name: 'Plasma Synthesizer',
    desc: 'Harvests Plasma Energy for army training & tech.',
    icon: '⚡',
    sizeX: 2,
    sizeY: 2,
    costType: 'credits',
    baseCost: 250,
    maxHp: 550,
    color: '#00ffaa',
    secondaryColor: '#008b8b',
    isDefense: false,
    isResource: true,
    resourceType: 'plasma',
    productionRate: 10
  },
  GATLING: {
    id: 'GATLING',
    name: 'Gatling Laser Turret',
    desc: 'Rapid-firing defense turret that shreds ground troops.',
    icon: '🔫',
    sizeX: 2,
    sizeY: 2,
    costType: 'credits',
    baseCost: 350,
    maxHp: 800,
    color: '#ff3366',
    secondaryColor: '#880022',
    isDefense: true,
    attackRange: 5,
    attackDmg: 25,
    attackSpeed: 0.5,
    projectileType: 'laser'
  },
  PLASMA_CANNON: {
    id: 'PLASMA_CANNON',
    name: 'Plasma Cannon',
    desc: 'Fires heavy splash damage plasma mortars across long range.',
    icon: '💣',
    sizeX: 2,
    sizeY: 2,
    costType: 'credits',
    baseCost: 600,
    maxHp: 950,
    color: '#9d4edd',
    secondaryColor: '#4a154b',
    isDefense: true,
    attackRange: 7,
    attackDmg: 70,
    attackSpeed: 1.5,
    projectileType: 'mortar'
  },
  BARRACKS: {
    id: 'BARRACKS',
    name: 'Tactical Barracks',
    desc: 'Trains specialized Strike combat units.',
    icon: '🏭',
    sizeX: 3,
    sizeY: 2,
    costType: 'credits',
    baseCost: 400,
    maxHp: 900,
    color: '#3a86ff',
    secondaryColor: '#1d3557',
    isDefense: false,
    isResource: false
  },
  LABORATORY: {
    id: 'LABORATORY',
    name: 'Laboratory Tech Center',
    desc: 'Researches stat upgrades for troops and spells.',
    icon: '🔬',
    sizeX: 3,
    sizeY: 3,
    costType: 'credits',
    baseCost: 500,
    maxHp: 1000,
    color: '#00f0ff',
    secondaryColor: '#008b8b',
    isDefense: false,
    isResource: false
  },
  CLAN_HUB: {
    id: 'CLAN_HUB',
    name: 'Clan Station',
    desc: 'Houses extra reinforcement troops donated to your base.',
    icon: '🏰',
    sizeX: 3,
    sizeY: 3,
    costType: 'credits',
    baseCost: 600,
    maxHp: 1200,
    color: '#ffd166',
    secondaryColor: '#b8860b',
    isDefense: false,
    isResource: false
  },
  BUILDER_HUT: {
    id: 'BUILDER_HUT',
    name: 'Builder Drone Hut',
    desc: 'Provides +1 Builder Drone for building and upgrading structures.',
    icon: '🏠',
    sizeX: 2,
    sizeY: 2,
    costType: 'credits',
    baseCost: 300,
    maxHp: 400,
    color: '#8b949e',
    secondaryColor: '#334155',
    isDefense: false,
    isResource: false
  },
  TESLA: {
    id: 'TESLA',
    name: 'Hidden Tesla Coil',
    desc: 'Stealth high-voltage defense coil that uncloaks when enemy troops draw near.',
    icon: '⚡',
    sizeX: 2,
    sizeY: 2,
    costType: 'credits',
    baseCost: 450,
    maxHp: 750,
    color: '#00f0ff',
    secondaryColor: '#0066aa',
    isDefense: true,
    isTrap: true,
    attackRange: 4.5,
    attackDmg: 45,
    attackSpeed: 0.4,
    projectileType: 'laser'
  },
  LANDMINE: {
    id: 'LANDMINE',
    name: 'Proximity Landmine',
    desc: 'Stealth landmine that detonates when enemy ground units step over it.',
    icon: '💥',
    sizeX: 1,
    sizeY: 1,
    costType: 'credits',
    baseCost: 100,
    maxHp: 200,
    color: '#ff3366',
    secondaryColor: '#880022',
    isDefense: false,
    isTrap: true,
    trapDamage: 250,
    trapRadius: 1.5
  },
  WALL: {
    id: 'WALL',
    name: 'Barrier Wall',
    desc: 'Heavy reinforced energy barrier to stall enemy advance.',
    icon: '🧱',
    sizeX: 1,
    sizeY: 1,
    costType: 'credits',
    baseCost: 50,
    maxHp: 1200,
    color: '#8b949e',
    secondaryColor: '#484f58',
    isDefense: false,
    isResource: false
  }
};

class Building {
  constructor(typeId, x, y, level = 1, id = null) {
    const proto = BUILDING_TYPES[typeId];
    if (!proto) throw new Error(`Invalid building type: ${typeId}`);

    this.id = id || 'b_' + Math.random().toString(36).substring(2, 9);
    this.typeId = typeId;
    this.name = proto.name;
    this.icon = proto.icon;
    this.sizeX = proto.sizeX;
    this.sizeY = proto.sizeY;
    this.gridX = x;
    this.gridY = y;
    this.level = level;

    this.maxHp = Math.round(proto.maxHp * Math.pow(1.3, level - 1));
    this.hp = this.maxHp;
    this.isDefense = proto.isDefense || false;
    this.isResource = proto.isResource || false;
    this.isTrap = proto.isTrap || false;
    this.isRevealed = !this.isTrap;

    if (this.isDefense) {
      this.attackRange = proto.attackRange;
      this.attackDmg = Math.round(proto.attackDmg * Math.pow(1.25, level - 1));
      this.attackSpeed = proto.attackSpeed;
      this.projectileType = proto.projectileType;
      this.cooldown = 0;
    }

    if (this.isResource) {
      this.resourceType = proto.resourceType;
      this.productionRate = Math.round(proto.productionRate * Math.pow(1.3, level - 1));
      this.uncollectedAmount = 0;
    }

    this.mesh3D = null;
    this.init3DMesh();
  }

  init3DMesh() {
    if (window.ModelBuilder3D) {
      this.mesh3D = ModelBuilder3D.createBuildingMesh(this.typeId, this.level);
      this.update3DPosition();
      if (this.isTrap && !this.isRevealed) {
        this.mesh3D.visible = false;
      }
    }
  }

  update3DPosition(customEngine = null) {
    const engine = customEngine || (window.strikeGame ? window.strikeGame.threeEngine : null);
    if (!this.mesh3D || !engine) return;
    const wPos = engine.gridToWorld(this.gridX, this.gridY, this.sizeX, this.sizeY);
    this.mesh3D.position.set(wPos.x, wPos.y, wPos.z);
  }

  revealTrap() {
    this.isRevealed = true;
    if (this.mesh3D) {
      this.mesh3D.visible = true;
    }
  }

  getUpgradeCost() {
    const proto = BUILDING_TYPES[this.typeId];
    return Math.round(proto.baseCost * Math.pow(1.6, this.level));
  }

  getSellValue() {
    const proto = BUILDING_TYPES[this.typeId];
    return Math.round((proto.baseCost * Math.pow(1.4, this.level - 1)) * 0.5);
  }

  upgrade() {
    this.level += 1;
    const proto = BUILDING_TYPES[this.typeId];
    this.maxHp = Math.round(proto.maxHp * Math.pow(1.3, this.level - 1));
    this.hp = this.maxHp;
    if (this.isDefense) {
      this.attackDmg = Math.round(proto.attackDmg * Math.pow(1.25, this.level - 1));
    }
    if (this.isResource) {
      this.productionRate = Math.round(proto.productionRate * Math.pow(1.3, this.level - 1));
    }

    if (this.mesh3D) {
      const scale = 1 + (this.level - 1) * 0.1;
      this.mesh3D.scale.set(scale, scale, scale);
    }
  }

  aimTurret3D(targetWorldPos) {
    if (!this.mesh3D) return;
    const turretHead = this.mesh3D.getObjectByName('turret_head');
    if (turretHead) {
      const dx = targetWorldPos.x - this.mesh3D.position.x;
      const dz = targetWorldPos.z - this.mesh3D.position.z;
      turretHead.rotation.y = Math.atan2(dx, dz);
    }
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0 && this.mesh3D) {
      this.mesh3D.visible = false;
    }
    return this.hp <= 0;
  }
}

window.BUILDING_TYPES = BUILDING_TYPES;
window.Building = Building;
