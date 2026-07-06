# Hide the Team Role Dashboard Tile

## Goal

The **Team Role** dashboard tile should no longer be displayed on the Web Portal start page.

The underlying Team Role functionality remains available in the code. Only the dashboard tile registration is removed, so the tile is no longer rendered on the start page.

## Background

The dashboard start page is provided by the `qer` project. It contains a generic extension point for medium dashboard tiles:

```html
<imx-ext id="Dashboard-MediumTiles"></imx-ext>
```

The Team Role tile is not defined directly in `start.component.ts` or `start.component.html`. It is provided by the `rmb` module and registered dynamically for this extension point.

For this reason, the tile is disabled in the `rmb` module.

## Affected File

```text
imxweb/projects/rmb/src/lib/init.service.ts
```

## Initial Situation

Before the change, the Team Role tile was registered in `InitService.onInit()` for the `Dashboard-MediumTiles` dashboard slot:

```typescript
this.extService.register('Dashboard-MediumTiles', { instance: TeamRoleComponent });
```

For this registration, `ExtService` and `TeamRoleComponent` were used in the file:

```typescript
import { DynamicMethodService, ImxTranslationProviderService, imx_SessionService, MenuService, ExtService, HELP_CONTEXTUAL } from 'qbm';
import { TeamRoleComponent } from './team-role/team-role.component';
```

The `ExtService` was also injected in the constructor:

```typescript
private readonly myResponsibilitiesRegistryService: MyResponsibilitiesRegistryService,
private readonly extService: ExtService
```

## Implementation

The Team Role tile registration was removed.

```typescript
// Removed:
// this.extService.register('Dashboard-MediumTiles', { instance: TeamRoleComponent });
```

Because `ExtService` and `TeamRoleComponent` are no longer used in `init.service.ts`, the unused imports and constructor injection were removed as well.

### Import Before

```typescript
import { DynamicMethodService, ImxTranslationProviderService, imx_SessionService, MenuService, ExtService, HELP_CONTEXTUAL } from 'qbm';
import { TeamRoleComponent } from './team-role/team-role.component';
```

### Import After

```typescript
import { DynamicMethodService, ImxTranslationProviderService, imx_SessionService, MenuService, HELP_CONTEXTUAL } from 'qbm';
```

### Constructor Before

```typescript
private readonly roleService: RoleService,
private readonly identityRoleMembershipService: IdentityRoleMembershipsService,
private readonly myResponsibilitiesRegistryService: MyResponsibilitiesRegistryService,
private readonly extService: ExtService
```

### Constructor After

```typescript
private readonly roleService: RoleService,
private readonly identityRoleMembershipService: IdentityRoleMembershipsService,
private readonly myResponsibilitiesRegistryService: MyResponsibilitiesRegistryService
```

## Result

The **Team Role** tile is no longer displayed on the dashboard.

The Team Role component and Team Role module remain available. Only the dashboard registration is removed.

Other dashboard tiles are not affected by this change.

## Why Not in `start.component.ts`?

The `start.component.ts` belongs to the `qer` dashboard and only provides the generic extension point:

```html
<imx-ext id="Dashboard-MediumTiles"></imx-ext>
```

If this extension point is removed or hidden in `qer`, all tiles registered through `Dashboard-MediumTiles` disappear.

The requirement is to remove only the Team Role tile. Therefore, changing `rmb/init.service.ts` is the more precise solution.

## Build and Deployment

Because the change is located in the `rmb` module, `rmb` must be rebuilt and delivered.

For local testing, the dynamic build is relevant because `rmb` is loaded as a plugin:

```powershell
npx ng build rmb --configuration dynamic --watch
```

The relevant output is located under:

```text
imxweb/html/rmb/fesm2015/rmb.mjs
```

During deployment, make sure that the newly built `rmb` bundle is copied to the server.

## Validation

1. Rebuild `rmb`.
2. Start or restart the portal.
3. Clear the browser cache or test in an incognito window.
4. Log in with a user who was previously able to see the Team Role tile.
5. Open the dashboard/start page.
6. Verify that the **Team Role** tile is no longer displayed.
7. Verify that the other dashboard tiles are still displayed.

## Rollback

To restore the tile, add the registration back to `imxweb/projects/rmb/src/lib/init.service.ts`:

```typescript
this.extService.register('Dashboard-MediumTiles', { instance: TeamRoleComponent });
```

The `ExtService`, the `TeamRoleComponent` import, and the constructor injection must also be restored.
