# VARENNES - feuille des cues son

**Pas de musique.** Voix + bruitages (SFX) seulement. Chaque bruitage est original, synthétisé en numpy (liste des cues `sfx.py`, générateurs `sfx_gen.py` + `foley.py`, DSP `dsp.py` / `sp.py`), et placé d'après le minutage de l'image elle-même : `node dump_story.mjs` évalue MAIN (version principale) `<projet-remotion>/src/videos/varennes/story.ts` (CUE, coachAt, teamAt, drouetAt, bridgeCartAt, assignatAt, fadeAt, camAt) image par image dans `story_frames.json`. Ainsi les sabots suivent la phase des jambes de chaque cheval, les roues suivent la longueur d'arc parcourue par la voiture, les pas suivent la phase des marcheurs, et les sources mobiles sont panoramiquées / atténuées depuis la caméra du plan.
Timeline : 1770 frames à 30 fps = 59.000 s ; 4 plans-séquences, coupes franches à 473 / 724 / 1456 : chaque nappe, chaque fin d'événement et chaque queue de réverbération est coupée sur la coupe.

## Fichiers
| fichier | contenu |
|---|---|
| `mix.wav` | voix + bruitages : prémaster x gain de master +3.35 dB, puis limiteur true peak (plafond -1.0 dBTP) |
| `stem_sfx.wav` | bruitages seuls, à leur niveau dans le prémaster à gain unité |
| `stem_voice.wav` | `voice/voice.wav` inchangé (gain unité, sans EQ / compression), double mono, complété de silence jusqu'à 59.000 s |

Tous les fichiers : 48 kHz, stéréo, PCM 24-bit, 2,832,000 échantillons = 59.000 s. stem_voice.wav bit-identique à voice.wav : **True**. `stem_voice + stem_sfx` = le prémaster à gain unité ; `mix.wav` = limiteur(prémaster x gain de master).

## Loudness (niveau sonore)
- **mix.wav** : intégré -14.0 LUFS, true peak -1.0 dBTP, LRA 1.7 LU, momentary max -10.6, short-term max -12.4.
- Master : un seul gain commun de +3.35 dB sur voix + bruitages ensemble (leur équilibre est celui du prémaster à gain unité). Limiteur true peak : réduction de gain (GR) max 1.04 dB, > 0.1 dB sur 1.98 % et > 0.5 dB sur 0.21 % des échantillons (99e centile pendant la parole : 0.20 dB).
- Prémaster à gain unité (voix + bruitages) : -17.4 LUFS, TP -3.4 dBTP. Voix seule -17.5 LUFS (double mono), TP -3.3 dBTP. Stem bruitages -30.9 LUFS, TP -7.1 dBTP.

ffmpeg ebur128, `mix.wav` :
```
Summary:
  Integrated loudness:
    I:         -14.0 LUFS
    Threshold: -24.0 LUFS
  Loudness range:
    LRA:         1.7 LU
    Threshold: -34.0 LUFS
    LRA low:   -14.8 LUFS
    LRA high:  -13.1 LUFS
  True peak:
    Peak:       -1.1 dBFS
```
ffmpeg ebur128, `stem_sfx.wav` :
```
Summary:
  Integrated loudness:
    I:         -30.9 LUFS
    Threshold: -41.2 LUFS
  Loudness range:
    LRA:         9.5 LU
    Threshold: -51.1 LUFS
    LRA low:   -36.2 LUFS
    LRA high:  -26.7 LUFS
  True peak:
    Peak:       -7.1 dBFS
```
ffmpeg ebur128, `stem_voice.wav` :
```
Summary:
  Integrated loudness:
    I:         -17.5 LUFS
    Threshold: -27.5 LUFS
  Loudness range:
    LRA:         1.8 LU
    Threshold: -37.5 LUFS
    LRA low:   -18.4 LUFS
    LRA high:  -16.6 LUFS
  True peak:
    Peak:       -3.3 dBFS
```

## Voix au-dessus des bruitages, par plan (prémaster à gain unité, LUFS)
marge = voix - bruitages (intégré) ; médiane / p10 parole = marge momentary sur 400 ms, mesurée sur des fenêtres situées à l'intérieur des mots prononcés.

| plan | temps s | voix | bruitages | marge LU | médiane parole | p10 parole |
|---|---|---|---|---|---|---|
| 1 Paris, nuit | 0.00-15.77 | -17.0 | -31.1 | 14.2 | 14.4 | 11.1 |
| 2 déguisement + route, nuit->aube | 15.77-24.13 | -17.3 | -31.7 | 14.4 | 15.1 | 9.0 |
| 3 relais de Sainte-Menehould, soir | 24.13-48.53 | -17.8 | -33.1 | 15.3 | 17.0 | 11.6 |
| 4 chevauchée + Varennes, nuit | 48.53-59.00 | -17.9 | -27.8 | 9.9 | 10.6 | 6.9 |

## Événements de bruitages (SFX)
Convention de niveau : ÉVÉNEMENT : naïf = LU par rapport à la voix (momentary max de l'événement) ; appliqué = naïf -6 dB (mixage standard). NAPPE (bed) = LU intégré par rapport à la voix, puis ducking de -4 dB sous les passages parlés (la voix est presque continue, donc les nappes restent ~4 dB sous leur niveau nominal la plupart du temps). mesuré = niveau réellement placé (avant ducking / gel / fondu de fin). « Gel » du plan 3 : tout sauf le sting baisse de -9 dB à 1334 et revient avant 1400. Plan 4 : tout sauf le billet qui tombe s'estompe 1738 -> 1760 ; le stem est un silence numérique de 1762 (début du fondu image) à 1770.
Acoustiques : plan 1 rue + façade du palais (RT 1.3 s), plan 2 campagne ouverte (0.45 s), plan 3 cour fermée de murs (0.85 s), plan 4 bois / ville endormie (1.1 s).

| # | frame | temps s | plan | cue | quoi | naïf | appliqué | mesuré | pan |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | 0.00 | 1 | crowd_murmur (nappe) | la foule aux torches murmure devant les Tuileries ; elle enfle vers 'gronde' (234-262), puis s'éloigne quand la caméra dérive vers la porte (268+) | -14 | -14 | -14.0 | mobile |
| 2 | 0 | 0.00 | 1 | paris_air (nappe) | air de la nuit parisienne : brise basse le long du palais, rumeur lointaine de la ville | -23 | -23 | -23.0 | mobile |
| 3 | 0 | 0.00 | 1 | torch_crackle (nappe) | les torches crépitent autour du très gros plan de l'accroche (proche), puis s'éclaircissent avec la grue et la dérive vers la porte | -18 | -18 | -18.0 | mobile |
| 4 | 40 | 1.33 | 1 | far_shout | un cri dans la foule ('hey!' / 'hah!' non verbal) | -13 | -19 | -19.0 | -0.60 |
| 5 | 98 | 3.27 | 1 | far_shout | un cri dans la foule ('hey!' / 'hah!' non verbal) | -13 | -19 | -19.0 | +0.50 |
| 6 | 140 | 4.67 | 1 | bill_rustle1 | l'homme de l'accroche baisse l'assignat (140-162) : léger froissement de papier | -14 | -20 | -20.0 | -0.15 |
| 7 | 190 | 6.33 | 1 | far_shout | un cri dans la foule ('hey!' / 'hah!' non verbal) | -13 | -19 | -19.0 | -0.30 |
| 8 | 226 | 7.53 | 1 | far_shout | un cri dans la foule ('hey!' / 'hah!' non verbal) | -13 | -19 | -19.0 | +0.60 |
| 9 | 234 | 7.80 | 1 | gronde_roar | TORCHES LEVÉES, poings brandis sur 'gronde' (234/237) : clameur de foule en colère qui enfle (cris non verbaux) | -5 | -11 | -11.0 | mobile |
| 10 | 234 | 7.80 | 1 | torch_whoomph | torches levées d'un geste : souffle des flammes (whoomph) | -9 | -15 | -15.0 | mobile |
| 11 | 246 | 8.20 | 1 | far_shout | un cri dans la foule ('hey!' / 'hah!' non verbal) | -13 | -19 | -19.0 | -0.70 |
| 12 | 255 | 8.50 | 1 | far_shout | un cri dans la foule ('hey!' / 'hah!' non verbal) | -13 | -19 | -19.0 | +0.30 |
| 13 | 281 | 9.37 | 1 | far_shout | un cri dans la foule ('hey!' / 'hah!' non verbal) - loin, derrière la dérive | -16 | -22 | -22.0 | -0.50 |
| 14 | 285 | 9.50 | 1 | horse_snort | un cheval de la voiture s'ébroue dans le noir | -11 | -17 | -17.0 | +0.48 |
| 15 | 291 | 9.70 | 1 | gate_latch | le loquet de fer de la porte latérale se soulève | -11 | -17 | -17.0 | +0.25 |
| 16 | 294 | 9.80 | 1 | gate_creak | la porte latérale s'ouvre en grinçant (294) | -8 | -14 | -14.0 | +0.22 |
| 17 | 297 | 9.90 | 1 | family_steps | la famille royale sort de la porte sur la pointe des pieds, en file indienne (297-345), puis se presse vers la voiture (345-404) | -11 | -17 | -17.0 | mobile |
| 18 | 298 | 9.93 | 1 | look_swish | les têtes tournent à gauche / à droite : petit frottement d'étoffe | -21 | -27 | -27.0 | +0.20 |
| 19 | 305 | 10.17 | 1 | look_swish | les têtes tournent à gauche / à droite : petit frottement d'étoffe | -21 | -27 | -27.0 | +0.14 |
| 20 | 312 | 10.40 | 1 | look_swish | les têtes tournent à gauche / à droite : petit frottement d'étoffe | -21 | -27 | -27.0 | +0.11 |
| 21 | 330 | 11.00 | 1 | hoof_stamp | un cheval de la voiture change d'appui : deux coups de sabot sur les pavés | -13 | -19 | -19.0 | +0.67 |
| 22 | 338 | 11.27 | 1 | far_shout | un cri dans la foule ('hey!' / 'hah!' non verbal) - loin, derrière la dérive | -16 | -22 | -22.0 | +0.20 |
| 23 | 372 | 12.40 | 1 | harness_jingle | coup de tête : tintement du harnais | -15 | -21 | -21.0 | +0.52 |
| 24 | 372 | 12.40 | 1 | horse_snort | un cheval de la voiture s'ébroue dans le noir | -12 | -18 | -18.0 | +0.52 |
| 25 | 392 | 13.07 | 1 | far_shout | un cri dans la foule ('hey!' / 'hah!' non verbal) - loin, derrière la dérive | -16 | -22 | -22.0 | -0.40 |
| 26 | 398 | 13.27 | 1 | hoof_stamp | un cheval de la voiture change d'appui : deux coups de sabot sur les pavés | -13 | -19 | -19.0 | +0.10 |
| 27 | 405 | 13.50 | 1 | point_swish | le cocher pointe vers l'est : frottement de manche + cuir du siège | -16 | -22 | -22.0 | +0.12 |
| 28 | 430 | 14.33 | 1 | horse_snort | un cheval de la voiture s'ébroue dans le noir | -11 | -17 | -17.0 | +0.08 |
| 29 | 444 | 14.80 | 1 | door1_latch | portière déverrouillée (444) | -10 | -16 | -16.0 | +0.11 |
| 30 | 445 | 14.83 | 1 | door1_hinge | la portière s'ouvre à moitié, les gonds couinent (444-461) | -11 | -17 | -17.0 | +0.11 |
| 31 | 452 | 15.07 | 1 | far_shout | un cri dans la foule ('hey!' / 'hah!' non verbal) - loin, derrière la dérive | -16 | -22 | -22.0 | +0.10 |
| 32 | 473 | 15.77 | 2 | dawn_birds (nappe) | les premiers oiseaux de l'aube s'éveillent quand le ciel change (636-724) | -20 | -20 | -20.0 | mobile |
| 33 | 473 | 15.77 | 2 | night_country (nappe) | campagne ouverte la nuit : grillons (qui s'effacent vers l'aube 626-676) + brise légère | -20 | -20 | -20.0 | mobile |
| 34 | 490 | 16.33 | 2 | horse_snort | un cheval de la voiture s'ébroue / souffle en attendant | -11 | -17 | -17.0 | -0.44 |
| 35 | 512 | 17.07 | 2 | hat_tug | la gouvernante enfonce le chapeau bon marché sur la boucle royale (512) : « fwump » de feutre + étoffe | -9 | -15 | -15.0 | +0.17 |
| 36 | 526 | 17.53 | 2 | harness_jingle | un cheval secoue la tête : tintement du harnais | -16 | -22 | -22.0 | -0.46 |
| 37 | 540 | 18.00 | 2 | door2_latch | portière déverrouillée (540, coachAt(2).door) | -10 | -16 | -16.0 | +0.18 |
| 38 | 541 | 18.03 | 2 | door2_hinge | la portière s'ouvre (540-548) | -11 | -17 | -17.0 | +0.18 |
| 39 | 548 | 18.27 | 2 | horse_snort | un cheval de la voiture s'ébroue / souffle en attendant | -12 | -18 | -18.0 | -0.47 |
| 40 | 576 | 19.20 | 2 | step_creak | il monte sur le marchepied : craquement du marchepied en bois | -12 | -18 | -18.0 | +0.18 |
| 41 | 580 | 19.33 | 2 | coach_rock | la voiture tangue sur ses soupentes de cuir sous son poids (580-598) | -11 | -17 | -17.0 | +0.19 |
| 42 | 594 | 19.80 | 2 | seat_thump | il se laisse tomber sur la banquette : choc sourd du coussin + cuir | -13 | -19 | -19.0 | +0.12 |
| 43 | 605 | 20.17 | 2 | door2_shut | la portière se ferme (605) | -4 | -10 | -10.0 | +0.14 |
| 44 | 609 | 20.30 | 2 | reins_snap | le cocher fait claquer les rênes | -9 | -15 | -15.0 | +0.03 |
| 45 | 612 | 20.40 | 2 | coach_creaks | la caisse de la voiture + les soupentes de cuir grincent avec le mouvement | -14 | -20 | -20.0 | mobile |
| 46 | 612 | 20.40 | 2 | coach_lurch | la berline démarre d'un à-coup : grincement de caisse + tintement du harnais | -9 | -15 | -15.0 | +0.13 |
| 47 | 612 | 20.40 | 2 | harness_trot | tintement du harnais au rythme des foulées des chevaux de timon | -16 | -22 | -22.0 | mobile |
| 48 | 612 | 20.40 | 2 | hooves_road | six chevaux au pas (613) puis au trot (626) sur la route de terre battue, chaque foulée tirée de teamAt | -6 | -12 | -12.0 | mobile |
| 49 | 612 | 20.40 | 2 | wheels_dirt | roues cerclées de fer sur la terre : grondement, crissement, couinement du moyeu à chaque tour | -9 | -15 | -15.0 | mobile |
| 50 | 666 | 22.20 | 2 | seat_creak | le roi se renverse en arrière, les yeux fermés (666) : craquement du cuir de la banquette | -15 | -21 | -21.0 | mobile |
| 51 | 724 | 24.13 | 3 | coach_creaks_in | la caisse de la voiture grince en entrant | -14 | -20 | -20.0 | mobile |
| 52 | 724 | 24.13 | 3 | hooves_in | l'attelage entre au trot dans la cour (724-789), passe au pas (789-804), s'arrête sur 'calèche' 795 / 804 | -6 | -12 | -12.0 | mobile |
| 53 | 724 | 24.13 | 3 | wheels_in | roues sur les pavés de la cour, qui ralentissent jusqu'à l'arrêt à 804 | -8 | -14 | -14.0 | mobile |
| 54 | 724 | 24.13 | 3 | yard_evening (nappe) | cour du relais de poste, soir doré : brise douce, moineaux sur les toits, un merle au loin | -21 | -21 | -21.0 | mobile |
| 55 | 740 | 24.67 | 3 | well_pulley | la femme au puits remonte le seau : couinements de poulie, corde / chaîne | -18 | -24 | -24.0 | +0.05 |
| 56 | 788 | 26.27 | 3 | brake_creak | sabot de frein sur le cercle de fer : grincement plaintif pendant le ralentissement (788-804) | -11 | -17 | -17.0 | +0.03 |
| 57 | 804 | 26.80 | 3 | coach_settle | la berline se pose sur ses soupentes : grincement d'à-coup + tintement du harnais | -9 | -15 | -15.0 | +0.03 |
| 58 | 808 | 26.93 | 3 | tired_blow | un cheval fatigué souffle fort | -9 | -15 | -15.0 | -0.07 |
| 59 | 809 | 26.97 | 3 | unhitch_clink | traits et boucles décrochés, paire 1/3 | -12 | -18 | -18.0 | +0.00 |
| 60 | 812 | 27.07 | 3 | tired_team_out | les palefreniers emmènent l'attelage fatigué, paire par paire (812 / 826 / 840), au trot sur les pavés jusqu'à la porte d'écurie 1 | -10 | -16 | -16.0 | mobile |
| 61 | 823 | 27.43 | 3 | unhitch_clink | traits et boucles décrochés, paire 2/3 | -12 | -18 | -18.0 | -0.04 |
| 62 | 826 | 27.53 | 3 | drouet_boots | les bottes de Drouet, chaque pas tiré de drouetAt(3) : seuil de l'auberge -> fenêtre de la voiture (827-934, visible à partir de 832 ; plus doux à l'intérieur de la porte), frottement de talon à l'arrêt | -8 | -14 | -14.0 | mobile |
| 63 | 826 | 27.53 | 3 | inn_door | la porte de l'auberge s'ouvre (826-840, avant que Drouet sorte à 842) : loquet doux + lent grincement de bois | -16 | -22 | -22.0 | +0.30 |
| 64 | 827 | 27.57 | 3 | stable_door | la porte d'écurie 2 s'ouvre en grinçant sur ses pentures | -16 | -22 | -22.0 | -0.38 |
| 65 | 831 | 27.70 | 3 | fresh_team_in | l'attelage frais sort au trot de la porte d'écurie 2 (831 / 845 / 859) jusqu'au timon | -10 | -16 | -16.0 | mobile |
| 66 | 837 | 27.90 | 3 | unhitch_clink | traits et boucles décrochés, paire 3/3 | -12 | -18 | -18.0 | -0.10 |
| 67 | 866 | 28.87 | 3 | whinny | un cheval frais hennit quand on le fait sortir | -10 | -16 | -16.0 | -0.73 |
| 68 | 958 | 31.93 | 3 | horse_snort | un cheval attelé s'ébroue en attendant | -13 | -19 | -19.0 | -0.77 |
| 69 | 996 | 33.20 | 3 | well_pour | elle verse le seau dans son baquet (eau) | -17 | -23 | -23.0 | +0.20 |
| 70 | 1003 | 33.43 | 3 | far_dog | un chien de ferme aboie au loin derrière les maisons | -20 | -26 | -26.0 | -0.70 |
| 71 | 1004 | 33.47 | 3 | hoof_stamp | un cheval attelé gratte les pavés du sabot | -14 | -20 | -20.0 | -0.78 |
| 72 | 1024 | 34.15 | 3 | hitch_clink | paire fraîche 2/3 attelée au timon : cliquetis de chaîne + boucle | -13 | -19 | -19.0 | -0.80 |
| 73 | 1029 | 34.29 | 3 | hitch_clink | paire fraîche 1/3 attelée au timon : cliquetis de chaîne + boucle | -13 | -19 | -19.0 | -0.66 |
| 74 | 1030 | 34.32 | 3 | hitch_clink | paire fraîche 3/3 attelée au timon : cliquetis de chaîne + boucle | -13 | -19 | -19.0 | -0.78 |
| 75 | 1064 | 35.47 | 3 | seat_creak | le roi tourne la tête et montre un profil parfait (1066) : craquement du cuir de la banquette | -15 | -21 | -21.0 | -0.28 |
| 76 | 1098 | 36.60 | 3 | harness_jingle | tintement du harnais (un cheval secoue la tête) | -17 | -23 | -23.0 | -0.75 |
| 77 | 1117 | 37.23 | 3 | bill_out | Drouet sort l'assignat de son gilet (1117-1137) : glissement d'étoffe, froissement de papier, claquement sec quand il le lève | -6 | -12 | -12.0 | +0.32 |
| 78 | 1152 | 38.40 | 3 | horse_snort | un cheval attelé s'ébroue en attendant | -15 | -21 | -21.0 | -0.72 |
| 79 | 1182 | 39.40 | 3 | well_bucket | le seau vide redescend dans le puits : cliquetis + éclaboussure lointaine | -18 | -24 | -24.0 | +0.70 |
| 80 | 1212 | 40.40 | 3 | hoof_stamp | un cheval attelé gratte les pavés du sabot | -14 | -20 | -20.0 | -0.71 |
| 81 | 1242 | 41.40 | 3 | horse_snort | un cheval attelé s'ébroue en attendant | -14 | -20 | -20.0 | -0.71 |
| 82 | 1290 | 43.00 | 3 | harness_jingle | tintement du harnais (un cheval secoue la tête) | -17 | -23 | -23.0 | -0.73 |
| 83 | 1334 | 44.47 | 3 | sting | STING DE LA RÉVÉLATION (bruitages seuls) : souffle (swish) dans le punch-in (zoom sec) de 'démasquer', UN SEUL coup sec sur le panneau de la voiture (1334), les yeux du roi glissent = craquement de cuir qui monte (1336-1346) ; la cour se fige (les nappes baissent de -9 dB 1334-1372) | -4 | -10 | -10.0 | +0.05 |
| 84 | 1358 | 45.27 | 3 | sting_snort | un cheval s'ébroue dans le silence figé (détente comique) | -11 | -17 | -17.0 | -0.71 |
| 85 | 1388 | 46.27 | 3 | horse_snort | un cheval attelé s'ébroue en attendant | -14 | -20 | -20.0 | -0.71 |
| 86 | 1414 | 47.13 | 3 | reins_snap | le cocher fait claquer les rênes : le relais les laisse partir | -9 | -15 | -15.0 | -0.40 |
| 87 | 1418 | 47.27 | 3 | hooves_off | l'attelage frais sort de la cour au pas (1420) puis au trot (1445) | -8 | -14 | -14.0 | mobile |
| 88 | 1418 | 47.27 | 3 | wheels_off | roues sur les pavés, qui s'éloignent | -10 | -16 | -16.0 | mobile |
| 89 | 1419 | 47.30 | 3 | coach_lurch | la berline démarre d'un à-coup : grincement + tintement | -10 | -16 | -16.0 | -0.01 |
| 90 | 1456 | 48.53 | 4 | coach_creaks4 | la caisse de la voiture grince sur la route | -15 | -21 | -21.0 | mobile |
| 91 | 1456 | 48.53 | 4 | coach_team4 | les six chevaux de la berline : galop lointain sur la grand-route (lanternes entre les troncs 1530-1560), arrivée et arrêt devant la charrette (1640), demi-tour et départ au galop (1688+) | -6 | -12 | -12.0 | mobile |
| 92 | 1456 | 48.53 | 4 | harness4 | tintement du harnais au rythme des foulées de l'attelage | -17 | -23 | -23.0 | mobile |
| 93 | 1456 | 48.53 | 4 | night_wood (nappe) | nuit : grillons, vent dans les arbres (plus feuillu dans le bois 1519-1575) | -20 | -20 | -20.0 | mobile |
| 94 | 1456 | 48.53 | 4 | wheels4 | les roues de la berline : route de terre, puis pavés de la place, arrêt, demi-tour | -8 | -14 | -14.0 | mobile |
| 95 | 1458 | 48.60 | 4 | drouet_horse_snort | le cheval sellé de Drouet s'ébroue au poteau d'attache | -10 | -16 | -16.0 | +0.00 |
| 96 | 1463 | 48.77 | 4 | stirrup | pied à l'étrier : tintement de fer | -14 | -20 | -20.0 | +0.00 |
| 97 | 1467 | 48.90 | 4 | saddle_creak | Drouet se hisse en selle : craquement du cuir de la selle (1467-1475) | -10 | -16 | -16.0 | +0.00 |
| 98 | 1474 | 49.13 | 4 | saddle_thump | il retombe dans la selle | -12 | -18 | -18.0 | +0.00 |
| 99 | 1476 | 49.20 | 4 | drouet_gallop | Drouet part au galop (1476) : route de terre, raccourci par la forêt (1519-1575), pavés de la place, il retient son cheval à la tête du pont (1605) | -4 | -10 | -10.0 | mobile |
| 100 | 1519 | 50.63 | 4 | forest_brush | le cheval et son cavalier frôlent les sous-bois et les branches basses (1519-1575) | -14 | -20 | -20.0 | mobile |
| 101 | 1528 | 50.93 | 4 | owl | une chouette hulule au fond du bois | -13 | -19 | -19.0 | -0.55 |
| 102 | 1542 | 51.40 | 4 | branch_whip | tronc / branches au premier plan qui fouettent devant l'objectif (2027.6, -58) | -8 | -14 | -14.0 | +0.74 |
| 103 | 1544 | 51.47 | 4 | branch_whip | tronc / branches au premier plan qui fouettent devant l'objectif (2026.4, -61.5) | -8 | -14 | -14.0 | +0.74 |
| 104 | 1549 | 51.63 | 4 | branch_whip | tronc / branches au premier plan qui fouettent devant l'objectif (2023.9, -69) | -8 | -14 | -14.0 | +0.80 |
| 105 | 1551 | 51.70 | 4 | branch_whip | tronc / branches au premier plan qui fouettent devant l'objectif (2022.6, -72.5) | -8 | -14 | -14.0 | +0.80 |
| 106 | 1552 | 51.73 | 4 | canopy | la grue monte à travers la canopée jusqu'au pont : les feuilles bruissent devant l'objectif (1552-1570) | -12 | -18 | -18.0 | mobile |
| 107 | 1555 | 51.83 | 4 | branch_whip | tronc / branches au premier plan qui fouettent devant l'objectif (2020.6, -79.5) | -8 | -14 | -14.0 | +0.80 |
| 108 | 1556 | 51.87 | 4 | river (nappe) | la petite rivière sous le pont de Varennes (révélée par la grue 1552+) | -24 | -24 | -24.0 | mobile |
| 109 | 1558 | 51.93 | 4 | cart_push | des habitants en bonnet de nuit poussent la charrette sur 4.3 m le long du pont (1558-1590) : roues sur la pierre, craquements de bois, raclement pendant qu'on la met en travers (1574-1590) | -11 | -17 | -17.0 | mobile |
| 110 | 1558 | 51.93 | 4 | cart_steps | les pas des pousseurs et des porteurs de tonneaux sur les pierres du pont | -14 | -20 | -20.0 | mobile |
| 111 | 1584 | 52.80 | 4 | far_dog4 | un chien aboie quelque part dans la ville endormie | -20 | -26 | -26.0 | -0.60 |
| 112 | 1597 | 53.23 | 4 | barrel_thud | le tonneau 1/3 tombe lourdement sur la charrette (apparaît f1597) | -6 | -12 | -12.0 | -0.02 |
| 113 | 1605 | 53.50 | 4 | barrel_thud | le tonneau 2/3 tombe lourdement sur la charrette (apparaît f1605) | -6 | -12 | -12.0 | -0.05 |
| 114 | 1606 | 53.53 | 4 | drouet_rein_in | Drouet retient son cheval à la tête du pont : ébrouement + court hennissement | -9 | -15 | -15.0 | +0.25 |
| 115 | 1612 | 53.73 | 4 | barrel_thud | le tonneau 3/3 tombe lourdement sur la charrette (apparaît f1612) | -6 | -12 | -12.0 | -0.07 |
| 116 | 1626 | 54.20 | 4 | brake4 | la berline freine fort vers la charrette : gémissement du frein + dérapage sur les pavés (1626-1640) | -8 | -14 | -14.0 | +0.78 |
| 117 | 1626 | 54.20 | 4 | guards | des gardes nationaux se pressent vers la portière avec leurs lanternes (1630-1659) : bottes sur les pavés, couinements des anses de lanterne, cliquetis du fourniment | -9 | -15 | -15.0 | mobile |
| 118 | 1640 | 54.67 | 4 | coach_halt | LA VOITURE S'ARRÊTE devant la charrette (1640, l'à-coup de caméra) : choc sourd de la caisse, grincement des soupentes, secousse du harnais | -5 | -11 | -11.0 | +0.36 |
| 119 | 1641 | 54.70 | 4 | door4_latch | un garde ouvre la portière d'un coup sec : loquet (1641) | -9 | -15 | -15.0 | +0.26 |
| 120 | 1642 | 54.73 | 4 | door4_hinge | la portière s'ouvre (1641-1648) | -11 | -17 | -17.0 | +0.23 |
| 121 | 1642 | 54.73 | 4 | town_murmur | les habitants en bonnet de nuit murmurent quand la voiture s'arrête | -18 | -24 | -24.0 | mobile |
| 122 | 1644 | 54.80 | 4 | team_whinny | un cheval de tête hennit, effrayé par la barricade | -11 | -17 | -17.0 | +0.07 |
| 123 | 1649 | 54.97 | 4 | grab | la main d'un garde sur son épaule : étoffe agrippée (sur 'arrêté' 1651) | -11 | -17 | -17.0 | +0.13 |
| 124 | 1649 | 54.97 | 4 | king_step | le roi descend sur le marchepied : craquement de bois + ressorts de la voiture | -12 | -18 | -18.0 | +0.13 |
| 125 | 1658 | 55.27 | 4 | king_feet | ses chaussures touchent les pavés | -14 | -20 | -20.0 | +0.08 |
| 126 | 1679 | 55.97 | 4 | king_back_in | repoussé sur le marchepied : craquement + ressorts | -12 | -18 | -18.0 | -0.09 |
| 127 | 1689 | 56.30 | 4 | door4_shut | la portière se referme violemment sur lui (1689) | -5 | -11 | -11.0 | -0.09 |
| 128 | 1689 | 56.30 | 4 | reins_snap4 | rênes : la voiture fait demi-tour | -10 | -16 | -16.0 | -0.07 |
| 129 | 1692 | 56.40 | 4 | uturn_scrape | les cercles de fer raclent les pavés dans le demi-tour serré | -12 | -18 | -18.0 | mobile |
| 130 | 1700 | 56.67 | 4 | escort_hooves | les sabots de l'escorte qui se range derrière et s'éloigne vers Paris (1700-1762) | -9 | -15 | -15.0 | mobile |
| 131 | 1704 | 56.80 | 4 | bill_flutter | l'assignat descend en voletant à travers le cadre (1704-1756) et se pose en douceur, face visible, sur les pavés (frame d'atterrissage 1756 : pose douce) | -8 | -14 | -14.0 | mobile |

## Notes de synchro image
- Les branch_whip (plan 4) sont calés sur les frames où les 5 troncs « fouet » au premier plan de build.ts croisent le centre de l'écran : f1544, f1547, f1552, f1554, f1559 (un tronc écarté par le test de dégagement d'objectif de build.ts garde quand même son whoosh).
- Galop de Drouet : le cycle des jambes de sa carte tourne à ~7 Hz à 0.8 m/f, donc le galop à 4 temps n'est sonorisé qu'une foulée visuelle sur DEUX (ancré sur le début de la foulée) ; les pas au pas / au trot utilisent directement la phase.
- L'escorte reste immobile à l'image (cast.ts) ; on entend ses sabots se ranger derrière la voiture à partir de 1700 puis s'éloigner (gain + air), pendant que la voiture finit son demi-tour.
- Les chocs de tonneaux suivent la règle de visibilité de world.ts (le tonneau i apparaît quand 3*ramp(BARRELS) > i + 0.3).
- Relance après tout changement de minutage de l'image : `node dump_story.mjs && python mix.py`.
## v2 (remplacée par la v3)

Révision de l'utilisateur : la vidéo commence à la frame 172 de la timeline (story) (5.7333 s, sur « En juin 1791 ») ; l'accroche est coupée. Bruitages -3 dB par rapport à la v1. Construite par `python mix_v2.py` à partir des stems v1 (mêmes cues, même minutage ; les numéros de frames des tableaux ci-dessus sont des frames de la TIMELINE (story) : temps v2 = temps timeline - 5.7333 s).

| fichier | contenu |
|---|---|
| `mix_v2.wav` | voix + bruitages, un seul gain de master +3.48 dB, limiteur true peak -1 dBTP (GR max 1.06 dB, > 0.5 dB sur 0.17 % des échantillons) |
| `stem_sfx_v2.wav` | stem bruitages v1 à partir de l'échantillon timeline 275,200, -3 dB, fondu d'entrée de 150 ms |
| `stem_voice_v2.wav` | voice.wav à partir de l'échantillon timeline 275,200, fondu d'entrée de 10 ms, sinon bit-identique (True) |

Tous : 48 kHz stéréo 24-bit, 2,556,800 échantillons = 53.2667 s = 1598 frames. Voix et bruitages restent alignés sur l'image (échantillon v2 k = échantillon timeline 275,200 + k). La voix est coupée à 5.7333 s, dans le creux de 5.72-5.74 s (~-20 dBFS RMS, plat) : couper à 5.720 s et ajouter 13.3 ms au début aurait mis la voix 26.7 ms en retard.

- **mix_v2.wav** : intégré -14.0 LUFS, true peak -1.0 dBTP, LRA 1.6 LU.
- Prémaster à gain unité -17.5 LUFS ; voix -17.6 LUFS ; bruitages -33.8 LUFS (16.2 LU sous la voix ; la v1 était à 13.4).
- Les sabots de l'escorte s'éloignent toujours à partir de la frame timeline 1700 (l'escorte part désormais avec la voiture à l'image).

ffmpeg ebur128, `mix_v2.wav` :
```
Summary:
  Integrated loudness:
    I:         -14.0 LUFS
    Threshold: -24.0 LUFS
  Loudness range:
    LRA:         1.6 LU
    Threshold: -34.0 LUFS
    LRA low:   -14.8 LUFS
    LRA high:  -13.2 LUFS
  True peak:
    Peak:       -1.1 dBFS
```
ffmpeg ebur128, `stem_sfx_v2.wav` :
```
Summary:
  Integrated loudness:
    I:         -33.8 LUFS
    Threshold: -44.1 LUFS
  Loudness range:
    LRA:        10.0 LU
    Threshold: -54.1 LUFS
    LRA low:   -39.7 LUFS
    LRA high:  -29.6 LUFS
  True peak:
    Peak:      -10.1 dBFS
```
ffmpeg ebur128, `stem_voice_v2.wav` :
```
Summary:
  Integrated loudness:
    I:         -17.6 LUFS
    Threshold: -27.6 LUFS
  Loudness range:
    LRA:         1.7 LU
    Threshold: -37.6 LUFS
    LRA low:   -18.4 LUFS
    LRA high:  -16.7 LUFS
  True peak:
    Peak:       -3.7 dBFS
```

## v3 (remplacée par la v4)

Révision de l'utilisateur : bruitages encore -4 dB (-7 dB au total par rapport à la v1) ; la porte de l'auberge est recalée sur le nouveau mouvement d'ouverture du responsable char (timeline 826-840, avant que Drouet sorte à 842) : loquet doux + lent grincement de bois (cue `inn_door`, tableau ci-dessus). Tout le reste comme en v2 : l'image commence à la frame timeline 172 (5.7333 s) ; temps v3 = temps timeline - 5.7333 s. Construite par `python mix_v3.py` (refait le rendu des bruitages avec la référence voix de la v1, donc les niveaux du tableau restent relatifs à la v1).

| fichier | contenu |
|---|---|
| `mix_v3.wav` | stem_voice_v2 + stem_sfx_v3, un seul gain de master +3.54 dB, limiteur true peak -1 dBTP (GR max 1.04 dB, > 0.5 dB sur 0.18 % des échantillons) |
| `stem_sfx_v3.wav` | bruitages à partir de l'échantillon timeline 275,200, -7 dB par rapport à la v1, fondu d'entrée de 150 ms |
| `stem_voice_v2.wav` | le stem voix de la v3 aussi (inchangé ; bit-identique à voice.wav après son fondu d'entrée de 10 ms : True) |

Tous : 48 kHz stéréo 24-bit, 2,556,800 échantillons = 53.2667 s = 1598 frames, alignés sur l'image (échantillon k = échantillon timeline 275,200 + k).

- **mix_v3.wav** : intégré -14.0 LUFS, true peak -1.0 dBTP, LRA 1.7 LU.
- Prémaster à gain unité -17.5 LUFS ; voix -17.6 LUFS ; bruitages -37.8 LUFS (20.2 LU sous la voix ; v2 16.2, v1 13.4).
- Les sabots de l'escorte s'éloignent toujours à partir de la frame timeline 1700.

ffmpeg ebur128, `mix_v3.wav` :
```
Summary:
  Integrated loudness:
    I:         -14.0 LUFS
    Threshold: -24.0 LUFS
  Loudness range:
    LRA:         1.7 LU
    Threshold: -34.0 LUFS
    LRA low:   -14.8 LUFS
    LRA high:  -13.1 LUFS
  True peak:
    Peak:       -1.1 dBFS
```
ffmpeg ebur128, `stem_sfx_v3.wav` :
```
Summary:
  Integrated loudness:
    I:         -37.8 LUFS
    Threshold: -48.1 LUFS
  Loudness range:
    LRA:        10.0 LU
    Threshold: -58.1 LUFS
    LRA low:   -43.7 LUFS
    LRA high:  -33.6 LUFS
  True peak:
    Peak:      -14.1 dBFS
```
ffmpeg ebur128, `stem_voice_v2.wav` :
```
Summary:
  Integrated loudness:
    I:         -17.6 LUFS
    Threshold: -27.6 LUFS
  Loudness range:
    LRA:         1.7 LU
    Threshold: -37.6 LUFS
    LRA low:   -18.4 LUFS
    LRA high:  -16.7 LUFS
  True peak:
    Peak:       -3.7 dBFS
```

## v4 (livraison actuelle)

Recalée sur le story.ts du responsable cam après la QA image par image (`<projet-remotion>/src/videos/varennes_cam/story.ts`, en lecture seule, exporté dans `story_frames_v4.json` ; table CUE inchangée). Le tableau des événements ci-dessus correspond maintenant au rendu v4 (frames timeline ; niveaux relatifs à la v1). Construite par `python mix_v4.py`.

- Portière, plan 2 : loquet à 540, couinement des gonds 540-548 (avant : 563-571).
- Drouet, plan 3 : les bottes suivent la nouvelle phase de pas de drouetAt(3), marche 827-934 à <= 0.058 m/f ; il est visible à partir de 832, les pas d'avant (dans l'embrasure) sont 5 dB plus doux. Grincement de la porte de l'auberge 826-840 comme en v3.
- Charrette du pont : poussée sur 4.3 m (1558-1590, pic 0.25 m/f) : moins de chocs de pavés et de grincements de roues (ils suivent la distance), le raclement seulement quand elle tourne ET avance (1574-1590, il s'éteint à l'arrêt), cue 3 dB plus bas.
- Billet : le voletement suit la vitesse de chute exportée (départ et arrivée en douceur), les battements s'éteignent en (1-u)^2, une pose douce de papier (sans tapotement) sur la frame d'atterrissage 1756.
- Branch_whip recalés sur le nouvel objectif du plan 4 : f1542, f1544, f1549, f1551, f1555 ; chocs de tonneaux inchangés (1597 / 1605 / 1612).

| fichier | contenu |
|---|---|
| `mix_v4.wav` | stem_voice_v2 + stem_sfx_v4, un seul gain de master +3.54 dB, limiteur true peak -1 dBTP (GR max 1.04 dB, > 0.5 dB sur 0.18 % des échantillons) |
| `stem_sfx_v4.wav` | bruitages à partir de l'échantillon timeline 275,200, -7 dB par rapport à la v1, fondu d'entrée de 150 ms |
| `stem_voice_v2.wav` | le stem voix (inchangé ; bit-identique à voice.wav après son fondu d'entrée de 10 ms : True) |

Tous : 48 kHz stéréo 24-bit, 2,556,800 échantillons = 53.2667 s = 1598 frames, alignés sur l'image (échantillon k = échantillon timeline 275,200 + k).

- **mix_v4.wav** : intégré -14.0 LUFS, true peak -1.0 dBTP, LRA 1.7 LU.
- Prémaster à gain unité -17.5 LUFS ; voix -17.6 LUFS ; bruitages -37.8 LUFS (20.2 LU sous la voix).

ffmpeg ebur128, `mix_v4.wav` :
```
Summary:
  Integrated loudness:
    I:         -14.0 LUFS
    Threshold: -24.0 LUFS
  Loudness range:
    LRA:         1.7 LU
    Threshold: -34.0 LUFS
    LRA low:   -14.8 LUFS
    LRA high:  -13.1 LUFS
  True peak:
    Peak:       -1.1 dBFS
```
ffmpeg ebur128, `stem_sfx_v4.wav` :
```
Summary:
  Integrated loudness:
    I:         -37.8 LUFS
    Threshold: -48.1 LUFS
  Loudness range:
    LRA:         9.8 LU
    Threshold: -58.1 LUFS
    LRA low:   -43.7 LUFS
    LRA high:  -33.9 LUFS
  True peak:
    Peak:      -14.1 dBFS
```
ffmpeg ebur128, `stem_voice_v2.wav` :
```
Summary:
  Integrated loudness:
    I:         -17.6 LUFS
    Threshold: -27.6 LUFS
  Loudness range:
    LRA:         1.7 LU
    Threshold: -37.6 LUFS
    LRA low:   -18.4 LUFS
    LRA high:  -16.7 LUFS
  True peak:
    Peak:       -3.7 dBFS
```
