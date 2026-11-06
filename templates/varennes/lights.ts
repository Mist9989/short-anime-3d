// Light presets per time of day. The key light (sun or moon) is CAMERA-RELATIVE and frozen per take (world.ts update()):
// az = degrees from the take camera's forward axis (0 = straight ahead = backlight, +90 = screen right, 180 = behind
// camera), el = elevation. lit/shade/lift are LINEAR RGB multipliers for shade.ts (may exceed 1).
// VARENNES: four keys (story.ts Light): day (unused), golden (take 3), night (takes 1, 4, start of 2), dawn (end of 2).
// world.ts reads the per-frame blend skyAt(id, f) -> presetAt() (every number / colour lerped by k).
// Post contract (grade.ts): emissive sources (torches, lanterns, coach lamps, the king's window) are > 1.3 linear so they
// bloom; moonlit walls stay < 1.1; moonlit shadows p5 >= .07 before the grade.
import * as THREE from "three";

type C3 = [number, number, number];
export type SkyKey = "day" | "golden" | "night" | "dawn";
export type LightPreset = {
  az: number; el: number;
  lit: C3; shade: C3; lift: C3; lambert: number; sideK: number; term: number;      // world two-tone (shade.ts)
  charTint: C3; charShade: number; charGrad: number; bodyGrad: number; sideTint: C3; // character cards (cast.ts)
  blob: C3; actorShadow: boolean;                                                    // contact blobs / card shadows
  top: string; hor: string; skyCurve: C3; fog: string; fogNear: number; fogFar: number; sunDisc: string;
  sunCol: string; sunI: number; sky: string; ground: string; hemiI: number;         // three lights (unpatched mats only)
  bias: number; normalBias: number;
  /** 0..1: how strongly warm lantern / torch pools (shade.ts POOLS) light the world (0 by day) */
  pools: number;
};
export const LIGHTS: Record<SkyKey, LightPreset> = {
  day: {
    az: 75, el: 48,
    lit: [1.58, 1.5, 1.33], shade: [0.3, 0.29, 0.36], lift: [0.05, 0.06, 0.11], lambert: 0.35, sideK: 0.84, term: 0.2,
    charTint: [1.0, 0.94, 0.92], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.92, 0.90, 0.96],
    blob: [0.62, 0.58, 0.58], actorShadow: false,
    top: "#3e7fd2", hor: "#b8d0ec", skyCurve: [0.0, 0.5, 0.6], fog: "#b8d0ec", fogNear: 25, fogFar: 420, sunDisc: "#000000",
    sunCol: "#fff3e0", sunI: 2.8, sky: "#dcecff", ground: "#b49a78", hemiI: 0.55,
    bias: -0.00025, normalBias: 0.015, pools: 0,
  },
  golden: {
    az: 6, el: 7,
    lit: [1.42, 0.9, 0.5], shade: [0.21, 0.18, 0.32], lift: [0.04, 0.06, 0.17], lambert: 0.35, sideK: 0.82, term: 0.07,
    charTint: [1.0, 0.78, 0.56], charShade: 0.88, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.85, 0.80, 0.95],
    blob: [0.75, 0.74, 0.9], actorShadow: true,
    top: "#6a4f8c", hor: "#ffd08a", skyCurve: [0.05, 0.6, 1.0], fog: "#efb489", fogNear: 40, fogFar: 310, sunDisc: "#ffcf9e",
    sunCol: "#ffab5e", sunI: 5.5, sky: "#d8b0b8", ground: "#8a6a60", hemiI: 0.5,
    bias: -0.0006, normalBias: 0.03, pools: 0.25,
  },
  // moonlit blue key from behind the lens, deep blue-violet (never black) shade, warm pools do the rest
  night: {
    az: 140, el: 34,
    // deepest moonlit shadows lifted (post measured graded p5 .07 at 400 / 520): more shade fill + lift, lit side unchanged
    lit: [0.3, 0.38, 0.68], shade: [0.16, 0.18, 0.33], lift: [0.065, 0.075, 0.14], lambert: 0.3, sideK: 0.85, term: 0.12,
    charTint: [0.8, 0.85, 1.03], charShade: 0.93, charGrad: 0.1, bodyGrad: 0.22, sideTint: [0.8, 0.84, 1.0],
    blob: [0.55, 0.58, 0.8], actorShadow: true,
    top: "#16224e", hor: "#40568e", skyCurve: [0.0, 0.5, 0.6], fog: "#34497e", fogNear: 28, fogFar: 250, sunDisc: "#dfe8ff",
    sunCol: "#a9bdff", sunI: 1.6, sky: "#8094d4", ground: "#3a3552", hemiI: 0.55,
    bias: -0.0009, normalBias: 0.06, pools: 1,
  },
  // pale peach glow low in the EAST (sky shader glow), blue above; low warm key from the front-right
  dawn: {
    az: 55, el: 19,
    lit: [1.05, 0.86, 0.82], shade: [0.2, 0.22, 0.4], lift: [0.04, 0.05, 0.12], lambert: 0.32, sideK: 0.84, term: 0.1,
    charTint: [0.98, 0.88, 0.86], charShade: 0.86, charGrad: 0.1, bodyGrad: 0.22, sideTint: [0.86, 0.86, 1.0],
    blob: [0.65, 0.65, 0.85], actorShadow: true,
    top: "#2f4682", hor: "#ffc59c", skyCurve: [0.0, 0.5, 0.6], fog: "#c6a6b2", fogNear: 32, fogFar: 290, sunDisc: "#ffd9b0",
    sunCol: "#ffc39a", sunI: 2.6, sky: "#b8b4d8", ground: "#6a5a6a", hemiI: 0.55,
    bias: -0.0005, normalBias: 0.03, pools: 0.55,
  },
};

/** world-only look per light (sky stops by elevation in degrees, river colours, cloud palette). All colours are
 *  ON-SCREEN targets under the PBR-Neutral tone map; world.ts pre-inverts the tone map (shade.ts untone). */
export type WorldLook = {
  sky: { c: string[]; e: number[] };                         // 5 stops: c[i] at elevation e[i] (deg), smoothstep between
  water: { near: string; mid: string; far: string; crest: string; trough: string; glint: string; shade: C3 };
  bounce: C3;                                                 // shade.ts uBounce: albedo x bounce on shaded faces turned to the lens
  sat: number;                                                // shade.ts uSat: world albedo saturation (1 = as painted)
  cloud: { lit: string; mid: string; shade: string };
  /** horizon glow toward LOC.EAST (world-fixed): colour, strength 0..1 */ glow: { col: string; k: number };
  /** star field brightness 0..1, moon disc on/off weight */ stars: number; moon: number;
};
export const LOOK: Record<SkyKey, WorldLook> = {
  day: {
    sky: { c: ["#b8d0ec", "#9cbfea", "#6a9fe0", "#4f8cdb", "#3373cc"], e: [0, 3, 8, 16, 40] },
    water: { near: "#22a7b6", mid: "#167fb2", far: "#1a5596", crest: "#7ddfe8", trough: "#0e4a80", glint: "#ffffff", shade: [0.5, 0.56, 0.72] },
    cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" },
    bounce: [0, 0, 0], sat: 1.08, glow: { col: "#000000", k: 0 }, stars: 0, moon: 0,
  },
  golden: {
    sky: { c: ["#ffc47c", "#f7ae78", "#e8967c", "#c4848e", "#8a6f8a"], e: [0, 4, 10, 20, 40] },
    water: { near: "#1e3a6e", mid: "#355f96", far: "#d4a48e", crest: "#d9a088", trough: "#16294f", glint: "#ffe2b0", shade: [0.42, 0.46, 0.72] },
    cloud: { lit: "#ffd2a8", mid: "#f2a08f", shade: "#a98fc4" },
    bounce: [0.14, 0.08, 0.03], sat: 1.1, glow: { col: "#000000", k: 0 }, stars: 0, moon: 0,
  },
  night: {
    // a lighter blue band on the horizon (never a black sky), deep ultramarine overhead
    sky: { c: ["#4a6198", "#3a5089", "#2b3f78", "#203266", "#17244f"], e: [0, 3, 9, 20, 50] },
    water: { near: "#1d2c5a", mid: "#2a3e76", far: "#4c639c", crest: "#7d94d4", trough: "#111b40", glint: "#e2ebff", shade: [0.6, 0.66, 0.85] },
    cloud: { lit: "#8597cc", mid: "#5d6ca6", shade: "#3c4882" },
    bounce: [0.02, 0.02, 0.05], sat: 0.62, glow: { col: "#000000", k: 0 }, stars: 0.9, moon: 1,
  },
  dawn: {
    sky: { c: ["#ffcfa4", "#f2b09a", "#b49ab4", "#6f7fb8", "#344c8c"], e: [0, 3, 9, 20, 50] },
    water: { near: "#2a3d70", mid: "#5a6a9c", far: "#e8b7a0", crest: "#f0c4a8", trough: "#1d2a52", glint: "#fff0dc", shade: [0.5, 0.52, 0.75] },
    cloud: { lit: "#ffd0b4", mid: "#d6a4b4", shade: "#8484b4" },
    bounce: [0.08, 0.05, 0.04], sat: 0.95, glow: { col: "#ffb070", k: 0.9 }, stars: 0.15, moon: 0.2,
  },
};

// ---------------- per-frame blend (skyAt) ----------------
const _ca = new THREE.Color(), _cb = new THREE.Color();
const lerpHex = (a: string, b: string, k: number) => (k <= 0 ? a : k >= 1 ? b : "#" + _ca.set(a).lerp(_cb.set(b), k).getHexString());
const lerpN = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpC = (a: C3, b: C3, k: number): C3 => [lerpN(a[0], b[0], k), lerpN(a[1], b[1], k), lerpN(a[2], b[2], k)];
/** generic field-by-field lerp of two plain objects (numbers, [r,g,b], hex strings, nested objects; booleans switch at .5) */
const blend = <T,>(a: T, b: T, k: number): T => {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(a as object)) {
    const x = (a as Record<string, unknown>)[key], y = (b as Record<string, unknown>)[key];
    if (typeof x === "number") out[key] = lerpN(x, y as number, k);
    else if (typeof x === "string") out[key] = x.startsWith("#") ? lerpHex(x, y as string, k) : k < 0.5 ? x : y;
    else if (typeof x === "boolean") out[key] = k < 0.5 ? x : y;
    else if (Array.isArray(x)) out[key] = typeof x[0] === "number" ? (x.length === 3 ? lerpC(x as C3, y as C3, k) : x.map((v, i) => lerpN(v, (y as number[])[i], k)))
      : x.map((v, i) => lerpHex(v as string, (y as string[])[i], k));
    else out[key] = blend(x, y, k);
  }
  return out as T;
};
export const presetAt = (from: SkyKey, to: SkyKey, k: number): LightPreset => (from === to ? LIGHTS[from] : blend(LIGHTS[from], LIGHTS[to], k));
export const lookAt = (from: SkyKey, to: SkyKey, k: number): WorldLook => (from === to ? LOOK[from] : blend(LOOK[from], LOOK[to], k));
