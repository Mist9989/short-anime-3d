// Colour grade for the Varennes short (post owner): references/grade/GradeEffect.ts (reports/grade.md), plus
// GRADES / GRADE_STRENGTH / gradeFor() keyed by story.ts `Light` (day, golden, night, dawn). Bridge.tsx calls
// gradeFor every frame with skyAt(id, f), so take 2's night -> dawn ramp lerps every grade value (no pop).
// GradeEffect: the fitted reference-style colour grade as a postprocessing 6.37 Effect.
// Put it LAST in the EffectComposer, after ToneMappingEffect. It works on display-referred values: the input (linear,
// already tone-mapped to 0..1) is encoded to sRGB, graded exactly like scripts/grade.py (validated on our stills), and
// decoded back to linear for the composer's output encoding.
//   1. RGB tone curve: monotone cubic Hermite through 7 knots at x = 0, .1, .25, .5, .75, .9, 1
//   2. saturation around luma Y' (Rec.709 weights on the encoded values), separately for shadows / mids / highlights
//   3. 3-way tint (split tone): zero-luma RGB offsets in shadows, mids, highlights
//   4. vignette: x (1 - k * smoothstep(r0, 1, r)), r = elliptical radius, corners = 1
// `amount` blends the whole grade (0 = bypass) so it can be dialled back once lighting/albedo work brightens the render.
import { Effect, BlendFunction } from "postprocessing";
import { Uniform, Vector3, Vector2 } from "three";

const frag = /* glsl */ `
uniform float gradeKy[7];
uniform float gradeKm[7];
uniform vec3 gradeSat;      // x = shadows, y = mids, z = highlights
uniform vec3 gradeTintS;    // zero-luma RGB offsets (sRGB-encoded units)
uniform vec3 gradeTintM;
uniform vec3 gradeTintH;
uniform vec2 gradeVig;      // x = strength k, y = start radius r0
uniform float gradeAmount;
uniform float gradeKnee;     // filmic shoulder: encoded values above the knee roll off softly (1.0 = off)
uniform float gradeDither;   // ordered-noise amplitude in 8-bit steps (1.0 = +-0.5/255, the whole range 1/255)
uniform float gradeWarmKeep; // 0..1: how much of the shadow/mid tint warm pixels (torches, lanterns, lit faces) skip
uniform float gradeWarmSat;  // extra saturation on warm-lit pixels (torch uplight on the facade, candles), 0 = off
uniform float gradeBlackKeep; // 0..1: how much of the shadow tint the near-black ink skips (lines stay black, not navy)

vec3 gradeEncode(vec3 c) {   // linear -> sRGB
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}
vec3 gradeDecode(vec3 c) {   // sRGB -> linear
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}
float gradeHermite(float v, float x0, float x1, float y0, float y1, float m0, float m1) {
  float h = x1 - x0, t = (v - x0) / h, t2 = t * t, t3 = t2 * t;
  return (2.0 * t3 - 3.0 * t2 + 1.0) * y0 + (t3 - 2.0 * t2 + t) * h * m0 + (-2.0 * t3 + 3.0 * t2) * y1 + (t3 - t2) * h * m1;
}
float gradeCurve(float v) {
  v = clamp(v, 0.0, 1.0);
  if (v < 0.1)  return gradeHermite(v, 0.0, 0.1, gradeKy[0], gradeKy[1], gradeKm[0], gradeKm[1]);
  if (v < 0.25) return gradeHermite(v, 0.1, 0.25, gradeKy[1], gradeKy[2], gradeKm[1], gradeKm[2]);
  if (v < 0.5)  return gradeHermite(v, 0.25, 0.5, gradeKy[2], gradeKy[3], gradeKm[2], gradeKm[3]);
  if (v < 0.75) return gradeHermite(v, 0.5, 0.75, gradeKy[3], gradeKy[4], gradeKm[3], gradeKm[4]);
  if (v < 0.9)  return gradeHermite(v, 0.75, 0.9, gradeKy[4], gradeKy[5], gradeKm[4], gradeKm[5]);
  return gradeHermite(v, 0.9, 1.0, gradeKy[5], gradeKy[6], gradeKm[5], gradeKm[6]);
}

// soft shoulder above the knee: t / (1 + .2 t), slope 1 at the knee, white lands at knee + .83 (1 - knee)
vec3 gradeShoulder(vec3 c) {
  if (gradeKnee >= 1.0) return c;
  vec3 t = max(c - gradeKnee, 0.0) / (1.0 - gradeKnee);
  return mix(c, gradeKnee + (1.0 - gradeKnee) * t / (1.0 + 0.2 * t), step(gradeKnee, c));
}
// interleaved gradient noise (Jimenez 2014): static, screen-locked, blue-ish, -0.5 .. 0.5
float gradeIGN(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))) - 0.5; }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 src = gradeEncode(inputColor.rgb);
  vec3 c = gradeShoulder(vec3(gradeCurve(src.r), gradeCurve(src.g), gradeCurve(src.b)));
  const vec3 W = vec3(0.2126, 0.7152, 0.0722);
  float y = dot(c, W);
  float wS = 1.0 - smoothstep(0.0, 0.55, y);
  float wH = smoothstep(0.45, 1.0, y);
  float wM = 1.0 - wS - wH;
  // warm light: a pixel whose red clearly leads its blue (torch / lantern pools, flames, firelit faces, uplight)
  float warm0 = smoothstep(0.04, 0.22, src.r - src.b) * smoothstep(0.08, 0.3, y);
  float s = gradeSat.y + (gradeSat.x - gradeSat.y) * wS + (gradeSat.z - gradeSat.y) * wH + gradeWarmSat * warm0;
  c = vec3(y) + s * (c - vec3(y));
  // warm-light protection: those pixels keep their warmth instead of being pulled toward the cool night tint
  // (0 = off, the day / golden behaviour)
  float warm = gradeWarmKeep * warm0;
  float blk = 1.0 - gradeBlackKeep * (1.0 - smoothstep(0.03, 0.16, dot(src, W)));
  c += (1.0 - warm) * (blk * wS * gradeTintS + wM * gradeTintM) + wH * gradeTintH;
  vec2 p = uv * 2.0 - 1.0;
  float r = length(p) * 0.70710678;
  c *= 1.0 - gradeVig.x * smoothstep(gradeVig.y, 1.0, r);
  c = clamp(c, 0.0, 1.0);
  // debanding: a static ordered dither of at most +-0.5/255 in display space, ONLY where a smooth gradient can band
  // (local slope between ~0.01 and 2 steps per pixel: night sky, fog, dawn / golden glows). Flat fills and textured
  // or edged areas get none, so it never shows as noise on flat mid-tones. Film grain stays off.
  vec3 o = mix(src, c, gradeAmount);
  float yo = dot(o, W);
  float slope = max(abs(dFdx(yo)), abs(dFdy(yo))) * 255.0;
  float band = smoothstep(0.004, 0.04, slope) * (1.0 - smoothstep(1.0, 2.5, slope));
  o = clamp(o + band * gradeDither * gradeIGN(gl_FragCoord.xy) / 255.0, 0.0, 1.0);
  outputColor = vec4(gradeDecode(o), inputColor.a);
}`;

// BT.709 zero-luma chroma basis (sRGB-encoded units): unit Cb and unit Cr as RGB offsets with Y' unchanged
const E_CB: [number, number, number] = [0.0, -0.18733, 1.8556];
const E_CR: [number, number, number] = [1.5748, -0.46813, 0.0];
export const tintRGB = (cb: number, cr: number) =>
  new Vector3(cb * E_CB[0] + cr * E_CR[0], cb * E_CB[1] + cr * E_CR[1], cb * E_CB[2] + cr * E_CR[2]);

/** Fritsch-Carlson monotone tangents for the 7 fixed knots (same as scripts/grade.py `tangents`) */
export const KX = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1];
export function monoTangents(ky: number[]): number[] {
  const n = KX.length, h: number[] = [], d: number[] = [], m = new Array(n).fill(0);
  for (let k = 0; k < n - 1; k++) { h.push(KX[k + 1] - KX[k]); d.push((ky[k + 1] - ky[k]) / h[k]); }
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let k = 1; k < n - 1; k++) {
    if (d[k - 1] * d[k] <= 0) { m[k] = 0; continue; }
    const w1 = 2 * h[k] + h[k - 1], w2 = h[k] + 2 * h[k - 1];
    m[k] = (w1 + w2) / (w1 / d[k - 1] + w2 / d[k]);
  }
  return m;
}

export type GradeParams = {
  ky: number[];                                  // 7 curve values at KX
  sat: [number, number, number];                 // shadows, mids, highlights
  tintS: [number, number]; tintM: [number, number]; tintH: [number, number];   // (Cb, Cr) per zone
  vig: [number, number];                         // strength, start radius
  warmKeep?: number;                             // 0..1 warm-light protection of the shadow/mid tint (night)
  blackKeep?: number;                            // 0..1 ink-black protection of the shadow tint (night)
  warmSat?: number;                              // extra saturation on warm-lit pixels (take 1 torch uplight)
};

// __GRADES__ (fitted by scripts/fit2.py, written by scripts/emit_ts.py)
export const GRADE_DAY: GradeParams = {
  ky: [0.0345, 0.1828, 0.3812, 0.6605, 0.8814, 0.9631, 1],   // tangents: [1.4831, 1.4038, 1.2198, 0.9867, 0.6608, 0.4346, 0.3693]
  sat: [0.9831, 1.2727, 1.4573],
  tintS: [-0.0291, 0.0411], tintM: [0.0376, -0.0104], tintH: [0.0144, -0.0047],
  vig: [0.1, 0.45],
};
//   shadows tint: hue 20 deg, RGB offset (+16.5, -3.5, -13.8)/255
//   mids tint: hue 230 deg, RGB offset (-4.2, -0.6, +17.8)/255
//   highlights tint: hue 228 deg, RGB offset (-1.9, -0.1, +6.8)/255
export const GRADE_GOLDEN: GradeParams = {
  ky: [0.0311, 0.1877, 0.4017, 0.6754, 0.875, 0.9582, 1],   // tangents: [1.5667, 1.498, 1.2526, 0.9235, 0.6445, 0.4724, 0.4183]
  sat: [0.8316, 0.8799, 1.7061],
  tintS: [0.0528, 0.0004], tintM: [0.0583, -0.0003], tintH: [0, 0],
  vig: [0.16, 0.4],
};
//   shadows tint: hue 246 deg, RGB offset (+0.2, -2.6, +25.0)/255
//   mids tint: hue 245 deg, RGB offset (-0.1, -2.7, +27.6)/255
//   highlights tint: hue 0 deg, RGB offset (+0.0, -0.0, +0.0)/255

/** filmic shoulder knee (display-encoded); white maps to .977 (249/255), so highlights never clip hard */
export const GRADE_KNEE = 0.86;
/** dither amplitude in 8-bit steps: 1 = +-0.5/255 */
export const GRADE_DITHER = 1.0;

export class GradeEffect extends Effect {
  constructor(p: GradeParams, amount = 1) {
    super("GradeEffect", frag, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ["gradeKy", new Uniform(p.ky.slice())],
        ["gradeKm", new Uniform(monoTangents(p.ky))],
        ["gradeSat", new Uniform(new Vector3(...p.sat))],
        ["gradeTintS", new Uniform(tintRGB(...p.tintS))],
        ["gradeTintM", new Uniform(tintRGB(...p.tintM))],
        ["gradeTintH", new Uniform(tintRGB(...p.tintH))],
        ["gradeVig", new Uniform(new Vector2(...p.vig))],
        ["gradeAmount", new Uniform(amount)],
        ["gradeWarmKeep", new Uniform(p.warmKeep ?? 0)],
        ["gradeBlackKeep", new Uniform(p.blackKeep ?? 0)],
        ["gradeWarmSat", new Uniform(p.warmSat ?? 0)],
        ["gradeKnee", new Uniform(GRADE_KNEE)],
        ["gradeDither", new Uniform(GRADE_DITHER)],
      ]),
    });
  }
  /** switch preset per shot (day <-> golden) or blend two presets during a crossfade/time-of-day change */
  set(p: GradeParams, q?: GradeParams, t = 0) {
    const L = (a: number, b: number) => a + (b - a) * t;
    const r: GradeParams = q ? {
      ky: p.ky.map((v, i) => L(v, q.ky[i])),
      sat: [L(p.sat[0], q.sat[0]), L(p.sat[1], q.sat[1]), L(p.sat[2], q.sat[2])],
      tintS: [L(p.tintS[0], q.tintS[0]), L(p.tintS[1], q.tintS[1])], tintM: [L(p.tintM[0], q.tintM[0]), L(p.tintM[1], q.tintM[1])],
      tintH: [L(p.tintH[0], q.tintH[0]), L(p.tintH[1], q.tintH[1])], vig: [L(p.vig[0], q.vig[0]), L(p.vig[1], q.vig[1])],
      warmKeep: L(p.warmKeep ?? 0, q.warmKeep ?? 0), blackKeep: L(p.blackKeep ?? 0, q.blackKeep ?? 0),
      warmSat: L(p.warmSat ?? 0, q.warmSat ?? 0),
    } : p;
    const u = this.uniforms;
    u.get("gradeKy")!.value = r.ky.slice();
    u.get("gradeKm")!.value = monoTangents(r.ky);
    (u.get("gradeSat")!.value as Vector3).set(...r.sat);
    u.get("gradeTintS")!.value = tintRGB(...r.tintS);
    u.get("gradeTintM")!.value = tintRGB(...r.tintM);
    u.get("gradeTintH")!.value = tintRGB(...r.tintH);
    (u.get("gradeVig")!.value as Vector2).set(...r.vig);
    u.get("gradeWarmKeep")!.value = r.warmKeep ?? 0;
    u.get("gradeBlackKeep")!.value = r.blackKeep ?? 0;
    u.get("gradeWarmSat")!.value = r.warmSat ?? 0;
  }
  get amount() { return this.uniforms.get("gradeAmount")!.value as number; }
  set amount(v: number) { this.uniforms.get("gradeAmount")!.value = v; }
}

/** Presets per light (plain objects: edit / re-fit freely). */
// Round-2 re-fit on the relit world (WORLD agent, 2026-10-31). The fitted presets above brighten (they were fitted to
// the old dark stills) and washed the new lighting out; these are gentle S-curves at full strength instead.
//   day: mid knot .60 for median Y' ~.57, darks pressed (.1 -> .085), a hint of violet in shadows.
//   golden: stronger S (darks .1 -> .09, mids .5 -> .54), blue-violet shadow tint, orange highlight tint, heavier vignette.
export const GRADE_DAY2: GradeParams = {
  ky: [0, 0.1, 0.28, 0.6, 0.835, 0.945, 1],
  sat: [1.0, 1.05, 1.0],
  tintS: [0.01, 0.002], tintM: [0, 0], tintH: [0.006, 0],
  vig: [0.12, 0.45],
};
export const GRADE_GOLDEN2: GradeParams = {
  ky: [0, 0.09, 0.245, 0.54, 0.8, 0.93, 1],
  sat: [1.0, 1.0, 0.92], // r2 verifier: golden mids/highlights were ochre-mustard (C* 54-60); studio pass: .95 -> .92
  // studio pass: highlight tint from orange (Cr +.006) to a neutral warm-yellow, so the evening sky reads golden, not orange
  tintS: [0.016, 0.002], tintM: [0, 0], tintH: [-0.007, -0.003],
  vig: [0.17, 0.42],
};
/** Night (takes 1 and 4, SHOTPLAN "night"): moonlit blue, saturated but never crushed. Display-referred, so it is
 *  robust to how dark the world renders: the toe is LIFTED (0 -> .03, .1 -> .175, .25 -> .33: any pixel the world puts
 *  at >= .07 lands >= .15, so p5 >= .15 holds as long as ink + deep shadow stay under ~5 % of the frame), mids are
 *  left near 1:1 (no extra darkening on top of the world's night) and the shoulder rolls off so HDR torches clip soft.
 *  Shadows and mids get a moonlight blue (Cb+, Cr-), highlights a warm offset, and warmKeep .85 stops the blue from
 *  greying the torch / lantern / coach-lamp pools. Saturation 1.12-1.25 keeps the night colourful, not grey. */
export const GRADE_NIGHT: GradeParams = {
  ky: [0.03, 0.175, 0.33, 0.56, 0.78, 0.91, 0.99],
  sat: [1.12, 1.2, 1.3],
  tintS: [0.042, -0.018], tintM: [0.02, -0.008], tintH: [-0.012, 0.012],
  vig: [0.18, 0.4], // studio pass: .22 -> .18 (gentle; the corners no longer go muddy)
  warmKeep: 0.85, blackKeep: 0.8,
};
/** Dawn (take 2's ramp target): cool shadows, warm peach highlights (the glow low in the east), a curve between
 *  night and golden; warm light still protected. skyAt ramps night -> dawn, so every value is lerped per frame. */
export const GRADE_DAWN: GradeParams = {
  ky: [0.03, 0.16, 0.315, 0.56, 0.795, 0.925, 1],
  sat: [1.05, 1.08, 1.1],
  tintS: [0.035, -0.012], tintM: [-0.006, 0.01], tintH: [-0.026, 0.024],
  vig: [0.17, 0.41],
  warmKeep: 0.5, blackKeep: 0.5,
};
/** Take 1 (Paris, the intro 172-473, where retention is decided): the night preset refined. Rich moonlit blue instead
 *  of the lavender haze (shadow / mid tint moved from violet to a cyan-blue: Cr pulled down), a firmer toe so the
 *  darks are clean and deep instead of milky (0 -> .012, .1 -> .14: still lifted, never crushed; the ink stays the
 *  darkest thing), more mid saturation for the blues, warm highlights + warmKeep .9 so candles, torches and the lit
 *  window stay amber and separate from the blue, and a gentle vignette that keeps the eye on the window / gate. */
export const GRADE_PARIS: GradeParams = {
  ky: [0.012, 0.14, 0.31, 0.56, 0.785, 0.915, 0.995],
  sat: [1.15, 1.28, 1.32],
  // QA r1b: + a real vignette (.16 -> .26 from r .34) and more torch warmth on the facade (warm highlight tint, warmSat)
  tintS: [0.046, -0.03], tintM: [0.024, -0.018], tintH: [-0.022, 0.022],
  vig: [0.26, 0.34],
  warmKeep: 0.95, blackKeep: 0.85, warmSat: 0.12, // .12: the world adds torch uplight too; more turns the stone orange
};
/** keyed by story.ts `Light` (ShotDef.sky) plus "paris" (take 1's night, picked in Bridge.tsx); no sepia flashback. */
export type GradeName = "day" | "golden" | "night" | "dawn" | "paris";
export const GRADES: Record<GradeName, GradeParams> = { day: GRADE_DAY2, golden: GRADE_GOLDEN2, night: GRADE_NIGHT, dawn: GRADE_DAWN, paris: GRADE_PARIS };
/** One strength (0..1, the effect's `amount`) per preset. */
export const GRADE_STRENGTH: Record<GradeName, number> = { day: 1, golden: 1, night: 1, dawn: 1, paris: 1 };
/** Apply the grade for a sky blend (story.ts skyAt: `from` -> `to` by k), every frame. Only touches the uniforms when
 *  the blend changes (k quantised to 1e-4, far below one 8-bit step), so take 2's night -> dawn ramp is smooth. */
export function gradeFor(fx: GradeEffect, from: GradeName, to: GradeName = from, k = 0) {
  const t = from === to ? 0 : Math.min(1, Math.max(0, k));
  const key = `${from}>${to}@${t.toFixed(4)}`;
  const tag = fx as unknown as { _grade?: string };
  if (tag._grade !== key) { fx.set(GRADES[from], t > 0 ? GRADES[to] : undefined, t); tag._grade = key; }
  fx.amount = GRADE_STRENGTH[from] + (GRADE_STRENGTH[to] - GRADE_STRENGTH[from]) * t;
}
