class ModelBuilder3D {
  static generateMetalPlateTexture() {
    if (this._metalTex) return this._metalTex;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 6;
    for (let i = 0; i <= 512; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i); ctx.lineTo(512, i);
      ctx.stroke();
    }

    ctx.fillStyle = '#94a3b8';
    for (let x = 32; x < 512; x += 64) {
      for (let y = 32; y < 512; y += 64) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    tex.needsUpdate = true;
    this._metalTex = tex;
    return this._metalTex;
  }

  static generateEnergyPatternTexture(hexColor = '#00f0ff') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = hexColor;
    ctx.lineWidth = 3;

    const size = 28;
    for (let y = 0; y < 256 + size; y += size * 1.5) {
      for (let x = 0; x < 256 + size; x += size * Math.sqrt(3)) {
        const cx = x + ((Math.floor(y / (size * 1.5)) % 2) * (size * Math.sqrt(3) / 2));
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const px = cx + size * 0.5 * Math.cos(angle);
          const py = y + size * 0.5 * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    tex.needsUpdate = true;
    return tex;
  }

  static generateDigitalCamoTexture() {
    if (this._camoTex) return this._camoTex;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 256, 256);

    const colors = ['#00f0ff', '#3b82f6', '#60a5fa', '#334155', '#94a3b8'];
    for (let i = 0; i < 1000; i++) {
      const x = Math.floor(Math.random() * 32) * 8;
      const y = Math.floor(Math.random() * 32) * 8;
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.fillRect(x, y, 8, 8);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    this._camoTex = tex;
    return this._camoTex;
  }

  static generateConcreteTexture() {
    if (this._concTex) return this._concTex;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 8000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const val = Math.random() > 0.5 ? 255 : 0;
      ctx.fillStyle = `rgba(${val},${val},${val},0.15)`;
      ctx.fillRect(x, y, 2, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    this._concTex = tex;
    return this._concTex;
  }

  static createBuildingMesh(typeId, level = 1) {
    const group = new THREE.Group();
    const metalTex = this.generateMetalPlateTexture();
    const energyTex = this.generateEnergyPatternTexture('#00f0ff');
    const concTex = this.generateConcreteTexture();

    switch (typeId) {
      case 'HQ': {
        const baseMat = new THREE.MeshStandardMaterial({ map: metalTex, color: 0xffffff, roughness: 0.4, metalness: 0.4 });
        const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.4, 2.8), baseMat);
        baseMesh.position.y = 0.2;
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        group.add(baseMesh);

        const midMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.6, 6), baseMat);
        midMesh.position.y = 0.7;
        midMesh.castShadow = true;
        group.add(midMesh);

        const domeMat = new THREE.MeshStandardMaterial({ 
          map: energyTex,
          color: 0x00f0ff, 
          emissive: 0x00f0ff, 
          emissiveIntensity: 0.8, 
          roughness: 0.1, 
          metalness: 0.3, 
          transparent: true, 
          opacity: 0.85 
        });
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), domeMat);
        dome.position.y = 1.0;
        group.add(dome);

        const spireMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 0.9 });
        const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.8, 8), spireMat);
        spire.position.y = 1.6;
        group.add(spire);
        break;
      }

      case 'LABORATORY': {
        const baseMat = new THREE.MeshStandardMaterial({ map: metalTex, color: 0x00f0ff, roughness: 0.4, metalness: 0.5 });
        const base = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.4, 0.8, 8), baseMat);
        base.position.y = 0.4;
        base.castShadow = true;
        group.add(base);

        const domeMat = new THREE.MeshStandardMaterial({ map: energyTex, color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 0.9 });
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), domeMat);
        dome.position.y = 0.8;
        group.add(dome);

        const radarGroup = new THREE.Group();
        radarGroup.name = 'radar_dish';
        radarGroup.position.set(0, 1.6, 0);
        const dish = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.2, 12), domeMat);
        dish.rotation.x = -Math.PI / 4;
        radarGroup.add(dish);
        group.add(radarGroup);
        break;
      }

      case 'CLAN_HUB': {
        const baseMat = new THREE.MeshStandardMaterial({ map: metalTex, color: 0xffd166, roughness: 0.4, metalness: 0.6 });
        const fortress = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.2, 2.6), baseMat);
        fortress.position.y = 0.6;
        fortress.castShadow = true;
        group.add(fortress);

        const bannerMat = new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffd166, emissiveIntensity: 0.8 });
        const banner = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.1), bannerMat);
        banner.position.set(0, 1.5, 1.35);
        group.add(banner);
        break;
      }

      case 'BUILDER_HUT': {
        const hutMat = new THREE.MeshStandardMaterial({ map: concTex, color: 0x8b949e, roughness: 0.6, metalness: 0.3 });
        const hut = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 1.6), hutMat);
        hut.position.y = 0.4;
        hut.castShadow = true;
        group.add(hut);

        const roofMat = new THREE.MeshStandardMaterial({ color: 0xff3366 });
        const roof = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.6, 4), roofMat);
        roof.rotation.y = Math.PI / 4;
        roof.position.y = 1.1;
        group.add(roof);
        break;
      }

      case 'TESLA': {
        const baseMat = new THREE.MeshStandardMaterial({ map: metalTex, color: 0x1e293b, roughness: 0.4, metalness: 0.8 });
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.4, 8), baseMat);
        base.position.y = 0.2;
        group.add(base);

        const headGroup = new THREE.Group();
        headGroup.name = 'turret_head';
        headGroup.position.y = 0.5;

        const coilMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 0.9 });
        const coil = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), coilMat);
        headGroup.add(coil);
        group.add(headGroup);
        break;
      }

      case 'LANDMINE': {
        const mineMat = new THREE.MeshStandardMaterial({ color: 0xff3366, emissive: 0xff3366, emissiveIntensity: 0.5 });
        const mine = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.1, 8), mineMat);
        mine.position.y = 0.05;
        group.add(mine);
        break;
      }

      case 'CREDIT_MINE': {
        const baseMat = new THREE.MeshStandardMaterial({ map: metalTex, color: 0xffffff, roughness: 0.4, metalness: 0.4 });
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 1.8), baseMat);
        base.position.y = 0.15;
        base.castShadow = true;
        group.add(base);

        const siloMat = new THREE.MeshStandardMaterial({ map: metalTex, color: 0xffd166, roughness: 0.3, metalness: 0.5 });
        const silo = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.7, 1.2, 12), siloMat);
        silo.position.y = 0.9;
        silo.castShadow = true;
        group.add(silo);

        const ringMat = new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffd166, emissiveIntensity: 0.8 });
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.08, 8, 16), ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.9;
        group.add(ring);
        break;
      }

      case 'PLASMA_SYNTH': {
        const baseMat = new THREE.MeshStandardMaterial({ map: metalTex, color: 0xffffff, roughness: 0.5, metalness: 0.4 });
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 1.8), baseMat);
        base.position.y = 0.15;
        base.castShadow = true;
        group.add(base);

        const pylonMat = new THREE.MeshStandardMaterial({ map: metalTex, color: 0x00ffaa, roughness: 0.3, metalness: 0.5 });
        const coords = [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]];
        coords.forEach(([cx, cz]) => {
          const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.0, 8), pylonMat);
          pylon.position.set(cx, 0.8, cz);
          pylon.castShadow = true;
          group.add(pylon);
        });

        const plasmaTex = this.generateEnergyPatternTexture('#00ffaa');
        const coreMat = new THREE.MeshStandardMaterial({ 
          map: plasmaTex,
          color: 0x00ffaa, 
          emissive: 0x00ffaa, 
          emissiveIntensity: 0.9, 
          roughness: 0.1 
        });
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), coreMat);
        core.position.y = 1.0;
        core.name = 'plasma_core';
        group.add(core);
        break;
      }

      case 'GATLING': {
        const baseMat = new THREE.MeshStandardMaterial({ map: metalTex, color: 0xffffff, roughness: 0.4, metalness: 0.4 });
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.5, 12), baseMat);
        base.position.y = 0.25;
        base.castShadow = true;
        group.add(base);

        const headGroup = new THREE.Group();
        headGroup.name = 'turret_head';
        headGroup.position.y = 0.6;

        const headMat = new THREE.MeshStandardMaterial({ map: metalTex, color: 0xff3366, roughness: 0.3, metalness: 0.4 });
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.6), headMat);
        head.castShadow = true;
        headGroup.add(head);

        const barrelMat = new THREE.MeshStandardMaterial({ map: metalTex, color: 0x334155, roughness: 0.3, metalness: 0.6 });
        const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 8), barrelMat);
        b1.rotation.x = Math.PI / 2;
        b1.position.set(-0.15, 0, 0.4);

        const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 8), barrelMat);
        b2.rotation.x = Math.PI / 2;
        b2.position.set(0.15, 0, 0.4);

        headGroup.add(b1);
        headGroup.add(b2);
        group.add(headGroup);
        break;
      }

      case 'PLASMA_CANNON': {
        const baseMat = new THREE.MeshStandardMaterial({ map: metalTex, color: 0xffffff, roughness: 0.3, metalness: 0.4 });
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.5, 8), baseMat);
        base.position.y = 0.25;
        base.castShadow = true;
        group.add(base);

        const headGroup = new THREE.Group();
        headGroup.name = 'turret_head';
        headGroup.position.y = 0.5;

        const cannonMat = new THREE.MeshStandardMaterial({ map: metalTex, color: 0x9d4edd, emissive: 0x9d4edd, emissiveIntensity: 0.4 });
        const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.9, 12), cannonMat);
        cannon.rotation.x = Math.PI / 4;
        cannon.position.z = 0.3;
        cannon.castShadow = true;
        headGroup.add(cannon);

        group.add(headGroup);
        break;
      }

      case 'BARRACKS': {
        const wallMat = new THREE.MeshStandardMaterial({ map: metalTex, color: 0x3b82f6, roughness: 0.4, metalness: 0.4 });
        const hangar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.0, 1.7), wallMat);
        hangar.position.y = 0.5;
        hangar.castShadow = true;
        group.add(hangar);

        const roofMat = new THREE.MeshStandardMaterial({ map: metalTex, color: 0x60a5fa, roughness: 0.3, metalness: 0.4 });
        const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.6, 12, 1, false, 0, Math.PI), roofMat);
        roof.rotation.z = Math.PI / 2;
        roof.position.y = 1.0;
        group.add(roof);

        const radarGroup = new THREE.Group();
        radarGroup.name = 'radar_dish';
        radarGroup.position.set(0.8, 1.6, 0);

        const dishMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 0.5 });
        const dish = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.2, 12), dishMat);
        dish.rotation.x = -Math.PI / 3;
        radarGroup.add(dish);
        group.add(radarGroup);
        break;
      }

      case 'WALL': {
        const mat = new THREE.MeshStandardMaterial({ map: concTex, color: 0xffffff, roughness: 0.6, metalness: 0.3 });
        const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), mat);
        p1.position.y = 0.4;
        p1.castShadow = true;
        group.add(p1);

        const fieldMat = new THREE.MeshStandardMaterial({ 
          map: energyTex,
          color: 0x00f0ff, 
          emissive: 0x00f0ff, 
          emissiveIntensity: 0.6, 
          transparent: true, 
          opacity: 0.7 
        });
        const field = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.2), fieldMat);
        field.position.y = 0.4;
        group.add(field);
        break;
      }
    }

    return group;
  }

  static createUnitMesh(typeId) {
    const group = new THREE.Group();
    const camoTex = this.generateDigitalCamoTexture();
    const metalTex = this.generateMetalPlateTexture();
    const energyTex = this.generateEnergyPatternTexture('#00ffaa');

    switch (typeId) {
      case 'HERO_COMMANDER': {
        // Massive Strike Commander Mechlord
        const mat = new THREE.MeshStandardMaterial({ map: metalTex, color: 0xffd166, roughness: 0.2, metalness: 0.6 });
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.7), mat);
        torso.position.y = 0.6;
        torso.castShadow = true;
        group.add(torso);

        const headMat = new THREE.MeshStandardMaterial({ color: 0xff0055, emissive: 0xff0055, emissiveIntensity: 0.9 });
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), headMat);
        head.position.y = 1.15;
        group.add(head);

        const gunMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 0.6 });
        const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8), gunMat);
        arm1.rotation.x = Math.PI / 2;
        arm1.position.set(-0.55, 0.6, 0.3);

        const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8), gunMat);
        arm2.rotation.x = Math.PI / 2;
        arm2.position.set(0.55, 0.6, 0.3);

        group.add(arm1);
        group.add(arm2);

        // Shield Overdrive Holographic Ring Mesh
        const shieldGeo = new THREE.SphereGeometry(1.2, 16, 16);
        const shieldMat = new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0, wireframe: true });
        const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        shieldMesh.position.y = 0.6;
        shieldMesh.name = 'hero_shield';
        group.add(shieldMesh);
        break;
      }

      case 'ENFORCER': {
        const mat = new THREE.MeshStandardMaterial({ map: camoTex, color: 0xffffff, roughness: 0.3, metalness: 0.4 });
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.5, 8), mat);
        body.position.y = 0.25;
        body.castShadow = true;
        group.add(body);

        const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x00f0ff, emissiveIntensity: 0.8 });
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), headMat);
        head.position.y = 0.55;
        group.add(head);
        break;
      }

      case 'JUGGERNAUT': {
        const mat = new THREE.MeshStandardMaterial({ map: metalTex, color: 0xffd166, roughness: 0.3, metalness: 0.5 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.5), mat);
        body.position.y = 0.35;
        body.castShadow = true;
        group.add(body);

        const gunMat = new THREE.MeshStandardMaterial({ map: metalTex, color: 0x475569, roughness: 0.3, metalness: 0.6 });
        const g1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8), gunMat);
        g1.rotation.x = Math.PI / 2;
        g1.position.set(-0.3, 0.5, 0.1);

        const g2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8), gunMat);
        g2.rotation.x = Math.PI / 2;
        g2.position.set(0.3, 0.5, 0.1);

        group.add(g1);
        group.add(g2);
        break;
      }

      case 'SPECTRE': {
        const mat = new THREE.MeshStandardMaterial({ map: camoTex, color: 0xd8b4fe, roughness: 0.3, metalness: 0.4 });
        const body = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 8), mat);
        body.position.y = 0.3;
        body.castShadow = true;
        group.add(body);

        const rifleMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 0.9 });
        const rifle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8), rifleMat);
        rifle.rotation.x = Math.PI / 2;
        rifle.position.set(0, 0.35, 0.3);
        group.add(rifle);
        break;
      }

      case 'DRONE': {
        const mat = new THREE.MeshStandardMaterial({ map: energyTex, color: 0x00ffaa, roughness: 0.3, metalness: 0.5 });
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), mat);
        core.position.y = 0.8;
        group.add(core);

        const ringMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x00ffaa, emissiveIntensity: 0.6 });
        const coords = [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]];
        coords.forEach(([rx, rz]) => {
          const rotor = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 12), ringMat);
          rotor.rotation.x = Math.PI / 2;
          rotor.position.set(rx, 0.8, rz);
          group.add(rotor);
        });
        break;
      }
    }

    return group;
  }
}

window.ModelBuilder3D = ModelBuilder3D;
