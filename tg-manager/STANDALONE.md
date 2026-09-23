# TGempire — Standalone Migration Guide

This document covers everything needed to run TGempire as a fully independent application, separate from the Erogram ecosystem.

---

## Current Architecture (shared)

TGempire currently shares infrastructure with Erogram.pro:

| Resource          | Shared with Erogram.pro | How to separate |
|-------------------|------------------------|-----------------|
| MongoDB cluster   | Same cluster, **different DB** (`tg-manager` vs `erogram`) | Create new MongoDB Atlas cluster, update `MONGODB_URI` |
| Cloudflare R2     | Same bucket, namespaced under `tgempire/` prefix | Create new R2 bucket, set `R2_NAMESPACE=` (empty), migrate files |
| Vercel account    | Same Vercel account, **separate project** | Move to new Vercel account if needed |
| Domain            | Subdomain of `erogram.pro` | Buy `tgempire.com`, add as custom domain in Vercel |

---

## Environment Variables Reference

All env vars are documented in `.env.example`. Here's what each group does:

### Core (required)
- `ADMIN_PASSWORD` — Dashboard login password
- `TELEGRAM_BOT_TOKEN` — Main bot for posting to channels (EroGroupManager)
- `MONGODB_URI` — TGempire's own database (`tg-manager`)
- `CRON_SECRET` — Authenticates Vercel Cron requests

### Media Storage (required)
- `R2_*` — Cloudflare R2 credentials for media uploads
- `R2_NAMESPACE` — Set to `tgempire` while sharing a bucket; set to empty string `""` when TGempire has its own bucket

### Ecosystem Bots (optional — can be removed when standalone)
- `EROGRAM_NOTIFY_BOT_TOKEN` — Bot that posts to @erogrampro
- `EROGRAM_PLUS_BOT_TOKEN` / `EROGRAM_PLUS_CHANNEL_ID` — Erogram Plus VIP channel
- `TALKSTRANGER_BOT_TOKEN` — TalkWithaStrangerBot status monitoring
- `CONFESSION_BOT_TOKEN` — Plus18ConfessionsBot status monitoring

### Erogram.pro Bridge (optional — remove when standalone)
- `EROGRAM_MONGODB_URI` — Read-only connection to erogram.pro's DB for the Ecosystem page KPIs. When you go standalone, remove this and the Ecosystem page will simply skip the website KPIs section.

---

## Step-by-Step: Going Fully Standalone

### 1. MongoDB
```
1. Create a new MongoDB Atlas cluster (free tier works)
2. Create a database called `tg-manager`
3. Export data from current cluster:
   mongodump --uri="<current_MONGODB_URI>" --db=tg-manager --out=./backup
4. Import into new cluster:
   mongorestore --uri="<new_MONGODB_URI>" --db=tg-manager ./backup/tg-manager
5. Update MONGODB_URI in Vercel env vars
6. Remove EROGRAM_MONGODB_URI (or leave empty)
```

### 2. Cloudflare R2
```
1. Create a new R2 bucket in your own Cloudflare account
2. Copy files from old bucket's tgempire/ prefix to new bucket root:
   - Use rclone or the R2 dashboard
3. Update all R2_* env vars to point to new bucket
4. Set R2_NAMESPACE= (empty string — no prefix needed anymore)
5. Update R2_PUBLIC_URL to new bucket's public URL
```

### 3. Domain
```
1. Buy tgempire.com (or whatever domain)
2. In Vercel project → Settings → Domains → Add tgempire.com
3. Add DNS records as Vercel instructs (A record or CNAME)
4. Optionally remove tgempire.erogram.pro after transition
```

### 4. Vercel Account
```
1. Transfer the Vercel project to a new account, OR
2. Create new Vercel project from the same GitHub repo
3. Re-add all env vars
4. Vercel Cron jobs are defined in vercel.json — they auto-configure on deploy
```

### 5. Remove Erogram Dependencies
These files/sections reference Erogram and can be cleaned up:
- `app/api/ecosystem/route.ts` — Remove the `getEroConnection()` section
- `app/(dashboard)/ecosystem/page.tsx` — Remove the "Erogram.pro Website" KPI section
- `.env.local` — Remove `EROGRAM_MONGODB_URI`, `EROGRAM_NOTIFY_BOT_TOKEN`, `EROGRAM_PLUS_BOT_TOKEN`
- `components/Sidebar.tsx` — Optionally remove the Ecosystem nav link if no longer needed

---

## Cron Jobs

Defined in `vercel.json`:

| Path | Schedule | Purpose |
|------|----------|---------|
| `/api/cron/post` | Every 30 min | Checks DB schedules, fires posts when due |
| `/api/cron/stats` | Daily at 8am UTC | Snapshots member counts for growth charts |

Both are protected by `CRON_SECRET` (Vercel sets `Authorization: Bearer <secret>` automatically).

---

## Database Collections (tg-manager DB)

| Collection | Purpose |
|------------|---------|
| `tggroups` | Telegram channels/groups managed by TGempire |
| `tgtemplates` | Post templates (text, buttons, media) |
| `tgschedules` | Automated posting schedules |
| `tgpostlogs` | History of every post sent |
| `tgstats` | Daily member count snapshots for growth charts |
| `tgsettings` | Global settings |

---

## Bot Tokens Inventory

| Bot | Purpose | Env Var |
|-----|---------|---------|
| EroGroupManager | Posts to adult channels | `TELEGRAM_BOT_TOKEN` |
| Erogram Notify | Posts to @erogrampro | `EROGRAM_NOTIFY_BOT_TOKEN` |
| Erogram Plus | Posts to VIP channel | `EROGRAM_PLUS_BOT_TOKEN` |
| TalkWithaStranger | Omegle-like chat (monitored only) | `TALKSTRANGER_BOT_TOKEN` |
| Plus18Confessions | Confession moderation (monitored only) | `CONFESSION_BOT_TOKEN` |

Note: TalkWithaStranger and Plus18Confessions are only monitored for online status.
Their actual bot code is not part of TGempire — it needs to run on a separate server.
