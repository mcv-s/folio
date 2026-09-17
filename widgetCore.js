const widgetLayer = document.getElementById("widgetLayer");
const widgetStateKey = "widgetState";
const GRID_SNAP_KEY = "widgetGridSnap";
const GRID_SIZE = 25;

let lastWidgetDragAt = 0;
let radialMenu = null;
let radialMenuOrigin = null;
let lastPointerPosition = { x: 0, y: 0 };
let lastDraggedWidget = null;
let activeRadialAnchor = { x: 0, y: 0 };
let radialSelectionValid = false;
const ANCHOR_MARGIN = 20;



export let is24Hour = false;

export function set24HourPreference(value) {
  is24Hour = value;
}

function getGridSnapEnabled() {
  try {
    return localStorage.getItem(GRID_SNAP_KEY) === "true";
  } catch {
    return false;
  }
}

function snapValue(value, step = GRID_SIZE) {
  return Math.round(value / step) * step;
}

function getViewportCenter() {
  return {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2
  };
}

function getWidgetCenterPosition(el) {
  const center = getViewportCenter();
  const left = Number.parseFloat(el.style.left || "0") || 0;
  const top = Number.parseFloat(el.style.top || "0") || 0;

  return {
    centerX: left - center.x,
    centerY: top - center.y
  };
}

function applyWidgetCenterPosition(el, centerX, centerY) {
  const center = getViewportCenter();
  const snappedCenterX = getGridSnapEnabled() ? snapValue(centerX) : centerX;
  const snappedCenterY = getGridSnapEnabled() ? snapValue(centerY) : centerY;

  el.style.position = "absolute";
  el.style.left = `${snappedCenterX + center.x}px`;
  el.style.top = `${snappedCenterY + center.y}px`;
}

function readWidgetStatePosition(state) {
  if (typeof state?.centerX === "number" || typeof state?.centerX === "string") {
    return {
      centerX: Number.parseFloat(state.centerX) || 0,
      centerY: Number.parseFloat(state.centerY) || 0
    };
  }

  if (typeof state?.left === "number" || typeof state?.left === "string") {
    const center = getViewportCenter();
    return {
      centerX: (Number.parseFloat(state.left) || 0) - center.x,
      centerY: (Number.parseFloat(state.top) || 0) - center.y
    };
  }

  return { centerX: 0, centerY: 0 };
}

export function loadState() {
  return JSON.parse(localStorage.getItem(widgetStateKey) || "{}");
}

export function saveState(state) {
  localStorage.setItem(widgetStateKey, JSON.stringify(state));
}

export function createWidget(id, title) {
  let el = document.getElementById(id);

  if (!el) {
    el = document.createElement("div");
    el.className = "widget";
    el.id = id;

    el.innerHTML = `
      <div class="widget-header">${title}</div>
      <div class="widget-content"></div>
      <div class="widget-resize"></div>
    `;

    widgetLayer.appendChild(el);

    makeDraggable(el);
    makeResizable(el);
    restoreWidgetState(el);
  }

  return el.querySelector(".widget-content");
}

function makeDraggable(el) {
  const header = el.querySelector(".widget-header");

  let offsetX = 0;
  let offsetY = 0;
  let dragging = false;

  header.style.cursor = "grab";

  header.addEventListener("mousedown", (e) => {
    dragging = true;

    showGrid();

    const rect = el.getBoundingClientRect();
    offsetX = e.clientX - rect.left + 20;
    offsetY = e.clientY - rect.top + 20;

    document.body.style.userSelect = "none";
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;

    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    const center = getViewportCenter();
    const centerX = x - center.x;
    const centerY = y - center.y;
    const snappedCenterX = getGridSnapEnabled() ? snapValue(centerX) : centerX;
    const snappedCenterY = getGridSnapEnabled() ? snapValue(centerY) : centerY;

    applyWidgetCenterPosition(el, snappedCenterX, snappedCenterY);
    saveWidget(el);
  });

  window.addEventListener("mouseup", () => {
    if (dragging) {
      lastWidgetDragAt = Date.now();
      lastDraggedWidget = el;
    }
    dragging = false;
    hideGrid();
    document.body.style.userSelect = "";
  });
}

function applyWidgetAnchor(el, anchor, centerX, centerY, offsets = el._folioAnchorOffsets || { x: 0, y: 0 }) {
  const center = getViewportCenter();
  const width = el.offsetWidth || 260;
  const height = el.offsetHeight || 200;
  el.style.position = "absolute";
  if (anchor.x === 0 && anchor.y === 0) {
    applyWidgetCenterPosition(el, centerX, centerY);
    return;
  }
  const rect = el.getBoundingClientRect();
  const currentLeft = Number.parseFloat(el.style.left) || 0;
  const currentTop = Number.parseFloat(el.style.top) || 0;
  const targetLeft = anchor.x < 0 ? offsets.x : anchor.x > 0 ? window.innerWidth - rect.width - offsets.x : offsets.x * window.innerWidth - rect.width / 2;
  const targetTop = anchor.y < 0 ? offsets.y : anchor.y > 0 ? window.innerHeight - rect.height - offsets.y : offsets.y * window.innerHeight - rect.height / 2;
  const localLeft = currentLeft + targetLeft - rect.left;
  const localTop = currentTop + targetTop - rect.top;
  el.style.left = `${getGridSnapEnabled() ? snapValue(localLeft) : localLeft}px`;
  el.style.top = `${getGridSnapEnabled() ? snapValue(localTop) : localTop}px`;
}

function getAnchorOffsets(el, anchor) {
  const rect = el.getBoundingClientRect();
  return {
    x: anchor.x < 0 ? rect.left : anchor.x > 0 ? window.innerWidth - rect.right : (rect.left + rect.width / 2) / window.innerWidth,
    y: anchor.y < 0 ? rect.top : anchor.y > 0 ? window.innerHeight - rect.bottom : (rect.top + rect.height / 2) / window.innerHeight
  };
}

function isTextEntryTarget(target) {
  return target instanceof Element && Boolean(
    target.closest("input, textarea, select, [contenteditable='true']")
  );
}

function updateRadialMenuSelection(clientX, clientY) {
  if (!radialMenuOrigin || !radialMenu) return;

  const dx = clientX - radialMenuOrigin.x;
  const dy = clientY - radialMenuOrigin.y;
  const distance = Math.hypot(dx, dy);
  const centerRadius = 39;
  const ringRadius = 84;
  const centerActive = distance <= centerRadius;
  const ringActive = distance > centerRadius && distance <= ringRadius;
  const angleFromTop = (Math.atan2(dx, -dy) + Math.PI * 2) % (Math.PI * 2);
  const segment = Math.floor(((angleFromTop + Math.PI / 8) % (Math.PI * 2)) / (Math.PI / 4));

  radialMenu.querySelectorAll("[data-radial-segment]").forEach((item, index) => {
    item.classList.toggle("active", ringActive && index === segment);
  });
  radialMenu.querySelector("[data-radial-center]")?.classList.toggle("active", centerActive);
  radialSelectionValid = centerActive || ringActive;
  activeRadialAnchor = centerActive ? { x: 0, y: 0 } : anchorForSegment(segment);
  if (radialSelectionValid) {
    updateAnchorLines(activeRadialAnchor);
  } else {
    document.getElementById("widgetAnchorLines")?.remove();
  }
  updateRadialTooltip(clientX, clientY, centerActive ? "Anchor to center" : ringActive ? radialAnchorLabels[segment] : "Move over an anchor");
}

const radialAnchorLabels = [
  "Anchor to top edge", "Anchor to top-right corner", "Anchor to right edge", "Anchor to bottom-right corner",
  "Anchor to bottom edge", "Anchor to bottom-left corner", "Anchor to left edge", "Anchor to top-left corner"
];

function updateRadialTooltip(clientX, clientY, label) {
  const tooltip = document.getElementById("widgetRadialTooltip");
  if (!tooltip) return;
  tooltip.textContent = label;
  tooltip.style.left = `${clientX + 14}px`;
  tooltip.style.top = `${clientY + 14}px`;
}

function anchorForSegment(segment) {
  return [
    { x: 0, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 },
    { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1, y: 0 }, { x: -1, y: -1 }
  ][segment] || { x: 0, y: 0 };
}



function updateAnchorLines(anchor) {
  if (!lastDraggedWidget) return;

  let svg = document.getElementById("widgetAnchorLines");

  if (!svg) {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.id = "widgetAnchorLines";
    svg.setAttribute("aria-hidden", "true");

    const widgetLayer = document.getElementById("widgetLayer");

    if (widgetLayer) {
      widgetLayer.parentNode.insertBefore(svg, widgetLayer);
    } else {
      document.body.appendChild(svg);
    }
  }

  const rect = lastDraggedWidget.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  const lines = [];

  const anchorX = anchor?.x ?? 0;
  const anchorY = anchor?.y ?? 0;

  // Center anchor
  if (anchorX === 0 && anchorY === 0) {
    lines.push([
      innerWidth / 2,
      innerHeight / 2,
      x,
      y
    ]);
  } else {
    if (anchorY < 0) lines.push([x, 0, x, y]);
    if (anchorY > 0) lines.push([x, innerHeight, x, y]);
    if (anchorX < 0) lines.push([0, y, x, y]);
    if (anchorX > 0) lines.push([innerWidth, y, x, y]);

    // Corner anchor
    if (anchorX !== 0 && anchorY !== 0) {
      const cornerX = anchorX < 0 ? 0 : innerWidth;
      const cornerY = anchorY < 0 ? 0 : innerHeight;

      lines.push([cornerX, cornerY, x, y]);
    }
  }

  svg.innerHTML = lines
    .map(
      ([x1, y1, x2, y2]) =>
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`
    )
    .join("");
}





function createRadialMenu() {
  const menu = document.createElement("div");
  menu.id = "widgetRadialMenu";
  menu.setAttribute("aria-hidden", "true");

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 184 184");
  svg.setAttribute("aria-hidden", "true");

  const center = 92;
  const outerRadius = 84;
  const innerRadius = 39;
  const gap = 0.035;
  const point = (radius, angle) => `${center + Math.sin(angle) * radius} ${center - Math.cos(angle) * radius}`;

  for (let index = 0; index < 8; index += 1) {
    const offset = -Math.PI / 8;
    const start = index * (Math.PI / 4) + offset + gap;
    const end = (index + 1) * (Math.PI / 4) + offset - gap;
    const segment = document.createElementNS("http://www.w3.org/2000/svg", "path");
    segment.dataset.radialSegment = String(index);
    segment.setAttribute("d", `M ${point(innerRadius, start)} L ${point(outerRadius, start)} A ${outerRadius} ${outerRadius} 0 0 1 ${point(outerRadius, end)} L ${point(innerRadius, end)} A ${innerRadius} ${innerRadius} 0 0 0 ${point(innerRadius, start)} Z`);
    svg.appendChild(segment);
  }

  menu.appendChild(svg);

  const centerOption = document.createElement("div");
  centerOption.dataset.radialCenter = "true";
  centerOption.innerHTML = '<i class="ph ph-anchor" aria-hidden="true"></i>';
  menu.appendChild(centerOption);

  document.body.appendChild(menu);
  const tooltip = document.createElement("div");
  tooltip.id = "widgetRadialTooltip";
  document.body.appendChild(tooltip);
  return menu;
}

function hideRadialMenu() {
  if (radialMenuOrigin && radialSelectionValid && lastDraggedWidget) {
    const position = getWidgetCenterPosition(lastDraggedWidget);
    lastDraggedWidget._folioAnchor = activeRadialAnchor;
    lastDraggedWidget._folioAnchorOffsets = getAnchorOffsets(lastDraggedWidget, activeRadialAnchor);
    applyWidgetAnchor(lastDraggedWidget, activeRadialAnchor, position.centerX, position.centerY);
    saveWidget(lastDraggedWidget);
  }
  if (radialMenu) radialMenu.classList.remove("visible");
  radialMenuOrigin = null;
  radialSelectionValid = false;
  document.getElementById("widgetAnchorLines")?.remove();
  document.getElementById("widgetRadialTooltip")?.classList.remove("visible");
}

function showRadialMenu(event) {
  if (!lastDraggedWidget || isTextEntryTarget(event.target)) return;

  radialMenu ||= createRadialMenu();
  radialMenuOrigin = { ...lastPointerPosition };
  radialMenu.style.left = `${radialMenuOrigin.x}px`;
  radialMenu.style.top = `${radialMenuOrigin.y}px`;
  radialMenu.classList.add("visible");
  document.getElementById("widgetRadialTooltip")?.classList.add("visible");
  updateRadialMenuSelection(lastPointerPosition.x, lastPointerPosition.y);
}

window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() !== "a" || event.repeat || isTextEntryTarget(event.target)) return;
  showRadialMenu(event);
});

window.addEventListener("keyup", (event) => {
  if (event.key.toLowerCase() === "a") hideRadialMenu();
});

window.addEventListener("mousemove", (event) => {
  lastPointerPosition = { x: event.clientX, y: event.clientY };
  if (radialMenuOrigin) updateRadialMenuSelection(event.clientX, event.clientY);
});

window.addEventListener("blur", hideRadialMenu);

function makeResizable(el) {
  const handle = el.querySelector(".widget-resize");

  let resizing = false;
  let startX;
  let startY;
  let startW;
  let startH;

  handle.addEventListener("mousedown", (e) => {
    resizing = true;

    showGrid()

    const rect = el.getBoundingClientRect();

    startX = e.clientX;
    startY = e.clientY;
    startW = rect.width;
    startH = rect.height;

    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!resizing) return;



    const w = startW + (e.clientX - startX - 2);
    const h = startH + (e.clientY - startY - 2);
    const snappedW = getGridSnapEnabled() ? Math.max(100, snapValue(w)) : Math.max(100, w);
    const snappedH = getGridSnapEnabled() ? Math.max(100, snapValue(h)) : Math.max(100, h);

    el.style.width = snappedW + "px";
    el.style.height = snappedH + "px";

    saveWidget(el);
  });

  window.addEventListener("mouseup", () => {
    resizing = false;
    hideGrid()
  });
}

export function saveWidget(el) {
  const state = loadState();
  const position = getWidgetCenterPosition(el);
  const anchor = el._folioAnchor || { x: 0, y: 0 };
  el._folioAnchorOffsets = getAnchorOffsets(el, anchor);

  state[el.id] = {
    centerX: position.centerX,
    centerY: position.centerY,
    width: el.style.width,
    height: el.style.height,
    anchor,
    anchorOffsets: el._folioAnchorOffsets
  };

  saveState(state);
}

export function restoreWidgetState(el) {
  const state = loadState()[el.id];
  if (!state) return;

  const position = readWidgetStatePosition(state);
  el._folioAnchor = state.anchor || { x: 0, y: 0 };
  el._folioAnchorOffsets = state.anchorOffsets || { x: ANCHOR_MARGIN, y: ANCHOR_MARGIN };

  if (state.width) el.style.width = state.width;
  if (state.height) el.style.height = state.height;

  applyWidgetAnchor(el, el._folioAnchor, position.centerX, position.centerY, el._folioAnchorOffsets);
}

export function clearWidgetState(id) {
  const state = loadState();
  delete state[id];
  saveState(state);
}

let lastViewportScale = window.visualViewport?.scale ?? 1;

function handleViewportChange() {
  const currentScale = window.visualViewport?.scale ?? 1;

  if (Math.abs(currentScale - lastViewportScale) > 0.001) {
    lastViewportScale = currentScale;
    return;
  }

  lastViewportScale = currentScale;

  document.querySelectorAll(".widget").forEach((widget) => {
    restoreWidgetState(widget);
  });
}

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", handleViewportChange);
}

window.addEventListener("resize", handleViewportChange);










// Init grid

function showGrid() {
  if (!getGridSnapEnabled()) return;

  let grid = document.getElementById("widgetGridOverlay");

  if (!grid) {
    grid = document.createElement("div");
    grid.id = "widgetGridOverlay";
    document.body.appendChild(grid);
  }

  const center = getViewportCenter();

  grid.style.setProperty("--grid-size", `${GRID_SIZE}px`);

  grid.style.backgroundPosition =
    `${center.x % GRID_SIZE + 20}px ${center.y % GRID_SIZE + 20}px`;

  requestAnimationFrame(() => {
    grid.classList.add("visible");
  });

}





function hideGrid() {
  const grid = document.getElementById("widgetGridOverlay");

  if (grid) {
    grid.classList.remove("visible");
  }
}





