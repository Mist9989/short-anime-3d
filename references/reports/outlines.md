# Contours (traits d'encre noirs sur le monde 3D) : référence vs nous

Dossier de travail : `references/outlines/` (scripts, recadrages, planches, résultats, recette, banc d'essai sur une scène jouet).
Étude privée uniquement. Rien n'a été modifié dans `your Remotion project` ; aucune nouvelle image fixe (still) n'a été rendue.

## 1. L'écart en un paragraphe

Dans la référence, **74 % des arêtes de géométrie que j'ai scannées portent un trait noir (36 sur 49)** : silhouettes sur le ciel,
sauts de profondeur entre objets, plis convexes (coins de boîtes, dessus de tables, sommets de murs, cadres de fenêtres) et contacts
(objet posé au sol). Les traits font **~3 px de large en 1080p**, presque noirs quand ils sont nets, francs (seulement anticrénelés), et ils
**gardent à peu près la même largeur à l'écran** quand les objets rapetissent, si bien que la profondeur de champ (DOF) les floute ensuite en même temps
que l'arrière-plan. **Dans nos images fixes, 0 scan sur 20, sur les mêmes types d'arêtes, ne montre de trait.** Les « traits » visibles
dans nos frames sont les contours Canvas2D propres aux personnages et les traits peints des textures. Le `ink.ts` actuel ne peut pas fonctionner dans
la chaîne actuelle : la DOF du même EffectPass fusionné l'efface, et son laplacien de 1/z ne voit pas du tout les plis
(voir section 4).

## 2. Mesures

Méthode : scans de luma perpendiculaires (moyennés sur 5 px en travers du scan, pas de 0.25 px) à travers des arêtes isolées.
`EW` = largeur équivalente en encre pleine (aire du creux / (fond - luma de l'encre 12)), qui ne dépend pas du flou.
Un trait compte comme « présent » s'il est au moins 35 % plus sombre que le côté le plus clair et si sa FWHM est ≤ 5 px en 720p. Les frames
de la référence font 720x1280, donc x1.5 donne le 1080p. Les nôtres font 540x960, donc x2. La bande des sous-titres (60-74 % de la hauteur) est masquée
dans toutes les statistiques de frames. Les contours des sous-titres ont été mesurés à part, uniquement pour le calibrage.
Scripts : `scanline.py`, `scans.py`, `scan_defs.py` (66 scans de la référence), `ours_scan_defs.py` (20 des nôtres),
`rise.py`, `density.py`, `edgeink.py`, `lineprof.py` (première passe, 32 zones). Résultats bruts : `results/*.json|csv`.

### 2.1 Référence, par type d'arête (66 scans, 8 vidéos avec scans + 6 de plus dans la première passe)

| type d'arête | scans | avec trait | EW @1080 px médiane (IQR) | FWHM @1080 | luma du cœur, médiane | RGB du cœur, médiane |
|---|---|---|---|---|---|---|
| saut de profondeur (objet vs objet plus lointain) | 26 | 19 | **3.09** (2.38-4.46) | 3.4 | 19 | (48,13,9) |
| silhouette sur le ciel | 8 | 6 | **3.04** (2.06-3.73) | 3.4 | 51 | (68,46,38) |
| pli convexe (même objet, sans saut de profondeur) | 10 | 8 | **2.17** (1.85-3.16) | 3.2 | 34 | (50,29,10) |
| contact (l'objet touche le plancher ou le sol) | 5 | 3 | **2.42** (1.70-3.04) | 3.4 | 30 | (58,24,17) |
| trait de texture peint (planches, carrelage, joints) | 7 | 1 | 3.66 (doux) | 6.4 | 68 | (111,60,17) |
| attendu mais absent : mur/sol, plinthe, horizon marin | 3 | **0** | - | - | - | - |
| contour de personnage (dessiné, pas issu de la 3D) | 5 | 4 | 4.57 (3.57-5.17) | 5.4 | 41 | (42,40,33) |
| contour des sous-titres (calibrage) | 2 | 2 | 5.87 | 5.4 | 0 | (0,0,0) |

* **Couleur :** l'encre est noire ou presque noire. Les traits proches et nets atteignent une luma de 0-10 (arche de v15 : cœur 6-7). Les
  médianes RGB colorées du cœur viennent du sous-échantillonnage chroma 4:2:0, qui étale la teinte de la surface voisine dans
  les traits de 2-3 px de large, et de la DOF et de l'atmosphère qui éclaircissent les plus lointains. Utilise un presque-noir neutre, `#0b0a0c`.
* **Netteté :** la montée 10-90 % des traits du décor est de **1.45 px @720** (médiane, n=46 flancs), contre **1.58 px** pour
  les sous-titres vectoriels nets. Les traits sont donc aussi nets que l'encodage le permet : anticrénelés, pas floutés. Ils ne
  deviennent flous que là où la DOF floute tout l'arrière-plan (arche rocheuse de v12, monticule de neige proche de v07).
* **Distance :** les traits de géométrie proches / moyens / lointains ont une EW médiane de **3.09 / 2.82 / 3.04 px** (n = 17 / 15 / 4 avec
  trait). La série la plus propre est celle des arches de v15 qui s'éloignent : **3.36 → 2.82 → 2.15 px**, avec un cœur à **7 → 16 → 50**, alors que
  la géométrie de l'arche rétrécit d'environ 4x. La largeur reste donc presque constante à l'écran, avec un léger amincissement et
  éclaircissement au loin. Elle ne suit pas la perspective.
* **Doublons :** aucun. L'encre du décor ne dessine jamais de cadre autour des cartes des personnages, et les personnages ne sont pas
  cernés deux fois. Les contours des personnages sont leurs propres traits dessinés, plus épais (4.6 px).
* **Quelles arêtes reçoivent un trait :** les silhouettes, les sauts de profondeur, les plis convexes et les contacts d'objets, oui. Les jonctions
  concaves de l'enveloppe de la pièce (mur/sol, plinthe) et l'horizon marin, non. Les contacts se comportent comme le contour propre d'un objet
  qui rencontre le sol (tonneau/pont 3.7 px, souche/sol), et ils sont faibles pour les murs posés sur l'herbe.
* **Les traits de texture sont peints.** Les joints de planches, les joints de carrelage et les grilles de plafond sont des bandes sombres teintées,
  douces et larges (luma du cœur ~68, brun foncé sur le bois). Ils suivent la perspective et se floutent avec la DOF. Seul 1 sur 7 passe le
  test du « trait ». Ils font partie des textures, pas de la passe d'encre.

### 2.2 Nous, mêmes scans (20 scans sur c_1042, c_1050, c_1075, c_140, c_1340, c_1450, c_1800, b_470)

| type d'arête | scans | avec trait |
|---|---|---|
| silhouette sur le ciel (cône de tour, parapets, toit) | 6 | **0** |
| saut de profondeur (réverbères vs eau, jante de roue, tours lointaines) | 10 | **0** |
| pli convexe (sommet du mur de quai, caisson du garde-corps, poutre du tablier) | 3 | **0** |
| contact (soubassement sur les pavés) | 1 | **0** |

### 2.3 Frames entières (les 20 vidéos de référence, une frame toutes les 3 s ≈ 357 frames ; 39 de nos images fixes b_/c_ ; échelle 540x960)

| métrique | référence | nous | nous, plans de décor c_ |
|---|---|---|---|
| pixels de traits sombres (`density.py`), % trait / % noir | 1.70 / 0.81 | 1.95 / 0.96 | - |
| part des arêtes fortes couvertes d'encre (`edgeink.py`) | **45.1 %** | **33.4 %** | **27.4 %** (plans de décor seul 6-23 %) |

Notre densité de traits ne paraît similaire qu'à cause des contours des personnages et des traits peints sur les façades. Sur les
arêtes 3D elles-mêmes, nous n'avons aucune encre.

## 3. Choix de la technique

* Les traits sont posés sur les **arêtes de géométrie** (contours, silhouettes, sauts de profondeur, plis convexes, contacts). Leur
  **largeur à l'écran est presque constante** (3.4 → 2.2 px du proche au lointain). Ils sont **anticrénelés et nets**,
  presque noirs, appliqués **avant la profondeur de champ** (ils se floutent avec l'arrière-plan), et **pas dessinés sur les
  cartes des personnages**. Cela ressemble à une sortie Blender Freestyle ou Grease Pencil Line Art (épaisseur constante en pixels
  pour les traits de contour, de pli et de bordure) superposée avant la DOF.
* **Pas de coque inversée (inverted hull).** Une coque ne donne que les silhouettes, suit la perspective, ne peut pas dessiner les traits
  de pli ni de contact, et cernerait les billboards.
* **Notre équivalent :** une **passe de détection d'arêtes profondeur + normales** en espace écran. Rends un buffer de normales et de profondeur
  du décor seul, détecte les arêtes avec un test de profondeur normalisé à l'échelle et un test d'angle des normales, règle la largeur avec le
  rayon d'échantillonnage, anticrénèle, et superpose le tout avant la DOF. Les traits de texture peints restent dans `paint.ts`.

## 4. Pourquoi le nôtre n'en montre presque aucun (ancien `ink.ts` + `Bridge.tsx`)

1. **La DOF l'efface.** Le `<EffectComposer>` de R3F fusionne les Effects consécutifs en un seul EffectPass, donc Ink, DOF, Bloom
   et Tone tournent dans un seul shader. La sortie de la DOF est `inputColor*(1-cocFar) + colorFar`, où `colorFar` est flouté
   à partir du buffer d'entrée de l'EffectPass, qui ne contient pas d'encre. Donc partout où le CoC > 0, l'encre est remplacée par un flou sans
   encre. La majeure partie du décor est hors mise au point : la plupart des traits disparaissent, et l'arrière-plan n'en a aucun.
2. **Les plis et les contacts sont mathématiquement invisibles.** Sur un plan, le laplacien de 1/z vaut 0. À travers un coin de
   boîte, il ne vaut que |tanθ1 − tanθ2| / f_px (f = 2637 px pour un FOV de 40° à 1920 px). Pour un coin à 45°, cela donne
   **7.6e-4, 79x sous le seuil de 0.06**. Seuls les vrais sauts de profondeur peuvent déclencher un trait.
3. **Le laplacien bilatéral** place la moitié de chaque trait du côté lointain (ciel ou arrière-plan), que la DOF efface ensuite.
   Ce qui reste fait ≤ 2 px de large.
4. **`farFade` 130-260 m** supprime complètement les tours et les collines.
5. **`#221f2e` à une intensité (strength) de 0.92, mélangé en lumière linéaire**, donne un cœur gris (luma 60-80) et un trait qui paraît
   ~30 % plus fin.

## 5. Recette pour notre stack (postprocessing 6.37.2, three 0.175, R3F postprocessing 3.0.4)

### 5.1 Remplace `src/videos/bridge/ink.ts` par `recipe/ink.ts`

Le fichier est complet et vérifié au typage (tsc contre les types three et postprocessing de reel-kit). Il a tourné en
WebGL avec exactement cette stack : MSAA 4, buffers HalfFloat, DOF, Bloom, tone mapping Neutral, avec 0 erreur GL. Le code
source complet est en annexe.

Conception :

* **`InkPass extends Pass` (pas un Effect),** donc R3F la garde comme passe à part et ne la fusionne pas avec la DOF.
  `needsSwap = false` : elle fait son compositing dans une cible temporaire et recopie le résultat dans le buffer d'entrée (couleur seulement), donc
  la texture de profondeur du composer reste intacte. `needsDepthTexture = true` lui donne la profondeur principale pour les tests
  d'occlusion.
* **Sa propre cible normales + profondeur du décor seul** (HalfFloat, Nearest, `DepthTexture` UnsignedInt, sans MSAA). La scène est
  rendue une fois de plus avec `scene.overrideMaterial = normalMat`, la caméra avec le calque (layer) `NOINK` (3) désactivé,
  `background = null` et `shadowMap.autoUpdate = false` : les shadow maps ne sont pas re-rendues et gardent les
  ombres portées des billboards. `normalMat.onBeforeRender` copie la `map` + l'`alphaTest` de chaque objet (y compris les
  groupes multi-matériaux), donc les plans découpés du décor, comme le panneau d'enseigne et l'horloge de l'église, gardent leur forme. Vérifié :
  un disque rond en alpha test reçoit un contour rond (`test/shots/harness_cutout_disc_4x.jpg`). Ça marche pour Mesh et
  InstancedMesh, et pour la géométrie sans normales (repli sur des normales calculées par dérivées).
* **Arêtes de profondeur :** la différence seconde signée de 1/z, `s = (1/z1 + 1/z2 - 2/zc)·zc`, est linéarisée et
  normalisée à l'échelle. Elle vaut exactement 0 sur tout plan, donc les sols vus en incidence rasante ne produisent aucun faux trait. Seul le **côté proche**
  est encré : `smoothstep(depthLo 0.02, depthHi 0.05, -s)`. Les cordes fines et les poteaux deviennent des traits pleins, comme dans la
  référence.
* **Arêtes de pli :** un test d'angle des normales à profondeur égale (|Δz| < 2 % de z), `1 - smoothstep(cos 65°, cos 50°, n0·nq)`.
  Il est bilatéral, sa largeur vaut `creaseScale` 0.64 x la largeur de silhouette, et les plis concaves (le voisin est devant le
  plan tangent) sont dessinés à `concaveGain` 0.7. Cela donne des traits de contact là où les objets touchent le sol. Mets-le à 0
  en intérieur, où la référence n'en a aucun.
* **Largeur par le rayon d'échantillonnage :** 4 directions (x, y et les deux diagonales), pas de 1..6 px, avec une couverture
  continue `clamp(w + 0.5 - d, 0, 1)`. Résultat : aucun saut de largeur (popping), et l'anticrénelage (AA) est intégré. La largeur suit le
  comportement mesuré, constant à l'écran : `widthNear 3.4 px @ 6 m → widthFar 2.2 px @ 90 m` (distance logarithmique), opacité
  ×0.75 à 90 m, disparition en fondu sur **150-450 m**.
* **Occlusion par les personnages :** si la profondeur principale contient quelque chose de plus proche que le décor (un billboard), aucune
  encre du décor n'y est dessinée. Les personnages ne gardent que leurs propres contours, sans doublons ni rectangles.
* **Compositing :** un filtre en tente (tent) 3x3 (AA) sur le masque, mélangé en gamma d'affichage comme Canvas2D, couleur `#0b0a0c`,
  intensité 1.0. EW mesurée dans la scène jouet : **3.7 / 3.2 / 2.6 / 1.5 / 1.1 px à 3 / 12 / 25 / 90 / 200 m**
  (silhouettes, 1080p) et **2.3 → 0.9 px** pour les plis. La référence fait 3.4 → 2.8 → 2.2 px pour les silhouettes et
  les sauts de profondeur, et 2.2 px pour les plis.

### 5.2 `Bridge.tsx` (`Inner`), le seul changement de câblage

```tsx
import { InkPass } from "./ink";                     // was: import { InkEffect } from "./ink";
// const { camera, scene } = useThree();             // already there
const fx = useMemo(() => {
  const dof = new DepthOfFieldEffect(camera, { worldFocusRange: 4, bokehScale: 2, resolutionScale: 0.5 });
  dof.target = target;
  return {
    dof,
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),   // was: new InkEffect()
    bloom: new BloomEffect({ intensity: 0.3, luminanceThreshold: 0.86, luminanceSmoothing: 0.1, mipmapBlur: true }),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
  };
}, [camera, scene, target]);
useEffect(() => () => fx.ink.dispose(), [fx]);

const post = useMemo(() => (
  <EffectComposer multisampling={4}>
    <primitive object={fx.bloom} dispose={null} />   {/* 1. own EffectPass: bloom from the un-inked image */}
    <primitive object={fx.ink} dispose={null} />     {/* 2. InkPass (a Pass, never merged)             */}
    <primitive object={fx.dof} dispose={null} />     {/* 3. DOF + tone merged: DOF blurs the lines too  */}
    <primitive object={fx.tone} dispose={null} />
  </EffectComposer>
), [fx]);
```

* **Ordre : bloom → ink → DOF + tone.** Si le bloom passe après l'encre, son halo éclaircit le cœur des traits (cœur 0 →
  53) et amincit les traits de 22-28 % près d'un ciel lumineux. Avec le bloom en premier, j'ai mesuré une EW de 3.65 et un cœur à 0.
* **Garde `multisampling={4}`.** InkPass lit la couleur MSAA résolue et réécrit dedans, ce qui est sans danger. Avec
  `multisampling={0}`, l'ordre avec le bloom en premier crée une boucle de rétroaction sur la texture de profondeur. Dans ce cas, utilise
  ink → dof → bloom → tone et monte le `luminanceThreshold` du bloom à ≥ 0.95.
* Le code DOF existant, exécuté à chaque frame (`worldFocusRange = max(2.5, dist*0.55)`, `bokehScale`), ne change pas.
* Le constructeur d'InkPass appelle `camera.layers.enable(NOINK)`, donc le rendu principal et les shadow maps incluent
  toujours les objets NOINK.

### 5.3 Calques (layers) : garde les cartes tournées vers la caméra, le ciel et la fumée hors de l'encre

```ts
import { NOINK } from "./ink";
// cast.ts  Actor constructor and Fx constructor, after the mesh is created:
this.mesh.layers.set(NOINK);          // billboards: no rectangle outline, no holes in world lines
// world.ts
this.sky.layers.set(NOINK);           // gradient sky sphere
cloudMesh.layers.set(NOINK);          // every sprite cloud (loop where they are created)
smokeMesh.layers.set(NOINK);          // every smoke card
// optional: the hammered sign board (it has its own drawn outline) -> NOINK
```

* `layers.set` ne se propage pas aux enfants. Pour les groupes, utilise `g.traverse(o => o.layers.set(NOINK))`.
* L'eau reste sur le calque 0 (traits de contact entre le quai et l'eau). Si l'eau utilise un déplacement de vertex dans un shader
  personnalisé, mets-la sur NOINK, sinon le test d'occlusion supprimera des traits sur les crêtes des vagues.
* Tout objet `THREE.Line` ou `Points` va sur NOINK.
* Les acteurs et les effets créés à la demande (lazy) passent par les constructeurs Actor et Fx : ils sont donc couverts automatiquement.

### 5.4 Réglage et débogage (en direct : `fx.ink.set({...})` ; affichage : `fx.ink.debug = 1` masque, `2` normales du décor)

| option | défaut | signification | plage raisonnable |
|---|---|---|---|
| `color` | `#0b0a0c` | couleur de l'encre (sRGB) | garde un presque-noir neutre |
| `strength` | 1.0 | opacité max | 0.9-1.0 |
| `widthNear` / `widthFar` | 3.4 / 2.2 px | largeur de silhouette à `distNear` 6 m / `distFar` 90 m (1080x1920) | 3.0-4.0 / 1.8-2.6 |
| `creaseScale` | 0.64 | largeur de pli / largeur de silhouette | 0.55-0.75 |
| `depthLo` / `depthHi` | 0.02 / 0.05 | saut relatif de 1/z où les traits commencent / sont pleins | augmente-les si les sols reçoivent des traits |
| `angleLo` / `angleHi` | 50° / 65° | angle de pli : début / pleine intensité | 40-60 / 60-75 |
| `concaveGain` | 0.7 | traits de contact / de coin intérieur | 0 en intérieur, 0.5-0.8 en extérieur |
| `farOpacity` | 0.75 | opacité à 90 m | 0.6-0.9 |
| `fadeNear` / `fadeFar` | 150 / 450 m | disparition en fondu au loin | garde l'encre sur les tours lointaines |

Coût : un rendu supplémentaire du décor (normales) plus un masque en pleine résolution avec ≤ 96 lectures de profondeur par pixel. Cela fait
~30-60 ms par frame dans le banc d'essai jouet, ce qui convient au rendu hors ligne de Remotion.

### 5.5 Traits de texture peints (oui, nécessaires, dans `paint.ts`, pas dans la passe de post-traitement)

La référence peint dans les textures les joints de planches et les joints bout à bout, les joints de carrelage, les grilles de plafond, les rangs de tuiles et les interstices
des pavés. Ce sont des **teintes** sombres du matériau, pas du noir (joints du bois ≈ (111,60,17) sur un brun plus clair,
luma du cœur ~60-70), douces, et elles suivent la perspective.

* Planches du tablier : joints et joints bout à bout. Pierre du quai et du pont : mortier. Toits : rangs de tuiles. Façades : cadres des fenêtres et
  des volets. Pavés : interstices.
* Couleur = couleur locale × 0.35-0.45, alpha 0.8-0.9. Choisis la largeur pour obtenir **1.2-2 px en 1080p** à la distance de plan
  typique : px de texture = px d'écran × texels par mètre / px d'écran par mètre.
* Ne peins jamais de bordure le long d'une arête qui est aussi une arête de géométrie (arêtes de boîtes, bouts de planches contre une poutre). L'InkPass
  la dessine déjà, et la peindre en plus donne le double trait que la référence n'a jamais.
* Le trait `INKL` des façades, `rgba(40,30,40,0.85)`, doit devenir une teinte plus chaude de la couleur de la façade, gardée plus claire
  que l'encre de la géométrie.

## 6. Images de comparaison (toutes dans `references/outlines/`)

* `sheets/final_crops_1.jpg`, `final_crops_2.jpg`, `final_crops_3.jpg` : **76 recadrages tirés de 14 vidéos**, 64x64 px source
  agrandis 4x au plus proche voisin, chacun étiqueté avec le type d'arête, l'EW @1080 et le cœur.
* `sheets/side_by_side.jpg` : **7 paires référence vs nous** en comparaison côte à côte, à la même proportion de la largeur de frame. Paires : toit sur ciel,
  cabane sur ciel, saut de profondeur d'un tonneau, pli en haut de mur, pli de cadre de fenêtre, contact, arche lointaine. Dans chaque paire, la nôtre
  ne montre aucun trait.
* `sheets/scan_01..09.jpg` : 66 scans de la référence, chacun avec la ligne de scan et le trait détecté marqués.
  `sheets/ours_01..03.jpg` : nos 20 scans. `sheets/pass1_01..04.jpg` : première passe à 32 zones.
  `sheets/v01..v20.jpg` : grilles de frames. `crops/` : 118 recadrages individuels.
* `test/shots/harness_final.jpg` : la nouvelle InkPass dans la scène jouet (bloom → ink → DOF), avec la carte de l'acteur
  exclue et son propre contour intact. `test/shots/harness_mask.jpg` : le masque d'encre (silhouettes, plis,
  contacts, rambarde). `test/shots/harness_cutout_disc_4x.jpg` : la découpe alpha garde un contour rond.
* Banc d'essai : `test/main.ts` + `test/index.html` (bundle `test/bundle.js` ; paramètres `?debug=1|2`, `?dof=0`,
  `?ink=0`, `?bloomfirst=1`, `?calib=1`, `?crop=x,y,w,h`). C'est une scène jouet autonome, pas notre vidéo.

## 7. Les 5 changements au plus fort impact visuel

1. **Remplace `InkEffect` par `InkPass` et ordonne le composer bloom → ink → DOF + tone** (section 5.2). Les traits
   survivent alors à la DOF et se floutent avec l'arrière-plan, comme dans la référence. C'est la différence entre aucun trait
   et des traits partout.
2. **Plis et contacts basés sur les normales** (intégrés à InkPass). Les coins de boîtes et de maisons, les escaliers, les arêtes du tablier et des poutres,
   les sommets de murs et les objets posés au sol reçoivent des traits. Cela représente environ un tiers des traits de la référence, et
   l'ancien laplacien ne les voit pas du tout.
3. **Largeurs et couleur de la référence :** silhouettes 3.4 → 2.2 px (6 → 90 m, distance logarithmique), plis ×0.64, `#0b0a0c`
   à intensité 1.0 mélangé en gamma d'affichage, opacité lointaine 0.75, fondu sur 150-450 m au lieu de 130-260 m.
4. **Calque `NOINK` pour les billboards, les cartes d'effets, le ciel, les nuages et la fumée, plus la prise en charge des découpes alpha** (section
   5.3). Pas de rectangles ni de trous autour des personnages, pas de doubles contours, et les personnages gardent leur propre contour
   dessiné de 4.6 px.
5. **Traits de texture peints dans `paint.ts`** (section 5.5) : joints de planches, mortier, rangs de toiture et cadres de fenêtres en
   teintes sombres et douces, sans jamais doubler les arêtes de géométrie.

## Annexe : `recipe/ink.ts` complet (remplacement direct de `src/videos/bridge/ink.ts`)

```ts
// Ink outlines for the 3D world, matched to the reference measurements (reports/outlines.md).
// Drop-in replacement for src/videos/bridge/ink.ts (postprocessing 6.37.2 + three 0.175).
//
// How it works
//  1. Re-render the WORLD ONLY (camera layer 0) into a non-MSAA target: view-space normal (rgb), coverage (a) and
//     a depth texture. Character billboards, effect cards, sky, clouds and smoke live on layer NOINK, so they never
//     get rectangle outlines and never cut holes into the world's lines.
//  2. Edge mask (full resolution), pixel steps 1..6 along x, y and both diagonals:
//       depth  - signed 2nd difference of 1/z (exactly 0 on any plane, so no grazing-angle false lines) -> only the
//                NEAR side of a depth jump is inked, as a band `width` px wide (silhouettes vs sky, object vs object,
//                thin ropes become solid lines like the reference);
//       crease - normal angle > ~50 deg to a neighbour at the same depth, two-sided band ~0.64*width px wide,
//                concave folds (object meets ground, inner corners) at 0.7 strength;
//       coverage is continuous in the width (no width popping when the camera moves), width shrinks a little with
//       distance (3.4 px at 6 m -> 2.2 px at 90 m, log-distance), opacity to 0.75, fades out by 450 m;
//       no ink where the main depth buffer has something nearer than the world (characters / cards in front).
//  3. Composite: 3x3 tent-filtered mask (anti-aliasing), near-black ink blended in display gamma (like Canvas2D),
//     written back into the input buffer (colour only; the composer's depth texture stays intact).
//     This is a Pass (not an Effect), so R3F's <EffectComposer> keeps it as its own pass BEFORE the merged
//     DOF + Bloom + ToneMapping EffectPass: the depth of field then blurs the lines together with the background.
// Verified in a toy scene with this exact stack (MSAA 4, HalfFloat, DOF/Bloom/Neutral): compiles, no GL errors,
// measured EW 3.7 / 3.2 / 2.6 / 1.5 / 1.1 px at 3 / 12 / 25 / 90 / 200 m (silhouettes) and 2.3 -> 0.9 px (creases).
import * as THREE from "three";
import { Pass } from "postprocessing";

/** Layer for things that must never be outlined (camera-facing sprites, sky, clouds, smoke). */
export const NOINK = 3;

export type InkOptions = {
  color?: THREE.ColorRepresentation; // sRGB hex of the ink
  strength?: number; // max opacity
  widthNear?: number; // silhouette / depth-jump line width in px at distNear (1080x1920 output)
  widthFar?: number; // ... at distFar
  distNear?: number; // m
  distFar?: number; // m
  creaseScale?: number; // crease line width / silhouette line width
  depthLo?: number; // relative depth jump (1 - z_near / z_far) where lines start
  depthHi?: number; // ... where they are full strength
  angleLo?: number; // crease angle (deg) where lines start
  angleHi?: number; // ... where they are full strength
  concaveGain?: number; // strength of concave folds (object meets ground, inner corners)
  farOpacity?: number; // opacity multiplier reached at distFar
  fadeNear?: number; // m: start of the far fade-out
  fadeFar?: number; // m: lines gone
};

const DEF: Required<InkOptions> = {
  color: "#0b0a0c", strength: 1.0,
  widthNear: 3.4, widthFar: 2.2, distNear: 6, distFar: 90, creaseScale: 0.64,
  depthLo: 0.02, depthHi: 0.05, angleLo: 50, angleHi: 65, concaveGain: 0.7,
  farOpacity: 0.75, fadeNear: 150, fadeFar: 450,
};

const FS_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// world-only normal pass (scene.overrideMaterial); works for Mesh and InstancedMesh. Cut-out materials
// (map + alphaTest, e.g. the sign board, the church clock) keep their shape: see onBeforeRender in the constructor.
const NORMAL_VERT = /* glsl */ `
#include <common>
uniform mat3 cutUv;
varying vec3 vN;
varying vec3 vV;
varying vec2 vCut;
void main() {
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  vN = transformedNormal;
  vCut = (cutUv * vec3(uv, 1.0)).xy;
  #include <begin_vertex>
  #include <project_vertex>
  vV = mvPosition.xyz;
}`;
const NORMAL_FRAG = /* glsl */ `
uniform sampler2D tCut;
uniform float cut;
varying vec3 vN;
varying vec3 vV;
varying vec2 vCut;
void main() {
  if (cut > 0.0 && texture2D(tCut, vCut).a < cut) discard;
  vec3 n;
  if (dot(vN, vN) < 1e-8) n = normalize(cross(dFdx(vV), dFdy(vV)));   // geometry without normals
  else n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);            // back faces of double-sided planes
  gl_FragColor = vec4(n, 1.0);
}`;

const MASK_FRAG = /* glsl */ `
#include <packing>
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform sampler2D tMainDepth;
uniform vec2 texel;
uniform float cNear;
uniform float cFar;
uniform float p00;
uniform float p11;
uniform float wNear;
uniform float wFar;
uniform float dNear;
uniform float dFar;
uniform float creaseScale;
uniform float depthLo;
uniform float depthHi;
uniform float cosLo;
uniform float cosHi;
uniform float concaveGain;
uniform float farOpacity;
uniform float fadeNear;
uniform float fadeFar;
uniform float strength;
uniform float useMain;
varying vec2 vUv;

// pixel steps along x, y and both diagonals, and their length in px
const vec2 STEP[4] = vec2[4](vec2(1.0, 0.0), vec2(0.0, 1.0), vec2(1.0, 1.0), vec2(1.0, -1.0));
const float SLEN[4] = float[4](1.0, 1.0, 1.41421, 1.41421);
#define RMAX 6

// textureLod: explicit LOD inside loops (nearest-filtered targets, no derivatives needed)
float dist(sampler2D t, vec2 uv) { return -perspectiveDepthToViewZ(textureLod(t, uv, 0.0).x, cNear, cFar); }
vec3 viewPos(vec2 uv, float d) { vec2 n = uv * 2.0 - 1.0; return vec3(n.x * d / p00, n.y * d / p11, -d); }

// crease strength between this pixel (n0, P0) and a neighbour
float crease(vec3 n0, vec3 P0, float zc, vec2 uq, float zq) {
  vec4 nq = textureLod(tNormal, uq, 0.0);
  if (nq.a < 0.5 || abs(zq - zc) > zc * depthLo) return 0.0;       // sky / depth jump: not a crease
  float k = 1.0 - smoothstep(cosHi, cosLo, dot(n0, nq.xyz));
  if (dot(viewPos(uq, zq) - P0, n0) > 0.0) k *= concaveGain;        // neighbour in front of our tangent plane: concave
  return k;
}

void main() {
  vec4 nc = textureLod(tNormal, vUv, 0.0);
  if (nc.a < 0.5) { gl_FragColor = vec4(0.0); return; }          // sky / empty: ink lives on the near object only
  float zc = dist(tDepth, vUv);

  // characters, cards etc. (not in the world buffer) in front of this pixel: no world ink over them
  if (useMain > 0.5) {
    float zm = dist(tMainDepth, vUv);
    zm = min(zm, dist(tMainDepth, vUv + vec2(texel.x, 0.0)));
    zm = min(zm, dist(tMainDepth, vUv - vec2(texel.x, 0.0)));
    zm = min(zm, dist(tMainDepth, vUv + vec2(0.0, texel.y)));
    zm = min(zm, dist(tMainDepth, vUv - vec2(0.0, texel.y)));
    if (zm < zc * 0.985 - 0.03) { gl_FragColor = vec4(0.0); return; }
  }

  float t = clamp(log(zc / dNear) / log(dFar / dNear), 0.0, 1.0);
  float w = mix(wNear, wFar, t);                     // silhouette line width (px) at this distance, near side only
  float hc = 0.5 * w * creaseScale;                  // crease line half width (px), drawn on both faces
  float Wc = 1.0 / zc;
  vec3 n0 = nc.xyz;
  vec3 P0 = viewPos(vUv, zc);
  float eD = 0.0, eN = 0.0;
  for (int a = 0; a < 4; a++) {
    for (int r = 1; r <= RMAX; r++) {
      vec2 o = STEP[a] * texel * float(r);
      float d = (float(r) - 0.5) * SLEN[a];          // distance of this pixel's centre to an edge first seen at r
      float cw = clamp(w + 0.5 - d, 0.0, 1.0);       // continuous coverage -> no width popping, built-in AA
      float ch = clamp(hc + 0.5 - d, 0.0, 1.0);
      if (cw <= 0.0 && ch <= 0.0) break;
      float z1 = dist(tDepth, vUv - o), z2 = dist(tDepth, vUv + o);
      // depth jump: this pixel is in front of its neighbours (2nd difference of 1/z < 0; exactly 0 on planes)
      float s = (1.0 / z1 + 1.0 / z2 - 2.0 * Wc) / Wc;
      eD = max(eD, smoothstep(depthLo, depthHi, -s) * cw);
      // crease: normal turns towards a neighbour at the same depth
      if (ch > 0.0) eN = max(eN, max(crease(n0, P0, zc, vUv - o, z1), crease(n0, P0, zc, vUv + o, z2)) * ch);
    }
  }

  float ink = max(eD, eN) * strength * mix(1.0, farOpacity, t) * (1.0 - smoothstep(fadeNear, fadeFar, zc));
  gl_FragColor = vec4(ink, 0.0, 0.0, 1.0);
}`;

const COMP_FRAG = /* glsl */ `
uniform sampler2D inputBuffer;
uniform sampler2D tMask;
uniform sampler2D tNormal;
uniform vec2 texel;
uniform vec3 inkColor;
uniform int debug;
varying vec2 vUv;
float m(float x, float y) { return texture2D(tMask, vUv + vec2(x, y) * texel).r; }
void main() {
  float a = (4.0 * m(0.0, 0.0)
    + 2.0 * (m(1.0, 0.0) + m(-1.0, 0.0) + m(0.0, 1.0) + m(0.0, -1.0))
    + m(1.0, 1.0) + m(-1.0, 1.0) + m(1.0, -1.0) + m(-1.0, -1.0)) / 16.0;   // 1-2-1 tent = anti-aliasing
  vec4 c = texture2D(inputBuffer, vUv);
  if (debug == 1) { gl_FragColor = vec4(vec3(1.0 - a), 1.0); return; }               // mask only
  if (debug == 2) { gl_FragColor = vec4(texture2D(tNormal, vUv).xyz * 0.5 + 0.5, 1.0); return; } // world normals
  // blend in display (gamma) space like Canvas2D does for the character drawings: coverage -> darkness is linear
  // on screen, so the measured line widths equal the coverage widths (a linear-light blend reads ~30 % thinner)
  vec3 g = pow(max(c.rgb, 0.0), vec3(1.0 / 2.2));
  gl_FragColor = vec4(pow(mix(g, pow(inkColor, vec3(1.0 / 2.2)), a), vec3(2.2)), c.a);
}`;

const COPY_FRAG = /* glsl */ `
uniform sampler2D tSrc;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(tSrc, vUv);
  #include <colorspace_fragment>
}`;

export class InkPass extends Pass {
  /** 0 = normal, 1 = show the ink mask, 2 = show the world normal buffer */
  debug = 0;
  private world: THREE.Scene;
  private cam: THREE.PerspectiveCamera;
  private rt: THREE.WebGLRenderTarget;
  private maskRT: THREE.WebGLRenderTarget;
  private tmpRT: THREE.WebGLRenderTarget;
  private normalMat: THREE.ShaderMaterial;
  private maskMat: THREE.ShaderMaterial;
  private compMat: THREE.ShaderMaterial;
  private copyMat: THREE.ShaderMaterial;
  private fsScene = new THREE.Scene();
  private fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private quad: THREE.Mesh;
  private clearCol = new THREE.Color();

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, options: InkOptions = {}) {
    super("InkPass");
    const o = { ...DEF, ...options };
    this.world = scene;
    this.cam = camera;
    this.cam.layers.enable(NOINK); // the main render still shows the NOINK layer (and its shadows)
    this.needsSwap = false; // writes back into the input buffer (keeps the composer's depth texture intact)
    this.needsDepthTexture = true;

    this.rt = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      generateMipmaps: false, depthBuffer: true, samples: 0,
      depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType),
    });
    this.maskRT = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.UnsignedByteType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      generateMipmaps: false, depthBuffer: false,
    });
    this.tmpRT = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      generateMipmaps: false, depthBuffer: false,
    });

    this.normalMat = new THREE.ShaderMaterial({
      vertexShader: NORMAL_VERT, fragmentShader: NORMAL_FRAG, side: THREE.DoubleSide,
      uniforms: { tCut: { value: null }, cut: { value: 0 }, cutUv: { value: new THREE.Matrix3() } },
    });
    // per object: copy the original material's cut-out (map + alphaTest) so alpha-tested world planes keep their shape
    this.normalMat.onBeforeRender = (_r, _s, _c, _g, object, group) => {
      const mat = (object as THREE.Mesh).material as THREE.Material | THREE.Material[];
      const gi = (group as unknown as { materialIndex?: number } | null)?.materialIndex ?? 0; // geometry group at runtime
      const src = (Array.isArray(mat) ? mat[gi] : mat) as THREE.MeshLambertMaterial;
      const u = this.normalMat.uniforms;
      const map = src && src.alphaTest > 0 ? src.map : null;
      u.tCut.value = map; u.cut.value = map ? src.alphaTest : 0;
      if (map) { map.updateMatrix(); (u.cutUv.value as THREE.Matrix3).copy(map.matrix); }
      this.normalMat.uniformsNeedUpdate = true;
    };
    const fs = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) =>
      new THREE.ShaderMaterial({ vertexShader: FS_VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false });
    const texel = new THREE.Vector2(1, 1);
    this.maskMat = fs(MASK_FRAG, {
      tNormal: { value: this.rt.texture }, tDepth: { value: this.rt.depthTexture }, tMainDepth: { value: null },
      texel: { value: texel }, cNear: { value: 0.2 }, cFar: { value: 1500 }, p00: { value: 1 }, p11: { value: 1 },
      wNear: { value: o.widthNear }, wFar: { value: o.widthFar }, dNear: { value: o.distNear }, dFar: { value: o.distFar },
      creaseScale: { value: o.creaseScale }, depthLo: { value: o.depthLo }, depthHi: { value: o.depthHi },
      cosLo: { value: Math.cos((o.angleLo * Math.PI) / 180) }, cosHi: { value: Math.cos((o.angleHi * Math.PI) / 180) },
      concaveGain: { value: o.concaveGain }, farOpacity: { value: o.farOpacity },
      fadeNear: { value: o.fadeNear }, fadeFar: { value: o.fadeFar }, strength: { value: o.strength }, useMain: { value: 0 },
    });
    this.compMat = fs(COMP_FRAG, {
      inputBuffer: { value: null }, tMask: { value: this.maskRT.texture }, tNormal: { value: this.rt.texture },
      texel: { value: texel }, inkColor: { value: new THREE.Color(o.color) }, debug: { value: 0 },
    });
    this.copyMat = fs(COPY_FRAG, { tSrc: { value: this.tmpRT.texture } });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.maskMat);
    this.quad.frustumCulled = false;
    this.fsScene.add(this.quad);
  }

  /** live tuning, e.g. ink.set({ widthNear: 4.2, concaveGain: 0.5 }) */
  set(options: InkOptions) {
    const u = this.maskMat.uniforms;
    const map: [keyof InkOptions, string][] = [["widthNear", "wNear"], ["widthFar", "wFar"], ["distNear", "dNear"], ["distFar", "dFar"],
      ["creaseScale", "creaseScale"], ["depthLo", "depthLo"], ["depthHi", "depthHi"], ["concaveGain", "concaveGain"],
      ["farOpacity", "farOpacity"], ["fadeNear", "fadeNear"], ["fadeFar", "fadeFar"], ["strength", "strength"]];
    for (const [k, n] of map) if (options[k] !== undefined) u[n].value = options[k];
    if (options.angleLo !== undefined) u.cosLo.value = Math.cos((options.angleLo * Math.PI) / 180);
    if (options.angleHi !== undefined) u.cosHi.value = Math.cos((options.angleHi * Math.PI) / 180);
    if (options.color !== undefined) (this.compMat.uniforms.inkColor.value as THREE.Color).set(options.color);
  }

  override setDepthTexture(depthTexture: THREE.Texture) {
    this.maskMat.uniforms.tMainDepth.value = depthTexture ?? null;
    this.maskMat.uniforms.useMain.value = depthTexture ? 1 : 0;
  }

  override setSize(width: number, height: number) {
    this.rt.setSize(width, height);
    this.maskRT.setSize(width, height);
    this.tmpRT.setSize(width, height);
    (this.maskMat.uniforms.texel.value as THREE.Vector2).set(1 / width, 1 / height);
  }

  override render(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget) {
    const scene = this.world, cam = this.cam;
    const autoClear = renderer.autoClear, shadowAuto = renderer.shadowMap.autoUpdate;
    const mask = cam.layers.mask, override = scene.overrideMaterial, background = scene.background;
    renderer.getClearColor(this.clearCol);
    const clearAlpha = renderer.getClearAlpha();
    renderer.autoClear = false;

    // 1) world-only normals + depth (no characters / sprites / sky; shadow maps are not re-rendered)
    cam.layers.disable(NOINK);
    scene.overrideMaterial = this.normalMat;
    scene.background = null;
    renderer.shadowMap.autoUpdate = false;
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(this.rt);
    renderer.clear(true, true, false);
    renderer.render(scene, cam);
    cam.layers.mask = mask;
    scene.overrideMaterial = override;
    scene.background = background;
    renderer.shadowMap.autoUpdate = shadowAuto;
    renderer.setClearColor(this.clearCol, clearAlpha);

    // 2) edge mask
    const u = this.maskMat.uniforms, e = cam.projectionMatrix.elements;
    u.cNear.value = cam.near; u.cFar.value = cam.far; u.p00.value = e[0]; u.p11.value = e[5];
    this.quad.material = this.maskMat;
    renderer.setRenderTarget(this.maskRT);
    renderer.render(this.fsScene, this.fsCam);

    // 3) composite into a temp target, 4) copy back into the input buffer (colour only; depth untouched)
    this.compMat.uniforms.inputBuffer.value = inputBuffer.texture;
    this.compMat.uniforms.debug.value = this.debug;
    this.quad.material = this.compMat;
    renderer.setRenderTarget(this.tmpRT);
    renderer.render(this.fsScene, this.fsCam);
    this.quad.material = this.copyMat;
    renderer.setRenderTarget(this.renderToScreen ? null : inputBuffer);
    renderer.render(this.fsScene, this.fsCam);

    renderer.autoClear = autoClear;
  }

  override dispose() {
    this.rt.depthTexture?.dispose();
    this.rt.dispose(); this.maskRT.dispose(); this.tmpRT.dispose();
    this.normalMat.dispose(); this.maskMat.dispose(); this.compMat.dispose(); this.copyMat.dispose();
    this.quad.geometry.dispose();
  }
}
```
