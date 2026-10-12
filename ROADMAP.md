# Roadmap

These are candidate features for the Speed Reader extension. They're grouped into look & feel, personalization, and gamification. Each one is rated by effort and expected impact.

**Guiding principles**
- **Built for public Chrome Web Store users**, not only power users.
- **Gamification is private self-improvement:**
  - no backend, accounts, or leaderboards;
  - progress is stored in `chrome.storage.sync`, so it follows your Chrome profile.
- **Nothing camera-related ships in `main`.** Eye-tracking lives on a separate branch.

**Where things stand:**
- **Already in the extension:**
  - RSVP with ORP highlighting and punctuation pauses
  - seekable progress bar
  - resizable reader with presets and full-window mode
  - ← / → to skip about 2 seconds
  - − / + for fine speed control
- **Missing:** any memory of what you've read. Most of section 3 depends on that, so section 0 comes first.

**Legend:**
- **Effort:** **S** < 1 day · **M** 1–3 days · **L** > 3 days.
- **Impact:** estimated effect on retention or perceived quality for a new user.

---

## 0. Foundation: reading stats

Needed by most of section 3.

- **What:** record each reading session. Writes happen on pause, close, or finish, never per word.
- **Sync limits shape the design:**
  - about 100KB in total;
  - 8KB per key;
  - 512 keys;
  - about 120 writes per minute.
- **Storage layout:**
  - **Monthly keys** such as `m:2026-10` hold per-day totals: `{words, ms, sessions, bestSustainedWpm, skipsBack}`. That's about 2KB a month, or about 25KB and 12 keys a year.
  - **One `totals` key** holds lifetime counters and personal bests.
  - **Prune** months older than about 24.
- **Effort:** M.
- **Impact:** makes the rest possible. Nothing in section 3 works without it.

## 1. Look & feel

| # | Feature | What it is | Effort | Impact |
|---|---|---|---|---|
| 1.1 | **Themes** | Dark, light, sepia, high-contrast, plus "match system". | S | High: the first thing store reviewers notice. |
| 1.2 | **Font choice** | System sans, system serif, **Atkinson Hyperlegible**, and **OpenDyslexic**. Both named fonts are OFL-licensed and bundled with the extension, with no CDN. | S | High for accessibility. |
| 1.3 | **Context on pause** | When paused or skipping, the surrounding sentence fades in under the word with the current word highlighted. Pairs with ← / → so you can see where you landed. | M | **Very high.** The most common complaint about RSVP readers. |
| 1.4 | **Warm-up ramp** | Each start begins at about 70% speed and reaches your set speed over about 8 seconds, so the first sentence isn't a shock. | S | Med-high: feels polished. |
| 1.5 | **End-of-read card** | When you finish: words read, time, average wpm, and **time saved compared with reading at about 240 wpm**. | S (with section 0) | High: the reward moment. |
| 1.6 | **Paragraph ticks on the progress bar** | Faint marks at paragraph and heading boundaries. Click one to jump there. | S | Medium. |
| 1.7 | **Popup redesign** | Today's minutes and streak, plus a "Read this page" button above the speed control. | M | Med-high: puts your progress in view. |
| 1.8 | **First-run onboarding** | A 30-second interactive demo of double-Shift, Space, ← / →, and − / +. | M | High for public users, since most never learn the shortcuts. |
| 1.9 | **Accessibility pass** | Honor `prefers-reduced-motion` (no countdown animation or fades). Add visible focus rings. Announce play/pause state to screen readers. | S | Medium: store reviewers and screen-reader users notice. |
| 1.10 | **Better text extraction** | Replace the current page-detection guesswork with Mozilla Readability (bundled, Apache-2.0), so menus and ads aren't read aloud. | M | High. Bad extraction is the biggest reason people give up on the extension. |

## 2. Personalization

| # | Feature | What it is | Effort | Impact |
|---|---|---|---|---|
| 2.1 | **Resume where you left off** | Remember the position for the last ~50 pages, stored under a hash of the URL. Reopening asks "Continue from 62%?" | M | **Very high.** Long articles become something you come back to. |
| 2.2 | **Per-site speed** | Remember wpm per domain, so arXiv can be slower than a news site. The global setting is the fallback. | S | Med-high. |
| 2.3 | **Pacing controls** | Sliders for the pause at punctuation and for extra time on long words. Numbers and code get extra time automatically. | S | Medium: power users love it. |
| 2.4 | **Chunk size** | Show 1, 2, or 3 words per flash. | M | Medium: some people read better in phrases. |
| 2.5 | **Speed calibration** | Optional 60-second test at first run that sets your starting wpm, instead of the fixed 350. | M | Med-high for onboarding. |
| 2.6 | **Adaptive suggestions (no camera)** | Uses ← skips as the signal. A few minutes with no skips back suggests "Try 380?". Frequent skips back suggest slowing down. One tap to accept. Uses `skipsBack` from section 0. | M | High. Doubles as the progression mechanic for 3.3. |
| 2.7 | **Custom shortcuts** | Remap keys. | M | Low: deferred. |

## 3. Gamification (private, for stickiness)

| # | Feature | What it is | Effort | Impact |
|---|---|---|---|---|
| 3.1 | **Time-saved counter** | Lifetime hours saved compared with average reading speed. Shown in the popup and on the end-of-read card. | S | **Very high for the effort.** The clearest statement of what the extension does for you. |
| 3.2 | **Daily goal + streak** | Pick a daily goal of 5, 10, or 20 minutes. The streak counts days you met it, with one free missed day a week so a single gap doesn't wipe it. | M | **Very high.** The main reason to come back each day. |
| 3.3 | **Speed levels** | Tiers such as 300 / 400 / 500 / 600+. Unlock one by reading **at least 3 minutes at that speed with few skips back**, so cranking up the speed without understanding doesn't count. | M | High: progress you can feel. |
| 3.4 | **Personal bests** | Best sustained wpm, longest session, most words in a day. A small "New best!" on the end-of-read card. | S | Med-high. |
| 3.5 | **Milestones** | Badges at 10k, 100k, and 1M words, plus comparisons like "You've read *The Great Gatsby* ×3 (~47k words)". | S | Medium: cheap delight. |
| 3.6 | **Stats page** | An options page with a 12-month calendar heatmap like GitHub's contribution graph, a wpm trend line, and words per week. | M | High for engaged users. |
| 3.7 | **Toolbar badge** | Streak count on the extension icon, or a dot if today's goal isn't met yet. | S | Med-high: a passive reminder. |
| 3.8 | **Comprehension check** | After long reads, an optional fill-in-the-blank question built from the text (pick the missing word from four). "Effective wpm" is wpm × accuracy. | L | Medium. Keeps progress honest but adds a step. Ship last. |
| 3.9 | **Speed drills** | A training mode that alternates 30-second sprints at +100 wpm with recovery at your normal speed. | M | Medium: appeals to self-improvers. |
| 3.10 | **Weekly recap** | One summary notification a week. Opt-in, because it needs the `notifications` permission. | S | Medium. Watch for notification fatigue. |

---

## Proposed build order

Ship visible value first, then the habit loop. Each step is its own PR into `main`.

1. **1.1 Themes + 1.3 Context on pause.** Visible polish that needs no stored data.
2. **Section 0 Stats foundation + 1.5 End-of-read card + 3.1 Time saved + 3.4 Personal bests.** The first features built on the stored stats.
3. **3.2 Streak + daily goal, 3.7 Toolbar badge, 1.7 Popup redesign.** The daily habit loop.
4. **2.1 Resume, then 1.10 Readability.** Fixes the main reasons people abandon long reads.

**Deferred:** 2.7 Custom shortcuts and 3.8 Comprehension check. Revisit once there's real usage data.

## Constraints

- **No camera code in `main`.** That's why 2.6 uses skips, not gaze.
- **Fonts and libraries are bundled in the extension.** Chrome extensions (Manifest V3) can't run code loaded from the web. Licenses must be OFL, MIT, or Apache.
- **Stay within the sync quota.** If full history is wanted later, keep it in local storage and sync only a summary.
- **Avoid new permissions.** `notifications` (3.10) is the only one proposed.
