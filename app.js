// === Simple Cesium Viewer ===
const cesiumViewer = new Cesium.Viewer('cesiumContainer');
cesiumViewer.scene.globe.show = true;

// === DOM Elements ===
const fpsCounterVal = document.getElementById('fpsVal');
const vertexCounterVal = document.getElementById('vertexVal');
const lodInputEl = document.getElementById('lodInput');
const lodDisplayEl = document.getElementById('lodDisplay');
const autoLodCheckbox = document.getElementById('autoLodToggle');

// === Global LOD factor (0–1) ===
let lodFactorVal = 1.0;

// === Update LOD value from input ===
lodInputEl.addEventListener('input', () => {
  const inputVal = parseFloat(lodInputEl.value);
  if (!isNaN(inputVal)) {
    lodFactorVal = Math.max(0, Math.min(1, inputVal));
    lodDisplayEl.textContent = lodFactorVal.toFixed(2);
  }
});

// === Automatically update LOD from camera height ===
function updateAutoLod() {
  const cameraHeight = cesiumViewer.camera.positionCartographic.height;
  let factorVal = 1.0;
  if (cameraHeight > 500) {
    factorVal = Math.max(0.05, 1.0 - Math.log10(cameraHeight / 500) * 0.4);
  }
  lodFactorVal = Math.max(0.05, Math.min(1.0, factorVal));
  lodInputEl.value = lodFactorVal.toFixed(2);
  lodDisplayEl.textContent = lodFactorVal.toFixed(2);
}

// === Polyline LOD simplification helper ===
// refactor: extracted simplification into its own function for clarity and reuse
function simplifyLineLOD(line, lodFactor) {
  const pointCount = Math.max(2, Math.ceil(line.length * lodFactor));
  if (line.length <= 2 || pointCount >= line.length) return line;
  const step = (line.length - 1) / (pointCount - 1);
  const simplified = [];
  for (let i = 0; i < pointCount; i++) {
    const idx = Math.round(i * step);
    simplified.push(line[idx]);
  }
  return simplified;
}

// === Extract LINE geometry from GLB ===
function extractLinesFromModel(model) {
  const linesArray = [];
  if (!model?.scene) return linesArray;

  model.scene.traverse(node => {
    if (!node.mesh) return;
    node.mesh.primitives.forEach(primitive => {
      if (primitive.primitiveType !== Cesium.ModelPrimitiveType.LINES) return;

      const positionAttr = primitive.attributes.find(attr => attr.name === 'POSITION');
      const indicesAttr = primitive.indices;

      if (!positionAttr) return;

      const positions = [];
      for (let i = 0; i < positionAttr.count; i++) {
        const idx = i * 3;
        positions.push([
          positionAttr.values[idx],
          positionAttr.values[idx + 1],
          positionAttr.values[idx + 2]
        ]);
      }

      if (indicesAttr) {
        const line = [];
        for (let i = 0; i < indicesAttr.count; i++) {
          const vertexIndex = indicesAttr.values[i];
          line.push(positions[vertexIndex]);
        }
        linesArray.push(line);
      } else {
        linesArray.push(positions);
      }
    });
  });

  return linesArray;
}

// === Create polyline primitive for multiple lines ===
function createPolylinePrimitive(linesArr, colorVal, lineWidth) {
  const geometryInstances = linesArr.map(line => {
    const positions = Cesium.Cartesian3.fromArray(line.flat());
    return new Cesium.GeometryInstance({
      geometry: new Cesium.PolylineGeometry({
        positions,
        width: lineWidth
      }),
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(colorVal)
      }
    });
  });

  return new Cesium.Primitive({
    geometryInstances,
    appearance: new Cesium.PolylineColorAppearance(),
    asynchronous: false
  });
}

// === Data store for each tile ===
let tilesetInstance;
const tileDataMap = new Map();

// === Load 3D Tileset ===
Cesium.Cesium3DTileset.fromUrl('aggr/tileset.json')
  .then(tileset => {
    tilesetInstance = tileset;
    cesiumViewer.scene.primitives.add(tileset);
    cesiumViewer.zoomTo(tileset);
    console.log('Tileset loaded');

    tileset.tileLoad.addEventListener(tile => {
      const model = tile.content._model;
      const lines = model ? extractLinesFromModel(model) : [];
      tileDataMap.set(tile, {
        lines,
        yellowPrimitive: null
      });
    });
  })
  .catch(err => console.error('Failed to load tileset:', err));

// === FPS and Vertex Counter ===
let lastFpsUpdate = performance.now();
let fpsCounter = 0;
let vertexCount = 0;

// === Main render loop ===
cesiumViewer.scene.postRender.addEventListener(() => {
  const now = performance.now();

  // Update FPS and vertex count
  fpsCounter++;
  if (now - lastFpsUpdate >= 1000) {
    fpsCounterVal.textContent = Math.round(fpsCounter * 1000 / (now - lastFpsUpdate));
    vertexCounterVal.textContent = vertexCount;
    fpsCounter = 0;
    lastFpsUpdate = now;
    vertexCount = 0;
  }

  // Auto LOD
  if (autoLodCheckbox.checked) updateAutoLod();

  if (!tilesetInstance || !tilesetInstance._selectedTiles) return;

  tilesetInstance._selectedTiles.forEach(tile => {
    const tileInfo = tileDataMap.get(tile);
    if (!tileInfo) return;

    if (tileInfo.yellowPrimitive) cesiumViewer.scene.primitives.remove(tileInfo.yellowPrimitive);

    // refactor: use the extracted simplifyLineLOD function for LOD simplification
    const simplifiedLines = tileInfo.lines.map(line => simplifyLineLOD(line, lodFactorVal));

    // Count vertices
    vertexCount += simplifiedLines.reduce((sum, line) => sum + line.length, 0);

    tileInfo.yellowPrimitive = createPolylinePrimitive(simplifiedLines, Cesium.Color.YELLOW, 5);
    if (tileInfo.yellowPrimitive) cesiumViewer.scene.primitives.add(tileInfo.yellowPrimitive);
  });
});