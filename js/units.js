const UNIT_TYPES = {
  HERO_COMMANDER: {
    id: 'HERO_COMMANDER',
    name: 'Strike Commander',
    desc: 'Persistent Hero Mechlord unit with high HP and Shield Overdrive active ability.',
    icon: '👑',
    housingSpace: 0, // Hero unit
    trainCostPlasma: 0,
    speed: 1.6,
    maxHp: 2500,
    attackDmg: 90,
    attackRange: 2.0,
    attackSpeed: 0.7,
    favoriteTarget: 'ANY',
    color: '#ffd166',
    isHero: true
  },
  ENFORCER: {
    id: 'ENFORCER',
    name: 'Cyber Enforcer',
    desc: 'Versatile frontline strike infantry with fast automatic rifle fire.',
    icon: '🤖',
    housingSpace: 1,
    trainCostPlasma: 25,
    speed: 1.8,
    maxHp: 180,
    attackDmg: 20,
    attackRange: 1.5,
    attackSpeed: 0.6,
    favoriteTarget: 'ANY',
    color: '#00f0ff'
  },
  JUGGERNAUT: {
    id: 'JUGGERNAUT',
    name: 'Heavy Juggernaut',
    desc: 'Massively armored breach unit that prioritizes destroying defense turrets.',
    icon: '🛡️',
    housingSpace: 4,
    trainCostPlasma: 100,
    speed: 1.1,
    maxHp: 850,
    attackDmg: 35,
    attackRange: 1.2,
    attackSpeed: 1.0,
    favoriteTarget: 'DEFENSE',
    color: '#ffd166'
  },
  SPECTRE: {
    id: 'SPECTRE',
    name: 'Plasma Spectre',
    desc: 'Long-range sniper capable of melting structures from afar.',
    icon: '🎯',
    housingSpace: 2,
    trainCostPlasma: 60,
    speed: 1.5,
    maxHp: 120,
    attackDmg: 55,
    attackRange: 4.5,
    attackSpeed: 1.2,
    favoriteTarget: 'ANY',
    color: '#9d4edd'
  },
  DRONE: {
    id: 'DRONE',
    name: 'Drone Striker',
    desc: 'Fast airborne unit that flies directly over walls to bombard targets.',
    icon: '🛸',
    housingSpace: 3,
    trainCostPlasma: 80,
    speed: 2.5,
    maxHp: 220,
    attackDmg: 40,
    attackRange: 2.5,
    attackSpeed: 0.8,
    favoriteTarget: 'ANY',
    isFlying: true,
    color: '#00ffaa'
  }
};

class Unit {
  constructor(typeId, x, y, researchLevel = 1) {
    const proto = UNIT_TYPES[typeId];
    if (!proto) throw new Error(`Invalid unit type: ${typeId}`);

    this.id = 'u_' + Math.random().toString(36).substring(2, 9);
    this.typeId = typeId;
    this.name = proto.name;
    this.icon = proto.icon;
    this.x = x;
    this.y = y;
    this.researchLevel = researchLevel;

    // Stat multipliers based on Lab Research level
    const mult = Math.pow(1.25, researchLevel - 1);
    this.speed = proto.speed;
    this.maxHp = Math.round(proto.maxHp * mult);
    this.hp = this.maxHp;
    this.attackDmg = Math.round(proto.attackDmg * mult);
    this.attackRange = proto.attackRange;
    this.attackSpeed = proto.attackSpeed;
    this.favoriteTarget = proto.favoriteTarget;
    this.isFlying = proto.isFlying || false;
    this.isHero = proto.isHero || false;
    this.color = proto.color;

    this.shieldActive = false;
    this.targetBuilding = null;
    this.cooldown = 0;
    this.state = 'IDLE';

    this.mesh3D = null;
    this.init3DMesh();
  }

  init3DMesh() {
    if (window.ModelBuilder3D) {
      this.mesh3D = ModelBuilder3D.createUnitMesh(this.typeId);
      this.update3DPosition();
    }
  }

  activateHeroShield() {
    if (!this.isHero) return;
    this.shieldActive = true;
    if (this.mesh3D) {
      const shield = this.mesh3D.getObjectByName('hero_shield');
      if (shield) {
        shield.material.opacity = 0.8;
      }
    }
    setTimeout(() => {
      this.shieldActive = false;
      if (this.mesh3D) {
        const shield = this.mesh3D.getObjectByName('hero_shield');
        if (shield) {
          shield.material.opacity = 0;
        }
      }
    }, 6000);
  }

  update3DPosition() {
    if (!this.mesh3D || !window.strikeGame || !window.strikeGame.threeEngine) return;
    const engine = window.strikeGame.threeEngine;
    const wPos = engine.gridToWorld(this.x, this.y, 0, 0);
    const offsetY = this.isFlying ? 0.8 : 0;
    this.mesh3D.position.set(wPos.x, wPos.y + offsetY, wPos.z);
  }

  update(dt, buildings) {
    if (this.hp <= 0) return;

    if (this.cooldown > 0) {
      this.cooldown -= dt;
    }

    if (!this.targetBuilding || this.targetBuilding.hp <= 0) {
      this.targetBuilding = this.findBestTarget(buildings);
    }

    if (!this.targetBuilding) {
      this.state = 'IDLE';
      return;
    }

    const bCenterX = this.targetBuilding.gridX + this.targetBuilding.sizeX / 2;
    const bCenterY = this.targetBuilding.gridY + this.targetBuilding.sizeY / 2;
    const dx = bCenterX - this.x;
    const dy = bCenterY - this.y;
    const dist = Math.hypot(dx, dy);

    const buildingRadius = Math.max(this.targetBuilding.sizeX, this.targetBuilding.sizeY) / 2;
    const effectiveAttackDist = this.attackRange + buildingRadius;

    if (dist <= effectiveAttackDist) {
      this.state = 'ATTACKING';
      if (this.cooldown <= 0) {
        this.cooldown = this.attackSpeed;
        const destroyed = this.targetBuilding.takeDamage(this.attackDmg);

        if (window.strikeGame && window.strikeGame.threeEngine) {
          const engine = window.strikeGame.threeEngine;
          const uPos = engine.gridToWorld(this.x, this.y);
          const bPos = engine.gridToWorld(bCenterX, bCenterY);
          engine.spawnLaserBeam(uPos, bPos, this.isHero ? 0xffd166 : 0x00f0ff);
        }

        if (window.soundEngine) {
          window.soundEngine.playLaserShot();
        }

        if (destroyed) {
          if (window.strikeGame && window.strikeGame.threeEngine) {
            const engine = window.strikeGame.threeEngine;
            const bPos = engine.gridToWorld(bCenterX, bCenterY);
            engine.spawnExplosion(bPos);
          }
          if (window.soundEngine) {
            window.soundEngine.playExplosion();
          }
          this.targetBuilding = null;
        }
      }
    } else {
      this.state = 'MOVING';
      const moveDist = this.speed * dt;
      this.x += (dx / dist) * moveDist;
      this.y += (dy / dist) * moveDist;

      if (this.mesh3D) {
        const engine = window.strikeGame.threeEngine;
        if (engine) {
          const targetWPos = engine.gridToWorld(bCenterX, bCenterY);
          this.mesh3D.lookAt(targetWPos.x, this.mesh3D.position.y, targetWPos.z);
        }
      }
    }

    this.update3DPosition();
  }

  findBestTarget(buildings) {
    const activeBuildings = buildings.filter(b => b.hp > 0 && b.isRevealed);
    if (activeBuildings.length === 0) return null;

    let candidates = activeBuildings;
    if (this.favoriteTarget === 'DEFENSE') {
      const defenses = activeBuildings.filter(b => b.isDefense);
      if (defenses.length > 0) {
        candidates = defenses;
      }
    }

    let nearest = null;
    let minDistance = Infinity;

    for (const b of candidates) {
      const bCenterX = b.gridX + b.sizeX / 2;
      const bCenterY = b.gridY + b.sizeY / 2;
      const dist = Math.hypot(bCenterX - this.x, bCenterY - this.y);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = b;
      }
    }

    return nearest;
  }

  takeDamage(amount) {
    if (this.shieldActive) {
      amount *= 0.2; // 80% damage reduction when Shield Overdrive is active
    }
    this.hp = Math.max(0, this.hp - amount);
    return this.hp <= 0;
  }
}

window.UNIT_TYPES = UNIT_TYPES;
window.Unit = Unit;
