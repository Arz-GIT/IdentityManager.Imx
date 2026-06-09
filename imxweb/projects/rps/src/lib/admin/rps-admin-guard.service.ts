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

import { Injectable, OnDestroy } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { Subscription } from 'rxjs';

import { AppConfigService, RouteGuardService } from 'qbm';
import { RpsPermissionsService } from './rps-permissions.service';

@Injectable({
  providedIn: 'root'
})
export class RpsAdminGuardService implements CanActivate, OnDestroy {
  private onSessionResponse: Subscription;

  constructor(
    private readonly rpsPermissionService: RpsPermissionsService,
    private readonly appConfig: AppConfigService,
    private readonly router: Router,
    private readonly routeGuardService: RouteGuardService
  ) { }

  public async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    if (await this.routeGuardService.canActivate(route, state)) {
      const userIsRpsAdmin = await this.rpsPermissionService.isRpsAdmin();
      if (!userIsRpsAdmin) {
        this.router.navigate([this.appConfig.Config.routeConfig.start], { queryParams: {} });
      }
      return userIsRpsAdmin;
    }
    this.router.navigate([this.appConfig.Config.routeConfig.login]);
    return false;
  }

  public ngOnDestroy(): void {
    if (this.onSessionResponse) {
      this.onSessionResponse.unsubscribe();
    }
  }
}
