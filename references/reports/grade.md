# Étalonnage : couleur et ton, référence contre nous

Dossier : `references/grade/`. Les scripts sont dans `scripts/`, les données dans `data/`, les images dans `out/`.

Tout le matériel de référence reste privé et local. Aucune image fixe n'a été rendue et rien n'a été modifié sous `your Remotion project` ; les images fixes ont seulement été lues.

## 0. L'écart en termes simples

Comparées aux frames de jour de la référence, nos frames de jour ont quatre problèmes :

- **Trop sombres dans les tons moyens et le haut.**
  - Le Y' médian est de 0.436 contre 0.571.
  - Le p99 est de 0.783 contre 0.967 : nous n'avons pas de quasi-blancs.
- **De grandes zones noir pur.**
  - Le p5 hors encre est de 0.026 contre 0.234.
  - La référence n'a pas de zones noires ; ses tons sombres sont colorés et relevés.
- **Surfaces éclairées peu chromatiques.** Le C* éclairé p50 est de 23 contre 34, et le p90 de 37 contre 55.
- **Pas de vignettage.** Nos coins sont plus clairs que le centre (1.46), alors que ceux de la référence s'assombrissent (0.86).

Deux autres écarts :

- **Point noir.** Les noirs de la référence sont relevés vers le chaud, avec un point noir à (35,19,20). Le nôtre est noir bleuté, (2,0,13).
- **Golden (heure dorée).** Le nôtre est beaucoup plus sombre (médiane 0.33 contre 0.52) et d'un orange sursaturé (HSV S p50 .71 contre .45). Ses ombres sont brunes (zone sombre b* +11), là où celles de la référence sont violettes (b* −6). Il lui manque aussi la part d'environ 25 % de teintes violettes, bleues, magenta et roses de la référence.

Un étalonnage corrige la courbe de ton, les noirs, la saturation globale, la dominante et le vignettage. Il ne peut pas corriger un albédo pastel ou sombre, des ombres portées brunes ou noires, ni des familles de teintes absentes. Voir la section 6.

## 1. Méthode

- **Frames.**
  - Référence : une frame sur 15 des 20 vidéos, soit 2164 frames.
  - Décodage : ffmpeg `scale=in_color_matrix=bt709:in_range=tv:out_range=pc:flags=accurate_rnd+full_chroma_int`, puis réduction par moyenne de zone (area) à 540x960. C'est la même grille que nos images fixes ; la conversion ffmpeg par défaut était décalée d'1 niveau, elle a donc été remplacée.
  - Nous : 39 images fixes dans `your Remotion project/out/bridge/test`, b_*/c_* : 28 de jour, 9 golden (plans 11-13), plus les 2 gros plans sombres du boulon c_1000 et c_1036.
- **Luma.** Y' = 0.2126 R' + 0.7152 G' + 0.0722 B' sur des valeurs 0..1 encodées en sRGB. Ce sont les poids Rec.709 appliqués à des valeurs encodées, donc de la luma, pas de la luminance linéaire.
- **Masque des sous-titres.** Le texte des sous-titres occupe les lignes 662-694 dans 99.5 % des frames, au même endroit dans toutes les vidéos. Les lignes 650-706, sur toute la largeur, sont retirées de toutes les statistiques, et le contraste local retire aussi ±5 lignes de plus. Aucune autre incrustation n'a été trouvée.
- **Masque d'encre.** Black top-hat (fermeture en niveaux de gris 7x7 − Y' > 0.12) ET Y' < 0.30. Les statistiques « hors encre » retirent l'encre dilatée d'1 px.
- **Métriques par frame** (`scripts/metrics.py`) :
  - Y' p1/5/25/50/75/95/99, moyenne et écart-type ;
  - HSV S moyenne/p50/p90 sur V > 0.15 ;
  - vivacité des couleurs (colourfulness) de Hasler-Süsstrunk ;
  - contraste local = std(Y' − moyenne sur une boîte 9x9) ;
  - un histogramme des teintes à 12 classes pondéré par la saturation, et les moyennes Lab par zone : ombres Y' < 0.3, tons moyens, hautes lumières Y' > 0.7 ;
  - point noir = RGB moyen des 0.5 % les plus sombres ;
  - vignettage = Y' moyen dans 10 classes de rayon normalisé (r = 1 aux coins), plus les rapports coin/centre (r ≥ 0.9 contre r < 0.3) et bord/centre sur la ligne médiane ;
  - chroma éclairé C*ab p50/p90 sur les pixels hors encre de L* 40-85.
- **Clusters.** Étiquettes manuelles par plage, vidéo par vidéo, à partir de bandes de timeline (`scripts/labels.py`, `out/strips/NN_lab.jpg`), avec k-means seulement comme aide.

  | Étiquette | Sens | Frames |
  |---|---|---|
  | D | extérieur jour | 552 |
  | G | golden (heure dorée)/coucher de soleil | 162 |
  | N | nuit | 352 |
  | I | intérieur | 835 |
  | X | exclu (graphismes, documents, flashs, intérieur du corps, scope) | 263 |

  Vue d'ensemble : `out/clusters_overview.jpg`.
- **Données brutes.**
  - `data/ref_frames.csv` : chaque frame de la référence avec son étiquette.
  - `data/ours_frames_before.csv`.
  - `data/summary.json` : agrégats par cluster.
  - `data/samples.npz` : pixels regroupés.

## 2. Tableaux de mesures

Médianes par frame pour chaque cluster, puis les nôtres avant et après l'étalonnage ajusté. Les colonnes « +étalonnage » sont nos images fixes étalonnées dans numpy avec exactement les calculs du shader (section 5), puis remesurées avec le même masque d'encre.

| médiane par frame | réf. jour | réf. golden | réf. nuit | réf. intérieur | réf. tout | NOUS jour actuel | NOUS jour +étalonnage | NOUS golden actuel | NOUS golden +étalonnage |
|---|---|---|---|---|---|---|---|---|---|
| frames | 552 | 162 | 352 | 835 | 1901 | 28 | 28 | 9 | 9 |
| Y' p1 | 0.134 | 0.124 | 0.068 | 0.084 | 0.095 | 0.012 | 0.051 | 0.016 | 0.056 |
| Y' p5 | 0.205 | 0.180 | 0.087 | 0.121 | 0.137 | 0.026 | 0.071 | 0.072 | 0.138 |
| Y' p25 | 0.417 | 0.356 | 0.150 | 0.257 | 0.278 | 0.253 | 0.366 | 0.212 | 0.324 |
| Y' p50 | 0.571 | 0.516 | 0.243 | 0.448 | 0.449 | 0.436 | 0.577 | 0.329 | 0.467 |
| Y' p75 | 0.706 | 0.668 | 0.366 | 0.607 | 0.618 | 0.554 | 0.696 | 0.459 | 0.631 |
| Y' p95 | 0.895 | 0.828 | 0.669 | 0.870 | 0.857 | 0.746 | 0.844 | 0.688 | 0.778 |
| Y' p99 | 0.967 | 0.912 | 0.817 | 0.942 | 0.943 | 0.783 | 0.886 | 0.812 | 0.818 |
| Y' moyenne | 0.558 | 0.508 | 0.295 | 0.460 | 0.474 | 0.415 | 0.533 | 0.358 | 0.473 |
| Y' écart-type | 0.202 | 0.182 | 0.176 | 0.221 | 0.205 | 0.213 | 0.228 | 0.195 | 0.197 |
| Y' p5 hors encre | 0.234 | 0.211 | 0.088 | 0.129 | 0.151 | 0.026 | 0.071 | 0.090 | 0.166 |
| Y' p50 hors encre | 0.583 | 0.526 | 0.244 | 0.459 | 0.463 | 0.451 | 0.599 | 0.329 | 0.467 |
| HSV S moyenne | 0.439 | 0.459 | 0.586 | 0.436 | 0.465 | 0.455 | 0.450 | 0.649 | 0.452 |
| HSV S p50 | 0.429 | 0.448 | 0.611 | 0.422 | 0.467 | 0.373 | 0.345 | 0.714 | 0.458 |
| HSV S p90 | 0.737 | 0.671 | 0.840 | 0.764 | 0.762 | 0.843 | 0.844 | 0.969 | 0.655 |
| vivacité (colourfulness, H-S) | 82.8 | 71.2 | 66.6 | 68.0 | 71.7 | 65.6 | 85.9 | 62.6 | 61.5 |
| C*ab éclairé p50 (L* 40-85) | 33.8 | 36.8 | 36.7 | 28.4 | 31.9 | 23.5 | 26.2 | 22.7 | 25.4 |
| C*ab éclairé p90 | 54.9 | 53.0 | 64.4 | 54.9 | 56.6 | 37.4 | 52.8 | 48.9 | 42.5 |
| contraste local (std 9x9 passe-haut) | 0.072 | 0.051 | 0.048 | 0.066 | 0.062 | 0.063 | 0.072 | 0.035 | 0.042 |
| part d'encre | 0.026 | 0.019 | 0.018 | 0.025 | 0.023 | 0.048 | 0.048 | 0.015 | 0.015 |
| vignettage coin/centre | 0.856 | 0.754 | 0.461 | 0.671 | 0.719 | 1.458 | 1.222 | 1.430 | 1.148 |
| vignettage milieu du bord/centre | 0.975 | 0.952 | 0.753 | 0.866 | 0.904 | 1.093 | 1.046 | 0.912 | 0.862 |

| zone (pixels hors encre) | réf. jour | réf. golden | réf. nuit | réf. intérieur | réf. tout (D+G+N+I) | nous jour | nous golden |
|---|---|---|---|---|---|---|---|
| ombres Y'<0.3, part | 0.17 | 0.20 | 0.61 | 0.36 | 0.34 | 0.34 | 0.45 |
| ombres Y'<0.3, a*/b* moyens | +12.5 / -2.5 | +19.1 / -5.8 | +19.7 / -33.1 | +14.8 / -2.5 | +16.5 / -13.4 | +1.0 / -3.2 | +5.3 / +11.4 |
| ombres Y'<0.3, teinte pondérée par S (force) | 331 deg (0.32) | 322 deg (0.54) | 239 deg (0.86) | 333 deg (0.42) | 277 deg (0.41) | 164 deg (0.19) | 43 deg (0.41) |
| tons moyens, part | 0.55 | 0.54 | 0.34 | 0.39 | 0.44 | 0.53 | 0.52 |
| tons moyens, a*/b* moyens | +4.0 / +8.1 | +19.4 / +15.8 | +21.3 / -32.4 | +10.3 / +7.1 | +10.5 / +2.7 | +2.4 / +4.2 | +14.1 / +23.1 |
| tons moyens, teinte pondérée par S (force) | 56 deg (0.20) | 14 deg (0.71) | 242 deg (0.66) | 17 deg (0.31) | 9 deg (0.18) | 53 deg (0.16) | 27 deg (0.95) |
| hautes lumières Y'>0.7, part | 0.28 | 0.26 | 0.05 | 0.24 | 0.22 | 0.13 | 0.03 |
| hautes lumières Y'>0.7, a*/b* moyens | -0.5 / +6.2 | +12.3 / +23.3 | +6.0 / +1.6 | +2.8 / +13.1 | +2.7 / +11.1 | -2.2 / -11.6 | +11.5 / +21.6 |
| hautes lumières Y'>0.7, teinte pondérée par S (force) | 58 deg (0.27) | 25 deg (0.93) | 1 deg (0.26) | 36 deg (0.71) | 37 deg (0.55) | 207 deg (0.63) | 25 deg (1.00) |
| après étalonnage : nous jour / nous golden | ombres a*/b* +11.2/+0.6 +16.8/-5.6, teinte 349/311 | tons moyens a*/b* +2.7/-3.2 +10.2/+12.8, teinte 184/24 | hautes lumières a*/b* -2.6/-4.0 +14.4/+9.7, teinte 193/8 |
| point noir RGB (0.5 % les plus sombres) | 35,19,20 | 48,16,22 | 9,10,38 | 23,12,20 | 25,13,22 | 2,0,13 | 4,0,7 |
| 0.5 % les plus sombres de la zone hors encre | 40,27,33 | 47,22,34 | 10,12,40 | 26,16,27 | 28,18,31 | 2,0,14 | 4,0,7 |
| point blanc RGB (0.5 % les plus clairs) | 254,251,246 | 254,240,220 | 242,230,236 | 253,246,239 | 253,247,240 | 230,206,218 | 240,201,170 |

| histogramme des teintes réf. jour (pondéré par S, %) | rouge 0 | orange 30 | jaune 60 | chartr. 90 | vert 120 | vert printemps 150 | cyan 180 | azur 210 | bleu 240 | violet 270 | magenta 300 | rose 330 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ombres | 25 | 26 | 1 | 1 | 1 | 0 | 5 | 13 | 17 | 3 | 3 | 6 |
| tons moyens | 7 | 40 | 4 | 9 | 4 | 1 | 4 | 28 | 3 | 0 | 0 | 1 |
| hautes lumières | 1 | 50 | 8 | 2 | 1 | 1 | 5 | 29 | 2 | 0 | 0 | 0 |

| histogramme des teintes nous jour (pondéré par S, %) | rouge 0 | orange 30 | jaune 60 | chartr. 90 | vert 120 | vert printemps 150 | cyan 180 | azur 210 | bleu 240 | violet 270 | magenta 300 | rose 330 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ombres | 8 | 26 | 3 | 0 | 2 | 15 | 13 | 29 | 3 | 0 | 0 | 2 |
| tons moyens | 2 | 53 | 1 | 1 | 0 | 1 | 3 | 37 | 1 | 0 | 0 | 0 |
| hautes lumières | 0 | 17 | 0 | 0 | 0 | 4 | 2 | 76 | 0 | 0 | 0 | 0 |

| histogramme des teintes réf. golden (pondéré par S, %) | rouge 0 | orange 30 | jaune 60 | chartr. 90 | vert 120 | vert printemps 150 | cyan 180 | azur 210 | bleu 240 | violet 270 | magenta 300 | rose 330 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ombres | 29 | 14 | 0 | 0 | 0 | 0 | 0 | 8 | 12 | 14 | 9 | 12 |
| tons moyens | 21 | 49 | 7 | 2 | 0 | 0 | 1 | 2 | 6 | 2 | 4 | 5 |
| hautes lumières | 12 | 77 | 6 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 1 | 3 |

| histogramme des teintes nous golden (pondéré par S, %) | rouge 0 | orange 30 | jaune 60 | chartr. 90 | vert 120 | vert printemps 150 | cyan 180 | azur 210 | bleu 240 | violet 270 | magenta 300 | rose 330 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ombres | 8 | 45 | 5 | 14 | 1 | 1 | 1 | 24 | 0 | 0 | 1 | 0 |
| tons moyens | 12 | 80 | 3 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 |
| hautes lumières | 0 | 100 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

| classe radiale r | 0.0-0.1 | 0.1-0.2 | 0.2-0.3 | 0.3-0.4 | 0.4-0.5 | 0.5-0.6 | 0.6-0.7 | 0.7-0.8 | 0.8-0.9 | 0.9-1.0 |
|---|---|---|---|---|---|---|---|---|---|---|
| réf. jour | 1.00 | 1.00 | 1.00 | 1.02 | 1.01 | 1.00 | 0.97 | 0.95 | 0.90 | 0.86 |
| réf. golden | 1.01 | 1.00 | 1.00 | 0.98 | 0.97 | 0.94 | 0.89 | 0.85 | 0.80 | 0.75 |
| réf. nuit | 1.06 | 1.00 | 0.94 | 0.86 | 0.79 | 0.70 | 0.62 | 0.55 | 0.51 | 0.46 |
| réf. intérieur | 1.03 | 1.00 | 0.97 | 0.94 | 0.90 | 0.85 | 0.80 | 0.77 | 0.71 | 0.67 |
| réf. tout (D+G+N+I) | 1.02 | 1.00 | 0.98 | 0.96 | 0.94 | 0.89 | 0.84 | 0.81 | 0.76 | 0.72 |
| nous jour | 0.86 | 1.01 | 1.11 | 1.18 | 1.26 | 1.35 | 1.35 | 1.39 | 1.38 | 1.46 |
| nous golden | 1.03 | 1.00 | 1.02 | 1.04 | 1.06 | 1.24 | 1.29 | 1.39 | 1.47 | 1.43 |

### 2b. Cohérence par vidéo (frames de jour)

Toutes les vidéos vont dans le même sens :

- zone sombre rose chaud, avec a* positif dans les 13 vidéos ;
- point noir relevé et chaud ;
- hautes valeurs quasi blanches, avec p99 ≥ 0.94.

L'ampleur varie : le Y' médian couvre 0.38-0.68, le p5 hors encre 0.09-0.38, et le C* éclairé p50 18-53.

| vidéo | D | G | N | I | X | jour Y' p50 | jour Y' p5 hors encre | jour Y' p99 | jour C* éclairé p50 / p90 | jour vivacité | jour coin/centre | jour zone sombre a*/b* | jour point noir RGB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 01 | 54 | 0 | 56 | 19 | 1 | 0.39 | 0.09 | 1.00 | 53 / 77 | 99 | 0.65 | +13 / -2 | 16,4,9 |
| 02 | 64 | 11 | 0 | 50 | 4 | 0.51 | 0.27 | 0.96 | 37 / 53 | 77 | 0.77 | +8 / -4 | 26,13,19 |
| 03 | 69 | 5 | 20 | 5 | 32 | 0.59 | 0.23 | 0.95 | 26 / 64 | 67 | 0.93 | +8 / -0 | 25,14,18 |
| 04 | 63 | 11 | 10 | 26 | 3 | 0.51 | 0.19 | 0.95 | 32 / 59 | 86 | 0.90 | +13 / -6 | 38,24,38 |
| 05 | 22 | 0 | 90 | 33 | 11 | 0.65 | 0.29 | 0.94 | 33 / 52 | 88 | 0.88 | +10 / -9 | 37,18,10 |
| 06 | 0 | 0 | 0 | 87 | 40 | - | - | - | - | - | - | - | - |
| 07 | 12 | 31 | 46 | 23 | 7 | 0.38 | 0.21 | 0.98 | 49 / 75 | 100 | 0.98 | +24 / +6 | 18,10,19 |
| 08 | 0 | 4 | 12 | 89 | 11 | - | - | - | - | - | - | - | - |
| 09 | 0 | 0 | 6 | 112 | 3 | - | - | - | - | - | - | - | - |
| 10 | 12 | 0 | 24 | 73 | 8 | 0.61 | 0.25 | 0.96 | 35 / 73 | 91 | 0.90 | +10 / -0 | 58,32,28 |
| 11 | 14 | 30 | 26 | 60 | 0 | 0.68 | 0.29 | 0.97 | 18 / 36 | 58 | 0.83 | +23 / +5 | 49,29,34 |
| 12 | 78 | 33 | 0 | 5 | 11 | 0.57 | 0.27 | 0.95 | 32 / 43 | 87 | 0.99 | +9 / +1 | 34,20,20 |
| 13 | 63 | 4 | 3 | 0 | 12 | 0.48 | 0.22 | 0.98 | 42 / 59 | 93 | 0.84 | +15 / +14 | 44,23,24 |
| 14 | 51 | 3 | 6 | 30 | 0 | 0.65 | 0.35 | 0.98 | 27 / 41 | 69 | 0.79 | +14 / +14 | 52,32,28 |
| 15 | 0 | 0 | 0 | 12 | 57 | - | - | - | - | - | - | - | - |
| 16 | 0 | 0 | 53 | 38 | 0 | - | - | - | - | - | - | - | - |
| 17 | 0 | 0 | 0 | 38 | 24 | - | - | - | - | - | - | - | - |
| 18 | 40 | 6 | 0 | 21 | 13 | 0.56 | 0.19 | 0.99 | 48 / 73 | 90 | 0.96 | +9 / -8 | 31,16,15 |
| 19 | 10 | 24 | 0 | 54 | 7 | 0.66 | 0.38 | 0.96 | 21 / 36 | 67 | 0.81 | +8 / +1 | 48,31,25 |
| 20 | 0 | 0 | 0 | 60 | 19 | - | - | - | - | - | - | - | - |
| **ensemble, jour** | 552 | 162 | 352 | 835 | 263 | 0.57 | 0.23 | 0.97 | 34 / 55 | 83 | 0.86 | +11 / +0 | 35,19,20 |
Y_p50 : plage des médianes de jour par vidéo 0.38 - 0.68 sur 13 vidéos
A_p5 : plage des médianes de jour par vidéo 0.09 - 0.38 sur 13 vidéos
C_lit_p50 : plage des médianes de jour par vidéo 17.68 - 52.80 sur 13 vidéos
colourfulness : plage des médianes de jour par vidéo 58.31 - 99.51 sur 13 vidéos

### 2c. Couleur éclairée par teinte (pixels regroupés ; les 30 % les plus clairs des pixels S > 0.25 dans chaque classe de teinte de 30°)

Ce sont les cibles d'albédo et d'éclairage de la section 6.

| teinte (jour) | part réf. | couleur éclairée réf. (L*, C*) | notre part | nous actuel (L*, C*) | nous + étalonnage (L*, C*) |
|---|---|---|---|---|---|
| rouge 0 | 9 % | #e85648 (56, 69) | 3 % | #983c22 (38, 52) | #c55c4f (51, 40) |
| orange 30 | 38 % | #e3b684 (77, 31) | 37 % | #b7906f (62, 23) | #daad89 (73, 24) |
| jaune 60 | 3 % | #d3c677 (80, 44) | 1 % | #6d6b3f (45, 20) | #e4d283 (84, 40) |
| chartreuse 90 | 7 % | #7cbb48 (70, 66) | 1 % | #6fb03a (66, 66) | #80d23e (77, 80) |
| vert 120 | 3 % | #58af47 (65, 66) | 1 % | #246014 (36, 50) | #3b9f27 (58, 72) |
| vert printemps 150 | 1 % | #93cdb6 (78, 24) | 6 % | #0e5c2e (34, 39) | #0b8550 (49, 48) |
| cyan 180 | 5 % | #6dc7ce (75, 28) | 7 % | #32938a (55, 31) | #30c3c5 (72, 38) |
| azur 210 | 27 % | #8fc4fa (77, 29) | 42 % | #9abfe9 (76, 25) | #addaff (85, 23) |
| bleu 240 | 5 % | #6d76aa (51, 28) | 1 % | #4d5384 (36, 27) | #767aac (53, 27) |
| violet 270 | 1 % | #5d4c72 (36, 24) | 0 % | #543f60 (31, 20) | #261f2b (13, 9) |
| magenta 300 | 1 % | #713e74 (34, 43) | 0 % | - | #2d132c (10, 19) |
| rose 330 | 1 % | #733d56 (34, 25) | 1 % | #5f0622 (19, 40) | #920f38 (32, 53) |

| teinte (golden) | part réf. | couleur éclairée réf. (L*, C*) | notre part | nous actuel (L*, C*) | nous + étalonnage (L*, C*) |
|---|---|---|---|---|---|
| rouge 0 | 20 % | #f09a93 (71, 33) | 6 % | #d0a296 (70, 20) | #b06762 (48, 21) |
| orange 30 | 47 % | #ffc590 (83, 37) | 66 % | #d0a377 (70, 28) | #e5b992 (78, 27) |
| jaune 60 | 5 % | #fee792 (92, 41) | 4 % | #536008 (38, 45) | #7f8c37 (56, 46) |
| chartreuse 90 | 1 % | #6e8f35 (55, 51) | 8 % | #3e5405 (33, 43) | #637636 (47, 37) |
| vert 120 | 0 % | #628e62 (55, 28) | 1 % | #2e6e1e (41, 49) | #448145 (48, 43) |
| vert printemps 150 | 0 % | #76b197 (68, 26) | 1 % | #09422a (24, 24) | #36784f (45, 37) |
| cyan 180 | 1 % | #36aaae (64, 32) | 0 % | #304849 (29, 10) | #175961 (34, 20) |
| azur 210 | 4 % | #668cbe (58, 37) | 13 % | #283f50 (25, 13) | #475f8e (40, 28) |
| bleu 240 | 7 % | #717be8 (54, 56) | 0 % | - | #5a648d (43, 24) |
| violet 270 | 5 % | #8967b1 (49, 48) | 0 % | - | #5a307a (30, 35) |
| magenta 300 | 5 % | #a065a0 (50, 38) | 0 % | #4c1357 (19, 46) | #442645 (20, 22) |
| rose 330 | 6 % | #d588a5 (65, 34) | 0 % | #3e2a34 (20, 13) | #60293e (25, 28) |

### 2d. Éclairé contre ombre sur un même matériau

Patchs choisis à la main, séparés par la méthode d'Otsu. Recadrages : `out/shadow_crops_ref.jpg` et `out/shadow_crops_ours.jpg`.

| frame | éclairé | ombre | rapport linéaire éclairé/ombre |
|---|---|---|---|
| réf. 04, sable de jour | #d2ac81 (L* 73) | #6a6d92 (L* 47, b* −21) | 2.8 |
| réf. 18, pavés de jour | #edd8bf (L* 87) | #7481b8 (L* 55, b* −30) | 3.1 |
| réf. 12, tablier de jour | #e1c38d (L* 80) | #5e6474 (L* 42) | 4.4 |
| réf. 04, sable golden | #d28d4a (L* 64) | #514d74 (L* 35) | 4.0 |
| nous b_1900, tablier | #a76d30 (L* 51) | #452512 (L* 19, b* +19, brun) | 7.5 |
| nous b_100 | #b17332 (L* 54) | #5f4116 (L* 30) | 3.4 |

Les ombres de la référence sont plus claires que les nôtres, et bleu-violet. Leur canal B est souvent plus haut que celui du côté éclairé : B éclairé 129 contre B ombre 146. Cela ne peut pas venir d'une version plus sombre d'un même albédo : c'est donc une couleur d'ombre peinte.

Ciel, 10 % supérieurs / 10-20 % / 20-30 % des lignes :

| | 10 % du haut | 10-20 % | 20-30 % |
|---|---|---|---|
| réf. jour | #5997e2 (S .61) | #70adf1 | #82b8f5 |
| nous jour | #8db7e7 (S .39) | #95bce8 | #9dc1e9 |

- Réf. golden : le haut est violet, #937b80 (écart interquartile #61426f à #da97a1) ; les lignes 20-40 % sont pêche, #d99d83.
- Nous golden : le haut va de #b6919e à #d2a294, rose-mauve.

## 3. Comparaisons côte à côte et planches

Chaque comparaison côte à côte a trois panneaux : nous actuel | nous + étalonnage ajusté | frame de la référence au contenu similaire.

- Jour : `out/side_by_side/sbs_c_140.jpg`, `sbs_b_470.jpg`, `sbs_c_1745.jpg`, `sbs_b_1180.jpg`, `sbs_c_1075.jpg`.
- Golden : `out/side_by_side/sbs_c_1340.jpg`, `sbs_c_1450.jpg`, `sbs_c_1650.jpg`, `sbs_b_1500.jpg`.
- Les 39 images fixes, avant en haut et étalonnées en dessous : `out/graded_overview.jpg`. Les PNG étalonnés en pleine taille sont dans `out/graded/`.
- Courbes de ton et fonctions de répartition (CDF) de Y' (réf., nous actuel, nous étalonné) : `out/curves_cdf.png`.
- Clusters : `out/clusters_overview.jpg`, `out/clusters/`.

Ce que montrent les comparaisons côte à côte :

- **Jour.** L'étalonnage rend nettement mieux : plus lumineux, un ciel et une eau d'un bleu vif, un tablier plus chaud, des quasi-blancs et un léger vignettage.
- **Golden.** L'image devient plus lumineuse et perd sa dominante « soupe orange », mais elle vire au lilas et paraît un peu délavée. Le golden de la référence garde des rouges et des oranges saturés sous un ciel violet, et l'étalonnage ne peut pas ajouter ces teintes (section 6).

## 4. L'étalonnage ajusté

L'ajustement est fait par `scripts/fit2.py`, par étapes et avec régularisation. Le modèle travaille sur des valeurs encodées en sRGB et il est identique dans numpy (`scripts/grade.py`) et en GLSL. Étapes, dans l'ordre :

1. **Courbe de ton.** Une seule courbe RGB, une Hermite cubique monotone (Fritsch-Carlson) passant par 7 nœuds à x = 0, .1, .25, .5, .75, .9, 1.
   - Elle est ajustée sur les quantiles de Y' hors encre du cluster de référence correspondant.
   - Contraintes : pénalité de lissage, pente ≥ 0.35, y(1) = 1, point noir Y' ≈ 0.035.
2. **Saturation autour de Y'.** Des quantités séparées pour les ombres, les tons moyens et les hautes lumières.
   - Masques : wS = 1 − smoothstep(0, .55, Y'), wH = smoothstep(.45, 1, Y'), wM = le reste.
   - Ajustée sur le chroma par zone, le chroma éclairé, HSV S et la vivacité (colourfulness), bornée à 0.6-1.6.
3. **Coloration en trois voies (three-way).** Un décalage Cb/Cr BT.709 à luma nulle par zone.
   - Ajustée sur les a*/b* des pixels quasi neutres (C* < 20), la couleur de la zone sombre et le point noir par frame.
   - Pénalités : préservation du chroma, L2, et un plafond de 28/255 par canal.
4. **Vignettage.** × (1 − k·smoothstep(r0, 1, r)), ajusté sur les images moyennes des clusters de la référence après normalisation du contenu.
   - Mesuré : D k = 0.06, r0 = 0.50 ; G k = 0.11, r0 = 0.39.
   - Utilisé un peu plus fort, car notre ciel éclaircit les coins.

| | JOUR (ajusté sur réf. D) | GOLDEN (ajusté sur réf. G) |
|---|---|---|
| courbe : y à x = 0, .1, .25, .5, .75, .9, 1 | 0.0345, 0.1828, 0.3812, 0.6605, 0.8814, 0.9631, 1 | 0.0311, 0.1877, 0.4017, 0.6754, 0.8750, 0.9582, 1 |
| tangentes de la courbe | 1.483, 1.404, 1.220, 0.987, 0.661, 0.435, 0.369 | 1.567, 1.498, 1.253, 0.924, 0.645, 0.472, 0.418 |
| saturation ombres / moyens / hautes lumières | 0.983 / 1.273 / 1.457 | 0.832 / 0.880 / 1.706 |
| coloration des ombres (Cb, Cr) | (−0.0291, +0.0411) : teinte 20° rouge chaud, RGB (+16.5, −3.5, −13.8)/255 | (+0.0528, +0.0004) : teinte 246° bleu-violet, RGB (+0.2, −2.6, +25.0)/255 |
| coloration des tons moyens (Cb, Cr) | (+0.0376, −0.0104) : teinte 230° froide, RGB (−4.2, −0.6, +17.8)/255 | (+0.0583, −0.0003) : teinte 245°, RGB (−0.1, −2.7, +27.6)/255 |
| coloration des hautes lumières (Cb, Cr) | (+0.0144, −0.0047) : RGB (−1.9, −0.1, +6.8)/255 | 0 (voir la note) |
| vignettage k, r0 | 0.10, 0.45 | 0.16, 0.40 |

Lecture des presets :

- **Jour.** Relève les noirs vers le chaud, et éclaircis les tons moyens d'environ +0.2 à 0.25-0.5. Adoucis le haut de la courbe (roll-off). Augmente la saturation des tons moyens et des hautes lumières, refroidis les tons moyens jaunes, et ajoute un léger vignettage.
- **Golden.** Éclaircis fortement. Baisse la saturation dans les ombres et les tons moyens, où notre orange est sursaturé. Annule la dominante orange avec du bleu-violet dans les ombres et les tons moyens, pour qu'ils passent du brun au violet. Utilise un vignettage plus fort.

Coloration des hautes lumières en golden : l'ajustement voulait une coloration violette des hautes lumières, mais elle ne reposait que sur 754 pixels neutres de hautes lumières et éloignait la moyenne des hautes lumières de l'orange de la référence. Elle a donc été mise à 0.

Golden est l'ajustement le plus faible. Le rendu golden dépend de teintes que nos scènes golden n'ont pas. Utilise `amount` 0.8 pour golden.

Stabilité : un premier passage avec des cibles de coloration uniquement neutres a reproduit le même preset de jour à 0.01 près (`data/grade_params_v1_neutral_only.json`). Il a fait exploser golden jusqu'à une coloration magenta des ombres de +71/255 ; c'est pourquoi l'étape de coloration a reçu ses termes de chroma, de point noir et de plafond. Logs : `data/fit2_v2.log`. Presets : `data/grade_params.json`.

## 5. Recette d'implémentation (notre stack)

**A. Nouveau fichier `src/videos/bridge/grade.ts`.**

- Copie `references/grade/GradeEffect.ts` tel quel. Il nécessite postprocessing 6.37.2 et three 0.175.
- Il contient le `mainImage` GLSL avec les uniforms `gradeKy[7]`, `gradeKm[7]`, `gradeSat`, `gradeTintS/M/H`, `gradeVig` et `gradeAmount`. Il contient aussi la classe `GradeEffect`, avec `set(p, q?, t)` pour mélanger des presets et un réglage `amount`, ainsi que les constantes `GRADE_DAY` / `GRADE_GOLDEN` du tableau ci-dessus.
- Le cœur du shader :

```glsl
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 src = gradeEncode(inputColor.rgb);                 // linear (after tone mapping) -> sRGB
  vec3 c = vec3(gradeCurve(src.r), gradeCurve(src.g), gradeCurve(src.b));
  const vec3 W = vec3(0.2126, 0.7152, 0.0722);
  float y = dot(c, W);
  float wS = 1.0 - smoothstep(0.0, 0.55, y), wH = smoothstep(0.45, 1.0, y), wM = 1.0 - wS - wH;
  float s = gradeSat.y + (gradeSat.x - gradeSat.y) * wS + (gradeSat.z - gradeSat.y) * wH;
  c = vec3(y) + s * (c - vec3(y));
  c += wS * gradeTintS + wM * gradeTintM + wH * gradeTintH;
  float r = length(uv * 2.0 - 1.0) * 0.70710678;          // 1 at the corners (same as the numpy fit)
  c *= 1.0 - gradeVig.x * smoothstep(gradeVig.y, 1.0, r);
  c = clamp(c, 0.0, 1.0);
  outputColor = vec4(gradeDecode(mix(src, c, gradeAmount)), inputColor.a);
}
```

**B. `Bridge.tsx`, dans `Inner`.** Place l'étalonnage en dernier, après `fx.tone`, et choisis le preset selon le `light` du plan :

```tsx
import { GradeEffect, GRADE_DAY, GRADE_GOLDEN } from "./grade";
import { SHOTS } from "./story";
// in the fx useMemo:
  grade: new GradeEffect(GRADE_DAY, 1.0),
// in <EffectComposer>, AFTER <primitive object={fx.tone} dispose={null} />:
  <primitive object={fx.grade} dispose={null} />
// every render (the "base"/"over" Inner instances change shot id over time):
const light = (SHOTS.find((s) => s.id === id) ?? SHOTS[0]).light;
fx.grade.set(light === "golden" ? GRADE_GOLDEN : GRADE_DAY);
fx.grade.amount = light === "golden" ? 0.8 : 1.0;
```

L'étalonnage est référé à l'affichage (display-referred) et attend une entrée déjà passée au tone mapping, dans 0..1 : il doit donc venir après `ToneMappingEffect(NEUTRAL)`. Le bloom reste avant le tone mapping, comme aujourd'hui.

**C. Réajuste une fois le travail sur l'éclairage et l'albédo intégré.** L'étalonnage a été ajusté sur les images fixes actuelles ; dès que les rendus deviendront plus lumineux ou plus colorés, il surcorrigera. Au choix :

- baisse `amount` (0.5-0.7) ; ou
- réajuste en 5 minutes environ. Mets les nouvelles images fixes dans un dossier et fais pointer `SRC` vers lui dans `scripts/run_ours.py` et `scripts/validate.py`. Puis lance `run_ours.py` → `samples.py` → `fit2.py day golden` → `emit_ts.py` → `validate.py data/grade_params.json`.

**D. Gains faciles côté source.** Ils réduisent l'effort demandé à l'étalonnage.

- `lights.ts`, ciel de jour : `hor: "#c4e0f7"` → `"#8fc0f2"`.
- `world.ts`, shader du ciel : change l'exposant `pow(h, 0.55)` → `pow(h, 0.4)`. Le haut de l'image n'est qu'à environ 20° au-dessus de l'horizon ; aujourd'hui, la couleur pâle de l'horizon domine donc et le haut du ciel sort en #8db7e7 au lieu de #5997e2.
- `lights.ts`, ciel golden : `top: "#5a66b8"` → `"#6a4f8c"` (violet) et `hor: "#ffc48c"` → `"#f7a27e"` (pêche).
- Ce sont des points de départ non testés (aucun rendu autorisé lors de ce passage). Vérifie la frame finale par rapport aux cibles de ciel de 2d.

## 6. Ce qu'un étalonnage ne peut pas corriger : cibles pour le travail d'éclairage et de textures

Mesure ces valeurs sur la frame finale étalonnée. Les chiffres de la référence sont des valeurs de frame finale.

1. **Ombres portées.** Les nôtres sont brunes et presque noires : L* 19-30, b* +19, rapport éclairé/ombre jusqu'à 7.5:1.
   - Cible : un rapport linéaire soleil/ombre de 2.8-4.4:1 sur un même matériau, médiane d'environ 3.5:1 en jour et 4:1 en golden.
   - L* des ombres 42-55 en jour, environ 35 en golden, bleu-violet avec b* −20 à −30. Exemples : #6a6d92, #7481b8, #5e6474 ; golden #514d74.
   - Un étalonnage ne peut pas séparer l'ombre de l'éclairé à luma égale. Fais-le dans le matériau : un terme de coloration d'ombre ajouté là où la visibilité du soleil est inférieure à 1, plus un éclairage hémisphérique sol/ciel bleu-violet. Par exemple, dans `onBeforeCompile` : `outgoingLight = mix(outgoingLight, outgoingLight * 0.55 + vec3(0.20, 0.21, 0.36) * 0.35, 1.0 - sunVis)`.
2. **Chroma et clarté de l'albédo** (tableau 2c).
   - Même après l'étalonnage, nos rouges éclairés sont #c55c4f (L* 51, C* 40) contre #e85648 (L* 56, C* 69), et nos verts sont un vert printemps sombre.
   - Cibles de peinture pour les surfaces éclairées de jour :
     - rouge #e85648
     - orange/bois #e3b684 (L* 77)
     - jaune #d3c677
     - vert #7fbc4e / #5ab04c (L* 65-70, C* 64)
     - azur #93c6f9
     - bleu #7980b0
   - Cibles de chroma des surfaces éclairées : C* p50 ≥ 32 et p90 ≥ 55 (jour étalonné : 26 / 53).
3. **Grandes zones noires** (shakos, manteaux, chaînes, contours épais).
   - Les nôtres ont un p5 hors encre = 0.026, et 0.071 même après l'étalonnage ; la référence est à 0.234.
   - Les matériaux sombres doivent être des sombres colorés à L* 16-22, pas du noir : bleu marine #262c51, aubergine #2e2439, prune #3d2530, sang-de-bœuf #4d2725.
   - L'encre doit représenter environ 2-2.6 % des pixels (la nôtre : 4.8 %), en traits fins au cœur quasi noir et chaud d'environ (35,19,20).
4. **Familles de teintes absentes en golden.**
   - Le golden de la référence contient environ 20 % de rouge/rose (#f09a93, #d588a5) et environ 17 % de bleu/violet/magenta (#717be8, #8967b1, #a065a0). Le nôtre est à 66 % orange, presque sans violet ni bleu.
   - L'étalonnage ne fait que déplacer la dominante. Golden a besoin d'un ciel violet et d'une lumière d'appoint violette dans les ombres (`ground: "#4f3f84"` est juste ; rends le terme d'ombre violet) et d'accents rouges/roses dans l'habillage du décor.
5. **Personnages plats, d'aspect émissif.** cast.ts utilise emissive ≈ 0.36, ce qui écrase leur plage tonale ; aucune courbe ne peut donc leur donner un vrai modelé. Baisse emissive à ≤ 0.12 et laisse le soleil et l'hémisphère les ombrer (c'est le rapport sur l'éclairage qui en est responsable).

## 7. Les 5 changements prioritaires, classés par impact visuel

1. **Ajoute `GradeEffect` après le tone mapping**, avec les presets jour/golden par plan (section 5 A-B).
   - Jour : Y' médian .436 → .577 (réf. .571), p99 .78 → .89, vivacité 66 → 86 (réf. 83), C* éclairé p90 37 → 53 (réf. 55).
   - Jour : le vignettage et le point noir chaud et relevé viennent en prime.
2. **Recolore les ombres portées dans le matériau :** plus claires, bleu-violet, rapport éclairé/ombre d'environ 3.5:1, L* des ombres 42-55 (6.1).
3. **Remplace les matériaux noirs par des sombres colorés** (L* 16-22, hex ci-dessus) et affine l'encre à 2-2.6 %. Cela supprime notre plus gros écart tonal restant : p5 hors encre 0.07 contre 0.23.
4. **Augmente le chroma et la clarté de l'albédo** jusqu'aux cibles par teinte (rouge #e85648, vert #7fbc4e, bois #e3b684), et sature le ciel de jour vers #5997e2 en haut (6.2, 5D).
5. **Spécifique au golden :** haut du ciel violet #6a4f8c avec horizon pêche, lumière d'appoint violette dans les ombres et accents rouges/roses. Puis réajuste l'étalonnage (5C) pour que golden n'ait plus besoin de la forte coloration bleue.
