# Missing images – beginner guide

Two phases:

- **Phase 1 (now):** Fetch images **locally** so you can check everything.
- **Phase 2 (when you’re ready):** Upload the same images to the **live** site.

---

## Phase 1 – Fetch images locally

Goal: use the “missing images” folder to fill in missing group/bot images in **your local (or dev) database**, so you can test the site locally.

### 1. Check the “missing images” folder

It should be next to the `erogram-v2` folder, like this:

```
@EROGRAM/
  missing images/
    groups/   (lots of .jpg, .png, etc.)
    bots/
    adverts/
  erogram-v2/
```

If your folder is somewhere else, you’ll pass its path in step 3.

### 2. Check your local env

In `erogram-v2` you should have a file **`.env.local`** with at least:

- `MONGODB_URI` – your **local or dev** MongoDB connection string (not production yet).
- R2: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL`  
  (and optionally `R2_BUCKET_NAME`).

For Phase 1, these should point to a database and bucket you’re happy to use for testing (e.g. a copy of the DB or a dev cluster).

### 3. Run the script locally

Open a terminal, go to the project, then run:

```bash
cd erogram-v2
```

**Optional – preview only (no changes):**

```bash
npm run fetch-missing-images:dry
```

This only prints what *would* be updated (no uploads, no database changes).

**Apply images locally:**

```bash
npm run fetch-missing-images
```

If your “missing images” folder is in a different path:

```bash
node --env-file=.env.local scripts/fetch-missing-images.mjs --dir="/full/path/to/missing images"
```

When it finishes, your **local/dev** MongoDB will have the new image URLs, and the images will be in R2. You can run the app locally (`npm run dev`) and check that the right images show for groups/bots.

---

## Phase 2 – Upload to live website (only when you say so)

When you’ve fixed the details you want and you’re ready to update the **live** site:

1. **Back up** your production database (optional but recommended).
2. Use **production** env (production `MONGODB_URI` and production R2).
3. Run the **same** script with that env, for example:

   ```bash
   node --env-file=.env.production.local scripts/fetch-missing-images.mjs
   ```

   (You’ll create `.env.production.local` with production MongoDB and R2 values when we do Phase 2.)

4. No need to redeploy on Vercel; the live app will read the updated image URLs from the database.

---

## Summary

| Phase | When        | What you run                          | What gets updated        |
|-------|-------------|----------------------------------------|---------------------------|
| **1** | Now         | `npm run fetch-missing-images` (with `.env.local`) | Local/dev DB + R2        |
| **2** | When you say | Same script with production env       | Live DB + R2 (live site) |

You’re only doing Phase 1 for now; we’ll do Phase 2 when you tell us to upload to the live website.
