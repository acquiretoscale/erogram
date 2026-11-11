# Erogram → DigitalOcean migration (Phase 0 checklist)

**Server:** `146.190.137.231` (4 GB, SF) — shared with slutbot  
**Live today:** Vercel (`server: Vercel` on erogramx.com)  
**Target ports:** slutbot `3940`, erogram `3941`  
**Crons:** OFF until post-migration (separate project)

---

## Golden rules

- [ ] Vercel stays live until staging tests pass
- [ ] DNS cutover is LAST (not first)
- [ ] No SEO/sitemap/middleware code changes during migration
- [ ] Webhooks must use **erogramx.com** (never erogramx.com — Telegram ignores 308)
- [ ] Re-run `scripts/setup-payment-webhook.ts` after DNS cutover

---

## A. Domains & DNS (confirm before cutover)

| Domain | Role | Current | After cutover |
|--------|------|---------|---------------|
| erogramx.com | Production | Vercel | A → `146.190.137.231` |
| www.erogramx.com | Production | Vercel | A or CNAME → same |
| erogramx.com | Legacy 308 → .x | Vercel redirect | nginx 308 → erogramx.com |
| www.erogramx.com | Legacy | Vercel redirect | nginx 308 → erogramx.com |

- [ ] Know where DNS is managed (Namecheap / Cloudflare / etc.)
- [ ] nginx: erogramx.com → 308 erogramx.com (copy vercel.json behavior)
- [ ] SSL certbot for all four hostnames after DNS

**Staging (recommended):**
- [ ] `staging.erogramx.com` → `146.190.137.231` (test before production DNS)

---

## B. Environment variables (production `.env` on server)

Source: **Vercel dashboard → Erogram project → Settings → Environment Variables**  
(Local `.env.local` is incomplete — missing Google OAuth + CRON_SECRET.)

### Required — site won't work without these

- [ ] `MONGODB_URI`
- [ ] `JWT_SECRET` (must match production exactly or all users logged out)
- [ ] `NEXT_PUBLIC_SITE_URL=https://erogramx.com`

### Required — auth

- [ ] `GOOGLE_CLIENT_ID` ⚠️ not in local .env.local — get from Vercel
- [ ] `GOOGLE_CLIENT_SECRET` ⚠️ get from Vercel

### Required — Telegram Stars + login (@erogramvipbot)

- [ ] `TELEGRAM_PAYMENT_BOT_TOKEN`
- [ ] `TELEGRAM_WEBHOOK_SECRET`
- [ ] Webhook live today: `https://erogramx.com/api/payments/webhook` ✓

### Required — channel notifications (publish-scheduled, later)

- [ ] `TELEGRAM_BOT_TOKEN` (may differ from payment bot)
- [ ] `TELEGRAM_CHANNEL_ID`

### Required — crypto (if used)

- [ ] `NOWPAYMENTS_API_KEY`
- [ ] `NOWPAYMENTS_IPN_SECRET`
- [ ] NOWPayments dashboard IPN URL = `https://erogramx.com/api/payments/nowpayments/webhook`

### Required — R2 images

- [ ] `R2_ACCOUNT_ID`
- [ ] `R2_ACCESS_KEY_ID`
- [ ] `R2_SECRET_ACCESS_KEY`
- [ ] `R2_BUCKET_NAME` (typically `erogramimages`)
- [ ] `R2_PUBLIC_URL`
- [ ] `NEXT_PUBLIC_R2_PUBLIC_URL` / `NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL` if set in Vercel

### Post-migration — crons (Phase 6, not now)

- [ ] `CRON_SECRET` ⚠️ likely never set on Vercel — generate new for VPS

### Optional / feature flags

- [ ] `RESEND_API_KEY`, `CONTACT_EMAIL`, `SMTP_*`, `MAIL_FROM`
- [ ] `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `ADMIN_TELEGRAM_CHAT_ID`
- [ ] `QWEN_API_KEY`, `DEEPSEEK_API_KEY`, `WAVESPEED_API_KEY`
- [ ] `APIFY_SUBMIT_TOKEN`, `ADVERTISE_PASSWORD`, `TGEMPIRE_PUBLIC_URL`
- [ ] `EROGRAM_PLUS_TOKEN`, `EROGRAM_PLUS_CHANNEL_ID`

---

## C. External consoles (verify URLs, do not change until cutover)

### Google Cloud Console

Authorized redirect URIs must include:

- [ ] `https://erogramx.com/api/auth/google/callback`
- [ ] `https://www.erogramx.com/api/auth/google/callback`
- [ ] `https://erogramx.com/api/auth/google/callback` (legacy traffic)
- [ ] `https://www.erogramx.com/api/auth/google/callback`

### Telegram @BotFather

- [ ] `/setdomain` for `@erogramvipbot` → `erogramx.com`
- [ ] After cutover: webhook = `https://erogramx.com/api/payments/webhook` (run setup script)

### NOWPayments dashboard

- [ ] IPN callback = `https://erogramx.com/api/payments/nowpayments/webhook`
- [ ] IPN secret matches `NOWPAYMENTS_IPN_SECRET`

### MongoDB Atlas

- [ ] Allow VPS IP `146.190.137.231` (or keep 0.0.0.0/0)

### Cloudflare R2

- [ ] CORS allows erogramx.com (script: `scripts/setup-r2-cors.js`)

---

## D. Slutbot coexistence (same server)

| Item | Value |
|------|--------|
| Slutbot | port 3940, `theaislut_bot`, aislutbot.com webhook |
| Erogram | port 3941, `@erogramvipbot`, erogramx.com webhook |
| Separate bots | Do not cross-wire webhook URLs |

- [ ] After Erogram cutover, re-verify slutbot webhook still `aislutbot.com`
- [ ] Slutbot `EROGRAM_PAYMENTS_WEBHOOK_URL` should point to `https://erogramx.com/api/payments/webhook` if shared-bot forwarding used

---

## E. Phase 1–4 execution order (after checklist approved)

1. **Phase 1:** Clone `github.com/acquiretoscale/erogram.git` → `~/erogram`, upload production `.env`, build, PM2 port 3941 — **Vercel still live**
2. **Phase 2:** Test via `staging.erogramx.com` — Google login, Telegram login, Stars payment (smallest pack), homepage
3. **Phase 3:** Pre-cutover rollback plan written (DNS back to Vercel)
4. **Phase 4:** DNS erogramx.com + erogramx.com → VPS, certbot, `setup-payment-webhook.ts`, smoke tests
5. **Phase 5:** Monitor MongoDB logins + **paid** (not pending) for 48h
6. **Phase 6:** Crons + mass DM project (separate)

---

## F. Rollback (if anything breaks)

1. Point erogramx.com DNS back to Vercel
2. Run `setup-payment-webhook.ts` from Vercel-side or ensure webhook hits Vercel again
3. Wait 15–30 min propagation
4. Vercel project stays deployed — do not delete until stable 48h on VPS

---

## Phase 0 blockers found

1. **Vercel CLI** cannot pull Erogram env (project not linked / team fair-use block on link). **Action:** export env manually from Vercel dashboard.
2. **Local `.env.local`** missing `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CRON_SECRET`, `TELEGRAM_CHANNEL_ID` — production values must come from Vercel.
3. **Crons** never ran on Vercel (`CRON_SECRET` likely unset) — intentional defer to Phase 6.

---

**Owner approval:** [ ] Checklist reviewed — proceed to Phase 1
