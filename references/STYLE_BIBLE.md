# Bible de style de la chaîne de référence (étude des 20 derniers shorts, 2026-10-30)
Étude privée uniquement. Vidéos : vids/ (720p, audio original EN), transcriptions : tx/, mesures par vidéo : measure/summary.json,
planches contact 30 fps : measure/<video>_sheets/ (chaque planche = 2 s, 60 frames).

## Format
- Vertical 1080x1920, 30 fps, 31-78 s (médiane ~60 s), la voix commence à la frame 1-4 (pas d'intro, pas de logo, pas d'outro, pas de CTA).
- Voix : un seul narrateur masculin, rapide et régulier : 3.5-4.1 mots anglais/s (médiane 3.7), presque aucune pause (les silences entre mots >0.25 s totalisent <1 s par vidéo).
- Volume : -14 LUFS intégrés, LRA ~2.4 LU (très compressé). La nappe (bed) de musique et de bruitages (SFX) sous la voix n'est que ~5-10 dB sous la parole.
- Sous-titres : un mot (parfois 2-3) à la fois, sans-serif blanc en gras, fin contour noir, au milieu bas de l'image, remplacement sec à chaque mot.
  (NOTRE RÈGLE : pas de sous-titres sauf si l'utilisateur le demande.)

## Formule de script (20/20 la suivent)
1. **Accroche (hook) = paradoxe énoncé comme un fait, dès la phrase 1, sans mise en place.** Une personne a fait quelque chose qui paraît idiot ou impossible, avec un enjeu,
   ou « If you X, you'd Y » (si tu X, tu Y), ou « X is illegal, yet ... » (X est illégal, et pourtant ...). ~10-16 mots.
2. **Cadre en 1-2 lignes**, au présent, détails concrets (moment de la journée, un monsieur Tout-le-Monde avec un nom, des chiffres).
3. **Escalade, 3-6 temps forts (beats)** : les autres rient / doutent / se moquent (courtes répliques dites par les personnages), l'enjeu monte.
   1-2 blagues d'exagération par vidéo (affirmation vs réalité, « so slow X, and X was ... » (si lent que X, et X était ...)).
4. **Temps fort de mystère** : une question ou « Wait, ...? » (attends, ... ?) (~1 par vidéo).
5. **Mot pivot « You see, »** (tu vois,) (14 vidéos sur 20) → le vrai mécanisme. Souvent une analogie du quotidien
   (« Ever ...? » (tu as déjà ... ?), « think about the last time ... » (pense à la dernière fois que ...), « picture your body as ... » (imagine ton corps comme ...)).
6. **Chute ironique** dans les 1-2 dernières phrases, courte, qui livre le retournement. La vidéo se termine sur le dernier mot.
- Deux modes : le mode récit (troisième personne « he » (il), monsieur Tout-le-Monde avec un nom, présent) et la deuxième personne « Imagine you're... » (imagine que tu es...).
- Phrases de ~13.5 mots en médiane, anglais parlé simple, contractions, pas de jargon sauf s'il est expliqué dans la proposition suivante.

## Image
- Personnages cartoon 2D en aplats (visages simples cernés, fin contour noir, couleurs en aplat) debout dans des **environnements 3D toon**.
- Environnements 3D : textures peintes à la main, couleurs saturées, **fins traits d'encre noire sur la géométrie 3D** (arêtes + plis),
  profondeur de champ (DOF) douce sur les arrière-plans, lumière principale (key) chaude + ombres bleues/violettes, flaques de lumière (lumière de fenêtre) qui teintent aussi les personnages.
- Les personnages reçoivent la lumière et l'ombre de la scène (ils sont éclairés, pas en pure émission) et projettent des ombres portées au sol.
- Statistiques de couleur (médiane par vidéo) : luminance moyenne 0.43-0.54, écart-type de luminance 0.21-0.29, p2 0.03-0.11 (noirs profonds), p98 0.9-1.0,
  saturation 0.38-0.65 (très saturé). L'éclairage change avec les temps forts du récit (midi -> coucher de soleil -> bleu nuit pour l'explication).
- Chaque phrase est illustrée au pied de la lettre ; les accessoires portent la blague (bières, grenouilles, charrette à lait).

## Caméra / montage (mesuré)
- **Coupes franches presque jamais** : 0-1 par vidéo dans 12/20 vidéos ; la plupart des « coupes » détectées sont des effets de flash de 4 frames.
- La caméra est en tenue sur ~80% des frames (mouvement < 0.5 px/frame) ; les mouvements sont des **salves en ease-out** : vitesse maximale à la première frame du mouvement,
  qui décroît sur ~8-10 frames (px/frame en 720p, par ex. 6, 26, 12, 14, 6, 5, 2, 1).
- Transitions = mouvements de caméra continus : suivre un objet (balle de fusil, jet d'huile, ballon) d'un sujet au suivant,
  panoramiques filés (whip pans) avec flou de mouvement, traversée (fenêtre/hublot), ou un fondu enchaîné de 6-8 frames quand on change de lieu.
- Push-ins lents (avancées lentes) pendant les tenues ; caméra basse ; plans débullés (dutch tilt) fréquents pour le drame et les chutes.

## Effets
- Flammes de tir, salves de lueur/aura, étincelles à l'impact, sprites d'éclaboussure, lignes de vitesse, bouffées de poussière, notes de musique, étoiles,
  rayons de lumière ; ce sont tous des sprites cartoon 2D en aplat, composités dans la scène 3D.
