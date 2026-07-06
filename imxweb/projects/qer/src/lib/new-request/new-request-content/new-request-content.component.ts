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

import { Component, OnDestroy } from '@angular/core';
import { MatSlideToggle, MatSlideToggleChange } from '@angular/material/slide-toggle';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs/internal/Subscription';

import { PortalServicecategories } from '@imx-modules/imx-api-qer';

import { EuiSidesheetService } from '@elemental-ui/core';
import { TranslateService } from '@ngx-translate/core';
import { calculateSidesheetWidth, LdsReplacePipe } from 'qbm';
import { ProjectConfigurationService } from '../../project-configuration/project-configuration.service';
import { NewRequestAddToCartService } from '../new-request-add-to-cart.service';
import { NewRequestOrchestrationService } from '../new-request-orchestration.service';
import { NewRequestProductBundleComponent } from '../new-request-product-bundle/new-request-product-bundle.component';
import { NewRequestProductComponent } from '../new-request-product/new-request-product.component';
import { NewRequestReferenceUserComponent } from '../new-request-reference-user/new-request-reference-user.component';
import { NewRequestSelectedProductsComponent } from '../new-request-selected-products/new-request-selected-products.component';
import { SelectedProductItem } from '../new-request-selected-products/selected-product-item.interface';
import { NewRequestSelectionService } from '../new-request-selection.service';
import { NewRequestTabModel } from '../new-request-tab/new-request-tab-model';

@Component({
  selector: 'imx-new-request-content',
  templateUrl: './new-request-content.component.html',
  styleUrls: ['./new-request-content.component.scss'],
  standalone: false,
})
export class NewRequestContentComponent implements OnDestroy {
  private subscriptions: Subscription[] = [];

  public navLinks: NewRequestTabModel[] = [];
  public catSlider: MatSlideToggle;
  public showCatSlider = false;
  public selectedCategory: PortalServicecategories;

  constructor(
    public readonly orchestration: NewRequestOrchestrationService,
    public readonly selectionService: NewRequestSelectionService,
    private readonly addToCartService: NewRequestAddToCartService,
    private readonly projectConfigService: ProjectConfigurationService,
    private readonly ldsReplace: LdsReplacePipe,
    private readonly router: Router,
    private readonly sidesheetService: EuiSidesheetService,
    private readonly translate: TranslateService,
  ) {
    this.subscriptions.push(
      this.router.events.subscribe(async (event) => {
        if (event instanceof NavigationEnd) {
          await this.setupNavLinks();
          this.orchestration.selectedTab.set(this.navLinks.find((tab) => this.router.url.includes(`/newrequest/${tab.link}`)));
          this.orchestration.selectedTab()?.component === NewRequestProductComponent
            ? (this.showCatSlider = true)
            : (this.showCatSlider = false);
        }
      }),
    );
  }

  public ngOnDestroy(): void {
    this.subscriptions.forEach((subscription: Subscription) => subscription.unsubscribe());
  }

  public onSelectedTabChange(selectedTab: NewRequestTabModel): void {
    this.orchestration.selectedTab.set(selectedTab);
  }

  public onCatSliderChanged(event: MatSlideToggleChange): void {
    this.orchestration.includeChildCategories.set(event.checked);
  }

  public async openSelected(): Promise<void> {
    const sidesheetRef = this.sidesheetService.open(NewRequestSelectedProductsComponent, {
      title: this.ldsReplace.transform(
        await this.translate.instant('#LDS#Heading View Selected Products ({0})'),
        this.selectionService.selectedProducts.length,
      ),
      width: calculateSidesheetWidth(800, 0.5),
      testId: 'new-request-selected-sidesheet',
      padding: '0px',
      disableClose: true,
      data: {
        candidates: this.selectionService.selectedProducts,
      },
    });

    sidesheetRef.afterClosed().subscribe((result: SelectedProductItem[]) => {
      if (!result) {
        return;
      }

      this.selectionService.selectedProducts = result;
      this.selectionService.selectedProducts$.next(result);
    });
  }

  public deselectCandidates(): void {
    this.selectionService.clearProducts();
  }

  public async pushCandidatesToCart(): Promise<void> {
    this.addToCartService.addItemsToCart();
  }

  private async setupNavLinks() {
    if (this.navLinks?.length > 0) {
      return;
    }

    const projectConfig = await this.projectConfigService.getConfig();
    const canSelectFromTemplate = projectConfig.ITShopConfig?.VI_ITShop_ProductSelectionFromTemplate;
    const canSelectByRefUser = projectConfig.ITShopConfig?.VI_ITShop_ProductSelectionByReferenceUser;

    this.navLinks.push({
      id: 0,
      title: '#LDS#Heading All Products',
      component: NewRequestProductComponent,
      link: 'allProducts',
      active: true,
    });

    if (canSelectByRefUser) {
      this.navLinks.push({
        id: 2,
        title: '#LDS#Heading Products by Reference User',
        component: NewRequestReferenceUserComponent,
        link: 'productsByReferenceUser',
        active: false,
      });
    }

    if (canSelectFromTemplate) {
      this.navLinks.push({
        id: 3,
        title: '#LDS#Heading Product Bundles',
        component: NewRequestProductBundleComponent,
        link: 'productBundles',
        active: false,
      });
    }
  }
}
