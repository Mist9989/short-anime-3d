// VARENNES timeline (references/varennes/PLAN_DES_PLANS.md, sections 4 "World layout" + 5 "Contracts"): 4 long takes timed to the
// user's French voice (voice/words.json, frame = round(start x 30)), hard cuts only at 473, 724, 1456. Inside a take the
// camera never cuts: symmetric smootherstep glides 24-60 f, cranes, tracking that follows coachAt/drouetAt, rack focus
// through the DOF table. Every hold creeps. Every visual reaction lands 0-3 f before its word.
// All story state (coach, team, Drouet, cart, assignat, sky ramp, fade) is a PURE function of (take id, frame).
export const FPS = 30;
export const TOTAL = 1770;
export const D0 = 6.0; // ground height (m), kept from the Bastille world
export const LEAD = 2 / 30;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
/** reference camera ease: symmetric smootherstep */
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const Y = (h: number) => D0 + h;

// =====================================================================================================================
// CUES (frames). W = word onsets from words.json; the rest are action cues derived from them (cast/world/sound schedule
// from these names, never from literal numbers).
// =====================================================================================================================
const W = {
  VOICI: 0, PUISSANT: 43, FRANCE: 61, ARRETER: 83, PROPRE: 118, TETE: 127, PIECE: 155, MONNAIE: 165,
  JUIN: 176, YEAR: 183, REVOLUTION: 224, GRONDE: 237, PARIS: 256, LOUIS: 268, FUIR: 300, SECRET: 313, FAMILLE: 336,
  TROUPES: 373, FRONTIERE: 410, CONTROLE: 447, PAYS: 461,
  POUR: 473, INAPERCU: 480, ROI: 505, DEGUISE: 515, VALET: 543, CHAMBRE: 559, MONTE: 572, BERLINE: 592, BANALE: 601,
  ROULE: 622, NUIT: 634, EST: 653, PLAN: 669, PERFECTION: 707,
  MAIS: 724, RELAIS: 742, SAINTE_MENEHOULD: 769, CALECHE: 795, S_ARRETE: 809, CHEVAUX: 833, MAITRE: 848, DROUET: 917,
  APPROCHE: 934, PORTIERE: 950, VISAGE: 987, PRETENDU_VALET: 1024, DETAIL: 1039, FRAPPE: 1053, PROFIL: 1070, CHOSE: 1103,
  SORT: 1120, ASSIGNAT: 1138, BILLET: 1156, REGARDE: 1193, PORTRAIT: 1207, GRAVE: 1235, LEVE: 1263, YEUX: 1274,
  L_HOMME: 1289, CALECHE_2: 1301, ROI_2: 1321, DEMASQUER: 1339, VISAGE_2: 1378, IMPRIME: 1397, ROYAUME: 1443,
  DROUET_2: 1458, ENFOURCHE: 1469, CHEVAL: 1495, RACCOURCI: 1519, BOIS: 1550, BLOQUER: 1563, PONT: 1576, VARENNES: 1586,
  LOIN: 1633, ROI_3: 1636, ARRETE: 1651, RAMENE: 1667, PARIS_2: 1676, ESCORTE: 1690, DESTIN: 1710, GUILLOTINE: 1730,
  SCELLE: 1753, VOICE_END: 1765,
} as const;

const STORY_CUE = {
  W,
  // ---- take 1 PARIS, night ----
  RACK_KING: [113, 126], // focus bill -> king in the window, lands on "tete" 127
  HAND_DOWN: [140, 162], // the sans-culotte lowers the bill (it leaves the bottom of frame during the push)
  TORCHES_UP: 234, // torches rise / fists shake, 3 f before "gronde" 237
  GATE_OPEN: 294, FAMILY_OUT: [297, 345], LOOK_LR: [298, 318], // single file: king, queen (hood), 2 kids, governess
  HURRY: [345, 404], POINT_EAST: 407, DOOR1: [444, 461], // coachman points east ("frontiere" 410); door opens to half
  // ---- take 2 ROAD, night -> dawn ----
  MIRROR: [476, 540], HAT_TUG: 512, CLIMB: [569, 598], DOOR2_OPEN: [563, 571], DOOR2_SHUT: [598, 606],
  ROLL: 612, DAWN: [626, 676], RELAX: 666, // king leans back, eyes shut, smiling ("plan" 669 .. "perfection" 707)
  // ---- take 3 RELAY, golden evening ----
  COACH_IN: [724, 804], UNHITCH: [812, 850], NEW_TEAM: [831, 884], // stops 804 ("s'arrete" 809); fresh horses ("chevaux" 833)
  DROUET_OUT: 842, DROUET_WALK: [845, 935], AT_DOOR: 935, EYEBROW: 1050, KING_PROFILE: 1066,
  BILL_OUT: [1117, 1137], RACK3: [1253, 1287, 1311, 1412] /* bill->king, ->Drouet (pan onto his lost profile 1285-1305), ->king, ->bill */,
  EYES_SLIDE: 1336, COACH_OFF: 1418,
  // ---- take 4 RIDE + VARENNES, night ----
  MOUNT: [1462, 1476], GALLOP: 1476, TURN_OFF: 1519, EXIT: 1575, DROUET_STOP: 1605,
  CART_PUSH: [1558, 1590], BARRELS: [1590, 1622], COACH_STOP: 1640, DOOR4_OPEN: [1641, 1648], KING_OUT: [1645, 1660],
  KING_IN: [1676, 1686], DOOR4_SHUT: [1684, 1690], UTURN: 1688, BILL_FALL: [1704, 1756], FADE: [1762, 1770],
} as const;

/** legacy Bastille cues: cast.ts still reads them inside its (now unused) Bastille scene functions */
const LEGACY_CUE = {
  STORMED: 39, TOWN_CHEER: [99, 130], MUSKETS_UP: 198, HORN_TIP: 246, HORN_PUFF: 250, ARMS_DOWN: [254, 268], DOORS: [349, 355],
  HEADS_TURN: [372, 376], IDEA: 382, POPS: [405, 413, 426, 431, 436], CLOTH_UP: 457, DRAW: [468, 479], SURGE: 483, CAPS: 514,
  SEVEN_OUT: [530, 555], COINS: 571, MADMEN: 592, CUFFS: [610, 630], PORTRAIT: 640, HOIST: 669, SETDOWN: 692, CHAIN: 690,
  SADE_BLINK: 752, SHOUT: 773, STARTLE: 782, MASSACRE: 824, WALKOUT: [840, 864],
} as const;
export const CUE = { ...LEGACY_CUE, ...STORY_CUE } as const;

// =====================================================================================================================
// WORLD POINTS (metres, y up, ground y = D0; +x = EAST, -z = NORTH). One world, four far-apart places; cuts hide jumps.
// =====================================================================================================================
const VARENNES_LOC = {
  EAST: [1, 0, 0] as V3, // dawn (take 2) is world-fixed in this direction
  // ---- PARIS / Tuileries, take 1 (reuses the Bastille square area; the fortress is replaced by the palace facade) ----
  STREET_BOX: [-46, -96, 46, -50], // x0, z0, x1, z1 cobbles in front of the palace
  FACADE_Z: -100, FACADE_X: [-48, 48], FACADE_CORNICE: D0 + 14, FACADE_RIDGE: D0 + 19, // faces +z
  KING_WIN: [-6, D0 + 7.2, -100] as V3, KING_WIN_WH: [1.6, 2.8], KING_ROOM_FLOOR: D0 + 5.6,
  KING_HEAD1: [-6, D0 + 7.0, -100.6] as V3, // the king's head (profile) inside the lit window
  SIDE_GATE: [24, D0, -100] as V3, SIDE_GATE_WH: [3.0, 4.2],
  CROWD1_BOX: [-16, -90, 12, -62], HOOK_MAN: [-5.0, D0, -87.6] as V3, HOOK_HAND: [-5.45, D0 + 1.92, -87.05] as V3,
  COACH1: [30, D0, -93.5] as V3, // parked, heading +x (east); its door (left side) faces the palace
  TREE1: [33, D0, -98] as V3, // big plane tree between the coach and the facade, canopy over the coach
  FAMILY_PATH: [[24, -99.6], [26.5, -98.6], [29, -96.6], [30.2, -95]] as [number, number][], // gate -> door step
  // ---- ROAD, take 2 (straight, east to the horizon) ----
  ROAD2_Z: -80, ROAD2_X: [180, 700], ROAD2_W: 6, COACH2: [220, D0, -80] as V3, BARRIER2: [206, D0, -80] as V3,
  POPLARS2: { south: -74, north: -92, step: 14 },
  // ---- SAINTE-MENEHOULD relay courtyard, take 3 ----
  RELAY_BOX: [1176, -98, 1226, -62], ROAD3_Z: -80, COACH3: [1200, D0, -80] as V3,
  INN_FRONT_Z: -88, INN_X: [1186, 1214], INN_DOOR: [1199.4, D0, -88] as V3, // inn on the north side, facing +z
  STABLE_FRONT_Z: -66, STABLE_X: [1184, 1212], STABLE_DOORS: [[1192, D0, -66], [1204, D0, -66]] as V3[], // facing -z
  WELL: [1183, D0, -75] as V3, TROUGH: [1213, D0, -67.5] as V3, DROUET3: [1199.55, D0, -82.6] as V3,
  // ---- RIDE + VARENNES, take 4 ----
  DROUET_MOUNT: [2030, D0, -16] as V3, TURN_OFF: [2030, D0, -44] as V3, FOREST_BOX: [2008, -86, 2100, -50],
  FOREST_EXIT: [2021, D0, -86] as V3, DROUET_STOP: [2013, D0, -95] as V3,
  /** main road (coach): from the south up x=2030 to the turn-off, east along z=-46, north along x=2104, west along z=-100 */
  ROAD4: [[2030, 60], [2030, -44], [2036, -46], [2098, -46], [2104, -52], [2104, -94], [2098, -100], [1992, -100], [1950, -100]] as [number, number][],
  RIVER4_X: [1996, 2006], RIVER4_DEPTH: 2.5, // small river running north-south
  BRIDGE4: [2001, D0, -100] as V3, BRIDGE4_X: [1992, 2010], BRIDGE4_Z: [-102.2, -97.8],
  EAST_SQ_BOX: [2010, -116, 2046, -86], TOWN_W_BOX: [1950, -140, 1992, -60],
  COACH4_STOP: [2024, D0, -100] as V3,
  /** the cart waits on the bridge's west end (CART_START) and is pushed 4.3 m east to BRIDGE4, turning across it.
   *  CART_PARK is kept as the push-direction reference cast.ts reads (it points east through (1993, -101) like the push). */
  CART_START: [1996.8, D0, -100.95] as V3, CART_PARK: [1989, D0, -101.4] as V3,
  ESCORT_ROWS: { z: [-96.6, -103.4], x: [2050, 2090], step: 5 },
  ASSIGNAT_LAND: [2032, D0 + 0.02, -103] as V3, // mid-square, away from the forest edge
};
/** legacy Bastille points (build.ts/cast.ts/world.ts still build the fortress from them until the world owner rebuilds) */
const LEGACY_LOC = {
  BRIDGE: [0, D0, 0] as V3, BRIDGE_HALF_W: 4.6,
  SQUARE: [0, D0, -72] as V3, SQUARE_BOX: [-46, -92, 46, -50],
  GATE: [0, D0, -100] as V3, GATE_W: 4.4, GATE_H: 6.5, WALL_FRONT_Z: -100, WALL_BACK_Z: -150, WALL_HALF_X: 32, WALL_T: 3, WALL_TOP: D0 + 22,
  TOWERS: [[-30, -101.5], [-10, -101.5], [10, -101.5], [30, -101.5], [-30, -148.5], [-10, -148.5], [10, -148.5], [30, -148.5]] as [number, number][],
  TOWER_R: 5.5, TOWER_TOP: D0 + 26,
  DRAW_HINGE: [0, D0, -100] as V3, DRAW_LEN: 8, DRAW_W: 4.8, MOAT: [-38, -100, 38, -92], MOAT_DEPTH: 4,
  COURT: [0, D0, -125] as V3, COURT_BOX: [-27, -147, 27, -103], DOOR: [0, D0, -147] as V3,
  SADE_WIN: [-30, D0 + 13.2, -96.0] as V3, SADE_FLOOR: D0 + 11.9, WINDOW_BOUNCE: [-30, D0 + 12.0, -94.6] as V3,
  GOVERNOR: [10, D0 + 26, -98.4] as V3,
  HOOK_PRISONERS: [-4.5, D0, -86.2] as V3, FORGERS_Z: -136.5, COUNT: [3.6, D0, -136.6] as V3,
  PARADE_C: [0, D0, -72] as V3, PARADE_R: 9, PARADE_W: 0.008, BARREL_PILE: [6, D0, -84] as V3,
  CART_QUAY_Z: -33.6, CART_X0: 5.5, CART_V: 0.05,
  INVALIDES_FACADE_Z: 96, DOME: [0, D0, 108] as V3, ESPLANADE: [0, D0, 75] as V3, ESPLANADE_BOX: [-46, 37, 46, 92], HORN_MAN: [0.4, D0, 70] as V3,
};
export const LOC = { ...LEGACY_LOC, ...VARENNES_LOC } as const;

/** the one barrel model (Varennes: the barrels piled on the bridge cart; the Bastille powder trickle is legacy, unused) */
export const BARREL = { h: 0.7, rMid: 0.29, rEnd: 0.24, hoops: 2, bungR: 0.03, trickle: { grains: 10, fallS: 0.5, color: "#2b2533" } } as const;

// =====================================================================================================================
// SHOTS (4 long takes)
// =====================================================================================================================
/** the story's light per take. "night" = moonlit blue fill + warm torch/lantern pools; "dawn" = take 2's ramp target
 *  (pale peach glow low in the EAST, sky still blue above); "golden" = take 3 evening; "day" unused. */
export type Light = "day" | "golden" | "night" | "dawn";
/** what MAIN's lights.ts/grade.ts can render TODAY (LIGHTS/LOOK/GRADES are keyed by it). Legacy: the world and post owners
 *  switch to `sky` / skyAt() once their presets know "night" and "dawn"; then this field goes. */
export type LegacyLight = "day" | "golden";
export type Scene = "paris" | "road" | "relay" | "ride"
  | "hook" | "town" | "muskets" | "cart" | "turn" | "siege" | "surrender" | "seven" | "parade" | "sade" | "window"; // legacy names
/** degrees, camera-relative like LIGHTS; lerped f0..f1 then frozen (optional, legacy) */
export type SunSweep = { f0: number; f1: number; az0: number; az1: number; el0: number; el1: number };
export type ShotDef = {
  id: number; a: number; b: number;
  /** NEW contract: the take's light (take 2 ramps night -> dawn, see skyAt) */ sky: Light;
  /** legacy render preset (see LegacyLight) */ light: LegacyLight;
  scene: Scene; flashback?: boolean; sun?: SunSweep;
};
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 473, sky: "night", light: "golden", scene: "paris" },
  { id: 2, a: 473, b: 724, sky: "night", light: "golden", scene: "road" },
  { id: 3, a: 724, b: 1456, sky: "golden", light: "golden", scene: "relay" },
  { id: 4, a: 1456, b: TOTAL, sky: "night", light: "golden", scene: "ride" },
];
/** light at (take, frame): blend `from` -> `to` by k (0..1). Only take 2 ramps (night -> dawn over CUE.DAWN, smootherstep);
 *  the world owner lerps every LIGHTS/LOOK value (sky, fog, sun/moon colour and elevation) by k. */
export const skyAt = (id: number, f: number): { from: Light; to: Light; k: number } => {
  const s = SHOTS[id - 1];
  if (id === 2) return { from: "night", to: "dawn", k: glide((f - CUE.DAWN[0]) / (CUE.DAWN[1] - CUE.DAWN[0])) };
  return { from: s.sky, to: s.sky, k: 0 };
};
/** crossfades: EMPTY on purpose (two WebGL contexts at once crash this GPU); all 3 cuts are hard cuts */
export const XFADE: Record<number, number> = {};
/** no white flash in this short (out of range on purpose) */
export const FLASH_AT = -1000;
/** fade to black over the last 8 frames: 0 = none .. 1 = black (post overlays black at this opacity); 1769 is fully black */
export const fadeAt = (f: number) => clamp01((f - (CUE.FADE[0] - 1)) / (CUE.FADE[1] - CUE.FADE[0]));

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// =====================================================================================================================
// PATHS + MOTION helpers (pure)
// =====================================================================================================================
type P2 = [number, number];
type Path = { pts: P2[]; cum: number[]; len: number };
/** Catmull-Rom densified polyline through control points (rounded corners, smooth heading) */
const spline = (c: P2[], per = 10): P2[] => {
  const out: P2[] = [];
  for (let i = 0; i + 1 < c.length; i++) {
    const p0 = c[Math.max(0, i - 1)], p1 = c[i], p2 = c[i + 1], p3 = c[Math.min(c.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      const q = (a: number, b: number, cc: number, d: number) => 0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t2 + (-a + 3 * b - 3 * cc + d) * t3);
      out.push([q(p0[0], p1[0], p2[0], p3[0]), q(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(c[c.length - 1]);
  return out;
};
const mkPath = (pts: P2[]): Path => {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, len: cum[cum.length - 1] };
};
/** point at arc length s (extrapolates straight past both ends) */
const ptAt = (p: Path, s: number): P2 => {
  const n = p.pts.length;
  if (s <= 0) { const [a, b] = [p.pts[0], p.pts[1]], L = p.cum[1] || 1; return [a[0] + ((b[0] - a[0]) / L) * s, a[1] + ((b[1] - a[1]) / L) * s]; }
  if (s >= p.len) { const [a, b] = [p.pts[n - 2], p.pts[n - 1]], L = p.cum[n - 1] - p.cum[n - 2] || 1; return [b[0] + ((b[0] - a[0]) / L) * (s - p.len), b[1] + ((b[1] - a[1]) / L) * (s - p.len)]; }
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (p.cum[m] <= s) lo = m; else hi = m; }
  const u = (s - p.cum[lo]) / (p.cum[hi] - p.cum[lo] || 1);
  return [lerp(p.pts[lo][0], p.pts[hi][0], u), lerp(p.pts[lo][1], p.pts[hi][1], u)];
};
/** position + unit direction (central difference over 1 m, so the heading turns smoothly) */
const onPath = (p: Path, s: number) => {
  const a = ptAt(p, s - 0.5), b = ptAt(p, s + 0.5), q = ptAt(p, s), L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return { x: q[0], z: q[1], dx: (b[0] - a[0]) / L, dz: (b[1] - a[1]) / L };
};
/** arc length of the path point nearest to (x, z) (setup only) */
const sOf = (p: Path, x: number, z: number) => {
  let best = 0, bd = 1e9;
  for (let i = 0; i < p.pts.length; i++) { const d = Math.hypot(p.pts[i][0] - x, p.pts[i][1] - z); if (d < bd) { bd = d; best = p.cum[i]; } }
  return best;
};
type SpeedKey = [number, number]; // [frame, metres per frame], linear in between, held after the last key
/** distance travelled since the first key (negative before it, at the first key's speed) */
const travel = (f: number, k: SpeedKey[]) => {
  if (f <= k[0][0]) return k[0][1] * (f - k[0][0]);
  let s = 0;
  for (let i = 0; i + 1 < k.length; i++) {
    const [f0, v0] = k[i], [f1, v1] = k[i + 1], t = Math.min(f, f1) - f0, a = (v1 - v0) / (f1 - f0 || 1);
    s += v0 * t + 0.5 * a * t * t;
    if (f <= f1) return s;
  }
  const [fl, vl] = k[k.length - 1];
  return s + vl * (f - fl);
};
const speedOf = (f: number, k: SpeedKey[]) => {
  if (f <= k[0][0]) return k[0][1];
  for (let i = 0; i + 1 < k.length; i++) if (f <= k[i + 1][0]) return lerp(k[i][1], k[i + 1][1], (f - k[i][0]) / (k[i + 1][0] - k[i][0] || 1));
  return k[k.length - 1][1];
};
/** three.js rotation.y for a model whose forward is local +x: dir = (cos yaw, 0, -sin yaw) */
const yawOf = (dx: number, dz: number) => Math.atan2(-dz, dx);
const ramp = (f: number, r: readonly [number, number]) => smooth((f - r[0]) / (r[1] - r[0]));

// =====================================================================================================================
// THE BERLINE (coach) + its team of 6
// =====================================================================================================================
/** coach model contract (metres, coach-local: fwd along the heading, up, left = door side) */
export const COACH = {
  bodyL: 3.0, bodyW: 2.0, bodyBottom: 0.95, bodyTop: 2.75, roofRack: 3.1,
  wheelR: [0.55, 0.82] as [number, number], axleFwd: [1.45, -1.35] as [number, number], track: 2.2,
  boxFwd: 1.9, boxUp: 2.55, poleLen: 9.6,
  /** team: 3 pairs (wheelers, middle, leaders) at these fwd offsets from the body centre, +-lateral */
  teamFwd: [3.6, 6.2, 8.8] as [number, number, number], teamLat: 0.68, horseLen: 2.4, horseH: 1.65,
  stride: { walk: 1.7, trot: 2.6, gallop: 3.4 },
} as const;
/** handy coach-local points [fwd, up, left] (left = the door side; the door is on the LEFT in every take) */
export const COACH_LOCAL = {
  DOOR: [0, 1.6, 1.0] as V3, WINDOW: [0, 2.0, 1.02] as V3, KING_SEAT: [0.05, 2.0, 0.8] as V3 /* 0.3 m toward the glass: no jamb cuts him from the oblique lenses */ /* the king's head, seated by the door */,
  STEP: [0.2, 0, 1.45] as V3 /* where people stand to climb in / step out */, BOX: [1.9, 2.55, 0] as V3 /* coachman */,
  LANTERNS: [[1.75, 2.25, 1.08], [1.75, 2.25, -1.08]] as V3[],
};
export type Gait = "stand" | "walk" | "trot" | "gallop";
export type CoachPose = {
  pos: V3; yaw: number; dir: V3; left: V3; s: number; speed: number;
  /** wheel roll angles (rad) front, rear */ wheel: [number, number];
  /** door 0 shut .. 1 wide open (left side) */ door: number;
  lanterns: boolean; gait: Gait; visible: boolean;
};
export type HorsePose = { pos: V3; yaw: number; dir: V3; gait: Gait; phase: number; speed: number; pair: 0 | 1 | 2; side: -1 | 1 };

const C1_PATH = mkPath([[10, -93.5], [90, -93.5]]);
const C2_PATH = mkPath([[180, -80], [800, -80]]);
const C3_PATH = mkPath([[1150, -80], [1320, -80]]);
/** take 4: west along z=-100 to the stop, a right-hand (north) U-turn in the east square, back east between the escort */
const C4_PATH = mkPath(spline([
  [2104, -60], [2104, -90], [2101.5, -97.5], [2094, -100], [2060, -100], [2030, -100], [2024, -100], [2021, -100],
  ...[0.25, 0.5, 0.75, 1].map((k) => { const a = Math.PI / 2 + k * Math.PI; return [2021 + 7 * Math.cos(a), -107 + 7 * Math.sin(a)] as P2; }),
  [2028, -114], [2034, -113.4], [2039, -110.8], [2043, -106], [2047, -101.6], [2053, -100.2], [2060, -100], [2104, -100], [2160, -100],
], 8));
const S4_STOP = sOf(C4_PATH, 2024, -100);
type CoachTake = { path: Path; keys: SpeedKey[]; sRef: number; fRef: number };
const COACH_T: Record<number, CoachTake> = {
  1: { path: C1_PATH, keys: [[0, 0]], sRef: 20, fRef: 0 },
  2: { path: C2_PATH, keys: [[470, 0], [CUE.ROLL, 0], [645, 0.22]], sRef: 40, fRef: 470 },
  3: { path: C3_PATH, keys: [[700, 0.2], [770, 0.2], [804, 0], [CUE.COACH_OFF, 0], [1448, 0.1]], sRef: 50, fRef: 804 },
  4: { path: C4_PATH, keys: [[1430, 0.4], [1620, 0.4], [CUE.COACH_STOP, 0], [CUE.UTURN, 0], [1702, 0.45]], sRef: S4_STOP, fRef: CUE.COACH_STOP },
};
const coachS = (id: number, f: number) => { const T = COACH_T[id]; return T.sRef + travel(f, T.keys) - travel(T.fRef, T.keys); };
const doorAt = (id: number, f: number) => {
  if (id === 1) return 0.32 * ramp(f, CUE.DOOR1); // a third open: the leaf stays clear of the king seen from the palace-side lens
  if (id === 2) return f < CUE.DOOR2_SHUT[0] ? ramp(f, [540, 548]) : 1 - ramp(f, CUE.DOOR2_SHUT); // shut for the mirror gag, open 540-548 before anyone boards
  if (id === 4) return f < CUE.DOOR4_SHUT[0] ? ramp(f, CUE.DOOR4_OPEN) : 1 - ramp(f, CUE.DOOR4_SHUT);
  return 0;
};
const gaitOf = (v: number): Gait => (v < 0.004 ? "stand" : v < 0.09 ? "walk" : v < 0.3 ? "trot" : "gallop");
/** the berline at (take, frame) */
export const coachAt = (id: number, f: number): CoachPose => {
  const T = COACH_T[id] ?? COACH_T[1], s = coachS(id in COACH_T ? id : 1, f), p = onPath(T.path, s), v = speedOf(f, T.keys);
  return {
    pos: [p.x, D0, p.z], yaw: yawOf(p.dx, p.dz), dir: [p.dx, 0, p.dz], left: [p.dz, 0, -p.dx], s, speed: v,
    wheel: [s / COACH.wheelR[0], s / COACH.wheelR[1]], door: doorAt(id, f), lanterns: id !== 3, gait: gaitOf(v), visible: true,
  };
};
/** coach-local [fwd, up, left] -> world */
export const coachLocal = (c: CoachPose, l: V3): V3 => [c.pos[0] + c.dir[0] * l[0] + c.left[0] * l[2], c.pos[1] + l[1], c.pos[2] + c.dir[2] * l[0] + c.left[2] * l[2]];
/** the 6 harnessed horses: each follows the coach's track `teamFwd` metres ahead (so they lead into turns) */
export const teamAt = (id: number, f: number): HorsePose[] => {
  const T = COACH_T[id] ?? COACH_T[1], c = coachAt(id, f), out: HorsePose[] = [];
  const g = c.gait, stride = g === "walk" ? COACH.stride.walk : g === "trot" ? COACH.stride.trot : COACH.stride.gallop;
  COACH.teamFwd.forEach((d, pair) => {
    const p = onPath(T.path, c.s + d);
    for (const side of [1, -1] as const) {
      out.push({ pos: [p.x + p.dz * COACH.teamLat * side, D0, p.z - p.dx * COACH.teamLat * side], yaw: yawOf(p.dx, p.dz), dir: [p.dx, 0, p.dz],
        gait: g, phase: (((c.s + 0.37 * pair + (side > 0 ? 0 : 0.5) * stride) / stride) % 1 + 1) % 1, speed: c.speed, pair: pair as 0 | 1 | 2, side });
    }
  });
  return out;
};
/** take 3 horse change: out = tired team led from the pole to LOC.STABLE_DOORS[0] (0..1), in = fresh team led from
 *  STABLE_DOORS[1] to the pole (0..1). teamAt gives the hitched positions; between the two the pole is empty. */
export const teamSwapAt = (f: number) => ({ out: ramp(f, CUE.UNHITCH), in: ramp(f, CUE.NEW_TEAM) });

// =====================================================================================================================
// DROUET (take 3 on foot, take 4 on horseback)
// =====================================================================================================================
export type DrouetPose = {
  mode: "hidden" | "walk" | "stand" | "mount" | "ride";
  /** feet on the ground (walk/stand/mount) or the horse's ground point (ride) */ pos: V3; yaw: number; dir: V3; left: V3;
  speed: number; /** walk or gallop cycle 0..1 */ phase: number; /** 0 standing beside the horse .. 1 in the saddle */ mount: number;
  horse: HorsePose | null;
};
const D3_PATH = mkPath(spline([[1199.4, -88.3], [1199.4, -88], [1199.45, -86], [1199.5, -84.2], [1199.55, -82.6]], 8)); // starts 0.3 m inside the inn door
/** take-3 walk: 826 (inside, unseen) -> 935 at the coach, 10-frame ease at both ends, <= 0.058 m/f (a brisk walk) */
const D3_T0 = Math.ceil(CUE.AT_DOOR - 10 - D3_PATH.len / 0.06), D3_V = D3_PATH.len / (CUE.AT_DOOR - D3_T0 - 10);
const D3_KEYS: SpeedKey[] = [[D3_T0, 0], [D3_T0 + 10, D3_V], [CUE.AT_DOOR - 10, D3_V], [CUE.AT_DOOR, 0]];
export const D3_VISIBLE = D3_T0 + 6; // he shows in the dark doorway from here (the world opens the inn door 826-840)
/** take 4: mount point on the road (heading north), turn-off at 28 m, forest shortcut, out across the square to the bridge head */
const D4_PATH = mkPath(spline([[2030, -16], [2030, -36], [2030, -44], [2028.5, -54], [2026, -64], [2024.5, -75], [2021, -86], [2016.5, -91.5], [2013, -95]], 12));
const D4_VMAX = 0.8;
const D4_DEC = 1496 + (D4_PATH.len - 20) / D4_VMAX; // keeps 12 m to brake to a stop at the path end
const D4_KEYS: SpeedKey[] = [[CUE.GALLOP, 0], [1496, D4_VMAX], [D4_DEC, D4_VMAX], [D4_DEC + 30, 0]];
const SOUTH: V3 = [0, 0, 1];
export const drouetAt = (id: number, f: number): DrouetPose => {
  if (id === 3) {
    const s = Math.min(D3_PATH.len, Math.max(0, travel(f, D3_KEYS))), p = onPath(D3_PATH, s);
    const turn = smooth((f - CUE.AT_DOOR) / 10), dx = lerp(p.dx, SOUTH[0], turn), dz = lerp(p.dz, SOUTH[2], turn), n = Math.hypot(dx, dz) || 1;
    const walking = f > D3_T0 && f < CUE.AT_DOOR, speed = walking ? speedOf(f, D3_KEYS) : 0;
    return { mode: f < D3_VISIBLE ? "hidden" : walking ? "walk" : "stand", pos: [p.x, D0, p.z], yaw: yawOf(dx / n, dz / n), dir: [dx / n, 0, dz / n],
      left: [dz / n, 0, -dx / n], speed, phase: ((s / 1.4) % 1 + 1) % 1, mount: 0, horse: null };
  }
  if (id === 4) {
    const s = Math.min(D4_PATH.len, Math.max(0, travel(f, D4_KEYS))), p = onPath(D4_PATH, s), v = s >= D4_PATH.len ? 0 : speedOf(f, D4_KEYS);
    const g = gaitOf(v), phase = ((s / COACH.stride.gallop) % 1 + 1) % 1, yaw = yawOf(p.dx, p.dz), dir: V3 = [p.dx, 0, p.dz], left: V3 = [p.dz, 0, -p.dx];
    const horse: HorsePose = { pos: [p.x, D0, p.z], yaw, dir, gait: g === "walk" && v > 0.2 ? "trot" : g, phase, speed: v, pair: 0, side: 1 };
    const mount = ramp(f, CUE.MOUNT);
    if (f < CUE.MOUNT[1]) {
      const side: V3 = [p.x + left[0] * 0.9 * (1 - mount), D0, p.z + left[2] * 0.9 * (1 - mount)];
      return { mode: f < CUE.MOUNT[0] ? "stand" : "mount", pos: side, yaw, dir, left, speed: 0, phase: 0, mount, horse };
    }
    return { mode: "ride", pos: horse.pos, yaw, dir, left, speed: v, phase, mount: 1, horse };
  }
  return { mode: "hidden", pos: [...LOC.DROUET3] as V3, yaw: -Math.PI / 2, dir: SOUTH, left: [1, 0, 0], speed: 0, phase: 0, mount: 0, horse: null };
};
/** Drouet-local [fwd, up, left] -> world */
const drouetLocal = (d: DrouetPose, l: V3): V3 => [d.pos[0] + d.dir[0] * l[0] + d.left[0] * l[2], d.pos[1] + l[1], d.pos[2] + d.dir[2] * l[0] + d.left[2] * l[2]];
/** his eyes (on foot ~1.62 m; in the saddle ~2.55 m) */
export const drouetHead = (id: number, f: number): V3 => { const d = drouetAt(id, f); return drouetLocal(d, [0, d.mode === "ride" ? 2.55 : 1.62, 0]); };

// =====================================================================================================================
// THE BRIDGE CART (take 4) + THE ASSIGNAT
// =====================================================================================================================
/** the Varennes cart: parked at the west bridge head, pushed onto mid-bridge and turned across it, barrels piled on.
 *  yaw: rotation.y of a cart whose shafts point local +x (0 = shafts east). */
export const bridgeCartAt = (f: number) => {
  const u = glide((f - CUE.CART_PUSH[0]) / (CUE.CART_PUSH[1] - CUE.CART_PUSH[0]));
  // one smootherstep push along a gentle curve: 4.3 m in 32 f (mean 0.13, peak 0.25 m/f), no stop half-way
  const a = LOC.CART_START, m: V3 = [1999.0, D0, -100.35], b = LOC.BRIDGE4;
  const pos = lerp3(lerp3(a, m, u), lerp3(m, b, u), u);
  return { pos, yaw: (Math.PI / 2) * smooth((u - 0.45) / 0.55), u, /** 0..3 barrels on it */ barrels: 3 * ramp(f, CUE.BARRELS) };
};
/** prop size (m): pale paper, ornamental border, an oval portrait of the king in profile and a seal. NO text or numbers. */
export const ASSIGNAT_SIZE: [number, number] = [0.22, 0.15];
export type AssignatPose = {
  mode: "none" | "hand" | "fall" | "ground"; pos: V3;
  /** unit normal of the printed face */ normal: V3; /** rotation of the bill around its normal (rad) */ spin: number;
  /** 0 flat .. 1 strongly curled (flutter) */ bend: number;
  /** fall/ground only: roll for a camera-facing billboard (0 = upright on screen); `spin` + `normal` are the true orientation,
   *  which in "fall" converges to the ground card's exactly (pos, normal (0,1,0), spin ASSIGNAT_GROUND_SPIN) at 1756 */
  screenSpin?: number;
};
/** the bill's spin flat on the cobbles: its top edge away from the final lens (11 deg off vertical toward H_END_YAW) */
export const ASSIGNAT_GROUND_SPIN = Math.PI / 2 - (40 * Math.PI) / 180;
const CAM1_POS: V3 = [-5.2, Y(1.6), -84];
const FALL0: V3 = [2033.4, Y(12), -104.2];
/** centre line of the final fall (no flutter; the take-4 camera follows this, never the flutter) */
const fallLine = (f: number): V3 => {
  const u = glide((f - CUE.BILL_FALL[0]) / (CUE.BILL_FALL[1] - CUE.BILL_FALL[0])), L = LOC.ASSIGNAT_LAND; // eases out of the hand and to rest
  return lerp3(FALL0, L, u);
};
export const assignatAt = (id: number, f: number): AssignatPose => {
  if (id === 1) {
    if (f >= CUE.HAND_DOWN[1]) return { mode: "none", pos: LOC.HOOK_HAND, normal: [0, 0, 1], spin: 0, bend: 0 };
    const h = LOC.HOOK_HAND, dn = ramp(f, CUE.HAND_DOWN), sw = 0.012 * Math.sin(f * 0.11);
    const pos: V3 = [h[0] + sw, h[1] - 0.9 * dn + 0.006 * Math.sin(f * 0.17), h[2]];
    const n: V3 = [CAM1_POS[0] - pos[0], CAM1_POS[1] - pos[1], CAM1_POS[2] - pos[2]], L = Math.hypot(...n);
    return { mode: "hand", pos, normal: [n[0] / L, n[1] / L, n[2] / L], spin: 0.05 * Math.sin(f * 0.07), bend: 0.08 };
  }
  if (id === 3) {
    if (f < CUE.BILL_OUT[0]) return { mode: "none", pos: LOC.DROUET3, normal: [0, 0, -1], spin: 0, bend: 0 };
    const d = drouetAt(3, f), k = ramp(f, CUE.BILL_OUT);
    // from the waistcoat pocket to held up in front of his face, a little to the side so the window stays clear
    const pocket = drouetLocal(d, [0.12, 1.2, 0.12]), held = drouetLocal(d, [0.2, 1.36, 0.5]);
    const pos = lerp3(pocket, held, k);
    pos[1] += 0.004 * Math.sin(f * 0.13); // a living hand
    return { mode: "hand", pos, normal: [-d.dir[0], 0, -d.dir[2]], spin: 0.03 * Math.sin(f * 0.05), bend: 0.06 };
  }
  if (id === 4 && f >= CUE.BILL_FALL[0]) {
    const u = clamp01((f - CUE.BILL_FALL[0]) / (CUE.BILL_FALL[1] - CUE.BILL_FALL[0])), c = fallLine(f), a = (1 - u) ** 2; // flutter dies with zero speed
    // flat on the cobbles: spin pi/2 - H_END_YAW turns its top edge away from the final lens (which sits 11 deg off vertical
    // toward H_END_YAW), so it reads upright, long side horizontal, crown + seal screen-right, like the falling billboard at spin 0
    if (u >= 1) return { mode: "ground", pos: LOC.ASSIGNAT_LAND, normal: [0, 1, 0], spin: ASSIGNAT_GROUND_SPIN, bend: 0, screenSpin: 0 };
    const pos: V3 = [c[0] + 0.55 * a * Math.sin(u * Math.PI * 5), c[1], c[2] + 0.35 * a * Math.cos(u * Math.PI * 4)];
    const tilt = 1.1 * a * Math.sin(u * Math.PI * 5 + 0.6), tw = 0.8 * a * Math.cos(u * Math.PI * 3);
    const n: V3 = [Math.sin(tilt) * Math.cos(tw), Math.cos(tilt), Math.sin(tilt) * Math.sin(tw)];
    const wob = 2.2 * a * Math.sin(u * 7);
    return { mode: "fall", pos, normal: n, spin: ASSIGNAT_GROUND_SPIN * glide(u) + wob, bend: 0.4 * a, screenSpin: wob }; // lands in the ground pose
  }
  return { mode: "none", pos: LOC.ASSIGNAT_LAND, normal: [0, 1, 0], spin: 0, bend: 0 };
};

// =====================================================================================================================
// legacy Bastille state (world.ts/cast.ts still call these; calm and harmless until their owners rebuild)
// =====================================================================================================================
export type FortState = { draw: number; doors: number; cart: V3 | null; cloth: number };
export const fortState = (_id: number, _f: number): FortState => ({ draw: 1, doors: 0, cart: null, cloth: 0 });
export const SMOKE: { f: number; at: V3; s: number }[] = [];
export const hookFrontZ = (f: number) => -90 + (4 * f) / 98;

// =====================================================================================================================
// CAMERA
// Grammar: no cut inside a take. Every move is a symmetric smootherstep glide (24-60 f) from the current camera to the
// next key's camera, both evaluated at the same frame, so a glide onto a tracking key lands on a moving subject.
// Holds creep (zoom or dolly 0.12-0.3 %/f). Roll 4 deg on one emphasis beat (take 3 "demasquer").
// =====================================================================================================================
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
/** glide mix: position lerps; the VIEW DIRECTION lerps (not the look point), so a glide from a far look point onto a
 *  near subject turns at an even angular rate instead of whipping at the end */
const mix = (a: Cam, b: Cam, k: number): Cam => {
  const pos = lerp3(a.pos, b.pos, k), da: V3 = [a.look[0] - a.pos[0], a.look[1] - a.pos[1], a.look[2] - a.pos[2]], db: V3 = [b.look[0] - b.pos[0], b.look[1] - b.pos[1], b.look[2] - b.pos[2]];
  const la = Math.hypot(...da) || 1, lb = Math.hypot(...db) || 1, d: V3 = [lerp(da[0] / la, db[0] / lb, k), lerp(da[1] / la, db[1] / lb, k), lerp(da[2] / la, db[2] / lb, k)];
  const ld = Math.hypot(...d) || 1, L = lerp(la, lb, k);
  return { pos, look: [pos[0] + (d[0] / ld) * L, pos[1] + (d[1] / ld) * L, pos[2] + (d[2] / ld) * L], fov: lerp(a.fov, b.fov, k), roll: lerp(a.roll, b.roll, k) };
};
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const T = (f: number) => f / FPS;
/** creep factor since f0 (subject grows ~rate per frame) */
const pushK = (f: number, f0: number, rate: number) => { const x = Math.max(0, f - f0); return Math.exp(-rate * (x < 12 ? (x * x) / 24 : x - 6)); };
/** a look point placing `subj` at screen (sx, sy) in -1..1 (right / up positive; thirds = +-0.33) for a lens of `fov` */
const place = (pos: V3, subj: V3, sx: number, sy: number, fov: number, dist = 10): V3 => {
  const d: V3 = [subj[0] - pos[0], subj[1] - pos[1], subj[2] - pos[2]], az = Math.atan2(d[0], d[2]), el = Math.atan2(d[1], Math.hypot(d[0], d[2]));
  const ty = Math.tan((fov * Math.PI) / 360), tx = (ty * 9) / 16, az0 = az + Math.atan(sx * tx), el0 = el - Math.atan(sy * ty);
  return [pos[0] + dist * Math.cos(el0) * Math.sin(az0), pos[1] + dist * Math.sin(el0), pos[2] + dist * Math.cos(el0) * Math.cos(az0)];
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot => ({ pos: lerp3(look, pos, k), look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
/** a look point `dist` m from `from` along the mean direction to a and b (frames two subjects at once) */
const between = (from: V3, a: V3, b: V3, wa = 0.5, dist = 10): V3 => {
  const u = (p: V3) => { const d: V3 = [p[0] - from[0], p[1] - from[1], p[2] - from[2]], L = Math.hypot(...d) || 1; return [d[0] / L, d[1] / L, d[2] / L] as V3; };
  const ua = u(a), ub = u(b), m: V3 = [lerp(ub[0], ua[0], wa), lerp(ub[1], ua[1], wa), lerp(ub[2], ua[2], wa)], L = Math.hypot(...m) || 1;
  return [from[0] + (m[0] / L) * dist, from[1] + (m[1] / L) * dist, from[2] + (m[2] / L) * dist];
};

// ---- TAKE 1 PARIS (0-473) ----
const KH1 = LOC.KING_HEAD1;
const S1a = (f: number) => zoom(CAM1_POS, between(CAM1_POS, LOC.HOOK_HAND, KH1), 26, pushK(f, 0, 0.0012)); // bill ECU, king's window behind
/** INTRO (the render starts at 172; retention is decided here):
 *  A 172-222  the hook: long lens at eye level from inside the torch crowd, the king smug in his lit window on the upper-left
 *             third, crowd heads + torch flames a soft foreground band across the bottom; settled, slow confident dolly-in.
 *  B 222-276  "la Revolution gronde a Paris": crane up and back over the crowd (straight back from the facade, so the windows
 *             only contract radially, no strobe), opening to the whole torch-lit crowd with the lit window upper-left.
 *  C 268-330  push down and forward to the side gate (mostly forward motion, <= 1 deg/f of pan), the family out at 297.
 *  D 338-410  swing to the palace side of the coach for the boarding. */
const S1A0: V3 = [1.9, Y(0.95), -75.6], S1A1: V3 = [0.4, Y(2.7), -77.2]; // from among the heads up to just above them
const S1b = (f: number) => { const pos = lerp3(S1A0, S1A1, glide((f - 120) / 150)); return { pos, look: place(pos, KH1, -0.25, 0.3, 20, 25.6), fov: 20 - 1.5 * glide((f - 140) / 90) }; };
/** B: the whole torch-lit crowd and the palace: the lit window upper-left, the side gate already in frame on the right */
const S1C_POS: V3 = [4, Y(12), -48];
const S1c = (f: number) => dolly(S1C_POS, place(S1C_POS, LOC.KING_WIN, -0.3, 0.33, 52, 30), pushK(f, 266, 0.0012), { fov: 52 });
/** C: in on the side gate (a short pan right from B), the gate whole, the family's feet low so they fill the frame */
const S1D_POS: V3 = [19.5, Y(2.1), -92.5];
const S1d = (f: number) => dolly(S1D_POS, place(S1D_POS, [24, Y(0), -100.4], 0, -0.62, 40, 9.1), pushK(f, 320, 0.0018), { fov: 40 });
/** D: palace-side lens west of the gate leaf; the aim follows the family hurrying from the gate to the coach step, so the
 *  pan rides on a subject instead of drifting past the facade */
const FAM_PATH = mkPath(LOC.FAMILY_PATH);
const S1E_POS: V3 = [21.0, Y(3.4), -98.4];
const S1e = (f: number) => { const q = ptAt(FAM_PATH, glide((f - 340) / 64) * FAM_PATH.len); return dolly(S1E_POS, place(S1E_POS, [q[0] + 0.3, Y(1.15), q[1]], 0.3, 0, 44, 9), pushK(f, 400, 0.002), { fov: 44 }); };
// ---- TAKE 2 ROAD (473-724), coach-relative ----
const C2 = (f: number, p: V3, l: V3, rate: number, f0: number, fov: number): Shot => { const c = coachAt(2, f); return dolly(coachLocal(c, p), coachLocal(c, l), pushK(f, f0, rate), { fov }); };
const S2a = (f: number) => C2(f, [-1.6, 1.55, 5.6], [0.35, 1.35, 1.3], 0.0022, 473, 48); // MS by the shut door: the valet king + his reflection
const S2b = (f: number) => C2(f, [-7.5, 1.6, 10.5], [3.0, 2.0, 0], 0.0018, 608, 50); // wide rear 3/4: the enormous "plain" coach + 6 horses
const S2c = (f: number) => C2(f, [-5.5, 1.45, 2.9], [14, 2.35, 0.9], 0.001, 642, 42); // tracking behind-left, looking down the road: dawn in frame
const S2d = (f: number) => C2(f, [-1.3, 2.2, 3.3], COACH_LOCAL.KING_SEAT, 0.0025, 694, 34); // the king in the window, eyes shut
// ---- TAKE 3 RELAY (724-1456) ----
const king3 = (f: number) => coachLocal(coachAt(3, f), COACH_LOCAL.KING_SEAT);
const bill3 = (f: number) => assignatAt(3, Math.max(f, CUE.BILL_OUT[1])).pos;
const S3C_POS: V3 = [1202.2, Y(1.75), -84.6]; // 1.5 m from the over-shoulder lens: the push-in has no parallax slide
/** the insert lens: the bill 1.0 m out (lower frame), the window + king whole above it, Drouet 28 deg to the right */
const S3D_POS: V3 = [1200.1, Y(1.45), -83.4];
const S3D_LOOK = (f: number): V3 => { const b = bill3(f), k = king3(Math.min(f, CUE.COACH_OFF)); return place(S3D_POS, [lerp(b[0], k[0], 0.5), Y(1.73), lerp(b[2], k[2], 0.5)], -0.05, 0, 46, 2.5); }; // window whole, Drouet's card clear of the right edge
const S3a = (f: number) => zoom([1222, Y(3.5), -88], [1205.66, Y(2.4), -81.4], 32, pushK(f, 724, 0.0015)); // yard from the east at 3.5 m: coach + team >= 20 % of the height
const S3B_POS: V3 = [1204.6, Y(1.5), -84.8]; // low + east: his hat stands clear of the rear wheel rim
const S3b = (f: number) => { const h = drouetHead(3, f); return dolly(S3B_POS, place(S3B_POS, [lerp(h[0], 1200, 0.56), Y(1.15), lerp(h[2], -81.03, 0.56)], -0.08, 0, 46), pushK(f, 930, 0.0008), { fov: 46 }); }; // over Drouet's shoulder: him + window whole
const S3c = (f: number) => dolly(S3C_POS, drouetHead(3, f), pushK(f, 1036, 0.0035), { fov: 22 }); // push in on his face (eyebrow)
const S3c2 = (f: number) => zoom(S3C_POS, king3(f), 22, pushK(f, 1068, 0.002)); // pan to the window: the profile
const S3d = (f: number) => zoom(S3D_POS, S3D_LOOK(f), 46, pushK(f, 1160, 0.0012)); // behind the hand: bill FG, king BG
/** pan right onto Drouet: the lens backs up to 1.8 m from his head (same line as S3D_POS), aimed 0.35 m ahead of his nose */
const S3p = (f: number) => {
  const h = drouetHead(3, f), d = drouetAt(3, f), v: V3 = [S3D_POS[0] - h[0], 0, S3D_POS[2] - h[2]], L = Math.hypot(v[0], v[2]);
  const pos: V3 = [h[0] + (v[0] / L) * 1.8, Y(1.6), h[2] + (v[2] / L) * 1.8];
  // his face whole on the centre line, 0.15 m of lead room ahead of his nose (the bill reads at the lower left)
  return zoom(pos, place(pos, [h[0] + d.dir[0] * 0.15, h[1] - 0.05, h[2] + d.dir[2] * 0.15], 0.4, 0.03, 54, 1.8), 54, pushK(f, 1295, 0.0015)); // face right of centre, the bill whole at the left
};
const S3e = (f: number) => zoom(S3D_POS, S3D_LOOK(f), 46, 0.92 * pushK(f, 1354, 0.0012), { roll: 0.07 }); // "demasquer" punch + 4 deg roll
// ---- TAKE 4 RIDE + VARENNES (1456-1770), Drouet-relative then world ----
const D4 = (f: number, p: V3, l: V3, fov: number, k = 1): Shot => { const d = drouetAt(4, f); return dolly(drouetLocal(d, p), drouetLocal(d, l), k, { fov }); };
const S4a = (f: number) => { const s = D4(f, [-2.0, 1.9, 8.3], [0, 1.5, 0], 40); return zoom(s.pos, s.look, 40, pushK(f, 1456, 0.002)); }; // profile on the saddle, 8.5 m
const S4b = (f: number) => D4(f, [-7.4, 2.2, 4.2], [1.0, 1.5, -0.5], 44); // forest: behind-left at 8.5 m among the trunks, lanterns far ahead-right
/** the cart lens, lower and nearer than before: the cart + pushers low in frame, the bridge and the sleeping town above */
const S4C_POS: V3 = [2012.5, Y(2.8), -90.5];
const S4cFixed = (f: number): Shot => { const k = add3(lerp3(bridgeCartAt(f).pos, LOC.BRIDGE4, 0.5), [0, 0.9, 0]); return dolly(S4C_POS, place(S4C_POS, k, 0, -0.3, 36, 12), pushK(f, 1574, 0.0012), { fov: 36 }); };
/** rides on with Drouet out of the wood (S4b): the aim starts turning onto the cart at 1524, the lens leaves him only from
 *  1530 (so he stays in frame through 1535), both land on the cart lens at 1576 */
const S4c = (f: number): Cam => {
  const a = full(S4b(f)), b = full(S4cFixed(f)), wp = glide((f - 1530) / 48), wd = glide((f - 1522) / 56);
  const pos = lerp3(a.pos, b.pos, wp), ad = unit([a.look[0] - a.pos[0], a.look[1] - a.pos[1], a.look[2] - a.pos[2]]), bd = unit([b.look[0] - b.pos[0], b.look[1] - b.pos[1], b.look[2] - b.pos[2]]);
  const d = unit(lerp3(ad, bd, wd));
  return { pos, look: [pos[0] + d[0] * 10, pos[1] + d[1] * 10, pos[2] + d[2] * 10], fov: lerp(a.fov, b.fov, wd), roll: 0 };
};
/** crane up off the cart (1598-1624) before swinging to the arrest, so Drouet at the bridge head stays low-left in frame
 *  instead of whipping across it */
const S4up = (f: number) => { const p: V3 = [2020, Y(9.5), -89.5]; return dolly(p, place(p, [2008, Y(1), -97.5], 0, 0.12, 44, 15), pushK(f, 1612, 0.0012), { fov: 44 }); };
/** the arrest, framed so Drouet (on his horse at the bridge head) is on the left third and the coach door on the right */
const S4D_POS: V3 = [2042, Y(2.2), -94];
const S4d = (f: number) => { const dr = LOC.DROUET_STOP, dd: V3 = coachLocal(coachAt(4, CUE.COACH_STOP), COACH_LOCAL.DOOR); return dolly(S4D_POS, place(S4D_POS, [lerp(dr[0], dd[0], 0.5), Y(1.5), lerp(dr[2], dd[2], 0.5)], 0, -0.3, 44, 22), pushK(f, 1640, 0.0018), { fov: 44 }); };
const S4E_POS: V3 = [2086, Y(24), -108]; // north of the road line: the forest canopy (z >= -86) stays out of the swoop
const S4E_LOOK: V3 = [2028, Y(0), -101];
const S4e = (f: number) => dolly(S4E_POS, place(S4E_POS, [2022, Y(0), -106], 0, -0.38, 46, 60), pushK(f, 1684, 0.0012), { fov: 46 }); // high: the U-turn low in frame, the town above
/** the swoop onto the falling bill (equal to S4e until 1700), all smootherstep:
 *  - 1694-1716 the aim tilts onto the bill; 1694-1730 the lens comes down (log distance) to ride beside the fall, 35 deg up,
 *    on the far side of the bill from the turning coach (bill in the lower half, the square + coach soft behind it);
 *  - 1726-1760 it tips overhead (<= 3 deg/f), ending 0.88 m above the bill, 11 deg off vertical toward H_END: with the ground
 *    spin pi/2 - H_END_YAW the bill reads upright, long side horizontal, crown + seal screen-right, ~85 % of the frame width. */
export const H_END_YAW = (40 * Math.PI) / 180; // horizontal direction bill -> final lens: (cos, 0, sin) of this, i.e. east-south-east
const H_END: V3 = [Math.cos(H_END_YAW), 0, Math.sin(H_END_YAW)];
const unit = (v: V3): V3 => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
/** 35 deg up; horizontally away from the coach (so it stays behind the bill), easing to H_END from 1722 */
const D45at = (f: number, c: V3): V3 => {
  const co = coachAt(4, f).pos, h = unit([c[0] - co[0], 0, c[2] - co[2]]), hh2 = unit(lerp3(h, H_END, glide((f - 1716) / 30)));
  return unit([hh2[0] * 0.82, 0.57, hh2[2] * 0.82]);
};
const TOP: V3 = unit([H_END[0] * 0.2, 0.98, H_END[2] * 0.2]);
const S4f = (f: number): Shot => {
  const c = fallLine(f), far = S4e(f), u = glide((f - 1694) / 36), w = glide((f - 1724) / 36);
  const fv: V3 = [far.pos[0] - c[0], far.pos[1] - c[1], far.pos[2] - c[2]], fl = Math.hypot(...fv);
  const dA = unit(lerp3(unit(fv), D45at(f, c), u)), dir = unit(lerp3(dA, TOP, w));
  const near = lerp(lerp(3.0, 2.4, glide((f - 1712) / 20)), 0.88, w);
  const dist = lerp(Math.sqrt(fl), Math.sqrt(near), u) ** 2, k = pushK(f, 1756, 0.002); // sqrt-distance: gentle start, no lurch
  const p: V3 = [c[0] + dir[0] * dist * k, c[1] + dir[1] * dist * k, c[2] + dir[2] * dist * k];
  // aim between the bill and the turning coach (bill in the lower half, coach soft above it), back onto the bill for the tip
  const base = lerp3(far.look, c, glide((f - 1694) / 22)), co = coachAt(4, f).pos, g = 0.22 * glide((f - 1706) / 16) * (1 - w);
  const bd: V3 = [base[0] - p[0], base[1] - p[1], base[2] - p[2]], bl = Math.hypot(...bd), ld = unit(lerp3(unit(bd), unit([co[0] - p[0], co[1] + 1.4 - p[1], co[2] - p[2]]), g));
  return { pos: p, look: [p[0] + ld[0] * bl, p[1] + ld[1] * bl, p[2] + ld[2] * bl], fov: lerp(lerp(46, 32, u), 30, w) };
};

/** take 3, 816-896: on the inn door (opened 826-840) as Drouet steps out of the dark (842+), following him to the coach;
 *  he sits right of centre with walking room on the left (he walks screen-left) */
const S3I_POS: V3 = [1210, Y(2.2), -83.0]; // east in the yard: the inn door ~65 deg off its normal, a short swing from the yard wide
const S3i = (f: number) => { const d = drouetAt(3, f); return zoom(S3I_POS, place(S3I_POS, [d.pos[0], Y(1.0), d.pos[2]], 0.2, 0, 30), 30, pushK(f, 840, 0.0015)); };

const CAMS: Record<number, Key[]> = {
  1: [
    { f: 0, s: S1a }, // assignat ECU among torches; rack to the king 113-126
    { f: 128, dur: 40, s: S1b }, // A: boom up out of the torch crowd onto the king in his lit window (moving at 172)
    { f: 222, dur: 54, s: S1c }, // B: "la Revolution gronde a Paris": crane up and back over the torch crowd, torches up 234
    { f: 268, dur: 62, s: S1d }, // C: "Louis XVI decide de fuir": push in on the side gate, family out 297
    { f: 332, dur: 80, s: S1e }, // swing to the palace side of the coach: the boarding at the step; point east 407; door half open 461
  ],
  2: [
    { f: 473, s: S2a }, // cut 473: by the shut door, the disguise in the lacquer
    { f: 578, dur: 40, s: S2b }, // he climbs in; pull out to the huge coach ("berline banale" 592-601)
    { f: 614, dur: 38, s: S2c }, // "roule de nuit vers l'Est": tracking, looking down the road into the dawn
    { f: 658, dur: 46, s: S2d }, // "le plan semble marcher a la perfection": the smug king
  ],
  3: [
    { f: 724, s: S3a }, // cut 724: wide yard, coach in, stop 804, horses changed
    { f: 816, dur: 32, s: S3i }, // the yard wide holds the horse change (833); "le maitre de poste" 848: onto Drouet, just out of the door
    { f: 896, dur: 44, s: S3b }, // behind his shoulder as he reaches the coach door (935): him + the window whole
    { f: 1020, dur: 34, s: S3c }, // "un detail le frappe": push in on his face
    { f: 1054, dur: 24, s: S3c2 }, // "ce profil": pan onto the king's profile
    { f: 1118, dur: 52, s: S3d }, // "il sort un assignat": drop behind his hand, bill FG / king BG (rack focus via DOF)
    { f: 1282, dur: 25, s: S3p }, // "l'homme dans la caleche": pan right onto Drouet's lost profile
    { f: 1309, dur: 25, s: S3d }, // "le roi": back onto the bill + the king
    { f: 1334, dur: 30, s: S3e }, // "demasquer": small punch-in + 4 deg roll; the coach pulls away from 1418
  ],
  4: [
    { f: 1456, s: S4a }, // cut 1456: Drouet mounts and gallops (tracking the saddle in profile)
    { f: 1482, dur: 40, s: S4b }, // "raccourci a travers les bois": into the forest behind him
    { f: 1512, dur: 12, s: S4c }, // "bloquer le pont de Varennes": S4c rides on with Drouet, then turns onto the cart (1524-1576)
    { f: 1588, dur: 34, s: S4up }, // crane up over the bridge head, Drouet low-left
    { f: 1622, dur: 34, s: S4d }, // coach arrives, stops 1640; king out 1645-1660 ("arrete" 1651); Drouet watches, left third
    { f: 1654, dur: 40, s: S4e }, // "ramene a Paris sous escorte": rise high
    { f: 1694, cut: true, s: S4f }, // seamless (S4f starts on the landed S4e): swoop onto the falling assignat; fade 1762-1770 ("son destin")
  ],
};

// impact kicks: image offset flips sign every frame, decays to 0 in 7 f. [seconds, gain]: the coach brakes at the cart.
const KICKS: [number, number][] = [[CUE.COACH_STOP / 30, 0.35]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id] ?? CAMS[1], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
/** frame at which the current key's move has finished (for picking billboard views per key, not per frame) */
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id] ?? []) if (f >= k.f) e = k.f + (k.cut && !k.dur ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};

// =====================================================================================================================
// LENS: depth of field + rack focus, foreground framing
// =====================================================================================================================
/** Lens blur table. cInf = blur-disc radius (px at 1080x1920) at infinity, 0 = all sharp. An entry with `dur` ramps BOTH
 *  cInf and the focus point from the previous entry over dur frames (smootherstep) = a rack focus; without dur it switches
 *  (only on cuts). focus = world point function (else the camera look point). */
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
const at = (p: V3) => () => p;
export const DOF: Dof[] = [ // every ramp ends before the next entry starts (no overlaps)
  // take 1
  { f: 0, cInf: 15, focus: (f) => assignatAt(1, Math.min(f, CUE.HAND_DOWN[0])).pos }, // the bill sharp, palace soft
  { f: CUE.RACK_KING[0], dur: CUE.RACK_KING[1] - CUE.RACK_KING[0], cInf: 15, focus: at(KH1) }, // rack to the king ("tete")
  { f: 128, dur: 40, cInf: 11, focus: at(KH1) }, // A: the king sharp, the crowd heads + flames soft in front
  { f: 222, dur: 46, cInf: 2, focus: at([-2, Y(1.7), -78]) }, // B: the crowd, a touch of depth
  { f: 268, dur: 62, cInf: 6, focus: at([24, Y(1.5), -100.0]) }, // C: the family at the gate
  { f: 332, dur: 70, cInf: 8, focus: at(coachLocal(coachAt(1, 0), [0.2, 1.3, 1.45])) }, // the step / door
  // take 2 (the king's real seat = berlineWindowAt(c).seat = coachLocal(c, COACH_LOCAL.KING_SEAT))
  { f: 473, cInf: 10, focus: (f) => coachLocal(coachAt(2, f), [0.3, 1.5, 1.5]) }, // the valet king at the door
  { f: 578, dur: 40, cInf: 0, focus: (f) => coachLocal(coachAt(2, f), COACH_LOCAL.KING_SEAT) },
  { f: 618, dur: 32, cInf: 4, focus: (f) => coachLocal(coachAt(2, f), COACH_LOCAL.KING_SEAT) },
  { f: 662, dur: 40, cInf: 11, focus: (f) => coachLocal(coachAt(2, f), COACH_LOCAL.KING_SEAT) },
  // take 3
  { f: 724, cInf: 0, focus: (f) => coachLocal(coachAt(3, f), [0, 1.6, 0]) },
  { f: 816, dur: 32, cInf: 8, focus: (f) => drouetHead(3, f) }, // Drouet out of the inn door
  { f: 896, dur: 44, cInf: 9, focus: (f) => drouetHead(3, f) },
  { f: 1020, dur: 30, cInf: 13, focus: (f) => drouetHead(3, f) },
  { f: 1056, dur: 13, cInf: 13, focus: king3 }, // rack to the king's profile, lands 1069 ("profil" 1070)
  { f: 1118, dur: 40, cInf: 14, focus: bill3 }, // the bill sharp, the king soft behind
  { f: CUE.RACK3[0], dur: 9, cInf: 14, focus: king3 }, // "leve les yeux" 1263
  { f: CUE.RACK3[1], dur: 14, cInf: 14, focus: (f) => drouetHead(3, f) }, // the pan onto Drouet ("l'homme dans la caleche")
  { f: CUE.RACK3[2], dur: 8, cInf: 14, focus: king3 }, // back to the king ("le roi" 1321)
  { f: CUE.RACK3[3], dur: 12, cInf: 14, focus: bill3 }, // coach pulls away: the bill stays
  // take 4
  { f: 1456, cInf: 7, focus: (f) => drouetHead(4, f) },
  { f: 1482, dur: 30, cInf: 8, focus: (f) => drouetHead(4, f) },
  { f: 1524, dur: 52, cInf: 5, focus: (f) => add3(bridgeCartAt(f).pos, [0, 0.9, 0]) }, // the cart on the bridge
  { f: 1622, dur: 30, cInf: 6, focus: (f) => coachLocal(coachAt(4, f), COACH_LOCAL.DOOR) },
  { f: 1654, dur: 40, cInf: 0, focus: (f) => coachAt(4, f).pos },
  { f: 1704, dur: 40, cInf: 12, focus: fallLine },
];
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? glide((f - d.f) / d.dur) : 1;
  const focus = d.focus && p.focus && k < 1 ? (g: number) => lerp3(p.focus!(g), d.focus!(g), k) : d.focus;
  return { cInf: lerp(p.cInf, d.cInf, k), focus };
};
/** what the lens focuses on: the DOF table's focus point, else the camera look point */
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};

/** near framing objects: visible while a <= f < b (whole takes, so nothing pops in inside a long take).
 *  kit names = build.ts fgKit's (procedural, world owner). pos = base point, s = height (m), yaw (rad). */
export type FgKit = "musket_crate" | "lamppost" | "cannon" | "barrels3" | "cart";
export type Fg = { a: number; b: number; kit: FgKit; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [
  { a: 724, b: 1456, kit: "barrels3", pos: [1215.6, D0, -87.2], s: 1.1, yaw: 0.6 }, // take 3, by the inn corner, bottom-right of the yard wide
];
