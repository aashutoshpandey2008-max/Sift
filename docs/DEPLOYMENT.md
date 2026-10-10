# GitHub + Render handoff

## 1. Check the app locally

Extract the ZIP. In VS Code, open the extracted `Sift-Live-Query-Filter` folder. The terminal must show this folder, with `package.json` directly inside it.

```powershell
npm ci
npm run check
npm test
npm start
```

Visit http://localhost:3000 and try searching, checkboxes, sorting, and pagination. Stop the app with Ctrl+C when finished.

## 2. Put the full project on GitHub

Create an empty repository named `Live-Query-Filter-System` on your GitHub account. Leave the options to add a README, license, and gitignore unchecked because this project already includes its files.

Run these commands inside the project folder:

```powershell
git init
git add .
git commit -m "Build Sift live query filter system"
git branch -M main
git remote add origin https://github.com/aashutoshpandey2008-max/Live-Query-Filter-System.git
git push -u origin main
```

The repository URL above is the intended destination for the new repository; it is not a claim that it already exists. If you choose another name or account, use the actual URL from GitHub instead.

If Git asks for an identity, set your own name and email, then retry the commit. If `origin` already exists, check `git remote -v` and use `git remote set-url origin YOUR_ACTUAL_REPOSITORY_URL` only if it points to the wrong project. Do not paste a password or token into source files.

## 3. Deploy ONE Render Web Service

In the Render Dashboard, select **New → Web Service**, connect the GitHub repository, and use:

| Setting | Value |
| --- | --- |
| Name | `sift-live-query-filter` (or an available name) |
| Runtime | Node |
| Branch | `main` |
| Root Directory | Leave blank when package.json is at the repository root |
| Build Command | `npm ci && npm run check && npm test` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| Instance type | Free, if available in your account |
| Environment variable | `NODE_VERSION` = `24.19.0` |
| Environment variable | `NODE_ENV` = `production` |

No database, `MONGO_URI`, separate frontend service, or API base URL is needed. The backend serves the frontend, and the frontend uses relative `/api/...` URLs.

Alternatively, select **New → Blueprint**, connect the same repository, and use the included `render.yaml`. Choose either the manual Web Service flow or the Blueprint flow; there is no need to create both. If you use the Render CLI, `render blueprints validate` can validate the Blueprint before applying it. CLI validation was not run when preparing this package.

## 4. Verify the deployed URL

Wait for Render to report the service as live. Copy the URL Render gives you; do not guess it from the name.

- Open the root URL: the Sift interface should appear.
- Open `/api/health`: expect `{"status":"ok","catalogSize":250}`.
- Open `/api/resources?category=Design&page=1&limit=6`: expect six records and pagination metadata.
- Check multiple categories and confirm that result totals change.
- Search `no-such-resource-xyz`: verify the empty state and clear filters.
- Reload a filtered URL and confirm its state returns.
- Test on your phone and desktop.

Render free services can require a startup wait after inactivity. If the app reports a timeout, wait briefly and use Retry. Do not interpret the startup wait alone as a broken deployment.

## Common fixes

**Cannot find package.json:** the wrong Root Directory is set, or an extra parent folder was uploaded. Point Render at the folder containing package.json.

**Blank page when opening index.html:** run `npm start` and use the local HTTP URL. ES modules and API routes need the server.

**`EADDRINUSE`:** another app is using the port. Stop it or set a different `PORT`.

**Missing Node/npm command:** install Node.js, then reopen VS Code/PowerShell.

**Only JSON is visible:** open the root URL, not `/api/resources` or `/api/health`.

**GitHub authentication prompt:** complete GitHub authentication in your own browser/credential manager.

## Official references

- https://render.com/docs/web-services
- https://render.com/docs/health-checks
- https://render.com/docs/blueprint-spec
