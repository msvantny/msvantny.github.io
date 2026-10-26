# Údržba konferencí

Zdrojem je Google tabulka Conferences, listy Organized a Participation.

## Nový záznam

Přidejte řádek na konec příslušné tabulky. ID můžete nechat prázdné; starší ID neměňte. Pořadí řádků není důležité: web řadí sestupně podle roku a známého termínu. Termíny pište anglicky, například `10–12 June 2026`; při neznámém termínu ponechte Dates prázdné. Je-li znám jen rok, událost se zařadí za datované události téhož roku.

Vyplňte Event, Year a potřebné podrobnosti. V Participation odpovídá jeden řádek jednomu příspěvku; stejný Event, Year a Location web seskupí do jedné konference. Role je role u příspěvku, Attendance znamená osobní účast. Neznámá účast není na webu prezentována jako potvrzená.

Fotografie nahrajte do Galerie_Conferences a jejich přesné názvy (včetně přípony) uveďte v Photos oddělené středníkem. Použijí se nejvýše čtyři snímky na událost.

Publish = Yes zahrne řádek do veřejného výstupu. Sloupce Review notes a Original citation se nikdy neexportují. Používejte tedy Description pouze pro veřejný popis.

## Jednorázové zapnutí automatických aktualizací

Automatický zdroj je aktivní od 26. října 2026. Při otevření stránky se načtou aktuální záznamy s Publish = Yes a fotografie ze složky Galerie_Conferences. Běžné změny provádějte pouze v tabulce a galerii; skript znovu implementovat nemusíte. Stránka také obsahuje uloženou schválenou verzi pro případ výpadku zdroje.

Následující kroky slouží jen k případnému novému nastavení:

1. V Google tabulce zvolte Rozšíření → Apps Script.
2. Vložte obsah souboru `conferences-feed.gs` a uložte.
3. Zvolte Nasadit → Nové nasazení → Webová aplikace. Spouštět jako vy; přístup Kdokoli. Povolte čtení této tabulky a fotografie ze složky Galerie_Conferences. Dostupnost anonymního nasazení může omezovat správce univerzitního účtu.
4. Zkopírujte výsledný odkaz končící `/exec` a pošlete jej pro doplnění do `meta[name="conference-feed"]` na stránce Conferences.

Tabulka ani složka nemusí mít veřejné sdílení. Veřejná webová aplikace poskytuje jen explicitně vybrané údaje a náhledy fotografií uvedených ve zveřejněných řádcích. Náhledy se zmenšují na straně Google Drive, web nezpřístupňuje libovolný soubor podle zadaného ID. Skript neumožňuje zápis do tabulky. Změny v tabulce se pak načtou při příštím otevření stránky; není třeba měnit kód nebo znovu nasazovat skript. Po změně samotného skriptu je třeba nasadit novou verzi.

Při nedostupném zdroji zůstane viditelná uložená verze. Ta se sama nepřepisuje: pro odstranění již dříve uloženého záznamu je třeba aktualizovat i uloženou verzi webu. Až bude živé propojení ověřeno, lze zálohu změnit na neutrální hlášení podle požadovaného chování.

Dokumentace: https://developers.google.com/apps-script/guides/content a https://developers.google.com/apps-script/guides/web.
