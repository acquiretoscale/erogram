# Erogram v2 – Deploy to production

This is the right order. Follow these steps.

---

## 1. GitHub

- Create a GitHub account (if you don’t have one).
- Create a **new repository** (e.g. `erogram-v2`). Do **not** initialize with README if you already have code.
- In your project folder:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

---

## 2. Vercel (hosting)

- Sign up at [vercel.com](https://vercel.com) (GitHub login is easiest).
- **New Project** → **Import** your GitHub repo.
- Vercel will detect Next.js. Keep the default settings (Root: `.`, Build: `next build`).
- **Do not deploy yet.** Add environment variables first (step 4), then deploy.

---

## 3. MongoDB Atlas (database)

You don’t “upload” a database file. Atlas is a **cloud database**: your app connects to it with a URL.

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and create an account.
2. Create a **cluster** (free tier is enough).
3. **Database Access** → Add a user (username + password). Save the password.
4. **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`) so Vercel can connect.
5. **Database** → **Connect** → **Drivers** → copy the connection string. It looks like:
   ```text
   mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Replace `<password>` with your real password (special characters URL-encoded if needed).
6. (Optional) If you have **existing data** in a local MongoDB:
   - **Export:** `mongodump --uri="mongodb://localhost:27017/yourdb" --out=./backup`
   - **Import into Atlas:** use Atlas UI **Import** or `mongorestore` with your Atlas connection string.

In Vercel you’ll add this as `MONGODB_URI` (see step 4).

---

## 4. Environment variables (Vercel)

In your Vercel project: **Settings** → **Environment Variables**. Add:

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | Atlas connection string from step 3. |
| `JWT_SECRET` | Yes (prod) | Long random string for auth (e.g. `openssl rand -base64 32`). |
| `NEXT_PUBLIC_SITE_URL` | Yes (prod) | Your live URL, e.g. `https://yourdomain.com`. |
| `TELEGRAM_BOT_TOKEN` | Optional | Bot token if you use Telegram login/notifications. |
| `TELEGRAM_CHANNEL_ID` | Optional | Channel for notifications. |
| `EROGRAM_PLUS_TOKEN` / `EROGRAM_PLUS_CHANNEL_ID` | Optional | If you use Erogram Plus features. |

Then trigger a **redeploy** (Deployments → ⋮ → Redeploy) so the new env vars are used.

---

## 5. Custom domain (Namecheap → Vercel)

1. In **Vercel**: Project → **Settings** → **Domains** → add your domain (e.g. `erogram.pro` or `www.erogram.pro`).
2. Vercel will show you what to set at your registrar (e.g. **CNAME** or **A** record).
3. In **Namecheap**: **Domain List** → **Manage** for your domain → **Advanced DNS**.
   - For **root** (`erogram.pro`): add an **A Record** with Vercel’s IP (e.g. `76.76.21.21`) or use their **ALIAS**/flattening if Namecheap supports it.
   - For **www** (`www.erogram.pro`): add a **CNAME** record: `www` → `cname.vercel-dns.com` (or the host Vercel gives you).
4. Save. SSL is automatic on Vercel; propagation can take up to 48 hours (often minutes).
5. Set `NEXT_PUBLIC_SITE_URL` to your final URL (e.g. `https://erogram.pro`) and redeploy if you didn’t already.

---

## Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel project created and connected to repo
- [ ] MongoDB Atlas cluster + user + connection string
- [ ] Atlas Network Access allows `0.0.0.0/0` (or Vercel IPs if you lock it down later)
- [ ] All env vars set in Vercel (at least `MONGODB_URI`, `JWT_SECRET`, `NEXT_PUBLIC_SITE_URL`)
- [ ] First deploy successful on `*.vercel.app`
- [ ] Domain added in Vercel and DNS set at Namecheap
- [ ] Site loads on your domain over HTTPS
