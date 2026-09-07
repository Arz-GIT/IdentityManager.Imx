# ESet Commentary Integration in Product Details Sidesheet

## Purpose

This extension displays a sysadmin hint in the Product Details sidesheet in the QER new-request flow.

The displayed text comes from the linked ESet system role:

- `ESet.Commentary`

The hint is shown only when the system role is explicitly marked for manual handling:

- `ESet.CustomProperty01 = "manuell"`

This prevents general or technical comments from being displayed in the request dialog without an explicit functional marker.

## Functional Rule

```text
If ESet.CustomProperty01 == "manuell"
and ESet.Commentary is not empty:
    Show ESet.Commentary as "Hinweis fuer Sysadmin"

Otherwise:
    Show nothing
```

There is intentionally no fallback to other fields such as:

- `Description`
- `DisplayName`
- `GetDisplay()`
- `__Display`
- `__DisplayLong`

## Affected Files

```text
projects/qer/src/lib/new-request/new-request-product/product-details-sidesheet/product-details.service.ts
projects/qer/src/lib/new-request/new-request-product/product-details-sidesheet/product-details-sidesheet.component.ts
projects/qer/src/lib/new-request/new-request-product/product-details-sidesheet/product-details-sidesheet.component.html
```

## Flow

1. The user opens the Product Details sidesheet for a requestable product.
2. `showProductDetails(...)` is called in `ProductDetailsService`.
3. The service resolves the product's `UID_AccProduct`.
4. The linked ESet system role is loaded through the RMS typed client.
5. Two values are read from the ESet entity:
   - `Commentary`
   - `CustomProperty01`
6. The service checks whether `CustomProperty01` has the value `manuell`.
7. Only then is `Commentary` passed to the sidesheet as `sysAdminComment`.
8. The HTML renders the hint block only when `sysAdminComment` is set.

## Why RMS Is Used

The required ESet data is not available directly through the regular QER service item path.

Therefore, `ProductDetailsService` uses the RMS API client:

```ts
import { TypedClient as RmsTypedClient, V2Client as RmsV2Client } from "imx-api-rms";
```

The RMS client is created locally in the service:

```ts
const rmsClient = new RmsV2Client(this.appConfig.apiClient, this.appConfig.client);
this.rmsTypedClient = new RmsTypedClient(rmsClient, this.translationProvider);
```

This allows `qer` to use the RMS API without introducing a direct Angular library dependency on the `rms` UI module.

## ESet Lookup

Products are linked to system roles through `UID_AccProduct`.

The ESet role is therefore resolved with this filter:

```ts
const result = await this.rmsTypedClient.PortalAdminRoleEset.Get({
  StartIndex: 0,
  PageSize: 1,
  filter: [
    {
      ColumnName: "UID_AccProduct",
      Type: FilterType.Compare,
      CompareOp: CompareOperator.Equal,
      Value1: uidAccProduct,
    },
  ],
  withProperties: "Commentary",
});
```

Important:

```text
withProperties = "Commentary"
```

Do not use:

```text
withProperties = "Commentary,CustomProperty01"
```

The live API returns `CustomProperty01` together with the commentary data when `withProperties=Commentary` is set.

If `CustomProperty01` is requested explicitly through `withProperties`, the API can reject the request with:

```text
Property not valid: CustomProperty01
```

## UID Resolution

The product does not always expose `UID_AccProduct` as a regular column.

For that reason, the implementation first tries to read the explicit column and then falls back to the entity primary key:

```ts
private getUidAccProduct(item: PortalShopServiceitems): string | undefined {
  try {
    const uidAccProduct = item.GetEntity().GetColumn("UID_AccProduct")?.GetValue();
    if (uidAccProduct) {
      return uidAccProduct;
    }
  } catch {
  }

  return item.GetEntity().GetKeys()?.[0];
}
```

## Display Decision

After the ESet lookup succeeds, the service reads:

```ts
const entity = role.GetEntity();
const commentary = this.tryGetColumnDisplayValue(entity, "Commentary");
const customProperty01 = this.tryGetColumnValue(entity, "CustomProperty01");
```

The display decision is based only on the raw value of `CustomProperty01`:

```ts
const showSysAdminComment = this.isManualFlag(customProperty01);
```

The check is intentionally simple and tolerant of whitespace and casing:

```ts
private isManualFlag(value: string | undefined): boolean {
  return value?.trim().toLocaleLowerCase() === "manuell";
}
```

`DisplayValue` is not required for this functional rule.

## Return Value

The service only returns a comment when both conditions are met:

- `CustomProperty01` is `manuell`
- `Commentary` contains text

```ts
return {
  commentary:
    showSysAdminComment && commentary?.trim().length
      ? commentary
      : undefined,
};
```

If one condition is not met, `commentary` remains `undefined`.

## Defensive Column Reads

Local API servers or different projections can expose different columns.

For that reason, optional columns are read defensively:

```ts
private tryGetColumnDisplayValue(
  entity: {
    GetColumn?(name: string): { GetDisplayValue?(): string };
  } | undefined,
  columnName: string,
): string | undefined {
  try {
    return entity?.GetColumn?.(columnName)?.GetDisplayValue?.();
  } catch {
    return undefined;
  }
}
```

```ts
private tryGetColumnValue(
  entity: {
    GetColumn?(name: string): { GetValue?(): string };
  } | undefined,
  columnName: string,
): string | undefined {
  try {
    return entity?.GetColumn?.(columnName)?.GetValue?.();
  } catch {
    return undefined;
  }
}
```

If a column is missing, `undefined` is returned and the sidesheet remains stable.

## Sidesheet Data

When the sidesheet is opened, the comment is passed to the component:

```ts
const sysAdminData = await this.getSysAdminDetails(item);

await this.sidesheetService.open(ProductDetailsSidesheetComponent, {
  data: {
    item,
    orderStatus,
    imageUrl: this.getProductImage(item),
    projectConfig: this.projectConfig,
    sysAdminComment: sysAdminData.commentary,
  },
});
```

## UI Rendering

The HTML renders the hint only when `data.sysAdminComment` is set:

```html
<mat-card *ngIf="data.sysAdminComment" class="sysadmin-comment-card">
  <div class="details-item">
    <div class="details-label">Hinweis für Sysadmin:</div>
    <div class="details-value">
      {{ data.sysAdminComment }}
    </div>
  </div>
</mat-card>
```

This prevents empty UI blocks when no valid ESet commentary is available.

## Expected Behavior

| Situation | Behavior |
|---|---|
| `CustomProperty01 = manuell` and `Commentary` contains text | Hint is shown |
| `CustomProperty01` is empty | No hint |
| `CustomProperty01` has another value | No hint |
| `Commentary` is empty | No hint |
| No linked ESet is found | No hint |
| ESet API does not return the column | No hint |
| API lookup fails | Sidesheet still opens without the hint |

## API Verification

The live API was verified with this request:

```powershell
curl.exe -k -sS -b cookies.txt -c cookies.txt "https://j90910b4.m990.local/ApiServer/portal/admin/role/eset?PageSize=1&filter=%5B%7B%22ColumnName%22%3A%22UID_AccProduct%22%2C%22Type%22%3A0%2C%22CompareOp%22%3A0%2C%22Value1%22%3A%22c5dcab96-54e7-4e40-b0ea-c8ea7bedf80b%22%7D%5D&withProperties=Commentary" | ConvertFrom-Json | ConvertTo-Json -Depth 20
```

Relevant response excerpt:

```json
{
  "Columns": {
    "Commentary": {
      "Value": "test!!!"
    },
    "CustomProperty01": {
      "Value": "manuell",
      "DisplayValue": "manuell"
    }
  }
}
```

Only `CustomProperty01.Value` is used for the display decision.

## Difference Between Live API and Local API

During testing, local API servers were found to sometimes return a different projection.

Example:

- The live API returns `CustomProperty01`.
- The local API might not include `CustomProperty01` in the same response.

The live API behavior is the reference for this feature.

If `CustomProperty01` is missing locally, this is not a frontend error. The code handles this defensively and shows no hint.

## API Server Configuration

If `CustomProperty01` is returned as `undefined` in the frontend, the most common reason is that the property is not exposed by the API Server configuration.

The property must be enabled in the API Server configuration for the Web Portal.

Configuration path:

```text
API Server
Settings
Web Portal
Property edition
Properties that can be edited
System roles
```

Add or verify the following property:

```text
SysAdmin (manuell) (CustomProperty01)
```

The relevant system role property list should include at least:

```text
Ident_ESet
DisplayName
InternalProductName
UID_ESetType
UID_AccProduct
UID_PersonResponsible
Commentary
IsForITShop
IsITShopOnly
CustomProperty01
```

After changing this configuration, refresh/restart the API Server as needed and test the ESet endpoint again.

Expected result:

```json
"CustomProperty01": {
  "Value": "manuell"
}
```

If `CustomProperty01` is not enabled there, the frontend cannot read the value and the code will receive `undefined`.

## Important Design Decisions

- Only `Commentary` is displayed.
- `CustomProperty01` controls whether `Commentary` may be displayed.
- The check uses `CustomProperty01.Value`, not `DisplayValue`.
- `CustomProperty01` is not requested explicitly through `withProperties`.
- No fallback display is used from other ESet fields.
- No UI error is shown if the lookup fails.
- RMS/API issues must not block the Product Details sidesheet.

## Summary

This extension ensures that the Product Details sidesheet only shows a sysadmin hint when the linked ESet system role has explicitly been marked for manual handling.

The functional marker is:

```text
ESet.CustomProperty01 = "manuell"
```

The displayed text comes from:

```text
ESet.Commentary
```
