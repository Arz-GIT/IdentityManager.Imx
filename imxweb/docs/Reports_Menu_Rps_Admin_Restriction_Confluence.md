# Restrict Reports Menu and Route to RPS Administrators

## Purpose

This change restricts the **Reports** entry under **Setup** to users with the RPS Administrator permission group.

The affected menu path is:

```text
Setup > Reports
```

The corresponding route is:

```text
/#/reports
```

Before this change, the menu entry was visible whenever the API server exposed the `REPORT_SUBSCRIPTION` preprocessor property. Users could also open the reports page directly by entering the route URL.

## Functional Goal

Only users who are RPS Administrators should be able to:

1. See the **Reports** menu entry.
2. Open the **Reports** page through the direct route.

The required permission group is:

```text
VI_4_RPSADMIN_ADMIN
```

This group is checked through the existing RPS permission helper:

```ts
isRpsAdmin(groups)
```

## Affected Files

```text
projects/rps/src/lib/admin/permissions-helper.ts
projects/rps/src/lib/admin/rps-admin-guard.service.ts
projects/rps/src/lib/reports/edit-report.module.ts
projects/rps/src/lib/rps-config.module.ts
```

## Existing Permission Infrastructure

The RPS module already provides a permission helper in:

```text
projects/rps/src/lib/admin/permissions-helper.ts
```

The helper checks whether the current user belongs to the RPS administrator permission group.

The check was made case-insensitive to match the style used by other permission-group checks in the portal:

```ts
export function isRpsAdmin(groups: string[]): boolean {
  return groups.find(item => item.toUpperCase() === 'VI_4_RPSADMIN_ADMIN') != null;
}
```

This avoids mismatches when group names are returned with different casing by the API server.

## Implementation Summary

The implementation has three parts:

1. Hide the **Reports** menu entry for users who are not RPS Administrators.
2. Add a dedicated `RpsAdminGuardService`.
3. Protect the `/reports` route against direct URL access.

## Menu Visibility Change

The Reports menu entry is registered in the `setupMenu()` method of `EditReportModule`.

Before:

```ts
if (preProps.includes('REPORT_SUBSCRIPTION')) {
  items.push(
    {
      id: 'RPS_Reports',
      navigationCommands: {
        commands: ['reports']
      },
      title: '#LDS#Menu Entry Reports',
      sorting: '60-70',
    },
  );
}
```

After:

```ts
if (preProps.includes('REPORT_SUBSCRIPTION') && isRpsAdmin(groups)) {
  items.push(
    {
      id: 'RPS_Reports',
      navigationCommands: {
        commands: ['reports']
      },
      title: '#LDS#Menu Entry Reports',
      sorting: '60-70',
    },
  );
}
```

This ensures the menu item is only added for users in the RPS administrator group.

## Route Protection Change

A new guard was added:

```text
projects/rps/src/lib/admin/rps-admin-guard.service.ts
```

The guard uses the existing `RpsPermissionsService`:

```ts
const userIsRpsAdmin = await this.rpsPermissionService.isRpsAdmin();
```

If the user is not an RPS Administrator, the route redirects back to the configured start page.

## Route Configuration

The reports route is defined in:

```text
projects/rps/src/lib/rps-config.module.ts
```

Before:

```ts
{
  path: 'reports',
  component: EditReportComponent,
  canActivate: [RouteGuardService],
  resolve: [RouteGuardService],
  data:{
    contextId: HELP_CONTEXTUAL.Reports
  }
}
```

After:

```ts
{
  path: 'reports',
  component: EditReportComponent,
  canActivate: [RouteGuardService, RpsAdminGuardService],
  resolve: [RouteGuardService],
  data:{
    contextId: HELP_CONTEXTUAL.Reports
  }
}
```

`RouteGuardService` continues to perform the general login/session route validation.

`RpsAdminGuardService` additionally checks whether the user is an RPS Administrator.

## Why RPS Admin Is Used

Reports are provided by the RPS module and are not part of the QER IT Shop administration feature set.

Therefore, the correct permission check is based on the RPS administrator group:

```text
VI_4_RPSADMIN_ADMIN
```

This keeps the Reports behavior aligned with the existing RPS permission model.

## Test Plan

Test with a user who is not an RPS Administrator:

1. Open the portal.
2. Verify that **Setup > Reports** is not visible.
3. Open `/#/reports` directly.
4. Verify that the user is redirected to the configured start page.

Test with an RPS Administrator:

1. Open the portal.
2. Verify that **Setup > Reports** is visible.
3. Open `/#/reports` directly.
4. Verify that the reports page is accessible.

## Notes

This change affects only the Reports menu entry and route.

No changes were made to:

- Report definitions
- Report rendering
- Report subscriptions
- QER Product bundles
- IT Shop request behavior
