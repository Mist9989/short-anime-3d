// VARENNES 1791: our own flat 2D cartoon cast (the royal family, Drouet, grooms, crowds, guards), the HORSES (a small 3D
// puppet projected onto the card: stand / walk / trot / gallop, any yaw, harness or saddle, an optional rider), the
// king's PROFILE (one function for the window, the coach and the assignat) and the props (assignat, torch flame, lantern).
// Construction v2 (characters.md, our own cast): superellipse heads (pointed crown 1.75 / full jaw 2.3, chin taper,
// seeded side bulge + tilt), bean torsos, single-stroke limbs with ink-dot hands, a thick-thin plum outline weighted
// away from the light, soft painted crescents, deadpan lidded eyes, no blush, no catchlights.
// Design space 600 x 1000 units (soles at y = 975); the canvas transform scales it. Cards extend CARD_TOP units above
// y = 0 (raised muskets, overhead barrels, the surrender cloth). 1789 wardrobe, poses and hand props: see "bodies".
import { BARREL } from "./story";
export const INK = "#241726";
export const SKIN = "#ffe2c2";
const WHITE = "#ffffff";
const MOUTH = "#5a1e28";
const TONGUE = "#e86e78";
type C3 = [number, number, number];
const SH_SKIN: C3 = [0.96, 0.86, 0.84]; // measured shadow/lit ratio on skin heads
const SH_CLOTH: C3 = [0.64, 0.66, 0.74]; // torsos: lit side -> far side ~0.65
const SH_FELT: C3 = [0.62, 0.62, 0.7];

export type Build = "adult" | "stout" | "kid" | "thin";
export type Outfit = {
  jacket: string; pants: string; boots: string; hat?: string | null; belt?: string | null; buttons?: string; rifle?: boolean;
  sash?: string; sword?: boolean; moustache?: string; skin?: string; head?: number; cap?: string; hair?: string; dress?: string;
  build?: Build;
  // ---- 1789 wardrobe ----
  /** blue/red rosette on the hat */ cockade?: boolean;
  /** powdered wig colour (worn alone, or under a tricorne) */ wig?: string;
  /** trouser stripe colour (sans-culotte stripes) / skirt stripe colour */ stripes?: string;
  /** direct leg colour (white stockings, breeches); default = pants darkened */ legs?: string;
  /** long coat tails below the hips */ coat?: boolean;
  waistcoat?: string; collar?: string; cuffs?: string; jabot?: boolean; apron?: string; shawl?: string;
  /** open shirt V at the throat */ shirt?: boolean;
  /** forger: ink smudges on the shirt and cheek, ink-black hands */ smudge?: boolean; stubble?: boolean; patch?: string;
  /** hand dot colour (default ink) */ hands?: string;
  /** wig side curls per side (1-2) and the black-ribbon queue */ curls?: number; queue?: boolean;
  // ---- Varennes ----
  /** Louis XVI: the big profile (kingHead) in side view; nose + double chin in front view */ king?: boolean;
  /** hooded cloak colour (the queen) */ cloak?: string;
  /** tall riding boots up to the knee (Drouet, guards on horseback) */ tallBoots?: boolean;
  /** valet disguise: 0..1 of the royal wig curl poking out under the cheap round hat */ curlPeek?: number;
  /** kid scale-down drawn by the cast (the dauphin is smaller than his sister) */ small?: boolean;
  /** sleeve width multiplier (the hook man's arm reaching into the ECU), inked when > 1 */ armW?: number;
  /** with armW: end the sleeve in a drawn hand (Drouet holding the bill) */ armHand?: boolean;
  /** the drawn hand without its thumb (the cast lays the thumb over the held bill's front edge on its own card) */ noThumb?: boolean;
  /** royal dress details: gold edging, the blue cordon of the Saint-Esprit, the order's star */ trim?: string; cordon?: string; star?: boolean;
};

type P2 = [number, number];

const rad = (d: number) => (d * Math.PI) / 180;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const mul = (c: string, m: C3) => {
  const n = parseInt(c.slice(1), 16);
  const ch = (v: number, k: number) => Math.min(255, Math.round(v * k)).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 255, m[0])}${ch((n >> 8) & 255, m[1])}${ch(n & 255, m[2])}`;
};
export const shade = (c: string, k: number) => mul(c, [k, k, k]);
export const mix = (a: string, b: string, t: number) => {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t).toString(16).padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
};
/** deterministic per-character random in [0, 1) */
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const rotPts = (pts: P2[], a: number, cx: number, cy: number): P2[] =>
  pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);
const rotAbout = (q: P2, a: number, c: P2): P2 => rotPts([q], a, c[0], c[1])[0];
const lerp2 = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** smooth curve from a through (near) k to b, as a polyline */
const curve = (a: P2, k: P2, b: P2, n = 10): P2[] => {
  const c: P2 = [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2], out: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = 1 - t;
    out.push([s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]);
  }
  return out;
};

export const SKINS = [SKIN, "#f5c9a0", "#ecd0b6", "#c99067"];

export class Pen {
  g: CanvasRenderingContext2D;
  ol = 12;
  /** [angle, cx, cy] rotation about (cx, cy), optional post-translation [.., dx, dy] */
  rot: number[] | null = null;
  constructor(g: CanvasRenderingContext2D) { this.g = g; }
  P(x: number, y: number): P2 {
    if (!this.rot) return [x, y];
    const r = this.rot, a = r[0], cx = r[1], cy = r[2], dx = r.length > 3 ? r[3] : 0, dy = r.length > 4 ? r[4] : 0, c = Math.cos(a), s = Math.sin(a);
    return [cx + (x - cx) * c - (y - cy) * s + dx, cy + (x - cx) * s + (y - cy) * c + dy];
  }
  path(pts: P2[], close: boolean) {
    const g = this.g;
    g.beginPath();
    pts.forEach((p, i) => { const [x, y] = this.P(p[0], p[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    if (close) g.closePath();
  }
  /** filled shape with an ink outline; fill=null draws the outline only */
  poly(pts: P2[], fill: string | null, ol?: number) {
    const g = this.g, w = ol ?? this.ol;
    this.path(pts, true);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (w) { g.lineWidth = w; g.strokeStyle = INK; g.lineJoin = "round"; g.stroke(); }
  }
  ell(cx: number, cy: number, rx: number, ry: number, fill: string | null, ol?: number, a0 = 0, a1 = 360, rot = 0) {
    this.poly(ellPts(cx, cy, rx, ry, a0, a1, rot), fill, ol);
  }
  /** thick round-capped limb with an ink rim (effects, rope) */
  line(pts: P2[], fill: string, w: number, ink = true) {
    const g = this.g;
    g.lineCap = "round"; g.lineJoin = "round";
    if (ink) { this.path(pts, false); g.strokeStyle = INK; g.lineWidth = w + 2 * this.ol * 0.9; g.stroke(); }
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  }
  stroke(pts: P2[], w: number, fill = INK) {
    const g = this.g;
    g.lineCap = "round"; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  }
  arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, w: number, fill = INK) {
    const pts: P2[] = [];
    for (let i = 0; i <= 24; i++) pts.push([cx + rx * Math.cos(rad(a0 + ((a1 - a0) * i) / 24)), cy + ry * Math.sin(rad(a0 + ((a1 - a0) * i) / 24))]);
    this.stroke(pts, w, fill);
  }
  dot(cx: number, cy: number, r: number, fill = INK) {
    const [x, y] = this.P(cx, cy);
    this.g.beginPath(); this.g.arc(x, y, r, 0, Math.PI * 2); this.g.fillStyle = fill; this.g.fill();
  }
  /** draw with a closed shape as clip */
  clip(pts: P2[], fn: () => void) { const g = this.g; g.save(); this.path(pts, true); g.clip(); fn(); g.restore(); }
  /** flat fill + soft crescent on the side away from the light (light = canvas angle the light comes FROM).
   *  Radial ramp centred `shift` R toward the light: flat out to ~0.6 R on the far side, full shadow by ~0.8 R. */
  shadedFill(pts: P2[], base: string, shadow: string, light: number, R: number, shift = 0.45, r0 = 1.05, r1 = 1.25) {
    const g = this.g, n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; }
    const [gx, gy] = this.P(cx + Math.cos(light) * shift * R, cy + Math.sin(light) * shift * R);
    const gr = g.createRadialGradient(gx, gy, 0, gx, gy, r1 * R);
    gr.addColorStop(0, base); gr.addColorStop(r0 / r1, base); gr.addColorStop(1, shadow);
    this.path(pts, true); g.fillStyle = gr; g.fill();
  }
  /** broad gradient across a shape along the light: lit edge = base, far edge = shadow (torsos, coats) */
  gradFill(pts: P2[], base: string, shadow: string, light: number, flat = 0.22) {
    const g = this.g, dx = Math.cos(light), dy = Math.sin(light), n = pts.length;
    let cx = 0, cy = 0, lo = Infinity, hi = -Infinity;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; const d = x * dx + y * dy; lo = Math.min(lo, d); hi = Math.max(hi, d); }
    const dc = cx * dx + cy * dy;
    const [ax, ay] = this.P(cx + dx * (hi - dc), cy + dy * (hi - dc)), [bx, by] = this.P(cx + dx * (lo - dc), cy + dy * (lo - dc));
    const gr = g.createLinearGradient(ax, ay, bx, by);
    gr.addColorStop(0, base); gr.addColorStop(flat, base); gr.addColorStop(1, shadow);
    this.path(pts, true); g.fillStyle = gr; g.fill();
  }
  /** thick-thin ink ring: w(θ) = w0 (1 + k cos(θ − thick)), θ from the contour centroid (canvas angles) */
  inkRing(pts: P2[], w0: number, thick: number, k = 0.45, col = INK) {
    const n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; }
    const out: P2[] = [], inn: P2[] = [];
    pts.forEach((q, i) => {
      const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      let nx = b[1] - a[1], ny = a[0] - b[0]; // outward normal for clockwise-on-screen contours
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const h = 0.5 * w0 * (1 + k * Math.cos(Math.atan2(q[1] - cy, q[0] - cx) - thick));
      out.push([q[0] + nx * h, q[1] + ny * h]); inn.push([q[0] - nx * h, q[1] - ny * h]);
    });
    const g = this.g;
    const trace = (r: P2[]) => { r.forEach(([x0, y0], i) => { const [x, y] = this.P(x0, y0); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); };
    g.beginPath(); trace(out); trace(inn.reverse());
    g.fillStyle = col; g.fill("evenodd");
  }
  /** flat strap with a thin ink rim (cross belts, sash, rifle, handles) */
  band(pts: P2[], fill: string, w: number, rim: number, cap: CanvasLineCap = "butt") {
    const g = this.g; g.lineCap = cap; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = INK; g.lineWidth = w + 2 * rim; g.stroke();
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
    g.lineCap = "round";
  }
}

const ellPts = (cx: number, cy: number, rx: number, ry: number, a0 = 0, a1 = 360, rot = 0, n = 48): P2[] => {
  const r = rad(rot), pts: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = rad(a0 + ((a1 - a0) * i) / n), x = rx * Math.cos(a), y = ry * Math.sin(a);
    pts.push([cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)]);
  }
  return pts;
};

const rrect = (x0: number, y0: number, x1: number, y1: number, r: number, n = 8): P2[] => {
  const pts: P2[] = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]])
    for (let i = 0; i <= n; i++) pts.push([cx + r * Math.cos(rad(a + (90 * i) / n)), cy + r * Math.sin(rad(a + (90 * i) / n))]);
  return pts;
};

/** tapered stroke, thick end at a: brows, moustache halves */
const taper = (p: Pen, a: P2, b: P2, wa: number, wb: number, col = INK) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  p.poly([[a[0] + nx * wa / 2, a[1] + ny * wa / 2], [b[0] + nx * wb / 2, b[1] + ny * wb / 2],
    [b[0] - nx * wb / 2, b[1] - ny * wb / 2], [a[0] - nx * wa / 2, a[1] - ny * wa / 2]], col, 0);
  p.dot(a[0], a[1], wa / 2, col); p.dot(b[0], b[1], wb / 2, col);
};

// ---------------- contours ----------------
export type Blob = { a: number; b: number; nTop: number; nBot: number; egg: number; asym: number; rot: number; noise: number; seed: number };

/** superellipse "bean": separate crown / jaw exponents, egg taper (neg = narrower chin), one-side bulge, soft noise.
 *  Points run right -> down -> left -> up (clockwise on screen). */
export const blobPts = (cx: number, cy: number, B: Blob, n = 72): P2[] => {
  const ph = [rnd(B.seed, 11), rnd(B.seed, 12), rnd(B.seed, 13)].map((v) => v * Math.PI * 2);
  const pts: P2[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), e = 2 / (s < 0 ? B.nTop : B.nBot);
    let X = Math.sign(c) * Math.abs(c) ** e;
    const Y = Math.sign(s) * Math.abs(s) ** e;
    X *= (1 + B.egg * Y) * (1 + B.asym * Math.sign(X));
    const r = 1 + B.noise * (Math.cos(2 * t + ph[0]) + 0.7 * Math.cos(3 * t + ph[1]) + 0.5 * Math.cos(4 * t + ph[2]));
    const x = B.a * X * r, y = B.b * Y * r;
    pts.push([cx + x * Math.cos(B.rot) - y * Math.sin(B.rot), cy + x * Math.sin(B.rot) + y * Math.cos(B.rot)]);
  }
  return pts;
};

/** measured head: H/W 0.94, slightly pointed crown (1.75), fuller jaw (2.3), chin taper -0.12, 8 % bulge to the facing side */
export const headBlob = (seed: number, a = 118, facing = 0): Blob => ({
  a, b: a * (0.94 + 0.08 * (rnd(seed, 1) - 0.5)),
  nTop: 1.75 + 0.3 * (rnd(seed, 2) - 0.5), nBot: 2.3 + 0.3 * (rnd(seed, 3) - 0.5),
  egg: -0.12 + 0.06 * (rnd(seed, 4) - 0.5),
  asym: (0.06 + 0.04 * rnd(seed, 5)) * (facing || (rnd(seed, 6) < 0.5 ? -1 : 1)),
  rot: rad(8 * (rnd(seed, 7) - 0.5)), noise: 0.008, seed,
});

/** thickest outline direction: away from the light, pulled toward the ground (64 deg measured for upper-left light) */
export const thickAngle = (light: number) => Math.atan2(-Math.sin(light) + 0.8, -Math.cos(light));
const DEF_LIGHT = rad(-120);

// ---------------- faces ----------------
export type Expr = "neutral" | "stern" | "grin" | "laugh" | "whistle" | "nervous" | "shock" | "relief" | "relief_open" | "dazed"
  | "pained" | "smile" | "smile_closed" | "lick" | "shout" | "confused" | "suspicious" | "smug";
type EyeK = "dot" | "small" | "lid" | "slit" | "happy" | "dash" | "squeeze" | "shock" | "shockHalf" | "spiral";
type MouthK = "dash" | "frown" | "smirk" | "smile" | "smileWide" | "grin" | "laugh" | "o" | "O" | "wave" | "teeth" | "lick" | "shout";
/** eyes [back, front], brows [inner, outer] offsets in u (+ = down), mouth kind */
const FACE: Record<Expr, { eye: [EyeK, EyeK]; brow: [number, number]; brow2?: [number, number]; mouth: MouthK }> = {
  neutral: { eye: ["lid", "lid"], brow: [0, -1], mouth: "dash" },
  stern: { eye: ["lid", "lid"], brow: [3, -2], mouth: "frown" },
  grin: { eye: ["happy", "happy"], brow: [-3, -3], mouth: "grin" },
  laugh: { eye: ["squeeze", "squeeze"], brow: [-4, -4], mouth: "laugh" },
  whistle: { eye: ["dash", "dash"], brow: [-2, -4], mouth: "o" },
  nervous: { eye: ["small", "small"], brow: [-3, 2], mouth: "wave" },
  shock: { eye: ["shock", "shock"], brow: [-7, -6], mouth: "O" },
  relief: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "smileWide" },
  relief_open: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "grin" },
  // bewildered, never spiral (the prisoners and madmen are gentle-silly): mismatched eyes, raised brows
  dazed: { eye: ["dot", "small"], brow: [-5, 1], brow2: [-2, 2], mouth: "wave" },
  pained: { eye: ["squeeze", "lid"], brow: [-3, 2], mouth: "teeth" },
  smile: { eye: ["dot", "dot"], brow: [0, -1], mouth: "smirk" },
  smile_closed: { eye: ["happy", "happy"], brow: [0, -1], mouth: "smile" },
  lick: { eye: ["dot", "dot"], brow: [0, -1], mouth: "lick" },
  shout: { eye: ["lid", "lid"], brow: [6, -2], mouth: "shout" },
  confused: { eye: ["dot", "small"], brow: [1, -1], brow2: [-8, -7], mouth: "o" },
  // Drouet's eyebrow: one brow shoved up, the other pressed down, lidded eyes, a flat mouth
  suspicious: { eye: ["dot", "dot"], brow: [1, -1], brow2: [-10, -13], mouth: "dash" },
  // the king pleased with himself: lidded eyes, a smirk
  smug: { eye: ["lid", "lid"], brow: [-1, -3], mouth: "smirk" },
};
/** pupils looking up (0..1), set per drawing by bodyFront (startled passers-by looking up at the window) */
let EYE_UP = 0;
const halfLid = (k: EyeK): EyeK => (k === "dot" || k === "small" ? "lid" : k === "lid" ? "slit" : k === "shock" ? "shockHalf" : k);
const eyeKind = (k: EyeK, lid: number): EyeK =>
  lid >= 1 && k !== "happy" && k !== "squeeze" && k !== "spiral" ? "dash" : lid > 0 ? halfLid(k) : k;
const lidOf = (b: boolean | number | undefined) => (b === true ? 1 : Number(b) || 0);

const eye = (p: Pen, kind: EyeK, x: number, ey: number, u: number, side: number, look: number, skin: string) => {
  const lx = x + look * 3 * u, lw = 3.8 * u;
  if (EYE_UP && (kind === "dot" || kind === "small" || kind === "shock")) ey -= 3.5 * u * EYE_UP;
  switch (kind) {
    case "dot": p.ell(lx, ey, 3.8 * u, 5.5 * u, INK, 0); break;
    case "small": p.ell(lx, ey, 3 * u, 4.4 * u, INK, 0); break;
    case "lid": p.ell(lx, ey - u, 7 * u, 6 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey - u], [x + 9 * u, ey - u]], lw); break;
    case "slit": p.ell(lx, ey, 7 * u, 2.6 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey], [x + 9 * u, ey]], lw); break;
    case "happy": p.arc(x, ey + 3 * u, 8 * u, 6 * u, 200, 340, lw); break;
    case "dash": p.stroke([[x - 8.5 * u, ey], [x + 8.5 * u, ey]], lw); break;
    case "squeeze": p.stroke([[x + 6 * u * side, ey - 5 * u], [x - 6 * u * side, ey], [x + 6 * u * side, ey + 5 * u]], lw); break;
    case "shock": case "shockHalf":
      p.ell(x, ey, 11 * u, 11 * u, WHITE, 2.6 * u); p.dot(lx - side * 1.5 * u, ey + 1.5 * u, 3 * u);
      if (kind === "shockHalf") { p.ell(x, ey, 11 * u, 11 * u, skin, 0, 180, 360); p.stroke([[x - 11 * u, ey], [x + 11 * u, ey]], 2.6 * u); }
      break;
    default: {
      const s: P2[] = [];
      for (let t = 1; t < 15; t++) s.push([x + Math.cos(t * 0.9) * t * 0.55 * u, ey + Math.sin(t * 0.9) * t * 0.55 * u]);
      p.stroke(s, 2.4 * u);
    }
  }
};

/** open "D" mouth with a white teeth band (+ tongue) */
const dmouth = (p: Pen, mx: number, y: number, rx: number, ry: number, u: number, tongue = false) => {
  p.ell(mx, y, rx, ry, MOUTH, 0, 0, 180);
  p.clip([[mx - rx, y], [mx + rx, y], [mx + rx, y + 3 * u], [mx - rx, y + 3 * u]], () => p.ell(mx, y, rx, ry, WHITE, 0, 0, 180));
  if (tongue) p.ell(mx + 2 * u, y + 0.62 * ry, 0.4 * rx, 0.28 * ry, TONGUE, 0);
  p.ell(mx, y, rx, ry, null, 3 * u, 0, 180);
};

const mouth = (p: Pen, kind: MouthK, mx: number, my: number, u: number, k = 1) => {
  const mw = 4 * u;
  switch (kind) {
    case "dash": p.stroke([[mx - 5.5 * u * k, my], [mx + 5.5 * u * k, my - 0.8 * u]], mw); break;
    case "frown": p.arc(mx, my + 3 * u, 6.5 * u * k, 3.5 * u, 200, 340, mw); break;
    case "smirk": p.arc(mx + u, my - 3 * u, 7 * u * k, 4 * u, 10, 150, mw); break;
    case "smile": p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw); break;
    case "smileWide": p.arc(mx, my - 4 * u, 11 * u * k, 6 * u, 15, 165, mw); break;
    case "grin": dmouth(p, mx, my - u, 12 * u * k, 8 * u, u); break;
    case "laugh": dmouth(p, mx, my, 16 * u * k, 11 * u, u, true); break;
    case "o": p.ell(mx + 4 * u, my, 3.5 * u, 4 * u, MOUTH, 2.8 * u); break;
    case "O": p.ell(mx, my + 2 * u, 9 * u * k, 11 * u, MOUTH, 3.2 * u); break;
    case "wave": { const s: P2[] = []; for (let i = 0; i <= 12; i++) s.push([mx - 9 * u * k + i * 1.5 * u * k, my + 1.5 * u * Math.sin(i * 1.3)]); p.stroke(s, 3 * u); break; }
    case "teeth":
      p.poly([[mx - 12 * u * k, my - 4 * u], [mx + 12 * u * k, my - 4 * u], [mx + 11 * u * k, my + 4 * u], [mx - 11 * u * k, my + 4 * u]], WHITE, 3 * u);
      for (const j of [-1, 0, 1]) p.stroke([[mx + j * 6 * u * k, my - 4 * u], [mx + j * 6 * u * k, my + 4 * u]], 1.5 * u);
      break;
    case "lick": p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw); p.ell(mx + 6 * u * k, my + 3 * u, 3.6 * u, 4.6 * u, TONGUE, 2.4 * u); break;
    case "shout": p.ell(mx, my + 3 * u, 11 * u * k, 14 * u, MOUTH, 3.2 * u); p.ell(mx, my + 11 * u, 6 * u * k, 4 * u, TONGUE, 0); break;
  }
};

/** face v2 (front / 3-4). u = 1 % of the head path width W. Eyes 26u apart on the centre line, brows 20u up, mouth 20u
 *  down, everything slid toward the facing side. No blush, no catchlights. */
const faceFront = (p: Pen, cx: number, cy: number, W: number, expr: Expr, facing: number, look: number, lid: number, brim: boolean,
  skin: string, moustache?: string, stout = false, o?: Outfit) => {
  const u = W / 100, F = FACE[expr], fx = cx + 7 * u * facing;
  const ex = (F.eye[0] === "shock" ? 12 : 13) * u, ey = cy;
  for (const side of [-1, 1]) {
    const x = fx + side * ex;
    const kind = eyeKind(F.eye[(facing ? side === facing : side > 0) ? 1 : 0], lid);
    eye(p, kind, x, ey, u, side, look, skin);
    const [dI, dO] = side > 0 && F.brow2 ? F.brow2 : F.brow, by = ey - (brim ? 17 : 20) * u;
    if (kind === "shock" || kind === "shockHalf") p.arc(x, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
    else taper(p, [x - side * 8.5 * u, by + dI * u], [x + side * 8.5 * u, by + dO * u], 5 * u, 2.5 * u);
  }
  const mx = cx + 8 * u * facing, my = cy + 20 * u;
  faceExtras(p, o, mx, my, u, facing || 1, false);
  mouth(p, F.mouth, mx, my, u);
  if (moustache) for (const s of [-1, 1])
    taper(p, [mx + s * 1.5 * u, cy + 12.5 * u], [mx + s * (stout ? 19 : 15) * u, cy + (stout ? 10.5 : 15) * u], stout ? 5.5 * u : 4.5 * u, 1.6 * u, moustache);
  if (expr === "nervous") p.ell(cx + 40 * u * (facing || 1), cy - 22 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
};

/** profile face (facing screen-right): one eye, brow, nose tick, mouth near the front edge; no skin bump nose, no ear */
const faceSide = (p: Pen, hx: number, hy: number, W: number, expr: Expr, lid: number, brim: boolean, skin: string, moustache?: string, stout = false, o?: Outfit) => {
  const u = W / 100, F = FACE[expr], ex = hx + 27 * u, ey = hy;
  faceExtras(p, o, hx + 33 * u, hy + 21 * u, u, -1, true);
  const kind = eyeKind(F.eye[1], lid);
  eye(p, kind, ex, ey, u, 1, 0.6, skin);
  const by = ey - (brim ? 17 : 20) * u, [dI, dO] = F.brow;
  if (kind === "shock" || kind === "shockHalf") p.arc(ex, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
  else if (expr === "suspicious") p.arc(ex, ey - 9 * u, 9 * u, 6 * u, 195, 345, 4.6 * u); // the raised, arched brow (kept under a hat brim)
  else taper(p, [ex + 8 * u, by + dI * u], [ex - 7 * u, by - u + dO * u], 5 * u, 2.5 * u);
  p.stroke([[hx + 44 * u, hy + 4 * u], [hx + 47.5 * u, hy + 9 * u], [hx + 43 * u, hy + 10 * u]], 3 * u);
  mouth(p, F.mouth, hx + 33 * u, hy + 21 * u, u, 0.62);
  if (moustache) taper(p, [hx + 41 * u, hy + 13.5 * u], [hx + 25 * u, hy + (stout ? 11.5 : 16) * u], stout ? 5.5 * u : 4.5 * u, 1.6 * u, moustache);
  if (expr === "nervous") p.ell(hx - 30 * u, hy - 24 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
};

// ---------------- card space + anchors ----------------
/** a character card spans design x 0..600 and y -CARD_TOP..1000 (soles at 975), so raised muskets, overhead barrels
 *  and the governor's cloth on its stick stay on the card */
export const CARD_TOP = 300, CARD_H = 1000 + CARD_TOP;
/** design units per metre (cast.ts SU = 0.00216 m per unit) */
export const MU = 1 / 0.00216;
/** prop points (final design coords) the cast hangs effects on: lantern glass (glow), torch head (flame + glow),
 *  hands, mouth, musket muzzle */
export type Anchors = { bung: P2[]; lantern: P2[]; hands: P2[]; flame: P2[]; spout?: P2; muzzle?: P2; mouth?: P2 };
let ANCH: Anchors | null = null;
const mark = (p: Pen, k: "bung" | "lantern" | "hands" | "flame", x: number, y: number) => { if (ANCH) ANCH[k].push(p.P(x, y)); };
const mark1 = (p: Pen, k: "spout" | "muzzle" | "mouth", x: number, y: number) => { if (ANCH) ANCH[k] = p.P(x, y); };
// a canvas context that swallows every call: running a body drawing with it only collects the anchors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NOOP: any = new Proxy(function () { return undefined; }, { get: () => NOOP, apply: () => NOOP, set: () => true });
const collect = (fn: (p: Pen) => void): Anchors => {
  const a: Anchors = { bung: [], lantern: [], hands: [], flame: [] };
  ANCH = a;
  try { fn(new Pen(NOOP)); } finally { ANCH = null; }
  return a;
};
export const frontAnchors = (o: Outfit, opts: FrontOpts) => collect((p) => bodyFront(p, o, opts));
export const sideAnchors = (o: Outfit, opts: SideOpts) => collect((p) => bodySide(p, o, opts));

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth01 = (x: number) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
/** closed-polygon corner cutting (soft cloth shapes) */
const chaikin = (pts: P2[], it = 2): P2[] => {
  let a = pts;
  for (let k = 0; k < it; k++) {
    const b: P2[] = [];
    for (let i = 0; i < a.length; i++) { const p0 = a[i], p1 = a[(i + 1) % a.length]; b.push(lerp2(p0, p1, 0.25), lerp2(p0, p1, 0.75)); }
    a = b;
  }
  return a;
};
const box = (x0: number, y0: number, x1: number, y1: number): P2[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const offPts = (pts: P2[], d: number): P2[] => pts.map((q, i) => {
  const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  return [q[0] - (dy / l) * d, q[1] + (dx / l) * d];
});

// ---------------- hand props ----------------
/** carried barrels are drawn at 0.82 of the BARREL spec: our cartoon torsos are small, a true-size barrel swallowed them */
export const CARRY = 0.66;
const OAK = "#b98049", OAK_SH = "#7b4f2d", STAVE = "#7d5230", IRON = "#3a3540", GRAIN = BARREL.trickle.color;
/** the one powder barrel (story BARREL, true size at k = 1): bellied oak staves, 2 dark iron hoops, a bung on the belly,
 *  no marks. Centre (cx, cy), axis rotated by ang (0 = upright), bung offset bx (-1..1 of the belly). Returns the bung. */
export const drawBarrel = (p: Pen, cx: number, cy: number, ang: number, light: number, k = 1, bx = 0): P2 => {
  const h = BARREL.h * MU * k, rm = BARREL.rMid * MU * k, re = BARREL.rEnd * MU * k, R = (pts: P2[]) => rotPts(pts, ang, cx, cy);
  const wAt = (v: number) => re + (rm - re) * (1 - v * v); // v -1 top .. 1 bottom
  const n = 14, rs: P2[] = [], ls: P2[] = [], bot: P2[] = [], top: P2[] = [];
  for (let i = 0; i <= n; i++) { const v = -1 + (2 * i) / n, y = cy + (v * h) / 2; rs.push([cx + wAt(v), y]); ls.push([cx - wAt(v), y]); }
  for (let i = 1; i < 10; i++) {
    const a = Math.PI * (i / 10);
    bot.push([cx + re * Math.cos(a), cy + h / 2 + 0.12 * re * Math.sin(a)]);
    top.push([cx - re * Math.cos(a), cy - h / 2 - 0.16 * re * Math.sin(a)]);
  }
  const body = R([...rs, ...bot, ...ls.reverse(), ...top]);
  p.gradFill(body, OAK, OAK_SH, light, 0.3);
  p.clip(body, () => {
    for (const s of [-0.66, -0.3, 0.06, 0.42, 0.76]) {
      const st: P2[] = [];
      for (let i = 0; i <= n; i++) { const v = -1 + (2 * i) / n; st.push([cx + s * wAt(v), cy + (v * h) / 2]); }
      p.stroke(R(st), 3.4 * k, STAVE);
    }
    for (const v0 of [-0.64, 0.64]) {
      const y = cy + (v0 * h) / 2, w = wAt(v0) + 4 * k, hp: P2[] = [];
      for (let i = 0; i <= 12; i++) { const x = -1 + i / 6; hp.push([cx + w * x, y + 0.1 * re * (1 - x * x)]); }
      p.band(R(hp), IRON, 0.055 * h, 2.4 * k);
    }
  });
  p.poly(body, null, 9 * k);
  p.poly(R(ellPts(cx, cy - h / 2, re, 0.16 * re)), "#946238", 7 * k); // the top end, seen from slightly above
  const b = R([[cx + bx * rm * 0.8, cy - 0.04 * h]])[0], br = BARREL.bungR * MU * k;
  p.ell(b[0], b[1], 1.3 * br, 1.2 * br, GRAIN, 2.5 * k);
  return b;
};

const WALNUT = "#5a3a24", STEEL = "#c9ccd4", STEEL_HI = "#f4f6f8";
/** musket: dark walnut stock, steel barrel with one highlight, a lock plate, NO bayonet */
export const drawMusket = (p: Pen, butt: P2, muzzle: P2, u: number, light = DEF_LIGHT) => {
  const dx = muzzle[0] - butt[0], dy = muzzle[1] - butt[1], L = Math.hypot(dx, dy) || 1, ex = dx / L, ey = dy / L, nx = -ey, ny = ex;
  const at = (s: number, w: number): P2 => [butt[0] + ex * L * s + nx * w, butt[1] + ey * L * s + ny * w];
  const prof: [number, number][] = [[0, 11], [0.1, 9.6], [0.23, 6.0], [0.3, 7.0], [0.8, 5.6], [0.84, 4.4]];
  const stock: P2[] = [...prof.map(([s, w]) => at(s, w * u)), ...prof.slice().reverse().map(([s, w]) => at(s, -w * u * 0.8))];
  p.poly(stock, WALNUT, 2.2 * u);
  p.band([at(0.27, 2.4 * u), at(1, 2.4 * u)], STEEL, 5.4 * u, 1.6 * u, "round");
  const lit = Math.cos(light) * nx + Math.sin(light) * ny > 0 ? 1 : -1;
  p.stroke([at(0.36, (2.4 + lit * 1.4) * u), at(0.96, (2.4 + lit * 1.4) * u)], 1.6 * u, STEEL_HI);
  p.poly([at(0.27, 6.4 * u), at(0.35, 6.4 * u), at(0.35, -2.4 * u), at(0.27, -2.4 * u)], "#5d646c", 1.4 * u);
};

/** iron lantern hanging from a hand at (hx, hy); returns the glass centre (glow card) */
export const drawLantern = (p: Pen, hx: number, hy: number, u0: number, k = 1.9): P2 => {
  const u = u0 * k;
  p.stroke([[hx, hy], [hx, hy + 6 * u]], 1.8 * u);
  const t0 = hy + 6 * u;
  p.poly([[hx - 4 * u, t0], [hx + 4 * u, t0], [hx + 9 * u, t0 + 4.5 * u], [hx - 9 * u, t0 + 4.5 * u]], IRON, 1.4 * u);
  p.poly(box(hx - 7.5 * u, t0 + 4.5 * u, hx + 7.5 * u, t0 + 19 * u), "#ffe08a", 1.8 * u);
  p.ell(hx, t0 + 11.5 * u, 3 * u, 4.5 * u, "#fff6d0", 0);
  p.stroke([[hx, t0 + 4.5 * u], [hx, t0 + 19 * u]], 1.3 * u, IRON);
  p.poly(box(hx - 8.5 * u, t0 + 19 * u, hx + 8.5 * u, t0 + 22 * u), IRON, 1.2 * u);
  return [hx, t0 + 11.8 * u];
};

/** a red cap held in a waving hand */
const capInHand = (p: Pen, hx: number, hy: number, u: number, col = "#c8343a") => {
  p.poly(chaikin([[hx - 9 * u, hy + 4 * u], [hx - 6 * u, hy - 10 * u], [hx + 6 * u, hy - 14 * u], [hx + 12 * u, hy - 6 * u], [hx + 9 * u, hy + 4 * u]], 1), col, 1.6 * u);
};
const cockade = (p: Pen, x: number, y: number, u: number) => {
  p.ell(x, y, 7 * u, 7 * u, "#2f5aa8", 1.5 * u);
  p.ell(x, y, 3.8 * u, 3.8 * u, "#d0323a", 1.1 * u);
};

// ---------------- hats + hair ----------------
const BONNET = "#ede2c8", BONNET_BRIM = "#d8c49a";
/** parts of a hat that sit behind the head (bonnet), the wig's queue in profile */
const hatBehind = (p: Pen, o: Outfit, H: Blob, cx: number, hc: number, light: number, thick: number, ow: number, side: boolean) => {
  if (o.hat === "hood") { // the cloak's hood: a deep rounded cowl around and behind the head
    const col = o.cloak ?? "#4a3f5a";
    const hb = blobPts(cx - (side ? 0.22 : 0) * H.a, hc - 0.08 * H.b, { ...H, a: H.a * (side ? 1.22 : 1.3), b: H.b * 1.24, asym: 0, egg: 0.1, nTop: 1.9, nBot: 2.6, seed: H.seed + 5 });
    p.shadedFill(hb, col, mul(col, SH_CLOTH), light, H.a * 1.3);
    p.inkRing(hb, ow * 0.9, thick);
  }

  if (o.hat === "round" && o.wig && !side && (o.curlPeek ?? 0) > 0.02) {
    // the valet's give-away royal curl, front view: BEHIND the head silhouette at ear height, under the brim, so most of
    // the roll pokes out past the cheek (drawn over the face it read as a paper tube or a cigarette)
    const u = H.a / 50, peek = o.curlPeek!, k = 0.6 + 0.4 * peek, L = 20 * u * k;
    wigRoll(p, cx - H.a * 0.97 - 0.3 * L, hc + 0.12 * H.b + (1 - peek) * 0.06 * H.b, L, 5.8 * u * k, "#ffffff", u, false, INK, -1);
  }
  if (o.wig && o.queue && side) {
    const u = H.a / 50, x = cx - 0.92 * H.a, y = hc + 0.52 * H.b;
    p.band([[x, y], [x - 4 * u, y + 18 * u], [x - 3 * u, y + 34 * u]], o.wig, 6 * u, 1.6 * u, "round");
  }
};

/** a hair-like cap following the skull down to `cut` (hair, wigs); in profile it also wraps the back of the head */
const hairCap = (p: Pen, hp: P2[], H: Blob, cx: number, hc: number, cut: number, col: string, side: boolean, light: number, ow: number, scallop: boolean, u: number) => {
  const keep = (x: number, y: number) => y < cut || (side && x < cx - 6 * u && y < hc + 0.42 * H.b);
  const n = hp.length, startIdx = Math.max(0, hp.findIndex(([x, y], i) => keep(x, y) && !keep(hp[(i + n - 1) % n][0], hp[(i + n - 1) % n][1])));
  const arc = [...hp.slice(startIdx), ...hp.slice(0, startIdx)].filter(([x, y]) => keep(x, y)).map(([x, y]) => [cx + (x - cx) * 1.03, hc + (y - hc) * 1.03] as P2);
  if (arc.length < 3) return arc;
  if (scallop) {
    const [x0, y0] = arc[arc.length - 1], [x1, y1] = arc[0];
    for (let i = 1; i < 6; i++) arc.push([x0 + ((x1 - x0) * i) / 6, y0 + ((y1 - y0) * i) / 6 + (i % 2 ? 4 * u : 0)]);
  }
  p.shadedFill(arc, col, mul(col, SH_FELT), light, H.a, 0.35);
  p.poly(arc, null, ow);
  return arc;
};

/** powdered wig: a white cap on the skull, rolled side curls at the ears (1-2 per side); the count's has a black-ribbon queue */
const wigOn = (p: Pen, o: Outfit, hp: P2[], H: Blob, cx: number, hc: number, light: number, facing: number, side: boolean) => {
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, ow = 0.85 * 5 * u, col = o.wig!, crown = hc - H.b;
  if (side) hairCap(p, hp, H, cx, hc, crown + 0.4 * HH, col, side, light, ow, false, u);
  else {
    // hair swept back from a high forehead and covering the sides down to the ears (a straight cut read as a bald cap)
    const cutF = (x: number) => crown + 0.3 * HH + 0.34 * HH * Math.min(1, ((x - cx) / H.a) ** 2);
    const keep = (x: number, y: number) => y < cutF(x);
    const n = hp.length, st = Math.max(0, hp.findIndex(([x, y], i) => keep(x, y) && !keep(hp[(i + n - 1) % n][0], hp[(i + n - 1) % n][1])));
    const arc = [...hp.slice(st), ...hp.slice(0, st)].filter(([x, y]) => keep(x, y)).map(([x, y]) => [cx + (x - cx) * 1.04, hc + (y - hc) * 1.04] as P2);
    if (arc.length > 3) {
      const a = arc[arc.length - 1], b = arc[0];
      for (let i = 1; i < 12; i++) { const x = a[0] + ((b[0] - a[0]) * i) / 12; arc.push([x, cutF(x)]); }
      p.shadedFill(arc, col, mul(col, SH_FELT), light, H.a, 0.35);
      p.poly(arc, null, ow);
      p.stroke(curve([cx - 0.2 * W, crown + 0.12 * HH], [cx, crown + 0.04 * HH], [cx + 0.2 * W, crown + 0.12 * HH], 8), 1.2 * u); // combed-back line
    }
  }
  // rolled curls: horizontal sausage rolls with a spiral end, like an 18th-century powdered wig
  const curl = (x: number, y: number, s: number) => wigRoll(p, x, y, 15 * u, 5.6 * u, col, u, false, INK, s); // clean horizontal rolls, curl outward
  const nC = o.curls ?? 1;
  if (side) {
    for (let k = 0; k < nC; k++) curl(cx - 0.3 * W, hc + 0.02 * HH + k * 0.1 * HH, -1);
    if (o.queue) { // black ribbon bow at the nape
      const x = cx - 0.9 * H.a, y = hc + 0.5 * H.b;
      p.poly([[x, y], [x - 12 * u, y - 7 * u], [x - 12 * u, y + 7 * u]], "#1d1a22", 1.2 * u);
      p.poly([[x, y], [x + 9 * u, y - 7 * u], [x + 9 * u, y + 6 * u]], "#1d1a22", 1.2 * u);
      p.dot(x, y, 3 * u, "#1d1a22");
    }
  } else for (const s of [-1, 1]) for (let k = 0; k < nC; k++) {
    const x = cx + s * (H.a * 0.88) + 2 * u * facing, y = hc - 0.03 * HH + k * 0.105 * HH;
    curl(x, y, s);
  }
};

const hatOn = (p: Pen, o: Outfit, hp: P2[], H: Blob, cx: number, hc: number, light: number, seed: number, facing: number, side: boolean) => {
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, crown = hc - H.b, ow = 0.85 * 5 * u;
  const a = H.rot + rad(4 * (rnd(seed, 20) - 0.5)); // tilt with the head, +-2 deg extra
  const R = (pts: P2[]) => rotPts(pts, a, cx, hc);
  const sag = (yb: number, wb: number): P2[] => {
    const base: P2[] = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; base.push([cx + wb * (2 * t - 1), yb + 3 * u * (1 - (2 * t - 1) ** 2)]); }
    return base;
  };
  if (o.hat === "hair" || o.hat === "cap") {
    const cut = crown + (o.hat === "cap" ? 0.3 : 0.42) * HH, col = o.hat === "cap" ? o.cap! : o.hair!;
    hairCap(p, hp, H, cx, hc, cut, col, side && o.hat === "hair", light, ow, o.hat === "hair", u);

  } else if (o.hat === "wild") {
    // spiky uncombed hair: the upper skull pushed out in a zig-zag, two stray tufts over the ears
    const col = o.hair ?? "#b9b4ad", lim = hc + (side ? 0.3 : 0.1) * HH, n = hp.length;
    const keep = (x: number, y: number) => y < lim && (!side || x < cx + 0.3 * W || y < crown + 0.3 * HH);
    const st = Math.max(0, hp.findIndex(([x, y], i) => keep(x, y) && !keep(hp[(i + n - 1) % n][0], hp[(i + n - 1) % n][1])));
    const arc = [...hp.slice(st), ...hp.slice(0, st)].filter(([x, y]) => keep(x, y));
    const spiky: P2[] = arc.map(([x, y], i) => { const k = i % 3 === 1 ? 1.2 + 0.14 * rnd(seed, 40 + i) : 1.04; return [cx + (x - cx) * k, hc + (y - hc) * k]; });
    const L = spiky[spiky.length - 1], F = spiky[0];
    spiky.push([lerp(L[0], cx, 0.35), crown + 0.34 * HH], [lerp(F[0], cx, 0.35), crown + 0.3 * HH]);
    p.shadedFill(spiky, col, mul(col, SH_FELT), light, H.a * 1.1, 0.35);
    p.poly(spiky, null, ow);
    for (const s of side ? [-1] : [-1, 1]) p.poly([[cx + s * 0.46 * W, hc - 0.02 * HH], [cx + s * 0.62 * W, hc + 0.06 * HH], [cx + s * 0.5 * W, hc + 0.14 * HH]], col, ow * 0.8);
  } else if (o.hat === "phrygian") {
    // soft liberty cap: a tall dome whose top flops forward over the brow (a separate darker lobe), cockade on the band
    const col = o.cap ?? "#b83239", s = side ? 1 : facing || (rnd(seed, 22) < 0.5 ? -1 : 1), yb = crown + 0.21 * HH, wb = 0.54 * W;
    const X = (x: number) => cx + s * x;
    const raw: P2[] = [[X(-wb), yb], [X(-wb * 1.02), yb - 0.16 * HH], [X(-0.42 * W), crown - 0.2 * HH], [X(-0.2 * W), crown - 0.42 * HH],
      [X(0.08 * W), crown - 0.5 * HH], [X(0.32 * W), crown - 0.38 * HH], [X(0.48 * W), crown - 0.16 * HH], [X(wb), yb - 0.1 * HH], [X(wb), yb], [X(0), yb + 3 * u]];
    const body = R(chaikin(raw, 2));
    p.shadedFill(body, col, mul(col, SH_FELT), light, 0.55 * W, 0.35);
    p.poly(body, null, ow);
    p.band(R(sag(yb - 0.03 * HH, wb * 0.98)), shade(col, 0.78), 0.08 * HH, 1.4 * u, "round");
    // the flopped tip hangs over the side, past the cap's own outline, so it reads as a soft cap and not a helmet
    const flop = R(chaikin([[X(-0.04 * W), crown - 0.46 * HH], [X(0.24 * W), crown - 0.54 * HH], [X(0.5 * W), crown - 0.36 * HH], [X(0.66 * W), crown - 0.1 * HH],
      [X(0.7 * W), crown + 0.12 * HH], [X(0.6 * W), crown + 0.06 * HH], [X(0.44 * W), crown - 0.16 * HH], [X(0.18 * W), crown - 0.32 * HH]], 1));
    p.shadedFill(flop, shade(col, 0.8), mul(shade(col, 0.8), SH_FELT), light, 0.3 * W, 0.35);
    p.poly(flop, null, ow * 0.9);
    if (o.cockade) { const [kx, ky] = R([[X(-0.3 * W), yb - 0.11 * HH]])[0]; cockade(p, kx, ky, u); }
  } else if (o.hat === "tricorne") {
    const col = "#27232d", yb = crown + 0.2 * HH;
    const brim: P2[] = side
      ? [[cx + 0.62 * W, yb + 0.02 * HH], [cx + 0.3 * W, crown - 0.1 * HH], [cx - 0.05 * W, crown - 0.17 * HH], [cx - 0.4 * W, crown - 0.2 * HH],
        [cx - 0.6 * W, yb - 0.14 * HH], [cx - 0.34 * W, yb + 0.03 * HH], [cx + 0.2 * W, yb + 0.07 * HH]]
      : [[cx - 0.64 * W, yb - 0.17 * HH], [cx - 0.36 * W, crown - 0.15 * HH], [cx - 0.12 * W, crown - 0.07 * HH], [cx + 0.12 * W, crown - 0.07 * HH],
        [cx + 0.36 * W, crown - 0.15 * HH], [cx + 0.64 * W, yb - 0.17 * HH], [cx + 0.34 * W, yb + 0.03 * HH], [cx + facing * 0.05 * W, yb + 0.09 * HH],
        [cx - 0.34 * W, yb + 0.03 * HH]];
    if (!side) p.poly(R(ellPts(cx, crown - 0.02 * HH, 0.3 * W, 0.18 * HH, 180, 360)), shade(col, 1.35), ow);
    const b = R(brim);
    p.shadedFill(b, col, mul(col, SH_FELT), light, 0.6 * W, 0.35);
    p.poly(b, null, ow);
    if (o.cockade) { const [kx, ky] = R([[side ? cx + 0.22 * W : cx - 0.3 * W, yb - 0.08 * HH]])[0]; cockade(p, kx, ky, u); }
  } else if (o.hat === "tophat") {
    const yb = crown + 0.22 * HH, ht = 0.8 * HH, wb = 0.31 * W, wt = 0.33 * W, col = "#2e2a36";
    const body = R([...sag(yb, wb).reverse(), [cx - wt, yb - ht], [cx + wt, yb - ht]]);
    p.shadedFill(body, col, mul(col, SH_FELT), light, wt, 0.4);
    p.poly(body, null, ow);
    const [bx, by] = R([[cx, yb + 1 * u]])[0];
    p.ell(bx, by, 0.45 * W, 0.05 * HH, "#1d1b22", ow, 0, 360, (a * 180) / Math.PI);
  } else if (o.hat === "bonnet") {
    // a soft mob cap puffed over the crown, its frilled edge round the face (one shape, never a second disc)
    const ox = side ? -0.1 * W : 0, cyc = crown + 0.2 * HH, rxc = 0.56 * W, ryc = 0.36 * HH, cap: P2[] = [];
    for (let i = 0; i <= 28; i++) { const a2 = Math.PI + (Math.PI * i) / 28; cap.push([cx + ox + rxc * Math.cos(a2), cyc + ryc * Math.sin(a2) * (1 + 0.04 * Math.sin(i * 1.7))]); }
    const fr0 = cyc + 0.02 * HH, edgeS: P2[] = [[cx + ox + rxc, fr0], [cx + 0.18 * W, crown + 0.27 * HH], [cx - 0.08 * W, crown + 0.36 * HH], [cx - 0.28 * W, crown + 0.6 * HH]];
    const back = side ? [...edgeS, [cx - 0.44 * W, crown + 0.64 * HH], [cx - 0.6 * W, crown + 0.42 * HH]] as P2[] : [];
    const capP = R(side ? [...cap, ...back] : cap);
    p.shadedFill(capP, BONNET, mul(BONNET, SH_CLOTH), light, rxc, 0.4); p.poly(capP, null, ow * 0.9);
    // the frill: little scallops along the edge over the brow, a ribbon band just above it
    const fr: P2[] = [];
    if (side) { // the frill only along the front edge (brow -> above the ear), scalloped
      for (let i = 0; i + 1 < edgeS.length; i++) for (let k = 0; k < 6; k++) { const q2 = lerp2(edgeS[i], edgeS[i + 1], k / 6); fr.push([q2[0], q2[1] + ((i * 6 + k) % 2 ? 4 * u : 0)]); }
      fr.push(edgeS[edgeS.length - 1]);
    } else for (let i = 0; i <= 16; i++) { const x = cx + ox - rxc * 0.98 + (2 * rxc * 0.98 * i) / 16; fr.push([x, fr0 + (i % 2 ? 4.5 * u : 0)]); }
    p.stroke(R(fr), 3.2 * u, BONNET_BRIM); p.stroke(R(fr.map(([x, y]) => [x, y + 2.6 * u] as P2)), 1.1 * u);
    if (side) p.stroke(R(curve([cx + ox + rxc * 0.85, fr0 - 0.07 * HH], [cx + 0.05 * W, crown + 0.2 * HH], [cx - 0.4 * W, crown + 0.36 * HH], 8)), 3.4 * u, o.cockade ? "#c25a6a" : "#8a9ac8");
    else p.stroke(R([[cx + ox - rxc * 0.9, fr0 - 0.06 * HH], [cx + ox + rxc * 0.9, fr0 - 0.06 * HH]]), 3.4 * u, o.cockade ? "#c25a6a" : "#8a9ac8");
    if (o.cockade) { const [kx, ky] = R([[cx + (side ? -0.3 : -0.36) * W, crown + 0.12 * HH]])[0]; cockade(p, kx, ky, u); }
  } else if (o.hat === "round") {
    // the valet's cheap round hat: a low dome on a wide floppy brim; pulled down over the brows once the curl is hidden
    const col = "#4f3d31", peek = o.curlPeek ?? 0, low = (o.curlPeek === undefined ? 0 : 1 - peek) * HAT_PULL * HH;
    void facing; // the give-away curl: hatBehind (front, behind the head at ear height) / kingHead (profile)
    const yb = crown + 0.24 * HH + low, ht = 0.34 * HH, wb = 0.36 * W;
    const dome = R(chaikin([[cx - wb, yb], [cx - wb * 0.96, yb - ht * 0.7], [cx - wb * 0.6, yb - ht], [cx + wb * 0.6, yb - ht], [cx + wb * 0.96, yb - ht * 0.7], [cx + wb, yb]], 2));
    p.shadedFill(dome, col, mul(col, SH_FELT), light, wb, 0.4); p.poly(dome, null, ow);
    p.band(R(sag(yb - 0.03 * HH, wb * 0.99)), shade(col, 0.7), 0.06 * HH, 1.4 * u, "round");
    const brim = R(chaikin([[cx - 0.64 * W, yb + 0.01 * HH], [cx - 0.3 * W, yb - 0.035 * HH], [cx + 0.3 * W, yb - 0.035 * HH], [cx + 0.64 * W, yb + 0.01 * HH],
      [cx + 0.5 * W, yb + 0.06 * HH], [cx - 0.5 * W, yb + 0.06 * HH]], 2));
    p.shadedFill(brim, shade(col, 1.08), mul(col, SH_FELT), light, 0.6 * W, 0.35); p.poly(brim, null, ow);
  } else if (o.hat === "nightcap") {
    // knitted night cap: a band round the skull, the long cone flopping over to one side, a tassel by the ear
    const col = o.cap ?? "#f1ece0", s2 = side ? -1 : facing || (rnd(seed, 23) < 0.5 ? -1 : 1), yb = crown + 0.22 * HH, wb = 0.5 * W;
    const X = (x: number) => cx + s2 * x;
    const raw: P2[] = [[X(-wb), yb], [X(-0.46 * W), crown - 0.1 * HH], [X(-0.2 * W), crown - 0.26 * HH], [X(0.2 * W), crown - 0.3 * HH],
      [X(0.62 * W), crown - 0.12 * HH], [X(0.82 * W), crown + 0.18 * HH], [X(0.74 * W), crown + 0.3 * HH], [X(0.58 * W), crown + 0.04 * HH], [X(wb), yb]];
    const body = R(chaikin(raw, 2));
    p.shadedFill(body, col, mul(col, SH_CLOTH), light, 0.55 * W, 0.35); p.poly(body, null, ow);
    if (o.stripes) p.clip(body, () => { for (const k of [0.25, 0.5, 0.75]) p.stroke(R([[X(-0.6 * W + k * 1.2 * W), crown - 0.4 * HH], [X(-0.3 * W + k * 1.5 * W), yb]]), 4 * u, o.stripes!); });
    p.band(R(sag(yb - 0.02 * HH, wb * 0.98)), shade(col, 0.88), 0.07 * HH, 1.4 * u, "round");
    const [tx, ty] = R([[X(0.78 * W), crown + 0.33 * HH]])[0];
    p.ell(tx, ty, 6 * u, 6 * u, o.stripes ?? "#d8cfb8", 1.6 * u);
  } else if (o.hat === "hood") {
    // the hood's front rim framing the face: a thick soft band over the brow and down both cheeks
    const col = o.cloak ?? "#4a3f5a", rim: P2[] = [];
    for (let i = 0; i <= 20; i++) { const a2 = rad(side ? 140 + i * 5.5 : 150 + i * 12); rim.push([cx + 1.02 * H.a * Math.cos(a2) + (side ? 0.32 * H.a : 0), hc - 0.05 * H.b + 1.05 * H.b * Math.sin(a2)]); }
    p.band(R(rim), shade(col, 1.12), 0.13 * W, 1.6 * u, "round");
    if (!side) for (const sd of [-1, 1]) p.band(R([[cx + sd * 0.98 * H.a, hc + 0.1 * H.b], [cx + sd * 0.86 * H.a, hc + 0.75 * H.b]]), shade(col, 1.12), 0.1 * W, 1.6 * u, "round");
  }
};
const BRIMMED = new Set(["tricorne", "phrygian", "tophat", "shako", "shako_tall", "round"]);
/** how far the valet's round hat comes down (x head height) once the governess has tugged it over the curl */
export const HAT_PULL = 0.12;

// ---------------- bodies ----------------
export type Arms = [P2[], P2[]];
/** arm poses (front and side views); pk = the pose's amount 0..1 (raise, hoist, flutter...), alt = variant */
export type Pose = "hang" | "hold" | "raise" | "fist" | "wave" | "hug" | "overhead" | "carrier" | "arms_open" | "lantern"
  | "aim_up" | "shoulder" | "reach" | "push"
  // ---- Varennes ----
  /** torch held up (pk 0 low .. 1 high, alt shakes it) */ | "torch"
  /** one arm stretched out pointing (front: up-right; side: forward) */ | "point"
  /** one hand at opts.hand (design point): the raised assignat, the governess's tug at the hat */ | "hold_up"
  /** sneaking: both forearms up, hands at the chest */ | "tiptoe"
  /** one hand at the hat brim (the preening valet) */ | "hat"
  /** both hands low and forward on the reins (riders) / on the coachman's lap */ | "reins"
  /** a scythe: side = mowing swing (pk 0..1), front = held upright, blade low */ | "scythe"
  /** chatting: one hand out, palm up, bobbing with pk */ | "talk";

const BUILD: Record<Build, { a: number; torso: number; legs: number; tw: number }> = {
  adult: { a: 118, torso: 1.1, legs: 1.4, tw: 0.8 },
  stout: { a: 118, torso: 1.15, legs: 1.32, tw: 0.92 },
  kid: { a: 112, torso: 0.85, legs: 1.0, tw: 0.72 },
  thin: { a: 108, torso: 1.22, legs: 1.62, tw: 0.66 },
};

export type FrontOpts = {
  phase?: number; expr?: Expr; mode?: "march" | "stroll" | "stand" | "sit" | "ride"; look?: number; blink?: boolean | number; lift?: number;
  tilt?: number; headTilt?: number; pose?: Pose; pk?: number; alt?: number; eyeUp?: number; noHat?: boolean;
  /** canvas angle the key light comes FROM (painted crescent + thick outline side) */
  light?: number; facing?: -1 | 0 | 1; seed?: number;
  /** pose "hold_up": the hand's design point */ hand?: P2;
  /** idle breathing phase 0..1 (standing / seated): chest rise + a slight sway */ breath?: number;
};

const footStroke = (p: Pen, a: P2, b: P2, w: number, col: string) => {
  if (col !== INK) p.stroke([a, b], w + 3, INK);
  p.stroke([a, b], w, col);
};
/** one leg: a dark stick, striped trousers (wide, cream with two stripes) or breeches over light stockings */
const legStroke = (p: Pen, o: Outfit, pts: P2[], w: number, far = false) => {
  const dim = (c: string) => (far ? shade(c, 0.84) : c);
  if (o.stripes && !o.dress) {
    const tw = 1.9 * w;
    p.stroke(pts, tw + 3.5, INK); p.stroke(pts, tw, dim(o.pants));
    for (const k of [-0.3, 0.3]) p.stroke(offPts(pts, k * tw), 0.18 * tw, dim(o.stripes));
  } else if (o.legs) {
    const up = pts.slice(0, Math.floor((pts.length - 1) / 2) + 1);
    p.stroke(pts, w + 3, INK); p.stroke(pts, w, dim(o.legs));
    p.stroke(up, 1.5 * w + 3, INK); p.stroke(up, 1.5 * w, dim(o.pants));
  } else p.stroke(pts, w, mix(o.pants, INK, far ? 0.75 : 0.55));
  if (o.tallBoots) { // riding boots from the knee down: a wider dark sleeve with a turned-down tan cuff
    const lo = pts.slice(Math.floor(pts.length * 0.48)), bw = 1.55 * w;
    p.stroke(lo, bw + 3.5, INK); p.stroke(lo, bw, dim(o.boots === INK ? "#2c2430" : o.boots));
    p.stroke(lo.slice(0, 2), bw + 2, INK); p.stroke(lo.slice(0, 2), bw * 0.95, dim("#b07a48"));
  }
};
/** ink-dot hand; forgers get skin mitts with ink-black fingertips */
const handDot = (p: Pen, o: Outfit, x: number, y: number, u: number, dy = 1) => {
  if (!o.hands) { p.dot(x, y, 5.5 * u); return; }
  const pts = ellPts(x, y, 6.5 * u, 6.5 * u);
  p.poly(pts, o.skin ?? SKIN, 0);
  p.clip(pts, () => p.ell(x, y + dy * 5.5 * u, 8 * u, 4.6 * u, o.hands!, 0));
  p.poly(pts, null, 1.8 * u);
};
/** arm stroke (+ cuff) ending in a hand */
const armStroke = (p: Pen, o: Outfit, pts: [P2, P2, P2], u: number, col: string) => {
  const c = curve(pts[0], pts[1], pts[2]), aw = 5.2 * u * (o.armW ?? 1);
  if ((o.armW ?? 1) > 1) {
    // the hook man's sleeve reaching into the ECU: inked, a shade side, three fold creases and a turned-back shirt cuff;
    // no hand dot (the bill's own mitten is his hand)
    // the outline scales with the sleeve (a thin sleeve with the hook man's 4.5 u rim read as a black arm in close-up)
    const ink = Math.min(0.9 * 5 * u, aw * 0.2);
    p.stroke(c, aw + 2 * ink, INK); p.stroke(c, aw, o.jacket); p.stroke(offPts(c, aw * 0.28), aw * 0.3, mul(o.jacket, SH_CLOTH));
    // points measured back from the hand along the sleeve (only its last ~0.4 m is ever in the ECU frame)
    const back = (d: number): [P2, number, number] => {
      let s = d;
      for (let i = c.length - 1; i > 0; i--) {
        const A = c[i], B = c[i - 1], l = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
        if (s <= l) return [[A[0] + ((B[0] - A[0]) * s) / l, A[1] + ((B[1] - A[1]) * s) / l], (A[0] - B[0]) / l, (A[1] - B[1]) / l];
        s -= l;
      }
      return [c[0], 0, -1];
    };
    for (const d of [26 * u, 44 * u, 64 * u]) { // fold creases: shallow chevrons across the sleeve
      const [q2, dx, dy] = back(d), nx = -dy, ny = dx, h = aw * 0.42;
      p.stroke(curve([q2[0] + nx * h, q2[1] + ny * h], [q2[0] + dx * aw * 0.22, q2[1] + dy * aw * 0.22], [q2[0] - nx * h * 0.55, q2[1] - ny * h * 0.55], 6), 1.7 * u, mul(o.jacket, [0.55, 0.55, 0.62]));
    }
    if (o.armHand) { // the coat's turned-back cuff, then a shaded linen cuff with a little lace frill at the wrist
      const [k0] = back(17 * u), [k1] = back(9 * u), [c0] = back(9.5 * u), [c1] = back(3 * u, ), [cd, cdx, cdy] = back(3 * u), nx = -cdy, ny = cdx;
      p.stroke([k0, k1], aw * 1.2 + 2 * ink, INK); p.stroke([k0, k1], aw * 1.2, o.cuffs ?? shade(o.jacket, 0.82)); p.stroke(offPts([k0, k1], aw * 0.34), aw * 0.3, mul(o.jacket, SH_CLOTH));
      p.stroke([c0, c1], aw * 1.0 + 2 * ink, INK); p.stroke([c0, c1], aw * 1.0, "#efe8da");
      p.stroke(offPts([c0, c1], aw * 0.26), aw * 0.4, "#b8ae9e"); // the cuff's shaded underside
      p.stroke(offPts([c0, c1], -aw * 0.3), aw * 0.16, "#fbf8f0"); // its lit top edge
      for (let i = -2; i <= 2; i++) p.ell(cd[0] + nx * i * aw * 0.22 + cdx * 1.2 * u, cd[1] + ny * i * aw * 0.22 + cdy * 1.2 * u, 1.9 * u, 1.9 * u, "#f6f1e6", 0.7 * u); // lace scallops
    } else {
      const [c0] = back(9 * u), [c1] = back(4 * u); // a short turned-back shirt cuff at the wrist
      p.stroke([c0, c1], aw * 1.06 + 2 * ink, INK); p.stroke([c0, c1], aw * 1.06, "#f4f0e6");
      p.stroke(offPts([c0, c1], aw * 0.3), aw * 0.22, "#d8d0c0");
    }
    if (o.armHand) { const e = c[c.length - 1], b0 = c[c.length - 3]; drawHand(p, e, Math.atan2(e[1] - b0[1], e[0] - b0[0]), u * (o.armW ?? 1) * 0.62, o.skin ?? SKIN, !o.noThumb); }
    return;
  }
  p.stroke(c, aw, col);
  if (o.cuffs) { const cf = c.slice(8); p.stroke(cf, 8.5 * u + 3, INK); p.stroke(cf, 8.5 * u, o.cuffs); }
  handDot(p, o, pts[2][0], pts[2][1], u);
};
/** a cartoon hand at the end of an arm pointing along `ang`: a rounded palm, four finger tips curled forward, a thumb on
 *  top, plum ink (used where a hand must grip something: Drouet's bill) */
export const drawHand = (p: Pen, at: P2, ang: number, u: number, skin: string, thumb = true) => {
  const c = Math.cos(ang), s = Math.sin(ang), L = (x: number, y: number): P2 => [at[0] + c * x * u - s * y * u, at[1] + s * x * u + c * y * u];
  const palm: P2[] = chaikin([L(-6, -7), L(6, -8.5), L(13, -5), L(14, 4), L(8, 8.5), L(-5, 7.5)], 2);
  p.poly(palm, skin, 2.4 * u);
  for (const y of [-3.5, 0.5, 4.5]) p.stroke([L(9, y), L(13.5, y + 0.6)], 1.2 * u);
  if (thumb) p.poly(chaikin([L(2, -7), L(9, -12.5), L(12.5, -11), L(8, -6)], 2), skin, 2 * u); // the thumb
};
/** a thumb lying over a held paper's front edge, on a 96 x 96 card: base at the left edge, tip pointing +x (dir -1: mirrored) */
export const fxThumb = (p: Pen, skin: string, dir: 1 | -1) => {
  const X = (x: number) => (dir > 0 ? x : 96 - x);
  const th: P2[] = chaikin([[X(4), 40], [X(34), 34], [X(58), 37], [X(70), 46], [X(66), 58], [X(40), 62], [X(4), 64]], 2);
  p.poly(th, skin, 0);
  p.clip(th, () => p.ell(X(36), 62, 40, 9, mul(skin, SH_SKIN), 0)); // the shaded underside
  p.stroke([...th.slice(1), th[th.length - 1]], 3.2);
  p.poly(chaikin([[X(52), 39], [X(64), 42], [X(65), 50], [X(54), 50]], 1), mix(skin, "#ffffff", 0.35), 1.6); // the nail
  p.stroke([[X(30), 47], [X(36), 52]], 1.4, mul(skin, [0.7, 0.55, 0.5])); // knuckle crease
};
/** forger smudges, stubble (front: around the mouth at mx, my) */
const faceExtras = (p: Pen, o: Outfit | undefined, mx: number, my: number, u: number, side: number, profile: boolean) => {
  if (!o) return;
  if (o.stubble) {
    const col = mix(o.skin ?? SKIN, INK, 0.4);
    for (let i = 0; i < 18; i++) {
      const x = mx + (rnd(7, i) - 0.5) * (profile ? 22 : 40) * u - (profile ? 6 * u : 0), y = my - 4 * u + rnd(9, i) * 15 * u;
      if (Math.abs(x - mx) < 10 * u && Math.abs(y - my) < 6 * u) continue;
      p.dot(x, y, 1.15 * u, col);
    }
  }
  if (o.smudge) p.ell(mx - side * (profile ? 14 : 22) * u, my - 4 * u, 3.6 * u, 2.4 * u, "#2b2533", 0, 0, 360, 20);
};

export const bodyFront = (p: Pen, o0: Outfit, opts: FrontOpts) => {
  const { phase = 0, expr = "neutral", mode = "march", look = 0, blink = false, lift = 60, tilt = 0, headTilt = 0, alt = 0,
    light = DEF_LIGHT, facing = 0, seed = 1 } = opts;
  const o: Outfit = opts.noHat ? { ...o0, hat: null } : o0;
  const seated = mode === "sit" || mode === "ride";
  const pose: Pose = opts.pose ?? (o.rifle ? "hold" : "hang"), pk = clamp(opts.pk ?? 1, 0, 1);
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  const H = headBlob(seed, Bd.a, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const tall = (1 + Bd.torso + Bd.legs) * HH, sole = 975;
  // body bob 5 % (march) / 3 % (stroll) of the height, lowest at contact (phase 0 and 0.5)
  const br = opts.breath ?? 0, breathe = mode === "stand" || seated ? Math.sin(two * br) : 0;
  const bob = mode === "march" ? 0.025 * tall * Math.cos(2 * two * phase) : mode === "stroll" ? 0.015 * tall * Math.cos(2 * two * phase) : -0.006 * tall * breathe;
  const torsoBot = seated ? sole - 0.2 * HH + bob : sole - Bd.legs * HH + bob;
  const chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b, hipY = torsoBot - 0.12 * HH;
  const thick = thickAngle(light), ow = 5 * u, armCol = mix(o.jacket, INK, 0.5), footCol = o.boots;
  const legW = 5.8 * u, footW = 7.5 * u;
  const sway = mode === "march" ? 1.6 * Math.sin(two * phase) : mode === "stroll" ? 1.0 * Math.sin(two * phase) : 0.6 * Math.cos(two * br);
  const A = tilt + sway, bodyRot: number[] | null = A ? [rad(A), 300, hipY] : null;
  const T: Blob = { a: ((Bd.tw / 2) * W) / 1.06, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.6, egg: o.build === "stout" ? 0.17 : 0.12,
    asym: 0.04 * facing, rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 3 * u * facing, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  // ---- coat skirts (behind the legs) ----
  if (o.coat && !o.dress && !seated) {
    p.rot = bodyRot;
    for (const s of [-1, 1]) {
      const fl = mode === "march" || mode === "stroll" ? 6 * u * Math.max(0, Math.sin(two * phase) * s) : 0; // the skirt on the stepping side flares
      const sk: P2[] = [[tcx + s * 0.5 * T.a, hipY - 0.14 * HH], [tcx + s * 1.02 * T.a, hipY - 0.1 * HH], [tcx + s * (1.16 * T.a + fl), hipY + 0.6 * HH], [tcx + s * (0.62 * T.a + fl * 0.4), hipY + 0.56 * HH]];
      p.gradFill(sk, shade(o.jacket, 0.9), mul(o.jacket, SH_CLOTH), light); p.poly(sk, null, ow * 0.75);
    }
  }
  // ---- legs + feet (not rotated) ----
  p.rot = null;
  if (mode === "ride") {
    // astride: thighs splayed out and down both flanks, boots hanging (the horse's body covers the middle)
    for (const side of [-1, 1]) {
      const h: P2 = [300 + side * 16 * u, hipY], k: P2 = [300 + side * 50 * u, hipY + 0.32 * HH], f: P2 = [300 + side * 46 * u, hipY + 0.86 * HH];
      legStroke(p, o, curve(h, k, f), legW * 1.15);
      footStroke(p, [f[0] - side * 2 * u, f[1]], [f[0] + side * 10 * u, f[1] + 2 * u], footW, footCol);
    }
  } else if (mode === "sit") {
    for (const side of [-1, 1]) {
      const h: P2 = [300 + side * 15 * u, hipY], k: P2 = [300 + side * 36 * u, hipY + 0.2 * HH], f: P2 = [300 + side * 44 * u, sole - 8 * u];
      legStroke(p, o, curve(h, k, f), legW);
      footStroke(p, [f[0] - side * 2 * u, f[1]], [f[0] + side * 12 * u, f[1] - 5 * u], footW, footCol);
    }
  } else if (o.dress) {
    for (const side of [-1, 1]) {
      const fx = 300 + side * 12 * u, fy = sole - 4 * u;
      p.stroke([[fx, sole - 0.4 * HH], [fx + side * u, fy]], legW, mix(o.pants, INK, 0.55));
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 12 * u, fy + u], footW, footCol);
    }
  } else {
    const L = mode === "march" ? lift * 1.25 : mode === "stroll" ? lift * 0.55 : 0;
    for (const [side, ph] of [[-1, 0], [1, 0.5]] as const) {
      const up = Math.max(0, Math.sin(two * (phase + ph))) * L;
      const hx = 300 + side * 15 * u, fx = 300 + side * 22 * u, fy = sole - 4 * u - up;
      const k: P2 = [(hx + fx) / 2 + side * (1.5 * u + up * 0.16), (hipY + fy) / 2 - up * 0.08];
      legStroke(p, o, curve([hx, hipY], k, [fx, fy]), legW);
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 13 * u, fy + 0.5 * u], footW, footCol);
    }
  }
  // ---- upper body: rotates about the hips (tilt + a small weight-shift sway on every step) ----
  p.rot = bodyRot;
  const dress = !!o.dress && !seated;
  const sh = (side: number): P2 => [tcx + side * 0.85 * T.a, chin + 0.12 * HH];
  const hang = (side: number, fwd: number): [P2, P2, P2] => {
    const S = sh(side), ex = tcx + side * (1.12 * T.a + 4 * u);
    const hx = ex + side * 3 * u - side * 6 * u * Math.max(0, fwd) + side * 4 * u * Math.max(0, -fwd);
    return [S, [ex, S[1] + 0.48 * HH], [hx, chin + 1.04 * HH - Math.abs(fwd) * 9 * u]];
  };
  const arm = (side: number, Hd: P2, out = 14, down = 6): [P2, P2, P2] => {
    const S = sh(side);
    return [S, [(S[0] + Hd[0]) / 2 + side * out * u, (S[1] + Hd[1]) / 2 + down * u], Hd];
  };
  const blend = (a: [P2, P2, P2], b: [P2, P2, P2], k: number): [P2, P2, P2] => [lerp2(a[0], b[0], k), lerp2(a[1], b[1], k), lerp2(a[2], b[2], k)];
  const sw = mode === "march" || mode === "stroll" ? Math.sin(two * phase) : 0;
  type Arm = { pts: [P2, P2, P2]; layer: 0 | 1 | 2 };
  const arms: Arm[] = [], behind: (() => void)[] = [], mid: (() => void)[] = [], top: (() => void)[] = [], handsTop: P2[] = [];
  const both = (l: [P2, P2, P2], r: [P2, P2, P2], layer: 0 | 1 | 2 = 0) => arms.push({ pts: l, layer }, { pts: r, layer });
  const R0: P2 = [300 + 47 * u, torsoBot + 0.12 * HH], R1: P2 = [300 + 64 * u, crown - 0.32 * HH], ML = Math.hypot(R1[0] - R0[0], R1[1] - R0[1]);
  const bh = BARREL.h * MU, brm = BARREL.rMid * MU, bre = BARREL.rEnd * MU;
  const fs = facing || 1;
  switch (seated && pose === "hang" ? "sit" : pose) {
    case "sit":
      for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.1 * T.a + 6 * u), sh(side)[1] + 0.4 * HH], [tcx + side * (1.2 * T.a + 10 * u), torsoBot + 0.04 * HH]], layer: 0 });
      break;
    case "hold": case "raise": {
      const kk = pose === "hold" ? 0 : smooth01(pk);
      const hHold = lerp2(R0, R1, 0.1), hUp: P2 = [tcx + 1.25 * T.a + 14 * u, crown - 0.06 * HH];
      const Hd = lerp2(hHold, hUp, kk), ang = lerp(Math.atan2(R1[1] - R0[1], R1[0] - R0[0]), rad(-76 + 6 * (rnd(seed, 50) - 0.5)), kk), g = 0.1 + 0.22 * kk;
      const butt: P2 = [Hd[0] - Math.cos(ang) * ML * g, Hd[1] - Math.sin(ang) * ML * g], muz: P2 = [butt[0] + Math.cos(ang) * ML, butt[1] + Math.sin(ang) * ML];
      behind.push(() => drawMusket(p, butt, muz, u, light));
      mark1(p, "muzzle", muz[0], muz[1]);
      const holdArm: [P2, P2, P2] = [sh(1), [tcx + 1.12 * T.a + 5 * u, sh(1)[1] + 0.45 * HH], hHold];
      arms.push({ pts: blend(holdArm, arm(1, hUp, 10, -10), kk), layer: 0 });
      arms.push({ pts: alt === 1 ? blend(hang(-1, -sw), arm(-1, [tcx - 1.15 * T.a - 12 * u, crown + 0.02 * HH], 12, -8), kk) : hang(-1, -sw), layer: 0 });
      break;
    }
    case "fist":
      arms.push({ pts: blend(hang(1, sw), arm(1, [tcx + 1.1 * T.a + 12 * u, crown - 0.04 * HH], 12, -6), smooth01(pk)), layer: 0 }, { pts: hang(-1, -sw), layer: 0 });
      break;
    case "wave": {
      const S = sh(1), w = 2 * pk - 1, Hd: P2 = [tcx + 1.18 * T.a + 16 * u + 12 * u * w, S[1] - 0.6 * HH];
      arms.push({ pts: [S, [tcx + 1.1 * T.a + 10 * u + 3 * u * w, S[1] - 0.22 * HH], Hd], layer: 0 }, { pts: hang(-1, -sw), layer: 0 });
      if (alt === 1) mid.push(() => capInHand(p, Hd[0], Hd[1] - 4 * u, u));
      break;
    }
    case "hug": {
      const bc: P2 = [300 + 2 * u * facing, chin + 0.39 * HH + (CARRY * bh) / 2 - pk * 0.08 * MU];
      mid.push(() => { const b = drawBarrel(p, bc[0], bc[1], 0, light, CARRY, facing ? 0.3 * facing : 0.12); mark(p, "bung", b[0], b[1]); });
      // forearms wrap over the staves: elbows outside the belly, hands meeting on the front below the bung
      both(arm(-1, [bc[0] - 0.22 * CARRY * brm, bc[1] + 0.18 * CARRY * bh], 34, 10), arm(1, [bc[0] + 0.22 * CARRY * brm, bc[1] + 0.14 * CARRY * bh], 34, 10), 1);
      break;
    }
    case "overhead": {
      const bottom = crown - 0.05 * HH - pk * 0.08 * MU, ang = rad(13) * fs, bc: P2 = [300 + 0.05 * W * fs, bottom - (CARRY * bh) / 2];
      const hL: P2 = rotAbout([bc[0] - CARRY * bre - 3 * u, bottom - 0.14 * CARRY * bh], ang, bc), hR: P2 = rotAbout([bc[0] + CARRY * bre + 3 * u, bottom - 0.2 * CARRY * bh], ang, bc);
      both(arm(-1, hL, 14, 0), arm(1, hR, 14, 0), 0);
      top.push(() => { const b = drawBarrel(p, bc[0], bc[1], ang, light, CARRY, 0.8 * fs); mark(p, "bung", b[0], b[1]); });
      handsTop.push(hL, hR);
      break;
    }
    case "carrier":
      both(arm(-1, [tcx - 0.75 * T.a, crown - 0.1 * HH], 16, 0), arm(1, [tcx + 0.75 * T.a, crown - 0.1 * HH], 16, 0), 0);
      break;
    case "arms_open": {
      const k = smooth01(pk), hR: P2 = [tcx + 1.3 * T.a + 36 * u, chin - 0.3 * HH], hL: P2 = [tcx - 1.3 * T.a - 36 * u, chin - 0.26 * HH];
      both(blend(hang(-1, -sw), arm(-1, hL, 6, -12), k), blend(hang(1, sw), arm(1, hR, 6, -12), k), 0);
      if (alt === 1) { const Hd = lerp2(hang(1, sw)[2], hR, k); top.push(() => { const g = drawLantern(p, Hd[0], Hd[1], u); mark(p, "lantern", g[0], g[1]); }); handsTop.push(Hd); }
      break;
    }
    case "lantern": {
      const k = smooth01(pk), hUp: P2 = [tcx + 1.15 * T.a + 18 * u, crown + 0.03 * HH], hLow: P2 = [tcx + 1.2 * T.a + 8 * u, chin + 0.7 * HH];
      const Hd = lerp2(hLow, hUp, k);
      arms.push({ pts: arm(1, Hd, 12, 6 - 12 * k), layer: 0 });
      arms.push({ pts: alt === 1 ? arm(-1, [tcx - 1.1 * T.a - 12 * u, crown + 0.02 * HH], 12, -6) : hang(-1, -sw), layer: 0 });
      top.push(() => { const g = drawLantern(p, Hd[0], Hd[1], u); mark(p, "lantern", g[0], g[1]); });
      handsTop.push(Hd);
      break;
    }
    case "reach":
      both(arm(-1, [tcx - 0.45 * T.a, chin + 0.42 * HH], 18, 6), arm(1, [tcx + 0.45 * T.a, chin + 0.4 * HH], 18, 6), 1);
      break;
    case "push": { // front-view push: both hands out on the shaft ends toward screen side alt (-1 / 1); the caller tilts ~10 deg that way
      const d = alt < 0 ? -1 : 1;
      both(arm(-d, [tcx + d * (0.9 * T.a + 20 * u), chin + 0.66 * HH], 4, 10), arm(d, [tcx + d * (1.25 * T.a + 34 * u), chin + 0.6 * HH], 10, 8), 1);
      break;
    }
    case "torch": {
      // a pitch torch gripped a third of the way up, raised to the side; alt = shake (-1..1)
      const k = smooth01(pk), hLow: P2 = [tcx + fs * (1.2 * T.a + 8 * u), chin + 0.55 * HH], hUp: P2 = [tcx + fs * (1.15 * T.a + 20 * u), crown + 0.12 * HH];
      const Hd: P2 = [lerp2(hLow, hUp, k)[0] + fs * 10 * u * k, lerp2(hLow, hUp, k)[1]], ang = rad(-90 + fs * (22 - 4 * k) + 8 * alt);
      arms.push({ pts: arm(fs, Hd, 12, 8 - 16 * k), layer: 0 }, { pts: hang(-fs, -sw), layer: 0 });
      top.push(() => { const fl = drawTorch(p, Hd, ang, u); mark(p, "flame", fl[0], fl[1]); });
      handsTop.push(Hd);
      break;
    }
    case "point": {
      const k = smooth01(pk), Hd: P2 = lerp2(hang(fs, 0)[2], [tcx + fs * (1.3 * T.a + 46 * u), chin - 0.42 * HH], k);
      arms.push({ pts: blend(hang(fs, 0), arm(fs, Hd, 4, -4), k), layer: 0 }, { pts: hang(-fs, -sw), layer: 0 });
      break;
    }
    case "hold_up": {
      const Hd: P2 = opts.hand ?? [tcx + fs * (1.1 * T.a + 12 * u), hc + 0.1 * HH], sd = Hd[0] >= tcx ? 1 : -1;
      arms.push({ pts: arm(sd, Hd, 10, 10), layer: 2 }, { pts: hang(-sd, -sw), layer: 0 });
      break;
    }
    case "tiptoe":
      both(arm(-1, [tcx - 0.42 * T.a, chin + 0.2 * HH], 26, 16), arm(1, [tcx + 0.42 * T.a, chin + 0.16 * HH], 26, 16), 1);
      break;
    case "hat":
      arms.push({ pts: arm(fs, [300 + fs * 0.44 * W, crown + 0.22 * HH], 16, 18), layer: 2 }, { pts: hang(-fs, -sw), layer: 0 });
      break;
    case "scythe": {
      const Hd: P2 = [tcx + fs * (1.15 * T.a + 10 * u), chin + 0.5 * HH];
      behind.push(() => drawScythe(p, [Hd[0] + fs * 2 * u, sole - 6 * u], [Hd[0] + fs * 6 * u, crown - 0.45 * HH], u, -fs));
      arms.push({ pts: arm(fs, Hd, 10, 8), layer: 1 }, { pts: hang(-fs, -sw), layer: 0 });
      break;
    }
    case "talk": {
      const k = smooth01(pk), Hd: P2 = [tcx + fs * (1.2 * T.a + 22 * u), chin + (0.5 - 0.22 * k) * HH];
      arms.push({ pts: arm(fs, Hd, 8, 8), layer: 1 }, { pts: hang(-fs, -sw), layer: 0 });
      break;
    }
    case "reins":
      both(arm(-1, [tcx - 0.3 * T.a, torsoBot - 0.02 * HH], 20, 6), arm(1, [tcx + 0.3 * T.a, torsoBot - 0.04 * HH], 20, 6), 1);
      break;
    default:
      both(hang(-1, -sw), hang(1, sw), 0);
  }
  const drawArm = (a: Arm) => armStroke(p, o, a.pts, u, armCol);
  // ---- behind the body: musket, sword, arms ----
  for (const f of behind) f();
  if (o.sword && !seated) {
    const s0: P2 = [tcx - 0.75 * T.a, torsoBot - 0.2 * HH];
    p.band([s0, [s0[0] - Math.sin(rad(25)) * 0.8 * HH, s0[1] + Math.cos(rad(25)) * 0.8 * HH]], "#c9ccd2", 3 * u, 1.2 * u, "round");
  }
  if (o.cloak && !seated) { // hooded travelling cloak: a bell from the shoulders to the ankles, open at the front
    const ck: P2[] = chaikin([[300 - 0.32 * W, chin - 0.02 * HH], [300 + 0.32 * W, chin - 0.02 * HH], [300 + 0.62 * W + 4 * u * facing, sole - 0.3 * HH],
      [300 + 0.56 * W, sole - 0.14 * HH], [300 - 0.56 * W, sole - 0.14 * HH], [300 - 0.62 * W + 4 * u * facing, sole - 0.3 * HH]], 2);
    p.gradFill(ck, o.cloak, mul(o.cloak, SH_CLOTH), light); p.inkRing(ck, ow * 0.9, thick);
  }
  for (const a of arms) if (a.layer === 0) drawArm(a);
  // ---- torso / dress: shaded fill -> clothing clipped to it -> thick-thin ink ring ----
  if (dress) {
    const D: Blob = { a: 0.5 * W * 0.98, b: 0.5 * ((sole - 0.35 * HH) - (chin - 0.2 * HH)), nTop: 2.0, nBot: 2.4, egg: 0.3, asym: 0.03 * facing, rot: 0, noise: 0.006, seed: seed + 9 };
    const dcy = sole - 0.35 * HH - D.b, dp = blobPts(300, dcy, D);
    p.gradFill(dp, o.dress!, mul(o.dress!, SH_CLOTH), light);
    p.clip(dp, () => {
      if (o.stripes) for (let x = -0.55 * W; x <= 0.55 * W; x += 0.13 * W) p.stroke([[300 + x, dcy - D.b], [300 + x * 1.15, dcy + D.b]], 0.04 * W, o.stripes);
      if (o.apron) { const ap = rrect(300 - 0.3 * W + 3 * u * facing, chin + 0.62 * HH, 300 + 0.3 * W + 3 * u * facing, sole - 0.42 * HH, 10 * u); p.gradFill(ap, o.apron, mul(o.apron, SH_CLOTH), light); p.poly(ap, null, 1.8 * u); }
    });
    p.inkRing(dp, ow, thick);
    const Sw: Blob = { a: 0.37 * W, b: 0.3 * HH, nTop: 2.2, nBot: 2.4, egg: 0.1, asym: 0, rot: 0, noise: 0.006, seed: seed + 8 };
    const sp = blobPts(300, chin + 0.12 * HH, Sw);
    p.gradFill(sp, o.jacket, mul(o.jacket, SH_CLOTH), light);
    if (o.shawl) p.clip(sp, () => p.poly([[300 - 0.42 * W, chin - 0.04 * HH], [300 + 0.42 * W, chin - 0.04 * HH], [300 + 4 * u * facing, chin + 0.36 * HH]], o.shawl!, 1.6 * u));
    p.inkRing(sp, ow * 0.9, thick);
  } else {
    p.gradFill(tp, o.jacket, mul(o.jacket, SH_CLOTH), light);
    const bx = tcx + 2 * u * facing;
    p.clip(tp, () => {
      if (o.waistcoat) {
        const wc: P2[] = [[bx - 0.36 * T.a, chin - 0.1 * HH], [bx + 0.36 * T.a, chin - 0.1 * HH], [bx + 0.3 * T.a, torsoBot + 0.05 * HH], [bx - 0.3 * T.a, torsoBot + 0.05 * HH]];
        p.gradFill(wc, o.waistcoat, mul(o.waistcoat, SH_CLOTH), light); p.poly(wc, null, 1.8 * u);
      }
      if (o.shirt) p.poly([[bx - 0.3 * T.a, chin - 0.06 * HH], [bx + 0.3 * T.a, chin - 0.06 * HH], [bx + 2 * u * facing, chin + 0.3 * HH]], "#f4f0e6", 1.6 * u);
      if (o.collar) p.band([[tcx - 0.7 * T.a, chin + 0.03 * HH], [tcx + 0.7 * T.a, chin + 0.03 * HH]], o.collar, 0.09 * HH, 1.5 * u);
      if (o.belt) {
        for (const s of [-1, 1]) p.band([[tcx - s * 0.75 * T.a, chin - 0.05 * HH], [tcx + s * 0.8 * T.a, torsoBot - 0.1 * HH]], o.belt!, 5.5 * u, 1.8 * u);
        const xc = tcx + 0.025 * T.a, yc = chin - 0.05 * HH + (torsoBot - 0.1 * HH - (chin - 0.05 * HH)) * (0.75 / 1.55);
        p.poly(box(xc - 3.5 * u, yc - 3.5 * u, xc + 3.5 * u, yc + 3.5 * u), "#d9dde0", 1.5 * u);
      }
      if (o.sash) p.band([[tcx - 1.3 * T.a, torsoBot - 0.32 * HH], [tcx + 1.3 * T.a, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
      if (o.patch) { const px = tcx - 0.45 * T.a, py = torsoBot - 0.38 * HH; p.poly(box(px - 7 * u, py - 6 * u, px + 7 * u, py + 6 * u), o.patch, 1.4 * u); }
      if (o.smudge) { p.ell(tcx + 0.4 * T.a, chin + 0.5 * HH, 6 * u, 4 * u, "#2b2533", 0, 0, 360, -20); p.ell(tcx - 0.2 * T.a, chin + 0.78 * HH, 4 * u, 3 * u, "#2b2533", 0); }
      for (let i = 0; i < 4; i++) {
        const y = chin + 0.12 * HH + i * 0.2 * HH;
        if (o.sash && Math.abs(y - (torsoBot - 0.32 * HH)) < 0.08 * HH) continue;
        if (o.shirt && !o.waistcoat && i === 0) continue;
        p.dot(bx, y, 3 * u, INK); p.dot(bx, y, 2.2 * u, o.buttons ?? shade(o.waistcoat ?? o.jacket, 0.7));
      }
    });
    if (o.sash) { p.poly([[tcx + fs * 0.55 * T.a, torsoBot - 0.3 * HH], [tcx + fs * 0.75 * T.a, torsoBot + 0.05 * HH], [tcx + fs * 0.45 * T.a, torsoBot + 0.02 * HH]], o.sash, 1.6 * u); }
    p.inkRing(tp, ow, thick);
    if (o.cordon || o.trim) p.clip(tp, () => {
      if (o.trim) for (const s of [-1, 1]) p.stroke([[bx + s * 0.37 * T.a, chin - 0.08 * HH], [bx + s * 0.31 * T.a, torsoBot + 0.04 * HH]], 3 * u, o.trim!);
      if (o.cordon) p.band([[tcx + 0.95 * T.a, chin + 0.02 * HH], [tcx - 0.9 * T.a, torsoBot - 0.12 * HH]], o.cordon!, 0.075 * HH, 1.3 * u);
    });
    if (o.star) { const st: P2[] = []; const sx0 = tcx - 0.52 * T.a, sy0 = chin + 0.42 * HH; for (let i = 0; i < 16; i++) { const r = (i % 2 ? 3.2 : 8) * u, a2 = (i / 16) * Math.PI * 2 - Math.PI / 2; st.push([sx0 + r * Math.cos(a2), sy0 + r * Math.sin(a2)]); } p.poly(st, "#f2f0ea", 1.2 * u); }
    if (o.jabot) { // a lace cascade: one wavy-edged fall of linen with two soft fold lines
      const jy = chin - 0.02 * HH, jl: P2[] = [[bx - 7 * u, jy], [bx + 7 * u, jy], [bx + 10 * u, jy + 0.12 * HH], [bx + 6 * u, jy + 0.2 * HH], [bx + 9 * u, jy + 0.28 * HH], [bx, jy + 0.34 * HH], [bx - 9 * u, jy + 0.28 * HH], [bx - 6 * u, jy + 0.2 * HH], [bx - 10 * u, jy + 0.12 * HH]];
      p.poly(chaikin(jl, 2), "#f9f6ee", 1.5 * u);
      for (const k of [0.12, 0.22]) p.stroke(curve([bx - 5 * u, jy + k * HH], [bx, jy + (k + 0.03) * HH], [bx + 5 * u, jy + k * HH], 5), 1 * u, "#cfc6b8");
    }
  }
  // ---- in front of the body: barrels, portrait, basket, then the arms holding them ----
  for (const f of mid) f();
  for (const a of arms) if (a.layer === 1) drawArm(a);
  // ---- head: rotates with the body, plus its own tilt about the chin ----
  const Ah = A + headTilt, [cpx, cpy] = rotAbout([300, chin], rad(A), [300, hipY]);
  p.rot = Ah ? [rad(Ah), 300, chin, cpx - 300, cpy - chin] : null;
  hatBehind(p, o, H, 300, hc, light, thick, ow, false);
  if (o.king) { // the royal double chin: a soft roll peeking under the jaw
    const jw = ellPts(300 + 5 * u * facing, hc + 0.9 * H.b, 0.56 * H.a, 0.2 * H.b);
    p.shadedFill(jw, skin, mul(skin, SH_SKIN), light, 0.6 * H.a); p.inkRing(jw, ow * 0.8, thick);
  }
  const hp = blobPts(300, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  if (o.wig && o.hat !== "round") wigOn(p, o, hp, H, 300, hc, light, facing, false);
  hatOn(p, o, hp, H, 300, hc, light, seed, facing, false);
  EYE_UP = opts.eyeUp ?? 0;
  faceFront(p, 300, hc, W, expr, facing, look, lid, BRIMMED.has(o.hat ?? ""), skin, o.moustache, o.build === "stout", o);
  EYE_UP = 0;
  if (o.king) { // the big Bourbon nose between the eyes and the mouth, plus the jowl creases
    // the big Bourbon nose: a long bridge down from between the brows to a heavy round tip that hangs below the eyes
    // (never a bulb AT eye level: that read as a monocle), two nostril wings; the identity of the profile, seen front on
    const sd = facing || 1, nx = 300 + 7.5 * u * facing + 1.5 * u * sd, ty = hc + 9.5 * u;
    p.stroke(curve([nx - 0.5 * u * sd, hc - 2.5 * u], [nx + 3.5 * u * sd, hc + 1.5 * u], [nx + 5 * u * sd, ty - 2.5 * u], 8), 2.2 * u); // the bridge (shadow side)
    const tip = ellPts(nx + 0.5 * u * sd, ty, 6.6 * u, 5 * u);
    p.shadedFill(tip, mul(skin, [0.98, 0.93, 0.91]), mul(skin, SH_SKIN), light, 6 * u);
    p.arc(nx + 0.5 * u * sd, ty, 6.6 * u, 5 * u, sd > 0 ? -45 : 45, sd > 0 ? 200 : 225, 2.3 * u); // the round tip's lower outline
    p.ell(nx - 2 * u * sd, ty - 2 * u, 1.7 * u, 1.1 * u, mix(skin, "#ffffff", 0.55), 0); // a highlight
    p.dot(nx - 2.2 * u, ty + 3.1 * u, 1.1 * u); p.dot(nx + 3.2 * u, ty + 3.1 * u, 1.1 * u); // nostrils
    for (const sd of [-1, 1]) p.arc(300 + sd * 30 * u + 6 * u * facing, hc + 26 * u, 8 * u, 10 * u, sd > 0 ? 200 : 270, sd > 0 ? 270 : 340, 2 * u);
  }
  if (!ANCH || !ANCH.mouth) mark1(p, "mouth", 300 + 8 * u * facing, hc + 20 * u);
  // ---- props held up in front of everything ----
  p.rot = bodyRot;
  for (const a of arms) if (a.layer === 2) drawArm(a);
  for (const f of top) f();
  for (const [x, y] of handsTop) handDot(p, o, x, y, u);
  p.rot = null;
};

export type SideOpts = {
  phase?: number; expr?: Expr; mode?: "march" | "stand" | "push" | "sit" | "ride" | "mount"; blink?: boolean | number; stomp?: number;
  /** pose "hold_up": the hand's design point; look: pupils slide (-1 back .. 1 front) */ hand?: P2; look?: number;
  /** step length as a multiple of 0.8 m (370 units): matches 1.6 m/s at 2 steps/s; scale by the view's foreshortening */
  stride?: number; light?: number; seed?: number; pose?: Pose; pk?: number; alt?: number; headTilt?: number; noHat?: boolean; eyeUp?: number;
  /** idle breathing phase 0..1 (standing / seated) */ breath?: number;
  /** ease the arms in from another pose (k 0 = that pose .. 1 = this one) */ from?: { pose: Pose; pk?: number; k: number };
  /** extra forward lean of the upper body (degrees): ducking into a doorway */ lean?: number;
  /** mode "mount": k 0..0.86 (foot to the stirrup, rise, the far leg over the croup, down into the seat) and the
   *  horse's design heights on this card: stirrup tread, saddle seat (torso bottom), back line (far-leg clip) */
  mount?: { k: number; stirrup: number; seat: number; back: number };
};

/** two-bone leg, knee bending forward (+x) */
const ik = (hip: P2, ank: P2, l1: number, l2: number): P2 => {
  const dx = ank[0] - hip[0], dy = ank[1] - hip[1], d = clamp(Math.hypot(dx, dy), 1, l1 + l2 - 0.01);
  const A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), k = Math.atan2(dy, dx) - A;
  return [hip[0] + l1 * Math.cos(k), hip[1] + l1 * Math.sin(k)];
};

/** side view facing screen-right; march footfalls land at phase 0 (near foot) and 0.5 (far foot), like the front view.
 *  The stance foot is planted: it slides back at exactly the walking speed while the hip rises and falls over it. */
export const bodySide = (p: Pen, o0: Outfit, opts: SideOpts) => {
  const { phase = 0, expr = "neutral", mode = "march", blink = false, stomp = 1, stride = 1, light = DEF_LIGHT, seed = 1, alt = 0, headTilt = 0 } = opts;
  const o: Outfit = opts.noHat ? { ...o0, hat: null } : o0;
  const pose: Pose = opts.pose ?? (mode === "push" ? "push" : o.rifle ? "hold" : "hang"), pk = clamp(opts.pk ?? 1, 0, 1);
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  const H: Blob = { ...headBlob(seed, Bd.a, 1), asym: 0.12, rot: rad(3 + 3 * (rnd(seed, 7) - 0.5)) };
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, sole = 975, ankY = sole - 4 * u;
  const thick = thickAngle(light), ow = 5 * u;
  const legLen = (Bd.legs + 0.12) * HH - 4 * u, l1 = legLen / 2, l2 = legLen / 2;
  const footCol = o.boots;
  type LegS = { ank: P2; pitch: number; near: boolean; clipY?: number };
  const legs: LegS[] = [];
  let hipY = ankY - legLen * 0.995, lean = 0, nearFwd = 0;
  if (mode === "march") {
    const S = 370 * stride, liftH = Math.max(22, 40 + 70 * (stomp - 1));
    const st = (ph: number) => {
      const c = (((phase + ph) % 1) + 1) % 1;
      if (c < 0.5) { const s = c / 0.5; return { x: S / 2 - S * s, h: 0, stance: true, s }; }
      const s = (c - 0.5) / 0.5; // swing: cycloid in world space, so the foot leaves and lands at zero ground speed
      return { x: -S / 2 + S * s - (S / Math.PI) * Math.sin(2 * Math.PI * s), h: liftH * Math.sin(Math.PI * s), stance: false, s };
    };
    const nL = st(0), fL = st(0.5), stance = nL.stance ? nL : fL;
    const Leff = legLen * (1 - 0.035 * Math.sin(Math.PI * stance.s));
    hipY = ankY - Math.sqrt(Math.max(1, Leff * Leff - stance.x * stance.x));
    for (const [L, near] of [[fL, false], [nL, true]] as const)
      legs.push({ ank: [300 + L.x, ankY - L.h], pitch: L.stance ? 0 : rad(35 * Math.sin(Math.PI * L.s) * (1 - 1.6 * L.s)), near });
    lean = (pose === "push" ? 13 : pose === "hang" || pose === "hold" ? 4 : 2) + 3 * Math.cos(2 * two * phase); // 7 deg at contact, 1 deg at passing
    nearFwd = nL.x / (S / 2);
  } else if (mode === "sit" || mode === "ride") {
    // seat at sole - 0.2 HH (same as the front view): thighs forward (sit) or down the flank into the stirrup (ride)
    hipY = sole - 0.32 * HH;
    legs.push(mode === "sit"
      ? { ank: [300 + 0.62 * legLen, hipY + 0.55 * legLen], pitch: 0, near: true }
      : { ank: [300 + 0.14 * legLen, hipY + 0.86 * legLen], pitch: rad(-6), near: true });
    lean = mode === "ride" ? 4 : 0;
  } else if (mode === "mount" && opts.mount) {
    // A (k 0-.3) the near foot up into the stirrup, a little crouch; B (.3-.58) standing up in the stirrup, the far foot
    // leaves the ground and hangs; C (.58-.86) the far leg swings back, up over the croup and down the far side (clipped
    // at the horse's back line once it is over), the hip lands on the seat; at .86 the horse card's rider takes over
    // with exactly this pose (ride mode)
    const M4 = opts.mount, m = M4.k / 0.86, A = smooth01(m / 0.35), Bk = smooth01((m - 0.35) / 0.32), Ck = smooth01((m - 0.67) / 0.33);
    const hip0 = ankY - legLen * 0.995, hipA = hip0 + 0.05 * legLen * A, hipS = M4.stirrup - 0.97 * legLen, hipR = M4.seat - 0.12 * HH;
    hipY = Ck > 0 ? lerp(hipS, hipR, Ck) : lerp(hipA, hipS, Bk);
    const stir: P2 = [300 + 0.12 * legLen, M4.stirrup], rideA: P2 = [300 + 0.14 * legLen, hipY + 0.86 * legLen];
    const lift = 60 * Math.sin(Math.PI * A) * (1 - Bk);
    const nearA: P2 = Ck > 0 ? lerp2(stir, rideA, Ck) : A < 1 ? [lerp(300 + 8 * u, stir[0], A), lerp(ankY, stir[1], A) - lift] : stir;
    const hang: P2 = [300 - 0.1 * legLen, hipY + 0.93 * legLen], ground: P2 = [300 - 14 * u, ankY];
    const th = rad(20 + 125 * Math.sin(Math.PI * Ck)), swing: P2 = [300 - Math.sin(th) * 0.93 * legLen, hipY + Math.cos(th) * 0.93 * legLen];
    const farA: P2 = Ck > 0 ? swing : [lerp(ground[0], hang[0], Bk), Math.min(ankY, lerp(ground[1], hang[1], Bk))];
    legs.push({ ank: farA, pitch: Ck > 0 ? rad(50) : rad(40 * Bk), near: false, clipY: Ck > 0.5 ? M4.back : undefined },
      { ank: nearA, pitch: Ck > 0 ? rad(-6 * Ck) : 0, near: true });
    lean = 3 + 15 * Bk * (1 - Ck) + 1 * Ck;
  } else if (mode === "push") {
    hipY = ankY - 0.87 * legLen;
    legs.push({ ank: [300 - 0.5 * legLen, ankY], pitch: rad(-8), near: false }, { ank: [300 + 0.32 * legLen, ankY], pitch: 0, near: true });
    lean = 14 * pk;
  } else {
    legs.push({ ank: [300 - 14 * u, ankY], pitch: 0, near: false }, { ank: [300 + 8 * u, ankY], pitch: 0, near: true }); // feet apart (boots too): never a peg leg
  }
  if (pose === "aim_up") lean -= 4;
  lean += opts.lean ?? 0;
  if (mode === "stand" || mode === "sit" || mode === "ride") { const br = Math.sin(Math.PI * 2 * (opts.breath ?? 0)); hipY -= 0.006 * (Bd.legs + Bd.torso + 1) * HH * br; lean += 0.5 * br; }
  const torsoBot = hipY + 0.12 * HH, chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b, hip: P2 = [300, hipY];
  const T: Blob = { a: (o.build === "stout" ? 0.36 : 0.31) * W, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.5, egg: 0.1, asym: 0.06,
    rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 2 * u, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const bodyRot: number[] | null = lean ? [rad(lean), 300, hipY] : null;
  if (o.cloak && mode !== "sit" && mode !== "ride") { // the hooded cloak hangs behind the body to the ankles
    p.rot = bodyRot;
    const sx = mode === "march" ? 10 * u * Math.sin(two * phase) : 0;
    const ck: P2[] = chaikin([[tcx + 0.5 * T.a, chin - 0.04 * HH], [tcx + 0.95 * T.a + 0.24 * HH + sx, sole - 0.16 * HH], [tcx - 1.3 * T.a - 0.26 * HH + sx, sole - 0.12 * HH], [tcx - 0.9 * T.a, chin]], 2);
    p.gradFill(ck, o.cloak, mul(o.cloak, SH_CLOTH), light); p.poly(ck, null, ow * 0.9);
  }
  // coat tail behind the hips
  if (o.coat && !o.dress) {
    p.rot = bodyRot;
    const sw = mode === "march" ? 9 * u * Math.sin(two * (phase - 0.15) * 2) : 0; // tails flick back on each step
    const sk: P2[] = [[tcx - 0.1 * T.a, hipY - 0.14 * HH], [tcx - 0.95 * T.a, hipY - 0.1 * HH], [tcx - 1.25 * T.a - Math.abs(sw), hipY + 0.55 * HH - 0.3 * Math.abs(sw)], [tcx - 0.45 * T.a - 0.4 * Math.abs(sw), hipY + 0.58 * HH]];
    p.gradFill(sk, shade(o.jacket, 0.85), mul(o.jacket, SH_CLOTH), light); p.poly(sk, null, ow * 0.75);
  }
  p.rot = null;
  for (const L of legs) {
    const knee = ik(hip, L.ank, l1, l2);
    const hp0: P2 = [300 + (L.near ? 2 * u : -9 * u), hipY];
    const draw1 = () => {
      legStroke(p, o, [hp0, knee, L.ank], 5.8 * u, !L.near);
      const c = Math.cos(L.pitch), s = Math.sin(L.pitch);
      footStroke(p, [L.ank[0] - 3 * u * c, L.ank[1] - 3 * u * s], [L.ank[0] + 13 * u * c, L.ank[1] + 13 * u * s + 0.5 * u],
        7.5 * u, L.near ? footCol : footCol === INK ? INK : shade(footCol, 0.82));
    };
    if (L.clipY !== undefined) p.clip(box(-400, -CARD_TOP - 400, 1000, L.clipY), draw1); else draw1(); // over the croup: the part behind the horse is hidden
  }
  // skirt over the legs (women in profile), swinging a little with the step
  if (o.dress && mode !== "sit" && mode !== "ride") {
    const sx = mode === "march" ? 8 * u * Math.sin(two * phase) : 0, y0 = torsoBot - 0.3 * HH, y1 = sole - 0.34 * HH;
    const hemF = tcx + 1.1 * T.a + 0.36 * HH + sx, hemB = tcx - 1.0 * T.a - 0.3 * HH + sx;
    const sk: P2[] = chaikin([[tcx - 0.9 * T.a, y0], [tcx + 0.95 * T.a, y0], [tcx + 1.05 * T.a + 0.2 * HH + sx * 0.5, (y0 + y1) / 2], [hemF, y1 - 0.02 * HH],
      [(hemF + hemB) / 2, y1 + 0.04 * HH], [hemB, y1 - 0.02 * HH], [tcx - 1.0 * T.a - 0.16 * HH + sx * 0.5, (y0 + y1) / 2]], 3); // a round bell, a curved hem
    p.gradFill(sk, o.dress, mul(o.dress, SH_CLOTH), light);
    p.clip(sk, () => {
      if (o.stripes) for (let x = -0.8 * W; x <= 0.8 * W; x += 0.13 * W) p.stroke([[tcx + x * 0.6, y0], [tcx + x + sx, y1]], 0.04 * W, o.stripes);
      if (o.apron) { const ap: P2[] = [[tcx + 0.2 * T.a, y0], [tcx + 1.0 * T.a, y0], [tcx + 0.95 * T.a + 0.3 * HH + sx, y1 - 0.08 * HH], [tcx + 0.3 * T.a + sx, y1 - 0.08 * HH]]; p.poly(ap, o.apron, 1.6 * u); }
    });
    p.poly(sk, null, ow * 0.9);
  }
  // ---- upper body leans about the hip ----
  p.rot = bodyRot;
  const armCol = mix(o.jacket, INK, 0.5), farArm = mix(o.jacket, INK, 0.68);
  const S: P2 = [tcx + 0.05 * T.a, chin + 0.14 * HH], aLen = 0.95 * HH;
  const swingArm = (ang: number): [P2, P2, P2] => {
    const e: P2 = [S[0] + Math.sin(ang) * aLen * 0.5, S[1] + Math.cos(ang) * aLen * 0.5], a2 = ang + rad(16) * Math.sign(ang || 1);
    return [S, e, [e[0] + Math.sin(a2) * aLen * 0.5, e[1] + Math.cos(a2) * aLen * 0.5]];
  };
  const reachTo = (Hd: P2, bend = 0.12): [P2, P2, P2] => [S, [(S[0] + Hd[0]) / 2 - bend * HH * 0.3, (S[1] + Hd[1]) / 2 + bend * HH], Hd];
  const ML = 0.97 * Math.hypot(64 * u - 47 * u, (crown - 0.32 * HH) - (torsoBot + 0.12 * HH));
  const bh = BARREL.h * MU, brm = BARREL.rMid * MU;
  const mid: (() => void)[] = [], top: (() => void)[] = [], handsTop: P2[] = [];
  let ht = headTilt;
  type ArmSet = { near: [P2, P2, P2]; far: [P2, P2, P2] | null; nearTop: boolean };
  /** both arms for a pose; props = also queue the pose's props (only for the pose actually shown) */
  const armsOf = (pose: Pose, pk: number, props: boolean): ArmSet => {
    let near: [P2, P2, P2] = swingArm(rad(-30) * nearFwd), far: [P2, P2, P2] | null = mode === "march" ? swingArm(rad(30) * nearFwd) : null;
    let nearTop = false;
    switch (pose) {
      case "push": {
        const reach = 0.55 * HH + 0.45 * HH * pk, hN: P2 = [S[0] + reach, S[1] + 0.06 * HH];
        near = [S, [(S[0] + hN[0]) / 2, (S[1] + hN[1]) / 2 + 0.06 * HH], hN];
        far = [S, [(S[0] + hN[0]) / 2 - 4 * u, (S[1] + hN[1]) / 2 - 0.02 * HH], [hN[0] - 6 * u, hN[1] - 0.08 * HH]];
        break;
      }
      case "hold": {
        const B0: P2 = [tcx + 0.72 * T.a, chin + 0.58 * HH], B1: P2 = [tcx - 0.95 * T.a - 22 * u, crown - 0.4 * HH];
        near = [S, [S[0] - 4 * u, S[1] + 0.42 * HH], B0];
        far = mode === "march" ? swingArm(rad(30) * nearFwd) : swingArm(0);
        props && mid.push(() => { drawMusket(p, [B0[0] + 5 * u, B0[1] + 0.07 * HH], B1, u, light); mark1(p, "muzzle", B1[0], B1[1]); });
        break;
      }
      case "aim_up": {
        const ang = rad(-60), dx = Math.cos(ang), dy = Math.sin(ang), butt: P2 = [S[0] + 0.15 * T.a, S[1] + 0.03 * HH];
        const at = (s: number, n: number): P2 => [butt[0] + dx * ML * s - dy * n, butt[1] + dy * ML * s + dx * n];
        const gN = at(0.2, 5 * u), gF = at(0.46, 4 * u), muz = at(1, 0);
        near = [S, [S[0] + 4 * u, S[1] + 0.3 * HH], gN];
        far = [S, [S[0] + 0.3 * HH, S[1] + 0.14 * HH], gF];
        nearTop = true; if (props) ht -= 8;
        props && top.push(() => { drawMusket(p, butt, muz, u, light); mark1(p, "muzzle", muz[0], muz[1]); });
        props && handsTop.push(gN, gF);
        break;
      }
      case "raise": { // musket held up, muzzle up (crowd seen in profile)
        const Hd: P2 = [S[0] + 0.14 * HH, crown - 0.04 * HH], ang = rad(-76), butt: P2 = [Hd[0] - Math.cos(ang) * ML * 0.32, Hd[1] - Math.sin(ang) * ML * 0.32];
        const muz: P2 = [butt[0] + Math.cos(ang) * ML, butt[1] + Math.sin(ang) * ML];
        near = reachTo(Hd, -0.12); nearTop = true;
        props && top.push(() => { drawMusket(p, butt, muz, u, light); mark1(p, "muzzle", muz[0], muz[1]); });
        props && handsTop.push(Hd);
        break;
      }
      case "carrier":
        // hands up at shoulder height, holding the rider's knees
        near = reachTo([S[0] + 0.24 * HH, chin - 0.12 * HH], -0.05); far = reachTo([S[0] + 0.16 * HH, chin - 0.22 * HH], -0.05);
        break;
      case "shoulder": {
        const bc: P2 = [Math.max(CARRY * brm + 6, tcx - 0.62 * CARRY * bh), S[1] - CARRY * brm * 0.95];
        far = mode === "march" ? swingArm(rad(30) * nearFwd) : swingArm(0);
        const Hd: P2 = [bc[0] + 0.32 * CARRY * bh, bc[1] + 0.25 * CARRY * brm];
        near = reachTo(Hd, -0.1); nearTop = true;
        props && top.push(() => { const b = drawBarrel(p, bc[0], bc[1], Math.PI / 2, light, CARRY, 0); mark(p, "bung", b[0], b[1]); });
        props && handsTop.push(Hd);
        break;
      }
      case "hug": {
        const bc: P2 = [tcx + 0.45 * T.a + CARRY * brm * 0.95, chin + 0.06 * HH + (CARRY * bh) / 2];
        props && mid.push(() => { const b = drawBarrel(p, bc[0], bc[1], 0, light, CARRY, -0.2); mark(p, "bung", b[0], b[1]); });
        near = reachTo([bc[0] + 0.1 * CARRY * brm, bc[1] + 0.05 * CARRY * bh], 0.1); far = reachTo([bc[0] + 0.55 * CARRY * brm, bc[1] - 0.12 * CARRY * bh], 0.05);
        break;
      }
      case "reach":
        near = reachTo([S[0] + 0.52 * HH, S[1] + 0.14 * HH + 0.1 * HH * (1 - pk)], 0.1); far = reachTo([S[0] + 0.46 * HH, S[1] + 0.06 * HH + 0.1 * HH * (1 - pk)], 0.08);
        break;
      case "wave": {
        const w = 2 * pk - 1; near = reachTo([S[0] + 0.12 * HH + 12 * u * w, S[1] - 0.62 * HH], -0.15);
        if (alt === 1) props && top.push(() => capInHand(p, near[2][0], near[2][1] - 4 * u, u));
        nearTop = alt === 1;
        break;
      }
      case "fist":
        near = reachTo([S[0] + 0.12 * HH, crown - 0.04 * HH], -0.12);
        break;
      case "lantern": { // pk 1 held up by the head .. 0 carried low at the hip, the arm hanging forward
        const Hd: P2 = lerp2([S[0] + 0.2 * HH, S[1] + 0.62 * HH], [S[0] + 0.26 * HH, crown + 0.06 * HH], smooth01(pk));
        near = reachTo(Hd, -0.1); nearTop = true;
        props && top.push(() => { const g = drawLantern(p, Hd[0], Hd[1], u); mark(p, "lantern", g[0], g[1]); });
        props && handsTop.push(Hd);
        break;
      }
      case "torch": {
        // held up BEHIND the head (the shaft never crosses the face), leaning back
        const k = smooth01(pk), Hd: P2 = lerp2([S[0] - 0.12 * HH, S[1] + 0.3 * HH], [S[0] - 0.3 * HH, crown + 0.1 * HH], k), ang = rad(-104 - 6 * k + 8 * alt);
        near = reachTo(Hd, -0.1); nearTop = false;
        props && top.push(() => { const fl = drawTorch(p, Hd, ang, u); mark(p, "flame", fl[0], fl[1]); });
        props && handsTop.push(Hd);
        break;
      }
      case "point": {
        const k = smooth01(pk);
        near = [S, [S[0] + 0.3 * HH * k, S[1] + 0.3 * HH * (1 - k) - 0.06 * HH * k], [S[0] + 0.62 * HH * k + 0.05 * HH, S[1] + 0.55 * HH * (1 - k) - 0.14 * HH * k]];
        nearTop = true;
        break;
      }
      case "hold_up": {
        // a raised hand: the elbow goes FORWARD at chest height and the forearm rises from there, so the arm never starts at
        // the mouth or crosses the face; a low hand (at rest) keeps a hanging upper arm
        const Hd: P2 = opts.hand ?? [S[0] + 0.5 * HH, hc + 0.1 * HH];
        const up = clamp((S[1] + 0.22 * HH - Hd[1]) / (0.34 * HH), 0, 1), lowE: P2 = [(S[0] + Hd[0]) / 2 - 0.04 * HH, (S[1] + Hd[1]) / 2 + 0.12 * HH];
        const fwdE: P2 = [S[0] + Math.max(0.3 * HH, 0.55 * (Hd[0] - S[0])), S[1] + 0.1 * HH];
        near = [S, lerp2(lowE, fwdE, smooth01(up)), Hd]; nearTop = true;
        break;
      }
      case "tiptoe":
        near = [S, [S[0] - 4 * u, S[1] + 0.34 * HH], [S[0] + 0.24 * HH, S[1] + 0.12 * HH]];
        far = [S, [S[0] - 8 * u, S[1] + 0.3 * HH], [S[0] + 0.2 * HH, S[1] + 0.06 * HH]];
        break;
      case "hat": // hand at the back of the brim, the arm behind the head
        near = reachTo([tcx - 0.5 * W, crown + 0.2 * HH], -0.25);
        break;
      case "scythe": { // mowing: the snath across the body, both hands on it, the blade sweeping low in front
        const sw2 = rad(40 + 30 * (pk - 0.5)), L = 1.45 * MU, top0: P2 = [S[0] - 0.3 * HH, S[1] - 0.42 * HH];
        const foot: P2 = [top0[0] + L * Math.cos(sw2), top0[1] + L * Math.sin(sw2)];
        const hA = lerp2(top0, foot, 0.22), hB = lerp2(top0, foot, 0.45);
        near = reachTo(hB, 0.05); far = reachTo(hA, 0.02); nearTop = true;
        props && top.push(() => drawScythe(p, foot, top0, u, 1));
        props && handsTop.push(hA, hB);
        break;
      }
      case "talk": {
        const k = smooth01(pk);
        near = [S, [S[0] + 0.06 * HH, S[1] + 0.4 * HH], [S[0] + 0.42 * HH, S[1] + (0.36 - 0.2 * k) * HH]]; nearTop = true;
        break;
      }
      case "reins":
        near = [S, [S[0] - 2 * u, S[1] + 0.36 * HH], [S[0] + 0.36 * HH, S[1] + 0.42 * HH]];
        far = [S, [S[0] - 6 * u, S[1] + 0.32 * HH], [S[0] + 0.3 * HH, S[1] + 0.38 * HH]];
        break;
      default: break;
    }
    return { near, far, nearTop };
  };
  let { near, far, nearTop } = armsOf(pose, pk, true);
  if (mode === "mount" && opts.mount) { // both hands on the saddle (they stay there as he rises), then onto the reins
    const M4 = opts.mount, m = M4.k / 0.86, Ck = smooth01((m - 0.67) / 0.33), Hs: P2 = [300 + 0.16 * HH, M4.seat - 0.05 * HH];
    const R = armsOf("reins", 1, false), sad: [P2, P2, P2] = reachTo(Hs, 0.1), sadF: [P2, P2, P2] = reachTo([Hs[0] - 0.08 * HH, Hs[1] + 0.02 * HH], 0.08);
    const L3 = (a: [P2, P2, P2], b: [P2, P2, P2]): [P2, P2, P2] => [lerp2(a[0], b[0], Ck), lerp2(a[1], b[1], Ck), lerp2(a[2], b[2], Ck)];
    near = L3(sad, R.near); far = L3(sadF, R.far ?? sadF); nearTop = true;
  }
  if (opts.from && opts.from.k < 1) { // ease from the previous pose's arms (never a one-frame pose snap)
    const A0 = armsOf(opts.from.pose, clamp(opts.from.pk ?? 1, 0, 1), false), tk = smooth01(opts.from.k), rest = swingArm(0);
    const L3 = (a: [P2, P2, P2], b: [P2, P2, P2]): [P2, P2, P2] => [lerp2(a[0], b[0], tk), lerp2(a[1], b[1], tk), lerp2(a[2], b[2], tk)];
    near = L3(A0.near, near); far = far || A0.far ? L3(A0.far ?? rest, far ?? rest) : null; nearTop = tk < 0.5 ? A0.nearTop : nearTop;
  }
  if (far) armStroke(p, o, far, u, farArm);
  p.gradFill(tp, o.jacket, mul(o.jacket, SH_CLOTH), light);
  p.clip(tp, () => {
    if (o.waistcoat) p.poly([[tcx + 0.55 * T.a, chin - 0.1 * HH], [tcx + 1.2 * T.a, chin], [tcx + 1.2 * T.a, torsoBot], [tcx + 0.62 * T.a, torsoBot + 0.04 * HH]], o.waistcoat, 1.6 * u);
    if (o.shirt) p.poly([[tcx + 0.5 * T.a, chin - 0.08 * HH], [tcx + 1.2 * T.a, chin - 0.08 * HH], [tcx + 0.95 * T.a, chin + 0.28 * HH]], "#f4f0e6", 1.5 * u);
    if (o.collar) p.band([[tcx - 0.9 * T.a, chin + 0.03 * HH], [tcx + 0.9 * T.a, chin + 0.03 * HH]], o.collar, 0.09 * HH, 1.5 * u);
    if (o.belt) p.band([[tcx - 0.65 * T.a, chin - 0.05 * HH], [tcx + 0.75 * T.a, torsoBot - 0.1 * HH]], o.belt!, 5.5 * u, 1.8 * u);
    if (o.sash) p.band([[tcx - 1.3 * T.a, torsoBot - 0.32 * HH], [tcx + 1.3 * T.a, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
    if (o.patch) p.poly(box(tcx - 0.3 * T.a, torsoBot - 0.45 * HH, tcx + 0.1 * T.a, torsoBot - 0.3 * HH), o.patch, 1.4 * u);
    if (o.smudge) p.ell(tcx + 0.3 * T.a, chin + 0.5 * HH, 6 * u, 4 * u, "#2b2533", 0);
    if (!o.dress) for (let i = 0; i < 3; i++) { const y = chin + 0.16 * HH + i * 0.24 * HH; p.dot(tcx + 0.8 * T.a, y, 3 * u, INK); p.dot(tcx + 0.8 * T.a, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7)); }
  });
  p.inkRing(tp, ow, thick);
  if (o.cordon || o.trim) p.clip(tp, () => {
    if (o.trim) p.stroke([[tcx + 0.55 * T.a, chin - 0.08 * HH], [tcx + 0.62 * T.a, torsoBot + 0.04 * HH]], 3 * u, o.trim!);
    if (o.cordon) p.band([[tcx + 0.8 * T.a, chin + 0.05 * HH], [tcx - 0.9 * T.a, torsoBot - 0.15 * HH]], o.cordon!, 0.075 * HH, 1.3 * u);
  });
  if (o.star) { const st: P2[] = []; const sx0 = tcx + 0.2 * T.a, sy0 = chin + 0.45 * HH; for (let i = 0; i < 16; i++) { const r = (i % 2 ? 3 : 7.5) * u, a2 = (i / 16) * Math.PI * 2 - Math.PI / 2; st.push([sx0 + r * Math.cos(a2), sy0 + r * Math.sin(a2)]); } p.poly(st, "#f2f0ea", 1.2 * u); }
  if (o.jabot) {
    const jx = tcx + 0.95 * T.a, jy = chin - 0.02 * HH, jl: P2[] = [[jx - 3 * u, jy], [jx + 4 * u, jy], [jx + 9 * u, jy + 0.1 * HH], [jx + 6 * u, jy + 0.18 * HH], [jx + 8 * u, jy + 0.26 * HH], [jx, jy + 0.3 * HH], [jx - 3 * u, jy + 0.2 * HH]];
    p.poly(chaikin(jl, 2), "#f9f6ee", 1.4 * u);
    p.stroke(curve([jx, jy + 0.1 * HH], [jx + 4 * u, jy + 0.14 * HH], [jx + 6 * u, jy + 0.12 * HH], 5), 0.9 * u, "#cfc6b8");
  }
  for (const f of mid) f();
  if (!nearTop) armStroke(p, o, near, u, armCol);
  // ---- head ----
  const hx = 300 + 4 * u, [cpx, cpy] = rotAbout([300, chin], rad(lean), [300, hipY]);
  p.rot = lean + ht ? [rad(lean + ht), 300, chin, cpx - 300, cpy - chin] : null;
  hatBehind(p, o, H, hx, hc, light, thick, ow, true);
  const hp = blobPts(hx, hc, H);
  if (o.king) {
    kingHead(p, hx, hc, H.a, { expr, lid, look: opts.look ?? 0.4, light, thick, ow, skin, wig: o.wig ?? null, hatted: !!o.hat });
    hatOn(p, o, hp, H, hx, hc, light, seed, 1, true);
  } else {
    p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
    p.inkRing(hp, ow, thick);
    if (o.wig && o.hat !== "round") wigOn(p, o, hp, H, hx, hc, light, 1, true);
    hatOn(p, o, hp, H, hx, hc, light, seed, 1, true);
    EYE_UP = opts.eyeUp ?? 0;
    faceSide(p, hx, hc, W, expr, lid, BRIMMED.has(o.hat ?? ""), skin, o.moustache, o.build === "stout", o);
    EYE_UP = 0;
  }
  mark1(p, "mouth", hx + 33 * u, hc + 21 * u);
  p.rot = bodyRot;
  for (const f of top) f();
  if (nearTop) armStroke(p, o, near, u, armCol);
  for (const [x, y] of handsTop) handDot(p, o, x, y, u);
  p.rot = null;
};


// ---------------- crowds ----------------
const CAPRED = "#b83239", STRIPE = "#3b5ea8", CREAM = "#f2ede0", LINEN = "#f1efe6";
/** sans-culotte: red phrygian cap + cockade, short carmagnole jacket, open shirt, cream trousers with blue stripes */
export const sansCulotte = (v: number): Outfit => ({
  jacket: ["#6b4a33", "#3f5f9a", "#7a3b2e", "#4f6b45", "#8a6a3a", "#5a4a6a"][v % 6], pants: CREAM, stripes: STRIPE, boots: "#5a3b2a",
  hat: "phrygian", cap: v % 5 === 3 ? "#a82c32" : CAPRED, cockade: true, shirt: true, skin: SKINS[v % 4], moustache: v % 3 === 1 ? "#4a3426" : undefined,
});
/** bourgeois: black tricorne + cockade, long coat, waistcoat, dark breeches over white stockings */
export const bourgeois = (v: number): Outfit => ({
  jacket: ["#b8862f", "#4f7048", "#6b3d5a"][v % 3], pants: "#3b3346", legs: "#f4f1ea", boots: INK, hat: "tricorne", cockade: true, coat: true,
  waistcoat: "#e8d9b0", buttons: "#e8c45a", skin: SKINS[(v + 1) % 4], moustache: v % 3 === 2 ? "#3a2a20" : undefined,
});
/** woman: mob-cap bonnet, striped skirt, apron, kerchief crossed over the chest */
export const woman = (v: number): Outfit => ({
  jacket: ["#7a3b5a", "#3f5f8a", "#a8553a", "#5a7a4a"][v % 4], dress: ["#c25a5a", "#5a7fc2", "#d9a441", "#6a8f5a"][v % 4], stripes: "#f3ead8",
  apron: "#f4efe4", shawl: ["#efe4cc", "#e7c9a8", "#d8dcea", "#f0d9d0"][v % 4], pants: "#3b3f52", boots: "#4a3426", hat: "bonnet", cockade: v % 2 === 0,
  skin: SKINS[(v + 2) % 4],
});

/** dust puff on a 300 x 300 canvas; t in 0..1 */
/** a soft dust cloud (one texture, 256 x 256): overlapping radial-gradient lobes, no outline; the cast grows, drifts
 *  and fades the card (see-through "haze" card) */
export const fxDust = (p: Pen, tint = "#ddd2c2") => {
  const g = p.g, n = parseInt(tint.slice(1), 16), rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  for (const [x, y, r, a] of [[128, 150, 92, 0.55], [92, 160, 62, 0.45], [166, 158, 66, 0.45], [120, 118, 60, 0.4], [150, 128, 52, 0.35]] as const) {
    const [X, Y] = p.P(x, y), gr = g.createRadialGradient(X, Y, 0, X, Y, r);
    gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(0.55, `rgba(${rgb},${a * 0.55})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(X - r, Y - r, 2 * r, 2 * r);
  }
};
export const fxPuff = (p: Pen, t: number, tint = "#ddd2c2") => {
  // a cut-out card cannot fade, so the puff DISSOLVES: lobes drift out and up and shrink to nothing over its life,
  // one by one, with a soft plum rim; tint = the dust colour under the scene's light (night: cool grey)
  for (let i = 0; i < 6; i++) {
    const life = 1 - i * 0.09, k = clamp(1 - t / life, 0, 1);
    if (k <= 0) continue;
    const a = rad(150 + i * 47), d = 30 + 80 * t, r = (26 + 14 * (i % 2)) * (0.45 + 0.55 * Math.sqrt(k)) * k ** 0.35;
    const x = 150 + d * Math.cos(a), y = 190 + d * 0.4 * Math.sin(a) - 40 * t;
    p.ell(x, y, r + 3, (r + 3) * 0.8, mix(tint, "#4a4054", 0.45), 0);
    p.ell(x, y, r, r * 0.8, tint, 0);
  }
};

/** cast shadow on a 128 x 256 canvas: dark soft contact pool at the feet (y 205) and a softer tail that runs up the
 *  canvas = away from the sun, fading with distance; multiply colour (sRGB-encoded linear ratio), white = no change */
export const fxShadow = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 256);
  g.save(); g.filter = "blur(9px)";
  const lg = g.createLinearGradient(0, 205, 0, 22);
  lg.addColorStop(0, mix(col, WHITE, 0.08)); lg.addColorStop(0.55, mix(col, WHITE, 0.3)); lg.addColorStop(1, mix(col, WHITE, 0.85));
  g.fillStyle = lg;
  g.beginPath(); g.moveTo(40, 205); g.bezierCurveTo(36, 120, 46, 50, 64, 30); g.bezierCurveTo(82, 50, 92, 120, 88, 205); g.closePath(); g.fill();
  g.fillStyle = col; g.beginPath(); g.ellipse(64, 205, 30, 17, 0, 0, Math.PI * 2); g.fill();
  g.restore();
};

/** tight contact shadow right under the feet on a 128 x 128 canvas: dark core, short fall-off (multiply colour) */
export const fxContact = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [r, k] of [[0, 0], [0.32, 0.02], [0.5, 0.22], [0.66, 0.58], [0.82, 0.88], [1, 1]] as const) gr.addColorStop(r, mix(col, WHITE, k));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};

/** warm lantern glow (HDR card, additive) on a 128 x 128 canvas */
export const fxGlow = (p: Pen) => {
  const g = p.g, gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,226,150,1)"); gr.addColorStop(0.22, "rgba(255,196,110,0.55)"); gr.addColorStop(1, "rgba(255,150,60,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};

/** a scythe: wooden snath from `foot` (blade end) to `top`, the curved steel blade at the foot, pointing `dir` */
export const drawScythe = (p: Pen, foot: P2, top: P2, u: number, dir: number) => {
  p.band([foot, top], "#9a6a3c", 4 * u, 1.3 * u, "round");
  const g0 = lerp2(foot, top, 0.32), dx = top[0] - foot[0], dy = top[1] - foot[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  p.band([g0, [g0[0] + nx * 9 * u * dir, g0[1] + ny * 9 * u * dir]], "#9a6a3c", 3 * u, 1.1 * u, "round"); // the grip peg
  const bl = 70 * u, blade: P2[] = [];
  for (let i = 0; i <= 10; i++) { const t2 = i / 10; blade.push([foot[0] - dir * bl * t2, foot[1] - 10 * u * Math.sin(Math.PI * t2 * 0.9) + 4 * u * t2]); }
  for (let i = 10; i >= 0; i--) { const t2 = i / 10; blade.push([foot[0] - dir * bl * t2, foot[1] - 10 * u * Math.sin(Math.PI * t2 * 0.9) + 4 * u * t2 + 10 * u * (1 - t2)]); }
  p.poly(blade, "#c9ccd4", 1.6 * u);
};

// ---------------- animals (side view facing screen-right, soles at y 975; MU design units per metre) ----------------
export type AnimalOpts = { phase?: number; mode?: "stand" | "walk" | "lie" | "graze" | "peck"; coat?: string; light?: number; seed?: number };
const legPair = (p: Pen, hip: P2, foot: P2, w: number, col: string) => { p.stroke([hip, foot], w + 3.2, INK); p.stroke([hip, foot], w, col); };
/** a mongrel dog (~0.75 m long): walk cycle, or lying asleep with its head on its paws */
export const drawDog = (p: Pen, o: AnimalOpts = {}) => {
  const M = MU, col = o.coat ?? "#a8744a", sh = mul(col, SH_CLOTH), ph = o.phase ?? 0, two = Math.PI * 2, light = o.light ?? DEF_LIGHT, lie = o.mode === "lie";
  const by = lie ? 975 - 0.13 * M : 975 - 0.36 * M, bx = 300;
  if (!lie) for (const [hx, off, far] of [[0.2, 0.5, true], [-0.22, 0, true], [0.2, 0, false], [-0.22, 0.5, false]] as [number, number, boolean][]) {
    const s = o.mode === "walk" ? Math.sin(two * (ph + off)) : 0, hip: P2 = [bx + (hx - (far ? 0.06 : 0)) * M, by + 0.06 * M];
    legPair(p, hip, [hip[0] + s * 0.09 * M, 975 - 4 - Math.max(0, -s) * 0.04 * M], 0.045 * M, far ? shade(col, 0.75) : col);
  }
  const tail = curve([bx - 0.27 * M, by - 0.04 * M], [bx - 0.4 * M, by - (lie ? 0.02 : 0.16) * M], [bx - 0.45 * M, by - (lie ? 0.0 : 0.26) * M + 0.03 * M * Math.sin(two * ph * 2)], 8);
  p.stroke(tail, 0.05 * M + 3.2, INK); p.stroke(tail, 0.05 * M, col);
  const body = ellPts(bx, by, 0.3 * M, (lie ? 0.11 : 0.13) * M);
  p.gradFill(body, col, sh, light); p.poly(body, null, 3.2);
  const hx = bx + (lie ? 0.36 : 0.3) * M, hy = lie ? by + 0.02 * M : by - 0.15 * M;
  const head = ellPts(hx, hy, 0.12 * M, 0.1 * M), snout = ellPts(hx + 0.11 * M, hy + 0.035 * M, 0.07 * M, 0.05 * M);
  p.gradFill(head, col, sh, light); p.poly(head, null, 3.2); p.poly(snout, mix(col, "#f2e2c8", 0.35), 3);
  p.dot(hx + 0.18 * M, hy + 0.02 * M, 0.022 * M);
  p.poly(chaikin([[hx - 0.06 * M, hy - 0.07 * M], [hx - 0.1 * M, hy + 0.05 * M], [hx - 0.02 * M, hy + 0.02 * M]], 1), shade(col, 0.7), 3); // floppy ear
  if (lie) p.stroke([[hx + 0.02 * M, hy - 0.015 * M], [hx + 0.07 * M, hy - 0.02 * M]], 3.4); else p.dot(hx + 0.04 * M, hy - 0.02 * M, 0.018 * M);
};
/** a hen (~0.35 m): walking, or pecking (head down) */
export const drawChicken = (p: Pen, o: AnimalOpts = {}) => {
  const M = MU, col = o.coat ?? "#c9824a", ph = o.phase ?? 0, two = Math.PI * 2, peck = o.mode === "peck" ? Math.max(0, Math.sin(two * ph)) : 0;
  const bx = 300, by = 975 - 0.2 * M;
  for (const off of [0, 0.5]) { const s = o.mode === "walk" ? Math.sin(two * (ph + off)) : 0; p.stroke([[bx + 0.01 * M, by + 0.06 * M], [bx + (0.02 + s * 0.04) * M, 975 - 3]], 3.4, "#d99a3a"); }
  p.poly(chaikin([[bx - 0.12 * M, by - 0.02 * M], [bx - 0.2 * M, by - 0.14 * M], [bx - 0.08 * M, by - 0.06 * M]], 1), shade(col, 0.7), 2.6); // tail
  const body = ellPts(bx, by, 0.13 * M, 0.09 * M);
  p.gradFill(body, col, mul(col, SH_CLOTH), o.light ?? DEF_LIGHT); p.poly(body, null, 2.8);
  const hx = bx + 0.1 * M + 0.05 * M * peck, hy = by - 0.1 * M + 0.16 * M * peck;
  p.ell(hx, hy, 0.045 * M, 0.045 * M, col, 2.6);
  p.poly([[hx - 0.02 * M, hy - 0.04 * M], [hx, hy - 0.075 * M], [hx + 0.025 * M, hy - 0.04 * M]], "#d8343a", 2); // comb
  p.poly([[hx + 0.04 * M, hy - 0.008 * M], [hx + 0.075 * M, hy + 0.008 * M], [hx + 0.04 * M, hy + 0.02 * M]], "#e8b23a", 2); // beak
  p.dot(hx + 0.015 * M, hy - 0.01 * M, 0.009 * M);
};
/** a sheep (~1.1 m): a cream fleece of lobes, dark face and legs; grazing lowers the head */
export const drawSheep = (p: Pen, o: AnimalOpts = {}) => {
  const M = MU, ph = o.phase ?? 0, two = Math.PI * 2, graze = o.mode === "graze" ? 1 : 0, seed = o.seed ?? 1, FACE = "#3a3034", WOOL = o.coat ?? "#f1ebdc";
  const bx = 300 - 0.06 * M, by = 975 - 0.5 * M;
  for (const [hx, off, far] of [[0.26, 0.5, true], [-0.26, 0, true], [0.26, 0, false], [-0.26, 0.5, false]] as [number, number, boolean][]) {
    const s = o.mode === "walk" ? Math.sin(two * (ph + off)) : 0;
    const fx = far ? -0.07 : 0;
    legPair(p, [bx + (hx + fx) * M, by + 0.1 * M], [bx + (hx + fx + s * 0.06) * M, 975 - 4], 0.05 * M, far ? "#2a2226" : FACE);
  }
  const lobes: [number, number, number][] = [];
  for (let i = 0; i < 9; i++) { const a = (i / 9) * two; lobes.push([bx + Math.cos(a) * 0.34 * M, by + Math.sin(a) * 0.18 * M, (0.11 + 0.03 * rnd(seed, i)) * M]); }
  for (const [x, y, r] of lobes) p.ell(x, y, r + 3, r + 3, INK, 0);
  p.ell(bx, by, 0.36 * M, 0.2 * M, WOOL, 0);
  for (const [x, y, r] of lobes) p.ell(x, y, r, r, WOOL, 0);
  for (const [x, y, r] of lobes.slice(1, 4)) p.ell(x - r * 0.1, y + r * 0.25, r * 0.6, r * 0.45, "#ddd4c0", 0);
  const hx = bx + 0.42 * M, hy = by - 0.08 * M + 0.3 * M * graze + 0.01 * M * Math.sin(two * ph);
  p.poly(ellPts(hx, hy, 0.09 * M, 0.12 * M, 0, 360, graze ? -50 : -20), FACE, 3);
  p.poly(ellPts(hx - 0.07 * M, hy - 0.06 * M, 0.06 * M, 0.025 * M, 0, 360, 20), FACE, 2.6); // ear
  p.ell(hx - 0.02 * M, hy - 0.1 * M, 0.07 * M, 0.05 * M, WOOL, 2.6); // the fleece cap
  p.dot(hx + 0.03 * M, hy - 0.02 * M, 0.014 * M, "#f4efe4");
};

// ---------------- the Varennes cast (our own designs) ----------------
/** National Guard 1791: royal-blue coat, white lapels and waistcoat, red collar + cuffs, white breeches, tricorne + cockade */
export const nationalGuard = (v: number, mounted = false): Outfit => ({
  jacket: "#2c4a94", collar: "#c8323a", cuffs: "#c8323a", waistcoat: LINEN, pants: LINEN, legs: LINEN, boots: INK, hat: "tricorne", cockade: true,
  coat: true, belt: LINEN, buttons: "#e8e4d8", skin: SKINS[v % 4], moustache: v % 3 === 1 ? "#3a2a20" : undefined, tallBoots: mounted,
});
/** Varennes townsfolk woken in the night: knitted night caps (some striped), nightshirt tails over breeches; women in a
 *  night bonnet and a pale gown with a shawl */
export const townNight = (v: number): Outfit => v % 3 === 2
  ? { jacket: ["#d9cdb8", "#c9b8c4", "#bfc8d6"][v % 3], dress: ["#ebe3d2", "#e3dbe6", "#dde4ec"][(v >> 1) % 3], shawl: ["#a85a4a", "#5a6a8a", "#7a6a3a"][v % 3],
    pants: "#3b3f52", boots: "#4a3426", hat: "bonnet", skin: SKINS[(v + 2) % 4] }
  : { jacket: ["#ede7da", "#e6e0d0", "#efe9e2"][v % 3], coat: true, shirt: true, pants: ["#5a4a3a", "#4a4a5a", "#6a5040"][v % 3], legs: "#e9e3d4", boots: "#4a3426",
    hat: "nightcap", cap: ["#f1ece0", "#e8d4cc", "#dde3ee", "#efe6c8"][v % 4], stripes: v % 4 === 1 ? "#c25a5a" : v % 4 === 3 ? "#5a7fc2" : undefined,
    skin: SKINS[v % 4], moustache: v % 5 === 2 ? "#4a3426" : undefined, stubble: v % 4 === 0 };
/** relay grooms: shirt sleeves under a leather waistcoat, breeches, boots, bare-headed */
export const groom = (v: number): Outfit => ({
  jacket: ["#efe9dc", "#e8e0cc", "#f0ebe2"][v % 3], waistcoat: ["#7a5434", "#5a4a3a", "#8a6a3a"][v % 3], shirt: true, pants: ["#6a5a44", "#4a4a3a", "#7a5a3a"][v % 3],
  legs: "#d9cfb8", boots: "#3a2a20", tallBoots: true, hat: "hair", hair: ["#5a3b2a", "#2e2a2a", "#8a6a4a"][v % 3], skin: SKINS[(v + 1) % 4],
  moustache: v % 2 ? "#4a3426" : undefined,
});
/** extras: a night watchman (long grey coat, tricorne), a ragged beggar, a peasant at dawn (smock) */
export const WATCHMAN: Outfit = { jacket: "#5a5a66", coat: true, collar: "#3a3a46", waistcoat: "#8a7a5a", pants: "#3b3f52", legs: "#d9cfb8", boots: INK, hat: "tricorne", build: "stout", skin: SKINS[2], moustache: "#5a4a3a" };
export const BEGGAR: Outfit = { jacket: "#7a6a52", pants: "#5a4a3a", boots: "#4a3426", hat: "hair", hair: "#8a8278", patch: "#a68a5a", stubble: true, shirt: true, skin: SKINS[1] };
export const PEASANT: Outfit = { jacket: "#c9b98f", shirt: true, pants: "#6a5a44", legs: "#d9cfb8", boots: "#4a3426", hat: "hair", hair: "#7a5a3a", skin: SKINS[3], moustache: "#5a3b2a" };
/** the berline's coachman: dark green caped coat, tricorne, buff waistcoat, boots */
export const COACHMAN: Outfit = { jacket: "#34503e", coat: true, collar: "#7a2a2a", waistcoat: "#c9a45a", pants: "#c9b48a", legs: "#c9b48a", boots: INK, tallBoots: true,
  hat: "tricorne", build: "stout", skin: SKINS[1], moustache: "#5a3b2a" };
/** Louis XVI in royal dress: royal-blue velvet coat with gold, ivory waistcoat, lace jabot, powdered wig with two curls
 *  and the black-ribbon queue. Stout, and in profile the BIG face (kingHead) printed on every assignat. */
export const KING_ROYAL: Outfit = {
  jacket: "#2b3f86", coat: true, cuffs: "#e8cf7a", collar: "#e8cf7a", waistcoat: "#f2e6c4", jabot: true, pants: "#2b3f86", legs: "#f4f1ea", boots: INK,
  buttons: "#f0cf5a", wig: "#f3f0ea", curls: 2, queue: true, build: "stout", king: true, skin: "#f6d6bc", trim: "#e8c45a", cordon: "#8cc0ea", star: true,
  armW: 1.7, armHand: true, // a real velvet sleeve, gold cuff, lace and a hand: his gestures in the window read at a distance
};
/** Louis XVI as a valet: plain brown coat, cheap round hat, one royal wig curl poking out under it (curlPeek) */
export const KING_VALET: Outfit = {
  jacket: "#7a5434", coat: true, waistcoat: "#a88a5a", shirt: true, pants: "#5a4030", legs: "#d9cfb8", boots: "#3a2a20", buttons: "#5a3b2a",
  hat: "round", wig: "#f3f0ea", curlPeek: 1, build: "stout", king: true, skin: "#f6d6bc",
};
/** the queen in a hooded travelling cloak over a grey-blue gown */
export const QUEEN: Outfit = { jacket: "#6a5a7e", cloak: "#4f4366", hat: "hood", dress: "#8a97bc", shawl: "#efe6dc", pants: "#3b3f52", boots: "#4a3426", skin: "#f8e2d0" };
/** the governess (travelling as a baroness): dark gown, pale shawl, bonnet */
export const GOVERNESS: Outfit = { jacket: "#3e3650", dress: "#463c58", shawl: "#e4dccc", pants: "#3b3f52", boots: INK, hat: "bonnet", skin: SKINS[2] };
/** the king's daughter (12): rose gown, bonnet */
export const PRINCESS: Outfit = { jacket: "#c27a8a", dress: "#e3a8b4", shawl: "#f6ecdf", pants: "#3b3f52", boots: "#4a3426", hat: "bonnet", build: "kid", skin: "#f8e2d0" };
/** the dauphin (6), disguised as a little girl for the escape (true): pale blue frock, bonnet */
export const DAUPHIN: Outfit = { jacket: "#8aa6c8", dress: "#b9cde6", pants: "#3b3f52", boots: "#4a3426", hat: "bonnet", build: "kid", small: true, skin: "#f9e4d2" };
/** Drouet, the Sainte-Menehould postmaster: lean, dark green coat, mustard waistcoat, buff breeches, tall boots, tricorne */
export const DROUET: Outfit = {
  jacket: "#3a5838", coat: true, waistcoat: "#d4a23a", shirt: true, pants: "#cdb88e", legs: "#cdb88e", boots: "#2c2430", tallBoots: true,
  hat: "tricorne", cockade: true, build: "thin", buttons: "#e8c45a", skin: SKINS[1], hands: SKINS[1], armW: 1.35, armHand: true, // real sleeves + hands
};

// ---------------- the king's profile (window, coach, assignat) ----------------
// Louis XVI v2 (user brief: appealing, house style, the recognisable profile). Units u = a / 50 from the head centre,
// facing screen-right. A high smooth forehead, the big hooked Bourbon nose, a small mouth, a round chin over a soft
// double chin and a heavy jaw; an almond eye under a heavy lid, a soft arched brow.
const KING_FACE: P2[] = [[-6, -50], [10, -49], [24, -44], [34, -35], [40, -24], [42, -14], [41, -8], [45, -3], [51, 4], [57, 11], [62, 17], [63.5, 21],
  [61.5, 24.5], [57, 25.5], [53, 24.5], [51, 26.5], [52.5, 29], [50.5, 31], [48.5, 32], [50.5, 34], [49.5, 38.5], [46, 43], [41, 46], [44.5, 50.5],
  [43, 56.5], [37, 61.5], [28, 64.5], [20, 67], [16, 74], [-18, 74], [-24, 62], [-36, 48], [-46, 30], [-51, 8], [-50, -14], [-42, -32], [-26, -45]];
/** the powdered wig cap: swept back smooth from a high hairline, covering the ear, ending at the nape */
const KING_WIG: P2[] = [[25, -41], [14, -50], [-2, -54], [-20, -51], [-36, -42], [-48, -28], [-53, -10], [-52, 8], [-47, 24], [-40, 34], [-30, 38],
  [-20, 31], [-12, 19], [-6, 5], [0, -9], [8, -23], [16, -34]];
export type KingHeadOpts = {
  expr?: Expr; lid?: number; look?: number; light?: number; thick?: number; ow?: number; skin?: string; wig?: string | null;
  /** a hat sits on the head (the valet): only the back roll, the bow and the queue show below its brim */ hatted?: boolean;
  /** engraving for the assignat: [skin, wig] paper tints, sepia hatching, no crescents */ mono?: [string, string];
};
const RIBBON = "#1d1a22";
/** one clean horizontal powdered roll (a cylinder with a curl wound at its front end), centred (x, y), length L, radius r */
const wigRoll = (p: Pen, x0: number, y: number, L: number, r: number, col: string, u: number, mono = false, ink = INK, dir = 1) => {
  const x = x0, roll: P2[] = [];
  for (let i = 0; i <= 14; i++) { const a2 = Math.PI / 2 + (Math.PI * i) / 14; roll.push([x - L / 2 + r * 0.92 * Math.cos(a2), y + r * Math.sin(a2)]); }
  for (let i = 0; i <= 14; i++) { const a2 = -Math.PI / 2 + (Math.PI * i) / 14; roll.push([x + L / 2 + r * Math.cos(a2), y + r * Math.sin(a2)]); }
  p.poly(roll, col, 0);
  p.clip(roll, () => {
    if (mono) for (let k = -L / 2 - r; k < L / 2 + r; k += 2.6 * u) p.stroke([[x + k, y + r * 0.15], [x + k + 1.6 * u, y + r]], 0.55 * u, "#8a6a4a"); // engraved shade
    else p.ell(x - r * 0.3, y + r * 0.78, L / 2 + r, r * 0.42, mul(col, [0.88, 0.87, 0.93]), 0); // a soft cool underside
  });
  p.stroke([...roll, roll[0]], (mono ? 1.1 : 1.6) * u, ink);
  // the curl: a clean spiral wound into the front end
  const cx = x + (dir * L) / 2, spi: P2[] = [];
  for (let k = 0; k <= 22; k++) { const a2 = -Math.PI / 2 + k * 0.5 * dir, r2 = r * (0.86 - k * 0.033); spi.push([cx + dir * r2 * Math.cos(a2) * 0.9, y + r2 * Math.sin(a2)]); }
  p.stroke(spi, (mono ? 0.8 : 1.15) * u, ink);
  p.stroke(curve([x - L / 2 + 2 * u, y - r * 0.55], [x, y - r * 0.72], [x + L / 2 - 2 * u, y - r * 0.6], 6), 0.8 * u, mono ? "#8a6a4a" : mul(col, [0.78, 0.76, 0.82])); // wrap line
};
/** the black ribbon tied at the nape: a neat bow (two loops, two short tails) over a ribbon-wrapped queue */
const wigBow = (p: Pen, P: (q: P2) => P2, u: number, at: P2, tail = 18) => {
  const q0 = P([at[0] - 1, at[1] + 2]), q1 = P([at[0] - 5, at[1] + tail * 0.55]), q2 = P([at[0] - 4, at[1] + tail]);
  p.poly(chaikin([[q0[0] + 3.4 * u, q0[1]], [q1[0] + 2.6 * u, q1[1]], q2, [q1[0] - 2.8 * u, q1[1]], [q0[0] - 3.6 * u, q0[1]]], 1), RIBBON, 1.2 * u); // the wrapped queue
  p.stroke(curve(P([at[0] - 2, at[1] + 4]), P([at[0] - 4.5, at[1] + tail * 0.5]), P([at[0] - 4, at[1] + tail - 2]), 6), 0.7 * u, "#4a4552"); // its sheen
  const [bx, by] = P(at);
  for (const s of [-1, 1]) {
    const loop: P2[] = chaikin([[bx, by], [bx + s * 9 * u, by - 6 * u], [bx + s * 10 * u, by + 2 * u], [bx + s * 2 * u, by + 1.5 * u]], 2);
    p.poly(loop, RIBBON, 1 * u);
    p.stroke([[bx + s * 2 * u, by + 1 * u], [bx + s * 5 * u, by + 9 * u]], 2.2 * u, RIBBON); // tails
  }
  p.ell(bx, by, 2.4 * u, 2.6 * u, RIBBON, 0.8 * u);
};
/** Louis XVI's head in true side view, facing screen-right, centred (hx, hc), half width a */
export const kingHead = (p: Pen, hx: number, hc: number, a: number, o: KingHeadOpts = {}) => {
  const u = a / 50, light = o.light ?? DEF_LIGHT, thick = o.thick ?? thickAngle(light), mono = !!o.mono, ow = o.ow ?? 5 * u;
  const skin = mono ? o.mono![0] : o.skin ?? SKIN, wigc = mono ? o.mono![1] : o.wig, F = FACE[o.expr ?? "neutral"], ink = mono ? "#4a3326" : INK;
  const P = (q: P2): P2 => [hx + q[0] * u, hc + q[1] * u], Ps = (l: P2[]) => l.map(P);
  const fl = (w: number) => (mono ? 0.7 : 1) * w * u;
  if (wigc) wigBow(p, P, u, o.hatted ? [-43, 9] : [-43, 36], o.hatted ? 14 : 20); // behind the neck
  const face = chaikin(Ps(KING_FACE), 2);
  if (mono) p.poly(face, skin, 0); else p.shadedFill(face, skin, mul(skin, SH_SKIN), light, a);
  if (mono) p.clip(face, () => { for (let k = -60; k < 40; k += 3.2) p.stroke([P([k, 40]), P([k + 30, 76])], 0.5 * u, "#9a7a5a"); }); // engraved shade under the jaw
  p.inkRing(face, mono ? ow * 0.8 : ow * 0.92, thick, 0.22, ink); // an even line: no heavy blob at the lips
  // soft features: nostril, the smile fold, the double-chin crease
  p.stroke(curve(P([54.5, 17]), P([52.5, 21]), P([55.5, 24]), 6), fl(1.9), ink);
  p.stroke(curve(P([51, 25.5]), P([45.5, 29]), P([46.5, 34]), 6), fl(1.3), ink);
  p.stroke(curve(P([41, 47]), P([33, 50.5]), P([24, 48.5]), 8), fl(1.7), ink);
  // the eye: an almond under a heavy upper lid, a round pupil, a thin lower lid; shut = a soft smiling arc
  const lid = o.lid ?? 0, ek = F.eye[1], ex = 28, ey = -5, look = o.look ?? 0.4;
  if (ek === "shock" || ek === "shockHalf") eye(p, eyeKind(ek, lid), hx + ex * u, hc + ey * u, u, 1, look, skin);
  else if (lid >= 1 || ek === "happy" || ek === "squeeze" || ek === "dash") p.stroke(curve(P([21, ey]), P([27.5, ey + 2.6]), P([34, ey - 0.5]), 8), fl(2.4), ink);
  else {
    const drop = (lid > 0 || ek === "slit" ? 2.4 : ek === "lid" ? 1.2 : 0);
    p.clip([P([20, ey - 6 + drop]), P([35, ey - 6.5 + drop]), P([35, ey + 4]), P([20, ey + 4])], () => p.ell(hx + (30 + look * 1.6) * u, hc + (ey + 0.5) * u, 2.9 * u, 3.3 * u, ink, 0));
    p.stroke(curve(P([21, ey + drop * 0.4]), P([27.5, ey - 5.2 + drop]), P([34.5, ey - 0.6 + drop * 0.3]), 8), fl(2.7), ink); // the heavy upper lid
    p.stroke(curve(P([23, ey + 2.6]), P([28.5, ey + 4]), P([33.5, ey + 1.8]), 6), fl(0.9), ink);
  }
  const [dI, dO] = F.brow;
  if (ek !== "shock" && ek !== "shockHalf") p.stroke(curve(P([37, -15 + dI * 0.8]), P([28, -19.5 + (dI + dO) * 0.4]), P([19, -15 + dO * 0.8]), 8), fl(3), ink);
  else p.arc(hx + 28 * u, hc - 22 * u, 9 * u, 3 * u, 200, 340, 3.4 * u, ink);
  // the mouth: small, set back under the nose
  const mk = F.mouth;
  if (mk === "O" || mk === "o" || mk === "shout") p.ell(hx + 49 * u, hc + 32.5 * u, 2.4 * u, 2.8 * u, MOUTH, fl(1.2));
  else if (mk === "smirk" || mk === "smile" || mk === "smileWide" || mk === "grin" || mk === "laugh") p.stroke(curve(P([44.5, 31]), P([48, 33]), P([51, 30.8]), 6), fl(1.8), ink);
  else if (mk === "wave") { const s: P2[] = []; for (let i = 0; i <= 6; i++) s.push(P([44.5 + i, 32 + 0.8 * Math.sin(i * 1.6)])); p.stroke(s, fl(1.5), ink); }
  else if (mk === "frown") p.stroke(curve(P([44.5, 33]), P([47.5, 31.5]), P([50.5, 32.5]), 6), fl(1.7), ink);
  else p.stroke([P([45, 32]), P([50.5, 31.6])], fl(1.7), ink);
  if (!mono && (o.expr === "shock" || o.expr === "nervous")) { // a sweat drop on the cheek (the hat brim hides the temple)
    const [sx2, sy2] = P([12, 8]);
    p.poly([[sx2, sy2 - 9 * u], [sx2 + 4.5 * u, sy2 + 1 * u], [sx2, sy2 + 5 * u], [sx2 - 4.5 * u, sy2 + 1 * u]], "#9fd4ff", 1.8 * u);
  }
  if (!wigc || o.hatted) p.arc(hx - 4 * u, hc + 6 * u, 6 * u, 9 * u, 250, 470, fl(2), ink); // the ear
  if (!wigc) return;
  if (o.hatted) { // valet: the wig's back roll below the brim (the bow and queue behind the neck) + the give-away curl
    wigRoll(p, hx - 36 * u, hc - 4 * u, 18 * u, 6.4 * u, "#ffffff", u, false, ink);
    return;
  }
  const wp = chaikin(Ps(KING_WIG), 2);
  if (mono) { p.poly(wp, wigc, 0); p.clip(wp, () => { for (let k = -60; k < 30; k += 3) p.stroke([P([k, -56]), P([k - 18, 40])], 0.45 * u, "#c9b48a"); }); }
  else p.shadedFill(wp, wigc, mul(wigc, SH_FELT), light, a, 0.35);
  p.stroke([...wp, wp[0]], ow * (mono ? 0.7 : 0.85), ink);
  const comb = mono ? "#8a6a4a" : mul(wigc, [0.8, 0.78, 0.86]);
  for (const l of [[[21, -42], [0, -48], [-27, -40]], [[15, -33], [-5, -39], [-35, -28]], [[9, -22], [-10, -27], [-40, -13]]] as P2[][]) p.stroke(curve(P(l[0]), P(l[1]), P(l[2]), 8), 1.1 * u, comb);
  // two clean horizontal side rolls over the ear
  wigRoll(p, hx - 9 * u, hc + 2 * u, 20 * u, 6.2 * u, wigc, u, mono, ink);
  wigRoll(p, hx - 12 * u, hc + 15.5 * u, 18 * u, 6 * u, wigc, u, mono, ink);
};

// ---------------- props ----------------
/** a pitch torch gripped at `hand`, pointing along `ang` (canvas angle, -90 = straight up); returns the flame base */
export const drawTorch = (p: Pen, hand: P2, ang: number, u: number): P2 => {
  const L = 0.56 * MU, c = Math.cos(ang), s = Math.sin(ang), at = (k: number): P2 => [hand[0] + c * L * k, hand[1] + s * L * k];
  p.band([at(-0.3), at(0.62)], "#8a5a34", 4.6 * u, 1.3 * u, "round");
  // tow-and-pitch head: a dark bulb bound with two cords
  const h0 = at(0.6), h1 = at(0.78), nx = -s, ny = c, w = 7 * u;
  const head: P2[] = chaikin([[h0[0] + nx * w * 0.7, h0[1] + ny * w * 0.7], [h1[0] + nx * w, h1[1] + ny * w], [h1[0] - nx * w, h1[1] - ny * w], [h0[0] - nx * w * 0.7, h0[1] - ny * w * 0.7]], 1);
  p.poly(head, "#3a2a26", 1.6 * u);
  for (const k of [0.66, 0.72]) { const q = at(k); p.stroke([[q[0] + nx * w, q[1] + ny * w], [q[0] - nx * w, q[1] - ny * w]], 1.4 * u, "#a8743a"); }
  return at(0.82);
};
/** torch flame (cut-out, unlit) on a 128 x 192 canvas, flicker variant k 0..5: an orange teardrop, a yellow heart, a
 *  pale core, thin plum ink. Its base sits at (64, 176). */
export const fxFlame = (p: Pen, k: number) => {
  const sw = 10 * Math.sin(k * 1.9), tall = 1 + 0.12 * Math.sin(k * 2.7);
  const tear = (w: number, h: number, dx: number): P2[] => {
    const out: P2[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, y = 176 - h * t, half = w * Math.sin(Math.PI * Math.min(1, (1 - t) * 1.05) * 0.5 + 0.0) * Math.sqrt(Math.max(0, 1 - t)) * (1 + 0.18 * Math.sin(t * 9 + k));
      out.push([64 + dx * t * t + half, y]);
    }
    for (let i = 24; i >= 0; i--) {
      const t = i / 24, y = 176 - h * t, half = w * Math.sqrt(Math.max(0, 1 - t)) * (1 + 0.14 * Math.sin(t * 7 + k * 1.3));
      out.push([64 + dx * t * t - half, y]);
    }
    return out;
  };
  p.poly(tear(46, 158 * tall, sw), "#ff8a2e", 6);
  p.poly(tear(30, 112 * tall, sw * 0.8), "#ffc94a", 0);
  p.poly(tear(15, 66 * tall, sw * 0.5), "#fff4c8", 0);
};

/** THE ASSIGNAT (no letters, no numbers): pale laid paper, a double ornamental border with a lozenge chain and corner
 *  rosettes, a beaded oval medallion with the king's profile (kingHead, the same face as in the window), a little crown,
 *  guilloche bands and a red-brown seal. Drawn on a w x h canvas (design 440 x 300). */
export const drawAssignat = (p: Pen, w: number, h: number, thumb = false) => {
  const g = p.g, PAPER = "#efe3c4", BAND = "#e2d0a2", BRN = "#5e4330", SEAL = "#a8443a", ring = (l: P2[]): P2[] => [...l, l[0]];
  g.save(); g.scale(w / 440, h / 300);
  p.poly(rrect(3, 3, 437, 297, 8), PAPER, 3);
  p.clip(rrect(3, 3, 437, 297, 8), () => { // faint laid lines + an aged edge
    for (let y = 10; y < 300; y += 9) p.stroke([[0, y], [440, y]], 0.8, "#e6d8b6");
    g.lineWidth = 14; g.strokeStyle = "rgba(160,120,60,0.14)"; g.strokeRect(0, 0, 440, 300);
  });
  p.poly(rrect(14, 14, 426, 286, 4), BAND, 0);
  p.stroke(ring(rrect(14, 14, 426, 286, 4)), 2.6, BRN);
  p.stroke(ring(rrect(30, 30, 410, 270, 3)), 1.8, BRN);
  p.poly(rrect(31, 31, 409, 269, 3), PAPER, 0);
  // lozenge chain in the border band
  const loz = (x: number, y: number) => p.poly([[x, y - 5], [x + 5, y], [x, y + 5], [x - 5, y]], BRN, 0);
  for (let x = 44; x <= 396; x += 16) { loz(x, 22); loz(x, 278); }
  for (let y = 44; y <= 256; y += 16) { loz(22, y); loz(418, y); }
  // corner rosettes
  for (const [x, y] of [[22, 22], [418, 22], [22, 278], [418, 278]] as P2[]) {
    p.ell(x, y, 11, 11, PAPER, 1.6);
    for (let i = 0; i < 8; i++) { const a2 = (i * Math.PI) / 4; p.ell(x + 6 * Math.cos(a2), y + 6 * Math.sin(a2), 3, 3, BRN, 0); }
    p.dot(x, y, 2.4, SEAL);
  }
  // guilloche bands right of the medallion (interlaced waves, nothing letter-like)
  for (const yc of [56, 244]) for (let k = 0; k < 3; k++) {
    const l: P2[] = [];
    for (let x = 252; x <= 396; x += 3) l.push([x, yc + 7 * Math.sin((x - 252) / 9 + k * 2.1)]);
    p.stroke(l, 1.3, k === 1 ? SEAL : BRN);
  }
  // the medallion: hatched ground, the king's bust in profile, beaded double ring
  const cx = 140, cy = 150, rx = 84, ry = 104, oval = ellPts(cx, cy, rx, ry);
  p.poly(oval, "#f4ead0", 0);
  p.clip(oval, () => {
    for (let x = -60; x < 300; x += 7) p.stroke([[x, 40], [x + 120, 260]], 0.9, "#dccaa0");
    kingHead(p, cx - 4, cy - 14, 46, { mono: ["#f4e8cc", "#f8f0de"], ow: 3.4, expr: "neutral", look: 0.5, wig: "#f8f0de" });
    // the bust: a coat with a turned lapel, the cordon across the chest and a lace jabot, all in fine
    // engraved line (no buttons, no discs)
    const bust = chaikin([[cx - 96, 262], [cx - 78, 214], [cx - 44, 196], [cx + 4, 192], [cx + 46, 202], [cx + 70, 226], [cx + 84, 262]], 3);
    p.poly(bust, "#d9c59a", 0);
    p.clip(bust, () => {
      for (let x = cx - 110; x < cx + 100; x += 4.5) p.stroke([[x, 186], [x + 34, 268]], 0.6, "#b89c6c");     // engraved coat
      p.poly([[cx - 30, 196], [cx - 2, 192], [cx - 12, 228], [cx - 40, 262], [cx - 70, 262]], "#e8d8b2", 0);  // the lapel
      p.stroke(curve([cx - 30, 196], [cx - 14, 222], [cx - 46, 262], 10), 1.2, BRN);
      p.band([[cx - 90, 250], [cx + 70, 214]], "#c9b07c", 13, 0.8, "butt");                              // the cordon
      for (let k = -80; k < 70; k += 5) p.stroke([[cx + k, 248 - (k + 80) * 0.22], [cx + k + 3, 238 - (k + 80) * 0.22]], 0.5, "#8a6a4a");
      const jab: P2[] = [[cx + 2, 192], [cx + 24, 194], [cx + 30, 210], [cx + 24, 222], [cx + 30, 234], [cx + 18, 244], [cx + 4, 232]];
      p.poly(chaikin(jab, 2), "#fbf6e8", 1);
      for (const y of [204, 216, 228]) p.stroke(curve([cx + 8, y], [cx + 18, y + 3], [cx + 26, y], 5), 0.7, "#8a6a4a");
      // (no order star: at bill size it read as a stray little shape on the shoulder)
    });
    p.stroke([...bust, bust[0]], 1.6, BRN);
  });
  p.stroke(ring(oval), 3, BRN);
  const o2 = ellPts(cx, cy, rx + 9, ry + 9);
  p.stroke(ring(o2), 1.6, BRN);
  for (let i = 0; i < 44; i++) { const a2 = (i / 44) * Math.PI * 2; p.dot(cx + (rx + 4.5) * Math.cos(a2), cy + (ry + 4.5) * Math.sin(a2), 2, BRN); }
  // a small crown above the right panel
  const kx = 322, ky = 100;
  p.poly([[kx - 26, ky + 14], [kx - 30, ky - 10], [kx - 14, ky + 2], [kx, ky - 18], [kx + 14, ky + 2], [kx + 30, ky - 10], [kx + 26, ky + 14]], "#d9b85a", 2);
  for (const dx of [-30, 0, 30]) p.dot(kx + dx, ky + (dx ? -12 : -20), 3.2, BRN);
  p.stroke([[kx - 24, ky + 8], [kx + 24, ky + 8]], 1.4, BRN);
  // scroll ornaments and the seal
  for (const sd of [-1, 1]) { const l: P2[] = []; for (let t = 0; t <= 1; t += 0.05) { const r = 14 * (1 - t) + 3; l.push([kx + sd * (34 + 30 * t) + sd * r * Math.cos(t * 9), 146 + r * Math.sin(t * 9)]); } p.stroke(l, 1.4, BRN); }
  const sx = 322, sy = 200;
  p.ell(sx, sy, 40, 40, mix(SEAL, PAPER, 0.15), 2.4);
  p.ell(sx, sy, 30, 30, null, 1.4);
  for (let i = 0; i < 16; i++) { const a2 = (i / 16) * Math.PI * 2; p.stroke([[sx + 9 * Math.cos(a2), sy + 9 * Math.sin(a2)], [sx + 26 * Math.cos(a2), sy + 26 * Math.sin(a2)]], 2, "#f2dccc"); }
  p.ell(sx, sy, 8, 8, "#f2dccc", 1.4);
  void thumb; // no hand is ever painted into the bill: the holder's own hand grips its edge
  g.restore();
};
/** a held / falling assignat card (cw x ch canvas) */
export const fxAssignat = (p: Pen, cw: number, ch: number, thumb = false) => drawAssignat(p, cw, ch, thumb);

// ---------------- HORSES ----------------
// A small 3D puppet (metres, horse-local X fwd, Y up, Z = the horse's left) projected orthographically onto the card:
// screen x = X rx + Z rz (the card's right axis in horse-local terms), depth = X vx + Z vz (toward the lens). Body =
// ellipsoids + a neck capsule merged into ONE silhouette (ink pass under a shared-gradient fill pass, so no seams); legs
// are tapered capsules from 2-bone IK (forelegs bend at the knee, hind legs at the hock, ALWAYS 4 legs, never a stool);
// gaits by per-leg phase offsets and duty factors; mane, forelock, tail, ears; harness (collar, pad, girth, breeching,
// traces, blinkers, reins) or saddle (cloth, seat, stirrup) and an optional rider drawn in the right depth slot.
export type HorseCoat = { coat: string; mane: string; points?: string; socks?: number[]; blaze?: boolean; dapple?: boolean };
export const HORSE_COATS: HorseCoat[] = [
  { coat: "#8d5636", mane: "#2a1e1c", points: "#2f2220" },                         // bay
  { coat: "#b0693c", mane: "#c98a4c", socks: [0, 1] },                              // chestnut, two white socks
  { coat: "#d0c9c0", mane: "#8a8490", dapple: true, points: "#7e7882" },            // dapple grey
  { coat: "#4c3832", mane: "#1f1a1c", blaze: true, socks: [3] },                    // dark brown, blaze
  { coat: "#bf975c", mane: "#3a2a22", points: "#3a2a22" },                          // dun
  { coat: "#734c34", mane: "#2a1e1c", points: "#2f2220", blaze: true },             // brown, blaze
  { coat: "#e9e4dc", mane: "#cfc8c0", socks: [] },                                  // white
  { coat: "#2f2628", mane: "#151214", socks: [2] },                                 // black
];
export type HorseGait = "stand" | "walk" | "trot" | "gallop";
/** draws the rider: seat = design point of the saddle seat, k = rider design scale (character units -> card units),
 *  dir = screen direction of the horse's head (+1 right), front = the horse is seen nearly head-on / tail-on */
export type RiderFn = (p: Pen, seat: P2, k: number, dir: 1 | -1, front: boolean) => void;
export type HorseOpts = {
  coat: HorseCoat; gait: HorseGait; phase: number;
  /** the card's right axis and the toward-lens axis, in horse-local [fwd, left] (unit, horizontal) */ rx: number; rz: number; vx: number; vz: number;
  /** design units per metre on this card */ M: number;
  light?: number; tack?: "harness" | "saddle" | null; cloth?: string; tired?: boolean; idle?: number; rider?: RiderFn | null;
  /** fwd offset (m) of the card centre on the horse (keeps head + tail on the card) */ shift?: number;
  /** 0..1 leg swing / body bob amount: eases starts and stops (0 = legs at rest) */ amp?: number;
  /** continuous gait 0 walk .. 1 trot .. 2 gallop (blends the leg pattern: no snap at a gait change) */ gk?: number;
  /** 0..1 how tired (head low, ears back): eased, never snapped */ tiredK?: number;
};
type L2 = [number, number];
const HOOF = "#3b2e2c", LEATHER = "#3a2a24", BRASS2 = "#d6b04a";
const capsule = (a: P2, b: P2, ra: number, rb: number, n = 9): P2[] => {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), out: P2[] = [];
  for (let i = 0; i <= n; i++) { const t = ang - Math.PI / 2 + (Math.PI * i) / n; out.push([b[0] + rb * Math.cos(t), b[1] + rb * Math.sin(t)]); }
  for (let i = 0; i <= n; i++) { const t = ang + Math.PI / 2 + (Math.PI * i) / n; out.push([a[0] + ra * Math.cos(t), a[1] + ra * Math.sin(t)]); }
  return out;
};
const ik2 = (a: L2, b: L2, l1: number, l2: number, fwd: boolean): L2 => {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = clamp(Math.hypot(dx, dy), 0.01, l1 + l2 - 1e-4);
  const A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), k = Math.atan2(dy, dx) + (fwd ? A : -A);
  return [a[0] + l1 * Math.cos(k), a[1] + l1 * Math.sin(k)];
};
const rgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`; };
/** one linear gradient across a whole group of shapes (lit edge -> far edge), so merged parts fill without seams */
const groupGrad = (p: Pen, pts: P2[], base: string, shadow: string, light: number, flat = 0.25) => {
  const dx = Math.cos(light), dy = Math.sin(light);
  let cx = 0, cy = 0, lo = Infinity, hi = -Infinity;
  for (const [x, y] of pts) { cx += x / pts.length; cy += y / pts.length; const d = x * dx + y * dy; lo = Math.min(lo, d); hi = Math.max(hi, d); }
  const dc = cx * dx + cy * dy, gr = p.g.createLinearGradient(cx + dx * (hi - dc), cy + dy * (hi - dc), cx + dx * (lo - dc), cy + dy * (lo - dc));
  gr.addColorStop(0, base); gr.addColorStop(flat, base); gr.addColorStop(1, shadow);
  return gr;
};
/** fill a group of closed shapes as one silhouette: thick ink under everything, then the fills on top */
const union = (p: Pen, parts: P2[][], fill: string | CanvasGradient, ol: number) => {
  const g = p.g;
  g.lineJoin = "round"; g.strokeStyle = INK; g.lineWidth = 2 * ol;
  for (const q of parts) { p.path(q, true); g.stroke(); }
  g.fillStyle = fill;
  for (const q of parts) { p.path(q, true); g.fill(); }
};
const clipAll = (p: Pen, parts: P2[][], fn: () => void) => {
  const g = p.g; g.save(); g.beginPath();
  for (const q of parts) q.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.clip(); fn(); g.restore();
};

export const drawHorse = (p: Pen, H: HorseOpts) => {
  const C = H.coat, M = H.M, light = H.light ?? DEF_LIGHT, two = Math.PI * 2, g = p.g;
  const ph = ((H.phase % 1) + 1) % 1, idle = H.idle ?? 0, ol = 0.026 * M, tired = H.tiredK ?? (H.tired ? 1 : 0);
  const zN = H.vz >= 0 ? 1 : -1, dirS: 1 | -1 = H.rx >= 0 ? 1 : -1, sh = H.shift ?? -0.12;
  const gal = H.gait === "gallop" ? 1 : 0;
  // ---- gait: per leg [LF, RF, LH, RH] ----
  const GT = {
    stand: { duty: 1, reach: 0, lift: 0, off: [0, 0, 0, 0] },
    // reach = stride x duty / 2 (story COACH.stride walk 1.7 / trot 2.6 / gallop 3.4 m per cycle): the planted hoof
    // sweeps back exactly as fast as the body moves, so no hoof slides on the ground
    walk: { duty: 0.62, reach: Math.min(0.5, (1.7 * 0.62) / 2), lift: 0.13, off: [0.25, 0.75, 0, 0.5] },
    trot: { duty: 0.45, reach: Math.min(0.5, (2.6 * 0.45) / 2), lift: 0.24, off: [0, 0.5, 0.5, 0] },
    gallop: { duty: 0.34, reach: Math.min(0.52, (3.4 * 0.34) / 2), lift: 0.3, off: [0.42, 0.3, 0.12, 0] },
  }[H.gait];
  if (H.gk !== undefined && H.gait !== "stand") { // blend the two neighbouring gaits' patterns (offsets, duty, reach, lift)
    const W0 = { duty: 0.62, reach: Math.min(0.5, (1.7 * 0.62) / 2), lift: 0.13, off: [0.25, 0.75, 0, 0.5] };
    const W1 = { duty: 0.45, reach: Math.min(0.5, (2.6 * 0.45) / 2), lift: 0.24, off: [0, 0.5, 0.5, 0] };
    const W2 = { duty: 0.34, reach: Math.min(0.52, (3.4 * 0.34) / 2), lift: 0.3, off: [0.42, 0.3, 0.12, 0] };
    const g = clamp(H.gk, 0, 2), [A0, A1, k] = g < 1 ? [W0, W1, g] : [W1, W2, g - 1];
    const mixOff = (a0: number, a1: number) => { let d = a1 - a0; if (d > 0.5) d -= 1; if (d < -0.5) d += 1; return a0 + d * k; };
    Object.assign(GT, { duty: lerp(A0.duty, A1.duty, k), reach: lerp(A0.reach, A1.reach, k), lift: lerp(A0.lift, A1.lift, k), off: A0.off.map((v, i2) => mixOff(v, A1.off[i2])) });
  }
  const amp = H.amp ?? 1;
  let dy = 0, pitch = 0, nod = 0;
  if (H.gait === "walk") { dy = 0.015 * Math.cos(2 * two * ph); nod = 0.035 * Math.sin(2 * two * ph); }
  else if (H.gait === "trot") { dy = 0.04 * Math.cos(2 * two * ph); nod = 0.02 * Math.cos(2 * two * ph); }
  else if (gal) { dy = 0.07 * Math.sin(two * (ph - 0.15)); pitch = rad(6) * Math.sin(two * (ph + 0.1)); nod = 0.08 * Math.sin(two * (ph + 0.35)); }
  else nod = 0.025 * Math.sin(idle * 1.3);
  dy *= amp; pitch *= amp; nod = nod * amp + (1 - amp) * 0.025 * Math.sin(idle * 1.3);
  const B = (X: number, Y: number): L2 => { const c = Math.cos(pitch), s = Math.sin(pitch), y = Y - 1.1; return [X * c - y * s, 1.1 + X * s + y * c + dy]; };
  const D = (X: number, Y: number, Z: number): P2 => [300 + ((X - sh) * H.rx + Z * H.rz) * M, 975 - Y * M];
  const DB = (X: number, Y: number, Z = 0): P2 => { const [x, y] = B(X, Y); return D(x, y, Z); };
  const hw = (ax: number, az: number) => Math.sqrt((ax * H.rx) ** 2 + (az * H.rz) ** 2) * M;
  const rotDeg = (-pitch * 180 / Math.PI) * H.rx;
  const el = (cX: number, cY: number, ax: number, ay: number, az: number): P2[] => { const [x, y] = DB(cX, cY); return ellPts(x, y, hw(ax, az), ay * M, 0, 360, rotDeg, 40); };
  const coat = C.coat, coatSh = mul(coat, SH_CLOTH), points = C.points ?? coat;
  // ---- skeleton ----
  const N0: L2 = [0.5, 1.28], N1: L2 = [0.86 + 0.16 * gal + 0.06 * tired, 1.84 - 0.18 * gal - 0.24 * tired + nod];
  const Hp: L2 = [N1[0] + 0.05, N1[1] + 0.1], hAng = rad(-60 + 22 * gal - 14 * tired);
  const Hm: L2 = [Hp[0] + 0.58 * Math.cos(hAng), Hp[1] + 0.58 * Math.sin(hAng)];
  const n0 = DB(...N0), n1 = DB(...N1), hp = DB(...Hp), hm = DB(...Hm);
  // ---- legs ----
  type Leg = { d: number; segs: [P2, P2, number, number, string][]; hoof: [P2, P2] };
  const legs: Leg[] = [];
  const TOPS: [number, number, number, boolean][] = [[0.44, 1.02, 0.15, true], [0.44, 1.02, -0.15, true], [-0.6, 1.06, 0.16, false], [-0.6, 1.06, -0.16, false]];
  TOPS.forEach(([tx, ty, tz, fore], i) => {
    const c = (((ph + GT.off[i]) % 1) + 1) % 1;
    let dx = 0, lift = 0, fold = 0;
    if (H.gait !== "stand") {
      if (c < GT.duty) dx = GT.reach * amp * (1 - (2 * c) / GT.duty);
      else { const s = (c - GT.duty) / (1 - GT.duty); dx = GT.reach * amp * (-1 + 2 * smooth01(s)); lift = GT.lift * amp * Math.sin(Math.PI * s); fold = amp * Math.sin(Math.PI * s); }
    } else if (i === 3 && tired) { lift = 0.05; fold = 0.35; } // resting a hind hoof
    const rest = fore ? 0.47 : -0.62, hoof: L2 = [rest + dx, lift];
    const pa = Math.atan2(-0.12, 0.045) - rad(fore ? 105 : 65) * fold, pl = 0.13;
    const F: L2 = [hoof[0] - pl * Math.cos(pa), hoof[1] - pl * Math.sin(pa)];
    const T = B(tx, ty), far = tz * H.vz < 0, dim = (col: string) => (far ? shade(col, 0.78) : col);
    const sock = C.socks?.includes(i) ?? false, low = dim(sock ? "#f4f0e6" : points), up = dim(coat);
    const P3 = (q: L2): P2 => D(q[0], q[1], tz);
    const segs: [P2, P2, number, number, string][] = [];
    if (fore) {
      const K = ik2(T, F, 0.5, 0.44, true);
      segs.push([P3(T), P3(K), 0.085 * M, 0.048 * M, up], [P3(K), P3(F), 0.042 * M, 0.036 * M, low], [P3(F), P3(hoof), 0.036 * M, 0.032 * M, low]);
    } else {
      const S: L2 = [T[0] + 0.12, T[1] - 0.3], Hk = ik2(S, F, 0.38, 0.38, false);
      segs.push([P3(T), P3(S), 0.12 * M, 0.08 * M, up], [P3(S), P3(Hk), 0.075 * M, 0.042 * M, up], [P3(Hk), P3(F), 0.04 * M, 0.036 * M, low], [P3(F), P3(hoof), 0.036 * M, 0.032 * M, low]);
    }
    const he: L2 = [hoof[0] + 0.035 * Math.cos(pa), hoof[1] + 0.035 * Math.sin(pa)];
    legs.push({ d: tx * H.vx + tz * H.vz, segs, hoof: [P3([hoof[0] - 0.05 * Math.cos(pa), hoof[1] - 0.05 * Math.sin(pa)]), P3(he)] });
  });
  const drawLeg = (L: Leg) => {
    for (const [a, b, ra, rb] of L.segs) p.poly(capsule(a, b, ra + ol, rb + ol), INK, 0);
    p.poly(capsule(L.hoof[0], L.hoof[1], 0.05 * M + ol, 0.058 * M + ol), INK, 0);
    for (const [a, b, ra, rb, col] of L.segs) p.poly(capsule(a, b, ra, rb), col, 0);
    p.poly(capsule(L.hoof[0], L.hoof[1], 0.05 * M, 0.058 * M), HOOF, 0);
  };
  // ---- tail ----
  const sw = (gal ? 0.04 : 0.07) * Math.sin(idle * 2.2 + ph * two) * (H.gait === "stand" ? 1 : 0.6);
  const tl: [number, number, number][] = gal
    ? [[-0.92, 1.38, 0], [-1.16, 1.37, sw], [-1.38, 1.27, sw], [-1.6, 1.12 + 0.04 * Math.sin(ph * two * 2), sw]]
    : [[-0.92, 1.38, 0], [-1.02, 1.24, sw * 0.4], [-1.07, 1.0, sw], [-1.07, 0.72, sw * 1.3], [-1.03, 0.46, sw * 1.6]]; // a full tail below the hocks
  const drawTail = () => {
    const c2 = tl.map(([x, y, z]) => { const [bx, by] = B(x, y); return D(bx, by, z); });
    const pts: P2[] = []; for (let i = 0; i + 1 < c2.length; i++) for (let k = 0; k < 6; k++) pts.push(lerp2(c2[i], c2[i + 1], k / 6));
    pts.push(c2[c2.length - 1]);
    // a thin dock widening into a long bushy switch with a ragged, three-tipped end and lighter hair strands: reads as a
    // tail from any side (a smooth dark lozenge on the rump read as a dark oval)
    const wAt = (t: number) => M * (0.03 + 0.1 * smooth01(t / 0.7)) * (1 - 0.25 * smooth01((t - 0.86) / 0.14));
    const L: P2[] = [], R: P2[] = [];
    pts.forEach((q, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l, w = wAt(i / (pts.length - 1));
      L.push([q[0] + nx * w, q[1] + ny * w]); R.push([q[0] - nx * w, q[1] - ny * w]);
    });
    const e = pts[pts.length - 1], e0 = pts[pts.length - 2], el2 = Math.hypot(e[0] - e0[0], e[1] - e0[1]) || 1, ex = (e[0] - e0[0]) / el2, ey = (e[1] - e0[1]) / el2, we = wAt(1);
    const tips: P2[] = [[e[0] - ey * we * 0.7 + ex * 0.07 * M, e[1] + ex * we * 0.7 + ey * 0.07 * M], [e[0] - ey * we * 0.25 + ex * 0.02 * M, e[1] + ex * we * 0.25 + ey * 0.02 * M],
      [e[0] + ex * 0.11 * M, e[1] + ey * 0.11 * M], [e[0] + ey * we * 0.25 + ex * 0.03 * M, e[1] - ex * we * 0.25 + ey * 0.03 * M], [e[0] + ey * we * 0.7 + ex * 0.08 * M, e[1] - ex * we * 0.7 + ey * 0.08 * M]];
    const tp = [...chaikin(L, 1), ...tips, ...chaikin(R, 1).reverse()];
    p.poly(tp, C.mane, ol * 1.4);
    const hair = mix(C.mane, coat, 0.5);
    for (const k of [-0.6, -0.2, 0.2, 0.6]) p.stroke(offPts(pts.slice(Math.round(pts.length * 0.25)), k * 0.075 * M), 0.015 * M, hair);
    p.stroke(offPts(pts.slice(2, pts.length - 3), -0.025 * M), 0.012 * M, mix(C.mane, "#ffffff", 0.3)); // a sheen strand
  };
  // ---- body silhouette (+ neck) ----
  const neck = capsule(n0, n1, 0.25 * M, 0.14 * M);
  const body = [el(-0.05, 1.13, 0.62, 0.3, 0.27), el(0.47, 1.12, 0.26, 0.31, 0.24), el(-0.6, 1.2, 0.34, 0.35, 0.28), el(0.28, 1.36, 0.25, 0.12, 0.15), neck];
  const grad = groupGrad(p, body.flat(), coat, coatSh, light);
  const drawBody = () => {
    union(p, body, grad, ol);
    clipAll(p, body, () => {
      if (C.dapple) for (let i = 0; i < 14; i++) { const q = DB(-0.8 + 1.3 * rnd(i, 1), 1.0 + 0.35 * rnd(i, 2)); p.ell(q[0], q[1], 0.06 * M, 0.05 * M, mix(coat, "#ffffff", 0.35), 0); }
      const yTop = DB(0, 1.02)[1], yBot = DB(0, 0.8)[1], lg = g.createLinearGradient(0, yTop, 0, yBot);
      lg.addColorStop(0, rgba(coatSh, 0)); lg.addColorStop(1, rgba(mul(coatSh, [0.8, 0.8, 0.9]), 0.75));
      g.fillStyle = lg; g.fillRect(0, yTop, 600, yBot - yTop + 60);
    });
  };
  const drawNeckFront = () => { // head-on with a rider: the neck in front of the rider again
    p.poly(neck, null, ol * 2); g.fillStyle = grad; p.path(neck, true); g.fill();
  };
  // ---- mane ----
  const drawMane = () => {
    if (Math.abs(H.rx) < 0.25) return;
    const dx = n0[0] - n1[0], dy2 = n0[1] - n1[1], l = Math.hypot(dx, dy2) || 1;
    let nx = -dy2 / l, ny = dx / l; if (ny > 0) { nx = -nx; ny = -ny; }
    const inner: P2[] = [], outer: P2[] = [];
    for (let i = 0; i <= 12; i++) {
      const wave = Math.sin(two * (ph * (gal ? 1 : 2)) - i * 0.9 + idle * 1.7); // the mane ripples with the gait (secondary motion)
      const t = i / 12, c = lerp2(n1, n0, t), r = lerp(0.14, 0.25, t) * M, sp = ((i % 2 ? 0.075 : 0.04) + 0.012 * wave) * M * (1 - 0.5 * t), flow = (gal ? 0.07 + 0.02 * wave : 0.015 + 0.008 * wave) * M * dirS;
      inner.push([c[0] + nx * (r - 0.035 * M), c[1] + ny * (r - 0.035 * M)]);
      outer.push([c[0] + nx * (r + sp) - flow, c[1] + ny * (r + sp)]);
    }
    const mp = [...inner, ...outer.reverse()];
    p.poly(mp, C.mane, ol * 0.9);
  };
  // ---- head ----
  const jaw = (() => { const c: L2 = [Hp[0] + 0.18 * (Hm[0] - Hp[0]) - 0.05, Hp[1] + 0.18 * (Hm[1] - Hp[1]) - 0.06]; return el(c[0], c[1], 0.13, 0.12, 0.1); })();
  const headCap = capsule(hp, hm, 0.12 * M, 0.085 * M);
  const drawHead = () => {
    // ears (behind the poll)
    for (const ez of [-0.07, 0.07]) {
      const b0 = DB(Hp[0] - 0.03, Hp[1] + 0.04, ez), b1 = DB(Hp[0] + 0.04, Hp[1] + 0.02, ez);
      const tip = DB(Hp[0] - (tired ? 0.16 : 0.05), Hp[1] + (tired ? 0.14 : 0.24), ez * 1.3);
      const ear = chaikin([b0, tip, b1], 1);
      p.poly(ear, ez * H.vz < 0 ? shade(coat, 0.85) : coat, ol * 1.6);
      p.stroke([lerp2(lerp2(b0, b1, 0.5), tip, 0.2), lerp2(lerp2(b0, b1, 0.5), tip, 0.75)], 0.012 * M, shade(coat, 0.6));
    }
    const hg = groupGrad(p, [...headCap, ...jaw], coat, coatSh, light);
    union(p, [headCap, jaw], hg, ol);
    clipAll(p, [headCap], () => {
      p.ell(hm[0], hm[1], 0.11 * M, 0.1 * M, mix(coat, "#3a2a2a", 0.35), 0); // soft dark muzzle
      if (C.blaze) {
        const off = Math.abs(H.rx) > 0.6 ? 0.07 : 0, a2 = lerp2(hp, hm, 0.12), b2 = lerp2(hp, hm, 0.92);
        const nx = -(hm[1] - hp[1]), ny = hm[0] - hp[0], l = Math.hypot(nx, ny) || 1, s2 = (ny < 0 ? 1 : -1) * off * M;
        p.stroke([[a2[0] + (nx / l) * s2, a2[1] + (ny / l) * s2], [b2[0] + (nx / l) * s2 * 1.2, b2[1] + (ny / l) * s2 * 1.2]], 0.05 * M, "#f4f0e6");
      }
    });
    // eyes (both when seen head-on), nostril, mouth line
    for (const ez of [0.1, -0.1]) {
      if (ez * H.vz < -0.02) continue;
      const [ex, ey] = DB(Hp[0] + 0.2 * (Hm[0] - Hp[0]) + 0.01, Hp[1] + 0.2 * (Hm[1] - Hp[1]) + 0.04, ez);
      if (H.tack === "harness") p.poly(rrect(ex - 0.06 * M * dirS - 0.035 * M, ey - 0.045 * M, ex - 0.06 * M * dirS + 0.035 * M, ey + 0.045 * M, 0.015 * M, 3), LEATHER, ol * 0.6);
      p.ell(ex, ey, 0.026 * M, 0.024 * M, INK, 0);
      if (tired) p.ell(ex, ey - 0.012 * M, 0.03 * M, 0.016 * M, coat, 0);
      p.stroke([[ex - 0.03 * M, ey - 0.02 * M], [ex + 0.03 * M, ey - 0.022 * M]], 0.012 * M);
    }
    const [nxp, nyp] = DB(Hm[0] - 0.01, Hm[1] + 0.03, 0.05 * zN);
    p.arc(nxp, nyp, 0.022 * M, 0.016 * M, 150, 360, 0.011 * M);
    if (Math.abs(H.rx) > 0.3) { const m0 = DB(Hm[0] - 0.02, Hm[1] - 0.05, 0), m1 = DB(Hm[0] - 0.11, Hm[1] - 0.04, 0); p.stroke([m0, m1], 0.01 * M); }
    // forelock
    const f0 = DB(Hp[0] + 0.02, Hp[1] + 0.07), f1 = DB(Hp[0] + 0.13, Hp[1] - 0.06), f2 = DB(Hp[0] + 0.07, Hp[1] - 0.09);
    p.poly(chaikin([f0, f1, f2, DB(Hp[0] - 0.02, Hp[1] + 0.02)], 1), C.mane, ol * 0.8);
    // bridle: noseband, cheek strap, browband
    if (H.tack) {
      const nb = lerp2(hp, hm, 0.7), ax = hm[0] - hp[0], ay = hm[1] - hp[1], l = Math.hypot(ax, ay) || 1, nx = -ay / l, ny = ax / l, r = 0.1 * M;
      p.band([[nb[0] + nx * r, nb[1] + ny * r], [nb[0] - nx * r, nb[1] - ny * r]], LEATHER, 0.025 * M, ol * 0.4);
      const ch0 = lerp2(hp, hm, 0.05), side = DB(Hp[0] + 0.02, Hp[1] - 0.02, 0.1 * zN);
      p.band([side, lerp2(nb, side, 0.15)], LEATHER, 0.02 * M, ol * 0.4);
      p.band([[ch0[0] + nx * 0.12 * M, ch0[1] + ny * 0.12 * M], [ch0[0] - nx * 0.12 * M, ch0[1] - ny * 0.12 * M]], LEATHER, 0.02 * M, ol * 0.4);
      p.dot(nb[0] - nx * r * 0.2, nb[1] - ny * r * 0.2, 0.018 * M, BRASS2);
    }
  };
  // ---- tack ----
  const nearQuad = (pts: L2[], z: number): P2[] => chaikin(pts.map(([x, y]) => DB(x, y, z)), 2);
  const drawTackBody = () => {
    const z = 0.29 * zN;
    if (H.tack === "harness") {
      clipAll(p, body, () => {
        p.band([DB(0.2, 1.48, z), DB(0.23, 0.82, z)], LEATHER, 0.07 * M, ol * 0.5);        // girth
        p.band([DB(-0.52, 1.1, z), DB(-0.98, 1.14, z)], LEATHER, 0.05 * M, ol * 0.5);      // breeching
        p.band([DB(-0.56, 1.55, 0), DB(-0.6, 1.1, z)], LEATHER, 0.035 * M, ol * 0.5);      // hip strap
      });
      if (H.vx > -0.2) { // pad + brass terrets: only when the horse is not going away (from behind they read as eyes + mouth)
        p.poly(nearQuad([[0.06, 1.42], [0.36, 1.42], [0.34, 1.53], [0.08, 1.53]], 0), LEATHER, ol * 0.8); // pad
        for (const k of [0.13, 0.29]) { const q = DB(k, 1.57); p.ell(q[0], q[1], 0.022 * M, 0.026 * M, BRASS2, ol * 0.5); }
      } else clipAll(p, body, () => p.band([DB(-0.2, 1.47, 0), DB(-0.9, 1.4, 0)], LEATHER, 0.035 * M, ol * 0.4)); // crupper along the spine
      // (the traces are 3D: the world draws them from HITCH to the swingle bars)
    } else if (H.tack === "saddle") {
      const cl = H.cloth ?? "#a8343a";
      const cloth = nearQuad([[-0.34, 1.44], [0.3, 1.44], [0.32, 0.98], [-0.36, 0.98]], z);
      p.poly(cloth, cl, ol * 0.9);
      p.stroke(offPts(nearQuad([[-0.36, 1.0], [0.32, 1.0], [0.32, 1.0]], z), 0), 0.025 * M, "#f0d27a");
      clipAll(p, body, () => p.band([DB(0.12, 1.45, z), DB(0.15, 0.82, z)], LEATHER, 0.045 * M, ol * 0.4)); // girth
      const seat = chaikin([DB(-0.34, 1.58), DB(-0.3, 1.47), DB(-0.06, 1.46), DB(0.18, 1.5), DB(0.24, 1.58), DB(0.28, 1.46), DB(0.2, 1.3, z), DB(-0.28, 1.3, z)], 1);
      p.gradFill(seat, "#7a4a2c", "#4a2c1c", light, 0.3); p.poly(seat, null, ol * 1.4);
      if (!H.rider) { // stirrup hanging
        const s0 = DB(0.02, 1.36, z * 1.05), s1 = DB(0.02, 0.68, z * 1.05); // down to the riding foot's height (mount)
        p.band([s0, s1], LEATHER, 0.025 * M, ol * 0.35);
        p.poly([[s1[0] - 0.05 * M, s1[1]], [s1[0] + 0.05 * M, s1[1]], [s1[0] + 0.06 * M, s1[1] + 0.07 * M], [s1[0] - 0.06 * M, s1[1] + 0.07 * M]], "#9a9aa4", ol * 0.6);
      }
    }
  };
  const drawCollar = () => {
    if (H.tack !== "harness") return;
    const c = lerp2(n0, n1, 0.16), ang = Math.atan2(n1[1] - n0[1], n1[0] - n0[0]) * 180 / Math.PI + 90;
    const maj = 0.31 * M, mn = (0.08 * Math.abs(H.rx) + 0.24 * Math.abs(H.rz)) * M + 0.02 * M;
    p.poly(ellPts(c[0], c[1], maj, mn, 0, 360, ang, 32), LEATHER, ol);
    p.poly(ellPts(c[0], c[1], maj * 0.84, mn * 0.62, 0, 360, ang, 32), "#8a5a3a", ol * 0.5);
    p.stroke(ellPts(c[0], c[1], maj * 0.98, mn * 0.9, 200, 340, ang, 16), 0.02 * M, BRASS2);
  };
  const drawReins = () => {
    if (!H.tack) return;
    const bit = DB(Hm[0] - 0.08, Hm[1] + 0.0, 0.08 * zN);
    const to = H.tack === "harness" ? DB(0.2, 1.6) : DB(0.2, 1.7, 0.1 * zN);
    p.stroke(curve(bit, lerp2(lerp2(bit, to, 0.5), [lerp2(bit, to, 0.5)[0], lerp2(bit, to, 0.5)[1] + 0.06 * M], 0.5), to, 8), 0.018 * M, LEATHER);
  };
  // ---- depth slots ----
  const away = H.vx < -0.25, headOn = H.vx > 0.45 && Math.abs(H.rx) < 0.75;
  const tailFront = H.vx < 0; // the tail is nearer the lens than the rump whenever the horse is going away at all
  for (const L of legs.sort((a, b) => a.d - b.d)) drawLeg(L);
  if (!tailFront) drawTail();
  if (away) { drawHead(); drawReins(); drawCollar(); } // seen from behind: head, reins and collar are hidden behind the body
  drawBody();
  drawTackBody();
  drawMane();
  if (H.rider) {
    const front = Math.abs(H.rx) < 0.42;
    H.rider(p, DB(-0.06, 1.5), M / MU, dirS, front);
    if (headOn) { drawNeckFront(); drawMane(); }
  }
  if (!away) { drawCollar(); drawHead(); drawReins(); }
  if (tailFront) drawTail();
};
/** where a rider's hip sits on the character design card (seat of the saddle = sole - 0.2 HH, see bodyFront sit) */
export const seatY = (o: Outfit) => 975 - 0.2 * 2 * 0.94 * BUILD[o.build ?? "adult"].a;
