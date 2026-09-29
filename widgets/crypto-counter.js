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
        price: Number(priceData.price_usd)
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


    const wrapper =
      document.createElement("div");


    wrapper.style.cssText = `
      width:100%;
      height:100%;

      display:flex;

      align-items:center;
      justify-content:center;

      box-sizing:border-box;

      overflow:hidden;
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
      coinData.map(coin => `

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

              overflow:hidden;
              text-overflow:ellipsis;
            ">
              ${escapeHtml(coin.name)}
            </span>

            <span style="
              font-size:10px;
              opacity:0.5;
            ">
              ${escapeHtml(coin.symbol)}
            </span>

          </div>


          <div style="
            font-size:13px;
            font-weight:600;

            opacity:0.85;

            flex-shrink:0;
          ">
            $${formatPrice(coin.price)}
          </div>

        </div>

      `).join("");


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


    box.style.overflow = "hidden";


    const wrapper =
      document.createElement("div");


    wrapper.style.cssText = `
      width:100%;
      height:100%;

      display:flex;

      align-items:center;
      justify-content:center;

      overflow:hidden;
    `;


    box.appendChild(wrapper);


    const content =
      document.createElement("div");


    content.style.cssText = `
      display:flex;

      flex-direction:column;

      align-items:center;
      justify-content:center;

      gap:5px;

      text-align:center;

      white-space:nowrap;

      transform-origin:center;

      line-height:1;
    `;


    wrapper.appendChild(content);


    // ----------------------------------------
    // Content
    // ----------------------------------------

    content.innerHTML = `

      <div
        class="crypto-name"
        style="
          font-size:13px;
          font-weight:600;
          opacity:0.6;
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


      <div
        class="crypto-symbol"
        style="
          font-size:10px;
          opacity:0.45;
        "
      >
        ${escapeHtml(coin.symbol)}
      </div>

    `;


    // ----------------------------------------
    // Responsive sizing
    // ----------------------------------------

    const resizeObserver =
      new ResizeObserver(() => {

        const width =
          wrapper.clientWidth;

        const height =
          wrapper.clientHeight;


        if (!width || !height)
          return;


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


    cleanups.push(() => {

      resizeObserver.disconnect();

    });

  }


  // ==========================================
  // Helpers
  // ==========================================

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


    // Small cryptocurrencies can have prices
    // far below $0.01.

    return price.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8
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