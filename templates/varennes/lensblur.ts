// Thin-lens depth of field for the reference's soft backgrounds (reports/depth.md 6.1), as two deterministic gather
// passes. CoC radius (px at 1080x1920) = cInf * |1 - focus / depth|, x nearScale in front of the focus plane,
// clamped to maxCoC. Every pixel size is multiplied in the shader by (output height / 1920), so the picture is the
// same at 540, 1080 and 1440 widths.
//   pre  : 16-tap gather over 0.29 x the CoC. It fills the gaps between the main taps, so the composite kernel is a
//          smooth disc (1024 effective taps) instead of 64 visible copies of every edge.
//   main : 64-tap Vogel disc over 0.96 x the CoC (pre + main together = a disc of sigma CoC/2), plus a 32-tap near
//          field gather that lets a blurred foreground spread over sharper pixels behind it.
// Occlusion rules (no halos, no dark rims): a sample counts only if its own CoC reaches this pixel, a farther sample
// may never spread wider than this pixel's own CoC (sharp subjects keep clean silhouettes), and the result is
// renormalised by the accepted weights. Fixed sample pattern, no per-pixel noise: no grain, no frame-to-frame flicker.
// Both passes are CONVOLUTION effects, so R3F's <EffectComposer> gives each its own EffectPass.
import { Effect, EffectAttribute, BlendFunction } from "postprocessing";
import { Uniform, Matrix4, Vector3, Texture, PerspectiveCamera } from "three";

const frag = /* glsl */ `
uniform float focus;      // focus distance along the view axis (m)
uniform float cInf;       // blur-disc radius (px at 1080x1920) of things at infinity; 0 = off
uniform float nearScale;  // extra blur for things in front of the focus plane
uniform float maxCoC;     // px at 1080x1920
#define GOLDEN 2.39996323

float cocAt(float d, float s) {               // signed CoC radius in output px
  float c = cInf * s * (1.0 - focus / max(d, 1e-3));
  if (c < 0.0) c *= nearScale;
  return clamp(c, -maxCoC * s, maxCoC * s);
}
float distAt(vec2 uv) { return -getViewZ(readDepth(uv)); }

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  if (cInf < 0.25) { outputColor = inputColor; return; }
  float s = resolution.y / 1920.0;             // output px per 1080x1920 px
  float d0 = -getViewZ(depth);
  float r0 = abs(cocAt(d0, s));
  float R = r0 * SPREAD;
  vec3 acc = inputColor.rgb; float wsum = 1.0;
  if (R > 0.5) {
    for (int i = 0; i < TAPS; i++) {
      float rr = sqrt((float(i) + 0.5) / float(TAPS)) * R;
      float a = float(i) * GOLDEN + ROT;
      vec2 suv = uv + vec2(cos(a), sin(a)) * rr * texelSize;
      float ds = distAt(suv);
      float rs = abs(cocAt(ds, s)) * SPREAD;
      if (ds > d0) rs = min(rs, R);            // background never bleeds over a nearer pixel
      float w = clamp(rs - rr + 0.5, 0.0, 1.0); // does the sample's disc reach us?
      acc += texture2D(inputBuffer, suv).rgb * w; wsum += w;
    }
  }
  vec3 col = acc / wsum;
#if NEAR_TAPS > 0
  float M = maxCoC * s;
  vec3 fg = vec3(0.0); float fw = 0.0, cov = 0.0;
  for (int i = 0; i < NEAR_TAPS; i++) {
    float rr = sqrt((float(i) + 0.5) / float(NEAR_TAPS)) * M;
    if (rr <= R) continue;                      // already covered by the disc gather
    float a = float(i) * GOLDEN + 1.0;
    vec2 suv = uv + vec2(cos(a), sin(a)) * rr * texelSize;
    float ds = distAt(suv);
    if (ds >= d0 * 0.97) continue;              // only things in front of us
    float rs = abs(cocAt(ds, s));
    float w = clamp(rs - rr + 0.5, 0.0, 1.0);
    fg += texture2D(inputBuffer, suv).rgb * w; fw += w;
    cov += w * (M * M) / max(rs * rs, 1.0);
  }
  if (fw > 0.0) col = mix(col, fg / fw, clamp(cov / float(NEAR_TAPS), 0.0, 1.0));
#endif
  outputColor = vec4(col, inputColor.a);
}`;

type Stage = { taps: number; spread: number; nearTaps: number; rot: number };
const PRE: Stage = { taps: 16, spread: 0.287, nearTaps: 0, rot: 0.61 };
const MAIN: Stage = { taps: 64, spread: 0.958, nearTaps: 32, rot: 0 };

export class LensBlurEffect extends Effect {
  constructor({ maxCoC = 24, nearScale = 1.2, stage = MAIN }: { maxCoC?: number; nearScale?: number; stage?: Stage } = {}) {
    super("LensBlurEffect", frag, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.DEPTH | EffectAttribute.CONVOLUTION,
      defines: new Map<string, string>([
        ["TAPS", String(stage.taps)], ["SPREAD", stage.spread.toFixed(4)], ["NEAR_TAPS", String(stage.nearTaps)], ["ROT", stage.rot.toFixed(4)],
      ]),
      uniforms: new Map<string, Uniform>([
        ["focus", new Uniform(10)], ["cInf", new Uniform(0)], ["nearScale", new Uniform(nearScale)], ["maxCoC", new Uniform(maxCoC)],
      ]),
    });
  }
  set focus(v: number) { this.uniforms.get("focus")!.value = v; }
  get focus() { return this.uniforms.get("focus")!.value as number; }
  set cInf(v: number) { this.uniforms.get("cInf")!.value = v; }
  get cInf() { return this.uniforms.get("cInf")!.value as number; }
}

/** The pair of passes the composer needs (pre first, then main); set focus / cInf once per frame on this object. */
export class LensBlur {
  readonly pre: LensBlurEffect;
  readonly main: LensBlurEffect;
  constructor({ maxCoC = 24, nearScale = 1.2 } = {}) {
    this.pre = new LensBlurEffect({ maxCoC, nearScale, stage: PRE });
    this.main = new LensBlurEffect({ maxCoC, nearScale, stage: MAIN });
  }
  set focus(v: number) { this.pre.focus = v; this.main.focus = v; }
  set cInf(v: number) { this.pre.cInf = v; this.main.cInf = v; }
  dispose() { this.pre.dispose(); this.main.dispose(); }
}

// ---------------- film grain (end of the chain, after the grade) ----------------
// Monochrome value-noise grain in display (gamma) space, std ~2.5 % of the display value in the mid-tones, less in
// deep blacks (ink stays black) and near white. Deterministic: the lattice is hashed with the frame number (PCG),
// so the same frame always renders the same grain (no shimmer between identical frames) and the grain moves from
// frame to frame like film. Grain cell size is given in px at 1080x1920 and scaled by output height / 1920, so the
// grain looks the same at 1080 and 1440 (a --scale 0.5 still averages it down by the browser's downscale).
const grainFrag = /* glsl */ `
uniform float seed;      // frame number
uniform float amount;    // std of the grain in display units (0.025 = 2.5 %)
uniform float cellPx;    // grain cell size in px at 1080x1920
uint pcg(uint v) { uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
float h3(ivec2 c, uint k) { return float(pcg(uint(c.x) + pcg(uint(c.y) + pcg(k)))) * (1.0 / 4294967295.0) - 0.5; }
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 p = uv * resolution / (cellPx * resolution.y / 1920.0);
  ivec2 i = ivec2(floor(p)); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  uint k = uint(seed + 0.5) * 2654435761u + 1013904223u;
  float n = mix(mix(h3(i, k), h3(i + ivec2(1, 0), k), f.x), mix(h3(i + ivec2(0, 1), k), h3(i + ivec2(1, 1), k), f.x), f.y);
  vec3 g = pow(max(inputColor.rgb, 0.0), vec3(1.0 / 2.2));             // display-like space
  float l = dot(g, vec3(0.2126, 0.7152, 0.0722));
  float w = 0.25 + 0.75 * clamp(4.0 * l * (1.0 - l), 0.0, 1.0);      // less grain in deep black and near white
  g = max(g + n * (amount / 0.2145) * w, 0.0);                        // 0.2145 = std of the smoothed lattice noise
  outputColor = vec4(pow(g, vec3(2.2)), inputColor.a);
}`;

export class GrainEffect extends Effect {
  constructor({ amount = 0.025, cellPx = 1.5 }: { amount?: number; cellPx?: number } = {}) {
    super("GrainEffect", grainFrag, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([["seed", new Uniform(0)], ["amount", new Uniform(amount)], ["cellPx", new Uniform(cellPx)]]),
    });
  }
  set seed(v: number) { this.uniforms.get("seed")!.value = v; }
  set amount(v: number) { this.uniforms.get("amount")!.value = v; }
}

// ---------------- camera motion blur (studio pass; after the lens blur, before bloom) ----------------
// Deterministic, camera-only: every pixel's world position (main depth + this frame's camera) is re-projected with the
// cameras of frames f-1 and f+1 (story.ts camAt is a pure function, so no history buffer and no second canvas), the
// centred screen velocity times the shutter (0.35 = a 126 deg shutter) is the blur line, capped at maxPx (px at
// 1080x1920, x output height / 1920). The coach is moving world geometry: pixels inside its box (coach-local frame
// from coachAt at f-1 / f / f+1) are re-projected with the coach, so a tracked coach stays sharp while the road
// streams. Character / horse / assignat cards (InkPass.cardMask: visible card coverage, flat ground cards included)
// are never blurred and never smeared into the background. 10 taps, tent-weighted, no noise.
const mbFrag = /* glsl */ `
uniform mat4 mbPrev;       // view-projection of frame f-1 (or the take's first frame)
uniform mat4 mbNext;       // ... of frame f+1 (or the take's last frame)
uniform mat4 mbInvProj;    // this frame's inverse projection
uniform mat4 mbCamWorld;   // this frame's camera matrixWorld
uniform sampler2D mbCardMask;   // InkPass: visible card coverage (a)
uniform float mbShutter;   // fraction of a frame; 0 = off
uniform float mbInvSpan;   // 1 / (frames between prev and next)
uniform float mbMaxPx;     // px at 1080x1920
uniform float mbCoachOn;
uniform vec3 mbCP; uniform vec3 mbCD; uniform vec3 mbCL;   // coach at f: position, forward, left
uniform vec3 mbPP; uniform vec3 mbPD; uniform vec3 mbPL;   // ... at prev
uniform vec3 mbNP; uniform vec3 mbND; uniform vec3 mbNL;   // ... at next
uniform vec3 mbBoxMin; uniform vec3 mbBoxMax;              // coach box, coach-local [fwd, up, left]
#define MB_TAPS 10
float mbCard(vec2 uv) { return step(0.5, textureLod(mbCardMask, uv, 0.0).a); }
vec2 mbProj(mat4 M, vec4 p, out float ok) { vec4 c = M * p; ok = c.w > 1e-3 ? 1.0 : 0.0; return c.xy / max(c.w, 1e-3) * 0.5 + 0.5; }
void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  outputColor = inputColor;
  if (mbShutter <= 0.0 || mbCard(uv) > 0.5) return;
  float s = resolution.y / 1920.0;
  vec4 vp = mbInvProj * vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0); vp /= vp.w;
  vec4 wp = depth >= 0.99999 ? vec4(mat3(mbCamWorld) * normalize(vp.xyz), 0.0) : mbCamWorld * vec4(vp.xyz, 1.0);
  vec3 a = wp.xyz, b = wp.xyz;
  if (mbCoachOn > 0.5 && wp.w > 0.5) {
    vec3 r = wp.xyz - mbCP, l = vec3(dot(r, mbCD), r.y, dot(r, mbCL));
    if (all(greaterThan(l, mbBoxMin)) && all(lessThan(l, mbBoxMax))) {
      a = mbPP + mbPD * l.x + vec3(0.0, l.y, 0.0) + mbPL * l.z;
      b = mbNP + mbND * l.x + vec3(0.0, l.y, 0.0) + mbNL * l.z;
    }
  }
  float ok0, ok1;
  vec2 u0 = mbProj(mbPrev, vec4(a, wp.w), ok0), u1 = mbProj(mbNext, vec4(b, wp.w), ok1);
  if (ok0 * ok1 < 0.5) return;
  vec2 v = (u1 - u0) * mbInvSpan * mbShutter;                 // uv covered while the shutter is open
  float L = length(v * resolution), M = mbMaxPx * s;
  if (L > M) { v *= M / L; L = M; }
  if (L < 0.6) return;
  vec3 acc = inputColor.rgb; float ws = 1.0;
  for (int i = 0; i < MB_TAPS; i++) {
    float t = (float(i) + 0.5) / float(MB_TAPS) - 0.5;      // -0.5 .. 0.5 along the line
    vec2 suv = uv + v * t;
    float w = (1.0 - abs(t)) * (1.0 - mbCard(suv));  // explicit LOD in the loop
    acc += textureLod(inputBuffer, suv, 0.0).rgb * w; ws += w;
  }
  outputColor = vec4(acc / ws, inputColor.a);
}`;

export type MbCoach = { pos: [number, number, number]; dir: [number, number, number]; left: [number, number, number] };
export class MotionBlurEffect extends Effect {
  constructor({ shutter = 0.35, maxPx = 10 }: { shutter?: number; maxPx?: number } = {}) {
    const U = (v: unknown) => new Uniform(v);
    super("MotionBlurEffect", mbFrag, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.DEPTH | EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ["mbPrev", U(new Matrix4())], ["mbNext", U(new Matrix4())], ["mbInvProj", U(new Matrix4())], ["mbCamWorld", U(new Matrix4())],
        ["mbCardMask", U(null)], ["mbShutter", U(shutter)], ["mbInvSpan", U(0.5)], ["mbMaxPx", U(maxPx)], ["mbCoachOn", U(0)],
        ["mbCP", U(new Vector3())], ["mbCD", U(new Vector3(1, 0, 0))], ["mbCL", U(new Vector3(0, 0, -1))],
        ["mbPP", U(new Vector3())], ["mbPD", U(new Vector3(1, 0, 0))], ["mbPL", U(new Vector3(0, 0, -1))],
        ["mbNP", U(new Vector3())], ["mbND", U(new Vector3(1, 0, 0))], ["mbNL", U(new Vector3(0, 0, -1))],
        // coach box: wheels -2.2 .. pole tip 9.8 m forward, 0.12 (above the road) .. 3.6 m up, +-1.5 m sideways
        ["mbBoxMin", U(new Vector3(-2.4, 0.12, -1.5))], ["mbBoxMax", U(new Vector3(10, 3.6, 1.5))],
      ]),
    });
    this.shutter = shutter;
  }
  private base = 0.35;
  set shutter(v: number) { this.base = v; this.uniforms.get("mbShutter")!.value = v; }
  set cardMask(t: Texture | null) { this.uniforms.get("mbCardMask")!.value = t; }
  /** per frame: this frame's camera (already posed), the neighbouring cameras, and the coach poses (or null) */
  setFrame(cam: PerspectiveCamera, prev: PerspectiveCamera, next: PerspectiveCamera, span: number,
    coach: { cur: MbCoach; prev: MbCoach; next: MbCoach } | null, enabled = true) {
    const u = this.uniforms;
    u.get("mbShutter")!.value = enabled ? this.base : 0;
    (u.get("mbPrev")!.value as Matrix4).multiplyMatrices(prev.projectionMatrix, prev.matrixWorldInverse);
    (u.get("mbNext")!.value as Matrix4).multiplyMatrices(next.projectionMatrix, next.matrixWorldInverse);
    (u.get("mbInvProj")!.value as Matrix4).copy(cam.projectionMatrixInverse);
    (u.get("mbCamWorld")!.value as Matrix4).copy(cam.matrixWorld);
    u.get("mbInvSpan")!.value = 1 / Math.max(1, span);
    u.get("mbCoachOn")!.value = coach ? 1 : 0;
    if (coach) {
      const set = (n: string, v: [number, number, number]) => (u.get(n)!.value as Vector3).set(...v);
      set("mbCP", coach.cur.pos); set("mbCD", coach.cur.dir); set("mbCL", coach.cur.left);
      set("mbPP", coach.prev.pos); set("mbPD", coach.prev.dir); set("mbPL", coach.prev.left);
      set("mbNP", coach.next.pos); set("mbND", coach.next.dir); set("mbNL", coach.next.left);
    }
  }
}
