# One Identity Manager Web Client Deployment

This document describes how to build the One Identity Manager 9.2.2 web client packages and import them with the One Identity Software Loader.

The process is intended for DEV first. Do not deploy directly to production without a tested DEV/QS rollout.

## Goal

Build the currently checked out web client source code and create OIM-compatible ZIP packages:

```text
Html_qbm.zip
Html_qer.zip
Html_qer-app-portal.zip
...
```

These ZIP files are then imported with the One Identity Software Loader and assigned to the `Business API Server` machine role.

## Important Concept

The Git branch or tag that is checked out before running the script decides what will be packaged.

For the clean vendor version:

```powershell
cd C:\Users\RPCIA984\Desktop\Project\IdentityManager.Imx\imxweb
git checkout v9.2.2
```

For the customized version with internal changes:

```powershell
cd C:\Users\RPCIA984\Desktop\Project\IdentityManager.Imx\imxweb
git checkout v92_build
```

The script does not switch branches automatically. This is intentional, so the operator always controls which version is deployed.

## Build Script Location

The build script is available here:

```powershell
C:\Users\RPCIA984\Desktop\build-oim-web-zips.ps1
```

There is also a copy in the repository workspace:

```powershell
C:\Users\RPCIA984\Desktop\Project\IdentityManager.Imx\imxweb\build-oim-web-zips.ps1
```

Run the script from the `imxweb` workspace folder.

## Quick Start: Build All Web Packages

Open PowerShell and run:

```powershell
cd C:\Users\RPCIA984\Desktop\Project\IdentityManager.Imx\imxweb
git checkout v9.2.2
C:\Users\RPCIA984\Desktop\build-oim-web-zips.ps1
```

The script runs `npm install`, builds all configured web projects, and creates the `Html_*.zip` files.

By default, the ZIP files are written to:

```powershell
C:\oim-web-zips
```

To write the ZIP files to the Desktop instead:

```powershell
cd C:\Users\RPCIA984\Desktop\Project\IdentityManager.Imx\imxweb
C:\Users\RPCIA984\Desktop\build-oim-web-zips.ps1 -OutputDir C:\Users\RPCIA984\Desktop\oim-web-zips
```

## Faster Build Without npm install

If dependencies are already installed and unchanged, use:

```powershell
cd C:\Users\RPCIA984\Desktop\Project\IdentityManager.Imx\imxweb
C:\Users\RPCIA984\Desktop\build-oim-web-zips.ps1 -SkipInstall
```

With an explicit output directory:

```powershell
cd C:\Users\RPCIA984\Desktop\Project\IdentityManager.Imx\imxweb
C:\Users\RPCIA984\Desktop\build-oim-web-zips.ps1 -SkipInstall -OutputDir C:\Users\RPCIA984\Desktop\oim-web-zips
```

## Projects Built By The Script

The script builds the following projects in dependency order:

```text
qbm
qer
tsb
att
rms
aad
aob
uci
cpl
dpr
rmb
rps
o3t
olg
hds
pol
qer-app-portal
qbm-app-landingpage
qer-app-operationssupport
qer-app-pwdportal
custom-app
```

This creates a complete web client package set for the v92/OIM 9.2.2 web projects.

## What The Script Does

The script performs these steps:

```text
1. Check that git, npm, and Compress-Archive are available.
2. Check that package.json and angular.json exist in the current folder.
3. Show the current Git branch, tag, or commit.
4. Create the ZIP output folder.
5. Run npm install unless -SkipInstall is used.
6. Build every configured Angular library/app.
7. Create one Html_<project>.zip per dist/<project> folder.
8. Print a summary of all generated ZIP files.
```

The script uses this build command internally:

```powershell
npm run build <project>
```

For each project, the script creates the ZIP from the content of:

```text
dist\<project>\*
```

This is important. The ZIP must contain the files inside the `dist\<project>` folder, not the `dist\<project>` folder itself.

## Verify The ZIP Files

After the build, list the created ZIP files:

```powershell
Get-ChildItem C:\oim-web-zips\*.zip | Sort-Object Name
```

If you used the Desktop output directory:

```powershell
Get-ChildItem C:\Users\RPCIA984\Desktop\oim-web-zips\*.zip | Sort-Object Name
```

Check one ZIP file:

```powershell
Expand-Archive C:\oim-web-zips\Html_qer-app-portal.zip -DestinationPath C:\Temp\Html_qer-app-portal-check -Force
Get-ChildItem C:\Temp\Html_qer-app-portal-check
```

The extracted folder should directly contain files such as:

```text
index.html
main*.js
runtime*.js
polyfills*.js
assets
```

## Software Loader Import

Use the One Identity Software Loader for the import.

Recommended DEV workflow:

```text
1. Start Software Loader.
2. Connect to the DEV One Identity Manager database.
3. Select the generated Html_*.zip files.
4. Assign the machine role: Business API Server.
5. Run the import.
6. Restart or recycle the API Server IIS application pool.
7. Test the DEV portal.
```

Machine role:

```text
Business API Server
```

## Manual Server Folder Check

Depending on the environment, the web packages may also be visible or staged under the API Server installation, for example:

```text
<OIM installation>\bin\imxweb\custom
```

Do not manually overwrite production files unless the deployment process for the environment explicitly requires it.

## DEV Test Checklist

After importing the packages and recycling the API Server app pool, test:

```text
1. Open the DEV portal in an incognito/private browser window.
2. Log in successfully.
3. Open the dashboard/start page.
4. Open the IT Shop.
5. Open a product detail view.
6. Open Operations Support Portal if it is used.
7. Open the landing page if it is used.
8. Check the browser developer console for JavaScript errors.
9. Check API Server logs for server-side errors.
```

Use a hard browser refresh if the old web client still appears:

```text
Ctrl + F5
```

## Recommended Rollout Strategy

Deploy vendor and custom code in two separate steps when possible.

First deploy the clean vendor build:

```powershell
cd C:\Users\RPCIA984\Desktop\Project\IdentityManager.Imx\imxweb
git checkout v9.2.2
C:\Users\RPCIA984\Desktop\build-oim-web-zips.ps1 -OutputDir C:\Users\RPCIA984\Desktop\oim-web-zips-vendor
```

Import and test the vendor ZIPs.

Then deploy the customized build:

```powershell
cd C:\Users\RPCIA984\Desktop\Project\IdentityManager.Imx\imxweb
git checkout v92_build
C:\Users\RPCIA984\Desktop\build-oim-web-zips.ps1 -SkipInstall -OutputDir C:\Users\RPCIA984\Desktop\oim-web-zips-custom
```

Import and test the customized ZIPs.

This makes troubleshooting easier:

```text
Vendor build works, custom build fails  -> check custom changes.
Vendor build fails                      -> check environment, package import, or OIM compatibility.
```

## Troubleshooting

If the build fails, check the project printed directly before the error:

```text
==> Building qer-app-portal
```

Then rerun only the failing command manually:

```powershell
npm run build qer-app-portal
```

If `npm install` fails, rerun:

```powershell
npm install
```

If the portal still shows the old version:

```text
1. Recycle the API Server IIS app pool.
2. Clear browser cache or use incognito mode.
3. Verify that the Html_*.zip files were imported with the Business API Server machine role.
4. Check whether the correct DEV database was selected in Software Loader.
```

If a ZIP import fails in Software Loader:

```text
1. Confirm the ZIP name starts with Html_.
2. Confirm the ZIP contains the dist content directly.
3. Confirm the target system is OIM 9.2.2 when deploying v92/v9.2.2 packages.
4. Rebuild the failed package and import it again.
```
