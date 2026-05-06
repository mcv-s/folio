const widgetLayer = document.getElementById("widgetLayer");

const widgetStateKey = "widgetState";





/* =========================
   STATE (positions/sizes)
   ========================= */
function loadState() {
  return JSON.parse(localStorage.getItem(widgetStateKey) || "{}");
}

function saveState(state) {
  localStorage.setItem(widgetStateKey, JSON.stringify(state));
}





// Function to reset widgets that are disabled

function resetDisabledWidgetState(integrations) {
  const state = loadState();

  const widgetMap = [
    { key: "todoist", id: "todoist-widget" },
    { key: "weather", id: "weather-widget" },
    // add more widgets here later
  ];

  for (const w of widgetMap) {
    const enabled = integrations?.[w.key]?.enabled;

    if (!enabled) {
      delete state[w.id];
    }
  }

  saveState(state);
}





/* =========================
   CORE WIDGET FACTORY
   ========================= */
function createWidget(id, title) {
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






/* =========================
   DRAGGING
   ========================= */
function makeDraggable(el) {
  const header = el.querySelector(".widget-header");

  let offsetX = 0, offsetY = 0, dragging = false;

  header.style.cursor = "grab";

  header.addEventListener("mousedown", (e) => {
    dragging = true;

    const rect = el.getBoundingClientRect();
    offsetX = e.clientX - rect.left + 20;
    offsetY = e.clientY - rect.top + 20;

    document.body.style.userSelect = "none";
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;

    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;

    el.style.position = "absolute";
    el.style.left = x + "px";
    el.style.top = y + "px";

    saveWidget(el);
  });

  window.addEventListener("mouseup", () => {
    dragging = false;
    document.body.style.userSelect = "";
  });
}

/* =========================
   RESIZING
   ========================= */
function makeResizable(el) {
  const handle = el.querySelector(".widget-resize");

  let resizing = false;
  let startX, startY, startW, startH;

  handle.addEventListener("mousedown", (e) => {
    resizing = true;

    const rect = el.getBoundingClientRect();

    startX = e.clientX;
    startY = e.clientY;
    startW = rect.width;
    startH = rect.height;

    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!resizing) return;

    const w = startW + (e.clientX - startX - 24);
    const h = startH + (e.clientY - startY - 20);

    el.style.width = Math.max(180, w) + "px";
    el.style.height = Math.max(120, h) + "px";

    saveWidget(el);
  });

  window.addEventListener("mouseup", () => {
    resizing = false;
  });
}

/* =========================
   SAVE / RESTORE
   ========================= */
function saveWidget(el) {
  const state = loadState();

  state[el.id] = {
    left: el.style.left,
    top: el.style.top,
    width: el.style.width,
    height: el.style.height
  };

  saveState(state);
}

function restoreWidgetState(el) {
  const state = loadState()[el.id];
  if (!state) return;

  el.style.position = "absolute";
  if (state.left) el.style.left = state.left;
  if (state.top) el.style.top = state.top;
  if (state.width) el.style.width = state.width;
  if (state.height) el.style.height = state.height;
}


function clearWidgetState(id) {
  const state = loadState();
  delete state[id];
  saveState(state);
}













/* =========================
   SIMPLE ICS PARSER
   ========================= */
function parseICS(text) {
  const lines = text.split("\n");

  const tasks = [];
  let current = null;

  for (let line of lines) {
    line = line.trim();

    if (line === "BEGIN:VEVENT") {
      current = {
        completed: false,
        recurring: false
      };
    }

    if (!current) continue;

    if (line.startsWith("SUMMARY:")) {
      current.title = line.replace("SUMMARY:", "").trim();
    }

    if (line.startsWith("DTSTART")) {
      current.date = line.split(":")[1];
    }

    // detect recurring tasks
    if (line.startsWith("RRULE")) {
      current.recurring = true;
    }

    // detect completion
    if (
      line.startsWith("STATUS:COMPLETED") ||
      line.startsWith("COMPLETED:") ||
      line.startsWith("PERCENT-COMPLETE:100")
    ) {
      current.completed = true;
    }

    if (line === "END:VEVENT") {
      if (
        current.title &&
        !current.recurring // 👈 IMPORTANT: skip repeating tasks
      ) {
        tasks.push(current);
      }

      current = null;
    }
  }

  return tasks;
}


















/* =========================
   TODOIST WIDGET
   ========================= */
function loadTodoistWidget() {
  chrome.storage.local.get("integrations", async (data) => {
    const integrations = data.integrations || {};
    const todoist = integrations.todoist;

    if (!todoist || !todoist.enabled || !todoist.icsUrl) return;

    const box = createWidget("todoist-widget", "Todoist Tasks");

    box.innerHTML = `<div style="opacity:0.6;">Loading...</div>`;

    try {
      const res = await fetch(todoist.icsUrl);
      const text = await res.text();

        const tasks = parseICS(text);

        /* =========================
        CLEAN + DEDUPE + SORT
        ========================= */

        // 1. normalize + dedupe by title
        const seen = new Set();

        const uniqueTasks = tasks.filter(t => {
        const key = (t.title || "").trim().toLowerCase();

        if (!key || seen.has(key)) return false;

        seen.add(key);
        return true;
        });

        // 2. sort by date (earliest first)
        uniqueTasks.sort((a, b) => {
        const da = a.date ? new Date(a.date) : new Date(9999, 0, 1);
        const db = b.date ? new Date(b.date) : new Date(9999, 0, 1);
        return da - db;
        });

        // 3. render
        box.innerHTML = uniqueTasks.slice(0, 50).map(t => {
        const date = t.date
            ? new Date(t.date).toLocaleDateString()
            : "No date";

        return `
            <div style="
            display:flex;
            justify-content:space-between;
            gap:10px;
            padding:6px 0;
            border-bottom:1px solid rgba(255,255,255,0.08);
            ">
            <div style="flex:1;">
                ${t.title}
            </div>
            </div>
        `;
        }).join("");

    } catch (err) {
      box.innerHTML = `<div style="opacity:0.6;">Failed to load tasks</div>`;
    }
  });
}













// Weather widget

const WEATHER_UNIT_KEY = "weatherUnit"; // "C" | "F"

function cToF(c) {
  return (c * 9) / 5 + 32;
}

function formatTemp(tempC, unit) {
  if (unit === "F") return `${Math.round(cToF(tempC))}°F`;
  return `${Math.round(tempC)}°C`;
}

async function loadWeatherWidget() {
  chrome.storage.local.get("integrations", async (data) => {
    const integrations = data.integrations || {};
    const weather = integrations.weather;

    if (!weather || !weather.enabled) return;

    const box = createWidget("weather-widget", "Weather");
    box.innerHTML = `<div style="opacity:0.6;">Loading weather...</div>`;

    const unit =
      localStorage.getItem(WEATHER_UNIT_KEY) || "C";

    function getLocation() {
        return fetch("https://ipwho.is/")
            .then(res => res.json())
            .then(data => {
            if (!data.success) throw new Error("IP geo failed");

            return {
                lat: data.latitude,
                lon: data.longitude
            };
            })
            .catch(() => {
            // fallback only if IP service fails
            return { lat: 34.1015, lon: -84.5194 };
            });
        }

    try {
      const { lat, lon } = await getLocation();

      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}&longitude=${lon}` +
        `&current_weather=true`;

      const res = await fetch(url);
      const data = await res.json();

      if (!data.current_weather) {
        box.innerHTML = `<div style="opacity:0.6;">No weather data</div>`;
        return;
      }

      const w = data.current_weather;

      function render() {
        const temp = formatTemp(w.temperature, unit);
        const icon = getWeatherIcon(w.weathercode);

        box.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:10px;">

            <div style="display:flex;align-items:center;justify-content:space-between;">

                <div style="font-size:28px;">
                ${icon}
                </div>

                <div style="text-align:right;">
                <div id="tempToggle"
                    style="font-size:22px;font-weight:600;cursor:pointer;">
                    ${temp}
                </div>
                </div>

            </div>

            <div style="display:flex;justify-content:space-between;font-size:12px;opacity:0.75;">
                <span>💨 ${w.windspeed} km/h</span>
                <span>📍 Woodstock</span>
            </div>

            </div>
        `;

        document.getElementById("tempToggle").onclick = () => {
            const next = unit === "C" ? "F" : "C";
            localStorage.setItem(WEATHER_UNIT_KEY, next);
            location.reload();
        };
        }

      render();
    } catch (err) {
      box.innerHTML = `<div style="opacity:0.6;">Weather error</div>`;
      console.error("Weather error:", err);
    }
  });
}





function getWeatherIcon(code) {
  if (code === 0) return "☀️"; // clear
  if (code <= 2) return "🌤️";
  if (code <= 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "🌦️";
  if (code <= 86) return "❄️";
  return "⛈️";
}












/* =========================
   INIT
   ========================= */
window.addEventListener("load", () => {
  chrome.storage.local.get("integrations", (data) => {
    const integrations = data.integrations || {};

    resetDisabledWidgetState(integrations);

    loadTodoistWidget();
    loadWeatherWidget();
  });
});