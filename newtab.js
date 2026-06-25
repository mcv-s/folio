
console.log("chrome.history:", !!chrome?.history);




function setFavicon() {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  const icon = isDark
    ? "https://assets.msn.com/statics/icons/favicon_newtabpage_dark.png"
    : "https://assets.msn.com/statics/icons/favicon_newtabpage.png";

  document.getElementById("favicon").href = icon;
}

setFavicon();

window.matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', setFavicon);

/* ===== CANVAS STARFIELD ===== */
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

let w, h;
const STAR_COUNT = 500;
let stars = [];

let pivot = { x: 0, y: 0 };
let angle = 0;

function resize() {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;

  pivot.x = w / 2;
  pivot.y = -h;

  initStars();
}
window.addEventListener("resize", resize);
resize();

function initStars() {
  stars = [];
  const radius = Math.max(w, h) * 2.6;

  for (let i = 0; i < STAR_COUNT; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;

    stars.push({
      x: Math.cos(a) * r,
      y: Math.sin(a) * r,
      r: Math.random() * 0.9 + 0.08,
      alpha: 1,
      targetAlpha: 1
    });
  }
}

function rotate(x, y, cx, cy, a) {
  const s = Math.sin(a);
  const c = Math.cos(a);

  x -= cx;
  y -= cy;

  return {
    x: x * c - y * s + cx,
    y: x * s + y * c + cy
  };
}

function draw() {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  ctx.fillStyle = isDark ? "#212121" : "#f0f0f0";
  ctx.fillRect(0, 0, w, h);

  angle += 0.00012;

  for (let s of stars) {
    s.alpha += (s.targetAlpha - s.alpha) * 0.12;
    const p = rotate(s.x, s.y, pivot.x, pivot.y, angle);
    ctx.beginPath();
    ctx.arc(p.x, p.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = isDark
      ? `rgba(235,240,255,${s.alpha * 0.85})`
      : `rgba(30,30,60,${s.alpha * 0.6})`;   // dark blue-ish stars on light bg
    ctx.shadowBlur = 2;
    ctx.fill();
  }

  requestAnimationFrame(draw);
}


draw();

/* ===== UI ===== */
const input = document.getElementById("aiInput");
const sendBtn = document.querySelector(".send");
const bar = document.querySelector(".search-bar");

bar.style.transition = "border-radius 0.18s ease, padding 0.18s ease";
input.style.transition = "height 0.12s ease";

function updateShape(isMultiLine) {
  if (!isMultiLine) {
    bar.style.borderRadius = "999px";
    bar.style.padding = "10px 14px 10px 18px";
  } else {
    bar.style.borderRadius = "18px";
    bar.style.padding = "14px 14px 14px 18px";
  }
}

let collapsedHeight = 0;

window.addEventListener("load", () => {
  input.style.height = "auto";
  collapsedHeight = input.scrollHeight;
  updateShape(false);
});

input.addEventListener("input", () => {
  const lineHeight = parseFloat(getComputedStyle(input).lineHeight);
  const max = lineHeight * 9;

  input.style.height = "auto";
  const contentHeight = input.scrollHeight;
  const isMultiLine = contentHeight > collapsedHeight;

  input.style.height = isMultiLine ? Math.min(contentHeight, max) + "px" : "auto";
  updateShape(isMultiLine);
});

function launch() {
  const text = input.value.trim();
  if (!text) return;

  const ai = selectedAI;

  let baseUrl = "https://chatgpt.com/?&q=";

  if (ai === "claude") {
    baseUrl = "https://claude.ai/new?q=";
  } 
  
  else if (ai === "grok") {
    baseUrl = "https://grok.com/?q=";
  }

  else if (ai === "perplexity") {
    baseUrl = "https://www.perplexity.ai/search?q=";
  }


  else if (ai === "mistral") {
    baseUrl = "https://chat.mistral.ai/chat?q=";
  }


  else if (ai === "copilot") {
    baseUrl = "https://www.bing.com/copilotsearch?q=";
  }

  


  
  window.location.href = baseUrl + encodeURIComponent(text);
}

input.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    launch();
  }
});

sendBtn.addEventListener("click", launch);



















let selectedAI = localStorage.getItem("selectedAI") || "chatgpt";

const aiBubble = document.getElementById("aiBubble");
const aiSelected = document.getElementById("aiSelected");
const aiMenu = document.getElementById("aiMenu");
const aiOptions = document.querySelectorAll(".ai-option");

// restore UI on load
window.addEventListener("load", () => {
  aiOptions.forEach(opt => {
    const match = opt.dataset.value === selectedAI;

    opt.classList.toggle("active", match);

    if (match) {
      aiSelected.firstChild.textContent = opt.textContent + " ";
    }
  });
});

// toggle dropdown
aiBubble.addEventListener("click", (e) => {
  e.stopPropagation();
  aiBubble.classList.toggle("open");
});

// select option
aiOptions.forEach(opt => {
  opt.addEventListener("click", (e) => {
    e.stopPropagation();

    selectedAI = opt.dataset.value;

    localStorage.setItem("selectedAI", selectedAI);
    chrome.storage.local.set({
      selectedAI
    });

    aiSelected.firstChild.textContent = opt.textContent + " ";

    aiOptions.forEach(o => o.classList.remove("active"));
    opt.classList.add("active");

    aiBubble.classList.remove("open");
  });
});

// close on outside click
document.addEventListener("click", () => {
  aiBubble.classList.remove("open");
});









/* --------------------------------- User settings --------------------------------- */













/* =========================
   CUSTOM BACKGROUND SYSTEM
   ========================= */

const RANDOM_KEY = "bgRandomCache";
const RANDOM_ACTIVE_KEY = "bgRandom";

/* ---------- helper: create background layer ---------- */
function createLayer() {
  const layer = document.createElement("div");
  layer.id = "bg-layer";

  Object.assign(layer.style, {
    position: "fixed",
    inset: "0",
    zIndex: "0",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    pointerEvents: "none",
    opacity: "1"
  });

  document.body.prepend(layer);
  return layer;
}

/* ---------- helper: fetch random image ---------- */
async function fetchRandomImageAsDataURL() {
  const url = `https://picsum.photos/1920/1080?random=${Date.now()}`;

  const res = await fetch(url, { cache: "no-store" });
  const blob = await res.blob();

  return await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

/* ---------- apply image ---------- */
function applyImage(layer, img, blur) {
  layer.style.backgroundImage = `url(${img})`;
  layer.style.filter = `blur(${blur}px)`;
  layer.style.opacity = "1";
}

/* ---------- MAIN ---------- */
chrome.storage.local.get(
  ["bgImage", "bgEnabled", "bgBlur", RANDOM_KEY, RANDOM_ACTIVE_KEY],
  async (data) => {

    const enabled = data.bgEnabled === true;
    const blur = data.bgBlur || 0;
    const randomOn = data[RANDOM_ACTIVE_KEY] === true;

    const canvas = document.getElementById("c");

    if (!enabled) return;

    let layer = document.getElementById("bg-layer");
    if (!layer) layer = createLayer();

    /* =========================
       USER IMAGE MODE
       ========================= */
    if (!randomOn) {
      const img = data.bgImage || "";
      applyImage(layer, img, blur);

      if (canvas) canvas.style.display = "block";
      return;
    }

    /* =========================
       RANDOM IMAGE MODE (FIXED)
       ========================= */

    let cached = data[RANDOM_KEY];

    // If no cache exists, fetch immediately
    if (!cached) {
      cached = await fetchRandomImageAsDataURL();
      chrome.storage.local.set({ [RANDOM_KEY]: cached });
    }

    applyImage(layer, cached, blur);

    if (canvas) canvas.style.display = "block";

    // Preload next image in background (non-blocking)
    fetchRandomImageAsDataURL()
      .then((img) => {
        chrome.storage.local.set({ [RANDOM_KEY]: img });
      })
      .catch((e) => console.warn("Random cache failed:", e));
  }
);






/* Redirect if the user wants */

chrome.storage.local.get(
  ["redirectEnabled", "redirectUrl"],
  (data) => {
    if (data.redirectEnabled && data.redirectUrl) {
      window.location.href = data.redirectUrl;
    }
  }
);

















/* Custom CSS Applier (LAST-WINS VERSION) */

function applyCustomCSS() {
  console.log("CSS CHECK: running");

  chrome.storage.local.get(null, (data) => {
    const css = data.customCSS;

    if (!css) {
      console.log("CSS CHECK: no css found");
      return;
    }

    console.log("CSS CHECK: applying css");

    let styleTag = document.getElementById("custom-css");

    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = "custom-css";
    }

    // always update content
    styleTag.textContent = css;

    // 🔥 FORCE IT TO BE LAST IN HEAD
    document.head.appendChild(styleTag);
  });
}

/* run AFTER full page load */
window.addEventListener("load", () => {
  applyCustomCSS();

  // 🔥 catch late overrides from other scripts/extensions
  setTimeout(applyCustomCSS, 100);
  setTimeout(applyCustomCSS, 300);
});







/* Hide search bar if user wants */


const showSearchBar = localStorage.getItem("showSearchBar") !== "false";

const searchBar = document.querySelector(".search-bar");

const aiSelectorItem = document.querySelector(".ai-bubble");

if (!showSearchBar && searchBar && aiSelectorItem )  {
  searchBar.style.display = "none";
  
  aiSelectorItem.style.display = "none";
}


/* ---------------------------------------------------------------------------------- */




















// ===== HISTORY PANEL VISIBILITY =====
function updateHistoryVisibility() {
  const historyPanel = document.getElementById("historyPanel");

  if (!historyPanel) return;

  chrome.storage.local.get("showHistory", (data) => {
    const enabled = data.showHistory === true;

    historyPanel.classList.toggle("hidden", !enabled);
  });
}

// run on load
window.addEventListener("load", updateHistoryVisibility);




















function getDomain(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function loadHistory() {
  const el = document.getElementById("historyList");
  if (!el) return;

  chrome.runtime.sendMessage({action:"getHistory"}, (results=[]) => {
    el.innerHTML = "";

    if (results.length === 0) {
      el.innerHTML = `<div class="history-item"><div class="history-icon"></div><div class="history-text">No recent activity</div></div>`;
      return;
    }

    results.forEach(item => {
      const domain = getDomain(item.url);
      const iconUrl = `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;

      const div = document.createElement("div");
      div.className = "history-item";
      div.innerHTML = `
        <div class="history-icon" style="background-image: url('https://www.google.com/s2/favicons?sz=32&domain=${domain}')"></div>
        <div class="history-text">${domain}</div>
      `;
      div.onclick = () => location.href = item.url;
      el.appendChild(div);
    });
  });
}

window.addEventListener("load", () => setTimeout(loadHistory, 300));








