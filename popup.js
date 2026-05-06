// ===== STORAGE KEYS =====
const ENTER_KEY = "enterLaunch";
const SEARCH_BAR_KEY = "showSearchBar";
const REDIRECT_ENABLED_KEY = "redirectEnabled";
const REDIRECT_URL_KEY = "redirectUrl";

// ===== ENTER TO SUBMIT =====
const enterToggle = document.getElementById("enterToggle");
enterToggle.checked = localStorage.getItem(ENTER_KEY) !== "false";

enterToggle.addEventListener("change", e => {
  localStorage.setItem(ENTER_KEY, e.target.checked);
});

// ===== SHOW SEARCH BAR =====
const searchBarToggle = document.getElementById("searchBarToggle");
searchBarToggle.checked = localStorage.getItem(SEARCH_BAR_KEY) !== "false";

searchBarToggle.addEventListener("change", e => {
  localStorage.setItem(SEARCH_BAR_KEY, e.target.checked);
});

// ===== SYSTEM THEME AUTO =====
function applyTheme() {
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;

  if (prefersLight) {
    document.body.classList.add("light");
  } else {
    document.body.classList.remove("light");
  }
}

applyTheme();

window.matchMedia('(prefers-color-scheme: light)')
  .addEventListener('change', applyTheme);

// ===== CUSTOM CSS STORAGE =====
const cssBox = document.getElementById("cssBox");

chrome.storage.local.get("customCSS", (data) => {
  cssBox.value = data.customCSS || "";
});

document.getElementById("saveCss").addEventListener("click", () => {
  chrome.storage.local.set({
    customCSS: cssBox.value
  });
});






























// Image enabled storage


const BG_ENABLED_KEY = "bgEnabled";
const bgToggle = document.getElementById("bgToggle");


// restore state
chrome.storage.local.get(BG_ENABLED_KEY, (data) => {
  bgToggle.checked = data[BG_ENABLED_KEY] === true;
});

// save state on change
bgToggle.addEventListener("change", (e) => {
  chrome.storage.local.set({
    [BG_ENABLED_KEY]: e.target.checked
  });
});









// ===== BACKGROUND IMAGE STORAGE =====
const BG_KEY = "bgImage";

// elements
const bgUpload = document.getElementById("bgUpload");
const bgCard = bgUpload.closest(".card");

// create preview element (insert above upload button)
// wrapper gives us proper cropping behavior
const previewWrapper = document.createElement("div");
previewWrapper.style.width = "100%";
previewWrapper.style.aspectRatio = "16 / 9";
previewWrapper.style.borderRadius = "10px";
previewWrapper.style.overflow = "hidden";
previewWrapper.style.marginBottom = "8px";

previewWrapper.style.display = "none";

// actual image
const preview = document.createElement("img");
preview.style.width = "100%";
preview.style.height = "100%";
preview.style.objectFit = "cover";
preview.style.display = "none";

// build structure
previewWrapper.appendChild(preview);

const uploadBtn = bgUpload.closest(".upload-btn");
uploadBtn.parentNode.insertBefore(previewWrapper, uploadBtn);

// load saved image
chrome.storage.local.get(BG_KEY, (data) => {
  const img = data[BG_KEY];

  if (img) {
    preview.src = img;
    preview.style.display = "block";
    previewWrapper.style.display = "block";
  } else {
    previewWrapper.style.display = "none";
  }
});

// when user uploads image
bgUpload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    const imgData = reader.result;

    // save to storage
    chrome.storage.local.set({
      [BG_KEY]: imgData
    });

    // show preview
    preview.src = imgData;
    preview.style.display = "block";
    previewWrapper.style.display = "block";
  };

  reader.readAsDataURL(file);
});


const BLUR_KEY = "bgBlur";
const blurSlider = document.getElementById("blurSlider");

// restore
chrome.storage.local.get(BLUR_KEY, (data) => {
  blurSlider.value = data[BLUR_KEY] || 0;
});

// save
blurSlider.addEventListener("input", (e) => {
  chrome.storage.local.set({
    [BLUR_KEY]: Number(e.target.value)
  });
});












// ===== RANDOM BACKGROUND (CHROME STORAGE) =====
const RANDOM_KEY = "bgRandom";
const randomToggle = document.getElementById("toggleRandom");

// restore state (DEFAULT = OFF)
chrome.storage.local.get(RANDOM_KEY, (data) => {
  randomToggle.checked = data[RANDOM_KEY] === true;
});

// save on change
randomToggle.addEventListener("change", (e) => {
  chrome.storage.local.set({
    [RANDOM_KEY]: e.target.checked
  });
});











// ===== REDIRECT TOGGLE =====
const redirectToggle = document.getElementById("redirectToggle");
const redirectUrlInput = document.getElementById("redirectUrl");

// restore toggle
chrome.storage.local.get(REDIRECT_ENABLED_KEY, (data) => {
  redirectToggle.checked = data[REDIRECT_ENABLED_KEY] === true;
});

// save toggle
redirectToggle.addEventListener("change", (e) => {
  chrome.storage.local.set({
    [REDIRECT_ENABLED_KEY]: e.target.checked
  });
});

// restore URL
chrome.storage.local.get(REDIRECT_URL_KEY, (data) => {
  redirectUrlInput.value = data[REDIRECT_URL_KEY] || "";
});

// save URL (on input)
redirectUrlInput.addEventListener("input", (e) => {
  chrome.storage.local.set({
    [REDIRECT_URL_KEY]: e.target.value
  });
});
















// ---------- Integrations -------------


const INTEGRATIONS_KEY = "integrations";

function getIntegrations(cb) {
  chrome.storage.local.get(INTEGRATIONS_KEY, (data) => {
    cb(data[INTEGRATIONS_KEY] || {});
  });
}

function setIntegrations(update) {
  chrome.storage.local.get(INTEGRATIONS_KEY, (data) => {
    const current = data[INTEGRATIONS_KEY] || {};
    const next = { ...current, ...update };

    chrome.storage.local.set({
      [INTEGRATIONS_KEY]: next
    });
  });
}









const todoistEnabled = document.getElementById("todoistEnabled");
const todoistLink = document.getElementById("todoistLink");

const weatherEnabled = document.getElementById("weatherEnabled");




// restore
getIntegrations((data) => {
  const t = data.todoist || { enabled: false, icsUrl: "" };
  const w = data.weather || { enabled: false };

  todoistEnabled.checked = !!t.enabled;
  todoistLink.value = t.icsUrl || "";

  weatherEnabled.checked = !!w.enabled;
});







// save enabled toggle
todoistEnabled.addEventListener("change", (e) => {
  setIntegrations({
    todoist: {
      enabled: e.target.checked,
      icsUrl: todoistLink.value || ""
    }
  });
});

// save url
todoistLink.addEventListener("input", (e) => {
  setIntegrations({
    todoist: {
      enabled: todoistEnabled.checked,
      icsUrl: e.target.value
    }
  });
});





weatherEnabled.addEventListener("change", (e) => {
  setIntegrations({
    weather: {
      enabled: e.target.checked
    }
  });
});


