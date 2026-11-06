# Éclairage : la référence face à nous

C'est une étude privée. Les chiffres viennent de 67 frames d'étude de la référence (20 vidéos, 720x1280, sous-titres masqués), de 539
frames prises toutes les 2 s pour les statistiques d'étalonnage, et de 36 de nos images fixes (540x960, ramenées à l'équivalent 720 de large quand
une largeur en pixels est citée). Les scripts, les CSV et les recadrages sont dans `references/lighting/`. Aucune image fixe n'a été rendue et
rien n'a été modifié dans `your Remotion project`. Les valeurs de la recette sont des points de départ : elles viennent d'un modèle numérique de notre
chaîne de rendu (`scripts/model.py`), et la boucle de calibration de 9.8 les ajuste sur le premier vrai rendu.

## 0. L'écart en un tableau

| Quoi | Référence (mesurée) | Nous (mesuré) | Écart |
|---|---|---|---|
| Ombre de jour sur une même surface, ombre/éclairé | Y **0.49-0.52** sur le bois (0.37-0.65 au total). Par canal R .54-.56, G .46-.50, B .47-.50 : un peu plus rouge et **plus** saturée (sat +.02-.13) | Y **0.25-0.38**. Ratio B du pont .11-.18 (orange boueux). Le pavage vire au gris (sat .17 → .07, teinte 40° → 176°) | Nos ombres sont ~2x trop sombres, perdent leur couleur et virent au gris/bleu |
| Ombre au coucher du soleil, ombre/éclairé | Y **0.15-0.27**. Par canal R .08-.15, G .16-.30, **B 1.35-3.04** : ombre violet-bleu sur un sol orange (#db9044 → #5b5173). Impossible avec une lumière additive : c'est donc une couleur d'ombre stylisée | Le sol golden est à V .30-.47, sat .74-.95 : olive/brun foncé partout, sans motif lumière/ombre. Modèle : ombre/éclairé du sol ≈ (.55, .64, .81) | Nous n'avons aucune ombre en golden |
| Direction de la lumière principale (key) par rapport à la caméra | Jour : 6/20 frames de côté-arrière depuis la droite de l'écran (az ~50-70°), 7 de face et douces (plans de façade), 2 par le dessus. Coucher : **10/15 à contre-jour** (soleil devant, az 0-40°, el ~3-15°), longues ombres vers la caméra | 29 des 41 clés caméra **éclairées de face** (soleil à 116-163° de l'axe de visée), 9 de côté, 3 de dos. Les 6 clés golden sont toutes à 114-156° : **aucun contre-jour** | Lumière de face plate le jour ; en golden, la lumière vient de derrière la caméra |
| Bords d'ombre au point (10-90 %, px @720) | 3-12 px (tache de soleil de d03 7-12, blobs 3-12). Les ombres du premier plan ne paraissent douces de 16-124 px qu'à cause de la **profondeur de champ (DOF)** | 3-10 px | Même plage. La douceur des bords n'est pas un écart d'éclairage ; la DOF en est un (depth.md) |
| Contact / AO | Aucun assombrissement de type SSAO. Contact = trait d'encre + ombre portée ou ombre en tache (blob). Les petits accessoires ont une courte rampe (bol : 25 % plus sombre, disparu en 8 px) | Aucun | Rien à ajouter, sauf les blobs sous les personnages |
| Ombre au sol des personnages | Jour : **blob** doux décalé à l'opposé du soleil, ratio Y .52-.74, bord 3-12 px. Coucher : longues ombres douces des silhouettes | Ombres dures de la silhouette complète des cartes (fusils, jambes) dans toutes les lumières | Il faut des blobs (jour) et de longues ombres douces (golden) |
| Têtes | V **.97** (.86-1.0) dans toutes les lumières ; sat .03 de jour → .23 au coucher → .21 la nuit (teintées par la scène) ; dégradé latéral \|lr\| **.14** (.05-.36) vers la key ; haut plus clair (tb −.11) ; rim 1.03 (aucun liseré) | V .82 (.65-.92). Têtes à l'ombre grises #ae9786 (V .68). Têtes golden #bd7c48 / #a46d41 (sat .61-.62, V .64-.74). Dégradé .008 (plat) | Les nôtres virent au gris à l'ombre et à l'orange sombre en golden, et elles sont plates |
| Ciel dans le cadre (haut, jour) | #238bf4 / #0a6beb / #377ff1 / #5ca3e0 (sat .59-.96) au-dessus d'un horizon pâle (#b5d9fb-#f1e3d4) | #8bb5e6 en haut, #9abfe9 en bas (sat .34-.40, sans dégradé) | Délavé. Correction dans depth.md 6.5 |
| Étalonnage (jour) | L* p2 15.5, p98 95.3, part vive .28, teinte des sombres 39° C 12 (sombres chauds) | L* p2 1.2, p98 79.6, part vive .05, C des sombres 4 (sombres gris) | Sombres écrasés et gris, hautes lumières ternes |
| Spéculaire | Seulement sur le métal : marmite en cuivre (d01), canon (d12), armure (d15), boulet de fer (d20) | aucun (tout en Lambert) | Le fer et l'acier pourraient avoir un reflet |

## 1. Méthode (en bref)

- **Paires sur une même surface.**
  - Les zones éclairée et ombrée sont prises sur un seul matériau : boîtes placées à la main (lignes M, P) ou séparation d'Otsu en 2 clusters de la log-luminance dans une région (lignes R, Q).
  - Les valeurs sont moyennées en lumière linéaire. Les ratios sont par canal, en linéaire.
  - Scripts : `scripts/run_pairs.py`, `scripts/run_auto.py`. Contrôles : `crops/pairs_check.jpg`, `crops/pairs_auto_check.jpg`.
- **Bords.**
  - Ajustement logistique (soft-L1) à travers un bord d'ombre ; largeur 10-90 % = 4.394·σ.
  - Script : `scripts/edges.py`, plus les ajustements supplémentaires de la section 4. Contrôle : `crops/edges_check.jpg`.
- **Têtes.**
  - Taches pâles et rondes à l'intérieur d'un anneau sombre (`scripts/heads.py`, `scripts/heads_ours.py`).
  - 30 têtes de la référence ont été vérifiées à l'œil ; les faux positifs (chapeaux, voiles, neige, papier) ont été écartés.
  - Un ajustement de plan sur la luminance linéaire donne grad_lr et grad_tb : la variation à travers la tête, en fraction de sa moyenne.
  - Contrôles : `crops/heads_check_0.jpg`, `crops/heads_ours_check.jpg`.
- **Halos.** Profil médian radial autour de chaque source (`scripts/glows.py`, `crops/glows_check.jpg`).
- **Étalonnage.** Percentiles Lab, plus la teinte et le chroma des bandes sombre, moyenne et claire (`scripts/grade.py`).
- **Contact / AO.** Profils partant de l'intérieur d'un objet et traversant sa base vers l'extérieur (`scripts/contact.py`).
- **Notre soleil par rapport à la caméra.** Chaque clé caméra de `story.ts` est confrontée à `LIGHTS` (`sun_vs_cam.txt`).
- **Modèle.** `scripts/model.py` : three r175 Lambert + hémisphère + directionnelle, puis tone mapping PBR-Neutral, puis sRGB.
  - Il reproduit nos ombres mesurées : dalle prédite #687175 contre #616868 mesurée ; pont aux poteaux du garde-corps #52391f contre #5a3b12.
  - Il sert ensuite à calculer les nouvelles valeurs.

## 2. Lumière principale (key) : direction et élévation

Estimations tirées de la direction et de la longueur des ombres portées, et des côtés éclairé et sombre. L'az se mesure depuis l'axe
de visée : 0° = soleil droit devant (contre-jour), 90° = de côté, 180° = derrière la caméra. Toutes les valeurs sont approximatives (±15°).

| Frame | Scène | Key (écran) | az | el | Indices | Couleur de l'ombre / lumières locales / voile / spéculaire / liseré (rim) |
|---|---|---|---|---|---|---|
| d01 | pont de navire | droite-arrière | ~60 | ~45 | les ombres des montants du bastingage tombent en bas à gauche | ombre chaude sur le bois (R02 Y .37) ; voile bleu-gris pâle sur l'île ; grand reflet doux sur la marmite en cuivre ; pas de liseré |
| d02 | cuisinier sur le pont | gauche | ~100 L | ~40 | mât éclairé à gauche, sombre à droite (M06 Y **.07**, ombre propre profonde) | – |
| d03 | pont, plan large | haut-droite-arrière | ~50 | ~50 | taches de soleil à travers le gréement, nettes, 7-12 px | ombre chaude et sombre (R01 Y .28) ; ciel bleu marine en haut |
| d04 | champ de courses | droite, un peu en arrière | ~70 | ~40 | ombre du cheval vers le bas à gauche | – |
| d05 | ville vue d'en haut | dessus | – | ~65 | ombres très courtes | fort voile bleu sur les collines #94cefe |
| d07 | place | face-dessus, douce | ~150 | ~55 | grande ombre douce venue du hors-champ | ombre bleu-gris sur la pierre |
| d08 | herbe + foule | face, douce | ~160 | ~60 | presque pas d'ombres portées | – |
| d09 | rue de western | droite | ~95 | ~60 | façades de gauche éclairées ; petit blob sous le personnage | horizon pâle #b5d9fb ; DOF |
| d10 | cow-boy en gros plan | droite-face | ~120 | ~55 | façades éclairées par la droite | – |
| d12 | pont + canon | droite-arrière | ~60 | ~50 | ombre de l'affût vers le bas à gauche | ombre chaude (R03 Y .49) ; falaises lavande #a7a3af ; reflet sur le canon |
| d13 | personnages sur le pont | droite | ~70 | ~55 | blob décalé à gauche des pieds | chaude (R04 Y .52) |
| d14 | coffre | droite | ~70 | ~50 | ombre du coffre vers la gauche | chaude (R05 Y .49) |
| d15 | chevalier au marché | face-dessus, douce | ~160 | ~60 | seulement l'ombre de l'auvent | reflets sur l'armure |
| d16 | roi dans un champ | plate | – | – | presque aucune | horizon pâle #e5e7f2 |
| d17 | grille d'acier | face-dessus | ~150 | ~60 | ombres douces derrière les personnages | ombre bleutée sur le métal gris (M02 B .81) |
| d18 | porte de maison | face | ~170 | ~50 | façade éclairée uniformément | – |
| d19 | porte du château | face-dessus | ~160 | ~60 | façade uniforme | petites torches murales |
| d20 | herbe du fort | haute | – | ~65 | blob rond sous le soldat | ombre verte (R06 Y .65) ; reflet sur le boulet noir |
| s01 | cavaliers de western | **devant, dans le cadre** | ~5 | ~8 | longues ombres vers la caméra | violet (M01 B x2.95) ; voile de poussière ; bloom, pas de liserés |
| s02 | rue de western | devant | ~10 | ~8 | longues ombres vers la caméra | violet (R07 B x3.0) ; voile orange |
| s03 | à terre | devant-droite | ~20 | ~10 | longues ombres | violet (R08 B x2.8) |
| s04 | deux personnages | devant | ~10 | ~10 | longues ombres des personnages sur le sable | violet (R09 B x1.35) ; façade floue bleu-violet |
| s05 | colline | devant-gauche (derrière le château) | ~20 | ~15 | jarre à contre-jour, côté ombre lavande | feu + lanterne ; voile rose #db9594 |
| s06 | palais | gauche, au bord du cadre | ~40 | ~15 | à contre-jour | lanterne ; voile pêche #d1a57c |
| s07 | pont | derrière les personnages | ~10 | ~10 | personnages éclairés à plat, mèche qui rougeoie | ciel violet |
| s09 | route | **devant, à l'horizon** | 0 | ~3 | longues ombres vers la caméra | cœur du halo du soleil 90 px, r50 188 px |
| s11 | intérieur, fenêtre | devant (fenêtre derrière le personnage) | ~10 | basse | ombre du personnage au sol, vers la caméra | chaud-neutre (M05 Y .51) |
| s13 | rue à l'aube | devant (soleil en haut, halo en anneau) | ~10 | ~25 | ombre vers la caméra | épais voile orange |
| s15 | champ voilé | plutôt de face, douce | – | ~30 | ombre de la caisse (adoucie par la DOF) | brun-violet (R10 B .66) |
| n02 | ville de nuit | ambiance bleue | – | – | – | fenêtres chaudes, réverbères (G01/G02) |
| n04 | western de nuit | lampe chaude à droite | – | – | ombre de botte violette | ombre (R11) (.47, .51, **.91**) |
| n06 | lanternes sur la neige | lanternes chaudes + porte | – | – | – | halo G04 |
| n07 | champ au clair de lune | lune en haut à gauche | – | – | – | ambiance violette, halo de lune G05 |
| n08 | rempart du château | lune en haut + torche | – | – | – | tête teintée lavande #b1ace7 |
| n09 | forgeron | lune voilée derrière | – | – | – | brouillard violet #877aea, fenêtres chaudes |
| i02 | pièce | rai de soleil venu de la fenêtre à gauche | – | – | poussiéreux, doux (E09 48 px) | ombre (M03) plus orangée et plus chaude que le rai pâle |
| i08 | chambre au clair de lune | fenêtre | – | – | **le motif de lumière de la fenêtre traverse le visage** | les personnages reçoivent des motifs de lumière |
| i10 | bureau | tache de soleil sur le mur | – | – | tache jaune sur un mur vert (M04 B **x4.85**) | tache de lumière = remplacement de couleur |
| i11 | applique murale | lampe chaude en haut à gauche | – | – | – | halo G10 |
| i15/i16 | ampoule nue | au plafond | – | – | flaque de lumière | halos G11/G12 |

**Nous.** Le `LIGHTS.day.sun` actuel vaut (−0.45, 0.8, −0.4), à el 53°. Face à nos caméras (`sun_vs_cam.txt`) :

| Classe | Nos clés caméra (41) |
|---|---|
| De face, soleil derrière la caméra (>115°) | **29** (plans 1-3, 5-8, 10, 14, 15) |
| De côté (87-115°) | 9 |
| De dos (<60°) | 3 (plan 4 uniquement) |
| Clés golden (plans 11-13) | 114-156° (aucune à contre-jour) |

Le soleil est à droite de l'écran dans 38 des 41 clés (les exceptions sont les trois clés golden des plans 11-12).

## 3. Couleur de l'ombre sur une même surface

Les ratios sont ombre/éclairé, par canal, en lumière linéaire.

| ID | Frame | Surface | Éclairé | Ombre | R | G | B | Y | Teinte éclairé → ombre | Sat éclairé → ombre |
|---|---|---|---|---|---|---|---|---|---|---|
| R02 | d01 | pont, ombre du bastingage (jour) | #e8b471 | #9f6f39 | .43 | .34 | .25 | .37 | 34 → 31 | .51 → .64 |
| R03 | d12 | pont, ombre de l'affût | #c08e5d | #936240 | .55 | .46 | .47 | .49 | 30 → 25 | .52 → .56 |
| R04 | d13 | pont, blob sous un personnage | #cb9563 | #9c6c46 | .56 | .50 | .48 | .52 | 29 → 27 | .51 → .55 |
| R05 | d14 | pont, ombre du coffre | #d19c65 | #9f6d48 | .54 | .46 | .50 | .49 | 31 → 26 | .52 → .54 |
| R01 | d03 | pont sous les voiles (ombre profonde) | #d6933d | #785221 | .28 | .29 | .32 | .28 | 34 → 34 | .71 → .72 |
| R06 | d20 | herbe, blob du soldat | #6ca937 | #518c27 | .55 | .66 | .53 | .65 | 92 → 95 | .67 → .72 |
| M02 | d17 | grille d'acier | #444a54 | #32384c | .56 | .58 | .81 | .60 | 217 → 226 | .19 → .34 |
| M06 | d02 | mât, côté éclairé contre côté détourné (forme) | #de9c41 | #3e2b1d | .07 | .07 | .24 | .07 | 35 → 25 | .71 → .53 |
| M01 | s01 | sable, longue ombre (coucher) | #db9044 | #5b5173 | .15 | .30 | **2.95** | .27 | 30 → 258 | .69 → .29 |
| R07 | s02 | sable, longue ombre | #da9043 | #524e73 | .12 | .27 | **3.04** | .24 | 30 → 247 | .69 → .32 |
| R08 | s03 | sable, longue ombre | #df9545 | #524e72 | .11 | .25 | **2.82** | .22 | 31 → 246 | .69 → .32 |
| R09 | s04 | sable, ombre des personnages | #bc7d52 | #38325f | .08 | .16 | **1.35** | .15 | 25 → 248 | .56 → .47 |
| R10 | s15 | chemin de terre, caisse (voilé) | #bd874a | #6e4e3c | .31 | .32 | .66 | .32 | 32 → 22 | .61 → .46 |
| M05 | s11 | sol crème, personnage (intérieur au coucher) | #dfc5a8 | #ab8e81 | .55 | .49 | .56 | .51 | 31 → 20 | .25 → .25 |
| M03 | i02 | sol, rai de soleil contre reste de la pièce | #fdf6cc | #cda479 | .62 | .40 | .32 | .45 | 52 → 30 | .19 → .41 |
| M04 | i10 | mur vert, tache de soleil contre mur | #d6c33b | #76b27f | .27 | .82 | **4.85** | .69 | 53 → 129 | .73 → .34 |
| R11 | n04 | sable de nuit sous une lampe chaude | #a77065 | #765161 | .47 | .51 | .91 | .51 | 9 → 334 | .39 → .31 |
| **Q01** | **b_1900** | **notre pont, poteaux du garde-corps (jour)** | #a67041 | #5a3b12 | .27 | .27 | .11 | .27 | 28 → 34 | .61 → .80 |
| **Q02** | **b_100** | **notre pont, bande des soldats (jour)** | #b37736 | #794913 | .42 | .36 | .18 | .38 | 31 → 32 | .70 → .84 |
| **P01** | **b_1810** | **notre pavage, ombre du panneau (jour)** | #ccc0a9 | #616868 | .20 | .26 | .35 | .25 | 40 → 176 | .17 → .07 |
| **P02** | **b_2010** | **notre rivière, ombre du pont** | #3f7db7 | #0f4b87 | .09 | .34 | .51 | .36 | 209 → 210 | .65 → .89 |

**Pourquoi les nôtres ont cet aspect** (vérification par le modèle).
- Notre ombre vient seulement de l'hémisphère + la lumière d'appoint (fill) : physiquement (0.28, 0.36, 0.50) de la valeur éclairée.
- Le pied (toe) du PBR-Neutral soustrait ensuite `x − 6.25x²` de chaque canal dont le minimum est sous 0.08. Cela écrase le petit canal bleu des ombres chaudes (ratio B du pont .11-.18) et grise la pierre.
- En golden, le soleil à 14.5° apporte peu au sol horizontal : le sol est donc partout au niveau de l'ombre.

**Règle tirée de la référence.**
- **Jour.** Ombre = environ 0.5 × éclairé, en gardant la teinte propre de la surface avec un peu plus de saturation (chaude sur le bois, verte sur l'herbe, bleutée seulement sur le métal gris).
- **Coucher de soleil.** Ombre = une couleur de remplacement violet-bleu (bleu jusqu'à 3x le bleu éclairé).
- **Intérieurs.** Les taches de lumière sont aussi des remplacements de couleur (tache jaune sur un mur vert).
- Des ratios pareils demandent un shader qui mélange une couleur éclairée et une couleur d'ombre. Les intensités de lumière seules ne peuvent pas les produire.

## 4. Bords d'ombre, contact et AO

**Pénombre, largeur 10-90 % en px @720.**

| ID | Frame | Bord | Largeur | Au point ? |
|---|---|---|---|---|
| nouveau | d03 | tache de soleil à travers le gréement, bord haut / droit | **7.1 / 12.5** | oui |
| E05 | d13 | blob sous un personnage | **9.2** | oui |
| E06 / nouveau | d20 | blob du soldat (bord latéral / inférieur) | **11.5 / 2.8** | oui |
| nouveau | d14 | ombre du coffre, bord latéral | **5.0** | oui |
| E01-E03 | s01-s03 | longues ombres du coucher, près du bas du cadre | 15.8 / 20.2 / 57.4 | non, DOF du premier plan |
| E10 | s15 | ombre de la caisse, premier plan | 39.0 | non, DOF |
| E11 | s11 | ombre du personnage sur une bande de sol | 69.2 | non, DOF |
| E12 | s04 | ombre des personnages sur le sable | 123.8 | non, DOF |
| E09 | i02 | bord du rai de soleil (air poussiéreux) | 48.1 | volumétrique |
| O01 | nous b_1900 | ombre des poteaux du garde-corps sur le pont | **10.0** | – |
| O02 | nous b_1810 | ombre du panneau sur le pavage | **2.9** | – |

Exclus : E04 (boîte à l'intérieur de la tache), E07, E08, O03, O04 (échec de l'ajustement : lignes des planches, eau).

**Résultat.**
- Les ombres au point de la référence sont nettes, à 0.4-1.7 % de la largeur du cadre. C'est aussi notre plage.
- Les ombres très douces de la référence se trouvent toutes dans un premier plan flouté par la DOF.
- Garde donc une shadow map nette. La douceur vient du flou d'objectif de depth.md, pas d'une grande source de lumière.

**Assombrissement de contact / AO** (`contact.csv` ; distances en px @720 après le trait d'encre).

| ID | Frame | Contact | Assombrissement près de la base | Retour à 90 % à |
|---|---|---|---|---|
| C01 | i01 | bol sur un comptoir | **25 %** | 8 px |
| – | d11 | avant du trottoir en planches → sable | interstice noir sous les planches, puis une rampe douce | 11 px |
| C03 | d14 | base du coffre sur le pont | trait d'encre seulement | 3 px |
| C04 | d16 | base d'une boîte sur le sol | aucun | 2 px |
| – | d12 | base d'un seau sur le pont | aucun (plateau juste après l'encre) | 0 |
| C02 | i12 | sous le rebord du comptoir | aucun (face légèrement plus claire) | 1 px |
| – | i10 | du mur vers le sol | dégradé de 15 % sur 110 px (éclairage, pas AO) | – |

**Résultat.**
- La référence n'a pas l'aspect d'une AO en espace écran (SSAO). Le contact, c'est le trait d'encre plus les ombres portées ou les blobs.
- Seuls les petits accessoires ont une courte rampe de 8-11 px, et c'est leur ombre portée.
- Nos images fixes n'ont pas d'AO non plus. N'ajoute pas de SSAO.

**Ombres au sol des personnages** (`crops/sbs_contact.jpg`).

| | Référence | Nous |
|---|---|---|
| Jour | **Blob** elliptique doux décalé à l'opposé du soleil (d13, d20, d09). Ratio Y .52-.74 (R04 .52, R06 .65, E05 .63, E06 .74). Bord 3-12 px | Silhouettes complètes des cartes avec fusils et jambes. Dures, 3-10 px |
| Coucher | Longues silhouettes douces des personnages (s04, s11), adoucies par la DOF | Mêmes silhouettes dures |
| Intérieurs | Souvent pas d'ombre du tout (i14 forge, d17 grille) | – |

## 5. Personnages (cartes plates) sous la lumière de la scène

**Têtes, ensemble valide** (`heads_auto.csv`).

| Ensemble | n | V médiane [plage] | Sat médiane [plage] | \|grad_lr\| médiane [plage] | grad_tb | Liseré (rim) |
|---|---|---|---|---|---|---|
| réf. jour | 10 | **.97** [.95-1.0] | .03 [.01-.09] | .114 [.05-.20] | −.12 (haut plus clair) | 1.02 |
| réf. coucher | 2 | .99 | .23 [.18-.28] | .168 | −.06 | 1.03 |
| réf. nuit | 6 | .98 [.88-.99] | .21 [.02-.26] | .119 [.03-.36] | −.13 | 1.04 |
| réf. intérieur | 12 | .97 [.86-1.0] | .14 [.01-.29] | .174 [.005-.36] | −.11 | 1.03 |
| **réf. tout** | 30 | **.97 [.86-1.0]** | .08 | **.142** | **−.109** | 1.03 (pas de liseré) |
| nous éclairé | 11 | .90 [.84-.92] | .31 | .011 | +.015 | 1.02 |
| nous ombre | 8 | **.69** [.65-.70] | .24 | .018 | −.002 | 1.03 |
| nous golden | 2 | **.64-.74** | **.61-.62** | – | – | – |

**Couleurs de tête mesurées** (albédo blanc : elles se lisent donc comme la couleur de la lumière).
- Jour : #f8f1ef, #f7f1f0.
- Coucher : #fddeb6, #fde7d0.
- Lampe chaude : #fcdfbd, #fbdeb5.
- Clair de lune : #b1ace7, #edd9f7.
- Lumière de fenêtre : #d9b5e7. Dans i08, une bande claire venue de la fenêtre traverse le visage.

**Ce que la référence fait avec les cartes.**
- Les têtes restent claires (jamais sous V .86).
- Elles prennent la couleur de la lumière de la scène comme teinte.
- Elles ont un dégradé latéral doux vers la key (~14 % à travers la tête) et un haut un peu plus clair.
- Elles reçoivent les ombres et les motifs de lumière (i08, i09), mais ne s'assombrissent qu'un peu.
- Il n'y a pas de liseré.
- characters.md ajoute un croissant doux du côté de l'ombre (0.88-0.89x, lavande ×(0.92, 0.90, 0.96)) et un dégradé plus fort sur le torse (1.0 → 0.55-0.66).

**Nous.**
- Plat. L'aspect « collé dessus » vient de l'emissive 0.36.
- Gris à l'ombre (#ae9786).
- Trop orange et sombre en golden (#bd7c48, #a46d41).

## 6. Lumières locales, halo, spéculaire, liseré (rim), voile

**Halos** (`glows.csv` ; px @720 depuis le point le plus brillant ; r50/r10 = distance où l'excès de halo retombe à 50/10 %).

| Source | Cœur | r50 | r10 | Couleur du cœur / du halo |
|---|---|---|---|---|
| réverbères n02 | 4-8 | 12 | 18-42 | #ffeac8 / #e1baac |
| fenêtre éclairée n05 | 8 | 34 | 114 | #f2d7a4 / #e9bf8a |
| lanterne en papier n06 | 24 | 42 | 46 | #fac777 / #efb56a |
| lune n07 / n08 / n09 (brouillard) | 20 / 10 / 14 | 30 / 38 / 32 | 64 / 108 / 144 | #e6eef7 / #bdd4f7 |
| lampe murale n12 | 2 | 4 | 24 | #f8d5c8 |
| lanterne de navire i01 | 28 | 34 | – | #f4e8d8 / #e8cda3 |
| applique i11 | 32 | 68 | 204 | #f5efe9 / #e7c8a4 |
| ampoules nues i15 / i16 | 10 / 30 | 18 / 34 | 66 / 78 | #e0d4c5 |
| soleil couchant s09 | 90 | **188** | – | #e6cfc3 / #e5c195 |
| soleil bas s13 | 58 | 94 | 164 | #fceecf / #fbddae |
| bougie i07 | 6 | 42 | 174 | #fef7f0 / #e8b57e |

Notre film n'a besoin que du soleil golden. Son halo doit avoir r50 ≈ 13-26 % de la largeur du cadre, au bord du cadre (voir depth.md 6.4 pour les réglages du bloom).

**Autres observations.**
- **Spéculaire.** Seuls les accessoires en métal en ont, sous la forme d'un seul reflet large et doux. Le bois, le sol et les personnages n'en ont pas.
- **Liseré (rim) / contre-jour.** Aucun sur les têtes (rim 1.02-1.04 dans les deux cas). Le contre-jour du coucher se voit comme du bloom et du voile autour des silhouettes, pas comme des liserés.
- **Voile atmosphérique.**
  - De jour, le lointain est bleu : collines #94cefe, falaises lavande #a7a3af.
  - Au coucher, le lointain est rose et pêche : château #db9594, palais #d1a57c.
  - Le brouillard de nuit est violet #877aea.
  - Les valeurs exactes du ciel et du brouillard sont dans depth.md 2.2/6.5 ; mes échantillons du haut du ciel dans le cadre concordent avec elles (`sky.txt`).

## 7. Chiffres d'étalonnage qui viennent de l'éclairage (`grade_*.csv`)

| Ensemble | n | L* p2 | L* p50 | L* p98 | Part vive (C*>40) | Teinte / C de la bande sombre | Teinte / C de la bande claire | split_b (clairs chauds − sombres) |
|---|---|---|---|---|---|---|---|---|
| réf. jour | 20 | 15.5 | 63.7 | 95.3 | .28 | 39° / 12.4 | 79° / 6.7 | −0.2 |
| réf. coucher | 15 | 15.7 | 59.2 | 92.1 | .28 | 8° / 15.4 (rouge magenta) | 60° / 37.0 | **+26** |
| réf. nuit | 14 | 8.3 | 32.2 | 83.8 | .45 | 300° / 33.3 (violet) | 320° / 20.5 | +17 |
| réf. intérieur | 18 | 6.1 | 33.5 | 91.6 | .20 | 330° / 15.4 | 53° / 19.1 | +22 |
| réf. toutes les 539 | 539 | 10.2 | 48.7 | 92.2 | .23 | 340° / 15.1 | 44° / 10.0 | +11 |
| **nous jour** | 28 | **1.2** | 48.6 | **79.6** | **.05** | 2° / **4.1** | 268° / 2.8 | 0.7 |
| **nous golden** | 9 | 3.2 | 37.1 | 73.2 | .24 | **57°** / 12.7 (orange) | 46° / 21.2 | **4.2** |

Les couleurs d'ombre en deux tons ci-dessous corrigent la teinte et le chroma de la bande sombre (chaude le jour, violette au coucher). L'exposition et les hautes lumières relèvent du rapport sur l'étalonnage.

## 8. Recadrages de comparaison

Chaque planche montre la référence à gauche, une barre magenta, puis la nôtre.

| Fichier | Ce qu'il compare |
|---|---|
| `lighting/crops/sbs_day_deck.jpg` | Ombres du pont : douces, chaudes, claires contre sombres, en bandes dures |
| `lighting/crops/sbs_golden.jpg` | Coucher s02/s04/s09 contre nos golden b_1500/c_1340/b_1680 (soleil devant + ombres violettes contre orange terne éclairé de face) |
| `lighting/crops/sbs_heads.jpg` | Têtes de la référence en lumière de jour / coucher / lune / lampe / fenêtre contre les nôtres (jour, ombre, golden) |
| `lighting/crops/sbs_contact.jpg` | Blobs de contact des personnages contre nos silhouettes dures |
| `lighting/crops/sbs_sky.jpg` | Ciel |
| `pairs_check.jpg`, `pairs_auto_check.jpg`, `edges_check.jpg`, `heads_check_0.jpg`, `heads_ours_check.jpg`, `glows_check.jpg` | Contrôles des mesures (boîtes et lignes tracées) |
| `lighting/view/dir/s00-s11.jpg` | Les 67 frames d'étude (source du tableau des directions) |
| `lighting/view/dir/ours0-2.jpg` | Nos images fixes |

## 9. Recette pour notre pile technique (three 0.175, postprocessing 6.37.2)

L'idée :
- Chaque matériau du décor (Lambert issu de `lam()` / `toLambert()`) reçoit un ombrage stylisé **en deux tons** : `albedo × mix(shadeCol, litCol, sunTerm)`.
  - `sunTerm` = la vraie visibilité de la shadow map × un terminateur N·L doux.
  - La couleur d'ombre est choisie par preset à partir des ratios mesurés.
- Les cartes des personnages reçoivent leur propre teinte de couleur de lumière, avec un plancher lumineux et un dégradé latéral. Pas d'emissive.
- Le soleil est placé **par rapport à la caméra de chaque plan** et figé pour tout le plan.

La visibilité de la shadow map est capturée dans la boucle de lumières de three elle-même : rien n'est donc calculé deux fois.

### 9.1 `lights.ts` : remplacement complet

Les champs du ciel et du brouillard reprennent les valeurs de depth.md : les deux recettes fusionnent ainsi en une seule table.

```ts
// Light presets per time of day. The sun is CAMERA-RELATIVE and frozen per shot (world.ts update()):
// az = degrees from the shot camera's forward axis (0 = sun straight ahead = backlight, +90 = screen right,
// 180 = behind camera), el = elevation. lit/shade/lift are LINEAR RGB multipliers for shade.ts (may exceed 1).
type C3 = [number, number, number];
export type LightPreset = {
  az: number; el: number;
  lit: C3; shade: C3; lift: C3; lambert: number; sideK: number; term: number;      // world two-tone (shade.ts)
  charTint: C3; charShade: number; charGrad: number; bodyGrad: number; sideTint: C3; // character cards (cast.ts)
  blob: C3; actorShadow: boolean;                                                    // contact blobs / card shadows
  top: string; hor: string; skyCurve: C3; fog: string; fogNear: number; fogFar: number; sunDisc: string; // depth.md 6.5
  sunCol: string; sunI: number; sky: string; ground: string; hemiI: number;         // three lights (unpatched mats only)
  bias: number; normalBias: number;
};
export const LIGHTS: Record<"day" | "golden", LightPreset> = {
  day: {
    az: 75, el: 48,
    lit: [1.54, 1.47, 1.35], shade: [0.80, 0.71, 0.83], lift: [0, 0, 0], lambert: 0.35, sideK: 0.82, term: 0.2,
    charTint: [1.0, 0.94, 0.92], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.92, 0.90, 0.96],
    blob: [0.62, 0.58, 0.58], actorShadow: false,
    top: "#4284d3", hor: "#c9cdee", skyCurve: [0.0, 0.5, 0.6], fog: "#b0c0e8", fogNear: 25, fogFar: 420, sunDisc: "#000000",
    sunCol: "#fff3e0", sunI: 2.3, sky: "#dcecff", ground: "#b49a78", hemiI: 0.9,
    bias: -0.00025, normalBias: 0.015,
  },
  golden: {
    az: 15, el: 9,
    lit: [1.42, 0.79, 0.48], shade: [0.176, 0.206, 0.72], lift: [0.035, 0.03, 0.075], lambert: 0.35, sideK: 0.82, term: 0.07,
    charTint: [1.0, 0.78, 0.56], charShade: 0.88, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.85, 0.80, 0.95],
    blob: [0.75, 0.74, 0.9], actorShadow: true,
    top: "#443876", hor: "#ffd08a", skyCurve: [0.05, 0.6, 1.0], fog: "#f4c68c", fogNear: 20, fogFar: 360, sunDisc: "#ffd9a0",
    sunCol: "#ffab5e", sunI: 5.5, sky: "#b9a4e0", ground: "#7a5a6a", hemiI: 0.5,
    bias: -0.0006, normalBias: 0.03,
  },
};
```

Résultats prévus (`scripts/model.py`, section 5 de sa sortie ; sol tourné vers le haut ; puis le mur face à la caméra). Ils
incluent le tone mapping Neutral :

| Matériau | Jour éclairé | Jour ombre | Ratio Y jour | Golden éclairé | Golden ombre | Ratio Y golden |
|---|---|---|---|---|---|---|
| bois (pont) | #db9349 | #a76832 | .50 (réf. #c08e5d/#936240) | #bd6010 | #45232e | .14 |
| sable | #f2d291 | #c7a57b | .60 | **#dc9244** | **#565072** | .25 (réf. #db9044 / #5b5173) |
| pierre / pavage | #efdfbf | #bfaba3 | .57 | #d49864 | #515598 | .28 |
| herbe | #82c44f | #5d8f37 | .50 (réf. #6ca937/#518c27) | #708213 | #14483a | .26 |
| mur de brique à l'ombre | – | #973114 | – | – | #450620 + lift → prune | – |

**Notes sur les presets.**
- **Surcharge par plan.** Autorise `sunAz?` / `sunEl?` par plan dans `SHOTS` (story.ts) quand une façade doit être éclairée de face. Exemple : plan 2, plan large de la ville, az 120.
- **Contre-jour golden.** az 15 / el 9 place le soleil juste hors du bord droit du cadre pour toutes les caméras golden. Son halo entre dans le cadre, et les cartes de 2 m projettent des ombres de ~13 m vers la caméra, comme dans s01-s04.
- **Teintes des têtes.** Les valeurs de `charTint` sont les couleurs de lumière mesurées pour des têtes BLANCHES, ce qu'utilise la référence. Si nos têtes gardent la peau pêche #f7d6b6, utilise pour golden `[1.0, 0.88, 0.76]` et pour day `[1.0, 0.97, 0.96]`, afin que la saturation des têtes reste ≤ .37 au lieu de .46.

### 9.2 Nouveau fichier `src/videos/bridge/shade.ts` : ombrage du décor en deux tons + ombrage des cartes

```ts
// Stylised two-tone lighting shared by all world materials and the character cards (three r175 chunk names).
import * as THREE from "three";

export const TONE = {
  uLitCol: { value: new THREE.Vector3(1.54, 1.47, 1.35) }, uShadeCol: { value: new THREE.Vector3(0.8, 0.71, 0.83) },
  uShadeLift: { value: new THREE.Vector3() }, uLambert: { value: 0.35 }, uSideK: { value: 0.82 }, uTerm: { value: 0.2 },
};
export const CHAR = {
  uCharTint: { value: new THREE.Vector3(1, 0.94, 0.92) }, uCharShade: { value: 0.86 }, uGrad: { value: 0.07 },
  uBodyGrad: { value: 0.2 }, uSideTint: { value: new THREE.Vector3(0.92, 0.9, 0.96) },
};

// Capture the sun's shadow visibility inside three's light loop (directional light 0 = the only shadow caster;
// three sorts shadow-casting lights first). Only the UNROLLED index 0 compiles the shadow block.
export const LFB = THREE.ShaderChunk.lights_fragment_begin
  .replace("directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ]",
           "sunVis = ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ]")
  .replace("vDirectionalShadowCoord[ i ] ) : 1.0;", "vDirectionalShadowCoord[ i ] ) : 1.0;\n\t\tdirectLight.color *= sunVis;");
if (!LFB.includes("directLight.color *= sunVis")) throw new Error("shade.ts: three lights_fragment_begin changed");

const TWO_TONE = /* glsl */ `
#if NUM_DIR_LIGHTS > 0
{
  vec3 sunV = directionalLights[ 0 ].direction;                               // view space, towards the sun
  vec3 upV = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
  float ndl = max( dot( geometryNormal, sunV ), 0.0 );
  float sunTerm = sunVis * smoothstep( 0.0, uTerm, ndl );                     // 0 = cast/form shadow, 1 = lit
  float skyK = mix( uSideK, 1.0, 0.5 + 0.5 * dot( geometryNormal, upV ) );    // up-facing a bit brighter
  vec3 lit = uLitCol * mix( 1.0, ndl, uLambert );                             // keep some cosine modelling
  reflectedLight.directDiffuse = diffuseColor.rgb * mix( uShadeCol, lit, sunTerm ) * skyK + uShadeLift * ( 1.0 - sunTerm );
  reflectedLight.indirectDiffuse = vec3( 0.0 );                               // hemisphere/fill no longer used here
}
#endif
`;
const DECL = "#include <common>\nuniform vec3 uLitCol; uniform vec3 uShadeCol; uniform vec3 uShadeLift; uniform float uLambert; uniform float uSideK; uniform float uTerm;";

/** Lambert (or Phong: its specular term is kept) -> two-tone. Call once per material, before first render. */
export function twoTone<T extends THREE.MeshLambertMaterial | THREE.MeshPhongMaterial>(m: T): T {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, TONE);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", DECL)
      .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
      .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n" + TWO_TONE);
  };
  m.customProgramCacheKey = () => "twoTone1";
  return m;
}

// Character card: bright floor, scene tint, side gradient toward the sun (head soft, torso strong), lavender
// shadow side; receives shadows but only dims to uCharShade. Replaces the whole outgoing light (no emissive).
const CARD = /* glsl */ `
vec3 outgoingLight = diffuseColor.rgb * uCharTint;
#if NUM_DIR_LIGHTS > 0
{
  vec3 sunV = directionalLights[ 0 ].direction;
  vec3 upV = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
  float side = clamp( sunV.x * 1.4, -1.0, 1.0 );                                       // + = sun on screen right
  float u = clamp( ( vMapUv.x - 0.5 ) / 0.21, -1.0, 1.0 ) * sign( dFdx( vMapUv.x ) + 1e-7 ); // -1..1 left..right
  float t = u * side;                                                                    // +1 = edge facing the sun
  float head = smoothstep( 0.55, 0.62, vMapUv.y );                                       // head zone vs torso
  float g = mix( uBodyGrad, uGrad, head );
  float dark = smoothstep( 0.1, 1.0, -t );                                               // crescent on the far side
  vec3 sideK = mix( vec3( 1.0 ), uSideTint, dark * ( g / max( uGrad, 1e-3 ) ) * 0.5 );
  float top = 1.0 + 0.055 * clamp( ( vMapUv.y - 0.72 ) / 0.15, -1.0, 1.0 ) * clamp( dot( sunV, upV ) * 2.0, 0.0, 1.0 ) * head;
  float lift = 1.0 + 0.03 * max( t, 0.0 );
  outgoingLight *= mix( uCharShade, 1.0, sunVis ) * ( 1.0 - g * dark ) * sideK * top * lift;
}
#endif
`;
export function cardShade(m: THREE.MeshLambertMaterial) {
  m.emissive.set(0x000000); m.emissiveIntensity = 0; m.emissiveMap = null;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, CHAR);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uCharTint; uniform float uCharShade; uniform float uGrad; uniform float uBodyGrad; uniform vec3 uSideTint;")
      .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
      .replace("vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;", CARD);
  };
  m.customProgramCacheKey = () => "card1";
  return m;
}
```

Ce que donne le shader des cartes, d'après le modèle, avec notre peau #f7d6b6 :
- **Jour.** Tête éclairée #ecc6a4 (V .93). À l'ombre #e2bb9c (V .89), contre #ae9786 (V .68) aujourd'hui.
- **Dégradé.** Tête à environ −14 % sur le bord opposé (conforme à la médiane de .14) ; torse à environ −20 à −25 %, proche des 0.55-0.66 de characters.md sur le bord opposé, avec `bodyGrad` .2-.25.
- **Zone de la tête.** La séparation en v à 0.55-0.62 et le centre de la tête à 0.72 supposent la carte 600x1000 avec la tête dans le tiers supérieur. Ajuste-les si characters.md change les proportions.

### 9.3 `build.ts` : l'appliquer partout où le décor reçoit un matériau

- `lam()` : `m = twoTone(new THREE.MeshLambertMaterial(make()))`.
- `toLambert()` : enveloppe le nouveau Lambert de la même façon : `twoTone(new THREE.MeshLambertMaterial({...}))`.
- **Reflets sur le métal** (la référence montre un seul reflet doux, sur le métal uniquement) :
  - Dans `world.ts`, utilise `M.iron = twoTone(new THREE.MeshPhongMaterial({ color: "#2c2f36", specular: "#8a8a8a", shininess: 60 }))` et `M.steel = twoTone(new THREE.MeshPhongMaterial({ color: "#9aa3b3", specular: "#b0b0b0", shininess: 45 }))`.
  - Phong garde `directSpecular`, qui est masqué par l'ombre parce que la couleur du soleil a été multipliée par `sunVis`.
- Le `MeshLambertMaterial` de l'eau dans world.ts doit aussi passer par `twoTone()`, pour que l'ombre du pont sur la rivière prenne la couleur d'ombre.

### 9.4 `world.ts` : rig, soleil par plan, uniforms, blobs

Dans le constructeur :

```ts
import { TONE, CHAR, twoTone } from "./shade";
// sun disc direction for depth.md's sky/sun sprite: keep a vector
private sunDir = new THREE.Vector3();
// contact blobs: one instanced multiply-decal, drawn after ground (renderOrder 0.5) and before cards (renderOrder 1)
private blobs = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
  uniforms: { uRatio: { value: new THREE.Color(0.62, 0.58, 0.58) } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }",
  fragmentShader: "uniform vec3 uRatio; varying vec2 vUv; void main(){ float r = length(vUv * 2.0 - 1.0); float m = 1.0 - smoothstep(0.72, 1.0, r); gl_FragColor = vec4(mix(vec3(1.0), uRatio, m), 1.0); }",
  transparent: false, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
  blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
}), 160);
// ...in the constructor body: this.blobs.renderOrder = 0.5; this.blobs.frustumCulled = false; R.add(this.blobs);
// and give every Actor mesh renderOrder = 1 (cast.ts), so cards are drawn over the multiplied ground.
```

Dans `update()`, remplace le bloc « light, sky, fog » :

```ts
const L = LIGHTS[s.light];
// camera-relative sun, frozen per shot: use the camera at the shot's first frame
const c0 = camAt(id, s.a);
let fx = c0.look[0] - c0.pos[0], fz = c0.look[2] - c0.pos[2]; const fn = Math.hypot(fx, fz) || 1; fx /= fn; fz /= fn;
const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az); // screen right = (-fz, fx)
const sunDir = this.sunDir.set(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el));
this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
this.fill.intensity = 0;                                    // not used by the two-tone shading
const Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
// (shadow camera as today)
this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term;
CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
(this.blobs.material as THREE.ShaderMaterial).uniforms.uRatio.value.setRGB(...L.blob);
// sky + fog: depth.md 6.5 (top/hor/skyCurve/fog/fogNear/fogFar); sun disc sprite (depth.md 6.4) at cam + sunDir*900, colour L.sunDisc
```

Dans la boucle des acteurs :
- Supprime `a.mat.emissive.set(tint)`.
- Ajoute `a.mesh.castShadow = L.actorShadow;`.
- Ajoute un blob par carte debout (saute les plans `crowd: "water"` et les personnages sur la balançoire) :

```ts
const hl = Math.hypot(sunDir.x, sunDir.z) || 1, ox = -sunDir.x / hl, oz = -sunDir.z / hl;   // away from the sun
this.e.set(-Math.PI / 2, Math.atan2(-ox, -oz), 0, "YXZ");                                     // long axis along shadow
this.m4.compose(this.v.set(p.x + ox * 0.25 * sc2, p.y + 0.012, p.z + oz * 0.25 * sc2), this.q.setFromEuler(this.e),
                this.s3.set(0.7 * sc2, 1.1 * sc2, 1));
this.blobs.setMatrixAt(bi++, this.m4);
// after the loop: this.blobs.count = bi; this.blobs.instanceMatrix.needsUpdate = true;
```

Valeurs du blob : une ellipse de 0.7 × 1.1 m, décalée de 0.25 m à l'opposé du soleil. Son facteur multiplicatif est `L.blob` (jour Y ≈ .59 = les
.52-.74 de la référence). Le bord doux occupe les 28 % extérieurs du rayon, ≈ 0.1 m, soit ~10-14 px @720 en plan moyen (référence 3-12).

**Ombres des cartes : jour contre golden.**
- De jour, les cartes ne projettent pas d'ombre : avec az 75, le soleil n'est qu'à 15° du plan de la carte, et la carte projetterait un mince filet d'ombre. Les frames de jour de la référence montrent des blobs à la place.
- En golden, elles projettent de longues silhouettes plus un léger blob de contact, comme dans s01-s04.
- Cela précise la consigne « garder l'ombre portée + le blob » de characters.md.

### 9.5 `cast.ts` : matériau de l'Actor

```ts
import { cardShade } from "./shade";
this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
this.mat.alphaToCoverage = true;
this.mesh.receiveShadow = true;           // keeps sunVis (dims to 0.86-0.88 only)
this.mesh.renderOrder = 1;                // drawn after the contact blobs
bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }   // no emissiveMap any more
```

Le `customDepthMaterial` (RGBADepthPacking, alphaTest 0.5) reste tel quel. Il marche aussi avec VSM si on l'active un jour.

### 9.6 Réglages de la shadow map

- **Garde `shadows` (PCFSoftShadowMap).** mapSize 4096 et le frustum actuel ajusté sur le point de focus, `Rr = clamp(dist·1.15 + 7, 12, 95)`.
  - Texel = 2Rr/4096 (6 mm en gros plan, 4.6 cm en plan large).
  - Les bords au point restent à 3-10 px @720, comme les 3-12 de la référence. N'ajoute ni PCSS ni grands rayons de flou ; la DOF fournit la douceur du premier plan.
- **Bias.**
  - Jour : `bias −0.00025`, `normalBias 0.015·Rr/12` (comme aujourd'hui).
  - Golden, avec le soleil à 9° : `bias −0.0006`, `normalBias 0.03·Rr/12`, contre l'acné d'ombre sur le sol en lumière rasante.
  - Avec les couleurs en deux tons, l'acné apparaît en mouchetures violettes : vérifie donc d'abord le plan de la balançoire.
- **Portée des ombres.** À el 9°, une carte de 2 m projette une ombre de ~13 m : garde donc `Rr ≥ 14` dans les plans golden. Le clamp actuel à 12 suffit tout juste près de la caméra ; utilise `Math.max(Rr, 16)` quand `s.light === "golden"`.
- **Optionnel, seulement si les bords paraissent encore trop nets après la DOF.** `<ThreeCanvas shadows="variance">` avec `sun.shadow.radius = 3`, `sun.shadow.blurSamples = 12`. Cela coûte une passe de flou ; les fuites de lumière restent acceptables à ces ratios.

### 9.7 AO

**N'ajoute pas SSAOEffect.**
- La référence n'a pas d'assombrissement d'AO (section 4).
- Dans postprocessing 6.37, il demande une `NormalPass` : un second rendu complet de la scène, qui ignore nos cartes en alpha test. Il ajouterait une crasse que la référence n'a pas.
- Si tu en veux un jour pour les intérieurs :

```ts
new SSAOEffect(camera, normalPass.texture, { worldDistanceThreshold: 1, worldDistanceFalloff: 0.3,
  worldProximityThreshold: 0.4, worldProximityFalloff: 0.1, intensity: 1.2, radius: 0.05, samples: 9, rings: 4,
  luminanceInfluence: 0.7, resolutionScale: 0.5, color: new Color("#5b4a6a") })
```

Le contact vient :
- des blobs (9.4) ;
- du trait d'encre (rapport sur l'encre) ;
- des ombres portées en deux tons.

### 9.8 Boucle de calibration (premier rendu après l'implémentation)

1. Rends les mêmes images fixes de test (b_100, b_1810, b_1900, c_1450, b_1500, b_1680, c_1745).
2. Lance, dans `references/lighting` :
   - `python scripts/run_auto.py` (Q01/Q02) et `python scripts/run_pairs.py` (P01/P02). Les boîtes sont en coordonnées pixel : choisis-les de nouveau si le cadrage a bougé.
   - `python scripts/heads_ours.py`
   - `python scripts/grade.py`
3. Vérifie ces cibles :

| Mesure | Cible |
|---|---|
| Y ombre/éclairé du pont et du pavage, de jour | **.45-.55** ; par canal R ≥ G ≈ B ; sat pas plus basse qu'en zone éclairée |
| Sol golden éclairé | V ≥ .75, teinte 25-35° |
| Ombre golden | ratio B ≥ 1.3 (vise 2-3), teinte 240-260° |
| Têtes | V ≥ .86 partout, \|grad_lr\| .10-.17, grad_tb −.05 à −.13 |
| Chroma de la bande sombre, de jour | C ≥ 10, teinte 20-60° |
| split_b du coucher | ≥ +15 |

Si un ratio d'ombre rate sa cible, multiplie ce canal de `shade` par cible/mesure et recommence. Le pied (toe) du Neutral rend cela un peu non linéaire : 2 tours suffisent en général.

## 10. Les 5 changements prioritaires, classés par impact visuel

| # | Changement | Où | Ce que ça corrige |
|---|---|---|---|
| 1 | **Couleurs d'ombre en deux tons** | `shade.ts` + `twoTone()` dans `lam` / `toLambert` + lit/shade de LIGHTS | Chaque frame : les ombres de jour passent d'un gris boueux à Y .25-.38 à un ton chaud à Y .50, en gardant la saturation ; les ombres golden deviennent violet-bleu (B ≈ 3x l'éclairé) |
| 2 | **Golden en contre-jour** | soleil relatif à la caméra az 15° / el 9° + ciel de coucher et disque solaire de depth.md | Longues ombres vers la caméra, sol éclairé V ≥ .75, ombre violette, halo du soleil au bord du cadre. Les plans 11-13 passent d'un « jour orange terne » au coucher de soleil emblématique de la référence |
| 3 | **Ombrage des cartes** | `cardShade()` : pas d'emissive, teinte par scène, plancher lumineux .86, dégradé latéral vers le soleil (tête ~14 %, torse ~20-25 %), côté opposé lavande | Les têtes ne virent plus au gris (V .68 → .89) ni à l'orange sombre (sat .62 → ~.3) ; les personnages appartiennent à la lumière |
| 4 | **Key de jour de côté, figée par plan** | az 75 / el 48 | Les ombres du pont et du garde-corps traversent le cadre, et les façades ont un côté éclairé et un côté ombre, au lieu d'une lumière de face plate dans 29/41 clés |
| 5 | **Ombres au sol des personnages** | Blobs multiplicatifs doux et décalés (Y ~.6) sous chaque carte debout ; ombres portées des cartes coupées de jour, activées en golden | Remplace les silhouettes dures de fusils et de jambes ; ancre la foule au sol comme les blobs de la référence |

Le ciel et le brouillard (depth.md 6.5) se classent à côté du n° 4, mais ils y sont déjà spécifiés. Les reflets sur le métal (9.3) comptent peu.

## 11. Fichiers

| Chemin | Contenu |
|---|---|
| `lighting/scripts/` | `lib.py`, `frames.py` (67 frames d'étude), `run_pairs.py`, `run_auto.py`, `edges.py`, `contact.py`, `heads.py`, `heads_ours.py`, `glows.py`, `grade.py`, `sbs.py`, `model.py` (modèle de la chaîne de rendu + solveurs), `zooms.py`, `gridview.py` |
| `lighting/` (données) | `pairs.csv`, `pairs_auto.csv`, `edges.csv`, `contact.csv`, `heads_auto.csv`, `heads_ours.csv`, `glows.csv`, `grade_ref_study.csv`, `grade_ref_all.csv`, `grade_ours.csv`, `sky.txt`, `sun_vs_cam.txt` |
| `lighting/crops/` | comparaisons côte à côte `sbs_*.jpg` et superpositions de mesure `*_check.jpg` |
