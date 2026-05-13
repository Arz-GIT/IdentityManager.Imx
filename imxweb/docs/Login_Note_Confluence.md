# Login Note for RoleBasedManualADS

## Overview

This change extends the login page to display an additional translated login note for the `RoleBasedManualADS` authentication provider.

The note is only shown for this specific authentication mode and only when a translated value is available. This keeps the login page unchanged for all other providers.

## Functional Goal

When a user selects the authentication provider `RoleBasedManualADS`, the application should:

1. Load the translated text for `#LDS#Login note`.
2. Store the translated value in the login component.
3. Render the note below the login input fields.
4. Hide the note for all other authentication providers.

## Scope of the Change

Included:

- Loading a translated login note via `TranslateService`
- Storing the note in the login component
- Conditionally rendering the note in the login page template for `RoleBasedManualADS`

Not included:

- No authentication logic changes
- No change to login request payload
- No changes for OAuth or other authentication providers

## Implementation Summary

The logic is implemented in:

- `projects/qbm/src/lib/login/login.component.ts`
- `projects/qbm/src/lib/login/login.component.html`

### High-Level Flow

1. The login component injects `TranslateService`.
2. The constructor loads `#LDS#Login note` and stores it in `loginNote`.
3. The selected authentication provider is tracked through `selectedConfigProvider`.
4. The HTML checks whether the selected provider is `RoleBasedManualADS`.
5. The note is rendered only when `loginNote` contains a value.

## TypeScript Implementation

```ts
import { TranslateService } from "@ngx-translate/core";

export class LoginComponent implements OnInit, OnDestroy {
  public logoUrl: string;
  public newUserConfigProvider: AuthConfigProvider;

  private loginNote: string;

  private readonly newUserConfigProviderName = "NewUser";
  private readonly authProviderStorageKey = "selectedAuthProvider";
  private readonly subscriptions: Subscription[] = [];

  constructor(
    public readonly appConfigService: AppConfigService,
    private readonly authentication: AuthenticationService,
    private readonly router: Router,
    private readonly logger: ClassloggerService,
    private readonly systemInfoService: SystemInfoService,
    private readonly componentFactoryResolver: ComponentFactoryResolver,
    private readonly splash: EuiSplashScreenService,
    private readonly busyService: EuiLoadingService,
    private readonly themeService: EuiThemeService,
    private readonly detector: HighContrastModeDetector,
    private readonly translate: TranslateService,
  ) {
    this.translate
      .get("#LDS#Login note")
      .subscribe((trans: string) => (this.loginNote = trans));
  }
}
```

### TypeScript Commentary

- `TranslateService` is injected so the login note can be resolved through the standard translation flow.
- `loginNote` stores the translated text and exposes it to the template.
- The translation is loaded once in the constructor because the note is static for the page.
- The change is UI-only and does not modify login execution.

## HTML Implementation

```html
<div
  [hidden]="selectedConfigProvider?.isOAuth2"
  *ngFor="let authProp of selectedConfigProvider?.authProps"
  class="imx-loginInput">
  <input
    attr.data-imx-identifier="login-input-{{
      authProp.name.toLowerCase()
    }}"
    [type]="authProp.inputType"
    [placeholder]="authProp.display"
    [(ngModel)]="loginData[authProp.name]"
    (keyup.enter)="login()"
    class="imx-login-input" />
</div>
<div *ngIf="selectedConfigProvider?.name === 'RoleBasedManualADS'">
  <div *ngIf="loginNote" style="margin: 12px">{{ loginNote }}</div>
</div>
```

### HTML Commentary

- The note is rendered after the login inputs so it appears in the correct visual context.
- `*ngIf="selectedConfigProvider?.name === 'RoleBasedManualADS'"` restricts the note to the intended provider.
- `*ngIf="loginNote"` avoids rendering an empty block when no translation is available.
- The inline margin provides simple spacing between the form and the note.

## Important Design Decisions

- The note is limited to one specific authentication provider.
- The text comes from translations instead of being hard-coded.
- The feature is display-only and does not affect authentication behavior.
- If the translation is missing, the UI silently omits the note.

## Expected Behavior After Change

- `RoleBasedManualADS` selected and translation available: the login note is shown.
- `RoleBasedManualADS` selected and translation missing: no note is shown.
- Any other authentication provider selected: no note is shown.
- Authentication behavior remains unchanged in all cases.
