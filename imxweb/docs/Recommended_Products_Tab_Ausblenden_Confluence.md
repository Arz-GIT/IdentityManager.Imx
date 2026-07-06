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
