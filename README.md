# Gym

A training log for one person, one phone. Four days a week, two routines,
no accounts, no server, no analytics. It replaces tracking sets in the Notes app,
and its only real competition is a plain text file — so everything here is
measured against "is this faster than typing a line".

Live at **https://zain-ea.github.io/gym/**

---

## What's in the repo

| File | What it is |
|---|---|
| `index.html` | The entire app — HTML, CSS and JS in one file. No build step, no npm, no CDN. |
| `manifest.json` | PWA manifest, so Add to Home Screen gives a real standalone app. |
| `sw.js` | Service worker. Works fully offline. **Bump `CACHE` on every release.** |
| `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | Icons. |
| `widget.js` | Scriptable script for the home screen widget. Optional. |
| `tools/make-icons.js` | Regenerates the icons. Run-once tool, not a build step. |

Editing `index.html` from a phone is a supported workflow, which is why it's
organised with `/* ---- SECTION ---- */` banners rather than split into modules.

---

## How it works

**Week** — the main screen. Seven days, each carrying a workout pill.

- **Drag** a pill onto another day to move that workout. Dropping it on a day that
  already has one swaps them, so the 4-day count never drifts.
- **Tap** a pill to cycle it: Arms & Back → Chest & Legs → Rest.
- **Tick** (the circle on the right) once you've done that workout — it goes
  straight into History, even if you never logged individual sets.
- **Tap the row** to open that day, with every exercise and what you lifted last
  time. Future days are read-only; past days stay open for backfilling.

**Logging** — tap an exercise and you get four boxes: Weight, Set 1, Set 2, Set 3,
matching the way the numbers were always written down. **Drag a box up or down**
to change its number, or tap it to type. Weight moves in 1.25 kg steps (quarter
plates, since the cable stacks land on .25 and .75). Reps move in 1s. A set left
at 0 isn't recorded, so a two-set day needs nothing extra. **SAVE** writes the
whole line at once and starts the rest timer.

**Lifts** — every exercise ever logged, grouped by routine, showing its latest
weight and how far it's come. Tap one for its progression chart.

**History** — every session, newest first, plus an 8-week grid of what was trained.

---

## Where the history came from

The 51 sessions from January to August 2026 were reconstructed from 55 screenshots
of the Apple Notes doc these were originally tracked in. Two things worth knowing
if a session ever looks odd:

- **Dates are real** — taken from each screenshot's EXIF capture time, not guessed.
- **Sessions are inferred from change.** The note was a living document showing
  current working weights for everything, not a per-day log. So a session contains
  the exercises whose numbers *moved* since the previous screenshot. That's why an
  older session might list only three exercises: those were the three that changed.
  Lines missing from a screenshot (cut off mid-scroll) carry their previous value
  forward rather than reading as a drop.

Exercise names are kept exactly as they were written, typos included
(`Shoudler Lateral Raise Machine`, `Skill Crusher`, `Front felt cable raises`).
Where a line was clearly renamed over time — `Lat Pulldown` → `Lat Pull Downs`,
and the lateral raise machine's three spellings — the old names are aliased onto
the current one so the chart is a single continuous line. Where the label signalled
a genuinely different machine (`Leg Extension` vs `Leg Extension (new)`, `Shrugs`
vs `Shrugs DB`) they were deliberately kept apart, because merging them would draw
a fake drop.

---

## Install it on the phone

1. Open **https://zain-ea.github.io/gym/** in **Safari** — not Chrome. Only Safari
   produces a proper standalone PWA from Add to Home Screen.
2. Share → **Add to Home Screen**.
3. Open it from the home screen icon, not from Safari, or you get a browser chrome
   you don't want and a different storage bucket.

---

## Deploy

```bash
git add . && git commit -m "change" && git push
```

GitHub Pages picks it up within a minute or two. First time only:

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/zain-ea/gym.git
git push -u origin main
```

Then: repo → **Settings → Pages → Source: Deploy from a branch → main / (root)**.

### The one deploy trap

`sw.js` caches the app so it works offline, which also means an installed phone
can keep serving the old version. Two things protect you:

- Page loads are **network-first**, so a deploy shows up next time you open the
  app with signal, and the app still launches in airplane mode.
- Everything else is cache-first, keyed on `CACHE = 'gym-v1'` at the top of
  `sw.js`. **Bump that string whenever you change icons or the manifest.**

If a phone is ever stuck on an old version: delete the home screen icon, reopen
the URL in Safari, re-add it.

---

## Back up your data

Everything lives in `localStorage` under the key `gym.v1` on that one phone.
There is no server and no copy anywhere else. iOS *can* clear it, and deleting
the home screen icon definitely does.

**Settings → Backup → Export** writes `gym-backup-YYYY-MM-DD.json` through the iOS
share sheet — save it to Files or iCloud Drive. The app nags you after every 10
logged sessions. Take the nag seriously.

**Import** reads that file back, validates it, and asks before overwriting.

---

## Morning reminders

The app cannot send you a notification. No web app on iOS can — there is no API
to schedule a local notification, and pretending otherwise would just mean a
reminder that silently never fires. What the app does do is show today's routine
the moment you open it.

For a real alarm, build a personal automation. Two minutes, free, works offline:

1. **Shortcuts** app → **Automation** tab → **+**
2. **Time of Day** → set your time (the app stores your preferred one in
   Settings, purely so you remember what you picked)
3. **Repeat: Weekly**, tick your training days
4. **Run Immediately**, and turn **Notify When Run** off
5. Action: **Open App** → **Gym**
   (or **Show Notification** with your own text if you'd rather just be nudged)
6. **Done**

If you move your training days around in the app, edit the automation to match —
they're two separate things and nothing syncs them.

---

## Heart rate from the Fitbit Air

Short version: the app can't read your health data itself, but a Shortcut can
hand it over, and it now has your Fitbit data to hand over.

**Why it works at all.** Apple HealthKit has no web API, and Google's Health
Connect is Android-only, so no browser on iOS can read your health data —
that part is genuinely impossible and no amount of code changes it. But two
things line up:

- Since the Google Health iOS app v5.05 (August 2026), Fitbit finally writes
  back into Apple Health — exercise, sleep, vitals, steps. So the Air's heart
  rate is already sitting in Apple Health on your iPhone. (Turn it on: Google
  Health → profile icon → **Partner apps** → **Apple Health**. HRV is the one
  metric that doesn't carry across; Apple and Google calculate it differently.)
- iOS Shortcuts *can* read Apple Health, and can open a URL.

So the Shortcut is the bridge. Nothing is uploaded anywhere; the numbers go
straight from Health into the app on your phone.

### Step 1 — let Fitbit into Apple Health

1. Open the **Google Health** app
2. Tap the **profile icon**, top right
3. **Partner apps** → **Apple Health**
4. Follow the prompts and allow everything

That's the two-way sync. Heart rate, exercise, sleep and steps from the Air now
land in Apple Health. HRV won't cross over — Apple and Google calculate it
differently.

### Step 2 — build the shortcut (6 actions)

1. **Shortcuts** app → **+** → rename it **Gym HR**
2. Add **Find All Health Samples Where**
   - **Type** → **Heart Rate**
   - **Add Filter** → **Start Date** · **is in the last** · **3** · **hours**
   - **Sort by** → **Start Date**, **Order** → **Oldest First**
3. Add **Get Details of Health Sample** → **Detail** → **Value**
   (it runs over the whole list and gives you every bpm reading)
4. Add **Combine Text** → **Separator** → **Custom** → a single comma
5. Add **URL Encode** (under Text actions)
6. Add **Open URLs** → type `https://zain-ea.github.io/gym/#hr=` and insert the
   **URL Encoded Text** variable straight after it, no space

Run it after training. The app opens, trims the samples to the session window and
files avg / peak / low / time-in-zone against that day.

*If step 3 returns a single number instead of a list:* wrap it in **Repeat with
Each** — put **Get Details of Health Sample** → **Value** inside the repeat, then
combine **Repeat Results** in step 4.

*Want exact zone timings rather than evenly-spread samples?* Inside a **Repeat with
Each**, add **Format Date** on the sample's **Start Date** with custom format
`HHmmss`, then a **Text** action reading `[Formatted Date]-[Value]`, and combine the
repeat results. The app reads that form too and uses the real timestamps.

Run it after training. The app opens, trims the samples to the session window,
and files them against that session — average, peak, low, time in each zone, and
a trace of the session.

Don't fancy building it? **Settings → Heart rate from Apple Health** has a paste
box that takes the same thing: either `HHMMSS-bpm` pairs or just a plain
comma-separated list of bpm values.

Set your max heart rate in Settings — the training zones are calculated off it.

### What about reading it live, properly?

There is a real cloud API — the **Google Health API** (`health.googleapis.com/v4`),
which replaced the Fitbit Web API when that was retired in September 2026. It
serves heart rate at roughly 5-second resolution, which is better than the old
Fitbit intraday data ever was.

It is not worth it here, for three specific reasons:

- Its OAuth client type is **web server** — it needs a client secret, which means
  a backend, which is the one thing this project is built to avoid.
- Every scope is **restricted**, so production access needs a privacy and
  security review.
- Left in "testing" mode to skip that review, refresh tokens **expire every
  7 days**. You'd be re-authorising the app more often than you deload.

The Shortcuts bridge has none of those problems and works with no signal.

---

## Home screen widget

Web apps can't draw iOS widgets. [Scriptable](https://scriptable.app) can, so
`widget.js` renders one from an exported summary file.

1. Install **Scriptable**
2. In the app: **Settings → Backup → Save widget file** → save `gym-widget.json`
   into **iCloud Drive → Scriptable**
3. In Scriptable: **+**, paste in all of `widget.js`, name it **Gym**
4. Long-press the home screen → **+** → **Scriptable** → Small or Medium
5. Edit the widget: Script = **Gym**, When Interacting = **Run Script**

It shows today's routine, your last session's headline numbers, and how many days
old the file is — so a stale widget can never quietly lie to you. Re-export
whenever you want it refreshed. Tapping it opens the app.

---

## Notes

- **Weights** default to kg, switchable in Settings. The ± buttons step by 2.5,
  which is a plate a side on most bars.
- **Charts** plot the top set by default — the heaviest weight lifted that session.
  Estimated 1RM (Epley, `weight × (1 + reps/30)`) is the other option. Volume is
  deliberately not offered as a progress metric; it rewards doing more junk sets.
- **Timers** are driven off absolute timestamps, never a counter that ticks down,
  so they can't drift over a long session and they survive being backgrounded.
- **Wake lock** is requested while a timer runs. If you lock the phone anyway, iOS
  suspends the app — the timer recalculates from the clock when you come back
  rather than pretending nothing happened.
- **Data lives** in `localStorage` under `gym.v1`. A corrupted store won't
  white-screen the app; it boots with defaults, keeps the broken copy aside under
  `gym.v1.broken.<timestamp>`, and tells you.
