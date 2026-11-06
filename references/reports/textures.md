# Textures : la peinture des surfaces de la référence face à la nôtre, et comment peindre la nôtre de façon procédurale

Dossier du sujet : `references/textures/` (scripts, recadrages, données, comparaisons côte à côte, prototype).
Étude privée uniquement. Rien ici n'a été mis en ligne, et rien dans `your Remotion project` n'a été modifié ni rendu.

## 0. En bref

La référence peint chaque surface en quelques aplats de couleur. Les lignes peintes (interstices entre planches, mortier, joints de tuiles) sont
fines, environ 3-5 px en 1080p. Les zones au soleil et à l'ombre restent dans une plage étroite, claire et saturée, et seules les grandes formes varient en ton.
Nos surfaces ratent la cible de cinq façons :

1. **Trop sombres.** Notre tablier est rendu à L* 50, celui de la référence à L* 72-80. Le fer et les poutres latérales sont rendus à L* 3-7, alors que la référence ne descend jamais sous L* 19.
2. **Trop ternes.** Notre ciel est à C* 22-29, celui de la référence à 40-89. Notre ciel d'heure dorée est un mauve grisâtre à C* 16-19.
3. **Lignes trop lourdes et floues.** Nos interstices et notre mortier sont 1.5-2.5x plus larges, et leurs rampes de bord 10-90 % font 4-6 px.
4. **Texture d'eau fausse.** Les marques de vaguelettes sont réparties uniformément sur 4-12 % de la surface et forment des traînées verticales, et il n'y a aucun dégradé de profondeur.
5. **Nuages plats.** Les nôtres sont d'un seul ton uni. La référence utilise trois tons avec un dessous lavande.

Tout ce qui suit est mesuré. La recette de la section 5 a passé la vérification de types, et son rendu de l'eau et du tablier a été mesuré
dans un aperçu CPU face aux chiffres de la référence (section 5.6).

## 1. Méthode

- **Référence :** 91 images de 14 vidéos (01 02 03 04 05 07 08 10 11 12 13 14 18 19), nommées `VV_SS.s` (vidéo, seconde).
  J'ai fait 99 recadrages tirés de 13 de ces vidéos, en pleine résolution dans `crops/` et en 2x dans `crops/x2/`, plus 30 recadrages zoomés (`crops/z_*`).
  Les mesures couvrent 79 + 14 échantillons de surface (`data/patches*.json`), 40 profils de ligne (`data/lines.json`),
  11 zones d'eau, 17 bandes de ciel et 11 recadrages de nuages.
- **Nous :** les 61 images fixes (stills) de test dans `your Remotion project/out/bridge/test/` (aperçus JPEG 540x960, en lecture seule).
- **Échelle :** chaque valeur en pixels est donnée en 1080x1920. Les images de la référence (720p) sont mises à l'échelle x1.5, nos images fixes x2.
  Nos images fixes sont des aperçus en demi-résolution, donc nos largeurs de bord incluent environ 2 px de flou d'agrandissement. Je l'ai retiré
  là où le grossissement est estimé.
- **Sous-titres :** les sous-titres mot à mot de la référence occupent les rangées 874-934 sur 1280. `scripts/captions.py` les détecte
  (`data/captions.json`). Les statistiques d'eau masquent les rangées 760-952. Trois cadres d'échantillon et de ligne qui touchaient un sous-titre ont été
  décalés hors de celui-ci et mesurés à nouveau (herbe 12_57.5, métal 12_52.5, bord du ponton 05_40.5).
- **Couleur :** les valeurs hex sont en sRGB. L* et C* sont en CIE Lab (D65). Les « clusters » sont des k-means avec k = 4 dans Lab, notés sous la forme
  couleur : part de surface. La FWHM est la largeur totale à mi-profondeur d'une ligne peinte sombre, mesurée perpendiculairement à la ligne
  avec des médianes par bande. Le « bord » est la largeur de la rampe 10-90 % du flanc de cette ligne.
- **Scripts** (tous dans `textures/scripts/`) :
  - `extract.py`, `crops.py`, `mosaic.py` produisent les images, les recadrages et les atlas.
  - `measure_patches.py` et `tm.py` donnent la couleur, le bruit et la fraction de lignes.
  - `lines.py` et `lines_batch.py` mesurent la largeur, le bord et la profondeur des lignes.
  - `profile.py` donne les profils de planches, `water.py` l'eau, `sky.py` le ciel et `clouds.py` les nuages.
  - `sidebyside.py` produit les planches de comparaison.

## 2. Fichiers à consulter

| Quoi | Chemin (sous `references/textures/`) |
|---|---|
| Comparaisons côte à côte réf. vs nous à la même échelle 1080p | `side/sbs_planks.png`, `sbs_beam.png`, `sbs_stone.png`, `sbs_water.png`, `sbs_sky.png`, `sbs_facade_roof.png`, `sbs_grass.png`, `sbs_metal.png` ; tout en un : `side/sbs_overview_half.jpg` |
| Atlas de surfaces (tous les recadrages d'une surface) | `mosaic/atlas_planks.jpg`, `atlas_woodwall`, `atlas_dirt`, `atlas_stone`, `atlas_facade`, `atlas_window`, `atlas_roof`, `atlas_grass`, `atlas_water`, `atlas_cloud`, `atlas_rock`, `atlas_metal` |
| Recadrages pleine résolution et 2x | `crops/*.png`, `crops/x2/*_x2.png`, index `crops/crops.json` |
| Recadrages zoomés (détail) | `crops/z_planks_0125.png`, `z_planks_0540.png`, `z_stone_1255.png`, `z_stone_1409.png`, `z_brick_1220.png`, `z_water_1205.png`, `z_water_1305.png`, `z_cloud_0412.png`, `z_cloud_1415.png`, `z_roof_1312.png`, `z_window_1052.png`, `z_metal_1255.png` ... ; les nôtres `o_planks_b100.png`, `o_cobble_b1810.png`, `o_tower_b1810.png`, `o_water_b470.png` |
| Profils de planches | `side/prof_planks_all.png`, `prof_planks_0125.png`, `prof_dock_0540.png`, `prof_porch_0206.png`, les nôtres `prof_planks_b100.png` / `b380` / `b1900` |
| Cartes des marques d'eau (magenta = crête, vert = creux) | `side/watermarks_cmp.png`, `side/watermarks_<frame>.png` |
| Bandes de médianes par rangée du ciel | `side/sky_strips.png` |
| Chiffres | `data/patches.json`, `patches_extra.json`, `lines.json`, `water.json`, `sky.json`, `clouds.json`, `captions.json` |
| Prototype de la recette (types vérifiés) | `proto/paint_recipe.ts` (code en annexe), page de nuancier `proto/swatches_inline.html`, aperçus `proto/views_inline.html`, `proto/build.sh` |

## 3. Mesures, référence vs nous

### 3.1 Planches du tablier (planches de bois / planchers)

| | Référence | Nous | Écart |
|---|---|---|---|
| Couleurs des planches au soleil | #f8bb60 (64 %) / #dea04b (01_25.5) ; #e28c29 / #db983e (01_17.5) ; #ffab49 / #fe983b (01_50.5) ; pont de navire sourd #cd9a66 / #bf8c5c (12_13.5). L* médian 61-74, C* 35-68 | #b77a37 (64 %) / #a46826 (b_100) ; #c28844 / #ac6d29 (b_380). L* 50-54, C* 47 | les nôtres 20-25 L* trop sombres, un peu trop orange |
| Ombre | bandes d'ombre portée du gréement et de la roue de barre #7d4e1c / #875c27 (01_20.5, 01_22.5) ; porche sous un toit #916351 / #a27864, L* 45 (02_06.5) | non mesuré | |
| Heure dorée | ponton #c18d61 / #a57651, L* 51 (05_40.5) ; pont #805345 / #714c46, L* 35 (12_41.5) | #8a440a / #663107 avec 32 % de #1f0904, L* 20 (b_1680) | les nôtres 15-30 L* trop sombres |
| Écart type de L* d'une planche à l'autre | 1.2-4.2 | 5-6 (un escalier de 4 aplats) | les nôtres trop variées |
| Écart type de L* dans une planche (veinage) | 1.3-2.6, large, doux | 2-3 ; des traits de Bézier sombres à alpha 0.35 se lisent comme des interstices en plus | |
| Largeur d'interstice / pas des planches | cœur environ 3.3 %, FWHM 4.6-5.5 % (01_25.5 4.75 / 96 px, 01_50.5 7.67 / 166 px) | cœur 6.5 %, FWHM environ 12 % (b_100 6.57 / 52 px) | les nôtres environ 2x trop larges |
| FWHM des interstices en 1080 | près 3.6-4.8 px, milieu et loin 3.3-3.5 px (ils pâlissent plutôt qu'ils ne s'affinent), très près 7.7 px | près 5.0-6.6 px, milieu et loin 7.5-9.1 px | les nôtres 1.5-2.5x |
| Couleur et profondeur des interstices | #571e00 / #591e00 / #6b2903 ; ΔL* 40-48 au soleil, 17-37 à l'ombre, à l'heure dorée ou dans la profondeur de champ (DOF) | #582e02 / #703f05 / #794308 ; ΔL* 16-21 | les nôtres : moitié moins de contraste |
| Bords des planches | ponton : arête éclairée +4..+7 L* d'un côté, arête ombrée -3..-6 de l'autre ; porche : -6 / -7 des deux côtés | plats | absents |
| Détails | petits clous sombres, rares cernes de nœuds (05_40.5), joints d'about | 2 clous par planche à x fixe, une coupe de 3 px | |
| Rampe de bord 10-90 % | 3.2-3.3 px près, 4.8 px très près | 3.6-4.9 px | |
| Bruit fin (hf) | 0.5-0.8 | 0.7-0.8 | identique ; garde-le propre |

Style : peint à la main mais plat. Les aplats de couleur sont unis avec une légère dérive large, les lignes sont fines et sombres, et il n'y a
aucun grain photographique. Comparaison côte à côte : `side/sbs_planks.png`, profils `side/prof_planks_all.png`.

### 3.2 Murs en bois, coques, poutres latérales

| | Référence | Nous |
|---|---|---|
| Bardage à clin peint | aqua #a0c5c5 avec lignes #72a0aa / #57797a, FWHM 3.0-3.1 px, ΔL* 15-19, tous les 23-28 px (10_48.5, 10_52.5) ; violet #7a3c70, lignes de 4.1 px (07_43.5) | (aucun) |
| Bordages de coque peints | #d33414 (66 %) / #b82e10, C* 77, presque sans lignes (01_01.5) | (aucun) |
| Bois de charpente à l'ombre ou à la lumière d'une lampe | #692c1a / #883b1c, L* 30 (12_31.5) ; #642717 / #411513, L* 27 (01_45.5) | poutre latérale du tablier #231001, L* 6.7, écart type 2.3 : une bande noire plate (b_470) |
| Heure dorée | | poutre de la balançoire #9c602b / #221a05, L* 32 (c_1450) |

Écart : notre poutre latérale est 20-25 L* plus sombre que n'importe quel bois de la référence, et elle n'a aucune structure de planches.

### 3.3 Pierre, brique, pavés, dalles

| | Référence | Nous | Écart |
|---|---|---|---|
| Couleurs des blocs | mur du pont #c2b2a5 (44 %) / #9a8c7f (35 %) + rehauts #f4e2c6 (14_09.5) ; château #cdbdb0 / #9c908f, ombre propre #533f47 (11_28.5) ; dalles de pierre #c4b6b3 / #b5a8a5 / #a79998 (12_55.5) ; dalles de la place #eadabc / #d7c5aa (03_09.5). C* 5-16, L* 60-73 | tour #9d8d74 / #8d795a, L* 52, C* 18.5 (b_1810) ; loin #927f63 / #59534c, L* 43 (c_140) ; heure dorée #995d22 / #7a3f09, L* 31 | les nôtres 10-20 L* plus sombres, plus jaunes |
| Mortier | #87796c, FWHM 3.6 px, profondeur 14 (14_09.5) ; #6c5b52, 2.8 px, profondeur 21 (11_28.5) ; #807270, 4.5 px, profondeur 20 (12_55.5) ; bord 2.1-2.9 px | #503f26, FWHM 5.4 px, bord 4.0, profondeur 22 (b_1810) ; loin 9.4 px, bord 5.7 (c_140) | le nôtre 1.5-2.6x plus large, plus sombre et plus brun |
| Modelé des blocs | biseau supérieur clair environ +5 L*, bas sombre environ -3 | bloc plat plus une fine bande blanche en haut (alpha 0.12) | |
| Détail de surface | mouchetures sombres et claires de 2-4 px, fissures fines, coins ébréchés | points sombres | |
| Brique | #cf5e30 (40 %) / #dca55f, mortier clair #f6d9b1 (35 %), L* 67 (12_20.5) | famille #b5543c sur mortier crème, briques de 1.2 m de long à 48 px/m (moulin) | les nôtres surdimensionnées |
| Pavés | (pas de pavés dans la référence ; le sol est en dalles plates ou en terre avec des touches de cailloux) | grille régulière d'ellipses à bords sombres : #c3b18f / #756446 / #3d2d17, écart type de L* 20, fraction de lignes 0.13 (b_1810) | se lit comme un motif à pois |

### 3.4 Façades enduites, fenêtres, volets

| | Référence | Nous |
|---|---|---|
| Murs | enduit crème #f3e6d2, saumon #e58e6e, rouge #df585d, colombages #804937 / #785248 (13_00.5, 13_12.5) ; bardage à clin aqua #a3cdc7 / #b4dbd4 avec encadrements #fceed5, L* 81 (10_48.5) | #879590 (44 %) / #4f4347 (34 %) / presque noir #0b0d18 (17 %), L* 40 (b_1810) |
| Encadrement de fenêtre | blanc ou crème #d6dfcf / #fceed5, fin contour sombre | cadre blanc #f4efe2 avec un trait d'encre de 2.5 px |
| Vitre | bleu-violet en demi-teinte #7b7ea0 / #6670b0 avec reflets clairs #a9c2d2 / #9ebacd (10_52.5), deux éclats en diagonale | dégradé de #8fd0f5 à #3f7fc0 ; rendu presque noir à l'ombre |
| Volets | à persiennes, bleu-violet #816e89 / #5a5f9a, lignes de lames | aplat plus contour à l'encre |
| Rideaux | roses #f0d5df / #f5c0c8 à certaines fenêtres | aucun |
| Densité de texels | lignes d'encadrement nettes d'environ 3 px en 1080 | 48 px/m : 2-4 px par texel à 15-30 m, flou |

### 3.5 Toits

| | Référence | Nous |
|---|---|---|
| Terre cuite | #dc8872 (41 %) / #c87563 (31 %) / #ec9c87 (26 %), L* 64, joints 3.3 px, ΔL* 10, pas de contour par tuile (13_12.5) | famille #92391b, L* environ 40, joints 9.4 px, ΔL* 15, contour INKL sur chaque tuile (c_1050) |
| Ardoise (vue de dessus) | #bdbfc6 / #dbe0e9, sombres #9292a4 / #705960, L* 74 (11_15.5) | base #5b6470 |
| Chaume | #d49934 / #f0bd59 avec stries #80593d (13_04.5) | |
| Coucher de soleil / nuit | enneigé #fab8b8 (07_55.5) ; toit conique #2e5ccd (11_42.5) | heure dorée #bc949c (c_1450) |

Écart : nos toits sont environ 20 L* trop sombres. Le motif des tuiles est dessiné avec des contours à l'encre 3x plus larges que les joints de la référence.

### 3.6 Herbe

| | Référence | Nous |
|---|---|---|
| Soleil | #71b038 (44 %) / #7dbf3f (42 %) / #588646, L* 66, C* 64 (10_52.5) ; #75b43b / #5da12e (12_57.5) ; place #488e2e, L* 53 (03_52.5) | #70b13b / #67a832, L* 64, C* 66 (c_140) : **teinte et niveau identiques** |
| Variation | large : variance basse fréquence 5.7-10, autocorrélation 16-40 px en 1080 | fine et uniforme : variance basse fréquence 1.6, autocorrélation 6 px |
| Ombre portée | bleu canard #305c54 (10_48.5) | heure dorée #405106 / #1f0f09, L* 26 (c_1450) |
| Détails | fleurs et touches éparses (blanc, jaune, orange), courts traits de touffes | bruit seulement |

### 3.7 Sable et chemins de terre

La référence est unie et très peu bruitée :
- sable de western #b0937f (L* 63, écart type 3.7) dans 04_02.5 ;
- rue de la ville #c58b43 / #cc9247 dans 02_13.5 ;
- chemin du château #b99260 dans 11_28.5 ;
- chemin à l'heure dorée #e3b46b / #ce9c5d dans 13_39.5.

Les ombres portées au sol virent au bleu-violet (#4b3c5a dans 02_02.5) ou au mauve chaud (#806154 dans 13_39.5). Le seul détail, ce sont
de rares touches crème de cailloux. Chez nous : `M.sand` est un #e2c992 uni, rendu en #774f1c (L* 36) à l'heure dorée (c_1450).
L'approche est bonne ; c'est seulement trop sombre à l'heure dorée.

### 3.8 Rochers

Chaque rocher de la référence utilise deux plans unis : une face éclairée chaude et une face à l'ombre froide, presque sans lignes (fraction de lignes 0-0.04).
- falaises marines (12_05.5) : éclairé #caae98, ombre #60737c ;
- piliers rocheux (12_01.5) : éclairé #ddc0a6, ombre #868784 ;
- montagne au coucher du soleil (11_58.5) : #feb682 / #a67f99 ;
- galets (04_18.5) : #bf9d7f / #745a55.

Nous n'avons pas de rochers dans la scène du pont, donc je n'ai pas écrit de recette pour les rochers.

### 3.9 Métal et fer

| | Référence | Nous |
|---|---|---|
| Canon | bande claire #e8e7df (30 %), #8790a6 (27 %), #586076 (23 %), le plus sombre #282f41 (20 %, L* 19) (12_55.5) ; bande #e3d5c6 (27 %) (12_00.5) | |
| Coque rivetée | #596474 (84 %), rivets #2d3442 avec reflet #f1ddb2 (12_52.5) | |
| Chaînes, fer | | maillons #040d16 (56 %, L* 3), chaînes au-dessus #050b1b, ancrage presque noir (c_1042, b_470, d_1030) |

La référence peint le fer comme un matcap : des tons moyens bleu-gris, une large bande claire sur 25-30 % de la surface, et des sombres qui
s'arrêtent à L* 19. Le nôtre est rendu 16 L* sous le fer le plus sombre de la référence. `M.iron` vaut #2c2f36, et la texture de chaîne
dessine des anneaux #565c66 sur #2c2f36.

### 3.10 Lignes peintes vs encre de la géométrie (tout en 1080p)

| Ligne | Référence FWHM / bord / ΔL* | Nous FWHM / bord / ΔL* |
|---|---|---|
| Interstices des planches, près | 3.6-4.8 / 2.5-3.3 / 25-48 | 5.0-6.6 / 3.6-4.9 / 16-21 |
| Mortier | 2.8-4.5 / 2.1-2.9 / 14-21 | 5.4-9.4 / 4.0-5.7 / 13-22 |
| Joints de tuiles | 3.3 / 2.7 / 10 | 9.4 / 5.7 / 15 |
| Bardage à clin | 3.0-4.1 / 2.2-4.0 / 15-19 | (aucun) |
| Contours à l'encre de la géométrie (pour l'échelle) | 4.1-5.8 / 2.7-3.8 / 23-55, #32221f / #4c3234 | (voir le rapport sur les contours) |

Règle : les lignes peintes de la texture sont plus fines et plus claires que le contour à l'encre. Elles font environ 0.7-0.9x la largeur de l'encre et
la moitié de son contraste, pour que les surfaces ne concurrencent jamais les silhouettes.

### 3.11 Eau

La référence a été mesurée sur 11 zones (`data/water.json`). Une marque compte quand L* dépasse la médiane locale de plus de 6
(crête) ou passe plus de 6 en dessous (creux).

| Image | Paliers du dégradé, du loin au près | Surface de crête loin / milieu / près | Marques pour 100x100 px | Crête l / h (px), rapport, angle | Couleur de crête, ΔL* | Couleur de creux, ΔL* |
|---|---|---|---|---|---|---|
| 12_18.5 mer bleu canard | #1194b6, #087fa2, #05678f, #035077 | 1.9 / 0.2 / 0.0 % | 0.67 | 12 (p90 47) / 3, 3.0, -9° | #43b7d3, +8.8 | #0e819e, -8.9 |
| 12_05.5 mer bleu canard | #1d97b2, #097fa2, #05668c, #034f77 | 4.9 / 1.6 / 0.9 % | 0.94 | 21 (p90 84) / 3, 4.0, -4° | #47abbd, +8.4 | #267285, -8.4 |
| 01_01.5 mer azur | #81acf1, #4bbbff, #30abff, #27a4ff | 1.5 / 0 / 0 % | 0.32 | 6 (p90 38) / 3, 2.0 | #a8d0f5, +10.4 | |
| 01_02.5 près de la coque | #4bbdff, #7dcaff, #1a94fa | 4.0 / 0.4 / 0.0 % | 1.54 | 12 / 1.5, 5.7, 0° | #c0feff, +7.1 | |
| 13_05.5 port | #1e70bb, #1663af, #1357a0, #0d4e97 | 4.9 / 1.5 / 0.4 % | 1.28 | 30 (p90 97) / 4.5, 6.0, 0° | +11.0 | |
| 12_52.5 contre la coque | #06628b, #045e88, #04557f, #02466f | 1.8 / 0.2 / 0.6 % | 0.24 | 52 / 10, 2.8 | #3d6b94, +12.4 | |
| 14_10.5 rivière vue de dessus | #8fb8d3, #8cb5d2, #87b0d2, #7c9ebc | 2.5 / 7.4 / 1.1 % | 5.38 | 9 / 3, 2.0, 0° | #bccec4, +10.4 | |
| 14_09.5 rivière sous l'arche | #0d2138 à l'ombre, #7294b4 éclairé | 0.4 / 0 / 0.2 % | 0.4 | 13.5 / 1.5, 7.5 | +7.3 | |
| 05_40.5 lac, coucher de soleil | #77a5c3, #4482b3, #396362, #5c87a8 | 9.5 / 7.4 / 11.4 % (reflets) | 10.5 | 7.5 / 4.5, 1.5 | +13.3 | |
| 12_34.5 mer, crépuscule | #262246, #171841, #0a0f38, #040a2d | 10.0 / 1.0 / 0.8 % | 0.99 | 25.5 / 9, 2.1 | #783b52, +13.3 | |
| 08_18.5 nuit | #1c6ec8, #105fb6, #0a4a99, #083a7c | 5.3 / 2.3 / 0 % | 2.02 | 13.5 / 4.5, 3.0, 0° | #3494a1, +9.7 | #0f5e74, -11.0 |
| **nous b_470** (vue de côté) | #3f7cb7 uni | 11.2 / 12.4 / 12.2 % | 3.94 | 12 / **18, 0.7, -14°** | #619ac9, +10.7 | |
| **nous b_200** (depuis la berge) | #275690, #2b76af, #3b7bb6 | 7.4 / 6.7 / 9.1 % | 10.2 | 14 / 2, 4.3 | +8.3 | |
| **nous b_1045, c_1050** | #457fb8 / #4a85bc, presque uni | 2-4 / 2-9 / 4-6 % | 2.5-3.5 | 12-16 / 6-8, 2.3-2.8 | +7-8 | |
| **nous heure dorée b_1350, b_1680** | #213b4e uni (L* 24, C* 14) | 5-9 % partout | 2.9-7.0 | 12 / 4-18, **0.7-4.0** | #3f525d | |

Ce que fait l'eau de la référence :
- **Couleur de base.** Un dégradé vertical uni et saturé : plus clair et plus cyan vers l'horizon, plus sombre et plus profond
  près de la caméra. La chute de haut en bas est de 10-35 L*.
- **Marques.** Éparses et horizontales à l'écran, avec un rapport d'aspect de 2-7 et un angle compris dans ±9°. Elles se raréfient vers la
  caméra : environ 1.5-5 % de la surface au loin, 0-1.6 % au milieu, 0-0.9 % près.
- **Crête et creux.** Chaque crête est à +8..+13 L* et a un creux sombre juste en dessous (-8..-9 L*).
- **Éclats.** Quelques longues lignes d'éclat fines, de 1-3 px sur 30-100 px.
- **Pas de reflets.** Aucune géométrie en miroir. Le lac au coucher du soleil n'a que la couleur du ciel et des taches de lumière chaude.

Où la nôtre diffère :
- Pas de dégradé de profondeur.
- Les marques sont 2-10x trop denses près de la caméra.
- En vue de côté, les marques sont des traînées verticales (rapport d'aspect 0.7), parce que les traits de 30-100 px le long de u font face à la caméra.
- L'eau à l'heure dorée est un bleu marine terne, C* 14. L'eau de la référence au coucher du soleil est saturée : bleu #4482b3 ou bleu marine violacé #262246.

### 3.12 Dégradés de ciel (médianes par rangée sur du ciel dégagé ; `data/sky.json`, `side/sky_strips.png`)

| Lumière | Paliers de la référence, du haut de l'image à l'horizon (C*) | Nous (C*) |
|---|---|---|
| Jour | #59abff, #208cfb, #3e9bff, #66baff (49-58) dans 04_06.5 ; #0b6ced, #0f7af9, #1881fd (54-76) dans 04_12.5 ; #266ac1 à #2a88df (52-54) dans 18_25.5 ; #5ba8f0 à #82c4fc (35-43) dans 02_13.5 ; #4d96d5, #7fbcf1, puis un fin voile atmosphérique #d7e0e6 (39 à 5) dans 12_18.5 ; #0a4ce6, #1975fd, #4991fc (61-89) dans 01_00.5 | #8ab6e7 à #a0c3e9 (22-29) dans b_200, c_140, b_1810 : moitié moins de chroma, 5-10 L* plus pâle |
| Heure dorée / coucher de soleil | corail #d27472, #e27d7c, #fda77d, #ffca83 (43) dans 13_39.5 ; du lilas au rose #c18dde, #eb9ede, #feb0c6 (48 à 31) dans 07_55.5 ; magenta #312384, #70339f, #ec5080 (63-67) dans 02_53.5 ; du bleu au crème puis à la pêche #508bce, #d5cdbd, #f0bd97 dans 05_40.5 | #ab89a1, #b9929d, #ca9d97 (16-19) dans b_1350 ; #c69a99 à #dca890 dans b_1680 : mauve poussiéreux |
| Crépuscule / nuit | #365296 à #a59ba9 (02_48.5) ; #1849b4 à #1857c8 (C* 66-69) dans 11_42.5 | |

Pourquoi le nôtre est pâle : `mix(hor, top, pow(h, 0.55))` avec h = sin(élévation). Une caméra à l'horizontale avec un vfov de 36° ne voit que
les élévations 0-18°, donc le haut de l'image est un mélange à 52 %, #7cb5ec. La couleur saturée `top` n'apparaît jamais.

Pourquoi notre ciel d'heure dorée est gris : mélanger le bleu #5a66b8 avec l'orange #ffc48c passe par le gris. La référence, elle, fait tourner sa teinte
par le corail, le rose et le lilas.

### 3.13 Nuages (`data/clouds.json`)

| | Sommet éclairé | Milieu | Dessous | Rampe de bord 10-90 % | Liseré sombre |
|---|---|---|---|---|---|
| 04_12.5, 04_06.5 jour | #f1f6fc / #f2f6fb (L* 97) | #e5edf9 | #cfe3fc / #ada7ad | 8.6 / 10.6 px | aucun |
| 02_02.5 gros cumulus | #faedd7 (chaud, 63 %) | #dadae9 (30 %) | #b6c1f2 bleu lavande (7 %), tiers inférieur 12.5 % contre 0.3 % en haut | 16.2 px | aucun |
| 14_15.5 gros cumulus | #fbfafd | #ecedf6 | #d1d4e1 (47 %) | 19.5 px | aucun |
| 12_01.5, 13_05.5 bandes | #ece6e8 / #e2e8f1 | #e6e1e4 / #d3dae8 | #d6d6e0 / #c7cedf | 3.3-8.4 px | aucun |
| 12_55.5, 18_25.5 petits, nets | #f9eedc / #f7fafe | #ebebec | #d1d8e5 / #ccd6e9 | 1.9-2.1 px | **oui**, liseré d'encre à -13 L* |
| 02_48.5 petits nuages du crépuscule | #daa07e | #9e96ab | #7b88af | 13.4 px | aucun |
| 13_39.5 coucher de soleil | #f99a84 | #ea827c | #cf727c | 25.2 px | aucun |
| **nous b_200, b_1810 jour** | #f0f0f0 partout (83 % d'un seul ton) | | | 4.3-4.8 px | aucun |
| **nous b_1350 heure dorée** | #f0c9aa uni | | | 4.2 px | aucun |

La forme des nuages de la référence est une chaîne de lobes ronds, plus gros au milieu, avec un sommet en chou-fleur et une base
plate. Elle fait 100-640 px de large en 1080. Neuf nuages sur onze n'ont pas de contour. Les petits nuages nets et lointains reçoivent parfois le
liseré d'encre.

## 4. Densité de texels

La densité à l'écran pour notre objectif est px/m = 1920 / (2 · D · tan(18°)) = **2954 / D**, avec un vfov de 36° en 1080x1920, pour une surface
face à la caméra. Le long de l'axe de profondeur d'une surface rasante, multiplie par sin(angle rasant).

| D (m) | 0.5 | 1 | 2 | 5 | 10 | 20 | 50 | 100 |
|---|---|---|---|---|---|---|---|---|
| px/m | 5908 | 2954 | 1477 | 591 | 295 | 148 | 59 | 30 |

**Ce que fait la référence.** J'ai estimé le grossissement de la référence (px d'écran par texel) à partir des rampes de ses bords
peints, après avoir retiré le flou de la vidéo 720p :
- rampe 10-90 % ≈ sqrt((0.8 M)² + 1.5²) ;
- mortier et bardage à clin : M ≈ 2-3 ;
- interstices des planches, près : M ≈ 3.7 ;
- pont en très gros plan (01_50.5) : M ≈ 5.7.

Les textures de la référence sont donc grossies de 2-6 px par texel, jamais plus. **Cible : M ≤ 6 avec l'objectif au plus près, M ≤ 3 aux
distances de travail.** Texels/m nécessaires = px/m / M.

| Surface | Actuel | D typique | Actuel : px par texel | Texels/m cibles | Recette |
|---|---|---|---|---|---|
| Dessus du tablier | 512 px / 4 m = 128 /m | 0.5-3 m (objectif à 0.36 m au-dessus du tablier, tablier le plus proche à environ 1.05-1.3 m, rasant à environ 18°) | 46 à 0.5 m de face ; environ 6-10 le long de z à 1.2 m | ≥ 1000 (0.5 m), ≥ 500 (1 m) | `planksHD` 2048 px / 2 m = **1024 /m** (M = 5.8 à 0.5 m, 2.9 à 1 m) ; anisotropie 16 |
| Poutre latérale du tablier | 256 px / 3 m = 85 /m | 1-5 m | 35 à 1 m | ≥ 300 | `beamHD` 1024 / 3 m = 341 /m en longueur, 512 /m en vertical |
| Blocs des tours | 512 / 2 m = 256 /m | 3-60 m | 3.8 à 3 m | ≥ 500 pour les gros plans à 3 m | `stoneHD` 1024 / 2 m = **512 /m** |
| Mur de quai | 512 / 4 m = 128 /m | 5-40 m | 4.6 à 5 m | ≥ 200 | `stoneHD` sur la tuile de texture de 4 m = 256 /m (blocs de 0.5 m) |
| Pavés | 512 / 4 m = 128 /m | 3-30 m | 7.7 à 3 m | ≥ 250 | `cobbleHD` 1024 / 4 m = 256 /m |
| Herbe | 512 / 4 m = 128 /m | 3-60 m | 7.7 à 3 m | ≥ 250 | `grassHD` 1024 / 4 m = 256 /m |
| Toits | 512 / 4 m = 128 /m | 15-200 m | 1.5 à 15 m | ≥ 100 | `roofHD` 1024 / 4 m = 256 /m (sans encre) |
| Façades | 48 px/m | 15-100 m | 4.1 à 15 m | ≥ 96 | `facadeHD` **96 px/m**, plafonné à 2048 px de côté |
| Chaîne | 512 / 2 m = 256 /m | 1-10 m | 11.5 à 1 m | ≥ 500 | `chainHD` 1024 / 2 m = 512 /m |
| Eau | 512 / 8 m = 64 /m | 6-500 m | voir la section 3.11 | les marques gardent une taille constante à l'écran | 2 bandes : 1024 / 8 m près, 1024 / 40 m loin |
| Nuages | 600x300 par sprite de 110-185 m | 620-740 m | sprite de 500-840 px à l'écran | environ 1 texel par px | `cloudHD` 1024x512 |

Mémoire, RGBA plus mipmaps :
- `planksHD` 22 MB ;
- chaque texture 1024² 5.6 MB (tours, pierres de couronnement et de mur, pavés, herbe, 5 couleurs de toit, 2 textures d'eau : environ 75 MB) ;
- poutre, chaîne et 8 sprites de nuages, ensemble environ 25 MB ;
- façades à 96 px/m, environ 4 MB pour une façade de 10x10 m.

Si le nombre de maisons rend les façades trop lourdes, utilise 72 px/m. Cela divise quand même le flou actuel par deux.

## 5. Recette d'implémentation (notre stack : three.js 0.175, matériaux Lambert, CanvasTexture via `ctex`)

Toutes les fonctions de peinture sont dans `proto/paint_recipe.ts`, listées en entier en annexe. Elles utilisent `ctex(key, w, h, (g, r) => ...)`
et `rng` exactement comme `paint.ts`, et n'ont besoin d'aucune image. `tsc --strict` passe. Pour les installer, colle les fonctions utilitaires
(`U`, `wrapX`, `wrap2`, `rr`, `blotch`, `grain`, `nail`) et les fonctions de peinture dans `src/videos/bridge/paint.ts`. Remplace
l'import par les `ctex` / `rng` locaux. Toutes les fonctions de peinture se répètent sans joint en x, et les marques dispersées bouclent aussi en y.

### 5.1 Paramètres en un coup d'œil

| Fonction | Canevas | Couvre | Couleurs / traits (valeurs clés) |
|---|---|---|---|
| `planksHD()` | 2048² | 2 m x 2 m, 8 planches de 256 px (0.25 m) | **Planches :** aplats #efbd82 #e8b47a #f4c58b #e3ae74 #ecb97e (L* 75-82, écart type 2.6, teinte 71-75°). Avec le pipeline actuel, utilise le jeu plus clair de 5.4 ; 5 taches de dérive par planche (r 120-260, étirement x3, α 0.08-0.12) ; 10 traits de veinage (500-1500 px de long, amplitude 2-7, lw 1.5-3.5, rgba(140,82,36,.13) ou clair rgba(255,238,205,.14)) ; nœud sur 35 % des planches. **Bords :** arête éclairée 3 px rgba(255,238,200,.35) ; arête ombrée en dégradé de 18 px vers rgba(80,35,10,.24). **Joints et clous :** 1 joint d'about par planche (6 px #66300f) avec 4 clous (r 5, #3a2212 plus un éclat) ; clous de solive tous les 1 m. **Interstices :** 8 px #66300f plus un liseré de 1 px rgba(102,48,15,.5) (environ 4 % du pas, comme mesuré) |
| `beamHD()` | 1024x512 | 3 m x 1 m | 7 pièces de bois (0.143 m), aplats #a8743f #9e6b39 #b07a44 ; 6 traits de veinage, α 0.12-0.16 ; arête haute rgba(255,235,195,.30) ; ombre basse rgba(60,28,8,.26) ; joints entre pièces #4a2510 ; un joint par pièce avec 2 boulons #2f2a2a |
| `stoneHD(key, cols, mortar)` | 1024² | tuile de 2 m : assises de 0.25 m | tours ["#ddd0bf","#d3c5b3","#e5d9c9","#cabba8"], mortier #a39584 ; joint 7 px (5.5 %) ; blocs 200-360 px, appareil à joints alternés ; biseau haut 6 px α 0.22, gauche 4 px α 0.10, bas 5 px rgba(70,55,45,.14) ; 16 mouchetures (r 1-2.2) ; fissures sur 15 % des blocs ; ton ±7 % par bloc |
| `cobbleHD()` | 1024² | 4 m : 24 assises de 0.167 m | joints #8c7e69 ; pavés 48-72 px, rayon 7-12, #c4baa8 #b9ae9b #cfc5b3 #b3a793 #c9bfae #bdb4a6 ; dégradé clair en haut à gauche et sombre en bas à droite (α 0.20 / 0.16) ; pas de liseré |
| `roofHD(col, slate)` | 1024² | 4 m : rangs de 0.25 m | tuiles 77 px (ardoise 52) ; ton ±10 % par tuile ; dégradé de galbe ; joint 2 px α 0.22 ; lumière d'arête 3 px ; ombre de rang 5 px rgba(55,22,18,.32) ; **pas de contour INKL** |
| `grassHD()` | 1024² | 4 m | base #73b23d ; 16 plaques r 120-320 (#8cc650 / #5c9a30 à α 0.35) ; 1400 touffes en V (7-16 px, lw 2) ; 12 fleurs r 3.5 (#f7f3e8 #f4d24a #f3a9bb) |
| `facadeHD(key, wm, hm, o)` | 96 px/m (plafond 2048) | mêmes options que `facade()` | taches d'enduit r 0.4-1.5 m (α 0.05-0.07), fissures fines, soubassement 0.45 m ; colombages #6e4a30, 0.18 m, avec poteaux ; fenêtres 0.85x1.25 m : encadrement #f7f2e8 0.08 m avec une ligne rgba(60,45,40,.6) de 1.5 px ; vitre #8d9cdb à #5761a8 ; 2 éclats à 45° (0.07 / 0.035 m, blanc α 0.5) ; rideaux sur 35 % (#f5c4c8 #f3e3c6 #d7e6cf) ; volets à persiennes (lames tous les 0.06 m) ; brique en taille réelle 0.25x0.085 m sur #e9d3b4 |
| `waterNear()` / `waterFar()` | texture de données 1024² (R crête, G creux, B éclat) | 8 m et 40 m | arcs 18-44 px, flèche 0.3-0.45 w, lw 3-5, rotation aléatoire ; creux à +1.5 lw ; près : 28 arcs et 5 éclats, loin : 220 arcs et 30 éclats ; éclats 40-140 x 1.2-2.4 px. Mets `colorSpace = THREE.NoColorSpace` |
| `cloudHD(seed, pal)` | 1024x512 | un sprite | 6-9 lobes, plus gros au milieu, plus un sommet ; 3 couches : dessous (flou 6), milieu décalé de (-.04, -.12)r x0.9 (flou 8), éclairé décalé de (-.10, -.26)r x0.72 (flou 10) ; fondu de base plate 24 px ; `CLOUD_DAY` #fbf8f1 / #e1e5f3 / #c3cbe9, `CLOUD_GOLD` #ffd2a8 / #f2a08f / #a98fc4 |
| `chainHD()` | 256x1024 | 4 faces x 2 m | fond #262c3e ; anneaux de face lw 15 #5f6880 avec bords #20263a ; arc de reflet lw 5 #d4d6de (en haut à gauche) ; éclat #fbfaf4 ; maillons de profil #56607a avec bande #c9ccd6 |
| `SKY` | | | day #d8ecf7 (0°), #8ccbf8 (3°), #4aa3f2 (12°), #2a7fe6 (30°+) ; golden #ffd08a (0°), #ffad7e (4°), #e9849a (14°), #8c78c4 (32°+) |

### 5.2 Modifications de `world.ts` (fichier et lignes à la date de cette étude)

1. **Dessus du tablier, ligne 194.** Remplace les uv par `ZS.flatMap((z) => [0, z / 2, 2.5, z / 2])`. Ligne 209, remplace le
   matériau par `lam("planksHD", () => ({ map: planksHD() }))`. Ensuite, mets `map.anisotropy = 16` (WebGL le borne).
2. **Côté du tablier, ligne 209.** Donne à `this.deckSide` son propre `lam("deckSide", () => ({ map: beamHD() }))`. Ne remplace pas
   `M.wood` : les poteaux, les nervures, les garde-corps et le panneau utilisent des UV de boîte, et la disposition en 7 pièces y serait fausse. Éclaircis `M.wood`
   lui-même en modifiant `beam()` :
   - la base `#6b4428` devient `#a8743f` ;
   - les traits `rgba(40,22,12,.45) lw 2` deviennent `rgba(85,48,20,.16) lw 2-3`.
   Cela garde tout le bois au-dessus de L* 25 à l'ombre.
3. **Matériaux, lignes 127-134.**
   - `M.grass` utilise `grassHD()`, `M.cobble` utilise `cobbleHD()`.
   - `M.wall` utilise `stoneHD("wallHD", ["#c9bcaa","#bfb19f","#d1c5b4","#b8aa97"], "#958776")`.
   - `M.cope` utilise `stoneHD("copeHD", ["#e6dccd","#ddd3c3","#ece4d6","#d6cbba"], "#aea293")`.
   - `M.tower` utilise `stoneHD("towerHD")`, qui prend par défaut les couleurs des tours.
   - **La couleur de `M.iron`, `#2c2f36`, devient `#4b5468`.**
   - Ligne 217 : la map de `chainM` est `rep(chainHD(), 1, 1)`.
4. **Eau, lignes 185-188, plus la ligne par frame vers 283** (`this.waterMap.offset.set(...)`) : remplace le matériau par ce shader :

```ts
const wNear = waterNear(), wFar = waterFar();
for (const t of [wNear, wFar]) { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 16; t.needsUpdate = true; }
this.WU = {
  wNear: { value: new THREE.Color() }, wMid: { value: new THREE.Color() }, wFar: { value: new THREE.Color() },
  wCrest: { value: new THREE.Color() }, wTrough: { value: new THREE.Color() }, wGlint: { value: new THREE.Color() },
  wNearTex: { value: wNear }, wFarTex: { value: wFar }, wTime: { value: 0 },
};
const waterM = new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.9 });
waterM.onBeforeCompile = (sh) => {
  Object.assign(sh.uniforms, this.WU);
  sh.vertexShader = sh.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
    .replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
  sh.fragmentShader = sh.fragmentShader
    .replace("#include <common>", `#include <common>
varying vec3 vWP;
uniform vec3 wNear, wMid, wFar, wCrest, wTrough, wGlint;
uniform sampler2D wNearTex, wFarTex;
uniform float wTime;`)
    .replace("#include <map_fragment>", `
  vec3 V = vWP - cameraPosition;
  float d = length(V);
  float dep = asin(clamp(-V.y / d, 0.0, 1.0));        // depression angle of the view ray
  float f = 1.0 - smoothstep(0.0, 0.42, dep);         // 1 at the horizon .. 0 at 24 deg down (spreads over the frame)
  vec3 c = mix(mix(wNear, wMid, smoothstep(0.0, 0.55, f)), wFar, smoothstep(0.55, 1.0, f));
  vec2 p = vWP.xz + vec2(0.35 * wTime, 0.0);          // slow river, 0.35 m/s along +x
  vec4 mk = mix(texture2D(wNearTex, p / 8.0), texture2D(wFarTex, p / 40.0 + 0.37), smoothstep(25.0, 90.0, d));
  c = mix(c, wTrough, mk.g * 0.6);
  c = mix(c, wCrest, mk.r * 0.7);
  c = mix(c, wGlint, mk.b * (0.3 + 0.5 * f));
  diffuseColor.rgb = c;`);
};
const wm = new THREE.Mesh(quadUp(-900, 900, -30, 30, 1, 1, -D0), waterM);
// per frame: this.WU.wTime.value = t; and set the six colours from the light preset (table below)
```

Couleurs de l'eau par lumière. Les valeurs day et golden ont été vérifiées dans l'aperçu (5.6) :

| Preset | wNear | wMid | wFar | wCrest | wTrough | wGlint |
|---|---|---|---|---|---|---|
| day | #0c5a8c | #1679ad | #2a9cc8 | #5fcfe6 | #0a4774 | #e8fbff |
| golden | #23306a | #3e5594 | #b98a9e | #d9a088 | #1a2350 | #ffe2b0 |

5. **Ciel, lignes 102-107 et 279.** Utilise 4 paliers par élévation à la place de `mix(hor, top, pow(h, .55))` :

```ts
this.skyMat = new THREE.ShaderMaterial({
  uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
              c3: { value: new THREE.Color() }, e: { value: new THREE.Vector3() } },
  vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `uniform vec3 c0, c1, c2, c3; uniform vec3 e; varying vec3 vP;
    void main(){ float el = asin(clamp(vP.y, -1.0, 1.0));
      vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
      c = mix(c, c2, smoothstep(e.x, e.y, el));
      c = mix(c, c3, smoothstep(e.y, e.z, el));
      gl_FragColor = vec4(c, 1.0); }`,
  side: THREE.BackSide, depthWrite: false, fog: false,
});
// per frame (replaces top/hor): const S = SKY[s.light]; const u = this.skyMat.uniforms;
// S.c.forEach((h, i) => u["c" + i].value.set(h)); u.e.value.set(...S.e.map((deg) => (deg * Math.PI) / 180));
```

   Garde `L.fog` pour le brouillard. Sa couleur doit rester proche de `c0` du preset actif : day #d8ecf7, golden #ffd08a.

6. **Nuages, ligne 119 et lignes 282-283.** Construis deux jeux : `cloudHD(i % 4, CLOUD_DAY)` et `cloudHD(i % 4, CLOUD_GOLD)`.
   Change de map selon la lumière, et supprime la teinte multipliée `#ffd6b8`. Le rapport d'aspect du sprite reste 2:1 (w, w/2).

### 5.3 Modifications de `build.ts`

- Lignes 204-205, 300-301 : remplace `facade(...)` par `facadeHD(...)`, avec les mêmes options.
- Ligne 196 : remplace `roof(col)` par `roofHD(col, col === "#5b6470")`.
  - Éclaircis la palette des toits dans `STYLES` vers la référence : #b5503c vers #d27a62, #8a4a3a vers #b8644f, #a35a3a vers #c9775a,
    #6b5a7a vers #8e7aa0, ardoise #5b6470 vers #8f97a8.
  - La terre cuite de la référence mesure #dc8872 / #c87563, et l'ardoise #bdbfc6 / #9292a4.
- Ligne 286 : remplace le `stone("tstone", ...)` de la tour de l'église par `stoneHD("tstoneHD", ["#e2d8c2","#d6cbb2","#ece3cf","#cfc4aa"], "#a99d8b")`.

### 5.4 Règles au niveau du plan (pour qui règle les lumières)

- **Tablier au soleil :** L* 72-80 à l'écran.
  - Le transfert actuel de l'albédo vers l'écran, mesuré sur le tablier, est d'environ **-8 L\* et +7 C\*** : les aplats #c68a52 / #b97c46 /
    #d39a5f / #bf8550 (L* moyen 62) arrivent à #b77a37 / #a46826 / #c28844 / #ac6d29 (L* environ 54) dans b_100 et b_380.
  - Donc, sauf si les rapports sur l'éclairage ou l'étalonnage relèvent l'exposition, utilise les aplats plus clairs
    `["#fdd3a0", "#f7ca96", "#ffdaa8", "#f2c48e", "#fad09b"]` (L* 82-89, C* 30-35). Ils devraient arriver à L* 74-81,
    C* environ 40.
  - Les aplats par défaut de `paint_recipe.ts` (L* 75-82) supposent un pipeline neutre.
  - Si le tablier reste trop sombre, monte l'albédo avant de toucher au soleil.
- **Ombre :** bois à L* 27-35, tablier à l'ombre à L* environ 45, fer jamais sous L* 19. Seuls l'encre et le cœur des interstices peuvent descendre plus bas.
- **Lignes peintes :** 3-5 px en 1080, et au plus la moitié du contraste du contour à l'encre.

### 5.5 Contrôles de validation après le premier rendu (relance `scripts/measure_patches.py` / `water.py` / `sky.py` sur les nouvelles images fixes)

| Contrôle | Cible |
|---|---|
| Médiane des planches du tablier au soleil | L* 72-80, C* 35-55, teinte 70-78° |
| Interstices du tablier | FWHM 3.5-5 px près, ΔL* 40-48, ≤ 5 % du pas |
| Eau | dégradé étalé sur toute la surface de l'eau (chute ≥ 10 L* de haut en bas) ; surface de crête loin 1.5-5 %, milieu ≤ 1.6 %, près ≤ 0.9 % ; rapport d'aspect des marques 3-6 |
| Ciel, jour | C* en haut de l'image ≥ 45 |
| Ciel, heure dorée | C* ≥ 40 sur chaque palier, pas de bande grise au milieu |
| Nuages | 3 tons : dessous L* 79-86, teinte lavande 250-280° ; rampe de bord 8-20 px |
| Fer et chaînes | 10 % les plus sombres à L* ≥ 18 ; bande claire présente |
| Mortier et joints de tuiles | FWHM ≤ 4 px |

### 5.6 Vérification du prototype (aperçu CPU, `proto/views_inline.html`, 540x960, suréchantillonné 4x4)

**Rivière**, caméra à 6 m au-dessus de l'eau, inclinaison 8°, vfov 36° :

| Cap / lumière | Dégradé, de haut en bas | Surface de crête loin / milieu / près | Marques pour 100² | Largeur (p90) | Hauteur | Rapport | ΔL* de crête |
|---|---|---|---|---|---|---|---|
| dans le sens du courant, jour | #2e9dc8, #2591be, #1575a9, #0d5c8e, #0c5a8c | 1.6 / 1.0 / 0.8 % | 1.75 | 10 (28) px | 4 px | 4 | +12.3 |
| en travers, jour | | 1.6 / 1.0 / 0.8 % | 1.64 | 10 (30) px | 4 px | 3 | +12.6 |
| heure dorée | | | | | | | +16.4, avant l'abaissement de la crête à #d9a088 |

Toutes ces valeurs sont dans les plages de la référence de 3.11. La largeur des marques est en bas de plage, donc élargis les arcs d'environ 20 % si
elles paraissent petites.

**Tablier** vu de l'objectif à 0.36 m : planches L* 74-76, interstices 2-4 % du pas, profondeur des interstices 52 L*. J'ai ensuite éclairci le cœur
des interstices à #66300f, ce qui devrait ramener la profondeur à environ 45 (référence 40-48). À 0.5-0.9 m, la FWHM des interstices est d'environ
24 px, soit 3.2 % du pas.

## 6. Les 5 changements principaux, classés par impact visuel

1. **Dégradé du ciel (shader de ciel de world.ts + paliers `SKY`).** Le ciel couvre 20-35 % de la plupart des images en plan large. Le nôtre a la moitié
   du chroma de la référence (C* 22-29 contre 40-89), et le preset golden est mauve grisâtre (C* 16-19). Utilise les 4 paliers par
   élévation de 5.2, pour que le haut de l'image donne #3d95ee en lumière de jour, et que golden passe par le corail et le lilas.
2. **Eau de la rivière (shader + `waterNear` / `waterFar`).** L'eau couvre 20-40 % des plans de rivière. Fais trois changements :
   - un dégradé selon l'angle de plongée (profond près, cyan clair à l'horizon) ;
   - des marques de crête et de creux éparses et horizontales, qui se raréfient vers la caméra (1.6 / 1.0 / 0.8 %, pas 4-12 %) ;
   - aucune traînée verticale.
   L'eau à l'heure dorée doit être d'un bleu-violet saturé, pas #213b4e.
3. **Planches du tablier (`planksHD` + uv du tablier).** Éclaircis les planches au soleil à L* 72-80 (50 aujourd'hui). Rends les interstices deux fois moins
   larges et deux fois plus sombres, environ 4 % du pas. Ajoute les arêtes éclairées et ombrées. Le veinage ne doit jamais se lire comme un interstice. 1024
   texels/m maintiennent l'objectif à 0.5 m sous 5.8 px par texel.
4. **Pierre (`stoneHD` pour les tours, le couronnement et le quai, `cobbleHD`).** Utilise des blocs neutres et plus clairs (C* environ 10, L* environ 75
   au soleil). Rends le mortier un tiers plus fin et beaucoup plus clair (ΔL* environ 18, pas une tranchée #503f26). Remplace les pavés
   à pois par des pavés en quinconce.
5. **Sortir le fer et le bois du noir (`M.iron` #4b5468, `chainHD`, `beamHD`, `beam()` plus clair).** Les chaînes, les ancrages
   et les poutres latérales du tablier sont rendus à L* 3-7. La référence ne descend jamais sous L* 19, sauf dans les traits d'encre. Ce sont les bandes
   de reflet peintes qui font lire le fer de la référence comme du métal.

Ensuite, dans l'ordre :
6. `facadeHD` à 96 px/m : vitres en demi-teinte, encadrements blancs, pas d'encre lourde.
7. `roofHD` : pas d'encre sur chaque tuile, palette plus claire.
8. `cloudHD` : trois tons avec un dessous lavande.
9. `grassHD` : grandes plaques et fleurs éparses.

## 7. Mises en garde

- Nos images fixes sont des aperçus JPEG en 540p. Nos chiffres de bord et de ligne portent environ 2 px de flou d'agrandissement, donc le vrai
  rendu 1080 sera un peu plus net qu'indiqué. Les chiffres de couleur ne sont pas concernés.
- Les couleurs à l'écran combinent albédo, lumières et étalonnage. La recette donne des albédos réglés pour la lumière de jour actuelle (un tablier
  plat sous cette lumière reçoit environ x0.93-1.03 par canal, en linéaire) et des cibles à l'écran pour vérifier. Si les rapports sur l'éclairage ou
  l'étalonnage changent l'exposition, garde les cibles à l'écran et règle à nouveau les albédos.
- La référence n'a ni pavés ni chaînes de suspension. Ces recettes suivent les règles générales de la référence (tons
  unis, joints fins et clairs, bandes de reflet peintes), pas un équivalent mesuré.
- Les aperçus CPU n'ont ni mipmaps ni éclairage. Mesure à nouveau sur de vrais rendus (5.5).

## Annexe : `proto/paint_recipe.ts` (types vérifiés avec `tsc --strict` ; dans reel-kit, importe `ctex` / `rng` depuis `./paint`)

```ts
// Texture recipe for the bridge short: Canvas2D painters in the style of reel-kit/src/videos/bridge/paint.ts
// (ctex + rng, no external images). Prototype copy for checking only; in reel-kit they go into paint.ts next to
// the old painters (import line becomes `from "./paint"` / local). Numbers in comments are the reference
// measurements each value is tuned to (reports/textures.md). All sizes assume the uv scales noted per function.
import { ctex, rng } from "./shim";

type R = () => number;
type G = CanvasRenderingContext2D;
const pick = <T,>(r: R, a: T[]) => a[Math.floor(r() * a.length) % a.length];
const U = (r: R, a: number, b: number) => a + (b - a) * r();
const TAU = Math.PI * 2;

/** run fn at x and again one tile over when [x, x + w] crosses the left / right edge (seamless repeat in x) */
const wrapX = (W: number, x: number, w: number, fn: (x: number) => void) => {
  fn(x);
  if (x + w > W) fn(x - W);
  if (x < 0) fn(x + W);
};
/** same for a scattered mark of radius rad, in x and y */
const wrap2 = (W: number, H: number, x: number, y: number, rad: number, fn: (x: number, y: number) => void) => {
  for (const ox of [0, -W, W]) for (const oy of [0, -H, H]) {
    const X = x + ox, Y = y + oy;
    if (X + rad > 0 && X - rad < W && Y + rad > 0 && Y - rad < H) fn(X, Y);
  }
};
/** rounded-rectangle path */
const rr = (g: G, x: number, y: number, w: number, h: number, k: number) => {
  k = Math.max(0, Math.min(k, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + k, y);
  g.arcTo(x + w, y, x + w, y + h, k); g.arcTo(x + w, y + h, x, y + h, k);
  g.arcTo(x, y + h, x, y, k); g.arcTo(x, y, x + w, y, k);
  g.closePath();
};
/** soft elliptical blotch (radial gradient) stretched sx along x */
const blotch = (g: G, x: number, y: number, rad: number, sx: number, rgb: string, a: number) => {
  g.save(); g.translate(x, y); g.scale(sx, 1);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, rad);
  gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(-rad, -rad, rad * 2, rad * 2);
  g.restore();
};
/** long, soft wood-grain stroke along +x; random offsets drawn once so the wrapped copy matches */
const grain = (g: G, r: R, W: number, x: number, y: number, len: number, amp: number, lw: number, col: string) => {
  const n = Math.max(2, Math.round(len / 180));
  const dy = Array.from({ length: n + 1 }, () => (r() - 0.5) * 2 * amp);
  wrapX(W, x, len, (xx) => {
    g.strokeStyle = col; g.lineWidth = lw; g.lineCap = "round";
    g.beginPath(); g.moveTo(xx, y + dy[0]);
    for (let i = 1; i <= n; i++) {
      const x1 = xx + (len * i) / n;
      g.quadraticCurveTo(x1 - len / n / 2, y + (dy[i - 1] + dy[i]) / 2 + (i % 2 ? 0.3 : -0.3) * amp, x1, y + dy[i]);
    }
    g.stroke();
  });
};
/** nail / bolt head with a small painted glint (ref: dark dots with a white catch-light) */
const nail = (g: G, x: number, y: number, rad: number, col = "#3a2212") => {
  g.fillStyle = col; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
  g.fillStyle = "rgba(255,240,215,0.55)"; g.beginPath(); g.arc(x - rad * 0.32, y - rad * 0.32, rad * 0.36, 0, TAU); g.fill();
};

// ---------------------------------------------------------------------------------------------------------------
/** Deck top, transverse boards. 2048 px = 2 m x 2 m (1024 texels/m: the 0.5 m lens then magnifies ~5.8 px per
 *  texel, the same as the reference's closest deck shot, 10-90 % edge ramp ~4.8 px at 1080p).
 *  Canvas y runs along the bridge (z): 8 boards of 0.25 m = 256 px. world.ts deckTop uv -> [0, z / 2, 2.5, z / 2].
 *  Ref: board-to-board L* std 1.2-4.2 (ours 5-6), within-board 1.3-2.6, gaps ~4 % of the pitch (FWHM) dark brown
 *  #571e00-#6b2903 (dL* 40-48), sunlit lip +4..7 L*, shaded lip -3..-6 L*, nails + rare knots. */
export const planksHD = () => ctex("planksHD", 2048, 2048, (g, r) => {
  const S = 2048, B = 256, GAP = 8;
  // albedo: under the current day light sunlit boards must then measure L* 72-80 on screen (ref #f8bb60, #dea04b,
  // #cd9a66); if they come out darker, raise these (up to #ffd08a) before touching the light
  const fills = ["#efbd82", "#e8b47a", "#f4c58b", "#e3ae74", "#ecb97e"];
  for (let i = 0; i < 8; i++) {
    const y = i * B;
    g.save(); g.beginPath(); g.rect(0, y, S, B); g.clip();
    g.fillStyle = pick(r, fills); g.fillRect(0, y, S, B);
    for (let k = 0; k < 5; k++) { // broad tone drift along the board, +-2 L*
      const x = U(r, 0, S), rad = U(r, 120, 260), light = r() > 0.5;
      wrapX(S, x - rad * 3, rad * 6, (xx) => blotch(g, xx + rad * 3, y + B / 2, rad, 3, light ? "255,236,200" : "150,90,40", light ? 0.12 : 0.08));
    }
    for (let k = 0; k < 10; k++) { // grain: long, thin, low contrast; never as dark as a gap
      const light = r() < 0.3;
      grain(g, r, S, U(r, 0, S), y + U(r, 16, B - 16), U(r, 500, 1500), U(r, 2, 7), U(r, 1.5, 3.5),
        light ? "rgba(255,238,205,0.14)" : "rgba(140,82,36,0.13)");
    }
    if (r() < 0.35) { // knot, about one board in three
      const kx = U(r, 120, S - 120), ky = y + U(r, 70, B - 70), rx = U(r, 14, 24), ry = rx * U(r, 0.45, 0.6);
      g.strokeStyle = "rgba(140,82,36,0.20)"; g.lineWidth = 2;
      g.beginPath(); g.ellipse(kx, ky, rx * 2.3, ry * 1.9, 0, 0, TAU); g.stroke();
      g.fillStyle = "rgba(150,88,38,0.30)"; g.beginPath(); g.ellipse(kx, ky, rx, ry, 0, 0, TAU); g.fill();
      g.strokeStyle = "rgba(105,55,22,0.55)"; g.lineWidth = 2.5; g.stroke();
    }
    for (let k = 0; k < 3; k++) blotch(g, U(r, 100, S - 100), y + U(r, 40, B - 40), U(r, 40, 110), 1.6, "120,70,30", 0.06); // wear
    // board edges: sunlit lip on one side, soft darkening on the other
    g.fillStyle = "rgba(255,238,200,0.35)"; g.fillRect(0, y + GAP / 2 + 1, S, 3);
    const sh = g.createLinearGradient(0, y + B - GAP / 2 - 18, 0, y + B - GAP / 2);
    sh.addColorStop(0, "rgba(80,35,10,0)"); sh.addColorStop(1, "rgba(80,35,10,0.24)");
    g.fillStyle = sh; g.fillRect(0, y + B - GAP / 2 - 18, S, 18);
    // one butt joint per board per tile (staggered), nailed both sides; joist nails every 1 m
    const jx = U(r, 90, S - 90);
    g.fillStyle = "#66300f"; g.fillRect(jx - 3, y, 6, B);
    g.fillStyle = "rgba(255,238,200,0.30)"; g.fillRect(jx + 3, y, 2, B);
    for (const nx of [jx - 24, jx + 24]) for (const f of [0.28, 0.72]) nail(g, nx, y + B * f, 5);
    for (const nx of [512, 1536]) for (const f of [0.3, 0.7]) nail(g, nx + U(r, -3, 3), y + B * f, 5);
    g.restore();
  }
  for (let i = 0; i <= 8; i++) { // gaps last: 8 px core + 1 px soft rim = ~4 % of the 256 px pitch
    g.fillStyle = "rgba(102,48,15,0.5)"; g.fillRect(0, i * B - GAP / 2 - 1, S, GAP + 2);
    g.fillStyle = "#66300f"; g.fillRect(0, i * B - GAP / 2, S, GAP);
  }
});

/** Deck side beams / stringers: 1024 x 512 = 3 m along the beam x 1 m (matches the side uv: z / 3, height in m).
 *  Ours rendered #231001 (L* 7, reads as a black hole); ref timber in shade stays at L* 27-34 (#77331b, #632918). */
export const beamHD = () => ctex("beamHD", 1024, 512, (g, r) => {
  const W = 1024, H = 512, T = H / 7; // 0.143 m timbers
  for (let k = 0; k < 7; k++) {
    const y = k * T;
    g.save(); g.beginPath(); g.rect(0, y, W, T); g.clip();
    g.fillStyle = pick(r, ["#a8743f", "#9e6b39", "#b07a44"]); g.fillRect(0, y, W, T);
    for (let i = 0; i < 6; i++) {
      const light = r() < 0.3;
      grain(g, r, W, U(r, 0, W), y + U(r, 8, T - 8), U(r, 250, 700), U(r, 1.5, 4), U(r, 1.5, 3), light ? "rgba(255,232,190,0.12)" : "rgba(85,48,20,0.16)");
    }
    g.fillStyle = "rgba(255,235,195,0.30)"; g.fillRect(0, y + 3, W, 3);
    const sh = g.createLinearGradient(0, y + T - 12, 0, y + T);
    sh.addColorStop(0, "rgba(60,28,8,0)"); sh.addColorStop(1, "rgba(60,28,8,0.26)");
    g.fillStyle = sh; g.fillRect(0, y + T - 12, W, 12);
    const jx = U(r, 120, W - 120);
    g.fillStyle = "#4a2510"; g.fillRect(jx - 2, y, 4, T);
    for (const bx of [jx - 30, jx + 30]) nail(g, bx, y + T / 2, 7, "#2f2a2a");
    g.restore();
    g.fillStyle = "#4a2510"; g.fillRect(0, y - 1.5, W, 3); // seam between timbers
  }
});

/** Ashlar courses, 1024 px per tile: with boxGeo tile 2 (towers) courses are 0.25 m at 512 texels/m; with the 4 m
 *  quad tile (quay walls) 0.5 m blocks. Ref: blocks #c2b2a5 / #cdbdb0 (C* 5-12), mortar dL* -14..-20 and only
 *  2.8-3.6 px wide at 1080p (ours #503f26, 5.4 px, yellow C* 18), top bevel +5 L*, bottom -3 L*, 2-4 px speckles,
 *  hairline cracks. Joint = 7 px = 5.5 % of a course. */
export const stoneHD = (key = "stoneHD", cols = ["#ddd0bf", "#d3c5b3", "#e5d9c9", "#cabba8"], mortar = "#a39584") =>
  ctex(key, 1024, 1024, (g, r) => {
    const S = 1024, RH = 128, J = 7;
    g.fillStyle = mortar; g.fillRect(0, 0, S, S);
    for (let row = 0; row < S / RH; row++) {
      const y = row * RH, ws: number[] = [];
      let sum = 0;
      while (sum < S) { const w = U(r, 200, 360); ws.push(w); sum += w; }
      const k = S / sum; // stretch so every course closes exactly on the tile width
      let x = (row % 2) * 140 + U(r, 0, 60);
      for (const w0 of ws) {
        const w = w0 * k, col = pick(r, cols), dl = U(r, -1, 1);
        const sp = Array.from({ length: 16 }, () => [r(), r(), U(r, 1, 2.2), r() < 0.6 ? 1 : 0]);
        const crack = r() < 0.15 ? Array.from({ length: 4 }, () => [r(), r()]) : null;
        wrapX(S, x % S, w, (xx) => {
          const X = xx + J / 2, Y = y + J / 2, BW = w - J, BH = RH - J;
          rr(g, X, Y, BW, BH, 5); g.fillStyle = col; g.fill();
          g.fillStyle = dl > 0 ? `rgba(255,252,245,${0.07 * dl})` : `rgba(70,55,45,${-0.06 * dl})`; g.fill();
          g.fillStyle = "rgba(255,252,245,0.22)"; g.fillRect(X + 3, Y, BW - 6, 6);        // top bevel
          g.fillStyle = "rgba(255,252,245,0.10)"; g.fillRect(X, Y + 4, 4, BH - 8);        // left bevel
          g.fillStyle = "rgba(70,55,45,0.14)"; g.fillRect(X + 3, Y + BH - 5, BW - 6, 5); // bottom shade
          for (const [u, v, s, dark] of sp) {
            g.fillStyle = dark ? "rgba(95,82,72,0.38)" : "rgba(255,255,255,0.35)";
            g.beginPath(); g.arc(X + 6 + u * (BW - 12), Y + 8 + v * (BH - 16), s, 0, TAU); g.fill();
          }
          if (crack) {
            g.strokeStyle = "rgba(110,95,85,0.45)"; g.lineWidth = 1.2; g.beginPath();
            crack.forEach(([u, v], i) => { const px = X + 10 + u * (BW - 20), py = Y + 10 + v * (BH - 20); if (i) g.lineTo(px, py); else g.moveTo(px, py); });
            g.stroke();
          }
        });
        x += w;
      }
    }
  });

/** Cobbled quay: granite setts in staggered courses, 1024 px = 4 m (256 texels/m; setts 0.19-0.28 x 0.167 m).
 *  Replaces the polka-dot ellipses (ours: regular grid, dark rims, L* std 20): low tone spread, sand-coloured
 *  joints, a soft top-left light and bottom-right shade per sett, no outline ring. */
export const cobbleHD = () => ctex("cobbleHD", 1024, 1024, (g, r) => {
  const S = 1024, N = 24, CH = S / N, J = 5;
  g.fillStyle = "#8c7e69"; g.fillRect(0, 0, S, S);
  const cols = ["#c4baa8", "#b9ae9b", "#cfc5b3", "#b3a793", "#c9bfae", "#bdb4a6"];
  for (let row = 0; row < N; row++) {
    const y = row * CH, ws: number[] = [];
    let sum = 0;
    while (sum < S) { const w = U(r, 48, 72); ws.push(w); sum += w; }
    const k = S / sum;
    let x = U(r, 0, 60);
    for (const w0 of ws) {
      const w = w0 * k, col = pick(r, cols), dy = U(r, -1.5, 1.5), rad = U(r, 7, 12);
      const sp = Array.from({ length: 3 }, () => [r(), r(), r() < 0.5 ? 1 : 0]);
      wrapX(S, x % S, w, (xx) => {
        const X = xx + J / 2, Y = y + J / 2 + dy, W = w - J, H = CH - J;
        rr(g, X, Y, W, H, rad); g.fillStyle = col; g.fill();
        g.save(); rr(g, X, Y, W, H, rad); g.clip();
        const gr = g.createLinearGradient(X, Y, X + W * 0.6, Y + H);
        gr.addColorStop(0, "rgba(255,250,240,0.20)"); gr.addColorStop(0.5, "rgba(255,250,240,0)"); gr.addColorStop(1, "rgba(70,58,45,0.16)");
        g.fillStyle = gr; g.fillRect(X, Y, W, H);
        g.restore();
        for (const [u, v, d] of sp) {
          g.fillStyle = d ? "rgba(90,80,68,0.35)" : "rgba(255,255,255,0.3)";
          g.beginPath(); g.arc(X + 5 + u * (W - 10), Y + 5 + v * (H - 10), 1.4, 0, TAU); g.fill();
        }
      });
      x += w;
    }
  }
  for (let i = 0; i < 14; i++) { // damp / worn patches
    const x = U(r, 0, S), y = U(r, 0, S), rad = U(r, 60, 160);
    wrap2(S, S, x, y, rad * 1.3, (xx, yy) => blotch(g, xx, yy, rad, 1.3, "80,70,55", 0.07));
  }
});

/** Roof tiles (or slates with slate = true), 1024 px = 4 m (256 texels/m; keep the 4 m roof uv), courses 0.25 m.
 *  No per-tile ink outline: ref tile joints are 3.3 px at 1080p and only dL* 10 (ours 9.4 px, dL* 15, INKL stroke);
 *  the course shadow carries the pattern. Canvas y runs down the slope (flip the course if v runs the other way). */
export const roofHD = (col: string, slate = false) => ctex("roofHD" + col, 1024, 1024, (g, r) => {
  const S = 1024, C = 64, TW = slate ? 52 : 77;
  g.fillStyle = col; g.fillRect(0, 0, S, S);
  for (let row = 0; row < S / C; row++) {
    const y = row * C, off = (row % 2) * TW / 2 + U(r, -6, 6);
    const n = Math.ceil(S / TW) + 1;
    for (let i = 0; i < n; i++) {
      const x = i * TW - off, tone = U(r, -1, 1);
      const fill = tone > 0 ? `rgba(255,240,225,${0.10 * tone})` : `rgba(60,25,20,${-0.10 * tone})`;
      wrapX(S, x, TW, (xx) => {
        g.fillStyle = fill; g.fillRect(xx, y, TW, C);
        const gr = g.createLinearGradient(xx, 0, xx + TW, 0); // rounded pan: light left, darker right
        gr.addColorStop(0, "rgba(255,240,225,0.12)"); gr.addColorStop(0.55, "rgba(255,240,225,0)"); gr.addColorStop(1, slate ? "rgba(20,25,35,0.10)" : "rgba(60,25,20,0.12)");
        g.fillStyle = gr; g.fillRect(xx, y, TW, C);
        g.fillStyle = slate ? "rgba(20,25,35,0.25)" : "rgba(60,25,20,0.22)"; g.fillRect(xx, y, 2, C); // thin soft joint
      });
    }
    g.fillStyle = slate ? "rgba(220,230,245,0.18)" : "rgba(255,235,220,0.22)"; g.fillRect(0, y + C - 9, S, 3); // lower-lip light
    g.fillStyle = slate ? "rgba(15,20,30,0.32)" : "rgba(55,22,18,0.32)"; g.fillRect(0, y + C - 5, S, 5);        // course shadow
  }
  for (let i = 0; i < 18; i++) { // weathering
    const x = U(r, 0, S), y = U(r, 0, S), rad = U(r, 40, 120);
    wrap2(S, S, x, y, rad * 1.5, (xx, yy) => blotch(g, xx, yy, rad, 1.5, "70,60,40", 0.08));
  }
});

/** Grass bank: 1024 px = 4 m (256 texels/m). Ref lawns: flat, saturated (#71b038 / #7dbf3f, L* 62-66, C* 55-64),
 *  broad soft variation (autocorrelation ~40 px at 1080p, +-4 L*), sparse tufts and flowers, low fine noise.
 *  Ours had the right hue (#6dad37) but only fine uniform noise (autocorrelation 6 px). */
export const grassHD = () => ctex("grassHD", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#73b23d"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 16; i++) {
    const x = U(r, 0, S), y = U(r, 0, S), rad = U(r, 120, 320), light = r() > 0.5;
    wrap2(S, S, x, y, rad * 1.4, (xx, yy) => blotch(g, xx, yy, rad, 1.4, light ? "140,198,80" : "92,154,48", 0.35));
  }
  g.lineWidth = 2; g.lineCap = "round"; g.lineJoin = "round";
  for (let i = 0; i < 1400; i++) { // tufts ~90 per m2
    const x = U(r, 0, S), y = U(r, 0, S), h = U(r, 7, 16), lean = U(r, -3, 3), light = r() < 0.4;
    wrap2(S, S, x, y, 20, (xx, yy) => {
      g.strokeStyle = light ? "rgba(165,218,98,0.35)" : "rgba(78,138,38,0.45)";
      g.beginPath(); g.moveTo(xx - 3 + lean, yy - h); g.lineTo(xx, yy); g.lineTo(xx + 3 + lean, yy - h * 0.8); g.stroke();
    });
  }
  for (let i = 0; i < 12; i++) { // flowers ~0.75 per m2
    const x = U(r, 0, S), y = U(r, 0, S), c = pick(r, ["#f7f3e8", "#f4d24a", "#f3a9bb", "#f7f3e8"]);
    wrap2(S, S, x, y, 8, (xx, yy) => {
      g.fillStyle = c; g.beginPath(); g.arc(xx, yy, 3.5, 0, TAU); g.fill();
      g.fillStyle = "rgba(240,190,60,0.9)"; g.beginPath(); g.arc(xx, yy, 1.3, 0, TAU); g.fill();
    });
  }
});

/** Plaster / timber / brick facade at 96 px/m (2x the old 48, capped at 2048 px a side). Windows as in the ref:
 *  white trim with a thin dark line (no heavy ink), mid-tone blue-violet glass (never near-black), two diagonal
 *  glints, curtains in about a third, louvred shutters. Same options object as facade(). */
export const facadeHD = (key: string, wm: number, hm: number, o: { wall: string; shutter: string; door?: boolean; timber?: boolean; brick?: boolean }) => {
  const PX = Math.min(96, 2048 / Math.max(wm, hm));
  const W = Math.round(wm * PX), H = Math.round(hm * PX), m = (v: number) => v * PX;
  return ctex("facHD" + key, W, H, (g, r) => {
    if (o.brick) { // real-size bricks 0.25 x 0.085 m with light mortar (ref brick #cf5e30 / mortar #f6d9b1)
      g.fillStyle = "#e9d3b4"; g.fillRect(0, 0, W, H);
      const bw = m(0.25), bh = m(0.085);
      for (let y = 0, row = 0; y < H; y += bh, row++) for (let x = -(row % 2) * bw / 2; x < W; x += bw) {
        g.fillStyle = pick(r, ["#c0583a", "#b44f35", "#c8643f", "#a94a33", "#cf6e45"]);
        g.fillRect(x + 1, y + 1, bw - 2, bh - 2);
      }
    } else {
      g.fillStyle = o.wall; g.fillRect(0, 0, W, H);
      const n = Math.round((wm * hm) / 3) + 6;
      for (let i = 0; i < n; i++) {
        const light = r() > 0.5;
        blotch(g, U(r, 0, W), U(r, 0, H), m(U(r, 0.4, 1.5)), 1.5, light ? "255,255,255" : "120,90,60", light ? 0.07 : 0.05);
      }
      for (let i = 0; i < 4; i++) { // hairline cracks
        let x = U(r, 0, W), y = U(r, 0, H * 0.8);
        g.strokeStyle = "rgba(120,100,80,0.35)"; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += m(U(r, -0.08, 0.08)); y += m(U(r, 0.04, 0.12)); g.lineTo(x, y); }
        g.stroke();
      }
    }
    const floors = Math.max(1, Math.floor(hm / 2.8));
    const nWin = Math.max(1, Math.floor(wm / 2.2));
    g.fillStyle = "rgba(70,55,45,0.28)"; g.fillRect(0, H - m(0.45), W, m(0.45)); // plinth
    g.fillStyle = "rgba(70,55,45,0.35)"; g.fillRect(0, H - m(0.45), W, 2);
    const timberBeam = (x: number, y: number, w: number, h: number) => {
      g.fillStyle = "#6e4a30"; g.fillRect(x, y, w, h);
      g.strokeStyle = "rgba(40,25,15,0.5)"; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
      g.fillStyle = "rgba(255,230,200,0.22)"; g.fillRect(x + 2, y + 2, w - 4, 2);
    };
    if (o.timber) {
      const t = m(0.18);
      timberBeam(0, 0, t, H); timberBeam(W - t, 0, t, H); timberBeam(0, 0, W, t);
      for (let fl = 1; fl < floors; fl++) timberBeam(0, H - m(fl * 2.8) - t / 2, W, t);
      for (let i = 1; i < nWin; i++) timberBeam((i * W) / nWin - t / 2, 0, t, H - m(2.8)); // posts, upper floors
    }
    const door = (cx: number) => {
      const dw = m(1.1), dh = m(2.1);
      const path = (k: number) => {
        g.beginPath(); g.moveTo(cx - dw / 2 - k, H); g.lineTo(cx - dw / 2 - k, H - dh + dw / 2);
        g.arc(cx, H - dh + dw / 2, dw / 2 + k, Math.PI, 0); g.lineTo(cx + dw / 2 + k, H); g.closePath();
      };
      path(m(0.1)); g.fillStyle = "#e9e2d4"; g.fill(); g.strokeStyle = "rgba(60,45,40,0.6)"; g.lineWidth = 1.5; g.stroke();
      path(0); g.fillStyle = "#7a4a2c"; g.fill();
      g.save(); path(0); g.clip();
      for (let x = cx - dw / 2 + m(0.14); x < cx + dw / 2; x += m(0.14)) {
        g.fillStyle = "rgba(40,20,10,0.45)"; g.fillRect(x - 1, H - dh, 2, dh);
        g.fillStyle = "rgba(255,225,190,0.15)"; g.fillRect(x + 1, H - dh, 2, dh);
      }
      g.restore();
      path(0); g.strokeStyle = "rgba(40,25,15,0.7)"; g.lineWidth = 2; g.stroke();
      nail(g, cx + dw / 3, H - dh / 2, m(0.035), "#d9b04a");
    };
    for (let fl = 0; fl < floors; fl++) for (let i = 0; i < nWin; i++) {
      const cx = ((i + 0.5) * W) / nWin, by = H - m(fl * 2.8 + 0.9);
      if (o.door && fl === 0 && i === Math.floor(nWin / 2)) { door(cx); continue; }
      const ww = m(0.85), wh = m(1.25), x0 = cx - ww / 2, y0 = by - wh, tr = m(0.08), sw = m(0.45);
      for (const sx of [x0 - tr - sw - m(0.02), x0 + ww + tr + m(0.02)]) { // louvred shutters
        g.fillStyle = o.shutter; g.fillRect(sx, y0, sw, wh);
        const lw = Math.max(1.5, m(0.012));
        for (let ly = y0 + m(0.06); ly < y0 + wh - m(0.04); ly += m(0.06)) {
          g.fillStyle = "rgba(0,0,0,0.22)"; g.fillRect(sx + m(0.04), ly, sw - m(0.08), lw);
          g.fillStyle = "rgba(255,255,255,0.14)"; g.fillRect(sx + m(0.04), ly + lw, sw - m(0.08), 1);
        }
        g.strokeStyle = "rgba(0,0,0,0.18)"; g.lineWidth = m(0.03); g.strokeRect(sx + m(0.015), y0 + m(0.015), sw - m(0.03), wh - m(0.03));
        g.strokeStyle = "rgba(40,30,40,0.55)"; g.lineWidth = 1.5; g.strokeRect(sx, y0, sw, wh);
      }
      g.fillStyle = "#f7f2e8"; g.fillRect(x0 - tr, y0 - tr, ww + 2 * tr, wh + 2 * tr); // trim
      const gl = g.createLinearGradient(0, y0, 0, y0 + wh);
      gl.addColorStop(0, "#8d9cdb"); gl.addColorStop(1, "#5761a8"); // ref glass #6670b0
      g.fillStyle = gl; g.fillRect(x0, y0, ww, wh);
      if (r() < 0.35) { // curtains from the top corners
        g.fillStyle = pick(r, ["#f5c4c8", "#f3e3c6", "#d7e6cf"]);
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + ww * 0.42, y0); g.lineTo(x0, y0 + wh * 0.75); g.fill();
        g.beginPath(); g.moveTo(x0 + ww, y0); g.lineTo(x0 + ww * 0.58, y0); g.lineTo(x0 + ww, y0 + wh * 0.75); g.fill();
      }
      g.save(); g.beginPath(); g.rect(x0, y0, ww, wh); g.clip(); // two diagonal glints
      g.fillStyle = "rgba(255,255,255,0.5)";
      for (const [a, b] of [[0.3, m(0.07)], [0.58, m(0.035)]]) {
        g.save(); g.translate(x0 + ww * a, y0 + wh * 0.5); g.rotate(Math.PI / 4); g.fillRect(-b / 2, -wh, b, wh * 2); g.restore();
      }
      g.restore();
      g.fillStyle = "#f7f2e8"; g.fillRect(cx - m(0.02), y0, m(0.04), wh); g.fillRect(x0, y0 + wh * 0.45 - m(0.02), ww, m(0.04)); // mullions
      g.strokeStyle = "rgba(60,45,40,0.6)"; g.lineWidth = 1.5; g.strokeRect(x0 - tr, y0 - tr, ww + 2 * tr, wh + 2 * tr);
      g.strokeStyle = "rgba(60,45,40,0.45)"; g.strokeRect(x0, y0, ww, wh);
      g.fillStyle = "#ebe3d4"; g.fillRect(x0 - tr - m(0.06), by + tr, ww + 2 * tr + m(0.12), m(0.07)); // sill
      g.fillStyle = "rgba(60,45,40,0.35)"; g.fillRect(x0 - tr - m(0.06), by + tr + m(0.07), ww + 2 * tr + m(0.12), m(0.03));
    }
  });
};

/** River marks as a DATA texture for the water shader (world.ts): R = crest, G = trough, B = glint; 1024 px = 8 m.
 *  Two instances: a sparse one for the near band and a dense one sampled at 40 m tiles for the far band, because the
 *  ref thins the marks out towards the camera (area far 1.5-5 %, mid 0-1.6 %, near 0-0.9 %; ours 4-12 % everywhere).
 *  Ref marks: 12-30 px wide at 1080p (p90 36-97), 3-6 px tall, aspect 3-6, crest +8..+13 L* with a trough
 *  -8..-9 L* right under it, thin glint lines 1-3 x 30-100 px. The marks are short, deep, randomly turned arcs
 *  (isotropic on average): foreshortening alone then makes horizontal dashes on screen from ANY heading (aspect
 *  1 / sin(grazing) = 3.4 at 17 deg, 5.8 at 10 deg); ours drew 30-100 px strokes along u, which turn into dots /
 *  vertical streaks when the camera looks along the river. In reel-kit set colorSpace = THREE.NoColorSpace. */
export const waterMarks = (key: string, nCrest: number, nGlint: number) => ctex("waterMarks" + key, 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#000"; g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = "lighter"; // channels add independently
  g.lineCap = "round";
  for (let i = 0; i < nCrest; i++) {
    const x = U(r, 0, S), y = U(r, 0, S), w = U(r, 18, 44), sag = w * U(r, 0.3, 0.45), lw = U(r, 3, 5), a = U(r, 0, Math.PI);
    wrap2(S, S, x, y, w, (xx, yy) => {
      g.save(); g.translate(xx, yy); g.rotate(a);
      const arc = (dy: number, col: string, k: number) => {
        g.strokeStyle = col; g.lineWidth = lw * k;
        g.beginPath(); g.moveTo(-w / 2, dy); g.quadraticCurveTo(0, dy - sag * 2, w / 2, dy); g.stroke();
      };
      arc(0, "rgb(255,0,0)", 1);          // crest
      arc(lw * 1.5, "rgb(0,255,0)", 0.9); // trough right under it
      g.restore();
    });
  }
  for (let i = 0; i < nGlint; i++) { // glints: long thin straight lines
    const x = U(r, 0, S), y = U(r, 0, S), len = U(r, 40, 140), lw = U(r, 1.2, 2.4), a = U(r, 0, Math.PI);
    wrap2(S, S, x, y, len, (xx, yy) => {
      g.save(); g.translate(xx, yy); g.rotate(a); g.strokeStyle = "rgb(0,0,255)"; g.lineWidth = lw;
      g.beginPath(); g.moveTo(-len / 2, 0); g.lineTo(len / 2, 0); g.stroke(); g.restore();
    });
  }
  g.globalCompositeOperation = "source-over";
});
export const waterNear = () => waterMarks("near", 28, 5);  // ~0.3 % crest area
export const waterFar = () => waterMarks("far", 220, 30);  // ~2.5 % crest + glints, at 40 m tiles

/** Cloud sprite, 1024 x 512, three painted tones and a flat soft bottom, no outline.
 *  Ref cumulus: lit crown #f1f6fc-#fbfafd (L* 96-98, warm in haze #faedd7), mid #dadae9-#e5edf9, lavender-blue
 *  underside #b6c1f2 / #c7cedf / #d1d4e1 (L* 79-86) mostly in the bottom third, edge ramp 8-20 px at 1080p
 *  (median ~10), no dark rim in 9 of 11 clouds. Ours: one flat tone (#f0f0f0 = 83 % of the cloud), 4-5 px edge.
 *  Golden: use CLOUD_GOLD instead of multiplying the white sprite by #ffd6b8 (a tint cannot make the cool belly). */
export const CLOUD_DAY = { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" };
export const CLOUD_GOLD = { lit: "#ffd2a8", mid: "#f2a08f", shade: "#a98fc4" };
export const cloudHD = (seed: number, pal = CLOUD_DAY) => ctex(`cloudHD_${pal.lit}_${seed}`, 1024, 512, (g) => {
  const r = rng(seed * 7919 + 17); // own seed: ctex keys of equal length would otherwise share shapes
  const W = 1024, H = 512, base = 400;
  const n = 6 + Math.floor(r() * 4), lobes: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < n; i++) { // main row, biggest in the middle
    const t = (i + 0.5) / n, rad = (60 + 110 * Math.sin(Math.PI * t) ** 0.8) * U(r, 0.75, 1.15);
    lobes.push({ x: 150 + t * 724 + U(r, -30, 30), y: base - rad * U(r, 0.35, 0.65), r: rad });
  }
  for (let i = 0; i < Math.floor(n / 2); i++) { // crown
    const t = U(r, 0.25, 0.75), rad = U(r, 60, 110);
    lobes.push({ x: 150 + t * 724, y: base - 150 - rad * U(r, 0.3, 0.7), r: rad });
  }
  const layer = (dx: number, dy: number, k: number, col: string, blur: number) => {
    g.save(); g.filter = `blur(${blur}px)`; g.fillStyle = col; g.beginPath();
    for (const l of lobes) { const x = l.x + dx * l.r, y = l.y + dy * l.r; g.moveTo(x + l.r * k, y); g.arc(x, y, l.r * k, 0, TAU); }
    g.fill(); g.restore();
  };
  layer(0, 0, 1.0, pal.shade, 6);         // silhouette in the underside tone
  layer(-0.04, -0.12, 0.9, pal.mid, 8);   // mid band
  layer(-0.1, -0.26, 0.72, pal.lit, 10);  // sunlit crown, offset up-left
  g.globalCompositeOperation = "destination-in"; // flat, soft bottom
  const m = g.createLinearGradient(0, base - 18, 0, base + 6);
  m.addColorStop(0, "rgba(0,0,0,1)"); m.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = m; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "source-over";
});

/** Chain strand: 4 faces side by side (Strand uv: u = k / 4 around the tube), 1024 px = 2 m along (512 texels/m).
 *  Ref iron: blue-grey with a painted matcap-like bright band (#e3d5c6-#e8e7df, ~25-30 % of the area), mids
 *  #586076 / #8790a6, darks #282f41 (L* 19). Ours renders #040d16 / #050b1b (L* 3-5). */
export const chainHD = () => ctex("chainHD", 256, 1024, (g) => {
  const F = 64, P = 128; // face width, link pitch 0.25 m
  g.fillStyle = "#262c3e"; g.fillRect(0, 0, 256, 1024);
  for (let f = 0; f < 4; f++) {
    const cx = f * F + F / 2;
    for (let i = 0; i < 1024 / P; i++) {
      const cy = i * P + P / 2;
      if (i % 2 === 0) { // face-on link
        g.lineWidth = 15; g.strokeStyle = "#5f6880"; g.beginPath(); g.ellipse(cx, cy, 22, 58, 0, 0, TAU); g.stroke();
        g.lineWidth = 2.5; g.strokeStyle = "#20263a";
        for (const d of [-7.5, 7.5]) { g.beginPath(); g.ellipse(cx, cy, 22 + d, 58 + d, 0, 0, TAU); g.stroke(); }
        g.lineWidth = 5; g.strokeStyle = "#d4d6de"; g.beginPath(); g.ellipse(cx, cy, 22, 58, 0, Math.PI * 1.05, Math.PI * 1.55); g.stroke();
        g.fillStyle = "#fbfaf4"; g.beginPath(); g.arc(cx - 15, cy - 40, 2.5, 0, TAU); g.fill();
      } else { // edge-on link
        rr(g, cx - 8, cy - 62, 16, 124, 8); g.fillStyle = "#56607a"; g.fill();
        g.strokeStyle = "#20263a"; g.lineWidth = 2.5; g.stroke();
        g.fillStyle = "#c9ccd6"; g.fillRect(cx - 5, cy - 52, 3, 104);
      }
    }
  }
});

/** Sky colour stops by elevation (degrees), for the 4-stop sky shader in world.ts. Values are on-screen targets
 *  (check after the grade): ref day C* 40-89 (#208cfb, #0b6ced, #5ba8f0 -> #82c4fc), ours C* 22-29 (#8ab6e7);
 *  ref golden C* 40-67 through coral / pink / lilac, ours C* 16-19 dusty mauve (blue-to-orange mix through grey). */
export const SKY = {
  day: { c: ["#d8ecf7", "#8ccbf8", "#4aa3f2", "#2a7fe6"], e: [3, 12, 30] },
  golden: { c: ["#ffd08a", "#ffad7e", "#e9849a", "#8c78c4"], e: [4, 14, 32] },
};
/** CPU copy of the shader's stop interpolation (for checking / preview strips) */
export const skyAt = (p: { c: string[]; e: number[] }, el: number) => {
  const hex = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const srgb = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);
  const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const C = p.c.map((s) => hex(s).map(lin));
  const e = [0, ...p.e];
  let c = C[0];
  for (let i = 1; i < 4; i++) { const t = ss(e[i - 1], e[i], el); c = c.map((v, k) => v + (C[i][k] - v) * t); }
  return c.map((v) => Math.round(srgb(v) * 255));
};
```
