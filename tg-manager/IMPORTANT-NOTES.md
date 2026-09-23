# IMPORTANT NOTES — TGempire Troubleshooting Reference

## Issue 1: Bot Stopped Posting / "Completely Dead"

**Symptom:** Scheduled posts stop firing, dashboard shows no activity.

**Root Cause:** The app was running on a local `npm run dev` server, not on Vercel. When the terminal was closed, everything died. Vercel cron jobs only work on Vercel's infrastructure — they hit the deployed URL, not your local machine.

**Fix:**
- Deploy the app to Vercel with all env vars set
- Vercel cron (`vercel.json`) fires `/api/cron/post` every 30 min and `/api/cron/stats` daily at 8 AM
- Never rely on a local server for production posting

**How to verify:** Check Vercel dashboard > Deployments > Function Logs to see if cron is firing.

---

## Issue 2: Zero Environment Variables on Vercel

**Symptom:** Production site loads the login page but all API calls fail. Dashboard shows 0 everywhere.

**Root Cause:** The Vercel project (`t-gempire-b2rr`) had no environment variables configured. The app needs MONGODB_URI, TELEGRAM_BOT_TOKEN, R2 credentials, etc.

**Fix:** Added all env vars to the Vercel project via `vercel env add`. The shared credentials (R2, MongoDB) were found in the `erogram-v2` project's `.env.local` at:
```
/Users/themaf/Desktop/@ACQUISITION/EROGRAM PROJECT /@EROGRAM/erogram-v2/.env.local
```

**Critical:** Vercel does NOT share env vars between projects on the same team. Each project needs its own copy.

---

## Issue 3: Telegram Bot Token Not Found

**Symptom:** Can't find the bot token, BotFather doesn't show the bot.

**Root Cause:** The bot was created under a different context. The token was stored in the GroupManager project, not in TGempire.

**Where tokens live:**
- **GroupManager bot:** `8455030050:AAF6v5HwJZHUMemKmXHgYINGC6Tg-Puu-L8` — found in `/EROGRAM/GroupManager/.env`
- **Erogram Notify bot:** `8441115133:AAFN2d6HLxcRHkrNXF3uZ1J31ZKzwBIVbNQ` — found in `/EROGRAM/erogram-v2/.env.local`
- **Erogram Plus bot:** `8078730777:AAECXjzj8zMVR48nVLd9z5BSDGIM7WzyyEc` — found in `/EROGRAM/erogram-v2/.env.local`
- **New bot created:** `@erogramprobot` via BotFather (Feb 2026)

**Lesson:** Always check all project `.env` files across the workspace before creating new bots.

---

## Issue 4: Login Returns 401 Despite Correct Password

**Symptom:** Entering the correct ADMIN_PASSWORD returns "Invalid credentials".

**Root Cause:** The database had an existing `admin` user with an old bcrypt password hash. The code found the user in MongoDB, compared the new password against the old hash, and rejected it — never reaching the env-based fallback.

**Fix:** Updated `lib/auth.ts` to check `ADMIN_PASSWORD` from env FIRST, before checking the database. If the env password matches, it logs in and also syncs the stored hash in MongoDB.

---

## Issue 5: Env Vars Corrupted with Trailing Newline

**Symptom:** ADMIN_PASSWORD set to `jepasse` but login fails. MongoDB connection strings fail.

**Root Cause:** Using `echo "value" | vercel env add` appends a `\n` newline to the value. Vercel stores it literally as `"jepasse\n"` which doesn't match `"jepasse"`.

**Fix:** Always use `printf` instead of `echo` when piping values to Vercel CLI:
```bash
# WRONG — adds trailing newline
echo "jepasse" | vercel env add ADMIN_PASSWORD production

# CORRECT — no trailing newline
printf 'jepasse' | vercel env add ADMIN_PASSWORD production
```

**How to verify:** Pull env vars and check for `\n`:
```bash
vercel env pull .env.check --environment production --yes
cat .env.check | grep '\\n'
```

---

## Issue 6: MONGODB_URI Pointing to Wrong Database

**Symptom:** Production dashboard shows 0 groups, 0 templates, 0 posts — completely empty.

**Root Cause:** When copying env vars from the `erogram` project, `MONGODB_URI` was set to `mongodb+srv://.../.../erogram` (the erogram.pro website database) instead of `mongodb+srv://.../.../tg-manager` (TGempire's own database).

**Correct values:**
```
MONGODB_URI=mongodb+srv://erogrampro:ke5K2CXlFmYB36sj@cluster0.dlph1wf.mongodb.net/tg-manager?appName=Cluster0
EROGRAM_MONGODB_URI=mongodb+srv://erogrampro:ke5K2CXlFmYB36sj@cluster0.dlph1wf.mongodb.net/erogram?appName=Cluster0
```

Same cluster, different database names. `MONGODB_URI` = TGempire data, `EROGRAM_MONGODB_URI` = read-only access to erogram.pro for ecosystem KPIs.

---

## Issue 7: Vercel Redeploy vs Fresh Deploy

**Symptom:** Code pushed to GitHub but production site still runs old code.

**Root Cause:** `vercel redeploy` rebuilds the SAME deployment (same source code). It picks up new env vars but NOT new code from GitHub. To deploy new code, you need a fresh build triggered by a Git push.

**Fix:** The `t-gempire-b2rr` project is connected to `github.com/acquiretoscale/tgempire-app`. Push to `main` should auto-deploy. If it doesn't:
1. Go to Vercel dashboard > `t-gempire-b2rr` > Settings > Git
2. Verify the GitHub repo is connected
3. Trigger a manual deploy from the Deployments tab

**CLI deploy blocked:** `vercel deploy --prod` from local fails with "Git author must have access to team" — this is a Vercel team permission issue. Use the dashboard or GitHub push instead.

---

## Issue 8: Videos Failing to Post — "failed to get HTTP URL content"

**Symptom:** Some groups get error "Telegram sendVideo: Bad Request: failed to get HTTP URL content".

**Root Cause:** Telegram's servers sometimes can't fetch videos from Cloudflare R2 public URLs.

**Fix:** Updated `lib/telegram.ts` to automatically fall back to downloading the video from R2 and uploading it directly to Telegram when URL-based sending fails. Handles three error types:
- `wrong type of the web page content`
- `failed to get HTTP URL content`
- `Wrong file identifier/HTTP URL specified`

---

## Issue 9: Videos Too Large — "Request Entity Too Large"

**Symptom:** Telegram returns "Request Entity Too Large" when posting videos.

**Root Cause:** Telegram bots have a 50MB upload limit. Some imported videos exceeded this.

**Fix:** Two layers of protection:
1. **Import** (`app/api/media/import/route.ts`): Files >10MB are skipped during RedGifs import (HEAD check + download size check)
2. **Posting** (`lib/post-helper.ts`): Files >10MB in R2 are filtered out when picking the next file to post

---

## Quick Reference: Current Credentials

| What | Value |
|------|-------|
| Login (production old code) | Password: `jepasse` |
| Login (new code) | Username: `admin`, Password: `jepasse` |
| Vercel project | `t-gempire-b2rr` → `tgempire.erogram.pro` |
| GitHub repo | `acquiretoscale/tgempire-app` |
| MongoDB cluster | `cluster0.dlph1wf.mongodb.net` |
| TGempire database | `tg-manager` |
| Erogram database | `erogram` |

## Quick Reference: Where Secrets Live

| Source | Path |
|--------|------|
| TGempire local env | `tg-manager/.env.local` |
| Erogram secrets | `erogram-v2/.env.local` |
| GroupManager bot token | `GroupManager/.env` |
| Vercel env vars | `vercel env ls` (from linked project dir) |
