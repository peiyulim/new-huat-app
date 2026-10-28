# Hub Sales Dashboard (local storage version)

Single-page sales dashboard: approved revenue by salesperson and customer, target vs actual, Excel import and export.

**All data is saved in the browser (localStorage) on the computer you use it on.** There is no server, database or password.

## Files

| File | What it does |
|---|---|
| `index.html` | The whole app, including the data layer that saves to this browser's localStorage, plus backup and restore |
| `vercel.json` | Security headers |

It's a static site with no build step and no dependencies. You can also double-click `index.html` to use it straight from your computer. That copy has its own separate data, apart from the website.

## Deploy

1. Upload the files in this folder to the **top level** of the GitHub repo using **Add file → Upload files**, then commit to `main`. `index.html` must sit at the top of the repo, not inside a subfolder. If you uploaded an older version, delete the old `shim.js` and `api` folder from the repo.
2. In Vercel, go to **Add New → Project**, import the repo, choose the **Other** preset, leave the build settings empty and click **Deploy**.

No storage or environment variables are needed. If an older version of this project had Upstash storage or `APP_PASSWORD` set up, they're no longer used and can be removed.

## Important: how local storage behaves

- **One browser, one copy.** Data entered in Chrome on your laptop isn't visible in Edge, on another computer, or to anyone else.
- **Keep using the same URL.** Data belongs to the exact web address. Vercel preview URLs, such as `…-git-main-….vercel.app`, have separate, empty data. Bookmark the main production URL and always use that.
- **Clearing browsing data deletes it.** So does a private or incognito window, which also forgets everything when it's closed.
- **Back up regularly.** Go to **Targets & team → Backup → Download backup** to save a `.json` file with everything: entries, approvals, salespeople and targets. Use **Restore from backup** to load it on another computer or browser. Restoring replaces what's currently there.
- The dashboard's Excel export is a report, not a full backup. Use the `.json` backup to move or restore data.

## Notes

- Several tabs of the app open in the same browser stay in sync.
- The Excel library loads from cdnjs.cloudflare.com, so Excel import and export need internet access to that site.
