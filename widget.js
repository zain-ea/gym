// Gym — home screen widget for Scriptable (free on the App Store).
//
// iOS will not let a web app draw a home screen widget, at any price. This is the
// bridge: the app exports a small JSON summary, you drop it in iCloud Drive, and
// this script renders it. Read-only — it never writes back.
//
// SETUP
//   1. Install Scriptable.
//   2. In the Gym app: Settings → Backup → "Save widget file". Save
//      gym-widget.json into iCloud Drive → Scriptable.
//   3. In Scriptable, tap + and paste this whole file in. Name it "Gym".
//   4. Long-press the home screen → + → Scriptable → Small or Medium widget.
//   5. Edit the widget: Script = Gym, "When Interacting" = Run Script.
//   6. Re-run step 2 whenever you want the numbers refreshed. The widget shows
//      how stale the file is, so you can never be misled by an old one.

const APP_URL = "https://zain-ea.github.io/gym/";
const FILE = "gym-widget.json";

const PIT = new Color("#0F1216");
const CHALK = new Color("#EEF1F5");
const STEEL = new Color("#8B95A3");
const AMP = new Color("#FF9F1C");

function readData() {
  try {
    const fm = FileManager.iCloud();
    const path = fm.joinPath(fm.documentsDirectory(), FILE);
    if (!fm.fileExists(path)) return null;
    if (!fm.isFileDownloaded(path)) fm.downloadFileFromiCloud(path);
    return JSON.parse(fm.readString(path));
  } catch (e) {
    return null;
  }
}

function ageLabel(iso) {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day old";
  return days + " days old";
}

function build(data) {
  const w = new ListWidget();
  w.backgroundColor = PIT;
  w.url = APP_URL;
  w.setPadding(14, 14, 14, 14);

  if (!data) {
    const t = w.addText("GYM");
    t.font = Font.semiboldSystemFont(11);
    t.textColor = STEEL;
    w.addSpacer(6);
    const m = w.addText("No data file");
    m.font = Font.boldSystemFont(17);
    m.textColor = CHALK;
    w.addSpacer(4);
    const h = w.addText("Export it from Settings → Backup → Save widget file, into iCloud Drive/Scriptable.");
    h.font = Font.systemFont(11);
    h.textColor = STEEL;
    return w;
  }

  const day = w.addText(new Date().toLocaleDateString("en-AU", { weekday: "long" }).toUpperCase());
  day.font = Font.semiboldSystemFont(10);
  day.textColor = STEEL;

  w.addSpacer(5);

  const title = w.addText(data.today || "Rest");
  title.font = Font.boldSystemFont(data.isRestDay ? 22 : 24);
  title.textColor = data.isRestDay ? CHALK : AMP;
  title.minimumScaleFactor = 0.6;
  title.lineLimit = 1;

  if (data.todaySubtitle && !data.isRestDay) {
    const sub = w.addText(data.todaySubtitle);
    sub.font = Font.systemFont(10);
    sub.textColor = STEEL;
    sub.lineLimit = 1;
  }

  if (data.isRestDay && data.next) {
    const nx = w.addText("Next: " + data.next.routine + " · " + data.next.day.slice(0, 3));
    nx.font = Font.systemFont(11);
    nx.textColor = STEEL;
  }

  w.addSpacer();

  if (data.last) {
    const l = data.last;
    const line = w.addText("LAST · " + l.routine.toUpperCase());
    line.font = Font.semiboldSystemFont(9);
    line.textColor = STEEL;

    w.addSpacer(3);

    const row = w.addStack();
    row.centerAlignContent();

    const sets = row.addText(String(l.sets));
    sets.font = Font.boldSystemFont(17);
    sets.textColor = CHALK;
    const setsU = row.addText(" sets");
    setsU.font = Font.systemFont(10);
    setsU.textColor = STEEL;

    row.addSpacer(8);

    const vol = row.addText(String(l.volume));
    vol.font = Font.boldSystemFont(17);
    vol.textColor = CHALK;
    const volU = row.addText(" " + (l.unit || "kg"));
    volU.font = Font.systemFont(10);
    volU.textColor = STEEL;

    if (l.avgHr) {
      row.addSpacer(8);
      const hr = row.addText("♥" + l.avgHr);
      hr.font = Font.boldSystemFont(15);
      hr.textColor = new Color("#FF6B6B");
    }
  }

  w.addSpacer(4);

  const foot = w.addText(
    (data.weekCount || 0) + " this week · " + ageLabel(data.generated)
  );
  foot.font = Font.systemFont(9);
  foot.textColor = STEEL;

  return w;
}

const widget = build(readData());

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentSmall();
}
Script.complete();
