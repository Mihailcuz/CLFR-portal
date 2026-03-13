# CLFR Research Portal

This repository includes two versions of the CLFR Research Portal:

1. **Node.js / Express backend (server.js)**
   - Provides secure login, role-based access control, and data persistence via `data/db.json`.
   - This version requires Node.js and is intended for local development.

2. **Static SPA version (docs/)**
   - Fully client-side, works without Node.js (using `localStorage` for data persistence).
   - Designed to deploy on GitHub Pages (enable Pages and set source to `docs/`).

## Run Locally (Node.js)

```bash
cd "c:\Users\Mnatu\OneDrive\Documents\CLFR web"
npm install
npm start
```

Then visit: `http://localhost:3000`

## Run Without Node.js (Static)

You can run the portal fully client-side (no Node.js required) using the `docs/` folder.

### Option A: Open locally
Open `docs/index.html` in a modern browser.

### Option B: GitHub Pages (recommended)
1. Push this repo to GitHub.
2. In repository Settings → Pages, select **Source**: `Deploy from a branch` and set **Folder** to `docs`.
3. Your site will be published at `https://<your-org>.github.io/<repo>/`.

### Default Owner (seeded on first load)
- **Username:** `Mihail`
- **Password:** `V9!tQ4z@Lm#82pR`

## Admin Features (both versions)
- Create user accounts (user/admin)
- Disable/Delete accounts (owner cannot be disabled/deleted)
- Reset passwords (adds password reset ability for admins)
- View login history (IP stored as `local` in the static version)

---

> Note: The static version stores credentials in localStorage and is NOT suitable for real production use. It is provided for demo and GitHub Pages hosting.
