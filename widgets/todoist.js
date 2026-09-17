import { createWidget, is24Hour } from "../widgetCore.js";


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

    if (line.startsWith("DESCRIPTION:")) {
      const match = line.match(/https:\/\/app\.todoist\.com\/app\/task\/[^\s\\]+/);

      if (match) {
        current.url = match[0];
      }
    }

    if (line.startsWith("DTSTART")) {
      const value = line.split(":")[1];

      current.rawDate = value;
      current.hasTime = value.includes("T");

      if (current.hasTime) {
        current.date = new Date(
          value.slice(0, 4) + "-" +
          value.slice(4, 6) + "-" +
          value.slice(6, 8) + "T" +
          value.slice(9, 11) + ":" +
          value.slice(11, 13) + ":" +
          value.slice(13, 15) + "Z"
        );
      } else {
        current.date = new Date(
          Number(value.slice(0, 4)),
          Number(value.slice(4, 6)) - 1,
          Number(value.slice(6, 8))
        );
      }
    }

    if (line.startsWith("RRULE")) {
      current.recurring = true;
    }

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
        !current.recurring
      ) {
        tasks.push(current);
      }

      current = null;
    }
  }

  return tasks;
}


export async function init(todoist) {

  if (!todoist || !todoist.icsUrl)
    return;


  const box = createWidget(
    "todoist-widget",
    "Todoist Tasks"
  );


  box.innerHTML = `
    <div style="opacity:0.6;">
      Loading...
    </div>
  `;

  const refreshInterval = 15000;
  const inactiveAfter = 120000;
  let inactive = false;
  let inactiveTimer;


  async function refresh() {

    if (inactive)
      return;

    try {

      const res = await fetch(todoist.icsUrl, {
        cache: "no-store"
      });

      const text = await res.text();

      const tasks = parseICS(text);

      const today = new Date();

      const endOfToday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1
      );

      const seen = new Set();

      const uniqueTasks = tasks.filter(t => {

        const key =
          (t.title || "").trim().toLowerCase()
          + "|" +
          t.date.getTime();

        if (seen.has(key))
          return false;

        seen.add(key);
        return true;

      });

      const todaysTasks = uniqueTasks.filter(t => {

        if (!t.date)
          return false;

        return t.date < endOfToday;

      });

      todaysTasks.sort((a, b) => {

        const aTimed = a.hasTime;
        const bTimed = b.hasTime;

        if (aTimed !== bTimed)
          return aTimed ? -1 : 1;

        return a.date - b.date;

      });

      box.innerHTML = todaysTasks.length
        ? todaysTasks.map(t => {

          let prefix = "◯  ";

          if (t.hasTime) {

            prefix =
              " ◯ " +
              t.date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: is24Hour ? false : true
              })
              +
              " - ";

          }

          return `
          <div style="
            padding:6px 0;
            border-bottom:1px solid rgba(255,255,255,0.08);
          ">
            <a href="${t.url || '#'}"
               style="
                color:inherit;
                text-decoration:none;
                display:block;
               ">
              ${prefix}${t.title}
            </a>
          </div>
        `;

        }).join("")
        : `
          <div style="
            display:flex;
            align-items:center;
            justify-content:center;
            min-height:100%;
            box-sizing:border-box;
            opacity:0.6;
            text-align:center;
          ">
            No more tasks for today!
          </div>
        `;

    } catch (err) {

      box.innerHTML = `
      <div style="opacity:0.6;">
        Failed to load tasks
      </div>
    `;

    }

  }


  await refresh();
  setInterval(refresh, refreshInterval);

  window.addEventListener("blur", () => {
    clearTimeout(inactiveTimer);
    inactiveTimer = setTimeout(() => {
      inactive = true;
    }, inactiveAfter);
  });

  window.addEventListener("focus", () => {
    clearTimeout(inactiveTimer);

    if (inactive) {
      inactive = false;
      refresh();
    }
  });


}
