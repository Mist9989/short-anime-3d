# Étude d'alignement du rendu (look-match) : contexte commun à tous les agents (à lire en entier avant de commencer)

## Objectif
Notre short vertical original de 67 s « The Bridge That Fell for a Song » (pont de Broughton en 1831, 74 soldats en marche) est
rendu en three.js et paraît aujourd'hui plat, pastel et bon marché à côté de la chaîne de référence (la chaîne de référence, étudiée
en privé). L'utilisateur veut que notre image soit aussi proche que possible en QUALITÉ et en STYLE : coloré, fort contraste,
couleurs « ciblées », traits d'encre noire sur le monde 3D, textures peintes, vrai ombrage et vrai éclairage sur les personnages et
le décor, arrière-plans profonds et flous, mouvement vivant, meilleures formes de personnages (têtes qui ne sont pas des cercles parfaits, meilleure structure
du corps). Histoire, script, personnages et voix restent LES NÔTRES : dégage des règles générales et des chiffres, ne décalque et ne copie jamais ses
personnages, accessoires ou plans précis.

## Matériel de référence (étude privée uniquement : n'en téléverse, n'en publie et n'en envoie jamais rien, nulle part)
- 20 shorts de référence, 720x1280, 30 fps : `references/vids/NN_<id>.mp4` (01 = le plus récent).
- Planches contact, chacune = 2 s = 60 frames : `references/measure/NN_<id>_sheets/sNN.jpg`.
- Synthèse précédente : `references/STYLE_BIBLE.md`. Planche de vue d'ensemble rapide : `references/refs_sheet.jpg`.
- Extrais les frames toi-même, par ex. `ffmpeg -v error -ss 12.4 -i references/vids/01_Mz72MuPgnGY.mp4 -frames:v 1 out.png`
  (utilise PNG pour les mesures ; JPEG suffit pour regarder). Recadre et zoome avec PIL (agrandissements au plus proche voisin pour mesurer les largeurs de trait).
- Sous-titres incrustés : un mot blanc en gras avec un contour noir, centré, à environ 60-74 % de la hauteur de l'image. MASQUE cette bande
  (ou détecte le texte blanc+noir) avant toute statistique, et ne confonds pas les contours des sous-titres avec les traits d'encre de la scène.

## Nos frames actuelles (état avant cette passe)
- `your Remotion project/out/bridge/test/` b_*.jpg, c_*.jpg (images fixes (stills) 540x960, numéro de frame dans le nom), planches contact
  `sheet_c1.jpg`, `sheet_c2.jpg`. Plans : 1-7 soldats qui marchent sur un pont suspendu en planches (jour), 8 un boulon casse + le tablier
  tombe, 9-10 soldats assis dans la rivière, 11-13 heure dorée (pont, balançoire du parc, vue de côté), 14 berge + officier
  qui cloue un panneau, 15 touristes en promenade (jour).
- Ne fais PAS de rendu de nouvelles images fixes et ne modifie RIEN sous `your Remotion project` (d'autres agents et l'agent principal le modifient).

## Notre stack (pour que les recommandations soient applicables)
- `your Remotion project` Remotion 4.0.290 + three 0.175 + @react-three/fiber 9.1.2 + @react-three/postprocessing 3.0.4 +
  postprocessing 6.37.2, composition `BridgeShort` 1080x1920 30 fps. Source dans `src/videos/bridge/` de ton projet Remotion :
  - `story.ts` timeline, caméras (CAMS), lumières (LIGHTS day/golden : direction/couleur/intensité du soleil, hémisphère, lumière d'appoint (fill), couleurs du ciel).
  - `world.ts` World : sphère de ciel en dégradé, HemisphereLight + DirectionalLight soleil (shadow map 4096) + fill, Fog(90,560),
    nuages en sprites, maillage d'eau, pont procédural, pose à chaque frame ; `build.ts` ville (maisons cubiques à pignon avec textures de
    façade en canvas, accessoires GLB low-poly Kenney CC0 convertis en MeshLambertMaterial) ; `paint.ts` textures Canvas2D procédurales
    (herbe, pavés, pierre, planches, poutre, eau, toit, brique, chaîne, façades).
  - `toon.ts` personnages dessinés en Canvas2D (un helper `Pen` : poly/ell/line/stroke) sur un canvas de conception de 600x1000,
    semelles à y=975 : bodyFront / bodySide, tenues (fusilier avec shako, officier, enfant, parent, habitants), expressions,
    sprites d'effets (notes, éclats, éclaboussure, étoiles...). Les têtes actuelles sont des cercles parfaits, contour épais uniforme, remplissages en aplat.
  - `cast.ts` pool de sprites ; chaque personnage = plan billboard (carte toujours tournée vers la caméra), MeshLambertMaterial avec le dessin en
    map + emissiveMap (emissive environ 0.36, donc il a l'air collé dessus), alphaTest 0.5 ; projette des ombres via un depth material.
  - `ink.ts` contour actuel : laplacien en espace écran de 1/viewZ seulement (pas de normales), seuil 0.06 -> presque aucun trait.
  - `Bridge.tsx` chaîne EffectComposer : Ink -> DepthOfField -> Bloom(0.3, threshold 0.86) -> ToneMapping NEUTRAL, MSAA 4.
- Outils sur cette machine : python (numpy 2.4, PIL 12, scipy 1.18 ; pas d'OpenCV), ffmpeg/ffprobe. N'installe rien avec pip,
  ne télécharge ni code ni outil depuis internet.

## Livrable (chaque agent)
1. Travaille uniquement dans `references/<your-topic>/` (scripts, recadrages, images de comparaison côte à côte).
2. Écris `references/reports/<your-topic>.md` :
   - des chiffres mesurés (tableaux) sur BEAUCOUP de frames de référence, réparties sur les 20 vidéos (frame par frame là où ça compte),
     et les mêmes mesures sur nos images fixes, avec l'écart dit clairement ;
   - les chemins des recadrages de comparaison et des comparaisons côte à côte que tu as faits ;
   - une recette d'implémentation concrète pour NOTRE stack : valeurs exactes des paramètres, couleurs hex, extraits GLSL / TypeScript,
     quel fichier et quelle fonction modifier ;
   - les 5 changements principaux, classés par impact visuel.
3. Message final : un résumé de 200 mots maximum + le chemin du rapport.
