# Hub Sales Dashboard (Vercel)

Single-page sales dashboard: Finance-approved revenue by salesperson and customer, target vs actual, Excel import and export.

## Files

| File | What it does |
|---|---|
| `index.html` | The app (Dashboard, Submit sales, Finance review, Targets & team) |
| `shim.js` | Data and download layer: talks to `/api/db`, refreshes every 15 seconds, shows the password screen |
| `api/db.js` | Vercel serverless function that stores data in Upstash Redis |
| `vercel.json` | Security and no-cache headers |

No build step and no npm dependencies.

## Deploy (about 10 minutes)

1. **Put the files in GitHub.** Open https://github.com/peiyulim/huatahh, go to **Add file → Upload files**, drag in everything from this folder (including the `api` folder) and commit to `main`.
2. **Import into Vercel.** Go to vercel.com → **Add New → Project** → import `huatahh`. Framework preset: **Other**. Leave the build settings empty. Click **Deploy**.
3. **Add storage.** In the project, open **Storage** → **Create Database** → **Upstash for Redis** (free tier is enough), and connect it to this project. Vercel adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` for you.
4. **Set the team password.** Go to **Settings → Environment Variables** and add `APP_PASSWORD` with a password you share with the team. Without it, anyone who finds the URL can see and change figures.
5. **Redeploy.** Go to **Deployments** → the latest one → **⋯ → Redeploy**, so the new variables take effect.

Open the URL, enter the password (each browser remembers it), go to **Targets & team**, and add your salespeople.

## Troubleshooting

Open `https://<your-site>.vercel.app/api/db?check=1`. It shows setup status only, never data or secrets.

| You see | Fix |
|---|---|
| `"storageConnected": false` | Storage → connect Upstash for Redis to this project → Redeploy |
| `"storageWorking": false` | Upstash database is paused or deleted. Check it under Storage, then Redeploy |
| `"passwordSet": false` | Add `APP_PASSWORD` under Settings → Environment Variables → Redeploy |
| A 404 page | The `api` folder didn't reach GitHub. Upload `api/db.js` and redeploy |

When a save fails, a red bar at the top of the app shows the exact reason.

## Notes

- The app starts empty. Data from the claude.ai version is not copied over.
- Everyone with the password can use every tab, including Finance approval.
- To change the password, edit `APP_PASSWORD` and redeploy. Everyone will be asked to enter the new one.
- The Excel library loads from cdnjs.cloudflare.com, so browsers need internet access to that site.
