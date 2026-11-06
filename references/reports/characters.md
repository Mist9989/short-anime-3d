# Personnages : comment la référence construit ses personnages 2D, face à ceux de notre vidéo du pont

Étude privée. Les frames de la référence, les recadrages et les comparaisons côte à côte restent dans `references/characters/`.
Aucun fichier sous `your Remotion project` n'a été modifié et aucune nouvelle image fixe n'a été rendue. Nos chiffres viennent de `toon.ts` (en lecture seule) et des images fixes déjà présentes dans `your Remotion project/out/bridge/test/`.
On n'a repris de la référence que des règles générales de construction. Aucun de ses personnages (chef cuisinier, cow-boy, têtes de patate, etc.) n'est copié.

**Réponse courte :** l'utilisateur a raison sur les corps, mais le diagnostic sur les têtes doit être corrigé.

- **Têtes.** Les têtes de la référence sont en fait *plus rondes* que les nôtres. Elles sont un peu plus larges que hautes (H/W 0.93) ; les nôtres sont des ellipses hautes (H/W 1.17). Ce qui donne aux leurs un air dessiné à la main, c'est que la forme n'est pas une ellipse parfaite :
  - un sommet du crâne légèrement pointu et une mâchoire plus pleine qui s'affine vers le menton,
  - environ 10% d'asymétrie gauche/droite et quelques degrés d'inclinaison,
  - un contour prune environ 3 fois plus épais côté bas/ombre qu'en haut,
  - les yeux et la bouche décalés vers le côté où regarde le personnage,
  - pas de joues roses et pas de reflets (catchlights) dans les yeux.
- **Corps.** Leurs adultes mesurent environ 3.5 hauteurs de tête : un torse en forme de haricot sur de longues jambes tracées d'un seul trait d'encre fin, avec des mains en points d'encre. Les nôtres font 2.7 hauteurs de tête, avec des membres environ 5 fois trop épais, des mains en boules couleur peau et de grosses bottes ovales. Ça se lit comme un « autocollant chibi ».

Couverture :
- 96 frames, tirées des 20 vidéos de la référence.
- 38 ajustements de contour de tête sur 19 vidéos : 23 vues de face et 8 vues de trois quarts sont exploitables après retrait des mauvais ajustements.
- 15 recadrages en pied sur 9 vidéos.
- 3 de nos images fixes mesurées (fusiliers, officier, foule).

---

## 1. Mesures

Unités :
- `W` = largeur de la tête (le remplissage du visage, à l'intérieur du contour).
- `HH` = hauteur de tête.
- Les angles sont des angles du canvas : 0 = droite, 90° = bas.
- Les pixels de la référence viennent de frames 720×1280 ; les nôtres, d'images fixes 540×960.

### 1.1 Contour de la tête

Le modèle d'ajustement est une superellipse avec des exposants séparés pour le haut du crâne et la mâchoire, un effilement en œuf et un renflement gauche/droite. Les points sont générés ainsi :
`X = sgn(c)|c|^(2/n), Y = sgn(s)|s|^(2/n)`, puis `X *= (1+egg*Y)*(1+asym*sgnX)`, puis `x = aX, y = bY`, puis rotation de `rot`.
`n` vaut `n_top` pour la moitié haute et `n_bot` pour la moitié basse. Les ajustements sont dans `data/heads2.json` (script `scripts/heads2.py`).

| paramètre | réf. de face, médiane (IQR), n=23 | réf. « fiables » 10 | réf. vue 3/4, n=8 | **nous** (design / image fixe) | écart |
|---|---|---|---|---|---|
| H/W | **0.93** (0.83–1.01) | 0.96 (0.94–1.02) | 1.04 | **1.17** (150/128 ; ajustement sur image fixe 1.16) | les nôtres 25% trop hautes |
| egg (nég. = plus étroit au menton) | **−0.125** (−0.15…−0.04) | −0.12 | 0.00 | 0 | effilement du menton absent |
| n_top (haut du crâne ; <2 = légèrement pointu) | **1.70** (1.40–1.97) | 1.76 | 2.31 | 2 | absent |
| n_bot (mâchoire ; >2 = plus pleine) | **2.26** (2.08–2.52) | 2.27 | 1.88 | 2 | absent |
| asym (un côté plus large) | **+0.10** (0.05–0.12) | +0.10 | ±0.1 | 0 | absent |
| inclinaison `rot` | −1° (−8.6…+3.0), propre à chaque personnage | ±2.5° | **+19°** | 0 (seulement `headTilt`) | absent |
| ondulation du contour (RMS) | **1.0% W** (0.5–1.5) | 1.2% | 0.7% | 0 (ellipse à 48 côtés) | courbes lisses ; il ne manque que de la variété de forme |

Règles qu'on en tire :
- La silhouette se renfle du côté vers lequel le visage est tourné (mâchoire/joue), et les yeux et la bouche se décalent du même côté.
- Le décalage moyen de la paire d'yeux est de **+0.08 W** (plage de +0.03 à +0.13) ; le nôtre est de 0.
- Voir `crops/compare_heads.png`. Le cyan y montre le contour ajusté, et le magenta un cercle de même rayon moyen.

### 1.2 Contour (encre)

| | référence | **nous** | écart |
|---|---|---|---|
| largeur médiane / W | **5.0% W** (10 fiables), 5.9% W (les 23) ; IQR 4.8–6.9% | 4.9% (12 / 244 en design) ; **3.3–4.6% à l'écran** (5 px sur un visage de 140 px, `c_1745`) | un peu fin à l'écran |
| rapport épais/fin (p90/p10 autour d'une tête) | **2.9–3.5** (IQR 2.5–4.2) | ~1.0–1.25 | trait uniforme, sans effilement |
| largeur selon la direction (normalisée sur la médiane de la tête elle-même ; médianes par octant) | haut-droite (−68°) **0.65**, haut-gauche (−112°) 0.74, gauche-haut (−158°) 0.88, droite-haut (−22°) 1.02, droite-bas (22°) 1.05, **bas-droite (68°) 1.11**, bas-gauche (112°) 1.00, gauche-bas (158°) 0.73 | constante 1.0 | aucun poids en bas ni côté ombre |
| angle du point le plus épais | regroupé à **50–90°**, médiane **64°** (bas-droite). Il passe en bas à gauche quand la lumière vient de la droite (`10_018` : gauche 20 px contre droite 7 px sur une tête de 361 px) | — | |
| couleur de l'encre (cœur le plus sombre) | **#201628 … #2f1d28** prune foncé (cœur médian rgb 47,29,40). Sous une lumière orange, elle se réchauffe (#5d2c19…#6e3e30) | design #221f2e ; **à l'écran #0a0014**, écrasée au noir | l'éclaircir et la rendre prune |
| traits de détail intérieurs (sourcils, bouche, vêtements) | ≈0.6–0.9× du contour ; coutures/poches des vêtements ≈0.4× | sourcils 9, bouche 8 (0.75× de 12) ; ceintures tracées en encre pleine | ok |

### 1.3 Couleur et ombrage du visage (têtes de face ; valeurs à l'écran)

| | référence | **nous** |
|---|---|---|
| remplissage | blanc **#fef9f6 / #e7edf5–#fffcfc** ; crème/peau **#ffe0b4, #f6b988, #e9c8ae** ; luma médiane **0.93** (0.76–1.0) | SKIN en design #f7d6b6. À l'écran **#af9886, luma 0.62** (fusiliers `c_1745`) ; #e8c5a5, 0.81 (officier `c_1800`) |
| ombrage | **croissant doux** du côté opposé à la lumière. Plat jusqu'à r≈0.6R, puis décroît entre 0.6→0.8R jusqu'à **0.88–0.89×** la valeur éclairée. Largeur angulaire à mi-hauteur (FWHM) ≈150° autour de la direction de l'ombre (surtout 45–105°). Pas de bord net de type cel | aucun (plat) |
| teinte de l'ombre | têtes blanches ×(0.92, 0.90, **0.96**), soit lavande (#fffcfc→#f1e6f0, #edf1f7→#d9dcf2). Peau ×(0.96, 0.86, 0.84) (#ffe7bd→#f5c69f). Elle suit la lumière de la scène (liseré orange au casino) | — |
| texture / grain | rien de mesurable (le résidu est au niveau du bruit JPEG) ; les visages sont propres | aucun |
| joues roses | **0 sur ~40 visages examinés**. Un personnage a des points bruns (taches de rousseur/barbe naissante) | **joues roses sur 11 des 14 expressions** (#f3aa98) |
| points de reflet (catchlights) dans les yeux | **0 sur ~40** | reflet blanc r4 sur chaque œil en point |

### 1.4 Traits du visage (÷ W ; y mesuré depuis le centre de la tête, + = vers le bas)

| | référence (13 têtes) | **nous** (`faceFront`, s=1, W=244) | écart |
|---|---|---|---|
| écart des yeux, de centre à centre | **0.26** (0.19–0.28) | **0.38** | +45%, yeux trop écartés |
| hauteur des yeux | **0.00** (−0.06…+0.03) | +0.025 | ok |
| œil par défaut | **demi-disque sous paupière** : trait de paupière de 0.18 de large plus un demi-disque sombre en dessous (0.18×0.10–0.12), ce qui donne un air pince-sans-rire. Aussi des tirets plats 0.16–0.18×0.03–0.05, et des yeux en points sous forme d'ovales verticaux ≈0.09×0.13 | point rond 0.107 + reflet blanc | mauvais choix par défaut |
| yeux de stupeur (shock) | cercles de sclère blancs de **0.21–0.24 de diamètre**, presque jointifs (écart ≈0.02) ; petites pupilles en points ≈0.06 | ellipses blanches 0.17×0.2, écart 0.2 | yeux trop petits et trop écartés |
| sourcils | **0.17–0.18 de long × 0.045–0.055 d'épaisseur**, effilés, à **y −0.20** (0.18–0.24 au-dessus des yeux). Souvent un sourcil plus haut (sceptique) | 0.17 × 0.037, uniformes, à y −0.12 | fins, bas, symétriques |
| position de la bouche | **y +0.19** (0.17–0.31), x décalé vers le côté du regard | y +0.24, centrée | |
| bouche neutre | tiret court **0.09–0.14 × 0.04–0.06**, souvent incliné (sourire en coin) | 0.18 × 0.033 | trop large |
| grand sourire / bouche ouverte | 0.22–0.42 × 0.10–0.17 avec un **rectangle de dents** blanc et des séparations à l'encre ; bouche en O 0.19–0.21 × 0.24–0.29 | bouche en D 0.28×0.18 + langue | à peu près ok |
| intérieur de la bouche | **#54212a / #5c222b** | #5a1e28 | ok |
| nez / oreilles | aucun en vue de face. Vue 3/4 : un petit trait de nez du côté du regard ; les cheveux enveloppent l'arrière de la tête | vue de profil : ellipse en bosse couleur peau (nez en patate) | supprimer la bosse |

### 1.5 Corps

Relevé à l'œil sur des recadrages quadrillés (±5 px, environ ±3% HH). Mesuré jusqu'au sommet de la tête, sous l'éventuel chapeau. Les recadrages sont `crops/bodies/b01…b15`.

| personnage | total HH | menton → bas du torse (HH) | bas du torse → semelle (HH) | largeur du torse / W |
|---|---|---|---|---|
| femme 03_064.5 | 3.66 | 1.14 | 1.51 | 0.74 |
| homme chauve 04_031.5 | 3.5 | 1.05 | 1.48 | 0.90 |
| homme au chapeau 04_031.5 | ~3.4 | 1.12 | 1.39 | 0.97 |
| papa 10_012.0 | 3.3 | 0.90 | 1.39 | 0.85 |
| manteau 18_015.0 | 3.45 | (manteau) | — | 0.80 |
| gars à casquette 18_015.0 | 3.3 | 1.17 | 1.18 | 0.69 |
| marcheur 3/4 19_016.5 | 3.6 | 1.10 | 1.54 | 0.68 |
| soldat en uniforme 12_057.0 | ~3.6 | 1.06 | ~1.4 | 0.71 |
| robe longue 13_009.0 | 3.5 | 2.0 (robe longue) | 0.48 | 0.87 |
| assis 12_003.0 | — | 1.23 | (assis) | 0.58 |
| **médiane adultes** | **3.5** (3.3–3.7) | **1.1** (0.9–1.23) | **1.4** (1.2–1.54) | **0.80** (0.58–0.97) |
| enfants 03_033.0 (×3) | **2.7–3.0** | 0.7–1.0 | 1.0–1.15 | 0.47–0.84 |
| **nous, tous les adultes** (`bodyFront`) | **2.7** | **0.83** | **0.86** | 0.77 |

Membres (÷ W) :

| partie | référence | **nous** | écart |
|---|---|---|---|
| jambes | **un seul trait d'encre de 0.05–0.08 W (médiane 0.055)**, sans genoux, légère courbe, posture en A (pieds écartés de ≈0.45 W, hanches ≈0.3 W). Les gros plans montrent parfois un tube fin cerclé d'encre, de même largeur totale | tube 46 + bord d'encre 21.6 = **0.28 W** (à l'écran 35 px sur un visage de 124 px) | **5× trop épaisses** |
| bras | trait d'encre **≈0.05 W**, partent de l'intérieur des flancs du torse, sans épaules ni coudes | 40 + 21.6 = **0.25 W** | 5× |
| mains | **points d'encre pleins de 0.08–0.15 W** (médiane ≈0.11), sans doigts ; les accessoires sont tenus par le point | boules couleur peau r24 + contour = **0.23 W** | 2× trop grosses, mauvaise couleur |
| pieds | traits courts à bouts ronds de **0.15–0.25 W de long, ≈0.07 W d'épaisseur**, tournés vers l'extérieur (de face) ou vers l'avant (de profil) | bottes ovales de **0.39 × 0.26 W** | ~2× |
| cou | aucun ; la tête recouvre le haut du torse | aucun | ok |

Forme du torse :
- **Référence :** un **haricot/capsule** vertical. Le haut est plus étroit et caché sous la tête. Le torse est le plus large à 60–70% de sa hauteur, et le bas est entièrement arrondi (rayon ≈ la moitié de la largeur). Le contour a le même comportement épais-fin que celui de la tête.
- **Le nôtre :** un rectangle arrondi, au rayon d'angle de 58 (0.33 de la largeur), qui paraît cubique.

Ombrage du torse (profils par colonne, `scripts/torso_profile.py`) :
- Beaucoup plus marqué que sur les visages : du côté éclairé au côté ombre, **1.0 → 0.55–0.66**, en dégradé doux.
- Environ la moitié des torses ont un **liseré clair** (0.8–0.97) juste à l'intérieur du bord côté ombre (robe longue 13_009, jaune 19_016.5, soldat bleu 12_057).
- Le nôtre : une seule couleur plate plus, en bas, une bande plus sombre et nette de 30 unités (`shade 0.8`).

Détails des vêtements :
- Au plus environ 5 éléments par torse : boutons (points ≈0.04–0.06 W), poche, ceinture, cravate, col, rayures.
- Dessinés en aplats avec de fins traits intérieurs (≈0.4× le contour).
- Le soldat en uniforme (12_057) a 4 points laiton, une ceinture sombre à petite boucle et une casquette souple.
- Le nôtre a le même niveau de détail (baudriers croisés et 4 boutons). Cette partie est bonne.

Chapeaux et accessoires :
- Les chapeaux sont posés **bas** et couvrent les 25–40% supérieurs de la tête. Leur bord inférieur suit le crâne en une courbe de « sourire » peu creusée (flèche ≈0.05 W). Ils s'inclinent avec la tête, portent le même contour, et le bord dépasse du côté du regard.
- Les accessoires sont tenus par des mains en points au bout de bras fins, et leur contour fait ≈0.6–1.0× l'épaisseur de trait.
- Notre shako est un trapèze à base plate plus large que la tête. Notre fusil est un tube de 22 unités avec un bord de 21.6 (0.18 W).

Poses :
- Inclinaison du torse 3–8°. Inclinaison de la tête en général ±5° (jusqu'à 19° en vue 3/4).
- Un bras fait en général quelque chose (il montre, tient, se lève) pendant que l'autre pend.
- Pieds tournés vers l'extérieur. Les corps sont rarement parfaitement symétriques.
- Les nôtres : droits et symétriques en miroir.

Ombres au sol :
- De vraies ombres portées 3D des cartes (longues au coucher du soleil, `04_031.5`), plus des taches de contact sombres et douces sous les pieds (`03_033.0`).
- C'est un sujet d'éclairage. Garde notre ombre portée et ajoute une tache de contact de 0.5 W × 0.06 W, alpha 0.3, floutée.

Vues de profil et 3/4 :
- Les traits du visage glissent de 0.1–0.15 W vers le côté du regard ; il y a un petit trait de nez ; les cheveux ou les chapeaux enveloppent l'arrière.
- Le torse devient un haricot plus étroit (≈0.6 W).
- Les jambes restent deux traits fins, la plus éloignée plus sombre.

### 1.6 L'écart en clair

1. **Proportions.** Nos adultes ont des proportions d'enfant : 2.7 HH, avec des jambes à 61% et un torse à 75% des longueurs de la référence.
2. **Membres.** Bras et jambes sont 5× trop épais, les mains 2× trop grosses et couleur peau, et les bottes sont de gros ovales. C'est l'aspect « autocollant bon marché » auquel réagit l'utilisateur.
3. **Têtes.** Ce sont des ellipses parfaites et symétriques, 25% trop hautes : pas d'effilement du menton, pas de différence crâne/mâchoire, ni inclinaison ni renflement latéral, traits pile au centre.
4. **Contour.** Largeur uniforme, et écrasé au noir pur à l'écran. Celui de la référence est prune, avec un rapport épais/fin d'environ 3:1, plus lourd en bas et côté ombre.
5. **Visages.** Les yeux sont 45% trop écartés. Chaque visage a des joues roses et des reflets dans les yeux (la référence n'a ni l'un ni l'autre). L'œil par défaut est un point mignon au lieu d'un œil pince-sans-rire sous paupière. Les sourcils sont fins et les bouches larges.
6. **Valeurs.** Au rendu, les visages sortent à une luma de 0.62–0.81, contre 0.93 dans la référence. Il n'y a ni ombrage en croissant sur les têtes ni dégradé sur les torses.

---

## 2. Spécification de dessin pour nos personnages (unités de design 600×1000, semelles à y=975)

### 2.1 Gabarits

`W = 2a` est la largeur du tracé de la tête ; `HH = 2b`.

| gabarit | utilisé pour | tête a / b (W × HH) | menton→bas du torse | jambes (bas du torse→semelle) | total | largeur du torse |
|---|---|---|---|---|---|---|
| **adult** (adulte) | fusiliers, parent, habitants | 118 / 111 (236 × 222) | 1.10 HH = 244 | 1.40 HH = 311 | **3.5 HH** ; sommet du crâne à y≈198 | 0.80 W = 189 |
| **stout** (trapu) | officier | 118 / 111 | 1.15 HH = 255 | 1.32 HH = 293 | 3.47 HH | 0.92 W = 217, ventre plus rond |
| **kid** (enfant) | enfant | 112 / 108 (224 × 216) | 0.85 HH = 184 | 1.00 HH = 216 | **2.85 HH** ; sommet du crâne à y≈359 | 0.72 W = 161 |

Les têtes d'enfant ont presque la taille d'une tête d'adulte ; seul le corps est plus court, comme dans la référence. L'actuel `head: 1.15` doit devenir un drapeau `build`.

### 2.2 Contour de la tête (`blobPts` / `headBlob`)

Valeurs de base, plus une variation propre à chaque personnage, tirée d'une graine (`who.i`) :

| paramètre | base de face | dispersion par personnage | vue de profil | vue 3/4 |
|---|---|---|---|---|
| b/a | 0.94 | ±0.04 | 0.94 | 1.02 |
| egg | −0.12 | ±0.03 | −0.10 | 0 |
| nTop | 1.75 | ±0.15 | 1.8 | 2.2 |
| nBot | 2.30 | ±0.15 | 2.3 | 1.9 |
| asym | +0.08 × facing (signe aléatoire quand facing = 0) | 0.06–0.10 | **+0.12** (mâchoire vers l'avant) | +0.08 |
| rot | ±4° aléatoire | — | +3° | ±12° vers le côté du regard |
| noise | 0.8% du rayon, harmoniques 2–4, phases tirées de la graine | — | idem | idem |

### 2.3 Épaisseurs de trait (u = 1% de W ≈ 2.36 unités pour les adultes)

| trait | épaisseur | règle |
|---|---|---|
| contour de la tête et du torse | **w0 = 5u ≈ 11.8** | `w(θ) = w0·(1 + 0.45·cos(θ − θthick))`, ce qui donne 6.5 au plus fin et 17.1 au plus épais. `θthick = atan2(−sin(light) + 0.8, −cos(light))`, soit 65° pour une lumière venant d'en haut à gauche (cohérent avec les 64° mesurés) |
| chapeaux et accessoires | 0.85 × w0, uniforme, avec jointures arrondies | — |
| jambes | 5.8u ≈ 13.7, couleur `mix(pants, INK, 0.55)` | ni tube ni bord ; légère courbure |
| pieds | 7.5u ≈ 17.7 d'épaisseur, 16u ≈ 38 de long | vers l'extérieur en vue de face, vers l'avant en vue de profil |
| bras | 5.2u ≈ 12.3, couleur `mix(jacket, INK, 0.5)` | bras arrière dessiné avant le torse, bras avant après |
| mains | point d'encre r = 5.5u ≈ 13 | — |
| sourcils | effilés, 5u côté intérieur → 2.5u côté extérieur, 17u de long | — |
| paupière / tiret / arcs des yeux | 3.8u | — |
| trait de bouche | 4u | — |
| traits intérieurs des vêtements (bords des ceintures, poches) | 1.5–1.8u | — |

Épaisseur minimale : au palier de texture k=0.4, garde chaque trait ≥ 1.5 / k unités de design (≈4) pour que les traits survivent au mip-mapping.

### 2.4 Couleurs

| rôle | hex | note |
|---|---|---|
| INK | **#241726** | remplace #221f2e ; le cœur de la référence est #201628–#2f1d28 |
| peaux (remplissages) | **#ffe2c2, #f5c9a0, #ecd0b6, #c99067** | plus claires et plus propres qu'aujourd'hui ; doivent arriver à une luma ≥0.85 à l'écran |
| ombre de la peau | `mul(skin, [0.96, 0.86, 0.84])`, p. ex. #ffe2c2 → #f5c2a3 | croissant doux uniquement |
| tête pâle « blanc habitants » (optionnelle) | #fbf8f4 / ombre `mul(…, [0.92, 0.90, 0.96])` = #e7dfea | lavande |
| veste courte vert fusilier (coatee) | **#357650** | éclaircie depuis #2f6a43 pour rester lisible après le rendu ; ombre `mul(…, SH_CLOTH)` = #234e3b |
| baudriers croisés | **#f1efe6**, bord INK 1.8u | baudriers blancs, comme demandé dans le brief |
| boutons des fusiliers | #d9dde0 (étain) | officier : #e8c45a (laiton) |
| pantalon / traits des jambes | #3d4440 → trait #2f2b32 | — |
| bottes / pieds | INK | enfant : #f4f1ea avec bord d'encre |
| shako | corps **#3a3d47**, ombre #24262d, visière #16171b, insigne #c9ccd2, pompon #2b7a4b ; bandeau de l'officier #e8c45a | plus clair que le noir pour que le contour prune se lise |
| écharpe de l'officier | #c0353a | moustache #4a3020 |
| enfant | veste #f08a2c, pantalon #3b5b9a, casquette #e2453c (visière ×0.8) | — |
| parent | manteau #7b5ac9, cheveux #5a3b2a, chaussures #5a3b2a | — |
| bouche / langue / sclère / sueur | #5a1e28 / #e86e78 / #ffffff / #9fd4ff | à garder |
| CHEEK #f3aa98 | **à supprimer** | la référence n'a pas de joues roses |

### 2.5 Bibliothèque de visages

Disposition :
- Yeux à x = cx + 7u·facing ± 13u (shock : ±12u), y = cy.
- Sourcils à y = cy − 20u.
- Bouche à x = cx + 8u·facing, y = cy + 20u.

Les valeurs des sourcils sont des décalages `[inner, outer]` (intérieur, extérieur) en u ; + = vers le bas.

| expr | yeux | sourcils | bouche |
|---|---|---|---|
| neutral | demi-disque **sous paupière** (rx 7u, ry 6u sous un trait de paupière de 18u) | [0, −1] | tiret de 11u, incliné de 0.8u (sourire en coin) |
| stern | sous paupière | **[+3, −2]** (V) | arc renfrogné 13×3.5u |
| grin | arcs joyeux ∩ 16×6u | [−3, −3] | D 24×8u + bande de dents blanches 3u |
| laugh | yeux plissés > < | [−4, −4] | D ouvert 32×11u + langue |
| whistle | tirets fermés | [−2, −4] | petit « o » 7×8u, décalé de +4u |
| nervous | petits ovales 6×9u | **[−3, +2]** (inquiet) | vague de 18u, amplitude 1.5u ; goutte de sueur |
| shock | **cercles blancs de 22u presque jointifs**, pupilles r3u | arcs relevés −7u | O haut 18×22u |
| relief | ∩ joyeux | [−2, +1] | arc de grand sourire 22×6u |
| relief_open | ∩ joyeux | [−2, +1] | D 24×8u |
| dazed | spirales r≈8u | [−3, +2] | petite vague |
| pained | plissé (œil arrière) + sous paupière (œil avant) | [−3, +2] | rectangle de dents 24×8u, 3 séparations |
| smile | ovales en points 7.6×11u | [0, −1] | arc de sourire en coin 14×4u |
| smile_closed | ∩ joyeux | [0, −1] | arc de sourire 16×4.5u |
| lick | ovales en points, regard de côté | [0, −1] | sourire + langue 7×9u au coin |

Pour toutes les expressions : pas de joues roses, pas de reflets dans les yeux. Particularité optionnelle, propre à un personnage : le sourcil côté regard est placé 2u plus haut (sceptique).

### 2.6 Construction du corps, vue de face

Ordre de dessin :
1. Jambes et pieds.
2. Les deux bras et leurs mains en points. Ils sortent de derrière le haricot ; ne dessine un bras après le torse que si la main est devant le corps (elle tient un accessoire).
3. Torse : remplissage ombré → vêtements découpés à la forme du torse → anneau d'encre.
4. Tête : remplissage ombré → anneau d'encre.
5. Chapeau.
6. Visage, dessiné en dernier pour que les sourcils puissent chevaucher un bord de chapeau.

Placement :
- Hanches à torsoBot − 0.12 HH, x ±15u ; pieds à x ±22u.
- Les bras pendent **à l'extérieur** du haricot, comme dans la référence :
  - épaule à (±0.85·Ta, chin + 0.12 HH),
  - coude à ±(1.12·Ta + 4u), y + 0.48 HH,
  - main 3u plus à l'extérieur, à chin + 1.04 HH.
- La première prévisualisation mettait les bras à l'intérieur du torse ; ils disparaissaient derrière.
- Blob du torse : `a = (tw/2)·W/1.06, b = (torsoBot − (chin − 0.25 HH))/2, nTop 2.2, nBot 2.6, egg +0.12, asym 0.04·facing`.
- Inclinaison du corps : fais pivoter tout ce qui est au-dessus des hanches de 3–6° (les marcheurs alternent ±2° au rythme du pas).

### 2.7 Vue de profil (`bodySide`)

- **Tête :** même blob, avec asym +0.12 et rot +3°.
- **Visage :** un seul œil à hx + 27u, y = hy (sous paupière ou en point). Le sourcil est un trait effilé de [ex−7u, ey−20u] à [ex+8u, ey−21u]. La bouche est un tiret de [hx+26u, hy+21u] à [hx+36u, hy+20u]. Trait de nez optionnel de [hx+44u, hy+4u] à [hx+47u, hy+9u] puis [hx+43u, hy+10u], épaisseur 3u. **Pas de nez en bosse couleur peau, pas d'oreille.**
- **Torse :** haricot avec a = 0.31 W, egg +0.10, asym +0.06 (ventre en avant), inclinaison +4° en marche.
- **Jambes :** cuisse = tibia = 0.72 HH (160), trait de 5.8u. Jambe éloignée en `mix(pants, INK, 0.75)`, jambe proche à 0.55. Les pieds sont des traits de 16u tournés vers l'avant. La cinématique de marche actuelle reste ; seules les longueurs et les épaisseurs changent.
- **Bras :** un seul trait de 5.2u, long de 0.95 HH, qui balance de ±30° et se termine par une main en point.
- **Shako :** trapèze avec la visière en coin vers l'avant (16u de long) et le pompon en haut à l'avant.

### 2.8 Couche d'ombrage

- **Tête :**
  - aplat, puis un croissant doux : la forme remplie de la couleur d'ombre, puis une copie décalée de 0.30R vers la lumière, dans la couleur de base, avec `blur(0.09R)`, découpée à la forme ;
  - on obtient ainsi l'ombre pleine seulement dans les ~30% extérieurs du côté opposé, et elle s'estompe vers ±75–110° ;
  - multiplicateurs SH_SKIN [0.96, 0.86, 0.84] ou SH_WHITE [0.92, 0.90, 0.96].
- **Torse :**
  - même méthode, mais plus large : décalage 0.55R, flou 0.18R, SH_CLOTH [0.64, 0.66, 0.74] ;
  - liseré de contre-jour (rim) optionnel : un mince filet de 2u le long du bord côté ombre, en `mix(jacket, #ffffff, 0.45)` à 55% d'alpha.
- **Direction de la lumière :**
  - `light` = angle du canvas d'où vient la lumière principale (key), calculé par plan dans cast.ts et quantifié par pas de 45° ;
  - le côté épais du contour suit `thickAngle(light)`.
- **Grain :**
  - non mesurable dans la référence ;
  - si on en veut, au plus 2% de bruit en multiplication, découpé aux formes ; **désactivé** par défaut.
- **Pas de palier cel net :** le bord mesuré est doux.

### 2.9 Appliquer les règles à nos personnages

**Fusiliers (1831) :**
- Gabarit adulte. Veste courte (coatee) en haricot #357650 avec baudriers croisés blancs :
  - deux bandes de 5.5u, du haut de l'épaule (±0.75·Ta à chin − 0.05 HH) jusqu'à la hanche opposée (±0.8·Ta à torsoBot − 0.1 HH),
  - découpées à la forme du torse, pour qu'elles épousent le haricot ;
  - une petite plaque en étain de 7u à leur croisement est optionnelle.
- 4 boutons en étain r 2.2u, espacés de 0.2 HH, décalés de 2u vers le côté du regard.
- Les jambes sont des traits sombres couleur pantalon ; les pieds sont des traits d'encre.
- **Shako :**
  - la base est posée **0.25 HH sous le sommet du crâne**, demi-largeur 46u, le bord inférieur se creuse de 3u (il suit le crâne) ;
  - sommet évasé de demi-largeur 52u, hauteur 0.56 HH (≈124) ;
  - remplissage feutre noir #3a3d47 avec une ombre en croissant ; la visière est une demi-ellipse 34u × 0.045 HH, #16171b ;
  - l'insigne est un anneau en cor de chasse de 6u #c9ccd2 ; pompon vert r 7u au sommet ;
  - il s'incline avec la tête, ±2° en plus.
  - Sous tout chapeau à bord, les sourcils descendent à −17u, comme dans la référence (casquette de police 10_018 : sourcils à −0.15 W). Le visage est dessiné après le chapeau.
- **Fusil :** bande de bois de 5u (#7a4b2a, bord 1.5u) partant de (300+30u, torsoBot − 0.05 HH) et montant jusqu'à 0.35 HH au-dessus du sommet du crâne. Bande d'acier de 2.4u (#8d949c) sur les 40% du haut. La main avant en point est posée sur la crosse à 45% de sa hauteur.
- Variantes à moustache (peaux 1 et 3) : deux virgules effilées de 9u de long chacune, 4u→1.5u, #4a3426 / #2a201a, largeur totale ≈0.36 W. Les actuelles font 0.53 W.

**Officier :**
- Gabarit trapu (stout), mêmes règles pour le visage.
- `shako_tall` : hauteur 0.66 HH, bandeau doré de 0.06 HH à 0.07 HH sous le sommet, insigne en laiton.
- Écharpe cramoisie : une bande de 0.13 HH à torsoBot − 0.32 HH, découpée à la forme du haricot, avec le nœud qui pend du côté du regard.
- Épée : une bande argentée de 3u (bord 1.2u) partant de la hanche arrière, inclinée à 25°.
- Moustache en guidon : deux traits effilés de 10u chacun, 5u→1.5u, #4a3020.
- Par défaut, expression stern : yeux sous paupière avec sourcils en V.

**Enfant :**
- Gabarit enfant (2.85 HH). Torse en haricot orange de 0.72 W, traits de pantalon bleus, traits de chaussures blancs (avec un bord d'encre de 1.5u).
- **Casquette :**
  - dôme = le haut du crâne de la tête elle-même, au-dessus de 0.30 HH, agrandi de 3% vers l'extérieur, en #e2453c ;
  - la visière avant est une demi-ellipse 32u × 0.06 HH, teinte ×0.8, décalée de 4u vers le côté du regard ;
  - une visière latérale en coin couvrait un œil dans la prévisualisation, elle a donc été abandonnée.
- `swingKid` applique aujourd'hui une translation de (360, 715) en unités de design. Avec le nouveau gabarit, la hanche est à y ≈ 975 − 1.0·216 − 0.12·216 ≈ 733 ; mets donc à jour le décalage de l'assise à `rope + 20 − 733·0.92`.

**Parent :**
- Gabarit adulte, haricot en manteau violet, chaussures marron.
- Cheveux : le haut du crâne au-dessus de 0.42 HH, agrandi de 3% vers l'extérieur, #5a3b2a, avec 3 festons sur le bord inférieur et 1–2 mèches à l'encre de 1.2u. La raie est du côté du regard.

**Habitants :**
- Gabarit adulte. Manteaux comme aujourd'hui ; peaux tirées de la nouvelle liste SKINS.
- **Haut-de-forme :** base de demi-largeur 0.31 W, posée 0.22 HH sous le sommet du crâne ; 0.8 HH de haut avec un léger évasement ; bord en ellipse 0.45 W × 0.05 HH ; ruban = manteau ×0.9.
- **Bonnet :** un blob de 1.15× la tête dessiné derrière elle, un arc de bord de 7u au-dessus du front et un ruban de 2u sous le menton.
- **Robe :** un haricot en cloche (`egg +0.35`, nBot 3) de chin − 0.2 HH jusqu'à 0.35 HH au-dessus des semelles, avec dessous deux courts traits d'encre pour les chevilles.

---

## 3. Recette d'implémentation (TypeScript, style toon.ts)

Où va chaque changement :

| fichier / emplacement | changement |
|---|---|
| `toon.ts` : `INK`, `SKINS`, `CHEEK` | `INK = "#241726"`, nouvelles SKINS, `CHEEK` inutilisé |
| `toon.ts` : `Outfit`, `RIFLEMAN`, `OFFICER`, `KID` | ajoute `build?: "adult" \| "stout" \| "kid"`. RIFLEMAN reçoit `belt: "#f1efe6"`, `jacket: "#357650"`. OFFICER reçoit `build: "stout"`. KID reçoit `build: "kid"` (le `head: 1.15` disparaît) |
| `toon.ts` : classe `Pen` | ajoute `clip`, `shadedFill`, `inkRing`, `band`, `rimLight` |
| `toon.ts` : fonctions utilitaires | nouvelles `mix`, `mul`, `rnd`, `Blob`, `blobPts`, `headBlob`, `thickAngle`, `taper`, `rotPts` |
| `toon.ts` : visages | `faceFront` → `faceV2` + table `FACE` |
| `toon.ts` : chapeaux | `hatFront` → `hatV2` |
| `toon.ts` : corps | `bodyFront` → `bodyFrontV2` (march/stroll/stand ci-dessous ; sit/fall/dress utilisent les mêmes pièces avec les anciennes poses remises à l'échelle). `bodySide` selon le §2.7. `swingKid` reçoit le nouveau décalage |
| `toon.ts` : `FrontOpts` / `SideOpts` | ajoute `light?: number; facing?: -1 \| 0 \| 1; seed?: number` |
| `cast.ts` : `person()` | passe `seed: who.i`, `facing` (signe de la direction de marche · `cam.right` pour les marcheurs en diagonale, sinon 0) et `light: light2D(cam, sunDir, mirror)` dans `fo`/`so`. Ils entrent automatiquement dans la clé de texture via `fkey()` |
| `cast.ts` : matériau (ligne 65) | les visages sortent à une luma de 0.62–0.81 à cause de `MeshLambert + emissiveIntensity 0.36`. Cible : ≥0.85 éclairé et ≈0.75 dans l'ombre, p. ex. `emissiveIntensity: 0.75` avec `color: 0x808080`. Le croissant peint porte alors le volume. Ce point recoupe les rapports sur l'éclairage et l'étalonnage ; vérifie avec eux avant de le changer |

```ts
// ===================== toon.ts — character construction v2 =====================
export const INK = "#241726";                         // dark plum; reference ink core #201628..#2f1d28
export const SKINS = ["#ffe2c2", "#f5c9a0", "#ecd0b6", "#c99067"];
const SH_SKIN: [number, number, number] = [0.96, 0.86, 0.84];   // measured shadow/lit ratio, skin heads
const SH_WHITE: [number, number, number] = [0.92, 0.9, 0.96];   // white heads: lavender shadow
const SH_CLOTH: [number, number, number] = [0.64, 0.66, 0.74];  // torsos: lit -> shadow side ~0.6

export const mul = (c: string, m: [number, number, number]) => {
  const n = parseInt(c.slice(1), 16);
  const ch = (v: number, k: number) => Math.min(255, Math.round(v * k)).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 255, m[0])}${ch((n >> 8) & 255, m[1])}${ch(n & 255, m[2])}`;
};
export const mix = (a: string, b: string, t: number) => {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t).toString(16).padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
};
/** deterministic per-character random in [0, 1) */
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const rotPts = (pts: P2[], a: number, cx: number, cy: number): P2[] =>
  pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);

// ---------------- contour ----------------
export type Blob = { a: number; b: number; nTop: number; nBot: number; egg: number; asym: number; rot: number; noise: number; seed: number };

/** superellipse "bean": separate crown / jaw exponents, egg taper (neg = narrower chin), one-side bulge, soft noise.
 *  Points run right -> down -> left -> up (clockwise on screen), 96 per contour. */
export const blobPts = (cx: number, cy: number, B: Blob, n = 96): P2[] => {
  const ph = [rnd(B.seed, 11), rnd(B.seed, 12), rnd(B.seed, 13)].map((v) => v * Math.PI * 2);
  const pts: P2[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), e = 2 / (s < 0 ? B.nTop : B.nBot);
    let X = Math.sign(c) * Math.abs(c) ** e;
    const Y = Math.sign(s) * Math.abs(s) ** e;
    X *= (1 + B.egg * Y) * (1 + B.asym * Math.sign(X));
    const r = 1 + B.noise * (Math.cos(2 * t + ph[0]) + 0.7 * Math.cos(3 * t + ph[1]) + 0.5 * Math.cos(4 * t + ph[2]));
    const x = B.a * X * r, y = B.b * Y * r;
    pts.push([cx + x * Math.cos(B.rot) - y * Math.sin(B.rot), cy + x * Math.sin(B.rot) + y * Math.cos(B.rot)]);
  }
  return pts;
};

/** measured head: H/W 0.94, slightly pointed crown (1.75), fuller jaw (2.3), chin taper -0.12, 8% bulge to the facing side */
export const headBlob = (seed: number, a = 118, facing = 0): Blob => ({
  a, b: a * (0.94 + 0.08 * (rnd(seed, 1) - 0.5)),
  nTop: 1.75 + 0.3 * (rnd(seed, 2) - 0.5), nBot: 2.3 + 0.3 * (rnd(seed, 3) - 0.5),
  egg: -0.12 + 0.06 * (rnd(seed, 4) - 0.5),
  asym: (0.06 + 0.04 * rnd(seed, 5)) * (facing || (rnd(seed, 6) < 0.5 ? -1 : 1)),
  rot: rad(8 * (rnd(seed, 7) - 0.5)), noise: 0.008, seed,
});

/** thickest outline direction: away from the light, pulled toward the ground (64° measured for upper-left light) */
export const thickAngle = (light: number) => Math.atan2(-Math.sin(light) + 0.8, -Math.cos(light));

/** tapered stroke, thick end at a: brows, moustache halves */
const taper = (p: Pen, a: P2, b: P2, wa: number, wb: number, col = INK) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  p.poly([[a[0] + nx * wa / 2, a[1] + ny * wa / 2], [b[0] + nx * wb / 2, b[1] + ny * wb / 2],
    [b[0] - nx * wb / 2, b[1] - ny * wb / 2], [a[0] - nx * wa / 2, a[1] - ny * wa / 2]], col, 0);
  p.dot(a[0], a[1], wa / 2, col); p.dot(b[0], b[1], wb / 2, col);
};
```

Ajoute ces méthodes dans `class Pen` :

```ts
  /** draw with a closed shape as clip */
  clip(pts: P2[], fn: () => void) { const g = this.g; g.save(); this.path(pts, true); g.clip(); fn(); g.restore(); }

  /** flat fill + soft crescent on the side away from the light (light = canvas angle the light comes FROM).
   *  shape in the shadow colour, then a copy moved toward the light in the base colour, blurred, clipped. */
  shadedFill(pts: P2[], base: string, shadow: string, light: number, R: number, shift = 0.3, soft = 0.09) {
    const g = this.g, m = g.getTransform(), k = Math.hypot(m.a, m.b);
    const dx = Math.cos(light) * shift * R, dy = Math.sin(light) * shift * R;
    this.clip(pts, () => {
      this.path(pts, true); g.fillStyle = shadow; g.fill();
      g.filter = `blur(${(soft * R * k).toFixed(1)}px)`;
      this.path(pts.map(([x, y]) => [x + dx, y + dy] as P2), true); g.fillStyle = base; g.fill();
      g.filter = "none";
    });
  }

  /** thick-thin ink ring: w(θ) = w0 (1 + k cos(θ − thick)), θ from the contour centroid (canvas angles) */
  inkRing(pts: P2[], w0: number, thick: number, k = 0.45, col = INK) {
    const n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; }
    const out: P2[] = [], inn: P2[] = [];
    pts.forEach((q, i) => {
      const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      let nx = b[1] - a[1], ny = a[0] - b[0];                       // outward normal for clockwise-on-screen contours
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const h = 0.5 * w0 * (1 + k * Math.cos(Math.atan2(q[1] - cy, q[0] - cx) - thick));
      out.push([q[0] + nx * h, q[1] + ny * h]); inn.push([q[0] - nx * h, q[1] - ny * h]);
    });
    const g = this.g;
    const trace = (r: P2[]) => { r.forEach(([x0, y0], i) => { const [x, y] = this.P(x0, y0); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); };
    g.beginPath(); trace(out); trace(inn.reverse());
    g.fillStyle = col; g.fill("evenodd");
  }

  /** flat strap with a thin ink rim (cross belts, sash, rifle parts) */
  band(pts: P2[], fill: string, w: number, rim: number) {
    const g = this.g; g.lineCap = "butt"; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = INK; g.lineWidth = w + 2 * rim; g.stroke();
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  }

  /** optional: thin light rim just inside the shadow-side edge (seen on about half the reference torsos) */
  rimLight(pts: P2[], col: string, light: number, w: number, alpha = 0.55) {
    const g = this.g, dx = Math.cos(light) * w, dy = Math.sin(light) * w;
    this.clip(pts, () => {
      g.beginPath(); g.rect(-5000, -5000, 10000, 10000);
      pts.map(([x, y]) => this.P(x + dx, y + dy)).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath(); g.globalAlpha = alpha; g.fillStyle = col; g.fill("evenodd"); g.globalAlpha = 1;
    });
  }
```

Bibliothèque de visages :

```ts
type EyeK = "dot" | "small" | "lid" | "happy" | "dash" | "squeeze" | "shock" | "spiral";
/** eyes [back, front], brows [inner, outer] offsets in u (+ = down), mouth kind */
const FACE: Record<Expr, { eye: [EyeK, EyeK]; brow: [number, number]; mouth: string }> = {
  neutral: { eye: ["lid", "lid"], brow: [0, -1], mouth: "dash" },
  stern: { eye: ["lid", "lid"], brow: [3, -2], mouth: "frown" },
  grin: { eye: ["happy", "happy"], brow: [-3, -3], mouth: "grin" },
  laugh: { eye: ["squeeze", "squeeze"], brow: [-4, -4], mouth: "laugh" },
  whistle: { eye: ["dash", "dash"], brow: [-2, -4], mouth: "o" },
  nervous: { eye: ["small", "small"], brow: [-3, 2], mouth: "wave" },
  shock: { eye: ["shock", "shock"], brow: [-7, -6], mouth: "O" },
  relief: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "smileWide" },
  relief_open: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "grin" },
  dazed: { eye: ["spiral", "spiral"], brow: [-3, 2], mouth: "wave" },
  pained: { eye: ["squeeze", "lid"], brow: [-3, 2], mouth: "teeth" },
  smile: { eye: ["dot", "dot"], brow: [0, -1], mouth: "smirk" },
  smile_closed: { eye: ["happy", "happy"], brow: [0, -1], mouth: "smile" },
  lick: { eye: ["dot", "dot"], brow: [0, -1], mouth: "lick" },
};

/** face v2. u = 1% of the head path width W. Eyes 26u apart on the centre line, brows 20u up, mouth 20u down,
 *  everything slid toward the facing side. No blush, no catchlights. */
export const faceV2 = (p: Pen, cx: number, cy: number, W: number, expr: Expr, facing = 0, look = 0, blink = false, brim = false) => {
  const u = W / 100, F = FACE[expr], fx = cx + 7 * u * facing, lw = 3.8 * u;
  const ex = (F.eye[0] === "shock" ? 12 : 13) * u, ey = cy;
  for (const side of [-1, 1]) {
    const x = fx + side * ex, lx = x + look * 3 * u;
    const kind: EyeK = blink ? "dash" : F.eye[(facing ? side === facing : side > 0) ? 1 : 0];
    if (kind === "dot") p.ell(lx, ey, 3.8 * u, 5.5 * u, INK, 0);
    else if (kind === "small") p.ell(lx, ey, 3 * u, 4.4 * u, INK, 0);
    else if (kind === "lid") { p.ell(lx, ey - u, 7 * u, 6 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey - u], [x + 9 * u, ey - u]], lw); }
    else if (kind === "happy") p.arc(x, ey + 3 * u, 8 * u, 6 * u, 200, 340, lw);
    else if (kind === "dash") p.stroke([[x - 8.5 * u, ey], [x + 8.5 * u, ey]], lw);
    else if (kind === "squeeze") p.stroke([[x + 6 * u * side, ey - 5 * u], [x - 6 * u * side, ey], [x + 6 * u * side, ey + 5 * u]], lw);
    else if (kind === "shock") { p.ell(x, ey, 11 * u, 11 * u, WHITE, 2.6 * u); p.dot(lx - side * 1.5 * u, ey + 1.5 * u, 3 * u); }
    else { const s: P2[] = []; for (let t = 1; t < 15; t++) s.push([x + Math.cos(t * 0.9) * t * 0.55 * u, ey + Math.sin(t * 0.9) * t * 0.55 * u]); p.stroke(s, 2.4 * u); }
    const [dI, dO] = F.brow, by = ey - (brim ? 17 : 20) * u;           // under a brim the brows sit lower
    if (kind === "shock") p.arc(x, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
    else taper(p, [x - side * 8.5 * u, by + dI * u], [x + side * 8.5 * u, by + dO * u], 5 * u, 2.5 * u);
  }
  const mx = cx + 8 * u * facing, my = cy + 20 * u, mw = 4 * u;
  const dmouth = (rx: number, ry: number, y: number, tongue = false) => {        // open "D" with teeth band (+ tongue)
    p.ell(mx, y, rx, ry, MOUTH, 0, 0, 180);
    p.clip([[mx - rx, y], [mx + rx, y], [mx + rx, y + 3 * u], [mx - rx, y + 3 * u]], () => p.ell(mx, y, rx, ry, WHITE, 0, 0, 180));
    if (tongue) p.ell(mx + 2 * u, y + 0.62 * ry, 0.4 * rx, 0.28 * ry, TONGUE, 0);
    p.ell(mx, y, rx, ry, null, 3 * u, 0, 180);
  };
  switch (F.mouth) {
    case "dash": p.stroke([[mx - 5.5 * u, my], [mx + 5.5 * u, my - 0.8 * u]], mw); break;
    case "frown": p.arc(mx, my + 3 * u, 6.5 * u, 3.5 * u, 200, 340, mw); break;
    case "smirk": p.arc(mx + u, my - 3 * u, 7 * u, 4 * u, 10, 150, mw); break;
    case "smile": p.arc(mx, my - 3 * u, 8 * u, 4.5 * u, 20, 160, mw); break;
    case "smileWide": p.arc(mx, my - 4 * u, 11 * u, 6 * u, 15, 165, mw); break;
    case "grin": dmouth(12 * u, 8 * u, my - u); break;
    case "laugh": dmouth(16 * u, 11 * u, my, true); break;
    case "o": p.ell(mx + 4 * u, my, 3.5 * u, 4 * u, MOUTH, 2.8 * u); break;
    case "O": p.ell(mx, my + 2 * u, 9 * u, 11 * u, MOUTH, 3.2 * u); break;
    case "wave": { const s: P2[] = []; for (let i = 0; i <= 12; i++) s.push([mx - 9 * u + i * 1.5 * u, my + 1.5 * u * Math.sin(i * 1.3)]); p.stroke(s, 3 * u); break; }
    case "teeth":
      p.poly([[mx - 12 * u, my - 4 * u], [mx + 12 * u, my - 4 * u], [mx + 11 * u, my + 4 * u], [mx - 11 * u, my + 4 * u]], WHITE, 3 * u);
      for (const k of [-1, 0, 1]) p.stroke([[mx + k * 6 * u, my - 4 * u], [mx + k * 6 * u, my + 4 * u]], 1.5 * u);
      break;
    case "lick": p.arc(mx, my - 3 * u, 8 * u, 4.5 * u, 20, 160, mw); p.ell(mx + 6 * u, my + 3 * u, 3.6 * u, 4.6 * u, TONGUE, 2.4 * u); break;
  }
  if (expr === "nervous") p.ell(cx + 40 * u * (facing || 1), cy - 22 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
};
```

Corps (de face), montré pour march/stroll/stand. Sit, fall et dress réutilisent les mêmes pièces.

```ts
const BUILD = {
  adult: { a: 118, torso: 1.1, legs: 1.4, tw: 0.8 },
  stout: { a: 118, torso: 1.15, legs: 1.32, tw: 0.92 },
  kid: { a: 112, torso: 0.85, legs: 1.0, tw: 0.72 },
};
export type FrontOpts2 = FrontOpts & { light?: number; facing?: -1 | 0 | 1; seed?: number };

export const bodyFrontV2 = (p: Pen, o: Outfit & { build?: keyof typeof BUILD }, { phase = 0, expr = "neutral", mode = "march", look = 0, blink = false, lift = 60, tilt = 0, headTilt = 0, light = rad(-135), facing = 0, seed = 1 }: FrontOpts2) => {
  const B = BUILD[o.build ?? "adult"], skin = o.skin ?? SKINS[0], two = Math.PI * 2;
  const H = headBlob(seed, B.a, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const bob = mode === "march" ? 5 * Math.cos(2 * two * phase) : mode === "stroll" ? 3 * Math.cos(2 * two * phase) : 0;
  const sole = 975, torsoBot = sole - B.legs * HH + bob, chin = torsoBot - B.torso * HH, hc = chin - H.b;
  const thick = thickAngle(light), ow = 5 * u;
  const legCol = mix(o.pants, INK, 0.55), armCol = mix(o.jacket, INK, 0.5), footCol = o.boots === INK ? INK : mix(o.boots, INK, 0.3);
  // legs: single thin strokes, no knees, slight A-stance; feet = short outward strokes
  const L = mode === "march" ? lift : mode === "stroll" ? lift * 0.45 : 0;
  for (const [side, ph] of [[-1, 0], [1, 0.5]] as const) {
    const up = Math.max(0, Math.sin(two * (phase + ph))) * L;
    const hx = 300 + side * 15 * u, hy = torsoBot - 0.12 * HH, fx = 300 + side * 22 * u, fy = sole - 4 * u - up;
    p.stroke([[hx, hy], [(hx + fx) / 2 + side * 1.5 * u, (hy + fy) / 2], [fx, fy]], 5.8 * u, legCol);
    p.stroke([[fx, fy], [fx + side * 16 * u, fy + 0.5 * u]], 7.5 * u, footCol);
  }
  p.rot = tilt ? [rad(tilt), 300, torsoBot] : null;
  // torso: bean, widest low, round bottom, top hidden under the head (no neck)
  const T: Blob = { a: (B.tw / 2) * W / 1.06, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.6, egg: 0.12, asym: 0.04 * facing, rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 3 * u * facing, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const sw = mode === "march" || mode === "stroll" ? Math.sin(two * phase) : 0;
  // arms hang OUTSIDE the bean (shoulder on its edge, elbow/hand clear of it) and come out from behind it
  const arm = (side: number, swing: number): P2[] => {
    const x = tcx + side * 0.85 * T.a, y = chin + 0.12 * HH, out = tcx + side * (1.12 * T.a + 4 * u);
    return [[x, y], [out, y + 0.48 * HH], [out + side * 3 * u + swing * 14 * u, y + 0.92 * HH - Math.abs(swing) * 8 * u]];
  };
  for (const [side, s] of [[-1, -sw], [1, sw]] as const) {      // draw a hand-in-front arm after the torso instead
    const a = arm(side, s);
    p.stroke(a, 5.2 * u, armCol); p.dot(a[2][0], a[2][1], 5.5 * u);
  }
  p.shadedFill(tp, o.jacket, mul(o.jacket, SH_CLOTH), light, T.a, 0.55, 0.18);
  p.clip(tp, () => {                                                     // clothing wraps the bean
    if (o.belt) for (const s of [-1, 1]) p.band([[tcx - s * 0.75 * T.a, chin - 0.05 * HH], [tcx + s * 0.8 * T.a, torsoBot - 0.1 * HH]], o.belt, 5.5 * u, 1.8 * u);
    for (let i = 0; i < 4; i++) p.dot(tcx + 2 * u * facing, chin + 0.12 * HH + i * 0.2 * HH, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7));
    if (o.sash) p.band([[tcx - 1.2 * T.a, torsoBot - 0.32 * HH], [tcx + 1.2 * T.a, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
  });
  p.rimLight(tp, mix(o.jacket, "#ffffff", 0.45), light, 2 * u);
  p.inkRing(tp, ow, thick);
  // head: tilts around the chin; hat sits low and follows the skull; face last (brows may overlap a brim)
  p.rot = tilt || headTilt ? [rad(tilt + headTilt), 300, chin] : null;
  const hp = blobPts(300, hc, H);
  p.shadedFill(hp, skin, mul(skin, skin === WHITE ? SH_WHITE : SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  hatV2(p, o, hp, H, 300, hc, light, seed);
  faceV2(p, 300, hc, W, expr, facing, look, blink, !!o.hat && o.hat !== "hair" && o.hat !== "bonnet");
  p.rot = null;
};
```

Chapeaux (shako, casquette, cheveux ; le haut-de-forme et le bonnet suivent les valeurs du §2.9) :

```ts
const hatV2 = (p: Pen, o: Outfit, hp: P2[], H: Blob, cx: number, hc: number, light: number, seed: number) => {
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, crown = hc - H.b, ow = 0.85 * 5 * u;
  const a = H.rot + rad(4 * (rnd(seed, 20) - 0.5));                     // tilt with the head, +-2 deg extra
  const R = (pts: P2[]) => rotPts(pts, a, cx, hc);
  if (o.hat === "shako" || o.hat === "shako_tall") {
    const tall = o.hat === "shako_tall", yb = crown + 0.25 * HH, ht = (tall ? 0.66 : 0.56) * HH, wb = 46 * u, wt = 52 * u;
    const base: P2[] = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; base.push([cx + wb * (2 * t - 1), yb + 3 * u * (1 - (2 * t - 1) ** 2)]); }
    const body = R([...base.reverse(), [cx - wt, yb - ht], [cx + wt, yb - ht]]);
    p.shadedFill(body, "#3a3d47", "#24262d", light, wt);
    if (tall) p.clip(body, () => p.band(R([[cx - wt, yb - ht + 0.07 * HH], [cx + wt, yb - ht + 0.07 * HH]]), "#e8c45a", 0.06 * HH, 1.5 * u));
    p.poly(body, null, ow);
    const [px, py] = R([[cx, yb + 3 * u]])[0];
    p.ell(px, py, 34 * u, 0.045 * HH, "#16171b", 2.5 * u, 0, 180, (a * 180) / Math.PI);      // peak
    const [bx, by] = R([[cx, yb - 0.45 * ht]])[0];
    p.arc(bx, by, 6 * u, 5 * u, 200, 520, 2.4 * u, "#c9ccd2");                            // bugle-horn badge, simplified
    const [tx, ty] = R([[cx, yb - ht - 6 * u]])[0];
    p.ell(tx, ty, 7 * u, 7 * u, "#2b7a4b", 2.5 * u);                                       // green tuft
  } else if (o.hat === "cap" || o.hat === "hair") {
    const cut = crown + (o.hat === "cap" ? 0.3 : 0.42) * HH;
    const dome = hp.filter(([, y]) => y < cut).map(([x, y]) => [cx + (x - cx) * 1.03, hc + (y - hc) * 1.03] as P2);
    if (o.hat === "hair") {                                                 // scalloped lower edge
      const [x0, y0] = dome[dome.length - 1], [x1] = dome[0];
      for (let i = 1; i < 6; i++) dome.push([x0 + ((x1 - x0) * i) / 6, y0 + (i % 2 ? 4 * u : 0)]);
    }
    const col = o.hat === "cap" ? o.cap! : o.hair!;
    p.shadedFill(dome, col, shade(col, 0.78), light, H.a);
    p.poly(dome, null, ow);
    if (o.hat === "cap") {                                                  // short front peak, nudged to one side
      const s = rnd(seed, 21) < 0.5 ? -1 : 1, [px, py] = R([[cx + s * 4 * u, cut + 1.5 * u]])[0];
      p.ell(px, py, 32 * u, 0.06 * HH, shade(col, 0.8), ow, 0, 180, (a * 180) / Math.PI);
    }
  }
};
```

Direction de la lumière dans `cast.ts`. Les billboards sont verticaux, donc leur « haut » est le +Y du monde :

```ts
/** canvas angle the sun comes FROM on an upright card facing the camera; 45-degree steps keep the texture cache small */
const light2D = (cam: CamInfo, sunDir: THREE.Vector3, mirror = false) => {
  const sx = sunDir.dot(cam.right) * (mirror ? -1 : 1), sy = -sunDir.y;  // sunDir = normalize(sun.position - sun.target.position)
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
```

Remarques :
- `ctx.filter = "blur()"` fonctionne dans les canvas de Chromium, avec lequel Remotion fait son rendu. Les tracés de textures sont mis en cache par clé dans `cast.ts` ; le coût du flou n'est donc payé qu'une fois par pose, lumière et expression.
- Pour les personnages dessinés avec `p.rot`, le décalage de la lumière tourne avec l'inclinaison. C'est négligeable pour des inclinaisons inférieures à 8°.
- Pour une vérification visuelle rapide après l'implémentation, rends une image fixe du fusilier, une de l'officier et une de l'enfant, à placer à côté de `crops/compare_bodies.png`.

---

## 4. Les 5 changements principaux, classés par impact visuel

1. **Gabarit du corps et membres.**
   - Les adultes passent à 3.5 HH (tête 1 : torse 1.1 : jambes 1.4) ; l'enfant à 2.85 HH.
   - Les jambes deviennent de simples traits de 0.058 W, les bras des traits de 0.052 W, les mains des points d'encre de 0.055 W, les pieds de courts traits de 0.16 W. Cela remplace les tubes de 0.25–0.28 W, les mains en boules couleur peau et les bottes ovales.
   - Le torse devient un haricot (bas arrondi, plus large en bas) au lieu d'une boîte arrondie.
   - C'est, à lui seul, le plus gros changement de silhouette, et c'est lui qui répond à la plainte sur la « mauvaise structure du corps ».
2. **Contour de la tête.**
   - Haricot en superellipse : H/W 0.94, egg −0.12, n du crâne 1.75 / n de la mâchoire 2.3, renflement de 8% vers le côté du regard, inclinaison ±4°.
   - Variation par personnage via la graine et 0.8% de bruit doux, au lieu de l'ellipse symétrique à 1.17.
   - La correction n'est *pas* « moins rond » ; c'est effilement plus asymétrie plus inclinaison.
3. **Contour prune épais-fin.**
   - `INK #241726`, w0 = 5% W, épaisseur `1 + 0.45·cos(θ − θthick)`, côté épais à l'opposé de la lumière et vers le sol.
   - Détails intérieurs à 0.4–0.9×. Éclaircis l'encre à l'écran, de #0a0014 vers #2a1b28.
4. **Bibliothèque de visages.**
   - Yeux écartés de 0.26 W sur la ligne médiane ; par défaut, œil pince-sans-rire sous paupière ; yeux de stupeur (shock) de 0.22 W et presque jointifs.
   - Pas de joues roses, pas de reflets dans les yeux ; sourcils plus épais et effilés à −0.20 W ; petites bouches à +0.20 W.
   - Les traits glissent de 0.07–0.08 W vers le côté du regard.
5. **Valeur et ombrage.**
   - Au rendu, les visages doivent sortir clairs : luma ≥0.85, contre 0.62 aujourd'hui (émissif/matériau dans `cast.ts`, à coordonner avec l'éclairage et l'étalonnage).
   - Croissant doux sur les têtes (×0.89, teinte lavande ou chaude).
   - Large dégradé sur les torses (→ ×0.6) avec un liseré optionnel sur le bord côté ombre.
   - Grain désactivé, ou ≤2%.

---

## 5. Fichiers

Tout se trouve sous `references/characters/`.

**Comparaisons côte à côte :**
- `crops/compare_heads.png` : 8 têtes de la référence avec leur contour ajusté, face à 3 des nôtres avec leur ellipse.
- `crops/compare_bodies.png` : 5 corps de la référence face à notre officier et notre fusilier, tous mis à la même hauteur de tête, avec des lignes-guides HH.
- `crops/spec_preview.png` : la construction proposée, dessinée avec PIL à partir des valeurs de ce rapport (`scripts/spec_preview.py`) ; elle montre fusilier ×2, officier, enfant et habitant. C'est une vérification de la cohérence de la spécification, pas un rendu de la vidéo. Les extraits TS du §3 passent la vérification de types sous `tsc --strict` contre `toon.ts` (harnais de test dans `tscheck/check.ts`).

**Recadrages de la référence (privés) :**
- `crops/heads2/*.png` : 38 têtes avec rayons et ajustements.
- `crops/bodies/b01…b15*.png` : corps entiers quadrillés.
- `crops/zoom_10_018_outline.png`, `crops/head_shading_stretched.jpg`.
- `data/bodies_a…e.png`, `data/fits_0..2.jpg`, `data/angles_0..3.jpg`, `data/grid_00..15.jpg`, `data/cand_crops*.jpg`.

**Les nôtres (copies en lecture seule avec grilles) :**
- `crops/ours/c_1745_grid.png`, `crops/ours/sheet_1800_1470.png`.

**Données :**
- `data/heads2.json` (ajustements du contour, du trait d'encre, des traits du visage et de la couleur, par tête)
- `data/heads.json`
- `data/ours_heads.json`
- `data/face_candidates.json`

**Scripts :**
- `scripts/extract.py`, `overview.py`, `faces.py` (carte de l'encre et détecteur de visages)
- `heads.py`, `heads2.py` (modèle de contour, largeurs mesurées le long des rayons, ajustements intérieur/extérieur)
- `angle_sheet.py`, `bodycrops.py`, `torso_profile.py`
- `ours_grid.py`, `ours_measure.py`, `compare_sheets.py`
