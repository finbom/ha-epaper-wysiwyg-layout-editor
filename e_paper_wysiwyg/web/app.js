const canvas = document.getElementById("canvas");
const addTextButton = document.getElementById("add-text-btn");
const textForm = document.getElementById("text-form");
const inspectorEmpty = document.getElementById("inspector-empty");
const textInput = document.getElementById("text-input");
const xInput = document.getElementById("x-input");
const yInput = document.getElementById("y-input");
const fontSizeInput = document.getElementById("font-size-input");
const anchorInput = document.getElementById("anchor-input");
const boldInput = document.getElementById("bold-input");
const italicInput = document.getElementById("italic-input");
const sourceTypeInput = document.getElementById("source-type-input");
const entityInput = document.getElementById("entity-input");
const entityLabel = document.getElementById("entity-label");
const exportJsonButton = document.getElementById("export-json-btn");
const exportOpenEpaperLinkButton = document.getElementById("export-openepaperlink-btn");
const exportOutput = document.getElementById("export-output");
const deleteTextButton = document.getElementById("delete-text-btn");
const widthInput = document.getElementById("width-input");
const heightInput = document.getElementById("height-input");
const etagForm = document.getElementById("etag-form");
const presetSelect = document.getElementById("preset-select");
const setSizeButton = document.getElementById("set-size-btn");

const presets = {
  "296x128": { width: 296, height: 128 },
  "384x168": { width: 384, height: 168 },
  "400x300": { width: 400, height: 300 }
};

// add a simple mock Home Assistant entity state provider for development mode
const mockHAEntities = {
  "sensor.living_room_temperature": {
    state: "22.5",
    attributes: {
      unit_of_measurement: "°C",
      friendly_name: "Living Room Temperature"
    }
  },
  "sensor.outdoor_temperature": {
    state: "18.3",
    attributes: {
      unit_of_measurement: "°C",
      friendly_name: "Outdoor Temperature"
    }
  },
  "binary_sensor.front_door": {
    state: "off",
    attributes: {
      friendly_name: "Front Door"
    }
  },
  "light.living_room": {
    state: "on",
    attributes: {
      friendly_name: "Living Room Light",
      brightness: 255
    }
  }
};

// Cache for live entity states from Home Assistant
const haStateCache = {};
const haEntities = {};  // Full entity objects (for dropdown labels)
let VERBOSE = false;
let addonBase = null;

function getBase() {
  if (!addonBase) addonBase = window.location.href.replace(/\/?(\?.*)?$/, "/");
  return addonBase;
}

function vlog(...args) {
  if (VERBOSE) console.log("[verbose]", ...args);
}

function uiLog(msg) {
  if (!VERBOSE) return;
  console.log("[ui]", msg);
  fetch(getBase() + "log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ msg })
  }).catch(() => {});
}

async function loadAddonConfig() {
  try {
    const resp = await fetch(getBase() + "addon-config");
    if (!resp.ok) return;
    const cfg = await resp.json();
    VERBOSE = cfg.verbose_logging === true;
    if (VERBOSE) console.log("[verbose] Verbose logging enabled");
  } catch {
    // not running in HA — keep VERBOSE false
  }
}

// Get entity state from cache (HA), fallback to mock data
function getEntityState(entityId) {
  if (haStateCache[entityId] !== undefined) {
    return haStateCache[entityId];
  }
  return mockHAEntities[entityId]?.state ?? null;
}

// Fetch entity states from the local backend proxy (uses Supervisor token server-side)
async function fetchHAStates() {
  try {
    // Build URL relative to current directory, handling missing trailing slash
    const base = window.location.href.replace(/\/?(\?.*)?$/, "/");
    const url = base + "ha-states";
    console.log("Fetching HA states from", url);
    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn("ha-states returned", resp.status);
      return;
    }
    const states = await resp.json();
    states.forEach((s) => {
      haStateCache[s.entity_id] = s.state;
      haEntities[s.entity_id] = s;
    });
    console.log("Loaded", states.length, "entity states from HA");
    render();
  } catch {
    console.log("HA states unavailable, using mock data");
  }
}

function populateEntityOptions() {
  entityInput.innerHTML = "";
  const source = Object.keys(haEntities).length > 0 ? haEntities : mockHAEntities;
  for (const entityId in source) {
    const option = document.createElement("option");
    option.value = entityId;
    const friendlyName = source[entityId].attributes?.friendly_name || entityId;
    option.textContent = `${friendlyName} (${entityId})`;
    entityInput.appendChild(option);
  }
}

deleteTextButton.hidden = true;

let selectedElementId = null;
let dragging = false;
let dragOffset = { x: 0, y: 0 };
let nextElementId = 1;

const layout = {
  width: 500,
  height: 500,
  elements: []
};

function createTextElement(x, y, text) {
  return {
    id: nextElementId++,
    type: "text",
    x,
    y,
    text,

    // NEW: where the text comes from
    source: {
      type: "static",   // "static" | "entity"
      entity_id: null
    },

    fontSize: 16,
    fontWeight: "normal",
    fontStyle: "normal",
    textAnchor: "start"
  };
}

function addText(x, y, text) {
  const el = createTextElement(x, y, text);
  layout.elements.push(el);
  selectElement(el.id);
  render();
}

function getSelectedElement() {
  return layout.elements.find((el) => el.id === selectedElementId) || null;
}

function selectElement(id) {
  uiLog(`selectElement id=${id}`);
  selectedElementId = id;
  updateInspector();
  render();
}

function deselectElement() {
  uiLog("deselectElement");
  selectedElementId = null;
  updateInspector();
  render();
}



function updateInspector() {
  const element = getSelectedElement();

  if (!element) {
    textForm.hidden = true;
    inspectorEmpty.hidden = false;
    return;
  }

  textForm.hidden = false;
  inspectorEmpty.hidden = true;
  deleteTextButton.hidden = false;
  textInput.value = element.text;
  textInput.readOnly = element.source.type === "entity";
  xInput.value = element.x;
  yInput.value = element.y;
  fontSizeInput.value = element.fontSize;
  boldInput.checked = element.fontWeight === "bold";
  italicInput.checked = element.fontStyle === "italic";
  anchorInput.value = element.textAnchor;
  sourceTypeInput.value = element.source.type;
  if (element.source.type === "entity") {
    entityLabel.hidden = false;
    populateEntityOptions();
    entityInput.value = element.source.entity_id;
  } else {
    entityLabel.hidden = true;
  }
}

function updateSelectedElement() {
  const element = getSelectedElement();
  if (!element) return;

  if (element.source.type !== "entity") {
    element.text = textInput.value;
  }
  element.x = Math.round(Number(xInput.value));
  element.y = Math.round(Number(yInput.value));
  element.fontSize = Number(fontSizeInput.value);
  element.fontWeight = boldInput.checked ? "bold" : "normal";
  element.fontStyle = italicInput.checked ? "italic" : "normal";
  element.textAnchor = anchorInput.value;

  render();
}

function deleteSelectedElement() {
  if (selectedElementId === null) return;

  const index = layout.elements.findIndex((el) => el.id === selectedElementId);
  if (index === -1) return;

  uiLog(`deleteElement id=${selectedElementId}`);
  layout.elements.splice(index, 1);
  selectedElementId = null;
  updateInspector();
  render();
}

function svgPoint(event) {
  const point = canvas.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(canvas.getScreenCTM().inverse());
}

function startDrag(element, event) {
  const point = svgPoint(event);
  dragOffset.x = point.x - element.x;
  dragOffset.y = point.y - element.y;
  dragging = true;
}

function stopDrag() {
  dragging = false;
}

function render() {
  canvas.innerHTML = "";

  for (const el of layout.elements) {
    if (el.type !== "text") continue;

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const textNode = document.createElementNS("http://www.w3.org/2000/svg", "text");

    textNode.setAttribute("x", el.x);
    textNode.setAttribute("y", el.y);
    textNode.setAttribute("font-size", el.fontSize);
    textNode.setAttribute("font-weight", el.fontWeight);
    textNode.setAttribute("font-style", el.fontStyle);
    textNode.setAttribute("text-anchor", el.textAnchor);
    textNode.setAttribute("xml:space", "preserve");
    textNode.dataset.id = el.id;
    textNode.classList.add("text-element");
    if (el.id === selectedElementId) {
      textNode.classList.add("selected");
    }

// Determine what text to display (static or entity-backed)
const rawText =
  el.source?.type === "entity" && el.source.entity_id
    ? getEntityState(el.source.entity_id) ?? "?"
    : el.text;

// Split text into lines (supports multi-line text)
const lines = String(rawText).split("\n");

  if (lines.length === 1) {
    textNode.textContent = lines[0] || "\u200B";
  } else {
    lines.forEach((line, index) => {
      const tspan = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "tspan"
      );
      tspan.setAttribute("x", el.x);
      tspan.setAttribute("dy", index === 0 ? "0" : "1.2em");
      tspan.textContent = line || "\u200B";
      textNode.appendChild(tspan);
    });
  }

    group.appendChild(textNode);
    canvas.appendChild(group);

    if (el.id === selectedElementId) {
      const bbox = textNode.getBBox();
      const paddingX = 6;
      const paddingY = 4;
      const selectionRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      selectionRect.setAttribute("x", bbox.x - paddingX);
      selectionRect.setAttribute("y", bbox.y - paddingY);
      selectionRect.setAttribute("width", bbox.width + paddingX * 2);
      selectionRect.setAttribute("height", bbox.height + paddingY * 2);
      selectionRect.classList.add("selection-rect");
      group.insertBefore(selectionRect, textNode);
    }

    textNode.addEventListener("mousedown", (event) => {
      event.stopPropagation();
      selectElement(el.id);
      startDrag(el, event);
    });

    textNode.addEventListener("click", (event) => {
      event.stopPropagation();
      selectElement(el.id);
    });

    textNode.addEventListener("dblclick", (event) => {
      event.stopPropagation();
      selectElement(el.id);
      textInput.focus();
    });
  }
}

canvas.addEventListener("mousedown", (event) => {
  if (event.target === canvas) {
    deselectElement();
  }
});

canvas.addEventListener("mousemove", (event) => {
  if (!dragging) return;

  const element = getSelectedElement();
  if (!element) return;

  const point = svgPoint(event);
  element.x = Math.round(point.x - dragOffset.x);
  element.y = Math.round(point.y - dragOffset.y);
  updateInspector();
  render();
});

window.addEventListener("mouseup", () => {
  stopDrag();
});

function getEditorPayload() {
  return {
    width: layout.width,
    height: layout.height,
    elements: layout.elements.map((el) => ({ ...el }))
  };
}

function getOpenEpaperLinkPayload() {
  return {
    width: layout.width,
    height: layout.height,
    objects: layout.elements.map((el) => ({
      type: "text",
      x: el.x,
      y: el.y,
      text: el.text,
      fontSize: el.fontSize,
      fontWeight: el.fontWeight,
      fontStyle: el.fontStyle,
      textAnchor: el.textAnchor
    }))
  };
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportJson() {
  const payload = getEditorPayload();
  exportOutput.value = JSON.stringify(payload, null, 2);
  downloadJson("layout.json", payload);
}

function exportOpenEpaperLink() {
  const payload = getOpenEpaperLinkPayload();
  exportOutput.value = JSON.stringify(payload, null, 2);
  downloadJson("openepaperlink.json", payload);
}

textForm.addEventListener("input", updateSelectedElement);
deleteTextButton.addEventListener("click", () => {
  uiLog(`deleteText clicked (element id=${selectedElementId})`);
  deleteSelectedElement();
});
addTextButton.addEventListener("click", () => {
  uiLog("addText clicked");
  addText(50, 50, "New Text");
});
exportJsonButton.addEventListener("click", () => {
  uiLog("exportJson clicked");
  exportJson();
});
exportOpenEpaperLinkButton.addEventListener("click", () => {
  uiLog("exportOpenEpaperLink clicked");
  exportOpenEpaperLink();
});

sourceTypeInput.addEventListener("change", () => {
  const element = getSelectedElement();
  if (!element) return;

  uiLog(`sourceType changed → ${sourceTypeInput.value} (element id=${element.id})`);
  element.source.type = sourceTypeInput.value;

  if (element.source.type === "entity") {
    entityLabel.hidden = false;
    populateEntityOptions();

    if (!element.source.entity_id) {
      const source = Object.keys(haEntities).length > 0 ? haEntities : mockHAEntities;
      element.source.entity_id = Object.keys(source)[0];
    }

    entityInput.value = element.source.entity_id;
  } else {
    entityLabel.hidden = true;
  }

  updateInspector();
  render(); // ✅ VIKTIGAST
});

entityInput.addEventListener("change", () => {
  const element = getSelectedElement();
  if (!element) return;

  uiLog(`entity changed → ${entityInput.value} (element id=${element.id})`);
  element.source.entity_id = entityInput.value;

  updateInspector();
  render(); // ✅ VIKTIGAST
});

function applySizeChange() {
  const newWidth = Math.max(1, Math.min(10000, Number(widthInput.value)));
  const newHeight = Math.max(1, Math.min(10000, Number(heightInput.value)));
  layout.width = newWidth;
  layout.height = newHeight;
  canvas.setAttribute("width", newWidth);
  canvas.setAttribute("height", newHeight);
  canvas.setAttribute("viewBox", `0 0 ${newWidth} ${newHeight}`);
  // Scale the canvas display size proportionally, capping width at 500px
  const maxDisplayWidth = 500;
  const scale = Math.min(maxDisplayWidth / newWidth, 1);
  canvas.style.width = (newWidth * scale) + 'px';
  canvas.style.height = (newHeight * scale) + 'px';
  render();
}

presetSelect.addEventListener("change", () => {
  const selectedPreset = presetSelect.value;
  uiLog(`preset changed → ${selectedPreset}`);
  if (selectedPreset !== "custom" && presets[selectedPreset]) {
    const { width, height } = presets[selectedPreset];
    widthInput.value = width;
    heightInput.value = height;
  }
});

setSizeButton.addEventListener("click", (e) => {
  e.preventDefault();
  uiLog(`setSizeButton clicked (${widthInput.value}x${heightInput.value})`);
  if (confirm("Are you sure you want to change format?")) {
    applySizeChange();
  }
});

// Load addon config (verbose flag), then fetch HA states
loadAddonConfig().then(() => fetchHAStates());

// Add test element
addText(50, 50, "Hello e-paper");

