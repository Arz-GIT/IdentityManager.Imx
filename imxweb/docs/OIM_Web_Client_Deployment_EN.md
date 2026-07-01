# One Identity Manager Web Client Deployment

This document describes the deployment process for the One Identity Manager Web Client directly on the API Server. No PowerShell deployment script and no Software Loader are used.

The process is intended for DEV first. Do not deploy directly to PROD without a successfully tested DEV/QS rollout.

## Goal

The required web packages are built from the currently checked out web client source and provided as ZIP files.

Standard package for the Portal:

```text
Html_qer-app-portal.zip
```

If additional modules are affected, those modules are built as well and provided as separate ZIP files, for example:

```text
Html_rps.zip
```

These ZIP files are then placed on the API Server under `C:\inetpub\wwwroot\ApiServer\bin\imxweb\custom`. The API Server uses these packages to serve the web applications and additional web modules.

## Branch Recommendation

New changes should always start from the matching vendor branch, for example `v92`.

Recommended workflow:

```text
1. Create a new feature branch from v92, for example feature/my-change.
2. Develop and test the change in the feature branch.
3. Merge the feature branch into v92_build.
4. Always build deployments from v92_build.
```

`v92_build` is the shared deployment branch. All released features are collected there. This prevents deployments from accidentally being built from a single feature branch and missing older changes.

Important: Before every build, verify that the current Git branch is `v92_build`. Deployment builds are always created from `v92_build`.

## Portal Build

Build the Portal as a production build:

```powershell
npm run build -- qer-app-portal --configuration production
```

This command is always executed on the `v92_build` branch for deployment.

`qer-app-portal` is built from the required workspace dependencies such as `qbm` and `qer`. For the normal Portal deployment, only the Portal package `Html_qer-app-portal.zip` is created.

`qbm` and `qer` are not deployed as separate ZIP files in this process as long as they are only used as Portal dependencies. If a change is made in `qbm` or `qer`, rebuild the Portal as a production build and replace `Html_qer-app-portal.zip`.

## Build Additional Modules

If modules other than the Portal are affected, build those modules separately as production builds.

Example for `rps`:

```powershell
npm run build -- rps --configuration production
```

Further examples:

```powershell
npm run build -- qbm-app-landingpage --configuration production
npm run build -- qer-app-operationssupport --configuration production
npm run build -- qer-app-pwdportal --configuration production
```

Rule:

```text
Only build and deploy modules that are affected by the change.
If an additional module is affected, it gets its own Html_<module>.zip file.
```

## Create ZIP Packages

After the build, the output is located under:

```text
imxweb\dist\<project>
```

These files must be manually packaged into a ZIP file. For API Server deployment, create one ZIP file per built project using the naming pattern `Html_<project>.zip`.

Important: The ZIP file must contain the contents of the corresponding `dist\<project>` folder, not the `dist\<project>` folder itself.

Example for `qer-app-portal`:

```text
Source:
imxweb\dist\qer-app-portal\*

Target:
Html_qer-app-portal.zip
```

After extracting the ZIP file, it must directly contain files and folders such as:

```text
index.html
main*.js
runtime*.js
polyfills*.js
assets
```

The same principle applies to additional modules:

```text
dist\rps\*  -> Html_rps.zip
dist\tsb\*  -> Html_tsb.zip
dist\aad\*  -> Html_aad.zip
```

The ZIP files can be created with any normal ZIP tool.

Manual process:

```text
1. After the build, open the folder imxweb\dist\<project>.
2. Select all files and folders inside dist\<project>.
3. Package the selected contents as a ZIP file.
4. Name the ZIP after the project, for example Html_qer-app-portal.zip.
5. Copy the finished ZIP file to the API Server.
```

## Which ZIPs Must Be Copied To The API Server

Always deploy all packages that belong to the changed functionality.

Standard Portal case:

```text
Html_qer-app-portal.zip
```

If `rps` is also affected:

```text
Html_qer-app-portal.zip
Html_rps.zip
```

If other web applications are affected:

```text
Html_qer-app-operationssupport.zip
Html_qer-app-pwdportal.zip
Html_qbm-app-landingpage.zip
```

For plugin libraries, deploy the plugin ZIPs and dependent plugin ZIPs consistently as well.

## Deployment On The API Server

The installed standard version is located on the API Server under:

```text
C:\inetpub\wwwroot\ApiServer\bin\imxweb
```

Custom deployments are not copied into this base folder. The generated `Html_*.zip` files are copied only into the `custom` folder below the `imxweb` folder.

Target path on the API Server:

```text
C:\inetpub\wwwroot\ApiServer\bin\imxweb\custom
```

For custom deployments, the API Server loads the packages from the `custom` folder. This means custom packages take precedence over the installed base version.

Important: Files under `C:\inetpub\wwwroot\ApiServer\bin\imxweb` must not be deleted or overwritten. Only the folder `C:\inetpub\wwwroot\ApiServer\bin\imxweb\custom` is used for custom ZIP files.

Before copying:

```text
1. Verify the target environment: DEV, QS, or PROD.
2. Verify the API Server path C:\inetpub\wwwroot\ApiServer\bin\imxweb\custom.
3. Back up existing Html_*.zip files.
4. Make sure no wrong package version is mixed in.
5. If the custom folder is missing, create it according to the operating process or ask the API Server owner to provide it.
6. Do not delete or replace files in the base folder C:\inetpub\wwwroot\ApiServer\bin\imxweb.
```

Deployment process:

```text
1. Stop or recycle the API Server / IIS Application Pool, depending on the operating process.
2. Copy the new Html_*.zip files to C:\inetpub\wwwroot\ApiServer\bin\imxweb\custom.
3. Replace old ZIP files with the same name.
4. Start or recycle the API Server / IIS Application Pool.
5. Test the DEV Portal.
```

Do not manually extract files into subfolders. Deploy the ZIP files themselves.
The base folder `C:\inetpub\wwwroot\ApiServer\bin\imxweb` remains unchanged.

## DEV Test Checklist

After copying the ZIP files and restarting the API Server, verify:

```text
1. Open the DEV Portal in a private browser window.
2. Log in successfully.
3. Open the start page/dashboard.
4. Open the IT Shop.
5. Open product details.
6. Test the Operations Support Portal, if used.
7. Test the Password Reset Portal, if used.
8. Test the Landing Page / Server Administration, if used.
9. Check the browser developer console for JavaScript errors.
10. Check the API Server logs for server-side errors.
```

## Verify Custom Packages

In the One Identity Manager Administration Portal of the API Server, you can verify whether the custom ZIP files were loaded.

URL:

```text
https://<api-server>/ApiServer/html/qbm-app-landingpage/#/admin/packages
```

Verification:

```text
1. Open the Administration Portal.
2. Open the Packages menu item on the left.
3. Search for the affected package, for example qer-app-portal or rps.
4. Verify that the package shows the Custom package label.
5. Verify that the Relative path points to imxweb\custom\<zip-name>.zip.
6. Compare Last changed on and Checksum with the deployment.
```

Examples for correctly loaded custom packages:

```text
qer-app-portal -> imxweb\custom\Html_qer-app-portal.zip
rps            -> imxweb\custom\Html_rps.zip
```

If the old Web Client is still shown:

```text
1. Recycle the API Server / IIS Application Pool again.
2. Clear the browser cache or use a private browser window.
3. Perform a hard refresh with Ctrl + F5.
4. Verify that the new Html_*.zip files are really located under C:\inetpub\wwwroot\ApiServer\bin\imxweb\custom.
5. Verify that no old ZIP files with the same name are loaded from another path.
```

## Troubleshooting

If a build fails:

```text
1. Check the project that was built last in the console.
2. Rebuild only that project, for example npm run build -- qer-app-portal --configuration production.
3. If a library was changed, rebuild the dependent apps.
```

If the Portal does not start after deployment:

```text
1. Check the API Server logs.
2. Check the browser console.
3. Make sure all required module ZIPs and app ZIPs are located under C:\inetpub\wwwroot\ApiServer\bin\imxweb\custom.
4. Check the ZIP contents: contents of dist\<project>, not the dist folder itself.
5. Recycle the API Server / IIS Application Pool.
6. Clear the browser cache.
```

If a feature is missing or still looks old:

```text
1. Verify that the correct Git branch was built.
2. Verify that the correct project was rebuilt.
3. Verify that the correct ZIP file was replaced on the API Server.
4. Verify that dependent apps were also rebuilt and deployed.
```
