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

import { Clipboard } from '@angular/cdk/clipboard';
import { Component, Inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EUI_SIDESHEET_DATA } from '@elemental-ui/core';
import { PortalServicecategories, PortalServiceitems, QerProjectConfig } from '@imx-modules/imx-api-qer';
import { TranslateService } from '@ngx-translate/core';
import { HELP_CONTEXTUAL, LdsReplacePipe, SnackBarService } from 'qbm';
import { NEW_REQUEST_ROUTE } from '../../constants';

type ServiceCategoryLabel = 'applicationDescription' | 'helpText' | 'applicationFilterDescription' | 'filterHelpText';

@Component({
    selector: 'imx-product-details-sidesheet',
    templateUrl: './product-details-sidesheet.component.html',
    styleUrls: ['./product-details-sidesheet.component.scss'],
    standalone: false
})
export class ProductDetailsSidesheetComponent implements OnInit {
  public hasEntitlements: boolean;

  /**
   * A list of AccProduct properties, that can be customized in the Admin Portal:
   * ServerConfig/ITShopConfig/AccProductProperties
   */
  protected accProductProperties: string[] = [];

  /** A list of properties, that cannot be customized in the Admin Portal. */
  protected fixedProductProperties = ['ServiceCategoryFullPath', 'TableName', 'Tags'];

  public entitlementInfoContextId = HELP_CONTEXTUAL.NewRequestProductDetailsEntitlements;

  /** A mapping between properties/columns and a css class to visualize the property value. */
  private cssPropertyMapping = new Map<string, string>([
    ['ServiceCategoryFullPath', 'link'],
    ['TableName', 'bold'],
    ['Tags', 'bold'],
    ['ArticleCode', 'bold'],
  ]);

  constructor(
    @Inject(EUI_SIDESHEET_DATA)
    public data: {
      item: PortalServiceitems;
      serviceCategory?: PortalServicecategories;
      parentServiceCategory?: PortalServicecategories;
      orderStatus: {
        statusIcon: string;
        statusDisplay: string;
      } | null;
      imageUrl: string;
      projectConfig: QerProjectConfig;
      sysAdminComment?: string;
    },
    private snackbar: SnackBarService,
    private translate: TranslateService,
    private ldsReplace: LdsReplacePipe,
    private clipboard: Clipboard,
    private route: Router,
  ) {}

  public ngOnInit(): void {
    this.hasEntitlements = ['ESet', 'QERAssign'].includes(this.getValue('TableName'));
    this.accProductProperties = this.data?.projectConfig?.ITShopConfig?.AccProductProperties ?? [];
  }

  /** Returns the display value for the given property/column. */
  public getDisplay(column: string): string {
    const value: string = this.data.item.GetEntity().GetColumn(column).GetDisplayValue();
    return value;
  }

  /** Returns the caption for the given property/column. */
  protected getCaption(column: string): string {
    return this.data.item.GetEntity().GetColumn(column).GetMetadata().GetDisplay();
  }

  protected getServiceCategoryLabel(label: ServiceCategoryLabel): string {
    const isGerman = this.translate.currentLang?.toLowerCase().startsWith('de');
    const labels: Record<ServiceCategoryLabel, { de: string; en: string }> = {
      applicationDescription: { de: 'Applikationbeschreibung', en: 'Application description' },
      helpText: { de: 'Hilfetext', en: 'Help text' },
      applicationFilterDescription: { de: 'Filter Anwendungsbeschr.', en: 'Application filter description' },
      filterHelpText: { de: 'Filter Hilfetext', en: 'Filter Help text' },
    };
    return labels[label][isGerman ? 'de' : 'en'];
  }

  /** Returns a special css class for the given property/column.  */
  protected getCssClass(column: string): string {
    return this.cssPropertyMapping.get(column) ?? '';
  }

  private getValue(column: string): string {
    const value: string = this.data.item.GetEntity().GetColumn(column).GetValue();
    return value;
  }

  /**
   * Display a snackbar with copied url to clipboard
   */
  public copyUrl(): void {
    const url = this.createUrl();
    this.clipboard.copy(url);
    this.snackbar.open(
      {
        key: this.ldsReplace.transform(this.translate.instant('#LDS#The following product URL has been successfully copied to your clipboard: {0}'), url),
      },
      '#LDS#Close',
      { duration: 3000 },
    );
  }

  /**
   * Uses the window location and module route head to get the platform origin, combines that with the relative serialized url from the router
   */
  private createUrl(): string {
    const domain = window.location.href.split('/' + NEW_REQUEST_ROUTE)[0];
    const tree = this.route.parseUrl(this.route.url);
    tree.queryParams = {
      ...tree.queryParams,
      serviceItem: this.data.item.GetEntity().GetKeys().join(','),
    };
    return [domain, this.route.serializeUrl(tree)].join('');
  }
}
