import { createWidget } from "../widgetCore.js";


const storageKey = "tabParkingSites";


export async function init(tabParking) {

  let sites = JSON.parse(
    localStorage.getItem(storageKey) || "[]"
  );

  if (!Array.isArray(sites)) {
    sites = [];
  }


  const box = createWidget(
    "tab-parking",
    "Tab Parking"
  );


  box.innerHTML = `
    <div class="parking-list"></div>
  `;


  const style = document.createElement("style");

  style.textContent = `

    .parking-list {

      width:100%;
      height:100%;

      overflow:hidden;

    }


    .parking-item {

      position:relative;

      display:flex;
      align-items:center;

      padding:7px 0;

      border-bottom:
        1px solid rgba(255,255,255,0.08);

      cursor:pointer;

      user-select:none;

    }


    .parking-item:hover {

      background:
        rgba(255,255,255,0.04);

    }


    .parking-item.dragging {

      opacity:0.35;

    }


    .parking-favicon {

      width:18px;
      height:18px;

      margin-right:9px;

      object-fit:contain;

      flex-shrink:0;

    }


    .parking-domain {

      overflow:hidden;

      text-overflow:ellipsis;

      white-space:nowrap;

      flex:1;

    }


    .parking-rename-input {

      flex:1;

      min-width:0;

      border:1px solid rgba(255,255,255,0.18);

      border-radius:6px;

      background:rgba(255,255,255,0.08);

      color:inherit;

      outline:none;

      padding:4px 7px;

      font:inherit;

    }


    .parking-actions {

      display:none;

      gap:5px;

      flex-shrink:0;

    }


    .parking-item.delete-open
    .parking-actions {

      display:flex;

    }


    .parking-action {

      height:22px;

      border:0;

      border-radius:6px;

      color:white;

      cursor:pointer;

      font-size:12px;

      padding:0 7px;

    }


    .parking-rename {

      background:
        rgba(255,255,255,0.12);

    }


    .parking-delete {

      width:22px;

      background:
        rgba(255,70,70,0.8);

      font-size:14px;

      padding:0;

    }


    .parking-empty {

      display:flex;

      align-items:center;
      justify-content:center;

      min-height:100%;

      box-sizing:border-box;

      opacity:0.6;

      text-align:center;

    }

  `;

  document.head.appendChild(style);


  const list =
    box.querySelector(".parking-list");


  function save() {

    localStorage.setItem(
      storageKey,
      JSON.stringify(sites)
    );

  }


  function normaliseUrl(url) {

    url = url.trim();

    if (
      !url.startsWith("http://") &&
      !url.startsWith("https://")
    ) {

      url =
        "https://" + url;

    }

    return url;

  }


  function getUrl(site) {

    if (
      typeof site === "object" &&
      site !== null
    ) {

      return site.url;

    }

    return site;

  }


  function getName(site) {

    if (
      typeof site === "object" &&
      site !== null &&
      site.name
    ) {

      return site.name;

    }

    const url =
      getUrl(site);

    try {

      return new URL(url).hostname;

    } catch {

      return url;

    }

  }


  function getDomain(url) {

    try {

      return new URL(url).hostname;

    } catch {

      return url;

    }

  }


  function render() {

    list.innerHTML = "";


    if (!sites.length) {

      list.innerHTML = `
        <div class="parking-empty">
          Drop a site here to park it
        </div>
      `;

      return;

    }


    sites.forEach((site, index) => {

      const url =
        normaliseUrl(
          getUrl(site)
        );

      const domain =
        getDomain(url);


      const item =
        document.createElement("div");

      item.className =
        "parking-item";

      item.draggable = true;


      const favicon =
        document.createElement("img");

      favicon.className =
        "parking-favicon";

      favicon.src =
        `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

      favicon.alt = "";


      const domainText =
        document.createElement("div");

      domainText.className =
        "parking-domain";

      domainText.textContent =
        getName(site);


      const actions =
        document.createElement("div");

      actions.className =
        "parking-actions";


      const renameButton =
        document.createElement("button");

      renameButton.className =
        "parking-action parking-rename";

      renameButton.textContent =
        "Rename";

      renameButton.title =
        "Rename";


      const deleteButton =
        document.createElement("button");

      deleteButton.className =
        "parking-action parking-delete";

      deleteButton.textContent =
        "×";

      deleteButton.title =
        "Delete";


      actions.appendChild(
        renameButton
      );

      actions.appendChild(
        deleteButton
      );


      item.appendChild(
        favicon
      );

      item.appendChild(
        domainText
      );

      item.appendChild(
        actions
      );


      /*
       * Open
       */

      item.onclick = () => {

        if (
          item.classList.contains(
            "delete-open"
          )
        ) {

          return;

        }

        window.location.href =
          url;

      };


      /*
       * Right click
       */

      item.oncontextmenu = event => {

        event.preventDefault();


        list
          .querySelectorAll(
            ".delete-open"
          )
          .forEach(other => {

            other.classList.remove(
              "delete-open"
            );

          });


        item.classList.add(
          "delete-open"
        );

      };


      /*
       * Rename
       */

      renameButton.onclick = event => {

        event.stopPropagation();


        const currentName =
          getName(site);


        const input =
          document.createElement("input");

        input.className =
          "parking-rename-input";

        input.type =
          "text";

        input.value =
          currentName;


        /*
         * Replace the displayed
         * name with the input.
         */

        domainText.replaceWith(
          input
        );


        item.classList.remove(
          "delete-open"
        );


        input.focus();

        input.select();


        let finished =
          false;


        function finishRename() {

          if (finished) {
            return;
          }

          finished = true;


          const newName =
            input.value.trim();


          /*
           * Keep old string format
           * when the name wasn't changed.
           *
           * Otherwise convert the
           * entry to an object.
           */

          if (
            newName &&
            newName !==
              currentName
          ) {

            sites[index] = {
              url,
              name: newName
            };

          }


          save();

          render();

        }


        input.onkeydown =
          event => {

            if (
              event.key ===
              "Enter"
            ) {

              event.preventDefault();

              finishRename();

            }


            if (
              event.key ===
              "Escape"
            ) {

              event.preventDefault();

              finished = true;

              render();

            }

          };


        input.onblur =
          finishRename;

      };


      /*
       * Delete
       */

      deleteButton.onclick =
        event => {

          event.stopPropagation();


          sites.splice(
            index,
            1
          );


          save();

          render();

        };


      /*
       * Start dragging
       */

      item.ondragstart =
        event => {

          event.dataTransfer.effectAllowed =
            "move";

          event.dataTransfer.setData(
            "text/tab-parking-index",
            String(index)
          );

          item.classList.add(
            "dragging"
          );

        };


      item.ondragend =
        () => {

          item.classList.remove(
            "dragging"
          );

        };


      /*
       * Allow another row to
       * be dropped onto this row.
       */

      item.ondragover =
        event => {

          if (
            event.dataTransfer.types.includes(
              "text/tab-parking-index"
            )
          ) {

            event.preventDefault();

          }

        };


      item.ondrop =
        event => {

          const from =
            Number(
              event.dataTransfer.getData(
                "text/tab-parking-index"
              )
            );


          if (
            Number.isNaN(from) ||
            from === index
          ) {

            return;

          }


          event.preventDefault();

          event.stopPropagation();


          const [moved] =
            sites.splice(
              from,
              1
            );


          const destination =
            from < index
              ? index - 1
              : index;


          sites.splice(
            destination,
            0,
            moved
          );


          save();

          render();

        };


      list.appendChild(
        item
      );

    });

  }


  /*
   * Dragging an external URL
   * into the list.
   */

  list.ondragover =
    event => {

      if (
        !event.dataTransfer.types.includes(
          "text/tab-parking-index"
        )
      ) {

        event.preventDefault();

      }

    };


  list.ondrop =
    event => {

      if (
        event.dataTransfer.types.includes(
          "text/tab-parking-index"
        )
      ) {

        return;

      }


      event.preventDefault();


      let url =
        event.dataTransfer.getData(
          "text/uri-list"
        );


      if (!url) {

        url =
          event.dataTransfer.getData(
            "text/plain"
          );

      }


      if (!url) {
        return;
      }


      url =
        url
          .split("\n")
          .find(
            line =>
              !line.startsWith("#")
          ) || "";


      url =
        normaliseUrl(url);


      try {

        new URL(url);

      } catch {

        return;

      }


      if (
        sites.some(
          site =>
            getUrl(site) === url
        )
      ) {

        return;

      }


      sites.push(url);

      save();

      render();

    };


  /*
   * Close action buttons when
   * clicking elsewhere.
   */

  document.addEventListener(
    "click",
    event => {

      if (
        !list.contains(
          event.target
        )
      ) {

        list
          .querySelectorAll(
            ".delete-open"
          )
          .forEach(item => {

            item.classList.remove(
              "delete-open"
            );

          });

      }

    }
  );


  render();

}