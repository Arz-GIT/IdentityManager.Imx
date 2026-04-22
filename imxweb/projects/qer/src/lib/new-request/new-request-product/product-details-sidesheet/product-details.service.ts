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
 * Copyright 2025 One Identity LLC.
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

import { Injectable } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { EuiSidesheetService } from '@elemental-ui/core';
import { TranslateService } from '@ngx-translate/core';

import { PortalServicecategories } from '@imx-modules/imx-api-qer';
import { IWriteValue, MultiValue, TypedEntity } from '@imx-modules/imx-qbm-dbts';
import { LdsReplacePipe, calculateSidesheetWidth } from 'qbm';
import { ImageService } from '../../../itshop/image.service';
import { ProjectConfigurationService } from '../../../project-configuration/project-configuration.service';
import { ServiceCategoriesService } from '../../../service-categories/service-categories.service';
import { ProductDetailsSidesheetComponent } from './product-details-sidesheet.component';

@Injectable({
  providedIn: 'root',
})
export class ProductDetailsService {
  constructor(
    private readonly image: ImageService,
    private readonly ldsReplace: LdsReplacePipe,
    private readonly sidesheetService: EuiSidesheetService,
    private readonly translateService: TranslateService,
    private readonly projectConfigService: ProjectConfigurationService,
    private readonly serviceCategoriesService: ServiceCategoriesService,
  ) {}

  public async showProductDetails(item: TypedEntity, recipients: IWriteValue<string>): Promise<void> {
    const projectConfig = await this.projectConfigService.getConfig();

    const orderStatus = await this.getOrderStatus(item, recipients);
    const serviceCategoryDetails = await this.getServiceCategoryDetails(item);
    await this.sidesheetService
      .open(ProductDetailsSidesheetComponent, {
        title: await this.translateService.instant('#LDS#Heading View Product Details'),
        subTitle: item.GetEntity().GetDisplay(),
        icon: 'info',
        width: calculateSidesheetWidth(),
        padding: '0px',
        testId: 'product-details-sidesheet',
        data: {
          item,
          serviceCategory: serviceCategoryDetails.serviceCategory,
          parentServiceCategory: serviceCategoryDetails.parentServiceCategory,
          orderStatus: orderStatus,
          imageUrl: this.getProductImage(item),
          projectConfig,
        },
      })
      .afterClosed()
      .toPromise();
  }

  public valueContains(input: string, values: string | string[]): boolean {
    const inputValues = MultiValue.FromString(input).GetValues();
    if (typeof values === 'string') {
      return inputValues.includes(values);
    }
    return inputValues.findIndex((i) => values.includes(i)) !== -1;
  }

  public getProductImage(node: TypedEntity): SafeUrl | undefined {
    try {
      return this.image.getPath(node);
    } catch (e) {}
  }

  private async getOrderStatus(
    item: TypedEntity,
    recipients: IWriteValue<string>,
  ): Promise<{ statusIcon: string; statusDisplay: string } | undefined> {
    const orderableStatus = item.GetEntity().GetColumn('OrderableStatus').GetValue();
    if (!orderableStatus || orderableStatus.length === 0) {
      return undefined;
    }

    switch (true) {
      case this.valueContains(orderableStatus, ['PERSONHASOBJECT', 'PERSONHASASSIGNMENTORDER', 'ASSIGNED']):
        const statusDisplay: string = await this.translateService.instant('#LDS#This product has already been assigned to {0}.');
        return { statusIcon: 'info', statusDisplay: this.ldsReplace.transform(statusDisplay, recipients.Column.GetDisplayValue()) };

      case this.valueContains(orderableStatus, 'ORDER'):
        return {
          statusIcon: 'request',
          statusDisplay: await this.translateService.instant('#LDS#This product has already been requested.'),
        };

      case this.valueContains(orderableStatus, 'NOTORDERABLE'):
        return {
          statusIcon: 'error',
          statusDisplay: await this.translateService.instant('#LDS#This product cannot currently be requested.'),
        };

      case this.valueContains(orderableStatus, 'CART'):
        return {
          statusIcon: 'error',
          statusDisplay: await this.translateService.instant('#LDS#This product is already in your shopping cart.'),
        };
    }
  }

  private async getServiceCategoryDetails(item: TypedEntity): Promise<{
    serviceCategory?: PortalServicecategories;
    parentServiceCategory?: PortalServicecategories;
  }> {
    try {
      const uidAccProductGroup = item.GetEntity().GetColumn('UID_AccProductGroup').GetValue() as string;
      if (!uidAccProductGroup) {
        return {};
      }

      const serviceCategory = (await this.serviceCategoriesService.getById(uidAccProductGroup))?.Data?.[0];
      const parentUid = serviceCategory?.UID_AccProductGroupParent?.value;
      if (!parentUid) {
        return { serviceCategory };
      }

      const parentServiceCategory = (await this.serviceCategoriesService.getById(parentUid))?.Data?.[0];
      return { serviceCategory, parentServiceCategory };
    } catch {
      return {};
    }
  }
}
