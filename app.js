// === Simple Cesium Viewer ===
const cesiumViewer = new Cesium.Viewer('cesiumContainer');
cesiumViewer.scene.globe.show = true;

// === DOM Elements ===
const fpsCounterVal = document.getElementById('fpsVal');
const vertexCounterVal = document.getElementById('vertexVal');
const lodInputEl = document.getElementById('lodInput');
const lodDisplayEl = document.getElementById('lodDisplay');
const autoLodCheckbox = document.getElementById('autoLodToggle');
const featureCounterVal = document.getElementById('featureVal');
const lodCounterVal = document.getElementById('lodVal');

// === Global LOD factor (0–1) ===
let lodFactor = 1.0;

// === Update LOD value from input ===
lodInputEl.addEventListener('input', () => {
  const inputVal = parseFloat(lodInputEl.value);
  if (!isNaN(inputVal)) {
    lodFactor = Math.max(0, Math.min(1, inputVal));
    lodDisplayEl.textContent = lodFactor.toFixed(2);
  }
});

// === LOD factor calculation based on camera height (close = 1.0, far = 0.05) ===
function calculateLodFactor(cameraHeight) {
  const minHeight = 2000;
  const maxHeight = 4000000;
  if (cameraHeight < minHeight) return 1.0;
  if (cameraHeight > maxHeight) return 0.05;
  return 1.0 - ((cameraHeight - minHeight) / (maxHeight - minHeight)) * (1.0 - 0.05);
}

// === Auto LOD update based on camera height ===
function updateAutoLod() {
  const cameraHeight = cesiumViewer.camera.positionCartographic.height;
  lodFactor = calculateLodFactor(cameraHeight);
  lodInputEl.value = lodFactor.toFixed(2);
  lodDisplayEl.textContent = lodFactor.toFixed(2);
}

// === Dynamic polyline width for high altitudes ===
function getDynamicLineWidth(cameraHeight) {
  if (cameraHeight < 2000) return 5;
  if (cameraHeight > 4000000) return 18;
  return 5 + (cameraHeight - 2000) * (18 - 5) / (4000000 - 2000);
}

// === Polyline LOD simplification (more vertices when close, fewer when far) ===
function simplifyPolylineByLod(polyline, lod) {
  const minPoints = 2;
  const maxPoints = polyline.length;
  const pointCount = Math.max(minPoints, Math.ceil(maxPoints * lod));
  if (pointCount >= maxPoints) return polyline;
  const step = (maxPoints - 1) / (pointCount - 1);
  const simplified = [];
  for (let i = 0; i < pointCount; i++) {
    let idx = Math.round(i * step);
    if (i === 0) idx = 0;
    if (i === pointCount - 1) idx = maxPoints - 1;
    simplified.push(polyline[idx]);
  }
  return simplified;
}

// === Extract each polyline feature from model (NO merging, each polyline is a separate feature) ===
function extractPolylinesFromModel(model) {
  const features = [];
  if (!model?.scene) return features;

  model.scene.traverse(node => {
    if (!node.mesh) return;
    node.mesh.primitives.forEach(primitive => {
      const positionAttr = primitive.attributes.find(attr => attr.name === 'POSITION');
      const indicesAttr = primitive.indices;
      if (!positionAttr) return;

      // Build array of positions
      const positions = [];
      for (let i = 0; i < positionAttr.count; i++) {
        const idx = i * 3;
        positions.push([
          positionAttr.values[idx],
          positionAttr.values[idx + 1],
          positionAttr.values[idx + 2]
        ]);
      }

      // --- Each LINE_STRIP is a separate polyline/feature ---
      if (primitive.primitiveType === Cesium.ModelPrimitiveType.LINE_STRIP) {
        let polyline = [];
        if (indicesAttr) {
          for (let i = 0; i < indicesAttr.count; i++) {
            polyline.push(positions[indicesAttr.values[i]]);
          }
        } else {
          polyline = positions;
        }
        features.push(polyline); // Add as separate feature
      }

      // --- Each LINES primitive: every segment is a separate feature (segment) ---
      else if (primitive.primitiveType === Cesium.ModelPrimitiveType.LINES) {
        if (indicesAttr) {
          for (let i = 0; i < indicesAttr.count; i += 2) {
            features.push([
              positions[indicesAttr.values[i]],
              positions[indicesAttr.values[i + 1]]
            ]);
          }
        } else {
          for (let i = 0; i < positions.length - 1; i += 2) {
            features.push([positions[i], positions[i + 1]]);
          }
        }
      }
    });
  });
  return features;
}

// === Create polyline primitive for multiple features ===
function createPolylinePrimitive(featuresArr, color, lineWidth) {
  const geometryInstances = featuresArr.map(polyline => {
    const positions = Cesium.Cartesian3.fromArray(polyline.flat());
    return new Cesium.GeometryInstance({
      geometry: new Cesium.PolylineGeometry({
        positions,
        width: lineWidth
      }),
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(color)
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
      const features = model ? extractPolylinesFromModel(model) : [];
      console.log("Tile loaded, features found:", features.length);
      tileDataMap.set(tile, {
        features,
        yellowPrimitive: null
      });
    });
  })
  .catch(err => console.error('Failed to load tileset:', err));

// === FPS, Vertex, Feature, and LOD Counters ===
let lastFpsUpdate = performance.now();
let fpsCounter = 0;
let vertexCount = 0;
let featureCount = 0;

// === Main render loop ===
cesiumViewer.scene.postRender.addEventListener(() => {
  const now = performance.now();

  fpsCounter++;
  if (now - lastFpsUpdate >= 1000) {
    fpsCounterVal.textContent = Math.round(fpsCounter * 1000 / (now - lastFpsUpdate));
    vertexCounterVal.textContent = vertexCount;
    featureCounterVal.textContent = featureCount;
    lodCounterVal.textContent = lodFactor.toFixed(2);
    fpsCounter = 0;
    lastFpsUpdate = now;
  }

  vertexCount = 0; // Reset at start of frame
  featureCount = 0;

  // Auto LOD
  if (autoLodCheckbox.checked) updateAutoLod();

  if (!tilesetInstance || !tilesetInstance._selectedTiles) return;

  const cameraHeight = cesiumViewer.camera.positionCartographic.height;
  const lod = autoLodCheckbox.checked ? calculateLodFactor(cameraHeight) : lodFactor;
  const dynamicLineWidth = getDynamicLineWidth(cameraHeight);

  tilesetInstance._selectedTiles.forEach(tile => {
    const tileInfo = tileDataMap.get(tile);
    if (!tileInfo) return;

    // Remove previous primitive to avoid memory buildup
    if (tileInfo.yellowPrimitive) cesiumViewer.scene.primitives.remove(tileInfo.yellowPrimitive);

    // Count features
    featureCount += tileInfo.features.length;

    // Simplify and count vertices per feature/polyline (correct way)
    const simplifiedFeatures = tileInfo.features.map(feature => {
      const simplified = simplifyPolylineByLod(feature, lod);
      vertexCount += simplified.length;
      return simplified;
    });

    tileInfo.yellowPrimitive = createPolylinePrimitive(simplifiedFeatures, Cesium.Color.YELLOW, dynamicLineWidth);
    if (tileInfo.yellowPrimitive) cesiumViewer.scene.primitives.add(tileInfo.yellowPrimitive);
  });

  // Update instantly (not just every second) for more accurate feedback
  vertexCounterVal.textContent = vertexCount;
  featureCounterVal.textContent = featureCount;
  lodCounterVal.textContent = (autoLodCheckbox.checked ? lod : lodFactor).toFixed(2);
});