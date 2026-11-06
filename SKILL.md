---
name: short-anime-3d
description: Crée un short vertical d'animation de 50-70 s, en français, dans le style « personnages 2D dans un monde 3D coloré » (cartes cartoon plates à tête en haricot avec contours à l'encre, ville 3D peinte tracée à l'encre noire, ciel saturé, arrière-plans en profondeur de champ, caméras qui glissent, voix off, bruitages synthétisés, musique facultative), rendu avec three.js dans Remotion. Deux exemples complets fournis : « The Bridge That Fell for a Song » (anglais, avec musique) et « La fuite à Varennes » (français, voix off de l'utilisateur, sans musique, 3 coupes). À utiliser quand l'utilisateur demande un short « comme Varennes », « comme le pont », « dans ce style cartoon 3D », un short d'histoire ou de science avec des personnages cartoon dans un monde 3D, ou dit « utilise le skill short-anime-3d ».
---

# Short animé 3D (three.js + Remotion), version française

Adapté du skill `cartoon-3d-short` de Mr omi (licence MIT). Tout est traduit, et augmenté de ce qu'a appris la production du short français « La fuite à Varennes » :
- la voix off de l'utilisateur, calée mot par mot ;
- le mode sans musique et avec peu de coupes ;
- le travail en parallèle par responsables ;
- la vérification image par image à 3 relecteurs ;
- le catalogue complet des bugs et de leurs corrections.

Les commentaires du code restent en anglais. Les noms de fichiers, de fonctions et de constantes ne changent pas.

## Les deux exemples

| | Le pont | Varennes |
|---|---|---|
| Titre | *The Bridge That Fell for a Song* : le pont de Broughton (1831), 74 soldats au pas cadencé | *La fuite à Varennes* (juin 1791) : Louis XVI reconnu grâce à son portrait sur un assignat |
| Durée | 67 s | 53 s : timeline de 1770 f, rendu des frames 172 à 1769 |
| Langue, voix | Anglais, voix générée | Français, **voix de l'utilisateur** enregistrée |
| Musique | Marche originale synthétisée | **Aucune** : voix et bruitages seuls |
| Montage | Coupes, fondus, flash blanc après l'accroche | **4 plans-séquences, 3 coupes franches**, aucun fondu |
| Lumières | jour, doré | nuit (Paris), nuit → aube (route), doré (relais), nuit (Varennes) |
| Code | `templates/bridge/` | `templates/varennes/` |
| Son | `templates/audio/` | `templates/varennes_audio/` |
| Documents | `templates/SCRIPT_example.md` | `references/varennes/` (plan des plans, brief des agents, **CORRECTIONS.md**, 12 images) et `templates/SCRIPT_exemple_varennes.txt` |

**Quel modèle copier ?**
- **Partir de `templates/varennes/`** pour un short en français, de nuit ou en plans longs. Il contient tout le look du pont plus les corrections de Varennes : respiration continue, ombres stables, masque des cartes dans le post, lanternes, portes, chevaux.
- **Partir de `templates/bridge/`** pour un short de jour avec musique et des coupes fréquentes.

## La référence de style
La référence est une chaîne étudiée en privé (`references/` : STYLE_BIBLE.md, reports/*.md, frames/, sheets/).
- Ces vidéos sont du matériel d'étude. Ne les mets jamais en ligne et ne les envoie jamais.
- Ne copie jamais leurs scripts, leurs personnages ni leurs plans. L'histoire, les personnages et la voix sont toujours LES NÔTRES.
- Ne prononce jamais le nom de la chaîne dans une voix off ou une description.

## Règles par défaut de l'utilisateur (à confirmer au début de chaque projet)
- Aucun sous-titre ni texte lisible dans la vidéo : un billet, une enseigne ou un drapeau porte des ornements, jamais de lettres ni de chiffres.
- Français, sauf demande contraire.
- **Voix : de préférence celle de l'utilisateur, enregistrée par lui.** Le public francophone repère et rejette vite les voix de synthèse françaises. Un ton posé et régulier.
- Les blagues sont des faits réels vérifiés. Pas de gore : la guillotine, par exemple, n'apparaît pas à l'écran.
- **Musique : demande si l'utilisateur en veut.**
  - Sans musique (Varennes) : voix et bruitages, bruitages environ 7 dB sous le premier mixage.
  - Avec musique (le pont) : musique +3 dB, bruitages -6 dB, voix inchangée.
- **Coupes : demande « le moins de coupes possible » ou « montage rythmé ».** Le premier donne 4 plans-séquences, le second le découpage du pont.
- Export final 2K vertical, 1440x2560 : `--scale 1.3333333333333333`. Avec `--scale 1.3333`, la hauteur n'est pas entière (2559,94 px) et le rendu échoue.
- Un vérificateur Opus (effort max) valide chaque contrôle.
- Sauvegarde après chaque étape.
- Une fois le script approuvé, enchaîne sans redemander : « vas-y ».

## Pipeline
1. **Sujet et faits.**
   - Choisis une histoire vraie et surprenante, avec une cause et un effet physiques : il faut qu'elle soit visuelle. Ajoute une analogie simple du quotidien qui l'explique.
   - Écris les faits, avec leur source, en haut de `SCRIPT.md`. Vérifie chaque date, chaque nom et chaque chiffre.
   - Varennes : l'accroche vient de l'objet qui trahit le roi, son portrait sur un assignat. Un objet concret et dessinable porte toute l'histoire.

2. **Script.** 50-70 s, avec un débit d'environ 3,5-4 mots par seconde.
   - La référence mesure 3,5-4,1 mots anglais par seconde. La voix française de Varennes faisait 3,8 mots par seconde (210 mots en 58,8 s).
   - **La formule des temps forts** (STYLE_BIBLE, suivie par 20 shorts sur 20) :
     - **Accroche** : un paradoxe énoncé comme un fait, dès la phrase 1, sans mise en place (10-16 mots).
       - Pont : « Seventy-four soldiers knocked down an iron bridge just by walking across it. » (Soixante-quatorze soldats ont fait tomber un pont de fer rien qu'en marchant dessus.)
       - Varennes : « Voici l'histoire de l'homme le plus puissant de France qui s'est fait arrêter à cause de sa propre tête sur une pièce de monnaie. »
     - **Cadre** en 1-2 lignes : l'année, le lieu, la fierté, des détails concrets.
     - **Escalade** en 3-6 temps forts, chacun un peu plus grand que le précédent.
     - **Mystère** : une question, ou « Attends… ? ».
     - **Pivot** : « En fait, » ou « Tu vois, » (« You see, » dans 14 shorts sur 20). Il amène le vrai mécanisme par une analogie du quotidien (l'enfant sur une balançoire).
     - **Chute ironique** en 1-2 phrases courtes. La vidéo finit sur le dernier mot.
   - Variante du pont : la double ligne pince-sans-rire « Heureusement… / Malheureusement… », puis la conséquence (la règle que l'histoire a créée), puis un rappel final.
   - Ne décris jamais à l'écran ce que le spectateur voit déjà.
   - Exemples complets : `templates/SCRIPT_example.md` (le pont) et `templates/SCRIPT_exemple_varennes.txt`.

3. **Voix.**
   - L'utilisateur enregistre sa voix (mp3 ou wav). Convertis-la en `voice.wav` (48 kHz) dans `<dossier-du-short>/voice/`.
   - Calcule les temps des mots avec faster-whisper :
     `python scripts/words.py voice.wav words.json fr script.txt`
     - `fr` choisit le modèle multilingue `small`.
     - Le script passé en prompt garde l'orthographe des noms et des dates.
   - Corrige les temps à la main si besoin. Whisper écorche parfois un mot (« Asignan » pour « assignat ») mais garde le bon temps : c'est le temps qui compte. Tout est calé sur `words.json`.
   - **Couper le début après coup** (Varennes : l'utilisateur a voulu commencer à « En juin 1791 ») :
     - ne décale pas la timeline : rends seulement les frames `172-1769` (`--frames=172-1769`) ;
     - coupe l'audio exactement à 172/30 = 5,7333 s ;
     - n'ajoute jamais de silence pour « recaler » : ça décale toute la voix.

4. **Plan des plans** dans `story.ts`.
   - Copie le modèle (`templates/varennes/` ou `templates/bridge/`) dans `src/videos/<nom>/`. Déclare une nouvelle composition dans `src/index.tsx` ou `src/Root.tsx` et renomme-la.
   - **Contenu de `story.ts`** :
     - `SHOTS` : id, frames a/b, ciel (`sky` : night / dawn / day / golden), lumière, mode de foule, `tau` (temps du récit), `scene` ;
     - `XFADE` : les fondus aux changements de lieu ou d'heure. **Laisse-le vide `{}` sur un PC à GPU intégré** : un fondu rend deux contextes WebGL à la fois et fait planter le GPU ;
     - `FLASH_AT` : un flash blanc après l'accroche (le pont uniquement) ;
     - `CAMS` : les clés par plan `{f, dur?, cut?, s: f => {pos, look, fov, roll}}` ;
     - `KICKS` : les à-coups d'impact ;
     - `DOF` / `dofAt` : le flou d'objectif par temps fort, et les bascules de mise au point ;
     - `FOREGROUND` : les accessoires au premier plan ;
     - Varennes y ajoute les contrats exportés `CUE` (les frames des mots), `LOC` (les lieux), `coachAt`, `teamAt`, `drouetAt`, `assignatAt`, `skyAt` et `fadeAt`.
   - Chaque réaction visuelle tombe 0 à 3 frames avant son mot.
   - Mode « le moins de coupes possible » : voir la section dédiée plus bas.
   - Varennes : `references/varennes/PLAN_DES_PLANS.md` est un plan complet (prises, caméras, contrats entre responsables).

5. **Le monde.**
   - `lights.ts` : les presets LIGHTS et la palette LOOK (ciel, rivière, nuages) par lumière. Varennes ajoute `night` et `dawn`.
   - `shade.ts` : l'ombrage en deux tons et `untone()`.
   - `build.ts` : la ville, les maisons et les accessoires, recolorés. Un culling de ligne de vue retire tout ce qui bloque une caméra.
     - Le pont utilisait le kit Kenney CC0. Varennes construit tout de façon procédurale (géométrie three.js et textures Canvas2D peintes).
     - Si les GLB Kenney ne sont pas fournis, les 404 dans les journaux sont normaux.
   - `paint.ts` : les textures HD peintes en Canvas2D, avec des joints peints en teintes sombres.
   - `world.ts` :
     - le shader de ciel, le brouillard couleur horizon, la rivière, le placement à chaque frame ;
     - un soleil figé par plan et relatif à la caméra ;
     - le cadre d'ombre fixe par plan, calé sur la grille de texels (Varennes).

6. **Les personnages.**
   - `toon.ts` : l'API de dessin Canvas2D `Pen`.
     - Canevas de dessin de 600x1000, semelles à y = 975.
     - Têtes en haricot, membres-bâtons, contour prune d'épaisseur variable.
     - Une bibliothèque de visages : **18 expressions** dans `templates/varennes/toon.ts` (`Expr`), 14 dans le pont.
   - `cast.ts` : billboards tournés vers la caméra (rotation sur l'axe vertical seulement), foules, cartes d'effets, clignements, cycles de marche. Tous les billboards vont sur le calque `NOINK`.
   - `cardshade.ts` : les cartes sont éclairées par la lumière de la scène, sans émissif.
   - Les chevaux (Varennes) : `drawHorse` dans toon.ts, avec allures `stand` / `walk` / `trot` / `gallop` et un vrai cycle de jambes. Vérifie qu'un cheval vu de dos a une queue et des jambes : sinon il ressemble à un tonneau.

7. **Post-traitement** (`Bridge.tsx` + `ink.ts` + `lensblur.ts` + `grade.ts`).
   - Ordre du composer : encre → lens pre → lens main → flou de mouvement caméra (Varennes) → bloom → tone map NEUTRAL → étalonnage (MSAA 4).
   - Chaque paramètre en pixels suit la hauteur de sortie / 1920.
   - Varennes :
     - l'étalonnage, le bloom et la couleur de l'encre suivent le ciel du plan (`skyAt`), avec un fondu nuit → aube dans le plan 2 ;
     - les bascules de mise au point sont interpolées en dioptries ;
     - le flou de mouvement et l'occlusion ambiante utilisent le masque des cartes (`cardMask`), pour qu'une carte posée à plat ne devienne pas floue.

8. **Le son.**
   - Pont : `templates/audio/` (timeline.py, sfx_gen.py, sfx.py, music.py, instruments.py, dsp.py, mix.py). Une table d'événements donne des bruitages synthétisés, plus une musique originale atténuée sous la voix.
   - Varennes : `templates/varennes_audio/`.
     - `node dump_story.mjs` évalue `story.ts` image par image et l'exporte dans `story_frames.json`. Les sabots suivent la phase des jambes de chaque cheval, les roues la distance parcourue, les pas la phase de marche.
     - Les sources qui bougent sont spatialisées depuis la caméra du plan.
     - Chaque nappe et chaque queue de réverbe s'arrête net sur une coupe.
     - Le mixage final est fait par `mix_v4.py` (qui importe `mix.py`, `mix_v2.py` et `mix_v3.py`).
   - Sortie : `mix.wav` (48 kHz, longueur exacte), les stems et `cues.md`.
   - Normes : -14 LUFS intégré, true peak ≤ -1 dBTP, voix bit-identique à l'enregistrement (aucun EQ ni compression sur la voix).
   - Fige les constantes de temps de l'image avant de faire le son. Tout changement de timing ensuite oblige à refaire le son.

9. **Contrôles du look.**
   - `node scripts/bridge-stills.mjs out/<nom>/x_ 100,400 0.5`, ou la version avec verrou :
     `ENTRY=src/sandboxes/<n>/index.tsx COMP=<Comp> node scripts/stills.mjs out/<nom>/x_ 100,400 0.5`
     - Un seul rendu à la fois sur un PC de 16 Go à GPU intégré : un dossier de verrou met les appels en file.
     - Pour rendre une copie en bac à sable, `BRIDGE_ENTRY=src/sandboxes/<n>/index.tsx` avec bridge-stills.
   - Fais des comparaisons côte à côte avec les images de référence : `python scripts/sbs_sheet.py out.jpg --ours ... --ref ...`.
   - Envoie-les à un vérificateur Opus (effort max) : 1 à 3 images, un verdict de 200 mots maximum.
   - Compare aussi avec `references/varennes/images/`, 12 images du short final de Varennes.

10. **Rendu final.**
    - `npx remotion render src/index.ts <Comp> out/<nom>/video.mp4 --codec h264 --crf 16 --scale 1.3333333333333333` (ajoute `--frames=a-b` pour ne rendre qu'une partie).
    - Assemble l'image et le son avec `-map 0:v:0 -map 1:a:0` : Remotion écrit une piste audio muette.
    - QA : `python scripts/short_qa.py final.mp4 out/<nom>/qa shots.json`. Il vérifie chaque frame (noire, blanche, figée, pop), le loudness, et fait des planches de 60 frames numérotées.
    - Corrige tout ce qu'il trouve, puis fais la **vérification image par image** (section dédiée), puis un audit Opus approfondi.

11. **Livraison.**
    - Envoie le mp4 final avec SendUserFile. S'il dépasse 30 Mo, envoie aussi un aperçu 1080 compressé : c'est la limite pour le téléphone et le web.
    - Mets à jour la mémoire et écris des notes.

## Mode « le moins de coupes possible » (Varennes)
- **4 plans-séquences, 3 coupes franches.** Varennes coupe aux frames 473, 724 et 1456 de la timeline.
  - Une coupe cache un saut de lieu : un seul monde, avec des lieux éloignés les uns des autres.
  - Dans un plan, la caméra glisse, monte en grue, suit en travelling, bascule la mise au point. Elle ne coupe jamais.
- **Aucune tenue immobile.** Chaque tenue avance lentement. La QA signale un passage figé à partir de 12 f.
- **Vitesse de caméra** : rotation ≤ 3°/f. Vérifie-la avec un script comme `camspeed` (vitesse angulaire et linéaire image par image).
- **Pas de fondu** (`XFADE = {}`). La fin se fait sur un fondu au noir des 8 dernières frames (`fadeAt`).
- Chaque phrase de la voix a son geste ou son mouvement de caméra. Le plan long ne dispense pas de l'énergie visuelle.
- **L'intro décide de la rétention.** C'est là que l'utilisateur a demandé le plus de soin :
  - la caméra bouge dès la frame 1 ;
  - la foule est dense et animée (torches levées, poings) ;
  - le bâtiment principal est riche (dôme, colonnes, écu fleurdelisé, fenêtre éclairée), avec la lune et des torches qui éclairent par en dessous ;
  - un léger vignettage ;
  - le personnage principal est visible et expressif dès la première seconde.

## Travail en parallèle par responsables (Varennes)
- **Un responsable par groupe de fichiers**, chacun dans son bac à sable `src/videos/<nom>_<n>/`, avec l'entrée `src/sandboxes/v_<n>/index.tsx` (copie de `templates/sandbox_index_example.tsx`, seul le chemin d'import change).

  | Responsable | Fichiers |
  |---|---|
  | cam | `story.ts` |
  | world | `build.ts`, `paint.ts`, `world.ts`, `lights.ts`, `shade.ts` |
  | char | `toon.ts`, `cast.ts`, `cardshade.ts` |
  | post | `grade.ts`, `Bridge.tsx`, `ink.ts`, `lensblur.ts` |
  | son | le dossier audio |

  C'est la variante de Varennes. Le pont séparait aussi `mat` (`paint.ts` et `build.ts`) et donnait `grade.ts` à world.
- **Les contrats** entre responsables sont des constantes et des fonctions exportées de `story.ts` (et `NOINK` de ink.ts). Pour changer un contrat, un responsable le demande dans son rapport au lieu de modifier le fichier d'un autre.
- **Le brief commun** que chaque agent lit en entier : `references/varennes/CONTEXTE_AGENTS.md`. Il contient :
  - les outils et les chemins ;
  - les règles de l'utilisateur ;
  - comment rendre des stills avec le verrou ;
  - le typecheck filtré sur son dossier ;
  - la propriété des fichiers ;
  - le format du rapport.
- **Fusion** : copie seulement les fichiers de chaque responsable dans MAIN, après une sauvegarde dans `backup/<nom>_rN/`. Lance ensuite `npx tsc --noEmit` (filtré sur le dossier), puis **resynchronise chaque bac à sable depuis MAIN** avant le tour suivant.
- Si un agent s'arrête sur une limite d'usage, relance-le avec SendMessage : il garde son contexte.

## Vérification image par image (Varennes)
La vidéo à vitesse normale cache des défauts que l'œil voit pourtant comme « quelque chose cloche ». Sur Varennes, cette étape a trouvé environ 40 défauts.
1. Lance `short_qa.py` sur le rendu 1080. Il produit les planches de 60 frames numérotées (`sheet_XXXX.jpg`).
2. **Trois relecteurs en parallèle**, chacun sur un tiers de la vidéo (Varennes : frames 0-539, 540-1079 et 1080-1597).
   - Ils lisent les planches, puis font des bandes de frames consécutives sur chaque mouvement, chaque contact et chaque entrée de personnage.
   - Chacun rend une liste numérotée : frames, responsable, symptôme, cause supposée, correction proposée.
3. Les responsables corrigent dans leur bac à sable. Après la fusion, rends à nouveau.
4. **Deuxième passe** avec les mêmes tranches : ce qui est corrigé, partiellement corrigé, pas corrigé.
5. Seulement ensuite, lance le rendu 2K final, puis la QA automatique dessus.

Ce qu'il faut chercher en priorité :
- des personnages qui traversent une porte, une calèche ou un autre personnage ;
- des apparitions d'un coup ;
- un passage de face à profil en pleine foulée ;
- des jambes figées ;
- une respiration par paliers ;
- un halo qui saute d'une image à l'autre ;
- des ombres en escalier ;
- une carte à plat floue ;
- un accessoire en premier plan coupé ;
- du texte lisible.

**Le catalogue complet : `references/varennes/CORRECTIONS.md`.**
- Il recense 53 défauts en 8 thèmes. Pour chacun : symptôme, cause, correction (fichier et fonction), et comment le repérer.
- Il donne aussi les défauts restés dans la version finale et une check-list de 25 points avant le rendu 2K.
- Lis-le avant de commencer un nouveau short.

## Valeurs finales du look (le pont, après 4 tours de vérificateur ; tout est dans `templates/bridge/`)
- Commence chaque nouveau short depuis un modèle copié dans `src/videos/<nom>/`. Le look vit dans ces valeurs, l'histoire vit dans story.ts, dans la disposition de build.ts et dans les rôles de cast.ts.
- Notes Opus max à la fin, passées de 5/3/4/5/4/7/4/6 au début à :
  - couleur jour 7, doré 5-6 ;
  - éclairage 5-6 ;
  - encre 6 ;
  - textures 5-6 ;
  - personnages 7 ;
  - profondeur 6-7 ;
  - composition 6-7.
- **Presets de lumière** (`lights.ts`, soleil relatif à la caméra et figé par plan) :
  - **day** :
    - az 75 / el 48 ;
    - lit [1.58,1.5,1.33], shade [.30,.29,.36], lift [.05,.06,.11] : la teinte froide va UNIQUEMENT dans l'ombre ;
    - ciel haut #3e7fd2 → horizon #b8d0ec ;
    - brouillard = horizon, 25→300 m, uSat 1.08, environ 15 % de voile bleu au-delà de 60 m.
  - **golden** :
    - az 6 / el 7 (soleil bas à contre-jour) ;
    - lumière principale vers #FFB36B ×1.5, ombre violet-bleu (façade ≈ #444380) ;
    - ciel #ffc47c → #8a6f8a, brouillard pêche seulement au-delà de 50 m ;
    - disque solaire #ffcf9e avec bloom, taches de contact et vraies ombres de cartes.
- **Albédos** (`paint.ts` / `build.ts`) :
  - Maisons en brique sourde, crème, ocre ou terre cuite, avec soubassement, corniche, appuis, auvents, marche de porte, cheminée et pot. Hauteurs 7 / 8.4 / 9.8 m.
  - Pierre gris chaud ou beige (saturation −35 % par rapport à « livre d'images »).
  - Tablier en bois ocre C* ~51-58 avec des joints presque noirs.
  - Fer sombre et désaturé.
  - Jamais de jaune citron, jamais de visages éclairés lavande.
- **Encre** (`ink.ts`) :
  - #030303, 5.1 px de près (6 m) → 3.3 px de loin (90 m) en 1080x1920 ;
  - plis ×0.8 à partir de 35°, sauts de profondeur dès 1 %, teinte de brouillard 0.3 seulement au loin ;
  - les cartes des personnages sont sur le calque `NOINK` : elles portent leur propre encre prune.
- **Objectif** (`lensblur.ts` + `dofAt` dans story.ts) :
  - cInf en px à 1080 : gros plan d'accroche ou de rivière 15-16, gros plans 12-14, plans moyens 10-12, parc 7, balancement doré 5, plans larges et aériens 0 ;
  - mise au point sur les yeux du premier rang.
- **Post** (`Bridge.tsx`) :
  - encre → lens pre → lens main → bloom (thr 1.0, int .5, 6 niveaux, rayon .6) → tone map NEUTRAL → étalonnage, MSAA 4 ;
  - le grain existe mais il est COUPÉ : la référence ne mesure aucun grain, et il quadruple la taille du fichier.
- **Personnages** (`toon.ts` / `cast.ts` / `cardshade.ts`) :
  - têtes en haricot h/w .94, encre prune #241726, yeux à .26 W d'écart, pas de joues roses ;
  - 14 expressions (18 dans Varennes) ;
  - adultes de 3.5 hauteurs de tête ;
  - rebond de marche 5 %, inclinaison 1-7°, foulée plantée de 0.8 m ;
  - clignements toutes les 0.5-2.3 s ;
  - ombre de contact serrée (~.5) sous les pieds, plus une traînée dans la direction du soleil le jour ;
  - liseré doré uniquement à l'intérieur, jamais en copie décalée à l'extérieur.
- **Caméra** (`story.ts`) :
  - coupes sur les grands sauts, glissés en smootherstep de 18-40 f ;
  - chaque tenue avance : aucune tenue immobile de 4 f ou plus ;
  - à-coups qui changent de sens et s'amortissent sur 7 f aux impacts ;
  - roulis de 4-4.6° ;
  - accessoires au premier plan (`FOREGROUND`) dans environ 1/3 des plans.

## Valeurs ajoutées par Varennes (`templates/varennes/`)
- **night** (`lights.ts`) :
  - az 140 / el 34, lumière principale bleue de lune venant de derrière l'objectif ;
  - lit [0.3, 0.38, 0.68], shade [0.16, 0.18, 0.33], lift [0.065, 0.075, 0.14] : l'ombre est bleu-violet profond, jamais noire ;
  - ciel #16224e → horizon #40568e, avec une bande claire à l'horizon et jamais de ciel noir ;
  - brouillard #34497e, 28→250 m ;
  - LOOK : sat 0.62, étoiles 0.9, lune 1 ;
  - les flaques de lumière chaude (torches, lanternes) font le reste.
- **dawn** :
  - az 55 / el 19, lueur pêche basse à l'est, bleu au-dessus ;
  - lit [1.05, 0.86, 0.82], ciel #2f4682 → horizon #ffc59c ;
  - brouillard #c6a6b2, 32→290 m.
  - Le plan 2 passe de night à dawn image par image (`skyAt`), avec l'étalonnage, le bloom et l'encre.
- **Bloom par ciel** (`Bridge.tsx`) :

  | Ciel | Seuil | Intensité | Rayon | Remarque |
  |---|---|---|---|---|
  | day, golden | 1.0 | 0.5 | 0.6 | |
  | night | 1.12 | 0.65 | 0.52 | Seules les torches et les lanternes HDR brillent |
  | dawn | 1.05 | 0.55 | 0.56 | |
  | paris (intro) | 1.1 | 0.72 | 0.55 | |

  La chaîne MIP du bloom part toujours de 540x960 : le halo garde la même taille relative à toutes les résolutions.
- **Encre par ciel** : presque noire partout ([3,3,3]) ; la nuit, une pointe de bleu ([3,4,9], et [3,4,10] à Paris) pour que les traits restent dans le clair de lune.
- **Mise au point** : la table `DOF` en dioptries, chaque rampe partant de l'état atteint par la précédente. Une bascule billet → roi ne saute jamais.
- **Flou de mouvement caméra** : il reprojette avec les caméras f−1 et f+1 du même plan, sans flou à travers une coupe, et ignore les cartes grâce à `cardMask`.

## Cibles de look (mesurées sur la référence ; voir references/reports/)
- **Encre :**
  - Traits du décor : environ 3 px à 1080 de large, presque noirs (#0b0a0c), d'épaisseur presque constante avec la distance.
    - Seulement les silhouettes, les sauts de profondeur et les plis des normales.
    - Pas de trait aux jonctions mur/sol ni sur l'horizon.
    - Les cartes des personnages ne sont jamais contournées par l'encre du décor.
  - Encre des personnages : prune foncé #201628-#2f1d28, plus épaisse du côté du bas et de l'ombre.
- **Couleur :**
  - Jour : luma médiane ~.57. Le p5 hors encre est ~.23 : pas de noirs bouchés. Chroma C* p90 ~55 sur les zones éclairées.
  - Ciel de jour : haut ~#5e93d9, horizon 1.28x plus clair.
  - Doré : horizon pêche #ffd08a, ombres violet-bleu (jamais brunes), soleil à contre-jour.
- **Profondeur :**
  - DOF sur environ 1/3 du temps à l'écran (gros plans, plans moyens, inserts), cInf 10-16 px à 1080, mise au point sur les yeux.
  - Les plans d'ensemble et les plans larges restent nets.
  - Brouillard = couleur de l'horizon, 25→420 m le jour, 20→360 m en doré.
  - Bloom seulement sur les émissifs HDR : seuil 1.0.
- **Caméra :**
  - Coupes franches sur les grands sauts. Tout le reste est un glissé en smootherstep de 18-40 f, pic ≤ 25 px/f en 720p.
  - Chaque tenue avance de 0.15-0.35 %/f, et de 0.6 %/f sur les mots-chocs.
  - Roulis de 4-5°.
  - Pas de flottement « caméra à l'épaule ». Les secousses d'impact changent de sens à chaque frame et s'amortissent sur 7 f.
- **Personnages :**
  - Environ 3.5 hauteurs de tête, jambes de 1.4 HH.
  - Membres-bâtons d'environ 0.055 de la largeur de la tête, mains en point d'encre.
  - Tête en haricot (h/w ~0.93, menton plus étroit, sommet plus pointu).
  - Ni joues roses ni reflets dans les yeux. Visages à une luminosité ~.93.
  - Rebond de marche 3-7 %, inclinaison 1-7°, pieds plantés.
  - Clignement toutes les 0.5-2.3 s, qui dure 4 f.
- **Format et voix** (STYLE_BIBLE) :
  - 1080x1920, 30 fps ;
  - la voix démarre aux frames 1-4 : pas d'intro, pas de logo, pas d'outro, pas d'appel à l'action ;
  - -14 LUFS ;
  - presque aucune pause (au total, moins de 1 s de silences de plus de 0.25 s par vidéo).

## Boucle d'ajustement du look (comment on a obtenu le look du pont ; à réutiliser pour toute passe « fais que ça ressemble à X »)
1. **Mesure d'abord la référence.**
   - Un agent d'analyse par sujet (mouvement, profondeur, textures, personnages, lumière, contours, étalonnage). Chacun écrit des chiffres, pas des adjectifs, dans `references/reports/<sujet>.md`.
   - Brief commun : `references/reports/CONTEXT.md`.
   - Les rapports sont ensuite la source de vérité de tous les agents.
2. **Bacs à sable, un responsable par fichier.**
   - Copie le dossier du projet dans `src/videos/<nom>_{cam,world,mat,char,post}`, avec les entrées `src/sandboxes/<n>/index.tsx` (le même `index.tsx` que MAIN, seul le chemin d'import change).
   - La répartition utilisée pour le pont :

     | Responsable | Fichiers | Contenu |
     |---|---|---|
     | cam | story.ts | clés caméra, coupes, à-coups, table DOF, accessoires au premier plan |
     | world | world.ts, lights.ts, shade.ts, grade.ts | soleil, ciel, brouillard, rivière, couleur, étalonnage |
     | mat | paint.ts, build.ts | textures peintes, bâtiments, accessoires |
     | char | toon.ts, cast.ts, cardshade.ts | dessin, pose, éclairage des cartes, cartes d'effets |
     | post | ink.ts, Bridge.tsx, lensblur.ts | passe de contours, composer, flou d'objectif, bloom |

   - Les agents ne modifient que leurs fichiers, dans leur bac à sable. Ils rendent des stills avec `BRIDGE_ENTRY=src/sandboxes/<n>/index.tsx node scripts/bridge-stills.mjs out/<nom>/<n>/x_ <frames> 0.5`.
3. **Fusion.**
   - `python scripts/bridge_merge.py [cam,world,mat,char,post]` sauvegarde MAIN dans `backup/bridge_<heure>/` et copie seulement les fichiers de chaque responsable.
   - Lance ensuite `npx tsc --noEmit` (filtré sur le dossier du projet).
   - Puis **resynchronise chaque bac à sable depuis MAIN** (`cp -f src/videos/<nom>/* src/videos/<nom>_<n>/`) avant le tour suivant.
4. **Vérification** par un nouvel agent Opus (effort max).
   - Il reçoit des planches côte à côte (`python scripts/sbs_sheet.py out.jpg --ours a b --ref r1 r2`).
   - Il note chaque domaine sur 10 (couleur jour / doré, éclairage, encre, textures, personnages, profondeur, composition) et rend une liste numérotée de corrections, avec les numéros de frames.
   - Attribue chaque correction au responsable du fichier, et relance l'agent de ce responsable avec SendMessage : il garde son contexte.
   - Notes du pont : tour 1 5/3/4/5/4/7/4/6 → tour 2 5/4/5/6/4/7/6/6 → tour 3, voir les notes.
5. **Les contrats entre responsables** vivent dans des constantes exportées (par exemple le calque `NOINK` de ink.ts, `dofAt` / `FOREGROUND` de story.ts, `LIGHTS` / `LOOK` de lights.ts). Changer un contrat, c'est prévenir chaque responsable qui le lit.

## Pièges techniques
- Les matériaux du kit nature Kenney sont sarcelle : recolore-les par nom de matériau dans build.ts.
- Des caméras se retrouvent dans des maisons : le culling de ligne de vue de build.ts/world.ts retire tout ce qui bloque un rayon de caméra.
- L'encre dans la même passe d'effets fusionnée que le DOF se fait écraser. L'encre doit être une passe à part, avant le flou.
- Les paramètres de post en pixels doivent suivre la résolution : les stills sont à 0.5, le final à 1.333. R3F limite le dpr à 1 minimum, donc les stills en `--scale 0.5` rendent quand même un tampon de 1080x1920.
- **Disque.**
  - Chaque bundle Remotion copie `public/` (~1.3 Go) dans `<dossier temporaire>\remotion-webpack-bundle-*` et ne le supprime jamais. Plus de 60 Go ont rempli le disque système pendant les passes du pont, et un rendu est mort sur ENOSPC.
  - Rends toujours avec `export TEMP='<gros disque>/remotion-tmp' TMP='<gros disque>/remotion-tmp'` (ou `REMOTION_TMP`). bridge-stills.mjs et stills.mjs le règlent eux-mêmes.
  - Demande à l'utilisateur avant de supprimer d'anciens dossiers de bundle dans le dossier temporaire partagé : le mode auto bloque le nettoyage.
  - `<gros disque>/remotion-tmp` se remplit aussi (~500 dossiers / 110 Go après les 4 tours du pont). Quand un projet est fini et que rien ne tourne, supprime ses dossiers `remotion-webpack-bundle-*` et `puppeteer_dev_chrome_profile-*`.
- Dans les chaînes JS, écris `"<gros disque>/remotion-tmp"`, jamais `"<gros disque>\remotion-tmp"` : `\r` devient un retour chariot.
- Remotion écrit une piste audio muette : assemble avec `-map 0:v:0 -map 1:a:0`.
- Selon l'environnement, les sous-agents ne peuvent pas toujours écrire de fichiers de rapport. Dans ce cas, demande-leur un message final de 150 mots maximum et enregistre-le toi-même dans `out/<nom>/<n>/REPORT.md`.
- Des fichiers `.ts` de brouillon dans `out/` cassent `tsc` : nomme-les `.txt`.
- Les rendus 2K tournent à environ 4 fps (≈ 10 min pour 67 s). Les stills à 0.5 prennent 3-8 s chacun après un bundle d'environ 40 s.
- Le grain à 2.5 % a fait passer le fichier 2K de ~250 Mo à 910 Mo, et il devient de la bouillie sur YouTube. La référence n'en a pas : laisse-le coupé.
- **Ajouts de Varennes :**
  - `--scale 1.3333` donne une hauteur non entière et le rendu échoue : utilise `1.3333333333333333`.
  - Un fondu enchaîné rend deux canevas WebGL à la fois et fait planter un GPU intégré : `XFADE = {}`.
  - Windows :
    - ffmpeg installé par winget n'est pas dans le PATH des terminaux ouverts avant l'installation : ajoute son dossier `bin` au PATH, ou règle `FFMPEG_DIR` pour `mix.py` ;
    - numpy et Pillow installés pour l'utilisateur ne sont pas vus avec `python -I` : lance les scripts du projet sans `-I`.
  - Un seul rendu à la fois sur 16 Go de RAM : `scripts/stills.mjs` pose un verrou dans `REMOTION_TMP/render.lock`.
  - Lance les longs rendus en arrière-plan avec des chemins absolus. Un `cd` qui échoue dans une commande en arrière-plan fait tout planter : `cd "$R" || exit 9`.
  - Ne décale jamais une voix par du silence ajouté : coupe au temps exact (`frame / 30`).

## Pièges de lisibilité relevés par le vérificateur (à vérifier sur chaque nouvel accessoire ou plan)
- **Le pont :**
  - **Une balançoire dessinée avec une seule corde qui disparaît derrière l'enfant se lit comme une PENDAISON.** Mets toujours deux cordes jusqu'à une large planche, avec l'enfant entre les deux (`swingKid` dans toon.ts), et un portique dont les montants dégagent l'arc (un cadre en A à chaque bout).
  - Des accessoires ou des débris à moins de ~2 m d'un objectif deviennent d'énormes taches coupées au bord du cadre. Quand une caméra bouge, revérifie chaque accessoire proche de sa nouvelle position (les caméras de la rivière sont entrées dans les chapeaux qui flottaient).
  - Un buisson au premier plan coupé par le bord du cadre se lit comme une « boule verte » : un accessoire au premier plan doit être reconnaissable, ou disparaître.
  - Drapeaux : rouge avec une étoile ou un losange jaune se lit comme le drapeau du Vietnam. Utilise un drapeau d'époque (croix de saint Georges pour l'Angleterre de 1831).
  - Les enseignes peintes éclairées par un soleil de côté deviennent gris-bleu et illisibles : donne à la face de l'enseigne un matériau non éclairé.
  - Un liseré doré fait comme une copie extérieure décalée transforme chaque chapeau en cadre photo : liseré intérieur seulement, sur la tête et le torse.
  - Des garde-corps de balcon à hauteur de poitrine qui traversent les personnages : place l'objectif à environ 2.5 m de haut pour que les barres croisent les jambes, pas les torses.
  - Les tenues plates passent pour des images figées dans la QA (passage figé ≥ 12 f) : chaque tenue a besoin d'une lente avancée.
- **Varennes** (le détail dans `references/varennes/CORRECTIONS.md`) :
  - **Un personnage ne traverse jamais une porte fermée.** Ouvre la porte (animée) et fais-le sortir de l'intérieur sombre.
  - **Personne n'apparaît d'un coup.** Un personnage entre par le bord du cadre ou sort de l'ombre d'un passage.
  - Une file de personnages reste en file : pas de chevauchement, pas de personnage qui passe à travers un autre.
  - Pas de reflet de personnage dans une surface laquée s'il ne suit pas parfaitement. À Varennes, on l'a supprimé et remplacé par un geste (la gouvernante rabat le chapeau du roi).
  - **Un objet tenu ne porte pas la main dessinée dedans** (le « pouce » de l'assignat). C'est la main du personnage qui tient l'objet, par le bord.
  - Un objet posé à plat au sol (le billet final) doit rester net : soulève la carte de quelques centimètres et exclus-la du flou de mouvement et de l'AO.
  - **Aucune lanterne à moins de 2.5 m d'un objectif.** Un halo qui traverse le plan proche de la caméra saute d'une image à l'autre.
  - Un cheval vu de dos doit avoir une queue et des jambes lisibles. Ses jambes s'animent dès qu'il bouge : à l'arrivée au relais (c'est là qu'elles étaient figées), au changement d'allure et pendant le changement d'attelage.
  - Une respiration doit être continue, jamais par paliers.
  - Un passage de face à profil se fait sur une pose de passage, pas au milieu d'une foulée.
  - Les nappes de brume ne doivent pas avoir de bords horizontaux durs.
  - Les lueurs des lanternes ne doivent pas tomber sur les visages comme des yeux lumineux.
  - Un portrait d'époque (le billet) doit ressembler au personnage du film : même profil, même perruque. C'est le ressort de l'histoire.

## Carte des fichiers du skill
| Chemin | Contenu |
|---|---|
| `SKILL.md` | Ce fichier : le pipeline, les règles, les valeurs, les pièges |
| `README.md` | Présentation, installation, crédits |
| `references/STYLE_BIBLE.md` | La formule de script et de visuel mesurée sur 20 shorts de référence |
| `references/reports/` | 7 rapports mesurés (mouvement, profondeur, textures, personnages, lumière, contours, étalonnage) et leur brief `CONTEXT.md` |
| `references/frames/` | 38 images de référence en taille réelle (540x960) |
| `references/sheets/` | 20 planches contact, une par short de référence, 60 frames chacune |
| `references/varennes/PLAN_DES_PLANS.md` | Le plan des plans complet de Varennes (brouillon v1 approuvé) |
| `references/varennes/CONTEXTE_AGENTS.md` | Le brief commun des agents de production |
| `references/varennes/CORRECTIONS.md` | Le catalogue des défauts trouvés et de leurs corrections, avec la check-list avant le rendu 2K |
| `references/varennes/images/` | 12 images du short final de Varennes (540x960) |
| `templates/bridge/` | Le code complet du short du pont |
| `templates/varennes/` | Le code complet du short de Varennes (version finale) |
| `templates/audio/` | Le son du pont : bruitages, marche, mixage avec ducking, `cues.md` |
| `templates/varennes_audio/` | Le son de Varennes : bruitages calés sur l'image, mixage sans musique, `cues.md` |
| `templates/scripts/` | Les stills (avec ou sans verrou), les planches côte à côte, la fusion des bacs à sable, la QA image par image, les temps des mots (`words.py`) |
| `templates/SCRIPT_example.md` | Le script du pont (anglais, traduit en regard) |
| `templates/SCRIPT_exemple_varennes.txt` | Le script de Varennes |
