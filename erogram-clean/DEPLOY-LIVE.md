# Deploy Erogram Live (Very Easy Guide)

Use **Vercel** (free) + your **Namecheap** domain. No server to manage.

---

## Part 1: Get a free MongoDB database (5 min)

Your site needs a database. MongoDB Atlas is free.

1. Go to **https://www.mongodb.com/cloud/atlas** and sign up (free).
2. Create a **free cluster** (M0, leave region as default). Click **Create**.
3. Create a database user:
   - **Database Access** → **Add New Database User**
   - Username: `erogram` (or any name)
   - Password: create one and **save it somewhere safe**
   - Click **Add User**
4. Allow network access:
   - **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (0.0.0.0/0) → **Confirm**
5. Get your connection string:
   - **Database** → **Connect** → **Connect your application**
   - Copy the connection string. It looks like:  
     `mongodb+srv://erogram:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   - Replace `YOUR_PASSWORD` with the password you created (and if the password has special characters like `@`, encode them in URL format, e.g. `@` → `%40`).
   - Replace the `?retryWrites=...` part with:  
     `?retryWrites=true&w=majority`  
     and add your database name before the `?`:  
     `mongodb+srv://erogram:PASSWORD@cluster0.xxxxx.mongodb.net/erogram?retryWrites=true&w=majority`  
     (use `erogram` or any name as the database name)

**Save this full connection string** — you’ll paste it into Vercel later.

---

## Part 2: Put your code on GitHub (5 min)

1. Create an account at **https://github.com** if you don’t have one.
2. Create a **new repository**:
   - Click **New** (or **+** → **New repository**)
   - Name: `erogram` (or anything)
   - Set to **Private** if you prefer
   - Do **not** check “Add a README”
   - Click **Create repository**
3. On your computer, open **Terminal** (Mac) or **Command Prompt** (Windows).
4. Go to your project folder and run (replace `YOUR_USERNAME` and `erogram` with your GitHub username and repo name):

   ```bash
   cd /Users/themaf/Downloads/EROGRAM/erogram-v2
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/erogram.git
   git push -u origin main
   ```

   When asked, log in with your GitHub username and a **Personal Access Token** (not your normal password).  
   To create a token: GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Generate new token**. Give it “repo” scope.

---

## Part 3: Deploy on Vercel (5 min)

1. Go to **https://vercel.com** and sign up (use **Continue with GitHub**).
2. Click **Add New…** → **Project**.
3. **Import** your `erogram` repository. Click **Import**.
4. **Before** clicking Deploy, open **Environment Variables** and add these:

   | Name | Value |
   |------|--------|
   | `MONGODB_URI` | Your full MongoDB connection string from Part 1 |
   | `NEXT_PUBLIC_SITE_URL` | `https://yourdomain.com` (your real domain, e.g. erogram.pro) |
   | `JWT_SECRET` | Any long random string (e.g. 32+ random letters/numbers) |
   | `NEXTAUTH_URL` | Same as `NEXT_PUBLIC_SITE_URL` |
   | `NEXTAUTH_SECRET` | Another long random string |

   For `NEXT_PUBLIC_SITE_URL` and `NEXTAUTH_URL`, use your actual domain (e.g. `https://erogram.pro`).

5. Click **Deploy**. Wait 2–3 minutes. You’ll get a URL like `erogram-xxx.vercel.app` — the site works there first.

---

## Part 4: Connect your Namecheap domain (5 min)

1. In Vercel: open your project → **Settings** → **Domains**.
2. Enter your domain (e.g. `erogram.pro` or `www.erogram.pro`) and click **Add**.
3. Vercel will show you what to add at Namecheap. Usually:
   - **For root domain (erogram.pro):**
     - Type: **A Record**
     - Host: **@**
     - Value: **76.76.21.21** (Vercel’s IP — confirm in Vercel’s Domains page)
   - **For www (www.erogram.pro):**
     - Type: **CNAME**
     - Host: **www**
     - Value: **cname.vercel-dns.com** (confirm in Vercel)
4. In **Namecheap**:
   - Log in → **Domain List** → click **Manage** next to your domain.
   - Go to **Advanced DNS**.
   - Add the **A** and **CNAME** records exactly as Vercel shows (Host, Value, and type).
   - Remove any old A or CNAME records that conflict (e.g. old “URL Redirect” or duplicate A record for @).
5. Save. DNS can take from a few minutes up to 24–48 hours. Vercel will show a checkmark when the domain is connected and SSL is active.

---

## Part 5: First-time setup (database)

After the first deploy, your app and MongoDB are empty. You need to create your admin user and (optionally) seed data.

1. **Create admin user (from your computer, one time)**  
   In your project folder, create a `.env.local` with the **same** `MONGODB_URI` you used in Vercel, then run:

   ```bash
   cd /Users/themaf/Downloads/EROGRAM/erogram-v2
   npx tsx scripts/create-admin.ts Admin jepasse
   ```

   Use the same username/password you want for production. After this, you can log in on the live site.

2. **Optional:** Add categories/countries or seed data via your app’s admin panel or scripts, if you have any.

---

## Checklist

- [ ] MongoDB Atlas cluster created, user created, connection string saved
- [ ] Code pushed to GitHub
- [ ] Vercel project created, env vars added, deploy successful
- [ ] Domain added in Vercel, DNS records added in Namecheap
- [ ] Admin user created with `create-admin.ts`
- [ ] Logged in at https://yourdomain.com/login and checked admin panel

---

## If something goes wrong

- **Site shows “Application error”:** Check Vercel **Functions** or **Logs** tab; usually `MONGODB_URI` wrong or not set.
- **Domain not working:** Wait up to 24h for DNS; double-check A/CNAME in Namecheap match Vercel exactly (Host, Type, Value).
- **Can’t push to GitHub:** Make sure you use a Personal Access Token, not your GitHub password, when Terminal asks for a password.
- **Login 401:** Ensure `JWT_SECRET` and `NEXTAUTH_SECRET` are set in Vercel and that you created the admin user with `create-admin.ts` using the same MongoDB.

---

**You’re done.** Your site is live at your domain, with free hosting (Vercel) and a free database (MongoDB Atlas). Updates: push to GitHub and Vercel will auto-redeploy.
