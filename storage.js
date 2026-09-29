(function () {
  const chromeStorage = typeof chrome !== "undefined" && chrome?.storage?.local;
  const prefix = "folio_";

  function getPrefixedKey(key) {
    return prefix + key;
  }

  function parseValue(value) {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (typeof value !== "string") {
      return value;
    }

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }


  
  function serializeValue(value) {
    return JSON.stringify(value);
  }

  function getAllFromLocalStorage() {
    const data = {};

    for (let i = 0; i < localStorage.length; i++) {
      const fullKey = localStorage.key(i);
      if (!fullKey || !fullKey.startsWith(prefix)) continue;
      data[fullKey.slice(prefix.length)] = parseValue(localStorage.getItem(fullKey));
    }

    return data;
  }

  function get(keys, callback) {
    if (chromeStorage) {
      chrome.storage.local.get(keys, callback);
      return;
    }

    const result = {};

    if (keys == null) {
      callback(getAllFromLocalStorage());
      return;
    }

    if (Array.isArray(keys)) {
      keys.forEach((key) => {
        result[key] = parseValue(localStorage.getItem(getPrefixedKey(key)));
      });
      callback(result);
      return;
    }

    if (typeof keys === "object") {
      Object.keys(keys).forEach((key) => {
        const raw = localStorage.getItem(getPrefixedKey(key));
        result[key] = raw !== null ? parseValue(raw) : keys[key];
      });
      callback(result);
      return;
    }

    const raw = localStorage.getItem(getPrefixedKey(keys));
    result[keys] = raw !== null ? parseValue(raw) : undefined;
    callback(result);
  }

  function set(items, callback) {
    if (chromeStorage) {
      chrome.storage.local.set(items, callback);
      return;
    }

    Object.entries(items).forEach(([key, value]) => {
      localStorage.setItem(getPrefixedKey(key), serializeValue(value));
    });

    if (typeof callback === "function") {
      setTimeout(() => callback(items), 0);
    }
  }



  const watchers = {};

  function watch(key, callback) {

    if (!watchers[key]) {
      watchers[key] = [];
    }

    watchers[key].push(callback);


    // Chrome extension mode
    if (chromeStorage && !watch.watchRegistered) {

      chrome.storage.onChanged.addListener((changes, area) => {

        if (area !== "local")
          return;


        Object.keys(changes).forEach((changedKey) => {

          if (!watchers[changedKey])
            return;


          const value = changes[changedKey].newValue;

          watchers[changedKey].forEach(fn => {
            fn(value);
          });

        });

      });

      watch.watchRegistered = true;
    }
  }



  function exportData(filename = "folio-settings.json") {
    const finish = (data) => {
      const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        { type: "application/json" }
      );

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();

      setTimeout(() => URL.revokeObjectURL(url), 0);
    };

    if (chromeStorage) {
      chrome.storage.local.get(null, finish);
    } else {
      finish(getAllFromLocalStorage());
    }
  }

  function importData(file, callback) {
    if (!(file instanceof File)) {
      if (typeof callback === "function") callback(false);
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);

        if (chromeStorage) {
          chrome.storage.local.set(data, () => {
            if (typeof callback === "function") callback(true);
          });
        } else {
          Object.entries(data).forEach(([key, value]) => {
            localStorage.setItem(
              getPrefixedKey(key),
              serializeValue(value)
            );
          });

          if (typeof callback === "function") callback(true);
        }
      } catch (err) {
        console.error("Invalid backup file.", err);
        if (typeof callback === "function") callback(false);
      }
    };

    reader.readAsText(file);
  }







  window.folioStorage = {
    get,
    set,
    watch,
    exportData,
    importData
  };
}());
