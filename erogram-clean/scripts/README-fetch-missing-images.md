# Fetch missing images (R2 + MongoDB)

Script: **`scripts/fetch-missing-images.mjs`**

Matches groups, bots, and adverts that have a **missing or placeholder image** to image files in the **"missing images"** folder (from the previous owner), uploads them to **Cloudflare R2**, and updates **MongoDB** with the new image URL.

## Prerequisites

- **"missing images"** folder with subfolders `groups/`, `bots/`, `adverts/` (each containing image files named like slugs, e.g. `ai-nsfw.jpg`, `the-dungeon.png`).
- Default location: parent of `erogram-v2`, i.e. `../missing images` when run from project root.
- Env in `.env.local`: `MONGODB_URI`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL` (and optionally `R2_BUCKET_NAME`).

## Run locally (e.g. dev DB)

```bash
cd erogram-v2
npm run fetch-missing-images
```

Or with a custom folder and dry-run (preview only, no uploads or DB changes):

```bash
node --env-file=.env.local scripts/fetch-missing-images.mjs --dir="/path/to/missing images" --dry-run
```

## Update the **live** website

When you are ready to apply the same images to production:

1. **Back up** your production MongoDB (optional but recommended).
2. Use env that points to **production** MongoDB and **production** R2 (same bucket or a production bucket).
   - Either copy production values into `.env.local` temporarily and run:
     ```bash
     npm run fetch-missing-images
     ```
   - Or create `.env.production.local` with production `MONGODB_URI` and R2 vars, then:
     ```bash
     node --env-file=.env.production.local scripts/fetch-missing-images.mjs
     ```
3. The script will upload images to R2 and update **only** documents that currently have a missing/placeholder image. The live site will then show the new images (no Vercel redeploy needed).

## Matching rules

- Documents with no `image`, empty `image`, `image: '/assets/image.jpg'`, or `image` not starting with `https://` are considered **missing**.
- For each such document, the script uses its **slug** (e.g. `ai-nsfw-18`, `hot-skinny-stunners`).
- **1) Manual mapping** – If `scripts/missing-images-mapping.json` exists, it can map `slug -> filename` (e.g. `"private-uncensored": "beurette-uncensored.jpg"`) so a group gets an image even when no file in the folder has that slug name.
- **2) Automatic match** – Otherwise the script looks in `missing images/groups/` (or `bots/`, `adverts/`) for a file where: name (without extension) **equals** the slug, or **slug starts with** that name (e.g. `ai-nsfw.jpg` for slug `ai-nsfw-18`), or **name starts with** slug (e.g. `nsfw-collection-1.webp` for slug `nsfw-collection`).
- **3) Advert fallback (groups and bots only)** – If still no match, the script uses images from **`missing images/adverts/`** one by one. Each advert image is used **at most once** (shared pool across groups then bots). Only documents that have no image and could not be matched get a fallback.
- The file is uploaded to R2 as `groups/<slug>.<ext>` and the document’s `image` is set to the R2 URL.

## If a group still has no image

Some groups (e.g. **Private & Uncensored**, **Play Without Limits**, **Pandora's Boxxx**, **@nudesanna**) have **no file in the folder** with a matching name. You can either:

1. **Add images** – Put a image in `missing images/groups/` with the **exact slug** as filename (e.g. `private-uncensored.jpg`, `play-without-limits.png`), then run the script again.
2. **Use the mapping file** – Edit `scripts/missing-images-mapping.json` and map that slug to an **existing** filename in the folder (e.g. use another image as a stand-in until you have the real one). Example: `"private-uncensored": "beurette-uncensored.jpg"`.

## Where images live

- **Files**: Cloudflare R2 (bucket from `R2_BUCKET_NAME`).
- **Links**: Stored in MongoDB in each group/bot/advert’s `image` field.
- **Vercel / GitHub**: Only serve the app; they do not store these images.
