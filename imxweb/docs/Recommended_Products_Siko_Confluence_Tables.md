# Siko Confluence Tables - Recommended Products

## 3.4 Third Party Tools and Libraries

| Tool / Library | Version / Source | Purpose | Security Handling |
| --- | --- | --- | --- |
| Angular Framework Packages (`@angular/*`) | `^14.3.0` | Framework for Web Portal UI, routing, forms, and rendering | Centrally managed through `imxweb/package.json` |
| Angular Material / CDK | `^14.2.7` | UI components and Angular Material controls | Existing Web Portal dependency |
| RxJS | `~6.6.7` | Reactive event and subscription handling | Standard Angular dependency |
| Zone.js | `~0.11.5` | Angular change detection support | Standard Angular runtime dependency |
| TypeScript Runtime Helpers (`tslib`) | `^2.0.0` | TypeScript runtime helpers | Standard Angular/TypeScript dependency |
| `@ngx-translate/core`, `@ngx-translate/http-loader` | `^11.0.1`, `^4.0.0` | Translation and localization handling | Existing Web Portal translation mechanism |
| Elemental UI (`@elemental-ui/core`, `@elemental-ui/cadence-icon`) | Local packages under `imxweb/imx-modules` | One Identity UI components and icons | Controlled local packages delivered with the Web Portal source |
| One Identity API Packages (`imx-api-*`, `imx-qbm-dbts`) | Local packages under `imxweb/imx-modules` | Typed API clients and data structures | Controlled local packages delivered with the Web Portal source |

## 6.4.3 Procedure Descriptions

| Reference | Description | Last Review Date |
| --- | --- | --- |
| `imxweb/docs/Recommended_Products_Tab_Ausblenden_Confluence.md` | Procedure description for hiding the **Recommended Products** tab on the **New Request** page. The document describes goal, affected file, background, initial situation, implementation, result, validation, and rollback. | 2026-07-10 |
| `imxweb/projects/qer/src/lib/new-request/new-request-content/new-request-content.component.ts` | Implementation evidence. The tab registration for **Recommended Products** is guarded by `showRecommendedProducts = false`. The **Products by Reference User** tab remains controlled by the existing project configuration. | 2026-07-10 |
| `imxweb/package.json` | Reference for the Angular Web Portal third-party libraries and build dependencies. | 2026-07-10 |

## 6.4.4 Secure Code Review

| Link to Artifact / Evidence | Standards Reference | Justification if N/A |
| --- | --- | --- |
| `imxweb/docs/Recommended_Products_Tab_Ausblenden_Confluence.md` | ST54 - 2.2; Secure Application Development; Secure Application Development Checklist | Documents the reviewed change, validation steps, and rollback path. |
| `imxweb/projects/qer/src/lib/new-request/new-request-content/new-request-content.component.ts` | ST54 - 2.2; A6A 5, 14, 34; CDP 265, 221, 224, 292, 171, 358 | Code review scope: UI navigation only. No new input handling, authentication, authorization, API endpoint, persistence, dependency, or sensitive data processing was introduced. |
| `imxweb/package.json` | ST54 - 2.2; Third-party dependency review | Confirms that no new third-party dependency was added for this change. Existing Angular and One Identity Web Portal dependencies remain centrally managed. |
