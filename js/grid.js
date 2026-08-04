class IsoGridRenderer {
  constructor() {
    this.gridSize = 30;
  }

  // Legacy API wrapper mapping to ThreeEngine 3D World coordinates
  gridToWorld(gx, gy, sizeX = 1, sizeY = 1) {
    if (window.strikeGame && window.strikeGame.threeEngine) {
      return window.strikeGame.threeEngine.gridToWorld(gx, gy, sizeX, sizeY);
    }
    return { x: gx, y: 0, z: gy };
  }

  worldToGrid(wx, wz) {
    if (window.strikeGame && window.strikeGame.threeEngine) {
      return window.strikeGame.threeEngine.worldToGrid(wx, wz);
    }
    return { x: Math.floor(wx), z: Math.floor(wz) };
  }
}

window.IsoGridRenderer = IsoGridRenderer;
