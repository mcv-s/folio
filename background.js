const AI_MAP = {
  chatgpt: {
    name: "ChatGPT",
    url: "https://chatgpt.com/?q="
  },
  claude: {
    name: "Claude",
    url: "https://claude.ai/new?q="
  },
  grok: {
    name: "Grok",
    url: "https://grok.com/?q="
  },
  perplexity: {
    name: "Perplexity",
    url: "https://www.perplexity.ai/search?q="
  },
  mistral: {
    name: "Mistral",
    url: "https://chat.mistral.ai/chat?q="
  },
  copilot: {
    name: "Copilot",
    url: "https://www.bing.com/copilotsearch?q="
  }
};

const DEFAULT_AI = "grok";

const MENU_ID = "ask-ai";

/* -----------------------------
   SAFE STORAGE READ
------------------------------*/
function getAI(cb) {
  chrome.storage.local.get("selectedAI", (data) => {
    const ai = data.selectedAI;
    cb(AI_MAP[ai] ? ai : DEFAULT_AI);
  });
}

/* -----------------------------
   MENU TITLE UPDATE (IMPORTANT)
------------------------------*/
function updateMenu() {
  getAI((aiKey) => {
    const name = AI_MAP[aiKey].name;

    chrome.contextMenus.update(MENU_ID, {
      title: `Ask ${name} about "%s"`
    }, () => {
      // ignore harmless errors during service worker wake
      void chrome.runtime.lastError;
    });
  });
}


/* -----------------------------
   INIT (MOST IMPORTANT PART)
------------------------------*/
function init() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "Ask AI about \"%s\"",
      contexts: ["selection"]
    }, () => {
      updateMenu();
    });
  });

}

/* -----------------------------
   EVENTS
------------------------------*/

// install
chrome.runtime.onInstalled.addListener(() => {
  init();
});

// browser restart / service worker wake
chrome.runtime.onStartup.addListener(() => {
  init();
});

// storage changes (THIS is what you were missing properly)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.selectedAI) {
    updateMenu();
  }
});

/* -----------------------------
   CLICK HANDLER
------------------------------*/
chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== MENU_ID) return;

  const text = info.selectionText || "";

  getAI((aiKey) => {
    const ai = AI_MAP[aiKey];

    const prompt = `tell me about "${text}"`;

    const url = ai.url + encodeURIComponent(prompt);

    chrome.tabs.create({ url });
  });
});









// Get recent history
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "getHistory") {
    chrome.history.search({ text: '', maxResults: 20, startTime: 0 }, sendResponse);
    return true;
  }
});






