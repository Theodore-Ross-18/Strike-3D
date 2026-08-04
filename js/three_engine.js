class ThreeEngine {
  constructor(containerEl) {
    this.container = containerEl;
    this.gridSize = 30;
    this.tileSize = 1.0;

    // Three.js Core
    this.scene = new THREE.Scene();
    this.fog = new THREE.FogExp2(0x1e293b, 0.008);
    this.scene.fog = this.fog;

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 22, 26);

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Orbit Controls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 60;
    this.controls.target.set(0, 0, 0);

    // Lighting
    this.setupLighting();

    // Terrain & Grid Base
    this.setupTerrain();

    // Placement Hover Marker
    this.setupHoverMarker();

    // Raycaster & Mouse
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoverGridPos = { x: -1, z: -1 };

    // Laser Beams & Particles Container Group
    this.fxGroup = new THREE.Group();
    this.scene.add(this.fxGroup);

    // Default Time of Day: MORNING
    this.setTimeOfDay('MORNING');

    window.addEventListener('resize', () => this.onWindowResize());
  }

  generateGrassTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#1b4332');
    grad.addColorStop(0.5, '#2d6a4f');
    grad.addColorStop(1, '#1e4620');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    const colors = ['#40916c', '#52b788', '#74c69d', '#95d5b2', '#143614', '#2d6a4f'];
    for (let i = 0; i < 25000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const len = 3 + Math.random() * 8;
      const angle = (Math.random() - 0.5) * 0.8;

      ctx.strokeStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.lineWidth = 1 + Math.random() * 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.sin(angle) * len, y - Math.cos(angle) * len);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(15, 15);
    texture.needsUpdate = true;
    return texture;
  }

  setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
    this.sunLight.position.set(10, 45, 15);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 80;
    const d = 20;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);

    this.rimLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    this.rimLight.position.set(-20, 20, -20);
    this.scene.add(this.rimLight);
  }

  setTimeOfDay(preset) {
    if (preset === 'MORNING') {
      this.scene.background = new THREE.Color(0x1e293b);
      this.fog.color.setHex(0x1e293b);
      this.fog.density = 0.008;

      this.ambientLight.color.setHex(0xfed7aa);
      this.ambientLight.intensity = 1.2;

      this.sunLight.color.setHex(0xffb703);
      this.sunLight.intensity = 1.8;
      this.sunLight.position.set(30, 15, 15);

      this.rimLight.color.setHex(0xf97316);
      this.rimLight.intensity = 1.0;
    } else if (preset === 'NOON') {
      this.scene.background = new THREE.Color(0x0f172a);
      this.fog.color.setHex(0x0f172a);
      this.fog.density = 0.005;

      this.ambientLight.color.setHex(0xffffff);
      this.ambientLight.intensity = 1.5;

      this.sunLight.color.setHex(0xffffff);
      this.sunLight.intensity = 2.2;
      this.sunLight.position.set(10, 45, 15);

      this.rimLight.color.setHex(0x38bdf8);
      this.rimLight.intensity = 0.8;
    } else if (preset === 'NIGHT') {
      this.scene.background = new THREE.Color(0x05080e);
      this.fog.color.setHex(0x05080e);
      this.fog.density = 0.012;

      this.ambientLight.color.setHex(0x38bdf8);
      this.ambientLight.intensity = 0.7;

      this.sunLight.color.setHex(0x00f0ff);
      this.sunLight.intensity = 1.3;
      this.sunLight.position.set(15, 25, 20);

      this.rimLight.color.setHex(0x9d4edd);
      this.rimLight.intensity = 1.0;
    }
  }

  setupTerrain() {
    const totalWorldSize = this.gridSize * this.tileSize;

    this.grassTexture = this.generateGrassTexture();
    const groundGeo = new THREE.PlaneGeometry(totalWorldSize, totalWorldSize);
    const groundMat = new THREE.MeshStandardMaterial({ 
      map: this.grassTexture,
      roughness: 0.7, 
      metalness: 0.1 
    });
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    const gridHelper = new THREE.GridHelper(totalWorldSize, this.gridSize, 0x00f0ff, 0x52b788);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);

    const boundaryGeo = new THREE.BoxGeometry(totalWorldSize + 0.4, 0.2, totalWorldSize + 0.4);
    const boundaryMat = new THREE.MeshStandardMaterial({ 
      color: 0x00f0ff, 
      emissive: 0x00f0ff, 
      emissiveIntensity: 0.5, 
      wireframe: true 
    });
    const boundary = new THREE.Mesh(boundaryGeo, boundaryMat);
    boundary.position.y = 0.1;
    this.scene.add(boundary);
  }

  setupHoverMarker() {
    const geo = new THREE.BoxGeometry(1, 0.05, 1);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.5 });
    this.hoverMarker = new THREE.Mesh(geo, mat);
    this.hoverMarker.visible = false;
    this.scene.add(this.hoverMarker);
  }

  gridToWorld(gx, gz, sizeX = 1, sizeZ = 1) {
    const halfGrid = this.gridSize / 2;
    const wx = (gx + sizeX / 2 - halfGrid) * this.tileSize;
    const wz = (gz + sizeZ / 2 - halfGrid) * this.tileSize;
    return { x: wx, y: 0, z: wz };
  }

  worldToGrid(wx, wz) {
    const halfGrid = this.gridSize / 2;
    const gx = Math.floor(wx / this.tileSize + halfGrid);
    const gz = Math.floor(wz / this.tileSize + halfGrid);
    return { x: gx, z: gz };
  }

  updateRaycast(mouseX, mouseY) {
    this.mouse.x = (mouseX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(mouseY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.groundMesh);

    if (intersects.length > 0) {
      const hitPt = intersects[0].point;
      const gPos = this.worldToGrid(hitPt.x, hitPt.z);
      this.hoverGridPos = gPos;
      return gPos;
    }

    this.hoverGridPos = { x: -1, z: -1 };
    return null;
  }

  showHoverPlacement(proto, isValid) {
    if (this.hoverGridPos.x >= 0 && this.hoverGridPos.z >= 0) {
      const sx = proto.sizeX;
      const sz = proto.sizeY;
      const wPos = this.gridToWorld(this.hoverGridPos.x, this.hoverGridPos.z, sx, sz);

      this.hoverMarker.scale.set(sx, 1, sz);
      this.hoverMarker.position.set(wPos.x, 0.05, wPos.z);
      this.hoverMarker.material.color.setHex(isValid ? 0x00ffaa : 0xff3366);
      this.hoverMarker.visible = true;
    } else {
      this.hoverMarker.visible = false;
    }
  }

  hideHoverPlacement() {
    this.hoverMarker.visible = false;
  }

  spawnLaserBeam(startWorld, endWorld, colorHex = 0x00f0ff) {
    const p1 = new THREE.Vector3(startWorld.x, startWorld.y + 0.8, startWorld.z);
    const p2 = new THREE.Vector3(endWorld.x, endWorld.y + 0.4, endWorld.z);

    const distance = p1.distanceTo(p2);
    const geo = new THREE.CylinderGeometry(0.04, 0.04, distance, 8);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    const beam = new THREE.Mesh(geo, mat);

    beam.position.copy(p1).clone().add(p2).multiplyScalar(0.5);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize());

    this.fxGroup.add(beam);

    setTimeout(() => {
      this.fxGroup.remove(beam);
      geo.dispose();
      mat.dispose();
    }, 150);
  }

  spawnExplosion(worldPos) {
    const geo = new THREE.SphereGeometry(0.8, 12, 12);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff3366, transparent: true, opacity: 0.9 });
    const sphere = new THREE.Mesh(geo, mat);
    sphere.position.set(worldPos.x, 0.8, worldPos.z);
    this.fxGroup.add(sphere);

    let scale = 1.0;
    const anim = setInterval(() => {
      scale += 0.2;
      sphere.scale.set(scale, scale, scale);
      mat.opacity -= 0.1;
      if (mat.opacity <= 0) {
        clearInterval(anim);
        this.fxGroup.remove(sphere);
        geo.dispose();
        mat.dispose();
      }
    }, 30);
  }

  resetCamera() {
    this.camera.position.set(0, 22, 26);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

window.ThreeEngine = ThreeEngine;
