# Cesium 3D Tiles Vector LOD Viewer v6 — Documentation

## Overview

This web application is a Cesium-based 3D Tiles viewer with advanced vector polyline Level-of-Detail (LOD) and simplification controls. It provides real-time statistics and interactive controls for visualization and performance tuning of vector tile data (e.g., roads, rivers, or any line-based geometries).

---

## Table of Contents

1. [HTML Structure](#html-structure)
2. [Styling and UI](#styling-and-ui)
3. [Terminal Logger Functions](#terminal-logger-functions)
4. [Cesium Viewer Setup](#cesium-viewer-setup)
5. [LOD and Simplification Controls](#lod-and-simplification-controls)
6. [Polyline Processing Functions](#polyline-processing-functions)
7. [Tileset Loading and Feature Extraction](#tileset-loading-and-feature-extraction)
8. [Render Loop and Statistics](#render-loop-and-statistics)
9. [Event Bindings](#event-bindings)
10. [Usage Specification (First Person)](#usage-specification-first-person)

---

## 1. HTML Structure

- The `<head>` includes Cesium dependencies (JS and CSS), page title, and all CSS styles.
- The `<body>` contains:
  - Main Cesium container (`#cesiumContainer`)
  - Several absolute-positioned counters for FPS, vertices, features, polylines, and LOD.
  - LOD and simplification control panels with input fields, sliders, and toggles.
  - A terminal-style action log window and a button to save logs.

---

## 2. Styling and UI

- The application uses a monospace font for clarity.
- All counters and control panels are absolutely positioned for easy overlay on the 3D scene.
- The terminal log uses a dark, translucent background and color-coded message types.

---

## 3. Terminal Logger Functions

**Purpose:**  
Display timestamped messages in the on-page terminal window and allow the user to save the log as a text file.

### `logAction(message, type="info")`
- Appends a colored, timestamped message to the terminal log.
- Scrolls automatically to the latest message.
- Limits the log to 200 messages for performance.

**Usage Example:**
```js
logAction('Tileset loaded', "ok");
```

### Log Saving
- Clicking the **Save Log** button collects all log lines and prompts the user to download them as a `.txt` file with a timestamped name.

---

## 4. Cesium Viewer Setup

- Initializes a Cesium `Viewer` in the container.
- Shows the globe by default.
- Logs the initialization to the terminal.

**Usage Example:**
```js
const cesiumViewer = new Cesium.Viewer('cesiumContainer');
cesiumViewer.scene.globe.show = true;
logAction('Cesium viewer initialized', "system");
```

---

## 5. LOD and Simplification Controls

### LOD (Level-of-Detail)

- User can set LOD manually (`#lodInput`) or let it auto-adjust based on camera height (`#autoLodToggle`).
- LOD value is displayed and updated in real time.

**Functions:**
- `calculateLodFactor(cameraHeight)`: Returns a [0.05, 1.0] LOD factor based on camera altitude.
- `updateAutoLod()`: Updates LOD based on the camera's position.

### Simplification Controls

- **Enable Simplification**: Toggles Douglas-Peucker (RDP) simplification.
- **Enable Smoothing**: Applies moving average smoothing to polylines.
- **Smooth Window**: Adjusts smoothing kernel size.
- **Merge by Distance**: Consolidates close points into one.
- **Distance**: Sets the merge distance threshold.

---

## 6. Polyline Processing Functions

**Purpose:**  
Process each polyline before rendering, depending on LOD, camera height, and user toggles.

### `processPolyline(points, lod, cameraHeight)`

- If camera is very high, limits vertices to 14 evenly sampled points.
- If simplification is enabled, applies Ramer-Douglas-Peucker (RDP) simplification.
- Otherwise, reduces vertices based on LOD.
- Optionally applies smoothing (moving average) and point merging by distance.
- Logs each operation and the output vertex count.

### Supporting Functions

- `simplifyPolylineByLod(polyline, lod)`: Reduces points by sampling, based on LOD factor.
- `smoothPolyline(points, windowSize)`: Moving average smoothing of points.
- `mergeByDistance(points, mergeDistMeters)`: Removes points closer than a threshold.
- `simplifyRdp(points, epsilon, start, end)`: Recursive Douglas-Peucker implementation.
- `pointToLineDistance(point, lineStart, lineEnd)`: Helper for RDP, computes orthogonal distance.
- `simplifyCurve(points, epsilon)`: Simplifies a curve using RDP.

---

## 7. Tileset Loading and Feature Extraction

### Tileset Load

- Loads a vector 3D Tileset from `aggr/tileset.json`.
- On tile load, extracts all polylines using:

### `extractPolylinesFromVectorTile(tile)`

- Handles various vector feature formats:
  - GeoJSON-like geometries (`LineString`, `MultiLineString`)
  - Direct coordinate arrays
  - Flat coordinate arrays (XYZ)
  - Cesium's `polylinePositions` property
- Returns an array of polyline coordinate arrays.

### `createPolylinePrimitive(featuresArr, color, lineWidth)`

- Generates Cesium `Primitive` objects for rendering multiple polylines with a given color and line width.

---

## 8. Render Loop and Statistics

- Every frame (`scene.postRender` event):
  - Updates FPS (once per second).
  - Resets counters for vertices, features, polylines.
  - Recalculates LOD if auto mode is enabled.
  - For each loaded tile:
    - Processes each polyline according to current controls.
    - Updates vertex, feature, and polyline counters.
    - Removes old primitives and adds new ones to the scene.
  - Updates all UI counters.

---

## 9. Event Bindings

- All control toggles and inputs log their state changes.
- Smoothing window slider updates the display and logs changes.

---

## 10. Usage Specification (First Person)

### How I Use This Code

#### 1. **Setup and Launch**

- I open the HTML page in a browser with internet access (for Cesium CDN).
- The Cesium viewer appears, showing a 3D globe.
- The viewer automatically loads the vector tileset from `aggr/tileset.json` in the project directory.

#### 2. **Interacting With Controls**

- I see counters for FPS, vertex count, feature count, polyline count, and current LOD.
- I can set the LOD manually with the number input, or let it auto-adjust with the "auto" toggle.
- I control polyline simplification with the "Enable Simplification" checkbox (RDP/Douglas-Peucker).
- I can smooth polylines using the "Enable Smoothing" checkbox and adjust the smoothing window.
- I merge close polyline points using the "Merge by Distance" checkbox and set the distance threshold.

#### 3. **Processing and Visualization**

- For each loaded tile, the application extracts all polyline features and processes them according to my chosen settings.
- High camera altitudes automatically reduce the number of displayed vertices for performance.
- The log window at the bottom shows every major action, such as loading tiles, changing settings, and how many vertices are being rendered.
- All statistics (FPS, features, etc.) update in real time.

#### 4. **Saving Logs**

- I can save the log at any time by clicking the "Сохранить лог" button. This downloads a text file with all terminal messages.

#### 5. **Extending or Integrating**

- I can adapt this viewer for any Cesium 3D Tiles vector dataset by changing the tileset URL.
- To visualize other feature types, I can adjust `extractPolylinesFromVectorTile`.
- For custom polyline post-processing, I can modify or extend the processing functions.

---

## 11. Function-by-Function, Line-by-Line Explanation

Below is a function-by-function breakdown of the main JavaScript logic, with inline explanations:

### Terminal Logger

```js
function logAction(message, type="info") {
  const span = document.createElement('span');
  span.className = "log-" + type;
  span.textContent = `[${(new Date()).toLocaleTimeString()}] ` + message;
  terminalOutput.appendChild(span);
  terminalOutput.appendChild(document.createElement('br'));
  terminalLog.scrollTop = terminalLog.scrollHeight;
  if (terminalOutput.children.length > 200) {
    for (let i = 0; i < 20; i++) terminalOutput.removeChild(terminalOutput.firstChild);
  }
}
window.logAction = logAction;
```
- Appends a colored timestamped message to the terminal.
- Keeps only the latest 200 messages for performance.

### Save Log Button

```js
document.getElementById('saveLogBtn').addEventListener('click', function() {
  // Collect log lines
  let logLines = [];
  terminalOutput.childNodes.forEach(node => {
    if (node.nodeType === 1 && node.tagName === "SPAN") {
      logLines.push(node.textContent);
    }
  });
  const logText = logLines.join('\n');
  // Create Blob and download link
  const blob = new Blob([logText], {type: 'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = (new Date()).toISOString().replace(/[:T]/g,'-').slice(0,19);
  a.download = `action_log_${dateStr}.txt`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 100);
  logAction('Лог сохранён в файл', 'ok');
});
```
- Collects all log messages and triggers a file download.

### Cesium Viewer Initialization

```js
const cesiumViewer = new Cesium.Viewer('cesiumContainer');
cesiumViewer.scene.globe.show = true;
logAction('Cesium viewer initialized', "system");
```
- Initializes viewer, displays globe, and logs the event.

### DOM References

```js
const fpsCounterValue = document.getElementById('fpsVal');
// ... (similar for all relevant controls and counters)
```
- Caches DOM elements for fast updates.

### LOD Control

```js
let lodFactor = 1.0;
lodInputElement.addEventListener('input', () => {
  const inputValue = parseFloat(lodInputElement.value);
  if (!isNaN(inputValue)) {
    lodFactor = Math.max(0, Math.min(1, inputValue));
    lodDisplayElement.textContent = lodFactor.toFixed(2);
    logAction(`LOD set manually to ${lodFactor.toFixed(2)}`, "info");
  }
});
```
- Updates global LOD factor and display when the input changes.

### LOD Calculation

```js
function calculateLodFactor(cameraHeight) {
  const minHeight = 2000;
  const maxHeight = 4000000;
  if (cameraHeight < minHeight) return 1.0;
  if (cameraHeight > maxHeight) return 0.05;
  return 1.0 - ((cameraHeight - minHeight) / (maxHeight - minHeight)) * (1.0 - 0.05);
}
function updateAutoLod() {
  const cameraHeight = cesiumViewer.camera.positionCartographic.height;
  lodFactor = calculateLodFactor(cameraHeight);
  lodInputElement.value = lodFactor.toFixed(2);
  lodDisplayElement.textContent = lodFactor.toFixed(2);
  logAction(`Auto LOD updated: cameraHeight=${cameraHeight.toFixed(0)}, LOD=${lodFactor.toFixed(2)}`, "debug");
}
```
- Computes and updates LOD based on altitude.

### Polyline Processing

```js
function processPolyline(points, lod, cameraHeight) {
  let processed = points;
  if (cameraHeight > 3_000_000) {
    // Only show up to 14 vertices
    // ...
  } else if (simplifyToggle && simplifyToggle.checked) {
    // RDP simplification
    // ...
  } else {
    // LOD-based simplification
    // ...
  }
  if (smoothingToggle && smoothingToggle.checked) {
    // Smoothing
    // ...
  }
  if (mergeToggle && mergeToggle.checked) {
    // Merge by distance
    // ...
  }
  logAction(`Polyline vertices after processing: ${processed.length}`, "debug");
  return processed;
}
```
- Applies high-altitude vertex reduction, simplification, smoothing, and merging based on user settings.
- Logs each operation.

### Polyline Feature Extraction

```js
function extractPolylinesFromVectorTile(tile) {
  const content = tile.content;
  const features = [];
  // Handles various feature representations
  // Pushes all found polylines to features[]
  return features;
}
```
- Handles multiple data formats for vector tiles.

### Tileset Loading

```js
Cesium.Cesium3DTileset.fromUrl('aggr/tileset.json')
  .then(tileset => {
    tilesetInstance = tileset;
    cesiumViewer.scene.primitives.add(tileset);
    cesiumViewer.zoomTo(tileset);
    logAction('Tileset loaded', "ok");
    tileset.tileLoad.addEventListener(tile => {
      const features = extractPolylinesFromVectorTile(tile);
      logAction(`Tile loaded, features found: ${features.length}`, "system");
      tileDataMap.set(tile, { features, redPrimitive: null });
    });
  })
  .catch(err => {
    logAction('Failed to load tileset: ' + err, "error");
  });
```
- Loads tileset and extracts polylines from each tile.

### Render Loop

```js
cesiumViewer.scene.postRender.addEventListener(() => {
  // Updates FPS and all counters
  // For each loaded tile:
  //   - Processes polylines
  //   - Updates primitives and counters
});
```
- Runs every frame, updating stats and rendering processed polylines.

### Event Bindings

```js
[
  ['simplifyToggle', 'info', 'RDP simplification toggled'],
  ['smoothingToggle', 'info', 'Smoothing toggled'],
  ['mergeToggle', 'info', 'Merge by Distance toggled'],
  ['mergeDistInput', 'info', 'Merge distance changed'],
].forEach(([id, type, msg]) => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', () => logAction(msg, type));
    el.addEventListener('change', () => logAction(msg, type));
  }
});
```
- Binds logging to all toggles and number inputs.

---

## Conclusion

This code is a ready-to-use, extensible Cesium-based visualization tool for 3D Tiles vector data with advanced real-time LOD and simplification features. The modular functions allow easy customization and integration with other data sources or visualization pipelines.

---

# Подробное построчное описание JavaScript-кода (на русском и английском)

---

## Введение

В этом разделе каждое действие JavaScript-кода из вашего файла прокомментировано построчно или блоками с пояснением, что именно делает каждая строка.  
This section provides a detailed line-by-line or block-by-block explanation of what each part of the JavaScript code does.

---

### === Terminal logger ===

```js
const terminalLog = document.getElementById('terminalLog'); // Получаем DOM-элемент терминала (лог-окно) / Get terminal log DOM element
const terminalOutput = document.getElementById('terminalOutput'); // Получаем контейнер для сообщений / Get output container for log lines

function logAction(message, type="info") { // Функция для добавления сообщения в лог / Function to append a message to log
  const span = document.createElement('span'); // Создаем span для цветного текста / Create span element for colored text
  span.className = "log-" + type; // Назначаем класс (цвет) сообщения / Assign class for message type (color)
  span.textContent = `[${(new Date()).toLocaleTimeString()}] ` + message; // Формируем текст с временной меткой / Format text with timestamp
  terminalOutput.appendChild(span); // Добавляем в лог / Add to log
  terminalOutput.appendChild(document.createElement('br')); // Перенос строки / Newline
  terminalLog.scrollTop = terminalLog.scrollHeight; // Прокручиваем вниз / Scroll to latest
  if (terminalOutput.children.length > 200) { // Если сообщений больше 200, удаляем старые / Limit to 200 messages
    for (let i = 0; i < 20; i++) terminalOutput.removeChild(terminalOutput.firstChild);
  }
}
window.logAction = logAction; // Делаем функцию глобальной / Make function globally accessible
```

---

### === Лог сохранения ===

```js
document.getElementById('saveLogBtn').addEventListener('click', function() { // Кнопка "Сохранить лог" / Save log button
  let logLines = []; // Массив для строк лога / Array to hold log lines
  terminalOutput.childNodes.forEach(node => { // Перебор всех элементов лога / Iterate all children
    if (node.nodeType === 1 && node.tagName === "SPAN") { // Только текстовые строки / Only text lines
      logLines.push(node.textContent); // Добавляем текст / Add to array
    }
  });
  const logText = logLines.join('\n'); // Склеиваем строки / Join with newline
  const blob = new Blob([logText], {type: 'text/plain'}); // Создаем Blob для скачивания / Create Blob for download
  const url = URL.createObjectURL(blob); // Получаем временную ссылку / Create object URL
  const a = document.createElement('a'); // Временная ссылка <a> / Temporary <a> link
  a.href = url;
  const dateStr = (new Date()).toISOString().replace(/[:T]/g,'-').slice(0,19); // Формируем имя файла с датой / Filename with timestamp
  a.download = `action_log_${dateStr}.txt`; // Имя файла / Set filename
  document.body.appendChild(a); // Вставляем ссылку в DOM / Add to DOM
  a.click(); // Имитируем клик — скачивание / Auto-click to download
  setTimeout(() => { // Через 100мс очищаем URL и удаляем <a> / Cleanup after download
    URL.revokeObjectURL(url);
    a.remove();
  }, 100);
  logAction('Лог сохранён в файл', 'ok'); // Сообщаем о сохранении / Log success
});
```

---

### === Cesium viewer setup ===

```js
const cesiumViewer = new Cesium.Viewer('cesiumContainer'); // Инициализация Cesium Viewer / Initialize Cesium Viewer
cesiumViewer.scene.globe.show = true; // Показываем глобус / Show globe
logAction('Cesium viewer initialized', "system"); // Логируем запуск / Log initialization
```

---

### === DOM element references ===

```js
const fpsCounterValue = document.getElementById('fpsVal'); // Счетчик FPS / FPS counter
const vertexCounterValue = document.getElementById('vertexVal'); // Счетчик вершин / Vertex counter
const lodInputElement = document.getElementById('lodInput'); // Поле LOD / LOD input field
const lodDisplayElement = document.getElementById('lodDisplay'); // Отображение LOD / LOD display
const autoLodToggle = document.getElementById('autoLodToggle'); // Чекбокс авто-LOD / Auto LOD toggle
const featureCounterValue = document.getElementById('featureVal'); // Счетчик фич / Feature counter
const lodCounterValue = document.getElementById('lodVal'); // Текущий LOD / Current LOD
const simplifyToggle = document.getElementById('simplifyToggle'); // Упрощение / Simplification toggle
const smoothingToggle = document.getElementById('smoothingToggle'); // Сглаживание / Smoothing toggle
const smoothWindowInput = document.getElementById('smoothWindow'); // Слайдер окна сглаживания / Smoothing window slider
const smoothWindowValue = document.getElementById('smoothWindowVal'); // Значение окна сглаживания / Smoothing window value display
const mergeToggle = document.getElementById('mergeToggle'); // Объединение точек / Merge by distance toggle
const mergeDistInput = document.getElementById('mergeDistInput'); // Порог объединения / Merge distance input
const polylineCounterValue = document.getElementById('polylineVal'); // Счетчик полилиний / Polyline counter
```

---

### === Global LOD factor (0–1) ===

```js
let lodFactor = 1.0; // Глобальная переменная LOD [0..1] / Global LOD factor [0..1]

lodInputElement.addEventListener('input', () => { // При изменении поля LOD / On LOD input change
  const inputValue = parseFloat(lodInputElement.value); // Берем значение / Get input value
  if (!isNaN(inputValue)) { // Если число / If valid number
    lodFactor = Math.max(0, Math.min(1, inputValue)); // Ограничиваем диапазон / Clamp to [0,1]
    lodDisplayElement.textContent = lodFactor.toFixed(2); // Обновляем отображение / Update display
    logAction(`LOD set manually to ${lodFactor.toFixed(2)}`, "info"); // Логируем / Log action
  }
});
```

---

### === LOD Calculation ===

```js
function calculateLodFactor(cameraHeight) { // Расчет LOD по высоте камеры / Calculate LOD by camera height
  const minHeight = 2000; // Минимальная высота / Min height
  const maxHeight = 4000000; // Максимальная высота / Max height
  if (cameraHeight < minHeight) return 1.0; // Ниже минимума — максимум LOD / Below min: max LOD
  if (cameraHeight > maxHeight) return 0.05; // Выше максимума — минимум LOD / Above max: min LOD
  return 1.0 - ((cameraHeight - minHeight) / (maxHeight - minHeight)) * (1.0 - 0.05); // Интерполяция / Linear interpolation
}

function updateAutoLod() { // Обновить LOD если включен авто-режим / Update auto LOD if enabled
  const cameraHeight = cesiumViewer.camera.positionCartographic.height; // Текущая высота камеры / Current camera height
  lodFactor = calculateLodFactor(cameraHeight); // Вычисляем LOD / Calculate LOD
  lodInputElement.value = lodFactor.toFixed(2); // Обновляем поле / Update input
  lodDisplayElement.textContent = lodFactor.toFixed(2); // Обновляем отображение / Update display
  logAction(`Auto LOD updated: cameraHeight=${cameraHeight.toFixed(0)}, LOD=${lodFactor.toFixed(2)}`, "debug"); // Логируем / Log
}
```

---

### === Dynamic Line Width ===

```js
function getDynamicLineWidth(cameraHeight) { // Ширина линии в зависимости от высоты камеры / Dynamic polyline width by camera height
  const minWidth = 10;
  const maxWidth = 28;
  const minHeight = 2000;
  const maxHeight = 10000000;
  let width = minWidth + (maxWidth - minWidth) * ((cameraHeight - minHeight) / (maxHeight - minHeight));
  width = Math.max(minWidth, Math.min(maxWidth, width)); // Ограничиваем диапазон / Clamp to range
  return width;
}
```

---

### === Polyline Simplification and Processing ===

```js
function simplifyPolylineByLod(polyline, lod) { // Упрощение по LOD / Simplify by LOD
  const len = polyline.length;
  if (len <= 2) return polyline; // Не упрощаем короткие / No simplification for short polylines
  if (lod <= 0.15) return [polyline[0], polyline[len - 1]]; // Очень низкий LOD — две точки / Very low LOD: just endpoints
  const targetCount = Math.max(2, Math.ceil(len * lod)); // Сколько оставить точек / Target number of points
  if (targetCount >= len) return polyline; // Если больше или равно — не трогаем / No reduction needed
  const step = (len - 1) / (targetCount - 1); // Шаг между точками / Index step
  const simplified = new Array(targetCount);
  for (let i = 0; i < targetCount; i++) { // По шагам забираем точки / Sample points by step
    const index = i === targetCount - 1 ? len - 1 : Math.floor(i * step);
    simplified[i] = polyline[index];
  }
  return simplified;
}
```

```js
function smoothPolyline(points, windowSize = 5) { // Сглаживание полилинии (скользящее среднее) / Moving average smoothing
  if (windowSize < 3 || points.length < windowSize) return points; // Не сглаживаем если мало точек / No smoothing for short polylines
  const halfWindow = Math.floor(windowSize / 2);
  const smoothed = [];
  for (let i = 0; i < points.length; i++) {
    let sumX = 0, sumY = 0, sumZ = 0, count = 0;
    for (let j = i - halfWindow; j <= i + halfWindow; j++) { // Окно вокруг точки / Window around point
      if (j >= 0 && j < points.length) {
        sumX += points[j][0];
        sumY += points[j][1];
        sumZ += points[j][2];
        count++;
      }
    }
    smoothed.push([
      sumX / count,
      sumY / count,
      sumZ / count
    ]);
  }
  return smoothed;
}
```

```js
function mergeByDistance(points, mergeDistMeters) { // Удаление избыточных точек / Remove points closer than threshold
  if (points.length === 0) return [];
  const result = [points[0]]; // Начинаем с первой точки / Start with first point
  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const dist = Cesium.Cartesian3.distance(
      Cesium.Cartesian3.fromArray(prev),
      Cesium.Cartesian3.fromArray(curr)
    );
    if (dist >= mergeDistMeters) { // Если дальше порога — оставляем / Keep only if far enough
      result.push(curr);
    }
  }
  return result;
}
```

```js
function simplifyRdp(points, epsilon, start, end) { // Реализация Дугласа-Пекера / Douglas-Peucker simplification
  if (start >= end - 1) return [points[start]]; // База рекурсии / Recursion base
  const lineStart = points[start];
  const lineEnd = points[end];
  let maxDist = 0;
  let maxIndex = start;
  for (let i = start + 1; i < end; i++) { // Поиск самой дальней точки / Find farthest point
    const dist = pointToLineDistance(points[i], lineStart, lineEnd);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }
  if (maxDist > epsilon) { // Если есть далекая точка — делим / If above threshold, split
    const left = simplifyRdp(points, epsilon, start, maxIndex);
    const right = simplifyRdp(points, epsilon, maxIndex, end);
    return left.slice(0, -1).concat(right); // Склеиваем левую и правую части / Concatenate
  } else {
    return [points[start], points[end]]; // Иначе — только концы / Only endpoints
  }
}
function pointToLineDistance(point, lineStart, lineEnd) { // Перпендикуляр от точки к линии / Perpendicular distance
  if (Cesium.Cartesian3.distance(
    Cesium.Cartesian3.fromArray(lineStart),
    Cesium.Cartesian3.fromArray(lineEnd)
  ) < Cesium.EPSILON6) { // Если линия — точка / If line is a point
    return Cesium.Cartesian3.distance(
      Cesium.Cartesian3.fromArray(point),
      Cesium.Cartesian3.fromArray(lineStart)
    );
  }
  const v = new Cesium.Cartesian3();
  const w = new Cesium.Cartesian3();
  Cesium.Cartesian3.subtract(
    Cesium.Cartesian3.fromArray(lineEnd),
    Cesium.Cartesian3.fromArray(lineStart),
    v
  );
  Cesium.Cartesian3.subtract(
    Cesium.Cartesian3.fromArray(point),
    Cesium.Cartesian3.fromArray(lineStart),
    w
  );
  const c1 = Cesium.Cartesian3.dot(w, v);
  const c2 = Cesium.Cartesian3.dot(v, v);
  const b = c1 / c2;
  const pb = new Cesium.Cartesian3();
  Cesium.Cartesian3.multiplyByScalar(v, b, pb);
  Cesium.Cartesian3.add(
    Cesium.Cartesian3.fromArray(lineStart),
    pb,
    pb
  );
  return Cesium.Cartesian3.distance(
    Cesium.Cartesian3.fromArray(point),
    pb
  );
}
function simplifyCurve(points, epsilon) { // Обертка для упрощения кривой / Wrapper for curve simplification
  if (points.length < 3) return points;
  return simplifyRdp(points, epsilon, 0, points.length - 1);
}
```

---

### --- PATCHED FUNCTION: limit to max 14 vertices at high camera, add log ---

```js
function processPolyline(points, lod, cameraHeight) { // Полная обработка полилинии / Main polyline processing
  let processed = points;
  if (cameraHeight > 3_000_000) { // Если камера очень высоко — максимум 14 вершин / High camera: max 14 vertices
    const maxVertices = 14;
    if (processed.length > maxVertices) {
      const step = (processed.length - 1) / (maxVertices - 1);
      const reduced = [];
      for (let i = 0; i < maxVertices; i++) {
        let idx = Math.round(i * step);
        if (i === 0) idx = 0;
        if (i === maxVertices - 1) idx = processed.length - 1;
        reduced.push(processed[idx]);
      }
      processed = reduced;
      logAction(`High camera: reduced to ${processed.length} vertices (max 14)`, "action");
    } else {
      logAction(`High camera: polyline has only ${processed.length} vertices (<=14)`, "action");
    }
  } else if (simplifyToggle && simplifyToggle.checked) { // Если упрощение / If simplification enabled
    const baseEpsilon = 10;
    const epsilon = baseEpsilon * (cameraHeight / 10000); // Епсилон зависит от высоты камеры / Epsilon depends on camera height
    processed = simplifyCurve(processed, epsilon);
    logAction('RDP Simplification applied (epsilon=' + epsilon.toFixed(2) + ')', "action");
  } else {
    processed = simplifyPolylineByLod(processed, lod); // Иначе — обычное упрощение по LOD / LOD-based simplification
    logAction('LOD Simplification applied', "action");
  }
  if (smoothingToggle && smoothingToggle.checked) { // Если сглаживание / If smoothing enabled
    processed = smoothPolyline(processed, parseInt(smoothWindowInput.value));
    logAction('Polyline smoothing applied', "action");
  }
  if (mergeToggle && mergeToggle.checked) { // Если объединение точек / If merge enabled
    processed = mergeByDistance(processed, parseFloat(mergeDistInput.value));
    logAction('Merge by Distance applied (d=' + mergeDistInput.value + 'm)', "action");
  }
  logAction(`Polyline vertices after processing: ${processed.length}`, "debug"); // Сколько вершин после обработки / Log output vertex count
  return processed;
}
```

---

### === Smooth window input ===

```js
smoothWindowInput.addEventListener('input', () => { // При изменении окна сглаживания / On smoothing window change
  smoothWindowValue.textContent = smoothWindowInput.value; // Обновляем отображение / Update display
  logAction('Smooth window set to ' + smoothWindowInput.value, "info"); // Логируем / Log action
});
```

---

### === Extract polylines from vector tile ===

```js
function extractPolylinesFromVectorTile(tile) { // Извлечение всех полилиний из тайла / Extract all polylines from tile
  const content = tile.content;
  const features = [];
  if (!content || typeof content.featuresLength !== "number") return features;
  for (let i = 0; i < content.featuresLength; i++) {
    const feature = content.getFeature(i);
    // GeoJSON-like with getGeometry
    if (feature && typeof feature.getGeometry === "function") {
      const geometry = feature.getGeometry();
      if (geometry) {
        if (geometry.type === "LineString" && Array.isArray(geometry.coordinates)) {
          features.push(geometry.coordinates);
        }
        if (geometry.type === "MultiLineString" && Array.isArray(geometry.coordinates)) {
          geometry.coordinates.forEach(line => features.push(line));
        }
      }
      continue;
    }
    // Coordinate arrays
    if (feature && typeof feature.getPropertyNames === "function") {
      const names = feature.getPropertyNames();
      for (const name of names) {
        const prop = feature.getProperty(name);
        if (Array.isArray(prop) && prop.length > 1 && Array.isArray(prop[0])) {
          features.push(prop);
        } else if (Array.isArray(prop) && Array.isArray(prop[0]) && Array.isArray(prop[0][0])) {
          prop.forEach(line => features.push(line));
        } else if (Array.isArray(prop) && prop.length > 3 && typeof prop[0] === "number") {
          let coords = [];
          for (let j = 0; j < prop.length; j += 3) {
            coords.push([prop[j], prop[j+1], prop[j+2]]);
          }
          if (coords.length > 1) features.push(coords);
        }
      }
    }
    // polylinePositions
    else if (feature.polylinePositions && Array.isArray(feature.polylinePositions)) {
      if (feature.polylinePositions.length > 3 && typeof feature.polylinePositions[0] === "number") {
        let coords = [];
        for (let j = 0; j < feature.polylinePositions.length; j += 3) {
          coords.push([
            feature.polylinePositions[j],
            feature.polylinePositions[j+1],
            feature.polylinePositions[j+2]
          ]);
        }
        if (coords.length > 1) features.push(coords);
      }
    }
  }
  return features;
}
```

---

### === Polyline Primitive Creation ===

```js
function createPolylinePrimitive(featuresArr, color, lineWidth) { // Создание Cesium polyline primitive / Create Cesium polyline primitive
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
```

---

### === Load vector tileset and handle tile loading ===

```js
let tilesetInstance;
const tileDataMap = new Map();

Cesium.Cesium3DTileset.fromUrl('aggr/tileset.json') // Загружаем набор тайлов / Load tileset
  .then(tileset => {
    tilesetInstance = tileset;
    cesiumViewer.scene.primitives.add(tileset); // Добавляем на сцену / Add to scene
    cesiumViewer.zoomTo(tileset); // Центрируем камеру / Zoom to tileset
    logAction('Tileset loaded', "ok"); // Логируем / Log
    tileset.tileLoad.addEventListener(tile => { // На каждую подгрузку тайла / On each tile load
      const features = extractPolylinesFromVectorTile(tile); // Извлекаем полилинии / Extract polylines
      logAction(`Tile loaded, features found: ${features.length}`, "system"); // Логируем / Log
      tileDataMap.set(tile, {
        features,
        redPrimitive: null
      });
    });
  })
  .catch(err => {
    logAction('Failed to load tileset: ' + err, "error"); // Ошибка загрузки / Log error
  });
```

---

### === Initialize counters and LOD one line ===

```js
let lastFpsUpdate = performance.now(), fpsCounter = 0, vertexCount = 0, featureCount = 0, polylineCount = 0;
// Переменные для FPS и статистики / FPS and stats counters
```

---

### === Render loop: update counters, LOD, and polylines ===

```js
cesiumViewer.scene.postRender.addEventListener(() => { // Каждая отрисовка сцены / Each frame
  const now = performance.now();
  fpsCounter++;
  if (now - lastFpsUpdate >= 1000) { // Обновляем FPS раз в секунду / Update FPS once per second
    fpsCounterValue.textContent = Math.round(fpsCounter * 1000 / (now - lastFpsUpdate));
    lastFpsUpdate = now;
    fpsCounter = 0;
  }
  vertexCount = 0;
  featureCount = 0;
  polylineCount = 0;
  if (autoLodToggle.checked && cesiumViewer.camera.positionCartographic) { // Авто-LOD / Auto LOD
    updateAutoLod();
  }
  if (!tilesetInstance || !tilesetInstance._selectedTiles) return;
  const cameraHeight = cesiumViewer.camera.positionCartographic.height;
  if (!cameraHeight) return;
  const lod = autoLodToggle.checked ? calculateLodFactor(cameraHeight) : lodFactor; // Выбор LOD / Select LOD
  const dynamicLineWidth = getDynamicLineWidth(cameraHeight); // Ширина линий / Line width
  tilesetInstance._selectedTiles.forEach(tile => { // Для каждого видимого тайла / For each visible tile
    const tileInfo = tileDataMap.get(tile);
    if (!tileInfo) return;
    const features = tileInfo.features;
    featureCount += features.length;
    polylineCount += features.length;
    const processedFeatures = features.map(feature => {
      const processed = processPolyline(feature, lod, cameraHeight); // Обработка полилинии / Polyline processing
      vertexCount += processed.length;
      return processed;
    });
    if (tileInfo.redPrimitive) cesiumViewer.scene.primitives.remove(tileInfo.redPrimitive); // Удаляем старый примитив / Remove old primitive
    tileInfo.redPrimitive = createPolylinePrimitive(processedFeatures, Cesium.Color.RED, dynamicLineWidth); // Создаем новый / Create new primitive
    if (tileInfo.redPrimitive) cesiumViewer.scene.primitives.add(tileInfo.redPrimitive); // Добавляем / Add to scene
  });
  // Обновление счетчиков / Update UI counters
  vertexCounterValue.textContent = vertexCount;
  featureCounterValue.textContent = featureCount;
  lodCounterValue.textContent = (autoLodToggle.checked ? lod : lodFactor).toFixed(2);
  polylineCounterValue.textContent = polylineCount;
});
```

---

### === Event bindings for controls ===

```js
[
  ['simplifyToggle', 'info', 'RDP simplification toggled'],
  ['smoothingToggle', 'info', 'Smoothing toggled'],
  ['mergeToggle', 'info', 'Merge by Distance toggled'],
  ['mergeDistInput', 'info', 'Merge distance changed'],
].forEach(([id, type, msg]) => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', () => logAction(msg, type)); // Лог при вводе / Log on input
    el.addEventListener('change', () => logAction(msg, type)); // Лог при изменении / Log on change
  }
});
```

---

## Итог / Summary

Этот раздел содержит построчные пояснения к каждому значимому фрагменту JS-кода вашего приложения.  
This section contains line-by-line explanations for every significant fragment of the JS part of your application.

---
