# Erogram — Post-Acquisition Migration Fixes

> Reference document for all issues discovered and resolved after the site acquisition
> and migration. Use this when troubleshooting similar problems or onboarding new
> developers.

---

## Table of Contents

1. [Root Cause: Mongoose Model Caching](#1-root-cause-mongoose-model-caching)
2. [Fields That Were Not Saving](#2-fields-that-were-not-saving)
3. [Tracking / Analytics That Were Broken](#3-tracking--analytics-that-were-broken)
4. [UI / Display Bugs Tied to Missing Data](#4-ui--display-bugs-tied-to-missing-data)
5. [How to Avoid These Issues Going Forward](#5-how-to-avoid-these-issues-going-forward)
6. [File Reference](#6-file-reference)

---

## 1. Root Cause: Mongoose Model Caching

**This single issue was responsible for the majority of "not saving" bugs.**

### How it works

Next.js uses Hot Module Replacement (HMR) during development. When a file changes,
modules are re-evaluated — except Mongoose models. The pattern used everywhere in the
codebase is:

```js
export const Bot = models.Bot || model('Bot', botSchema);
```

Once `models.Bot` exists (after the first request), Mongoose **reuses the old schema
definition** for the lifetime of the Node process. If you add a new field to `botSchema`
and save your file, the running server still uses the **old** schema that was registered
on first load.

### Consequence

With Mongoose's default `strict: true`, any field **not in the cached schema** is
silently stripped from `$set` / `$inc` / `create` operations. The API returns `200 OK`,
the frontend shows success, but the field is never written to MongoDB.

### The fix (every time)

```bash
# 1. Kill the dev server
lsof -ti:3000 | xargs kill -9

# 2. Delete the Next.js build cache
rm -rf .next .next-*

# 3. Restart
npm run dev
```

This forces Node to re-evaluate all modules, re-registering Mongoose models with the
**current** schema.

### Fields affected by this issue (chronological)

| Field | Model | When discovered | Symptom |
|---|---|---|---|
| `verified` | Campaign | After adding verified checkmark toggle | Admin saves, checkbox resets to unchecked on reload |
| `verified` | Group | Same session | Same — toggle not persisting |
| `topBot` | Bot | After adding Top Bot admin control | "Top Bot" checkbox not saving |
| `showVerified` | Bot | Same session, after `topBot` was fixed | Verified badge toggle for bots not persisting |
| `clickCountByDay` | Bot | After adding 24h/7d click stats | `$inc` on daily map silently dropped; lifetime `clickCount` still worked because it was in the original schema |
| `viewsByDay` | Article | After adding 24h/7d article view stats | Same pattern — `$inc` silently dropped |

---

## 2. Fields That Were Not Saving

### 2.1 Campaign `verified` (Boolean)

**Problem:** The "Verified checkmark" toggle was added to the Feed Ads editor in
`AdvertisersTab.tsx`, and the `verified` field was added to `campaignSchema`. But
after saving, reloading the page showed the checkbox unchecked.

**Root cause:** Mongoose model caching (see §1). The running server's cached
`Campaign` model did not include `verified`, so `findByIdAndUpdate` with
`{ verified: true }` silently dropped the field.

**Fix:**
- Confirmed `verified: { type: Boolean, default: false }` was in `campaignSchema`
  (`lib/models/index.ts`, line ~453).
- Confirmed `createCampaign` and `updateCampaign` in `lib/actions/campaigns.ts`
  read/write the field.
- Confirmed `AdvertisersTab.tsx` sends `verified` in the save payload.
- **Restarted the dev server** with cache clear → field started persisting.

**Files changed:**
- `lib/models/index.ts` — added `verified` to `campaignSchema`
- `lib/actions/campaigns.ts` — added `verified` to create/update/get functions
- `app/admin/components/AdvertisersTab.tsx` — added toggle UI + form state
- `app/groups/types.ts` — added `verified?: boolean` to `FeedCampaign` interface

---

### 2.2 Group `verified` (Boolean)

**Problem:** Same as campaigns — the verified checkmark for groups didn't persist.

**Root cause:** Same Mongoose caching issue.

**Fix:**
- Added `verified: { type: Boolean, default: false }` to `groupSchema`.
- Updated `GroupsTab.tsx` to include the toggle and send it on save.
- Updated the groups API and aggregation pipelines to project the field.
- **Restarted the dev server.**

**Files changed:**
- `lib/models/index.ts` — added `verified` to `groupSchema`
- `app/admin/components/GroupsTab.tsx` — added toggle UI
- `app/api/groups/route.ts` — included `verified` in aggregation output
- `app/groups/page.tsx` — included `verified` in SSR aggregation
- `app/groups/types.ts` — added `verified?: boolean` to `Group` interface

---

### 2.3 Bot `topBot` (Boolean)

**Problem:** After implementing admin-controlled "Top Bots" (replacing the old
click-count-based sorting), the "Top Bot" checkbox in the bot editor didn't persist.

**Root cause:** Same Mongoose caching issue. The `topBot` field was added to
`botSchema` but the running process still used the old schema.

**Fix:**
- Confirmed `topBot: { type: Boolean, default: false }` was in `botSchema`.
- **Restarted the dev server** with cache clear.

**Files changed:**
- `lib/models/index.ts` — added `topBot` to `botSchema`
- `app/admin/components/BotsTab.tsx` — added "Top Bot 🏆" checkbox + badge
- `app/api/bots/route.ts` — added `topBot=true` query filter + projection
- `app/bots/BotsClient.tsx` — fetch top bots via `?topBot=true`

---

### 2.4 Bot `showVerified` (Boolean)

**Problem:** After `topBot` was fixed, the "Show Verified" checkbox for bots still
didn't save. Other bot fields (`topBot`, `pinned`) now saved correctly.

**Root cause:** The `showVerified` field was **completely missing** from `botSchema`.
It was referenced in the UI and API but never defined in the Mongoose schema, so
`strict: true` always dropped it.

**Fix:**
- Added `showVerified: { type: Boolean, default: false }` to `botSchema`.
- **Restarted the dev server** with cache clear.

**Files changed:**
- `lib/models/index.ts` — added `showVerified` to `botSchema`

---

## 3. Tracking / Analytics That Were Broken

### 3.1 Bot `clickCountByDay` (Map) — Daily click tracking

**Problem:** The admin Bots panel showed **0** for "24h" and "7d" click columns,
even though bots had thousands of lifetime clicks. The user thought click tracking
was completely broken.

**What was actually happening:**
- `clickCount` (lifetime) **was working** — it was always in the original schema
  and incremented correctly on every click.
- `clickCountByDay` (daily breakdown) was a **new field** added to enable the
  24h/7d columns. The `$inc` in the track API targeted both fields:
  ```js
  $inc: { clickCount: 1, [`clickCountByDay.${todayKey}`]: 1 }
  ```
  But because the Mongoose model was cached without `clickCountByDay`, the daily
  increment was **silently dropped** while the lifetime increment succeeded.

**Verification:** Direct MongoDB query confirmed `clickCountByDay` did not exist
on any bot document despite the API returning `200 OK` for track requests.

**Fix:**
- **Restarted the dev server** with cache clear.
- After restart, tested tracking → `clickCountByDay: { "2026-02-23": 1 }`
  appeared in the database.

**Additional improvement:** Changed the BotCard click tracking from
`await axios.post(...)` to `navigator.sendBeacon(...)` for more reliable
fire-and-forget tracking (matches the pattern used in `JoinClient.tsx`).

**Files changed:**
- `lib/models/index.ts` — added `clickCountByDay` to `botSchema`
- `app/api/bots/track/route.ts` — `$inc` now includes `clickCountByDay.{date}`
- `app/api/admin/bots/route.ts` — computes `clicks24h` / `clicks7d` from the map
- `app/admin/components/BotsTab.tsx` — displays 24h, 7d, lifetime columns
- `app/bots/BotsClient.tsx` — switched to `sendBeacon` for tracking

**Note:** Historical daily breakdown cannot be reconstructed. The 24h/7d columns
start accumulating from the moment the server was restarted with the new schema.
Lifetime totals retain all historical data.

---

### 3.2 Article `viewsByDay` (Map) — Daily view tracking

**Problem:** The admin Articles panel had a "Last 72h" column powered by
`weeklyViews`, but `weeklyViews` was **never reset** — it was incremented on
every view alongside `views` (lifetime), making it just another lifetime counter.

**What was broken in the old code:**
```js
// articles/[slug]/route.ts — old tracking
Article.findByIdAndUpdate(ar._id, { $inc: { views: 1, weeklyViews: 1 } });
```
`weeklyViews` goes up forever, never resets. The "Last 72h" column was meaningless.

**Fix:**
- Added `viewsByDay: { type: Map, of: Number, default: new Map() }` to
  `articleSchema`.
- Updated tracking to increment daily counts:
  ```js
  const todayKey = new Date().toISOString().slice(0, 10);
  Article.findByIdAndUpdate(ar._id, {
    $inc: { views: 1, [`viewsByDay.${todayKey}`]: 1 }
  });
  ```
- Updated admin articles list API to compute `views24h` and `views7d` from the map.
- Updated admin articles stats endpoint to return `totalClicks24h` and
  `totalClicks7d`.
- Replaced the broken "Last 72h" column with real **24h**, **7d**, and **Lifetime**
  columns in the UI.
- **Restarted the dev server** with cache clear to register the new schema field.

**Files changed:**
- `lib/models/index.ts` — added `viewsByDay` to `articleSchema`
- `app/api/articles/[slug]/route.ts` — updated `$inc` to include daily key
- `app/api/admin/articles/route.ts` — computes `views24h` / `views7d` per article
- `app/api/admin/articles/stats/route.ts` — computes total 24h/7d across all articles
- `app/admin/components/ArticlesTab.tsx` — new KPI cards + table columns

**Note:** The old `weeklyViews` field remains in the schema but is no longer
incremented. It could be removed in a future cleanup.

---

### 3.3 Group `clickCountByDay` (Map) — was already working

Groups already had `clickCountByDay` in their schema and it was being tracked
correctly in `app/api/groups/track/route.ts`. No fix was needed.
Database query confirmed: `"2026-02-23": 140` (real daily data).

---

## 4. UI / Display Bugs Tied to Missing Data

### 4.1 Verified checkmark truncated by CSS

**Problem:** The verified badge SVG was inside an `<h3>` with `line-clamp-1`,
which clipped the badge with "..." when the title was long.

**Fix:** Restructured the HTML — the `<h3>` uses `flex items-center gap-1.5`,
the name text is in a `<span>` with `truncate min-w-0`, and the SVG badge has
`w-[16px] h-[16px] shrink-0` so it never gets clipped.

**Files:** `app/groups/GroupCard.tsx`, `app/groups/AdvertCard.tsx`

---

### 4.2 Broken fallback image across the site

**Problem:** Multiple bots showed broken images. The fallback path `/assets/image.jpg`
was a 586-byte file — essentially a broken placeholder.

**Fix:** Replaced the content of `/assets/image.jpg` with the Erogram logo (7.9KB).
Since all `onError` handlers and default paths pointed to this file, the fix
propagated across the entire application without changing code references.

**Files:** `public/assets/image.jpg` (replaced content), `public/assets/og-default.png` (added)

---

### 4.3 Feed Ads numbering showed "5th, 10th, 15th" instead of sequential

**Problem:** The Feed Ads table in the admin showed slot-based positions like
"5th", "10th", which was confusing.

**Fix:** Changed to sequential numbering (1, 2, 3, 4, 5...) based on row index.

**File:** `app/admin/components/AdvertisersTab.tsx`

---

## 5. How to Avoid These Issues Going Forward

### When adding a new field to any Mongoose schema:

1. **Add the field** to the schema in `lib/models/index.ts`.
2. **Restart the dev server** with cache clear:
   ```bash
   lsof -ti:3000 | xargs kill -9
   rm -rf .next .next-*
   npm run dev
   ```
3. **Test the save** by:
   - Toggling/setting the field in the admin UI.
   - Reloading the page to confirm it persisted.
   - Optionally querying MongoDB directly:
     ```bash
     node -e "
     const mongoose = require('mongoose');
     require('dotenv').config({ path: '.env.local' });
     (async () => {
       await mongoose.connect(process.env.MONGODB_URI);
       const doc = await mongoose.connection.db
         .collection('YOUR_COLLECTION')
         .findOne({ _id: new mongoose.Types.ObjectId('YOUR_ID') },
                   { projection: { YOUR_FIELD: 1 } });
       console.log(JSON.stringify(doc, null, 2));
       await mongoose.disconnect();
     })();
     "
     ```

### When deploying to production (Vercel):

The Mongoose caching issue is **development-only** (caused by HMR). On Vercel,
each deployment creates a fresh serverless function instance, so the model is
always registered with the current schema. However, you should still verify new
fields work after deployment.

### When tracking new metrics with `$inc` on Map fields:

- Historical data **cannot be backfilled** from a single lifetime counter.
- The daily map starts empty and accumulates from the moment of deployment.
- Always use the `{ type: Map, of: Number, default: new Map() }` pattern.
- The key format is `YYYY-MM-DD` (UTC).

---

## 6. File Reference

### Schema definitions
- `lib/models/index.ts` — All Mongoose schemas (Group, Bot, Article, Campaign, etc.)

### Tracking APIs
| Entity | Track endpoint | Fields incremented |
|---|---|---|
| Bot | `app/api/bots/track/route.ts` | `clickCount`, `clickCountByDay.{date}` |
| Group | `app/api/groups/track/route.ts` | `clickCount`, `weeklyClicks`, `clickCountByDay.{date}` |
| Article | `app/api/articles/[slug]/route.ts` | `views`, `viewsByDay.{date}` |
| Campaign | `app/api/campaigns/track/route.ts` → `lib/actions/campaigns.ts` | `clicks` + `CampaignClick` document |

### Admin APIs that compute 24h/7d stats
- `app/api/admin/bots/route.ts` — enriches each bot with `clicks24h`, `clicks7d`
- `app/api/admin/articles/route.ts` — enriches each article with `views24h`, `views7d`
- `app/api/admin/articles/stats/route.ts` — total `totalClicks24h`, `totalClicks7d`

### Admin UI components
- `app/admin/components/BotsTab.tsx` — 24h, 7d, Lifetime columns + sorting
- `app/admin/components/ArticlesTab.tsx` — 24h, 7d, Lifetime columns + KPI cards
- `app/admin/components/AdvertisersTab.tsx` — Verified toggle, drag-and-drop, video icon
- `app/admin/components/GroupsTab.tsx` — Verified toggle

### Frontend display
- `app/groups/AdvertCard.tsx` — Verified badge rendering (campaigns)
- `app/groups/GroupCard.tsx` — Verified badge rendering (groups)
- `app/bots/BotsClient.tsx` — Top Bots section, `sendBeacon` click tracking
- `app/groups/VirtualizedGroupGrid.tsx` — Ad placement logic (featured → first ad)

---

*Last updated: February 23, 2026*
