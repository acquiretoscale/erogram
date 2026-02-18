# Push to the CORRECT repo: acquiretoscale/erogram

**Correct repo (no hyphen, lowercase):** https://github.com/acquiretoscale/erogram

If Cursor keeps pushing to the wrong repo (-erogram or Erogram), use **Terminal** and the exact URL below.

---

## Option A: One command (recommended)

1. In Cursor: **Terminal → New Terminal** (or **Ctrl + `**).
2. Paste and press Enter:

```bash
cd "/Users/themaf/Desktop/@ACQUISITION/EROGRAM PROJECT /@EROGRAM/erogram-v2" && git push https://github.com/acquiretoscale/erogram.git main
```

This pushes **directly** to `erogram` (no hyphen, lowercase). It does not use Cursor’s repo link.

---

## Option B: Fix remote then push

1. Open Terminal in Cursor (Terminal → New Terminal).
2. Run these **one by one**:

```bash
cd "/Users/themaf/Desktop/@ACQUISITION/EROGRAM PROJECT /@EROGRAM/erogram-v2"
```

```bash
git remote set-url origin https://github.com/acquiretoscale/erogram.git
```

```bash
git remote -v
```

Check the output: both lines must show **erogram.git** (not -erogram, not Erogram).

```bash
git push origin main
```

---

## If it asks for login

- **Username:** your GitHub username (e.g. the one that owns acquiretoscale).
- **Password:** use a **Personal Access Token**, not your GitHub password.
  - GitHub → Settings → Developer settings → Personal access tokens → Generate new token (classic).
  - Tick **repo**, copy the token, paste it when the terminal asks for a password.

---

## Done

Open https://github.com/acquiretoscale/erogram and refresh. Your latest commit should be there.
