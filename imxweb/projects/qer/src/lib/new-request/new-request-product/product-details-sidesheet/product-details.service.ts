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
import { TypedClient as RmsTypedClient, V2Client as RmsV2Client } from '@imx-modules/imx-api-rms';

import { CompareOperator, FilterType, IWriteValue, MultiValue, TypedEntity } from '@imx-modules/imx-qbm-dbts';
import { AppConfigService, ClassloggerService, ImxTranslationProviderService, LdsReplacePipe, calculateSidesheetWidth } from 'qbm';
import { ImageService } from '../../../itshop/image.service';
import { ProjectConfigurationService } from '../../../project-configuration/project-configuration.service';
import { ProductDetailsSidesheetComponent } from './product-details-sidesheet.component';

@Injectable({
  providedIn: 'root',
})
export class ProductDetailsService {
  private rmsTypedClient?: RmsTypedClient;

  constructor(
    private readonly image: ImageService,
    private readonly ldsReplace: LdsReplacePipe,
    private readonly sidesheetService: EuiSidesheetService,
    private readonly translateService: TranslateService,
    private readonly projectConfigService: ProjectConfigurationService,
    private readonly appConfig: AppConfigService,
    private readonly logger: ClassloggerService,
    private readonly translationProvider: ImxTranslationProviderService,
  ) {
    try {
      const rmsClient = new RmsV2Client(this.appConfig.apiClient, this.appConfig.client);
      this.rmsTypedClient = new RmsTypedClient(rmsClient, this.translationProvider);
    } catch (error) {
      this.logger.error(this, error);
    }
  }

  public async showProductDetails(item: TypedEntity, recipients: IWriteValue<string>): Promise<void> {
    const projectConfig = await this.projectConfigService.getConfig();

    const orderStatus = await this.getOrderStatus(item, recipients);
    const sysAdminComment = await this.getSysAdminComment(item);
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
          orderStatus: orderStatus,
          imageUrl: this.getProductImage(item),
          projectConfig,
          sysAdminComment,
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

  private async getSysAdminComment(item: TypedEntity): Promise<string | undefined> {
    try {
      const uidAccProduct = this.getUidAccProduct(item);
      if (!uidAccProduct || !this.rmsTypedClient) {
        return undefined;
      }

      const result = await this.rmsTypedClient.PortalAdminRoleEset.Get({
        StartIndex: 0,
        PageSize: 1,
        filter: [{
          ColumnName: 'UID_AccProduct',
          Type: FilterType.Compare,
          CompareOp: CompareOperator.Equal,
          Value1: uidAccProduct,
        }],
        withProperties: 'Commentary',
      });
      const entity = result?.Data?.[0]?.GetEntity();
      const manualFlag = this.tryGetColumnValue(entity, 'CustomProperty01');
      const commentary = this.tryGetColumnDisplayValue(entity, 'Commentary');
      return manualFlag?.trim().toLocaleLowerCase() === 'manuell' && commentary?.trim() ? commentary : undefined;
    } catch {
      return undefined;
    }
  }

  private getUidAccProduct(item: TypedEntity): string | undefined {
    try {
      return item.GetEntity().GetColumn('UID_AccProduct')?.GetValue() || item.GetEntity().GetKeys()?.[0];
    } catch {
      return item.GetEntity().GetKeys()?.[0];
    }
  }

  private tryGetColumnDisplayValue(entity: any, columnName: string): string | undefined {
    try {
      return entity?.GetColumn?.(columnName)?.GetDisplayValue?.();
    } catch {
      return undefined;
    }
  }

  private tryGetColumnValue(entity: any, columnName: string): string | undefined {
    try {
      return entity?.GetColumn?.(columnName)?.GetValue?.();
    } catch {
      return undefined;
    }
  }
}
