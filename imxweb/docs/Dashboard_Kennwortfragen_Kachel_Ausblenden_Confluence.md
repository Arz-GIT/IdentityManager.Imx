# Hide the "Password Questions" Dashboard Tile

## Goal

The **Password Questions** dashboard tile should no longer be visible on the Web Portal start page.

The tile links to the password questions section in the user profile. The underlying functionality remains unchanged; only the tile visibility on the start page is disabled.

## Affected File

```text
imxweb/projects/qer/src/lib/wport/start/start.component.ts
```

## Initial Situation

The tile visibility is controlled in the start page template through the `ShowPasswordTile()` method.

```html
<imx-icon-tile
  *ngIf="viewReady && ShowPasswordTile()"
  data-imx-identifier="start-tile-no-password-query-and-answer-set"
  [caption]="'#LDS#Heading Password Questions' | translate"
>
</imx-icon-tile>
```

Before the change, the visibility was read from the user configuration:

```typescript
public ShowPasswordTile(): boolean {
  return this.userConfig?.ShowPasswordTile;
}
```

## Implementation

The `ShowPasswordTile()` method now always returns `false`. As a result, the tile is no longer rendered on the start page.

```typescript
public ShowPasswordTile(): boolean {
  return false;
}
```

## Result

The **Password Questions** tile is no longer visible on the dashboard start page.

Other areas, such as the profile page or existing direct routes, are not removed by this change.

## Validation

1. Start the Web Portal.
2. Log in with a user.
3. Open the dashboard/start page.
4. Verify that the **Password Questions** tile is no longer displayed.
5. Verify that the other start page tiles are still visible.

## Note

This change is intentionally small and only affects the start page tile. If the password questions functionality should be disabled completely, the navigation, permissions, or configuration for the profile area must also be reviewed.
