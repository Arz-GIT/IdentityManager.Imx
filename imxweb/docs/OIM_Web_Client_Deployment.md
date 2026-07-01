# One Identity Manager Web Client Deployment

Diese Dokumentation beschreibt den Deployment-Prozess fuer den One Identity Manager Web Client direkt auf dem API Server. Es wird kein PowerShell-Deployment-Script und kein Software Loader verwendet.

Der Prozess ist zuerst fuer DEV vorgesehen. Kein direktes Deployment nach PROD ohne erfolgreich getesteten DEV/QS-Rollout.

## Ziel

Aus dem aktuell ausgecheckten Web-Client-Stand werden die benoetigten Web-Pakete gebaut und als ZIP-Dateien bereitgestellt.

Standardfall fuer das Portal:

```text
Html_qer-app-portal.zip
```

Wenn zusaetzliche Module betroffen sind, werden diese Module ebenfalls gebaut und als eigene ZIPs bereitgestellt, z. B.:

```text
Html_rps.zip
```

Diese ZIP-Dateien werden anschliessend auf dem API Server unter `C:\inetpub\wwwroot\ApiServer\bin\imxweb\custom` abgelegt. Der API Server verwendet diese Pakete fuer die Auslieferung der Web-Anwendungen und zusaetzlichen Web-Module.

## Branch-Empfehlung

Fuer neue Anpassungen sollte immer vom passenden Hersteller-Branch gestartet werden, z. B. `v92`.

Empfohlener Ablauf:

```text
1. Neuen Feature-Branch von v92 erstellen, z. B. feature/my-change.
2. Aenderung im Feature-Branch entwickeln und testen.
3. Feature-Branch nach v92_build mergen.
4. Deployment immer aus v92_build bauen.
```

`v92_build` ist damit der gemeinsame Deployment-Branch. Dort sammeln sich alle bereits freigegebenen Features. So wird verhindert, dass beim Deployment versehentlich nur ein einzelner Feature-Branch gebaut wird und aeltere Anpassungen fehlen.

Wichtig: Vor jedem Build pruefen, dass der aktuelle Git-Stand `v92_build` ist. Builds fuer das Deployment werden immer aus `v92_build` erstellt.

## Portal Build

Das Portal wird als Production Build gebaut:

```powershell
npm run build -- qer-app-portal --configuration production
```

Dieses Kommando wird fuer das Deployment immer auf dem Branch `v92_build` ausgefuehrt.

`qer-app-portal` wird aus den benoetigten Workspace-Abhaengigkeiten wie `qbm` und `qer` erzeugt. Fuer das normale Portal-Deployment wird deshalb das Portal-Paket `Html_qer-app-portal.zip` erzeugt.

`qbm` und `qer` werden in diesem Prozess nicht als separate ZIPs deployed, solange sie nur als Abhaengigkeiten des Portals verwendet werden. Wenn eine Aenderung in `qbm` oder `qer` liegt, wird das Portal erneut als Production Build gebaut und anschliessend `Html_qer-app-portal.zip` ersetzt.

## Zusaetzliche Module Bauen

Wenn neben dem Portal weitere Module betroffen sind, muessen diese Module separat als Production Build gebaut werden.

Beispiel fuer `rps`:

```powershell
npm run build -- rps --configuration production
```

Weitere Beispiele:

```powershell
npm run build -- qbm-app-landingpage --configuration production
npm run build -- qer-app-operationssupport --configuration production
npm run build -- qer-app-pwdportal --configuration production
```

Regel:

```text
Nur Module bauen und deployen, die durch die Aenderung betroffen sind.
Wenn ein Zusatzmodul betroffen ist, bekommt es ein eigenes Html_<module>.zip.
```

## ZIP-Pakete Erstellen

Nach dem Build liegen die Ergebnisse unter:

```text
imxweb\dist\<project>
```

Diese Dateien muessen manuell in eine ZIP-Datei gepackt werden. Fuer das API-Server-Deployment wird pro gebautem Projekt eine ZIP-Datei mit dem Namensschema `Html_<project>.zip` erstellt.

Wichtig: In der ZIP-Datei muss der Inhalt des jeweiligen `dist\<project>` Ordners liegen, nicht der Ordner `dist\<project>` selbst.

Beispiel fuer `qer-app-portal`:

```text
Quelle:
imxweb\dist\qer-app-portal\*

Ziel:
Html_qer-app-portal.zip
```

Die ZIP-Datei muss nach dem Entpacken direkt Dateien und Ordner wie diese enthalten:

```text
index.html
main*.js
runtime*.js
polyfills*.js
assets
```

Fuer zusaetzliche Module gilt dasselbe Prinzip:

```text
dist\rps\*  -> Html_rps.zip
dist\tsb\*  -> Html_tsb.zip
dist\aad\*  -> Html_aad.zip
```

Die ZIPs koennen mit einem normalen ZIP-Tool erstellt werden.

Manueller Ablauf:

```text
1. Nach dem Build den Ordner imxweb\dist\<project> oeffnen.
2. Alle Dateien und Ordner innerhalb von dist\<project> markieren.
3. Die markierten Inhalte als ZIP packen.
4. Die ZIP nach dem Projekt benennen, z. B. Html_qer-app-portal.zip.
5. Die fertige ZIP auf den API Server kopieren.
```

## Welche ZIPs Muessen Auf Den API Server

Deploye immer alle Pakete, die zur geaenderten Funktion gehoeren.

Standardfall Portal:

```text
Html_qer-app-portal.zip
```

Wenn zusaetzlich `rps` betroffen ist:

```text
Html_qer-app-portal.zip
Html_rps.zip
```

Wenn weitere Web-Anwendungen betroffen sind:

```text
Html_qer-app-operationssupport.zip
Html_qer-app-pwdportal.zip
Html_qbm-app-landingpage.zip
```

Bei Plugin-Libraries muessen die Plugin-ZIPs und abhaengige Plugin-ZIPs ebenfalls konsistent deployed werden.

## Deployment Auf Dem API Server

Die installierte Standardversion liegt auf dem API Server unter:

```text
C:\inetpub\wwwroot\ApiServer\bin\imxweb
```

Custom Deployments werden nicht in diesen Basisordner kopiert. Die erzeugten `Html_*.zip` Dateien werden nur in den `custom`-Ordner unterhalb des `imxweb`-Ordners kopiert.

Zielpfad auf dem API Server:

```text
C:\inetpub\wwwroot\ApiServer\bin\imxweb\custom
```

Der API Server laedt bei Custom Deployments die Pakete aus dem `custom`-Ordner. Dadurch haben die Custom-Pakete Vorrang vor der installierten Basisversion.

Wichtig: Dateien unter `C:\inetpub\wwwroot\ApiServer\bin\imxweb` duerfen nicht geloescht oder ueberschrieben werden. Nur der Ordner `C:\inetpub\wwwroot\ApiServer\bin\imxweb\custom` wird fuer Custom ZIPs verwendet.

Vor dem Kopieren:

```text
1. Zielumgebung pruefen: DEV, QS oder PROD.
2. API-Server-Pfad `C:\inetpub\wwwroot\ApiServer\bin\imxweb\custom` pruefen.
3. Vorhandene Html_*.zip Dateien sichern.
4. Sicherstellen, dass keine falsche Version gemischt wird.
5. Falls der custom-Ordner fehlt, nach Betriebsprozess anlegen oder vom API-Server-Verantwortlichen bereitstellen lassen.
6. Keine Dateien im Basisordner `C:\inetpub\wwwroot\ApiServer\bin\imxweb` loeschen oder ersetzen.
```

Deployment-Ablauf:

```text
1. API Server / IIS Application Pool stoppen oder recyceln, je nach Betriebsprozess.
2. Die neuen Html_*.zip Dateien nach `C:\inetpub\wwwroot\ApiServer\bin\imxweb\custom` kopieren.
3. Gleichnamige alte ZIP-Dateien ersetzen.
4. API Server / IIS Application Pool starten oder recyceln.
5. DEV Portal testen.
```

Es werden keine Dateien manuell in Unterordner entpackt. Deployed werden die ZIP-Dateien selbst.
Der Basisordner `C:\inetpub\wwwroot\ApiServer\bin\imxweb` bleibt unveraendert.

## DEV Testcheckliste

Nach dem Kopieren der ZIPs und dem Neustart des API Servers pruefen:

```text
1. DEV Portal in einem privaten Browserfenster oeffnen.
2. Login durchfuehren.
3. Startseite/Dashboard oeffnen.
4. IT Shop oeffnen.
5. Produktdetails oeffnen.
6. Operations Support Portal testen, falls verwendet.
7. Password Reset Portal testen, falls verwendet.
8. Landing Page / Server Administration testen, falls verwendet.
9. Browser Developer Console auf JavaScript-Fehler pruefen.
10. API Server Logs auf serverseitige Fehler pruefen.
```

## Custom Packages Pruefen

Im One Identity Manager Administration Portal des API Servers kann geprueft werden, ob die Custom ZIPs geladen wurden.

Aufruf:

```text
https://<api-server>/ApiServer/html/qbm-app-landingpage/#/admin/packages
```

Pruefung:

```text
1. Administration Portal oeffnen.
2. Links den Menuepunkt Packages oeffnen.
3. Das betroffene Paket suchen, z. B. qer-app-portal oder rps.
4. Pruefen, ob beim Paket der Hinweis Custom package angezeigt wird.
5. Pruefen, ob der Relative path auf imxweb\custom\<zip-name>.zip zeigt.
6. Last changed on und Checksum mit dem Deployment abgleichen.
```

Beispiele fuer korrekt geladene Custom Packages:

```text
qer-app-portal -> imxweb\custom\Html_qer-app-portal.zip
rps            -> imxweb\custom\Html_rps.zip
```

Wenn noch der alte Web Client angezeigt wird:

```text
1. API Server / IIS Application Pool erneut recyceln.
2. Browser Cache leeren oder privates Fenster verwenden.
3. Mit Ctrl + F5 hart neu laden.
4. Pruefen, ob die neuen Html_*.zip Dateien wirklich unter `C:\inetpub\wwwroot\ApiServer\bin\imxweb\custom` liegen.
5. Pruefen, ob keine alten ZIPs mit gleichem Namen aus einem anderen Pfad verwendet werden.
```

## Troubleshooting

Wenn ein Build fehlschlaegt:

```text
1. Das zuletzt gebaute Projekt in der Konsole pruefen.
2. Nur dieses Projekt erneut bauen, z. B. npm run build -- qer-app-portal --configuration production.
3. Falls eine Library angepasst wurde, abhaengige Apps erneut bauen.
```

Wenn das Portal nach Deployment nicht startet:

```text
1. API Server Logs pruefen.
2. Browser Console pruefen.
3. Sicherstellen, dass alle benoetigten Modul-ZIPs und App-ZIPs unter `C:\inetpub\wwwroot\ApiServer\bin\imxweb\custom` liegen.
4. ZIP-Inhalt pruefen: Inhalt von dist\<project>, nicht der dist-Ordner selbst.
5. API Server / IIS Application Pool recyceln.
6. Browser Cache leeren.
```

Wenn eine Funktion fehlt oder weiterhin alt aussieht:

```text
1. Pruefen, ob der richtige Git-Branch gebaut wurde.
2. Pruefen, ob das richtige Projekt neu gebaut wurde.
3. Pruefen, ob die richtige ZIP-Datei auf dem API Server ersetzt wurde.
4. Pruefen, ob abhaengige Apps ebenfalls neu gebaut und deployed wurden.
```
