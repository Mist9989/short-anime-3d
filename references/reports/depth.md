# Indices de profondeur, lueur et cadrage : référence vs nous

Étude privée. Seuls des règles générales et des chiffres sont tirés des 20 vidéos de référence : aucun plan, personnage ou accessoire décalqué.
Dossier de travail : `references/depth/` (scripts, données, recadrages).
Unités : le flou est un sigma gaussien en **px 720p** (référence 720x1280) sauf mention contraire. Nos images fixes sont en 540x960 et sont mises à l'échelle ×720/540.
Pour obtenir le rayon du disque de flou à notre sortie 1080x1920, utilise **R(px @1080p) ≈ 3 × sigma720** (un disque uniforme a sigma = R/2, et le 1080p fait ×1.5).

## 0. L'écart en un tableau

| Indice | Référence (539 frames, toutes les 2 s, 20 vidéos) | Nous (56 images fixes de test, `out/bridge/test`) | Écart |
|---|---|---|---|
| Profondeur de champ (DOF) de l'arrière-plan | Active dans environ 1/3 des plans. Quand elle est active, le sigma720 de l'arrière-plan vaut CU 4.2, MS 4.0, FS 2.7, WS 1.9 | sigma720 de l'arrière-plan 0.71-0.99. Excédent sur le sujet ≤ 0.71 (médiane 0.48) | **Aucune DOF visible nulle part.** `DepthOfFieldEffect` plafonne le rayon de flou à `bokehScale` px (0.9-2.2 px) |
| Flou du premier plan | 20% des frames ont un objet proche au premier plan, flouté à sigma720 3.7-7.8 | Presque aucun objet au premier plan. Les têtes des touristes dans b_200 sont nettes (0.96) | Manquant |
| Bascule de mise au point | Aucune à l'intérieur des plans. Impulsions de flou sur toute l'image (sigma 3.6-5) de 0.3-1 s à certaines coupes | Aucune | Seulement au niveau des transitions ; voir le rapport sur le mouvement |
| Perspective atmosphérique | Ce qui se trouve sur la ligne des toits (skyline) est 40% plus proche de la couleur de l'horizon que ce qui est proche (dA 0.41 vs 0.69). Les pixels lointains les plus sombres sont relevés à 15% de la couleur de l'horizon | Ce qui est lointain est *plus éloigné* de la couleur de l'horizon que ce qui est proche (0.80 vs 0.70). Plancher des noirs 0.02 | **Aucun voile atmosphérique.** `Fog(#cfe3f2, 90, 560)` atteint à peine la ville (40-200 m) |
| Dégradé du ciel (jour) | Luminance horizon/haut du ciel 1.28. Haut du ciel #5e93d9 (S 0.54), horizon #9fb6e6 (S 0.32) | 1.04. Haut #8cb6e7 (S 0.39), horizon #9abfe8 | Notre haut du ciel est délavé et trop plat |
| Ciel (heure dorée) | 1.55 (n = 3). Haut #9a7e7f mauve, horizon #ffd18a jaune-orangé vif | 1.05. Haut #b5919f, horizon #cfa197 rose boueux | L'orange et le violet se mélangent trop tôt |
| Lueur | Sources émissives uniquement (lune, lampe, feu, soleil) : e-fold (décroissance en 1/e) 14-21 px en 720p, +0.23-0.50 de (source − bg) contre le bord. Les visages blancs ne brillent jamais : les bords chauds (hot) sont *plus nets* (0.38) que les bords normaux (0.52) | Rien n'atteint le seuil. La luminance p99.9 vaut 0.81 et le maximum 0.85, donc le bloom ne fait rien | Le bloom est inerte. Il n'y a ni sources émissives ni blancs purs |
| Hauteur de caméra | Médiane 0.79 × la hauteur du personnage. 82% à hauteur d'yeux, 11% en plongée, 3% en contre-plongée, 3% en vue de dessus | Médiane 0.80 × (1.6 m / 2.0 m), mais 29% des plans sont sous 0.5 × | Un peu trop de plans bas |
| Espace au-dessus de la tête / horizon | Haut de la tête à y = 0.28 (CU), 0.35 (MS), 0.38 (FS), 0.50 (WS). Horizon à 0.45 | 0.33-0.41. Horizon 0.43-0.48 | OK |
| FOV | Pas mesurable de façon fiable (voir 4.4) | 34-46°, médiane 40 | Aucune raison mesurée de changer |

Planches de comparaison (référence en haut, nous en bas) :
- `depth/crops/sbs_dof.jpg` : profondeur de champ (DOF).
- `depth/crops/sbs_haze.jpg` : ciel et voile atmosphérique, avec des pastilles de couleur pour le haut du ciel, le ciel juste au-dessus de la ligne des toits, et la couleur de la première bande sous la ligne des toits.
- `depth/crops/glow_sources_ref.jpg` : lueur autour de la lune, d'une lampe, d'une boule de feu et du soleil.
- `depth/crops/boxes_ref_1..6.jpg` et `boxes_ours_1..3.jpg` : chaque zone mesurée avec son sigma.
- `depth/crops/r04_t6_blurmap.jpg` et `blurviz_A.jpg` : cartes de flou bord par bord.
- `depth/crops/z_*.png` : zooms 2x d'arrière-plans et de premiers plans flous de la référence.
- `depth/crops/rack_strip.jpg` : les candidats à la bascule de mise au point.

---

## 1. Profondeur de champ

### 1.1 Méthode
- **Ajustement de la fonction d'étalement de bord (edge-spread).** Sur chaque bord marqué, un profil perpendiculaire au bord est ajusté par `a + b·Φ((t−t0)/σ) + c·t` avec un Levenberg-Marquardt en lot.
  - Les ajustements ne sont gardés que si le RMS relatif ≤ 0.07.
  - La détection tourne aux échelles 1, 2 et 4, pour trouver aussi les bords très doux.
  - La méthode a été validée sur des bords synthétiques de sigma 0.6-16.
- **Masque des sous-titres.** La bande des sous-titres (mot blanc avec contour noir, 55-86% de la hauteur de l'image) est masquée avant toute statistique.
- **Statistiques par frame.** Pour chaque frame, des tuiles de 40 px prennent le 30e centile de leurs bords. « Au-dessus de la tête » est la valeur médiane des tuiles au-dessus du haut de la tête étiqueté. Les étiquettes de plan (type, haut de la tête/pieds, horizon, hauteur de caméra, premier plan, distance de l'arrière-plan, plan débullé) ont été attribuées à la main pour les 539 frames (`data/labels.csv`).
- **Zones sélectionnées.** Sur 47 frames de référence et 22 de nos images fixes, des zones sujet (S), arrière-plan (B) et premier plan (F) ont été mesurées avec un échantillonnage dense (`data/box_stats_ref.csv`, `data/box_stats_ours.csv`).

Scripts : `scripts/blurlib.py`, `batch_blur.py`, `analyze_ref.py`, `box_measure.py`.

### 1.2 À quelle fréquence et avec quelle force (les 530 frames hors transitions)

| Type | n | Part avec DOF active (sigma720 du fond > 1.2) | sigma720 du fond quand elle est active, médiane (IQR) | R @1080p | Part > 1.0 au total |
|---|---|---|---|---|---|
| CU | 12 | 42% | 4.2 (2.8-4.4) | ~12.5 px | 58% |
| MS | 121 | 21% | 4.0 (1.9-4.9) | ~12 px | 29% |
| FS | 131 | 18% | 2.7 (2.0-3.4) | ~8 px | 23% |
| WS | 55 | 24% | 1.9 (1.4-2.5) | ~5.7 px | 25% |
| Inserts (p80 des tuiles) | 117 | 46% | 2.8 | ~8.3 px | — |
| **Tous** | 530 | — | médiane au-dessus de la tête 0.57 (IQR 0.38-1.07, p90 2.75) | — | 27% |

**Base nette.** Le 10e centile du sigma des bords par frame vaut 0.33 (IQR 0.30-0.37). Le trait de la référence est net, donc le flou est un choix délibéré, plan par plan.

**Par vidéo.** La médiane au-dessus de la tête va de 0.38 (vidéos 09 et 10, 0-5% de frames floues) à 2.12 (vidéo 04, 64% floues).

**La DOF n'est pas une propriété fixe de l'objectif.** En FS avec un arrière-plan lointain, la médiane n'est que de 0.62 (20% > 1.0, 0% > 2.0). En MS avec un mur proche, elle est de 0.60 (30% > 1.0). La DOF est activée sur des temps forts choisis, surtout des moments intimes en CU/MS, des inserts et des plans cadrés par un premier plan, et désactivée pour les plans d'ensemble et la plupart des plans en pied (FS).

### 1.3 Exemples mesurés (sigma720, p30 de chaque zone)

| Frame | Type | Sujet | Arrière-plan | Premier plan |
|---|---|---|---|---|
| 05_f2010 | MS | 0.30 | 6.97 (mur de photos derrière) | — |
| 13_f0930 | CU | 0.34 | 5.33 (forêt, également voilée) | — |
| 05_f2250 | MS | — | 4.92 | — |
| 08_f0210 | MS par-dessus l'épaule | 0.36 | 4.53 | 3.71 (tête devant) |
| 11_f0150 / 03_f0810 | MS | net | 3.16 / 2.76 | — |
| 03_f0930 / 04_f0210 / 04_f0390 / 04_f0330 | FS | ~0.35 | 2.80 / 2.54 / 2.35 / 1.85-2.74 | sol 10.8 (04_f0210) |
| 17_f0270 | MS | 0.44 | 1.77 | **7.79** (machines à sous devant) |
| 16_f0990 | MS | 0.29 | 0.32 (cabine nette) | **5.52** (chat devant) |
| 14_f0030 / 01_f0210 / 07_f0750 | FS | net | 0.99 / 0.96 / 0.75 | — |
| 16_f0150 / 14_f0390 | WS | net | 1.27 / 0.74 | — |
| 10_f1650 | CU | 3.26 | 3.42 | mise au point sur une clé au premier plan |
| 01_f0570 | FS | 1.81 (personnage proche) | mise au point sur le navire lointain | — |

Nous (les 21 images fixes avec S+B) :
- Sujet 0.60-1.02 (médiane 0.76).
- Arrière-plan 0.71-0.99 (médiane 0.89).
- L'excédent de flou de l'arrière-plan sqrt(B² − S²) a une médiane de 0.48 et un maximum de 0.71.
- Seul premier plan : les têtes des touristes de b_200, à 0.96.
- Nos images fixes sont en demi-résolution, donc leur netteté absolue n'est pas comparable. La différence B−S est la mesure honnête, et elle est à peu près nulle.

### 1.4 Comment le flou augmente derrière le sujet
- **Forme de lentille mince, avec saturation.** CoC(d) = C∞·|1 − F/d| colle à la référence.
  - Foule 03_f1830 : des têtes de diamètre 200 → 135 → 110 → 70 px (rapport de distance 1 → 1.5 → 1.8 → 2.9) ont un sigma de 0.33 → 0.33 → 1.14-1.31 → 1.55.
  - Une lentille mince avec C∞ = 2.4 sigma prédit 0, 0.8, 1.07 et 1.58.
- **Saturation.** Dans la rue de western (04 à 6 s), chaque bâtiment, de la distance moyenne au lointain, est à sigma 1.85-2.0. Le flou atteint sa limite dans environ 3× la distance de mise au point, puis reste constant.
- **Murs proches.** Un mur à environ 1 m derrière un personnage est bien moins flou que le ciel ou la ville dans le même genre de plan. Cela découle de la géométrie de la lentille mince et ne demande pas de règle à part.

### 1.5 Bascule de mise au point
Trois fenêtres candidates ont été vérifiées frame par frame (`scripts/rack.py`, `crops/rack_strip.jpg`, 6 bandes horizontales par frame) :
- 04, frames 100-220.
- 10, frames 1600-1700.
- 01, frames 540-620.

**Aucune bascule de mise au point n'a été trouvée à l'intérieur des plans.**

- Dans 04, un nouveau plan commence avec toute l'image à sigma 3.6 pendant 0.8 s, puis 1.8 pendant 1.1 s, puis un panoramique filé (whip pan).
- Dans 10, un push-in floute toute l'image à sigma 4-5 pendant 0.8 s, puis coupe sur une image nette.

Ce sont des flous de transition (rapport sur le mouvement), pas de la DOF.

### 1.6 Pourquoi la nôtre ne montre rien (code)
Le `DepthOfFieldEffect` de postprocessing 6.37.2 fonctionne ainsi :
- CoC = `smoothstep(0, focusRange, |d − F|)` en unités du monde.
- Le bokeh est un disque de Vogel à 64 échantillons, de rayon `coc × bokehScale × texelSize`, et les matériaux de bokeh sont dimensionnés sur le buffer 1080x1920 **complet**.
- Le rayon maximal du disque est donc `bokehScale` px.
- Nos 2.2 / 1.5 / 0.9 px donnent sigma720 ≈ 0.7 / 0.5 / 0.3, ce qui est sous la base nette.

Monter `bokehScale` aux 8-20 px dont on a besoin pose trois problèmes :
- 64 échantillons répartis sur un disque de 20 px donnent un aspect granuleux.
- Le buffer lointain est prémultiplié par le CoC sans renormalisation, ce qui risque de créer des halos sombres autour du sujet.
- Le CoC en smoothstep floute trop peu les objets au premier plan. À d = F/2, il donne 0.16 là où la lentille mince donne 1.0.

**Remplace-le par un effet de collecte (gather) en lentille mince (recette 6.1).**

---

## 2. Atmosphère

### 2.1 Méthode
`scripts/atmos.py` écrit `data/atmos_ref.csv` et `data/atmos_ours.csv`.

- **Masque du ciel.** Le ciel est la région lisse (|∇L| < 0.01/px) et claire (L > 0.35) reliée au bord supérieur.
- **Ligne des toits (skyline).** La médiane du pixel de ciel le plus bas, colonne par colonne.
- **Couleurs du ciel.**
  - « Haut » est la couleur médiane des 15% supérieurs du ciel visible.
  - « Bas » est la bande juste au-dessus de la ligne des toits (la lumière atmosphérique A, ou airlight).
- **Voile sous la ligne des toits**, en 5 bandes (0-4, 4-10, 10-20, 20-35, 35-100% de la hauteur de l'image sous la ligne) :
  - **Plancher des noirs :** p10 du canal sombre normalisé minfilter(min_c I_c/A_c). 0 signifie encre ou ombre à pleine force ; 1 signifie que tout est relevé à la couleur de l'horizon.
  - **dA :** la distance RGB entre la couleur médiane de la bande et A.
- Les frames de référence sont limitées aux 40 extérieurs avec un horizon étiqueté. Les 43 images fixes à nous qui contiennent du ciel sont toutes utilisées.

### 2.2 Résultats

| Mesure | Réf. jour (n 37) | Nous jour (n 30) | Réf. heure dorée (n 3) | Nous heure dorée (n 13) |
|---|---|---|---|---|
| Haut du ciel | **#5e93d9**, L 0.53, S 0.54 | #8cb6e7, L 0.69, S 0.39 | **#9a7e7f**, L 0.55 | #b5919f, L 0.60 |
| Ciel au-dessus de la ligne des toits | **#9fb6e6**, L 0.72, S 0.32 | #9abfe8, L 0.73, S 0.34 | **#ffd18a**, L 0.84 | #cfa197, L 0.67 |
| Luminance bas/haut | **1.28** (1.18-1.40) | 1.04 (1.01-1.05) | **1.55** (1.49-1.87) | 1.05 |
| Plancher des noirs juste sous la ligne des toits | 0.15 (0-0.24) | 0.02 | 0.12 | 0.00 |
| dA : bande lointaine → bande proche | **0.41 → 0.69** | 0.80 → 0.70 | 0.60 → 0.78 | 0.77 → 0.82 |
| Couleur de la bande juste sous la ligne des toits | #b2b0a1 (gris-beige pâle) | #7c4d4b (rouge brique sombre) | #be755f | #87270b |

### 2.3 Ce que cela signifie
- **Jour, référence.** Les objets sur la ligne des toits sont mélangés à environ 40% vers la couleur de l'horizon (k ≈ 1 − 0.41/0.69). Leur encre et leurs ombres remontent d'environ 15%. Les objets proches gardent toute leur couleur.
- **Nous.** Notre ville sur la ligne des toits (à 40-180 m) est plus sombre et plus saturée que le premier plan.
- **Pourquoi notre brouillard ne fait rien.** Le brouillard 90 → 560 vaut 0 à 70 m, 0.085 à 130 m et 0.19 à 180 m. Sa couleur #cfe3f2 est en plus un cyan pâle qui ne correspond pas à notre horizon.
- **Dégradé du ciel.** La référence garde un horizon pâle et atteint un bleu profond et saturé dès environ 20° d'élévation. Notre shader `mix(hor, top, pow(h, 0.55))` (h = sin(élévation)) atteint environ 50% en haut d'une image de 40°, donc tout le ciel visible a l'air du même bleu pâle.
- **Heure dorée.** Notre ciel est boueux parce que l'horizon orange est déjà mélangé à 30-40% avec le haut bleu-violet au niveau de la ligne des toits.

---

## 3. Bloom et lueur

### 3.1 Méthode
`scripts/bloom.py`, `scripts/glow_crops.py`, `scripts/sim_bloom.py`.

**(a) Largeur des bords.** Sigma ESF des bords dont le côté clair est chaud (maximum local L ≥ 0.95) vs les bords normaux (0.45-0.85), par frame.
- Référence : chauds 0.38, normaux 0.52. Par frame, chaud/normal = 0.80 ; seulement 2% des frames dépassent 1.5.
- **Les surfaces blanches (têtes, yeux, murs, nuages blancs) ne font pas de bloom.** Leurs bords sont les plus nets de l'image.
- Nous : 1.01. Il n'existe aucun pixel chaud.

**(b) Sources émissives** (`crops/glow_sources_ref.jpg`). Le profil radial depuis le centroïde de la tache L ≥ 0.85. « Excédent » = (L − bg)/(L_src − bg).

| Source | Disque r0 (px720) | Excédent à r0+4 | r0+10 | r0+20 | r0+40 | e-fold (px720) |
|---|---|---|---|---|---|---|
| Lune, 11_f1350 | 38 | 0.37 | 0.32 | 0.22 | 0.10 | 19.6 |
| Lune, 11_f1050 | 40 | 0.23 | 0.21 | 0.15 | 0.05 | 18.0 |
| Plafonnier, 05_f0210 | 42 | 0.46 | 0.38 | 0.30 | 0.14 | 20.9 |
| Boule de feu, 12_f0930 | 36 | 0.42 | 0.23 | — | 0.05 | 14.4 |
| Soleil, 11_f0930 | 58 | 0.50 | 0.49 | 0.41 | 0.11 | 19.7 |

**Lueur cible.** Un halo large et plat :
- excédent 0.25-0.5 juste au bord ;
- encore 0.15-0.4 à +20 px (720p) ;
- e-fold 14-21 px en 720p, soit **21-31 px en 1080p** (environ 1.5% de la hauteur de l'image).
- La scène du soleil blanchit 7% de l'image à L ≥ 0.93.

**Blanc maximal.**
- Référence : luminance p99.9 0.99, et le maximum vaut 1.0 dans presque chaque frame.
- Nous : p99.9 0.81, maximum 0.85 (p90 des frames : 0.97).
- Rien dans nos frames ne dépasse `luminanceThreshold 0.86`. C'est un problème d'étalonnage et d'exposition qui relève du rapport sur la couleur, mais c'est la raison pour laquelle notre bloom est invisible.

### 3.2 Calibrer le bloom mipmap (portage numpy de MipmapBlurPass)
Le portage utilise le même sous-échantillonnage à 13 échantillons (4 intérieurs à 0.125, 9 extérieurs à 1/18), le suréchantillonnage en tente à 9 échantillons, et `mix(down[i], up, radius)`. La sortie est en demi-résolution. g(d) est la lueur à d px (1080p) à l'extérieur d'une source de 60 px de valeur masquée unitaire.

| levels | radius | g(4) | g(20) | g(60) | g(150) | e-fold (px1080) |
|---|---|---|---|---|---|---|
| 8 (notre réglage actuel) | 0.85 | 0.14 | 0.049 | 0.017 | 0.0067 | 40 (longue traîne fine) |
| 6 | 0.5 | 0.13 | 0.022 | 0.004 | 0.0004 | 24.5 |
| **6** | **0.6** | ~0.15 | ~0.04 | ~0.011 | ~0.001 | **~30** |
| 6 | 0.7 | 0.18 | 0.057 | 0.019 | 0.002 | 35 |
| 5 | 0.85 | 0.26 | 0.124 | 0.022 | 0.00001 | 21 |

- **levels 6, radius 0.6** correspond à l'e-fold de la référence.
- Le halo de la référence est plus plat près de la source que n'importe quel noyau mip. Pour les quelques grosses sources, ajoute un sprite de lueur additif (recette 6.4).
- Les petites étincelles (r0 6 px) n'ont que g(4) ≈ 0.045, donc il leur faut une valeur HDR bien plus élevée.

---

## 4. Composition

D'après `data/labels.csv` (530 frames) et nos CAMS (`story.ts`, hauteur de la carte du personnage 2.0-2.1 m avec `SU = 0.00216`).

### 4.1 Répartition des plans et cadrage (référence)

| Type | Part | y du haut de la tête (IQR) | Hauteur visible du personnage | y des pieds | Objet au premier plan |
|---|---|---|---|---|---|
| CU | 3% | 0.28 (0.21-0.35) | 0.65 | coupés | 39% |
| MS | 27% | 0.35 (0.25-0.38) | 0.50 | coupés à ~0.80 | 38% (s 46, b 9) |
| FS | 28% | 0.38 (0.35-0.42) | 0.35 (0.27-0.45) | 0.75 | 16% |
| WS | 12% | 0.50 (0.42-0.55) | 0.15 | 0.64 | 16% |
| EWS | 8% | 0.51 | 0.10 | 0.59 | 5% |
| Inserts | 22% | — | — | — | 9% |

Autres chiffres de cadrage de la référence :
- **Horizon** (FS/WS/EWS) : y = 0.45 (IQR 0.39-0.50).
- **Distance de l'arrière-plan :** mur proche 58%, moyenne 23%, lointaine 20%.
- **Plan débullé (dutch tilt) :** 2% (11 sur 530).
- **Placement :** les personnages se trouvent au milieu de l'image verticale, avec le sous-titre sur le bas de leur corps.

### 4.2 Hauteur de caméra
**Référence.**
- Étiquettes : hauteur d'yeux 82%, plongée 11%, contre-plongée 3.4%, vue de dessus 3.2%.
- D'après la géométrie de l'horizon (34 frames FS/WS/EWS, caméra à niveau) : hauteur de caméra = (pieds − horizon)/(pieds − tête) = **0.79 × la hauteur du personnage**, IQR 0.67-1.00.
- 10% de ces frames sont sous 0.5×. Les plans en plongée sont à 1.5-1.9×.

**Nous (CAMS).**
- Hauteur au-dessus du tablier : médiane 1.6 m = **0.80 ×** (correspond).
- Mais 29% des plans sont sous 0.5× (≤ 1.0 m) :
  - f48 : 0.6 m
  - f88 : 0.4 m
  - f353 et f440 : 0.36 m
  - f823 : 0.7 m
  - f1685 : 0.8 m
- 47% sont à 1.0-2.2 m. Le reste, ce sont des plans en plongée et des plans aériens.

### 4.3 Nous vs cibles (d'après la géométrie des CAMS ; pieds et tête projetés pour un personnage au point visé)
- **Haut de la tête.** Nos MS (f585/640/925/984) ont le haut de la tête à 0.35-0.40 et un équivalent en hauteur totale de 0.74-0.77, comme les MS de la référence. Nos FS (f283, f768, f1729, f1857) ont le haut de la tête à 0.29-0.41 et une hauteur de personnage de 0.32-0.41, comme les FS de la référence.
- **Horizon** 0.42-0.49 sur les plans à niveau (correspond).
- **Objets au premier plan :** quasiment aucun (référence : 38% des MS et CU).
- **Inserts :** nous en avons environ 3 (ancrage, rupture, bottes) contre 22% dans la référence. C'est hors sujet ici, mais ces plans portent l'essentiel de la DOF de la référence.

### 4.4 FOV
- J'ai essayé les points de fuite : segments droits, RANSAC, puis f² = −(v1−c)·(v2−c).
- La validation a échoué sur nos propres images fixes : sur c_1800, l'estimation donnait 25° pour une vraie valeur de 42°.
- Sur les frames de référence, la méthode donnait des valeurs incohérentes (1-73°), parce que l'architecture stylisée est rarement orthogonale et que beaucoup de segments sont sur les bords de l'image.
- Les indices du plan du sol (horizon vs pieds vs taille du personnage) annulent la focale.
- Les tailles et positions des personnages à nos distances correspondent déjà à la référence avec fov 36-44.
- **Recommandation : garde fov 34-46 ; il n'y a aucune raison mesurable de le changer.**

---

## 5. Écarts classés par impact visuel (top 5)

1. **DOF sur des plans choisis.**
   - Nous : zéro. Référence : environ 1/3 des plans.
   - Utilise un effet de collecte en lentille mince : C∞ 12-14 px (CU/MS/inserts), 8 (FS quand elle est utilisée), 5 (WS quand elle est utilisée) ; premier plan 15-24 px.
   - Fais la mise au point sur les yeux du sujet.
2. **Perspective atmosphérique.**
   - Couleur du brouillard = couleur de l'horizon ; brouillard linéaire 25 → 420 m (jour) et 20 → 360 m (heure dorée).
   - La ville sur la ligne des toits est alors tirée de 20-40% vers l'horizon, et l'encre est teintée par le brouillard.
   - Cela fait passer notre ligne des toits du sombre #7c4d4b au gris-beige pâle de la référence.
3. **Dégradé du ciel.**
   - Bleu profond #5e93d9 en haut, vers 20° d'élévation, horizon pâle (rapport de luminance 1.28).
   - Heure dorée : horizon #ffd08a vif qui tient jusqu'à environ 3°, puis mauve/indigo.
4. **Objets de cadrage au premier plan dans environ 1/3 des MS/CU.**
   - Poteau de garde-corps, maillon de chaîne, drapeau, épaule ou chapeau d'un spectateur, à 0.3-0.5 × la distance de mise au point, couvrant 10-25% d'un bord de l'image.
   - La nouvelle DOF les floute aux 4-8 sigma720 de la référence.
5. **Lueur uniquement sur les sources émissives et les vrais blancs.**
   - Bloom : threshold 1.0, levels 6, radius 0.6, intensity 0.5.
   - Émissif HDR ×3 (soleil, lampes, feu), ×8 pour les étincelles.
   - Les visages restent nets.
   - Associe-le à la correction d'exposition du rapport sur la couleur, pour que les têtes blanches et les nuages atteignent 0.97-1.0.
   - Mineur : monte f48 et f823 à environ 1.4 m, pour que moins de 15% des plans soient en contre-plongée.

---

## 6. Recette (notre stack : three 0.175, postprocessing 6.37.2, @react-three/postprocessing 3.0.4)

### 6.1 Nouveau fichier `src/videos/bridge/lensblur.ts` : DOF en lentille mince, une seule passe de collecte
- `@react-three/postprocessing` 3.0.4 place automatiquement tout effet `CONVOLUTION` dans son propre `EffectPass`, donc `<primitive object={fx.lens} />` peut remplacer `fx.dof` à la même place (après l'encre, avant le bloom).
- `getViewZ`, `readDepth`, `texelSize` et `inputBuffer` sont fournis par `EffectPass`, et `ink.ts` s'appuie déjà dessus.

```ts
// Thin-lens depth of field in one gather pass (scatter-as-gather), for the reference's soft backgrounds.
// CoC radius in output px = cInf * |1 - focus / depth| (near side x nearScale), clamped to maxCoC.
// Pass 1 gathers the pixel's own disc; samples farther than the pixel may not spread over it (keeps the subject's
// silhouette clean). Pass 2 lets a blurred foreground spread over sharper pixels behind it.
import { Effect, EffectAttribute, BlendFunction } from "postprocessing";
import { Uniform } from "three";

const frag = /* glsl */ `
uniform float focus;      // focus distance along the view axis (m)
uniform float cInf;       // blur-disc radius (px, output res) of things at infinity; 0 = off
uniform float nearScale;  // extra blur for things in front of the focus plane
uniform float maxCoC;     // px
#define TAPS 64
#define NEAR_TAPS 32
#define GOLDEN 2.39996323

float cocAt(float d) {
  float c = cInf * (1.0 - focus / max(d, 1e-3));
  if (c < 0.0) c *= nearScale;
  return clamp(c, -maxCoC, maxCoC);
}
float distAt(vec2 uv) { return -getViewZ(readDepth(uv)); }
float hash12(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  if (cInf < 0.25) { outputColor = inputColor; return; }
  float d0 = -getViewZ(depth);
  float r0 = abs(cocAt(d0));
  float rot = hash12(gl_FragCoord.xy) * 6.2831853;   // fixed per pixel: no frame-to-frame shimmer
  vec3 acc = inputColor.rgb; float wsum = 1.0;
  if (r0 > 0.5) {
    for (int i = 0; i < TAPS; i++) {
      float rr = sqrt((float(i) + 0.5) / float(TAPS)) * r0;
      float a = float(i) * GOLDEN + rot;
      vec2 suv = uv + vec2(cos(a), sin(a)) * rr * texelSize;
      float ds = distAt(suv);
      float rs = abs(cocAt(ds));
      if (ds > d0) rs = min(rs, r0);                // background never bleeds over a nearer pixel
      float w = clamp(rs - rr + 0.5, 0.0, 1.0);      // does the sample's disc reach us?
      acc += texture2D(inputBuffer, suv).rgb * w; wsum += w;
    }
  }
  vec3 col = acc / wsum;
  vec3 fg = vec3(0.0); float fw = 0.0, cov = 0.0;
  for (int i = 0; i < NEAR_TAPS; i++) {
    float rr = sqrt((float(i) + 0.5) / float(NEAR_TAPS)) * maxCoC;
    if (rr <= r0) continue;                          // already covered by pass 1
    float a = float(i) * GOLDEN + rot + 1.0;
    vec2 suv = uv + vec2(cos(a), sin(a)) * rr * texelSize;
    float ds = distAt(suv);
    if (ds >= d0 * 0.97) continue;                   // only things in front of us
    float rs = abs(cocAt(ds));
    float w = clamp(rs - rr + 0.5, 0.0, 1.0);
    fg += texture2D(inputBuffer, suv).rgb * w; fw += w;
    cov += w * (maxCoC * maxCoC) / max(rs * rs, 1.0);
  }
  if (fw > 0.0) col = mix(col, fg / fw, clamp(cov / float(NEAR_TAPS), 0.0, 1.0));
  outputColor = vec4(col, inputColor.a);
}`;

export class LensBlurEffect extends Effect {
  constructor({ maxCoC = 24, nearScale = 1.2 } = {}) {
    super("LensBlurEffect", frag, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.DEPTH | EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ["focus", new Uniform(10)], ["cInf", new Uniform(0)],
        ["nearScale", new Uniform(nearScale)], ["maxCoC", new Uniform(maxCoC)],
      ]),
    });
  }
  set focus(v: number) { this.uniforms.get("focus")!.value = v; }
  set cInf(v: number) { this.uniforms.get("cInf")!.value = v; }
}
```

**Coût.** Environ 96 échantillons × 2 lectures par pixel en 1080x1920. Ça passe sans problème sur le chemin GPU ANGLE.

**Ciel.** Une profondeur de 1.0 correspond au plan lointain (1500 m), donc le ciel et les nuages reçoivent tout le `cInf`, ce qui correspond aux nuages doux des plans avec DOF de la référence.

**Solution de repli si tu veux seulement un test rapide avec l'effet intégré :**
`new DepthOfFieldEffect(camera, { resolutionScale: 1 })`, `worldFocusRange = 2 * focus`, `bokehScale = cInf`. Cela approche le côté lointain de la lentille mince, mais floute trop peu les objets au premier plan. Attends-toi à du grain et à des liserés sombres au-delà de 8 px.

### 6.2 `Bridge.tsx` (remplace les lignes `dof`)

```ts
import { LensBlurEffect } from "./lensblur";
import { dofAt } from "./story";
const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();   // module scope

const fx = useMemo(() => ({
  ink: new InkEffect(),
  lens: new LensBlurEffect({ maxCoC: 24, nearScale: 1.2 }),
  bloom: new BloomEffect({ intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 }),
  tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
}), []);
// <primitive object={fx.lens} dispose={null} />  in place of fx.dof

// per frame, after target.copy(world.update(id, f, cam, scene)):
const d = dofAt(f);
cam.getWorldDirection(fwd);
if (d.focus) fpt.set(...d.focus(f)); else fpt.copy(target);
fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));   // view-axis distance, not Euclidean
fx.lens.cInf = d.cInf;
```

### 6.3 `story.ts` : une table DOF à côté de CAMS (mêmes `f`/`dur` que les entrées caméra, pour que le flou monte en rampe avec les mouvements de caméra)

```ts
/** Lens blur per shot (thin lens). cInf = blur-disc radius in px at 1080x1920 for things at infinity; 0 = all sharp.
 *  Reference: DOF on in ~1/3 of shots; when on, background sigma720 CU 4.2, MS 4.0, FS 2.7, WS 1.9,
 *  foreground objects 4-8 (disc radius at 1080p = 3 x sigma720). Establishing/wide/most full shots stay sharp. */
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
const eyes = (id: number) => (f: number): V3 => [0, D0 + 1.6, Fz(id, f)];
const boots = (id: number) => (f: number): V3 => [0, D0 + 0.3, Fz(id, f)];
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },                                   // establishing
  { f: 88, dur: 9, cInf: 12, focus: eyes(1) },          // low MS, front soldier
  { f: 126, cInf: 0 },                                  // aerial wides, FS
  { f: 353, dur: 10, cInf: 16, focus: boots(3) },       // boots CU
  { f: 440, cInf: 16, focus: boots(4) },
  { f: 444, dur: 13, cInf: 0 },                         // side WS / FS
  { f: 534, dur: 13, cInf: 10, focus: eyes(5) },        // MS
  { f: 585, dur: 10, cInf: 12, focus: eyes(5) },
  { f: 640, cInf: 12, focus: eyes(6) },
  { f: 643, dur: 11, cInf: 14 },                        // CU, focus = look (the face)
  { f: 717, dur: 12, cInf: 0 },                         // high WS, FS, low WS
  { f: 871, dur: 11, cInf: 8 },                         // high MS, focus = look
  { f: 925, dur: 11, cInf: 12, focus: eyes(7) },        // MS
  { f: 984, cInf: 12, focus: eyes(8) },
  { f: 987, dur: 12, cInf: 14 },                        // anchor insert, focus = look
  { f: 1039, dur: 8, cInf: 10 },                        // snap insert
  { f: 1062, dur: 18, cInf: 0 },                        // aerial, river, park, bank FS
  { f: 1770, dur: 12, cInf: 10 },                       // officer MS, focus = look
  { f: 1857, cInf: 0 },
  { f: 1905, dur: 10, cInf: 10 },                       // MS
  { f: 1962, dur: 24, cInf: 0 },                        // closing aerial
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
```

**Notes sur la table DOF.**
- **Couverture.** Ces valeurs mettent de la DOF sur environ 35% du temps à l'écran : temps forts en CU/MS, inserts et plan des bottes. Cela correspond à la part de la référence.
- **Repli.** Si un plan paraît trop doux, divise `cInf` par deux avant de couper la DOF. Les plans « avec DOF » de la référence ne descendent jamais sous sigma720 1.2 (environ 4 px de rayon).
- **Objets au premier plan.** Pour reproduire le cadrage par premier plan de la référence, place un objet à 0.3-0.5 × la distance de mise au point dans les plans avec DOF. Avec nearScale 1.2, il tombe à 15-24 px, comme les 4-8 sigma720 de la référence.

### 6.4 Bloom : de la lueur seulement là où la lumière est émise
- **Réglages du bloom.**
  - `luminanceThreshold 1.0` : aucune surface éclairée ne le dépasse, donc les têtes blanches restent nettes, comme dans la référence.
  - `luminanceSmoothing 0.2`, `intensity 0.5`, `mipmapBlur true`, `levels 6`, `radius 0.6`.
  - Cela donne un e-fold d'environ 30 px en 1080p, soit les 14-21 px en 720p de la référence.
  - Le réglage actuel `levels 8 / radius 0.85` produit à la place un voile fin et long sur toute l'image.
- **Sources émissives.**
  - Utilise des couleurs HDR (le buffer du composer est en half-float, et r3f-postprocessing désactive le tone mapping du renderer).
  - Grosses sources : `new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 2.6, 2.0) })` pour le disque solaire (plans à l'heure dorée), les lanternes et le feu.
  - Étincelles : `(8, 6, 3)`, par exemple là où le boulon casse.
  - Excédent attendu à côté d'une grosse source : 3 × 0.5 × g(4 px) ≈ 0.22 linéaire, ce qui correspond aux +0.25-0.5 de (source − bg) de la référence.
- **Grosses sources (soleil, lampe) : ajoute un sprite de halo plat** pour retrouver la lueur plate de la référence :
  - `Sprite` additif de rayon 2.2 × le rayon de la source ;
  - alpha de la texture = 0.35 × exp(−(r/(1.1·r_src))²) ;
  - `blending: THREE.AdditiveBlending`, `depthWrite: false`, `fog: false`.
- **Exposition (rapport sur la couleur).** Les blancs doivent atteindre 0.97-1.0, comme dans la référence (p99.9 0.99). Les nôtres plafonnent à 0.85.

### 6.5 Brouillard et ciel (`world.ts` + la table `LIGHTS`)
**Table LIGHTS.**

```ts
// LIGHTS (where top / hor / fog live)
day:    { /* … */ top: "#4284d3", hor: "#c9cdee", skyCurve: [0.0, 0.5, 0.6],  fog: "#b0c0e8", fogNear: 25, fogFar: 420 },
golden: { /* … */ top: "#443876", hor: "#ffd08a", skyCurve: [0.05, 0.6, 1.0], fog: "#f4c68c", fogNear: 20, fogFar: 360 },
```

**Shader du ciel** (constructeur ; `h` = sin(élévation)).

```ts
uniforms: { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, curve: { value: new THREE.Vector3(0, 0.5, 0.6) } },
fragmentShader: `uniform vec3 top; uniform vec3 hor; uniform vec3 curve; varying vec3 vP;
  void main(){ float h = clamp(vP.y, 0.0, 1.0);
    float k = pow(clamp((h - curve.x) / (curve.y - curve.x), 0.0, 1.0), curve.z);
    gl_FragColor = vec4(mix(hor, top, k), 1.0); }`,
```

**`update()`.**

```ts
this.skyMat.uniforms.curve.value.set(...L.skyCurve);
this.fog.color.set(L.fog); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
```

**Vérification des valeurs du ciel.**
- Jour : à 4° d'élévation, le ciel est #a0b7e6, et à 20° il est #5e93d9. Les deux correspondent à la référence.
- Heure dorée : il reste #ffd08a jusqu'à 3°, et vaut #9c807f à 20° (référence #9a7e7f).
- Le tone mapping NEUTRAL compresse les valeurs linéaires au-dessus de 0.76, donc vérifie une image fixe par éclairage.

**Ce que fait le nouveau brouillard.**

| Distance | Quantité de brouillard |
|---|---|
| Soldats (≤ 15 m) | 0 |
| Tour lointaine (~57 m) | 0.08 |
| Front de rivière de la rive opposée (70 m) | 0.11 |
| Rangées du fond (100-140 m) | 0.19-0.29 |
| Rue principale (180 m) | 0.39 |
| Plans aériens de la ville (250 m) | 0.57 |

**Encre teintée par le brouillard (`ink.ts`, à coordonner avec le rapport sur l'encre).** La référence relève l'encre lointaine d'environ 15%. Ajoute les uniforms `fogColor`, `fogNear` et `fogFar`, et remplace `ink` dans le mix final :

```glsl
float fogK = clamp((dist - fogNear) / (fogFar - fogNear), 0.0, 1.0);
vec3 inkC = mix(ink, fogColor, fogK * 0.6);
outputColor = vec4(mix(inputColor.rgb, inkC, k), inputColor.a);
```

Monte aussi `farFade` à environ 600, pour que les contours lointains se fondent dans le voile au lieu de disparaître à 260 m.

### 6.6 Règles de composition pour CAMS
- **Garde :**
  - le haut de la tête à y ≈ 0.28 (CU), 0.35 (MS), 0.38 (FS), 0.50 (WS) ;
  - l'horizon à 0.40-0.50 ;
  - fov 34-46.
- **Hauteur de caméra.**
  - Par défaut : 0.7-1.0 × la hauteur du personnage = **1.4-2.0 m au-dessus du tablier** (médiane de la référence 0.79×).
  - Garde les temps forts volontairement bas (bottes f353/440, f88).
  - Monte f48 (0.6 → 1.4 m) et f823 (0.7 → 1.4 m). Cela fait passer les plans bas (sous 0.5×) de 29% à environ 15%. La référence en a 3% étiquetés en contre-plongée et 10% sous 0.5×.
- **Cadrage par le premier plan.** Dans environ 1/3 des MS/CU (par exemple f534, f585, f925, f1770), mets un objet proche à 0.3-0.5 × la distance de mise au point, couvrant 10-25% d'un bord de l'image. Référence : 38% des MS/CU, floutés à sigma720 4-8.
- **Plan débullé (dutch tilt).** La référence l'utilise dans 2% des frames. Garde nos roulis ≤ 0.05 rad et utilise-les sur 2-3 plans au maximum.
- **Pas de bascule de mise au point à l'intérieur des plans.** Ne change la DOF qu'aux coupes, ou fais-la monter en rampe avec les mouvements de caméra (le `dur` de la table).

---

## 7. Fichiers

**Rapport :** `references/reports/depth.md`

**Données** (`references/depth/data/`) :
- `labels.csv` : 539 frames étiquetées.
- `frame_stats.csv` : statistiques DOF par frame.
- `edges/*.npy` : ajustements bord par bord.
- `box_stats_ref.csv`, `box_stats_ours.csv` : zones sélectionnées.
- `atmos_ref.csv`, `atmos_ours.csv`.
- `bloom_ref.csv`, `bloom_ours.csv`.
- `dense/` : ajustements denses par frame.

**Scripts** (`references/depth/scripts/`) :
- `blurlib.py` : ajustement ESF et masque des sous-titres.
- `batch_blur.py`, `analyze_ref.py`, `box_measure.py`.
- `rack.py`, `atmos.py`, `bloom.py`, `glow_crops.py`.
- `sim_bloom.py` : MipmapBlurPass en numpy.
- `vp_fov.py` : la tentative ratée de mesure du FOV, gardée pour mémoire.
- `sbs.py` : planches de comparaison.

**Recadrages** (`references/depth/crops/`) :
- `sbs_dof.jpg`, `sbs_haze.jpg`, `glow_sources_ref.jpg`, `glow_top.jpg`, `rack_strip.jpg`.
- `boxes_ref_1..6.jpg`, `boxes_ours_1..3.jpg`, `r04_t6_blurmap.jpg`, `blurviz_A.jpg`, `z_*.png`.

**Mises en garde.**
- Nos images fixes sont des rendus de test JPEG en demi-résolution, donc compare les *différences* de flou (arrière-plan vs sujet), pas la netteté absolue.
- Référence à l'heure dorée : n = 3.
- La calibration du bloom est un portage CPU du shader. Vérifie-la sur une image fixe avec une source émissive.
- Rien n'a été rendu et rien n'a été modifié sous `your Remotion project`.
