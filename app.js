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

// === Dynamic polyline width at high altitudes ===
// refactor: Make polylines thicker as camera height increases to stay visible
function getDynamicLineWidth(cameraHeight) {
  // 5px at low altitude, up to 18px at high altitude (adjust as needed)
  if (cameraHeight < 2000) return 5;
  if (cameraHeight > 4000000) return 18;
  return 5 + (cameraHeight - 2000) * (18 - 5) / (4000000 - 2000);
}

// === Polyline LOD simplification helper ===
// refactor: Always include endpoints to reduce cracks in simplified lines
function simplifyLineLOD(line, lodFactor) {
  const pointCount = Math.max(2, Math.ceil(line.length * lodFactor));
  if (line.length <= 2 || pointCount >= line.length) return line;
  const step = (line.length - 1) / (pointCount - 1);
  const simplified = [];
  for (let i = 0; i < pointCount; i++) {
    let idx = Math.round(i * step);
    // refactor: Always include first and last point
    if (i === 0) idx = 0;
    if (i === pointCount - 1) idx = line.length - 1;
    simplified.push(line[idx]);
  }
  return simplified;
}

// === LOD line filtering helper ===
// refactor: Reduce number of lines rendered at high altitude (no merge, no data loss)
function filterLinesLOD(lines, lodFactor) {
  // refactor: Only render a subset of lines according to LOD
  const count = Math.max(1, Math.floor(lines.length * lodFactor));
  const step = Math.max(1, Math.floor(lines.length / count));
  const filtered = [];
  for (let i = 0; i < lines.length && filtered.length < count; i += step) {
    filtered.push(lines[i]);
  }
  return filtered;
}

// === Extract LINE geometry from GLB ===
// refactor: extract each line segment or strip as a separate array for correct LOD
function extractLinesFromModel(model) {
  const linesArray = [];
  if (!model?.scene) return linesArray;

  model.scene.traverse(node => {
    if (!node.mesh) return;
    node.mesh.primitives.forEach(primitive => {
      const positionAttr = primitive.attributes.find(attr => attr.name === 'POSITION');
      const indicesAttr = primitive.indices;
      if (!positionAttr) return;

      // Extract positions array
      const positions = [];
      for (let i = 0; i < positionAttr.count; i++) {
        const idx = i * 3;
        positions.push([
          positionAttr.values[idx],
          positionAttr.values[idx + 1],
          positionAttr.values[idx + 2]
        ]);
      }

      // --- Polyline extraction logic (the main refactor) ---
      if (primitive.primitiveType === Cesium.ModelPrimitiveType.LINES) {
        // Each pair of indices is a segment: [A,B], [C,D], ...
        if (indicesAttr) {
          for (let i = 0; i < indicesAttr.count; i += 2) {
            linesArray.push([positions[indicesAttr.values[i]], positions[indicesAttr.values[i + 1]]]);
          }
        } else {
          // If no indices, treat as consecutive pairs
          for (let i = 0; i < positions.length - 1; i += 2) {
            linesArray.push([positions[i], positions[i + 1]]);
          }
        }
      } else if (primitive.primitiveType === Cesium.ModelPrimitiveType.LINE_STRIP) {
        // GLTF/GLB "LINE_STRIP": treat the whole as a single polyline
        // But ideally, split at known break points if needed (e.g., based on application logic)
        if (indicesAttr) {
          const polyline = [];
          for (let i = 0; i < indicesAttr.count; i++) {
            polyline.push(positions[indicesAttr.values[i]]);
          }
          linesArray.push(polyline);
        } else {
          linesArray.push(positions);
        }
      }
    });
  });

  return linesArray;
}

// === Create polyline primitive for multiple lines ===
function createPolylinePrimitive(linesArr, colorVal, lineWidth) {
  // refactor: creates polylines from provided simplified/filtered lines
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
    vertexCounterVal.textContent = vertexCount; // refactor: show only actually rendered vertices
    fpsCounter = 0;
    lastFpsUpdate = now;
    vertexCount = 0;
  }

  // Auto LOD
  if (autoLodCheckbox.checked) updateAutoLod();

  if (!tilesetInstance || !tilesetInstance._selectedTiles) return;

  // refactor: get current camera height for dynamic width
  const cameraHeight = cesiumViewer.camera.positionCartographic.height;
  const dynamicLineWidth = getDynamicLineWidth(cameraHeight); // refactor: dynamic width

  tilesetInstance._selectedTiles.forEach(tile => {
    const tileInfo = tileDataMap.get(tile);
    if (!tileInfo) return;

    // Remove previous primitive to avoid memory buildup
    if (tileInfo.yellowPrimitive) cesiumViewer.scene.primitives.remove(tileInfo.yellowPrimitive);

    // refactor: Filter lines and then simplify each line for current LOD
    const filteredLines = filterLinesLOD(tileInfo.lines, lodFactorVal); // refactor: only a subset of lines for LOD
    const simplifiedLines = filteredLines.map(line => {
      const simplified = simplifyLineLOD(line, lodFactorVal); // refactor: each line is simplified for LOD
      vertexCount += simplified.length; // refactor: count actual displayed vertices
      return simplified;
    });

    // refactor: use dynamicLineWidth for better visibility at high altitude
    tileInfo.yellowPrimitive = createPolylinePrimitive(simplifiedLines, Cesium.Color.YELLOW, dynamicLineWidth);
    if (tileInfo.yellowPrimitive) cesiumViewer.scene.primitives.add(tileInfo.yellowPrimitive);
  });
});