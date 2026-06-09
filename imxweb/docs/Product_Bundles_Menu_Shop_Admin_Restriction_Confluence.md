# Restrict Product Bundles Menu and Route to Shop Administrators

## Purpose

This change restricts the **Product bundles** entry under **Requests** to users with the Shop Administrator portal feature.

The affected menu path is:

```text
Requests > Product bundles
```

The corresponding route is:

```text
/#/itshop/requesttemplates
```

Before this change, the menu entry was visible for every user when request templates were enabled in the project configuration. Users could also open the page directly by entering the route URL.

## Functional Goal

Only users with the Shop Administrator feature should be able to:

1. See the **Product bundles** menu entry.
2. Open the **Product bundles** page through the direct route.

The required feature is:

```text
Portal_UI_ShopAdmin
```

This feature is checked through the existing QER permission helper:

```ts
isShopAdmin(features)
```

## Affected File

```text
projects/qer/src/lib/itshop-pattern/itshop-pattern.module.ts
```

## Existing Permission Infrastructure

The project already provides QER permission helpers in:

```text
projects/qer/src/lib/admin/qer-permissions-helper.ts
```

The relevant helper is:

```ts
export function isShopAdmin(features: string[]): boolean {
  return features.find((item) => item === 'Portal_UI_ShopAdmin') != null;
}
```

This helper is already used by other IT Shop administration areas, for example:

- Request configuration
- Service item administration
- Service category administration

Using `isShopAdmin(features)` keeps the Product bundles behavior aligned with the existing IT Shop administration checks.

## Implementation Summary

The implementation has two parts:

1. Hide the menu entry for users who are not Shop Administrators.
2. Protect the route against direct URL access by adding the existing `ShopAdminGuardService`.

## Menu Visibility Change

The Product bundles menu entry is registered in the `setupMenu()` method of `ItshopPatternModule`.

Before:

```ts
if (preProps.includes('ITSHOP') && requestTemplatesEnabled) {
  items.push({
    id: 'QER_Request_RequestTemplates',
    navigationCommands: {
      commands: ['itshop', 'requesttemplates'],
    },
    title: '#LDS#Menu Entry Product bundles',
    sorting: '10-50',
  });
}
```

After:

```ts
if (preProps.includes('ITSHOP') && requestTemplatesEnabled && isShopAdmin(features)) {
  items.push({
    id: 'QER_Request_RequestTemplates',
    navigationCommands: {
      commands: ['itshop', 'requesttemplates'],
    },
    title: '#LDS#Menu Entry Product bundles',
    sorting: '10-50',
  });
}
```

This ensures the menu item is only added for users with `Portal_UI_ShopAdmin`.

## Route Protection Change

The route is defined in the same module.

Before:

```ts
{
  path: 'itshop/requesttemplates',
  component: ItshopPatternComponent,
  canActivate: [ItshopPatternGuardService],
  resolve: [RouteGuardService],
  data: {
    contextId: HELP_CONTEXTUAL.RequestTemplates,
  },
}
```

After:

```ts
{
  path: 'itshop/requesttemplates',
  component: ItshopPatternComponent,
  canActivate: [ItshopPatternGuardService, ShopAdminGuardService],
  resolve: [RouteGuardService],
  data: {
    contextId: HELP_CONTEXTUAL.RequestTemplates,
  },
}
```

`ItshopPatternGuardService` continues to check whether request templates are enabled in the project configuration.

`ShopAdminGuardService` additionally checks whether the user has the Shop Administrator feature. If the user is not a Shop Administrator, the route redirects back to the configured start page.

## Required Imports

The module now imports the existing permission helper and guard:

```ts
import { ShopAdminGuardService } from '../guards/shop-admin-guard.service';
import { isShopAdmin } from '../admin/qer-permissions-helper';
```

## Why Shop Admin Is Used

Product bundles belong to the IT Shop request and product selection area.

The existing portal permission model separates administration features by functional area:

- `Portal_UI_PersonAdmin` for identity and person administration
- `Portal_UI_ShopAdmin` for IT Shop administration
- `Portal_UI_RoleAdmin` for role administration
- `Portal_UI_ResourceAdmin` for resource administration

Because Product bundles are part of IT Shop administration, `Portal_UI_ShopAdmin` is the appropriate feature.

Using `Portal_UI_PersonAdmin` would allow users who can administer identities to access IT Shop product bundle administration, which does not match the existing permission model.

## Test Result

The behavior was tested with a user who does not have the Shop Administrator feature.

Expected and confirmed behavior:

1. The **Product bundles** menu entry is no longer visible under **Requests**.
2. Direct access through `/#/itshop/requesttemplates` is blocked.
3. The user is redirected to the configured start page.

Expected behavior for a Shop Administrator:

1. The **Product bundles** menu entry remains visible.
2. The direct route `/#/itshop/requesttemplates` remains accessible.

## Notes

This change affects only the Product bundles menu entry and route.

No changes were made to:

- Request creation
- Shopping cart behavior
- Product selection logic
- Request template configuration values
- RPS reports or other dynamic plugin modules
