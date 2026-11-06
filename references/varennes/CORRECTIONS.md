# Varennes : catalogue des défauts et de leurs corrections

Ce catalogue rassemble tous les défauts trouvés pendant la production du short « La fuite à Varennes » (53 s, voix off française de l'utilisateur, sans musique, 4 plans-séquences, 3 coupes), avec leur cause et leur correction. Lis-le avant de lancer un nouveau short : chaque piège listé ici a coûté au moins un aller-retour. On l'a obtenu de trois façons : trois allers-retours avec l'utilisateur (révisions 1 à 3), deux passes de relecture image par image confiées chacune à trois relecteurs en parallèle (chacun sur un tiers de la vidéo : rapports R1, R2, R3, puis R1b, R2b, R3b, qui disent ce qui est corrigé ou non), et la QA automatique (noir, blanc, images figées, pops, loudness). La QA automatique ne mesure que des statistiques globales de l'image (noir, blanc, images figées, pops, luma) et du son : les traversées, les poses ratées et les détails qui se lisent mal, seul l'œil les voit. **Règle d'or : vérifie chaque plan image par image avant le rendu final.**

**Repères de temps.**
- Le film complet fait 1770 frames de timeline (30 fps). La vidéo finale commence à la frame 172 de la timeline (5.7333 s, sur « En juin 1791 »).
- Ici, **v** = frame vidéo, **t** = frame timeline, **t = v + 172**. Un timecode vidéo en secondes × 30 donne v.
- Les coupes franches sont à v301 / v552 / v1284 (t473 / t724 / t1456).
- La révision 1 portait sur la 1re version, qui commençait encore par l'accroche : ses timecodes sont en temps timeline (10 s = t300).
- Les rapports R* donnent des frames vidéo ; le code et la feuille son (`templates/varennes_audio/cues.md`) donnent des frames timeline.

Les fichiers cités sont ceux de `templates/varennes/` (image) et de `templates/varennes_audio/` (son).

## Repères de la QA automatique (version finale)
- 1440x2560, 30 fps, 1598 frames, 53.267 s ; audio AAC 48000 Hz, 2 canaux.
- Loudness : I -14.0 LUFS, LRA 1.7 LU, crête -1.0 dBFS ; aucun silence.
- Noir : [1597] seulement (la fin du fondu prévu) ; blanc imprévu : aucun ; tenues figées ≥ 12 f : aucune.
- Pops (pics de différence entre frames > 3x la médiane locale, non prévus) : aucun.
- Mouvement : différence moyenne 9.05 ; 2 frames tenues (diff < 0.3), soit 0 %.

| plan (frames vidéo) | luma moyenne | écart-type | p2 | p98 | saturation moyenne |
|---|---|---|---|---|---|
| 1 f0-300 | 0.293 | 0.160 | 0.057 | 0.762 | 0.453 |
| 2 f301-551 | 0.361 | 0.169 | 0.073 | 0.832 | 0.436 |
| 3 f552-1283 | 0.351 | 0.185 | 0.039 | 0.827 | 0.694 |
| 4 f1284-1597 | 0.344 | 0.094 | 0.159 | 0.617 | 0.464 |

(Médianes sur chaque plan.) Une passe antérieure sur la timeline complète (1770 frames) donnait aussi : noir [1769] seulement, aucun blanc imprévu, aucune tenue figée, aucun pop, différence moyenne 6.71.

---

## 1. Personnages et traversées

### 1.1 La famille traverse la porte latérale du palais
- **Symptôme** : révision 1, « à 10 s les personnages traversent la porte » (t300 : la famille sort par la porte latérale, plan 1).
- **Cause** : non documentée.
- **Correction** : `world.ts`, `update()` ouvre les battants avec `poseGate(this.parts.gate, smooth((f - 262) / 22))`. La porte est grande ouverte, à plat contre la façade, dès t284, avant la sortie de la famille (`CUE.FAMILY_OUT` = [297, 345] dans `story.ts`). Dans `cast.ts`, le chemin `FPATH` sort tout droit par le milieu de l'ouverture.
- **Comment le repérer** : pour chaque porte franchie, note la frame où elle est complètement ouverte et la première frame où une carte croise le plan de la porte. La première doit précéder la seconde. Avance image par image sur ce passage.

### 1.2 Des personnages apparaissent de nulle part
- **Symptôme** : révision 2, « à 4 s les personnages apparaissent de nulle part » (v120 = t292, juste avant la sortie de la famille).
- **Cause** : non documentée.
- **Correction** (code final) : dans `cast.ts`, `paris()`, la famille attend dans l'ombre du passage, au fond de la porte (`FAM_S` : « waiting 1.6 m inside the arch »). Une carte encore cachée par le jambage n'est pas posée (`if (s < 0.2) return`). `darken(pl, passageDark(z))` assombrit chaque carte dans le passage : elle sort de l'ombre peu à peu. Même principe pour Drouet à la porte de l'auberge (1.6) et pour le roi qui entre dans la voiture (1.4).
- **Comment le repérer** : regarde la première frame où chaque personnage est visible. Il doit entrer par un bord du cadre, sortir d'une porte ou sortir de l'ombre, jamais apparaître au milieu de l'image.

### 1.3 Un personnage en traverse un autre, la file se déforme
- **Symptôme** :
  - révision 1, « à 13 s un personnage traverse un autre » (t390 : la famille se presse vers la voiture) ;
  - révision 2, « vers 7-8 s ils se déplacent bizarrement au lieu de rester en file » (v210-240 = t382-412).
- **Cause** : non documentée. Le code final insiste sur « Fixed order, smooth precomputed positions, no pushes » : vérifie donc toute poussée appliquée image par image à des personnages qui marchent.
- **Correction** (`cast.ts`) :
  - `FAMILY` fixe pour chacun un écart le long du chemin (`gap` : 0 / 1.1 / 2.0 / 2.8 / 3.85 m derrière le roi), un point d'arrêt (`back`) et un petit pas de côté final (`lat`) ;
  - `FAM_S` précalcule la distance parcourue : pointe des pieds à 0.045 m/f dès t297, pas pressé à 0.13 m/f dès t345, variation de vitesse bornée à 0.006 m/f par frame ; `softEnd()` fait arriver chacun sans à-coup ;
  - les membres de la famille sont posés en `ghost: true` : le solveur d'espacement (`solveSpacing()`, rayons 0.34 m pour un adulte, 0.29 m pour un enfant) ne les pousse jamais ;
  - la foule est espacée une seule fois au chargement (`spread()` : « nobody is ever pushed per frame ») ;
  - la caisse de la voiture est un obstacle fixe (`coachBody()` : « people never stand inside the coach »).
- **Comment le repérer** : sur chaque marche en groupe, vérifie image par image que l'ordre ne change jamais et que deux cartes ne se recouvrent pas à hauteur des pieds (au moins 0.68 m entre deux adultes).

### 1.4 La famille passe à travers la calèche en montant
- **Symptôme** :
  - R1 : v380-389 (t552-561), la gouvernante monte à travers le flanc fermé de la voiture (tête tranchée par le panneau, jupe sous le plancher) ; la portière ne s'ouvre qu'à v393 ;
  - R1 : v407-416 (t579-588), la « montée » est une marche à travers le plancher (buste dedans, jambes qui marchent encore au sol sous la voiture) ;
  - R1b : v412→413, le roi saute du sol dans l'intérieur sombre en 1 frame ; v420→421, il ressort en carte de face éclairée, assise dans l'embrasure, devant la gouvernante qui devient grise derrière lui (inversion d'ordre + saut d'éclairage) ; v416→417, la gouvernante se téléporte sur le plancher, jupe coupée net au seuil.
- **Cause** : la portière du plan 2 s'ouvrait pendant la montée (t563-571, d'après la feuille son v4), et la montée était un simple déplacement au sol vers l'intérieur.
- **Correction** :
  - `story.ts`, `doorAt()` : portière ouverte t540-548, « before anyone boards » (R1b : ouverte v370-374, avant toute montée) ;
  - `cast.ts`, `boardAt()` : marche jusqu'au marchepied (`STEPP`), montée sur le marchepied (`STEP_H` = 0.42 m), deuxième pas sur le seuil (`SILL` : pieds au niveau du plancher, encore hors de la paroi), puis entrée tout droit à hauteur du plancher (`INSIDE`) : « the feet never go below the floor, so nothing is clipped and the wall hides the legs » ;
  - horaires `K_BOARD` / `G_BOARD` ; la carte s'assombrit en entrant (`darken`) ;
  - le roi n'apparaît assis dans la fenêtre qu'une fois la gouvernante entrée et la portière en train de se fermer (`SEAT2_IN`), jamais devant elle dans l'embrasure ;
  - son : `door2_latch` / `door2_hinge` recalés à 540-548 (v4).
- **Comment le repérer** : pour toute montée ou descente, avance image par image. Les pieds ne passent jamais sous le plancher, aucune carte ne traverse une paroi fermée, l'ordre avant/arrière des cartes ne s'inverse pas.

### 1.5 La portière balaie le roi, un garde traverse la portière
- **Symptôme** :
  - R1 : v393-397 (t565-569), le battant qui s'ouvre balaie le roi et lui coupe le visage en deux (v395) ;
  - R3 : v1478-1480 (t1650-1652), un garde traverse la portière ouverte (le bord de la porte lui coupe le visage à v1479).
- **Cause** : personnages placés dans le rayon de balayage du battant.
- **Correction** (`cast.ts`) :
  - le battant est articulé à son bord avant (fwd 0.62), s'ouvre à 100° et balaie un rayon de 1.24 m ; `K_SPOT` et `gSpot()` restent hors de ce rayon pendant l'ouverture, puis rejoignent le marchepied par l'arrière du battant ouvert ;
  - plan 1 : le roi s'arrête 0.55 m avant le marchepied (`FAMILY`, `back`) et la portière ne s'ouvre qu'au tiers (`doorAt()` dans `story.ts` : `0.32 * ramp(f, CUE.DOOR1)`) ;
  - plan 4 : `GUARDS4` place chaque garde devant la charnière (fwd > 0.9), ou le fait contourner le battant ouvert par l'extérieur (point `via` du garde 743).
  - Corrigés à la 2e passe (R1b n°2, R3b n°2).
- **Comment le repérer** : calcule l'arc de chaque battant. Aucune carte ne doit s'y trouver entre le début et la fin de l'ouverture.

### 1.6 Drouet traverse la porte fermée de l'auberge
- **Symptôme** :
  - révision 2, « à 22 s le personnage traverse la porte » (v660 = t832) ;
  - R2b : sa sortie n'est jamais à l'écran ; il sort à v659-663 alors que l'auberge est hors du plan large, puis entre par le bord droit à v689, déjà à 1.5 m de la porte.
- **Cause** : la porte de l'auberge ne s'ouvrait pas avant son passage ; le reste n'est pas documenté.
- **Correction** :
  - `build.ts`, `buildInnDoor()` (vraie embrasure cintrée, `doorHole`) et `poseInnDoor()` (ouverture jusqu'à 105°) ;
  - `world.ts`, `update()` : `poseInnDoor(this.parts.innDoor, smooth((f - 826) / 14))` ; la porte s'ouvre t826-840, puis reste ouverte ;
  - `story.ts` : `D3_PATH` part 0.3 m à l'intérieur de la porte ; `CUE.DROUET_OUT` = 842 ; `D3_VISIBLE` ;
  - `cast.ts`, `relay()` : Drouet reste assombri tant qu'il est dans le plan de la porte et pendant ses 18 premières frames dehors (« he never pops into the light ») ;
  - son : cue `inn_door` recalé sur 826-840 (v3), bottes 5 dB plus douces dans l'embrasure (v4).
- **Comment le repérer** : arrête-toi sur la frame d'ouverture et sur la première frame de sortie. Vérifie que la sortie est dans le cadre ; sinon, décale-la ou garde le plan large plus longtemps.

### 1.7 Drouet flotte en montant à cheval
- **Symptôme** :
  - R3 : v1294-1301 (t1466-1473), Drouet reste une carte debout vue de face et monte tout droit à travers le cheval (jambes dans son ventre à v1297-1300), puis devient en 1 frame un cavalier de profil ~25 % plus grand, avec un autre chapeau ;
  - R3b : encore une carte raide qui monte jambes tendues, pieds ballants, puis saute dans la pose assise à v1301.
- **Cause** : la montée était une translation verticale de la carte debout, à l'échelle 1, alors que le cavalier dessiné par la carte du cheval est à l'échelle `RIDER_K` = 1.28 (le correctif précise « at the rider's own scale »).
- **Correction** : `cast.ts`, `ride()` :
  - la montée est dessinée de profil, à l'échelle du cavalier (`scale: RIDER_K`), en mode `"mount"` (`mount: { k, stirrup, seat, back }`) : pied à l'étrier, debout dans l'étrier, jambe opposée par-dessus la croupe, puis descente dans la selle ;
  - la carte glisse du point au sol de Drouet vers le point de selle (`ck`) ; la carte du cheval reprend le cavalier dès `mount` ≥ 0.86 ;
  - horaire `CUE.MOUNT` = [1462, 1476] ; son : `stirrup`, `saddle_creak`, `saddle_thump`.
  - Partiel à la 2e passe ; corrigé dans le code final.
- **Comment le repérer** : compare l'échelle du personnage sur la dernière frame avant et la première frame après chaque changement de carte : elle doit être identique. Une carte debout ne doit jamais se translater verticalement.

### 1.8 Sauts de face à profil en pleine foulée
- **Symptôme** :
  - R1 : v185→186, 193→194, 200→201, 368→369 (t357→358, t365→366, t372→373, t540→541) : pose, foulée et position sautent en 1 frame (roi, reine, fillette, gouvernante) ; le clignement ne cache que les yeux ;
  - R1b : toujours 1 frame pour le roi (v185→186) et la reine (v193→194) ; nouveaux : à v365→366, les mains jointes de la gouvernante passent d'un coup à une marche bras écartés ; à v397→398, le roi passe d'un coup de la station debout à une foulée ;
  - R2 : v720→721 (t892→893), Drouet bascule de face à profil en pleine foulée.
- **Cause** : changement de dessin (face ↔ profil) sur une seule frame, au milieu d'un pas.
- **Correction** (`cast.ts`) :
  - `turnSquash()` + `squash()` dessinent le virage comme dans un dessin animé 2D : la carte s'écrase horizontalement en passant par un 3/4 sur 4 frames (0.8, 0.58, 0.62, 0.84), avec un clignement sur la frame du virage (`FAM_TURN`) ;
  - `FAM_PH` décale la phase de marche pour que chacun soit exactement au temps de passage (0.25 : pieds joints) sur la frame du virage ; `walkPhase()` fait de même à l'arrêt ;
  - `poseSeq()` fond chaque changement de pose sur 6-8 frames ; le premier pas part pieds joints (« no stride snap ») ;
  - Drouet est toujours de profil (`sideToward()` : « never a front/profile swap mid-stride »), les palefreniers aussi.
- **Comment le repérer** : liste chaque frame de changement de vue ou de pose et avance image par image de −3 à +3 frames autour. Tout saut de pose ou de position en 1 frame est un défaut.

### 1.9 Drouet glisse vers l'objectif
- **Symptôme** : R2 : v699-721 (t871-893), Drouet marche vers l'objectif dans son dessin de face, jambes presque immobiles, sur ~2.5 m à jusqu'à 0.147 m/f (4.4 m/s) : il glisse.
- **Cause** : vitesse trop élevée pour la foulée dessinée, et dessin de face sans vrai cycle de marche.
- **Correction** :
  - `story.ts` : la marche du plan 3 est bornée à 0.058 m/f (« a brisk walk »), avec 10 frames d'accélération et 10 de freinage (`D3_KEYS`) ;
  - `cast.ts`, `relay()` : de profil, pieds plantés, foulée = cycle de 1.4 m / 1.6, modulée par la vitesse, arrivée sur le temps de passage.
  - Corrigé (R2b).
- **Comment le repérer** : compare le déplacement par frame à la foulée dessinée ; les pieds ne doivent pas glisser sur le sol. Garde-fou : 0.06 m/f au plus pour un marcheur dont on voit les pieds.

### 1.10 Respiration par paliers : la carte du roi saute
- **Symptôme** :
  - R2 : v926 et v942 (même cause à v542, 773, 805, 821) : toute la carte du roi saute de (+6, −9) / (+7, −9) px en 1 frame, alors que la voiture avance de 1 px/f ; le bord de la bande verte du panneau de fenêtre bouge de 2-4 px sur ces frames ;
  - R3 : v1086, 1166, 1182, 1214, 1230 : la carte saute de ~10 px (+6, −8) avec l'ombre de la joue ; la carte assise s'incline de 0.5° ; un clignement démarre sur la même frame. Le « pop » de v1230 n'est pas un problème d'éclairage.
- **Cause** : `cast.ts`, `put()` quantifiait la respiration. `br = q(((FRAME/96)+hh(w.i,5))%1, 6)` ne change de valeur que toutes les 16 frames (6 niveaux par cycle de 96 f). `toon.ts` déplace alors la hanche et l'inclinaison : toute la carte saute de 6-9 px d'un coup.
- **Correction** : `cast.ts`, `put()` passe `breath: 0` aux dessins et applique une respiration continue par l'échelle de la carte : `breathe = 1 + 0.0042 * Math.sin(2 * Math.PI * (FRAME / 96 + hh(w.i, 5)))`. Seules les cartes debout et posées au sol respirent ; les cartes assises, dans une fenêtre ou `ghost` ne respirent pas. Corrigé (R2b n°1, R3b n°7).
- **Comment le repérer** : fais un frame-diff d'un personnage immobile (surtout assis) sur une centaine de frames. Un saut régulier toutes les 16 frames trahit une quantification. N'applique jamais `q(x, n)` avec peu de niveaux à une valeur qui pilote un mouvement (R3 recommande au moins 48 niveaux si tu dois quantifier).

### 1.11 Le reflet du roi mal affiché
- **Symptôme** : révision 2, « à 10 s le reflet du roi est mal affiché » (≈ v300, début du plan 2 à t473 : le roi déguisé se regarde dans la laque de la voiture).
- **Cause** : non documentée.
- **Correction** : le gag du reflet a été retiré (R1 note « mirror gag dropped »). Dans le code final, le roi s'admire dans la laque sans reflet dessiné : `cast.ts`, `road()`, `CUE.MIRROR` = [476, 540] (main au bord du chapeau, menton levé, sifflement, petit rebond satisfait). La laque n'a qu'un reflet de ciel peint (`build.ts`, `LACQUER_ENV`, `setLacquerTint()`).
- **Comment le repérer** : vérifie tout reflet ou miroir sur une image fixe à pleine résolution, puis en mouvement.

### 1.12 Temps morts : personnages qui ne jouent pas
- **Symptôme** :
  - R1 : v301-339 (t473-511), le roi reste debout les yeux fermés, sans rien faire ; v236-300 (t408-472), la famille attend 64 frames sans jouer ;
  - R2 : v552-650, le palefrenier au tonneau a l'air figé ;
  - R1b : v301-334 reste un « stand-and-stare » (debout, regard fixe).
- **Cause** : aucune action prévue pendant les attentes.
- **Correction** (`cast.ts`) :
  - `FAM_BEATS` donne à chaque membre de la famille de petites actions pendant l'attente, chacune fondue sur 7 frames : le roi ajuste son chapeau puis montre la portière, la reine lui chuchote et resserre sa capuche, la princesse tend la main vers son petit frère, le dauphin sautille et lève la main, la gouvernante fait signe aux enfants ;
  - regards et petits mouvements de tête dès qu'un personnage attend (`iLook`, `iTilt`) ;
  - le roi « se pomponne » devant la laque (`preen` dans `road()`).
  - Palefrenier : corrigé (R2b n°10).
- **Comment le repérer** : aucune carte visible ne doit rester sans mouvement plus d'environ 1 s. La QA automatique ne détecte que les images entièrement figées (≥ 12 f).

### 1.13 Le bras de la gouvernante et le chapeau
- **Symptôme** :
  - R1 : v331-356 (t503-528), en tirant le chapeau, la gouvernante tourne le dos au roi et son bras-bâton traverse son propre bonnet ; le bras apparaît d'un coup à v331, le chapeau descend d'un coup à v354-356, après que la main est partie ; la boucle se voit encore ;
  - R1b : elle fait face au roi et son bras arrive en douceur (v335-353), mais il part de sa bouche et traverse son visage, et le chapeau ne descend jamais.
- **Cause** : non documentée.
- **Correction** (code final, non revérifié dans les rapports) : `cast.ts`, `road()` : la main va en douceur jusqu'au bord du chapeau (`rk`, fondu sur 8 f) et descend du même nombre de crans que le chapeau (`pull`, mêmes pas de 1/6 que `curlAt()`) ; ensuite la gouvernante recule d'un pas, mains jointes, hors du balayage du battant (`gSpot()`).
- **Comment le repérer** : arrête-toi sur chaque contact main-objet. La main touche l'objet, et ils bougent ensemble.

### 1.14 La boucle de perruque du roi déguisé
- **Symptôme** :
  - R1 : v515-539 (t687-711), la boucle manque sur la carte de face dans la fenêtre (continuité) ;
  - R1b : v505-539, elle ressemble à une cigarette sur la tempe, et on ne reconnaît plus le gros nez du roi ;
  - R2b : v540-551 (t712-723), c'est un tube blanc horizontal dessiné par-dessus le contour du visage, comme un papier roulé qui traverserait la tête.
- **Cause** : la boucle était dessinée par-dessus le visage, à hauteur de tempe (commentaire de `toon.ts`).
- **Correction** : `toon.ts`, `hatBehind()` dessine la boucle DERRIÈRE la silhouette de la tête, à hauteur d'oreille, sous le bord du chapeau, pour qu'elle dépasse de la joue. Dans `cast.ts`, `valet(peek)` règle combien elle dépasse (`curlPeek`) ; `curlAt()` l'enfonce sous le chapeau sur 8 f, puis la fait ressortir à moitié.
- **Comment le repérer** : vérifie chaque détail d'identité (boucle, nez) sur les deux dessins, de face et de profil, dans tous les plans.

### 1.15 Les passagers dans la fenêtre de la voiture
- **Symptôme** :
  - R2 : v540-551 (t712-723), la capuche sombre de la reine couvre l'œil du roi ; R2b : elle ne le couvre plus, mais devient une tache sombre sans visage au bord de la fenêtre ;
  - R3 : v1471-1479 (t1643-1651), la voiture arrive vide ; le roi surgit dans l'embrasure à v1473 et passe du sombre à l'éclairé en 2 frames (v1476-1478) ; la voiture repart avec une fenêtre vide.
- **Cause** : non documentée.
- **Correction** (`cast.ts`) :
  - la reine est assise plus au fond, derrière le roi et sur le côté (`besideKing()` ; plan 3 : « behind his neck, never in front of the profile ») ;
  - plan 4, `ride()` : les passagers restent dans la voiture pendant tout le plan (« the window is never empty ») ; le roi quitte son siège dans l'ombre avant de sortir, puis y revient en sortant du sombre sur 9 frames (`KING_OUT`, `KING_IN`) ; hors de la voiture, sa carte sort elle aussi du sombre sur au moins 9 f.
  - Corrigé (R3b n°3 : l'ombre s'éclaircit sur v1478-1481, passagers dans la fenêtre v1540-1556).
- **Comment le repérer** : regarde la fenêtre de la voiture dans chaque plan ; elle n'est jamais vide quand elle devrait être occupée. Tout passage d'un personnage entre ombre et lumière dure au moins 8 frames.

### 1.16 Dessin des personnages : artefacts d'encre et de forme
- **Symptôme** :
  - R1 : de v194 à v540, des arcs de cheveux flottent hors des têtes, les têtes à bonnet ressemblent à deux disques, les jupes sont des hexagones ; des hampes de torches traversent des visages (v36-110) ;
  - R1b : le bas anguleux du bonnet de la gouvernante passe sur son œil comme un bandeau de pirate (v301-420) ;
  - R1 : le geste du cocher qui montre l'est n'est qu'un trait fin derrière la galerie du toit (v230-245) ; R1b : corrigé, mais il se lève en 3 frames (v231-234) et se rassoit en 4 (v271-275).
- **Cause** : non documentée.
- **Correction** : cocher : `cast.ts`, `paris()` le fait se lever à moitié en 10 frames et pointer en 6 (`stand`, `pt`). Le reste : partiel à la 2e passe, statut final non documenté.
- **Comment le repérer** : fais une planche contact zoomée sur chaque personnage principal. Cherche les contours qui ne touchent pas le corps et les formes géométriques dures.

---

## 2. Chevaux

### 2.1 Chevaux vus de dos lus comme des tonneaux, sans queue
- **Symptôme** :
  - R1 : v212-300 et v476-510 (t384-472, t648-682), les chevaux vus de dos ressemblent à des tonneaux avec un anneau jaune, sans queue ;
  - R1b : les jambes vont bien, mais la carte vue de dos se lit comme un visage (deux points jaunes + un ovale sombre sous les oreilles), toujours sans queue.
- **Cause** (commentaires de `toon.ts`) : de dos, le coussinet du harnais et ses deux anneaux en laiton se lisent comme deux yeux et une bouche ; l'ancienne queue, un losange sombre et lisse sur la croupe, se lisait comme un ovale sombre.
- **Correction** : `toon.ts`, `drawHorse()` :
  - une vraie queue : un tronçon fin qui s'élargit en un long fouet de crins, au bout effiloché à trois pointes, avec des mèches plus claires ; elle se lit de tous les côtés et passe devant la croupe dès que le cheval s'éloigne (`tailFront`) ;
  - coussinet et anneaux seulement si le cheval ne s'éloigne pas (`H.vx > -0.2`), sinon une croupière le long de l'échine ;
  - vu de dos, la tête, les rênes et le collier sont cachés derrière le corps.
- **Comment le repérer** : fais une image fixe de chaque attelage vu de 3/4 arrière et de dos, et demande-toi ce qu'on lit en une demi-seconde.

### 2.2 Jambes des chevaux figées
- **Symptôme** : révision 3, « entre 18,43 et 20,40 s les jambes des chevaux ne sont pas animées » (v553-612 = t725-784 : l'attelage entre au trot dans la cour du relais, au début du plan 3, juste avant le changement d'attelage).
- **Cause** : non documentée.
- **Correction** (`cast.ts`) :
  - `teamPhase()` intègre la phase des jambes image par image à partir de la vitesse de la voiture (`coachAt(id, g).speed` ; phase += vitesse / foulée) : « no leg ever jumps when the stride changes » ;
  - `horse()` règle l'amplitude du mouvement des jambes sur la vitesse (`amp = smooth(speed / 0.035)`) ;
  - dans `relay()` : « rolling in (724-804) the tired team trots with the coach (integrated gait phase, eased to a stop) » ; les paires menées à l'écurie ou ramenées ont leur propre phase de trot et leur propre vitesse.
  - Corrigé (R2b : « horses' legs 553-612 fixed »).
- **Comment le repérer** : partout où la voiture ou un cheval se déplace, les jambes doivent changer de pose à chaque frame. Compare le déplacement au sol et le cycle des jambes.

### 2.3 Jambes qui claquent au changement d'allure, têtes qui tombent d'un coup
- **Symptôme** : R2 : v617 et v632 (t789, t804), les jambes de l'attelage claquent au passage du trot au pas ; à l'arrêt, toutes les têtes tombent sur la même frame (drapeau « fatigué »).
- **Cause** : allure et fatigue en tout-ou-rien (drapeau `tired`).
- **Correction** (`cast.ts`) : `gkOf()` donne une allure continue (0 pas … 1 trot … 2 galop) qui mélange les schémas de jambes (« no snap at a gait change ») ; `tiredK` est fondu sur 14 frames à l'arrêt (`smooth((f - (CUE.COACH_IN[1] - 2)) / 14)`). Corrigé (R2b n°8).
- **Comment le repérer** : avance image par image sur chaque changement d'allure et sur chaque arrêt.

### 2.4 Le changement d'attelage peu visible
- **Symptôme** :
  - R2 : v645-690 (t817-862), la caméra quitte la cour pendant le changement (attelage hors champ de v648 à v680) : on ne voit jamais le temps fort « chevaux » (v661 = t833) ni les palefreniers ; v655-668 et v720-737 montrent des champs ouverts (le côté est de la cour n'est pas fermé) ; v670-690 montre un mur nu ;
  - R2b : le plan large tient jusqu'à v675, mais seule la première paire de tête part (v656-674), seule, sans palefrenier, et laisse sa barre sur les pavés ; le reste du changement se passe après le départ de la caméra. Les maisons du côté est sont là (v686-688).
- **Cause** : l'action clé tombe pendant un mouvement de caméra qui la quitte.
- **Correction** (`cast.ts`, `relay()`) :
  - chaque paire est menée par un palefrenier à la tête du cheval, du côté qui fait face à l'objectif (`groomAt()`, `GSIDE`) ;
  - chemins lissés (`swapPath()`, `splinePts()` : demi-tour doux, le cap ne saute jamais) ;
  - ordre fixe : les chevaux de tête partent les premiers (personne ne traverse une paire encore attelée), les chevaux de timon arrivent les premiers (`tOut()`, `tIn()`, `SWAP_GAP` = 26) ;
  - la paire fraîche s'arrête pile dans son emplacement (`FRESH_SETTLE`), puis son palefrenier s'écarte de 0.8 m.
  - Décor : maisons du côté est de la cour.
  - Reste peu visible dans la version finale (voir « Défauts restés »).
- **Comment le repérer** : pour chaque temps fort de la voix, vérifie que l'action correspondante est dans le cadre à ce moment-là.

### 2.5 Poussière de sabots
- **Symptôme** :
  - R3 : v1314-1348 et v1554 (t1486-1520, t1726), les nuages de poussière sont des formes crème pleines, en forme d'os, qui durent 1 frame chacune ;
  - R3b : lavande maintenant, mais encore des grappes de bulles à bord dur qui sautent à chaque frame (v1314-1362).
- **Cause** : non documentée.
- **Correction** : `cast.ts`, `hoofDust()` :
  - un nuage transparent par impact de sabot (détecté sur la phase de l'allure), laissé là où il a été soulevé ;
  - il grossit, monte, recule et s'estompe (apparition en 3 f, vie de 20 f : `DUST_LIFE`) ;
  - une seule texture (`toon.ts`, `fxDust()`), taille et position continues (« nothing pops frame to frame ») ; teinte de nuit `#8e93aa`.
- **Comment le repérer** : avance image par image derrière un cheval au galop. Aucun nuage ne doit apparaître ni disparaître d'un coup.

---

## 3. Caméra et cadrage

### 3.1 Un panoramique qui fouette sur la façade
- **Symptôme** : R1 : v100-118 (t272-290), la « dérive » est un coup de fouet : la façade glisse d'environ 120 px/f devant des fenêtres répétées et stroboscope. R1b : presque corrigé (pic à ~65 px/f).
- **Cause** : panoramique latéral rapide devant un motif répété.
- **Correction** (`story.ts`, intro) :
  - la grue recule tout droit par rapport à la façade : les fenêtres ne font que se resserrer vers le centre (« no strobe ») ;
  - la poussée vers la porte latérale est surtout un mouvement vers l'avant (au plus 1°/f de panoramique) ;
  - ensuite, la visée suit la famille (`S1e`) : le panoramique s'appuie sur un sujet au lieu de dériver le long de la façade.
- **Comment le repérer** : mesure le glissement du fond en px/f sur chaque panoramique. Au-delà d'environ 65 px/f devant des fenêtres répétées, ralentis ou change d'axe.

### 3.2 Un montant de fenêtre ou une roue coupe un visage
- **Symptôme** :
  - R2 : v762-852 (t934-1024), sur « visage », le cadre de la fenêtre coupe le roi en deux pendant 90 frames ; la tête de Drouet touche le cercle de la roue ;
  - R2b : le visage du roi est entier (v762-860), mais le chapeau de Drouet chevauche encore le cercle de la roue (v800-860).
- **Cause** : non documentée. Les correctifs avancent le siège et abaissent l'objectif.
- **Correction** (`story.ts`) : `COACH_LOCAL.KING_SEAT` est avancé de 0.3 m vers la vitre (« no jamb cuts him from the oblique lenses ») ; `S3B_POS` est placé plus bas et plus à l'est (« his hat stands clear of the rear wheel rim »).
- **Comment le repérer** : sur chaque plan sur un visage, aucun élément du décor ne doit le couper plus de quelques frames.

### 3.3 Visage de Drouet coupé, sujet qui traverse le cadre
- **Symptôme** :
  - R2 : v1000-1079 (t1172-1251), la tête de Drouet n'est qu'un coin noir coupé par le bord droit ;
  - R3 : v1120-1158 (t1292-1330), son visage est coupé à 40-60 % par le bord droit ; v1445-1451 (t1617-1623), Drouet traverse le cadre en 6 frames, à moitié coupé ;
  - R3b (mineur) : le billet est coupé par le bord gauche pendant le panoramique vers Drouet (v1127-1145).
- **Cause** : visée calée sur d'autres sujets.
- **Correction** (`story.ts`) :
  - `S3D_LOOK` cadre la fenêtre entière, la carte de Drouet dégagée du bord droit ;
  - `S3p` recule l'objectif à 1.8 m de sa tête : visage sur la ligne médiane avec 0.15 m d'espace devant le nez, billet entier à gauche ;
  - `S4up` monte en grue au-dessus de la charrette avant de pivoter vers l'arrestation, pour que Drouet reste en bas à gauche au lieu de traverser le cadre.
  - Corrigés (R2b n°4, R3b n°9 et n°12). Billet coupé à v1127-1145 : statut final non documenté.
- **Comment le repérer** : vérifie la marge autour des têtes et des accessoires clés sur toute la durée du mouvement, pas seulement sur l'image clé.

### 3.4 La caméra s'arrête net
- **Symptôme** : R3 : v1577-1589 (t1749-1761), `fallLine` bouge encore à u = 1, donc la caméra s'arrête net à v1584.
- **Cause** : la trajectoire de chute suivie par la caméra avait encore une vitesse non nulle à la fin.
- **Correction** : `story.ts`, `fallLine()` utilise `glide()` (« eases out of the hand and to rest ») ; la caméra suit cette ligne médiane, jamais le voletement du billet. Corrigé (R3b : la caméra freine en douceur sur v1581-1589).
- **Comment le repérer** : trace la vitesse de la caméra frame par frame. Elle doit tendre vers 0 en douceur à chaque arrêt.

### 3.5 Bas d'image vides, figures à deux têtes
- **Symptôme** :
  - R1 : v26-31, v112-180, v420-470, deux hommes de la foule s'empilent en une figure à deux têtes ; la moitié basse de l'image n'est que pavés ou herbe ;
  - R1b : v112-135, la moitié avant de la place est vide (une caisse et un seau sans ombre de contact) ; deux hommes coupés par le bord gauche (v126) ;
  - R3 : moitiés basses vides à v1380-1445 et v1495-1530 ;
  - R3b : les 45 % du bas de l'image de l'arrestation ne sont que des pavés (v1476-1500).
- **Cause** : non documentée.
- **Correction** :
  - `cast.ts`, `STACKED` retire les membres de la foule dont la carte s'aligne sous celle d'un autre depuis un objectif du plan 1 ;
  - bande de porteurs de torches au premier plan (`CROWD1`, voir 7.2) ; habillage du décor (4.1) ;
  - plan 4 : objectif de la charrette plus bas et plus près (`S4C_POS` : « the cart + pushers low in frame »).
  - Image de l'arrestation : statut final non documenté.
- **Comment le repérer** : regarde chaque planche contact en cachant la moitié haute. La moitié basse doit avoir quelque chose à montrer.

---

## 4. Décor et environnement

### 4.1 Des scènes trop vides
- **Symptôme** : révision 1, « scènes trop vides, ajouter du détail d'environnement ».
- **Cause** : non documentée (constat de l'utilisateur).
- **Correction** : `build.ts`, section « SET DRESSING » : `dressParis()`, `dressRoad()`, `dressRelay()`, `dressForest()`, `dressVarennes()` posent de petits accessoires procéduraux dans le style maison, sans texte (textures dans `paint.ts`, « No letters anywhere »). Chaque accessoire passe `clear()` ou `placeOk()` :
  - aucun objectif à moins de 2.5 m (+ la taille de l'objet) ;
  - aucune ligne de visée protégée traversée ;
  - rien dans les zones d'action (`ZONES` : foule, chemin de la famille, voiture et attelage, Drouet).
  L'habillage vit donc au plan moyen et à l'arrière-plan.
- **Comment le repérer** : sur la planche contact de chaque plan, les arrière-plans et le bas de l'image sont garnis, et aucun accessoire ne passe devant un sujet.

### 4.2 Des flaques au faux reflet
- **Symptôme** :
  - R1 : v55 et v100-136 (t227, t272-308), les flaques ont un reflet de lanterne peint et fixe et un bord à facettes : elles se lisent comme un faux reflet qui glisse sur des pavés vides ;
  - R3 : v1510-1558, des flaques se lisent comme des disques bleus lumineux.
- **Cause** : le reflet était peint dans la texture, donc immobile quand la caméra bouge.
- **Correction** : `paint.ts`, `puddleTex()` : une tache mouillée gris-bleu sombre, aux bords en dégradé doux, « no painted lantern glint: QA r1 #7 » ; posée par `build.ts`, `puddle()` (décal `puddle2`, ordre fixe dans `DECAL_ORDER`). Corrigé (R3b n°13).
- **Comment le repérer** : un reflet doit bouger avec la caméra. S'il ne bouge pas, ne le peins pas.

### 4.3 Nappes de brume plates à bords durs, contours fantômes
- **Symptôme** :
  - R3 : v1353-1378 (t1525-1550), des nappes de brume plates aux bords horizontaux durs traversent le cadre ; les buissons délavés par le brouillard gardent toute leur encre et se lisent comme des contours fantômes transparents ; v1353-1363 est vide (le cavalier est parti) ;
  - R3b : les puits de lumière lunaire montrent des bords droits durs au passage de la grue (v1374-1381).
- **Cause** : l'ancienne texture de brume était coupée net sur ses bords (« the old puff clipped into hard lines », `paint.ts`) ; l'encre du décor ne s'atténuait pas derrière la brume.
- **Correction** :
  - `paint.ts`, `mistTex()` : bosses douces, alpha garanti nul sur tous les bords ;
  - `world.ts` (constructeur) : toute nappe à moins de w/2 + 6 m d'un objectif du plan 4 (échantillonné toutes les 3 frames) est supprimée ; `update()` estompe chaque nappe selon la distance (apparition de 10 à 18 m, disparition au-delà de 45 m) ;
  - `ink.ts`, calque `VEIL` : l'InkPass atténue les traits du décor derrière les voiles (brume, fumée) selon leur couverture ;
  - puits de lumière : `paint.ts`, `shaftTex()` (bande douce) ; `world.ts`, `update()` les efface au-dessus de la canopée, près de l'objectif (de 4 à 10 m) et hors de `LOC.FOREST_BOX`.
- **Comment le repérer** : avance image par image sur chaque mouvement de grue à travers la brume ou la fumée ; aucun bord droit ne doit apparaître, aucun contour ne doit rester net derrière un voile.

### 4.4 Un blason en tête de grenouille, des rayures qui ressemblent à des lettres
- **Symptôme** : R1b : v0-60 (t172-232), le blason au-dessus de la fenêtre du roi se lit comme une tête de grenouille ; les rayures sur les tambours des colonnes ressemblent à des lettres (règle : aucun texte à l'écran).
- **Cause** : non documentée.
- **Correction** (code final, non revérifié dans les rapports) : `paint.ts`, `royalArmsTex()` : un écu ovale azur avec trois ornements de lys dorés (« fleurs-de-lis-like, no letters »), un cadre doré à volutes ; la couronne est en 3D au-dessus (`build.ts`).
- **Comment le repérer** : zoome sur chaque surface texturée proche de l'objectif. Retire tout ornement ou toute rayure qui peut se lire comme une lettre ou un visage.

### 4.5 Des tonneaux qui apparaissent et disparaissent sur la charrette
- **Symptôme** :
  - R3 : v1426-1440 (t1598-1612), les tonneaux apparaissent sur la charrette alors que les porteurs tiennent encore les leurs, puis disparaissent de leurs bras ;
  - R3b : le levage a l'air juste (v1414-1421), mais le tonneau levé disparaît à v1422-1424, et un tonneau plus sombre et plus petit apparaît ailleurs sur la charrette à v1425.
- **Cause** (d'après les correctifs de `cast.ts`) : la carte du tonneau porté et le tonneau 3D du décor n'étaient pas synchronisés (frame d'apparition, emplacement, couleur).
- **Correction** : `cast.ts`, `ride()` :
  - `BARREL_SHOW` reprend la règle du décor (`bridgeCartAt(f).barrels > k + 0.3`) ;
  - la carte du tonneau monte des bras jusqu'à la charrette sur 7 frames (`tLift` = `tShow` − 7, petit arc) et passe le relais au tonneau 3D sur cette frame-là, à son emplacement exact sur la charrette (`top`) ;
  - en se posant, elle prend la couleur de nuit du tonneau du décor (`nt`).
  - Son : `barrel_thud` sur 1597 / 1605 / 1612, avec la même règle de visibilité.
- **Comment le repérer** : quand un objet passe d'une carte à un objet 3D, compare les deux sur la frame de relais : même position, même taille, même couleur.

### 4.6 Pavés : deux grilles superposées, texture qui change
- **Symptôme** :
  - R3 : v1577-1582 (t1749-1754), deux grilles de pavés se superposent ;
  - R3b : la double grille a disparu, mais la texture des pavés change en 1 frame à v1573→1574.
- **Cause** : non documentée (R3 conseille d'accorder la taille des pavés du gros plan à celle des pavés de base).
- **Correction** : `paint.ts`, textures de la « studio pass » (détail de pavés en gros plan, patch de pavés haute résolution pour la dernière image) ; ordre fixe des décals au sol (`build.ts`, `DECAL_ORDER` : `cobbleClose`, `cobbleFade`). Saut de texture v1573→1574 : statut final non documenté.
- **Comment le repérer** : sur un plan qui finit en gros plan sur le sol, vérifie la transition entre la texture de base et la texture de gros plan, image par image.

### 4.7 Objets parasites : caisse floue, feuilles rouges
- **Symptôme** : R3 (mineur) : une caisse marron floue au bord bas de l'image (v1466-1490) ; des feuilles rouge sombre qui pourraient se lire comme des éclaboussures (règle : pas de gore).
- **Cause** : non documentée.
- **Correction** : corrigés (R3b n°13 : caisse, feuilles).
- **Comment le repérer** : cherche les objets flous en bord de cadre et toute tache rouge qui pourrait évoquer du sang.

---

## 5. Lumière, ombres et post-traitement

### 5.1 Acné d'ombre, ombres en escalier qui rampent, scintillement
- **Symptôme** :
  - R1 : v470-512 (t642-684), les ombres sur la route ont des bords en escalier (shadow map) ; R1b : encore visibles à v476 et v489-500 ;
  - R2 : sur les frames où la carte du roi saute (1.10), le bord de la bande verte du panneau de fenêtre bouge de 2-4 px (probablement l'ombre de la carte), et il dérive de ±2 px entre ces frames ;
  - acné d'ombre (shadow map).
- **Cause** : d'après le commentaire de `world.ts`, la caméra d'ombre changeait de taille ou glissait d'une fraction de texel d'une frame à l'autre (« QA r2 #1 shimmer, r1 #6 crawling stair-steps »).
- **Correction** : `world.ts`, `update()` :
  - une seule taille de frustum d'ombre par plan : `Rr` = médiane de la distance objectif-cible × 1.15 + 7, bornée à 18-45 m ;
  - la cible est calée sur la grille de texels de la shadow map (texel = 2 × `Rr` / `mapSize`) ;
  - `normalBias` est mis à l'échelle de `Rr` / 12, le `bias` vient du preset de lumière (`L.bias`).
  - La carte d'ombre ne se redimensionne plus et ne glisse plus entre deux frames.
- **Comment le repérer** : zoome sur un bord d'ombre pendant un mouvement lent et compare 10 frames consécutives. Le bord ne doit pas ramper ni scintiller.

### 5.2 Des ombres portées plus claires que le sol
- **Symptôme** : R3b : v1325-1345 (t1497-1517), les ombres portées sont plus claires que le sol autour (84,91,137 contre 71,75,102) ; des traînées pâles à v1440-1460.
- **Cause** : sur les albédos sombres, le relèvement de l'ombre propre (lift) rendait le côté ombré plus clair que le côté éclairé (commentaire de `shade.ts`).
- **Correction** : `shade.ts` : la valeur ombrée est plafonnée juste sous la valeur éclairée du même albédo (`min(..., litV * 0.88 + 0.004)`).
- **Comment le repérer** : mesure la couleur d'une ombre portée et du sol éclairé juste à côté. L'ombre doit toujours être plus sombre.

### 5.3 Des personnages et des objets qui flottent : ombres de contact
- **Symptôme** :
  - R3 : v1284-1350 et v1475-1495, le cheval et Drouet n'ont pas d'ombre de contact (ils flottent) ; l'ombre de la voiture est une ellipse détachée des roues d'environ 1.5 m ;
  - R3b : sabots corrigés, mais les roues n'ont pas d'ombre de contact, et l'ombre de la voiture plus des taches sombres isolées flottent sur des pavés vides (v1486-1500) ;
  - R1b : une caisse et un seau sans ombre de contact (v112-135).
- **Cause** : non documentée.
- **Correction** :
  - `cast.ts`, `horse()` : une ombre de contact étirée le long du corps (`fxContact`, 0.95 × 2.7 m, à plat) ;
  - `world.ts` : ombres de contact sous les 6 chevaux attelés et sous Drouet et son cheval (« QA r3 #11 ») ;
  - `build.ts` : sous la caisse de la voiture et sous chaque roue, une ombre de contact douce, enfant de la voiture (elle la suit) ; « contact shadows (studio pass) » : bandes au pied des murs, taches sous les accessoires.
- **Comment le repérer** : regarde chaque point d'appui (pied, sabot, roue, objet posé) : une ombre sombre et douce doit le toucher.

### 5.4 Un halo de lanterne envahit l'image près de l'objectif
- **Symptôme** : plan 1, t431-433 : toute l'image est voilée par un halo chaud, puis revient d'un coup à la normale à t434 (pop). Lors de son passage, l'objectif frôlait à 0.5 m la lanterne murale de la porte (t425-434).
- **Cause** : un objectif qui frôle une lanterne remplit l'image de son verre HDR et de son halo additif (commentaire de `build.ts`).
- **Correction** :
  - `build.ts`, `wallLantern()` et `wallTorch()` : `if (nearLens(p, 2.5)) return;` ; aucune lanterne ni torche murale à moins de 2.5 m d'un objectif (`nearLens()` teste toutes les positions de caméra du film, échantillonnées toutes les 2 frames) ;
  - `world.ts`, `update()` : l'opacité de chaque halo descend en douceur sous ~3 m de l'objectif (`clamp01((distance - 1.5) / 1.5)`) ; la fumée des cheminées s'estompe aussi près de l'objectif.
- **Comment le repérer** : calcule la distance minimale entre chaque source lumineuse et la trajectoire de la caméra ; avance image par image autour de chaque passage près d'une lampe.

### 5.5 Liseré chaud aliasé sur les cartes
- **Symptôme** : R2 : v762-960 (t934-1132), le liseré chaud de `cardshade.ts` forme une ligne jaune dure et aliasée de 1 px, jusque sur le chapeau.
- **Cause** : non documentée (R2 propose de l'anticrénelager et de le limiter à la peau).
- **Correction** : `cardshade.ts` : liseré chaud intérieur, à l'heure dorée seulement, sur les ~2 px extérieurs (à 1080 de large) de la peau de la tête et de la silhouette du torse, adouci par `smoothstep`. Corrigé (R2b n°9).
- **Comment le repérer** : zoome à 200 % sur le bord des personnages éclairés en contre-jour.

### 5.6 Lueurs de lanterne sur les visages des gardes
- **Symptôme** : R3 et R3b : les lueurs des lanternes se posent sur les visages des gardes comme des yeux lumineux (v1464-1494 = t1636-1666).
- **Cause** : non documentée.
- **Correction** : tentative dans `cast.ts`, `ride()` : lanternes portées bas, à la hanche (`pk` 0.08 ; « lanterns carried low: no glow on a face »). Défaut resté dans la version finale.
- **Comment le repérer** : image fixe de chaque personnage qui porte une lumière ; aucun halo ne doit recouvrir un visage.

### 5.7 Qualité générale « comme en studio »
- **Symptôme** : révision 1, « améliorer la qualité générale » ; révision 2, rendu « pro comme en studio ».
- **Cause** : non documentée (demande générale).
- **Correction** : la « studio pass » :
  - `ink.ts` : occlusion ambiante (AO) de contact discrète (murs et sol, roues et pavés, appuis de fenêtre, avant-toits), calculée sur le même tampon profondeur + normales du décor, disparue à 160 m ;
  - `lensblur.ts` : flou de mouvement de caméra déterministe (chaque pixel est reprojeté avec les caméras des frames f−1 et f+1 ; obturateur 0.35 = 126° ; 10 échantillons) ; la voiture suivie reste nette, les cartes ne sont jamais floutées ;
  - `build.ts` : ombres de contact (5.3) ; `paint.ts` : détail de pavés en gros plan ;
  - `grade.ts` : étalonnage retouché (vignettage de nuit .22 → .18, « the corners no longer go muddy » ; hautes lumières du soir en jaune chaud plutôt qu'orange).
- **Comment le repérer** : fais une comparaison côte à côte avant/après sur 3-4 images clés par plan.

---

## 6. Accessoires : le billet (assignat)

### 6.1 Un pouce peint dans le billet, deux mains qui ne collent pas
- **Symptôme** :
  - révision 2, « une forme bizarre en bas à gauche du billet » ;
  - R2 : v983-1079 (t1155-1251), deux mains sur le billet : un pouce pâle peint dans l'assignat en bas à gauche, et la main ombrée de Drouet arrêtée derrière le bord droit (main `hold_up` bornée à 200-580 unités de dessin) ; le bras n'est qu'un fin bâton noir ;
  - R3 : v1080-1283 (t1252-1455), le bras de Drouet est un tuyau fin terminé par un disque de chair rond derrière le bord droit du billet, tandis qu'un pouce sans bras pince le coin gauche.
- **Cause** : `drawAssignat()` (`toon.ts`) peignait un pouce dans le coin bas gauche du billet, alors que la main du porteur était dessinée ailleurs sur sa propre carte.
- **Correction** :
  - `toon.ts`, `drawAssignat(p, w, h, thumb = false)` : « no hand is ever painted into the bill » (le paramètre `thumb` est ignoré) ; `cast.ts`, `assignat()` appelle `drawAssignat(p, cw, ch, false)` ;
  - `cast.ts`, `relay()` : la main de Drouet tient le bord proche du billet à mi-hauteur (`toDesign()` du bord, bornée à 20-580) ;
  - Drouet qui tient le billet utilise une tenue sans pouce (`DR_H`, `noThumb: true`) ; une petite carte de pouce séparée (`toon.ts`, `fxThumb()`, 0.05 m, peau pré-ombrée `#c18761`) est posée par-dessus le bord avant du billet ; la main de Drouet est à droite.
  - R2b : « painted thumb removed » ; R3b n°6 : corrigé (mineur : la manche est noire en gros plan mais verte à v1135).
- **Comment le repérer** : arrête-toi sur chaque plan où un accessoire est tenu. Compte les mains et les pouces, et vérifie qu'ils sont reliés à un bras.

### 6.2 « Un truc bizarre en bas à gauche du billet » (suite)
- **Symptôme** : révision 3, « à 34 s et plus, un truc bizarre en bas à gauche du billet » (v1020+ = t1192+). À la 2e passe, R2b relève deux candidats dans cette zone :
  - v1020-1079 : la main de Drouet est derrière le billet sans pouce devant, et la manchette se lit comme une pilule grise plate ;
  - le portrait du billet : une minuscule étoile à 6 branches sur l'épaule du buste, qui peut se lire comme une « forme bizarre ».
- **Cause** : main sans pouce visible devant le papier ; détail trop petit à la taille du billet.
- **Correction** :
  - pouce posé sur le bord avant (`fxThumb()`, voir 6.1) ;
  - `toon.ts`, `drawAssignat()` : l'étoile de l'ordre est supprimée (« at bill size it read as a stray little shape on the shoulder »).
- **Comment le repérer** : regarde le billet à sa taille réelle à l'écran, pas en gros plan sur le dessin. Supprime tout détail isolé de quelques pixels.

### 6.3 Le portrait du roi sur le billet
- **Symptôme** : révision 3, « améliorer le personnage du roi (portrait du billet) ».
- **Cause** : non documentée.
- **Correction** : `toon.ts`, `drawAssignat()` :
  - le médaillon utilise `kingHead()`, le même visage que le roi dans la fenêtre, en couleurs de gravure (`mono`), perruque `#f8f0de` ;
  - buste gravé avec un revers, le cordon et un jabot de dentelle (« no buttons, no discs ») ;
  - dans la fenêtre, le profil du roi regarde vers la droite de l'écran, comme celui du billet (`cast.ts`, `paris()` et `relay()`).
  - R2b : « the king profile works (905-960) and matches the bill ».
  - Pas de texte : le billet n'a qu'une bordure, le portrait, une couronne et un sceau (contrôlé « clean » à chaque passe).
- **Comment le repérer** : fais une comparaison côte à côte du portrait du billet et du profil du roi dans la fenêtre. Le spectateur doit faire le lien en une seconde.

### 6.4 Le billet flou et doublé quand il se pose sur les pavés
- **Symptôme** :
  - R3 : v1584 (t1756), le billet sort flou et doublé, sans ses contours d'encre (sans doute la « forme bizarre » vue par l'utilisateur) ; sur la même frame, il passe de sa carte de chute à sa carte au sol avec un saut de rotation d'environ 3° et un décalage ;
  - R3b : la caméra freine bien, mais le billet seul devient flou et doublé à v1581 (netteté 975 → 117) et ne redevient net qu'à v1587, au passage carte de chute → carte au sol ; les pavés restent nets.
- **Cause** (commentaire de `cast.ts`) : le flou de mouvement de caméra du post-traitement distinguait les cartes du décor par la profondeur seulement. Le billet posé à moins de ~4.5 cm du sol, vu à 0.9 m, comptait comme des pavés : il était étalé et doublé à t1753-1758 pendant que l'objectif bougeait. L'occlusion ambiante et l'encre du décor ne voyaient pas non plus la carte à plat.
- **Correction** :
  - `ink.ts`, calque `CARD` : l'InkPass rend la couverture visible des cartes, y compris des cartes posées à plat (`cardMask`) ; pas d'encre du décor ni d'AO sur elles ;
  - `Bridge.tsx` : `fx.mb.cardMask = fx.ink.cardMask` ; `lensblur.ts` (`mbCardMask`) ne floute jamais une carte et ne l'étale jamais dans le fond ;
  - `cast.ts`, `assignat()` : pour la chute finale, le billet flotte 6 cm au-dessus des pavés pendant que l'objectif décélère, puis se pose à plat en 8 frames quand il s'arrête (`settle = 0.06 * (1 - smooth((f - CUE.BILL_FALL[1]) / 8))`) ;
  - `story.ts`, `assignatAt()` : le voletement s'éteint en (1-u)^2, et la chute finit exactement dans la pose au sol (`ASSIGNAT_GROUND_SPIN`).
- **Comment le repérer** : mesure la netteté de la zone du billet sur chaque frame de la fin (une chute brutale de la valeur signale le flou). Regarde l'image fixe t1756, et toute frame de changement de carte.

---

## 7. Intro et rétention

### 7.1 Couper l'accroche : commencer sur « En juin 1791 »
- **Symptôme** : révision 1, « commencer le short à « En juin 1791 » et couper le début ».
- **Cause** : choix de montage de l'utilisateur.
- **Correction** : le rendu commence à la frame 172 de la timeline (5.7333 s). Toute l'intro doit donc fonctionner à partir de t172 : `story.ts` le rappelle (« the render starts at 172; retention is decided here »). Le son est coupé au même échantillon (8.1).
- **Comment le repérer** : regarde la toute première image rendue ; elle doit déjà être en mouvement et lisible (voir 7.2).

### 7.2 Une intro trop statique
- **Symptôme** :
  - R1b, note de l'accroche (v0-300) : 6/10 ; le plan large de v75-110 est grandiose, mais v0-51 est un plan moyen presque immobile ;
  - R1b propose : lancer la grue dès v0, avec des torches qui s'agitent au premier plan et un roi qui gesticule ; tasser la foule en une masse dense contre les grilles, avec des silhouettes et des torches levées au premier plan ; étalonnage avec une lumière chaude des torches par en dessous sur la façade lavande trop plate, plus de ciel et de lune, un vignettage ;
  - révision 3 : « soigner l'intro au maximum (c'est là que se joue la rétention) ».
- **Cause** : non documentée.
- **Correction** :
  - caméra en mouvement dès la première image : `story.ts`, la clé `{ f: 128, dur: 40, s: S1b }` démarre la grue avant le début du rendu (« moving at 172 ») ; l'objectif long monte d'entre les têtes jusqu'au-dessus d'elles (`S1A0` → `S1A1`) ;
  - le roi gesticule dans sa fenêtre (`cast.ts`, `paris()` : fioriture paume ouverte, main levée, rire) ;
  - foule dense et animée (`cast.ts`, `CROWD1`) : une grille où seuls 26 % des places sont vides ; 4 rangs irréguliers à 0.72 m d'écart, tassés contre le cordon de bornes et de chaînes sous le palais, torches levées ; 6 porteurs de torches au premier plan, alignés sur la ligne de visée de l'objectif long, en silhouettes à contre-jour jusqu'à la montée de la grue ; torches agitées, poings levés au rythme d'un slogan, têtes qui se tournent ;
  - éclairage : 6 sources chaudes à 2.6 m de haut éclairent la façade depuis la foule (`build.ts`, `addLamp`, rayon 11 m) ; lune basse au-dessus du palais, à droite du dôme (`world.ts`, `MOON_DIR`) ; étalonnage de l'intro (7.5).
- **Comment le repérer** : regarde les 3 premières secondes à vitesse réelle, puis image par image. Il ne doit y avoir aucune image immobile ni vide.

### 7.3 Le bâtiment de l'intro trop plat
- **Symptôme** : révision 3, « améliorer le design du bâtiment de l'intro ».
- **Cause** : non documentée.
- **Correction** : `build.ts`, `tuileriesGrand()` :
  - un pavillon central autour de la fenêtre du roi : colonnes colossales sur des piliers à bossages, fronton avec un soleil sculpté et des statues (`paint.ts`, `tympanumTex()`), dôme carré « à l'impériale » avec nervures dorées, œil-de-bœuf et lanternon ;
  - une balustrade de pierre à urnes le long du toit, des balcons en fer forgé et des frontons sculptés à chaque fenêtre de l'étage noble, des fenêtres éclairées avec rideaux çà et là, de hautes cheminées qui fument (`world.ts`), des lanternes sur potence ;
  - l'écu fleurdelisé au-dessus de la fenêtre du roi (`royalArmsTex()`, voir 4.4).
- **Comment le repérer** : regarde le bâtiment sur l'image la plus large de l'intro. Il doit se reconnaître comme un palais à la première seconde.

### 7.4 La rue de l'intro pas assez vivante
- **Symptôme** : révision 3, « rendre la rue de l'intro plus vivante ».
- **Cause** : non documentée.
- **Correction** :
  - `cast.ts`, `paris()` : passants qui traversent la place de profil (`WALKERS1`), deux enfants qui poursuivent un chien devant la foule ;
  - `build.ts`, `dressParis()` : étals de marché, charrettes de légumes, fontaine, tonneaux, caisses, orangers en bac, guérites, bornes et chaînes, réverbères, bancs, affiches vierges, niche, linge qui sèche, flaques, pots de fleurs, décals au sol (déchets, grille d'égout, zones mouillées, caniveaux) ;
  - `world.ts` : fumée des cheminées (bouffées qui montent de 4.5 m et dérivent vers l'est en 8 s, en boucle, sans saut).
- **Comment le repérer** : sur chaque image de l'intro, compte ce qui bouge en dehors du sujet principal.

### 7.5 Étalonnage de l'intro
- **Symptôme** : R1b : façade lavande plate, il manque la lumière chaude des torches, du ciel, la lune et un vignettage.
- **Cause** : non documentée.
- **Correction** :
  - `grade.ts`, `GRADE_PARIS` : bleu de lune riche au lieu du voile lavande (teinte des ombres et des tons moyens déplacée du violet vers un bleu cyan) ; pied de courbe plus ferme (0 → .012, .1 → .14) ; saturation des tons moyens plus forte ; hautes lumières chaudes, `warmKeep` .95 pour que bougies, torches et fenêtre éclairée restent ambrées ; « QA r1b: + a real vignette (.16 -> .26 from r .34) », `warmSat` .12 (au-delà, la pierre vire à l'orange) ;
  - `world.ts`, `update()` : au plan 1, les tons éclairé et ombré sont multipliés par 0.78, pour que Paris corresponde à la nuit du plan 4 (médiane ~.33).
- **Comment le repérer** : compare la luma et la saturation de chaque plan aux repères de la QA automatique (tableau en tête de ce document).

---

## 8. Son

### 8.1 Couper le début sans décaler la voix
- **Symptôme** : risque d'une voix décalée par rapport à l'image après la coupe de l'accroche (révision 1).
- **Cause** : couper à 5.720 s puis ajouter 13.3 ms de silence au début aurait mis la voix 26.7 ms en retard.
- **Correction** : coupe exactement à 5.7333 s = frame 172 = échantillon 275,200 (à 48 kHz), dans le creux de 5.72-5.74 s (~-20 dBFS RMS, plat). Voix : fondu d'entrée de 10 ms, sinon bit-identique ; bruitages : fondu d'entrée de 150 ms. Résultat : 2,556,800 échantillons = 53.2667 s = 1598 frames, alignés sur l'image (échantillon k = échantillon timeline 275,200 + k). Voir `mix_v2.py` et la section v2 de `cues.md`.
- **Comment le repérer** : calcule la frame de départ × 1600 échantillons et coupe exactement là, dans un creux de la voix ; vérifie que le stem voix reste bit-identique après son fondu d'entrée.

### 8.2 Des bruitages trop forts, deux fois
- **Symptôme** : révision 1, « bruitages un peu moins forts » ; révision 2, « bruitages encore −4 dB ».
- **Cause** : non documentée au-delà du jugement de l'utilisateur. Le réglage de départ était le mixage standard (événements à −6 dB sous leur niveau naïf, nappes avec ducking de −4 dB sous la voix), dans un short sans musique.
- **Correction** : v2 : −3 dB ; v3 : encore −4 dB, soit −7 dB au total par rapport à la v1. Stem bruitages : −30.9 LUFS (v1) → −33.8 (v2) → −37.8 LUFS (v3 et v4), soit 13.4 → 16.2 → 20.2 LU sous la voix.
- **Comment le repérer** : fais écouter un extrait à l'utilisateur avant le mixage final. Pour un short du même type, pars directement de la marge finale de Varennes (bruitages ~20 LU sous la voix).

### 8.3 Des bruitages désynchronisés après une retouche de l'image
- **Symptôme** : après chaque correction d'image, des sons ne tombent plus sur leur action.
- **Cause** : les bruitages sont placés d'après les frames de `story.ts` (exportées dans `story_frames.json`) ; toute retouche du minutage les décale.
- **Correction** :
  - v3 : `inn_door` recalé sur la nouvelle ouverture de la porte (826-840) ;
  - v4 : portière du plan 2 recalée (loquet à 540, gonds 540-548, au lieu de 563-571) ; bottes de Drouet sur la nouvelle phase de pas de `drouetAt(3)`, 5 dB plus douces dans l'embrasure ; poussée de la charrette sur 4.3 m ; voletement du billet calé sur sa vitesse de chute, pose douce à 1756 ; `branch_whip` recalés sur le nouvel objectif du plan 4 (f1542, f1544, f1549, f1551, f1555).
- **Comment le repérer** : après toute retouche du minutage de l'image, relance `node dump_story.mjs && python mix.py` (ou le script de la version en cours, par exemple `mix_v4.py`), puis réécoute chaque événement retouché image par image.

### 8.4 Le mixage final : cibles tenues
- **Symptôme** : aucun ; ce sont les cibles à tenir.
- **Cause** : sans objet.
- **Correction** : `mix_v4.wav` : intégré −14.0 LUFS, true peak −1.0 dBTP, LRA 1.7 LU ; un seul gain de master (+3.54 dB) sur voix + bruitages, puis limiteur true peak à −1 dBTP (réduction de gain max 1.04 dB, > 0.5 dB sur 0.18 % des échantillons) ; voix bit-identique à `voice.wav` après son fondu d'entrée de 10 ms (True). Chaque nappe et chaque queue de réverbération est coupée sur les coupes.
- **Comment le repérer** : `ffmpeg ebur128` sur le mixage et sur chaque stem, contrôle bit à bit du stem voix, puis QA automatique de la vidéo finale (loudness, silences).

---

## Défauts restés dans la version finale

Défauts mineurs connus, acceptés dans la version livrée :
- **Deux glissements de chevaux au dételage** (plan 3, cour du relais). Cause non documentée.
- **Un cheval un peu délavé par un halo de lanterne au début.** R1 et R1b : « the horse by the lantern is washed translucent » (v262 et v456-460). v262 = t434, la même zone de frames que le pop de lanterne de 5.4. Cause non documentée.
- **Le changement d'attelage peu visible** (voir 2.4).
- **Des lueurs de lanternes sur les visages des gardes** (v1464-1494, voir 5.6).

Signalés comme non corrigés ou partiels à la 2e passe, sans confirmation de correction dans les sources (statut final non documenté) :
- une bande rouge tramée le long du bas de la charrette (v1404-1425) ; R3 notait aussi un contour en escalier et du tramage sur la charrette (v1404-1445) ;
- les 45 % du bas de l'image de l'arrestation, vides (v1476-1500) ;
- la texture des pavés qui change en 1 frame (v1573→1574) ;
- le billet coupé par le bord gauche pendant le panoramique vers Drouet (v1127-1145) ;
- les puits de lumière lunaire à bords droits au passage de la grue (v1374-1381) ;
- le bonnet de la gouvernante en « bandeau de pirate » (v301-420), son bras qui traverse son visage et le chapeau qui ne descend pas (v335-353) ;
- l'attelage qui s'emmêle (v1534-1556) ;
- la manche de Drouet, noire en gros plan mais verte à v1135 ;
- les rayures verticales vert/bleu des peupliers (v470-512) ;
- les arcs de cheveux hors des têtes, les têtes en double disque, les jupes hexagonales (R1 n°12).

---

## Check-list avant le rendu 2K

1. Vérifie chaque plan image par image (planche contact), et en particulier ±3 frames autour de chaque coupe, de chaque changement de vue et de chaque passage de porte.
2. Aucune carte ne traverse une autre carte, une porte, une portière ou la caisse de la voiture ; chaque porte est entièrement ouverte avant la première frame où quelqu'un croise son plan.
3. Aucun personnage dans l'arc de balayage d'un battant pendant qu'il s'ouvre.
4. Montées et descentes (voiture, cheval) : marchepied, seuil, intérieur ; jamais une carte debout qui glisse verticalement ; même échelle avant et après chaque changement de carte (`RIDER_K`).
5. Changements de face à profil : jamais en pleine foulée ; écrasement sur 4 f avec clignement, phase au temps de passage.
6. Marcheurs : 0.06 m/f au plus quand on voit les pieds ; pieds plantés, ordre des files fixe, aucune poussée image par image.
7. Aucune animation par paliers : pas de `q(x, n)` à peu de niveaux sur une valeur qui pilote un mouvement ; frame-diff sur un personnage assis immobile.
8. Personne n'apparaît de nulle part : entrée par un bord, une porte ou l'ombre ; tout passage ombre ↔ lumière dure au moins 8-9 frames ; la fenêtre de la voiture n'est jamais vide quand elle doit être occupée.
9. Chevaux : jambes animées partout où ils se déplacent (phase intégrée depuis la vitesse) ; changements d'allure et têtes fatiguées en fondu ; queue visible de dos, aucun « visage » sur la croupe.
10. Ombres : un seul frustum d'ombre par plan, cible calée sur les texels ; zoom sur les bords d'ombre pendant 10 frames ; aucune ombre portée plus claire que le sol.
11. Une ombre de contact sous chaque pied, sabot, roue et objet posé.
12. Aucune lanterne ni torche à moins de 2.5 m d'un objectif ; les halos s'estompent sous ~3 m.
13. Brume et fumée : alpha nul sur tous les bords, rien sur le trajet de la grue, encre atténuée derrière les voiles (`VEIL`).
14. Cartes posées à plat (billet) : sur le calque `CARD` (`cardMask`), soulevées de quelques centimètres pendant que l'objectif bouge, nettes sur la dernière image (mesure de netteté).
15. Billet : aucune main ni aucun pouce peint dedans ; la main du porteur tient le bord, le pouce passe devant ; aucun détail isolé de quelques pixels (étoile) ; portrait = le même visage que le roi.
16. Zéro texte lisible : affiches, blason, rayures, billet ; aucun ornement qui se lit comme une lettre ou un visage.
17. Cadrage : visages entiers ; aucun montant ni aucune roue qui coupe un visage plus de quelques frames ; pas de moitié basse vide ; aucune figure « à deux têtes » dans la foule.
18. Caméra : environ 65 px/f au plus de glissement devant une façade répétitive ; grues en recul droit ; chaque arrêt en douceur (`glide`), jamais net.
19. L'action de chaque temps fort de la voix est dans le cadre (changement d'attelage, sortie de Drouet).
20. Intro : la caméra bouge dès la première image rendue (t172), la foule est dense et animée au premier plan, le décor est riche, l'étalonnage a sa lumière chaude et son vignettage.
21. Décor habillé : arrière-plans et bas d'image garnis, accessoires à plus de 2.5 m des objectifs et hors des zones d'action.
22. QA automatique : aucun pop (> 3x la médiane locale), aucune tenue figée de 12 f ou plus, aucun noir ou blanc imprévu, luma et saturation par plan dans les repères.
23. Son : `node dump_story.mjs` + mixage relancés après la dernière retouche de minutage ; chaque bruitage retouché réécouté sur son action.
24. Son : voix coupée à l'échantillon exact de la frame de départ, dans un creux, et bit-identique ; −14 LUFS intégré, true peak ≤ −1 dBTP ; niveau des bruitages validé par l'utilisateur.
25. Rendu final en 1440x2560 (`--scale 1.3333333333333333` : avec `1.3333` la hauteur n'est pas entière et le rendu échoue), puis QA automatique sur le fichier livré.
