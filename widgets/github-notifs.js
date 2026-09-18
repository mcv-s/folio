
import { createWidget } from "../widgetCore.js";

export async function init(githubNotifs) {

  if (!githubNotifs || !githubNotifs.apiKey)
    return;


  // ------------------------------------------
  // Fetch GitHub notifications
  // ------------------------------------------

  let data;

  try {

    const response = await fetch(
      "https://api.github.com/notifications",
      {
        headers: {
          "Accept": "application/vnd.github+json",
          "Authorization": `Bearer ${githubNotifs.apiKey}`,
          "X-GitHub-Api-Version": "2022-11-28"
        },
        cache: "no-store"
      }
    );


    if (!response.ok) {

      console.error(
        `GitHub notifications request failed: ${response.status} ${response.statusText}`
      );

      return;
    }


    data = await response.json();

  } catch (error) {

    console.error(
      "Failed to fetch GitHub notifications:",
      error
    );

    return;
  }


  if (!Array.isArray(data))
    return;


  const count = data.length;


  // ------------------------------------------
  // Hide if zero
  // ------------------------------------------

  if (count === 0 && githubNotifs.hideIfZero) {

    console.log(
      `Hiding widget because "hideIfZero" is enabled.`
    );

    return;
  }


  // ------------------------------------------
  // Create widget
  // ------------------------------------------

  const box = createWidget(
    "github-notifs",
    "GitHub Notifications"
  );


  box.style.overflow = "hidden";


  // ------------------------------------------
  // Open GitHub notifications
  // ------------------------------------------

  const githubIcon = document.createElement("a");

  githubIcon.className =
    "github-notification-icon";

  githubIcon.href =
    "https://github.com/notifications";

  githubIcon.target = "_blank";

  githubIcon.rel =
    "noopener noreferrer";

  githubIcon.innerHTML =
    `<i class="ph ph-arrow-square-out"></i>`;

  githubIcon.style.cssText = `
    position:absolute;
    right:7px;
    top:37px;

    font-size:18px;

    color:inherit;
    text-decoration:none;

    opacity:0;

    cursor:pointer;

    transition:opacity .15s ease;
  `;


  box.appendChild(githubIcon);


  box.addEventListener("mouseenter", () => {
    githubIcon.style.opacity = "0.6";
  });


  box.addEventListener("mouseleave", () => {
    githubIcon.style.opacity = "0";
  });


  // ==========================================
  // ARRAY MODE
  // ==========================================

  if (githubNotifs.displayArray) {

    box.innerHTML = "";

    box.appendChild(githubIcon);


    if (!data.length) {

      box.innerHTML += `
        <div style="
          display:flex;
          align-items:center;
          justify-content:center;
          min-height:100%;
          box-sizing:border-box;
          opacity:0.6;
          text-align:center;
        ">
          No GitHub notifications!
        </div>
      `;

    } else {

      box.innerHTML += data.map(notification => {

        const title =
          notification.subject?.title ||
          "GitHub notification";

        const repo =
          notification.repository?.full_name ||
          "";


        let url =
          "https://github.com/notifications";


        // GitHub's subject.url is an API URL.
        // Convert it into the corresponding web URL.

        if (notification.subject?.url) {

          const subjectUrl =
            notification.subject.url;

          const match =
            subjectUrl.match(
              /repos\/([^/]+)\/([^/]+)\/(issues|pulls)\/(\d+)/
            );


          if (match) {

            const owner = match[1];
            const repository = match[2];
            const type = match[3];
            const number = match[4];


            url =
              `https://github.com/${owner}/${repository}/` +
              `${type === "pulls" ? "pull" : "issues"}/${number}`;

          }

        }


        return `
          <div style="
            padding:6px 0;
            border-bottom:1px solid rgba(255,255,255,0.08);
          ">

            <a
              href="${url}"
              target="_blank"
              rel="noopener noreferrer"
              style="
                color:inherit;
                text-decoration:none;
                display:block;
              "
            >
              ${escapeHtml(title)}
            </a>

            ${
              repo
                ? `
                  <div style="
                    font-size:10px;
                    opacity:0.5;
                    margin-top:3px;
                  ">
                    ${escapeHtml(repo)}
                  </div>
                `
                : ""
            }

          </div>
        `;

      }).join("");

    }


    // ----------------------------------------
    // HTML escaping
    // ----------------------------------------

    function escapeHtml(value) {

      const div =
        document.createElement("div");

      div.textContent = value;

      return div.innerHTML;

    }


    return () => {};

  }


  // ==========================================
  // COUNT MODE
  // ==========================================


  // ------------------------------------------
  // Styles
  // ------------------------------------------

  const style =
    document.createElement("style");


  style.textContent = `

    .github-notification-content {

      display:flex;
      flex-direction:column;

      align-items:center;
      justify-content:center;

      gap:5px;

      transform-origin:center;

      white-space:nowrap;

      box-sizing:border-box;

      padding:6px 10px;

      line-height:1;

    }


    .github-notification-label {

      font-size:12px;
      font-weight:600;

      opacity:0;

      white-space:nowrap;

      pointer-events:none;

      transition:opacity .15s ease;

    }


    .github-notification-number {

      font-size:48px;
      font-weight:700;

      line-height:1;

      opacity:0.8;

    }


    #github-notifs:hover
    .github-notification-label {

      opacity:0.6;

    }


    .github-notification-small {

      gap:4px;

      padding:4px 6px;

    }


    .github-notification-small
    .github-notification-number {

      font-size:36px;

    }


    .github-notification-small
    .github-notification-label {

      font-size:10px;

    }


    .github-notification-wide {

      gap:4px;

    }


    .github-notification-wide
    .github-notification-number {

      font-size:42px;

    }


    .github-notification-tall {

      gap:5px;

    }


    .github-notification-tall
    .github-notification-number {

      font-size:48px;

    }

  `;


  document.head.appendChild(style);


  // ------------------------------------------
  // Responsive wrapper
  // ------------------------------------------

  const scaleWrapper =
    document.createElement("div");


  scaleWrapper.style.cssText = `
    width:100%;
    height:100%;

    display:flex;

    align-items:center;
    justify-content:center;

    overflow:hidden;
  `;


  box.appendChild(scaleWrapper);


  const content =
    document.createElement("div");


  content.className =
    "github-notification-content";


  scaleWrapper.appendChild(content);


  // ------------------------------------------
  // Loading
  // ------------------------------------------

  content.innerHTML = `
    <div style="
      opacity:0.6;
      font-size:12px;
      text-align:center;
    ">
      Loading...
    </div>
  `;


  // ------------------------------------------
  // Responsive scaling
  // ------------------------------------------

  const resizeObserver =
    new ResizeObserver(() => {

      const width =
        scaleWrapper.clientWidth;

      const height =
        scaleWrapper.clientHeight;


      content.classList.remove(
        "github-notification-wide",
        "github-notification-tall",
        "github-notification-small"
      );


      let scale = 1;


      if (width < 160 || height < 80) {

        content.classList.add(
          "github-notification-small"
        );


        scale = Math.min(
          width / 120,
          height / 85
        );

      }


      else if (width > height * 1.5) {

        content.classList.add(
          "github-notification-wide"
        );


        scale = Math.min(
          width / 230,
          height / 60
        );

      }


      else {

        content.classList.add(
          "github-notification-tall"
        );


        scale = Math.min(
          width / 155,
          height / 110
        );

      }


      scale *= 0.90;


      content.style.transform =
        `scale(${Math.max(0.5, scale)})`;

    });


  resizeObserver.observe(scaleWrapper);


  // ------------------------------------------
  // Render
  // ------------------------------------------

  content.innerHTML = `

    <div class="github-notification-label">
      You have
    </div>


    <div class="github-notification-number">
      ${count}
    </div>


    <div class="github-notification-label">
      GitHub notifications
    </div>

  `;


  // ------------------------------------------
  // Cleanup
  // ------------------------------------------

  return () => {

    resizeObserver.disconnect();

    style.remove();

  };

}

