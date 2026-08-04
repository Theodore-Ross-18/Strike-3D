const SPELL_TYPES = {
  ORBITAL_STRIKE: {
    id: 'ORBITAL_STRIKE',
    name: 'Orbital Strike',
    desc: 'Launches a high-powered orbital laser blast dealing heavy splash damage.',
    icon: '💥',
    costPlasma: 100,
    radius: 3.0,
    damage: 350,
    color: '#ff0055'
  },
  NANITE_REPAIR: {
    id: 'NANITE_REPAIR',
    name: 'Nanite Repair',
    desc: 'Deploys a nanite swarm field that rapidly heals friendly units.',
    icon: '💚',
    costPlasma: 80,
    radius: 4.0,
    healAmount: 250,
    color: '#00ffaa'
  },
  OVERDRIVE: {
    id: 'OVERDRIVE',
    name: 'Overdrive Rage',
    desc: 'Empowers units with +50% attack speed and +50% movement speed.',
    icon: '⚡',
    costPlasma: 90,
    radius: 4.0,
    duration: 8.0,
    color: '#ffd166'
  },
  CRYO_FREEZE: {
    id: 'CRYO_FREEZE',
    name: 'Cryo Freeze',
    desc: 'Encases defense turrets in a block of ice, disabling them for 6 seconds.',
    icon: '❄️',
    costPlasma: 110,
    radius: 3.5,
    duration: 6.0,
    color: '#00f0ff'
  }
};

class SpellManager {
  static castSpell(spellTypeId, targetGridX, targetGridY, battleManager) {
    const proto = SPELL_TYPES[spellTypeId];
    if (!proto || !battleManager) return;

    const threeEngine = window.strikeGame ? window.strikeGame.threeEngine : null;
    const targetWPos = threeEngine ? threeEngine.gridToWorld(targetGridX, targetGridY) : { x: 0, y: 0, z: 0 };

    if (window.soundEngine) {
      window.soundEngine.playLaserShot();
    }

    switch (spellTypeId) {
      case 'ORBITAL_STRIKE': {
        // Deal 350 splash damage to enemy buildings within radius
        for (const b of battleManager.enemyBuildings) {
          if (b.hp <= 0) continue;
          const bCenterX = b.gridX + b.sizeX / 2;
          const bCenterY = b.gridY + b.sizeY / 2;
          const dist = Math.hypot(bCenterX - targetGridX, bCenterY - targetGridY);
          if (dist <= proto.radius) {
            b.takeDamage(proto.damage);
          }
        }
        if (threeEngine) {
          threeEngine.spawnExplosion(targetWPos);
        }
        break;
      }

      case 'NANITE_REPAIR': {
        // Heal player units within radius
        for (const u of battleManager.deployedUnits) {
          if (u.hp <= 0) continue;
          const dist = Math.hypot(u.x - targetGridX, u.y - targetGridY);
          if (dist <= proto.radius) {
            u.hp = Math.min(u.maxHp, u.hp + proto.healAmount);
          }
        }
        break;
      }

      case 'CRYO_FREEZE': {
        // Disable enemy turrets for 6 sec
        for (const b of battleManager.enemyBuildings) {
          if (b.hp <= 0 || !b.isDefense) continue;
          const bCenterX = b.gridX + b.sizeX / 2;
          const bCenterY = b.gridY + b.sizeY / 2;
          const dist = Math.hypot(bCenterX - targetGridX, bCenterY - targetGridY);
          if (dist <= proto.radius) {
            b.cooldown = proto.duration; // freeze turret firing cooldown
          }
        }
        break;
      }

      case 'OVERDRIVE': {
        // Boost units speed
        for (const u of battleManager.deployedUnits) {
          if (u.hp <= 0) continue;
          const dist = Math.hypot(u.x - targetGridX, u.y - targetGridY);
          if (dist <= proto.radius) {
            u.speed *= 1.5;
            u.attackSpeed *= 0.6;
          }
        }
        break;
      }
    }

    // Spawn 3D Spell Cylinder Field
    if (threeEngine) {
      const geo = new THREE.CylinderGeometry(proto.radius, proto.radius, 0.4, 16);
      const mat = new THREE.MeshBasicMaterial({ 
        color: proto.color, 
        transparent: true, 
        opacity: 0.5, 
        wireframe: true 
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(targetWPos.x, 0.2, targetWPos.z);
      threeEngine.scene.add(mesh);

      setTimeout(() => {
        threeEngine.scene.remove(mesh);
        geo.dispose();
        mat.dispose();
      }, 1500);
    }
  }
}

window.SPELL_TYPES = SPELL_TYPES;
window.SpellManager = SpellManager;
