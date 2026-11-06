// VARENNES cast as lit flat sprites in the 3D world (SHOTPLAN.md sections 1, 2, 4, 5). Each frame every character, horse
// and prop asks for a drawing (a key + a draw call); the pool keeps one canvas per distinct drawing. Characters and horses
// are yaw-only billboards shaded by cardShade(); standing ones get a contact blob. Effects (torch flames, lantern glows,
// the assignat, hoof dust) are unlit cards. Everything lives on the NOINK layer so the world ink pass never outlines them.
// Staging rule: every crowd faces the lens, in 3/4 or in profile; NO back view (a facing-away person gets the front
// drawing, or the profile toward what he looks at). All timing comes from story.ts (CUE, coachAt, teamAt, drouetAt...).
// The coach passengers sit at coachLocal(coachAt(), COACH_LOCAL.KING_SEAT): the world's coach window frames them.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, frontAnchors, sideAnchors, CARD_TOP, CARD_H, MU, sansCulotte, bourgeois, woman, nationalGuard, townNight, groom,
  drawMusket, drawBarrel, COACHMAN, WATCHMAN, BEGGAR, PEASANT, drawDog, drawChicken, drawSheep, AnimalOpts, KING_ROYAL, KING_VALET, QUEEN, GOVERNESS, PRINCESS, DAUPHIN, DROUET, HORSE_COATS, drawHorse, seatY, drawAssignat, fxFlame,
  fxPuff, fxDust, fxThumb, HAT_PULL, mix, fxShadow, fxContact, fxGlow, Outfit, Expr, FrontOpts, SideOpts, Anchors, Pose, HorseGait, RiderFn,
} from "./toon";
import {
  FPS, D0, SHOTS, CUE, LOC, V3, FortState, smooth, clamp01, glide, camAt, coachAt, coachLocal, COACH_LOCAL, teamAt, teamSwapAt, drouetAt, bridgeCartAt,
  assignatAt, ASSIGNAT_SIZE, BARREL, HorsePose, CoachPose,
} from "./story";
import { NOINK } from "./ink";
import { berlineWindowAt, VARENNES_WINDOWS } from "./build";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
    // keep the spare canvases bounded (big near-tier cards are ~28 MB each)
    while (this.free.length > 48) this.free.shift();
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
/** character card: design x 0..600, y -CARD_TOP..1000, soles (y 975) at the mesh origin */
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, CARD_H * SU); g.translate(0, (975 - (1000 - CARD_H / 2)) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only), casts its silhouette
 *  when world.ts says so (golden). Drawn after the contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (smoke, dust), a multiply ground blob, or an HDR
 *  additive glow (lantern light, x2.5 so it blooms) */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; glow: THREE.MeshBasicMaterial; haze: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false;
    // cut-out (alphaTest) + depth write: a see-through soft card let the world ink show through every smoke puff
    this.soft = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, depthWrite: true, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.glow = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    this.glow.color.setScalar(GLOW_HDR);
    // see-through soft card (hoof dust): normal blending, no depth write, opacity from the key's "|a<alpha>" suffix
    this.haze = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    } else if (this.r!.key.includes("|glow|")) { this.glow.map = t; this.mesh.material = this.glow; this.mesh.renderOrder = 2; }
    else if (this.r!.key.includes("|haze|")) {
      const m = /\|a([0-9.]+)$/.exec(this.r!.key);
      this.haze.map = t; this.haze.opacity = m ? Number(m[1]) : 1; this.mesh.material = this.haze; this.mesh.renderOrder = 1.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}
const GLOW_HDR = 2.5;

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
  /** stable identity (QA: pops / jumps / overlaps) */ id?: string;
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[] };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
/** head-shape seed: 7 shapes, so crowds share canvases */
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x CARD_H design]; sized for the 1440 x 2560 final */
const tier = (d: number): [number, number, number] => {
  const k = d < 3.2 ? 3.0 : d < 6.5 ? 1.8 : d < 16 ? 0.8 : d < 40 ? 0.4 : 0.24;
  return [Math.round(600 * k), Math.round(CARD_H * k), k];
};

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
/** the sun of the world that is calling: the attached root whose sun target sits on this camera's view axis */
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

// ---------------- views ----------------
type View = { side: boolean; mirror: boolean; facing: -1 | 0 | 1 };
const FRONT: View = { side: false, mirror: false, facing: 0 };
/** someone at (x, z) facing (dx, dz): profile when the facing is more than ~55 deg off the lens, else the front drawing
 *  turned 3/4 toward the facing side. Facing away never gets a back view (and the staging never asks for one). */
const viewFor = (cam: CamInfo, x: number, z: number, dx: number, dz: number): View => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1, dl = Math.hypot(dx, dz) || 1;
  const c = (tx * dx + tz * dz) / (tl * dl), r = (dx * cam.right.x + dz * cam.right.z) / dl;
  if (Math.abs(c) < 0.57) return { side: true, mirror: r < 0, facing: 0 };
  return { side: false, mirror: false, facing: Math.abs(r) > 0.3 ? (r > 0 ? 1 : -1) : 0 };
};
const REFS = new Map<string, CamInfo>();
/** the camera at frame `f` of take `id`, as a fixed reference for choosing views */
const refCam = (id: number, f: number): CamInfo => {
  const k = `${id}|${f}`;
  let r = REFS.get(k);
  if (!r) { const c = camAt(id, f), dx = c.look[0] - c.pos[0], dz = c.look[2] - c.pos[2], l = Math.hypot(dx, dz) || 1; r = { pos: new THREE.Vector3(...c.pos), right: new THREE.Vector3(-dz / l, 0, dx / l) }; REFS.set(k, r); }
  return r;
};
/** design point on a card -> world point (nudged 4 cm toward the lens so effects sit in front of the card) */
const W2D = (cam: CamInfo, P: Place, pt: [number, number], nudge = 0.04): V3 => {
  const dx = cam.pos.x - P.x, dz = cam.pos.z - P.z, l = Math.hypot(dx, dz) || 1, sc = P.scale ?? 1, m = P.mirror ? -1 : 1;
  const ox = (pt[0] - 300) * SU * sc * m, oy = (975 - pt[1]) * SU * sc;
  return [P.x + (dz / l) * ox + (dx / l) * nudge, P.y + oy, P.z - (dx / l) * ox + (dz / l) * nudge];
};
type WAnch = { lantern: V3[]; flame: V3[]; hands: V3[]; mouth?: V3 };
const toWorld = (cam: CamInfo, P: Place, a: Anchors): WAnch => {
  const m = (pt: [number, number]) => W2D(cam, P, pt);
  return { lantern: a.lantern.map(m), flame: a.flame.map(m), hands: a.hands.map(m), mouth: a.mouth && m(a.mouth) };
};

// ---------------- life: blinks ----------------
/** eyelid 0 open .. 1 shut. Reference: gaps 0.5-2.3 s, 4-frame blink half / shut / shut / half, plus a blink across
 *  every expression swap (frames in `swaps`: the new face appears on the second shut frame) */
const LID = [0.5, 1, 1, 0.5];
const lidF = (f: number, i: number, swaps: readonly number[] = []) => {
  for (const s of swaps) { const k = f - s + 2; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13)); // next blink 0.5-2.3 s later
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

// ---------------- ground shadows ----------------
/** TIGHT contact pool right under the feet (~.5 on screen at the core) so nobody floats, plus by day a lighter soft tail
 *  stretched AWAY from the sun. Golden: world.ts casts real card shadows. */
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h;
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c, w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

// ---------------- who's who ----------------
type Who = { i: number; o: Outfit; okey: string };
type Role = "sc" | "wm" | "bg" | "ng" | "tn" | "gr" | "mg";
const NV: Record<Role, number> = { sc: 6, wm: 4, bg: 3, ng: 3, tn: 9, gr: 3, mg: 3 };
const MAKE: Record<Role, (v: number) => Outfit> = { sc: sansCulotte, wm: woman, bg: bourgeois, ng: (v) => nationalGuard(v), tn: townNight, gr: groom, mg: (v) => nationalGuard(v, true) };
const OUT = new Map<string, Outfit>();
const who = (role: Role, i: number, v = i): Who => {
  const vv = ((v % NV[role]) + NV[role]) % NV[role], okey = `${role}${vv}`;
  let o = OUT.get(okey);
  if (!o) { o = MAKE[role](vv); OUT.set(okey, o); }
  return { i, o, okey };
};
const solo = (i: number, o: Outfit, okey: string): Who => ({ i, o, okey });
const KING = solo(399, KING_ROYAL, "kingR"), VALET = solo(400, KING_VALET, "kingV"), QN = solo(401, QUEEN, "queen"), GV = solo(402, GOVERNESS, "gov");
const HOOKMAN = solo(90, { ...sansCulotte(2), hands: sansCulotte(2).jacket, armW: 3 } /* the sleeve ends in a cuff under the bill's mitten */, "hookman");
const PR = solo(403, PRINCESS, "princess"), DP = solo(404, DAUPHIN, "dauphin"), DR = solo(405, DROUET, "drouet"), CM = solo(406, COACHMAN, "coachman");
/** Drouet holding the bill: his hand's thumb is drawn over the paper's front edge instead (relay) */
const DR_H = solo(405, { ...DROUET, noThumb: true }, "drouetH");
/** the valet king with the curl showing (peek 1) or tugged under the hat (0) */
const valet = (peek: number): Who => { const k = Math.round(peek * 6) / 6; return k >= 1 ? VALET : solo(400, { ...KING_VALET, curlPeek: k }, `kingV${k}`); };

/** the frame being staged (idle breathing phases) */
let FRAME = 0;
/** shade a placed card toward the dark of a doorway / passage (0 lit .. 1 deep shadow): a cool dark wash over its texture */
const darken = (pl: Place, a: number) => {
  if (a < 0.02) return;
  const aq = q(Math.min(1, a), 12), d0 = pl.draw;
  pl.key += `|dk${aq}`;
  pl.draw = (pp) => { d0(pp); const g = pp.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-atop"; g.fillStyle = `rgba(14,11,26,${(0.84 * aq).toFixed(3)})`; g.fillRect(0, 0, 8000, 12000); g.restore(); };
};
/** eased travel for a start at f0 accelerating to v over R frames (distance, speed) */
const easeGo = (f: number, f0: number, v: number, R = 12): [number, number] => {
  const tt = f - f0;
  if (tt <= 0) return [0, 0];
  return tt < R ? [(v * tt * tt) / (2 * R), (v * tt) / R] : [v * (tt - R / 2), v];
};
/** soft arrival: a value rising past `end - E` approaches `end` exponentially (C1, no stop snap) */
const softEnd = (raw: number, end: number, E = 0.6) => (raw < end - E ? raw : end - E * Math.exp(-(raw - (end - E)) / E));
/** a walk phase that lands on the passing pose (0.25: feet under the body) exactly when the walker reaches `sEnd` */
const walkPhase = (s: number, sEnd: number, cycle: number) => q((((s - sEnd) / cycle + 0.25) % 1 + 1) % 1, 24);
/** one-off spacing for a static group (resolved once at load, never per frame) */
const spread = <T extends { x: number; z: number }>(list: T[], r = 0.36, iters = 30): T[] => {
  for (let it = 0; it < iters; it++) for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j], dx = a.x - b.x, dz = a.z - b.z, d = Math.hypot(dx, dz) || 1e-3;
    if (d >= 2 * r) continue;
    const push = (2 * r - d) / 2, ux = dx / d, uz = dz / d;
    a.x += ux * push; a.z += uz * push; b.x -= ux * push; b.z -= uz * push;
  }
  return list;
};
type PutOpt = { scale?: number; shadow?: boolean; k?: number; /** story-placed: the spacing solver never moves it */ pin?: boolean; /** no body (seated, in a window) */ ghost?: boolean };
/** a standing thing the spacing solver keeps apart from the others: one or more ground circles [dx, dz, r] around (x, z);
 *  its card and its attached effects (contact blob, flame, lantern glow) move together */
type Body = { places: Place[]; fx: FxPlace[]; x: number; z: number; x0: number; z0: number; c: [number, number, number][]; pin: boolean };
let BODIES: Body[] = [];
const body = (places: Place[], x: number, z: number, c: [number, number, number][], pin: boolean, fx: FxPlace[] = []): Body => {
  const b: Body = { places, fx, x, z, x0: x, z0: z, c, pin };
  BODIES.push(b);
  return b;
};
/** a pinned obstacle: the berline's body (people never stand inside the coach) */
const coachBody = (c: CoachPose) => body([], c.pos[0], c.pos[2], [-1.15, 0, 1.15].map((k) => [c.dir[0] * k, c.dir[2] * k, 1.02] as [number, number, number]), true);
/** push every pair of bodies apart until no two ground circles overlap (min centre distance = r1 + r2), pinned ones stay */
const solveSpacing = () => {
  const B = BODIES;
  for (let it = 0; it < 10; it++) {
    let moved = false;
    for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
      const a = B[i], b = B[j];
      if (a.pin && b.pin) continue;
      for (const ca of a.c) for (const cb of b.c) {
        let dx = a.x + ca[0] - (b.x + cb[0]), dz = a.z + ca[1] - (b.z + cb[1]);
        const min = ca[2] + cb[2], d = Math.hypot(dx, dz);
        if (d >= min) continue;
        if (d < 1e-4) { const an = hh(i * 31 + j, 77) * Math.PI * 2; dx = Math.cos(an); dz = Math.sin(an); } else { dx /= d; dz /= d; }
        const push = min - d + 1e-3, wa = a.pin ? 0 : b.pin ? 1 : 0.5, wb = 1 - wa;
        a.x += dx * push * wa; a.z += dz * push * wa; b.x -= dx * push * wb; b.z -= dz * push * wb;
        moved = true;
      }
    }
    if (!moved) break;
  }
  for (const b of B) {
    const dx = b.x - b.x0, dz = b.z - b.z0;
    if (Math.abs(dx) + Math.abs(dz) < 1e-6) continue;
    for (const pl of b.places) { pl.x += dx; pl.z += dz; }
    for (const e of b.fx) { e.x += dx; e.z += dz; }
  }
};
type Put = { place: Place; anch: () => WAnch; body: Body | null };
/** one character drawing sized by distance and lit from the scene's sun */
const put = (out: Stage, cam: CamInfo, w: Who, x: number, y: number, z: number, view: View, fo: FrontOpts, so: SideOpts, opt: PutOpt = {}): Put => {
  const scale = opt.scale ?? 1;
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2 * scale, z)) / scale;
  const [cw, ch, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(w.i);
  const f2: FrontOpts = { facing: view.facing, ...fo, breath: 0, light, seed };
  const s2: SideOpts = { ...so, breath: 0, light, seed };
  const standing = (view.side ? so.mode : fo.mode) === "stand" && opt.shadow !== false && !opt.ghost && Math.abs(y - D0) < 0.05;
  const breathe = standing ? 1 + 0.0042 * Math.sin(2 * Math.PI * (FRAME / 96 + hh(w.i, 5))) : 1;
  const key = view.side ? `S|${w.okey}|${fkey(s2)}` : `F|${w.okey}|${fkey(f2)}`;
  const place: Place = {
    key, x, y, z, scale: scale * breathe, mirror, size: [cw, ch, k], id: `c${w.i}`,
    draw: (p) => { p.g.translate(0, CARD_TOP); if (view.side) bodySide(p, w.o, s2); else bodyFront(p, w.o, f2); },
  };
  out.places.push(place);
  const n0 = out.fx.length;
  if (opt.shadow !== false) blob(out, x, y, z, scale, opt.k ?? 1);
  // spacing: adults 0.34 m (pairs >= 0.68 m apart), kids 0.29 (>= 0.58 m); floating / seated / window cards have no body
  const grounded = opt.shadow !== false && !opt.ghost && Math.abs(y - D0) < 0.05;
  const r = (w.o.build === "kid" ? 0.29 : 0.34) * Math.max(0.8, scale);
  const bd = grounded ? body([place], x, z, [[0, 0, r]], !!opt.pin, out.fx.slice(n0)) : null;
  return { place, anch: () => toWorld(cam, place, view.side ? sideAnchors(w.o, s2) : frontAnchors(w.o, f2)), body: bd };
};
/** same expression/pose for the front and the side drawing */
const both = (fo: FrontOpts, so: SideOpts = {}): [FrontOpts, SideOpts] => [fo, { expr: fo.expr, blink: fo.blink, pose: fo.pose, pk: fo.pk, alt: fo.alt, noHat: fo.noHat, eyeUp: fo.eyeUp, ...so }];
const putAuto = (out: Stage, cam: CamInfo, w: Who, x: number, y: number, z: number, dir: [number, number], fo: FrontOpts, so: SideOpts = {}, opt: PutOpt = {}) => {
  const [f2, s2] = both(fo, so);
  return put(out, cam, w, x, y, z, viewFor(cam, x, z, dir[0], dir[1]), f2, s2, opt);
};


// ---------------- placement helpers ----------------
/** world point -> design point on a placed card (inverse of W2D; for hands that must reach a world prop) */
const toDesign = (cam: CamInfo, P: Place, w: V3): [number, number] => {
  const dx = cam.pos.x - P.x, dz = cam.pos.z - P.z, l = Math.hypot(dx, dz) || 1, sc = P.scale ?? 1, m = P.mirror ? -1 : 1;
  const ox = (w[0] - P.x) * (dz / l) - (w[2] - P.z) * (dx / l);
  return [300 + (ox / (SU * sc)) * m, 975 - (w[1] - P.y) / (SU * sc)];
};
/** screen-x of a world point along the lens' right axis (for "which side of the screen") */
const sx = (cam: CamInfo, p: V3) => (p[0] - cam.pos.x) * cam.right.x + (p[2] - cam.pos.z) * cam.right.z;
/** a profile facing the screen side of `dir` (Drouet looking at the window with the lens behind him: never a back view) */
const sideToward = (cam: CamInfo, dx: number, dz: number): View => ({ side: true, mirror: dx * cam.right.x + dz * cam.right.z < 0, facing: 0 });
/** design height (m) of the head centre above the soles (cached per outfit/view/mode) */
const HC = new Map<string, number>();
const headUp = (w: Who, side: boolean, mode: "stand" | "sit") => {
  const key = `${w.okey}|${side}|${mode}`;
  let v = HC.get(key);
  if (v === undefined) {
    const a = side ? sideAnchors(w.o, { mode, seed: seedOf(w.i) }) : frontAnchors(w.o, { mode, seed: seedOf(w.i) });
    v = (975 - (a.mouth ? a.mouth[1] : 600)) * SU + 0.045; // the mouth anchor sits ~20u under the head centre
    HC.set(key, v);
  }
  return v;
};
const NOWHERE = (): Stage => ({ places: [], fx: [] });
/** a seated passenger whose head centre lands on `head` (the coach window) */
const seated = (out: Stage, cam: CamInfo, w: Who, head: V3, view: View, fo: FrontOpts, so: SideOpts, scale = 1) => {
  const y = head[1] - headUp(w, view.side, "sit") * scale;
  return put(out, cam, w, head[0], y, head[2], view, { ...fo, mode: "sit" }, { ...so, mode: "sit" }, { scale, shadow: false });
};
const look = (cam: CamInfo, x: number, z: number): [number, number] => [cam.pos.x - x, cam.pos.z - z];
/** the bill's lower-left corner on screen (where the drawn thumb pinches it): the holding hand goes there, not behind
 *  the middle of the bill (a hand card nearer the lens than the bill would cover the portrait) */
const billCorner = (cam: CamInfo, b: V3, side = -1): V3 => [b[0] + cam.right.x * 0.085 * side, b[1] - 0.035, b[2] + cam.right.z * 0.085 * side];
/** the berline's window anchor (centre, normal, along, up, w, h, seat), from the world owner's berlineWindowAt; it follows the door. */
const windowAt = (c: CoachPose) => berlineWindowAt(c);
/** a passenger seat beside the king, inside the window frame (BERLINE.win.fwd = -0.42..0.42): fwd offset from the king */
const besideKing = (c: CoachPose, dFwd: number, up = 0, dLeft = -0.06): V3 => {
  const s = windowAt(c).seat; return [s[0] + c.dir[0] * dFwd + c.left[0] * dLeft, s[1] + up, s[2] + c.dir[2] * dFwd + c.left[2] * dLeft];
};

// ---------------- effects ----------------
/** soft dust puff (hooves, the cart) */
const dust = (out: Stage, x: number, y: number, z: number, u: number, s = 0.5) => {
  if (u < 0 || u >= 1) return;
  const uq = q(u, 20);
  out.fx.push({ key: `dust${uq}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, uq), x, y: y + 0.25 * s, z, w: s, h: s, soft: true });
};
/** lantern halo: <= 1.5x the (1.9x) lantern body, ~0.17 m */
const LANT_GLOW = 0.26;
const glow = (out: Stage, at: V3, s = 0.75, own: Body | null = null) => {
  const e: FxPlace = { key: "glow|lantern", cw: 128, ch: 128, draw: fxGlow, x: at[0], y: at[1], z: at[2], w: s, h: s };
  out.fx.push(e); if (own) own.fx.push(e);
};
/** lantern halos on a put character's lantern glass (they follow the spacing solver with him) */
const lanterns = (out: Stage, P: Put, s = LANT_GLOW) => { for (const g of P.anch().lantern) glow(out, g, s, P.body); };
/** torch flame: a flickering cut-out flame (6 variants, 3 f each) standing on the torch head + an HDR additive glow */
const flame = (out: Stage, cam: CamInfo, at: V3, f: number, i: number, own: Body | null = null) => {
  const k = Math.floor((f + i * 7) / 3) % 6, w = 0.17, h = 0.28; // the flame tongue standing on the pitch head
  const tx = cam.pos.x - at[0], tz = cam.pos.z - at[2], l = Math.hypot(tx, tz) || 1;
  const e: FxPlace = { key: `flame${k}`, cw: 128, ch: 192, draw: (p) => fxFlame(p, k), x: at[0] + (tx / l) * 0.03, y: at[1] + h * 0.42, z: at[2] + (tz / l) * 0.03, w, h };
  out.fx.push(e); if (own) own.fx.push(e);
  glow(out, [at[0] + (tx / l) * 0.05, at[1] + h * 0.4, at[2] + (tz / l) * 0.05], h * (1.3 + 0.12 * Math.sin(f * 0.9 + i)), own); // halo <= 1.5x the flame
};
/** the assignat in a hand, fluttering or lying on the cobbles (pose from story.assignatAt) */
const assignat = (out: Stage, cam: CamInfo, id: number, f: number) => {
  const a = assignatAt(id, f);
  if (a.mode === "none") return;
  const [w, h] = ASSIGNAT_SIZE, cw = 660, ch = 450, key = "assignat|n";
  const draw = (p: Pen) => drawAssignat(p, cw, ch, false); // no painted thumb: the holder's own hand grips the edge
  if (a.mode === "ground" || a.mode === "fall") {
    const tilt = a.mode === "fall" ? Math.max(0.3, Math.abs(a.normal[1])) : 1;
    // the last of the glide: it floats 6 cm over the cobbles while the lens is still decelerating onto it and settles flat
    // over 8 f as the lens stops. (Post's camera blur tells cards from the world by depth: < ~4.5 cm over the ground at
    // 0.9 m the bill counted as cobbles and was smeared double at 1753-1758 while the lens moved.)
    const settle = id === 4 ? 0.06 * (1 - smooth((f - CUE.BILL_FALL[1]) / 8)) : 0;
    out.fx.push({ key, cw, ch, draw, x: a.pos[0], y: a.pos[1] + 0.004 + settle, z: a.pos[2], w, h: h * tilt, flat: true, rot: a.spin });
    return;
  }
  // camera-facing card; its height shrinks as the printed face turns edge-on to the lens (flutter)
  const t = tmp.set(cam.pos.x - a.pos[0], cam.pos.y - a.pos[1], cam.pos.z - a.pos[2]).normalize();
  const fac = Math.max(0.18, Math.abs(a.normal[0] * t.x + a.normal[1] * t.y + a.normal[2] * t.z));
  void fac;
  out.fx.push({ key, cw, ch, draw, x: a.pos[0], y: a.pos[1], z: a.pos[2], w, h, rot: a.spin }); // in a hand: facing the lens
};

// ---------------- horses ----------------
const HSCALE = 2.5, HM = MU / HSCALE, RIDER_K = 1.28;
type Rider = { w: Who; pose: Pose; expr: Expr; pk?: number; blink?: number };
type HorseAt = { pos: V3; dir: V3; gait: HorseGait; phase: number; /** m/f: eases the leg swing in and out */ speed?: number };
/** continuous gait index 0 walk .. 1 trot .. 2 gallop from speed (m/f), and its stride (m per cycle) */
const gkOf = (v: number) => (v < 0.06 ? 0 : v < 0.15 ? (v - 0.06) / 0.09 : v < 0.35 ? 1 + (v - 0.15) / 0.2 : 2);
const strideOf = (v: number) => { const g = gkOf(v); return g < 1 ? 1.7 + 0.9 * g : 2.6 + 0.8 * (g - 1); };
const gaitOfV = (v: number): HorseGait => (v < 0.004 ? "stand" : v < 0.09 ? "walk" : v < 0.3 ? "trot" : "gallop");
/** the team's gait phase per take, integrated frame by frame (phase rate = speed / stride, so no leg ever jumps when
 *  the stride changes with the gait) */
const TEAM_PH = new Map<number, Float64Array>();
const teamPhase = (id: number, f: number) => {
  const s = SHOTS[id - 1];
  let arr = TEAM_PH.get(id);
  if (!arr) {
    arr = new Float64Array(s.b - s.a + 2);
    let acc = 0;
    for (let g = s.a; g <= s.b; g++) { const v = coachAt(id, g).speed; acc += v / strideOf(v); arr[g - s.a] = acc; }
    TEAM_PH.set(id, arr);
  }
  return arr[Math.max(0, Math.min(arr.length - 1, f - s.a))];
};
/** a horse card (+ its rider) at `h`; coat index, tack, saddle-cloth colour, tired head */
const horse = (out: Stage, cam: CamInfo, h: HorseAt, coat: number, tack: "harness" | "saddle" | null,
  opt: { cloth?: string; tired?: boolean; tiredK?: number; rider?: Rider | null; idle?: number; i?: number; dark?: number } = {}) => {
  const [x, y, z] = h.pos, yawC = Math.atan2(cam.pos.x - x, cam.pos.z - z), Rx = Math.cos(yawC), Rz = -Math.sin(yawC);
  const dx = h.dir[0], dz = h.dir[2], rx0 = Rx * dx + Rz * dz, rz0 = Rx * dz - Rz * dx;
  const standing = h.gait === "stand", steps = standing ? 72 : 144; // 5 deg (standing, shared canvases) / 2.5 deg steps
  const ang = (Math.round((Math.atan2(rz0, rx0) / (Math.PI * 2)) * steps) / steps) * Math.PI * 2;
  const rx = Math.cos(ang), rz = Math.sin(ang);
  const amp = standing ? 0 : q(h.speed === undefined ? 1 : smooth(h.speed / 0.035), 8);
  const phase = standing ? 0 : q(h.phase, 96), idle = q((opt.idle ?? 0) + (opt.i ?? 0) * 1.7, 6);
  const gk = standing || h.speed === undefined ? undefined : q(gkOf(h.speed), 10), tiredK = q(opt.tiredK ?? (opt.tired ? 1 : 0), 10);
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / HSCALE, [cw, ch, k0] = tier(d * 1.25), k = Math.min(k0, 1.8);
  const light = light2D(cam, false), r = opt.rider;
  let riderFn: RiderFn | null = null, rkey = "";
  if (r) {
    rkey = `${r.w.okey}|${r.pose}|${r.expr}|${q(r.pk ?? 1, 8)}|${r.blink ?? 0}`;
    riderFn = (p, seat, kk, dir, front) => {
      const g = p.g, s2 = kk * RIDER_K, sd = seedOf(r.w.i);
      g.save(); g.translate(seat[0], seat[1]);
      if (front) { g.scale(s2, s2); g.translate(-300, -seatY(r.w.o)); bodyFront(p, r.w.o, { mode: "ride", pose: r.pose, pk: r.pk, expr: r.expr, blink: r.blink, light, seed: sd }); }
      else { g.scale(s2 * dir, s2); g.translate(-300, -seatY(r.w.o)); bodySide(p, r.w.o, { mode: "ride", pose: r.pose, pk: r.pk, expr: r.expr, blink: r.blink, light: dir > 0 ? light : Math.PI - light, seed: sd }); }
      g.restore();
    };
  }
  const key = `H|${coat}|${h.gait}|${phase}|${amp}|${gk ?? "-"}|${q(ang, 40)}|${tack}|${opt.cloth ?? ""}|${tiredK}|${idle}|${q(light)}|${rkey}|${q(opt.dark ?? 0, 12)}`;
  const C = HORSE_COATS[((coat % HORSE_COATS.length) + HORSE_COATS.length) % HORSE_COATS.length];
  body([], x, z, [-0.85, 0, 0.85].map((s) => [dx * s, dz * s, 0.42] as [number, number, number]), true);
  const hp: Place = {
    key, x, y, z, scale: HSCALE, size: [cw, ch, k], id: `horse#${opt.i ?? 0}|${coat}`,
    draw: (p) => { p.g.translate(0, CARD_TOP); drawHorse(p, { coat: C, gait: h.gait, phase, rx, rz, vx: rz, vz: -rx, M: HM, light, tack, cloth: opt.cloth, tiredK, idle, rider: riderFn, amp, gk }); },
  };
  if (opt.dark) { const k1 = opt.dark; hp.key = hp.key; darken(hp, k1); }
  out.places.push(hp);
  // contact shadow stretched along the body
  const cc = hexOf(CONTACT[LNAME], 1);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x, y: y + 0.022, z, w: 0.95, h: 2.7, flat: true, rot: Math.atan2(-dx, -dz) });

};
/** the six-horse team of the berline (teamAt), harnessed */
const TEAM_A = [0, 3, 5, 0, 3, 5], TEAM_B = [2, 1, 4, 2, 1, 4];
const teamPh = (id: number, f: number, h: HorsePose) => ((teamPhase(id, f) + 0.14 * h.pair + (h.side > 0 ? 0 : 0.5)) % 1 + 1) % 1;
const team = (out: Stage, cam: CamInfo, id: number, f: number, coats = TEAM_A, tiredK = 0) => {
  for (const [i, h] of teamAt(id, f).entries())
    horse(out, cam, { ...h, phase: teamPh(id, f, h) }, coats[i], "harness", { tiredK, idle: f / FPS, i: i + id * 10 });
};
/** hoof dust: a puff where each hoof strikes (detected from the gait phase over the last 10 f), dissolving over 10 f,
 *  tinted for the night */
const DUST_LIFE = 20;
/** soft hoof dust: one see-through cloud per hoof strike, left where it was kicked up; it swells, drifts up and back and
 *  fades (in over 3 f, out over its 20 f life). One texture, continuous size and position: nothing pops frame to frame. */
const hoofDust = (out: Stage, f: number, at: (g: number) => { pos: V3; dir: V3; phase: number; speed: number } | null, tint: string) => {
  for (let a = 0; a < DUST_LIFE; a++) {
    const A = at(f - a), B = at(f - a - 1);
    if (!A || !B || A.speed < 0.15) continue;
    for (const [s0, back] of [[0, 0.62], [0.42, -0.5]] as [number, number][]) {
      const c0 = ((B.phase - s0) % 1 + 1) % 1, c1 = ((A.phase - s0) % 1 + 1) % 1;
      if (c1 >= c0) continue; // the hoof struck between f-a-1 and f-a
      const u = a / DUST_LIFE, al = q(0.7 * smooth((a + 1) / 4) * (1 - smooth((a - 3) / (DUST_LIFE - 3))), 20);
      if (al <= 0) continue;
      const x = A.pos[0] - A.dir[0] * (back + 0.25 * u), z = A.pos[2] - A.dir[2] * (back + 0.25 * u), w = 0.5 + 0.7 * Math.sqrt(u);
      out.fx.push({ key: `dust|haze|${tint}|a${al}`, cw: 256, ch: 256, draw: (pp) => fxDust(pp, tint), x, y: D0 + 0.14 + 0.16 * u, z, w, h: w * 0.8 });
    }
  }
};
/** the coachman on the box */
const coachman = (out: Stage, cam: CamInfo, c: CoachPose, f: number, pose: Pose = "reins", pk = 1, stand = 0) => {
  const b = coachLocal(c, COACH_LOCAL.BOX), view = FRONT;
  const y = b[1] - (975 - seatY(CM.o)) * SU + 0.42 * stand; // he half-stands (eased over 10 f) to point over the roof
  put(out, cam, CM, b[0], y, b[2], view, { mode: "sit", pose, pk, expr: "stern", blink: lidF(f, CM.i), facing: 0 }, { mode: "sit", pose, pk, expr: "stern", blink: lidF(f, CM.i) }, { shadow: false });
};

// ---------------- scenes ----------------
type Ctx = { f: number; t: number; cam: CamInfo; out: Stage };

const CROWD1 = (() => {
  const s: { x: number; z: number; i: number; role: Role; torch: boolean; dir: number }[] = [];
  const [x0, z0, x1, z1] = LOC.CROWD1_BOX;
  let i = 0;
  for (let r = 0; r < 9; r++) for (let k = 0; k < 13; k++, i++) {
    const x = x0 + 1 + k * ((x1 - x0 - 2) / 12) + (r % 2) * 1.0 + (hh(i, 1) - 0.5) * 1.1, z = z0 + 1 + r * ((z1 - z0 - 2) / 8) + (hh(i, 2) - 0.5) * 1.0;
    if (hh(i, 7) < 0.26) continue; // a dense, lively crowd
    if (Math.abs(x - LOC.HOOK_MAN[0]) < 2.2 && z > -90 && z < -82.5) continue; // the hook lens and the hook man
    if (Math.hypot(x - 9, z + 56) < 5) continue;
    if (Math.hypot(x - 0.8, z + 77.3) < 2.6) continue; // the intro's eye-level lens stands in the crowd here: nobody right against it
    const rr = hh(i, 3), role: Role = rr < 0.08 ? "ng" : rr < 0.32 ? "wm" : rr < 0.42 ? "bg" : "sc";
    s.push({ x, z, i: 100 + i, role, torch: hh(i, 4) < 0.48, dir: hh(i, 5) < 0.5 ? -1 : 1 });
  }
  // the intro's foreground band: torch-bearers strung along the long lens's line of sight to the king's window, 5-9.5 m
  // out, so their caps and raised flames rise across the bottom of the 172-222 frame (soft under its DOF)
  const L0: [number, number] = [0.85, -76.9], dv: [number, number] = [-0.25, -0.968], pv: [number, number] = [0.968, -0.25];
  ([[6.6, -0.5, 0], [7.6, 0.42, 1], [8.6, -0.05, 2], [9.8, 0.7, 3], [10.9, -0.75, 4], [12.0, 0.18, 5]] as [number, number, number][]).forEach(([d, l, k]) =>
    s.push({ x: L0[0] + dv[0] * d + pv[0] * l, z: L0[1] + dv[1] * d + pv[1] * l, i: 180 + k, role: k % 3 === 1 ? "wm" : "sc", torch: k !== 2, dir: k % 2 ? 1 : -1 }));
  // the front of the crowd: a dense mass packed against the bollard-and-chain cordon (z -95.2) under the palace,
  // torches up (4 ragged rows, 0.7 m apart, clear of the lamp post at x 8)
  for (let r = 0; r < 4; r++) for (let k = 0; k < 40; k++, i++) {
    const x = -15 + k * 0.72 + r * 0.18 + (hh(i, 11) - 0.5) * 0.24, z = -94.45 + r * 0.72 + (hh(i, 12) - 0.5) * 0.3; // rows 2 apart: half a cell apart (no head right above another)
    if (x > 13.5 || hh(i, 13) < 0.1 || Math.hypot(x - 8, z + 93.6) < 0.8) continue;
    const rr = hh(i, 14), role: Role = rr < 0.06 ? "ng" : rr < 0.3 ? "wm" : rr < 0.4 ? "bg" : "sc";
    s.push({ x, z, i: 300 + i, role, torch: hh(i, 15) < 0.55, dir: hh(i, 16) < 0.5 ? -1 : 1 });
  }
  return spread(s, 0.34); // resolved once: nobody in the crowd overlaps, nobody is ever pushed per frame
})();
/** the family in the plan's single-file order (king, queen, the two children, the governess). `gap` = metres behind the
 *  king along the path while walking, `back` = where each one stops (metres short of the door step), `lat` = a small
 *  sideways step at the end so the line reads in depth. Order never changes; spacing is checked once (QA harness). */
/** passers-by crossing the square in profile */
const WALKERS1: { i: number; role: Role; x0: number; z: number; v: number; torch: boolean; expr: Expr }[] = [
  { i: 860, role: "sc", x0: -24, z: -91.0, v: 0.036, torch: true, expr: "shout" }, { i: 861, role: "wm", x0: 7, z: -91.15, v: -0.03, torch: false, expr: "nervous" }, // in the lane between the cordon mass and the crowd (they meet only after the take)
  { i: 862, role: "bg", x0: 14, z: -61.2, v: -0.04, torch: false, expr: "stern" }, { i: 863, role: "sc", x0: -17, z: -60.6, v: 0.038, torch: true, expr: "laugh" },
];
/** crowd members dropped because, from one of the take-1 lenses, their card lines up under another one's (QA list) */
const STACKED = new Set<number>([119, 499, 501, 502, 503, 505, 506, 507, 508, 509, 510, 511, 512, 513, 517, 532, 533, 534, 535, 540, 541, 543, 545, 546, 547, 549, 550, 551, 553, 563, 564, 566, 567, 569, 571, 572, 573, 574]);
const FAMILY: { w: Who; scale: number; gap: number; back: number; lat: number }[] = [
  // the king stops 0.55 m short of the step: clear of the door leaf as it swings open (DOOR1)
  { w: VALET, scale: 1, gap: 0, back: 0.55, lat: 0 }, { w: QN, scale: 1, gap: 1.1, back: 1.5, lat: -0.42 },
  { w: PR, scale: 0.84, gap: 2.0, back: 2.25, lat: 0.32 }, { w: DP, scale: 0.66, gap: 2.8, back: 3.0, lat: 0.3 },
  { w: GV, scale: 1, gap: 3.85, back: 3.95, lat: -0.05 },
];
/** from deep inside the dark gate passage (they wait there, in shadow, as the leaves open), straight out through the
 *  middle of the opening, then the curve to the coach door */
const FPATH: [number, number][] = [[24, -106.4], [24, -99.0], [24.3, -98.3], [25.6, -97.75], [27.5, -97.05], [29.2, -96.15], [30.2, -95]];
const along = (pts: [number, number][], s: number): { x: number; z: number; dx: number; dz: number } => {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], l = Math.hypot(bx - ax, bz - az);
    if (s <= l || i === pts.length - 2) { const k = Math.min(1, Math.max(0, s / (l || 1))); return { x: ax + (bx - ax) * k, z: az + (bz - az) * k, dx: (bx - ax) / (l || 1), dz: (bz - az) / (l || 1) }; }
    s -= l;
  }
  return { x: pts[0][0], z: pts[0][1], dx: 0, dz: 1 };
};
const pathLen = (pts: [number, number][]) => pts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
const FLEN = pathLen(FPATH);
/** the king's distance along the path, precomputed: waiting 1.6 m inside the arch, tiptoe from 297 (eased to 0.045 m/f),
 *  hurry from 345 (eased to 0.13 m/f) */
const FAM_S = (() => {
  const a = new Float64Array(474); let s = 5.0, v = 0;
  for (let f = 0; f < 474; f++) {
    const target = f < CUE.FAMILY_OUT[0] ? 0 : f < CUE.HURRY[0] ? 0.045 : 0.13;
    v += Math.max(-0.006, Math.min(0.006, target - v)); s += v; a[f] = s;
  }
  return a;
})();
const familyS = (f: number) => FAM_S[Math.max(0, Math.min(473, f))];
/** the frame each member leaves the straight out of the gate (front view -> profile): a blink lands there */
const FAM_TURN = FAMILY.map((m) => { for (let f = 0; f < 474; f++) if (along(FPATH, softEnd(FAM_S[f] - m.gap, FLEN - m.back, 0.7)).dz <= 0.85) return f; return -100; });
/** each member's walk phase, integrated over the precomputed schedule (cycle 0.75 m tiptoe -> 1.25 m hurry, eased), offset
 *  so it is exactly the passing pose (0.25: feet together) on the frame of the front -> profile turn */
const FAM_PH = FAMILY.map((m, k) => {
  const a = new Float64Array(474); let ph = 0;
  for (let f = 1; f < 474; f++) {
    const s0 = softEnd(FAM_S[f - 1] - m.gap, FLEN - m.back, 0.7), s1 = softEnd(FAM_S[f] - m.gap, FLEN - m.back, 0.7), cyc = 0.75 + 0.5 * smooth((f - CUE.HURRY[0]) / 14);
    ph += Math.max(0, s1 - s0) / cyc; a[f] = ph;
  }
  const turn = Math.max(1, Math.min(473, FAM_TURN[k])), off = 0.25 - a[turn];
  for (let f = 0; f < 474; f++) a[f] = (((a[f] + off) % 1) + 1) % 1;
  return a;
});
/** the frame each member reaches its waiting spot by the coach */
const FAM_ARRIVE = FAMILY.map((m) => { const sEnd = FLEN - m.back; for (let f = 300; f < 474; f++) if (softEnd(FAM_S[f] - m.gap, sEnd, 0.7) >= sEnd - 0.01) return f; return 474; });
/** small acting beats while they wait by the coach (each eases in from the last; tiptoe = hands at the chest):
 *  the king fusses with his hat and points at the opening door, the queen whispers to him and pulls her hood close,
 *  the princess reaches for her little brother, the dauphin hops and raises a hand, the governess beckons the children
 *  (a side "wave" would hide behind the big heads: raised hands go forward of the face) */
const FAM_BEATS: [number, Pose, number?][][] = [
  [[0, "tiptoe"], [414, "hat"], [429, "tiptoe"], [446, "point", 1], [462, "tiptoe"]],
  [[0, "tiptoe"], [420, "talk", 0.6], [437, "tiptoe"], [452, "hat"], [466, "tiptoe"]],
  [[0, "tiptoe"], [424, "reach", 0.7], [450, "tiptoe"]],
  [[0, "tiptoe"], [452, "hold_up"], [466, "tiptoe"]],
  [[0, "tiptoe"], [410, "talk", 0.5], [426, "tiptoe"], [440, "point", 1], [456, "tiptoe"]],
];
/** the family file's long heading once out of the gate (the profile's screen side never flips on the curve) */
const FAM_DIR: [number, number] = [FPATH[FPATH.length - 1][0] - FPATH[1][0], FPATH[FPATH.length - 1][1] - FPATH[1][1]];
/** shadow inside the gate passage: dark 1.4 m in, lit by the gate lanterns at the opening */
const passageDark = (z: number) => smooth((-100.3 - z) / 1.4) * 0.85;

/** take 1 PARIS, night: the hook man's raised assignat; the king's profile in the lit window; the torch crowd (profiles,
 *  torches up on "gronde"); the family tiptoes out of the side gate to the waiting coach; the coachman points east */
const paris = ({ f, cam, out }: Ctx) => {
  // ---- the hook man and his bill (his raised hand slid right behind it, feet on the ground) ----
  const hm = LOC.HOOK_MAN, bill = assignatAt(1, f), HMW = HOOKMAN, SINK = -0.45; // head kept under the ECU frame: only his sleeve + hand reach the bill
  if (bill.mode === "hand") {
    const P0 = put(NOWHERE(), cam, HMW, hm[0], D0 + SINK, hm[2], FRONT, { mode: "stand" }, {}, { shadow: false }).place;
    const bc = billCorner(cam, bill.pos), ox = (toDesign(cam, P0, bc)[0] - 500) * SU, x = hm[0] + cam.right.x * ox, z = hm[2] + cam.right.z * ox;
    const P1 = put(NOWHERE(), cam, HMW, x, D0 + SINK, z, FRONT, { mode: "stand" }, {}, { shadow: false }).place;
    const hand = toDesign(cam, P1, bc);
    put(out, cam, HMW, x, D0 + SINK, z, FRONT, { mode: "stand", expr: "grin", pose: "hold_up", hand: [q(Math.min(585, hand[0]), 2), q(Math.max(-280, hand[1]), 2)], facing: 1, blink: lidF(f, 90) }, {}, { shadow: false });
  } else putAuto(out, cam, HMW, hm[0], D0, hm[2], [0, -1], { mode: "stand", expr: f >= CUE.TORCHES_UP ? "shout" : "grin", pose: "fist", pk: 1, blink: lidF(f, 90) }, {});
  assignat(out, cam, 1, f);
  // ---- the king in the lit window: a true profile facing screen-right (like the bill), smug; on "Louis XVI" he turns
  //      and walks off to the left behind the wall (never vanishes in view) ----
  if (f < CUE.W.LOUIS + 26) {
    const kh = LOC.KING_HEAD1, y = kh[1] - headUp(KING, true, "stand"), go = smooth((f - (CUE.W.LOUIS - 6)) / 26), turn = f >= CUE.W.LOUIS - 8;
    const x = kh[0] - 1.7 * go, ph = walkPhase(1.7 * go, 1.7, 0.8);
    const bob = q(0.5 + 0.5 * Math.sin(f * 0.3), 8);
    // holding forth: a palm-up flourish at the chest, then the hand raised high in front of his face (well forward of the
    // nose, never across it), again, then it drops before he turns away (a side "wave" hides behind his big head)
    const kp = poseSeq(f, [[0, "talk", bob], [194, "hold_up"], [212, "talk", bob], [228, "hold_up"], [CUE.W.LOUIS - 12, "hang"]], 8);
    const kHand: [number, number] = [q(505 + 10 * Math.sin(f * 0.21), 2), q(400 + 14 * Math.sin(f * 0.33), 2)];
    const kexpr: Expr = turn ? "nervous" : f >= 228 ? "laugh" : "smug";
    put(out, cam, KING, x, y, kh[2], { side: true, mirror: turn, facing: 0 }, {},
      { mode: go > 0.01 && go < 0.99 ? "march" : "stand", phase: ph, stride: 0.5, expr: kexpr, pose: kp.pose, pk: kp.pk, from: kp.from, hand: kHand,
        headTilt: turn ? 0 : q(-4 + 3 * Math.sin(f * 0.15), 1), blink: lidF(f, 400, [CUE.W.LOUIS - 8, 190, 222]), look: 0.6 }, { shadow: false, ghost: true });
  }
  // ---- the torch crowd: torches shaken, fists pumping to a chant, heads turning to their neighbours ----
  const up = 0.55 + 0.45 * smooth((f - CUE.TORCHES_UP) / 6), chant = (i: number) => 0.5 + 0.5 * Math.sin((f / 22) * Math.PI * 2 + (i % 5) * 0.35);
  const sil = 1 - smooth((f - 224) / 30); // the hook shot's foreground band: back-lit silhouettes until the crane rises
  for (const c of CROWD1) {
    if (STACKED.has(c.i)) continue; // two cards that line up into a "two-headed" figure from the lens: one goes
    const w = who(c.role, c.i, c.i), shake = Math.sin(f * 0.31 + c.i * 1.7) * (0.35 + 0.65 * up);
    const expr: Expr = f >= CUE.TORCHES_UP || c.i >= 300 ? (c.i % 3 ? "shout" : "laugh") : c.i % 4 ? "stern" : "grin";
    const pose: Pose = c.torch ? "torch" : c.role === "ng" ? "lantern" : c.i % 2 === 0 || c.i % 3 === 0 ? "fist" : "hang";
    const fistK = c.i % 3 === 0 ? 0.35 + 0.65 * chant(c.i) * (0.4 + 0.6 * up) : up * (0.55 + 0.45 * chant(c.i));
    const pk = c.torch ? q(0.45 + 0.4 * up + 0.15 * chant(c.i) * up, 10) : pose === "fist" ? q(fistK, 10) : pose === "lantern" ? 0.5 : 1;
    const fo1: FrontOpts = { mode: "stand", expr, pose, pk, alt: q(shake, 10), look: q(Math.sin(f * 0.035 + c.i * 2.3), 6), headTilt: q(5 * Math.sin(f * 0.047 + c.i), 1), blink: lidF(f, c.i, [CUE.TORCHES_UP]) };
    const [f1, s1] = both(fo1), A = put(out, cam, w, c.x, D0, c.z, viewFor(refCam(1, 230), c.x, c.z, c.dir, -0.45), f1, s1);
    if (c.torch) for (const g of A.anch().flame) flame(out, cam, g, f, c.i, A.body);
    if (pose === "lantern") lanterns(out, A);
    if (c.i >= 180 && c.i < 186 && sil > 0) darken(A.place, (c.i < 183 ? 0.82 : 0.6) * q(sil, 20));
  }
  // ---- passers-by crossing the square in profile (between the crowd and the palace, and in front of it) ----
  for (const W of WALKERS1) {
    const x = W.x0 + W.v * (f - 172), ph = q((((Math.abs(W.v) * (f - 172)) / 1.2) % 1 + 1) % 1, 24);
    const A = putAuto(out, cam, who(W.role, W.i, W.i), x, D0, W.z, [Math.sign(W.v), 0], { mode: "march", phase: ph, expr: W.expr, pose: W.torch ? "torch" : "hang", pk: 0.7, blink: lidF(f, W.i) },
      { mode: "march", phase: ph, stride: 0.75, stomp: 0.8, pose: W.torch ? "torch" : "hang", pk: 0.7 });
    if (W.torch) for (const g of A.anch().flame) flame(out, cam, g, f, W.i, A.body);
  }
  // ---- two kids chasing a dog round the front of the crowd (the bottom of the crane shot) ----
  const th = (f - 172) * 0.011;
  for (let k = 0; k < 3; k++) {
    const a = th - k * 0.17, x = -2 + 9 * Math.sin(a), z = -60.2 + 0.8 * Math.cos(a), dx = Math.cos(a), dz = -0.12 * Math.sin(a), sp = Math.abs(Math.cos(a));
    if (k === 0) { animal(out, cam, "dog", x, z, [dx, dz], { mode: sp > 0.08 ? "walk" : "stand", phase: ((10 * a) / 0.55) % 1, coat: "#b07a4a" }, 868); continue; }
    const ph = q((((10 * a) / 0.9) % 1 + 1) % 1, 24), kidW = k === 1 ? who("sc", 869, 3) : who("wm", 870, 1);
    put(out, cam, kidW, x, D0, z, sideToward(cam, dx, dz), {}, { mode: sp > 0.08 ? "march" : "stand", phase: ph, stride: 0.56 * Math.max(0.2, sp), stomp: 1.1, expr: "laugh", pose: k === 1 ? "wave" : "hang", pk: q(0.5 + 0.5 * Math.sin(f * 0.4), 6), blink: lidF(f, 869 + k) },
      { scale: k === 1 ? 0.66 : 0.6 });
  }
  // ---- the coach's team, the coachman pointing east ----
  const c = coachAt(1, f);
  coachBody(c);
  team(out, cam, 1, f);
  const pt = smooth((f - (CUE.POINT_EAST - 4)) / 6) * (1 - smooth((f - 438) / 9)), stand = smooth((f - (CUE.POINT_EAST - 11)) / 10) * (1 - smooth((f - 436) / 11));
  coachman(out, cam, c, f, pt > 0.02 ? "point" : "reins", q(pt, 8), q(stand, 30));
  // ---- the family: out of the dark gate passage in single file, the king and queen glance left/right as they step out,
  //      then they hurry along the facade to the coach door. Fixed order, smooth precomputed positions, no pushes. ----
  const S = familyS(f);
  FAMILY.forEach((m, k) => {
    const sEnd = FLEN - m.back, s = softEnd(S - m.gap, sEnd, 0.7), sPrev = softEnd(familyS(f - 1) - m.gap, sEnd, 0.7), v = s - sPrev;
    if (s < 0.2) return; // deep in the passage, hidden by the jamb
    const P = along(FPATH, s), lat = m.lat * smooth((s - (sEnd - 1.6)) / 1.6);
    const x = P.x - P.dz * lat, z = P.z + P.dx * lat;
    const moving = v > 0.002, hurry = f >= CUE.HURRY[0], cyc = 0.75 + 0.5 * smooth((f - CUE.HURRY[0]) / 14);
    const phase = q(FAM_PH[k][Math.max(0, Math.min(473, f))], 24), strideK = Math.min(1, v / 0.03);
    const looking = k < 2 && f >= CUE.LOOK_LR[0] && f < CUE.LOOK_LR[0] + 16;
    const facingOut = P.dz > 0.85 && !looking; // still on the straight out of the gate: walking toward the lens
    const expr: Expr = k === 0 && !looking ? "whistle" : "nervous";
    const blink = lidF(f, m.w.i, k < 2 ? [CUE.LOOK_LR[0], CUE.LOOK_LR[0] + 8, CUE.LOOK_LR[0] + 16, FAM_TURN[k]] : [FAM_TURN[k]]); // a blink across every view swap
    const wait = smooth((sPrev - (sEnd - 0.05)) / 0.05 + 1) * (moving ? 0 : 1), iLook = q(wait * Math.sin(f * 0.05 + k * 1.9), 6), iTilt = q(wait * 4 * Math.sin(f * 0.06 + k * 2.4), 1); // waiting: glances, small head turns
    const fo: FrontOpts = { mode: moving ? "stroll" : "stand", phase, expr, pose: "tiptoe", blink, lift: (hurry ? 46 : 22) * Math.max(0.3, strideK), look: iLook, headTilt: iTilt };
    // waiting beats: start once this member has arrived (the first beat after arrival eases in from tiptoe)
    const segs = FAM_BEATS[k].filter((s2, j) => j === 0 || s2[0] >= FAM_ARRIVE[k] + 2), beat = poseSeq(f, segs.map((s2) => [s2[0], s2[1], s2[1] === "talk" || s2[1] === "wave" ? q(0.5 + 0.5 * Math.sin(f * 0.42 + k), 8) : s2[2]] as [number, Pose, number?]), 7);
    const hop = k === 3 && f >= Math.max(432, FAM_ARRIVE[k] + 2) && f < 446 ? 0.05 * Math.abs(Math.sin(((f - 432) / 7) * Math.PI)) : 0;
    const so: SideOpts = { mode: moving ? "march" : "stand", phase, stride: (cyc / 1.6) * Math.max(0.15, strideK), stomp: (hurry ? 0.7 : 0.35) * Math.max(0.4, strideK), expr, pose: beat.pose, pk: beat.pk, from: beat.from, blink, headTilt: iTilt, look: iLook };
    const w = k === 0 ? valet(1) : m.w;
    let pl: Place;
    if (looking) {
      const sd = (f < CUE.LOOK_LR[0] + 8 ? -1 : 1) as -1 | 1;
      pl = put(out, cam, w, x, D0, z, { side: false, mirror: false, facing: sd }, { ...fo, look: sd, facing: sd }, so, { scale: m.scale, ghost: true }).place;
    } else if (facingOut) { // walking out toward the lens, already turned 3/4 the way the path will take them
      const fs = (along(FPATH, 9).dx * cam.right.x + along(FPATH, 9).dz * cam.right.z) > 0 ? 1 : -1;
      pl = put(out, cam, w, x, D0, z, { side: false, mirror: false, facing: fs as -1 | 1 }, { ...fo, facing: fs as -1 | 1 }, so, { scale: m.scale, ghost: true }).place;
    }
    else pl = put(out, cam, w, x, D0 + hop, z, sideToward(cam, FAM_DIR[0], FAM_DIR[1]), fo, so, { scale: m.scale, ghost: true, shadow: hop < 0.01 }).place;
    if (!looking) squash(pl, turnSquash(f, FAM_TURN[k])); // the front -> profile turn: squashed through a 3/4 over 4 f (with the blink)
    darken(pl, passageDark(z));
  });
};

/** take 2 boarding, coach-local [fwd, up, left] (left = the door side). The leaf is hinged at its FRONT edge (fwd 0.62)
 *  and swings out to 100 deg, sweeping a 1.24 m radius behind the hinge: both stand OUTSIDE that sweep while it opens
 *  (563-571), then reach the step from the rear side of the open leaf, step up and go in. */
const K_SPOT: V3 = [-0.55, 0, 1.95], G_TUG: V3 = [0.2, 0, 2.38], G_SPOT: V3 = [0.25, 0, 2.85], STEPP: V3 = [0.12, 0, 1.45], INSIDE: V3 = [0.02, 0.95, 0.55], STEP_H = 0.42;
/** on the threshold: feet at the coach floor height, still outside the side wall (the second step up, before going in) */
const SILL: V3 = [0.08, 0.95, 1.12];
/** the governess's standing spot before boarding: close to him for the tug, then one step back out of the leaf's sweep */
const gSpot = (f: number): V3 => lerpV(G_TUG, G_SPOT, smooth((f - (CUE.HAT_TUG + 26)) / 14));
type Board = { walk: [number, number]; step: [number, number]; into: [number, number] };
const K_BOARD: Board = { walk: [569, 576], step: [576, 581], into: [581, 590] }, G_BOARD: Board = { walk: [577, 585], step: [585, 590], into: [590, 598] };
/** the king is shown in his seat once the governess is in and the door is closing (no card in front of her in the doorway) */
const SEAT2_IN = CUE.DOOR2_SHUT[0] + 2;
const lerpV = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
/** where a boarder is (coach-local), how far in (0..1), and whether the feet are walking. Up the step, up again onto the
 *  sill (feet at the floor, still outside the wall), then straight in at floor height: the feet never go below the floor,
 *  so nothing is clipped and the wall hides the legs as the card goes in */
const boardAt = (f: number, spot: V3, B: Board): { l: V3; walk: number; inK: number; dist: number; wk: number; duck: number } => {
  const w = smooth((f - B.walk[0]) / (B.walk[1] - B.walk[0])), s = smooth((f - B.step[0]) / (B.step[1] - B.step[0]));
  const iu = (f - B.into[0]) / (B.into[1] - B.into[0]), up = smooth(iu / 0.42), inn = smooth((iu - 0.42) / 0.58);
  const ground = lerpV(spot, STEPP, w), onStep: V3 = [STEPP[0], STEP_H * s, STEPP[2] - 0.1 * s];
  const l = inn > 0 ? lerpV(SILL, INSIDE, inn) : up > 0 ? lerpV(onStep, SILL, up) : s > 0 ? onStep : ground;
  return { l, walk: w > 0.01 && w < 0.99 ? 1 : 0, inK: inn, dist: Math.hypot(STEPP[0] - spot[0], STEPP[2] - spot[2]) * w, wk: w, duck: q(24 * smooth(iu / 0.3) * (1 - 0.3 * inn), 2) }; // ducks under the door top
};
/** the pose at frame f from a list of [start frame, pose, pk]: each new pose eases in from the previous one over `ease` f */
const poseSeq = (f: number, segs: [number, Pose, number?][], ease = 6): { pose: Pose; pk: number; from?: { pose: Pose; pk?: number; k: number } } => {
  let i = 0; while (i + 1 < segs.length && f >= segs[i + 1][0]) i++;
  const [f0, pose, pk = 1] = segs[i], k = smooth((f - f0) / ease);
  return i > 0 && k < 1 ? { pose, pk, from: { pose: segs[i - 1][1], pk: segs[i - 1][2] ?? 1, k } } : { pose, pk };
};
/** squash a card horizontally about its centre line (a front <-> profile turn drawn over 4 f, like a 2D cartoon turn) */
const squash = (pl: Place, k: number) => {
  if (Math.abs(k - 1) < 0.01) return;
  const d0 = pl.draw; pl.key += `|sq${q(k, 40)}`;
  pl.draw = (pp) => { const g = pp.g; g.save(); g.translate(300, 0); g.scale(k, 1); g.translate(-300, 0); d0(pp); g.restore(); };
};
/** the squash factor around a view swap at frame t0 (front shown before t0, profile from t0) */
const turnSquash = (f: number, t0: number) => { const d = f - t0; return d === -2 ? 0.8 : d === -1 ? 0.58 : d === 0 ? 0.62 : d === 1 ? 0.84 : 1; };
/** the curl: shows (1), tugged under the hat over 8 f, springs back out half-way (0.65) ~1 s later: still a bad disguise */
const curlAt = (f: number) => {
  const T0 = CUE.HAT_TUG;
  if (f < T0) return 1;
  if (f < T0 + 28) return 1 - smooth((f - T0) / 8);
  const k = smooth((f - (T0 + 28)) / 5), settle = smooth((f - (T0 + 33)) / 8);
  return k * (0.85 - 0.2 * settle);
};
/** take 2 ROAD: the valet king preens by the coach; the governess tugs his hat down over the royal curl (it springs
 *  back out); he steps up and climbs in, she follows; the berline rolls east; in the window he leans back, eyes shut */
const road = ({ f, cam, out }: Ctx) => {
  const c = coachAt(2, f);
  coachBody(c);
  team(out, cam, 2, f);
  coachman(out, cam, c, f);
  const peek = curlAt(f), T0 = CUE.HAT_TUG;
  const kb = boardAt(f, K_SPOT, K_BOARD), gb = boardAt(f, gSpot(f), G_BOARD);
  const kp = coachLocal(c, kb.l), gp = coachLocal(c, gb.l);
  const dirW = (l: V3, to: V3): [number, number] => { const a = coachLocal(c, l), b = coachLocal(c, to); return [b[0] - a[0], b[2] - a[2]]; };
  if (f < K_BOARD.into[1]) {
    // ---- the king: admires himself in the lacquer (hand at the brim, chin up, a whistle, a smug little bob, a flourish to
    //      his reflection), the tug, then up the step, onto the sill and in ----
    const kDir = f < K_BOARD.walk[0] ? dirW(K_SPOT, G_SPOT) : dirW(K_SPOT, STEPP), view = sideToward(cam, kDir[0], kDir[1]);
    const expr: Expr = f < T0 ? (f >= 481 && f < 492 ? "whistle" : "smug") : f < T0 + 16 ? "shock" : f < T0 + 40 ? "stern" : "smug";
    const preen = f < T0 - 4 ? q(Math.sin((f - 473) * 0.16), 8) : 0;
    const ps = poseSeq(f, [[0, "hat"], [492, "talk", q(0.5 + 0.5 * Math.sin((f - 492) * 0.35), 8)], [501, "hat"], [T0 - 6, "hang"], [K_BOARD.step[0] - 2, "reach"]], 6);
    const wK = smooth(kb.wk * 3.5) * (1 - 0.4 * smooth((kb.wk - 0.75) / 0.25)); // the first step starts from the feet together, no stride snap
    const so: SideOpts = { mode: kb.walk ? "march" : "stand", phase: walkPhase(kb.dist, Math.hypot(STEPP[0] - K_SPOT[0], STEPP[2] - K_SPOT[2]), 0.7), stride: 0.44 * Math.max(0.05, wK), expr,
      pose: ps.pose, pk: ps.pk, from: ps.from, headTilt: q(-4 + 3 * preen + (f >= T0 && f < T0 + 12 ? 5 : 0), 2), lean: kb.duck,
      blink: lidF(f, 400, [T0 - 6, T0 + 16, T0 + 40, K_BOARD.step[0]]) };
    const K = put(out, cam, valet(peek), kp[0], kp[1], kp[2], view, {}, so, { shadow: kb.l[1] < 0.05, pin: true });
    if (kb.inK > 0) darken(K.place, smooth((kb.inK - 0.1) / 0.75) * 0.92);
  }
  if (f < G_BOARD.into[1]) {
    // ---- the governess: scolds him (a wagging hand), glances round, eases her hand up to his brim, pulls it down WITH the
    //      hat, lets go, steps back out of the leaf's sweep (hands clasped), then boards ----
    const gDir = f < G_BOARD.walk[0] ? dirW(G_TUG, K_SPOT) : dirW(G_SPOT, STEPP), Gv = sideToward(cam, gDir[0], gDir[1]);
    const P0 = put(NOWHERE(), cam, GV, gp[0], gp[1], gp[2], Gv, {}, {}).place;
    const hatW: V3 = [kp[0], kp[1] + 1.66, kp[2]], hand = toDesign(cam, P0, hatW);
    const pull = 27 * (1 - Math.round(Math.min(1, curlAt(Math.min(f, T0 + 20))) * 6) / 6); // = the hat's own drop (HAT_PULL x his head height), same 1/6 steps
    const rk = smooth((f - (T0 - 10)) / 8) * (1 - smooth((f - (T0 + 9)) / 8));
    const rest: [number, number] = [Gv.mirror ? 264 : 336, 640];
    const hx = rest[0] + (Math.max(40, Math.min(560, hand[0])) - rest[0]) * rk, hy = rest[1] + (hand[1] + pull - rest[1]) * rk;
    const boarding = f >= G_BOARD.walk[0], stepBack = f >= T0 + 26 && f < T0 + 40;
    const scold = f >= 478 && f < 497, wag = q(0.5 + 0.5 * Math.sin((f - 478) * 0.55), 8);
    const look = f < 478 ? 0.4 : f < 497 ? 0.7 : f < T0 - 10 ? q(Math.sin((f - 497) * 0.2), 6) : 0.5; // glances round for watchers before the tug
    const hand0: [number, number] = [q(hx, 2), q(hy, 2)];
    let so: SideOpts;
    if (boarding) {
      const ps = poseSeq(f, [[0, "hold_up"], [G_BOARD.walk[0], "hang"], [G_BOARD.step[0] - 1, "reach"]], 6), wG = smooth(gb.wk * 3.5);
      so = { mode: gb.walk ? "march" : "stand", phase: walkPhase(gb.dist, Math.hypot(STEPP[0] - G_SPOT[0], STEPP[2] - G_SPOT[2]), 0.7), stride: 0.44 * Math.max(0.05, wG), expr: "stern",
        pose: ps.pose, pk: ps.pk, from: ps.from, hand: [rest[0], rest[1]], lean: gb.duck, blink: lidF(f, 402, [G_BOARD.walk[0]]) };
    } else if (stepBack) { // a small step back, hands still clasped in front (no swinging arms)
      const sb = (f - T0 - 26) / 14;
      so = { mode: "march", phase: walkPhase(sb * 0.48, 0.48, 0.6), stride: 0.3 * smooth(sb * 4) * (1 - 0.5 * smooth((sb - 0.7) / 0.3)), expr: "stern", pose: "hold_up", hand: [rest[0], rest[1]], blink: lidF(f, 402, [T0 + 26]) };
    } else if (scold || (f >= 497 && f < 503)) {
      const ps = poseSeq(f, [[0, "hold_up"], [478, "talk", wag], [497, "hold_up"]], 6);
      so = { mode: "stand", expr: scold ? "shout" : "stern", pose: ps.pose, pk: ps.pk, from: ps.from, hand: hand0, look, headTilt: scold ? q(3 * Math.sin((f - 478) * 0.55), 1) : 0, blink: lidF(f, 402, [478, 497]) };
    } else so = { mode: "stand", expr: f >= T0 + 30 && f < T0 + 50 ? "confused" : "stern", pose: "hold_up", hand: hand0, look, blink: lidF(f, 402, [T0 + 30, T0 + 50]) };
    const G = put(out, cam, GV, gp[0], gp[1], gp[2], Gv, {}, so, { pin: true, shadow: gb.l[1] < 0.05 });
    if (gb.inK > 0) darken(G.place, smooth((gb.inK - 0.1) / 0.75) * 0.92);
  }
  if (f >= SEAT2_IN) {
    // ---- inside: the king in the window (front), out of the dark over 12 f once the door is closing, then relaxing ----
    const relax = smooth((f - CUE.RELAX) / 10), kh = windowAt(c).seat;
    const S2 = seated(out, cam, valet(peek), [kh[0], kh[1] - 0.04 * relax, kh[2]], FRONT,
      { expr: relax > 0.5 ? "smile_closed" : "smug", headTilt: q(-7 * relax, 4), blink: lidF(f, 400, [CUE.RELAX + 5]), facing: 0 }, {});
    darken(S2.place, (1 - smooth((f - SEAT2_IN) / 12)) * 0.92);
  }
  // the queen sits deeper, behind the king and to the side (her face shows beside his head in the window close-up), the dauphin beside her
  const qL = smooth((f - 640) / 40); // she leans in beside his head for the window close-up (S2d from 658): her face clear of the frame edge
  seated(out, cam, QN, besideKing(c, -0.42 + 0.3 * qL, -0.03 + 0.08 * qL, -0.34 - 0.11 * qL), FRONT, { expr: f >= CUE.RELAX + 4 ? "smile_closed" : "smile", headTilt: q(6 * smooth((f - CUE.RELAX - 4) / 10), 2), blink: lidF(f, 401, [CUE.RELAX + 4]), facing: 1 }, {});
  seated(out, cam, DP, besideKing(c, 0.36, -0.3, -0.3), FRONT, { expr: "smile_closed", blink: lidF(f, 404), facing: -1 }, {}, 0.66);
};

/** take 3 RELAY (golden): the coach rolls in and stops; grooms lead the tired team to stable door 1 and the fresh one from
 *  door 2; Drouet walks from the inn to the window, raises an eyebrow, pulls the assignat and compares; the king turns his
 *  head into a perfect profile (1066), his eyes slide (1336); the coach pulls away (1418) */
const SWAP_V = 0.11, SWAP_GAP = 26;
/** order: the leaders leave first (nobody walks through a still-hitched pair); the wheelers arrive first */
const tOut = (pair: number) => CUE.UNHITCH[0] + 18 + (2 - pair) * SWAP_GAP, tIn = (pair: number) => CUE.NEW_TEAM[0] + pair * SWAP_GAP;
const freshS = (pair: number, L: number, f: number) => softEnd(easeGo(f, tIn(pair), SWAP_V, 14)[0], L, 1.2);
/** Catmull-Rom densified polyline (rounded corners: the led pairs turn smoothly, never snap their heading) */
const splinePts = (c: [number, number][], per = 8): [number, number][] => {
  const o: [number, number][] = [];
  for (let i = 0; i + 1 < c.length; i++) {
    const p0 = c[Math.max(0, i - 1)], p1 = c[i], p2 = c[i + 1], p3 = c[Math.min(c.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t2 = k / per, t3 = t2 * t2, t4 = t3 * t2, qq = (a: number, b: number, cc: number, d: number) => 0.5 * (2 * b + (-a + cc) * t2 + (2 * a - 5 * b + 4 * cc - d) * t3 + (-a + 3 * b - 3 * cc + d) * t4);
      o.push([qq(p0[0], p1[0], p2[0], p3[0]), qq(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  o.push(c[c.length - 1]);
  return o;
};
const SWAP_CACHE = new Map<string, [number, number][]>();
/** the led pair's centre path: leaving = from the pole (heading on with the coach), a smooth U-turn south, west to stable
 *  door 1 and 4 m into the dark stable; arriving = out of stable door 2, round, and onto the pole heading east (so the
 *  pair settles exactly on its hitch with the coach's heading: no turn or jump when it is hitched) */
const swapPath = (pair: number, hitched: HorsePose, leaving: boolean): [number, number][] => {
  const key = `${pair}|${leaving}`;
  let pts = SWAP_CACHE.get(key);
  if (pts) return pts;
  const dr = leaving ? LOC.STABLE_DOORS[0] : LOC.STABLE_DOORS[1], ds = dr[0], dz = dr[2];
  const cx = hitched.pos[0] - hitched.dir[2] * 0.68 * hitched.side, cz = hitched.pos[2] + hitched.dir[0] * 0.68 * hitched.side; // pair centre on the pole
  pts = leaving
    ? splinePts([[cx, cz], [cx + 0.45, cz], [cx + 1.1, cz + 0.45], [cx + 1.2, cz + 1.9], [cx, cz + 3.4], [1196 + pair * 0.6, -73.5], [ds + 0.4, dz - 2.2], [ds, dz], [ds, dz + 4.2]])
    : splinePts([[ds, dz + 4.2], [ds, dz], [ds + 1.0, dz - 2.4], [1209.5 - pair * 0.4, -73.6], [cx - 1.9, cz + 2.0], [cx - 1.0, cz + 0.4], [cx - 0.45, cz], [cx, cz]]);
  SWAP_CACHE.set(key, pts);
  return pts;
};
/** shade inside the stable (its front at z -66 faces -z: inside is z > -66) */
const stableDark = (z: number) => smooth((z - (LOC.STABLE_FRONT_Z + 0.2)) / 1.4) * 0.85;
/** the groom walks right at the pair's head (beside the near horse's head, holding the bridle), on the side of the pair
 *  that faces the yard lens (GSIDE), so every pair is visibly LED away / in */
const groomPos = (P: { x: number; z: number; dx: number; dz: number }, sd = 1, lat = 1.2, ahead = 1.0): [number, number] =>
  [P.x - P.dz * lat * sd + P.dx * ahead, P.z + P.dx * lat * sd + P.dz * ahead];
const groomAt = (out: Stage, cam: CamInfo, f: number, i: number, P: { x: number; z: number; dx: number; dz: number }, s: number, v: number, sEnd: number, sd = 1, swaps: number[] = []) => {
  const g = who("gr", i, i), [x, z] = groomPos(P, sd), phase = walkPhase(s, sEnd, 1.3), k = Math.min(1, v / 0.04);
  const A = putAuto(out, cam, g, x, D0, z, [P.dx, P.dz], { mode: v > 0.002 ? "march" : "stand", phase, expr: "stern", pose: "reach", blink: lidF(f, i, swaps) },
    { mode: v > 0.002 ? "march" : "stand", phase, stride: (1.3 / 1.6) * Math.max(0.15, k), stomp: 0.8, pose: "reach", blink: lidF(f, i, swaps) }, { ghost: true });
  darken(A.place, stableDark(z));
};
const D3_END_PH = drouetAt(3, CUE.DROUET_WALK[1] + 1).phase;
const HSTOP3 = teamAt(3, 806); // the team on the pole once the coach has stopped
/** which side of each pair its groom walks: the side facing the yard lens (S3a) at the pole */
const GSIDE = [0, 1, 2].map((pair) => {
  const P = along(swapPath(pair, HSTOP3[pair * 2], true), 0), R = refCam(3, 800);
  return (R.pos.x - P.x) * -P.dz + (R.pos.z - P.z) * P.dx >= 0 ? 1 : -1;
});
const LOUT = [0, 1, 2].map((pair) => pathLen(swapPath(pair, HSTOP3[pair * 2], true)));
/** the frame each fresh pair settles in its slot (its groom steps aside after that) */
const FRESH_SETTLE = [0, 1, 2].map((pair) => { const L = pathLen(swapPath(pair, HSTOP3[pair * 2], false)); for (let f = tIn(pair); f < 1456; f++) if (L - freshS(pair, L, f) < 0.02) return f; return 1456; });
const relay = ({ f, t, cam, out }: Ctx) => {
  const c = coachAt(3, f);
  coachBody(c);
  // ---- the teams ----
  teamAt(3, f).forEach((h, i) => {
    const pair = h.pair, side = h.side, hs = HSTOP3[i];
    // tired team: hitched until its groom has walked out of the stable to its head, then led away pair by pair
    // (eased into a trot beside him, round, and 4 m into the dark stable)
    const t0 = tOut(pair), [s0, v0] = easeGo(f, t0, SWAP_V * LOUT[pair] / Math.max(...LOUT), 14), pts0 = swapPath(pair, hs, true), L0 = pathLen(pts0); // speeds keep the pairs 22 f apart all the way
    // rolling in (724-804) the tired team trots with the coach (integrated gait phase, eased to a stop), then drops its heads
    if (f < t0) horse(out, cam, { ...h, phase: teamPh(3, f, h) }, TEAM_A[i], "harness", { tiredK: smooth((f - (CUE.COACH_IN[1] - 2)) / 14), idle: t, i: 30 + i });
    else if (s0 < L0 - 0.2) {
      const P = along(pts0, s0), ox = P.dz * 0.68 * side, oz = -P.dx * 0.68 * side, hz = P.z + oz;
      horse(out, cam, { pos: [P.x + ox, D0, hz], dir: [P.dx, 0, P.dz], gait: "trot", phase: ((s0 / 2.6) + (side > 0 ? 0 : 0.5)) % 1, speed: v0 }, TEAM_A[i], "harness",
        { tired: true, i: 30 + i, dark: stableDark(hz) });
      if (side > 0) groomAt(out, cam, f, 600 + pair, P, s0, v0, L0, GSIDE[pair], [t0]);
    }
    if (side > 0 && f < t0) { // the groom waits beside the yard while the coach rolls in, then steps up to the pair's head
      const start = along(pts0, 0), [gx, gz] = groomPos(start, GSIDE[pair]), [wx, wz] = groomPos(start, GSIDE[pair], 3.0, 0.4);
      const u = smooth((f - (CUE.COACH_IN[1] + 2)) / (t0 - CUE.COACH_IN[1] - 2)), x = wx + (gx - wx) * u, z = wz + (gz - wz) * u, walking = u > 0.01 && u < 0.99;
      const dist = Math.hypot(gx - wx, gz - wz), ph = walkPhase(u * dist, dist, 1.0);
      const gw = poseSeq(f, [[0, "hang"], [Math.ceil(CUE.COACH_IN[1] + 2 + 0.85 * (t0 - CUE.COACH_IN[1] - 2)), "reach"]], 6); // in profile the whole time (no view swap before he leads)
      put(out, cam, who("gr", 600 + pair, 600 + pair), x, D0, z, sideToward(refCam(3, 760), gx - wx || start.dx, gz - wz || start.dz),
        { mode: "stand", expr: "neutral", blink: lidF(f, 600 + pair, [t0]) }, { mode: walking ? "march" : "stand", phase: ph, stride: 0.6, expr: "stern", pose: gw.pose, from: gw.from, blink: lidF(f, 600 + pair, [t0]) }, { ghost: true });
    }
    // fresh team: led out of stable door 2 (from 4 m inside, in the dark), eased to a stop in its slot, then hitched
    const t1 = tIn(pair), pts = swapPath(pair, hs, false), L = pathLen(pts);
    const s1 = freshS(pair, L, f), v1 = s1 - freshS(pair, L, f - 1);
    const P = along(pts, s1), ox = P.dz * 0.68 * side, oz = -P.dx * 0.68 * side, hz = P.z + oz;
    const settled = L - s1 < 0.02;
    if (settled) horse(out, cam, { ...h, phase: teamPh(3, f, h) }, TEAM_B[i], "harness", { idle: t, i: 40 + i });
    else if (f >= t1) horse(out, cam, { pos: [P.x + ox, D0, hz], dir: [P.dx, 0, P.dz], gait: "trot", phase: ((s1 / 2.6) + (side > 0 ? 0 : 0.5)) % 1, speed: v1 }, TEAM_B[i], "harness",
      { i: 40 + i, dark: stableDark(hz) });
    if (side > 0 && f >= t1) {
      // the fresh groom leads his pair in and stops with it; once it is hitched he steps 0.8 m clear and waits
      const tS = FRESH_SETTLE[pair], out2 = smooth((f - (tS + 6)) / 24), [gx, gz] = groomPos(P, GSIDE[pair]);
      if (out2 < 0.005) groomAt(out, cam, f, 610 + pair, P, s1, v1, L, GSIDE[pair]);
      else {
        const x = gx - P.dz * 0.8 * out2 * GSIDE[pair], z = gz + P.dx * 0.8 * out2 * GSIDE[pair], walking = out2 < 0.995, ph = walkPhase(out2 * 0.8, 0.8, 0.9);
        putAuto(out, cam, who("gr", 610 + pair, 610 + pair), x, D0, z, walking ? [-P.dz * GSIDE[pair], P.dx * GSIDE[pair]] : look(cam, x, z), { mode: walking ? "stroll" : "stand", phase: ph, expr: "neutral", blink: lidF(f, 610 + pair) },
          { mode: walking ? "march" : "stand", phase: ph, stride: 0.56 }, { ghost: true });
      }
    }
  });
  coachman(out, cam, c, f);
  // ---- the passengers: stiff valet facing the window, then the perfect profile (screen-right, like the bill) ----
  const kh = windowAt(c).seat, prof = f >= CUE.KING_PROFILE;
  // 1336 "demasquer": eyes wide, the pupil slides toward Drouet, a sweat drop (kingHead draws it for shock / nervous)
  const dh = drouetAt(3, f).pos, toward = sx(cam, dh) > sx(cam, kh) ? 1 : -1;
  const slide = f >= CUE.EYES_SLIDE ? toward : 0.5, kexpr: Expr = f >= CUE.EYES_SLIDE + 30 ? "nervous" : f >= CUE.EYES_SLIDE ? "shock" : prof ? "neutral" : "stern";
  if (prof) seated(out, cam, valet(0.65), kh, { side: true, mirror: false, facing: 0 }, {}, { expr: kexpr, headTilt: -3, look: slide, blink: lidF(f, 400, [CUE.KING_PROFILE, CUE.EYES_SLIDE - 3]) });
  else seated(out, cam, valet(0.65), kh, FRONT, { expr: kexpr, blink: lidF(f, 400), facing: 0, look: sx(cam, kh) > 0 ? -1 : 1 }, {});
  seated(out, cam, QN, besideKing(c, 0.4, -0.04, -0.25), FRONT, { expr: "nervous", blink: lidF(f, 401), facing: -1, look: -1 }, {}); // behind his neck, never in front of the profile
  // ---- Drouet: profile toward the window whenever the lens is behind him ----
  const d = drouetAt(3, f);
  if (d.mode !== "hidden") {
    const tx = cam.pos.x - d.pos[0], tz = cam.pos.z - d.pos[2], away = (tx * d.dir[0] + tz * d.dir[2]) / (Math.hypot(tx, tz) || 1) < -0.3;
    void away;
    const view = sideToward(cam, d.dir[0], d.dir[2]); // always in profile: a real walk cycle, and never a front/profile swap mid-stride
    const bill = assignatAt(3, f), holding = bill.mode === "hand", swaps = [CUE.EYEBROW, CUE.W.DEMASQUER];
    const expr: Expr = f >= CUE.W.DEMASQUER - 2 && f < CUE.W.DEMASQUER + 14 ? "shock" : f >= CUE.EYEBROW ? "suspicious" : "neutral";
    // planted feet: stride = the story's 1.4 m cycle / 1.6, eased with his speed; lands on the passing pose at the stop
    const walk = d.mode === "walk" && d.speed > 0.002, phase = q(((d.phase + 0.25 - D3_END_PH) % 1 + 1) % 1, 24);
    let hand: [number, number] | undefined;
    if (holding) {
      // his hand grips the bill's NEAR edge at mid-height (fingers just behind the paper, the thumb over it)
      const side = sx(cam, bill.pos) > sx(cam, d.pos) ? -1 : 1, edge: V3 = [bill.pos[0] + cam.right.x * 0.1 * side, bill.pos[1] - 0.01, bill.pos[2] + cam.right.z * 0.1 * side];
      const pl = put(NOWHERE(), cam, DR, d.pos[0], D0, d.pos[2], view, {}, {}).place, hd = toDesign(cam, pl, edge);
      hand = [q(Math.max(20, Math.min(580, hd[0])), 2), q(Math.max(-250, hd[1]), 2)];
    }
    const pose: Pose = holding ? "hold_up" : "hang";
    const DP3 = put(out, cam, holding ? DR_H : DR, d.pos[0], D0, d.pos[2], view,
      { mode: walk ? "stroll" : "stand", phase, expr, pose, hand, blink: lidF(f, 405, swaps), facing: 0 },
      { mode: walk ? "march" : "stand", phase, stride: (1.4 / 1.6) * Math.max(0.15, Math.min(1, d.speed / 0.05)), expr, pose, hand, blink: lidF(f, 405, swaps) }, { pin: true });
    // in the dark inn doorway he is a shadow first: dark while inside the door plane, and for his first steps out of it
    // (if the story still starts him on the threshold) so he never pops into the light
    const inDoor = smooth((LOC.INN_FRONT_Z - 0.1 - d.pos[2]) / 0.8), first = 1 - smooth((f - CUE.DROUET_OUT) / 18), nearDoor = d.pos[2] < LOC.INN_FRONT_Z + 1.2 ? 1 : 0;
    darken(DP3.place, Math.max(inDoor, first * nearDoor) * 0.9);
    if (holding) { // his thumb lies over the bill's front edge (the fingers stay behind the paper, on his own card)
      const side = sx(cam, bill.pos) > sx(cam, d.pos) ? -1 : 1, tx = cam.pos.x - bill.pos[0], tz = cam.pos.z - bill.pos[2], tl = Math.hypot(tx, tz) || 1;
      const off = (ASSIGNAT_SIZE[0] / 2 - 0.012) * side, skin = "#c18761"; // unlit card: pre-shaded to the lit hand's golden-hour value (measured)
      out.fx.push({ key: `thumb|${side}|${skin}`, cw: 96, ch: 96, draw: (pp) => fxThumb(pp, skin, side > 0 ? -1 : 1),
        x: bill.pos[0] + cam.right.x * off + (tx / tl) * 0.014, y: bill.pos[1] - 0.012, z: bill.pos[2] + cam.right.z * off + (tz / tl) * 0.014, w: 0.05, h: 0.05 });
    }
  }
  assignat(out, cam, 3, f);
  // ---- the yard: a woman at the well ----
  const wl = LOC.WELL;
  putAuto(out, cam, who("wm", 620, 1), wl[0] + 0.9, D0, wl[2] + 0.5, [-1, 0.2], { mode: "stand", expr: "neutral", pose: "reach", blink: lidF(f, 620) });
};

/** take 4 RIDE + VARENNES (night): Drouet mounts and gallops through the wood; townspeople in night caps push the cart
 *  onto the bridge and pile barrels; the coach stops; National Guards with lanterns take the king out; the escort lines
 *  the road; the assignat flutters down */
const WATCH4 = (() => {
  const s: { x: number; z: number; i: number; lantern: boolean }[] = [];
  // spread ACROSS the arrest / crane lenses (they look west along -x): one per 0.95 m of z, depth varied, nobody behind anybody
  for (let k = 0; k < 12; k++) s.push({ x: 1983.6 - (k % 3) * 1.1 + (hh(k, 1) - 0.5) * 0.3, z: -93.4 - k * 0.95 + (hh(k, 2) - 0.5) * 0.2, i: 700 + k, lantern: hh(k, 3) < 0.35 });
  for (let k = 0; k < 8; k++) s.push({ x: 2016 + k * 3.4 + (hh(k, 4) - 0.5), z: -116.4 + (hh(k, 5) - 0.5) * 0.5, i: 720 + k, lantern: hh(k, 6) < 0.4 }); // on their doorsteps, clear of the U-turn
  return s;
})();
const GUARDS4: { i: number; wait: [number, number]; at: V3; via?: V3; pose: Pose }[] = [
  // parallel eastward lanes; every spot is in FRONT of the hinge (fwd > 0.9) or, for 743, reached round the outside of
  // the open leaf (its free end is at fwd 0.84, left 2.22); the spots fan out across the arrest lens (no stacked heads)
  { i: 740, wait: [2016.1, -97.7], at: [1.45, 0, 2.3], pose: "reach" }, { i: 741, wait: [2015.3, -96.4], at: [2.0, 0, 3.6], pose: "lantern" },
  { i: 742, wait: [2014.4, -97.1], at: [3.3, 0, 2.4], pose: "lantern" }, { i: 743, wait: [2017.6, -95.7], via: [1.2, 0, 4.3], at: [-0.8, 0, 2.75], pose: "lantern" },
];
/** the first frame the world shows cart barrel k (build.ts cart barrels, world.ts: visible when barrels > k + 0.3) */
const BARREL_SHOW = [0, 1, 2].map((k) => { for (let f = CUE.BARRELS[0]; f <= CUE.BARRELS[1] + 2; f++) if (bridgeCartAt(f).barrels > k + 0.3) return f; return CUE.BARRELS[1]; });
/** the cart's travelled distance (for its pushers' planted steps) */
const CART_D = (() => { const a = new Float64Array(1800); let s = 0, pv = bridgeCartAt(0).pos; for (let f = 0; f < 1800; f++) { const p = bridgeCartAt(f).pos; s += Math.hypot(p[0] - pv[0], p[2] - pv[2]); pv = p; a[f] = s; } return a; })();
const cartDist = (f: number) => CART_D[Math.max(0, Math.min(1799, f))];
const norm2 = (x: number, z: number): [number, number] => { const l = Math.hypot(x, z) || 1; return [x / l, z / l]; };
const ride = ({ f, t, cam, out }: Ctx) => {
  // ---- Drouet ----
  const d = drouetAt(4, f), h = d.horse;
  if (h) {
    const stop = d.mode === "ride" && d.speed < 0.004 && f > CUE.EXIT, pt = smooth((f - (CUE.DROUET_STOP + 4)) / 6);
    const rider: Rider | null = d.mode === "ride" || d.mount >= 0.86
      ? { w: DR, pose: stop ? "point" : "reins", pk: q(pt, 6), expr: stop ? "shout" : "stern", blink: lidF(f, 405) } : null;
    horse(out, cam, { ...h, speed: d.speed }, 0, "saddle", { cloth: "#a8343a", rider, idle: t, i: 9 });
    hoofDust(out, f, (g) => { const dd = drouetAt(4, g).horse; return dd ? { pos: dd.pos, dir: dd.dir, phase: dd.phase, speed: drouetAt(4, g).speed } : null; }, "#8e93aa");
    if (!rider) { // the mount, in profile at the rider's own scale: foot to the stirrup, up in it, the far leg over the croup, down into the seat
      const KD = MU / RIDER_K, m = d.mode === "mount" ? d.mount : 0, ck = smooth((m / 0.86 - 0.67) / 0.33);
      const seatAt: V3 = [h.pos[0] + h.dir[0] * 0.06, D0, h.pos[2] + h.dir[2] * 0.06]; // where the horse card draws its rider's seat
      const x = d.pos[0] + (seatAt[0] - d.pos[0]) * ck, z = d.pos[2] + (seatAt[2] - d.pos[2]) * ck;
      put(out, cam, DR, x, D0, z, sideToward(cam, h.dir[0], h.dir[2]), {},
        { mode: d.mode === "mount" ? "mount" : "stand", mount: { k: q(m, 60), stirrup: 975 - 0.68 * KD, seat: 975 - 1.5 * KD, back: 975 - 1.42 * KD },
          expr: "stern", pose: d.mode === "mount" ? "reins" : "hang", pk: 1, blink: lidF(f, 405, [CUE.MOUNT[0]]) },
        { scale: RIDER_K, shadow: true, pin: true });
    }
  }
  // ---- the coach's team + coachman ----
  const c = coachAt(4, f);
  coachBody(c);
  team(out, cam, 4, f, TEAM_B);
  coachman(out, cam, c, f);
  // ---- the passengers ride in the coach the whole take (the window is never empty); the king leaves his seat into the
  //      shadow before he steps out, and is back in it (out of the dark over 9 f) after KING_IN ----
  { const kh = windowAt(c).seat, gone = f >= CUE.KING_OUT[0] && f < CUE.KING_IN[1] + 1;
    if (!gone) { const S4 = seated(out, cam, valet(0.65), kh, FRONT, { expr: f > CUE.KING_IN[1] ? "nervous" : "neutral", blink: lidF(f, 400, [CUE.KING_IN[1] + 2]), facing: 0 }, {});
      darken(S4.place, Math.max(smooth((f - (CUE.KING_OUT[0] - 9)) / 9), 1 - smooth((f - CUE.KING_IN[1]) / 9) * (f > CUE.KING_IN[1] ? 1 : 0)) * 0.92); }
    seated(out, cam, QN, besideKing(c, -0.42, -0.03, -0.34), FRONT, { expr: f > CUE.COACH_STOP ? "shock" : "nervous", blink: lidF(f, 401, [CUE.COACH_STOP + 2]), facing: 1 }, {});
    seated(out, cam, DP, besideKing(c, 0.36, -0.3, -0.3), FRONT, { expr: "nervous", blink: lidF(f, 404), facing: -1 }, {}, 0.66); }
  // ---- the cart pushed onto the bridge, barrels piled on ----
  const cart = bridgeCartAt(f), pushing = f >= CUE.CART_PUSH[0] && f < CUE.CART_PUSH[1];
  const mv = bridgeCartAt(f + 1), vx = mv.pos[0] - cart.pos[0], vz = mv.pos[2] - cart.pos[2], vl = Math.hypot(vx, vz);
  void vl; void vx; void vz;
  const d1 = norm2(1993 - LOC.CART_PARK[0], -101 - LOC.CART_PARK[2]), d2 = norm2(LOC.BRIDGE4[0] - 1993, LOC.BRIDGE4[2] + 101), bk = smooth((cart.u - 0.4) / 0.4);
  const md = norm2(d1[0] + (d2[0] - d1[0]) * bk, d1[1] + (d2[1] - d1[1]) * bk); // the push direction: continuous before, during and after
  for (let k = 0; k < 3; k++) {
    const lat = (k - 1) * 0.7, x = cart.pos[0] - md[0] * 1.5 + md[1] * lat, z = cart.pos[2] - md[1] * 1.5 - md[0] * lat;
    const w = who("tn", 760 + k, k), phase = q(((cartDist(f) / 1.2 + k * 0.33) % 1 + 1) % 1, 24), cv = cartDist(f + 1) - cartDist(f);
    const moving = cv > 0.003;
    putAuto(out, cam, w, x, D0, z, pushing ? md : look(cam, x, z), { mode: moving ? "stroll" : "stand", phase, expr: pushing ? "pained" : f > CUE.COACH_STOP ? "shock" : "stern",
      pose: pushing ? "push" : "hang", alt: 1, tilt: pushing ? 10 : 0, blink: lidF(f, 760 + k, [CUE.CART_PUSH[1]]) },
      { mode: moving ? "march" : "stand", phase, stride: 0.75 * Math.max(0.2, Math.min(1, cv / 0.05)), pose: pushing ? "push" : "hang", pk: 1 });
  }
  for (let k = 0; k < 3; k++) { // barrel carriers from the east bridge head to the cart
    const tShow = BARREL_SHOW[k]; // the world's own rule (bridgeCartAt(f).barrels > k + 0.3): the lifted card hands over on that frame
    const tLift = tShow - 7, u = smooth((f - (tLift - 60)) / 60), cf = bridgeCartAt(tShow);
    const cdx = Math.cos(cf.yaw), cdz = -Math.sin(cf.yaw), bx = [-0.72, 0.02, 0.76][k], top: V3 = [cf.pos[0] + cdx * bx, cf.pos[1] + 0.74 + BARREL.h / 2, cf.pos[2] + cdz * bx];
    const a: [number, number] = [2007.4 + 0.3 * k, [-101.4, -98.8, -100.1][k]], b: [number, number] = [top[0] + 1.05, top[2] + (k - 1) * 0.15];
    const dist = Math.hypot(b[0] - a[0], b[1] - a[1]), x = a[0] + (b[0] - a[0]) * u, z = a[1] + (b[1] - a[1]) * u, walking = u > 0.01 && u < 0.99, ph = walkPhase(u * dist, dist, 1.1);
    const lifting = f >= tLift && f < tShow, carrying = f < tLift;
    const C2 = put(out, cam, who("tn", 770 + k, 4 + k), x, D0, z, sideToward(refCam(4, 1600), b[0] - a[0], b[1] - a[1]),
      {}, { mode: walking ? "march" : "stand", phase: ph, stride: 1.1 / 1.6, expr: carrying || lifting ? "pained" : "grin", pose: carrying ? "hug" : lifting ? "reach" : "fist", pk: 1, blink: lidF(f, 770 + k, [tLift, tShow + 4]) });
    if (lifting) { // the barrel travels from his arms up onto the cart over 7 f
      const lk = smooth((f - tLift) / 7), from: V3 = [x - 0.3, D0 + 1.05, z], pos: V3 = [from[0] + (top[0] - from[0]) * lk, from[1] + (top[1] - from[1]) * lk + 0.25 * Math.sin(Math.PI * lk), from[2] + (top[2] - from[2]) * lk];
      const bd = cam.pos.distanceTo(tmp.set(pos[0], pos[1], pos[2])), [bcw, bch, bk] = tier(bd * 1.6), lt = light2D(cam, false);
      // it takes on the world barrel's night colour as it lands (the 3D barrel that replaces it is a muted mauve-brown)
      const nt = q(0.6 * smooth(lk * 1.15), 20);
      out.places.push({ key: `B|${q(lt)}|${nt}`, x: pos[0], y: pos[1] - BARREL.h / 2, z: pos[2], size: [bcw, bch, bk], id: `barrel${k}`,
        draw: (pp) => {
          pp.g.translate(0, CARD_TOP); drawBarrel(pp, 300, 975 - (BARREL.h * MU) / 2, 0, lt, 1, 0.2);
          const g = pp.g; g.save(); g.globalCompositeOperation = "source-atop"; g.fillStyle = `rgba(80,66,74,${nt})`; g.fillRect(-1000, -2000, 4000, 6000); g.restore();
        } });
    }
    void C2;
  }
  // ---- townspeople watching, in night caps, some with lanterns ----
  for (const s of WATCH4) {
    const w = who("tn", s.i, s.i), react = f >= CUE.COACH_STOP + (s.i % 5);
    const fo4: FrontOpts = { mode: "stand", expr: react ? (s.i % 2 ? "shock" : "grin") : "dazed", pose: s.lantern ? "lantern" : s.i % 3 === 0 ? "fist" : "hang",
      pk: s.lantern ? 0.08 : q(smooth((f - CUE.COACH_STOP - (s.i % 5)) / 8), 8), blink: lidF(f, s.i, [CUE.COACH_STOP]), look: q(Math.sin(f * 0.04 + s.i), 6) }; // lanterns carried low: no glow on a face
    const [f4, s4] = both(fo4), A = put(out, cam, w, s.x, D0, s.z, viewFor(refCam(4, 1660), s.x, s.z, LOC.COACH4_STOP[0] - s.x, LOC.COACH4_STOP[2] - s.z), f4, s4);
    if (s.lantern) lanterns(out, A);
  }
  // ---- National Guards: wait at the bridge head, then gather at the coach door ----
  const cs = coachAt(4, CUE.COACH_STOP), step = coachLocal(cs, COACH_LOCAL.STEP);
  for (const G of GUARDS4) {
    const w = who("ng", G.i, G.i), dst = coachLocal(cs, G.at), u = smooth((f - (CUE.COACH_STOP - 10) - (G.i - 740) * 3) / (G.via ? 28 : 20));
    const pts: [number, number][] = [G.wait, ...(G.via ? [[coachLocal(cs, G.via)[0], coachLocal(cs, G.via)[2]] as [number, number]] : []), [dst[0], dst[2]]], gd = pathLen(pts);
    const Pg = along(pts, u * gd), x = Pg.x, z = Pg.z, walking = u > 0.02 && u < 0.98, ph = walkPhase(u * gd, gd, 1.2);
    const tArr = Math.ceil(CUE.COACH_STOP - 10 + (G.i - 740) * 3 + (G.via ? 28 : 20) * 0.98), arrived = f >= tArr;
    const gv: View = arrived ? viewFor(refCam(4, 1660), x, z, step[0] - x, step[2] - z) : { side: true, mirror: (Pg.dx * refCam(4, 1660).right.x + Pg.dz * refCam(4, 1660).right.z) < 0, facing: 0 };
    const A = put(out, cam, w, x, D0, z, gv, { mode: walking ? "stroll" : "stand", phase: ph, expr: "stern", pose: G.pose, pk: G.pose === "lantern" ? 0.08 : 1, blink: lidF(f, G.i, [tArr]) },
      { mode: walking ? "march" : "stand", phase: ph, stride: 1.2 / 1.6, pose: G.pose, pk: G.pose === "lantern" ? 0.1 : 1, blink: lidF(f, G.i, [tArr]) }); // lantern at the hip
    if (G.pose === "lantern") lanterns(out, A);
  }
  // ---- the king steps out, is arrested ("arrete" 1651), goes back in ----
  if (f >= CUE.KING_OUT[0] && f < CUE.KING_IN[1]) {
    const o = smooth((f - CUE.KING_OUT[0]) / (CUE.KING_OUT[1] - CUE.KING_OUT[0])), i2 = smooth((f - CUE.KING_IN[0]) / (CUE.KING_IN[1] - CUE.KING_IN[0])), k = o * (1 - i2);
    const p0 = coachLocal(c, [0.05, 0.45, 0.7]), p1 = coachLocal(c, [0.25, 0, 1.6]);
    const x = p0[0] + (p1[0] - p0[0]) * k, y = p0[1] + (p1[1] - p0[1]) * k, z = p0[2] + (p1[2] - p0[2]) * k;
    const expr: Expr = f >= CUE.W.ARRETE - 2 && f < CUE.W.ARRETE + 18 ? "shock" : f >= CUE.W.ARRETE ? "nervous" : "smug";
    const KA = put(out, cam, valet(0.65), x, y, z, FRONT, { mode: "stand", expr, pose: "tiptoe", pk: 1, blink: lidF(f, 400, [CUE.W.ARRETE]), facing: 0 }, {}, { shadow: k > 0.9, pin: true });
    darken(KA.place, (1 - smooth(k / 0.62)) * 0.92); // out of (and back into) the dark interior over >= 9 f
  }
  // ---- the mounted escort: lines the road behind the arrest lens, then turns east and rides off ahead of the coach
  //      (turn 1688-1698, walk-trot-gallop to 0.4 m/f by 1706; the two lines close in to +-2.2 m of the road) ----
  if (f >= CUE.KING_OUT[0]) {
    const R = LOC.ESCORT_ROWS, f0 = CUE.UTURN + 4, ramp = 14, vmax = 0.4;
    const v = vmax * clamp01((f - f0) / ramp), dTr = f < f0 ? 0 : f < f0 + ramp ? (vmax * (f - f0) ** 2) / (2 * ramp) : (vmax * ramp) / 2 + vmax * (f - f0 - ramp);
    const turn = smooth((f - CUE.UTURN) / 10), close = smooth(dTr / 10);
    const gait: HorseGait = gaitOfV(v);
    let eph = 0; for (let g = f0; g < f; g++) { const vg = vmax * clamp01((g - f0) / ramp); eph += vg / strideOf(vg); } // integrated: no leg jumps
    R.z.forEach((rz, ri) => {
      const side = rz > -100 ? 1 : -1, z = rz + (-100 + side * 2.2 - rz) * close, inward = ri === 0 ? -1 : 1;
      for (let x = R.x[0], k = 0; x <= R.x[1] + 1e-6; x += R.step, k++) {
        const i = 780 + ri * 20 + k, dz = inward * (1 - turn), dx = turn, l = Math.hypot(dx, dz) || 1;
        horse(out, cam, { pos: [x + dTr, D0, z], dir: [dx / l, 0, dz / l], gait, phase: ((eph + k * 0.17 + ri * 0.4) % 1 + 1) % 1, speed: v }, (k + ri * 3) % 8, "saddle",
          { cloth: "#2c4a94", idle: t, i, rider: { w: who("mg", i, i), pose: "reins", expr: "stern", blink: 0 } });
      }
    });
  }
  assignat(out, cam, 4, f);
};

// ---------------- extras: background life (quiet, small, never in the subject's way) ----------------
type Animal = "dog" | "chicken" | "sheep";
const ANIMAL_R: Record<Animal, [number, number, number][]> = { dog: [[0, 0, 0.3]], chicken: [[0, 0, 0.16]], sheep: [[-0.3, 0, 0.36], [0.3, 0, 0.36]] };
/** an animal card (side view toward the screen side of its heading), with a contact blob and a spacing body */
const animal = (out: Stage, cam: CamInfo, kind: Animal, x: number, z: number, dir: [number, number], o: AnimalOpts, i: number) => {
  const view = viewFor(cam, x, z, dir[0], dir[1]), mirror = view.side ? view.mirror : (dir[0] * cam.right.x + dir[1] * cam.right.z) < 0;
  const d = cam.pos.distanceTo(tmp.set(x, D0 + 0.4, z)), [cw, ch, k] = tier(d * 1.4), light = light2D(cam, mirror);
  const oo: AnimalOpts = { ...o, phase: q(o.phase ?? 0, 24), light, seed: i };
  const place: Place = { key: `A|${kind}|${fkey(oo)}`, x, y: D0, z, mirror, size: [cw, ch, k], draw: (p) => { p.g.translate(0, CARD_TOP); (kind === "dog" ? drawDog : kind === "chicken" ? drawChicken : drawSheep)(p, oo); } };
  out.places.push(place);
  const n0 = out.fx.length, s = kind === "chicken" ? 0.5 : kind === "dog" ? 1.1 : 1.6;
  blob(out, x, D0, z, s, 1);
  const l = Math.hypot(dir[0], dir[1]) || 1;
  body([place], x, z, ANIMAL_R[kind].map(([a, , r]) => [(dir[0] / l) * a, (dir[1] / l) * a, r] as [number, number, number]), false, out.fx.slice(n0));
};
/** someone at a window (a card cut at the sill), holding a candle-lantern; sill = world height of the window sill */
const windowFig = (out: Stage, cam: CamInfo, w: Who, x: number, sill: number, z: number, f: number, expr: Expr, candle = true, rise = 1) => {
  if (rise <= 0.001) return;
  const P = put(out, cam, w, x, sill - 0.85 - 1.25 * (1 - rise), z, FRONT, { mode: "stand", expr, pose: candle ? "lantern" : "hang", pk: 0.45, blink: lidF(f, w.i), facing: 0 }, {}, { shadow: false, ghost: true });
  const base = P.place, k0 = (base.size ?? [0, 0, 1])[2], cutY = 975 - (0.85 + 1.25 * (1 - rise)) / SU; // always cut at the sill: he rises into view
  base.key = `W|${base.key}`;
  const draw0 = base.draw;
  base.draw = (p) => { draw0(p); const g = p.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "destination-out"; g.fillRect(0, (CARD_TOP + cutY) * k0, 5000, 9000); g.restore(); };
  if (candle) lanterns(out, P);
};
const rad2 = (d: number) => (d * Math.PI) / 180;
const extras = ({ f, t, cam, out }: Ctx, scene: string) => {
  if (scene === "paris") {
    // the sentry asleep in his striped box by the gate (build.ts sentryBox at x 17.7, front face z F + 0.95 + 0.61),
    // chin on his chest, musket leaning against the box: the family sneaks right past him
    const SB: V3 = [17.7, D0, LOC.FACADE_Z + 0.95 + 0.66];
    const nod = q(0.5 + 0.5 * Math.sin(f * 0.07), 6); // slow dozing nod
    put(out, cam, who("ng", 830, 1), SB[0], D0, SB[2], FRONT, { mode: "sit", expr: "neutral", blink: 1, headTilt: 8 + 5 * nod, facing: 0 }, {}, { pin: true });
    const mx = SB[0] + 0.78, mz = SB[2] - 0.05, lean = sx(cam, [SB[0], D0, SB[2]]) < sx(cam, [mx, D0, mz]) ? -1 : 1;
    const md = cam.pos.distanceTo(tmp.set(mx, D0 + 0.8, mz)), [mcw, mch, mk] = tier(md);
    out.places.push({ key: `musket|${lean}|${q(light2D(cam, false))}`, x: mx, y: D0, z: mz, size: [mcw, mch, mk],
      draw: (pp) => { pp.g.translate(0, CARD_TOP); const L = 1.5 / SU, a = rad2(-90 + lean * 9); drawMusket(pp, [300 - lean * 20, 972], [300 - lean * 20 + Math.cos(a) * L, 972 + Math.sin(a) * L], 2.36, light2D(cam, false)); } });
    // two servants peeking from dark palace windows beside the king's, candles in hand (crane over the crowd)
    { const r0 = 1 - smooth((f - 282) / 14); // they duck back below the sill (never vanish in view)
      windowFig(out, cam, who("wm", 840, 3), -14, D0 + 5.9, -99.9, f, "nervous", true, r0);
      windowFig(out, cam, who("bg", 841, 0), 2, D0 + 5.9, -99.9, f, "shock", true, r0); }
    // the night watchman strolling down the street with his lantern
    const wx = -31 + 0.012 * (f - 172), wph = q((((f - 172) * 0.012) / 0.7) % 1, 24);
    const Wt = putAuto(out, cam, solo(842, WATCHMAN, "watch"), wx, D0, -64.5, [1, 0.1], { mode: "stroll", phase: wph, expr: "neutral", pose: "lantern", pk: 0.5, blink: lidF(f, 842) },
      { mode: "march", phase: wph, stride: 0.55, stomp: 0.5, pose: "lantern" });
    lanterns(out, Wt);
    // a beggar asleep against a house front, his dog curled beside him
    putAuto(out, cam, solo(843, BEGGAR, "beggar"), -45.1, D0, -85.2, [1, 0], { mode: "sit", expr: "neutral", blink: 1, facing: 0 }, {}, { pin: true });
    animal(out, cam, "dog", -44.9, -83.9, [0, 1], { mode: "lie", coat: "#6a5240" }, 844);
    // three sans-culottes chatting by a doorway under a wall lantern
    const chat: [number, number, number, [number, number]][] = [[43.9, -77.0, 0, [-0.3, -1]], [43.4, -78.4, 1, [0.2, 1]], [44.6, -79.3, 3, [-0.6, 0.6]]];
    chat.forEach(([x, z, v, dir], k) => { // gestures swell and fade smoothly (no arm snaps)
      putAuto(out, cam, who("sc", 845 + k, v), x, D0, z, dir, { mode: "stand", expr: k === 0 ? "laugh" : "grin", pose: "talk", pk: q(0.5 + 0.5 * Math.sin(f * 0.11 + k * 2.1), 8),
        blink: lidF(f, 845 + k) });
    });
  } else if (scene === "road") {
    // dawn in the fields south of the road: a peasant mowing, his dog, a small flock grazing
    putAuto(out, cam, solo(850, PEASANT, "peasant"), 271.5, D0, -86.4, [-1, 0.15], { mode: "stand", expr: "neutral", pose: "scythe", pk: q(0.5 + 0.5 * Math.sin(f * 0.12), 8), blink: lidF(f, 850) },
      { mode: "stand", pose: "scythe", pk: q(0.5 + 0.5 * Math.sin(f * 0.12), 8) });
    animal(out, cam, "dog", 269.6, -85.2, [1, 0.3], { mode: "stand" }, 851);
    const flock: [number, number, number][] = [[258.5, -85.4, 1], [260.8, -84.2, -1], [262.9, -86.6, 1], [265.2, -84.8, 1], [267.4, -87.0, -1], [262.0, -88.0, 1]]; // north verge >= 14 m ahead of the tracking lens (it never gets past x 245 before 724)
    flock.forEach(([x, z, d], k) => animal(out, cam, "sheep", x, z, [d, 0.2], { mode: (Math.floor((f + k * 37) / 50) % 3) ? "graze" : "stand", phase: (f * 0.02 + k * 0.3) % 1 }, 852 + k));
  } else if (scene === "relay") {
    // stable boy carrying a barrel along the stable front, another at the trough
    const su = (f - 724) * 0.03, sb = 1183.6 + 3.2 * (0.5 - 0.5 * Math.cos(su)), sbd = Math.sin(su) >= 0 ? 1 : -1; // a brisk carry (0.05 m/f)
    const sTrav = 3.2 * (Math.floor(su / Math.PI) + (Math.floor(su / Math.PI) % 2 ? 0.5 + 0.5 * Math.cos(su % Math.PI) : 0.5 - 0.5 * Math.cos(su % Math.PI))), sph = q((sTrav / 0.6) % 1, 24);
    putAuto(out, cam, who("gr", 860, 2), sb, D0, -67.6, [sbd, 0], { mode: "stroll", phase: sph, expr: "pained", pose: "hug", pk: 1, blink: lidF(f, 860) },
      { mode: "march", phase: sph, stride: (0.6 / 1.6) * Math.max(0.2, Math.abs(Math.sin(su))), stomp: 0.6, pose: "hug" });
    putAuto(out, cam, who("gr", 861, 1), LOC.TROUGH[0] + 0.2, D0, LOC.TROUGH[2] - 1.0, [0.2, 1], { mode: "stand", expr: "neutral", pose: "reach", blink: lidF(f, 861) });
    // two kids by the well watching the coach, villagers at the inn door
    putAuto(out, cam, who("sc", 862, 4), LOC.WELL[0] + 1.6, D0, LOC.WELL[2] - 1.5, [1, 0], { mode: "stand", expr: f > CUE.COACH_IN[1] ? "smile" : "neutral", pose: "talk", pk: q(0.5 + 0.5 * Math.sin(f * 0.09), 8), blink: lidF(f, 862, [CUE.COACH_IN[1]]) }, {}, { scale: 0.7 });
    putAuto(out, cam, who("wm", 863, 2), LOC.WELL[0] + 2.4, D0, LOC.WELL[2] - 2.3, [1, -0.2], { mode: "stand", expr: "smile", blink: lidF(f, 863) }, {}, { scale: 0.62 });
    putAuto(out, cam, who("wm", 864, 3), 1188.3, D0, -87.3, [0.3, 1], { mode: "stand", expr: f > 1040 ? "nervous" : "neutral", pose: "hang", blink: lidF(f, 864) });
    putAuto(out, cam, who("bg", 865, 2), 1186.9, D0, -87.0, [0.4, 1], { mode: "stand", expr: "neutral", pose: "talk", pk: q(0.5 + 0.5 * Math.sin(f * 0.2), 6), blink: lidF(f, 865) });
    // a dog trotting about the yard, hens pecking by the stable
    const du = (f - 724) * 0.009, dgx = 1185.5 + 5 * (0.5 - 0.5 * Math.cos(du)), dgd = Math.sin(du) >= 0 ? 1 : -1;
    const dTrav = 5 * (Math.floor(du / Math.PI) + (Math.floor(du / Math.PI) % 2 ? 0.5 + 0.5 * Math.cos(du % Math.PI) : 0.5 - 0.5 * Math.cos(du % Math.PI)));
    animal(out, cam, "dog", dgx, -73.2 + 0.6 * Math.sin(f * 0.02), [dgd, 0], { mode: Math.abs(Math.sin(du)) > 0.08 ? "walk" : "stand", phase: (dTrav / 0.7) % 1, coat: "#c9a06a" }, 866);
    for (let k = 0; k < 6; k++) {
      const hx = 1185.6 + k * 0.85 + 0.25 * Math.sin(f * 0.03 + k * 2), hz = -69.6 - 0.6 * (k % 2) + 0.2 * Math.cos(f * 0.025 + k);
      animal(out, cam, "chicken", hx, hz, [Math.cos(f * 0.02 + k) >= 0 ? 1 : -1, 0], { mode: (Math.floor((f + k * 11) / 25) % 2) ? "peck" : "walk", phase: (f * 0.05 + k * 0.3) % 1, coat: k % 3 ? "#c9824a" : "#f1ebdc" }, 870 + k);
    }
  } else if (scene === "ride") {
    // woken by the noise: heads in night caps at a few windows (world owner's VARENNES_WINDOWS), candles in hand,
    // appearing one by one from 1575 (a window "lights up" each time)
    let n = 0;
    VARENNES_WINDOWS.forEach((wn, i) => {
      // windows around the bridge and the square whose wall faces the square (the arrest / crane lenses look from there)
      const tx = 2005 - wn.pos[0], tz = -100 - wn.pos[2], tl = Math.hypot(tx, tz) || 1;
      if (n >= 18 || tl > 50 || wn.pos[1] < D0 + 3 || (wn.normal[0] * tx + wn.normal[2] * tz) / tl < 0.3 || hh(i, 91) > 0.3) return; // upper floors only
      n++;
      const t0 = 1575 + ((n - 1) % 9) * 7, rise = smooth((f - t0) / 12);
      if (rise <= 0) return;
      const v = [0, 1, 3, 4, 6, 7][i % 6], w = who("tn", 900 + i, v), [px, py, pz] = wn.pos, [nx, , nz] = wn.normal;
      windowFig(out, cam, w, px + nx * 0.22, py - 0.62, pz + nz * 0.22, /* leaning out a little: the card clears the wall */ f, n % 3 === 0 ? "shock" : n % 3 === 1 ? "dazed" : "nervous", true, rise);
    });
    // more townspeople by the cart and on the west bank, candles at their doorsteps
    const extra: [number, number, boolean][] = [[1989.4, -109.1, false], [1991.1, -108.5, true], [1978.2, -115.0, true], [1980.4, -115.1, true], [1988.4, -115.2, false]];
    extra.forEach(([x, z, lan], k) => {
      const w = who("tn", 880 + k, 880 + k), react = f >= CUE.COACH_STOP + k;
      const A = putAuto(out, cam, w, x, D0, z, [2001 - x, -100 - z], { mode: "stand", expr: react ? (k % 2 ? "shock" : "grin") : "dazed", pose: lan ? "lantern" : k % 3 === 0 && react ? "fist" : "hang", pk: 0.55, blink: lidF(f, 880 + k) });
      if (lan) lanterns(out, A);
    });
  }
  void t;
};

/** everything with a face in take `id` at time t (seconds). The legacy fortState argument is ignored (world.ts compat). */
export const stage = (id: number, t: number, _fs: FortState, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], f = Math.round(t * FPS);
  LNAME = s.light;
  findSun(cam, SUN);
  const ctx: Ctx = { f, t, cam, out };
  BODIES = []; FRAME = f;
  switch (s.scene) {
    case "paris": paris(ctx); break;
    case "road": road(ctx); break;
    case "relay": relay(ctx); break;
    case "ride": ride(ctx); break;
  }
  extras(ctx, s.scene);
  BODIES = []; // spacing is designed in (fixed files, eased paths, groups spread once): nothing is pushed per frame
  return out;
};

export { FPS };
