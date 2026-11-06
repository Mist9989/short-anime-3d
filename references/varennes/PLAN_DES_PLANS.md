# VARENNES - plan des plans (brouillon v1, 2026-11-04)

Ce plan est le brouillon v1 approuvé avant la production. Le short final a ensuite été modifié (l'accroche a été coupée : la vidéo finale commence à la frame 172 de la timeline, sur « En juin 1791 » ; l'intro, le roi et le billet ont été retravaillés). Le code final de référence est `templates/varennes/story.ts`.

La voix off française de l'utilisateur (`voice/voice.wav`, 59.0 s) est définitive ; `voice/words.json` contient le minutage des mots (frame = round(start x 30)).
Composition 1080x1920, 30 fps, **TOTAL = 1770 f**. Export final en 2K (1440x2560, `--scale 1.3333333333333333`).

Demandes de l'utilisateur pour ce short :
- **Pas de musique.** Son = la voix plus des bruitages (SFX) synthétisés, rien d'autre.
- **Le moins de coupes possible.** 4 plans-séquences, 3 coupes franches (473, 724, 1456). À l'intérieur d'un plan-séquence, la caméra ne coupe jamais : elle glisse (smootherstep 24-60 f), monte en grue, fait des travellings et des bascules de mise au point. Chaque tenue continue d'avancer lentement (limite QA des passages figés : 12 f).
- Voix en français (cela remplace, pour ce short, la règle du skill « anglais uniquement »). Toujours aucun sous-titre et aucun texte lisible nulle part.

Les valeurs de look, le style des personnages et les règles de lisibilité viennent du SKILL.md du skill. Les assets sont repris du short Bastille (maisons et textures de Paris, costumes de 1789, foules, pont de pierre à arches, arbres procéduraux, code toon/cast/post).

## 0. Débuts des mots (frames)
```
Voici@0 l'histoire@16 homme@32 puissant@43 France@61 arrêter@83 propre@118 tête@127 pièce@155 monnaie@165(end 172)
juin@176 1791@183 révolution@224 Paris@256 Louis@268 XVI@272 fuir@300 secret@313 famille@336 troupes@373 frontière@410 contrôle@447 pays@461
Pour@473 inaperçu@480 roi@505 déguise@515 valet@543 chambre@559 monte@572 berline@592 banale@601 roule@622 nuit@634 l'Est@653 plan@669 perfection@707(end 723)
mais@724 relais@742 Sainte-Menehould@769 calèche@795 chevaux@833 maître@848 Drouet@917 s'approche@934 portière@950 visage@987 valet@1024
détail@1039 frappe@1053 profil@1070 chose@1103
sort@1117 assignat@1138 billet@1156 regarde@1193 portrait@1207 gravé@1235 lève@1263 yeux@1274 l'homme@1289 calèche@1301
roi@1321 démasquer@1339 visage@1378 imprimé@1397 royaume@1443(end 1455)
Drouet@1458 enfourche@1469 cheval@1495 raccourci@1519 bois@1550 bloquer@1563 pont@1576 Varennes@1586 loin@1633
roi@1636 arrêté@1651 ramené@1667 Paris@1676 escorte@1690 destin@1710 guillotine@1730 scellé@1753(end 1762)
```
Chaque réaction visuelle tombe 0-3 f avant son mot.

## 1. Plans-séquences

### Plan-séquence 1 - PARIS, NUIT, 0-473 (accroche + décor + la fuite)
Lieu : le côté Tuileries d'une rue de Paris, la nuit. Une foule éclairée par des torches, la façade du palais avec une seule fenêtre éclairée.
- **0-127 accroche :** très gros plan d'un **assignat** (papier pâle, simple portrait ovale du roi de profil, bordure décorative, aucun texte) brandi dans la main d'un sans-culotte au milieu des torches. Sur « propre tête » (125), la mise au point bascule du billet vers le **vrai profil du roi**, dans la fenêtre éclairée du palais derrière : le même profil, la même pose. Cela prépare la chute.
- **127-172 :** push-in lent sur la fenêtre. Le roi, en habit royal et perruque, regarde dehors d'un air suffisant (« le plus puissant de France »).
- **176-267 « Juin 1791, la Révolution gronde à Paris » :** la caméra monte en grue et recule au-dessus de la foule. Les torches se lèvent et les poings s'agitent sur « gronde » (222).
- **268-461 « Louis XVI décide de fuir... famille... troupes... frontière » :** la caméra dérive le long de la façade jusqu'à une petite porte latérale. La famille sort sur la pointe des pieds, en file indienne : le roi, la reine en cape à capuche, deux enfants et la gouvernante. Ils regardent à gauche et à droite (300 « fuir », 313 « secret »). Ils se hâtent vers un **énorme carrosse sombre** qui attend sous un arbre. Sur « frontière » (410), le cocher montre l'est. Le plan-séquence finit sur la portière du carrosse entrouverte.

### Plan-séquence 2 - LE DÉGUISEMENT ET LA ROUTE, 473-724 (coupe à 473)
- **473-560 :** plan moyen près de la portière. Le roi, maintenant habillé en **valet** (simple habit marron, chapeau rond bon marché, une boucle de la perruque royale qui dépasse), vérifie son reflet dans la laque noire du carrosse. Sur « déguise » (513), la gouvernante tire son chapeau vers le bas, sur la boucle.
- **572-601 « monte dans une berline banale » :** il monte. Le carrosse n'a rien de banal : énorme, brillant, six chevaux. Cela se lit comme une petite blague visuelle, et l'image reste fidèle à l'histoire (un seul carrosse, énorme et lent).
- **622-707 :** la caméra recule et passe en long travelling à côté du carrosse, qui roule vers l'est sur une route de campagne. Dans le ciel devant, la nuit devient l'aube (« vers l'Est » 653). Sur « plan » et « perfection » (669-707), le roi se cale en arrière dans la fenêtre, les yeux fermés, souriant, la famille détendue autour de lui.

### Plan-séquence 3 - SAINTE-MENEHOULD, SOIR DORÉ, 724-1456 (coupe à 724 ; un seul plan-séquence de 24 s)
Lieu : la cour du relais de poste : une auberge, une écurie, un puits et quelques maisons.
- **724-833 :** plan large. Le carrosse entre et s'arrête (« calèche » 795). Des palefreniers retirent les chevaux fatigués de l'attelage et amènent des chevaux frais (« chevaux » 833).
- **848-1024 :** **Drouet**, un maître de poste maigre en gilet et en bottes, marche de l'auberge jusqu'à la portière (« s'approche de la portière » 934-950). La caméra glisse par-dessus son épaule jusqu'à la fenêtre : le « valet », assis tout raide (« visage » 987, « prétendu valet » 1024).
- **1039-1103 « un détail le frappe : ce profil » :** push-in sur le visage de Drouet, qui hausse un sourcil. À l'intérieur, le roi tourne la tête et montre un **profil** parfait (1068).
- **1117-1301 « il sort un assignat... regarde le portrait... lève les yeux vers l'homme » :** Drouet tire l'assignat de son gilet. La caméra descend derrière sa main : le billet net au premier plan, le profil du roi flou dans la fenêtre derrière. C'est la composition de l'accroche, inversée. La mise au point bascule billet → roi (1263 « lève les yeux »), puis revient au billet, puis de nouveau au roi.
- **1321-1455 « démasquer... propre visage... l'argent du royaume » :** les deux se figent. Les yeux du roi glissent vers Drouet (« démasquer » 1337) ; Drouet regarde du billet au roi, puis de nouveau le billet, une fois de plus. Push-in lent jusqu'à la fin du plan-séquence pendant que le carrosse s'éloigne (le relais l'a laissé partir).

### Plan-séquence 4 - LA CHEVAUCHÉE ET VARENNES, NUIT, 1456-1770 (coupe à 1456 ; un seul plan-séquence de 10.5 s)
- **1458-1519 :** Drouet saute sur un cheval (« enfourche » 1467) et part au galop. La caméra le suit en travelling, de profil.
- **1519-1563 « raccourci à travers bois » :** le cheval quitte la route et coupe par un chemin de forêt sombre. Les arbres passent en fouettant le premier plan, la lune perce entre les branches et, au loin entre les troncs, les lanternes du carrosse avancent lentement sur la grand-route.
- **1563-1633 « fait bloquer le pont de Varennes » :** la caméra monte en grue tandis que la forêt s'ouvre sur un petit pont de pierre au-dessus d'une rivière, dans une ville endormie. Des habitants en bonnet de nuit poussent une **charrette** en travers du pont et y empilent des tonneaux (« bloquer » 1561, « pont » 1574).
- **1636-1700 « le roi est arrêté, ramené à Paris sous escorte » :** le carrosse arrive et s'arrête devant la charrette. Des gardes nationaux avec des lanternes ouvrent la portière et le roi descend, avec son chapeau de valet (« arrêté » 1649). La caméra monte haut : on fait faire demi-tour au carrosse, qui repart par où il est venu, entre deux rangées de gardes à cheval (« escorte » 1688).
- **1710-1770 « son destin vers la guillotine est scellé » :** la grue continue de monter dans le ciel nocturne. L'assignat de l'accroche descend en voletant à travers le cadre et se pose face visible sur les pavés, avec le profil du roi : c'est la dernière chose qu'on voit. Aucune guillotine n'est montrée (rien de sanglant). Fondu au noir sur les 8 dernières f.

## 2. Nouveaux assets (ce qui n'existe pas dans le short Bastille)
| Responsable | Asset |
|---|---|
| world | preset de lumière **night** (bleu clair de lune, flaques de lumière chaudes des torches/lanternes, émissif HDR), une rampe de ciel nuit→aube pour le plan-séquence 2 (le brouillon disait « jour→aube » ; le code final, `skyAt`, fait nuit → aube), la façade des Tuileries + la porte latérale, la **berline** (gros carrosse brillant avec roues qui tournent, lanternes, portière qui s'ouvre), la cour du relais (auberge, écurie, puits), le chemin de forêt, Varennes (petite ville et pont de pierre, qui réutilise le pont à arches de la Bastille à plus petite échelle), la charrette du pont |
| char | **chevaux** (cartes 2D : cycles à l'arrêt, au pas et au galop, vues de profil + de 3/4 ; attelage de 6 pour le carrosse, cheval de Drouet, escorte), Louis XVI (corpulent, profil reconnaissable) en costume royal et en costume de valet, Marie-Antoinette en cape à capuche, 2 enfants, la gouvernante, Drouet, des palefreniers, des habitants en bonnet de nuit, des gardes nationaux, une foule avec des torches ; accessoires : assignat, torche, lanterne |
| cam | 4 plans-séquences avec des glissés internes, bascule de mise au point (billet ↔ roi) dans les plans-séquences 1 et 3, travellings |
| post | fondu au noir à la fin ; pas de sépia (toute l'histoire suit une seule ligne de temps) |
| sound | bruitages (SFX) seulement, pas de musique : murmure de foule + crépitement des torches, sabots et roues sur les pavés et sur la terre, grincements du carrosse, oiseaux à l'aube, cour du relais (eau, harnais, hennissements), froissement de papier, galop + branches, roues de charrette qui raclent sur le pont, pas des gardes, un dernier voletement de papier |

Les chevaux sont le plus gros coût nouveau (le plan Bastille les évitait) ; ils sont dessinés en cartes 2D comme les personnages, jamais en modèles 3D.

## 3. Pièges de lisibilité (en plus de ceux du SKILL.md)
1. L'assignat doit se lire comme de l'**argent** sans le son : papier pâle, portrait ovale, bordure ornementale et sceau. **Aucun texte**, aucun fac-similé d'un vrai assignat.
2. Le **profil** du roi est toute la blague : la même silhouette sur le billet et dans la fenêtre (gros nez, double menton et perruque). Fais-les correspondre exprès dans les plans-séquences 1 et 3.
3. Le déguisement doit être visiblement raté : habits de valet, mais la boucle de la perruque royale se voit encore.
4. Chevaux : jamais une simple patte-bâton qui se lit comme un tabouret. Toujours 4 pattes, une crinière et une queue, et une allure lisible.
5. La nuit ne doit jamais s'écraser dans le noir : lumière d'appoint (fill) bleue de clair de lune, flaques de lumière chaudes des lanternes, p5 ≥ .15.
6. Rien de sanglant, pas de guillotine à l'écran.

## 4. Plan du monde (mètres, y vers le haut, sol y = D0 = 6.0, **+x = est, -z = nord** ; un seul monde, des lieux très éloignés, les coupes cachent les sauts)
Source de vérité pour chaque nombre : `LOC` dans story.ts. La portière est sur le côté **gauche** du carrosse dans tous les plans-séquences.

### 4.0 Ce que devient le monde de la Bastille
| Élément | Action |
|---|---|
| Forteresse (courtines, 8 tours, meurtrières, fossé, pont-levis + chaînes, portes d'entrée, cour, fenêtre de Sade + lumière `WINDOW_BOUNCE`, emplacement du gouverneur) | **supprimer**. La façade des Tuileries (4.1) se dresse sur l'ancienne ligne du mur de façade z = -100 |
| Pavés de la place x -46..46, z -92..-50, ses rangées de maisons à x = +-50, la rue vers le fleuve, les toits du fond z -160..-200 | **garder** comme rue de Paris du plan-séquence 1 (nuit) |
| Façade des Invalides, dôme, esplanade, râteliers d'armes (rive d'en face) | **supprimer** (jamais vus ; de simples rangées de maisons, ou rien) |
| Fleuve, quais, grand pont de pierre à arches à x = 0 | visibles dans aucun plan-séquence : à garder ou à retirer. Le **constructeur du pont à arches est réutilisé à petite échelle pour Varennes** (4.4), le shader du fleuve pour sa petite rivière |
| Tas de poudre, charrette de poudre, canons, caisses de mousquets, charrette de légumes | supprimer de Paris (le constructeur de la charrette de légumes peut devenir la charrette du pont de Varennes) |
| Arbres procéduraux, maisons, lampadaires, sol, collines | réutilisés dans tous les lieux ci-dessous. Le plan du sol doit atteindre x 180..2200 (les images fixes actuelles à x 1200 / 2000 ne montrent que du brouillard) |

### 4.1 PARIS, plan-séquence 1 (0-473, nuit)
- **Façade des Tuileries :** plan z = -100 tourné vers +z, x -48..48.
  - Rez-de-chaussée D0..D0+5.6, étage noble jusqu'à D0+10.5, attique jusqu'à la corniche à D0+14, mansarde en ardoise jusqu'à D0+19.
  - Pierre pâle, hautes fenêtres tous les 4 m, toutes gris-bleu sombre sauf une.
- **Fenêtre éclairée :** centre `KING_WIN` (-6, D0+7.2, -100), ouverture 1.6 x 2.8, plancher de la pièce D0+5.6.
  - Intérieur chaud en HDR (~2.5) et une lumière ponctuelle chaude.
  - Le roi s'y tient debout, la tête à `KING_HEAD1` (-6, D0+7.0, -100.6).
- **Porte latérale :** `SIDE_GATE` (24, D0, -100), 3.0 de large x 4.2 de haut, en arc, passage sombre derrière.
- **Foule aux torches :** `CROWD1_BOX` x -16..12, z -90..-62.
  - Le sans-culotte de l'accroche se tient à `HOOK_MAN` (-5.0, D0, -87.6).
  - Sa main levée tient le billet à `HOOK_HAND` (-5.45, D0+1.92, -87.05).
  - L'objectif de l'accroche est à (-5.2, D0+1.6, -84). Billet et fenêtre se répondent à l'écran : ovale du portrait ≈ tête du roi ≈ 6-8 % de la hauteur de l'image.
- **Carrosse :** `COACH1` (30, D0, -93.5), garé, orienté vers +x (est). Sa portière (côté gauche) fait face au palais.
- **Tree1 :** un grand platane à (33, D0, -98), entre le carrosse et la façade, son feuillage au-dessus du carrosse.
- **Trajet de la famille :** porte (24,-99.6) → (26.5,-98.6) → (29,-96.6) → marchepied (30.2,-95).
- **Premier plan (FG) :** un lampadaire à (16.4, D0, -89.1), 3.4 m (FOREGROUND, tout le plan-séquence).

### 4.2 ROUTE, plan-séquence 2 (473-724, nuit → aube)
- **Route :** droite le long de z = -80, x 180..700, 6 m de large, en terre battue. Champs plats, collines basses sur l'horizon est.
- **L'aube est fixée dans le monde à +x (`LOC.EAST`) :** la lueur se pose sur l'horizon, droit au bout de la route.
- **Faubourgs au départ :** une barrière d'octroi `BARRIER2` (206, D0, -80) et 3 petites maisons à x 190..214.
- **Carrosse :** `COACH2` (220, D0, -80), orienté vers +x. Il reste à l'arrêt jusqu'à 612, puis roule (0.22 m/f atteints à 645 ; x ≈ 241 à 723).
- **Peupliers :**
  - Rangée sud à z = -74, tous les 14 m.
  - Rangée nord à z = -92.
  - La caméra du travelling roule à z ≈ -83..-93, en arrière à gauche du carrosse. Ne mets aucun tronc dans z -82..-90 au nord de la route.

### 4.3 Cour du relais de SAINTE-MENEHOULD, plan-séquence 3 (724-1456, golden)
- **Cour :** pavés `RELAY_BOX` x 1176..1226, z -98..-62. La route la traverse le long de z = -80, avec des trouées dans les rangées de maisons à x 1176 et 1226.
- **Auberge (côté nord) :** façade z = -88 tournée vers +z, x 1186..1214, 2 niveaux + toit.
  - Porte `INN_DOOR` (1197.5, D0, -88).
  - Une enseigne suspendue avec seulement un pictogramme, aucune lettre.
- **Écurie (côté sud) :** façade z = -66 tournée vers -z, x 1184..1212.
  - Deux grandes portes : `STABLE_DOORS` (1192,-66) et (1204,-66).
  - Du foin et un abreuvoir à (1213, D0, -67.5).
- **Puits** à (1183, D0, -75). Des maisons ferment le côté ouest (x 1170) et le côté est (x 1230).
- **Arrêt du carrosse :** `COACH3` (1200, D0, -80), orienté vers +x.
  - Il entre depuis x 1187.4 à 724 et s'arrête à 804.
  - Il repart à partir de 1418 (environ 2.3 m parcourus à 1456, si bien que le roi glisse hors de la fenêtre).
- **Trajet de Drouet :** porte de l'auberge → (1198.2,-86) → (1199,-84) → `DROUET3` (1199.4, D0, -82.4).
  - Il se tient face au sud, vers la fenêtre gauche du carrosse (1200, D0+2.0, -81.0).
- **Couloir caméra :** la bande entre la façade de l'auberge et le carrosse (x 1200..1226, z -84..-87). Le plan large de la cour et la grue volent le long de cette bande à z ≈ -86 : laisse-la libre.
  - Seulement des tonneaux au premier plan (FG), à (1215.6, D0, -87.2).
- **Changement de chevaux :** l'attelage fatigué est mené à la porte 1 de l'écurie, l'attelage frais sort par la porte 2 (`teamSwapAt`).

### 4.4 CHEVAUCHÉE + VARENNES, plan-séquence 4 (1456-1770, nuit)
- **Grand-route** (`ROAD4`, l'itinéraire du carrosse), dans l'ordre :
  - depuis le sud, en remontant x = 2030 jusqu'à l'embranchement (2030,-44) ;
  - vers l'est le long de z = -46 (la lisière sud de la forêt) ;
  - vers le nord le long de x = 2104 ;
  - vers l'ouest le long de z = -100, jusque dans la place est et par-dessus le pont.
  - Environ **220 m de l'embranchement au pont.**
- **Départ de Drouet :** son cheval sellé à `DROUET_MOUNT` (2030, D0, -16), orienté vers le nord, avec un poteau d'attache. Il se tient à 0.9 m à l'ouest de celui-ci.
- **Raccourci :** à `TURN_OFF` (2030, D0, -44), la route tourne vers l'est et Drouet continue tout droit dans la forêt.
  - Chemin : (2028.5,-54) → (2026,-64) → (2024.5,-75) → `FOREST_EXIT` (2021, D0, -86).
  - Environ **43 m, contre environ 220 m par la route.**
- **Forêt :** `FOREST_BOX` x 2008..2100, z -86..-50. Troncs de 10-14 m de haut, rayons de lune.
  - Quelques troncs fins, à 1.2-2.6 m à l'ouest du chemin, sont les éléments qui fouettent le premier plan entre le cavalier et la caméra.
  - La bande de la caméra, à 3-4 m à l'ouest/derrière le chemin, reste libre de troncs.
  - Des trouées de vue vers le nord-est laissent lire les lanternes du carrosse sur la route z = -100 entre les troncs à 1530-1560 (le carrosse est vers x 2060).
- **Rivière :** nord-sud dans x 1996..2006, lit 2.5 m sous D0.
- **Pont :** `BRIDGE4` (2001, D0, -100).
  - Tablier x 1992..2010, z -102.2..-97.8.
  - Une ou deux petites arches de pierre avec des parapets bas : le pont à arches de la Bastille à l'échelle 0.4 environ.
- **Place est :** `EAST_SQ_BOX` x 2010..2046, z -116..-86, pavés.
  - Des maisons endormies aux volets fermés sur son côté nord (z ≤ -118) et aux coins est.
  - Ouverte sur la sortie de la forêt côté sud.
- **Ville haute :** rive ouest `TOWN_W_BOX` x 1950..1992, z -140..-60, avec une petite place à la tête de pont ouest. Les habitants en bonnet de nuit viennent de là.
- **Arrêt du carrosse :** `COACH4_STOP` (2024, D0, -100), orienté vers l'ouest. Les chevaux de tête s'arrêtent environ 5 m avant le pont.
  - Le demi-tour passe par le nord, centre (2021,-107), r 7, puis le carrosse repart vers l'est le long de z = -100.
  - Des gardes à cheval bordent sa route en 2 rangées à z -96.6 / -103.4, x 2050..2090 (`ESCORT_ROWS`).
- **Charrette :** garée à `CART_PARK` (1987, D0, -105). On la pousse jusqu'au milieu du pont et on la tourne en travers (`bridgeCartAt`), puis on la charge de 3 tonneaux (le modèle partagé `BARREL`, sans filet de poudre).
- **Arrêt de Drouet :** `DROUET_STOP` (2013, D0, -95), le coin sud-ouest de la place, à la tête de pont.
- **Atterrissage du billet :** `ASSIGNAT_LAND` (2036, D0+0.02, -92). Pavés nus, rien à moins de 1 m : c'est la dernière image.

## 5. Contrats (noms exportés ; story.ts est la source, les autres responsables ne font que le lire)
```ts
export const FPS = 30, TOTAL = 1770, D0 = 6.0, LEAD = 2 / 30;
export type V3 = [number, number, number];
export const clamp01, smooth, easeOut, glide;                        // glide = symmetric smootherstep
export type Light = "day" | "golden" | "night" | "dawn";             // NEW. night: moonlit blue fill (p5 >= .15) + warm HDR torch/lantern pools;
                                                                      //      dawn: peach glow low in the EAST (+x), blue above
export type LegacyLight = "day" | "golden";                          // what lights.ts / grade.ts can render today
export type Scene = "paris" | "road" | "relay" | "ride" | /* legacy Bastille names */ ...;
export type ShotDef = { id; a; b; sky: Light; light: LegacyLight; scene: Scene; flashback?; sun?: SunSweep };
export const SHOTS: ShotDef[]; // 1 [0,473) night "paris" | 2 [473,724) night->dawn "road" | 3 [724,1456) golden "relay" | 4 [1456,1770) night "ride"
export const skyAt: (id, f) => { from: Light; to: Light; k: number }; // take 2: night -> dawn, k = glide over CUE.DAWN [630,712]; else k = 0
export const XFADE = {};  export const FLASH_AT = -1000;             // no crossfades (two WebGL contexts crash the GPU), no flash
export const fadeAt: (f) => number;                                   // 0..1 black over the last 8 f: 1762 = .125 ... 1769 = 1
export const shotAt, layersAt, camAt, keyEnd, kickAt, dofAt, focusAt; // same signatures as Bastille
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
export type Dof = { f; dur?; cInf; focus?: (f) => V3 };  export const DOF: Dof[];
//   dofAt(f) now also RAMPS THE FOCUS POINT between entries (rack focus); Bridge.tsx already calls d.focus(f), nothing to change.
export const FOREGROUND: Fg[];   // kits stay "musket_crate" | "lamppost" | "cannon" | "barrels3" | "cart" (build.ts FgKitName)
export const CUE;  // CUE.W.<WORD> = word onsets (frames). Action cues: RACK_KING, HAND_DOWN, TORCHES_UP, GATE_OPEN, FAMILY_OUT, LOOK_LR,
                   // HURRY, POINT_EAST, DOOR1, MIRROR, HAT_TUG, CLIMB, DOOR2_OPEN/SHUT, ROLL, DAWN, RELAX, COACH_IN, UNHITCH, NEW_TEAM,
                   // DROUET_OUT, DROUET_WALK, AT_DOOR, EYEBROW, KING_PROFILE, BILL_OUT, RACK3, EYES_SLIDE, COACH_OFF, MOUNT, GALLOP,
                   // TURN_OFF, EXIT, DROUET_STOP, CART_PUSH, BARRELS, COACH_STOP, DOOR4_OPEN, KING_OUT, KING_IN, DOOR4_SHUT, UTURN,
                   // BILL_FALL, FADE. Plus legacy Bastille cues (unused, kept so cast.ts compiles).
export const LOC;  // section 4 points + legacy Bastille points (kept until world.ts / build.ts / cast.ts stop reading them)
// ---- the berline + team (coach-local frame [fwd, up, left]; left = the door side) ----
export const COACH;       // bodyL 3, bodyW 2, bodyBottom .95, bodyTop 2.75, roofRack 3.1, wheelR [.55,.82], axleFwd [1.45,-1.35], track 2.2,
                          // boxFwd 1.9 boxUp 2.55, poleLen 9.6, teamFwd [3.6,6.2,8.8], teamLat .68, horseLen 2.4, horseH 1.65,
                          // stride walk 1.7 / trot 2.6 / gallop 3.4
export const COACH_LOCAL; // DOOR, WINDOW, KING_SEAT (the seated king's head), STEP, BOX (coachman), LANTERNS
export type Gait = "stand" | "walk" | "trot" | "gallop";
export type CoachPose = { pos; yaw /* three.js rotation.y, model forward = local +x */; dir; left; s; speed;
                          wheel: [front, rear] /* rad */; door /* 0 shut .. 1 open */; lanterns: boolean; gait: Gait; visible };
export const coachAt: (id, f) => CoachPose;   export const coachLocal: (c, [fwd, up, left]) => V3;
export type HorsePose = { pos; yaw; dir; gait; phase /* 0..1 */; speed; pair: 0|1|2; side: -1|1 };
export const teamAt: (id, f) => HorsePose[];   // 6 horses on the coach's track, teamFwd ahead (they lead into turns); stand/walk/trot from speed
export const teamSwapAt: (f) => { out; in };   // take 3 change 0..1 (out: pole -> STABLE_DOORS[0]; in: STABLE_DOORS[1] -> pole)
// ---- Drouet ----
export type DrouetPose = { mode: "hidden"|"walk"|"stand"|"mount"|"ride"; pos; yaw; dir; left; speed; phase; mount /* 0..1 */; horse: HorsePose|null };
export const drouetAt: (id, f) => DrouetPose;  // take 3: hidden < 842, walks 845-935 inn -> door, then stands facing south;
                                               // take 4: beside the horse, mount 1462-1476, gallop 0.8 m/f, turn-off 1519, exit 1575, stop 1605
export const drouetHead: (id, f) => V3;
// ---- props ----
export const bridgeCartAt: (f) => { pos; yaw /* 0 = shafts east */; u /* 0..1 */; barrels /* 0..3 */ };
export const ASSIGNAT_SIZE = [0.22, 0.15];     // pale paper, ornamental border, oval profile portrait, seal; NO letters or numbers
export type AssignatPose = { mode: "none"|"hand"|"fall"|"ground"; pos; normal; spin; bend };
export const assignatAt: (id, f) => AssignatPose; // take 1 raised hand (lowers 140-162); take 3 out of the waistcoat 1117-1137, held up
                                                  // on Drouet's left; take 4 flutters down 1704-1756, then lies face up at ASSIGNAT_LAND
// ---- legacy, harmless until their readers are rebuilt ----
export const BARREL, FortState, fortState /* calm */, SMOKE = [], hookFrontZ, SunSweep;
```

### Caméras (CAMS dans story.ts ; aucune coupe à l'intérieur d'un plan-séquence)
- **Plan-séquence 1 :**
  - très gros plan (ECU) du billet, avec la fenêtre du roi derrière (zoom qui avance lentement) ; bascule de mise au point billet → roi 113-126 ;
  - push-in sur la fenêtre à 128 ;
  - grue qui monte et recule au-dessus des torches à 176 ;
  - dérive le long de la façade jusqu'à la porte + le carrosse qui attend à 268 ;
  - push-in sur la famille à la portière à 352.
- **Plan-séquence 2 :**
  - plan moyen (MS) à la portière (le déguisement) ;
  - plan large de 3/4 arrière de l'énorme carrosse et des six chevaux à 578 ;
  - travelling en arrière à gauche, avec l'aube devant, à 618 ;
  - le roi à la fenêtre à 662.
- **Plan-séquence 3 :**
  - plan large de la cour depuis l'est ;
  - grue qui tourne vers le côté de l'auberge, par-dessus l'épaule de Drouet, à 872 ;
  - push-in sur son visage à 1020 ;
  - panoramique vers le profil du roi à 1054 ;
  - derrière sa main à 1118 (billet au premier plan, roi à l'arrière-plan). Bascules de mise au point : roi 1253, billet 1287, roi 1311, billet 1412 ;
  - punch-in (avancée brusque) et roulis de 4° sur « démasquer » à 1334.
- **Plan-séquence 4 :**
  - travelling de profil pendant que Drouet monte en selle et galope ;
  - forêt en 3/4 arrière gauche, avec les lanternes du carrosse devant à droite, à 1512 ;
  - grue par-dessus les cimes jusqu'au pont à 1552 ;
  - l'arrestation à la portière du carrosse à 1606 ;
  - en hauteur au-dessus du demi-tour et de l'escorte à 1664 ;
  - suit la chute du billet jusqu'aux pavés à 1704 ;
  - fondu 1762-1770.
- **À-coup :** un seul, quand le carrosse freine à 1640.
- **Rotation maximale :** ≤ 3.7°/f (grue du plan-séquence 4 à 1566, plan-séquence 1 à 301). Le déplacement maximal est de 2.1 m/f (grue à 1690).

### Ce que chaque responsable doit faire en premier
- **world :**
  - Ajoute les `LIGHTS` / `LOOK` / cartes de nuages pour `"night"` et `"dawn"`. Puis lis `s.sky` et `skyAt()` (interpolation par k dans le plan-séquence 2) au lieu de l'ancien `s.light`.
  - Construis la section 4 et supprime la forteresse. Étends le sol jusqu'à x 2200.
  - Construis la berline à partir de `COACH`, posée par `coachAt` : roues, portière à charnières sur la gauche, lanternes HDR quand `lanterns`.
  - Construis la charrette du pont, posée par `bridgeCartAt`.
  - Garde fonctionnel le masquage des obstacles sur la ligne de vue (sight-line culler) pour les nouvelles caméras (la grue du plan-séquence 4 traverse les cimes).
- **char :**
  - Branche `stage()` sur les nouveaux noms de scène.
  - Pose les chevaux à partir de `teamAt` et de `drouetAt().horse`.
  - Pose la famille, le roi et Drouet à partir de LOC + CUE, et la carte de l'assignat à partir de `assignatAt`.
  - Les cartes font face à l'objectif : dessine exprès la vue « de profil » du roi dans les plans-séquences 1, 2 (fenêtre) et 3.
- **post :**
  - Superpose du noir selon `fadeAt(f)`. Il n'y a pas de flash.
  - Étalonne selon `s.sky` (+ `skyAt` dans le plan-séquence 2) dès que grade.ts a des presets night et dawn ; d'ici là, selon l'ancien `s.light`.
