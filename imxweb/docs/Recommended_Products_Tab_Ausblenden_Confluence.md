# Hide the "Recommended Products" Tab

## Goal

The **Recommended Products** tab should no longer be displayed on the **New Request** page.

The tab opens the peer group recommendation page behind the route `productsByPeerGroup`. The underlying component and route remain available in the code. Only the tab entry in the page navigation is disabled.

## Affected File

```text
imxweb/projects/qer/src/lib/new-request/new-request-content/new-request-content.component.ts
```

## Background

The **New Request** page is part of the `qer` project.

The tab navigation is not hard-coded in the HTML template. The visible tabs are built dynamically in `NewRequestContentComponent.ngOnInit()` by pushing entries into the `navLinks` array.

The HTML renders these entries with:

```html
<a
  mat-tab-link
  *ngFor="let navLink of navLinks"
>
  {{ navLink.title | translate }}
</a>
```

The **Recommended Products** tab uses this route:

```text
productsByPeerGroup
```

## Initial Situation

Before the change, the **Recommended Products** tab was added whenever product selection by reference user was enabled:

```typescript
const canSelectByRefUser = projectConfig.ITShopConfig.VI_ITShop_ProductSelectionByReferenceUser;

if (canSelectByRefUser) {
  this.navLinks.push({
    id: 1,
    title: '#LDS#Heading Recommended Products',
    component: NewRequestPeerGroupComponent,
    link: 'productsByPeerGroup',
    active: false,
  });

  this.navLinks.push({
    id: 2,
    title: '#LDS#Heading Products by Reference User',
    component: NewRequestReferenceUserComponent,
    link: 'productsByReferenceUser',
    active: false,
  });
}
```

Because both tabs were inside the same `canSelectByRefUser` block, disabling that configuration would also hide **Products by Reference User**. The requirement is to hide only **Recommended Products**.

## Implementation

A local switch was added for the **Recommended Products** tab:

```typescript
const showRecommendedProducts = false;
```

The `navLinks.push()` for **Recommended Products** is now wrapped in this switch. The **Products by Reference User** tab remains controlled by `canSelectByRefUser`.

```typescript
const canSelectFromTemplate = projectConfig.ITShopConfig.VI_ITShop_ProductSelectionFromTemplate;
const canSelectByRefUser = projectConfig.ITShopConfig.VI_ITShop_ProductSelectionByReferenceUser;
const showRecommendedProducts = false;

if (canSelectByRefUser) {
  if (showRecommendedProducts) {
    this.navLinks.push({
      id: 1,
      title: '#LDS#Heading Recommended Products',
      component: NewRequestPeerGroupComponent,
      link: 'productsByPeerGroup',
      active: false,
    });
  }

  this.navLinks.push({
    id: 2,
    title: '#LDS#Heading Products by Reference User',
    component: NewRequestReferenceUserComponent,
    link: 'productsByReferenceUser',
    active: false,
  });
}
```

## Result

The **Recommended Products** tab is no longer displayed on the **New Request** page.

The **Products by Reference User** tab is still displayed if `VI_ITShop_ProductSelectionByReferenceUser` is enabled.

The **All Products** and **Product Bundles** tabs are not affected by this change.

## Important Note

The route and component for `productsByPeerGroup` are not removed by this change. This means the tab is hidden from the navigation, but the route may still be reachable directly if a user enters the URL manually.

If direct access must also be blocked, the route in the following file should be adjusted as a separate change:

```text
imxweb/projects/qer/src/lib/new-request/new-request-routing.module.ts
```

For example, `productsByPeerGroup` could be redirected to `allProducts`.

## Validation

1. Rebuild or restart the Web Portal.
2. Log in with a user.
3. Open the **New Request** page.
4. Verify that the **Recommended Products** tab is no longer displayed.
5. Verify that **All Products** is still displayed.
6. Verify that **Products by Reference User** is still displayed when product selection by reference user is enabled.
7. Verify that **Product Bundles** is still displayed when product selection from templates is enabled.

## Rollback

To show the **Recommended Products** tab again, change the local switch back to `true`:

```typescript
const showRecommendedProducts = true;
```

Alternatively, remove the `showRecommendedProducts` condition and restore the original `navLinks.push()` behavior.

## Siko Documentation

The following entries can be used for the Siko sections that require evidence for third-party libraries, procedure descriptions, and secure code review.

### 3.4 Third Party Tools and Libraries

No new third-party tool or library was introduced for this change. The implementation uses the existing Angular Web Portal stack and only changes the local tab registration logic in the `qer` project.

The third-party libraries are managed centrally in:

```text
imxweb/package.json
```

Relevant runtime libraries used by the Angular Web Portal include:

| Tool / Library | Version / Source | Purpose | Security Handling |
| --- | --- | --- | --- |
| Angular framework packages (`@angular/*`) | `^14.3.0`, `@angular/material` / `@angular/cdk` `^14.2.7` | Web Portal framework, routing, forms, browser rendering, Angular Material UI components | Version-controlled in `imxweb/package.json`; build and dependency updates are handled through the standard Web Portal maintenance process. |
| RxJS | `~6.6.7` | Reactive event and subscription handling in Angular components and services | Used through Angular-supported APIs; subscriptions are released in component teardown where applicable. |
| Zone.js | `~0.11.5` | Angular async change detection support | Standard Angular runtime dependency. |
| TypeScript runtime helpers (`tslib`) | `^2.0.0` | Runtime helpers generated by TypeScript compilation | Standard Angular/TypeScript dependency. |
| `@ngx-translate/core` and `@ngx-translate/http-loader` | `^11.0.1`, `^4.0.0` | Localization and translation loading | Existing Web Portal translation mechanism; no user-controlled script execution is introduced by this change. |
| Elemental UI (`@elemental-ui/core`, `@elemental-ui/cadence-icon`) | local package files under `imxweb/imx-modules` | One Identity UI components and icons | Delivered as controlled local packages with the Web Portal source. |
| One Identity API packages (`imx-api-*`, `imx-qbm-dbts`) | local package files under `imxweb/imx-modules` | Typed API clients and database transport structures | Delivered as controlled local packages with the Web Portal source. |

Evidence:

```text
imxweb/package.json
imxweb/projects/qer/package.json
```

### 6.4.3 Procedure Descriptions (Verfahrensbeschreibung)

Responsible Team: Self-managed by the Web Portal / One Identity Manager customization team.

| Reference | Description | Last Review Date |
| --- | --- | --- |
| `imxweb/docs/Recommended_Products_Tab_Ausblenden_Confluence.md` | Procedure description for hiding the **Recommended Products** tab on the **New Request** page. Documents goal, affected file, initial situation, implementation, result, validation, and rollback. | 2026-07-10 |
| `imxweb/projects/qer/src/lib/new-request/new-request-content/new-request-content.component.ts` | Implementation evidence. The **Recommended Products** tab registration is guarded by `showRecommendedProducts = false`; the **Products by Reference User** tab remains controlled by the existing project configuration. | 2026-07-10 |
| `imxweb/package.json` | Third-party library and build dependency reference for the Angular Web Portal. | 2026-07-10 |

### 6.4.4 Secure Code Review

Responsible Team: Self-managed by the Web Portal / One Identity Manager customization team.

| Link to Artifact / Evidence | Standards Reference | Justification if N/A |
| --- | --- | --- |
| `imxweb/docs/Recommended_Products_Tab_Ausblenden_Confluence.md` | ST54 - 2.2; Secure Application Development; Secure Application Development Checklist | Documents the reviewed change, validation steps, and rollback path. |
| `imxweb/projects/qer/src/lib/new-request/new-request-content/new-request-content.component.ts` | ST54 - 2.2; A6A 5, 14, 34; CDP 265, 221, 224, 292, 171, 358 | Code review scope: UI navigation only. No new input handling, authentication, authorization, API endpoint, persistence, dependency, or sensitive data processing was introduced. |
| `imxweb/package.json` | ST54 - 2.2; Third-party dependency review | Confirms that no new third-party dependency was added for this change. Existing Angular and One Identity Web Portal dependencies remain centrally managed. |

Secure code review notes:

1. The change only hides a tab entry from the New Request navigation.
2. The implementation does not add new backend calls, routes, permissions, or data processing.
3. The route and component for `productsByPeerGroup` remain present. If direct URL access must be prevented, this must be handled as a separate routing or authorization change.
4. Existing third-party Angular libraries continue to be managed through `imxweb/package.json`; no additional package was introduced.
