/*
 * ONE IDENTITY LLC. PROPRIETARY INFORMATION
 *
 * This software is confidential.  One Identity, LLC. or one of its affiliates or
 * subsidiaries, has supplied this software to you under terms of a
 * license agreement, nondisclosure agreement or both.
 *
 * You may not copy, disclose, or use this software except in accordance with
 * those terms.
 *
 *
 * Copyright 2023 One Identity LLC.
 * ALL RIGHTS RESERVED.
 *
 * ONE IDENTITY LLC. MAKES NO REPRESENTATIONS OR
 * WARRANTIES ABOUT THE SUITABILITY OF THE SOFTWARE,
 * EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
 * TO THE IMPLIED WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE, OR
 * NON-INFRINGEMENT.  ONE IDENTITY LLC. SHALL NOT BE
 * LIABLE FOR ANY DAMAGES SUFFERED BY LICENSEE
 * AS A RESULT OF USING, MODIFYING OR DISTRIBUTING
 * THIS SOFTWARE OR ITS DERIVATIVES.
 *
 */

import { Injectable } from "@angular/core";
import { SafeUrl } from "@angular/platform-browser";
import { EuiSidesheetService } from "@elemental-ui/core";
import { TranslateService } from "@ngx-translate/core";

import {
  PortalServicecategories,
  PortalShopServiceitems,
  QerProjectConfig,
} from "imx-api-qer";
import { CompareOperator, FilterType, IWriteValue, MultiValue } from "imx-qbm-dbts";
import { LdsReplacePipe } from "qbm";
import { ImageService } from "../../../itshop/image.service";
import { ProjectConfigurationService } from "../../../project-configuration/project-configuration.service";
import { ProductDetailsSidesheetComponent } from "./product-details-sidesheet.component";

import { ServiceCategoriesService } from "../../../service-categories/service-categories.service";

@Injectable({
  providedIn: "root",
})
export class ProductDetailsService {
  private projectConfig: QerProjectConfig;

  constructor(
    private readonly image: ImageService,
    private readonly ldsReplace: LdsReplacePipe,
    private readonly sidesheetService: EuiSidesheetService,
    private readonly translateService: TranslateService,
    private readonly projectConfigService: ProjectConfigurationService,

    private readonly serviceCategoriesService: ServiceCategoriesService,
  ) {}

  public async showProductDetails(
    item: PortalShopServiceitems,
    recipients: IWriteValue<string>,
  ): Promise<void> {
    if (!this.projectConfig) {
      this.projectConfig = await this.projectConfigService.getConfig();
    }

    const orderStatus = await this.getOrderStatus(item, recipients);

    // Get service category details (service category and parent service category) for the given product item.
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

  public valueContains(input: string, values: string | string[]): boolean {
    const inputValues = MultiValue.FromString(input).GetValues();
    if (typeof values === "string") {
      return inputValues.includes(values);
    }
    return inputValues.findIndex((i) => values.includes(i)) !== -1;
  }

  public getProductImage(node: PortalShopServiceitems): SafeUrl {
    try {
      return this.image.getPath(node);
    } catch (e) {}
  }

  private async getOrderStatus(
    item: PortalShopServiceitems,
    recipients: IWriteValue<string>,
  ): Promise<{ statusIcon: string; statusDisplay: string } | null> {
    const orderableStatus = item.GetEntity().GetColumn("OrderableStatus").GetValue();
    if (!orderableStatus || orderableStatus.length === 0) {
      return null;
    }

    switch (true) {
      case this.valueContains(orderableStatus, [
        "PERSONHASOBJECT",
        "PERSONHASASSIGNMENTORDER",
        "ASSIGNED",
      ]):
        const statusDisplay: string = await this.translateService
          .get("#LDS#This product has already been assigned to {0}.")
          .toPromise();
        return {
          statusIcon: "info",
          statusDisplay: this.ldsReplace.transform(
            statusDisplay,
            recipients.Column.GetDisplayValue(),
          ),
        };

      case this.valueContains(orderableStatus, "ORDER"):
        return {
          statusIcon: "request",
          statusDisplay: await this.translateService
            .get("#LDS#This product has already been requested.")
            .toPromise(),
        };

      case this.valueContains(orderableStatus, "NOTORDERABLE"):
        return {
          statusIcon: "error",
          statusDisplay: await this.translateService
            .get("#LDS#This product cannot currently be requested.")
            .toPromise(),
        };

      case this.valueContains(orderableStatus, "CART"):
        return {
          statusIcon: "error",
          statusDisplay: await this.translateService
            .get("#LDS#This product is already in your shopping cart.")
            .toPromise(),
        };
    }
  }

  // Gets the service category and its parent category (if available) for the given product item.
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
    } catch (error) {
      return {};
    }
  }

  // Gets the service category for the given product item.
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
}
