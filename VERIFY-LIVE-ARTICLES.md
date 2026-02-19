# Verify: Same DB and code for local vs live articles

If articles show **locally** but **not on live**, the app is reading from a **different database** on Vercel than the one you use locally. This checklist confirms they are the same.

---

## 1. Same MongoDB database (Atlas)

The app uses **one** env var: `MONGODB_URI`. The **database name** is inside the URI:

- Format: `mongodb+srv://USER:PASS@CLUSTER.mongodb.net/DATABASE_NAME?options`
- The part that matters for “which DB”: **`/DATABASE_NAME`** (e.g. `erogram`).

**Check:**

1. Open **.env.local** and copy the value of `MONGODB_URI`.
2. In that URI, find the **database name** (the path after the host, before `?`).
   - Example: `...mongodb.net/erogram?retryWrites...` → database name is **`erogram`**.
3. In **MongoDB Atlas** → your cluster → **Browse Collections**.
4. Confirm you have a database with that **exact** name (e.g. `erogram`).
5. Open that database → confirm there is a collection named **`articles`** with your 25 documents.

If the name in the URI is different from the database you restored (e.g. URI says `erogram-prod` but you restored into `erogram`), they are **different databases**. Fix by either:
- Changing the URI to use the database you restored into, or  
- Running the restore script against the database name that the URI uses.

---

## 2. Vercel uses the EXACT same URI

**Check:**

1. **Vercel** → your project → **Settings** → **Environment Variables**.
2. Find **`MONGODB_URI`**.
3. Compare **character-by-character** with the value in **.env.local** (same cluster host, same database name, same user/password).  
   - If it’s different (e.g. old URI, different DB name, or missing), **update it** to match .env.local exactly.
4. **Redeploy** after changing env (Deployments → … → Redeploy).

Vercel does **not** read your .env.local. The only way the live site uses the same DB as local is if `MONGODB_URI` on Vercel is the **exact same** string.

---

## 3. What the live app actually sees (debug API)

After deploying, open in the browser:

**`https://erogram.pro/api/debug/articles-count`**

You should see JSON like:

```json
{
  "ok": true,
  "dbName": "erogram",
  "articleCount": 25,
  "uriSet": true,
  "uriHost": "cluster0.dlph1wf.mongodb.net"
}
```

- **`dbName`** = database the live app is connected to (must match the one in your URI and in Atlas).
- **`articleCount`** = number of documents in the `articles` collection that the live app sees.
- **`uriSet`** = whether `MONGODB_URI` is set on Vercel.
- **`uriHost`** = MongoDB host in use (e.g. `cluster0.xxx.mongodb.net` for Atlas). If you see a numeric IP like `89.192.46.214`, the app is using the old VPS URI.

If `articleCount` is **0** or **`ok` is false**, the live app is either:
- using a different database (check `dbName` vs Atlas),
- or the `articles` collection in that DB is empty (restore into that DB or fix the URI).

Compare with local: run the app locally and open **`http://localhost:3000/api/debug/articles-count`**.  
Local and live should show the **same `dbName`** and the **same `articleCount`** (e.g. 25) if they use the same DB.

---

## 4. Same code (GitHub = Vercel)

**Check:**

1. Your **local** repo is the one you push to GitHub (e.g. `acquiretoscale/erogram`).
2. **Vercel** is connected to that repo and deploys from **main** (or your chosen branch).
3. No uncommitted changes that affect articles or DB:
   - From project root:  
     `git status`  
     If `app/articles/page.tsx`, `lib/db/mongodb.ts`, or `lib/models/index.ts` are modified but not committed, push them so Vercel builds the same code.

So: **same repo, same branch, same env** → same DB and same code on live.

---

## 5. Quick recap

| What must match | Local | Live (Vercel) |
|-----------------|--------|----------------|
| **MONGODB_URI** | .env.local | Vercel → Settings → Environment Variables |
| **Database name** | In URI (e.g. `erogram`) | Same as in URI |
| **Collection** | `articles` (from Article model) | Same |
| **Code** | Your repo | Same branch deployed on Vercel |

If **all** of the above match, the result will be the same: articles will show on live. If any one is different (especially URI or database name), local and live will see different data.

Use **`/api/debug/articles-count`** on both local and live to confirm they report the same `dbName` and `articleCount`. The response also includes **`uriHost`** (the MongoDB host the app is using). If you see `uriHost: "89.192.46.214"` or another VPS IP, the app is still using the old URI — fix `MONGODB_URI` on Vercel and redeploy.

---

## 6. "Connection to 89.192.46.214:27017 timed out" (Admin shows 0 articles)

That message means the **live** app is trying to connect to the **old VPS** IP. The codebase has **no** reference to that IP — the URI comes only from **Vercel’s `MONGODB_URI`**. So either:

1. **`MONGODB_URI` on Vercel is still the VPS URI** for the deployment that serves the admin (or for Production). Fix: set `MONGODB_URI` to your **Atlas** URI (same as .env.local) for **Production** (and Preview if you use it). Save, then redeploy.
2. **An old deployment is still in use.** Fix: **Deployments** → open the **⋮** menu on the latest deployment → **Redeploy** → enable **Clear cache and redeploy**, then confirm. Ensure the **production domain** is assigned to this new deployment.

After redeploying, open **`https://erogram.pro/api/debug/articles-count`** and check **`uriHost`**. It should be your Atlas host (e.g. `cluster0.dlph1wf.mongodb.net`), not `89.192.46.214`. Then the admin Articles tab and the public articles page will use Atlas and show the 25 articles.
