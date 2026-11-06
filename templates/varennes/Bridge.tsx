// "Varennes": ~59 s short in the flat-characters-in-a-3D-toon-world style (4 long takes, hard cuts only).
// One three.js world (world.ts) posed per frame from the story timeline (story.ts). Post chain:
//   InkPass (world AO + ink lines, own pass) -> lens blur pre + main (thin-lens DOF from story.ts DOF / dofAt) ->
//   camera motion blur (re-projection with camAt(f -+ 1), lensblur.ts) ->
//   [bloom (emissive only) + NEUTRAL tone mapping + colour grade + dither] (one merged EffectPass), MSAA 4. No grain.
// Grade, bloom and ink colour follow the take's sky (story.ts skyAt): take 2 lerps night -> dawn per frame.
// Rack focus: the DOF table's ramps are evaluated here in DIOPTERS (1 / focus distance), each ramp starting from the
// exact state the previous one had reached, so a rack never jumps even when a ramp starts before the last one ended.
// Ink runs before the DOF so lines blur with what they belong to; bloom after the DOF so glows defocus with their
// source; the grade is display-referred, so it comes after tone mapping. Every pixel-sized parameter is specified at
// 1080x1920 and scaled with the output size, so stills at --scale 0.5 and the 1440x2560 final match.
// No crossfades (XFADE empty), no white flash; the film ends on a fade to black (story.ts fadeAt, last 8 f).
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World, loadKit } from "./world";
import { InkPass, noInkFallback } from "./ink";
import { LensBlur, MotionBlurEffect, MbCoach } from "./lensblur";
import { GradeEffect, GRADES, GradeName, gradeFor } from "./grade";
import { Kit } from "./build";
import { TOTAL, SHOTS, layersAt, DOF, glide, skyAt, fadeAt, camAt, coachAt, V3 } from "./story";

export const BRIDGE_FRAMES = TOTAL;

/** A/B switches for test stills only (Remotion inputProps `{ post: { ink: false, ... } }`); everything is on by default. */
type PostToggles = { ink: boolean; lens: boolean; pre: boolean; mb: boolean; bloom: boolean; grade: boolean };
const toggles = (): PostToggles => ({ ink: true, lens: true, pre: true, mb: true, bloom: true, grade: true, ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });

/** pose a camera exactly like world.update does from story.ts camAt (used for the motion blur's f -+ 1 cameras) */
const poseCam = (c: THREE.PerspectiveCamera, id: number, f: number, aspect: number) => {
  const k = camAt(id, f);
  c.position.set(...k.pos); c.up.set(0, 1, 0); c.lookAt(...k.look); c.rotateZ(k.roll);
  c.fov = k.fov; c.aspect = aspect; c.near = 0.2; c.far = 1500; c.updateProjectionMatrix(); c.updateMatrixWorld();
  return c;
};
const camPrev = new THREE.PerspectiveCamera(), camNext = new THREE.PerspectiveCamera();
const mbCoach = (id: number, f: number): MbCoach => { const c = coachAt(id, f); return { pos: c.pos, dir: c.dir, left: c.left }; };

/** Bloom for emissive sources only (depth.md 6.4). Its MIP chain always starts at 540x960 (half of 1080x1920),
 *  whatever the output size, so the glow keeps the same size relative to the frame (e-fold ~30 px at 1080p,
 *  ~1.5 % of the frame height) at 540, 1080 and 1440 widths. ADD blend: HDR-safe (SCREEN darkens values > 1). */
const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

/** bloom per sky. Night: the threshold sits a little above 1 so only the HDR torches, lanterns and coach lamps glow
 *  (moonlit walls and firelit faces near 1.0 stay clean, no veil over the frame), a tighter radius keeps the glow round
 *  the flame, a little more intensity so the lamps read as light sources in the dark. */
type BloomLook = { thr: number; smooth: number; intensity: number; radius: number };
const BLOOM: Record<GradeName, BloomLook> = {
  day: { thr: 1.0, smooth: 0.2, intensity: 0.5, radius: 0.6 },
  golden: { thr: 1.0, smooth: 0.2, intensity: 0.5, radius: 0.6 },
  night: { thr: 1.12, smooth: 0.22, intensity: 0.65, radius: 0.52 },
  dawn: { thr: 1.05, smooth: 0.2, intensity: 0.55, radius: 0.56 },
  // take 1 intro: candles, torches and the lit window glow a touch more (still only HDR > ~1.1, round the flame)
  paris: { thr: 1.1, smooth: 0.24, intensity: 0.72, radius: 0.55 },
};
const setBloom = (b: BloomEffect, from: GradeName, to: GradeName, k: number) => {
  const p = BLOOM[from], q = BLOOM[to], L = (a: number, c: number) => a + (c - a) * k;
  b.luminanceMaterial.threshold = L(p.thr, q.thr);
  b.luminanceMaterial.smoothing = L(p.smooth, q.smooth);
  b.intensity = L(p.intensity, q.intensity);
  b.mipmapBlurPass.radius = L(p.radius, q.radius);
};
/** ink colour per sky: near-black everywhere; at night a hint of blue so lines sit in the moonlight instead of
 *  punching neutral holes (still far darker than the graded p5). Lerped in take 2. */
const INK: Record<GradeName, [number, number, number]> = { day: [3, 3, 3], golden: [3, 3, 3], night: [3, 4, 9], dawn: [4, 4, 7], paris: [3, 4, 10] };
const inkCol = new THREE.Color();
const inkFor = (from: GradeName, to: GradeName, k: number) => {
  const p = INK[from], q = INK[to];
  return inkCol.setRGB(...(p.map((v, i) => (v + (q[i] - v) * k) / 255) as [number, number, number]), THREE.SRGBColorSpace);
};

const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();

/** Lens state at frame f: blur strength and focus distance (m along the view axis). Each DOF entry with `dur` ramps
 *  from the state the previous entry had at the moment this one started (so overlapping ramps never pop), with
 *  smootherstep k; the focus distance is interpolated in diopters (1/m), like a focus ring, so in a bill -> king rack
 *  both ends are equally soft half way instead of the near one blurring at once and the far one sharpening at the end.
 *  Focus points are evaluated at the current frame (moving subjects are tracked during the ramp). */
const lensAt = (f: number, cam: THREE.PerspectiveCamera, target: THREE.Vector3): { cInf: number; dist: number } => {
  cam.getWorldDirection(fwd);
  const inv = (p: V3 | null) => {
    if (p) fpt.set(...p); else fpt.copy(target);
    return 1 / Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  };
  const at = (i: number, kf: number): { cInf: number; inv: number } => {
    const d = DOF[i];
    const tgt = { cInf: d.cInf, inv: inv(d.focus ? d.focus(f) : null) };
    if (!d.dur || i === 0) return tgt;
    const k = glide((kf - d.f) / d.dur);
    if (k >= 1) return tgt;
    const p = at(i - 1, d.f);
    return { cInf: p.cInf + (tgt.cInf - p.cInf) * k, inv: p.inv + (tgt.inv - p.inv) * k };
  };
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const r = at(i, f);
  return { cInf: Math.max(0, r.cInf), dist: Math.max(0.3, 1 / Math.max(r.inv, 1e-4)) };
};

const useKit = () => {
  const [kit, setKit] = useState<Kit | null>(null);
  const [handle] = useState(() => delayRender("varennes kit"));
  useEffect(() => { loadKit().then((k) => { setKit(k); continueRender(handle); }); }, [handle]);
  return kit;
};

const Inner: React.FC<{ id: number; kit: Kit }> = ({ id, kit }) => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useMemo(() => new World(kit), [kit]);
  const target = useMemo(() => new THREE.Vector3(), []);
  const on = useMemo(toggles, []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    mb: new MotionBlurEffect({ shutter: 0.35, maxPx: 10 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, 1),
  }), [camera, scene]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  const post = useMemo(() => (
    <EffectComposer multisampling={4}>
      {on.ink ? <primitive object={fx.ink} dispose={null} /> : null}
      {on.lens && on.pre ? <primitive object={fx.lens.pre} dispose={null} /> : null}
      {on.lens ? <primitive object={fx.lens.main} dispose={null} /> : null}
      <primitive object={fx.mb} dispose={null} />
      {on.bloom ? <primitive object={fx.bloom} dispose={null} /> : null}
      <primitive object={fx.tone} dispose={null} />
      {on.grade ? <primitive object={fx.grade} dispose={null} /> : null}
    </EffectComposer>
  ), [fx, on]);
  const cam = camera as THREE.PerspectiveCamera;
  target.copy(world.update(id, f, cam, scene));
  noInkFallback(world.root);
  // thin-lens focus: distance along the view axis to the focus point (default: the camera's look target)
  const lens = lensAt(f, cam, target);
  fx.lens.focus = lens.dist;
  fx.lens.cInf = lens.cInf;
  // camera motion blur: neighbouring cameras of the same take (clamped at the take's ends: no blur across a cut)
  const s = SHOTS[id - 1], fp = Math.max(f - 1, s.a), fn = Math.min(f + 1, s.b - 1);
  fx.mb.cardMask = fx.ink.cardMask;
  fx.mb.setFrame(cam, poseCam(camPrev, id, fp, cam.aspect), poseCam(camNext, id, fn, cam.aspect), fn - fp,
    { cur: mbCoach(id, f), prev: mbCoach(id, fp), next: mbCoach(id, fn) }, on.mb && on.ink && fn > fp);
  // grade / bloom / ink colour from the take's sky, per frame (take 2: night -> dawn by k)
  const sk = skyAt(id, f), pick = (n: GradeName): GradeName => (id === 1 && n === "night" ? "paris" : n); // take 1: the intro preset
  const sky = { from: pick(sk.from), to: pick(sk.to), k: sk.k };
  gradeFor(fx.grade, sky.from, sky.to, sky.k);
  setBloom(fx.bloom, sky.from, sky.to, sky.k);
  fx.ink.set({ color: inkFor(sky.from, sky.to, sky.k) });
  return (
    <>
      <primitive object={world.root} dispose={null} />
      {post}
    </>
  );
};

/** test stills only: inputProps `{ post: { dpr: 0.5 } }` forces the WebGL buffer size (R3F clamps dpr to >= 1 by default) */
const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;
const ShotView: React.FC<{ id: number; kit: Kit; alpha: number }> = ({ id, kit, alpha }) => (
  <AbsoluteFill style={{ opacity: alpha }}>
    <ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
      camera={{ fov: 40, near: 0.2, far: 1500 }}>
      <Inner id={id} kit={kit} />
    </ThreeCanvas>
  </AbsoluteFill>
);

export const BridgeShort: React.FC = () => {
  const f = useCurrentFrame();
  const kit = useKit();
  if (!kit) return null;
  const fade = fadeAt(f); // 0 .. 1 black over the last 8 frames (1769 fully black)
  return (
    <AbsoluteFill style={{ background: "#000000" }}>
      {layersAt(f).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} kit={kit} alpha={l.alpha} />)}
      {fade > 0 && <AbsoluteFill style={{ background: "#000000", opacity: fade }} />}
    </AbsoluteFill>
  );
};
