# The Bridge That Fell for a Song - feuille de cues de la bande-son

Tout le son est original : synthétisé en numpy/scipy par `sfx_gen.py` / `instruments.py`, placé par `sfx.py` / `music.py`, mixé par `mix.py`.
Voix = `voice/voice.wav`, gain seulement (pas d'EQ, pas de compression, pas de changement de hauteur).

## Fichiers
| fichier | contenu |
|---|---|
| `mix.wav` | mixage final, 48 kHz, stéréo, 24 bits, 3,240,000 échantillons = 67.500 s |
| `stem_voice.wav` / `stem_music.wav` / `stem_sfx.wav` | stems au gain du mixage (leur somme donne le mixage avant le limiteur du master) |

## Loudness du master (notre propre mesureur BS.1770-4)
- Loudness intégrée **-15.0 LUFS**, true peak **-1.2 dBTP**, LRA 2.6 LU, max momentané -9.0 LUFS, max court terme (short-term) -12.5 LUFS
- Stems : voix -15.4 LUFS, musique -25.8 LUFS, sfx -29.1 LUFS (gain de la voix +1.20 dB, même gain sur chaque stem)
- Limiteur du master (look-ahead suréchantillonné 4x, plafond -1.2 dBTP) : réduction de gain max 1.45 dB, actif (>0.1 dB) sur 3.53 % des échantillons, >0.5 dB sur 0.63 %

Contre-vérification avec ffmpeg ebur128 :
```
Summary:
  Integrated loudness:
    I:         -15.0 LUFS
    Threshold: -25.0 LUFS
  Loudness range:
    LRA:         2.6 LU
    Threshold: -35.0 LUFS
    LRA low:   -16.2 LUFS
    LRA high:  -13.6 LUFS
  True peak:
    Peak:       -1.2 dBFS
```

## La voix au-dessus : loudness par section (LUFS, intégrée par stem, au gain du mixage)
nappe (bed) = musique + sfx. marge = voix - nappe (intégrée sur la section). médiane parole / p10 parole = médiane et 10e centile de la marge momentanée sur 400 ms (voix - nappe), sur des fenêtres centrées sur les mots prononcés.

| section (plans) | temps s | voix | musique | sfx | nappe | marge LU | médiane parole LU | p10 parole LU |
|---|---|---|---|---|---|---|---|---|
| hook (1) | 0.00-4.33 | -15.4 | -25.2 | -28.7 | -23.6 | 8.2 | 8.4 | 0.7 |
| town (2) | 4.33-9.43 | -15.5 | -25.7 | -29.6 | -24.2 | 8.7 | 9.6 | 2.5 |
| march (3) | 9.43-14.80 | -15.8 | -25.9 | -31.2 | -24.8 | 9.0 | 7.5 | 2.4 |
| bounce (4-5) | 14.80-21.43 | -15.4 | -25.6 | -32.0 | -24.7 | 9.2 | 8.7 | 4.6 |
| whistle (6) | 21.43-27.43 | -16.0 | -25.5 | -30.7 | -24.3 | 8.4 | 9.0 | 2.6 |
| groan (7) | 27.43-32.90 | -14.0 | -24.6 | -27.2 | -22.7 | 8.7 | 9.9 | 2.3 |
| snap+fall (8) | 32.90-37.80 | -15.1 | -29.0 | -24.3 | -24.2 | 9.1 | 9.0 | 2.6 |
| water (9-10) | 37.80-43.43 | -15.6 | -59.7 | -33.7 | -33.7 | 18.1 | 17.2 | 12.1 |
| sway (11) | 43.43-47.03 | -15.3 | -27.5 | -35.8 | -26.9 | 11.6 | 11.1 | 7.4 |
| swing (12) | 47.03-54.00 | -15.7 | -27.3 | -36.1 | -26.7 | 11.0 | 10.5 | 5.1 |
| march2 (13) | 54.00-57.83 | -15.2 | -25.7 | -31.8 | -24.8 | 9.6 | 9.8 | 5.9 |
| rule (14) | 57.83-62.10 | -14.3 | -26.5 | -28.7 | -25.0 | 10.7 | 10.3 | 1.1 |
| tourists (15) | 62.10-67.50 | -15.4 | -26.3 | -26.8 | -23.6 | 8.2 | 7.5 | 1.0 |

## Carte de la musique (marche originale, Bb majeur, 120 bpm : noire = pas)
Cible de la musique par section, en LU sous la voix (après un ducking de -3 dB sur la parole, déclenché par words.json) : hook -9.5, town -10.5, march -10.0, bounce -10.0, whistle -9.5, tension -10.0, sway -12.0, swing -11.5, march2 -10.5, rule -11.5, tourists -11.0. Gains de section appliqués (dB) : hook -7.6, town -3.2, march -6.8, bounce -7.1, whistle -6.0, tension -6.2, sway -7.2, swing -6.5, march2 -4.9, rule -3.4, tourists -7.2, dropout -6.2.

Rides (automations de volume, musique seule, dB) : 3.65-4.30 s -3.0, 26.95-27.36 s -2.0, 32.20-32.77 s -4.0, 61.25-61.98 s -3.0 - pour que les mots discrets en fin de phrase restent au-dessus et que la fanfare s'épanouisse dans les silences qui les suivent. Les deux derniers pas de l'accroche (3.5, 4.0) sont aussi 3 dB plus bas dans les SFX, pour '...walking across it.' (« …rien qu'en le traversant à pied. »)

| temps s | frame | musique |
|---|---|---|
| 0.00 | 0 | accroche (hook) : thème A1-A2 tutti, 7 siffleurs, tuba/contretemps/caisse claire ; fill de caisse claire 3.0-4.3 sous 'across it.' |
| 4.33 | 130 | accord final (button) de Bb + léger coup de cymbales pile sur le flash blanc (frame 130), puis la fanfare disparaît |
| 5.00 | 150 | récit : thème A1-A2 léger (glockenspiel + fifre, tuba sur 1/3, cors sur 2/4, caisse claire légère) |
| 9.00 | 270 | fanfare complète : thème A3-A8 (cymbale), les bottes font la grosse caisse |
| 15.00 | 450 | le tuba passe à des octaves rebondissantes quand le pont commence à rebondir |
| 21.00 | 630 | mesure de vamp, sans mélodie : de la place pour 'Somebody starts whistling' (« Quelqu'un se met à siffler ») |
| 22.25 | 668 | siffleur solo : anacrouse de 3 notes D-Eb-F qui entre dans le thème A à 23.0 (en Bb, sur le temps) |
| 23.75 | 712 | la colonne se joint au sifflement (8 siffleurs de plus à 24.75) |
| 29.22 | 877 | les siffleurs flanchent un par un (la hauteur s'affaisse, 29.2-29.7) : les visages deviennent nerveux |
| 29.50 | 885 | tension : pédale de F7, croches au tuba, caisse claire qui pousse |
| 31.00 | 930 | montée chromatique F7 - F#dim7 - Gm - G#dim7, glockenspiel qui égrène des doubles croches, roulement de caisse claire en crescendo |
| 33.00 | 990 | ARRÊT NET sur 'Then,' (« Puis, ») - musique muette pendant le boulon, la chute et la blague des deux pieds de profondeur |
| 43.43 | 1303 | retour chaleureux : pad Bb - Eb/Bb - Bb - F7, cuivres graves doux, vibraphone en balancier sur chaque extrême du balancement (84 bpm) |
| 47.24 | 1417 | valse de boîte à musique (116 bpm, 3/4) : une mesure par cycle de balançoire, oom-pah-pah en pizzicato |
| 48.79 | 1464 | poussées 48.79 / 50.34 / 51.89 / 53.44 = premiers temps (petit 'ting' de triangle), la mélodie monte à chaque mesure |
| 53.62 | 1609 | trait ascendant de boîte à musique sur 'higher and higher' (« de plus en plus haut ») jusque dans la marche |
| 54.00 | 1620 | la marche revient, douce et dorée, 6 siffleurs, thème A1-A2 |
| 58.85 | 1766 | roulement de caisse claire pp-mf qui mène à la règle |
| 59.79 | 1794 | coup de cuivres (stab) Bb + timbales sur le coup de marteau 1 ('rule', « règle »), F sur le coup 2 ('Never', « jamais »), Bb + cymbale sur le coup 3 ('step', « au pas ») |
| 62.00 | 1860 | version touriste détendue : swinguée, mélodie nonchalante au vibraphone, walking bass en pizzicato, balais |
| 67.00 | 2010 | accord final de Bb sur 'tourists' (« touristes ») (66.72-67.24), qui résonne, fondu jusqu'au silence à 67.5 |

## Événements SFX
Convention de niveau : chaque ÉVÉNEMENT a un niveau naïf (en LU par rapport au stem voix, mesuré comme la loudness momentanée max de l'événement) ; appliqué = naïf - 6 dB (règle de mixage standard) + décalages de distance/intensité. Les NAPPES sont en loudness intégrée, sans réduction. 'LUFS mix' = la loudness momentanée max de l'événement dans le mixage final (stem voix = -15.4 LUFS en intégré). Les sons de la colonne reçoivent aussi le passe-bas lié à la distance de la caméra et plus de réverbération de vallée.

| # | temps s | frame | cue | quoi | LU naïf | LU appliqué | LUFS mix | pan |
|---|---|---|---|---|---|---|---|---|
| 1 | 0.000 | 0.0 | amb_day (nappe, intégrée) | air de la vallée en journée : brise, rivière en contrebas, moineaux, drapeaux des tours (plans 1-8) | -30 | -30.0 | -45.4 | +0.00 |
| 2 | 0.000 | 0.0 | chain_groan_hook | chaînes qui gémissent sous la colonne qui rebondit (accroche) | -10 | -16.0 | -31.4 | -0.30 |
| 3 | 0.000 | 0.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.34) | -10 | -22.6 | -38.0 | +0.00 |
| 4 | 0.000 | 0.0 | stomp | 74 bottes au pas (plan 1, caméra à 15 m, stomp x1.41) | -8 | -20.0 | -35.4 | +0.00 |
| 5 | 0.500 | 15.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.35) | -10 | -22.5 | -37.9 | +0.00 |
| 6 | 0.500 | 15.0 | stomp | 74 bottes au pas (plan 1, caméra à 15 m, stomp x1.42) | -8 | -19.9 | -35.3 | +0.00 |
| 7 | 1.000 | 30.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.37) | -10 | -22.4 | -37.8 | +0.00 |
| 8 | 1.000 | 30.0 | stomp | 74 bottes au pas (plan 1, caméra à 15 m, stomp x1.43) | -8 | -19.8 | -35.2 | +0.00 |
| 9 | 1.500 | 45.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.39) | -10 | -22.3 | -37.7 | +0.00 |
| 10 | 1.500 | 45.0 | stomp | 74 bottes au pas (plan 1, caméra à 15 m, stomp x1.45) | -8 | -19.7 | -35.2 | +0.00 |
| 11 | 1.600 | 48.0 | whoosh_cam | push-in de la caméra vers les bottes | -12 | -18.0 | -33.4 | +0.00 |
| 12 | 2.000 | 60.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.41) | -10 | -19.2 | -34.5 | +0.00 |
| 13 | 2.000 | 60.0 | stomp | 74 bottes au pas (plan 1, caméra à 7 m, stomp x1.46) | -8 | -14.7 | -30.1 | +0.00 |
| 14 | 2.500 | 75.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.42) | -10 | -19.0 | -34.4 | +0.00 |
| 15 | 2.500 | 75.0 | stomp | 74 bottes au pas (plan 1, caméra à 7 m, stomp x1.47) | -8 | -14.6 | -30.0 | +0.00 |
| 16 | 2.933 | 88.0 | whoosh_cam | push-in de la caméra, à hauteur des bottes | -12 | -18.0 | -33.4 | +0.00 |
| 17 | 3.000 | 90.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.44) | -10 | -17.9 | -33.3 | +0.00 |
| 18 | 3.000 | 90.0 | stomp | 74 bottes au pas (plan 1, caméra à 5 m, stomp x1.49) | -8 | -12.8 | -28.2 | +0.00 |
| 19 | 3.500 | 105.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.46) | -10 | -19.0 | -34.4 | +0.00 |
| 20 | 3.500 | 105.0 | stomp | 74 bottes au pas (plan 1, caméra à 4 m, stomp x1.50) | -8 | -14.7 | -30.1 | +0.00 |
| 21 | 4.000 | 120.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.49) | -10 | -18.9 | -34.2 | +0.00 |
| 22 | 4.000 | 120.0 | stomp | 74 bottes au pas (plan 1, caméra à 4 m, stomp x1.50) | -8 | -14.7 | -30.1 | +0.00 |
| 23 | 4.333 | 130.0 | crowd_murmur | habitants sur les deux rives : murmure de ~22 voix, quelques premiers hourras (plan 2) | -10 | -16.0 | -31.5 | +0.00 |
| 24 | 4.333 | 130.0 | flash_whoosh | montée inversée (reverse) jusqu'au flash blanc (frame 130) + whoomp grave et doux | -5 | -11.0 | -26.4 | +0.00 |
| 25 | 4.500 | 135.0 | stomp | 74 bottes au pas (plan 2, caméra à 80 m, stomp x1.00) | -8 | -27.0 | -42.6 | +0.00 |
| 26 | 5.000 | 150.0 | stomp | 74 bottes au pas (plan 2, caméra à 80 m, stomp x1.00) | -8 | -27.0 | -42.5 | +0.00 |
| 27 | 5.500 | 165.0 | stomp | 74 bottes au pas (plan 2, caméra à 80 m, stomp x1.00) | -8 | -27.0 | -42.5 | +0.00 |
| 28 | 6.000 | 180.0 | stomp | 74 bottes au pas (plan 2, caméra à 80 m, stomp x1.00) | -8 | -27.0 | -42.6 | +0.00 |
| 29 | 6.500 | 195.0 | stomp | 74 bottes au pas (plan 2, caméra à 67 m, stomp x1.00) | -8 | -27.0 | -42.6 | +0.00 |
| 30 | 7.000 | 210.0 | stomp | 74 bottes au pas (plan 2, caméra à 66 m, stomp x1.00) | -8 | -27.0 | -42.5 | +0.00 |
| 31 | 7.500 | 225.0 | stomp | 74 bottes au pas (plan 2, caméra à 66 m, stomp x1.00) | -8 | -27.0 | -42.5 | +0.00 |
| 32 | 7.600 | 228.0 | crowd_cheer | les habitants acclament sur 'pride of the whole town' (« la fierté de toute la ville ») : hourras, enfants, applaudissements qui enflent | -6 | -12.0 | -27.5 | +0.00 |
| 33 | 8.000 | 240.0 | stomp | 74 bottes au pas (plan 2, caméra à 66 m, stomp x1.00) | -8 | -27.0 | -42.5 | +0.00 |
| 34 | 8.500 | 255.0 | stomp | 74 bottes au pas (plan 2, caméra à 51 m, stomp x1.00) | -8 | -27.0 | -42.5 | +0.00 |
| 35 | 9.000 | 270.0 | stomp | 74 bottes au pas (plan 2, caméra à 51 m, stomp x1.00) | -8 | -27.0 | -42.5 | +0.00 |
| 36 | 9.433 | 283.0 | whoosh_cam | caméra : plan large -> bas, devant la colonne | -11 | -17.0 | -32.4 | +0.00 |
| 37 | 9.500 | 285.0 | stomp | 74 bottes au pas (plan 3, caméra à 20 m, stomp x1.00) | -8 | -24.5 | -39.9 | +0.00 |
| 38 | 10.000 | 300.0 | stomp | 74 bottes au pas (plan 3, caméra à 6 m, stomp x1.00) | -8 | -17.7 | -33.1 | +0.00 |
| 39 | 10.500 | 315.0 | stomp | 74 bottes au pas (plan 3, caméra à 6 m, stomp x1.00) | -8 | -17.7 | -33.1 | +0.00 |
| 40 | 11.000 | 330.0 | stomp | 74 bottes au pas (plan 3, caméra à 6 m, stomp x1.00) | -8 | -17.7 | -33.1 | +0.00 |
| 41 | 11.500 | 345.0 | stomp | 74 bottes au pas (plan 3, caméra à 6 m, stomp x1.00) | -8 | -17.7 | -33.1 | +0.00 |
| 42 | 12.000 | 360.0 | stomp | 74 bottes au pas (plan 3, caméra à 4 m, stomp x1.00) | -8 | -14.1 | -29.5 | +0.00 |
| 43 | 12.500 | 375.0 | stomp | 74 bottes au pas (plan 3, caméra à 4 m, stomp x1.00) | -8 | -14.1 | -29.5 | +0.00 |
| 44 | 13.000 | 390.0 | stomp | 74 bottes au pas (plan 3, caméra à 4 m, stomp x1.00) | -8 | -14.1 | -29.5 | +0.00 |
| 45 | 13.500 | 405.0 | stomp | 74 bottes au pas (plan 3, caméra à 4 m, stomp x1.00) | -8 | -14.1 | -29.5 | +0.00 |
| 46 | 14.000 | 420.0 | stomp | 74 bottes au pas (plan 3, caméra à 4 m, stomp x1.00) | -8 | -14.1 | -29.5 | +0.00 |
| 47 | 14.500 | 435.0 | stomp | 74 bottes au pas (plan 3, caméra à 4 m, stomp x1.00) | -8 | -14.1 | -29.5 | +0.00 |
| 48 | 14.800 | 444.0 | whoosh_cam | coupe de la caméra vers la vue de côté | -11 | -17.0 | -32.4 | +0.00 |
| 49 | 15.000 | 450.0 | stomp | 74 bottes au pas (plan 4, caméra à 11 m, stomp x1.00) | -8 | -20.7 | -36.1 | +0.00 |
| 50 | 15.500 | 465.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.02) | -10 | -29.7 | -45.1 | +0.00 |
| 51 | 15.500 | 465.0 | stomp | 74 bottes au pas (plan 4, caméra à 12 m, stomp x1.00) | -8 | -21.3 | -36.7 | +0.00 |
| 52 | 16.000 | 480.0 | bounce_first | premier grand 'boing' de flexion + long gémissement des planches - le pont commence à rebondir (les visages réagissent à 16.17) | -10 | -20.0 | -35.4 | +0.00 |
| 53 | 16.000 | 480.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.03) | -10 | -28.2 | -43.6 | +0.00 |
| 54 | 16.000 | 480.0 | stomp | 74 bottes au pas (plan 4, caméra à 12 m, stomp x1.00) | -8 | -21.3 | -36.7 | +0.00 |
| 55 | 16.500 | 495.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.04) | -10 | -27.3 | -42.6 | +0.00 |
| 56 | 16.500 | 495.0 | stomp | 74 bottes au pas (plan 4, caméra à 12 m, stomp x1.00) | -8 | -21.3 | -36.7 | +0.00 |
| 57 | 17.000 | 510.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.05) | -10 | -25.2 | -40.5 | +0.00 |
| 58 | 17.000 | 510.0 | stomp | 74 bottes au pas (plan 4, caméra à 8 m, stomp x1.00) | -8 | -18.9 | -34.4 | +0.00 |
| 59 | 17.500 | 525.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.06) | -10 | -24.6 | -40.0 | +0.00 |
| 60 | 17.500 | 525.0 | stomp | 74 bottes au pas (plan 4, caméra à 8 m, stomp x1.00) | -8 | -18.9 | -34.4 | +0.00 |
| 61 | 17.800 | 534.0 | whoosh_cam | la caméra pivote vers les visages | -11 | -17.0 | -32.4 | +0.00 |
| 62 | 18.000 | 540.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.07) | -10 | -22.7 | -38.1 | +0.00 |
| 63 | 18.000 | 540.0 | stomp | 74 bottes au pas (plan 5, caméra à 5 m, stomp x1.00) | -8 | -16.4 | -31.8 | +0.00 |
| 64 | 18.500 | 555.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.08) | -10 | -22.3 | -37.6 | +0.00 |
| 65 | 18.500 | 555.0 | stomp | 74 bottes au pas (plan 5, caméra à 5 m, stomp x1.00) | -8 | -16.2 | -31.6 | +0.00 |
| 66 | 19.000 | 570.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.09) | -10 | -22.0 | -37.4 | +0.00 |
| 67 | 19.000 | 570.0 | stomp | 74 bottes au pas (plan 5, caméra à 5 m, stomp x1.00) | -8 | -16.2 | -31.6 | +0.00 |
| 68 | 19.500 | 585.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.10) | -10 | -21.8 | -37.2 | +0.00 |
| 69 | 19.500 | 585.0 | stomp | 74 bottes au pas (plan 5, caméra à 5 m, stomp x1.00) | -8 | -16.2 | -31.6 | +0.00 |
| 70 | 20.000 | 600.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.11) | -10 | -20.7 | -36.0 | +0.00 |
| 71 | 20.000 | 600.0 | stomp | 74 bottes au pas (plan 5, caméra à 4 m, stomp x1.00) | -8 | -14.7 | -30.1 | +0.00 |
| 72 | 20.500 | 615.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.12) | -10 | -20.5 | -35.9 | +0.00 |
| 73 | 20.500 | 615.0 | stomp | 74 bottes au pas (plan 5, caméra à 4 m, stomp x1.00) | -8 | -14.7 | -30.1 | +0.00 |
| 74 | 21.000 | 630.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.12) | -10 | -20.3 | -35.7 | +0.00 |
| 75 | 21.000 | 630.0 | stomp | 74 bottes au pas (plan 5, caméra à 4 m, stomp x1.00) | -8 | -14.7 | -30.1 | +0.00 |
| 76 | 21.433 | 643.0 | whoosh_cam | la caméra avance vers le visage du siffleur | -11 | -17.0 | -32.4 | +0.00 |
| 77 | 21.500 | 645.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.13) | -10 | -19.8 | -35.2 | +0.00 |
| 78 | 21.500 | 645.0 | stomp | 74 bottes au pas (plan 6, caméra à 4 m, stomp x1.01) | -8 | -14.0 | -29.4 | +0.00 |
| 79 | 22.000 | 660.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.14) | -10 | -19.5 | -34.9 | +0.00 |
| 80 | 22.000 | 660.0 | stomp | 74 bottes au pas (plan 6, caméra à 3 m, stomp x1.04) | -8 | -13.7 | -29.1 | +0.00 |
| 81 | 22.500 | 675.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.15) | -10 | -19.3 | -34.7 | +0.00 |
| 82 | 22.500 | 675.0 | stomp | 74 bottes au pas (plan 6, caméra à 3 m, stomp x1.06) | -8 | -13.5 | -28.9 | +0.00 |
| 83 | 23.000 | 690.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.16) | -10 | -19.1 | -34.5 | +0.00 |
| 84 | 23.000 | 690.0 | stomp | 74 bottes au pas (plan 6, caméra à 3 m, stomp x1.09) | -8 | -13.2 | -28.6 | +0.00 |
| 85 | 23.500 | 705.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.18) | -10 | -19.0 | -34.4 | +0.00 |
| 86 | 23.500 | 705.0 | stomp | 74 bottes au pas (plan 6, caméra à 3 m, stomp x1.12) | -8 | -13.0 | -28.4 | +0.00 |
| 87 | 23.900 | 717.0 | whoosh_cam | la caméra monte en grue au-dessus de la colonne | -11 | -17.0 | -32.4 | +0.00 |
| 88 | 24.000 | 720.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.19) | -10 | -21.8 | -37.2 | +0.00 |
| 89 | 24.000 | 720.0 | stomp | 74 bottes au pas (plan 6, caméra à 8 m, stomp x1.15) | -8 | -17.7 | -33.2 | +0.00 |
| 90 | 24.500 | 735.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.20) | -10 | -23.1 | -38.5 | +0.00 |
| 91 | 24.500 | 735.0 | stomp | 74 bottes au pas (plan 6, caméra à 12 m, stomp x1.18) | -8 | -20.0 | -35.4 | +0.00 |
| 92 | 25.000 | 750.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.21) | -10 | -23.0 | -38.4 | +0.00 |
| 93 | 25.000 | 750.0 | stomp | 74 bottes au pas (plan 6, caméra à 12 m, stomp x1.21) | -8 | -19.8 | -35.3 | +0.00 |
| 94 | 25.500 | 765.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.22) | -10 | -22.9 | -38.2 | +0.00 |
| 95 | 25.500 | 765.0 | stomp | 74 bottes au pas (plan 6, caméra à 12 m, stomp x1.24) | -8 | -19.6 | -35.0 | +0.00 |
| 96 | 26.000 | 780.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.23) | -10 | -20.8 | -36.2 | +0.00 |
| 97 | 26.000 | 780.0 | stomp | 74 bottes au pas (plan 6, caméra à 7 m, stomp x1.27) | -8 | -16.1 | -31.6 | +0.00 |
| 98 | 26.500 | 795.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.24) | -10 | -20.7 | -36.1 | +0.00 |
| 99 | 26.500 | 795.0 | stomp | 74 bottes au pas (plan 6, caméra à 7 m, stomp x1.30) | -8 | -16.0 | -31.4 | +0.00 |
| 100 | 27.000 | 810.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.25) | -10 | -20.6 | -35.9 | +0.00 |
| 101 | 27.000 | 810.0 | stomp | 74 bottes au pas (plan 6, caméra à 7 m, stomp x1.33) | -8 | -15.8 | -31.2 | +0.00 |
| 102 | 27.433 | 823.0 | whoosh_cam | caméra en plan large bas, depuis l'arrière | -11 | -17.0 | -32.4 | +0.00 |
| 103 | 27.500 | 825.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.26) | -10 | -21.4 | -36.7 | +0.00 |
| 104 | 27.500 | 825.0 | stomp | 74 bottes au pas (plan 7, caméra à 9 m, stomp x1.35) | -8 | -17.1 | -32.5 | +0.00 |
| 105 | 28.000 | 840.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.28) | -10 | -22.1 | -37.4 | +0.00 |
| 106 | 28.000 | 840.0 | stomp | 74 bottes au pas (plan 7, caméra à 11 m, stomp x1.37) | -8 | -18.5 | -33.9 | +0.00 |
| 107 | 28.500 | 855.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.30) | -10 | -21.9 | -37.3 | +0.00 |
| 108 | 28.500 | 855.0 | stomp | 74 bottes au pas (plan 7, caméra à 11 m, stomp x1.38) | -8 | -18.4 | -33.8 | +0.00 |
| 109 | 28.900 | 867.0 | chain_groan | les chaînes de suspension gémissent, de plus en plus aigu et fort à chaque pas (28.9 -> rupture) | -6 | -12.0 | -27.4 | -0.35 |
| 110 | 29.000 | 870.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.32) | -10 | -21.7 | -37.1 | +0.00 |
| 111 | 29.000 | 870.0 | stomp | 74 bottes au pas (plan 7, caméra à 11 m, stomp x1.39) | -8 | -18.3 | -33.7 | +0.00 |
| 112 | 29.500 | 885.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.34) | -10 | -20.0 | -35.4 | +0.00 |
| 113 | 29.500 | 885.0 | stomp | 74 bottes au pas (plan 7, caméra à 7 m, stomp x1.41) | -8 | -15.6 | -31.0 | +0.00 |
| 114 | 29.950 | 898.5 | chain_groan_swell | les chaînes gémissent bien fort juste après le mot 'groaning,' (« gémir ») (elles enflent sur les pas 30.0 + 30.5) | -4 | -10.0 | -25.4 | -0.35 |
| 115 | 30.000 | 900.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.35) | -10 | -19.9 | -35.3 | +0.00 |
| 116 | 30.000 | 900.0 | stomp | 74 bottes au pas (plan 7, caméra à 7 m, stomp x1.42) | -8 | -15.5 | -30.9 | +0.00 |
| 117 | 30.500 | 915.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.37) | -10 | -19.8 | -35.1 | +0.00 |
| 118 | 30.500 | 915.0 | stomp | 74 bottes au pas (plan 7, caméra à 7 m, stomp x1.43) | -8 | -15.4 | -30.8 | +0.00 |
| 119 | 31.000 | 930.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.39) | -10 | -17.7 | -33.1 | +0.00 |
| 120 | 31.000 | 930.0 | stomp | 74 bottes au pas (plan 7, caméra à 4 m, stomp x1.45) | -8 | -12.1 | -27.5 | +0.00 |
| 121 | 31.500 | 945.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.41) | -10 | -17.4 | -32.7 | +0.00 |
| 122 | 31.500 | 945.0 | stomp | 74 bottes au pas (plan 7, caméra à 4 m, stomp x1.46) | -8 | -11.7 | -27.1 | +0.00 |
| 123 | 32.000 | 960.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.42) | -10 | -17.3 | -32.6 | +0.00 |
| 124 | 32.000 | 960.0 | stomp | 74 bottes au pas (plan 7, caméra à 4 m, stomp x1.47) | -8 | -11.6 | -27.0 | +0.00 |
| 125 | 32.500 | 975.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.44) | -10 | -17.1 | -32.5 | +0.00 |
| 126 | 32.500 | 975.0 | stomp | 74 bottes au pas (plan 7, caméra à 4 m, stomp x1.49) | -8 | -11.5 | -26.9 | +0.00 |
| 127 | 32.900 | 987.0 | whoosh_cam | panoramique filé de la caméra vers le boulon d'ancrage | -11 | -17.0 | -32.4 | +0.00 |
| 128 | 33.000 | 990.0 | bolt_strain | le boulon tressaute à chaque pas : craquement du métal sous tension 1/4 (gros plan) | -12 | -18.0 | -33.4 | -0.15 |
| 129 | 33.000 | 990.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.46) | -10 | -20.9 | -36.3 | +0.00 |
| 130 | 33.000 | 990.0 | stomp | 74 bottes au pas (plan 8, caméra à 12 m, stomp x1.50) | -8 | -17.9 | -33.4 | +0.00 |
| 131 | 33.500 | 1005.0 | bolt_strain | le boulon tressaute à chaque pas : craquement du métal sous tension 2/4 (gros plan) | -11 | -17.0 | -32.4 | -0.15 |
| 132 | 33.500 | 1005.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.49) | -10 | -22.6 | -38.0 | +0.00 |
| 133 | 33.500 | 1005.0 | stomp | 74 bottes au pas (plan 8, caméra à 19 m, stomp x1.50) | -8 | -20.9 | -36.4 | +0.00 |
| 134 | 34.000 | 1020.0 | bolt_strain | le boulon tressaute à chaque pas : craquement du métal sous tension 3/4 (gros plan) | -10 | -16.0 | -31.4 | -0.15 |
| 135 | 34.000 | 1020.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.52) | -10 | -22.4 | -37.8 | +0.00 |
| 136 | 34.000 | 1020.0 | stomp | 74 bottes au pas (plan 8, caméra à 19 m, stomp x1.50) | -8 | -20.9 | -36.4 | +0.00 |
| 137 | 34.310 | 1029.3 | bolt_tick | tic de fatigue du métal | -14 | -20.0 | -35.4 | -0.15 |
| 138 | 34.470 | 1034.1 | bolt_tick | tic de fatigue du métal | -14 | -20.0 | -35.4 | -0.15 |
| 139 | 34.500 | 1035.0 | bolt_strain | le boulon tressaute à chaque pas : craquement du métal sous tension 4/4 (gros plan) | -9 | -15.0 | -30.4 | -0.15 |
| 140 | 34.500 | 1035.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.54) | -10 | -22.3 | -37.7 | +0.00 |
| 141 | 34.500 | 1035.0 | stomp | 74 bottes au pas (plan 8, caméra à 19 m, stomp x1.50) | -8 | -20.9 | -36.4 | +0.00 |
| 142 | 34.570 | 1037.1 | bolt_tick | tic de fatigue du métal | -14 | -20.0 | -35.4 | -0.15 |
| 143 | 34.620 | 1038.6 | bolt_snap | LE BOULON CASSE : craquement sec + les deux moitiés qui sonnent en volant (chute Doppler) + bruit sourd de libération + secousse de la chaîne | +0 | -6.0 | -21.4 | -0.20 |
| 144 | 34.620 | 1038.6 | chain_whip | le hauban arrière rompu fouette vers le haut : sifflement + cliquetis le long de la chaîne + clang quand il retombe mollement | -4 | -10.0 | -25.4 | -0.40 |
| 145 | 34.870 | 1046.1 | column_halt | la colonne s'arrête net : les bottes raclent et piétinent | -16 | -22.0 | -37.5 | +0.00 |
| 146 | 35.400 | 1062.0 | whoosh_cam | la caméra recule en grue au-dessus du pont | -11 | -17.0 | -32.4 | +0.00 |
| 147 | 35.550 | 1066.5 | bolt_land | une moitié de boulon atterrit sur la rive : tink, tink-tink | -16 | -22.0 | -37.4 | -0.50 |
| 148 | 35.670 | 1070.1 | bolt_land | une moitié de boulon atterrit sur la rive : tink, tink-tink | -16 | -22.0 | -37.4 | +0.10 |
| 149 | 35.800 | 1074.0 | timber_tear | la moitié proche s'arrache : énorme craquement de charpente + éclatement du bois qui culmine quand elle lâche (DROP0 36.35) | -6 | -12.0 | -27.4 | +0.10 |
| 150 | 36.950 | 1108.5 | amb_water (nappe, intégrée) | la rivière tout autour des soldats assis dedans : courant, gazouillis, clapotis, remous, gouttes (plans 9-10) | -19 | -19.0 | -34.4 | +0.00 |
| 151 | 36.950 | 1108.5 | fall_air | souffle d'air du tablier qui tombe (en accélérant, DROP0 36.35 -> DROP1 36.95) | -8 | -14.0 | -29.4 | +0.00 |
| 152 | 36.950 | 1108.5 | splash_big | GRAND PLOUF : choc sourd, claque, masse d'eau, nuage de bulles, gerbe qui retombe en pluie (6 sources le long du tablier) | -2 | -8.0 | -23.4 | +0.00 |
| 153 | 36.950 | 1108.5 | wood_crack | le tablier frappe l'eau : craquement du bois qui éclate + boum de charpente | -4 | -10.0 | -25.4 | +0.00 |
| 154 | 36.970 | 1109.1 | oofs | 74 hommes qui atterrissent dans deux pieds d'eau : une douzaine de 'oof' / 'ugh' / 'oh' / 'ow' | -4 | -10.0 | -25.4 | +0.00 |
| 155 | 37.050 | 1111.5 | debris | planches et paquetage qui tombent avec fracas dans l'eau peu profonde | -12 | -18.0 | -33.4 | +0.00 |
| 156 | 40.420 | 1212.6 | groans | soldats blessés assis dans l'eau peu profonde : gémissements 'ugh' / 'ow' | -12 | -18.0 | -33.7 | +0.00 |
| 157 | 41.950 | 1258.5 | groans | un autre gémissement venu de la rivière | -18 | -24.0 | -39.8 | +0.00 |
| 158 | 42.700 | 1281.0 | groans | un autre gémissement venu de la rivière | -18 | -24.0 | -39.7 | +0.00 |
| 159 | 43.300 | 1299.0 | amb_golden (nappe, intégrée) | calme de l'heure dorée : brise douce, phrases de merle, grillons discrets, rivière au loin (plans 11-13) | -29 | -29.0 | -44.4 | +0.00 |
| 160 | 43.433 | 1303.0 | whoosh_xfade | fondu enchaîné vers la lumière dorée | -12 | -18.0 | -33.4 | +0.00 |
| 161 | 43.757 | 1312.7 | sway_creak | le pont se balance tout seul (0.7 Hz) : long craquement doux à chaque extrême | -12 | -18.0 | -34.8 | -0.20 |
| 162 | 44.471 | 1334.1 | sway_creak | le pont se balance tout seul (0.7 Hz) : long craquement doux à chaque extrême | -12 | -18.0 | -34.8 | +0.20 |
| 163 | 45.186 | 1355.6 | sway_creak | le pont se balance tout seul (0.7 Hz) : long craquement doux à chaque extrême | -12 | -18.0 | -34.8 | -0.20 |
| 164 | 45.900 | 1377.0 | sway_creak | le pont se balance tout seul (0.7 Hz) : long craquement doux à chaque extrême | -12 | -18.0 | -34.8 | +0.20 |
| 165 | 46.614 | 1398.4 | sway_creak | le pont se balance tout seul (0.7 Hz) : long craquement doux à chaque extrême | -12 | -18.0 | -34.8 | -0.20 |
| 166 | 47.033 | 1411.0 | whoosh_xfade | fondu enchaîné vers le parc | -12 | -18.0 | -33.4 | +0.00 |
| 167 | 47.628 | 1428.8 | swing_squeak | grincement de l'attache de la balançoire (aller, arc de 6 deg) | -12 | -25.4 | -40.7 | +0.15 |
| 168 | 48.403 | 1452.1 | swing_squeak | grincement de l'attache de la balançoire (retour, arc de 6 deg) | -12 | -25.4 | -40.7 | +0.15 |
| 169 | 48.790 | 1463.7 | swing_push | poussée 1/4 : mains dans le dos + tintement de chaîne | -14 | -20.0 | -35.4 | +0.10 |
| 170 | 49.178 | 1475.3 | swing_squeak | grincement de l'attache de la balançoire (aller, arc de 17 deg) | -12 | -21.7 | -37.1 | +0.15 |
| 171 | 49.953 | 1498.6 | swing_squeak | grincement de l'attache de la balançoire (retour, arc de 17 deg) | -12 | -21.7 | -37.1 | +0.15 |
| 172 | 50.340 | 1510.2 | swing_push | poussée 2/4 : mains dans le dos + tintement de chaîne | -14 | -20.0 | -35.4 | +0.10 |
| 173 | 50.727 | 1521.8 | swing_squeak | grincement de l'attache de la balançoire (aller, arc de 28 deg) | -12 | -20.0 | -35.4 | +0.15 |
| 174 | 51.503 | 1545.1 | swing_squeak | grincement de l'attache de la balançoire (retour, arc de 28 deg) | -12 | -20.0 | -35.4 | +0.15 |
| 175 | 51.890 | 1556.7 | swing_push | poussée 3/4 : mains dans le dos + tintement de chaîne | -14 | -20.0 | -35.4 | +0.10 |
| 176 | 52.278 | 1568.3 | swing_squeak | grincement de l'attache de la balançoire (aller, arc de 39 deg) | -12 | -18.9 | -34.2 | +0.15 |
| 177 | 53.053 | 1591.6 | swing_squeak | grincement de l'attache de la balançoire (retour, arc de 39 deg) | -12 | -18.9 | -34.2 | +0.15 |
| 178 | 53.440 | 1603.2 | swing_push | poussée 4/4 : mains dans le dos + tintement de chaîne | -14 | -20.0 | -35.4 | +0.10 |
| 179 | 53.828 | 1614.8 | swing_squeak | grincement de l'attache de la balançoire (aller, arc de 50 deg) | -12 | -18.0 | -33.4 | +0.15 |
| 180 | 54.000 | 1620.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.16) | -10 | -22.6 | -38.0 | +0.00 |
| 181 | 54.000 | 1620.0 | stomp | 74 bottes au pas (plan 13, caméra à 9 m, stomp x1.09) | -8 | -19.0 | -34.4 | +0.00 |
| 182 | 54.000 | 1620.0 | whoosh_xfade | fondu enchaîné de retour sur le pont | -12 | -18.0 | -33.4 | +0.00 |
| 183 | 54.500 | 1635.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.18) | -10 | -22.4 | -37.8 | +0.00 |
| 184 | 54.500 | 1635.0 | stomp | 74 bottes au pas (plan 13, caméra à 9 m, stomp x1.12) | -8 | -18.7 | -34.2 | +0.00 |
| 185 | 55.000 | 1650.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.19) | -10 | -22.3 | -37.6 | +0.00 |
| 186 | 55.000 | 1650.0 | stomp | 74 bottes au pas (plan 13, caméra à 9 m, stomp x1.15) | -8 | -18.5 | -33.9 | +0.00 |
| 187 | 55.500 | 1665.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.20) | -10 | -22.1 | -37.5 | +0.00 |
| 188 | 55.500 | 1665.0 | stomp | 74 bottes au pas (plan 13, caméra à 9 m, stomp x1.18) | -8 | -18.3 | -33.7 | +0.00 |
| 189 | 56.000 | 1680.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.21) | -10 | -22.0 | -37.4 | +0.00 |
| 190 | 56.000 | 1680.0 | stomp | 74 bottes au pas (plan 13, caméra à 9 m, stomp x1.21) | -8 | -18.1 | -33.5 | +0.00 |
| 191 | 56.167 | 1685.0 | whoosh_cam | la caméra dérive vers l'avant (marche dorée) | -11 | -17.0 | -32.4 | +0.00 |
| 192 | 56.500 | 1695.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.22) | -10 | -20.9 | -36.3 | +0.00 |
| 193 | 56.500 | 1695.0 | stomp | 74 bottes au pas (plan 13, caméra à 7 m, stomp x1.24) | -8 | -16.3 | -31.7 | +0.00 |
| 194 | 57.000 | 1710.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.23) | -10 | -20.8 | -36.1 | +0.00 |
| 195 | 57.000 | 1710.0 | stomp | 74 bottes au pas (plan 13, caméra à 7 m, stomp x1.27) | -8 | -16.1 | -31.5 | +0.00 |
| 196 | 57.500 | 1725.0 | deck_flex | boum sourd du tablier qui fléchit + craquement des planches + suspentes (amplitude du rebond 0.24) | -10 | -20.6 | -36.0 | +0.00 |
| 197 | 57.500 | 1725.0 | stomp | 74 bottes au pas (plan 13, caméra à 7 m, stomp x1.30) | -8 | -15.9 | -31.3 | +0.00 |
| 198 | 57.700 | 1731.0 | amb_bank (nappe, intégrée) | rive : rivière toute proche, brise, moineaux (plan 14) | -26 | -26.0 | -41.4 | +0.00 |
| 199 | 57.833 | 1735.0 | whoosh_xfade | fondu enchaîné vers la rive | -12 | -18.0 | -33.4 | +0.00 |
| 200 | 59.000 | 1770.0 | whoosh_cam | mouvement de caméra vers le panneau | -11 | -17.0 | -32.4 | +0.00 |
| 201 | 59.700 | 1791.0 | hammer_swish | élan du marteau | -20 | -26.0 | -41.4 | +0.30 |
| 202 | 59.790 | 1793.7 | hammer | coup de marteau 1/3 qui cloue le panneau : 'tink' de l'acier + 'thock' de la planche + poteau | -5 | -11.0 | -26.4 | +0.30 |
| 203 | 60.240 | 1807.2 | hammer_swish | élan du marteau | -20 | -26.0 | -41.4 | +0.30 |
| 204 | 60.330 | 1809.9 | hammer | coup de marteau 2/3 qui cloue le panneau : 'tink' de l'acier + 'thock' de la planche + poteau | -5 | -11.0 | -26.4 | +0.30 |
| 205 | 61.600 | 1848.0 | hammer_swish | élan du marteau | -20 | -26.0 | -41.4 | +0.30 |
| 206 | 61.690 | 1850.7 | hammer | coup de marteau 3/3 qui cloue le panneau : 'tink' de l'acier + 'thock' de la planche + poteau | -4 | -10.0 | -25.4 | +0.30 |
| 207 | 61.950 | 1858.5 | amb_town (nappe, intégrée) | air de la ville en journée sur le pont reconstruit : brise, moineaux, drapeaux, rivière (plan 15) | -29 | -29.0 | -44.4 | +0.00 |
| 208 | 62.000 | 1860.0 | town_murmur | habitants qui bavardent sur les rives (plan 15) | -11 | -17.0 | -32.6 | +0.00 |
| 209 | 62.021 | 1860.6 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.3 | -37.8 | +0.07 |
| 210 | 62.022 | 1860.7 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.3 | -38.0 | +0.01 |
| 211 | 62.037 | 1861.1 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.6 | -40.3 | +0.01 |
| 212 | 62.049 | 1861.5 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.9 | -39.4 | +0.32 |
| 213 | 62.098 | 1862.9 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.8 | -40.5 | +0.06 |
| 214 | 62.100 | 1863.0 | whoosh_xfade | fondu enchaîné vers le pont reconstruit | -12 | -18.0 | -33.4 | +0.00 |
| 215 | 62.237 | 1867.1 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.9 | -39.7 | +0.03 |
| 216 | 62.263 | 1867.9 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.6 | -39.2 | +0.15 |
| 217 | 62.317 | 1869.5 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.4 | -40.0 | +0.08 |
| 218 | 62.380 | 1871.4 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.1 | -38.6 | +0.08 |
| 219 | 62.425 | 1872.7 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.7 | -38.4 | +0.04 |
| 220 | 62.485 | 1874.5 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.6 | -38.2 | +0.15 |
| 221 | 62.574 | 1877.2 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.2 | -38.7 | +0.05 |
| 222 | 62.657 | 1879.7 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.7 | -38.3 | +0.29 |
| 223 | 62.667 | 1880.0 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.7 | -39.6 | -0.00 |
| 224 | 62.684 | 1880.5 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.8 | -39.3 | +0.19 |
| 225 | 62.689 | 1880.7 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.9 | -40.5 | +0.21 |
| 226 | 62.691 | 1880.7 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.1 | -38.6 | +0.17 |
| 227 | 62.714 | 1881.4 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.5 | -38.1 | -0.02 |
| 228 | 62.751 | 1882.5 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.0 | -39.6 | +0.33 |
| 229 | 62.754 | 1882.6 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.4 | -37.9 | +0.07 |
| 230 | 62.769 | 1883.1 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.9 | -39.4 | +0.29 |
| 231 | 62.793 | 1883.8 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.4 | -40.2 | +0.01 |
| 232 | 62.825 | 1884.7 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.0 | -38.7 | +0.17 |
| 233 | 62.837 | 1885.1 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.3 | -37.9 | +0.09 |
| 234 | 62.857 | 1885.7 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.7 | -39.2 | +0.13 |
| 235 | 62.857 | 1885.7 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.3 | -38.9 | +0.06 |
| 236 | 62.941 | 1888.2 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.6 | -38.3 | +0.01 |
| 237 | 63.004 | 1890.1 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.8 | -38.5 | +0.08 |
| 238 | 63.028 | 1890.8 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.5 | -39.0 | +0.19 |
| 239 | 63.234 | 1897.0 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.8 | -39.5 | +0.01 |
| 240 | 63.246 | 1897.4 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.8 | -38.4 | +0.03 |
| 241 | 63.247 | 1897.4 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.1 | -38.6 | +0.15 |
| 242 | 63.327 | 1899.8 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.5 | -38.0 | +0.04 |
| 243 | 63.335 | 1900.0 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.2 | -37.9 | +0.16 |
| 244 | 63.335 | 1900.1 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.0 | -38.6 | +0.05 |
| 245 | 63.421 | 1902.6 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -25.0 | -40.6 | -0.00 |
| 246 | 63.431 | 1902.9 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.7 | -39.3 | +0.09 |
| 247 | 63.446 | 1903.4 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.8 | -39.4 | +0.22 |
| 248 | 63.453 | 1903.6 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.8 | -38.3 | +0.35 |
| 249 | 63.457 | 1903.7 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.5 | -40.0 | +0.18 |
| 250 | 63.488 | 1904.6 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.2 | -37.8 | +0.08 |
| 251 | 63.500 | 1905.0 | whoosh_cam | mouvement de caméra le long des touristes | -11 | -17.0 | -32.4 | +0.00 |
| 252 | 63.616 | 1908.5 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.6 | -40.2 | -0.07 |
| 253 | 63.629 | 1908.9 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.6 | -38.1 | -0.01 |
| 254 | 63.634 | 1909.0 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.0 | -38.6 | +0.07 |
| 255 | 63.639 | 1909.2 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.4 | -37.8 | -0.04 |
| 256 | 63.684 | 1910.5 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.3 | -37.8 | -0.22 |
| 257 | 63.688 | 1910.6 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.1 | -39.7 | -0.19 |
| 258 | 63.692 | 1910.8 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.6 | -40.1 | -0.10 |
| 259 | 63.697 | 1910.9 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.6 | -38.2 | +0.02 |
| 260 | 63.774 | 1913.2 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.2 | -39.9 | -0.13 |
| 261 | 63.860 | 1915.8 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.0 | -38.7 | -0.18 |
| 262 | 64.009 | 1920.3 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.0 | -39.5 | -0.05 |
| 263 | 64.096 | 1922.9 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.0 | -37.7 | -0.10 |
| 264 | 64.100 | 1923.0 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.9 | -40.5 | -0.10 |
| 265 | 64.155 | 1924.6 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.8 | -38.3 | +0.06 |
| 266 | 64.175 | 1925.2 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.9 | -38.6 | -0.16 |
| 267 | 64.203 | 1926.1 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.5 | -40.2 | +0.05 |
| 268 | 64.221 | 1926.6 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -21.8 | -37.3 | -0.35 |
| 269 | 64.224 | 1926.7 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.4 | -38.9 | -0.18 |
| 270 | 64.229 | 1926.9 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.2 | -37.8 | -0.13 |
| 271 | 64.256 | 1927.7 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.6 | -40.4 | -0.11 |
| 272 | 64.301 | 1929.0 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -20.9 | -36.3 | -0.33 |
| 273 | 64.376 | 1931.3 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.7 | -38.3 | -0.10 |
| 274 | 64.380 | 1931.4 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.4 | -39.0 | -0.11 |
| 275 | 64.407 | 1932.2 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.2 | -37.7 | -0.09 |
| 276 | 64.430 | 1932.9 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.5 | -39.1 | -0.12 |
| 277 | 64.482 | 1934.5 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.3 | -38.9 | -0.15 |
| 278 | 64.499 | 1935.0 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.7 | -38.2 | +0.03 |
| 279 | 64.539 | 1936.2 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.3 | -38.8 | -0.21 |
| 280 | 64.569 | 1937.1 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.9 | -38.5 | +0.02 |
| 281 | 64.574 | 1937.2 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.1 | -37.7 | -0.05 |
| 282 | 64.621 | 1938.6 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -20.9 | -36.3 | -0.10 |
| 283 | 64.654 | 1939.6 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.7 | -40.3 | -0.24 |
| 284 | 64.756 | 1942.7 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.2 | -39.7 | -0.14 |
| 285 | 64.771 | 1943.1 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.0 | -38.7 | -0.05 |
| 286 | 64.778 | 1943.3 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.7 | -39.4 | -0.19 |
| 287 | 64.856 | 1945.7 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -21.7 | -37.2 | +0.07 |
| 288 | 64.857 | 1945.7 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.0 | -39.8 | -0.10 |
| 289 | 64.929 | 1947.9 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.3 | -37.9 | -0.16 |
| 290 | 64.954 | 1948.6 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.1 | -37.6 | -0.38 |
| 291 | 64.961 | 1948.8 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.1 | -37.7 | +0.05 |
| 292 | 64.991 | 1949.7 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.5 | -39.1 | -0.20 |
| 293 | 65.068 | 1952.0 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.9 | -38.6 | -0.11 |
| 294 | 65.131 | 1953.9 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.0 | -38.5 | -0.13 |
| 295 | 65.135 | 1954.0 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.6 | -39.2 | -0.10 |
| 296 | 65.265 | 1957.9 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.5 | -40.2 | -0.12 |
| 297 | 65.343 | 1960.3 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.1 | -39.6 | -0.10 |
| 298 | 65.364 | 1960.9 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.1 | -38.6 | +0.03 |
| 299 | 65.390 | 1961.7 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.4 | -39.9 | -0.22 |
| 300 | 65.400 | 1962.0 | whoosh_cam | la caméra recule en grue, fin | -11 | -17.0 | -32.4 | +0.00 |
| 301 | 65.441 | 1963.2 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.5 | -40.1 | +0.19 |
| 302 | 65.479 | 1964.4 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.7 | -40.2 | +0.30 |
| 303 | 65.519 | 1965.6 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.8 | -40.3 | +0.41 |
| 304 | 65.532 | 1966.0 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.4 | -39.0 | +0.34 |
| 305 | 65.533 | 1966.0 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.6 | -40.2 | +0.38 |
| 306 | 65.558 | 1966.7 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.4 | -39.0 | +0.56 |
| 307 | 65.573 | 1967.2 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.5 | -38.1 | +0.54 |
| 308 | 65.603 | 1968.1 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.5 | -39.0 | +0.59 |
| 309 | 65.618 | 1968.5 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.3 | -39.0 | +0.34 |
| 310 | 65.624 | 1968.7 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.6 | -38.1 | +0.35 |
| 311 | 65.627 | 1968.8 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.4 | -39.1 | +0.29 |
| 312 | 65.683 | 1970.5 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.2 | -38.9 | +0.34 |
| 313 | 65.688 | 1970.6 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.9 | -39.6 | +0.54 |
| 314 | 65.697 | 1970.9 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.2 | -39.8 | +0.40 |
| 315 | 65.718 | 1971.5 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.3 | -38.9 | +0.50 |
| 316 | 65.737 | 1972.1 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.4 | -38.2 | +0.34 |
| 317 | 65.756 | 1972.7 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.0 | -37.7 | +0.44 |
| 318 | 65.757 | 1972.7 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.4 | -39.0 | +0.58 |
| 319 | 65.894 | 1976.8 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.7 | -40.5 | +0.42 |
| 320 | 66.032 | 1981.0 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.8 | -40.5 | +0.43 |
| 321 | 66.229 | 1986.9 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.0 | -38.6 | +0.61 |
| 322 | 66.241 | 1987.2 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.4 | -39.1 | +0.53 |
| 323 | 66.260 | 1987.8 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.3 | -37.9 | +0.64 |
| 324 | 66.274 | 1988.2 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -25.0 | -41.0 | +0.38 |
| 325 | 66.295 | 1988.8 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.1 | -39.8 | +0.51 |
| 326 | 66.313 | 1989.4 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.3 | -39.2 | +0.49 |
| 327 | 66.379 | 1991.4 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.4 | -39.3 | +0.41 |
| 328 | 66.421 | 1992.6 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.2 | -37.9 | +0.58 |
| 329 | 66.437 | 1993.1 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.4 | -39.3 | +0.38 |
| 330 | 66.443 | 1993.3 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.4 | -40.0 | +0.47 |
| 331 | 66.465 | 1993.9 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.3 | -38.1 | +0.56 |
| 332 | 66.475 | 1994.2 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.7 | -39.3 | +0.53 |
| 333 | 66.524 | 1995.7 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.3 | -38.1 | +0.59 |
| 334 | 66.551 | 1996.5 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.1 | -38.9 | +0.53 |
| 335 | 66.583 | 1997.5 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.2 | -37.8 | +0.50 |
| 336 | 66.585 | 1997.6 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.9 | -39.5 | +0.64 |
| 337 | 66.586 | 1997.6 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.8 | -39.4 | +0.51 |
| 338 | 66.594 | 1997.8 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.2 | -37.9 | +0.43 |
| 339 | 66.615 | 1998.5 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.7 | -38.5 | +0.44 |
| 340 | 66.653 | 1999.6 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.6 | -38.2 | +0.43 |
| 341 | 66.719 | 2001.6 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.1 | -39.8 | +0.37 |
| 342 | 66.824 | 2004.7 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.2 | -37.9 | +0.36 |
| 343 | 66.846 | 2005.4 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.7 | -39.3 | +0.62 |
| 344 | 66.934 | 2008.0 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.5 | -39.5 | +0.43 |
| 345 | 66.962 | 2008.9 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.1 | -38.7 | +0.64 |
| 346 | 67.057 | 2011.7 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.9 | -38.8 | +0.51 |
| 347 | 67.092 | 2012.8 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.1 | -37.9 | +0.53 |
| 348 | 67.094 | 2012.8 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.8 | -40.4 | +0.61 |
| 349 | 67.131 | 2013.9 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.3 | -39.1 | +0.47 |
| 350 | 67.140 | 2014.2 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.0 | -39.8 | +0.41 |
| 351 | 67.155 | 2014.6 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.2 | -37.8 | +0.58 |
| 352 | 67.185 | 2015.6 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.3 | -39.2 | +0.49 |
| 353 | 67.192 | 2015.7 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.6 | -39.3 | +0.38 |
| 354 | 67.232 | 2017.0 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -24.1 | -40.0 | +0.53 |
| 355 | 67.283 | 2018.5 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.0 | -38.6 | +0.38 |
| 356 | 67.290 | 2018.7 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.5 | -38.2 | +0.60 |
| 357 | 67.410 | 2022.3 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -22.2 | -37.9 | +0.56 |
| 358 | 67.413 | 2022.4 | stroll_step | pas de touriste, hors cadence (24 promeneurs, chacun à son propre rythme) | -9 | -23.2 | -38.9 | +0.43 |
