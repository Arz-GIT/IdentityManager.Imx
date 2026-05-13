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
import { TypedClient as RmsTypedClient, V2Client as RmsV2Client } from "imx-api-rms";

import { PortalShopServiceitems, QerProjectConfig } from "imx-api-qer";
import { CompareOperator, FilterType, IWriteValue, MultiValue } from "imx-qbm-dbts";

import { AppConfigService, ClassloggerService, ImxTranslationProviderService, LdsReplacePipe } from "qbm";
import { ImageService } from "../../../itshop/image.service";
import { ProjectConfigurationService } from "../../../project-configuration/project-configuration.service";
import { ProductDetailsSidesheetComponent } from "./product-details-sidesheet.component";

@Injectable({
  providedIn: "root",
})
export class ProductDetailsService {
  private projectConfig: QerProjectConfig;
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
      // Build a lightweight RMS client locally so qer can resolve ESet data
      // without introducing a project-level dependency on the rms Angular library.
      const rmsClient = new RmsV2Client(this.appConfig.apiClient, this.appConfig.client);
      this.rmsTypedClient = new RmsTypedClient(rmsClient, this.translationProvider);
    } catch (error) {
      this.logger.error(this, error);
    }
  }

  public async showProductDetails(
    item: PortalShopServiceitems,
    recipients: IWriteValue<string>,
  ): Promise<void> {
    if (!this.projectConfig) {
      this.projectConfig = await this.projectConfigService.getConfig();
    }

    const orderStatus = await this.getOrderStatus(item, recipients);
    const sysAdminData = await this.getSysAdminDetails(item);

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
          orderStatus: orderStatus,
          imageUrl: this.getProductImage(item),
          projectConfig: this.projectConfig,
          sysAdminComment: sysAdminData.commentary,
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

  private async getSysAdminDetails(
    item: PortalShopServiceitems,
  ): Promise<{ commentary?: string }> {
    try {
      const uidAccProduct = this.getUidAccProduct(item);
      if (!uidAccProduct) {
        return {};
      }

      if (!this.rmsTypedClient) {
        return {};
      }

      // Products are linked to system roles through UID_AccProduct.
      // The matching ESet carries the sysadmin commentary and the manual flag.
      // The live API returns CustomProperty01 together with the commentary data.
      // Requesting CustomProperty01 explicitly via withProperties is rejected.
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

      const role = result?.Data?.[0];
      if (!role) {
        return {};
      }

      const entity = role.GetEntity();
      const commentary = this.tryGetColumnDisplayValue(entity, "Commentary");
      const customProperty01 = this.tryGetColumnValue(entity, "CustomProperty01");
      // Only products marked as "manuell" should show the sysadmin commentary.
      const showSysAdminComment = this.isManualFlag(customProperty01);

      return {
        commentary:
          showSysAdminComment && commentary?.trim().length
            ? commentary
            : undefined,
      };
    } catch {
      return {};
    }
  }

  private getUidAccProduct(item: PortalShopServiceitems): string | undefined {
    try {
      // Prefer the explicit UID_AccProduct column when the product entity exposes it.
      const uidAccProduct = item.GetEntity().GetColumn("UID_AccProduct")?.GetValue();
      if (uidAccProduct) {
        return uidAccProduct;
      }
    } catch {
    }

    // Fallback to the product primary key when the column is not available.
    return item.GetEntity().GetKeys()?.[0];
  }

  private isManualFlag(value: string | undefined): boolean {
    return value?.trim().toLocaleLowerCase() === "manuell";
  }

  // Read a display value defensively because not every ESet response contains every column.
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

  // Read the raw value for the CustomProperty01 flag.
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
}
