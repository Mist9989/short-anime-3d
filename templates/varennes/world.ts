// The whole VARENNES world as one three.js scene (SHOTPLAN section 4): sky (elevation stops + a world-fixed dawn glow
// toward LOC.EAST + stars), moon, clouds, ground, the Varennes river, the four places of build.ts buildWorld (Paris /
// road / relay / ride, each a group shown only in its take), the berline posed from coachAt/teamAt, the bridge cart
// from bridgeCartAt, the Tuileries side gate, warm light pools (shade.ts POOLS) chosen per frame, and the cast.
// update(id, f, camera) poses everything for take `id` at frame f (pure function of id + f). Light = skyAt(id, f).
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { Batch, V, lam, Kit, Ray, buildWorld, WorldParts, Place, fgKit, tickBarrel, buildBerline, Berline, poseBerline, buildBridgeCart, Cart,
  poseGate, berlineWindowAt, LACQUER_ENV, setLacquerTint, poseInnDoor, makeBlob } from "./build";
import { bed, ctex, grassHD, grassMacro, waterNear, waterFar, cloudHD, glowTex, shaftTex, puffTex, mistTex } from "./paint";
import { LOOK, presetAt, lookAt, LightPreset, SkyKey } from "./lights";
import { TONE, CHAR, LFB, POOLS, NPOOL, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage, CamInfo } from "./cast";
import { FPS, D0, SHOTS, LOC, camAt, V3, smooth, clamp01, FOREGROUND, ShotDef, fortState, skyAt, coachAt, teamAt, teamSwapAt, coachLocal,
  COACH_LOCAL, bridgeCartAt, CUE, COACH, drouetAt } from "./story";

// ---------------- assets ----------------
// Kenney GLBs are not shipped with this short; everything is procedural. The loader stays (Bridge.tsx awaits it).
const KENNEY: string[] = [];
let kitP: Promise<Kit> | null = null;
export const loadKit = () => {
  if (!kitP) {
    const loader = new GLTFLoader();
    kitP = Promise.all(KENNEY.map((n) => loader.loadAsync(staticFile(`bridge/kenney/${n}.glb`)).then((g) => [n, g.scene] as const).catch(() => [n, null] as const)))
      .then((list) => Object.fromEntries(list.filter((e) => e[1]).map(([n, s]) => [n, s!])) as Kit);
  }
  return kitP;
};
/** the berline's left-window world anchor for cast.ts (re-exported from build.ts) */
export { berlineWindowAt };

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});
/** moon disc: pale with two soft grey maria (no face) */
const moonTex = () => ctex("moonDisc", 128, 128, (g) => {
  g.fillStyle = "#fffaf0"; g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill();
  for (const [x, y, r] of [[48, 52, 16], [76, 74, 12], [70, 44, 8]] as const) { g.fillStyle = "rgba(170,175,200,0.45)"; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
});
/** per-take key light override (degrees, camera-relative); otherwise the (blended) preset's az/el */
/** take 1: the moon only BEHIND the palace (az ~20): the facade sits in blue shade, the lamps and torches do the rest */
const SUN_SHOT: Record<number, { az?: number; el?: number }> = { 1: { az: 20, el: 30 } };
/** world-fixed key light per take (overrides the camera-relative one): take 3 = the evening sun low in the WEST-NORTH-WEST (lights the door side), down
 *  the road gap: the yard wide (looking west) is backlit golden, the close-ups (looking south) get it from screen right */
const SUN_WORLD: Record<number, THREE.Vector3> = { 3: new THREE.Vector3(-1, Math.tan((22 * Math.PI) / 180), -0.6).normalize() };
/** world-fixed moon direction: high in the north-west, above the palace roof in take 1 */
const MOON_DIR = new THREE.Vector3(-0.07, 0.23, -1).normalize(); // low over the palace, right of the dome in the take 1 wides
const PLACE_OF: Record<string, Place> = { paris: "paris", road: "road", relay: "relay", ride: "ride" };

/** every lens position of the film looking at its subject (sampled every 2 f over each long take) */
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  const REACH = 26;
  const add = (o: THREE.Vector3, look: THREE.Vector3, fov: number, all = true) => {
    const fw = look.clone().sub(o), len = all ? Math.min(REACH, fw.length()) : fw.length();
    fw.normalize();
    const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
    const ty = Math.tan((fov * Math.PI) / 360), tx = ty * (9 / 16);
    for (const [sx, sy] of all ? [[0, 0], [-0.6, 0], [0.6, 0], [0, 0.6], [0, -0.4]] : [[0, 0]])
      out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len, core: sx === 0 && sy === 0 });
  };
  for (const s of SHOTS) for (let f = s.a; f < s.b; f += 2) { const c = camAt(s.id, f); add(V(...c.pos), V(...c.look), c.fov); }
  // protected full-length lines: hook lens -> the king's window; take 4 high crane -> the coach at the bridge
  add(V(-5.2, D0 + 1.6, -84), V(...LOC.KING_HEAD1), 20, false);
  for (let f = 1600; f < 1770; f += 10) { const c = camAt(4, f); add(V(...c.pos), V(...c.look), 20, false); }
  return out;
};

const GRASS_K: [number, number, number] = [0.72, 0.7, 1.9];
type FgObj = { o: THREE.Object3D; a: number; b: number; kit: string; barrels: THREE.Group[] };
type Halo = { s: THREE.Sprite; base: number; flick: number; seed: number };
const flickAt = (t: number, seed: number, amt: number) => 1 + amt * (0.12 * Math.sin(17.3 * t + seed * 5.1) + 0.08 * Math.sin(31.7 * t + seed * 2.3) + 0.05 * Math.sin(7.1 * t + seed));

// ---- the relay horse swap, mirrored from cast.ts (SWAP_V .11, SWAP_GAP 26, easeGo R 14, softEnd E 1.2, swapPath) ----
const SWAP_OUT = (p: number) => CUE.UNHITCH[0] + 18 + (2 - p) * 26;
const SWAP_IN = (p: number) => CUE.NEW_TEAM[0] + p * 26;
const SWAP_SETTLE = (() => {
  const spl = (c: [number, number][], per = 8): [number, number][] => {
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
  const len = (pts: [number, number][]) => pts.slice(1).reduce((a, q, i) => a + Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]), 0);
  const hs3 = teamAt(3, 806), [ds, , dz] = LOC.STABLE_DOORS[1];
  return [0, 1, 2].map((p) => {
    const h = hs3[p * 2], cx = h.pos[0] - h.dir[2] * 0.68 * h.side, cz = h.pos[2] + h.dir[0] * 0.68 * h.side;
    const L = len(spl([[ds, dz + 4.2], [ds, dz], [ds + 1.0, dz - 2.4], [1209.5 - p * 0.4, -73.6], [cx - 1.9, cz + 2.0], [cx - 1.0, cz + 0.4], [cx - 0.45, cz], [cx, cz]]));
    for (let f = SWAP_IN(p); f < 1456; f++) {
      const tt = f - SWAP_IN(p), R = 14, v = 0.11, raw = tt <= 0 ? 0 : tt < R ? (v * tt * tt) / (2 * R) : v * (tt - R / 2), E = 1.2;
      const s1 = raw < L - E ? raw : L - E * Math.exp(-(raw - (L - E)) / E);
      if (L - s1 < 0.02) return f;
    }
    return 1456;
  });
})();

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private fill: THREE.DirectionalLight;
  private roomLight: THREE.PointLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private WU: Record<string, THREE.IUniform>;
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite; private moon: THREE.Sprite;
  private sunBasis = new Map<number, [number, number]>();
  private shadowR = new Map<number, number>();
  /** contact shadows under the 6 harnessed horses (hitched only) and under Drouet / his horse (QA r3 #11) */
  private hoofBlobs: THREE.Mesh[] = [];
  private cloudMaps = new Map<SkyKey, THREE.Texture[]>();
  private fgs: FgObj[] = [];
  private clouds: { a: THREE.Mesh; b: THREE.Mesh; off: THREE.Vector3 }[] = [];
  private parts: WorldParts;
  private coach: Berline;
  private cart: Cart;
  private halos: (Halo & { place: Place })[] = [];
  private shafts: THREE.Mesh[] = [];
  /** chimney smoke (a few chimneys per place, puffs rising on a loop) and low forest mist: soft sprites, no ink */
  private smoke: { s: THREE.Sprite; base: V3; i: number; place: Place }[] = [];
  private mist: { s: THREE.Sprite; w: number }[] = [];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root;
    // ---- sky: 5 elevation stops + dawn glow toward +x (world-fixed) + stars; tone-map-inverted linear values ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() },
        glowDir: { value: new THREE.Vector3(...LOC.EAST) }, glowCol: { value: new THREE.Color() }, glowK: { value: 0 }, stars: { value: 0 } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4, glowDir, glowCol; uniform vec4 e; uniform float glowK, stars; varying vec3 vP;
        void main(){ vec3 d = normalize(vP); float el = asin(clamp(d.y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          vec3 hd = normalize(vec3(d.x, 0.0, d.z) + 1e-5);
          float g = pow(max(dot(hd, glowDir), 0.0), 3.0) * (1.0 - smoothstep(0.0, 0.42, el));
          c = mix(c, glowCol, clamp(glowK * g, 0.0, 1.0));
          if (stars > 0.0) {
            vec3 q = d * 110.0, id = floor(q), fr = fract(q) - 0.5;
            float h = fract(sin(dot(id, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
            float h2 = fract(h * 91.7);
            float s = step(0.975, h) * smoothstep(0.16, 0.02, length(fr + (vec3(h2, fract(h2 * 7.3), fract(h2 * 3.1)) - 0.5) * 0.5));
            c += vec3(0.85, 0.9, 1.0) * s * stars * (0.5 + 0.5 * h2) * smoothstep(0.06, 0.35, el);
          }
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, depthTest: true,
      transparent: true, blending: THREE.AdditiveBlending }));
    this.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex(), color: new THREE.Color(2.2, 2.25, 2.4), fog: false, depthWrite: false, transparent: true }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5; this.moon.renderOrder = -0.5;
    for (const m of [this.sunDisc, this.sunHalo, this.moon]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.fill = new THREE.DirectionalLight("#9fb8ff", 0.35);
    // warm light inside the king's room (unpatched materials = the cards; the room itself is HDR emissive)
    this.roomLight = new THREE.PointLight("#ffc890", 6, 5, 1.5);
    this.roomLight.position.set(LOC.KING_WIN[0], LOC.KING_WIN[1] + 0.6, LOC.FACADE_Z - 1.6);
    R.add(this.hemi, this.sun, this.sun.target, this.fill, this.fill.target);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60, w = 130 + (i % 4) * 30;
      const mk = () => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
        m.scale.set(w, w / 2, 1); m.layers.set(NOINK); R.add(m); return m;
      };
      this.clouds.push({ a: mk(), b: mk(), off: new THREE.Vector3(Math.cos(a) * d, 120 + (i % 4) * 38, Math.sin(a) * d) });
    }

    // ---- ground: lawn everywhere except the Varennes river channel; the places add their own cobbles / roads ----
    const b = new Batch();
    const grass = lam("grassHD", () => ({ map: grassHD() }));
    grass.color.setRGB(GRASS_K[0], GRASS_K[1], GRASS_K[2]);
    if (!grass.userData.macro) {
      grass.userData.macro = true;
      const macro = grassMacro(), tt = grass.onBeforeCompile.bind(grass);
      grass.onBeforeCompile = (sh, r) => {
        tt(sh, r);
        sh.uniforms.uMacro = { value: macro };
        sh.fragmentShader = sh.fragmentShader
          .replace("#include <map_fragment>", "#include <map_fragment>\n#ifdef USE_MAP\n  diffuseColor.rgb *= texture2D(uMacro, vMapUv / 8.0).rgb * 2.0;\n#endif")
          .replace("#include <common>", "#include <common>\nuniform sampler2D uMacro;");
      };
      const ck = grass.customProgramCacheKey.bind(grass);
      grass.customProgramCacheKey = () => ck() + "_macro";
    }
    const [rv0, rv1] = LOC.RIVER4_X;
    for (const [x0, x1, z0, z1] of [[-900, rv0, -900, 900], [rv1, 2500, -900, 900], [rv0, rv1, -900, -400], [rv0, rv1, 300, 900]] as const)
      b.add(quadUp(x0, x1, z0, z1, (x1 - x0) / 4, (z1 - z0) / 4), grass);
    b.build(R);
    void bed;
    this.parts = buildWorld(R, sightLines());

    // ---- the Varennes river: its own mesh so the ripples drift (flow along -z, north) ----
    const wNear = waterNear(), wFar = waterFar();
    for (const t of [wNear, wFar]) { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 16; t.needsUpdate = true; }
    this.WU = {
      wNearC: { value: new THREE.Color() }, wMidC: { value: new THREE.Color() }, wFarC: { value: new THREE.Color() },
      wCrest: { value: new THREE.Color() }, wTrough: { value: new THREE.Color() }, wGlint: { value: new THREE.Color() },
      wShade: { value: new THREE.Vector3(0.5, 0.56, 0.72) }, wNearTex: { value: wNear }, wFarTex: { value: wFar }, wTime: { value: 0 },
      wFlow: { value: new THREE.Vector2(0, -0.35) },
    };
    const waterM = new THREE.MeshLambertMaterial({ color: 0xffffff });
    waterM.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.WU);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", WATER_DECL)
        .replace("#include <map_fragment>", WATER_COL)
        .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
        .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n  reflectedLight.directDiffuse = diffuseColor.rgb * mix(wShade, vec3(1.0), sunVis);\n  reflectedLight.indirectDiffuse = vec3(0.0);");
    };
    waterM.customProgramCacheKey = () => "river2";
    const wm = new THREE.Mesh(quadUp(rv0, rv1, -400, 300, 1, 1, -1.9), waterM);
    wm.receiveShadow = true;
    this.parts.groups.ride.add(wm);

    // ---- posed models ----
    this.coach = buildBerline();
    R.add(this.coach.group);
    for (const t of this.coach.traces) R.add(t);
    for (let i = 0; i < 8; i++) { const m = makeBlob(); m.visible = false; this.hoofBlobs.push(m); R.add(m); }
    this.cart = buildBridgeCart();
    this.parts.groups.ride.add(this.cart.group);
    this.parts.groups.paris.add(this.roomLight);
    // lamp halos (soft additive sprites on the no-ink layer)
    const gt = glowTex();
    for (const h of this.parts.halos) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, color: new THREE.Color(1.0, 0.62, 0.3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      s.position.set(...h.p); s.scale.setScalar(h.s); s.layers.set(NOINK);
      this.parts.groups[h.place].add(s);
      this.halos.push({ s, base: h.s, flick: h.flick, seed: h.seed, place: h.place });
    }
    // moonlight shafts in the forest (tilted soft bands, turned to the lens about their own axis)
    const shM = new THREE.MeshBasicMaterial({ map: shaftTex(), color: new THREE.Color(0.32, 0.4, 0.66), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });
    for (const [x, z, w] of [[2033, -56, 2.2], [2019, -61, 1.6], [2031, -69, 2.6], [2017, -76, 1.8], [2028, -80, 2.0], [2038, -64, 1.5], [2024, -52, 1.4], [2041, -77, 2.2]] as const) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 16).translate(0, 8, 0), shM.clone()); // own material: faded per shaft
      m.position.set(x, D0, z); m.layers.set(NOINK); m.renderOrder = 3;
      this.parts.groups.ride.add(m); this.shafts.push(m);
    }
    const pt = puffTex();
    const boxes: [Place, number, number, number, number][] = [["paris", -80, -200, 80, -40], ["road", 150, -200, 600, 40], ["relay", 1100, -200, 1300, 40], ["ride", 1900, -200, 2120, 60]];
    for (const [pl, x0, z0, x1, z1] of boxes) {
      const ch = this.parts.chimneys.filter((c) => c[0] > x0 && c[0] < x1 && c[2] > z0 && c[2] < z1);
      const rest = ch.slice(pl === "paris" ? 7 : 0), lead = pl === "paris" ? ch.slice(0, 7) : [];
      const pick = [...lead, ...rest.filter((_, k) => k % Math.max(1, Math.floor(rest.length / 7)) === 0).slice(0, 7)];
      for (const c of pick) for (let i = 0; i < 5; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: pt, color: new THREE.Color(0.75, 0.78, 0.86), transparent: true, depthWrite: false, opacity: 0 }));
        sp.layers.set(NOINK); sp.renderOrder = 4; this.parts.groups[pl].add(sp);
        this.smoke.push({ s: sp, base: c, i: i + c[0] * 0.37, place: pl });
      }
    }
    const [fx0, fz0, fx1, fz1] = LOC.FOREST_BOX;
    const lens4: V3[] = []; for (let g = 1456; g < 1660; g += 3) lens4.push(camAt(4, g).pos);
    const mt = mistTex();
    for (let i = 0; i < 46; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: mt, color: new THREE.Color(0.62, 0.72, 1.0), transparent: true, depthWrite: false, opacity: 0.3, fog: true }));
      const u = (i * 0.618) % 1, v = (i * 0.381 + 0.2) % 1, w = 7 + (i % 3) * 2.5;
      // two thirds along the ride (2-14 m either side of the path, where the lens looks), the rest anywhere in the wood
      const tz = fz1 - 2 - v * (fz1 - fz0 - 4), px = 2030 - ((fz1 - tz) / (fz1 - fz0)) * 9 + (i % 2 ? 1 : -1) * (2 + u * 12);
      if (i % 3) sp.position.set(px, D0 + 0.55 + (i % 4) * 0.25, tz); else sp.position.set(fx0 + 4 + u * (fx1 - fx0 - 8), D0 + 0.7, fz0 + 2 + v * (fz1 - fz0 - 4));
      sp.scale.set(w, w * 0.32, 1);
      if (lens4.some((p) => Math.hypot(p[0] - sp.position.x, p[2] - sp.position.z) < w / 2 + 6)) { sp.material.dispose(); continue; } // clear of every lens
      sp.layers.set(NOINK); sp.renderOrder = 3; this.parts.groups.ride.add(sp); this.mist.push({ s: sp, w });
    }
    // the cam agent's near framing objects: built once, never culled, toggled per frame
    for (const fg of FOREGROUND) {
      const k = fgKit(fg.kit, fg.s ?? 1);
      k.group.position.set(...fg.pos); k.group.rotation.y = fg.yaw ?? 0; k.group.visible = false;
      this.fgs.push({ o: k.group, a: fg.a, b: fg.b, kit: fg.kit, barrels: k.barrels }); R.add(k.group);
    }
  }

  private cloudMap(k: SkyKey, i: number) {
    let l = this.cloudMaps.get(k);
    if (!l) { l = [0, 1, 2, 3].map((s) => cloudHD(s, LOOK[k].cloud)); this.cloudMaps.set(k, l); }
    return l[i % 4];
  }

  /** camera-relative key light: the take's mean view direction (frozen per take) turned by az toward screen right,
   *  lifted by el */
  private sunDir(id: number, s: ShotDef, L: LightPreset) {
    if (SUN_WORLD[id]) return SUN_WORLD[id].clone();
    let bs = this.sunBasis.get(id);
    if (!bs) {
      let fx = 0, fz = 0;
      for (let g = s.a; g < s.b; g += 3) {
        const c = camAt(id, g), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
        fx += x / n; fz += z / n;
      }
      const n = Math.hypot(fx, fz) || 1;
      bs = [fx / n, fz / n];
      this.sunBasis.set(id, bs);
    }
    const [fx, fz] = bs;
    const azD = SUN_SHOT[id]?.az ?? L.az, elD = SUN_SHOT[id]?.el ?? L.el;
    const az = THREE.MathUtils.degToRad(azD), el = THREE.MathUtils.degToRad(elD);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    return new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], sk = skyAt(id, f), L = presetAt(sk.from, sk.to, sk.k), K = lookAt(sk.from, sk.to, sk.k);
    const place = PLACE_OF[s.scene] ?? "paris";
    for (const [k, g] of Object.entries(this.parts.groups)) g.visible = k === place;
    // ---- camera ----
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig: camera-relative key, two-tone uniforms, shadow fit ----
    const sunDir = this.sunDir(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    // shadow frustum: one size per take (median lens distance), the target snapped to the shadow texel grid, so the
    // map never resizes or slides sub-texel between frames (QA r2 #1 shimmer, r1 #6 crawling stair-steps)
    let Rr = this.shadowR.get(id);
    if (Rr === undefined) {
      const ds: number[] = [];
      for (let g = s.a; g < s.b; g += 4) { const cc = camAt(id, g); ds.push(Math.hypot(cc.look[0] - cc.pos[0], cc.look[1] - cc.pos[1], cc.look[2] - cc.pos[2])); }
      ds.sort((p, q) => p - q);
      Rr = THREE.MathUtils.clamp(ds[ds.length >> 1] * 1.15 + 7, 18, 45);
      this.shadowR.set(id, Rr);
    }
    {
      const texel = (2 * Rr) / this.sun.shadow.mapSize.x, xA = this.v.set(0, 1, 0).clone().cross(sunDir).normalize(), yA = sunDir.clone().cross(xA);
      const a = Math.round(focus.dot(xA) / texel) * texel, b2 = Math.round(focus.dot(yA) / texel) * texel, cdep = focus.dot(sunDir);
      const tgt = xA.multiplyScalar(a).addScaledVector(yA, b2).addScaledVector(sunDir, cdep);
      this.sun.target.position.copy(tgt); this.sun.position.copy(tgt).addScaledVector(sunDir, 220);
    }
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    this.fill.intensity = 0;
    // take 1: the pale palace stone sits in the moon's shade; scaled down so Paris matches the take-4 night (median ~.33)
    const tk = id === 1 ? 0.78 : 1;
    TONE.uLitCol.value.set(...L.lit).multiplyScalar(tk); TONE.uShadeCol.value.set(...L.shade).multiplyScalar(tk); TONE.uShadeLift.value.set(...L.lift).multiplyScalar(tk);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, sun / moon, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    LACQUER_ENV.paint(K.sky.c);
    // take 3 (warm golden key, violet shade): a bluer teal, little sky reflection (it read lavender), warm specular (the
    // cool one made a cyan hotspot on the box panel) and a faint teal self-light so the shade side stays teal
    if (id === 3) setLacquerTint("#0b8a8e", 0.06, "#6a5a48", [0.0, 0.028, 0.03]); else setLacquerTint("#3a8a76", 0.2, "#d2e0d8", [0.012, 0.03, 0.035]); // night: a touch of self-light so the body never sinks below the p5 floor
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    untone(K.glow.col, su.glowCol.value); su.glowK.value = K.glow.k; su.stars.value = K.stars;
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const showSun = sk.from === "golden" && sk.to === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    this.moon.visible = K.moon > 0.05;
    if (this.moon.visible) {
      this.moon.position.copy(cam.position).addScaledVector(MOON_DIR, 900);
      this.moon.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.6)));
      (this.moon.material as THREE.SpriteMaterial).opacity = K.moon;
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const { a, b, off } = this.clouds[i];
      for (const [m, key, op] of [[a, sk.from, 1 - sk.k], [b, sk.to, sk.k]] as const) {
        m.visible = op > 0.01;
        if (!m.visible) continue;
        m.position.set(cam.position.x + off.x, off.y, cam.position.z + off.z);
        m.lookAt(cam.position.x, m.position.y, cam.position.z);
        const mat = m.material as THREE.MeshBasicMaterial;
        mat.map = this.cloudMap(key, i); mat.opacity = op * (key === "night" ? 0.6 : 1);
      }
    }
    // ---- river colours ----
    const W = this.WU, wc = K.water;
    untone(wc.near, W.wNearC.value); untone(wc.mid, W.wMidC.value); untone(wc.far, W.wFarC.value);
    untone(wc.crest, W.wCrest.value); untone(wc.trough, W.wTrough.value); untone(wc.glint, W.wGlint.value);
    W.wShade.value.set(...wc.shade); W.wTime.value = t;
    // ---- posed models ----
    const co = coachAt(id, f), team = teamAt(id, f), sw = id === 3 ? teamSwapAt(f) : { out: 0, in: 1 };
    // take 3 horse change (cast.ts timing, mirrored exactly): pair p is unhitched from tOut(p) (leaders first) until its
    // fresh pair settles in its slot (SWAP_SETTLE); traces per pair follow that, the pole tip / bars drop with 12 f fades
    const away = [0, 1, 2].map((p) => id === 3 && f >= SWAP_OUT(p) && f < SWAP_SETTLE[p]);
    const empty = [0, 1, 2].map((p) => (id !== 3 ? 0 : smooth((f - SWAP_OUT(p)) / 12) * (1 - smooth((f - (SWAP_SETTLE[p] - 12)) / 12))));
    void sw;
    poseBerline(this.coach, co, team, away.map((a) => !a), empty);
    {
      let k = 0;
      const put = (x: number, z: number, dx: number, dz: number, len: number, wid: number) => {
        const m = this.hoofBlobs[k++]; if (!m) return;
        m.visible = true; m.position.set(x, D0 + 0.026, z); m.rotation.set(0, Math.atan2(-dz, dx), 0); m.scale.set(len, 1, wid);
      };
      if (co.visible) for (const h of team) if (!away[h.pair]) put(h.pos[0], h.pos[2], h.dir[0], h.dir[2], 2.6, 0.95);
      if (id === 3 || id === 4) {
        const d = drouetAt(id, f);
        if (d.mode !== "hidden") { if (d.horse) put(d.horse.pos[0], d.horse.pos[2], d.horse.dir[0], d.horse.dir[2], 2.6, 0.95); if (d.mode !== "ride") put(d.pos[0], d.pos[2], 1, 0, 0.8, 0.6); }
      }
      for (; k < this.hoofBlobs.length; k++) this.hoofBlobs[k].visible = false;
    }
    const bc = bridgeCartAt(f);
    this.cart.group.position.set(...bc.pos); this.cart.group.rotation.y = bc.yaw;
    for (const w of this.cart.wheels) w.rotation.z = -(bc.u * 15) / 0.6;
    this.cart.barrels.forEach((br, i) => { br.visible = bc.barrels > i + 0.3; if (br.visible) tickBarrel(br, t, cam.position, D0); });
    if (id === 1) poseGate(this.parts.gate, smooth((f - 262) / 22)); // fully open (flat on the facade) by 284, before the family
    if (id === 3) poseInnDoor(this.parts.innDoor, smooth((f - 826) / 14)); // the inn door opens 826-840, before Drouet comes out
    this.roomLight.intensity = 6 * L.pools;
    // ---- warm pools: the NPOOL lamps nearest the lens -> view-space uniforms (the last ones fade out, no pops) ----
    const cands: { p: V3; col: [number, number, number]; r: number; flick: number; seed: number }[] = this.parts.lamps.filter((l) => l.place === place);
    if (co.lanterns && co.visible) COACH_LOCAL.LANTERNS.forEach((l, i) => cands.push({ p: coachLocal(co, l), col: [1.05, 0.64, 0.29], r: 4.5, flick: 0.3, seed: 9 + i }));
    const P = cam.position, lk = focus, seg = (q: V3) => {
      const dx = lk.x - P.x, dy = lk.y - P.y, dz = lk.z - P.z, L2 = dx * dx + dy * dy + dz * dz || 1;
      const u = clamp01(((q[0] - P.x) * dx + (q[1] - P.y) * dy + (q[2] - P.z) * dz) / L2);
      return Math.hypot(q[0] - P.x - dx * u, q[1] - P.y - dy * u, q[2] - P.z - dz * u);
    };
    const ranked = cands.map((l) => ({ l, d: seg(l.p) })).sort((a, b2) => a.d - b2.d);
    const cut = ranked[NPOOL]?.d ?? 1e9;
    for (let i = 0; i < NPOOL; i++) {
      const pp = POOLS.uPoolPos.value[i], pc = POOLS.uPoolCol.value[i], it = ranked[i];
      if (!it || L.pools <= 0) { pp.set(0, 0, 0, 0); pc.set(0, 0, 0); continue; }
      const w = clamp01((cut - it.d) / 4) * L.pools * flickAt(t, it.l.seed, it.l.flick);
      this.v.set(...it.l.p).applyMatrix4(cam.matrixWorldInverse);
      pp.set(this.v.x, this.v.y, this.v.z, it.l.r * (1 + 0.04 * (flickAt(t, it.l.seed, it.l.flick) - 1)));
      pc.set(it.l.col[0] * w, it.l.col[1] * w, it.l.col[2] * w);
    }
    for (const h of this.halos) {
      h.s.visible = h.place === place && L.pools > 0.3;
      // a halo closer than ~3 m to the lens fades out smoothly (never a frame-filling additive sprite that pops at the near plane)
      const near = clamp01((h.s.position.distanceTo(cam.position) - 1.5) / 1.5);
      if (h.s.visible) { h.s.scale.setScalar(h.base * flickAt(t, h.seed, h.flick) * Math.min(1, L.pools)); (h.s.material as THREE.SpriteMaterial).opacity = near; h.s.visible = near > 0.001; }
    }
    // smoke: each puff rises 4.5 m and drifts east over 8 s, growing and fading in/out (looped, never pops)
    for (const p of this.smoke) {
      p.s.visible = p.place === place;
      if (!p.s.visible) continue;
      const u = (((t / 8 + p.i / 5) % 1) + 1) % 1, mat = p.s.material as THREE.SpriteMaterial;
      p.s.position.set(p.base[0] + 1.6 * u, p.base[1] + 4.5 * u, p.base[2] + 0.4 * Math.sin(u * 6 + p.i));
      p.s.scale.setScalar(0.7 + 2.2 * u);
      mat.opacity = 0.42 * Math.sin(Math.PI * u) * clamp01((p.s.position.distanceTo(cam.position) - 3) / 3);
      mat.color.set(sk.to === "golden" ? "#c8b4b0" : "#8c96b8");
    }
    for (const m of this.mist) {
      const mat = m.s.material as THREE.SpriteMaterial, dd = m.s.position.distanceTo(cam.position);
      m.s.visible = place === "ride" && K.moon > 0.5;
      mat.opacity = 0.26 * clamp01((dd - 10) / 8) * (1 - clamp01((dd - 45) / 20)) * (0.85 + 0.15 * Math.sin(t * 0.3 + m.w)); // depth-faded banks only
    }
    // moon shafts only read from inside the wood: faded out above the canopy, near the lens and outside the forest box
    const [sx0, sz0, sx1, sz1] = LOC.FOREST_BOX, inWood = clamp01(Math.min(cam.position.x - sx0, sx1 - cam.position.x, cam.position.z - sz0, sz1 - cam.position.z) / 4 + 0.5);
    for (const m of this.shafts) {
      const k = clamp01((D0 + 8 - cam.position.y) / 3) * inWood * clamp01((Math.hypot(cam.position.x - m.position.x, cam.position.z - m.position.z) - 4) / 6);
      (m.material as THREE.MeshBasicMaterial).color.setRGB(0.32 * k, 0.4 * k, 0.66 * k);
      m.visible = K.moon > 0.5 && k > 0.003;
      m.rotation.set(0, Math.atan2(cam.position.x - m.position.x, cam.position.z - m.position.z), 0);
      m.rotateZ(0.32);
    }
    // ---- foreground framing objects: inside their frames AND their own take ----
    for (const g of this.fgs) {
      g.o.visible = f >= g.a && f < g.b && g.a < s.b && g.b > s.a;
      if (g.o.visible) for (const br of g.barrels) tickBarrel(br, t, cam.position, D0);
    }
    // ---- cast + effects (char owner's stage(); signature unchanged) ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const camInfo: CamInfo = { pos: cam.position, right, sun: sunDir };
    const st = stage(id, t, fortState(id, f), camInfo);
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const tint = sk.to === "golden" ? "#ffcf9e" : sk.to === "night" ? "#c8d4ff" : "#ffffff";
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      if (a.mat.emissiveMap) a.mat.emissive.set(tint);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft);
      e2.mesh.visible = true;
      e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e3 of fused) e3.bind();
    return focus;
  }
}

const WATER_DECL = `#include <common>
varying vec3 vWP;
uniform vec3 wNearC, wMidC, wFarC, wCrest, wTrough, wGlint, wShade;
uniform sampler2D wNearTex, wFarTex;
uniform float wTime;
uniform vec2 wFlow;`;
const WATER_COL = `
  vec3 wV = vWP - cameraPosition;
  float wd = length(wV);
  float wDep = asin(clamp(-wV.y / wd, 0.0, 1.0));
  float wf = 1.0 - smoothstep(0.0, 0.42, wDep);
  vec3 wc = mix(mix(wNearC, wMidC, smoothstep(0.0, 0.55, wf)), wFarC, smoothstep(0.55, 1.0, wf));
  vec2 wp = vWP.xz + wFlow * wTime;
  vec4 mk = mix(texture2D(wNearTex, wp / 8.0), texture2D(wFarTex, wp / 40.0 + 0.37), smoothstep(25.0, 90.0, wd));
  wc = mix(wc, wTrough, mk.g * 0.6);
  wc = mix(wc, wCrest, mk.r * 0.7);
  wc = mix(wc, wGlint, mk.b * (0.3 + 0.5 * wf));
  diffuseColor.rgb = wc;`;

/** horizontal quad facing up at height D0 + dy covering x0..x1, z0..z1 (z0 < z1) */
function quadUp(x0: number, x1: number, z0: number, z1: number, u: number, v: number, dy = 0) {
  const y = D0 + dy, g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z1, x1, y, z0, x0, y, z0], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  return g;
}
export type { V3 };
