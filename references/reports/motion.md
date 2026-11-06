# Mouvement : référence contre nous (grammaire de caméra + animation des personnages)

Unités : **px = pixels à la taille de la référence 720x1280** (multiplie par 1.5 pour notre 1080x1920). **f** = frame à 30 fps.
Référence = 20 shorts, 32,337 frames ; la bande de sous-titres incrustés est exclue de toutes les mesures de caméra.
Nous = `story.ts` / `cast.ts` / `toon.ts` au 2026-10-31. Le rendu était interdit, donc le nôtre est mesuré **à partir du code avec
les mêmes calculs** : `ourcam.py` fait passer exactement `CAMS` + `run()` + `camAt()` (une copie privée, exécutée avec node) par le même
ajustement de similitude frame par frame et les mêmes statistiques que la référence ; `ourwalk.py` évalue les formules `bodyFront` / `bodySide`.

## 0. Verdict

1. **Nos mouvements de caméra sont des sauts secs de 3 frames ; la référence glisse.** Nos mouvements clés culminent à 115 px/f en médiane (jusqu'à 488), avec une
   attaque de 3 f. Les mouvements de la référence sont des ease-in-out symétriques : ~10 f d'entrée, ~10 f de sortie, ~23 f au total, avec un pic médian de 14-16 px/f.
   La grammaire « ease-out burst » de STYLE_BIBLE.md (et du commentaire d'en-tête de `story.ts`) vient d'une corrélation de phase
   en pixels entiers, qui ne voit pas le mouvement sous ~4 px/f. Elle est fausse.
2. **La caméra de la référence n'est presque jamais parfaitement immobile.** 65 % des frames bougent. Même dans les frames calmes, elle continue
   d'avancer en push-in (0.14 %/f en médiane). Il n'y a aucun flottement façon caméra à l'épaule. Les impacts sont des à-coups de 6-7 frames qui changent de signe à chaque frame.
3. **Les personnages sont animés en 1 (on ones).** Pas de line boil (trait qui tremble), pas de squash/stretch, pas de smears, pas de boucles d'attente (idle). Tout se passe
   sur des temps forts de jeu (beats) qui tombent 0-3 f avant le mot.
4. **Les marches rebondissent, avec des pieds bien plantés.**
   - Le rebond du corps fait 3-7 % de la hauteur ; le nôtre fait 1.7 % en vue de face.
   - L'inclinaison oscille de 1° à 7° à chaque pas.
   - Un pas dure 9-12 f ; le nôtre dure 15 f, et 20-38 f pour les touristes.
   - Le pied d'appui colle au sol ; les nôtres glissent de 13-60 % en vue de profil.
5. **Les clignements sont fréquents et ont une forme :** toutes les 0.5-2.3 s, 4 frames (mi-clos / fermé / fermé / mi-clos), plus un à chaque
   changement d'expression. Les nôtres clignent toutes les 4 s, en ouvert/fermé seulement.

## 1. Méthode (scripts dans `references/motion/scripts/`)

- **Caméra (`cam2.py`, `camstats.py`, `camshape.py`)**
  - Chaque frame est ajustée sur la précédente : ajustement de similitude robuste (translation, zoom, roulis) par corrélation de phase
    sous-pixel sur 9 tuiles, à 360x640. Les bandes de tuiles couvrent 3-29 %, 29-56 % et 80-97 % de la hauteur, ce qui exclut les sous-titres. Les tuiles
    aberrantes sont rejetées.
  - Les ajustements sont intégrés en une trajectoire, lissée par une gaussienne de σ = 1.2 f.
  - La vitesse combine la translation et le zoom × 734 px (le rayon jusqu'au coin de l'image).
  - Classes : tenue < 0.3 px/f, dérive < 2, mouvement ≥ 2.
  - Les pointes (bursts) sont les pics locaux ≥ 6 px/f. L'attaque et le relâchement sont mesurés jusqu'à 10 % du pic.
- **Nous (`ours/dump.mjs`, `ourcam.py`)**
  - Une grille de 5x5 points posée sur le plan du sujet est projetée par `camAt()` dans la frame suivante, puis ajustée de la même façon.
  - Les changements de plan sans coupe à l'écran (les plans 3-8 et 10 partent du cadrage précédent) sont comptés comme des mouvements.
  - Les vraies coupes (flash, fondus enchaînés) sont masquées comme les coupes de la référence.
- **Personnages**
  - Planches contact de 2-4 s à 30 fps. 
  - Suivi par template NCC (`track.py`), compensé du mouvement de caméra grâce à des patchs de fond (`idle.py`, `walkstat.py`).
  - Détection des tenues par différence de frames (`uniq.py`).
  - Comptage des pixels sombres sur une bande au niveau des yeux (`blink.py`).
  - Aire de la tache de la bouche comparée à l'enveloppe RMS de la voix, testée avec des décalages de −4..+4 f (`mouth.py`).

## 2. Caméra

### 2.1 Référence contre nous

| Mesure | Référence (médiane, plage sur 20 vidéos) | Nous (calculé depuis story.ts) | Écart |
|---|---|---|---|
| Tenue (< 0.3 px/f) | 10 % (1-27 %) | 22 % | plus de frames totalement figées |
| Dérive (0.3-2 px/f) | 24 % (4-38 %) | 22 % | ≈ |
| Mouvement (≥ 2 px/f) | 65 % (34-94 %) | 55 % | ≈ |
| Vitesse médiane | 3.6 px/f (1.3-12.9) | 2.9 px/f | ≈ |
| Vitesse p90 | 16.9 px/f (9.7-29.4) | 28.1 px/f | nous avons des pics |
| Mouvements par 10 s | 6.0 (2.9-8) | 2.2 | deux fois moins |
| Vitesse de pic d'un mouvement | 13.7 px/f (p25 5.9, p75 24.6, p90 36) | **115 px/f** (79-488 sur les gros) | **8x trop rapide** |
| Attaque d'une pointe (de 10 % au pic) | 10 f (p25 6, p75 18) | **3 f** | saut sec |
| Relâchement d'une pointe (du pic à 10 %) | 10 f (p25 6, p75 19) | 6 f | |
| Attaque / relâchement | 1.0 ; 62 % symétriques, 18 % ease-out, 20 % ease-in | 0.57 ; l'ease-out quartique met 26-41 % du mouvement dans la frame 1 (dur 14-8) | mauvaise courbe |
| Vitesse à ±10 f du pic (profil médian) | 0.6 du pic (largeur à mi-hauteur > 20 f) | 0.03-0.05 du pic (largeur à mi-hauteur ≈ 5 f) | voir le graphique du profil |
| Amplitude d'un mouvement | 101 px, zoom 23 % | 331 px, zoom 46 % | mouvements 3x plus grands en 1/4 du temps |
| Mouvements forts (pic ≥ 25 px/f) | attaque 8 f, relâchement 7 f ; p. ex. v14 160-240 : 1→38 px/f en 16 f, plateau de 12 f, relâchement de 13 f | attaque de 3 f, relâchement de 5-7 f | |
| Zoom dans les frames calmes (translation < 2 px/f) | actif (≥ 0.05 %/f) dans 70 % des frames, dont 83 % en push-in ; taux médian 0.14 %/f, p75 0.34, p90 0.70 | actif 55 %, 63 % en push-in ; médiane 0.06 %/f, p75 0.16 | push-in 2.4x plus lent, souvent remplacé par une dérive latérale |
| Séquences de push-in (≥ 12 f) | 336 push-ins contre 180 reculs (pull-outs) ; médiane 35 f, +22 %, 0.61 %/f. Les lents (< 0.3 %/f) : 25 f, +3.7 % | `drift()` linéaire | aucun push-in voulu |
| Zoom éclair / grue | v08 zoom éclair (snap zoom) 0.4→5.9 %/f (+38 % en 14 f) ; v03 recul à la grue jusqu'à −4.6 %/f, ~45 f d'accélération, ~60 f de décélération | 13 mouvements qui zooment jusqu'à 275 % ou parcourent 0.7-3.7 largeurs d'image en 3-8 f | |
| Mouvements de roulis | 3.2 par 10 s, médiane 3.6° sur 18 f (p75 8.1°, p90 17.5°) | 3.0 par 10 s, ~2.5° sur ~9 f (max 9.6°) | deux fois plus courts, un peu faibles |
| Flottement caméra à l'épaule | **aucun** : résidu haute fréquence 0.08 px en médiane (0.05-0.29) | flottement sinusoïdal de 0.006 m = 0.03 px/f en médiane (invisible) | supprime-le |
| Secousse d'impact | v14 lance : le décalage change de signe **à chaque frame** (15 Hz), décalage ~3 px (≈5 px/f), roulis ±0.1-0.35°, disparu en 6-8 f ; le push-in s'arrête au coup | sinus de 6.4 Hz, décroissance linéaire sur 15 f : boulon 28.7 px/f, tablier→eau 15.5, marteau 10.7 sur la première frame | 2-5x plus forte, 2x plus longue, oscillation lente |
| Panoramiques filés (whip pans) | 0.45 par minute (5 vrais en 18 min). 45-93 px/f pendant 7-25 f, rampe de 2-3 f à la montée et à la descente, **fort flou de mouvement directionnel** : v13 175-183 (30→93→25), v07 58-90 (~47 vertical), v09 1334-1343 (pic 56) | aucun volontaire, mais 13 mouvements « fly » sans flou à 79-488 px/f | |
| Temps forts de foule | les formations restent immobiles pendant qu'un mouvement de grue ou un travelling latéral apporte le mouvement (v03 51 s, v14 0 s et 125 s) | colonne en marche (récit), habitants qui saluent et sautillent sans arrêt | garde la marche, fige les figurants |

### 2.2 Nos mouvements clés (`story.ts` CAMS)

Chaque mouvement est mesuré comme ci-dessus. « Requis » est la durée de glissé qui garde le pic à ≤ 25 px/f (le p75 de la référence), avec
smootherstep (pic = 1.875 × distance / durée).

| Frame clé | Plan | Déplacement | Zoom | Pic actuel | Requis | À faire |
|---|---|---|---|---|---|---|
| 48 | 1 | 129 px | +64 % | 106 px/f | 37 f | glissé 37 f |
| 88 | 1 | 338 | +34 % | 94 | 31 f | glissé 32 f |
| 190 | 2 | 36 | +24 % | 37 | 13 f | glissé 18 f |
| 246 | 2 | 97 | +26 % | 47 | 16 f | glissé 18 f |
| 283 | 3 | 150 | +170 % | 164 | 94 f | **coupe** (supprime la copie du cadrage du plan 2) |
| 353 | 3 | 346 | +54 % | 112 | 40 f | glissé 40 f |
| 444 | 4 | 1574 | −104 % | 373 | 120 f | **coupe** (supprime la clé 440) |
| 497 | 4 | 606 | +39 % | 80 | 50 f | **coupe** |
| 534 | 5 | 898 | −6 % | 203 | 68 f | **coupe** (supprime la clé 530) |
| 585 | 5 | 22 | +20 % | 35 | 11 f | glissé 18 f |
| 643 | 6 | 486 | −39 % | 79 | 42 f | **coupe** (supprime la clé 640) |
| 717 | 6 | 317 | −126 % | 218 | 73 f | **coupe** |
| 768 | 6 | 254 | +38 % | 76 | 28 f | glissé 29 f |
| 823 | 7 | 204 | −57 % | 84 | 35 f | glissé 35 f (ou coupe) |
| 871 | 7 | 411 | +88 % | 159 | 58 f | **coupe** |
| 925 | 7 | 1437 | −1 % | 276 | 108 f | **coupe** |
| 987 | 8 | 2011 | −275 % | 427 | 160 f | **coupe** (supprime la clé 984) |
| 1039 | 8 | 2631 | +39 % | 488 | 198 f | **coupe**, et un à-coup sur le snap |
| 1062 | 8 | 826 | −86 % | 230 | 78 f | **coupe** |
| 1099 | 8 | — | — | — | — | déjà une coupe (dur 1) |
| 1217 | 10 | 57 | +24 % | 39 | 14 f | glissé 18 f |
| 1560 | 12 | 49 | −35 % | 45 | 20 f | glissé 20 f |
| 1685 | 13 | 1045 | +28 % | 115 | 80 f | **coupe** |
| 1770 | 14 | 1928 | +75 % | 392 | 150 f | **coupe** |
| 1905 | 15 | 15 | +46 % | 76 | 26 f | glissé 26 f |
| 1962 | 15 | 164 | −153 % | 202 | 85 f | **recul à la grue** : départ ~1935, glissé de 90 f jusqu'à la fin (pic ≈3 %/f ; les grues de la référence atteignent 4.6 %/f) |

## 3. Animation des personnages

| Élément | Référence (mesurée) | Nous (d'après le code) | Écart |
|---|---|---|---|
| Cadence de dessin | **en 1**. Un personnage en mouvement change à chaque frame ; aucune tenue en 2 ou en 3. Les personnages immobiles sont identiques au pixel près (différence absolue moyenne 0.15 niveau de gris). | Poses de marche quantifiées à 1/120 de cycle (en 1). **Les touristes utilisent `q(…, 24)` à 0.39-0.75 Hz, donc chaque pose tient 1.7-3.2 f.** | les touristes sont en 2/en 3 |
| Durée d'un pas | 9-12 f par pas (2.5-3.3 pas/s) : v04 cow-boy 10.6 f, v13 porteurs ~9 f, v03 enfant ~12 f | marche 15 f (2.0 pas/s) ; touristes 20-38 f (0.8-1.5 pas/s) | marche 25-65 % plus lente ; touristes 2-3x plus lents |
| Rebond du corps, crête à crête | 3-7 % de la hauteur, point bas au contact : cow-boy 47 px sur une silhouette de 617 px = 7.6 % (0.32 hauteur de tête) ; porteurs ~4 % ; enfant ~3 % | marche de face 14 unités = **1.7 %**, promenade **1.0 %**. Vue de profil (d'après la géométrie des jambes) 4.1 % à stomp 1.0 → 9.0 % à stomp 1.5. Point bas au contact (correct). | vue de face 3-4x trop plate |
| Inclinaison | 1° au passage → 5-7° vers l'avant au contact, en phase avec le rebond (cow-boy) | profil : 3° constant ; face : aucune | pas de cycle d'inclinaison |
| Action des jambes | marche de profil : grande foulée, la cuisse balance d'environ ±35-45°, et le genou monte jusqu'à ce que la cuisse soit presque horizontale au passage (démarche genoux hauts, v04 650-651 et 661-662 ; estimation visuelle) | profil : cuisse 30°×stomp + 16°×stomp de levée (lift), genou 70°×stomp. Face : levée du pied 60 u pour la marche, 27 u pour la promenade. | assez proche à stomp ≥ 1.35 |
| Pieds | **plantés**. Le pied d'appui bouge avec le sol à ≤ 1.1 px/f alors que le sol bouge à 7.2 px/f (v04 649-651, suivi). Une ombre de contact douce gris-bleu se trouve sous le pied. | **Les vues de profil glissent** : colonne 39 % (stomp 1.0), 20 % (1.35), 13 % (1.5) ; touristes ~60 %. Les jambes (250 u = 0.54 m) ne peuvent pas couvrir des pas de 0.8 m à 1.6 m/s et 2 pas/s. | visible dans les plans 4, 13, 15 |
| Bras | les bras en nouille pendent ou tiennent des accessoires ; balancement trop faible ou trop caché pour être mesuré sur les marcheurs étudiés | face : main ±16 u (±4°) ; profil : main ±90 u (±22°) | pas de données, laisse tel quel |
| Attente pendant les tenues (idle) | **aucune** : figé à 0.01-0.8 px près sur 32 f (v20 assis). Seulement des attentes jouées, p. ex. la tête du dormeur de v20 bascule de 10-15° en 8-10 f, tient ~20 f, puis revient. | personnages debout figés (bien) ; rebond sur l'eau 0.03 m à 0.35 Hz (motivé, bien). **Les habitants saluent à 1.4 Hz et l'enfant sautille à 1.1 Hz sans pause.** | figurants trop agités |
| Clignements | 3-4 f : mi-clos, fermé ×1-2 (un trait), mi-clos. Intervalles 0.2-2.3 s, en général 0.5-1.5 s (v19 : 7 clignements en 4 s, v06 : 6 en 4 s). Les clignements masquent les changements d'expression. | `blinkAt` : toutes les 3.98 s, 4.3 f, ouvert/fermé seulement, sans lien avec les changements | 3-5x moins nombreux, pas d'images intermédiaires |
| Bouche (parole) | formes lisses qui changent en 1 (trait, rectangle avec dents, ouverte avec langue, grande ouverte) ; r ≈ 0.47 avec le RMS de la voix ; la bouche est en avance de 0-1 f (v10 officier) | aucun personnage qui parle ; les bouches d'expression sont statiques | sans objet (narration seule) |
| Timing des réactions | le changement d'expression ou d'action tombe 0-3 f **avant** le début du mot (v03 −1 / −3, v10 0, v14 0). Les changements sont instantanés (1 frame). | `exprMarch` change au début du mot −1.6..+2.0 f (médiane ~0), instantané | environ 2 f en retard |
| Squash / stretch, smears | aucun | aucun | à garder |
| Anticipation / impact | saut : accroupissement de 2-3 f (v10). Lance (v14) : 3 f pour l'abaisser, **~6 f de retenue, une poussée en 1 frame**, flash d'impact + anneau de 4-5 f, contact au début du mot. Aucune frame de dépassement (overshoot) dans ces séquences. | marteau : montée douce de 6 f, tenue de 2 f, frappe en ease-in de **3 f**, éclat (burst) de 9 f ; contact sur le mot (bien) | pas de préparation tenue, frappe trop lente, éclat trop long |
| Line boil (trait qui tremble) | **aucun** (amplitude 0) | aucun | garde 0 |
| Rotations | vrais corps 3D (capsule + sphère) ; une rotation prend 1-4 f, le décalque du visage glissant autour de la tête (v10). Face→dos ~2 f (v16 759→761) ; dos→face peut être un échange en 1 frame (v16 801→802). | billboards en lacet (yaw). L'échange face↔profil et le retournement miroir se font en 1 f dès que la caméra franchit cos 0.57, **y compris au milieu d'un mouvement de caméra**. | sauts visibles pendant les glissés |

## 4. Fichiers

**Graphiques de comparaison (nous contre référence, même méthode)**
- `references/motion/ours/burst_profile_ref_vs_ours.png` : profil de vitesse médian d'un mouvement, aligné sur son pic
  (306 mouvements de la référence en bleu, nos 30 en rouge).
- `references/motion/ours/ours_speed.png` : la courbe de vitesse de tout notre film, au même format que les fichiers de la référence
  `references/motion/cam/NN_*_speed.png` et `cam/speed_combo.png`.
- Données : `cam/camstats.json`, `cam/NN_*_rob.npy` (référence) et `ours/ours_rob.npy`, `ours/ours_run_rob.npy` (nous).

**Séquences de la référence (`references/motion/sheets/`)**

| Sujet | Planches |
|---|---|
| Marches | `v04_640_cowboywalk.jpg`, `v04_645_legs.jpg`, `v04_645_feet.jpg`, `v04_649_footzoom.png`, `v03_465_kidwalk.jpg`, `v03_459_kidbody.jpg`, `v13_846_carrier.jpg`, `v03_44.5_walk_full.jpg`, `v04_21_walk_full.jpg`, `v11_14_walk_full.jpg`, `v13_27_walk_full.jpg`, `v16_24.5_walk_full.jpg` |
| Rotations | `v10_8_turn.jpg`, `v16_755_turn_purple.jpg`, `v16_796_turn_orange.jpg` |
| Clignements | `blink_v19_490.jpg`, `blink_v06_30.jpg`, `blink_v10_571.jpg`, `blink_v17_120.jpg`, `v19_blink_zoom.jpg`, `v10_blink_zoom.jpg` |
| Bouches | `v05_1795_mouth.jpg`, `v08_128_cashier_mouth.jpg`, `v10_538_officer_face.jpg` |
| Actions | `v14_40_spear.jpg`, `v10_34_jump.jpg`, `v10_36_jumpzoom.jpg`, `v01_45_arm.jpg` |
| Attente (idle) | `v20_30_sit_idle.jpg`, `v20_30_sleep.jpg`, `v10_767_bed.jpg` |
| Foules | `v03_51_crowd.jpg`, `v14_0_soldiers.jpg`, `v14_125_field.jpg` |
| Panoramiques filés | `v07_60_whip.jpg`, `v09_1328_whip.jpg` |

Les vues d'ensemble sont dans `overview/small_*.jpg` et les grilles de coordonnées dans `grid/combo*.jpg`.

## 5. Recette d'implémentation

### 5.1 `story.ts` : caméra

**a) Mélange des clés : glissés ease-in-out et vraies coupes.** Ceci remplace l'`easeOut` quartique dans `run()`. Garde `easeOut`
lui-même, car `snapEnd` l'utilise pour la physique du câble. Remplace aussi le commentaire d'en-tête (ligne 3) par : "continuous slow
push-ins; symmetric ease-in-out moves ~23 f (10 in / 10 out), peak ~15 px/f at 720p; big reframes are cuts".

```ts
/** reference camera ease: symmetric smootherstep. Peak speed = 1.875 x distance / dur, so keep dur >= 0.075 x distance (720p px) */
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Partial<Cam> & { pos: V3; look: V3 } };
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
```

Applique ensuite le tableau de 2.2 aux clés :
- Les mouvements d'au plus une demi-largeur d'image (≤ 360 px) et d'au plus 40 % de zoom deviennent des `glide` avec `dur` 18-40.
- Tout ce qui est plus grand devient `cut: true`. Pour les clés de transition entre plans, supprime simplement la clé qui copie le cadrage du plan précédent.

Pour que la frame la plus rapide du mouvement tombe là où tombait le saut sec, démarre chaque glissé environ `dur/2` plus tôt. C'est un
choix d'appréciation : le timing caméra-mot n'a pas été mesuré.

**b) Tenues : avance en push-in au lieu de glisser sur le côté.** Utilise ceci à la place du `drift(...)` latéral sur les clés de tenue :

```ts
/** slow dolly toward the look point; the subject grows ~rate per frame.
 *  Reference quiet frames: 0.14 %/f median, 0.34 p75. Emphasis pushes: ~0.6 %/f for ~35 f (+22 %). */
const push = (pos: V3, look: V3, f: number, f0: number, rate = 0.0025): V3 => {
  const k = (1 - rate) ** Math.max(0, f - f0);
  return [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k];
};
// e.g. shot 2: { f: 190, dur: 18, s: (f) => { const look: V3 = [0, 8, 8]; return { pos: push([10, 10.5, -42], look, f, 190, 0.002), look, fov: 42 }; } },
```

Taux :
- 0.0015-0.0035 sur chaque tenue.
- 0.006 pendant environ 35 f sur les mots-chocs : « pride of the whole town », « starts bouncing », la réplique du boulon, « the best drilled soldiers ».

Le push-in s'arrête sur un impact : coupe, ou termine la clé à la frame du coup. Sur les clés d'emphase, règle `roll` à ±0.06-0.14 rad
(3.6-8°) avec `dur` ≥ 18. Les ±0.02-0.06 actuels conviennent sur les clés calmes.

**c) Impacts : à-coups alternés à chaque frame, pas de flottement.** Ceci remplace `SHAKES`, le flottement `k` / `n()` et la secousse sinusoïdale dans
`camAt` :

```ts
// impact kicks (reference v14): image offset flips sign every frame, ~3 px at 720p per unit, gone in 7 f, roll +-0.23 deg per unit
const KICKS: [number, number][] = [[SNAP, 1], [DROP1, 1.6], [59.79, 0.5], [60.33, 0.5], [61.69, 0.7]];
const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.round((t - t0) * FPS);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a; // metres at the look distance for 3 px x a
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
```

**d) Cadence de marche (optionnel, nécessite l'agent son).**
- **Option A**, la plus proche de la référence (2.6 pas/s = 11.5 f par pas) :
  `export const MARCH_HZ = 1.3; export const marchPhase = (tau: number) => (((tau * MARCH_HZ) % 1) + 1) % 1;`
  - Le rebond du tablier suit automatiquement, à 2.6 Hz.
  - Tout son de pas ou de martèlement calé sur 2 pas/s doit être recalé sur `marchPhase` 0 et 0.5.
  - Combiné à la foulée de 5.2, le glissement des pieds tombe à environ ±5 %.
- **Option B** : garde 2 pas/s, le pas cadencé rapide historique. Utilise une foulée ×1.25 à stomp ≥ 1.35 (glissement ≤ 7 %), et recadre
  le plan 4 en vue 3/4 face, où le glissement de 28 % à stomp 1.0 ne se voit pas.

**e) Vues stables pour les billboards (optionnel).** Choisis face ou profil par clé, pas par frame, pour qu'un soldat ne saute jamais au
milieu d'un glissé :

```ts
/** frame at which the current key's move has finished; world.ts builds the CamInfo for viewOf() from camAt(id, keyEnd(id, f)) */
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};
```

### 5.2 `toon.ts` : mécanique du corps

**`bodyFront` : rebond.** Le rebond de la référence fait 3-7 % de la hauteur, point bas au contact. Règle la marche à 5 % (40 u crête à crête) et la promenade à
3 % (24 u) :

```ts
const bob = mode === "march" ? 20 * Math.cos(2 * two * phase) : mode === "stroll" ? 12 * Math.cos(2 * two * phase) : mode === "sit" ? 170 : 0;
```

Les jambes sont dessinées depuis `hipY`, donc le point bas se lit comme une flexion du genou. Rien d'autre ne doit changer.

**`bodySide` : cycle d'inclinaison et foulée.**

```ts
export type SideOpts = { phase?: number; expr?: Expr; mode?: "march" | "stand" | "swing" | "push"; blink?: boolean | number; stomp?: number; stride?: number; pose?: number };
// signature: { ..., stomp = 1, stride = 1, pose = 0 }
legs.push([rad(30 * stomp * stride * Math.sin(q) + 16 * stomp * lift), rad(70 * stomp * lift), k]);
// lean swings with the step like the reference walk: 1 deg at passing, 7 deg at contact (phase 0 / 0.5)
const lean = mode === "push" ? 14 * pose : mode === "march" ? 4 + 3 * Math.cos(2 * two * phase) : 0;
```

**Yeux de `faceFront` / `bodySide` : image intermédiaire mi-paupière.** `blink` devient `boolean | number`, où 1 = fermé et 0.5 = mi-clos.
Passe `skin` depuis `bodyFront`.

```ts
const faceFront = (p: Pen, cx: number, cy: number, s: number, expr: Expr, look = 0, blink: boolean | number = false, skin = SKIN) => {
  const lid = blink === true ? 1 : Number(blink) || 0;
  // ... in the eye loop: shut = the existing arc when lid >= 1 (or whistle); default dot eyes get a half-lid when 0 < lid < 1:
  //   p.dot(x + look * 9 * s, ey, 13 * s);
  //   if (lid > 0) { p.ell(x + look * 9 * s, ey - 7 * s, 17 * s, 10 * s, skin, 0); p.stroke([[x - 15 * s, ey - 1 * s], [x + 15 * s, ey - 1 * s]], lw * 0.8); }
  //   else p.dot(x + look * 9 * s - 4 * s, ey - 5 * s, 4 * s, WHITE);
```

Dans `bodySide`, teste `lid >= 1` pour l'arc fermé. Pour `0 < lid < 1`, trace un trait d'encre horizontal de 30 u à travers l'œil au lieu
du point.

### 5.3 `cast.ts` : comportement des personnages

**Clignements.** Ceci remplace `blinkAt` :

```ts
/** eyelid 0 open .. 1 shut. Reference: gaps 0.5-2.3 s, 4-frame blink half / shut / shut / half, and a blink across every expression swap */
const LID = [0.5, 1, 1, 0.5];
const SWAPS: Record<number, number[]> = { 4: [16.17, 17.3], 5: [19.48, 20.6], 6: [21.9, 23.7], 7: [29.4, 30.6], 8: [SNAP] };
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  for (const ts of swaps) { const k = Math.floor((t - ts + LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; } // shut frames hide the swap
  let s = -2 * hh(i, 9);
  for (let n = 0; s <= t && n < 400; n++) {
    const k = Math.floor((t - s) * FPS);
    if (k >= 0 && k < 4) return LID[k];
    s += 0.5 + 1.8 * hh(i * 31 + n, 13); // next gap 0.5-2.3 s
  }
  return 0;
};
// column(): const blink = expr !== "whistle" ? lidAt(t, i, SWAPS[id]) : 0;   (sitters / townsfolk / officer / park: lidAt(t, i))
```

La clé du pool quantifie déjà les nombres, donc ceci n'ajoute que deux variantes de dessin par visage : mi-clos et fermé.

**Les réactions tombent 2 f en avance.** Dans `exprMarch`, soustrais `LEAD` de chaque instant de changement :

```ts
const LEAD = 2 / FPS; // reference expression and action changes land 0-3 f before the word onset
case 4: return t < 16.17 - LEAD ? { expr: i % 2 ? "neutral" : "stern", look: 0 } : t < 17.3 - LEAD ? { expr: lau ? "shock" : "nervous", look: 0 } : { expr: "neutral", look: 0 };
```

Fais de même pour les instants des cas 5-8. Définis `LEAD` une seule fois en haut du module, avant que `lidAt` et `CHEER` ne l'utilisent.

**Colonne : foulée adaptée à la vitesse de marche.** Dans `column()` :

```ts
// side-view stride so the stance foot keeps pace with the column (Option A cadence 2.6 steps/s: slide within about +-5 %)
const so: SideOpts = { phase: mode === "march" ? ph : 0, expr, mode: mode === "march" ? "march" : "stand", blink, stomp: st, stride: Math.max(0.9, 1.4 - (st - 1)) };
// Option B (2 steps/s): stride: st >= 1.3 ? 1.25 : 1.4
```

**Touristes : en 1, une vraie cadence de promenade, sans glissement.** Dans `tourists()` :

```ts
const phase = q(((t - t0) * 1.2 + hh(i, 5)) % 1, 30); // 2.4 steps/s, 25 f per cycle, a new pose every frame (was sp/1.4 Hz, 24 poses = 2-3 f holds)
const so: SideOpts = { mode: "march", phase, expr, stomp: 0.82 * sp }; // stride grows with walking speed: no skating
```

**Les figurants restent immobiles sauf sur signal.** Les foules d'arrière-plan de la référence sont figées. Dans `townsfolkAt`, conditionne le salut et le saut
à ces fenêtres de signal (tirées de `words.json`) :

```ts
const CHEER: [number, number][] = [[8.01 - LEAD, 9.45], [65.96 - LEAD, 67.5]]; // "pride of the whole town", "like a crowd of tourists"
const on = CHEER.some(([a, b]) => t >= a && t < b);
const hop = kid && on ? Math.max(0, Math.sin(t * 7 + i)) * 0.18 : 0;
const fo: FrontOpts = { mode: "stand", expr, arms: i % 3 === 2 || !on ? undefined : wave(t, i, 420), blink: lidAt(t, i + 40) };
```

**Personnages assis.**
- Ceux assis dans l'eau gardent le rebond ; il est motivé par l'eau.
- Ceux assis sur la berge restent figés, sauf un temps fort de jeu : la tête qui bascule, comme le dormeur de la référence :

```ts
/** head loll: 12 deg in 9 f, hold 20 f, back in 9 f (reference v20 sleeper); use as FrontOpts.headTilt for "dazed" sitters, staggered by hh(i) */
const loll = (t: number, t0: number) => { const n = (t - t0) * FPS; return n < 0 || n > 38 ? 0 : 12 * (n < 9 ? smooth(n / 9) : n < 29 ? 1 : 1 - smooth((n - 29) / 9)); };
```

**Marteau de l'officier : préparation tenue, frappe en 1 frame, éclat court.** Ceci remplace `hammerK` :

```ts
// reference action timing (v14 spear): short wind-up, ~6 f held at the top, 1-frame strike, contact on the word onset
const hammerK = (t: number) => {
  let k = 1;
  for (const th of HITS) {
    const n = (t - th) * FPS; // frames to contact
    if (n >= -11 && n < -7) k = Math.min(k, 1 - smooth((n + 11) / 4)); // wind-up 4 f
    else if (n >= -7 && n < 0) k = 0; // held at the top 7 f; first frame with n >= 0 is the hit
  }
  return k;
};
// officer(): burst window th .. th + 5 / FPS (was 0.3 s = 9 f); reference ring is 4-5 f
```

**Réglages à laisser tels quels :**
- line boil 0 ;
- pas de squash/stretch ni de smears ;
- pas de respiration ni de boucles d'attente sur les personnages debout ;
- poses de marche en 1 ;
- les notes de sifflement.

### 5.4 `Bridge.tsx` : flou de panoramique filé (optionnel, un seul au maximum)

N'ajoute un panoramique filé que s'il reçoit du flou. Ceux de la référence font 45-93 px/f sur 7-25 f avec une rampe de 2-3 f, toujours étalés par le flou. Règle `vel`
à chaque frame sur le mouvement à l'écran de la caméra entre `f` et `f+1` (en unités UV) × 0.5 d'obturation, et à 0 le reste du temps :

```ts
import { Effect } from "postprocessing";
import { Uniform, Vector2 } from "three";
const frag = /* glsl */ `
uniform vec2 vel;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (dot(vel, vel) < 1e-8) { outputColor = inputColor; return; }
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 12; i++) acc += texture2D(inputBuffer, uv + vel * (float(i) / 11.0 - 0.5));
  outputColor = acc / 12.0;
}`;
export class WhipBlur extends Effect { constructor() { super("WhipBlur", frag, { uniforms: new Map([["vel", new Uniform(new Vector2())]]) }); } }
```

## 6. Les 5 changements prioritaires, classés par impact visuel

1. **Transforme les sauts « fly » en coupes et tout le reste en glissés** (`story.ts` : `run`, `Key`, `CAMS` ; tableau 2.2).
   - Aujourd'hui, 13 mouvements clés parcourent 0.7-3.7 largeurs d'image ou zooment jusqu'à 275 % en 3-8 frames, à 79-488 px/f sans flou.
   - Les mouvements de la référence culminent à 14-16 px/f, avec accélération et décélération sur ~23 f. Ses panoramiques filés (≤ 93 px/f) ont toujours un flou marqué.
   - C'est le plus gros signe de « fait au rabais » de notre film.
2. **Fais un push-in sur chaque tenue ; un roulis sur les temps forts d'emphase** (`story.ts` CAMS : `push()` au lieu de `drift()`).
   - Base 0.15-0.35 %/f, et 0.6 %/f pendant ~35 f sur les mots-chocs.
   - Roulis de 4-8° en glissé sur ≥ 18 f.
   - Arrête le push-in sur les impacts.
3. **Mécanique de la marche et du pas cadencé** (`toon.ts` `bodyFront` / `bodySide` ; `cast.ts` `column` / `tourists` ;
   `marchPhase` en option).
   - Rebond de face 1.7 % → 5 % (marche) et 1 % → 3 % (promenade).
   - L'inclinaison de profil fait un cycle de 1° à 7°.
   - Foulée liée à la vitesse, pour que les pieds ne glissent plus.
   - Les touristes se promènent à 2.4 pas/s, en 1.
4. **Clignements et avance des réactions** (`cast.ts` `lidAt` / `exprMarch` ; `toon.ts` `faceFront`).
   - Intervalles de clignement de 0.5-2.3 s.
   - Forme sur 4 frames : mi-clos / fermé / fermé / mi-clos.
   - Un clignement sur chaque changement d'expression.
   - Changements 2 f avant le mot.
5. **Grammaire des impacts** (`story.ts` `camAt` → `kickAt` ; `cast.ts` `hammerK`).
   - Remplace l'oscillation de 6.4 Hz sur 15 frames par des à-coups de 7 frames qui changent de signe à chaque frame (~3 px en 720p, roulis ±0.23°).
   - Marteau : préparation tenue, frappe en 1 frame sur le mot, éclat de 5 frames.
   - Supprime le flottement invisible.

Ensuite :
- habitants d'arrière-plan figés sauf sur signal ;
- vues de billboards stables pendant les glissés ;
- au plus un panoramique filé, avec flou.

## 7. Limites

- **Le nôtre est calculé, pas rendu.** Les chiffres de caméra sont exacts par rapport au code ; ceux de la marche, par rapport aux formules
  de dessin.
- **Les chiffres de foulée / glissement sont approximatifs.** Ils viennent de la règle du pied le plus bas de `bodySide` ; le vrai contact dépend de
  l'ellipse de la botte.
- **Les chiffres de marche de la référence reposent sur peu de marcheurs nets** (v04 cow-boy, v13 porteurs, v03 enfant), car la référence montre surtout
  du jeu d'acteur plutôt que de la marche. Les angles des jambes sont des estimations visuelles faites sur les planches. Le balancement des bras n'a pas pu être mesuré.
- **Choix d'appréciation, pas des mesures :**
  - démarrer les glissés `dur/2` plus tôt ;
  - les fenêtres de signal des figurants ;
  - le décalage entre les bascules de tête ;
  - garder 2 pas/s comme Option B.
