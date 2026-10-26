# Bezpečnostní kontrola webu — 26. října 2026

## Rozsah a výsledek

Kontrola veřejného repozitáře `msvantny/msvantny.github.io` vycházela z commitu `af20c5e89e2a7c98fcede6ff1aa09d2e5bbae320`. Zahrnovala všechny současné HTML, JavaScript, Apps Script, Python a workflow soubory, zdroje obrázků, 19 dostupných commitů a 83 unikátních textových blobů v historii. Historie byla prohledána na běžné formáty tokenů GitHub/Google/AWS/Slack, soukromé klíče, přihlašovací údaje v URL a přiřazení hesel či tajných klíčů; bez nálezu. Následovala ruční kontrola zpracování externích dat a oprávnění automatizací.

Nebyl nalezen zveřejněný přístupový klíč ani cesta, kterou by návštěvník mohl prostřednictvím kontrolovaného kódu zapisovat do Google Drive nebo Sheets. Kontrola není zárukou nepřítomnosti všech zranitelností ani nezávislým penetračním testem. Nezahrnovala privátní nastavení přihlášení účtů, všechny logy GitHub Actions, obsah nedostupných větví ani interní infrastrukturu poskytovatelů. Nasazený Apps Script byl funkčně ověřen jako veřejný datový zdroj; jeho implementace byla posouzena podle souboru uloženého v repozitáři, nikoli přímou inspekcí editoru nasazené verze.

## Provedené opravy

| Oblast | Zjištění a úprava |
| --- | --- |
| Konference | JSONP spouštěl odpověď vzdáleného zdroje jako JavaScript. Klient nyní používá `fetch` a `response.json()`, bez přihlašovacích údajů. Funguje se stávajícím nasazením, není nutné znovu implementovat Apps Script. |
| Všechny stránky | Přidána Content Security Policy: spustitelné skripty pouze ze stejného webu, zakázané inline skripty a eval, omezené zdroje obrázků, dat a iframe, zakázané objekty, formuláře a změna základní URL. Existující inline styly nahrazeny již přítomnými CSS pravidly. |
| Automatizace | GitHub Actions připnuty k ověřeným úplným SHA v oficiálních repozitářích. Checkout neukládá přístupový token do Git konfigurace. Zápis je omezen na úlohu aktualizace playlistu; token pro push je předán pouze příslušnému kroku. Playwright má konkrétní verzi a instalace nepouští npm lifecycle skripty. |
| YouTube | Zachován oddělený přehrávač na `youtube-nocookie.com`; odstraněna nepotřebná oprávnění iframe ke schránce, senzorům a sdílení. |
| Fotografie | V koláži měření lidí použita nově dodaná fotografie zezadu. Nahrazena také aktuální stará URL koláže; nový odkaz omezuje zobrazování starého obrázku z cache. Výstup nemá EXIF/GPS metadata. |

## Co externí služby skutečně zpřístupňují

| Služba | Veřejné údaje / přístup |
| --- | --- |
| ORCID | Veřejné články, financování a profesní aktivity. ORCID iD není heslo ani token; klient nemá zápisové oprávnění. |
| GitHub | Veřejné repozitáře a metadata playlistu. Výraz `${{ github.token }}` ve workflow je odkaz na dočasný token vytvořený GitHubem za běhu; není to zveřejněná hodnota tokenu. |
| YouTube | Veřejný playlist, názvy a náhledy videí. Bez API klíče a bez přístupu k účtu vlastníka. Při načtení náhledů/přehrávače vznikají síťové požadavky na Google; jde o soukromí návštěvníka, nikoli o přístup k účtu autora. |
| Google Sheets / galerie | Přes metadata Drive ověřeno, že tabulka Conferences i složka Galerie_Conferences mají `shared=false` a jen oprávnění vlastníka. Veřejný endpoint je záměrně dostupný každému; podle kontrolovaného zdroje exportuje pouze pevný seznam polí z řádků Publish = Yes a náhledy pojmenovaných fotografií z určené složky. Soukromé poznámky a původní citace se neexportují. Neobsahuje `doPost` ani zápisové operace. ID tabulky/složky samo nepřiděluje oprávnění. |

Texty vkládané do HTML se escapují; odkazy odmítají spustitelná schémata, ID videí mají předepsaný formát, obrázky konferencí povolují pouze určené místní WebP nebo rastrová data JPEG/PNG/WebP. Odkazy do nové karty používají `noopener noreferrer`. Není zde přihlašovací formulář ani ukládání tokenů do prohlížeče.

## Zbývající omezení a údržba

- **Historie je veřejná.** Původní koláž s fotografií paní zůstává v minulých commitech. Úplné odstranění vyžaduje samostatné vyčištění historie a řešení případných cache či kopií; běžné nahrazení souboru to nezajistí.
- **Již zveřejněné údaje jsou veřejné.** Publish = No odstraní záznam ze živého feedu, ale ne ze starší uložené zálohy HTML, historie nebo cizích kopií. Při požadavku na stažení již zveřejněného údaje je třeba upravit i zálohy. Do veřejných sloupců a schválených fotografií proto nepatří soukromé údaje.
- **Veřejný Apps Script může kdokoli opakovaně číst.** To může spotřebovat kvótu a dočasně znefunkčnit aktualizace; neposkytuje to právo měnit Disk. Při vyšší návštěvnosti lze přidat cache nebo generovat statický datový soubor.
- **Hlavní větev nemá ochranu větve.** Zjištěno přes GitHub API; automaticky neměněno, protože by to mohlo zablokovat současný způsob úprav a aktualizace playlistu. Práva účtů, dvoufázové ověření a obnovení přístupu nebyla touto kontrolou ověřena.
- CSP je v HTML meta tagu. Hlavičky jako `frame-ancestors`/`X-Frame-Options` nelze tímto způsobem vynutit. Stránka neobsahuje citlivé přihlášené operace. TLS/HSTS na živém webu byly ověřeny.

## Ověření

Prošly testy escapování vzdáleného textu, odmítání spustitelných odkazů a SVG dat v konferencích, exportu pouze schválených řádků a veřejných polí Apps Scriptu, absence JSONP v klientovi a CSP ve všech osmi HTML stránkách. V prohlížeči bylo ověřeno načtení živých konferencí, článků, projektů, profesních aktivit i náhledů videí a přepínání videa. Při těchto kontrolách nebyla hlášena porušení CSP. Skeny tajných údajů neuvádějí v tomto dokumentu hodnoty hledaných vzorů.

## Dokumentace

- Google Apps Script Content Service: https://developers.google.com/apps-script/guides/content
- GitHub Actions secure use: https://docs.github.com/en/actions/reference/security/secure-use
- Content Security Policy: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP
- Omezení frame-ancestors v meta tagu: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors
