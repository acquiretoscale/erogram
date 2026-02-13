# Push this project to GitHub (acquiretoscale/Erogram)

Do these steps **in order** in the Terminal inside Cursor.

---

## Step 1: Open the Terminal

- Press **Ctrl + `** (backtick) or go to **Terminal → New Terminal**.
- Make sure the terminal is in the project folder (you should see something like `erogram-v2` in the path).

---

## Step 2: Run these commands one by one

Copy and run each line, then the next. Wait for each to finish before running the next.

```bash
git init
```

```bash
git add .
```

```bash
git commit -m "Initial commit"
```

```bash
git branch -M main
```

```bash
git remote add origin https://github.com/acquiretoscale/Erogram.git
```

```bash
git push -u origin main
```

---

## Step 3: When it asks you to sign in

When you run **`git push -u origin main`**, one of these will happen:

**A) A browser window opens**  
- Sign in to GitHub with your **acquiretoscale** account.  
- Approve access if it asks.  
- After that, the push should finish and your code will be on GitHub.

**B) It asks for username and password in the terminal**  
- **Username:** your GitHub username: `acquiretoscale`  
- **Password:** do **not** use your normal GitHub password. Use a **Personal Access Token**:

### How to create a Personal Access Token (if you need it)

1. On GitHub.com, make sure you’re logged in as **acquiretoscale**.
2. Click your profile picture (top right) → **Settings**.
3. Left sidebar, bottom: **Developer settings**.
4. **Personal access tokens** → **Tokens (classic)**.
5. **Generate new token (classic)**.
6. Name it e.g. `Cursor push`, choose an expiry (e.g. 90 days), tick **repo** (full control of private repos).
7. **Generate token** → **copy the token** (you won’t see it again).
8. When the terminal asks for a password, **paste this token** (not your GitHub password).

---

## Done

After `git push -u origin main` succeeds, refresh **https://github.com/acquiretoscale/Erogram** and you should see your project there.
