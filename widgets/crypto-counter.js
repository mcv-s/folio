import { createWidget } from "../widgetCore.js";

export async function init(cryptoCounter) {

  if (!cryptoCounter?.trackedCryptos)
    return;


  // ==========================================
  // Parse tracked cryptocurrencies
  // ==========================================

  const cryptos = cryptoCounter.trackedCryptos
    .split("\n")
    .map(coin => coin.trim().toLowerCase())
    .filter(Boolean);


  if (cryptos.length === 0)
    return;


  // ==========================================
  // Fetch CoinLore asset list
  // ==========================================

  let assets;

  try {

    const response = await fetch(
      "https://api.coinlore.net/api/assets/"
    );

    if (!response.ok) {

      throw new Error(
        `CoinLore returned ${response.status}`
      );

    }

    const data = await response.json();

    assets = data.data;

  } catch (error) {

    console.error(
      "Failed to fetch cryptocurrency list:",
      error
    );

    return;
  }


  if (!Array.isArray(assets))
    return;


  // ==========================================
  // Build lookup
  // ==========================================

  const assetMap = new Map(
    assets.map(asset => [
      asset.nameid.toLowerCase(),
      asset
    ])
  );


  // ==========================================
  // Find requested assets
  // ==========================================

  const selectedAssets = cryptos
    .map(coin => assetMap.get(coin))
    .filter(Boolean);


  if (selectedAssets.length === 0)
    return;


  const ids = selectedAssets
    .map(asset => asset.id)
    .join(",");


  // ==========================================
  // Fetch prices
  // ==========================================

  let prices;

  try {

    const response = await fetch(
      `https://api.coinlore.net/api/ticker/?id=${ids}`
    );

    if (!response.ok) {

      throw new Error(
        `CoinLore returned ${response.status}`
      );

    }

    prices = await response.json();

  } catch (error) {

    console.error(
      "Failed to fetch cryptocurrency prices:",
      error
    );

    return;
  }


  if (!Array.isArray(prices))
    return;


  const priceMap = new Map(
    prices.map(price => [
      String(price.id),
      price
    ])
  );


  // ==========================================
  // Prepare coin data
  // ==========================================

  const coinData = selectedAssets
    .map(asset => {

      const priceData =
        priceMap.get(String(asset.id));

      if (!priceData)
        return null;


      return {
        name: asset.name,
        symbol: asset.symbol,
        id: asset.id,
        price: Number(priceData.price_usd),
        percentChange24h: Number(priceData.percent_change_24h)
      };

    })
    .filter(Boolean);


  if (coinData.length === 0)
    return;


  // ==========================================
  // LIST DISPLAY
  // ==========================================

  if (cryptoCounter.listDisplay === true) {

    const box = createWidget(
      "crypto-counter",
      "Cryptocurrency Prices"
    );


    box.style.overflow = "hidden";
    box.closest(".widget").style.overflow = "hidden";
    const hoverDetailsCleanup = bindHoverDetails(box);


    const wrapper =
      document.createElement("div");


    wrapper.style.cssText = `
      width:100%;
      height:100%;

      display:flex;

      align-items:center;
      justify-content:center;

      box-sizing:border-box;

      overflow:visible;
    `;


    box.appendChild(wrapper);


    const content =
      document.createElement("div");


    content.style.cssText = `
      width:100%;

      display:flex;
      flex-direction:column;

      justify-content:center;

      box-sizing:border-box;

      padding:8px 12px;

      transform-origin:center;

      line-height:1;
    `;


    wrapper.appendChild(content);


    // ----------------------------------------
    // Render list
    // ----------------------------------------

    content.innerHTML =
      coinData.map(coin => {

        const changeMarkup =
          renderChangeMarkup(coin);


        return `

        <div style="
          display:flex;

          align-items:center;
          justify-content:space-between;

          gap:12px;

          padding:7px 0;

          border-bottom:1px solid
            rgba(255,255,255,0.08);

          white-space:nowrap;
        ">

          <div style="
            display:flex;
            align-items:center;

            gap:7px;

            min-width:0;
          ">

            <span style="
              font-size:13px;
              font-weight:600;

              overflow:visible;
              text-overflow:ellipsis;
            ">
              ${escapeHtml(coin.name)}
            </span>

            <span
              class="crypto-hover-detail"
              data-hover-opacity="0.5"
              style="
                font-size:10px;
                opacity:0;
                transition:opacity .15s ease;
              "
            >
              ${escapeHtml(coin.symbol)}
            </span>

          </div>


          <div style="
            display:flex;
            align-items:center;
            gap:8px;

            font-size:13px;
            font-weight:600;

            flex-shrink:0;
          ">
            ${changeMarkup}
            <span style="opacity:0.85;">
              $${formatPrice(coin.price)}
            </span>
          </div>

        </div>

      `;

      }).join("");


    refreshHoverDetails(box);


    // ----------------------------------------
    // Remove final border
    // ----------------------------------------

    const rows =
      content.children;

    if (rows.length) {

      rows[rows.length - 1].style.borderBottom =
        "none";

    }


    // ----------------------------------------
    // Responsive scaling
    // ----------------------------------------

    const resizeObserver =
      new ResizeObserver(() => {

        const width =
          wrapper.clientWidth;

        const height =
          wrapper.clientHeight;


        if (!width || !height)
          return;


        const naturalHeight =
          content.scrollHeight;


        let scale = 1;


        if (naturalHeight > height - 4) {

          scale =
            (height - 4) / naturalHeight;

        }


        if (width < content.scrollWidth) {

          scale = Math.min(
            scale,
            (width - 4) / content.scrollWidth
          );

        }


        scale =
          Math.max(0.5, Math.min(1, scale));


        content.style.transform =
          `scale(${scale})`;

      });


    resizeObserver.observe(wrapper);


    return () => {

      resizeObserver.disconnect();
      hoverDetailsCleanup();

    };

  }


  // ==========================================
  // INDIVIDUAL WIDGETS
  // ==========================================

  const cleanups = [];


  for (const coin of coinData) {

    const box = createWidget(
      `crypto-${coin.id}`,
      coin.name
    );


    box.style.overflow = "visible";
    box.closest(".widget").style.overflow = "visible";
    const hoverDetailsCleanup = bindHoverDetails(box);


    // ----------------------------------------
    // Persistent view state
    // ----------------------------------------

    const storageKey =
      `crypto-widget-view-${coin.id}`;


    let showingGraph =
      localStorage.getItem(storageKey) === "graph";


    let graphLoaded = false;
    let graphLoading = false;
    let graphData = null;


    // ----------------------------------------
    // Graph toggle button
    // ----------------------------------------

    const graphButton =
      document.createElement("button");


    graphButton.type = "button";


    graphButton.title =
      showingGraph
        ? "Show current price"
        : "Show price graph";


    graphButton.innerHTML =
      showingGraph
        ? `<i class="ph ph-currency-dollar"></i>`
        : `<i class="ph ph-chart-line"></i>`;


    graphButton.style.cssText = `
      position:absolute;

      right:4px;
      top:4px;

      width:28px;
      height:28px;

      padding:0;

      display:flex;

      align-items:center;
      justify-content:center;

      border:none;
      border-radius:7px;

      background:transparent;

      color:inherit;

      font-size:17px;

      opacity:0;

      cursor:pointer;

      transition:
        opacity .15s ease,
        background .15s ease,

      z-index:20;
    `;


    box.appendChild(graphButton);


    box.addEventListener(
      "mouseenter",
      () => {

        graphButton.style.opacity = "0.6";

      }
    );


    box.addEventListener(
      "mouseleave",
      () => {

        graphButton.style.opacity = "0";

      }
    );


    graphButton.addEventListener(
      "mouseenter",
      () => {

        graphButton.style.opacity = "0.9";

        graphButton.style.background =
          "rgba(127,127,127,0.12)";

      }
    );


    graphButton.addEventListener(
      "mouseleave",
      () => {

        graphButton.style.opacity = "0.6";

        graphButton.style.background =
          "transparent";

      }
    );


    // ----------------------------------------
    // Responsive wrapper
    // ----------------------------------------

    const wrapper =
      document.createElement("div");


    wrapper.style.cssText = `
      width:100%;
      height:100%;

      display:flex;

      align-items:center;
      justify-content:center;

      overflow:visible;

      box-sizing:border-box;

      min-width:0;
      min-height:0;
    `;


    box.appendChild(wrapper);


    // ----------------------------------------
    // Content
    // ----------------------------------------

    const content =
      document.createElement("div");


    content.style.cssText = `
      display:flex;

      flex-direction:column;

      align-items:center;
      justify-content:center;

      text-align:center;

      white-space:nowrap;

      transform-origin:center;

      line-height:1;

      opacity:1;

      min-width:0;
      min-height:0;

      transition:
        opacity .18s ease,
    `;


    wrapper.appendChild(content);


    // ----------------------------------------
    // Graph elements
    // ----------------------------------------

    let graphContainer = null;
    let graphSvg = null;
    let graphLine = null;
    let graphHoverLine = null;
    let graphHoverPoint = null;
    let graphTooltip = null;


    // ========================================
    // Render current price
    // ========================================

    function renderPrice() {

      graphContainer = null;
      graphSvg = null;
      graphLine = null;
      graphHoverLine = null;
      graphHoverPoint = null;
      graphTooltip = null;


      // Return content to normal intrinsic sizing.
      content.style.width = "";
      content.style.height = "";
      content.style.flex = "";
      content.style.transform = "";


      content.innerHTML = `

        <div
          class="crypto-name"
          data-hover-opacity="0.6"
          style="
            font-size:13px;
            font-weight:600;
            opacity:0;
            transition:opacity .15s ease;
          "
        >
          ${escapeHtml(coin.name)}
        </div>


        <div
          class="crypto-price"
          style="
            font-size:42px;
            font-weight:700;
            opacity:0.85;
          "
        >
          $${formatPrice(coin.price)}
        </div>


        ${renderChangeMarkup(coin)}


        <div
          class="crypto-symbol"
          style="
            font-size:10px;
          "
        >
          <span
            class="crypto-hover-detail"
            data-hover-opacity="0.45"
            style="opacity:0;transition:opacity .15s ease;"
          >
            ${escapeHtml(coin.symbol)}
          </span>
        </div>

      `;

      refreshHoverDetails(box);

    }


    // ========================================
    // Load graph data
    // ========================================

    async function loadGraph() {

      if (graphLoaded)
        return true;


      if (graphLoading) {

        while (graphLoading) {

          await new Promise(resolve =>
            setTimeout(resolve, 25)
          );

        }

        return graphLoaded;

      }


      graphLoading = true;


      try {

        const response = await fetch(
          `https://api.coinlore.net/api/coin/ohlcv/?coin=${coin.id}`
        );


        if (!response.ok) {

          throw new Error(
            `CoinLore returned ${response.status}`
          );

        }


        const data =
          await response.json();


        if (!data || typeof data !== "object")
          throw new Error("Invalid OHLCV data");


        graphData =
          Object.values(data)
            .map(row => ({

              timestamp: Number(row[0]),
              open: Number(row[1]),
              high: Number(row[2]),
              low: Number(row[3]),
              close: Number(row[4])

            }))
            .filter(row =>
              Number.isFinite(row.close)
            )
            .sort(
              (a, b) =>
                a.timestamp - b.timestamp
            );


        graphLoaded =
          graphData.length > 0;


        return graphLoaded;


      } catch (error) {

        console.error(
          `Failed to fetch ${coin.name} price history:`,
          error
        );


        graphData = null;

        return false;


      } finally {

        graphLoading = false;

      }

    }


    // ========================================
    // Create graph
    // ========================================

    function renderGraph() {

      content.innerHTML = "";


      // IMPORTANT:
      // The graph view itself now occupies the entire
      // widget instead of being intrinsically sized.

      content.style.width = "100%";
      content.style.height = "100%";
      content.style.flex = "1 1 auto";
      content.style.minWidth = "0";
      content.style.minHeight = "0";
      content.style.transform = "none";


      const graphWrapper =
        document.createElement("div");


      graphWrapper.style.cssText = `
        position:relative;

        display:flex;

        flex-direction:column;

        align-items:stretch;
        justify-content:stretch;

        gap:5px;

        width:100%;
        height:100%;

        min-width:0;
        min-height:0;

        box-sizing:border-box;
      `;


      content.appendChild(graphWrapper);


      // --------------------------------------
      // Graph header
      // --------------------------------------

      const header =
        document.createElement("div");

      header.className = "topdata"
      header.dataset.hoverOpacity = "0.6";


      header.style.cssText = `
        display:flex;

        align-items:center;
        justify-content:center;

        gap:7px;

        font-size:11px;
        font-weight:600;

        opacity:0;
        transition:opacity .15s ease;

        flex-shrink:0;
      `;


      header.innerHTML = `
        ${escapeHtml(coin.name)}

        <span
          class="crypto-hover-detail"
          data-hover-opacity="0.7"
          style="font-size:9px;opacity:0;transition:opacity .15s ease;"
        >
          ${escapeHtml(coin.symbol)}
        </span>
      `;


      graphWrapper.appendChild(header);


      // --------------------------------------
      // Graph area
      // --------------------------------------

      const graphArea =
        document.createElement("div");


      graphArea.style.cssText = `
        position:relative;

        display:flex;

        align-items:stretch;
        justify-content:stretch;

        flex:1 1 auto;

        min-width:0;
        min-height:0;

        width:100%;
        height:auto;

        box-sizing:border-box;
      `;


      graphWrapper.appendChild(graphArea);


      // --------------------------------------
      // SVG
      // --------------------------------------

      graphSvg =
        document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg"
        );


      graphSvg.style.cssText = `
        display:block;

        width:100%;
        height:100%;

        flex:1 1 auto;

        min-width:0;
        min-height:0;

        overflow:visible;

        cursor:crosshair;
      `;


      graphSvg.setAttribute(
        "preserveAspectRatio",
        "none"
      );


      graphArea.appendChild(graphSvg);


      // --------------------------------------
      // Main graph line
      // --------------------------------------

      graphLine =
        document.createElementNS(
          "http://www.w3.org/2000/svg",
          "polyline"
        );


      graphLine.setAttribute(
        "fill",
        "none"
      );


      graphLine.setAttribute(
        "stroke",
        "currentColor"
      );


      graphLine.setAttribute(
        "stroke-width",
        "2"
      );


      graphLine.setAttribute(
        "stroke-linecap",
        "round"
      );


      graphLine.setAttribute(
        "stroke-linejoin",
        "round"
      );


      graphLine.setAttribute(
        "vector-effect",
        "non-scaling-stroke"
      );


      graphLine.setAttribute(
        "opacity",
        "0.8"
      );


      graphSvg.appendChild(graphLine);


      // --------------------------------------
      // Hover vertical line
      // --------------------------------------

      graphHoverLine =
        document.createElementNS(
          "http://www.w3.org/2000/svg",
          "line"
        );


      graphHoverLine.setAttribute(
        "stroke",
        "currentColor"
      );


      graphHoverLine.setAttribute(
        "stroke-width",
        "1"
      );


      graphHoverLine.setAttribute(
        "stroke-dasharray",
        "3 3"
      );


      graphHoverLine.setAttribute(
        "opacity",
        "0"
      );


      graphSvg.appendChild(graphHoverLine);


      // --------------------------------------
      // Hover point
      // --------------------------------------

      graphHoverPoint =
        document.createElementNS(
          "http://www.w3.org/2000/svg",
          "circle"
        );


      graphHoverPoint.setAttribute(
        "r",
        "4"
      );


      graphHoverPoint.setAttribute(
        "fill",
        "currentColor"
      );


      graphHoverPoint.setAttribute(
        "stroke",
        "currentColor"
      );


      graphHoverPoint.setAttribute(
        "stroke-width",
        "2"
      );


      graphHoverPoint.setAttribute(
        "opacity",
        "0"
      );


      graphSvg.appendChild(graphHoverPoint);


      // --------------------------------------
      // Tooltip
      // --------------------------------------

      graphTooltip =
        document.createElement("div");


      graphTooltip.style.cssText = `
        position:absolute;

        pointer-events:none;

        padding:6px 8px;

        border-radius:7px;

        background:var(--card, rgba(20,20,20,0.9));

        border:1px solid
          var(--border, rgba(255,255,255,0.1));

        color:var(--text, #fff);

        box-shadow:
          0 4px 14px rgba(0,0,0,0.25);

        font-size:10px;

        line-height:1.3;

        white-space:nowrap;

        opacity:0;

        transform:
          translate(-50%, -100%)
          translateY(-8px);

        transition:
          opacity .1s ease;

        z-index:30;
      `;


      graphArea.appendChild(graphTooltip);


      // --------------------------------------
      // Change text
      // --------------------------------------

      const changeText =
        document.createElement("div");


      changeText.style.cssText = `
        font-size:10px;

        opacity:0;
        transition:opacity .15s ease;

        flex-shrink:0;
      `;

      changeText.classList.add(
        "crypto-hover-detail"
      );

      changeText.dataset.hoverOpacity = "0.5";


      graphWrapper.appendChild(changeText);

      refreshHoverDetails(box);


      graphContainer = {
        wrapper: graphWrapper,
        graphArea,
        header,
        changeText
      };


      // --------------------------------------
      // Mouse interaction
      // --------------------------------------

      graphSvg.addEventListener(
        "mousemove",
        event => {

          if (!graphData?.length)
            return;


          const rect =
            graphSvg.getBoundingClientRect();


          if (!rect.width)
            return;


          const mouseX =
            event.clientX - rect.left;


          const graphWidth =
            rect.width;


          const graphHeight =
            rect.height;


          const ratio =
            Math.max(
              0,
              Math.min(
                1,
                mouseX / graphWidth
              )
            );


          const index =
            Math.round(
              ratio *
              (graphData.length - 1)
            );


          const point =
            graphData[index];


          if (!point)
            return;


          const graphPadding = 4;


          const x =
            graphPadding +
            (
              index /
              Math.max(
                1,
                graphData.length - 1
              )
            ) *
            (
              graphWidth -
              graphPadding * 2
            );


          const values =
            graphData.map(
              item => item.close
            );


          const min =
            Math.min(...values);


          const max =
            Math.max(...values);


          const range =
            max - min || 1;


          const y =
            graphHeight -
            graphPadding -
            (
              (
                point.close - min
              ) / range
            ) *
            (
              graphHeight -
              graphPadding * 2
            );


          graphHoverLine.setAttribute(
            "x1",
            String(x)
          );


          graphHoverLine.setAttribute(
            "x2",
            String(x)
          );


          graphHoverLine.setAttribute(
            "y1",
            "0"
          );


          graphHoverLine.setAttribute(
            "y2",
            String(graphHeight)
          );


          graphHoverLine.setAttribute(
            "opacity",
            "0.25"
          );


          graphHoverPoint.setAttribute(
            "cx",
            String(x)
          );


          graphHoverPoint.setAttribute(
            "cy",
            String(y)
          );


          graphHoverPoint.setAttribute(
            "opacity",
            "1"
          );


          // ----------------------------------
          // Tooltip content
          // ----------------------------------

          const date =
            new Date(
              point.timestamp * 1000
            );


          const dateText =
            date.toLocaleDateString(
              "en-US",
              {
                month: "short",
                day: "numeric",
                year: "numeric"
              }
            );


          graphTooltip.innerHTML = `

            <div style="
              font-weight:600;
              margin-bottom:2px;
            ">
              ${dateText}
            </div>

            <div style="
              opacity:0.75;
            ">
              $${formatPrice(point.close)}
            </div>

          `;


          // ----------------------------------
          // Position tooltip
          // ----------------------------------

          graphTooltip.style.left =
            `${x}px`;


          graphTooltip.style.top =
            `${Math.max(4, y)}px`;


          graphTooltip.style.opacity =
            "1";

        }
      );


      graphSvg.addEventListener(
        "mouseleave",
        () => {

          if (graphHoverLine)
            graphHoverLine.setAttribute(
              "opacity",
              "0"
            );


          if (graphHoverPoint)
            graphHoverPoint.setAttribute(
              "opacity",
              "0"
            );


          if (graphTooltip)
            graphTooltip.style.opacity =
              "0";

        }
      );


      updateGraphSize();

    }


    // ========================================
    // Update ACTUAL graph dimensions
    // ========================================

    function updateGraphSize() {

      if (
        !showingGraph ||
        !graphSvg ||
        !graphContainer
      )
        return;


      const graphArea =
        graphContainer.graphArea;


      const availableWidth =
        graphArea.clientWidth;


      const availableHeight =
        graphArea.clientHeight;


      if (
        availableWidth <= 0 ||
        availableHeight <= 0
      )
        return;


      /*
       * The SVG gets the REAL physical dimensions of
       * the available widget area.
       *
       * There is deliberately NO transform scaling here.
       */

      const graphWidth =
        Math.floor(availableWidth);


      const graphHeight =
        Math.floor(availableHeight);


      graphSvg.style.width =
        `${graphWidth}px`;


      graphSvg.style.height =
        `${graphHeight}px`;


      graphSvg.setAttribute(
        "width",
        String(graphWidth)
      );


      graphSvg.setAttribute(
        "height",
        String(graphHeight)
      );


      graphSvg.setAttribute(
        "viewBox",
        `0 0 ${graphWidth} ${graphHeight}`
      );


      if (!graphData?.length)
        return;


      const padding = 4;


      const values =
        graphData.map(
          point => point.close
        );


      const min =
        Math.min(...values);


      const max =
        Math.max(...values);


      const range =
        max - min || 1;


      const points =
        graphData.map(
          (point, index) => {

            const x =
              padding +
              (
                index /
                Math.max(
                  1,
                  graphData.length - 1
                )
              ) *
              (
                graphWidth -
                padding * 2
              );


            const y =
              graphHeight -
              padding -
              (
                (
                  point.close -
                  min
                ) / range
              ) *
              (
                graphHeight -
                padding * 2
              );


            return `${x},${y}`;

          }
        ).join(" ");


      graphLine.setAttribute(
        "points",
        points
      );


      // --------------------------------------
      // Percentage change
      // --------------------------------------

      const first =
        graphData[0];


      const last =
        graphData[graphData.length - 1];


      const change =
        (
          (
            last.close -
            first.close
          ) /
          first.close
        ) * 100;


      const changeText =
        `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;


      graphContainer.changeText.textContent =
        `365 days · ${changeText}`;

    }


    // ========================================
    // Loading state
    // ========================================

    function renderGraphLoading() {

      content.style.width = "";
      content.style.height = "";
      content.style.flex = "";
      content.style.transform = "";


      content.innerHTML = `

        <div style="
          font-size:11px;
          opacity:0.5;
        ">
          Loading graph...
        </div>

      `;

    }


    // ========================================
    // Error state
    // ========================================

    function renderGraphError() {

      content.style.width = "";
      content.style.height = "";
      content.style.flex = "";
      content.style.transform = "";


      content.innerHTML = `

        <div style="
          font-size:11px;
          opacity:0.5;
          text-align:center;
        ">
          No graph data
        </div>

      `;

    }


    // ========================================
    // Responsive sizing
    // ========================================

    const resizeObserver =
      new ResizeObserver(() => {

        const width =
          wrapper.clientWidth;

        const height =
          wrapper.clientHeight;


        if (!width || !height)
          return;


        if (showingGraph) {

          /*
           * Graphs use their REAL dimensions.
           * Do not scale the graph with transform.
           */
          content.style.width = "100%";
          content.style.height = "100%";
          content.style.flex = "1 1 auto";
          content.style.transform = "none";

          updateGraphSize();

          return;

        }


        // --------------------------------------
        // Price view keeps its old scaling system
        // --------------------------------------

        const baseWidth = 180;
        const baseHeight = 120;


        let scale =
          Math.min(
            width / baseWidth,
            height / baseHeight
          ) * 0.75;


        scale =
          Math.max(
            0.5,
            Math.min(1.5, scale)
          );


        content.style.transform =
          `scale(${scale})`;

      });


    resizeObserver.observe(wrapper);


    // ========================================
    // Animated view switching
    // ========================================

    async function switchView(showGraph) {

      if (showGraph === showingGraph)
        return;


      showingGraph = showGraph;


      // --------------------------------------
      // Persist state
      // --------------------------------------

      localStorage.setItem(
        storageKey,
        showGraph
          ? "graph"
          : "price"
      );


      // --------------------------------------
      // Animate out
      // --------------------------------------

      content.style.opacity = "0";

      content.style.transform =
        "scale(0.94)";


      await new Promise(resolve =>
        setTimeout(resolve, 170)
      );


      // --------------------------------------
      // Render new view
      // --------------------------------------

      if (showGraph) {

        renderGraphLoading();


        graphButton.title =
          "Show current price";


        graphButton.innerHTML =
          `<i class="ph ph-currency-dollar"></i>`;


        const loaded =
          await loadGraph();


        if (loaded) {

          renderGraph();

        } else {

          renderGraphError();

        }

      } else {

        renderPrice();


        graphButton.title =
          "Show price graph";


        graphButton.innerHTML =
          `<i class="ph ph-chart-line"></i>`;

      }


      // --------------------------------------
      // Animate in
      // --------------------------------------

      if (showGraph) {

        content.style.width = "100%";
        content.style.height = "100%";
        content.style.flex = "1 1 auto";

      }


      content.style.transform =
        "scale(0.94)";


      requestAnimationFrame(() => {

        content.style.opacity = "1";

        if (showingGraph) {

          content.style.transform =
            "none";

        } else {

          content.style.transform =
            "scale(1)";

        }

      });


      if (showGraph) {

        requestAnimationFrame(() => {

          updateGraphSize();

        });

      }

    }


    // ========================================
    // Toggle button
    // ========================================

    graphButton.addEventListener(
      "click",
      async event => {

        event.stopPropagation();

        await switchView(!showingGraph);

      }
    );


    // ========================================
    // Initial view
    // ========================================

    if (showingGraph) {

      renderGraphLoading();


      loadGraph().then(loaded => {

        if (!showingGraph)
          return;


        if (loaded) {

          renderGraph();

        } else {

          renderGraphError();

        }


        requestAnimationFrame(() => {

          updateGraphSize();

        });

      });

    } else {

      renderPrice();

    }


    // ========================================
    // Initial responsive calculation
    // ========================================

    requestAnimationFrame(() => {

      const width =
        wrapper.clientWidth;


      const height =
        wrapper.clientHeight;


      if (!width || !height)
        return;


      if (showingGraph) {

        updateGraphSize();

      } else {

        const baseWidth = 180;
        const baseHeight = 120;


        let scale =
          Math.min(
            width / baseWidth,
            height / baseHeight
          ) * 0.75;


        scale =
          Math.max(
            0.5,
            Math.min(1.5, scale)
          );


        content.style.transform =
          `scale(${scale})`;

      }

    });


    // ========================================
    // Cleanup
    // ========================================

    cleanups.push(() => {

      resizeObserver.disconnect();
      hoverDetailsCleanup();

    });

  }


  // ==========================================
  // Helpers
  // ==========================================

  function getValueChange(coin) {

    const percentChange =
      coin.percentChange24h;

    const previousPrice =
      coin.price / (1 + percentChange / 100);

    const change =
      coin.price - previousPrice;

    if (
      !Number.isFinite(change) ||
      !Number.isFinite(percentChange) ||
      percentChange <= -100 ||
      change === 0
    )
      return null;


    return change;

  }


  function renderChangeMarkup(coin) {

    const change =
      getValueChange(coin);

    if (change === null)
      return "";


    const isLightMode =
      window.matchMedia(
        "(prefers-color-scheme: light)"
      ).matches;

    const color =
      change > 0
        ? isLightMode ? "#287a45" : "#a8d5b2"
        : isLightMode ? "#b44f58" : "#e3a0a0";


    return `
      <span
        class="crypto-change crypto-hover-detail"
        data-hover-opacity="1"
        style="
          color:${color};
          font-size:10px;
          font-weight:600;
          opacity:0;
          transition:opacity .15s ease;
          white-space:nowrap;
        "
      >
        ${change > 0 ? "+" : "-"}${formatChange(change)}
      </span>
    `;

  }


  function bindHoverDetails(widgetContent) {

    const widget =
      widgetContent.closest(".widget");

    const showDetails = () =>
      refreshHoverDetails(widgetContent, true);

    const hideDetails = () =>
      refreshHoverDetails(widgetContent, false);


    widget.addEventListener(
      "mouseenter",
      showDetails
    );

    widget.addEventListener(
      "mouseleave",
      hideDetails
    );


    refreshHoverDetails(
      widgetContent,
      widget.matches(":hover")
    );


    return () => {

      widget.removeEventListener(
        "mouseenter",
        showDetails
      );

      widget.removeEventListener(
        "mouseleave",
        hideDetails
      );

    };

  }


  function refreshHoverDetails(widgetContent, visible) {

    const isVisible =
      visible ??
      widgetContent.closest(".widget").matches(":hover");


    widgetContent
      .querySelectorAll(
        ".topdata, .crypto-hover-detail, .crypto-name"
      )
      .forEach(detail => {

        detail.style.opacity =
          isVisible
            ? detail.dataset.hoverOpacity || "1"
            : "0";

      });

  }

  function formatPrice(price) {

    if (!Number.isFinite(price))
      return "—";


    if (price >= 1) {

      return price.toLocaleString(
        "en-US",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      );

    }


    return price.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8
      }
    );

  }


  function formatChange(change) {

    const absoluteChange =
      Math.abs(change);

    return absoluteChange.toLocaleString(
      "en-US",
      {
        maximumFractionDigits:
          absoluteChange < 1 ? 8 : 2
      }
    );

  }


  function escapeHtml(value) {

    const div =
      document.createElement("div");

    div.textContent = value;

    return div.innerHTML;

  }


  // ==========================================
  // Cleanup
  // ==========================================

  return () => {

    for (const cleanup of cleanups)
      cleanup();

  };

}