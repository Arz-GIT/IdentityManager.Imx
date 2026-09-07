# Service Category and Parent Category in Product Details Sidesheet

## Overview

This change extends the product details sidesheet in the QER new-request flow to display additional information from the assigned service category and its parent category.

The enhancement gives users more context about the selected product without changing the existing sidesheet behavior for products that do not have a linked service category hierarchy.

## Functional Goal

When a user opens the product details sidesheet for a requestable product, the application should:

1. Read the product's assigned `UID_AccProductGroup`.
2. Resolve the corresponding service category.
3. Resolve the parent service category if one exists.
4. Pass both entities to the sidesheet.
5. Render description and remarks for both hierarchy levels in the details tab.

## Scope of the Change

The implementation adds read-only contextual information to the existing product details view.

Included:

- Display of the direct service category assigned to the product
- Display of the parent service category when available
- Fallback behavior when category data is missing

Not included:

- No change to product assignment or request logic
- No modification of service category data
- No additional tab or action for service categories

## Implementation Summary

The logic is implemented in:

- `projects/qer/src/lib/new-request/new-request-product/product-details-sidesheet/product-details.service.ts`
- `projects/qer/src/lib/new-request/new-request-product/product-details-sidesheet/product-details-sidesheet.component.ts`
- `projects/qer/src/lib/new-request/new-request-product/product-details-sidesheet/product-details-sidesheet.component.html`
- `projects/qer/src/lib/new-request/new-request-product/product-details-sidesheet/product-details-sidesheet.component.scss`

### High-Level Flow

1. `showProductDetails(...)` loads the standard product details data.
2. The service calls `getServiceCategoryDetails(...)`.
3. The method reads `UID_AccProductGroup` from the selected product.
4. The direct service category is loaded through `ServiceCategoriesService`.
5. If the category has `UID_AccProductGroupParent`, the parent category is loaded as well.
6. Both objects are passed to the sidesheet data payload.
7. The UI renders parent category details first, followed by the direct category details.

## Technical Details

### Why `ServiceCategoriesService` is used

The existing `ServiceCategoriesService` already provides access to `PortalServicecategories` entities and supports filtered lookup by `UID_AccProductGroup`.

Using this service keeps the implementation aligned with the existing QER architecture and avoids introducing a new API dependency for this feature.

### Resolution Strategy

The service resolves category data in two steps:

```ts
private async getServiceCategoryDetails(item: PortalShopServiceitems): Promise<{
  serviceCategory?: PortalServicecategories;
  parentServiceCategory?: PortalServicecategories;
}> {
  try {
    const uidAccProductGroup = item
      .GetEntity()
      .GetColumn("UID_AccProductGroup")
      .GetValue();

    if (!uidAccProductGroup) {
      return {};
    }

    const serviceCategory = await this.getServiceCategoryByUid(uidAccProductGroup);
    const parentUid = serviceCategory?.UID_AccProductGroupParent?.value;

    if (!parentUid) {
      return { serviceCategory };
    }

    const parentServiceCategory = await this.getServiceCategoryByUid(parentUid);

    return {
      serviceCategory,
      parentServiceCategory,
    };
  } catch {
    return {};
  }
}
```

The category lookup itself is done with a filtered request:

```ts
private async getServiceCategoryByUid(
  uidAccProductGroup: string,
): Promise<PortalServicecategories> {
  try {
    const categories = await this.serviceCategoriesService.get({
      PageSize: 1,
      filter: [
        {
          ColumnName: "UID_AccProductGroup",
          Type: FilterType.Compare,
          CompareOp: CompareOperator.Equal,
          Value1: uidAccProductGroup,
        },
      ],
    });

    return categories?.Data?.[0];
  } catch {
    return undefined;
  }
}
```

### TypeScript Service Implementation

The following service code contains the relevant logic that resolves the service category hierarchy and passes it into the sidesheet:

```ts
public async showProductDetails(
  item: PortalShopServiceitems,
  recipients: IWriteValue<string>,
): Promise<void> {
  if (!this.projectConfig) {
    this.projectConfig = await this.projectConfigService.getConfig();
  }

  const orderStatus = await this.getOrderStatus(item, recipients);

  // Load the assigned service category plus its parent so the sidesheet can show both levels.
  const serviceCategoryDetails = await this.getServiceCategoryDetails(item);

  await this.sidesheetService
    .open(ProductDetailsSidesheetComponent, {
      title: await this.translateService
        .get("#LDS#Heading View Product Details")
        .toPromise(),
      subTitle: item.GetEntity().GetDisplay(),
      icon: "info",
      width: "min(60%, 600px)",
      padding: "0px",
      testId: "product-details-sidesheet",
      data: {
        item,
        serviceCategory: serviceCategoryDetails.serviceCategory,
        parentServiceCategory: serviceCategoryDetails.parentServiceCategory,
        orderStatus: orderStatus,
        imageUrl: this.getProductImage(item),
        projectConfig: this.projectConfig,
      },
    })
    .afterClosed()
    .toPromise();
}

// Resolve the product's service category chain once and pass the result to the UI.
private async getServiceCategoryDetails(item: PortalShopServiceitems): Promise<{
  serviceCategory?: PortalServicecategories;
  parentServiceCategory?: PortalServicecategories;
}> {
  try {
    const uidAccProductGroup = item
      .GetEntity()
      .GetColumn("UID_AccProductGroup")
      .GetValue();

    if (!uidAccProductGroup) {
      return {};
    }

    const serviceCategory = await this.getServiceCategoryByUid(uidAccProductGroup);
    // The parent UID is optional because top-level categories do not have a parent node.
    const parentUid = serviceCategory?.UID_AccProductGroupParent?.value;

    if (!parentUid) {
      return { serviceCategory };
    }

    const parentServiceCategory = await this.getServiceCategoryByUid(parentUid);

    return {
      serviceCategory,
      parentServiceCategory,
    };
  } catch (error) {
    return {};
  }
}

// Fetch a single service category entity for the requested UID.
private async getServiceCategoryByUid(
  uidAccProductGroup: string,
): Promise<PortalServicecategories> {
  try {
    const categories = await this.serviceCategoriesService.get({
      PageSize: 1,
      filter: [
        {
          ColumnName: "UID_AccProductGroup",
          Type: FilterType.Compare,
          CompareOp: CompareOperator.Equal,
          Value1: uidAccProductGroup,
        },
      ],
    });

    return categories?.Data?.[0];
  } catch (error) {
    return undefined;
  }
}
```

### TypeScript Service Commentary

- `showProductDetails(...)` remains the central entry point and now enriches the sidesheet payload with category hierarchy data before opening the UI.
- The inline comment in `showProductDetails(...)` documents the purpose of the new lookup: loading both hierarchy levels for display.
- `getServiceCategoryDetails(...)` encapsulates the full hierarchy resolution so the rest of the sidesheet logic stays unchanged.
- The method reads `UID_AccProductGroup` directly from the selected product and exits safely when the product does not reference a category.
- The inline comment on `parentUid` explains an important business rule: top-level categories do not have a parent and therefore only one category block is expected.
- `getServiceCategoryByUid(...)` isolates the filtered backend lookup in a dedicated helper, which keeps the resolution logic readable and reusable.
- Both helper methods return safe fallback values instead of throwing, so the sidesheet can still open even if the category lookup fails.

### TypeScript Component Implementation

The component receives the resolved category data and exposes it to the template:

```ts
export class ProductDetailsSidesheetComponent implements OnInit {
  public hasEntitlements: boolean;
  public onEntitlements = false;
  /**
   * A list of AccProduct properties, that can be customized in the Admin Portal:
   * ServerConfig/ITShopConfig/AccProductProperties
   */
  protected accProductProperties: string[] = [];

  /** A list of properties, that cannot be customized in the Admin Portal */
  protected fixedProductProperties = [
    "ServiceCategoryFullPath",
    "TableName",
    "Tags",
  ];

  protected ldsEntitlementInfo =
    "#LDS#Here you can get an overview of the entitlements associated with the product. If you request the product, the recipient will get the listed entitlements.";

  /** A mapping between properties/columns and a css class to visualize the property value */
  private cssPropertyMapping = new Map<string, string>([
    ["ServiceCategoryFullPath", "link"],
    ["TableName", "bold"],
    ["Tags", "bold"],
    ["ArticleCode", "bold"],
  ]);

  constructor(
    @Inject(EUI_SIDESHEET_DATA)
    public data: {
      item: PortalServiceitems;

      // Child category directly linked to the selected product.
      serviceCategory?: PortalServicecategories;
      // Parent category shown as additional context above the direct category.
      parentServiceCategory?: PortalServicecategories;

      orderStatus: {
        statusIcon: string;
        statusDisplay: string;
      } | null;
      imageUrl: string;
      projectConfig: QerProjectConfig;
    },
  ) {}

  public ngOnInit(): void {
    // Only these product tables expose entitlement data for the second tab.
    this.hasEntitlements = ["ESet", "QERAssign"].includes(
      this.getValue("TableName"),
    );
    this.accProductProperties =
      this.data?.projectConfig?.ITShopConfig?.AccProductProperties ?? [];
  }
}
```

### TypeScript Component Commentary

- The injected `data` object was extended with `serviceCategory` and `parentServiceCategory` so the template can render the additional hierarchy information.
- The inline comment on `serviceCategory` clarifies that this object represents the category directly assigned to the selected product.
- The inline comment on `parentServiceCategory` documents that the second object is only additional context shown above the direct category.
- The existing `ngOnInit()` logic remains unchanged in behavior except for the documentation comment explaining the entitlement-tab condition.
- The component does not perform category lookup itself; it only receives prepared data from the service and keeps rendering concerns separate from backend access.

## UI Rendering

The sidesheet receives two optional data objects:

- `serviceCategory`
- `parentServiceCategory`

The HTML renders the parent category first and the direct category second. This preserves the hierarchy visually and makes the relationship easier to understand for the user.

Rendered fields:

- `Description`
- `Remarks`

The displayed values still come from the backend entity columns. Only the visible labels are overridden in the frontend because the same backend columns need different labels depending on whether they belong to the parent service category or the direct service category.

If a field is empty, the UI displays `Not set`.

If a category object is not available, the related block is not rendered.

### Custom Frontend Labels

The additional category fields do not use the generic backend column captions for `Description` and `Remarks`. This is intentional because the same column names are shown with different business meanings in the sidesheet.

Label mapping:

- Parent `Description`: `Application description` / `Applikationbeschreibung`
- Parent `Remarks`: `Help text` / `Hilfetext`
- Direct service category `Description`: `Application filter description` / `Filter Anwendungsbeschr.`
- Direct service category `Remarks`: `Filter Help text` / `Filter Hilfetext`

The frontend detects the active language through `TranslateService.currentLang`. German is selected when the current language starts with `de`; English is used as the default fallback.

```ts
protected getServiceCategoryLabel(label: ServiceCategoryLabel): string {
  const isGerman = this.translateService.currentLang
    ?.toLowerCase()
    .startsWith("de");

  const labels: Record<ServiceCategoryLabel, { de: string; en: string }> = {
    applicationDescription: {
      de: "Applikationbeschreibung",
      en: "Application description",
    },
    helpText: {
      de: "Hilfetext",
      en: "Help text",
    },
    applicationFilterDescription: {
      de: "Filter Anwendungsbeschr.",
      en: "Application filter description",
    },
    filterHelpText: {
      de: "Filter Hilfetext",
      en: "Filter Help text",
    },
  };

  return labels[label][isGerman ? "de" : "en"];
}
```

This keeps the backend metadata unchanged and avoids changing the caption of `Description` or `Remarks` globally.

### HTML Implementation

The following HTML snippet shows the relevant template section that renders the parent category and the direct service category in the details tab:

```html
<!-- Show the parent category first so the hierarchy reads top-down. -->
<div class="details-item" *ngIf="data.parentServiceCategory">
  <div class="details-label">
    {{
      getServiceCategoryLabel("applicationDescription")
    }}:
  </div>
  <div class="details-value">
    {{
      data.parentServiceCategory.Description.Column.GetDisplayValue().length > 0
        ? data.parentServiceCategory.Description.Column.GetDisplayValue()
        : ("#LDS#Not set" | translate)
    }}
  </div>
</div>
<div class="details-item" *ngIf="data.parentServiceCategory">
  <div class="details-label">
    {{
      getServiceCategoryLabel("helpText")
    }}:
  </div>
  <div class="details-value">
    {{
      data.parentServiceCategory.Remarks.Column.GetDisplayValue().length > 0
        ? data.parentServiceCategory.Remarks.Column.GetDisplayValue()
        : ("#LDS#Not set" | translate)
    }}
  </div>
</div>

<!-- Show the category directly assigned to the product below its parent. -->
<div class="details-item" *ngIf="data.serviceCategory">
  <div class="details-label">
    {{
      getServiceCategoryLabel("applicationFilterDescription")
    }}:
  </div>
  <div class="details-value">
    {{
      data.serviceCategory.Description.Column.GetDisplayValue().length > 0
        ? data.serviceCategory.Description.Column.GetDisplayValue()
        : ("#LDS#Not set" | translate)
    }}
  </div>
</div>

<div class="details-item" *ngIf="data.serviceCategory">
  <div class="details-label">
    {{ getServiceCategoryLabel("filterHelpText") }}:
  </div>
  <div class="details-value">
    {{
      data.serviceCategory.Remarks.Column.GetDisplayValue().length > 0
        ? data.serviceCategory.Remarks.Column.GetDisplayValue()
        : ("#LDS#Not set" | translate)
    }}
  </div>
</div>
```

### HTML Commentary

- `*ngIf="data.parentServiceCategory"` ensures that parent category fields are rendered only when parent data is available.
- The parent category is displayed before the direct category so the hierarchy is understandable from top to bottom.
- `Description` and `Remarks` are rendered separately to expose the most useful category metadata in a readable format.
- `getServiceCategoryLabel(...)` is used for the labels so the same backend columns can be displayed with context-specific names.
- `GetDisplayValue()` is used for the field value so the template shows the user-facing representation of the column.
- The ternary fallback to `"#LDS#Not set"` ensures that empty values do not appear as blank lines in the sidesheet.
- `*ngIf="data.serviceCategory"` ensures that the direct category block is only shown when the product category was resolved successfully.

### Label Layout

The German labels are longer than the English labels. To prevent label text from overlapping the value column, the label column was widened from `120px` to `180px`.

```scss
.details-label {
  text-align: right;
  padding-right: 15px;
  max-width: 180px;
}
```

The value column was not changed. It continues to use the existing flex behavior and renders the backend display values as before.

## Important Design Decisions

- The implementation is intentionally non-invasive and extends the existing details tab.
- Parent category data is optional and only shown when a parent exists.
- The direct service category remains the main category shown for the selected product.
- Category labels are overridden locally in the frontend because the same backend columns require different display names in this specific sidesheet.
- Failures during category lookup must not block the sidesheet from opening.
- Empty or missing category data results in omitted UI blocks instead of runtime errors.

## Error Handling and Fallback Behavior

The implementation is defensive by design:

- If `UID_AccProductGroup` is missing, no category lookup is executed.
- If the direct category cannot be resolved, no category details are shown.
- If the parent category does not exist, only the direct category is shown.
- If an exception occurs during lookup, the sidesheet still opens with the existing product information.

This ensures that the feature improves the UI when data is available, but never degrades the baseline product details experience.

## Files Affected

- `projects/qer/src/lib/new-request/new-request-product/product-details-sidesheet/product-details.service.ts`
- `projects/qer/src/lib/new-request/new-request-product/product-details-sidesheet/product-details-sidesheet.component.ts`
- `projects/qer/src/lib/new-request/new-request-product/product-details-sidesheet/product-details-sidesheet.component.html`
- `projects/qer/src/lib/new-request/new-request-product/product-details-sidesheet/product-details-sidesheet.component.scss`

## Expected Behavior After Change

- Product with direct service category and parent category: both hierarchy levels are shown.
- Product with direct service category but no parent: only the direct category is shown.
- Product without `UID_AccProductGroup`: no additional category section is shown.
- Lookup error during category loading: sidesheet still opens without service category details.

## Testing Recommendations

- Open a product linked to a service category with a parent category and verify that both descriptions and remarks are shown.
- Open a product linked to a top-level service category and verify that only one category section is shown.
- Open a product without a linked service category and verify that the sidesheet behaves as before.
- Verify that empty `Description` or `Remarks` values render as `Not set`.
- Verify the custom labels in English and German.
- Verify that long German labels do not overlap the displayed values.

## Business Value

This enhancement improves transparency in the product request process by exposing relevant category context directly in the product details sidesheet.

Users can better understand how a product is classified, while administrators benefit from clearer, more structured contextual information without introducing additional navigation steps.
