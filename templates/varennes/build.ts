// Static scenery for VARENNES (SHOTPLAN section 4): merged batches (one mesh per material), and the four places of one
// world, far apart: PARIS (the Tuileries facade with the king's lit window + side gate, the night street, the plane
// tree over the waiting coach), the ROAD (dirt road east, poplars, fields, toll barrier, milestones), the SAINTE-MENEHOULD
// relay yard (inn, stable, well, trough), the RIDE (forest shortcut with moonlight shafts) and VARENNES (sleeping town,
// small river, two-arch stone bridge). Plus the posed models: the BERLINE (wheels, opening door, lanterns, pole, swingle
// bars) and the bridge CART, the shared BARREL, lamps. Everything procedural (no Kenney GLBs).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { FOREGROUND, D0, LOC, BARREL, SHOTS, camAt, coachAt, coachLocal, COACH, COACH_LOCAL, CUE, V3, CoachPose } from "./story";
import { brick, rng, ctex, rep, facadeHD, facadeLitHD, facadeWins, roofHD, stoneHD, staveTex, oakTex, gravelHD, cobbleHD, tuileriesBayHD, stableHD,
  innSignTex, dirtRoadHD, fieldHD, litterHD, glowTex, cobbleFadeHD, awningTex, puddleTex, edictTex, fernTex, ivyTex, birchTex, flowersTex,
  strawTex, shopSignTex, grassMacro, gutterTex, wetTex, strawDecalTex, leavesTex, aoEdgeTex, aoBlobTex, stoneDetailTex, cobbleCloseHD,
  vestibuleTex, mistTex, litterTex, drainTex, tuftTex, litWindowTex, tympanumTex, royalArmsTex } from "./paint";
import { twoTone } from "./shade";

export type Kit = Record<string, THREE.Object3D>;
export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ---------------- materials (shared, cached) ----------------
const mats = new Map<string, THREE.Material>();
/** materials whose Strands are built as real interlocking chain links (MAT pass) instead of a textured box tube */
const CHAIN_MATS = new WeakSet<THREE.Material>();
export const lam = (key: string, make: () => THREE.MeshLambertMaterialParameters) => {
  let m = mats.get(key) as THREE.MeshLambertMaterial | undefined;
  if (!m) {
    if (key === "chainHD") {
      // MAT pass: the chain material (world.ts) becomes slate blue-grey iron with a soft painted-metal highlight;
      // its Strands switch to link geometry, so links read in close-ups (bank f1780, overhead f1650)
      const c = twoTone(new THREE.MeshPhongMaterial({ color: "#7a8490", specular: "#6c727b", shininess: 30 }));
      CHAIN_MATS.add(c);
      m = c as unknown as THREE.MeshLambertMaterial;
    } else m = twoTone(new THREE.MeshLambertMaterial(make()));
    mats.set(key, m);
  }
  return m;
};
const lamOf = new Map<string, THREE.MeshLambertMaterial>();
// the nature kit ships a teal palette; our valley wants storybook greens and browns
const GREENS = ["#62ae4c", "#56a447", "#72b853"];
const RECOLOR: Record<string, string> = { grass: "#6aab4f", leafsDark: "#4a9142", woodBark: "#8a5a3c", woodInner: "#e8cfa4", wood: "#a8724a",
  woodDark: "#7a4f33", dirt: "#8a6a4a", stone: "#b7b4ad" };
/** Kenney GLB materials -> Lambert, so the whole world shares one lighting model */
const toLambert = (m: THREE.Material) => {
  let l = lamOf.get(m.uuid);
  if (!l) {
    const s = m as THREE.MeshStandardMaterial;
    const col = m.name === "leafsGreen" ? GREENS[lamOf.size % 3] : RECOLOR[m.name];
    l = twoTone(new THREE.MeshLambertMaterial({ color: col ? new THREE.Color(col) : s.color?.clone() ?? new THREE.Color("#ffffff"), map: s.map ?? null, side: s.side, alphaTest: s.alphaTest }));
    lamOf.set(m.uuid, l);
  }
  return l;
};

// ---------------- geometry pieces ----------------
const f32 = (a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => {
  const out = new Float32Array(a.count * a.itemSize);
  for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k);
  return new THREE.Float32BufferAttribute(out, a.itemSize);
};
/** quad a,b,c,d counter-clockwise seen from its front; uv (u0,v0) at a, (u1,v1) at c */
export const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, u1 = 1, v1 = 1, u0 = 0, v0 = 0) => {
  const g = new THREE.BufferGeometry();
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a)).normalize();
  g.setAttribute("position", new THREE.Float32BufferAttribute([a, b, c, a, c, d].flatMap((v) => [v.x, v.y, v.z]), 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 2, 3, 4, 5].flatMap(() => [n.x, n.y, n.z]), 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1], 2));
  return g;
};
export const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
  const g = new THREE.BufferGeometry();
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
  g.setAttribute("position", new THREE.Float32BufferAttribute([a, b, c].flatMap((v) => [v.x, v.y, v.z]), 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 2].flatMap(() => [n.x, n.y, n.z]), 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
  return g;
};
/** axis box from min to max, texture tiled every `tile` metres (0 = one image per face) */
export const boxGeo = (min: THREE.Vector3, max: THREE.Vector3, tile = 0, bottom = false) => {
  const [x0, y0, z0] = [min.x, min.y, min.z], [x1, y1, z1] = [max.x, max.y, max.z];
  const t = (a: number) => (tile ? a / tile : 1);
  const w = x1 - x0, h = y1 - y0, d = z1 - z0;
  const faces = [
    quad(V(x0, y0, z1), V(x1, y0, z1), V(x1, y1, z1), V(x0, y1, z1), t(w), t(h)),
    quad(V(x1, y0, z0), V(x0, y0, z0), V(x0, y1, z0), V(x1, y1, z0), t(w), t(h)),
    quad(V(x0, y0, z0), V(x0, y0, z1), V(x0, y1, z1), V(x0, y1, z0), t(d), t(h)),
    quad(V(x1, y0, z1), V(x1, y0, z0), V(x1, y1, z0), V(x1, y1, z1), t(d), t(h)),
    quad(V(x0, y1, z1), V(x1, y1, z1), V(x1, y1, z0), V(x0, y1, z0), t(w), t(d)),
  ];
  if (bottom) faces.push(quad(V(x0, y0, z0), V(x1, y0, z0), V(x1, y0, z1), V(x0, y0, z1), t(w), t(d)));
  return mergeGeometries(faces, false);
};

/** collects pieces by material and merges them into one static mesh per material */
export class Batch {
  private g = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(geo: THREE.BufferGeometry, mat: THREE.Material, m?: THREE.Matrix4) {
    const src = geo.index ? geo.toNonIndexed() : geo;
    const x = new THREE.BufferGeometry();
    x.setAttribute("position", f32(src.attributes.position));
    if (src.attributes.normal) x.setAttribute("normal", f32(src.attributes.normal)); else x.computeVertexNormals();
    x.setAttribute("uv", src.attributes.uv ? f32(src.attributes.uv) : new THREE.Float32BufferAttribute(new Float32Array(src.attributes.position.count * 2), 2));
    if (m) x.applyMatrix4(m);
    const l = this.g.get(mat);
    if (l) l.push(x); else this.g.set(mat, [x]);
  }
  addObject(o: THREE.Object3D, m: THREE.Matrix4) {
    o.updateMatrixWorld(true);
    o.traverse((c) => {
      const mesh = c as THREE.Mesh;
      if (!mesh.isMesh) return;
      this.add(mesh.geometry, toLambert(Array.isArray(mesh.material) ? mesh.material[0] : mesh.material), new THREE.Matrix4().multiplyMatrices(m, mesh.matrixWorld));
    });
  }
  build(parent: THREE.Object3D, cast = true) {
    for (const [mat, list] of this.g) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat);
      mesh.castShadow = cast; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false;
      parent.add(mesh);
    }
    this.g.clear();
  }
}

// ---------------- strands: box-section tube along a path, rebuilt in place ----------------
// chain-link template (MAT pass): a stadium-shaped ring tube in link space (x along the chain, y in the ring plane,
// z across), NS centre-line samples x NR tube sides, smooth normals (clean ink silhouettes, no facet creases)
const LNS = 16, LNR = 6;
type LinkT = { p: Float32Array; n: Float32Array; idx: number[]; pitch: number };
const linkTemplate = (h: number): LinkT => {
  const ow = h * 0.85, rb = ow * 0.14, ol = ow * 1.62, rc = ow / 2 - rb, hl = ol / 2 - rb - rc;
  const p = new Float32Array(LNS * LNR * 3), n = new Float32Array(LNS * LNR * 3), idx: number[] = [];
  for (let j = 0; j < LNS; j++) {
    const th = (2 * Math.PI * (j + 0.5)) / LNS, nx = Math.cos(th), ny = Math.sin(th);
    const cx = rc * nx + Math.sign(nx) * hl, cy = rc * ny;
    for (let k = 0; k < LNR; k++) {
      const ph = (2 * Math.PI * k) / LNR, cp = Math.cos(ph), sp = Math.sin(ph), o = (j * LNR + k) * 3;
      p[o] = cx + rb * cp * nx; p[o + 1] = cy + rb * cp * ny; p[o + 2] = rb * sp;
      n[o] = cp * nx; n[o + 1] = cp * ny; n[o + 2] = sp;
      const a = j * LNR + k, b = j * LNR + ((k + 1) % LNR), c = ((j + 1) % LNS) * LNR + ((k + 1) % LNR), d = ((j + 1) % LNS) * LNR + k;
      idx.push(a, d, c, a, c, b); // outward winding
    }
  }
  return { p, n, idx, pitch: ol - 4 * rb };
};

export class Strand {
  mesh: THREE.Mesh;
  private pos: Float32Array; private nor: Float32Array; private uv: Float32Array;
  private lt: LinkT | null = null; private maxLinks = 0;
  constructor(public n: number, public w: number, public h: number, mat: THREE.Material, public tile = 1, cast = true) {
    const g = new THREE.BufferGeometry();
    if (CHAIN_MATS.has(mat)) {
      // link mode: up to maxLinks interlocking links laid along the path every frame (draw range = links used)
      const lt = (this.lt = linkTemplate(h)), nv = LNS * LNR;
      this.maxLinks = 440;
      this.pos = new Float32Array(this.maxLinks * nv * 3); this.nor = new Float32Array(this.maxLinks * nv * 3); this.uv = new Float32Array(this.maxLinks * nv * 2);
      const idx = new Uint32Array(this.maxLinks * lt.idx.length);
      for (let l = 0; l < this.maxLinks; l++) for (let i = 0; i < lt.idx.length; i++) idx[l * lt.idx.length + i] = lt.idx[i] + l * nv;
      g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
      g.setAttribute("normal", new THREE.BufferAttribute(this.nor, 3));
      g.setAttribute("uv", new THREE.BufferAttribute(this.uv, 2));
      g.setIndex(new THREE.BufferAttribute(idx, 1));
      g.setDrawRange(0, 0);
    } else {
      this.pos = new Float32Array(n * 12); this.nor = new Float32Array(n * 12); this.uv = new Float32Array(n * 8);
      g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
      g.setAttribute("normal", new THREE.BufferAttribute(this.nor, 3));
      g.setAttribute("uv", new THREE.BufferAttribute(this.uv, 2));
      const idx: number[] = [];
      for (let i = 0; i < n - 1; i++) for (let k = 0; k < 4; k++) {
        const a = i * 4 + k, b = i * 4 + ((k + 1) % 4), c = (i + 1) * 4 + ((k + 1) % 4), d = (i + 1) * 4 + k;
        idx.push(a, b, c, a, c, d);
      }
      g.setIndex(idx);
    }
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.frustumCulled = false; this.mesh.castShadow = cast; this.mesh.receiveShadow = true;
  }
  private T = new THREE.Vector3(); private S = new THREE.Vector3(); private N = new THREE.Vector3();
  /** link mode: links every `pitch` along the polyline, centred, alternating ring plane (vertical / horizontal) */
  private setLinks(pts: THREE.Vector3[], lt: LinkT) {
    const { T, S, N } = this, nv = LNS * LNR;
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const total = cum[cum.length - 1], count = Math.max(0, Math.min(this.maxLinks, Math.floor(total / lt.pitch)));
    const s0 = (total - (count - 1) * lt.pitch) / 2;
    let seg = 1;
    for (let l = 0; l < count; l++) {
      const s = s0 + l * lt.pitch;
      while (seg < pts.length - 1 && cum[seg] < s) seg++;
      const a = pts[seg - 1], b = pts[seg], u = (s - cum[seg - 1]) / Math.max(1e-6, cum[seg] - cum[seg - 1]);
      const px = a.x + (b.x - a.x) * u, py = a.y + (b.y - a.y) * u, pz = a.z + (b.z - a.z) * u;
      T.subVectors(b, a).normalize();
      S.set(-T.z, 0, T.x); // T x up
      if (S.lengthSq() < 1e-6) S.set(1, 0, 0);
      S.normalize(); N.crossVectors(S, T).normalize();
      const odd = l % 2 === 1;
      // ring plane: (T, N) for even links, (T, S) for odd links; z (thickness) across it
      const yx = odd ? S.x : N.x, yy = odd ? S.y : N.y, yz = odd ? S.z : N.z;
      const zx = odd ? -N.x : S.x, zy = odd ? -N.y : S.y, zz = odd ? -N.z : S.z;
      const base = l * nv * 3;
      for (let v = 0; v < nv * 3; v += 3) {
        const x = lt.p[v], y = lt.p[v + 1], z = lt.p[v + 2], o = base + v;
        this.pos[o] = px + T.x * x + yx * y + zx * z;
        this.pos[o + 1] = py + T.y * x + yy * y + zy * z;
        this.pos[o + 2] = pz + T.z * x + yz * y + zz * z;
        const nx = lt.n[v], ny = lt.n[v + 1], nz = lt.n[v + 2];
        this.nor[o] = T.x * nx + yx * ny + zx * nz;
        this.nor[o + 1] = T.y * nx + yy * ny + zy * nz;
        this.nor[o + 2] = T.z * nx + yz * ny + zz * nz;
      }
    }
    const g = this.mesh.geometry;
    g.setDrawRange(0, count * lt.idx.length);
    g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true;
  }
  set(pts: THREE.Vector3[]) {
    if (this.lt) { this.setLinks(pts, this.lt); return; }
    const { T, S, N } = this;
    let len = 0;
    for (let i = 0; i < this.n; i++) {
      const p = pts[Math.min(i, pts.length - 1)];
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      T.subVectors(b, a).normalize();
      S.crossVectors(T, V(0, 1, 0));
      if (S.lengthSq() < 1e-6) S.set(1, 0, 0);
      S.normalize(); N.crossVectors(S, T).normalize();
      if (i) len += p.distanceTo(pts[Math.min(i - 1, pts.length - 1)]);
      for (let k = 0; k < 4; k++) {
        const sx = k === 0 || k === 3 ? -1 : 1, sy = k < 2 ? -1 : 1, j = (i * 4 + k) * 3;
        this.pos[j] = p.x + S.x * sx * this.w / 2 + N.x * sy * this.h / 2;
        this.pos[j + 1] = p.y + S.y * sx * this.w / 2 + N.y * sy * this.h / 2;
        this.pos[j + 2] = p.z + S.z * sx * this.w / 2 + N.z * sy * this.h / 2;
        const nx = S.x * sx + N.x * sy, ny = S.y * sx + N.y * sy, nz = S.z * sx + N.z * sy, nl = Math.hypot(nx, ny, nz);
        this.nor[j] = nx / nl; this.nor[j + 1] = ny / nl; this.nor[j + 2] = nz / nl;
        this.uv[(i * 4 + k) * 2] = k / 4; this.uv[(i * 4 + k) * 2 + 1] = len / this.tile;
      }
    }
    const g = this.mesh.geometry;
    g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true; g.attributes.uv.needsUpdate = true;
  }
}

// ---------------- set dressing around the lens ----------------
/** a sight line of the film: from the lens toward the shot's subject, `len` along d (d has unit forward component) */
export type Ray = { o: THREE.Vector3; d: THREE.Vector3; len: number; core: boolean };
let sight: Ray[] = [];
/** does any sight line pass through this box? (centre lines only for small props, so they can still frame a shot) */
const inTheWay = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, coreOnly = false) => {
  for (const { o, d, len, core } of sight) {
    if (coreOnly && !core) continue;
    let t0 = 0, t1 = len;
    for (const [oo, dd, a, b] of [[o.x, d.x, x0, x1], [o.y, d.y, y0, y1], [o.z, d.z, z0, z1]]) {
      if (Math.abs(dd) < 1e-9) { if (oo < a || oo > b) t0 = Infinity; continue; }
      const ta = (a - oo) / dd, tb = (b - oo) / dd;
      t0 = Math.max(t0, Math.min(ta, tb)); t1 = Math.min(t1, Math.max(ta, tb));
    }
    if (t0 <= t1) return true;
  }
  return false;
};

// ---------------- cartoon vegetation (MAT pass) ----------------
// Kenney's faceted low-poly trees and box hedges -> rounded storybook shapes: clustered smooth spheres for canopies
// (the two-tone sun term gives each lobe a lit cap and a cool belly), tapered trunks, rounded-box hedges. Smooth
// normals mean the world ink draws clean silhouettes and lobe-to-lobe folds instead of a crease on every facet.
type VegKind = "round" | "fat" | "tall" | "cone" | "bush" | "hedge";
const VEG: Record<string, VegKind> = {
  tree_oak: "round", tree_default: "round", tree_detailed: "round", tree_fat: "fat", "tree-high-round": "tall", tree: "tall",
  tree_cone: "cone", plant_bushLarge: "bush", plant_bushDetailed: "bush", plant_bush: "bush", hedge: "hedge",
};
const LEAF = ["#5aa83c", "#4c9a37", "#69b545", "#55a243", "#3f8f3c"];
/** canopy paint (equal px per metre on a unit sphere: 256 around x 128 pole to pole): light crown, darker belly,
 *  soft leaf-clump dabs (kept low contrast: the two-tone sun term does the main modelling) */
const leafTex = (i: number) => ctex("leafHD" + i, 256, 128, (g, r) => {
  const base = new THREE.Color(LEAF[i]), top = base.clone().offsetHSL(0.012, 0.03, 0.08), bot = base.clone().offsetHSL(-0.015, 0.0, -0.08);
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, "#" + top.getHexString()); gr.addColorStop(0.42, "#" + base.getHexString()); gr.addColorStop(1, "#" + bot.getHexString());
  g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  for (let k = 0; k < 46; k++) {
    const x = r() * 256, y = 10 + r() * 108, rad = 5 + r() * 9, light = y < 64 ? r() < 0.7 : r() < 0.25;
    for (const ox of [-256, 0, 256]) {
      g.strokeStyle = light ? "rgba(225,255,170,0.22)" : "rgba(20,70,30,0.2)"; g.lineWidth = 2.5; g.lineCap = "round";
      g.beginPath(); g.arc(x + ox, y + rad * 0.6, rad, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    }
  }
});
/** foliage: two-tone with a soft terminator and no hard self-shadowing (shade.ts SOFT_TERM) */
const lamSoft = (key: string, make: () => THREE.MeshLambertMaterialParameters) => {
  let m = mats.get(key) as THREE.MeshLambertMaterial | undefined;
  if (!m) { m = twoTone(new THREE.MeshLambertMaterial(make()), 1, true); mats.set(key, m); }
  return m;
};
const leafMat = (i: number) => lamSoft("leafHD" + i, () => ({ map: leafTex(i) }));
const barkMat = () => lam("barkHD", () => ({ color: "#8f5d3b" }));
const vegGeo = new Map<string, THREE.BufferGeometry>();
const lobeGeo = (q: number) => {
  const k = "lobe" + q;
  let g = vegGeo.get(k);
  if (!g) { g = new THREE.SphereGeometry(1, [20, 14, 10][q], [14, 10, 7][q]); vegGeo.set(k, g); }
  return g;
};
const trunkGeo = () => {
  let g = vegGeo.get("trunk");
  if (!g) { g = new THREE.CylinderGeometry(0.6, 1, 1, 10, 1, true).translate(0, 0.5, 0); vegGeo.set("trunk", g); }
  return g;
};
/** rounded box (exact: inner box + radius), unit size along x, smooth normals; used for hedges */
const hedgeGeo = () => {
  let g = vegGeo.get("hedge");
  if (!g) {
    g = new THREE.BoxGeometry(1, 1, 1, 18, 10, 10);
    const p = g.attributes.position as THREE.BufferAttribute, n = g.attributes.normal as THREE.BufferAttribute;
    // per-axis rounding radii in unit space (~0.35 m at the ends, ~0.45 m on top / sides at 3.3 x 1.56 x 1.17 m);
    // flat bottom (it sits on the lawn)
    const R = [0.106, 0.29, 0.385], v = new THREE.Vector3(), e = new THREE.Vector3(), q = [0, 0, 0];
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      for (let a = 0; a < 3; a++) {
        const c = v.getComponent(a), lim = a === 1 && c < 0 ? 0.5 : 0.5 - R[a];
        q[a] = THREE.MathUtils.clamp(c, -lim, lim); e.setComponent(a, (c - q[a]) / R[a]);
      }
      const L = e.length();
      if (L < 1e-6) continue;
      e.divideScalar(L);
      p.setXYZ(i, q[0] + e.x * R[0], q[1] + e.y * R[1], q[2] + e.z * R[2]);
      const nn = new THREE.Vector3(e.x / R[0], e.y / R[1], e.z / R[2]).normalize();
      n.setXYZ(i, nn.x, nn.y, nn.z);
    }
    g.translate(0, 0.5, 0);
    vegGeo.set("hedge", g);
  }
  return g;
};
const yawQ = (a: number) => new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), a);
/** half-width of a cartoon plant of kind k and height h (for the sight-line test) */
const vegRad = (k: VegKind, h: number) => (k === "hedge" ? 1.7 : k === "bush" ? 0.85 * h : k === "tall" ? 0.2 * h : k === "cone" ? 0.27 * h : k === "fat" ? 0.44 * h : 0.39 * h);
/** add one cartoon plant to a batch: base at (x, y, z), height h, q = lobe detail (0 near .. 2 far) */
const addVeg = (b: Batch, k: VegKind, x: number, y: number, z: number, h: number, seed: number, q = 0, hy = 0) => {
  const r = rng(Math.abs(Math.floor(seed)) % 200000 + 7), U = (a: number, c: number) => a + (c - a) * r();
  const leaf = leafMat(k === "cone" ? 4 : k === "hedge" ? 1 : Math.floor(r() * 4)), lobe = lobeGeo(q), yaw = r() * 6.28;
  const put = (px: number, py: number, pz: number, rad: number, sy = 0.9) =>
    b.add(lobe, leaf, new THREE.Matrix4().compose(V(x + px, y + py, z + pz), yawQ(r() * 6.28), V(rad, rad * sy, rad)));
  const trunk = (th: number, tr: number) =>
    b.add(trunkGeo(), barkMat(), new THREE.Matrix4().compose(V(x, y - 0.15, z), yawQ(yaw), V(tr, th + 0.15, tr)));
  const ring = (n: number, dist: number, r0: number, r1: number, cy: number, dy: number) => {
    const a0 = r() * 6.28;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i * 6.28) / n + U(-0.35, 0.35), dd = dist * U(0.85, 1.12);
      put(Math.cos(a) * dd, cy + U(-dy, dy), Math.sin(a) * dd, U(r0, r1));
    }
  };
  if (k === "round" || k === "fat") {
    const f = k === "fat";
    trunk((f ? 0.4 : 0.48) * h, 0.055 * h);
    const cy = (f ? 0.58 : 0.64) * h;
    put(0, cy, 0, (f ? 0.29 : 0.26) * h);
    ring(f ? 5 : 4, (f ? 0.22 : 0.18) * h, (f ? 0.19 : 0.17) * h, (f ? 0.23 : 0.21) * h, cy - 0.05 * h, 0.04 * h);
    put(U(-0.05, 0.05) * h, cy + (f ? 0.15 : 0.17) * h, U(-0.05, 0.05) * h, (f ? 0.19 : 0.17) * h);
  } else if (k === "tall") {
    trunk(0.34 * h, 0.045 * h);
    put(0, 0.47 * h, 0, 0.17 * h, 1.3);
    put(U(-0.03, 0.03) * h, 0.65 * h, U(-0.03, 0.03) * h, 0.15 * h, 1.3);
    put(0, 0.82 * h, 0, 0.11 * h, 1.25);
    ring(3, 0.1 * h, 0.1 * h, 0.12 * h, 0.55 * h, 0.06 * h);
  } else if (k === "cone") {
    trunk(0.2 * h, 0.05 * h);
    put(0, 0.3 * h, 0, 0.26 * h, 0.62);
    put(0, 0.5 * h, 0, 0.2 * h, 0.66);
    put(0, 0.68 * h, 0, 0.14 * h, 0.75);
    put(0, 0.84 * h, 0, 0.08 * h, 1.0);
  } else if (k === "bush") {
    put(0, 0.46 * h, 0, 0.5 * h);
    ring(3, 0.42 * h, 0.32 * h, 0.38 * h, 0.32 * h, 0.04 * h);
  } else { // hedge segment, 3.3 m along local x
    b.add(hedgeGeo(), leaf, new THREE.Matrix4().compose(V(x, y - 0.06, z), yawQ(hy), V(3.4, h + 0.06, Math.max(0.9, h * 0.78))));
  }
};

// ---------------- painted cloth banner (MAT round 3) ----------------
// The Kenney banner is one flat face of the saturated colour atlas: in golden light it kept a uniform, hot red and
// read as pasted on. Ours is a hanging cloth with real folds (smooth normals, so the two-tone light rolls across
// them), a swallow-tail hem, a muted crimson (sat ~-25 %) with an ochre border and a diamond like the tower flags.
const BANNER_COL: Record<string, string> = { "banner-red": "#b8553a", "banner-green": "#4f8a5a" }; // warm red: no purple in shade
const FOLD = 0.27, CLOTH_W = 1.1, CLOTH_H = 2.6; // fold period across the cloth, cloth size (m)
const bannerTex = (col: string) => ctex("bannerHD" + col, 256, 700, (g) => {
  const W = 256, H = 700, base = new THREE.Color(col);
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, "#" + base.clone().offsetHSL(0, 0, 0.04).getHexString()); gr.addColorStop(1, "#" + base.clone().offsetHSL(0, 0, -0.06).getHexString());
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x++) { // painted fold shading, in phase with the geometry folds
    const s = Math.sin((x / W) * (CLOTH_W / FOLD) * Math.PI * 2);
    g.fillStyle = s > 0 ? `rgba(255,235,215,${0.1 * s})` : `rgba(60,15,15,${-0.12 * s})`; g.fillRect(x, 0, 1, H);
  }
  g.fillStyle = "#" + base.clone().offsetHSL(0, -0.05, -0.12).getHexString(); g.fillRect(0, 0, W, 54); // top hem
  g.strokeStyle = "#d1aa5c"; g.lineWidth = 9; g.strokeRect(20, 66, W - 40, H - 86);                 // ochre border
  g.strokeStyle = "rgba(60,30,20,0.45)"; g.lineWidth = 2; g.strokeRect(14, 60, W - 28, H - 74); g.strokeRect(26, 72, W - 52, H - 98);
  g.fillStyle = "#d1aa5c"; g.fillRect(0, 46, W, 8);
  const cx = W / 2, cy = 250; // emblem: diamond (the tower flags' motif) on a light disc
  g.fillStyle = "#efe2c2"; g.beginPath(); g.arc(cx, cy, 62, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "rgba(60,30,20,0.55)"; g.lineWidth = 3; g.stroke();
  g.fillStyle = "#d1aa5c"; g.beginPath(); g.moveTo(cx, cy - 46); g.lineTo(cx + 34, cy); g.lineTo(cx, cy + 46); g.lineTo(cx - 34, cy); g.closePath(); g.fill();
  g.strokeStyle = "rgba(60,30,20,0.6)"; g.lineWidth = 2.5; g.stroke();
});
const bannerGeo = () => {
  let geo = vegGeo.get("banner");
  if (!geo) {
    const w = CLOTH_W, hh = CLOTH_H, notch = 0.42;
    geo = new THREE.PlaneGeometry(w, hh, 16, 20).translate(0, -hh / 2, 0); // top edge at y = 0
    const p = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), t = -y / hh; // 0 top .. 1 bottom
      p.setY(i, y + notch * (1 - Math.abs(x) / (w / 2)) * t * t);                              // swallow-tail hem
      p.setZ(i, (0.025 + 0.055 * t) * Math.sin((x / FOLD) * Math.PI * 2 + 0.6) + 0.04 * t * t); // folds deepen downwards
    }
    geo.computeVertexNormals();
    vegGeo.set("banner", geo);
  }
  return geo;
};
/** gonfalon on a pole where the Kenney banner plate stood: its plate hung 0.4 x scale beside the placement point,
 *  facing local +-x, so the pole goes there (same framing) and the cloth faces that way */
const bannerProp = (b: Batch, name: string, x0: number, y: number, z0: number, h: number, yaw0: number) => {
  const off = 0.4 * (h / 0.84), x = x0 + Math.cos(yaw0) * off, z = z0 - Math.sin(yaw0) * off, yaw = yaw0 + Math.PI / 2;
  if (inTheWay(x - 0.7, x + 0.7, y, y + h, z - 0.7, z + 0.7, true)) return;
  const col = BANNER_COL[name] ?? "#b4524b";
  const M = (px: number, py: number, pz: number) => new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z).multiply(new THREE.Matrix4().makeTranslation(px, py, pz));
  const pole = lam("bannerPole", () => ({ color: "#6e4b33" })), gold = lam("bannerGold", () => ({ color: "#c9a24e" }));
  b.add(new THREE.CylinderGeometry(0.045, 0.06, h, 10).translate(0, h / 2, 0), pole, M(0, 0, 0));
  b.add(new THREE.SphereGeometry(0.1, 14, 10), gold, M(0, h + 0.06, 0));
  b.add(new THREE.CylinderGeometry(0.03, 0.03, CLOTH_W + 0.2, 8).rotateZ(Math.PI / 2), pole, M(0, h - 0.18, 0.06));
  for (const s of [-1, 1]) b.add(new THREE.SphereGeometry(0.045, 10, 8), gold, M(s * (CLOTH_W / 2 + 0.12), h - 0.18, 0.06));
  b.add(bannerGeo(), lam("bannerHD" + col, () => ({ map: bannerTex(col), side: THREE.DoubleSide })), M(0, h - 0.2, 0.1));
};

// ---------------- Kenney props ----------------
const boxes = new Map<THREE.Object3D, THREE.Box3>();
/** place a Kenney model with its base on y, scaled to height h (left out when it would stand in front of the lens).
 *  Trees, bushes and hedges are drawn as cartoon vegetation, banners as painted cloth instead (MAT pass). */
export const prop = (b: Batch, kit: Kit, name: string, x: number, y: number, z: number, h: number, yaw = 0) => {
  if (name.startsWith("banner")) { bannerProp(b, name, x, y, z, h, yaw); return; }
  const vk = VEG[name];
  if (vk) {
    const rad = vegRad(vk, h);
    if (inTheWay(x - rad, x + rad, y, y + h, z - rad, z + rad, true)) return;
    const d = Math.hypot(x, z);
    addVeg(b, vk, x, y, z, h, x * 92.7 + z * 31.3 + yaw * 1000, d > 200 ? 2 : Math.abs(z) > 45 && d > 60 ? 1 : 0);
    return;
  }
  const o = kit[name];
  if (!o) return;
  let box = boxes.get(o);
  if (!box) { box = new THREE.Box3().setFromObject(o); boxes.set(o, box); }
  const s = h / Math.max(0.01, box.max.y - box.min.y), r = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * s * 0.5;
  if (inTheWay(x - r, x + r, y, y + h, z - r, z + r, true)) return;
  b.addObject(o, new THREE.Matrix4().compose(V(x, y - box.min.y * s, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw), V(s, s, s)));
};

/** a Kenney model as its own object (two-tone materials), base at y = 0, scaled to height h (no sight-line test:
 *  used for the CAM agent's FOREGROUND framing objects, which are meant to stand in front of the lens) */
export const kitClone = (kit: Kit, name: string, h: number): THREE.Object3D | null => {
  const vk = VEG[name];
  if (vk) { // cartoon plant as its own object (MAT pass), base at y = 0
    const vb = new Batch(), grp = new THREE.Group();
    addVeg(vb, vk, 0, 0, 0, h, name.length * 977 + h * 131, 0);
    vb.build(grp, false);
    grp.traverse((x) => { const m = x as THREE.Mesh; if (m.isMesh) { m.castShadow = false; m.receiveShadow = true; m.matrixAutoUpdate = true; } });
    return grp;
  }
  const o = kit[name];
  if (!o) return null;
  let box = boxes.get(o);
  if (!box) { box = new THREE.Box3().setFromObject(o); boxes.set(o, box); }
  const c = o.clone(true), s = h / Math.max(0.01, box.max.y - box.min.y);
  c.traverse((x) => {
    const m = x as THREE.Mesh;
    if (m.isMesh) { m.material = toLambert(Array.isArray(m.material) ? m.material[0] : m.material); m.castShadow = false; m.receiveShadow = true; }
  });
  const g = new THREE.Group();
  c.position.y = -box.min.y * s; c.scale.setScalar(s);
  g.add(c);
  return g;
};

// ---------------- houses ----------------
type Style = { wall: string; shutter: string; roof: string; timber?: boolean; brick?: boolean };
// MAT pass: warm ochre / cream / sandstone / salmon walls + one blue-grey (the old pinks, whites and grey-blues read
// lavender: the two-tone shade multiplies by a blue-violet, so a near-neutral albedo turns lilac on every shaded face)
// round 3: saturation -35 % on every wall (neutral warm grey / beige; the salmon became a warm greige)
// round 4: the pale greiges still read lavender-grey in shade -> a muted brick / cream / ochre / terracotta spread
const STYLES: Style[] = [
  { wall: "#ecdab2", shutter: "#3f6fb5", roof: "#d27a62" },              // cream
  { wall: "#d8a95f", shutter: "#2f6a43", roof: "#b8644f" },              // ochre
  { wall: "#c47a5c", shutter: "#2f5f6a", roof: "#8f97a8" },              // muted brick-red plaster
  { wall: "#efdcb8", shutter: "#2f5f6a", roof: "#c9775a", timber: true }, // cream timber frame
  { wall: "#ddbd78", shutter: "#5a3b2a", roof: "#d27a62" },              // straw ochre
  { wall: "#cc9a6c", shutter: "#3f6fb5", roof: "#8e7aa0" },              // terracotta sand
  { wall: "#e2c49a", shutter: "#8c3b4a", roof: "#c9775a" },              // warm sandstone
  { wall: "#e3d2b8", shutter: "#2f6a43", roof: "#8f97a8", brick: true },
];
const roofMat = (col: string) => macroize(lam("roof" + col, () => ({ map: roofHD(col, col === "#8f97a8"), side: THREE.DoubleSide })), 6, "r");

/** house options: lit = fraction of windows glowing warm at night (emissive > 1.3, blooms); closed = shutters shut;
 *  doorAt = door centre (m from the front's left edge); front = a custom front material; keep = never culled */
export type HouseOpts = { /** a real arched door opening (1.1 x 2.1 m) with a dark vestibule behind it */ doorHole?: boolean;
  lit?: number; closed?: boolean; doorAt?: number; front?: THREE.Material; keep?: boolean; /** shop sign + awning over the door (emblem k) */ shop?: number; /** flower boxes (default on) */ flowers?: boolean };
const LIT_WIN = new THREE.Color(1.9, 1.35, 0.8);
const facadeMat = (key: string, wm: number, hm: number, st: Style, o: HouseOpts, door: boolean) => {
  const fo = { ...st, door, doorAt: o.doorAt, closed: o.closed };
  const tag = `${key}${o.closed ? "c" : ""}${o.doorAt ?? ""}`, lit = o.lit ? Math.round(o.lit * 100) : 0;
  const fm = lam(tag + (lit ? "L" + lit : ""), () => ({ map: facadeHD(tag, wm, hm, fo),
    ...(lit ? { emissive: LIT_WIN, emissiveMap: facadeLitHD(tag + "L" + lit, wm, hm, fo, o.lit!, wm * 7 + hm) } : {}) }));
  return macroize(fm, 32 / Math.max(wm, hm), "f", 1.2, [(wm * 0.137 + hm * 0.29) % 1, (tag.length * 0.071) % 1]);
};
/** gabled house: front facade (local +z) at width w, depth d, wall height h, ridge along local x (left out if it blocks a shot) */
export const house = (b: Batch, x: number, z: number, yaw: number, w: number, d: number, h: number, si: number, y = D0, opt: HouseOpts = {}) => {
  const across = Math.abs(Math.sin(yaw)) > 0.5, hx = (across ? d : w) / 2 + 0.6, hz = (across ? w : d) / 2 + 0.6;
  if (!opt.keep && inTheWay(x - hx, x + hx, y, y + h + d * 0.42 + 1.2, z - hz, z + hz)) return;
  const st = STYLES[si % STYLES.length];
  const m = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z);
  const front = opt.front ?? facadeMat(`hf${si}_${w}_${h}`, w, h, st, opt, true);
  const side = facadeMat(`hs${si}_${h}`, 8, h, st, { closed: opt.closed, lit: opt.lit ? opt.lit * 0.6 : 0 }, false);
  const wall = lam("wall" + st.wall, () => ({ color: st.brick ? "#c8643f" : st.wall }));
  const hw = w / 2, hd = d / 2, rh = d * 0.42, o = 0.35;
  if (opt.doorHole && opt.doorAt !== undefined) { // front with a real arched doorway (the painted door sits exactly in it)
    const dc = -hw + opt.doorAt, sh = new THREE.Shape(); sh.moveTo(-hw, 0); sh.lineTo(hw, 0); sh.lineTo(hw, h); sh.lineTo(-hw, h); sh.closePath();
    sh.holes.push(archPath(new THREE.Path(), dc, 0.55, 0, 1.55));
    const g = new THREE.ShapeGeometry(sh, 16), uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + hw) / w, uv.getY(i) / h);
    b.add(g.translate(0, 0, hd), front, m);
    const ap = archPts(0.55, 0, 1.55), C = PM.cope(), zi = hd - 0.3;
    for (let i = 0; i + 1 < ap.length; i++) { // reveal through the wall thickness
      const [px, py] = ap[i], [qx, qy] = ap[i + 1], mx = (px + qx) / 2, my = (py + qy) / 2;
      const want = my > 1.56 ? V(-mx, 1.55 - my, 0) : V(-Math.sign(mx), 0, 0);
      b.add(qf(V(dc + px, py, hd), V(dc + px, py, zi), V(dc + qx, qy, zi), V(dc + qx, qy, hd), want, 1, 1), C, m);
    }
    const vb = basic("vestibule", new THREE.Color(1, 1, 1), { map: vestibuleTex() }), z2 = hd - 1.7;
    b.add(qf(V(dc - 0.8, 0, z2), V(dc + 0.8, 0, z2), V(dc + 0.8, 2.4, z2), V(dc - 0.8, 2.4, z2), V(0, 0, 1)), vb, m);
    for (const s2 of [-1, 1]) b.add(qf(V(dc + s2 * 0.8, 0, zi), V(dc + s2 * 0.8, 0, z2), V(dc + s2 * 0.8, 2.4, z2), V(dc + s2 * 0.8, 2.4, zi), V(-s2, 0, 0)), vb, m);
    b.add(qf(V(dc - 0.8, 2.4, zi), V(dc + 0.8, 2.4, zi), V(dc + 0.8, 2.4, z2), V(dc - 0.8, 2.4, z2), V(0, -1, 0)), PM.dark(), m);
    b.add(qf(V(dc - 0.8, 0.01, zi), V(dc + 0.8, 0.01, zi), V(dc + 0.8, 0.01, z2), V(dc - 0.8, 0.01, z2), V(0, 1, 0), 1, 1), PM.oak(), m);
    b.add(qf(V(dc - 0.55, 0, zi), V(dc + 0.55, 0, zi), V(dc + 0.55, 0, hd), V(dc - 0.55, 0, hd), V(0, 1, 0)), PM.dark(), m); // (closed off at y 0)
    b.add(boxGeo(V(dc - 0.55, 0, zi), V(dc + 0.55, 0.2, hd)), C, m); // threshold stone (the leaf hangs above it)
  } else b.add(quad(V(-hw, 0, hd), V(hw, 0, hd), V(hw, h, hd), V(-hw, h, hd)), front, m);
  b.add(quad(V(hw, 0, -hd), V(-hw, 0, -hd), V(-hw, h, -hd), V(hw, h, -hd)), side, m);
  b.add(quad(V(-hw, 0, -hd), V(-hw, 0, hd), V(-hw, h, hd), V(-hw, h, -hd)), side, m);
  b.add(quad(V(hw, 0, hd), V(hw, 0, -hd), V(hw, h, -hd), V(hw, h, hd)), side, m);
  b.add(tri(V(-hw, h, -hd), V(-hw, h, hd), V(-hw, h + rh, 0)), wall, m);
  b.add(tri(V(hw, h, hd), V(hw, h, -hd), V(hw, h + rh, 0)), wall, m);
  const ru = (w + 2 * o) / 4, rv = Math.hypot(hd + o, rh) / 4, rm = roofMat(st.roof);
  b.add(quad(V(-hw - o, h - 0.25, hd + o), V(hw + o, h - 0.25, hd + o), V(hw + o, h + rh, 0), V(-hw - o, h + rh, 0), ru, rv), rm, m);
  b.add(quad(V(hw + o, h - 0.25, -hd - o), V(-hw - o, h - 0.25, -hd - o), V(-hw - o, h + rh, 0), V(hw + o, h + rh, 0), ru, rv), rm, m);
  const cx = hw * 0.45 * (si % 2 ? 1 : -1);
  b.add(boxGeo(V(cx - 0.4, h + rh * 0.3, -hd * 0.35 - 0.4), V(cx + 0.4, h + rh + 1.1, -hd * 0.35 + 0.4), 2), lam("chim", () => ({ map: rep(brick(), 1, 1) })), m);
  houseDetail(b, m, w, d, h, rh, cx, opt.front ? null : opt.doorAt, opt);
  // contact darkening along the four wall feet
  const P = (lx: number, lz: number) => { const v = V(lx, 0, lz).applyMatrix4(m); return [v.x, v.z] as [number, number]; };
  const Nn = (lx: number, lz: number) => { const v = V(lx, 0, lz).transformDirection(m); return [v.x, v.z] as [number, number]; };
  aoWall(P(-hw - 0.07, hd + 0.07), P(hw + 0.07, hd + 0.07), Nn(0, 1)); aoWall(P(hw + 0.07, -hd - 0.07), P(-hw - 0.07, -hd - 0.07), Nn(0, -1));
  aoWall(P(-hw - 0.07, -hd - 0.07), P(-hw - 0.07, hd + 0.07), Nn(-1, 0)); aoWall(P(hw + 0.07, hd + 0.07), P(hw + 0.07, -hd - 0.07), Nn(1, 0));
};

// ---------------- contact shadows (studio pass): wall-foot strips and prop blobs, on the no-ink decal layer ----------------
let aoB: Batch | null = null;
const AOM = {
  edge: () => { const m = basic("aoEdgeM", "#000000", { map: aoEdgeTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }); m.name = "ao"; return m; },
  blob: () => { const m = basic("aoBlobM", "#000000", { map: aoBlobTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }); m.name = "ao"; return m; },
};
/** soft contact blob under a prop at (x, z), radii rx (along yaw) x rz */
const ao = (x: number, z: number, rx: number, rz = rx, yaw = 0) => {
  if (aoB) aoB.add(new THREE.PlaneGeometry(2.6 * rx, 2.6 * rz).rotateX(-Math.PI / 2).rotateY(yaw).translate(x, D0 + 0.024, z), AOM.blob());
};
/** the same from a prop's placement matrix (its position + yaw) */
const aoM = (m: THREE.Matrix4, rx: number, rz = rx) => ao(m.elements[12], m.elements[14], rx, rz, Math.atan2(-m.elements[2], m.elements[0]));
/** darkening strip along a wall foot from a to c (world xz), spreading w metres along the outward normal n */
const aoWall = (a: [number, number], c: [number, number], n: [number, number], w = 0.9) => {
  if (!aoB) return;
  const y = D0 + 0.023, L = Math.hypot(c[0] - a[0], c[1] - a[1]);
  aoB.add(qf(V(a[0], y, a[1]), V(c[0], y, c[1]), V(c[0] + n[0] * w, y, c[1] + n[1] * w), V(a[0] + n[0] * w, y, a[1] + n[1] * w), V(0, 1, 0), L / 2, 1), AOM.edge());
};

// round 4: real 3D relief on every house (was a flat window-textured box): stone plinth, cornice under the eaves,
// window sills + lintel hoods matching facadeHD's window layout, front door step + door hood, chimney cap and pot
const UB = new THREE.BoxGeometry(1, 1, 1);
const FLOWER_M = {
  red: () => lam("flRed", () => ({ color: "#d8443a" })), pink: () => lam("flPink", () => ({ color: "#e88aa8" })),
  white: () => lam("flWhite", () => ({ color: "#f4efe2" })), leaf: () => lam("flLeaf", () => ({ color: "#4f8a36" })),
};
const trimM = () => lam("trimStone", () => ({ color: "#efe3c8" }));
const capM = () => lam("chimCap", () => ({ color: "#9a8778" }));
const plinthM = () => lam("plinthHD", () => ({ map: stoneHD("copeHD") }));
const ub = (b: Batch, mat: THREE.Material, m: THREE.Matrix4, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
  b.add(UB, mat, m.clone().multiply(new THREE.Matrix4().compose(V((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), new THREE.Quaternion(), V(x1 - x0, y1 - y0, z1 - z0))));
/** every front / side window of the Varennes town houses (filled by buildWorld; read it after the World is built):
 *  pos = window centre on the facade (world), normal = outward unit (y 0). For the char owner's nightcap heads. */
export const VARENNES_WINDOWS: { pos: V3; normal: V3 }[] = [];
let recordWins = false;
/** chimney tops (world) of every house built, per buildWorld call (world.ts puts smoke on a few) */
let chimneys: V3[] = [];
const houseDetail = (b: Batch, m: THREE.Matrix4, w: number, d: number, h: number, rh: number, chx: number, doorAt?: number | null, opt: HouseOpts = {}) => {
  const hr = rng(Math.abs(Math.round(m.elements[12] * 13.7 + m.elements[14] * 7.3)) % 100000 + 11);
  const hw = w / 2, hd = d / 2, tm = trimM(), floors = Math.max(1, Math.floor(h / 2.8));
  if (opt.doorHole && doorAt !== undefined && doorAt !== null) { // plinth with a gap at the real doorway
    const dc = -hw + doorAt;
    b.add(boxGeo(V(-hw - 0.07, -0.05, -hd - 0.07), V(hw + 0.07, 0.45, hd - 0.25), 2), plinthM(), m);
    for (const [a0, a1] of [[-hw - 0.07, dc - 0.55], [dc + 0.55, hw + 0.07]] as const) b.add(boxGeo(V(a0, -0.05, hd - 0.25), V(a1, 0.45, hd + 0.07), 2), plinthM(), m);
  } else b.add(boxGeo(V(-hw - 0.07, -0.05, -hd - 0.07), V(hw + 0.07, 0.45, hd + 0.07), 2), plinthM(), m);          // plinth
  ub(b, tm, m, -hw - 0.12, hw + 0.12, h - 0.52, h - 0.25, hd, hd + 0.17);                                   // cornice front
  ub(b, tm, m, -hw - 0.12, hw + 0.12, h - 0.52, h - 0.25, -hd - 0.17, -hd);                                 // cornice back
  for (const s of [-1, 1]) ub(b, tm, m, s < 0 ? -hw - 0.17 : hw, s < 0 ? -hw : hw + 0.17, h - 0.52, h - 0.25, -hd - 0.12, hd + 0.12);
  // windows: facadeHD puts nWin = floor(width / 2.2) per floor at (i + 0.5) / nWin, sill line fl * 2.8 + 0.9 m
  void floors;
  const wins = (len: number, door: boolean, at: (u: number) => [number, number], out: [number, number]) => {
    if (door && doorAt === null) return; // custom front (stable): no painted window layout to dress
    for (const fw of facadeWins(len, h, { door, doorAt: doorAt ?? undefined })) {
      const [px, pz] = at(fw.cx / len), yb = fw.by;
      if (fw.door) {
        const along = (k: number) => [px + out[1] * k, pz - out[0] * k] as const; // along the wall (perpendicular to out)
        const [ax, az] = along(-0.82), [bx, bz] = along(0.82), [cx2, cz2] = along(-0.78), [dx2, dz2] = along(0.78);
        ub(b, plinthM(), m, Math.min(ax, bx, ax + out[0] * 0.5), Math.max(ax, bx, ax + out[0] * 0.5), 0, 0.2, Math.min(az, bz, az + out[1] * 0.5), Math.max(az, bz, az + out[1] * 0.5)); // step
        ub(b, tm, m, Math.min(cx2, dx2, cx2 + out[0] * 0.34), Math.max(cx2, dx2, cx2 + out[0] * 0.34), 2.3, 2.44, Math.min(cz2, dz2, cz2 + out[1] * 0.34), Math.max(cz2, dz2, cz2 + out[1] * 0.34)); // hood
        if (opt.shop !== undefined && out[1] === 1) { // blank shop sign above the door + a striped awning
          b.add(quad(V(px - 1.1, 2.55, pz + 0.04), V(px + 1.1, 2.55, pz + 0.04), V(px + 1.1, 3.25, pz + 0.04), V(px - 1.1, 3.25, pz + 0.04)), (() => { const k = (opt.shop! + Math.floor(hr() * 4)) % 4; return basic("shopSignP" + k, new THREE.Color(0.85, 0.82, 0.8), { map: shopSignTex(k) }); })(), m);
          b.add(qf(V(px - 1.3, 2.48, pz + 1.0), V(px + 1.3, 2.48, pz + 1.0), V(px + 1.3, 2.5, pz + 0.05), V(px - 1.3, 2.5, pz + 0.05), V(0, 1, 1)), lam("awn" + (opt.shop % 3), () => ({ map: awningTex(["#b8453a", "#3f6a8a", "#4f7a3a"][opt.shop! % 3]), side: THREE.DoubleSide, alphaTest: 0.4 })), m);
        }
        continue;
      }
      if (recordWins) {
        const pw = V(px + out[0] * 0.03, yb + 0.62, pz + out[1] * 0.03).applyMatrix4(m), nw = V(out[0], 0, out[1]).transformDirection(m);
        VARENNES_WINDOWS.push({ pos: [pw.x, pw.y, pw.z], normal: [nw.x, 0, nw.z] });
      }
      if (door && yb > 2 && opt.flowers !== false && hr() < 0.32) { // flower box under an upper window
        const ax = px - out[1] * 0.55, az = pz + out[0] * 0.55, bx = px + out[1] * 0.55, bz = pz - out[0] * 0.55;
        ub(b, PM.wood(), m, Math.min(ax, bx), Math.max(ax, bx) + 0.001, yb - 0.42, yb - 0.2, Math.min(az, bz, az + out[1] * 0.3), Math.max(az, bz, az + out[1] * 0.3));
        const fc = [FLOWER_M.red(), FLOWER_M.pink(), FLOWER_M.white()][Math.floor(hr() * 3)];
        for (let k = 0; k < 6; k++) {
          const u = -0.45 + k * 0.18, fx = px + out[1] * u + out[0] * 0.15, fz = pz - out[0] * u + out[1] * 0.15;
          b.add(new THREE.SphereGeometry(k % 2 ? 0.1 : 0.12, 8, 6).translate(fx, yb - 0.15 + (k % 2) * 0.05, fz), k % 3 ? fc : FLOWER_M.leaf(), m);
        }
      }
      for (const [y0, y1, dep, half] of [[yb - 0.2, yb - 0.08, 0.14, 0.6], [yb + 1.33, yb + 1.43, 0.08, 0.55]] as const) {
        const ax = px - out[1] * half, az = pz + out[0] * half, bx = px + out[1] * half, bz = pz - out[0] * half;
        ub(b, tm, m, Math.min(ax, bx, ax + out[0] * dep), Math.max(ax, bx, ax + out[0] * dep), y0, y1, Math.min(az, bz, az + out[1] * dep), Math.max(az, bz, az + out[1] * dep));
      }
    }
  };
  wins(w, true, (u) => [-hw + u * w, hd], [0, 1]);            // front (+z), u from -x to +x
  wins(8, false, (u) => [hw - u * w, -hd], [0, -1]);          // back: side texture (8 m layout) stretched over w
  wins(8, false, (u) => [-hw, -hd + u * d], [-1, 0]);         // left side (-x): side texture is always the 8 m layout
  wins(8, false, (u) => [hw, hd - u * d], [1, 0]);            // right side (+x)
  // chimney cap + pot
  const cz = -hd * 0.35, top = h + rh + 1.1;
  ub(b, capM(), m, chx - 0.52, chx + 0.52, top, top + 0.16, cz - 0.52, cz + 0.52);
  { const p = V(chx, top + 0.7, cz).applyMatrix4(m); chimneys.push([p.x, p.y, p.z]); }
  b.add(new THREE.CylinderGeometry(0.13, 0.16, 0.42, 10).translate(0, 0.21, 0), lam("chimPot", () => ({ color: "#b8684a" })), m.clone().multiply(new THREE.Matrix4().makeTranslation(chx, top + 0.16, cz)));
};


// =====================================================================================================================
// Paris 1789 (SHOTPLAN 1.1-1.7). Everything procedural; positions from LOC (story.ts). Bastille / bridge / Invalides
// are the subjects and never culled; houses, trees and small props go through the sight-line culler (inTheWay).
// =====================================================================================================================
const TAU = Math.PI * 2;
const phongs = new Map<string, THREE.MeshPhongMaterial>();
const phong = (key: string, color: string, spec = "#8a8a8a", shin = 50) => {
  let m = phongs.get(key);
  if (!m) { m = twoTone(new THREE.MeshPhongMaterial({ color, specular: spec, shininess: shin }), 0.15); phongs.set(key, m); }
  return m;
};
const basics = new Map<string, THREE.MeshBasicMaterial>();
/** unlit flat colour (dark openings, slits, interiors: #2b2533, never pure black) */
const basic = (key: string, color: THREE.ColorRepresentation, extra: THREE.MeshBasicMaterialParameters = {}) => {
  let m = basics.get(key);
  if (!m) { m = new THREE.MeshBasicMaterial({ color, ...extra }); basics.set(key, m); }
  return m;
};
/** fortress stone casts shadows from both faces: its open shells (cut towers, bands) leaked light lines otherwise */
const solid = (m: THREE.MeshLambertMaterial) => { m.shadowSide = THREE.DoubleSide; return m; };
export const PM = {
  bast: () => solid(lam("bastHD", () => ({ map: stoneHD("bastHD") }))),
  bastIn: () => solid(lam("bastInHD", () => ({ map: stoneHD("bastInHD") }))),
  cope: () => solid(lam("copeHD", () => ({ map: stoneHD("copeHD") }))),
  wall: () => lam("wallHD", () => ({ map: stoneHD("wallHD") })),
  flag: () => lam("tstoneHD", () => ({ map: stoneHD("tstoneHD") })),
  cobble: () => lam("cobbleHD", () => ({ map: cobbleHD() })),
  gravel: () => lam("gravelHD", () => ({ map: gravelHD() })),
  moat: () => lam("moatFloor", () => ({ map: gravelHD(), color: "#e6dccb" })),
  oak: () => lam("oakHD", () => ({ map: oakTex() })),
  wood: () => lam("woodPlain", () => ({ color: "#94633c" })),
  woodDark: () => lam("woodDark", () => ({ color: "#6e4529" })),
  walnut: () => lam("walnut", () => ({ color: "#6b3f22" })),
  rope: () => lam("rope", () => ({ color: "#c9a874" })),
  stave: () => lam("staveHD", () => ({ map: staveTex(), side: THREE.DoubleSide })),
  head: () => lam("barrelHead", () => ({ map: oakTex(), color: "#d9b48a" })),
  iron: () => phong("ironP", "#3d414c", "#8a8a8a", 60),
  steel: () => phong("steelP", "#8d939e", "#d0d4da", 70),
  cannon: () => phong("cannonP", "#454550", "#9a9aa4", 45),
  dark: () => basic("darkOpen", "#2b2533"),
  glass: () => lam("lampGlass", () => ({ color: "#f3e2b0", emissive: new THREE.Color("#4a3210") })),
  cream: () => lam("invCream", () => ({ color: "#e8dcc0" })),
  slate: () => lam("invSlate", () => ({ map: roofHD("#6f7787", true), side: THREE.DoubleSide })),
  lead: () => lam("domeLead", () => ({ color: "#3b4a6a" })),
  gold: () => lam("domeGold", () => ({ color: "#d9b44a" })),
  leaf: () => lam("cabbage", () => ({ color: "#7cae4f" })),
  carrot: () => lam("carrot", () => ({ color: "#e07a35" })),
};

// ---------------- geometry helpers ----------------
const M4 = (x = 0, y = 0, z = 0, yaw = 0) => new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z);
const scaleUV = (g: THREE.BufferGeometry, su: number, sv = su) => {
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return g;
};
/** planar xz uv (tile metres) for floors / caps */
const planarUV = (g: THREE.BufferGeometry, tile = 2) => {
  const p = g.attributes.position as THREE.BufferAttribute, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) / tile; uv[i * 2 + 1] = -p.getZ(i) / tile; }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
};
const shapeGeo = (s: THREE.Shape, tile = 2) => scaleUV(new THREE.ShapeGeometry(s, 20), 1 / tile);
const extrude = (s: THREE.Shape, depth: number, tile = 2) => scaleUV(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 20 }), 1 / tile);
/** quad that is flipped if needed so its normal points along `want` */
const qf = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, want: THREE.Vector3, u = 1, v = 1) => {
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a));
  return n.dot(want) >= 0 ? quad(a, b, c, d, u, v) : quad(b, a, d, c, u, v);
};
const tf = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, want: THREE.Vector3) => {
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
  return n.dot(want) >= 0 ? tri(a, b, c) : tri(b, a, c);
};
type CylO = { seg?: number; th0?: number; thLen?: number; uTile?: number; vTile?: number; vBase?: number; inward?: boolean;
  keep?: (x: number, z: number, th: number) => boolean };
/** (battered) cylinder wall with smooth radial normals, theta 0 = +z, increasing toward +x; u = arc metres / uTile */
const cylGeo = (cx: number, cz: number, rb: number, rt: number, y0: number, y1: number, o: CylO = {}) => {
  const slope = (rb - rt) / (y1 - y0), rm = (rb + rt) / 2;
  // default: ~2 m per uv unit, snapped so the circumference holds a whole number of 4 m stone tiles (no seam, r1)
  const seg = o.seg ?? 56, th0 = o.th0 ?? 0, thL = o.thLen ?? TAU, uT = o.uTile ?? (rm * TAU) / (2 * Math.max(1, Math.round((rm * TAU) / 4))), vT = o.vTile ?? 2, vB = o.vBase ?? 0;
  const pos: number[] = [], nor: number[] = [], uv: number[] = [];
  const P = (th: number, y: number) => { const r = rb + (rt - rb) * (y - y0) / (y1 - y0); return [cx + r * Math.sin(th), y, cz + r * Math.cos(th)]; };
  const N = (th: number) => { const n = new THREE.Vector3(Math.sin(th), slope, Math.cos(th)).normalize(); return o.inward ? n.negate() : n; };
  for (let i = 0; i < seg; i++) {
    const a = th0 + (thL * i) / seg, c = th0 + (thL * (i + 1)) / seg, m = (a + c) / 2;
    if (o.keep && !o.keep(cx + rm * Math.sin(m), cz + rm * Math.cos(m), m)) continue;
    const vs: [number, number][] = o.inward ? [[a, y0], [c, y1], [c, y0], [a, y0], [a, y1], [c, y1]] : [[a, y0], [c, y0], [c, y1], [a, y0], [c, y1], [a, y1]];
    for (const [th, y] of vs) {
      pos.push(...P(th, y)); const n = N(th); nor.push(n.x, n.y, n.z); uv.push((rm * th) / uT, (y - vB) / vT);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return g;
};
const disk = (cx: number, cz: number, r: number, y: number, up = true, seg = 56) =>
  planarUV(new THREE.CircleGeometry(r, seg).rotateX(up ? -Math.PI / 2 : Math.PI / 2).translate(cx, y, cz));
const ring = (cx: number, cz: number, r0: number, r1: number, y: number, up = true, seg = 56) =>
  planarUV(new THREE.RingGeometry(r0, r1, seg, 1).rotateX(up ? -Math.PI / 2 : Math.PI / 2).translate(cx, y, cz));
/** box placed on a circle: local x tangent, local z radial (outward), centred at radius rm, angle th */
const onCircle = (b: Batch, mat: THREE.Material, cx: number, cz: number, rm: number, th: number, w: number, d: number, y0: number, y1: number) =>
  b.add(boxGeo(V(-w / 2, y0, -d / 2), V(w / 2, y1, d / 2), 1), mat, new THREE.Matrix4().makeRotationY(th).setPosition(cx + rm * Math.sin(th), 0, cz + rm * Math.cos(th)));
/** a round-arched opening outline (hole path) of half-width hw from y0, springing at ys */
const archPath = (p: THREE.Path, cx: number, hw: number, y0: number, ys: number) => {
  p.moveTo(cx - hw, y0); p.lineTo(cx + hw, y0); p.lineTo(cx + hw, ys); p.absarc(cx, ys, hw, 0, Math.PI, false); p.lineTo(cx - hw, y0);
  return p;
};
/** U-shaped arch frame outline (outer rect minus the opening, open at the bottom) */
const archFrame = (hw: number, ys: number, ow: number, oh: number) => {
  const s = new THREE.Shape();
  s.moveTo(-ow, 0); s.lineTo(-hw, 0); s.lineTo(-hw, ys); s.absarc(0, ys, hw, Math.PI, 0, true); s.lineTo(hw, 0); s.lineTo(ow, 0); s.lineTo(ow, oh); s.lineTo(-ow, oh); s.closePath();
  return s;
};
const archPts = (hw: number, y0: number, ys: number, n = 18): [number, number][] => {
  const out: [number, number][] = [[-hw, y0], [-hw, ys]];
  for (let i = 1; i < n; i++) { const a = Math.PI - (Math.PI * i) / n; out.push([hw * Math.cos(a), ys + hw * Math.sin(a)]); }
  out.push([hw, ys], [hw, y0]);
  return out;
};

// ---------------- the powder barrel (one model everywhere: BARREL in story.ts) ----------------
const BH = BARREL.h, BRM = BARREL.rMid, BRE = BARREL.rEnd;
/** stave radius at height y (bellied) */
export const barrelR = (y: number) => BRE + (BRM - BRE) * Math.sin((Math.PI * Math.min(BH, Math.max(0, y))) / BH);
let BG: { stave: THREE.BufferGeometry; head: THREE.BufferGeometry; hoop: THREE.BufferGeometry; bung: THREE.BufferGeometry; rim: THREE.BufferGeometry } | null = null;
const barrelGeos = () => {
  if (!BG) {
    const prof = Array.from({ length: 15 }, (_, i) => new THREE.Vector2(barrelR((i * BH) / 14), (i * BH) / 14));
    const stave = new THREE.LatheGeometry(prof, 36);
    const head = mergeGeometries([new THREE.CircleGeometry(BRE, 32).rotateX(-Math.PI / 2).translate(0, BH, 0), new THREE.CircleGeometry(BRE, 32).rotateX(Math.PI / 2)], false);
    const hoops = [0.14 * BH, 0.86 * BH].map((y) => new THREE.CylinderGeometry(barrelR(y + 0.03) + 0.008, barrelR(y - 0.03) + 0.008, 0.06, 36, 1, true).translate(0, y, 0));
    const hoop = mergeGeometries(hoops, false);
    const bung = new THREE.CircleGeometry(BARREL.bungR, 18).translate(0, BH / 2, BRM + 0.006);
    const rim = new THREE.RingGeometry(BARREL.bungR, BARREL.bungR + 0.018, 18).translate(0, BH / 2, BRM + 0.004);
    BG = { stave, head, hoop, bung, rim };
  }
  return BG;
};
const speckTex = () => ctex("powderSpeck", 128, 128, (g, r) => {
  g.clearRect(0, 0, 128, 128);
  for (let i = 0; i < 70; i++) {
    const a = r() * TAU, d = Math.pow(r(), 0.7) * 54, s = 1.5 + r() * 3.5;
    g.fillStyle = r() < 0.5 ? "rgba(36,23,38,0.95)" : "rgba(43,37,51,0.9)";
    g.beginPath(); g.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d * 0.8, s, 0, TAU); g.fill();
  }
});
type BarrelData = { spin: THREE.Group; grains: THREE.InstancedMesh | null; patch: THREE.Mesh | null; seed: number; dip: number; gs: number };
let barrelSeed = 0;
/** The shared powder barrel (bellied oak staves, 2 dark iron hoops, a bung hole on the belly, no marks), base at y = 0,
 *  axis = local +y, bung toward local +z. With `trickle`, a stream of BARREL.trickle.grains black grains falls from the
 *  bung to the ground on a loop and leaves a speck patch. Call tickBarrel() every frame (it also turns the bung to the
 *  lens). Exported for the char owner's carried barrels too. */
export const makeBarrel = (opts: { trickle?: boolean; dip?: number; grainScale?: number } = {}) => {
  const G = barrelGeos(), g = new THREE.Group(), spin = new THREE.Group();
  g.add(spin);
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, shadow = true) => {
    const mesh = new THREE.Mesh(geo, m); mesh.castShadow = shadow; mesh.receiveShadow = true; spin.add(mesh); return mesh;
  };
  add(G.stave, PM.stave()); add(G.head, PM.head()); add(G.hoop, PM.iron());
  // bung (+ rim): grainScale > 1 also enlarges it, scaled about its centre on the belly (reads at shot-4 distances)
  const k = opts.grainScale ?? 1;
  for (const m of [add(G.rim, PM.woodDark(), false), add(G.bung, PM.dark(), false)]) if (k !== 1) {
    m.position.set(0, BH / 2, BRM).multiplyScalar(1 - k); m.scale.setScalar(k);
  }
  let grains: THREE.InstancedMesh | null = null, patch: THREE.Mesh | null = null;
  if (opts.trickle) {
    grains = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), basic("powderGrain", BARREL.trickle.color), BARREL.trickle.grains + 2);
    grains.frustumCulled = false; grains.matrixAutoUpdate = false; grains.castShadow = false;
    grains.layers.set(3); // NOINK (ink.ts): tiny specks must not get a world outline
    patch = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), basic("powderPatch", "#ffffff", { map: speckTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    patch.matrixAutoUpdate = false; patch.layers.set(3); patch.renderOrder = 0.4;
    g.add(grains, patch);
  }
  g.userData.barrel = { spin, grains, patch, seed: (barrelSeed++ * 0.6180339) % 1, dip: opts.dip ?? 0, gs: opts.grainScale ?? 1 } as BarrelData;
  return g;
};
const _bm = new THREE.Matrix4(), _bi = new THREE.Matrix4(), _bp = new THREE.Vector3(), _bq = new THREE.Quaternion(), _bs = new THREE.Vector3(),
  _bc = new THREE.Vector3(), _bu = new THREE.Vector3(), _bd = new THREE.Vector3(), _be = new THREE.Euler(), _bk = new THREE.Vector3();
const hash = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
/** pose a barrel for time t (s): bung turned toward the lens (kept at or below the barrel's equator when lying), grains
 *  falling from the bung to groundY (world) */
export const tickBarrel = (g: THREE.Object3D, t: number, camPos: THREE.Vector3 | null, groundY = D0) => {
  const u = g.userData.barrel as BarrelData | undefined;
  if (!u) return;
  g.updateWorldMatrix(true, true); // parents too: the cart / FG group may have moved this frame (stale matrix = bung turned away)
  _bi.copy(g.matrixWorld).invert();
  if (camPos) {
    _bc.copy(camPos).applyMatrix4(_bi);
    _bu.set(0, 1, 0).transformDirection(_bi);
    let dx = _bc.x, dz = _bc.z;
    const n = Math.hypot(dx, dz) || 1; dx /= n; dz /= n;
    const wl = _bu.x * _bu.x + _bu.z * _bu.z;
    if (wl > 0.05) {
      const e = dx * _bu.x + dz * _bu.z;
      if (e > 0 || u.dip) { dx -= (e / wl) * _bu.x; dz -= (e / wl) * _bu.z; const m = Math.hypot(dx, dz) || 1; dx /= m; dz /= m; }
      if (u.dip) { // tip the bung `dip` radians below the equator (lying barrels: it then shows to a lens above it)
        const wm = Math.sqrt(wl), c = Math.cos(u.dip), sn = Math.sin(u.dip);
        dx = c * dx - sn * (_bu.x / wm); dz = c * dz - sn * (_bu.z / wm);
      }
    }
    u.spin.rotation.y = Math.atan2(dx, dz);
  }
  if (!u.grains || !u.patch) return;
  u.spin.updateMatrixWorld(true);
  _bp.set(0, BH / 2, BRM + 0.012).applyMatrix4(u.spin.matrixWorld);
  _bd.set(0, 0, 1).transformDirection(u.spin.matrixWorld); _bd.y = 0;
  if (_bd.lengthSq() < 1e-4) _bd.set(0, 0, 1);
  _bd.normalize();
  const H = Math.max(0.05, _bp.y - groundY), N = u.grains.count, fall = BARREL.trickle.fallS;
  for (let i = 0; i < N; i++) {
    const ph = (((t / fall + i / N + u.seed) % 1) + 1) % 1, s = (0.008 + 0.007 * hash(i, 3)) * u.gs;
    const jx = (hash(i, 1) - 0.5) * 0.02 * ph, jz = (hash(i, 2) - 0.5) * 0.02 * ph, out = 0.012 + 0.045 * ph;
    _bm.compose(_bs.set(_bp.x + _bd.x * out + jx, _bp.y - H * ph * ph, _bp.z + _bd.z * out + jz), _bq.setFromEuler(_be.set(i, i * 2.1, 0)), _bk.set(s, s * 1.2, s));
    u.grains.setMatrixAt(i, _bm.premultiply(_bi));
  }
  u.grains.instanceMatrix.needsUpdate = true;
  _bm.compose(_bs.set(_bp.x + _bd.x * 0.06, groundY + 0.012, _bp.z + _bd.z * 0.06), _bq.setFromEuler(_be.set(-Math.PI / 2, 0, 0)), _bk.set(1, 1, 1));
  u.patch.matrix.copy(_bm.premultiply(_bi));
};

// ---------------- small procedural props (batched; local base at y 0, forward = local +z) ----------------
/** iron lamp post with a glass lantern box, height h */
/** HDR lantern glass for lit lamps (> 1.3 linear: blooms) */
const lampLit = () => basic("lampLit", new THREE.Color(3.0, 2.05, 0.95));
const lampAt = (b: Batch, m: THREE.Matrix4, h = 2.8, lit = false) => {
  const k = h / 2.8, I = PM.iron(), y0 = 2.42 * k;
  const L = (g: THREE.BufferGeometry, mt: THREE.Material) => b.add(g, mt, m);
  L(new THREE.CylinderGeometry(0.17 * k, 0.24 * k, 0.32 * k, 10).translate(0, 0.16 * k, 0), I);
  L(new THREE.CylinderGeometry(0.045 * k, 0.075 * k, 2.1 * k, 8).translate(0, 0.32 * k + 1.05 * k, 0), I);
  L(new THREE.CylinderGeometry(0.12 * k, 0.05 * k, 0.12 * k, 8).translate(0, y0 - 0.06 * k, 0), I);
  L(boxGeo(V(-0.13 * k, y0, -0.13 * k), V(0.13 * k, y0 + 0.36 * k, 0.13 * k)), lit ? lampLit() : PM.glass());
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) L(boxGeo(V(sx * 0.14 * k - 0.018 * k, y0, sz * 0.14 * k - 0.018 * k), V(sx * 0.14 * k + 0.018 * k, y0 + 0.36 * k, sz * 0.14 * k + 0.018 * k)), I);
  L(new THREE.ConeGeometry(0.23 * k, 0.2 * k, 4).rotateY(Math.PI / 4).translate(0, y0 + 0.46 * k, 0), I);
  L(new THREE.SphereGeometry(0.04 * k, 8, 6).translate(0, y0 + 0.6 * k, 0), I);
};
/** flintlock musket along local +z: walnut stock (butt at z 0), steel barrel to z 1.45 */
const musketAt = (b: Batch, m: THREE.Matrix4) => {
  const L = (g: THREE.BufferGeometry, mt: THREE.Material) => b.add(g, mt, m);
  L(boxGeo(V(-0.03, -0.07, 0), V(0.03, 0.05, 0.32)), PM.walnut());
  L(boxGeo(V(-0.022, -0.02, 0.32), V(0.022, 0.035, 1.2)), PM.walnut());
  L(new THREE.CylinderGeometry(0.014, 0.016, 1.12, 8).rotateX(Math.PI / 2).translate(0, 0.045, 0.89), PM.steel());
  L(boxGeo(V(-0.035, 0.0, 0.36), V(0.035, 0.06, 0.46)), PM.iron());
};
/** open wooden crate of muskets, muzzles out (about 1.0 m tall) */
const crateAt = (b: Batch, m: THREE.Matrix4) => {
  const W = PM.wood(), D = PM.woodDark(), L = (g: THREE.BufferGeometry, mt: THREE.Material) => b.add(g, mt, m);
  L(boxGeo(V(-0.6, 0, -0.32), V(0.6, 0.06, 0.32)), D);
  for (const s of [-1, 1]) {
    L(boxGeo(V(-0.6, 0, s * 0.32 - 0.03), V(0.6, 0.46, s * 0.32 + 0.03)), W);
    L(boxGeo(V(s * 0.6 - 0.03, 0, -0.32), V(s * 0.6 + 0.03, 0.46, 0.32)), W);
    L(boxGeo(V(-0.62, 0.15, s * 0.32 - 0.04), V(0.62, 0.21, s * 0.32 + 0.04)), D);
  }
  for (let i = 0; i < 6; i++) {
    const x = -0.45 + i * 0.18, tilt = -0.95 + (i % 2) * 0.12, yaw = (i - 2.5) * 0.06;
    musketAt(b, m.clone().multiply(new THREE.Matrix4().makeTranslation(x, 0.1, -0.22)).multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(tilt, yaw, 0, "YXZ"))));
  }
};
const wheelGeo = (b: Batch, m: THREE.Matrix4, r: number, w: number, spokes = 8) => {
  const L = (g: THREE.BufferGeometry, mt: THREE.Material) => b.add(g, mt, m);
  L(new THREE.TorusGeometry(r - 0.035, 0.045, 8, 32), PM.wood());
  L(new THREE.TorusGeometry(r - 0.005, 0.022, 6, 32), PM.iron());
  L(new THREE.CylinderGeometry(0.09, 0.09, w, 12).rotateX(Math.PI / 2), PM.woodDark());
  for (let i = 0; i < spokes; i++) L(boxGeo(V(-0.022, 0.06, -0.022), V(0.022, r - 0.05, 0.022)).rotateZ((i * TAU) / spokes), PM.wood());
};
/** field cannon on its carriage, barrel along local +z, ~1.0 m tall */
const cannonAt = (b: Batch, m: THREE.Matrix4) => {
  const L = (g: THREE.BufferGeometry, mt: THREE.Material) => b.add(g, mt, m), C = PM.cannon();
  for (const s of [-1, 1]) L(boxGeo(V(s * 0.25 - 0.05, 0.25, -1.0), V(s * 0.25 + 0.05, 0.72, 0.55)), PM.wood());
  L(boxGeo(V(-0.3, 0.05, -1.3), V(0.3, 0.2, -0.8)), PM.woodDark());
  L(boxGeo(V(-0.48, 0.45, 0.22), V(0.48, 0.55, 0.32)), PM.iron());
  for (const s of [-1, 1]) wheelGeo(b, m.clone().multiply(new THREE.Matrix4().makeTranslation(s * 0.44, 0.5, 0.27).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2))), 0.5, 0.12, 10);
  const bar = new THREE.Matrix4().makeTranslation(0, 0.8, 0.1).multiply(new THREE.Matrix4().makeRotationX(-0.12));
  const B = (g: THREE.BufferGeometry) => b.add(g, C, m.clone().multiply(bar));
  B(new THREE.CylinderGeometry(0.115, 0.17, 1.9, 18).rotateX(Math.PI / 2).translate(0, 0, 0.35));
  B(new THREE.TorusGeometry(0.13, 0.035, 8, 18).translate(0, 0, 1.28));
  B(new THREE.TorusGeometry(0.175, 0.03, 8, 18).translate(0, 0, -0.45));
  B(new THREE.SphereGeometry(0.17, 16, 10, 0, TAU, Math.PI / 2, Math.PI / 2).rotateX(-Math.PI / 2).translate(0, 0, -0.6));
  B(new THREE.SphereGeometry(0.07, 10, 8).translate(0, 0, -0.82));
};
/** vegetable handcart (two wheels, shafts, cabbages + carrots), ~0.9 m tall, shafts toward local -z */
const vegCartAt = (b: Batch, m: THREE.Matrix4, veg = true) => {
  aoM(m, 0.9, 1.4);
  const L = (g: THREE.BufferGeometry, mt: THREE.Material) => b.add(g, mt, m);
  L(boxGeo(V(-0.55, 0.5, -0.8), V(0.55, 0.58, 0.8), 1, true), PM.oak());
  for (const s of [-1, 1]) {
    L(boxGeo(V(s * 0.55 - 0.03, 0.58, -0.8), V(s * 0.55 + 0.03, 0.82, 0.8)), PM.wood());
    L(boxGeo(V(s * 0.38 - 0.035, 0.5, -1.9), V(s * 0.38 + 0.035, 0.58, -0.8)), PM.wood());
    wheelGeo(b, m.clone().multiply(new THREE.Matrix4().makeTranslation(s * 0.64, 0.45, 0.1).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2))), 0.45, 0.1, 8);
  }
  for (const s of [-1, 1]) L(boxGeo(V(-0.55, 0.58, s * 0.8 - 0.03), V(0.55, 0.82, s * 0.8 + 0.03)), PM.wood());
  L(boxGeo(V(-0.03, 0.15, 0.65), V(0.03, 0.5, 0.71)), PM.wood());
  const r = rng(77);
  if (veg) for (let i = 0; i < 9; i++) L(new THREE.SphereGeometry(0.15 + r() * 0.04, 12, 9).scale(1, 0.85, 1).translate(-0.35 + (i % 3) * 0.35, 0.72 + (i > 5 ? 0.12 : 0), -0.45 + Math.floor(i / 3) * 0.25), PM.leaf());
  if (veg) for (let i = 0; i < 6; i++) L(new THREE.ConeGeometry(0.04, 0.3, 8).rotateZ(Math.PI / 2 + (r() - 0.5)).translate(-0.3 + r() * 0.6, 0.8, 0.35 + r() * 0.3), PM.carrot());
};
/** blue/red split pennant on a pole (no emblem, no text) */
const pennantTex = () => ctex("pennantBR", 256, 128, (g) => {
  g.fillStyle = "#3f5fa8"; g.fillRect(0, 0, 256, 64); g.fillStyle = "#b8453a"; g.fillRect(0, 64, 256, 64);
});
const pennantAt = (b: Batch, x: number, z: number, h = 5.2) => {
  if (inTheWay(x - 1.8, x + 1.8, D0, D0 + h, z - 0.4, z + 0.4, true)) return;
  b.add(new THREE.CylinderGeometry(0.05, 0.07, h, 8).translate(x, D0 + h / 2, z), PM.woodDark());
  b.add(new THREE.SphereGeometry(0.09, 10, 8).translate(x, D0 + h + 0.05, z), PM.gold());
  const g = new THREE.BufferGeometry(), L = 1.9, H = 0.9, y = D0 + h - 0.15;
  g.setAttribute("position", new THREE.Float32BufferAttribute([x, y, z, x, y - H, z, x + L, y - H / 2 - 0.12, z], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0.5], 2));
  b.add(g, lam("pennantM", () => ({ map: pennantTex(), side: THREE.DoubleSide })));
};

// =====================================================================================================================
// VARENNES world (SHOTPLAN 4). Lights: every lamp / torch / window registers a LAMP (warm pool source for shade.ts POOLS,
// selected per frame in world.ts by distance to the lens) and gets a soft additive halo sprite (NOINK).
// =====================================================================================================================
export type Place = "paris" | "road" | "relay" | "ride";
/** a warm light pool source: world position, linear colour x intensity, radius (m), flicker amount, place */
export type Lamp = { p: V3; col: [number, number, number]; r: number; flick: number; place: Place; seed: number };
const WARM: [number, number, number] = [1.0, 0.6, 0.27];
let lamps: Lamp[] = [];
let halos: { p: V3; s: number; place: Place; flick: number; seed: number }[] = [];
const addLamp = (place: Place, p: V3, I = 1.4, r = 7, flick = 0, halo = 0.9) => {
  const seed = lamps.length * 1.7 + 0.3;
  lamps.push({ p, col: [WARM[0] * I, WARM[1] * I, WARM[2] * I], r, flick, place, seed });
  if (halo > 0) halos.push({ p, s: halo, place, flick, seed });
};
const hlx = (x: number, z: number, h: number, place: Place, lit = true, I = 1.3) => { // lamp post + its pool
  return (b: Batch) => {
    if (inTheWay(x - 0.3, x + 0.3, D0, D0 + h, z - 0.3, z + 0.3, true)) return;
    lampAt(b, M4(x, D0, z), h, lit); ao(x, z, 0.45);
    if (lit) addLamp(place, [x, D0 + h * 0.92, z], I, 8);
  };
};
/** wall lantern on an iron bracket: glass box at p, bracket back to the wall along -out (unit xz) */
/** is any lens of the film within d metres of p? (sight-ray origins = every camera position, sampled every 2 f) */
const nearLens = (p: V3, d: number) => sight.some((s) => Math.hypot(s.o.x - p[0], s.o.y - p[1], s.o.z - p[2]) < d);
const wallLantern = (b: Batch, place: Place, p: V3, out: [number, number], I = 1.1) => {
  // a lens grazing a lantern fills the frame with its HDR glass + halo (take 1 f425-434 passed 0.5 m from the gate one)
  if (nearLens(p, 2.5)) return;
  const [x, y, z] = p, I2 = PM.iron();
  b.add(boxGeo(V(x - 0.11, y - 0.17, z - 0.11), V(x + 0.11, y + 0.17, z + 0.11)), lampLit());
  b.add(new THREE.ConeGeometry(0.18, 0.18, 4).rotateY(Math.PI / 4).translate(x, y + 0.26, z), I2);
  b.add(boxGeo(V(Math.min(x, x - out[0] * 0.55) - 0.025, y + 0.33, Math.min(z, z - out[1] * 0.55) - 0.025), V(Math.max(x, x - out[0] * 0.55) + 0.025, y + 0.38, Math.max(z, z - out[1] * 0.55) + 0.025)), I2);
  b.add(boxGeo(V(x - 0.13, y - 0.22, z - 0.13), V(x + 0.13, y - 0.17, z + 0.13)), I2);
  addLamp(place, [x + out[0] * 0.2, y, z + out[1] * 0.2], I, 7);
};
/** iron wall sconce with a burning torch (flame = HDR basic cone; flickering pool) */
const wallTorch = (b: Batch, place: Place, p: V3, out: [number, number]) => {
  if (nearLens(p, 2.5)) return;
  const [x, y, z] = p, ox = out[0] * 0.35, oz = out[1] * 0.35;
  b.add(boxGeo(V(Math.min(x, x - ox) - 0.03, y - 0.5, Math.min(z, z - oz) - 0.03), V(Math.max(x, x - ox) + 0.03, y - 0.44, Math.max(z, z - oz) + 0.03)), PM.iron());
  b.add(new THREE.CylinderGeometry(0.045, 0.035, 0.7, 8).translate(x, y - 0.3, z), PM.woodDark());
  b.add(new THREE.ConeGeometry(0.1, 0.36, 10).translate(x, y + 0.2, z), basic("flame", new THREE.Color(3.4, 1.7, 0.45)));
  addLamp(place, [x + out[0] * 0.3, y + 0.2, z + out[1] * 0.3], 1.3, 8, 1, 1.4);
};
/** cartoon tree with the culler (core rays), kind as addVeg */
const tree = (b: Batch, k: VegKind, x: number, z: number, h: number, seed: number, q = 0, keep = false, hy = 0) => {
  const rad = vegRad(k, h);
  if (!keep && inTheWay(x - rad, x + rad, D0, D0 + h, z - rad, z + rad, true)) return;
  addVeg(b, k, x, D0, z, h, seed, q, hy);
};
/** flat textured ground quad at D0 + dy (u along x, tile metres) */
const flat = (b: Batch, mat: THREE.Material, x0: number, x1: number, z0: number, z1: number, tile: number, dy: number) =>
  b.add(qf(V(x0, D0 + dy, z1), V(x1, D0 + dy, z1), V(x1, D0 + dy, z0), V(x0, D0 + dy, z0), V(0, 1, 0), (x1 - x0) / tile, (z1 - z0) / tile), mat);
/** a dirt road strip from a to b (width w): u along the road (4 m tiles), v across = the full width */
const roadSeg = (b: Batch, a: [number, number], c: [number, number], w: number, dy = 0.02) => {
  const dx = c[0] - a[0], dz = c[1] - a[1], L = Math.hypot(dx, dz), nx = -dz / L * w / 2, nz = dx / L * w / 2;
  b.add(qf(V(a[0] + nx, D0 + dy, a[1] + nz), V(c[0] + nx, D0 + dy, c[1] + nz), V(c[0] - nx, D0 + dy, c[1] - nz), V(a[0] - nx, D0 + dy, a[1] - nz), V(0, 1, 0), L / 4, 1), MAT.dirt());
};
const MAT = {
  dirt: () => { const m = lam("dirtRoad", () => ({ map: dirtRoadHD(), transparent: true, depthWrite: false })); m.polygonOffset = true; m.polygonOffsetFactor = -1; return m; },
  litter: () => lam("litter", () => ({ map: litterHD() })),
  field: (k: "wheat" | "plough" | "meadow") => lam("field_" + k, () => ({ map: fieldHD(k) })),
  // mid bottle green lacquer + a painted sky reflection (LACQUER_ENV, repainted per light by world.ts): glossy, never black
  lacquer: () => { const m = phong("lacquer", "#2f7c68", "#d2e0d8", 70); m.side = THREE.DoubleSide; if (!m.envMap) { m.envMap = LACQUER_ENV.tex; m.combine = THREE.AddOperation; m.reflectivity = 0.2; } return m; },
  lacquerDark: () => { const m = phong("lacquerDk", "#34464e", "#9aa4b0", 60); m.side = THREE.DoubleSide; return m; },
  yellow: () => lam("coachYellow", () => ({ color: "#d9a33c" })),
  gold: () => phong("trimGold", "#d6b04c", "#fff0b0", 60),
  velvet: () => lam("velvet", () => ({ color: "#6a2a32" })),
  canvas: () => lam("luggage", () => ({ color: "#d4c098" })), // light tarpaulin: the roof band sank below the night p5 floor
  inside: () => basic("coachInside", "#5e4a42", { side: THREE.DoubleSide }),
  glassDark: () => phong("coachGlass", "#3c4a66", "#e8eeff", 90),
};

// ---------------- lacquer sky reflection: a tiny equirect env (sky top -> bright horizon band -> dark ground) ----------------
const envCanvas = document.createElement("canvas"); envCanvas.width = 64; envCanvas.height = 64;
const envTex = new THREE.CanvasTexture(envCanvas);
envTex.mapping = THREE.EquirectangularReflectionMapping; envTex.colorSpace = THREE.SRGBColorSpace;
let envKey = "";
/** per-take lacquer albedo: the golden take 3 light (warm key) turns the bottle green sage, so it gets a bluer teal
 *  there and reads as the same coach as the moonlit takes */
export const setLacquerTint = (hex: string, refl = 0.2, spec = "#d2e0d8", emis: [number, number, number] = [0, 0, 0]) => {
  const m = MAT.lacquer(); m.color.set(hex); m.reflectivity = refl; m.specular.set(spec); m.emissive.setRGB(...emis);
};
export const LACQUER_ENV = {
  tex: envTex,
  /** repaint from the sky stops (on-screen hex, c[0] = horizon .. c[4] = top); cheap, only when the colours change */
  paint: (c: string[]) => {
    const key = c.join();
    if (key === envKey) return;
    envKey = key;
    const g = envCanvas.getContext("2d")!, gr = g.createLinearGradient(0, 0, 0, 64);
    const dk = (h: string, k: number) => "#" + new THREE.Color(h).lerp(new THREE.Color("#141a24"), k).getHexString();
    gr.addColorStop(0, dk(c[4], 0.75)); gr.addColorStop(0.36, dk(c[2], 0.6)); gr.addColorStop(0.43, dk(c[0], 0.15)); gr.addColorStop(0.49, c[0]);
    gr.addColorStop(0.53, dk(c[0], 0.35)); gr.addColorStop(0.62, "#6a5446"); gr.addColorStop(1, "#4a3c38");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    envTex.needsUpdate = true;
  },
};

// ---------------- the Tuileries facade (4.1) ----------------
const buildTuileries = (b: Batch) => {
  const F = LOC.FACADE_Z, [X0, X1] = LOC.FACADE_X, top = 14, [kx, ky] = [LOC.KING_WIN[0], LOC.KING_WIN[1]], [kw, kh] = LOC.KING_WIN_WH;
  const gx = LOC.SIDE_GATE[0], [gw, gh] = LOC.SIDE_GATE_WH, ghw = gw / 2, gys = gh - ghw;
  const bay = lam("tuilBay", () => ({ map: tuileriesBayHD(false) })), gateM = lam("tuilGate", () => ({ map: tuileriesBayHD(true) }));
  const C = PM.cope(), up = V(0, 1, 0);
  // segment A (x0 .. gate bay) with the king's window hole, the gate bay (8 m) with the arch hole, segment B
  const ga = gx - 4, gb = gx + 4;
  const seg = (x0: number, x1: number, holes: THREE.Path[], mat: THREE.Material, tileU: number, uOff: number) => {
    const s = new THREE.Shape(); s.moveTo(x0, 0); s.lineTo(x1, 0); s.lineTo(x1, top); s.lineTo(x0, top); s.closePath();
    s.holes.push(...holes);
    const g = new THREE.ShapeGeometry(s, 24), uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - uOff) / tileU, uv.getY(i) / top);
    b.add(g.translate(0, D0, F), mat);
  };
  const kwin = new THREE.Path(); kwin.moveTo(kx - kw / 2, ky - D0 - kh / 2); kwin.lineTo(kx + kw / 2, ky - D0 - kh / 2); kwin.lineTo(kx + kw / 2, ky - D0 + kh / 2); kwin.lineTo(kx - kw / 2, ky - D0 + kh / 2); kwin.closePath();
  seg(X0, ga, [kwin], bay, 4, X0);
  seg(ga, gb, [archPath(new THREE.Path(), gx, ghw, 0, gys)], gateM, 8, ga);
  seg(gb, X1, [], bay, 4, X0);
  aoWall([X0, F], [X1, F], [0, 1], 1.1);
  // relief: plinth, string courses, cornice (proud boxes)
  for (const [a0, a1] of [[X0 - 0.1, gx - ghw], [gx + ghw, X1 + 0.1]] as const) b.add(boxGeo(V(a0, D0 - 0.05, F), V(a1, D0 + 0.6, F + 0.12), 2), C);
  for (const [y0, y1, d] of [[5.6, 5.92, 0.22], [10.5, 10.76, 0.18], [13.55, 14.1, 0.55]] as const) b.add(boxGeo(V(X0 - 0.1, D0 + y0, F), V(X1 + 0.1, D0 + y1, F + d), 2), C);
  // the king's window: stone reveals 0.5 m deep, a lit warm room behind (HDR walls, red curtains framing a clean recess)
  const zr = F - 0.5, wx0 = kx - kw / 2, wx1 = kx + kw / 2, wy0 = ky - kh / 2, wy1 = ky + kh / 2;
  b.add(qf(V(wx0, wy0, F), V(wx0, wy0, zr), V(wx0, wy1, zr), V(wx0, wy1, F), V(1, 0, 0), 0.25, 1.4), C);
  b.add(qf(V(wx1, wy0, zr), V(wx1, wy0, F), V(wx1, wy1, F), V(wx1, wy1, zr), V(-1, 0, 0), 0.25, 1.4), C);
  b.add(qf(V(wx0, wy1, zr), V(wx1, wy1, zr), V(wx1, wy1, F), V(wx0, wy1, F), V(0, -1, 0), 0.8, 0.25), C);
  b.add(boxGeo(V(wx0 - 0.2, LOC.KING_ROOM_FLOOR, zr - 0.05), V(wx1 + 0.2, wy0, F + 0.25), 1), C); // sill / threshold
  const zb = F - 4.2, rx0 = kx - 2.6, rx1 = kx + 2.6, ry0 = LOC.KING_ROOM_FLOOR, ry1 = ry0 + 4.2;
  // a dressed royal room (candle-lit damask walls, wainscot, a gilt-framed landscape, a candelabra, swagged curtains)
  const roomTex = ctex("kingRoomDamask", 512, 512, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#f2c88a"); gr.addColorStop(0.55, "#e0a060"); gr.addColorStop(1, "#a8683a");
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    for (let y = 20; y < 380; y += 56) for (let x = (y / 56) % 2 ? 28 : 0; x < 512; x += 56) { // damask lozenges
      g.fillStyle = "rgba(150,80,40,0.22)"; g.beginPath(); g.moveTo(x, y - 18); g.lineTo(x + 11, y); g.lineTo(x, y + 18); g.lineTo(x - 11, y); g.closePath(); g.fill();
      g.fillStyle = "rgba(255,235,190,0.25)"; g.beginPath(); g.arc(x, y, 3.5, 0, TAU); g.fill();
    }
    g.fillStyle = "#7a4426"; g.fillRect(0, 392, 512, 120); // wainscot
    for (let x = 12; x < 512; x += 84) { g.strokeStyle = "rgba(255,210,150,0.35)"; g.lineWidth = 3; g.strokeRect(x, 408, 66, 88); }
    g.fillStyle = "#d8a850"; g.fillRect(0, 386, 512, 8); g.fillRect(0, 0, 512, 10);
  });
  roomTex.wrapS = roomTex.wrapT = THREE.ClampToEdgeWrapping;
  const roomBack = basic("kingRoomBack", new THREE.Color(1.45, 1.2, 1.0), { map: roomTex });
  const roomSide = basic("kingRoomSide", new THREE.Color(1.05, 0.82, 0.66), { map: roomTex });
  b.add(qf(V(rx0, ry0, zb), V(rx1, ry0, zb), V(rx1, ry1, zb), V(rx0, ry1, zb), V(0, 0, 1)), roomBack);
  b.add(qf(V(rx0, ry0, zr), V(rx0, ry0, zb), V(rx0, ry1, zb), V(rx0, ry1, zr), V(1, 0, 0)), roomSide);
  b.add(qf(V(rx1, ry0, zb), V(rx1, ry0, zr), V(rx1, ry1, zr), V(rx1, ry1, zb), V(-1, 0, 0)), roomSide);
  b.add(qf(V(rx0, ry1, zb), V(rx1, ry1, zb), V(rx1, ry1, zr), V(rx0, ry1, zr), V(0, -1, 0)), basic("kingRoomCeil", new THREE.Color(1.1, 0.75, 0.45)));
  b.add(qf(V(rx0, ry0 + 0.01, zr), V(rx1, ry0 + 0.01, zr), V(rx1, ry0 + 0.01, zb), V(rx0, ry0 + 0.01, zb), up), basic("kingRoomFloor", new THREE.Color(0.75, 0.4, 0.2)));
  const curtTex = ctex("kingCurtFolds", 128, 64, (g) => {
    for (let x = 0; x < 128; x++) { const k = 0.75 + 0.25 * Math.sin((x / 128) * TAU * 4); g.fillStyle = "rgb(" + Math.round(200 * k) + "," + Math.round(52 * k) + "," + Math.round(44 * k) + ")"; g.fillRect(x, 0, 1, 64); }
  });
  const curtain = basic("kingCurtain", new THREE.Color(1.05, 1.0, 1.0), { map: curtTex, side: THREE.DoubleSide });
  const zc = zr - 0.02, gold = basic("kingGold", new THREE.Color(1.05, 0.74, 0.28));
  for (const s of [-1, 1]) { // side curtains gathered by a tie-back (narrow waist), outer edge on the reveal
    const e = s < 0 ? wx0 + 0.015 : wx1 - 0.015, sh = new THREE.Shape(), ty = wy0 + 1.15; // off the reveal plane (no dashed ink)
    sh.moveTo(e, wy0); sh.lineTo(e - s * 0.34, wy0); sh.quadraticCurveTo(e - s * 0.1, ty, e - s * 0.12, ty); sh.quadraticCurveTo(e - s * 0.08, ty + 0.4, e - s * 0.42, wy1); sh.lineTo(e, wy1); sh.closePath();
    b.add(new THREE.ShapeGeometry(sh, 12).translate(0, 0, zc), curtain);
    b.add(new THREE.SphereGeometry(0.06, 8, 6).translate(e - s * 0.12, ty, zc + 0.03), gold);
  }
  { // swag valance: two scallops
    const sh = new THREE.Shape(), mid = (wx0 + wx1) / 2;
    sh.moveTo(wx0, wy1); sh.lineTo(wx1, wy1); sh.lineTo(wx1, wy1 - 0.28);
    sh.quadraticCurveTo((wx1 + mid) / 2, wy1 - 0.62, mid, wy1 - 0.3); sh.quadraticCurveTo((wx0 + mid) / 2, wy1 - 0.62, wx0, wy1 - 0.28); sh.closePath();
    b.add(new THREE.ShapeGeometry(sh, 16).translate(0, 0, zc - 0.01), curtain);
  }
  // gilt frame with a dusk landscape on the back wall (above his head through the window), console + candelabra
  const fx = kx + 0.35, fy0 = ry0 + 1.85, fy1 = ry0 + 2.85;
  const paint = basic("kingPainting", new THREE.Color(1.0, 0.95, 0.9), { map: ctex("kingLandscape", 128, 96, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 96); gr.addColorStop(0, "#8aa0c0"); gr.addColorStop(0.55, "#e8c890"); gr.addColorStop(0.56, "#5a6a3a"); gr.addColorStop(1, "#3a3a26");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 96); g.fillStyle = "#2e4a2a"; g.beginPath(); g.arc(34, 56, 16, 0, TAU); g.arc(48, 52, 12, 0, TAU); g.fill();
  }) });
  b.add(qf(V(fx - 0.5, fy0, zb + 0.03), V(fx + 0.5, fy0, zb + 0.03), V(fx + 0.5, fy1, zb + 0.03), V(fx - 0.5, fy1, zb + 0.03), V(0, 0, 1)), paint);
  for (const [a0, a1, c0, c1] of [[fx - 0.6, fx + 0.6, fy0 - 0.1, fy0], [fx - 0.6, fx + 0.6, fy1, fy1 + 0.1], [fx - 0.6, fx - 0.5, fy0, fy1], [fx + 0.5, fx + 0.6, fy0, fy1]] as const)
    b.add(boxGeo(V(a0, c0, zb), V(a1, c1, zb + 0.08)), gold);
  const cx = kx - 0.62, cz = zb + 0.35;
  b.add(boxGeo(V(cx - 0.45, ry0 + 0.85, cz - 0.25), V(cx + 0.45, ry0 + 0.92, cz + 0.25)), basic("kingConsole", new THREE.Color(0.55, 0.3, 0.16)));
  for (const lx of [-0.35, 0.35]) b.add(boxGeo(V(cx + lx - 0.03, ry0, cz - 0.03), V(cx + lx + 0.03, ry0 + 0.85, cz + 0.03)), gold);
  b.add(new THREE.CylinderGeometry(0.03, 0.08, 0.5, 8).translate(cx, ry0 + 1.17, cz), gold);
  for (const dx of [-0.18, 0, 0.18]) {
    b.add(boxGeo(V(cx + dx - 0.015, ry0 + 1.36, cz - 0.015), V(cx + dx + 0.015, ry0 + 1.52 + (dx ? 0 : 0.06), cz + 0.015)), basic("candle", new THREE.Color(1.6, 1.5, 1.3)));
    b.add(new THREE.ConeGeometry(0.025, 0.07, 6).translate(cx + dx, ry0 + 1.57 + (dx ? 0 : 0.06), cz), basic("flame", new THREE.Color(3.4, 1.7, 0.45)));
  }
  b.add(boxGeo(V(cx - 0.2, ry0 + 1.34, cz - 0.02), V(cx + 0.2, ry0 + 1.37, cz + 0.02)), gold);
  addLamp("paris", [cx, ry0 + 1.62, cz], 0.5, 3, 1, 0.7);
  // wrought-iron balconette, low (0.28 m): seen from the street below it projects onto his legs, never his waist
  const by = LOC.KING_ROOM_FLOOR, bz = F + 0.55;
  b.add(boxGeo(V(wx0 - 0.5, by - 0.18, F), V(wx1 + 0.5, by + 0.02, bz + 0.05), 1, true), C);
  b.add(boxGeo(V(wx0 - 0.45, by + 0.24, bz - 0.04), V(wx1 + 0.45, by + 0.28, bz + 0.02)), PM.iron());
  for (let x = wx0 - 0.42; x <= wx1 + 0.43; x += 0.17) b.add(boxGeo(V(x - 0.014, by, bz - 0.03), V(x + 0.014, by + 0.26, bz + 0.0)), PM.iron());
  for (const s of [-1, 1]) b.add(boxGeo(V(s < 0 ? wx0 - 0.47 : wx1 + 0.42, by, F), V(s < 0 ? wx0 - 0.42 : wx1 + 0.47, by + 0.28, bz)), PM.iron());
  addLamp("paris", [kx, ky + 0.2, F + 0.6], 1.2, 5, 0, 0);
  // the side gate: arched intrados through the 0.8 m wall, a dark passage, a dim lantern far inside
  const zg = F - 0.8, ap = archPts(ghw, 0, gys);
  for (let i = 0; i + 1 < ap.length; i++) {
    const [px, py] = ap[i], [qx, qy] = ap[i + 1], mx = (px + qx) / 2, my = (py + qy) / 2;
    const want = my > gys + 0.01 ? V(-mx, gys - my, 0) : V(-Math.sign(mx), 0, 0);
    b.add(qf(V(gx + px, D0 + py, F), V(gx + px, D0 + py, zg), V(gx + qx, D0 + qy, zg), V(gx + qx, D0 + qy, F), want, 1, 1), C);
  }
  const dark = PM.dark();
  b.add(qf(V(gx - ghw, D0, zg - 7), V(gx + ghw, D0, zg - 7), V(gx + ghw, D0 + gh, zg - 7), V(gx - ghw, D0 + gh, zg - 7), V(0, 0, 1)), dark);
  for (const s of [-1, 1]) b.add(qf(V(gx + s * ghw, D0, zg), V(gx + s * ghw, D0, zg - 7), V(gx + s * ghw, D0 + gh, zg - 7), V(gx + s * ghw, D0 + gh, zg), V(-s, 0, 0)), basic("passage", "#3b3040"));
  b.add(qf(V(gx - ghw, D0 + gh, zg), V(gx + ghw, D0 + gh, zg), V(gx + ghw, D0 + gh, zg - 7), V(gx - ghw, D0 + gh, zg - 7), V(0, -1, 0)), dark);
  b.add(qf(V(gx - ghw, D0 + 0.01, F), V(gx + ghw, D0 + 0.01, F), V(gx + ghw, D0 + 0.01, zg - 7), V(gx - ghw, D0 + 0.01, zg - 7), up), basic("passageFloor", "#5a4a50"));
  b.add(boxGeo(V(gx - 0.12, D0 + 2.6, zg - 6.9), V(gx + 0.12, D0 + 2.95, zg - 6.75)), lampLit());
  for (const s of [-1, 1]) wallLantern(b, "paris", [gx + s * (ghw + 2.0), D0 + 3.6, F + 0.45], [0, 1]); // beyond the opened leaves
  // torches in sconces along the ground floor
  for (const x of [-40, -24, 4, 40]) wallTorch(b, "paris", [x, D0 + 3.0, F + 0.4], [0, 1]);
  // slate mansard (cornice -> ridge line 4 m back), dormers, flat roof, end walls, chimneys
  const sl = lam("tuilSlate", () => ({ map: roofHD("#5f6878", true), side: THREE.DoubleSide })), yC = D0 + top + 0.55, yR = LOC.FACADE_RIDGE, zR = F - 4.5;
  b.add(qf(V(X0, yC, F + 0.3), V(X1, yC, F + 0.3), V(X1, yR, zR), V(X0, yR, zR), V(0, 1, 1), (X1 - X0) / 4, 1.6), sl);
  b.add(qf(V(X0, yR, zR), V(X1, yR, zR), V(X1, yR, F - 26), V(X0, yR, F - 26), up, (X1 - X0) / 4, 5), sl);
  for (const s of [-1, 1]) {
    const xe = s < 0 ? X0 : X1;
    b.add(qf(V(xe, D0, F), V(xe, D0, F - 26), V(xe, yC, F - 26), V(xe, yC, F), V(s, 0, 0), 6.5, 3.6), PM.wall());
    b.add(qf(V(xe, yC, zR), V(xe, yC, F - 26), V(xe, yR, F - 26), V(xe, yR, zR), V(s, 0, 0), 5.4, 1.2), PM.wall());
    b.add(tf(V(xe, yC, F + 0.3), V(xe, yC, zR), V(xe, yR, zR), V(s, 0, 0)), sl);
  }
  const cr = PM.cream();
  for (let x = X0 + 6; x < X1 - 2; x += 8) {
    if (Math.abs(x - gx) < 2 || Math.abs(x - LOC.KING_WIN[0]) < 7.5) continue; // (none under the pavilion dome)
    const zf = F - 1.3, y0 = yC + 0.6;
    b.add(boxGeo(V(x - 0.7, y0, zf - 1.5), V(x + 0.7, y0 + 1.7, zf), 1), cr);
    b.add(qf(V(x - 0.45, y0 + 0.2, zf + 0.01), V(x + 0.45, y0 + 0.2, zf + 0.01), V(x + 0.45, y0 + 1.35, zf + 0.01), V(x - 0.45, y0 + 1.35, zf + 0.01), V(0, 0, 1)), basic("dormerGlass", "#3f4866"));
    b.add(tf(V(x - 0.85, y0 + 1.7, zf + 0.05), V(x + 0.85, y0 + 1.7, zf + 0.05), V(x, y0 + 2.4, zf + 0.05), V(0, 0, 1)), cr);
  }
  tuileriesGrand(b, yC, yR);
};
/** the palace made grand: a central pavilion around the king's window (giant columns on rusticated piers, a pediment
 *  with a carved sun and statues, an imperial square dome with a lantern), a stone balustrade with urns along the
 *  roofline, wrought-iron balconies and carved hoods on every piano nobile window, lit windows with curtains here and
 *  there, tall chimneys (smoke: world.ts), lanterns on brackets. All in the painted stone + ink house style. */
const tuileriesGrand = (b: Batch, yC: number, yR: number) => {
  const F = LOC.FACADE_Z, [X0, X1] = LOC.FACADE_X, C = PM.cope(), cr = PM.cream(), I = PM.iron(), gx = LOC.SIDE_GATE[0];
  const kx = LOC.KING_WIN[0], PX0 = kx - 6, PX1 = kx + 6, gold = lam("palaceGold", () => ({ color: "#d6b04c" }));
  // -- rusticated piers + giant engaged columns on the pavilion's bay edges --
  for (const x of [PX0, kx - 2, kx + 2, PX1]) {
    for (let y = 0.6, k = 0; y < 5.55; y += 0.62, k++) b.add(boxGeo(V(x - (k % 2 ? 0.5 : 0.58), D0 + y, F), V(x + (k % 2 ? 0.5 : 0.58), D0 + y + 0.58, F + 0.3)), C);
    b.add(boxGeo(V(x - 0.5, D0 + 5.92, F), V(x + 0.5, D0 + 6.32, F + 0.55)), C);
    const CS = lam("columnStone", () => ({ color: "#e6ddc9" }));
    b.add(new THREE.CylinderGeometry(0.32, 0.37, 6.6, 20).translate(x, D0 + 6.32 + 3.3, F + 0.38), CS);
    b.add(new THREE.TorusGeometry(0.37, 0.07, 6, 20).rotateX(Math.PI / 2).translate(x, D0 + 6.4, F + 0.38), CS);
    b.add(new THREE.CylinderGeometry(0.46, 0.33, 0.35, 16).translate(x, D0 + 13.1, F + 0.38), CS);
    b.add(boxGeo(V(x - 0.55, D0 + 13.27, F), V(x + 0.55, D0 + 13.45, F + 0.85)), C);
  }
  // -- entablature, pediment with a carved sun, raking cornices, three statues --
  const yE = D0 + 13.45, pw = (PX1 - PX0) / 2 + 0.9, ph = 2.9, yP = yE + 0.95;
  b.add(boxGeo(V(PX0 - 0.9, yE, F), V(PX1 + 0.9, yP, F + 0.9), 2), C);
  const tsh = new THREE.Shape(); tsh.moveTo(-pw, 0); tsh.lineTo(pw, 0); tsh.lineTo(0, ph); tsh.closePath();
  b.add(extrude(tsh, 0.75).translate(kx, yP, F + 0.05), C);
  const ti = new THREE.Shape(), k2 = 0.8; ti.moveTo(-pw * k2, 0.18); ti.lineTo(pw * k2, 0.18); ti.lineTo(0, ph * k2); ti.closePath();
  { const g = new THREE.ShapeGeometry(ti, 4), uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + pw) / (2 * pw), uv.getY(i) / ph);
    b.add(g.translate(kx, yP, F + 0.81), lam("tympanum", () => ({ map: tympanumTex() }))); }
  const L2 = Math.hypot(pw, ph), ang = Math.atan2(ph, pw);
  for (const sd of [-1, 1]) b.add(boxGeo(V(-L2 / 2 - 0.15, -0.13, 0), V(L2 / 2 + 0.15, 0.13, 0.95)).rotateZ(-sd * ang).translate(kx + (sd * pw) / 2, yP + ph / 2 + 0.1, F), C);
  const statue = (x: number, y: number, z: number, lean: number) => {
    b.add(boxGeo(V(x - 0.32, y, z - 0.3), V(x + 0.32, y + 0.45, z + 0.3)), C);
    b.add(new THREE.LatheGeometry([[0.0, 0], [0.32, 0], [0.3, 0.5], [0.22, 1.1], [0.2, 1.45], [0.12, 1.6], [0.0, 1.62]].map(([r2, yy]) => new THREE.Vector2(r2, yy)), 12).translate(x, y + 0.45, z), cr);
    b.add(new THREE.SphereGeometry(0.16, 12, 8).translate(x, y + 2.2, z), cr);
    b.add(new THREE.CylinderGeometry(0.05, 0.06, 0.8, 6).rotateZ(lean).translate(x + Math.sin(-lean) * 0.4 + 0.15 * Math.sign(lean || 1), y + 2.2, z), cr);
  };
  statue(kx, yP + ph - 0.05, F + 0.4, 0.5); statue(kx - pw + 0.4, yP, F + 0.45, -0.6); statue(kx + pw - 0.4, yP, F + 0.45, 0.6);
  // -- imperial square dome (4 smooth faces, creased corners) with gilded corner ribs, an oeil-de-boeuf, a lantern --
  const dz = F - 6.9, dy0 = yP + 0.25, prof: [number, number][] = [[6.75, 0], [6.65, 1.2], [6.1, 3.0], [4.9, 4.8], [3.2, 6.1], [1.3, 6.8], [0.0, 7.0]];
  b.add(boxGeo(V(PX0 - 0.7, yP - 0.3, dz - 7.0), V(PX1 + 0.7, dy0, F - 0.1), 2), C);
  const domeSl = lam("domeSlate", () => ({ map: roofHD("#56607a", true), side: THREE.DoubleSide }));
  for (const [ax, az] of [[0, 1], [1, 0], [0, -1], [-1, 0]] as const) {
    const tx = -az, tz = ax, pos: number[] = [], nor: number[] = [], uv: number[] = [];
    let vAcc = 0;
    const N = (i: number) => { const a = prof[Math.max(0, i - 1)], c = prof[Math.min(prof.length - 1, i + 1)]; const dh = c[0] - a[0], dyy = c[1] - a[1], l = Math.hypot(dh, dyy) || 1; return [dyy / l, -dh / l] as const; };
    for (let i = 0; i + 1 < prof.length; i++) {
      const [h0, y0] = prof[i], [h1, y1] = prof[i + 1], [n0o, n0y] = N(i), [n1o, n1y] = N(i + 1), dv = Math.hypot(h1 - h0, y1 - y0) / 4;
      const P = (h: number, y: number, s2: number) => [kx + ax * h + tx * s2 * h, dy0 + y, dz + az * h + tz * s2 * h];
      const quadP = [[P(h0, y0, -1), n0o, n0y, 0, vAcc], [P(h0, y0, 1), n0o, n0y, (2 * h0) / 4, vAcc], [P(h1, y1, 1), n1o, n1y, (2 * h1) / 4, vAcc + dv], [P(h1, y1, -1), n1o, n1y, 0, vAcc + dv]] as const;
      for (const j of [0, 2, 1, 0, 3, 2]) { const [p, no, ny, u, v] = quadP[j]; pos.push(...p); nor.push(ax * no, ny, az * no); uv.push(u, v); }
      vAcc += dv;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    b.add(g, domeSl);
  }
  for (const [cx2, cz2] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const)
    b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(prof.map(([h, y]) => V(kx + cx2 * h, dy0 + y + 0.02, dz + cz2 * h))), 24, 0.07, 5, false), gold);
  b.add(new THREE.TorusGeometry(0.6, 0.12, 8, 20).translate(kx, dy0 + 2.6, dz + 6.3 + 0.12), C);
  b.add(new THREE.CircleGeometry(0.55, 20).translate(kx, dy0 + 2.6, dz + 6.3 + 0.1), PM.dark());
  const ly = dy0 + 6.8;
  b.add(new THREE.CylinderGeometry(0.85, 0.95, 1.6, 16).translate(kx, ly + 0.8, dz), cr);
  for (let i = 0; i < 8; i++) onCircle(b, PM.dark(), kx, dz, 0.86, (i * TAU) / 8, 0.22, 0.02, ly + 0.35, ly + 1.3);
  b.add(new THREE.SphereGeometry(1.0, 16, 8, 0, TAU, 0, Math.PI / 2).translate(kx, ly + 1.6, dz), lam("domeLeadP", () => ({ color: "#4a5672" })));
  b.add(new THREE.ConeGeometry(0.12, 1.4, 8).translate(kx, ly + 3.2, dz), gold);
  b.add(new THREE.SphereGeometry(0.2, 10, 8).translate(kx, ly + 2.55, dz), gold);
  // -- roofline balustrade with pedestals and urns (outside the pediment) --
  const yB = D0 + 14.1, zb0 = F + 0.08, zb1 = F + 0.46;
  const bal = new THREE.LatheGeometry([[0.0, 0], [0.08, 0], [0.09, 0.05], [0.06, 0.15], [0.11, 0.32], [0.06, 0.5], [0.08, 0.56], [0.0, 0.58]].map(([r2, yy]) => new THREE.Vector2(r2, yy)), 8);
  const urn = new THREE.LatheGeometry([[0.0, 0], [0.18, 0], [0.12, 0.1], [0.3, 0.35], [0.26, 0.55], [0.14, 0.62], [0.2, 0.7], [0.0, 0.85]].map(([r2, yy]) => new THREE.Vector2(r2, yy)), 12);
  for (const [a0, a1] of [[X0, PX0 - 0.9], [PX1 + 0.9, X1]] as const) {
    b.add(boxGeo(V(a0, yB, zb0), V(a1, yB + 0.16, zb1), 2), C);
    b.add(boxGeo(V(a0, yB + 0.74, zb0 - 0.03), V(a1, yB + 0.88, zb1 + 0.03), 2), C);
    for (let x = a0 + 0.2; x < a1 - 0.1; x += 0.34) if (Math.abs(((x - X0) % 4 + 4) % 4) > 0.35 && Math.abs(((x - X0) % 4 + 4) % 4 - 4) > 0.35) b.add(bal.clone().translate(x, yB + 0.16, (zb0 + zb1) / 2), C);
    for (let x = Math.ceil(a0 / 4) * 4; x <= a1 + 0.01; x += 4) {
      b.add(boxGeo(V(x - 0.3, yB, zb0 - 0.04), V(x + 0.3, yB + 0.98, zb1 + 0.04)), C);
      if (((x / 4) % 2 + 2) % 2 === 0) b.add(urn.clone().translate(x, yB + 0.98, (zb0 + zb1) / 2), C);
    }
  }
  // -- piano nobile: wrought-iron balconies + carved hoods on every window (the king's has its own) --
  const hood = new THREE.Shape(); hood.moveTo(-1.2, 0); hood.lineTo(1.2, 0); hood.lineTo(0, 0.7); hood.closePath();
  for (let c = X0 + 2; c < X1; c += 4) { // (the gate bay's two windows sit on the same 4 m rhythm)
    if (Math.abs(c - kx) < 0.1) continue;
    b.add(boxGeo(V(c - 1.05, D0 + 5.6, F), V(c + 1.05, D0 + 5.8, F + 0.42), 1, true), C);
    b.add(boxGeo(V(c - 1.0, D0 + 6.28, F + 0.36), V(c + 1.0, D0 + 6.33, F + 0.41)), I);
    for (let x = c - 0.95; x <= c + 0.96; x += 0.19) b.add(boxGeo(V(x - 0.012, D0 + 5.8, F + 0.37), V(x + 0.012, D0 + 6.29, F + 0.4)), I);
    for (const sd of [-1, 1]) b.add(boxGeo(V(c + sd * 1.0 - 0.02, D0 + 5.8, F), V(c + sd * 1.0 + 0.02, D0 + 6.33, F + 0.41)), I);
    b.add(extrude(hood, 0.22).translate(c, D0 + 8.86, F), C);
    b.add(boxGeo(V(c - 1.25, D0 + 8.74, F), V(c + 1.25, D0 + 8.86, F + 0.28)), C);
  }
  // -- the king's window: carved architrave, a big hood crowned with a gilt crown, consoles, warm spill, a chandelier --
  const [kw, kh] = LOC.KING_WIN_WH, ky = LOC.KING_WIN[1], wx0 = kx - kw / 2, wx1 = kx + kw / 2, wy0 = ky - kh / 2, wy1 = ky + kh / 2;
  for (const [a0, a1, c0, c1] of [[wx0 - 0.26, wx0, wy0, wy1 + 0.26], [wx1, wx1 + 0.26, wy0, wy1 + 0.26], [wx0 - 0.26, wx1 + 0.26, wy1, wy1 + 0.26]] as const) b.add(boxGeo(V(a0, c0, F), V(a1, c1, F + 0.16)), C);
  const kh2 = new THREE.Shape(); kh2.moveTo(-1.45, 0); kh2.quadraticCurveTo(0, 0.95, 1.45, 0); kh2.closePath();
  b.add(extrude(kh2, 0.3).translate(kx, wy1 + 0.38, F), C);
  b.add(boxGeo(V(kx - 1.5, wy1 + 0.26, F), V(kx + 1.5, wy1 + 0.38, F + 0.36)), C);
  { // the royal arms on the hood: an oval azure shield with three gold lilies (painted), a gilt crown on top (3D)
    const ay = wy1 + 1.05, az = F + 0.34;
    b.add(new THREE.PlaneGeometry(0.95, 0.95).translate(kx, ay, az), lam("royalArms", () => ({ map: royalArmsTex(), alphaTest: 0.4, transparent: false })));
    const cy = ay + 0.52;
    b.add(boxGeo(V(kx - 0.3, cy, az - 0.06), V(kx + 0.3, cy + 0.1, az + 0.06)), gold);                           // circlet
    for (const dx of [-0.25, -0.125, 0, 0.125, 0.25]) b.add(new THREE.ConeGeometry(0.045, dx === 0 ? 0.26 : 0.18, 6).translate(kx + dx, cy + 0.1 + (dx === 0 ? 0.13 : 0.09), az), gold); // points
    b.add(new THREE.SphereGeometry(0.05, 8, 6).translate(kx, cy + 0.4, az), gold);                             // orb
    for (const dx of [-0.2, 0.2]) b.add(new THREE.SphereGeometry(0.035, 8, 6).translate(kx + dx, cy + 0.05, az + 0.07), lam("crownGem", () => ({ color: "#b8303a" })));
  }
  for (const sd of [-1, 1]) b.add(boxGeo(V(kx + sd * 1.0 - 0.12, LOC.KING_ROOM_FLOOR - 0.6, F), V(kx + sd * 1.0 + 0.12, LOC.KING_ROOM_FLOOR - 0.18, F + 0.5)), C); // consoles
  addLamp("paris", [kx, D0 + 5.9, F + 0.9], 0.9, 4.5, 0, 0); // warm spill on the stone around the window
  { // chandelier just inside, hanging into the top of the opening
    const cy = LOC.KING_ROOM_FLOOR + 2.75, cz = F - 1.3, cx = kx - 0.25, cg = basic("kingGold", new THREE.Color(1.05, 0.74, 0.28));
    b.add(new THREE.TorusGeometry(0.26, 0.025, 6, 20).rotateX(Math.PI / 2).translate(cx, cy, cz), cg);
    b.add(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 4).translate(cx, cy + 0.4, cz), cg);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; b.add(new THREE.ConeGeometry(0.02, 0.06, 5).translate(cx + Math.cos(a) * 0.26, cy + 0.07, cz + Math.sin(a) * 0.26), basic("flame", new THREE.Color(3.4, 1.7, 0.45))); }
    addLamp("paris", [cx, cy + 0.05, cz], 0.6, 3, 1, 0.8);
  }
  // -- lit windows here and there (warm, curtains), dimmer than the king's --
  const litW = (c: number, y0: number, w: number, h: number, arch: boolean, tint: string, k: number, pool: boolean) => {
    b.add(qf(V(c - w / 2, y0, F + 0.012), V(c + w / 2, y0, F + 0.012), V(c + w / 2, y0 + h, F + 0.012), V(c - w / 2, y0 + h, F + 0.012), V(0, 0, 1)),
      basic("litWin" + (arch ? "A" : "R") + tint + k, new THREE.Color(k, k * 0.92, k * 0.85), { map: litWindowTex(arch, tint), transparent: true }));
    if (pool) addLamp("paris", [c, y0 + h * 0.5, F + 0.8], 0.45, 3.5, 0, 0);
  };
  for (const [c, tint, k] of [[-30, "#8a2c36", 1.2], [-18, "#7a5a2a", 0.95], [10, "#8a2c36", 1.1], [18, "#6a3040", 0.85], [34, "#7a5a2a", 1.2], [-42, "#8a2c36", 0.8]] as const) litW(c, D0 + 5.8, 1.6, 2.8, false, tint, k, true);
  for (const [c, tint, k] of [[-22, "#6a4a2a", 0.9], [-14, "#8a2c36", 0.75], [2, "#6a4a2a", 0.85], [14, "#6a4a2a", 1.0], [30, "#8a2c36", 0.8]] as const) litW(c, D0 + 11.4, 1.0, 1.3, false, tint, k, false);
  for (const [c, tint, k] of [[-26, "#6a4a2a", 1.0], [6, "#7a5a2a", 0.9], [38, "#8a2c36", 1.0]] as const) litW(c, D0 + 0.6, 1.6, 4.0, true, tint, k, true);
  // -- tall chimney stacks with caps and pots (their smoke: world.ts), registered first so they always smoke --
  for (const x of [-42, -30, -18, 6, 18, 30, 42]) {
    b.add(boxGeo(V(x - 0.9, yR - 0.5, F - 12.4), V(x + 0.9, yR + 3.6, F - 10.6), 2), PM.wall());
    b.add(boxGeo(V(x - 1.05, yR + 3.6, F - 12.55), V(x + 1.05, yR + 3.85, F - 10.45)), C);
    for (const dx of [-0.4, 0.4]) b.add(new THREE.CylinderGeometry(0.15, 0.18, 0.5, 10).translate(x + dx, yR + 4.1, F - 11.5), lam("chimPot", () => ({ color: "#b8684a" })));
    chimneys.unshift([x, yR + 4.6, F - 11.5]);
  }
  void yC;
  // -- decorative lanterns on brackets between the ground-floor bays, flanking the pavilion --
  for (const x of [-36, -28, -20, 8, 16, 36, 44, PX0 - 0.75, PX1 + 0.75]) wallLantern(b, "paris", [x, D0 + 3.7, F + 0.5], [0, 1], 1.0);
};
/** the two oak leaves of the side gate, hinged on the facade face at the opening's edges; they swing OUT and fold back
 *  flat against the facade (168 deg), clearing the whole 3 m opening; pose with poseGate (0 shut .. 1 open) */
export const buildGateLeaves = () => {
  const gx = LOC.SIDE_GATE[0], [gw, gh] = LOC.SIDE_GATE_WH, hw = gw / 2, ys = gh - hw, z = LOC.FACADE_Z;
  const leaf = (s: number) => {
    const p = new THREE.Group(), lb = new Batch(), sh = new THREE.Shape(), r = hw - 0.04;
    sh.moveTo(0, 0); sh.lineTo(-s * (hw - 0.02), 0); sh.lineTo(-s * (hw - 0.02), ys + r);
    for (let i = 1; i <= 12; i++) { const a = Math.PI / 2 - (Math.PI / 2) * (i / 12); sh.lineTo(-s * hw + s * r * Math.cos(a), ys + r * Math.sin(a)); }
    sh.lineTo(0, 0);
    lb.add(extrude(sh, 0.12).translate(0, 0, -0.12), PM.oak()); // shut: fills the opening just behind the facade face
    for (const y of [0.7, 2.0, 3.2]) for (const zz of [0, -0.15]) lb.add(boxGeo(V(Math.min(0, -s * 1.4), y, zz), V(Math.max(0, -s * 1.4), y + 0.1, zz + 0.03)), PM.iron());
    lb.build(p);
    p.position.set(gx + s * hw, D0, z);
    return p;
  };
  return { right: leaf(1), left: leaf(-1) };
};
export const poseGate = (d: { right: THREE.Group; left: THREE.Group }, open: number) => {
  const a = ((168 * Math.PI) / 180) * open;
  d.right.rotation.y = a; d.left.rotation.y = -a;
};

/** the inn's oak door: one arched leaf hinged on the doorway's west jamb (on the facade face), swinging OUT into the
 *  yard; poseInnDoor(open 0..1) -> up to 105 deg (story: opens 826-840 before Drouet steps out, then stays open) */
export const buildInnDoor = () => {
  const p = new THREE.Group(), lb = new Batch(), sh = new THREE.Shape(), w = 1.08, ys = 1.55 - 0.2, rA = 0.54;
  sh.moveTo(0, 0); sh.lineTo(w, 0); sh.lineTo(w, ys);
  for (let i = 1; i <= 16; i++) { const a = (Math.PI * i) / 16; sh.lineTo(w / 2 + rA * Math.cos(a), ys + rA * Math.sin(a)); }
  sh.lineTo(0, 0);
  lb.add(extrude(sh, 0.07).translate(0, 0, -0.08), PM.oak());
  for (const y of [0.35, 1.25]) for (const zz of [0, -0.11]) lb.add(boxGeo(V(0, y, zz - 0.0), V(0.75, y + 0.07, zz + 0.02)), PM.iron());
  lb.add(new THREE.TorusGeometry(0.06, 0.012, 6, 16).translate(w - 0.18, 0.95, 0.02), PM.iron());
  lb.build(p);
  p.position.set(LOC.INN_DOOR[0] - 0.54, D0 + 0.2, LOC.INN_FRONT_Z);
  p.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return p;
};
/** a soft contact-shadow decal (unit plane on the ground, NOINK) for world.ts to put under horses and riders */
export const makeBlob = () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), AOM.blob()); m.layers.set(3); m.renderOrder = 0.6; return m; };
export const poseInnDoor = (d: THREE.Group, open: number) => { d.rotation.y = -((105 * Math.PI) / 180) * open; };

// ---------------- the berline (COACH contract, coach-local x = fwd, y = up, -z = LEFT = the door side) ----------------
const CW = COACH.bodyW / 2;
/** window + door geometry in coach-local [fwd, up, left] (the passengers' anchor) */
export const BERLINE = {
  door: { fwd: [-0.62, 0.62] as [number, number], up: [1.04, 2.62] as [number, number], hingeFwd: 0.62, openRad: 1.75 },
  win: { fwd: [-0.42, 0.42] as [number, number], up: [1.68, 2.42] as [number, number], left: CW + 0.03 },
  /** the far (right-side) window: larger, open onto the yard (the backdrop of the king's profile) */
  far: { fwd: [-0.58, 0.58] as [number, number], up: [1.5, 2.66] as [number, number] },
  /** coach-local pole + swingle bars (the wheelers' bar is the splinter bar); horse attachments are horse-local (HITCH) */
  poleUp: 0.85, poleFwd: [COACH.axleFwd[0] + 0.3, COACH.axleFwd[0] + COACH.poleLen] as [number, number],
  barFwd: COACH.teamFwd.map((t) => t - COACH.horseLen / 2 - 0.25) as number[], barHalf: 0.95,
};
/** horse-local trace attachment (relative to HorsePose.pos/dir): collar both sides, height; the trace runs back to the
 *  swingle bar at BERLINE.barFwd[pair] (coach-local, on the pole, lateral = the horse's teamLat +- lat) */
export const HITCH = { collarFwd: 0.72, collarUp: 1.18, lat: 0.24, barUp: 0.9 };
/** world anchor of the coach's LEFT window (moves with the door): centre, outward normal, along (fwd), up, size, plus the
 *  seated king's head (COACH_LOCAL.KING_SEAT). cast.ts places the passenger cards behind `center` (inside the body). */
export const berlineWindowAt = (c: CoachPose) => {
  const a = BERLINE.door.openRad * c.door, h = BERLINE.door.hingeFwd, ca = Math.cos(a), sa = Math.sin(a);
  // window centre in hinge space (fwd from the hinge = -0.62, out = 0.03), rotated outward about the hinge
  const df = -h, dl = BERLINE.win.left - CW; // window centre relative to the hinge (shut)
  const fwd = h + df * ca + dl * sa, left = CW - df * sa + dl * ca;
  const center = coachLocal(c, [fwd, (BERLINE.win.up[0] + BERLINE.win.up[1]) / 2, left]);
  const nL: V3 = [sa, 0, ca]; // outward normal in [fwd, up, left]
  const normal: V3 = [c.dir[0] * nL[0] + c.left[0] * nL[2], 0, c.dir[2] * nL[0] + c.left[2] * nL[2]];
  const along: V3 = [c.dir[0] * ca - c.left[0] * sa, 0, c.dir[2] * ca - c.left[2] * sa];
  return { center, normal, along, up: [0, 1, 0] as V3, w: BERLINE.win.fwd[1] - BERLINE.win.fwd[0], h: BERLINE.win.up[1] - BERLINE.win.up[0],
    seat: coachLocal(c, COACH_LOCAL.KING_SEAT) };
};
const outline = () => {
  const P: [number, number][] = [[-1.36, 1.12], [-1.5, 1.5], [-1.47, 2.42], [-1.38, 2.7], [-1.1, 2.78], [0, 2.8], [1.1, 2.78], [1.38, 2.7], [1.47, 2.42],
    [1.5, 1.5], [1.36, 1.12], [0.75, 0.98], [0, 0.95], [-0.75, 0.98]];
  return new THREE.CatmullRomCurve3(P.map(([x, y]) => V(x, y, 0)), true, "centripetal").getSpacedPoints(72).slice(0, 72);
};
const rrPath = (p: THREE.Path, x0: number, x1: number, y0: number, y1: number, k: number) => {
  p.moveTo(x0, y0); p.lineTo(x1, y0); p.lineTo(x1, y1 - k); p.quadraticCurveTo(x1, y1, x1 - k, y1); p.lineTo(x0 + k, y1); p.quadraticCurveTo(x0, y1, x0, y1 - k); p.closePath();
  return p;
};
/** berline wheel (yellow felloe, iron tyre, 12 / 10 spokes), axis local z */
const coachWheel = (r: number, n: number) => {
  const g = new THREE.Group(), wb = new Batch(), Y = MAT.yellow();
  wb.add(new THREE.TorusGeometry(r - 0.05, 0.055, 8, 40), Y);
  wb.add(new THREE.TorusGeometry(r - 0.005, 0.03, 6, 40), PM.iron());
  wb.add(new THREE.CylinderGeometry(0.11, 0.13, 0.26, 14).rotateX(Math.PI / 2), Y);
  wb.add(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 10).rotateX(Math.PI / 2), PM.iron());
  for (let i = 0; i < n; i++) wb.add(boxGeo(V(-0.024, 0.1, -0.024), V(0.024, r - 0.08, 0.024)).rotateZ((i * TAU) / n), Y);
  wb.build(g);
  return g;
};
export type Berline = {
  group: THREE.Group; door: THREE.Group; wheels: THREE.Group[]; steer: THREE.Group; glass: THREE.Mesh[];
  lampOn: THREE.Material; lampOff: THREE.Material; traces: THREE.Mesh[]; halos: THREE.Sprite[]; pole: THREE.Group; bars: THREE.Group[];
};
export const buildBerline = (): Berline => {
  const group = new THREE.Group(), b = new Batch(), O = outline(), L = MAT.lacquer(), D = MAT.lacquerDark(), G = MAT.gold();
  // skin around the profile (smooth normals), z = -CW .. CW
  {
    const pos: number[] = [], nor: number[] = [], uv: number[] = [], n = O.length;
    const nrm = (i: number) => { const a = O[(i - 1 + n) % n], c = O[(i + 1) % n]; const t = V(c.x - a.x, c.y - a.y, 0).normalize(); return V(t.y, -t.x, 0); };
    // winding of the outline: make the normal point outward (centroid test)
    const cx = O.reduce((s, p) => s + p.x, 0) / n, cy = O.reduce((s, p) => s + p.y, 0) / n, sgn = nrm(0).dot(V(O[0].x - cx, O[0].y - cy, 0)) > 0 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      const a = O[i], c = O[(i + 1) % n], na = nrm(i).multiplyScalar(sgn), nc = nrm(i + 1).multiplyScalar(sgn);
      const quadV = [[a, -CW, na], [c, -CW, nc], [c, CW, nc], [a, -CW, na], [c, CW, nc], [a, CW, na]] as const;
      // wind every triangle so its geometric face agrees with the outward normal (a reversed skin is back-facing, and the
      // DoubleSide lacquer then flipped its normal inward: a sunlit cyan patch on the shaded front panel, r5 #10)
      for (const t of [[0, 1, 2], [3, 4, 5]]) {
        const [A, B, C2] = t.map((j) => quadV[j]), pa = V(A[0].x, A[0].y, A[1]), pb = V(B[0].x, B[0].y, B[1]), pc = V(C2[0].x, C2[0].y, C2[1]);
        const fn = pb.clone().sub(pa).cross(pc.clone().sub(pa)), ok = fn.dot(A[2]) >= 0;
        for (const [p, z, nn] of ok ? [A, B, C2] : [A, C2, B]) { pos.push(p.x, p.y, z); nor.push(nn.x, nn.y, nn.z); uv.push(p.x, z); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    b.add(g, L);
  }
  // side panels: left with the door opening, right with a window (dark glass behind)
  const shape = () => { const s = new THREE.Shape(); O.forEach((p, i) => (i ? s.lineTo(p.x, p.y) : s.moveTo(p.x, p.y))); s.closePath(); return s; };
  const left = shape(); left.holes.push(rrPath(new THREE.Path(), BERLINE.door.fwd[0], BERLINE.door.fwd[1], BERLINE.door.up[0], BERLINE.door.up[1], 0.12));
  b.add(new THREE.ShapeGeometry(left, 16).scale(1, 1, -1).translate(0, 0, -CW), L);
  const right = shape(); right.holes.push(rrPath(new THREE.Path(), BERLINE.far.fwd[0], BERLINE.far.fwd[1], BERLINE.far.up[0], BERLINE.far.up[1], 0.08));
  b.add(new THREE.ShapeGeometry(right, 16).translate(0, 0, CW), L);
  // gold piping around both side panels + the beltline, a dark lower moulding
  for (const s of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3(O.map((p) => V(p.x, p.y, s * (CW + 0.005))), true);
    b.add(new THREE.TubeGeometry(curve, 96, 0.022, 5, true), G);
    for (const [a0, a1] of s > 0 ? [[-1.45, 1.45]] : [[-1.45, BERLINE.door.fwd[0] - 0.02], [BERLINE.door.fwd[1] + 0.02, 1.45]]) b.add(boxGeo(V(a0, 1.52, s * CW - 0.025), V(a1, 1.57, s * CW + 0.025)), G);
  }
  // interior: dark plum box, velvet benches front and back
  // inner walls seen through the door window (front / back / roof / floor / far side); the far (right) wall keeps the
  // window open, so the king's profile reads dark against the bright yard behind the coach
  {
    const I = MAT.inside(), x0 = -1.35, x1 = 1.35, y0 = 1.03, y1 = 2.73, z0 = -0.93, z1 = 0.93;
    b.add(qf(V(x0, y0, z0), V(x0, y0, z1), V(x0, y1, z1), V(x0, y1, z0), V(1, 0, 0)), I);
    b.add(qf(V(x1, y0, z1), V(x1, y0, z0), V(x1, y1, z0), V(x1, y1, z1), V(-1, 0, 0)), I);
    b.add(qf(V(x0, y1, z0), V(x1, y1, z0), V(x1, y1, z1), V(x0, y1, z1), V(0, -1, 0)), I);
    b.add(qf(V(x0, y0, z0), V(x1, y0, z0), V(x1, y0, z1), V(x0, y0, z1), V(0, 1, 0)), I);
    const fw = new THREE.Shape(); fw.moveTo(x0, y0); fw.lineTo(x1, y0); fw.lineTo(x1, y1); fw.lineTo(x0, y1); fw.closePath();
    const [ff0, ff1] = BERLINE.far.fwd, [fu0, fu1] = BERLINE.far.up;
    fw.holes.push(rrPath(new THREE.Path(), ff0, ff1, fu0, Math.min(fu1, y1 - 0.02), 0.08));
    b.add(new THREE.ShapeGeometry(fw, 12).scale(1, 1, -1).translate(0, 0, z1), I);
    for (const s2 of [-1, 1]) b.add(qf(V(s2 * ff1, fu0, z1), V(s2 * ff1, fu0, CW), V(s2 * ff1, fu1, CW), V(s2 * ff1, fu1, z1), V(-s2, 0, 0)), I); // reveal
  }
  for (const x of [-1.05, 1.05]) b.add(boxGeo(V(x - 0.3, 1.0, -0.9), V(x + 0.3, 1.48, 0.9)), MAT.velvet());
  // roof rack + luggage under canvas
  b.add(boxGeo(V(-1.15, 2.78, -0.85), V(1.15, 3.05, 0.85), 1), MAT.canvas());
  // the rack: a thin top rail on short posts (it was a 0.3 m solid iron sheet that read as a black band at night)
  const RK = lam("rackIron", () => ({ color: "#767a84" })), ry = COACH.roofRack;
  for (const s2 of [-1, 1]) {
    b.add(boxGeo(V(-1.2, ry - 0.04, s2 * 0.92 - 0.02), V(1.2, ry, s2 * 0.92 + 0.02)), RK);
    b.add(boxGeo(V(s2 * 1.2 - 0.02, ry - 0.04, -0.92), V(s2 * 1.2 + 0.02, ry, 0.92)), RK);
    for (let x = -1.2; x <= 1.21; x += 0.4) b.add(boxGeo(V(x - 0.015, 2.78, s2 * 0.92 - 0.015), V(x + 0.015, ry, s2 * 0.92 + 0.015)), RK);
  }
  // undercarriage: perch, rear axle, C-springs + straps
  const Y = MAT.yellow(), [fa, ra] = COACH.axleFwd, [wrF, wrR] = COACH.wheelR;
  b.add(boxGeo(V(ra, 0.72, -0.07), V(fa, 0.86, 0.07)), Y);
  b.add(boxGeo(V(ra - 0.07, wrR - 0.06, -COACH.track / 2), V(ra + 0.07, wrR + 0.06, COACH.track / 2)), PM.iron());
  for (const [x, sx] of [[-1.62, 1], [1.62, -1]] as const) for (const z of [-0.7, 0.7]) {
    b.add(new THREE.TorusGeometry(0.3, 0.04, 6, 16, Math.PI * 1.25).rotateZ(sx > 0 ? -Math.PI * 0.62 : Math.PI * 0.38).translate(x, 1.05, z), D);
    b.add(boxGeo(V(Math.min(x, x + sx * 0.45) - 0.02, 1.0, z - 0.04), V(Math.max(x, x + sx * 0.45) + 0.02, 1.06, z + 0.04)), D);
  }
  // coachman's box on an iron frame over the front wheels, footboard
  const [bf, bu] = [COACH.boxFwd, COACH.boxUp];
  b.add(boxGeo(V(bf - 0.25, bu - 0.12, -0.75), V(bf + 0.22, bu + 0.02, 0.75), 1, true), MAT.velvet());
  b.add(boxGeo(V(bf - 0.3, bu - 0.6, -0.72), V(bf + 0.25, bu - 0.12, 0.72), 1, true), D);
  for (const z of [-0.6, 0.6]) b.add(boxGeo(V(1.4, 1.0, z - 0.04), V(bf + 0.05, bu - 0.55, z + 0.04)).rotateZ(0), PM.iron());
  b.add(boxGeo(V(bf + 0.3, 1.62, -0.7), V(bf + 0.62, 1.7, 0.7), 1, true), PM.woodDark());
  for (const z of [-0.6, 0.6]) b.add(boxGeo(V(bf + 0.2, 1.62, z - 0.03), V(bf + 0.34, bu - 0.55, z + 0.03)), PM.iron());
  // lantern brackets
  for (const [lf, lu, ll] of COACH_LOCAL.LANTERNS) {
    const z = -ll;
    b.add(boxGeo(V(1.42, lu - 0.25, Math.min(z, Math.sign(z) * CW) - 0.02), V(lf + 0.02, lu - 0.21, Math.max(z, Math.sign(z) * CW) + 0.02)), PM.iron());
    b.add(new THREE.ConeGeometry(0.14, 0.16, 4).rotateY(Math.PI / 4).translate(lf, lu + 0.24, z), PM.iron());
    b.add(boxGeo(V(lf - 0.1, lu - 0.21, z - 0.1), V(lf + 0.1, lu - 0.17, z + 0.1)), PM.iron());
  }
  b.build(group);
  // lantern glass (switched per frame), halos
  const lampOn = basic("coachLampOn", new THREE.Color(3.2, 2.25, 1.05)), lampOff = lam("coachLampOff", () => ({ color: "#d8c89c" }));
  const glass: THREE.Mesh[] = [], halosOut: THREE.Sprite[] = [];
  for (const [lf, lu, ll] of COACH_LOCAL.LANTERNS) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.26, 0.15), lampOn);
    m.position.set(lf, lu, -ll); group.add(m); glass.push(m);
    const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(1.0, 0.62, 0.3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    h.position.set(lf, lu, -ll); h.scale.setScalar(1.3); h.layers.set(3); group.add(h); halosOut.push(h);
  }
  // door: hinge at the front edge, panel back to fwd -0.62, window hole (lowered glass), gold moulding, handle
  const door = new THREE.Group(), db = new Batch(), [d0, d1] = BERLINE.door.fwd, [u0, u1] = BERLINE.door.up, H = BERLINE.door.hingeFwd;
  const ds = rrPath(new THREE.Shape(), d0 - H, d1 - H, u0, u1, 0.12) as THREE.Shape;
  ds.holes.push(rrPath(new THREE.Path(), BERLINE.win.fwd[0] - H, BERLINE.win.fwd[1] - H, BERLINE.win.up[0], BERLINE.win.up[1], 0.08));
  db.add(new THREE.ExtrudeGeometry(ds, { depth: 0.05, bevelEnabled: false, curveSegments: 8 }).translate(0, 0, -0.05).scale(1, 1, 1), L);
  db.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rrPath(new THREE.Path(), d0 - H + 0.08, d1 - H - 0.08, u0 + 0.08, 1.55, 0.06).getSpacedPoints(40).map((p) => V(p.x, p.y, -0.055)), true), 60, 0.016, 4, true), G);
  db.add(boxGeo(V(d0 - H + 0.1, 1.5, -0.1), V(d0 - H + 0.22, 1.54, -0.05)), G);
  db.build(door);
  door.position.set(H, 0, -CW);
  group.add(door);
  // wheels + the steering front axle (fifth wheel) carrying the pole and the swingle bars
  const wheels: THREE.Group[] = [];
  const steer = new THREE.Group(); steer.position.set(fa, 0, 0); group.add(steer);
  for (const [x, r, n, par] of [[0, wrF, 10, steer], [0, wrF, 10, steer], [ra, wrR, 12, group], [ra, wrR, 12, group]] as const) {
    const w = coachWheel(r, n), i = wheels.length;
    w.position.set(x, r, i % 2 ? COACH.track / 2 : -COACH.track / 2); par.add(w); wheels.push(w);
  }
  const sb = new Batch(), WD = PM.woodDark();
  sb.add(boxGeo(V(-0.07, wrF - 0.06, -COACH.track / 2), V(0.07, wrF + 0.06, COACH.track / 2)), PM.iron());
  sb.add(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 20).translate(0, 0.9, 0), Y);
  const [, p1] = BERLINE.poleFwd;
  sb.build(steer);
  // the pole pivots on the axle (its tip drops to the cobbles while the team is away); each swingle bar is its own
  // group so it can be laid on the ground while its pair is unhitched
  const pole = new THREE.Group(), pb = new Batch();
  pb.add(boxGeo(V(0, -0.05, -0.05), V(p1 - fa, 0.05, 0.05)), WD);
  pb.add(new THREE.SphereGeometry(0.07, 8, 6).translate(p1 - fa, 0, 0), PM.iron());
  pb.build(pole); pole.position.set(0, BERLINE.poleUp, 0); steer.add(pole);
  const bars: THREE.Group[] = [];
  for (const bfw of BERLINE.barFwd) {
    const half = bfw < 3 ? COACH.teamLat + 0.4 : BERLINE.barHalf, g = new THREE.Group(), bb = new Batch();
    bb.add(boxGeo(V(-0.04, -0.04, -half), V(0.04, 0.04, half)), WD); bb.build(g);
    g.position.set(bfw - fa, BERLINE.poleUp, 0); steer.add(g); bars.push(g);
  }
  // traces: 12 thin straps (2 per horse), posed per frame by poseBerline (hidden while the team is unhitched)
  const traces: THREE.Mesh[] = [];
  const tg = new THREE.BoxGeometry(1, 0.035, 0.05).translate(0.5, 0, 0);
  for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(tg, lam("trace", () => ({ color: "#3b2a22" }))); m.castShadow = false; m.receiveShadow = true; traces.push(m); }
  group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.matrixAutoUpdate = true; } });
  { // soft contact shadow under the body + one under each wheel (child of the coach: follows it)
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.0).rotateX(-Math.PI / 2).translate(0, 0.03, 0), AOM.blob());
    sh.layers.set(3); sh.renderOrder = 0.6; group.add(sh);
    for (const [x, zz, r2] of [[COACH.axleFwd[0], -COACH.track / 2, 0.5], [COACH.axleFwd[0], COACH.track / 2, 0.5], [COACH.axleFwd[1], -COACH.track / 2, 0.6], [COACH.axleFwd[1], COACH.track / 2, 0.6]] as const) {
      for (const [sx, sz, yy] of [[2.2, 0.9, 0.032], [1.1, 0.5, 0.034]] as const) { // a soft spread + a dark core right at the tyre
        const w = new THREE.Mesh(new THREE.PlaneGeometry(r2 * sx, r2 * sz).rotateX(-Math.PI / 2).translate(x, yy, zz), AOM.blob());
        w.layers.set(3); w.renderOrder = 0.6; group.add(w);
      }
    }
  }
  for (const h of halosOut) h.castShadow = false;
  return { group, door, wheels, steer, glass, lampOn, lampOff, traces, halos: halosOut, pole, bars };
};
const _tv = new THREE.Vector3(), _tw = new THREE.Vector3();
/** pose the berline from coachAt: position/yaw, wheel roll, door, lanterns, front-axle steer toward the wheelers,
 *  traces from each horse's collar back to its swingle bar. horses = teamAt (empty or hitched = false: no traces) */
/** empty: per pair (wheelers, middle, leaders) 0 hitched .. 1 away; the pole tip drops with the wheelers, each bar lies
 *  on the cobbles while its pair is away */
export const poseBerline = (B: Berline, c: CoachPose, horses: { pos: V3; dir: V3; pair: number; side: number }[], hitched: boolean | boolean[], empty: number[] = [0, 0, 0]) => {
  const PL = BERLINE.poleFwd[1] - COACH.axleFwd[0], drop = Math.asin((BERLINE.poleUp - 0.07) / PL);
  B.pole.rotation.z = -drop * empty[0];
  B.bars.forEach((g, i) => {
    const onPole = BERLINE.poleUp - g.position.x * Math.sin(drop * empty[0]), e = Math.max(empty[i] ?? 0, empty[0]);
    g.position.y = onPole + (0.05 - onPole) * e; g.rotation.y = 0.18 * e * (i % 2 ? 1 : -1);
  });
  B.group.visible = c.visible;
  B.group.position.set(...c.pos); B.group.rotation.y = c.yaw;
  const [wf, wr] = c.wheel;
  B.wheels.forEach((w, i) => { w.rotation.z = -(i < 2 ? wf : wr); });
  B.door.rotation.y = -BERLINE.door.openRad * c.door;
  for (const g of B.glass) g.material = c.lanterns ? B.lampOn : B.lampOff;
  for (const h of B.halos) h.visible = c.lanterns;
  // steer: angle between the coach heading and the wheelers' heading (clamped)
  let steer = 0;
  const w0 = horses.find((h) => h.pair === 0);
  if (w0) { const a = Math.atan2(-w0.dir[2], w0.dir[0]) - c.yaw; steer = Math.max(-0.6, Math.min(0.6, Math.atan2(Math.sin(a), Math.cos(a)))); }
  B.steer.rotation.y = steer;
  B.group.updateMatrixWorld(true);
  let k = 0;
  for (const h of horses) for (const s of [-1, 1]) {
    const m = B.traces[k++]; if (!m) continue;
    m.visible = (Array.isArray(hitched) ? hitched[h.pair] : hitched) && c.visible;
    if (!m.visible) continue;
    const lx = h.dir[2], lz = -h.dir[0]; // horse-left
    _tv.set(h.pos[0] + h.dir[0] * HITCH.collarFwd + lx * HITCH.lat * s, D0 + HITCH.collarUp, h.pos[2] + h.dir[2] * HITCH.collarFwd + lz * HITCH.lat * s);
    // bar point in steer space: x = barFwd - axle, z = -(side lateral) (left = -z)
    const lat = COACH.teamLat * h.side + HITCH.lat * s;
    _tw.set(BERLINE.barFwd[h.pair] - COACH.axleFwd[0], BERLINE.poleUp + 0.02, -lat).applyMatrix4(B.steer.matrixWorld);
    const d = _tv.clone().sub(_tw), L = d.length();
    m.position.copy(_tw); m.scale.set(L, 1, 1);
    m.quaternion.setFromUnitVectors(V(1, 0, 0), d.divideScalar(L || 1));
  }
  for (; k < B.traces.length; k++) B.traces[k].visible = false;
};

// ---------------- the Varennes bridge cart (bridgeCartAt: shafts along local +x) ----------------
export type Cart = { group: THREE.Group; wheels: THREE.Group[]; barrels: THREE.Group[] };
export const buildBridgeCart = (): Cart => {
  const group = new THREE.Group(), cb = new Batch();
  cb.add(boxGeo(V(-1.25, 0.62, -0.62), V(1.25, 0.74, 0.62), 1, true), PM.oak());
  for (const s of [-1, 1]) {
    cb.add(boxGeo(V(-1.25, 0.74, s > 0 ? 0.56 : -0.62), V(1.25, 1.02, s > 0 ? 0.62 : -0.56)), PM.wood());
    cb.add(boxGeo(V(-1.2, 0.5, s * 0.42 - 0.05), V(1.2, 0.62, s * 0.42 + 0.05)), PM.woodDark());
    cb.add(boxGeo(V(1.25, 0.6, s * 0.42 - 0.045), V(2.9, 0.7, s * 0.42 + 0.045)), PM.wood());
  }
  for (const s of [-1, 1]) cb.add(boxGeo(V(s * 1.25 - 0.03, 0.74, -0.62), V(s * 1.25 + 0.03, 1.02, 0.62)), PM.wood());
  cb.add(boxGeo(V(-0.06, 0.52, -0.82), V(0.06, 0.62, 0.82)), PM.iron());
  cb.add(boxGeo(V(-1.15, 0, -0.05), V(-1.07, 0.62, 0.05)), PM.woodDark());
  cb.build(group);
  const wheels: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Group(), wb = new Batch();
    wheelGeo(wb, new THREE.Matrix4(), 0.6, 0.14, 10); wb.build(w);
    w.position.set(0, 0.6, s * 0.8); wheels.push(w); group.add(w);
  }
  const barrels: THREE.Group[] = [];
  for (const x of [-0.72, 0.02, 0.76]) { const g = makeBarrel(); g.position.set(x, 0.74, 0); group.add(g); barrels.push(g); }
  group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = false; /* no self-shadow acne on its shaded side (post: v1404-1425) */ } });
  { const sh = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.4).rotateX(-Math.PI / 2).translate(0.2, 0.03, 0), AOM.blob()); sh.layers.set(3); group.add(sh); }
  return { group, wheels, barrels };
};

// ---------------- the forest (4.4): own trees + own culler (the house culler would carve a 9 m tunnel) ----------------
type FTree = { x: number; z: number; h: number; tr: number; seed: number };
/** forest tree: tall straight trunk (10-14 m class), canopy cluster in the top half */
const forestTree = (b: Batch, t: FTree, q = 1) => {
  const r = rng(Math.floor(t.seed * 1000) % 200000 + 3), U = (a: number, c: number) => a + (c - a) * r(), { x, z, h } = t;
  const leaf = leafMat([1, 4, 3][Math.floor(r() * 3)]), lobe = lobeGeo(q), sp = r();
  if (sp < 0.14) { addVeg(b, "cone", x, D0, z, h * 0.95, t.seed * 7, q); return; }      // a fir
  const birch = sp < 0.32;                                                              // a birch: white bark, lighter crown
  b.add(trunkGeo(), birch ? DM.birch() : barkMat(), new THREE.Matrix4().compose(V(x, D0 - 0.15, z), yawQ(r() * 6), V(birch ? t.tr * 0.7 : t.tr, 0.6 * h, birch ? t.tr * 0.7 : t.tr)));
  const put = (px: number, py: number, pz: number, rad: number) => b.add(lobe, leaf, new THREE.Matrix4().compose(V(x + px, D0 + py, z + pz), yawQ(r() * 6.28), V(rad, rad * 0.85, rad)));
  put(0, 0.7 * h, 0, 0.22 * h);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + U(-0.3, 0.3), d = 0.2 * h; put(Math.cos(a) * d, U(0.44, 0.62) * h, Math.sin(a) * d, U(0.14, 0.19) * h); }
  put(0, 0.88 * h, 0, 0.13 * h);
  // a stub branch or two on the trunk (read as trees, not poles, in the foreground)
  for (let i = 0; i < 2; i++) {
    const a = r() * TAU, y = U(0.3, 0.5) * h, l = U(0.8, 1.4);
    b.add(new THREE.CylinderGeometry(t.tr * 0.25, t.tr * 0.4, l, 6).translate(0, l / 2, 0).rotateZ(-1.0).rotateY(a).translate(x, D0 + y, z), barkMat());
  }
};
/** 2D distance from point p to segment ab */
const segDist = (px: number, pz: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1, u = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L2));
  return { d: Math.hypot(px - ax - dx * u, pz - az - dz * u), u };
};
let forestAB: Batch | null = null;
const buildForest = (b: Batch, lb: Batch) => {
  const [fx0, fz0, fx1, fz1] = LOC.FOREST_BOX, r = rng(41);
  const s4 = SHOTS.find((s) => s.scene === "ride")!;
  const cams: { p: V3; l: V3 }[] = [];
  // only lenses INSIDE the forest (+1 m) cull trees; the canopy check also covers the crane rising out of it
  for (let f = s4.a; f < s4.b; f += 2) {
    const c = camAt(4, f);
    if (c.pos[0] > fx0 - 1 && c.pos[0] < fx1 + 1 && c.pos[2] > fz0 - 1 && c.pos[2] < fz1 + 1) cams.push({ p: c.pos, l: c.look });
  }
  // sight lines from the forest lens to the coach lanterns on the z = -100 road (1528-1562)
  const lant: { p: V3; l: V3 }[] = [];
  // (a few narrow gaps only: one line per sample to the middle of the lantern pair)
  for (let f = 1532; f <= 1560; f += 7) {
    const c = camAt(4, f), co = coachAt(4, f), [a, b2] = COACH_LOCAL.LANTERNS.map((L) => coachLocal(co, L));
    lant.push({ p: c.pos, l: [(a[0] + b2[0]) / 2, (a[1] + b2[1]) / 2, (a[2] + b2[2]) / 2] });
  }
  const path: [number, number][] = [[2030, -44], [2028.5, -54], [2026, -64], [2024.5, -75], [2021, -86], [2016.5, -91.5]];
  const pathD = (x: number, z: number) => { let d = 1e9; for (let i = 0; i + 1 < path.length; i++) d = Math.min(d, segDist(x, z, ...path[i], ...path[i + 1]).d); return d; };
  /** in-forest lenses only. A tree whose crown the CRANE (lens above D0 + 6) would pass through is lowered below the
   *  lens instead of removed (the low views stay dense); returns false when it must go. */
  const keep = (t: FTree) => {
    for (const c of cams) {
      if (c.p[1] <= D0 + 6) continue;
      const dh = Math.hypot(c.p[0] - t.x, c.p[2] - t.z);
      if (dh < 0.42 * t.h + 0.8 && c.p[1] < D0 + t.h + 1.5) t.h = Math.min(t.h, c.p[1] - D0 - 1.5);
    }
    if (t.h < 5) return false;
    const R = 0.42 * t.h, cy = D0 + 0.68 * t.h;
    for (const c of cams) {
      const dh = Math.hypot(c.p[0] - t.x, c.p[2] - t.z);
      if (dh < t.tr + 1.0 && c.p[1] < D0 + t.h) return false;                 // lens inside / grazing the trunk
      if (Math.hypot(dh, c.p[1] - cy) < R + (c.p[1] > D0 + 6 ? 0.3 : 1.8)) return false; // lens inside the canopy
      // canopy hiding the subject: segment lens -> look within the canopy sphere
      const s = segDist(t.x, t.z, c.p[0], c.p[2], c.l[0], c.l[2]), y = c.p[1] + (c.l[1] - c.p[1]) * s.u;
      if (s.d < R * 0.9 && Math.abs(y - cy) < R * 0.8) return false;
    }
    for (const c of lant) {
      const s = segDist(t.x, t.z, c.p[0], c.p[2], c.l[0], c.l[2]), y = c.p[1] + (c.l[1] - c.p[1]) * s.u;
      if (s.d < t.tr + 0.3 && y < D0 + 0.62 * t.h) return false;              // a trunk on a lantern sight line
    }
    return true;
  };
  let n = 0;
  for (let x = fx0 - 6; x <= fx1 + 6; x += 2.6) for (let z = fz0 - 4; z <= fz1 + 4; z += 2.6) {
    const t: FTree = { x: x + (r() - 0.5) * 2.1, z: z + (r() - 0.5) * 2.1, h: 10 + r() * 4, tr: 0.22 + r() * 0.14, seed: x * 3.1 + z * 7.7 };
    // undergrowth: a bush between trees (never on the path or in the lens band)
    const bx = t.x + 1.4, bz = t.z + 1.2;
    if (r() < 0.55 && pathD(bx, bz) > 3.2 && bx > 2009 && bz > -86 && !cams.some((c) => Math.hypot(c.p[0] - bx, c.p[2] - bz) < 2.2)) addVeg(b, "bush", bx, D0, bz, 1.1 + r() * 0.9, bx * 7 + bz, 1);
    const pd = pathD(t.x, t.z);
    if (pd < 1.5) continue;                                    // the path itself (1.8 m dirt strip + the horse)
    if (t.z < -86 && t.x < 2046) continue;                     // the square / exit
    if (t.x < 2009) continue;                                  // the river bank
    if (t.x > 2100 || t.z > -48) continue;                     // the road along z = -46 and x = 2104
    if (!keep(t)) continue;
    forestTree(b, t, Math.hypot(t.x - 2026, t.z + 65) > 40 ? 2 : 1); n++;
  }
  // foreground whips: thin trunks 1.2-2.6 m west of the path (between rider and lens), canopy high above
  for (const [x, z] of [[2027.6, -58], [2026.4, -61.5], [2023.9, -69], [2022.6, -72.5], [2020.6, -79.5]] as const) {
    const t: FTree = { x, z, h: 13, tr: 0.13, seed: x + z };
    if (cams.some((c) => Math.hypot(c.p[0] - x, c.p[2] - z) < 0.9 || Math.hypot(Math.hypot(c.p[0] - x, c.p[2] - z), c.p[1] - (D0 + 0.68 * t.h)) < 0.42 * t.h + 1.8)) continue;
    forestTree(b, t, 1);
  }
  // floor: leaf litter over the box, the path as trodden dirt (narrow strip)
  flat(lb, MAT.litter(), fx0 - 8, fx1 + 4, fz0, fz1 + 2, 4, 0.006);
  for (let i = 0; i + 2 < path.length; i++) roadSeg(lb, path[i], path[i + 1], 1.8, 0.012);
  dressForest(b, forestAB!, cams.map((c) => c.p), pathD);
  void n;
};

// ---------------- the Varennes small two-arch bridge (Bastille bridge at ~0.4 scale, deck along x) ----------------
const buildSmallBridge = (b: Batch) => {
  const W = PM.wall(), C = PM.cope(), [bx0, bx1] = LOC.BRIDGE4_X, [bz0, bz1] = LOC.BRIDGE4_Z, yb = D0 - LOC.RIVER4_DEPTH - 0.1;
  const r = 2.0, ys = D0 - 2.2, cs = [1998.5, 2003.5], xa = 1994, xb = 2008;
  const sh = new THREE.Shape(); sh.moveTo(xa, yb);
  for (const c of cs) {
    sh.lineTo(c - r, yb); sh.lineTo(c - r, ys);
    for (let i = 1; i < 20; i++) { const a = Math.PI - (Math.PI * i) / 20; sh.lineTo(c + r * Math.cos(a), ys + r * Math.sin(a)); }
    sh.lineTo(c + r, ys); sh.lineTo(c + r, yb);
  }
  sh.lineTo(xb, yb); sh.lineTo(xb, D0); sh.lineTo(xa, D0); sh.closePath();
  b.add(shapeGeo(sh).translate(0, 0, bz1), W);
  b.add(shapeGeo(sh).scale(1, 1, -1).translate(0, 0, bz0), W);
  for (const c of cs) {
    // voussoir band (proud) on both faces + intrados
    const band = new THREE.Shape(), rr2 = r + 0.42; band.moveTo(c - rr2, ys);
    for (let i = 1; i <= 20; i++) { const a = Math.PI - (Math.PI * i) / 20; band.lineTo(c + rr2 * Math.cos(a), ys + rr2 * Math.sin(a)); }
    for (let i = 0; i <= 20; i++) { const a = (Math.PI * i) / 20; band.lineTo(c + r * Math.cos(a), ys + r * Math.sin(a)); }
    band.closePath();
    b.add(shapeGeo(band, 1).translate(0, 0, bz1 + 0.05), C);
    b.add(shapeGeo(band, 1).scale(1, 1, -1).translate(0, 0, bz0 - 0.05), C);
    for (let i = 0; i < 20; i++) {
      const a = Math.PI - (Math.PI * i) / 20, e = Math.PI - (Math.PI * (i + 1)) / 20, m = (a + e) / 2;
      b.add(qf(V(c + r * Math.cos(a), ys + r * Math.sin(a), bz0), V(c + r * Math.cos(a), ys + r * Math.sin(a), bz1), V(c + r * Math.cos(e), ys + r * Math.sin(e), bz1), V(c + r * Math.cos(e), ys + r * Math.sin(e), bz0), V(-Math.cos(m), -Math.sin(m), 0), 2, 0.3), W);
    }
    for (const s of [-1, 1]) b.add(qf(V(c + s * r, yb, bz0), V(c + s * r, yb, bz1), V(c + s * r, ys, bz1), V(c + s * r, ys, bz0), V(-s, 0, 0), 2, 1), W);
  }
  for (const s of [-1, 1]) { // cutwaters at the pier
    const z = s < 0 ? bz0 : bz1, x = (cs[0] + cs[1]) / 2;
    const t = new THREE.Shape(); t.moveTo(-0.5, 0); t.lineTo(0.5, 0); t.lineTo(0, 0.9); t.closePath();
    const g = extrude(t, D0 - 1.2 - yb, 1).rotateX(-Math.PI / 2);
    if (s < 0) g.rotateY(Math.PI);
    b.add(g.translate(x, yb, z), W);
  }
  flat(b, PM.cobble(), bx0, bx1, bz0, bz1, 4, 0.014);
  for (const z of [bz0, bz1]) {
    const zi = z < -100 ? z : z - 0.35, zo = z < -100 ? z + 0.35 : z;
    b.add(boxGeo(V(xa - 0.5, D0, zi), V(xb + 0.5, D0 + 0.85, zo), 2), W);
    b.add(boxGeo(V(xa - 0.55, D0 + 0.85, zi - 0.05), V(xb + 0.55, D0 + 0.98, zo + 0.05), 2), C);
  }
};

// ---------------- a little church (Varennes skyline) ----------------
const church = (b: Batch, x: number, z: number) => {
  const W = lam("churchStone", () => ({ map: stoneHD("stoneHD") })), sl = roofMat("#8f97a8");
  b.add(boxGeo(V(x - 5, D0, z - 12), V(x + 5, D0 + 9, z + 4), 4), W);
  b.add(qf(V(x - 5.4, D0 + 8.8, z + 4.3), V(x - 5.4, D0 + 8.8, z - 12.3), V(x, D0 + 13.5, z - 12.3), V(x, D0 + 13.5, z + 4.3), V(-1, 1, 0), 4, 2), sl);
  b.add(qf(V(x + 5.4, D0 + 8.8, z - 12.3), V(x + 5.4, D0 + 8.8, z + 4.3), V(x, D0 + 13.5, z + 4.3), V(x, D0 + 13.5, z - 12.3), V(1, 1, 0), 4, 2), sl);
  for (const zz of [z + 4, z - 12]) b.add(tf(V(x - 5, D0 + 9, zz), V(x + 5, D0 + 9, zz), V(x, D0 + 13.5, zz), V(0, 0, zz > z ? 1 : -1)), W);
  b.add(boxGeo(V(x - 3, D0, z + 4), V(x + 3, D0 + 18, z + 10), 4), W);
  b.add(new THREE.ConeGeometry(4.0, 9, 4).rotateY(Math.PI / 4).translate(x, D0 + 22.5, z + 7), sl);
  for (const [dx, dz] of [[0, 3.01], [3.01, 0], [-3.01, 0]] as const) b.add(qf(V(x + dx - (dz ? 0.5 : 0), D0 + 13, z + 7 + dz - (dx ? 0.5 : 0)), V(x + dx + (dz ? 0.5 : 0), D0 + 13, z + 7 + dz + (dx ? 0.5 : 0)), V(x + dx + (dz ? 0.5 : 0), D0 + 15.5, z + 7 + dz + (dx ? 0.5 : 0)), V(x + dx - (dz ? 0.5 : 0), D0 + 15.5, z + 7 + dz - (dx ? 0.5 : 0)), V(dx, 0, dz)), PM.dark());
};

/** a row of houses along local u (from (x0, z0) for `len` m in direction (ux, uz)), fronts facing (fx, fz) */
const row = (b: Batch, r: () => number, x0: number, z0: number, ux: number, uz: number, len: number, yaw: number, o: HouseOpts, hs = [7, 8.4, 9.8], skip?: (x: number, z: number) => boolean) => {
  let s = 0;
  const nx = Math.round(Math.sin(yaw)), nz = Math.round(Math.cos(yaw)); // front normal
  while (s < len) {
    const w = r() < 0.5 ? 7 : 9, h = hs[Math.floor(r() * hs.length)], d = 8, c = s + w / 2;
    const x = x0 + ux * c - nx * d / 2, z = z0 + uz * c - nz * d / 2;
    if (!skip || !skip(x, z)) house(b, x, z, yaw, w, d, h, Math.floor(r() * 8), D0, o);
    s += w + (r() < 0.2 ? 2.5 : 0.25);
  }
};
const hills = (b: Batch, cx: number, cz: number, list: [number, number, number, number, number][]) => {
  const hill = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const hm = [lam("hillA", () => ({ color: "#78b257" })), lam("hillB", () => ({ color: "#6aa24e" })), lam("hillC", () => ({ color: "#8bbf63" }))];
  list.forEach(([x, z, sx, sy, sz], i) => b.add(hill, hm[i % 3], new THREE.Matrix4().compose(V(cx + x, D0 - 2, cz + z), new THREE.Quaternion(), V(sx, sy * 0.7, sz))));
};
/** a ring of far trees around (cx, cz) (q = 2: cheap lobes) */
const treeRing = (b: Batch, r: () => number, cx: number, cz: number, d0: number, d1: number, n: number, keepOut?: (x: number, z: number) => boolean) => {
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, d = d0 + r() * (d1 - d0), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (keepOut && keepOut(x, z)) continue;
    tree(b, (["round", "fat", "tall", "round"] as VegKind[])[Math.floor(r() * 4)], x, z, 9 + r() * 6, x * 3 + z, 2);
  }
};


// =====================================================================================================================
// SET DRESSING (user revision: "the scenes are rather empty"). Small procedural props in the house style, no text.
// Every prop passes clear(): no lens within 2.5 m (+ its size) and no protected sight line through it (subjects stay
// visible), so dressing lives in the mid-ground / background. ab = alpha-tested batch (no shadow casting).
// =====================================================================================================================
const clear = (x: number, z: number, r: number, h: number, y0 = D0) =>
  !nearLens([x, y0 + h / 2, z], 2.5 + r) && !inTheWay(x - r, x + r, y0, y0 + h, z - r, z + r, true);
/** dressing for hand-placed sets (Paris, relay): no ray culling (props sit right where the lenses look, as background),
 *  but never within 2.5 m of a lens and never inside the action zones (crowd, family path, coach + team, Drouet) */
const ZONES: [number, number, number, number][] = [
  [-16, -90, 12, -62], [20.5, -101, 40, -87.5],                                   // Paris crowd; gate -> coach -> tree
  [1200, -87.2, 1226, -83.8], [1180, -83.5, 1213, -76.5], [1188, -80, 1211, -64.5], [1195.5, -88.5, 1201.5, -81.5], // relay
];
const placeOk = (x: number, z: number, r: number, h: number) =>
  !nearLens([x, D0 + h / 2, z], 2.5 + r) && !ZONES.some(([a, b2, c, d]) => x + r > a && x - r < c && z + r > b2 && z - r < d);
const DM = {
  straw: () => lam("straw", () => ({ map: strawTex() })),
  fern: () => lam("fern", () => ({ map: fernTex(), alphaTest: 0.5, side: THREE.DoubleSide })),
  ivy: () => lam("ivy", () => ({ map: ivyTex(), alphaTest: 0.5, side: THREE.DoubleSide })),
  birch: () => lam("birch", () => ({ map: birchTex() })),
  rock: () => lam("rock", () => ({ map: stoneHD("copeHD"), color: "#b8b0a8" })),
  wool: () => lam("wool", () => ({ color: "#efe8da" })), dark: () => lam("muzzle", () => ({ color: "#3a3034" })),
  cowW: () => lam("cowW", () => ({ color: "#f0e8dc" })), cowB: () => lam("cowB", () => ({ color: "#7a4a30" })),
  hen: () => lam("hen", () => ({ color: "#f2ead8" })), henB: () => lam("henB", () => ({ color: "#a8633a" })), comb: () => lam("comb", () => ({ color: "#d8382e" })),
  beak: () => lam("beak", () => ({ color: "#e8b040" })), water: () => lam("fountainWater", () => ({ color: "#4f78a8" })),
  cloth: (i: number) => lam("cloth" + i, () => ({ color: ["#f2ede0", "#b8d0e8", "#e8b8b0", "#f0dca0", "#c8d8b0"][i % 5], side: THREE.DoubleSide })),
  mushCap: () => lam("mushCap", () => ({ color: "#c8452e" })), mushStem: () => lam("mushStem", () => ({ color: "#efe6d2" })),
  leather: () => lam("leather", () => ({ color: "#5a3622" })), hull: () => lam("hull", () => ({ color: "#6e4a30" })),
  cat: () => lam("cat", () => ({ color: "#2e2a30" })),
};
const Mx = (x: number, y: number, z: number, yaw = 0, s = 1) => new THREE.Matrix4().compose(V(x, y, z), yawQ(yaw), V(s, s, s));
const crate = (b: Batch, m: THREE.Matrix4, s = 0.7) => {
  aoM(m, s * 0.75);
  b.add(boxGeo(V(-s / 2, 0, -s / 2), V(s / 2, s, s / 2), 0, false), PM.oak(), m);
  for (const y of [0.04, s - 0.08]) b.add(boxGeo(V(-s / 2 - 0.02, y, -s / 2 - 0.02), V(s / 2 + 0.02, y + 0.06, s / 2 + 0.02)), PM.woodDark(), m);
};
const barrelsAt = (G: THREE.Group, x: number, z: number, n: number, seed: number) => {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const g = makeBarrel(), a = r() * TAU, d = i ? 0.62 : 0;
    ao(x + Math.cos(a) * d, z + Math.sin(a) * d, 0.38);
    g.position.set(x + Math.cos(a) * d, D0, z + Math.sin(a) * d); g.rotation.y = r() * TAU; G.add(g);
  }
};
/** market stall: 4 posts, a trestle table with produce, a striped awning sloping to the front (local +z) */
const stall = (b: Batch, ab: Batch, m: THREE.Matrix4, col: string, seed: number) => {
  aoM(m, 1.5, 0.9);
  const r = rng(seed), W = PM.wood();
  for (const [x, z, h] of [[-1.3, -0.7, 2.6], [1.3, -0.7, 2.6], [-1.3, 0.7, 2.1], [1.3, 0.7, 2.1]] as const) b.add(boxGeo(V(x - 0.05, 0, z - 0.05), V(x + 0.05, h, z + 0.05)), W, m);
  b.add(boxGeo(V(-1.25, 0.82, -0.55), V(1.25, 0.9, 0.55), 1, true), PM.oak(), m);
  for (let i = 0; i < 14; i++) b.add(new THREE.SphereGeometry(0.1 + r() * 0.05, 8, 6).translate(-1.05 + (i % 7) * 0.35, 0.98, -0.3 + Math.floor(i / 7) * 0.45), [PM.leaf(), PM.carrot(), FLOWER_M.red()][i % 3], m);
  for (const x of [-0.7, 0.7]) crate(b, m.clone().multiply(Mx(x, 0, -0.1, 0.2)), 0.55);
  ab.add(qf(V(-1.45, 2.65, -0.85), V(1.45, 2.65, -0.85), V(1.45, 2.1, 0.95), V(-1.45, 2.1, 0.95), V(0, 1, 1)), lam("awn_" + col, () => ({ map: awningTex(col), side: THREE.DoubleSide, alphaTest: 0.4 })), m);
};
/** octagonal stone fountain: basin, water, column, small upper bowl */
const fountain = (b: Batch, x: number, z: number) => {
  ao(x, z, 2.3);
  const C = PM.cope();
  b.add(cylGeo(x, z, 1.9, 1.9, D0, D0 + 0.65, { seg: 8 }), PM.wall());
  b.add(ring(x, z, 1.62, 2.05, D0 + 0.65, true, 8), C);
  b.add(cylGeo(x, z, 1.62, 1.62, D0 + 0.3, D0 + 0.65, { seg: 8, inward: true }), PM.wall());
  b.add(disk(x, z, 1.63, D0 + 0.52, true, 8), DM.water());
  b.add(new THREE.CylinderGeometry(0.22, 0.3, 1.7, 12).translate(x, D0 + 1.3, z), C);
  b.add(new THREE.CylinderGeometry(0.7, 0.3, 0.3, 12).translate(x, D0 + 2.2, z), C);
  b.add(new THREE.SphereGeometry(0.2, 10, 8).translate(x, D0 + 2.5, z), C);
};
/** square Versailles planter with a clipped orange tree (the palace front) */
const orangeTub = (b: Batch, x: number, z: number) => {
  ao(x, z, 0.65);
  b.add(boxGeo(V(x - 0.45, D0, z - 0.45), V(x + 0.45, D0 + 0.8, z + 0.45), 1), lam("tubGreen", () => ({ color: "#3f6a52" })));
  for (const [dx, dz] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]] as const) b.add(new THREE.SphereGeometry(0.08, 8, 6).translate(x + dx, D0 + 0.86, z + dz), PM.gold());
  b.add(new THREE.CylinderGeometry(0.06, 0.08, 1.1, 8).translate(x, D0 + 1.3, z), barkMat());
  b.add(new THREE.SphereGeometry(0.75, 14, 10).translate(x, D0 + 2.4, z), leafMat(1));
  for (let i = 0; i < 7; i++) { const a = i * 0.9, e = 0.3 + (i % 3) * 0.25; b.add(new THREE.SphereGeometry(0.07, 6, 4).translate(x + Math.cos(a) * 0.7 * Math.cos(e), D0 + 2.4 + 0.7 * Math.sin(e), z + Math.sin(a) * 0.7 * Math.cos(e)), PM.carrot()); }
};
/** striped sentry box (guerite) facing local +z */
const sentryBox = (b: Batch, m: THREE.Matrix4) => {
  aoM(m, 0.85);
  const st = lam("sentry", () => ({ map: ctex("sentryStripe", 64, 256, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#e9e2d2" : "#3f5f9a"; g.fillRect(0, i * 32, 64, 32); } }) }));
  b.add(boxGeo(V(-0.6, 0, -0.6), V(0.6, 2.4, 0.6), 0), st, m);
  b.add(new THREE.ConeGeometry(0.95, 0.7, 4).rotateY(Math.PI / 4).translate(0, 2.75, 0), roofMat("#8f97a8"), m);
  b.add(qf(V(-0.4, 0.1, 0.61), V(0.4, 0.1, 0.61), V(0.4, 2.0, 0.61), V(-0.4, 2.0, 0.61), V(0, 0, 1)), PM.dark(), m);
};
const bench = (b: Batch, m: THREE.Matrix4) => {
  aoM(m, 1.0, 0.35);
  b.add(boxGeo(V(-0.9, 0.42, -0.2), V(0.9, 0.5, 0.2)), PM.wood(), m);
  for (const x of [-0.75, 0.75]) b.add(boxGeo(V(x - 0.05, 0, -0.18), V(x + 0.05, 0.42, 0.18)), PM.woodDark(), m);
};
const kennel = (b: Batch, m: THREE.Matrix4) => {
  aoM(m, 0.6, 0.75);
  b.add(boxGeo(V(-0.45, 0, -0.55), V(0.45, 0.7, 0.55), 1), PM.wood(), m);
  for (const s of [-1, 1]) b.add(qf(V(-0.55 * s, 0.68, -0.62), V(-0.55 * s, 0.68, 0.62), V(0, 1.05, 0.62), V(0, 1.05, -0.62), V(-s, 1, 0)), roofMat("#b8644f"), m);
  for (const z of [-0.55, 0.55]) b.add(tf(V(-0.45, 0.7, z), V(0.45, 0.7, z), V(0, 1.02, z), V(0, 0, z)), PM.wood(), m);
  b.add(qf(V(-0.2, 0, 0.56), V(0.2, 0, 0.56), V(0.2, 0.45, 0.56), V(-0.2, 0.45, 0.56), V(0, 0, 1)), PM.dark(), m);
};
/** a sagging line from a to c with n cloths hanging (shirts / sheets), posts at both ends when `posts` */
const laundry = (b: Batch, a: V3, c: V3, n: number, seed: number, posts = false) => {
  const r = rng(seed), P = (u: number): V3 => [a[0] + (c[0] - a[0]) * u, a[1] + (c[1] - a[1]) * u - 0.35 * 4 * u * (1 - u), a[2] + (c[2] - a[2]) * u];
  for (let i = 0; i < 8; i++) {
    const p = P(i / 8), q = P((i + 1) / 8), d = V(q[0] - p[0], q[1] - p[1], q[2] - p[2]), L = d.length();
    b.add(new THREE.CylinderGeometry(0.012, 0.012, L, 4).rotateZ(Math.PI / 2).applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), d.normalize()))).translate((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2), PM.rope());
  }
  const dx = c[0] - a[0], dz = c[2] - a[2], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.6) / (n + 0.2), p = P(u), w = 0.45 + r() * 0.45, h = 0.5 + r() * 0.6;
    b.add(qf(V(p[0] - ux * w / 2, p[1], p[2] - uz * w / 2), V(p[0] + ux * w / 2, p[1], p[2] + uz * w / 2), V(p[0] + ux * w / 2, p[1] - h, p[2] + uz * w / 2), V(p[0] - ux * w / 2, p[1] - h, p[2] - uz * w / 2), V(-uz, 0, ux)), DM.cloth(Math.floor(r() * 5)));
  }
  if (posts) for (const e of [a, c]) b.add(boxGeo(V(e[0] - 0.05, D0, e[2] - 0.05), V(e[0] + 0.05, e[1] + 0.1, e[2] + 0.05)), PM.wood());
};
const puddle = (ab: Batch, x: number, z: number, s: number, yaw: number) =>
  ab.add(new THREE.PlaneGeometry(s, s * 0.7).rotateX(-Math.PI / 2).rotateY(yaw).translate(x, D0 + 0.018, z), (() => { const m = lam("puddle2", () => ({ map: puddleTex(), transparent: true, depthWrite: false })); m.polygonOffset = true; m.polygonOffsetFactor = -2; return m; })());
/** blank posted edict on a wall (n = outward unit xz) */
const edict = (b: Batch, x: number, y: number, z: number, n: [number, number]) => {
  const tx = -n[1], tz = n[0], w = 0.32, h = 0.45, o = 0.02;
  b.add(qf(V(x - tx * w + n[0] * o, y - h, z - tz * w + n[1] * o), V(x + tx * w + n[0] * o, y - h, z + tz * w + n[1] * o), V(x + tx * w + n[0] * o, y + h, z + tz * w + n[1] * o), V(x - tx * w + n[0] * o, y + h, z - tz * w + n[1] * o), V(n[0], 0, n[1])), basic("edict", new THREE.Color(0.8, 0.78, 0.74), { map: edictTex() }));
};
const haystack = (b: Batch, x: number, z: number, h: number) => {
  ao(x, z, h * 0.6);
  b.add(new THREE.CylinderGeometry(h * 0.42, h * 0.5, h * 0.55, 14).translate(x, D0 + h * 0.275, z), DM.straw());
  b.add(new THREE.ConeGeometry(h * 0.45, h * 0.55, 14).translate(x, D0 + h * 0.82, z), DM.straw());
};
const haybale = (b: Batch, m: THREE.Matrix4) => (m.elements[13] < D0 + 0.5 && aoM(m, 0.75, 0.6), b.add(new THREE.CylinderGeometry(0.55, 0.55, 1.1, 16).rotateZ(Math.PI / 2).translate(0, 0.55, 0), DM.straw(), m));
/** post-and-rail fence from a to c */
const fence = (b: Batch, a: [number, number], c: [number, number]) => {
  const L = Math.hypot(c[0] - a[0], c[1] - a[1]), n = Math.max(1, Math.round(L / 2.4)), W = PM.wood();
  for (let i = 0; i <= n; i++) { const x = a[0] + (c[0] - a[0]) * (i / n), z = a[1] + (c[1] - a[1]) * (i / n); if (clear(x, z, 0.1, 1.2)) b.add(boxGeo(V(x - 0.06, D0, z - 0.06), V(x + 0.06, D0 + 1.15, z + 0.06)), W); }
  const yaw = Math.atan2(-(c[1] - a[1]), c[0] - a[0]);
  for (const y of [0.55, 0.95]) for (let i = 0; i < n; i++) {
    const x = a[0] + (c[0] - a[0]) * ((i + 0.5) / n), z = a[1] + (c[1] - a[1]) * ((i + 0.5) / n);
    if (clear(x, z, 1.2, 1.2)) b.add(boxGeo(V(-L / n / 2, y - 0.04, -0.03), V(L / n / 2, y + 0.04, 0.03)), W, Mx(x, D0, z, yaw));
  }
};
const wayCross = (b: Batch, x: number, z: number) => {
  ao(x, z, 0.65);
  b.add(boxGeo(V(x - 0.45, D0, z - 0.45), V(x + 0.45, D0 + 0.5, z + 0.45), 1), PM.cope());
  b.add(boxGeo(V(x - 0.07, D0 + 0.5, z - 0.07), V(x + 0.07, D0 + 3.1, z + 0.07)), PM.woodDark());
  b.add(boxGeo(V(x - 0.07, D0 + 2.3, z - 0.55), V(x + 0.07, D0 + 2.44, z + 0.55)), PM.woodDark());
};
/** windmill silhouette: tapered stone tower, conical cap, four lattice sails */
const windmill = (b: Batch, x: number, z: number, y0: number) => {
  b.add(cylGeo(x, z, 2.6, 1.8, y0, y0 + 9, { seg: 16 }), PM.wall());
  b.add(new THREE.ConeGeometry(2.3, 2.6, 16).translate(x, y0 + 10.3, z), roofMat("#8f97a8"));
  for (let i = 0; i < 4; i++) {
    const a = (i * TAU) / 4 + 0.4, g = new THREE.Group(); void g;
    b.add(boxGeo(V(-0.05, 0, -0.2), V(0.05, 7.5, 0.2)).rotateX(a).translate(x - 2.5, y0 + 8.8, z), PM.woodDark());
    b.add(boxGeo(V(-0.03, 1.5, 0.2), V(0.03, 7.3, 1.3)).rotateX(a).translate(x - 2.52, y0 + 8.8, z), DM.cloth(0));
  }
};
const sheep = (b: Batch, m: THREE.Matrix4) => {
  for (const [x, y, z, r2] of [[0, 0.62, 0, 0.42], [0.3, 0.66, 0.05, 0.34], [-0.3, 0.64, -0.05, 0.34], [0.05, 0.84, 0, 0.3]] as const) b.add(new THREE.SphereGeometry(r2, 10, 8).translate(x, y, z), DM.wool(), m);
  b.add(new THREE.SphereGeometry(0.17, 10, 8).scale(1.3, 1, 0.9).translate(0.62, 0.72, 0), DM.dark(), m);
  for (const [x, z] of [[0.28, 0.16], [0.28, -0.16], [-0.28, 0.16], [-0.28, -0.16]] as const) b.add(boxGeo(V(x - 0.04, 0, z - 0.04), V(x + 0.04, 0.38, z + 0.04)), DM.dark(), m);
};
const cow = (b: Batch, m: THREE.Matrix4) => {
  aoM(m, 1.0, 0.5);
  b.add(new THREE.CapsuleGeometry(0.42, 1.1, 4, 10).rotateZ(Math.PI / 2).translate(0, 1.0, 0), DM.cowW(), m);
  for (const [x, z, r2] of [[0.3, 0.38, 0.22], [-0.35, -0.36, 0.25], [-0.5, 0.38, 0.18]] as const) b.add(new THREE.SphereGeometry(r2, 8, 6).scale(1.2, 1, 0.25).translate(x, 1.05, z), DM.cowB(), m);
  b.add(new THREE.BoxGeometry(0.42, 0.36, 0.34).translate(1.0, 1.15, 0), DM.cowB(), m);
  b.add(new THREE.BoxGeometry(0.2, 0.2, 0.3).translate(1.24, 1.06, 0), lam("cowNose", () => ({ color: "#e0a8a0" })), m);
  for (const [x, z] of [[0.45, 0.22], [0.45, -0.22], [-0.45, 0.22], [-0.45, -0.22]] as const) b.add(boxGeo(V(x - 0.07, 0, z - 0.07), V(x + 0.07, 0.7, z + 0.07)), DM.cowW(), m);
};
const chicken = (b: Batch, m: THREE.Matrix4, brown: boolean) => {
  b.add(new THREE.SphereGeometry(0.15, 10, 8).scale(1.3, 1, 1).translate(0, 0.25, 0), brown ? DM.henB() : DM.hen(), m);
  b.add(new THREE.SphereGeometry(0.08, 8, 6).translate(0.17, 0.4, 0), brown ? DM.henB() : DM.hen(), m);
  b.add(new THREE.SphereGeometry(0.04, 6, 4).translate(0.18, 0.49, 0), DM.comb(), m);
  b.add(new THREE.ConeGeometry(0.025, 0.07, 5).rotateZ(-Math.PI / 2).translate(0.27, 0.39, 0), DM.beak(), m);
  b.add(new THREE.ConeGeometry(0.1, 0.18, 6).rotateZ(0.9).translate(-0.2, 0.32, 0), brown ? DM.henB() : DM.hen(), m);
  for (const z of [-0.05, 0.05]) b.add(boxGeo(V(-0.01, 0, z - 0.01), V(0.01, 0.13, z + 0.01)), DM.beak(), m);
};
const bucket = (b: Batch, x: number, z: number) => {
  ao(x, z, 0.24);
  b.add(new THREE.CylinderGeometry(0.17, 0.13, 0.3, 12).translate(x, D0 + 0.15, z), PM.wood());
  b.add(new THREE.TorusGeometry(0.17, 0.012, 4, 16, Math.PI).translate(x, D0 + 0.3, z), PM.iron());
};
const dovecote = (b: Batch, x: number, z: number) => {
  ao(x, z, 1.6);
  b.add(cylGeo(x, z, 1.3, 1.3, D0, D0 + 5.2, { seg: 16 }), lam("dovecoteWall", () => ({ map: stoneHD("stoneHD") })));
  b.add(new THREE.ConeGeometry(1.7, 2.0, 16).translate(x, D0 + 6.2, z), roofMat("#b8644f"));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; onCircle(b, PM.dark(), x, z, 1.31, a, 0.18, 0.02, D0 + 4.2, D0 + 4.45); onCircle(b, PM.cope(), x, z, 1.36, a, 0.34, 0.1, D0 + 4.12, D0 + 4.18); }
  b.add(new THREE.SphereGeometry(0.12, 8, 6).translate(x, D0 + 7.25, z), PM.gold());
};
const logPile = (b: Batch, m: THREE.Matrix4, len: number) => {
  aoM(m, 0.95, len * 0.6);
  let k = 0;
  for (let row = 0; row < 4; row++) for (let i = 0; i < 6 - row; i++) {
    b.add(new THREE.CylinderGeometry(0.13, 0.13, len, 8).rotateX(Math.PI / 2).translate(-0.7 + row * 0.13 + i * 0.27, 0.13 + row * 0.23, 0), k++ % 3 ? PM.wood() : PM.woodDark(), m);
  }
};
/** ivy patch on a wall face (n = outward unit xz), w x h metres from (x, y0) */
const ivy = (ab: Batch, x: number, z: number, n: [number, number], w: number, h: number, y0 = D0) => {
  const tx = -n[1], tz = n[0], o = 0.04;
  ab.add(qf(V(x - tx * w / 2 + n[0] * o, y0, z - tz * w / 2 + n[1] * o), V(x + tx * w / 2 + n[0] * o, y0, z + tz * w / 2 + n[1] * o), V(x + tx * w / 2 + n[0] * o, y0 + h, z + tz * w / 2 + n[1] * o), V(x - tx * w / 2 + n[0] * o, y0 + h, z - tz * w / 2 + n[1] * o), V(n[0], 0, n[1])), DM.ivy());
};
const harness = (b: Batch, x: number, y: number, z: number, n: [number, number]) => {
  for (const dx of [-0.7, 0, 0.7]) {
    const px = x - n[1] * dx, pz = z + n[0] * dx;
    b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6).rotateX(Math.PI / 2).rotateY(Math.atan2(n[0], n[1])).translate(px + n[0] * 0.12, y, pz + n[1] * 0.12), PM.woodDark());
    b.add(new THREE.TorusGeometry(0.26, 0.06, 6, 16).scale(0.8, 1.15, 1).rotateY(Math.atan2(n[0], n[1])).translate(px + n[0] * 0.14, y - 0.32, pz + n[1] * 0.14), DM.leather());
    b.add(boxGeo(V(-0.03, -0.9, -0.01), V(0.03, 0, 0.01)), DM.leather(), Mx(px + n[0] * 0.08 + 0.12, y, pz + n[1] * 0.08, Math.atan2(n[0], n[1])));
  }
};
/** fern clump: 6 fronds fanned out (alpha cards) */
const fern = (ab: Batch, x: number, z: number, s: number, seed: number) => {
  const r = rng(seed);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + r() * 0.5, g = new THREE.PlaneGeometry(0.5 * s, 1.1 * s).translate(0, 0.55 * s, 0).rotateX(-0.9 - r() * 0.3).rotateY(a);
    ab.add(g.translate(x, D0, z), DM.fern());
  }
};
const fallenLog = (b: Batch, x: number, z: number, len: number, yaw: number) => {
  ao(x, z, len / 2 + 0.2, 0.45, yaw);
  b.add(new THREE.CylinderGeometry(0.26, 0.3, len, 10).rotateZ(Math.PI / 2).translate(0, 0.24, 0), barkMat(), Mx(x, D0, z, yaw));
  for (const s of [-1, 1]) b.add(new THREE.CircleGeometry(s > 0 ? 0.26 : 0.3, 10).rotateY(s * Math.PI / 2).translate(s * len / 2 + s * 0.002, 0.24, 0), lam("logEnd", () => ({ color: "#c89a68" })), Mx(x, D0, z, yaw));
};
const rock = (b: Batch, x: number, z: number, s: number, seed: number) => {
  ao(x, z, s * 1.25, s * 1.05);
  const g = new THREE.SphereGeometry(1, 14, 10), p = g.attributes.position as THREE.BufferAttribute, r = rng(seed);
  const a1 = r() * 6, a2 = r() * 6, a3 = r() * 6;
  for (let i = 0; i < p.count; i++) { // smooth low-frequency lumps (a function of the direction, so seams stay closed)
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.16 * Math.sin(2.1 * x + a1) * Math.cos(1.7 * z + a2) + 0.1 * Math.sin(2.6 * y + a3);
    p.setXYZ(i, x * k * 1.15, Math.max(-0.15, y) * k * 0.62, z * k);
  }
  g.computeVertexNormals();
  b.add(g.scale(s, s, s).translate(x, D0, z), DM.rock());
};
const mushroom = (b: Batch, x: number, z: number, s: number) => {
  b.add(new THREE.CylinderGeometry(0.03 * s, 0.04 * s, 0.14 * s, 6).translate(x, D0 + 0.07 * s, z), DM.mushStem());
  b.add(new THREE.SphereGeometry(0.09 * s, 10, 6, 0, TAU, 0, Math.PI / 2).translate(x, D0 + 0.13 * s, z), DM.mushCap());
};
/** small moored rowing boat (hull along local x), floating at y */
const boat = (b: Batch, x: number, y: number, z: number, yaw: number) => {
  const sh = new THREE.Shape(); sh.moveTo(-2, 0.45); sh.quadraticCurveTo(-1.7, 0, -1.0, 0); sh.lineTo(1.2, 0); sh.quadraticCurveTo(1.9, 0.05, 2.1, 0.5); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 1.1, bevelEnabled: false, curveSegments: 8 }).translate(0, -0.15, -0.55);
  b.add(g, DM.hull(), Mx(x, y, z, yaw));
  b.add(boxGeo(V(-1.6, 0.18, -0.5), V(1.7, 0.24, 0.5)), PM.oak(), Mx(x, y, z, yaw));
  b.add(boxGeo(V(-0.2, 0.24, -0.5), V(0.2, 0.3, 0.5)), PM.wood(), Mx(x, y, z, yaw));
};
const flowerPot = (b: Batch, x: number, z: number, seed: number) => {
  ao(x, z, 0.26);
  b.add(new THREE.CylinderGeometry(0.2, 0.15, 0.32, 10).translate(x, D0 + 0.16, z), lam("pot", () => ({ color: "#b8684a" })));
  const r = rng(seed);
  for (let i = 0; i < 5; i++) b.add(new THREE.SphereGeometry(0.1, 8, 6).translate(x + (r() - 0.5) * 0.25, D0 + 0.4 + r() * 0.12, z + (r() - 0.5) * 0.25), [FLOWER_M.red(), FLOWER_M.pink(), FLOWER_M.leaf()][i % 3]);
};
const marketCross = (b: Batch, x: number, z: number) => {
  ao(x, z, 1.7);
  for (let i = 0; i < 3; i++) b.add(boxGeo(V(x - 1.4 + i * 0.4, D0 + i * 0.22, z - 1.4 + i * 0.4), V(x + 1.4 - i * 0.4, D0 + (i + 1) * 0.22, z + 1.4 - i * 0.4), 1), PM.cope());
  b.add(boxGeo(V(x - 0.14, D0 + 0.66, z - 0.14), V(x + 0.14, D0 + 4.0, z + 0.14), 1), PM.cope());
  b.add(boxGeo(V(x - 0.6, D0 + 3.1, z - 0.11), V(x + 0.6, D0 + 3.36, z + 0.11), 1), PM.cope());
};
const cat = (b: Batch, x: number, y: number, z: number, yaw: number) => {
  const m = Mx(x, y, z, yaw), C = DM.cat();
  b.add(new THREE.SphereGeometry(0.13, 10, 8).scale(1.4, 1, 0.9).translate(0, 0.13, 0), C, m);
  b.add(new THREE.SphereGeometry(0.08, 10, 8).translate(0.18, 0.27, 0), C, m);
  for (const s of [-1, 1]) b.add(new THREE.ConeGeometry(0.03, 0.07, 4).translate(0.19, 0.36, s * 0.045), C, m);
  b.add(new THREE.TorusGeometry(0.12, 0.018, 5, 12, Math.PI * 0.9).rotateX(Math.PI / 2).rotateZ(-0.3).translate(-0.22, 0.05, 0.06), C, m);
};
/** wildflower decal strip along x at z (alpha) */
const flowerStrip = (ab: Batch, x0: number, x1: number, z0: number, z1: number) =>
  ab.add(qf(V(x0, D0 + 0.016, z1), V(x1, D0 + 0.016, z1), V(x1, D0 + 0.016, z0), V(x0, D0 + 0.016, z0), V(0, 1, 0), (x1 - x0) / 6, (z1 - z0) / 6),
    (() => { const m = lam("wildflowers", () => ({ map: flowersTex(), transparent: true, depthWrite: false })); m.polygonOffset = true; m.polygonOffsetFactor = -2; return m; })());
/** subtle large-scale value variation (the lawn macro) on a tiled material: no flat slabs. div = macro tile / map tile */
const macroize = (m: THREE.MeshLambertMaterial, div: number, key: string, k = 1.6, off: [number, number] = [0, 0]) => {
  if (m.userData.macro) return m;
  m.userData.macro = true;
  const macro = grassMacro(), tt = m.onBeforeCompile.bind(m);
  m.onBeforeCompile = (sh, r) => {
    tt(sh, r);
    sh.uniforms.uMacro = { value: macro }; sh.uniforms.uMacroOff = { value: new THREE.Vector2(...off) }; sh.uniforms.uMacroK = { value: k };
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <map_fragment>", `#include <map_fragment>\n#ifdef USE_MAP\n  diffuseColor.rgb *= mix(vec3(1.0), texture2D(uMacro, vMapUv / ${div.toFixed(2)} + uMacroOff).rgb * 2.0, uMacroK);\n#endif`)
      .replace("#include <common>", "#include <common>\nuniform sampler2D uMacro; uniform vec2 uMacroOff; uniform float uMacroK;");
  };
  const ck = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => ck() + "_macro" + key + div.toFixed(2);
  return m;
};
/** close-up micro detail (grit, pits, cracks) tiled every `tile` uv units, fading out between 2.5 and 11 m from the lens */
const detailize = (m: THREE.MeshLambertMaterial, tile: number, key: string, k = 0.9) => {
  if (m.userData.detail) return m;
  m.userData.detail = true;
  const det = stoneDetailTex(), tt = m.onBeforeCompile.bind(m);
  m.onBeforeCompile = (sh, r) => {
    tt(sh, r);
    sh.uniforms.uDetail = { value: det };
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <map_fragment>", `#include <map_fragment>\n#ifdef USE_MAP\n  diffuseColor.rgb *= mix(vec3(1.0), texture2D(uDetail, vMapUv * ${tile.toFixed(2)}).rgb * 2.0, ${k.toFixed(2)} * (1.0 - smoothstep(2.5, 11.0, length(vViewPosition))));\n#endif`)
      .replace("#include <common>", "#include <common>\nuniform sampler2D uDetail;");
  };
  const ck = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => ck() + "_detail" + key;
  return m;
};

const decal = (ab: Batch, key: string, tex: () => THREE.Texture, x: number, z: number, w: number, l: number, yaw: number, dy = 0.017) => {
  const m = lam("decal_" + key, () => ({ map: tex(), transparent: true, depthWrite: false })); m.polygonOffset = true; m.polygonOffsetFactor = -2;
  ab.add(new THREE.PlaneGeometry(w, l).rotateX(-Math.PI / 2).rotateY(yaw).translate(x, D0 + dy, z), m);
};
/** a gutter channel decal from a to c (1 m wide, tiles every 4 m) */
const gutter = (ab: Batch, a: [number, number], c: [number, number]) => {
  const dx = c[0] - a[0], dz = c[1] - a[1], L = Math.hypot(dx, dz), n = Math.ceil(L / 4);
  for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; decal(ab, "gutter", gutterTex, a[0] + dx * u, a[1] + dz * u, L / n + 0.02, 1.0, Math.atan2(-dz, dx), 0.015); }
};
// ---------------- per-place dressing ----------------
const dressParis = (b: Batch, ab: Batch, G: THREE.Group) => {
  const F = LOC.FACADE_Z;
  for (const [x, z, yaw, col] of [[-41.8, -58, Math.PI / 2, "#b8453a"], [-41.8, -66.5, Math.PI / 2, "#3f6a8a"], [41.6, -61, -Math.PI / 2, "#4f7a3a"], [41.6, -70, -Math.PI / 2, "#b8453a"]] as const)
    if (placeOk(x, z, 1.6, 2.7)) stall(b, ab, Mx(x, D0, z, yaw), col, x * 3 + z);
  for (const [x, z, yaw] of [[-35.5, -86, 0.4], [36.5, -66, -2.4]] as const) if (placeOk(x, z, 1.9, 1)) vegCartAt(b, Mx(x, D0, z, yaw));
  if (placeOk(-28, -83, 2.1, 2.7)) fountain(b, -28, -83);
  for (const [x, z, n] of [[-43.4, -91, 3], [43.6, -76.5, 2], [-20, -97.9, 2], [11.5, -98.1, 3], [43.4, -55, 2]] as const) if (placeOk(x, z, 1, 1)) barrelsAt(G, x, z, n, x * 7 + z);
  for (const [x, z, yaw] of [[-42.9, -73.5, 0.2], [-42.4, -72.7, 0.9], [42.7, -86, 0.3], [14.2, -97.6, 0.5], [-19, -97.3, 1.1]] as const) if (placeOk(x, z, 0.5, 0.8)) crate(b, Mx(x, D0, z, yaw));
  for (const x of [-38, -30, -22, 10, 34, 42]) if (placeOk(x, F + 1.2, 0.8, 3.2)) orangeTub(b, x, F + 1.2);
  for (const x of [LOC.KING_WIN[0] - 8, LOC.KING_WIN[0] + 8]) if (placeOk(x, F + 0.95, 0.8, 3.2)) sentryBox(b, Mx(x, D0, F + 0.95, 0));
  { // stone bollards with sagging iron chains: a cordon between the crowd and the palace (behind the crowd zone)
    const zc = -95.2, posts: number[] = [];
    for (let x = -42; x <= 18.5; x += 2.4) posts.push(x);
    for (const x of posts) { b.add(new THREE.CylinderGeometry(0.16, 0.2, 0.85, 10).translate(x, D0 + 0.42, zc), PM.cope()); b.add(new THREE.SphereGeometry(0.17, 10, 6, 0, TAU, 0, Math.PI / 2).translate(x, D0 + 0.85, zc), PM.cope()); ao(x, zc, 0.3); }
    for (let i = 0; i + 1 < posts.length; i++) for (let k = 0; k < 6; k++) {
      const u0 = k / 6, u1 = (k + 1) / 6, xa = posts[i] + 2.4 * u0, xb = posts[i] + 2.4 * u1, ya = D0 + 0.72 - 0.28 * 4 * u0 * (1 - u0), yb2 = D0 + 0.72 - 0.28 * 4 * u1 * (1 - u1);
      const L = Math.hypot(xb - xa, yb2 - ya);
      b.add(new THREE.CylinderGeometry(0.025, 0.025, L, 5).rotateZ(Math.atan2(yb2 - ya, xb - xa) - Math.PI / 2).translate((xa + xb) / 2, (ya + yb2) / 2, zc), PM.iron());
    }
  }
  for (const [x, z] of [[-20, -93.6], [8, -93.6], [-34, -93.6]] as const) hlx(x, z, 3.2, "paris")(b);
  if (placeOk(17.7, F + 0.95, 0.8, 3.2)) sentryBox(b, Mx(17.7, D0, F + 0.95, 0));
  if (placeOk(15.2, -95.9, 1.6, 1)) vegCartAt(b, Mx(15.2, D0, -95.9, 1.25), false);
  for (const [x, z, yaw] of [[5.5, -97.3, 0.1], [-24, -96.4, -0.3]] as const) if (placeOk(x, z, 1, 0.6)) bench(b, Mx(x, D0, z, yaw));
  barrelsAt(G, 8.2, -98.3, 3, 17); barrelsAt(G, 13.0, -98.4, 2, 18);
  edict(b, 16.4, D0 + 2.0, F, [0, 1]); edict(b, -45.98, D0 + 2.0, -75.5, [1, 0]); edict(b, 45.98, D0 + 2.1, -64.5, [-1, 0]);
  if (placeOk(44.5, -95.5, 0.7, 1.1)) kennel(b, Mx(44.5, D0, -95.5, -Math.PI / 2));
  laundry(b, [-45.1, D0 + 5.4, -55.5], [-45.1, D0 + 5.0, -63.5], 5, 3);
  laundry(b, [45.1, D0 + 5.2, -79.5], [45.1, D0 + 5.4, -88.5], 6, 4);
  laundry(b, [-45.1, D0 + 5.3, -82], [-45.1, D0 + 5.2, -89], 4, 5);
  for (const [x, z, s] of [[-12.6, -62.6, 2.4], [15.2, -62.2, 2.0], [28.6, -78.4, 2.6], [-6.5, -73.5, 2.2], [3.5, -88, 1.8], [-30.5, -76.6, 2.1]] as const) puddle(ab, x, z, s, x);
  for (const [x, z] of [[-44.9, -70], [44.9, -91]] as const) if (placeOk(x, z, 0.3, 0.6)) flowerPot(b, x, z, x);
  // the gate shots (284-352) look down on cobbles: litter, a drain grate, wet patches, leaves (all flat, the family walks there)
  for (const [x, z, w, yaw] of [[21.6, -94.0, 2.2, 0.4], [23.6, -92.4, 1.8, 1.9], [20.8, -96.6, 1.6, 2.6]] as const) decal(ab, "litter", litterTex, x, z, w, w, yaw);
  decal(ab, "drain", drainTex, 20.9, -97.6, 0.7, 0.7, 0.05, 0.016);
  for (const [x, z, w] of [[22.4, -95.2, 2.6], [19.8, -93.0, 2.2]] as const) decal(ab, "wet", wetTex, x, z, w, w * 0.8, x);
  // the cobbles: a gutter down the street and along the palace, wet and worn patches, a crate + bucket low in the 290 view
  gutter(ab, [15, -58], [15, -94]); gutter(ab, [-40, -94.4], [20, -94.4]); gutter(ab, [0, -52], [0, -60]);
  for (const [x, z, w] of [[14, -86, 5], [17, -90.5, 4], [11.5, -92, 3.5], [19, -84, 4.5], [-24, -88, 5], [26, -82, 5], [-10, -95.5, 4], [6, -93, 4]] as const) decal(ab, "wet", wetTex, x, z, w, w * 0.75, x);
  if (placeOk(16.2, -88.2, 0.5, 0.8)) crate(b, Mx(16.2, D0, -88.2, 0.5));
  if (placeOk(14.6, -87.3, 0.3, 0.4)) bucket(b, 14.6, -87.3);
};
const dressRoad = (b: Batch, ab: Batch, G: THREE.Group) => {
  // a farmyard right behind the outskirts (the door / mirror shots look south-east)
  for (const [x, z, h] of [[226, -60, 3.0], [231.5, -63, 2.6], [236, -58.5, 2.8]] as const) if (clear(x, z, 1.6, h)) haystack(b, x, z, h);
  fence(b, [214, -70.5], [236, -70.5]); fence(b, [236, -70.5], [236, -52]);
  if (clear(229, -67.5, 1.9, 1)) vegCartAt(b, Mx(229, D0, -67.5, 2.6), false);
  barrelsAt(G, 216.5, -66.8, 2, 7);
  for (const [x, z, h] of [[247, -64.5, 3.0], [252.5, -67, 2.6], [258, -63, 3.3]] as const) if (clear(x, z, 1.6, h)) haystack(b, x, z, h);
  { const r3 = rng(37);
    for (let i = 0; i < 3; i++) { const x = 262 + r3() * 16, z = -100 - r3() * 8; if (clear(x, z, 1.2, 1.5)) cow(b, Mx(x, D0, z, r3() * TAU)); } }

  // farmhouses and barns at several distances, a village church spire on the horizon, a windmill on a hill
  for (const [x, z, yaw, w, si] of [[262, -48, Math.PI, 9, 3], [318, -122, 0, 9, 0], [420, -36, Math.PI, 7, 6], [480, -128, 0, 9, 4], [560, -44, Math.PI, 7, 1]] as const) house(b, x, z, yaw, w, 7, 5.2, si, D0, { lit: 0.4 });
  for (const [x, z, yaw] of [[276, -46, Math.PI], [332, -124, 0], [500, -126, 0]] as const) house(b, x, z, yaw, 14, 9, 5.5, 2, D0, { front: lam("barnFront", () => ({ map: stableHD(14, 5.5, [7]) })) });
  church(b, 470, -150);
  windmill(b, 390, -190, D0 + 6);
  hills(b, 0, 0, [[390, -190, 40, 14, 40]]);
  // haystacks, fences, a wayside cross, wildflower verges
  for (const [x, z, h] of [[252, -58, 3.2], [259, -61, 2.8], [304, -106, 3.4], [346, -56, 3.0], [352, -60, 2.6]] as const) if (clear(x, z, 1.7, h)) haystack(b, x, z, h);
  fence(b, [238, -70.5], [330, -70.5]); fence(b, [250, -95.5], [340, -95.5]); fence(b, [340, -70.5], [340, -40]);
  if (clear(276, -76.4, 0.6, 3.2)) wayCross(b, 276, -76.4);
  flowerStrip(ab, 214, 520, -85.6, -83.6); flowerStrip(ab, 214, 520, -76.4, -74.4);
  // grass tufts + pebbles on the north verge right under the opening shots of take 2 (592-642 look down on it)
  { const rt = rng(53); for (let i = 0; i < 90; i++) { const x = 206 + rt() * 40, z = -84 - rt() * 9, sc = 0.35 + rt() * 0.4; if (nearLens([x, D0 + 0.3, z], 2.8)) continue;
      for (const a of [0, Math.PI / 2]) ab.add(new THREE.PlaneGeometry(sc * 1.2, sc).translate(0, sc / 2, 0).rotateY(a + rt()).translate(x, D0, z), lam("tuft", () => ({ map: tuftTex(), alphaTest: 0.5, side: THREE.DoubleSide })));
      if (rt() < 0.3) rock(b, x + 0.4, z + 0.3, 0.08 + rt() * 0.1, i); } }
  // grazing sheep (south meadow) and cows (north)
  const r = rng(77);
  for (let i = 0; i < 5; i++) { const x = 296 + r() * 36, z = -100 - r() * 12; if (clear(x, z, 1.2, 1.5)) cow(b, Mx(x, D0, z, r() * TAU)); }
};
const dressRelay = (b: Batch, ab: Batch, G: THREE.Group) => {
  for (const [x, z, yaw] of [[1217, -63.8, 0.1], [1218.3, -63.6, 0.1], [1217.6, -63.7, 0.12]] as const) if (placeOk(x, z, 0.7, 1.1)) haybale(b, Mx(x, D0, z, yaw));
  if (placeOk(1217.6, -63.7, 0.7, 2.2)) haybale(b, Mx(1217.7, D0 + 1.05, -63.7, 0.12));
  if (placeOk(1222.5, -71, 1.9, 1.1)) vegCartAt(b, Mx(1222.5, D0, -71, 2.1), false);
  harness(b, 1198, D0 + 2.0, LOC.STABLE_FRONT_Z, [0, -1]);
  if (placeOk(1179, -94.5, 1.7, 7.4)) dovecote(b, 1179, -94.5);
  const r = rng(5);
  void chicken; void sheep; void r; // the sheep and hens are the char owner's cards
  barrelsAt(G, 1219.6, -75.8, 3, 12); if (placeOk(1217.6, -73.4, 0.5, 0.8)) crate(b, Mx(1217.6, D0, -73.4, 0.4));
  for (const [x, z] of [[1214.3, -73.6], [1216.2, -77.1]] as const) if (placeOk(x, z, 0.3, 0.4)) bucket(b, x, z);
  for (const [x, z] of [[1191.6, -87.3], [1210.5, -64.4]] as const) if (placeOk(x, z, 0.9, 1)) barrelsAt(G, x, z, 2, x + z);
  for (const [x, z, yaw] of [[1188.8, -86.9, 0.3], [1220.5, -64.8, 0.7]] as const) if (placeOk(x, z, 0.5, 0.8)) crate(b, Mx(x, D0, z, yaw));
  if (placeOk(1173.6, -69, 1, 1.2)) logPile(b, Mx(1173.6, D0, -69, Math.PI / 2), 0.9);
  ivy(ab, 1209.5, LOC.INN_FRONT_Z, [0, 1], 4.5, 4.2); ivy(ab, 1187.5, LOC.STABLE_FRONT_Z, [0, -1], 3.2, 3.6); ivy(ab, 1172.05, -95, [1, 0], 3.0, 5.0);
  laundry(b, [1214.6, D0 + 2.4, -70.6], [1222.4, D0 + 2.3, -68.2], 5, 9, true);
  for (const [x, z] of [[1184.6, -76.3], [1212.4, -68.5], [1185.1, -77]] as const) if (placeOk(x, z, 0.3, 0.4)) bucket(b, x, z);
  for (const [x, z] of [[LOC.INN_DOOR[0] - 1.55, -87.6], [LOC.INN_DOOR[0] + 1.9, -87.6]] as const) if (placeOk(x, z, 0.3, 0.6)) flowerPot(b, x, z, x); // flanking the (moved) door
  ivy(ab, LOC.INN_DOOR[0] - 2.6, LOC.INN_FRONT_Z, [0, 1], 1.8, 3.4);
  if (placeOk(LOC.INN_DOOR[0] - 2.9, LOC.INN_FRONT_Z + 0.55, 1.0, 0.6)) bench(b, Mx(LOC.INN_DOOR[0] - 2.9, D0, LOC.INN_FRONT_Z + 0.55, 0));
  // the yard floor: a gutter along the road, straw scattered (thick by the stable and the team), wet patches, props low in the wide
  gutter(ab, [1172, -83.2], [1228, -83.2]);
  for (const [x, z, w] of [[1213, -78, 5], [1219, -81, 4], [1206, -74, 6], [1196, -70, 6], [1215, -69, 4.5], [1222, -85.5, 3.5], [1209, -85.6, 3], [1190, -78, 4]] as const) decal(ab, "straw", strawDecalTex, x, z, w, w, x * 0.7);
  for (const [x, z, w] of [[1217, -86, 4], [1224, -80.5, 4], [1186, -84, 4]] as const) decal(ab, "wet", wetTex, x, z, w, w * 0.8, x);
  if (placeOk(1214.6, -83.0, 0.3, 0.4)) bucket(b, 1214.6, -83.0);
  if (placeOk(1217.6, -82.4, 0.5, 0.8)) crate(b, Mx(1217.6, D0, -82.4, 0.25));
};
const dressForest = (b: Batch, ab: Batch, cams: V3[], pathD: (x: number, z: number) => number) => {
  const [fx0, fz0, fx1, fz1] = LOC.FOREST_BOX, r = rng(91);
  const free = (x: number, z: number, d: number) => !cams.some((c) => Math.hypot(c[0] - x, c[2] - z) < d) && pathD(x, z) > 1.3 && x > 2009 && z > -86;
  for (let i = 0; i < 170; i++) { const x = fx0 + r() * (fx1 - fx0), z = fz0 + r() * (fz1 - fz0), s = 0.8 + r() * 0.7; if (free(x, z, 2.5 + s)) fern(ab, x, z, s, i); }
  // most of it within 2-12 m of the path, where the riding lens actually looks
  for (let i = 0; i < 700; i++) {
    const t = r(), z = -46 - t * 40, x = 2030 - t * 9 + (r() < 0.5 ? -1 : 1) * (2 + r() * 10), s = 0.7 + r() * 0.8;
    if (!free(x, z, 2.5 + s)) continue;
    const k = r();
    if (k < 0.7) fern(ab, x, z, s, i + 500); else if (k < 0.85) mushroom(b, x, z, 0.8 + r()); else rock(b, x, z, 0.25 + r() * 0.5, i);
  }
  for (let i = 0; i < 14; i++) { const x = fx0 + 2 + r() * (fx1 - fx0 - 4), z = fz0 + 2 + r() * (fz1 - fz0 - 4), L = 2.5 + r() * 3; if (free(x, z, 2.5 + L / 2) && pathD(x, z) > L / 2 + 1.5) fallenLog(b, x, z, L, r() * TAU); }
  for (let i = 0; i < 28; i++) { const x = fx0 + r() * (fx1 - fx0), z = fz0 + r() * (fz1 - fz0), s = 0.3 + r() * 0.7; if (free(x, z, 2.5 + s)) rock(b, x, z, s, i); }
  for (let i = 0; i < 40; i++) { const x = fx0 + r() * (fx1 - fx0), z = fz0 + r() * (fz1 - fz0); if (free(x, z, 2.5)) mushroom(b, x, z, 0.8 + r() * 0.8); }
};
const dressVarennes = (b: Batch, ab: Batch, G: THREE.Group) => {
  const yw = D0 - 1.9;
  for (const [x, z, yaw] of [[1998.2, -109, Math.PI / 2 + 0.08], [2004, -92, Math.PI / 2 - 0.1], [1998.6, -124, Math.PI / 2], [2003.8, -133, Math.PI / 2 + 0.05]] as const) boat(b, x, yw, z, yaw);
  if (clear(1977, -93, 1.5, 4)) marketCross(b, 1977, -93);
  laundry(b, [1958, D0 + 5.2, -96.4], [1958, D0 + 5.3, -103.6], 5, 21); laundry(b, [1946, D0 + 5.0, -96.4], [1946, D0 + 5.2, -103.6], 4, 22);
  laundry(b, [2026, D0 + 4.8, -117.6], [2034, D0 + 4.9, -117.6], 5, 23);
  for (const [x, z] of [[1990.3, -115.3], [1983.2, -115.3], [2014.5, -117.4], [2021.5, -117.4], [2042.6, -117.4], [1975.4, -103.4]] as const) if (clear(x, z, 0.3, 0.6)) flowerPot(b, x, z, x);
  for (const [x, z, n] of [[1985.5, -112.6, 3], [2047.6, -113.8, 2], [1973.6, -96.8, 2]] as const) if (clear(x, z, 1, 1)) barrelsAt(G, x, z, n, x * 3 + z);
  cat(b, 2006.25, D0 + 0.12, -111.5, Math.PI / 2 + 0.3);
  for (const [x, z, s] of [[2011.6, -101.8, 1.6], [1982, -100.5, 2.0]] as const) puddle(ab, x, z, s, x); // (none in the arrest view: they read as floating dark blobs)
  ivy(ab, 2047.95, -110, [-1, 0], 3, 4.4);
  // the square floor: a gutter, fallen leaves, wet patches (never within 1 m of the bill's landing), a crate + bucket
  gutter(ab, [2010, -88.8], [2046, -88.8]);
  const [lx, , lz] = LOC.ASSIGNAT_LAND;
  for (const [x, z, w] of [[2030, -95.5, 3], [2026, -92.5, 3.5], [2040, -97, 3], [2031.5, -90, 2.5], [2019, -96, 3.5], [2042, -88, 3]] as const)
    if (Math.hypot(x - lx, z - lz) > w / 2 + 1.2) decal(ab, "leaves", leavesTex, x, z, w, w, x);
  for (const [x, z, w] of [[2016, -93, 3]] as const) if (Math.hypot(x - lx, z - lz) > w / 2 + 1.2) decal(ab, "wet", wetTex, x, z, w, w * 0.8, x);
  { // hi-res setts under the bill's landing (the last image of the film, seen at 2K from ~2 m)
    // base cobbles here: flat(rv1.., z1 = ez1) uv = ((x - rv1) / 4, (ez1 - z) / 4) x repeat .5, canvas 2048 (flipY)
    const [rv1b] = [LOC.RIVER4_X[1]], ez1b = LOC.EAST_SQ_BOX[3], fr = (v: number) => v - Math.floor(v);
    const bcx = fr((lx - rv1b) / 8) * 2048, bcy = (1 - fr((ez1b - lz) / 8)) * 2048;
    const m = detailize(macroize(lam("cobbleClose", () => ({ map: cobbleCloseHD(bcx, bcy), transparent: true, depthWrite: false })), 40, "cc", 1.6,
      [(lx - 0.8 - rv1b) / 64, (ez1b - lz - 0.8) / 64]), 24, "cc", 0.55);
    m.polygonOffset = true; m.polygonOffsetFactor = -1;
    ab.add(new THREE.PlaneGeometry(1.6, 1.6).rotateX(-Math.PI / 2).translate(lx, D0 + 0.0135, lz), m);
  }
};

// ---------------- the whole world ----------------
/** build an alpha-card batch into g on the NOINK layer (3), no shadows */
const DECAL_ORDER: Record<string, number> = { cobbleClose: 0.2, cobbleFade: 0.3, decal_gutter: 0.4, wildflowers: 0.5, puddle2: 0.6, decal_wet: 0.7, decal_straw: 0.8, decal_leaves: 0.9, decal_litter: 1.0, decal_drain: 1.05 };
const buildNoInk = (ab: Batch, g: THREE.Group) => {
  const tmp = new THREE.Group(); ab.build(tmp, false);
  for (const c of [...tmp.children]) {
    c.layers.set(3); g.add(c);
    const mat = (c as THREE.Mesh).material as THREE.Material, key = [...mats.entries()].find(([, m]) => m === mat)?.[0] ?? "";
    // fixed order for every transparent ground layer (no per-frame re-sorting); contact shadows after them all
    c.renderOrder = mat.name === "ao" ? 1.2 : DECAL_ORDER[key] ?? (mat.transparent ? 1.1 : 0);
  }
};
export type WorldParts = { innDoor: THREE.Group; chimneys: V3[]; groups: Record<Place, THREE.Group>; lamps: Lamp[]; halos: { p: V3; s: number; place: Place; flick: number; seed: number }[]; gate: ReturnType<typeof buildGateLeaves> };
export const buildWorld = (root: THREE.Object3D, rays: Ray[] = []): WorldParts => {
  sight = rays; lamps = []; halos = []; chimneys = [];
  macroize(PM.cobble(), 8, "c"); macroize(MAT.dirt(), 8, "d"); detailize(PM.cobble(), 16, "c");
  for (const m of [PM.wall(), PM.cope(), lam("tuilBay", () => ({ map: tuileriesBayHD(false) })), lam("tuilGate", () => ({ map: tuileriesBayHD(true) })), MAT.litter()])
    macroize(m, 8, "s", 1.3);
  const groups = { paris: new THREE.Group(), road: new THREE.Group(), relay: new THREE.Group(), ride: new THREE.Group() } as Record<Place, THREE.Group>;
  for (const g of Object.values(groups)) root.add(g);
  const r = rng(11), cob = PM.cobble();

  // ===== PARIS (take 1, night) =====
  {
    const b = new Batch(), lit = { lit: 0.3 }; aoB = new Batch();
    flat(b, cob, -140, 140, -220, -30, 4, 0.012);
    buildTuileries(b);
    // the street's house rows (fronts at x = +-46 facing inward), ending at the palace corners; back rows; roofs behind
    for (const sx of [-1, 1]) row(b, r, sx * 46, -52, 0, -1, 45, sx > 0 ? -Math.PI / 2 : Math.PI / 2, lit, [8.4, 9.8, 9.8]);
    for (const zf of [56, 70, 84]) for (const sx of [-1, 1]) {
      let x = 58 + r() * 4;
      while (x < 120) { const w = r() < 0.5 ? 7 : 9, h = [8.4, 9.8, 7][Math.floor(r() * 3)]; if (r() > 0.2) house(b, sx * (x + w / 2), -(zf + 4 + r() * 2), 0, w, 8, h, Math.floor(r() * 8), D0, lit); x += w + 1 + r() * 4; }
    }
    for (const zr of [-140, -156, -172]) { let x = -70 + r() * 3; while (x < 70) { const w = r() < 0.5 ? 7 : 9; if (r() > 0.15) house(b, x + w / 2, zr - r() * 2, 0, w, 8, [8.4, 9.8][Math.floor(r() * 2)], Math.floor(r() * 8), D0, lit); x += w + 0.5 + r() * 2.5; } }
    // the plane tree over the waiting coach (subject: never culled), a few more along the house fronts
    addVeg(b, "fat", LOC.TREE1[0], D0, LOC.TREE1[2], 13, 333, 0);
    for (const [x, z] of [[-40, -64], [40, -66], [-41, -88], [41, -80]] as const) tree(b, "round", x, z, 9.5, x * 7 + z);
    // lamps: posts down the street, wall lanterns on the house fronts
    for (const [x, z] of [[-14, -60], [14, -60], [-30, -74], [30, -76], [-40.8, -94], [44.5, -56]] as const) hlx(x, z, 3.2, "paris")(b);
    for (const z of [-62, -78, -92]) for (const sx of [-1, 1]) wallLantern(b, "paris", [sx * 45.3, D0 + 3.6, z], [-sx, 0]);
    // the hook / crowd torches: flickering pools (the torch cards are char's), no halo (the cards carry their flame)
    for (const [x, z] of [[-5.6, -86.4], [-11, -80], [-1, -78], [7, -84], [-8, -70], [4, -70], [10, -76]] as const) addLamp("paris", [x, D0 + 2.4, z], 1.15, 6, 1, 0);
    // the crowd's torches throw warm light up the palace front (the front row stands ~8 m from it)
    for (const [x, z] of [[-14, -91.5], [-8, -92], [-2, -91.5], [4, -92], [10, -91.5], [-20, -92]] as const) addLamp("paris", [x, D0 + 2.6, z], 1.25, 11, 1, 0);
    for (const fg of FOREGROUND) if (fg.kit === "lamppost" && fg.a < 473) addLamp("paris", [fg.pos[0], D0 + (fg.s ?? 3.2), fg.pos[2]], 1.3, 8, 0, 0.9); // the FG lamppost, only if cam keeps it
    hills(b, 0, -80, [[-360, -200, 190, 40, 120], [140, -420, 240, 50, 140], [430, -150, 170, 40, 130], [-440, -130, 190, 44, 150]]);
    treeRing(b, r, 0, -100, 150, 300, 50);
    const ab = new Batch(); dressParis(b, ab, groups.paris);
    b.build(groups.paris); buildNoInk(ab, groups.paris); buildNoInk(aoB!, groups.paris);
  }
  const gate = buildGateLeaves(), innDoor = buildInnDoor();
  groups.paris.add(gate.left, gate.right);

  // ===== ROAD (take 2, night -> dawn) =====
  {
    const b = new Batch(), [rx0, rx1] = [150, 760], RZ = LOC.ROAD2_Z, RW = LOC.ROAD2_W; aoB = new Batch();
    roadSeg(b, [rx0, RZ], [rx1, RZ], RW);
    // fields in strips both sides, hedged; meadow verges
    const kinds = ["wheat", "plough", "meadow", "wheat", "meadow", "plough"] as const;
    for (const side of [-1, 1]) {
      let x = 214;
      while (x < 700) {
        const L = 40 + r() * 40, k = kinds[Math.floor(r() * kinds.length)], z0 = side > 0 ? RZ + 9 : RZ - 9 - 70, z1 = side > 0 ? RZ + 9 + 70 : RZ - 9;
        flat(b, MAT.field(k), x, x + L - 1.5, z0, z1, 8, 0.008);
        if (r() < 0.6) for (let z = z0 + 1.7; z < z1; z += 3.2) tree(b, "hedge", x + L - 0.8, z, 1.4, x + z, 1, false, Math.PI / 2);
        x += L;
      }
    }
    // poplars: south row z -74 every 14 m, north row z -92
    for (let x = 230; x < 720; x += 14) { tree(b, "tall", x + r() * 1.5, LOC.POPLARS2.south, 15 + r() * 3, x, 1); tree(b, "tall", x + 7 + r() * 1.5, LOC.POPLARS2.north, 15 + r() * 3, x + 7, 1); }
    // outskirts: toll barrier (raised), three small houses
    const [bx, , bz] = LOC.BARRIER2;
    for (const s of [-1, 1]) b.add(boxGeo(V(bx - 0.15, D0, bz + s * 3.9 - 0.15), V(bx + 0.15, D0 + 1.3, bz + s * 3.9 + 0.15), 1), PM.wood());
    b.add(boxGeo(V(bx - 0.08, D0 + 1.1, bz - 4.05), V(bx + 0.08, D0 + 6.6, bz - 3.89)), lam("barrierRed", () => ({ map: ctex("barrierStripe", 32, 256, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#f2ead8" : "#b8453a"; g.fillRect(0, i * 32, 32, 32); } }) })));
    house(b, 194, -95, 0, 7, 6, 4.4, 3, D0, { lit: 0.5 });
    house(b, 206, -97, 0, 7, 6, 4.4, 1, D0, { lit: 0.5 });
    house(b, 212, -64, Math.PI, 9, 6, 4.4, 4, D0, { lit: 0.5 });
    wallLantern(b, "road", [204, D0 + 2.6, -93.6], [0, 1]);
    // milestones every 60 m on the south verge
    for (let x = 250; x < 700; x += 60) {
      if (inTheWay(x - 0.3, x + 0.3, D0, D0 + 1, -76.9, -76.3, true)) continue;
      b.add(boxGeo(V(x - 0.22, D0, -76.8), V(x + 0.22, D0 + 0.6, -76.4)), PM.cope());
      b.add(new THREE.CylinderGeometry(0.22, 0.22, 0.4, 12, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).translate(x, D0 + 0.6, -76.6), PM.cope());
    }
    // low hills on the east horizon (silhouettes against the dawn), a ring of trees
    hills(b, 0, 0, [[640, -80, 90, 22, 140], [520, -230, 160, 34, 90], [540, 70, 150, 30, 80], [-60, -80, 120, 30, 140], [260, -300, 200, 40, 100], [260, 140, 200, 40, 100]]);
    treeRing(b, r, 330, -80, 110, 260, 70, (x, z) => Math.abs(z - RZ) < 20);
    const ab = new Batch(); dressRoad(b, ab, groups.road);
    b.build(groups.road); buildNoInk(ab, groups.road); buildNoInk(aoB!, groups.road);
  }

  // ===== SAINTE-MENEHOULD relay yard (take 3, golden) =====
  {
    const b = new Batch(), [x0, z0, x1, z1] = LOC.RELAY_BOX, RZ = LOC.ROAD3_Z; aoB = new Batch();
    flat(b, cob, x0 - 6, x1 + 6, z0, z1, 4, 0.012);
    roadSeg(b, [1050, RZ], [x0 - 6, RZ], 6); roadSeg(b, [x1 + 6, RZ], [1360, RZ], 6);
    // inn (north, front z = -88), door at INN_DOOR; stable (south, front z = -66) with its two big doors
    const [ix0, ix1] = LOC.INN_X, iw = ix1 - ix0, idp = 10;
    house(b, (ix0 + ix1) / 2, LOC.INN_FRONT_Z - idp / 2, 0, iw, idp, 6.2, 0, D0, { doorAt: LOC.INN_DOOR[0] - ix0, keep: true, doorHole: true });
    const [sx0, sx1] = LOC.STABLE_X, sw = sx1 - sx0, sd = 10, scx = (sx0 + sx1) / 2;
    const doorsU = LOC.STABLE_DOORS.map((d) => scx + sw / 2 - d[0]); // yaw PI: local +x = world -x
    house(b, scx, LOC.STABLE_FRONT_Z + sd / 2, Math.PI, sw, sd, 5.5, 1, D0, { keep: true, front: lam("stableFront", () => ({ map: stableHD(sw, 5.5, doorsU) })) });
    // inn sign (pictogram, unlit face) on an iron bracket west of the door
    const sgx = LOC.INN_DOOR[0] - 3.2, sgz = LOC.INN_FRONT_Z;
    b.add(boxGeo(V(sgx - 0.03, D0 + 3.6, sgz), V(sgx + 0.03, D0 + 3.66, sgz + 1.25)), PM.iron());
    for (const s of [-1, 1]) b.add(boxGeo(V(sgx - 0.008, D0 + 3.3, sgz + 0.62 + s * 0.4 - 0.008), V(sgx + 0.008, D0 + 3.62, sgz + 0.62 + s * 0.4 + 0.008)), PM.iron());
    const sign = basic("innSign", new THREE.Color(0.95, 0.9, 0.85), { map: innSignTex(), side: THREE.DoubleSide });
    b.add(new THREE.PlaneGeometry(1.0, 0.78).rotateY(Math.PI / 2).translate(sgx, D0 + 2.9, sgz + 0.62), sign);
    // well: stone drum, two posts, beam, little roof, bucket
    const [wx, , wz] = LOC.WELL; ao(wx, wz, 1.25); ao(LOC.TROUGH[0], LOC.TROUGH[2], 1.5, 0.6);
    b.add(cylGeo(wx, wz, 0.85, 0.85, D0, D0 + 0.85, { seg: 24 }), PM.wall());
    b.add(ring(wx, wz, 0.6, 0.95, D0 + 0.85, true, 24), PM.cope());
    b.add(disk(wx, wz, 0.62, D0 + 0.5, true, 24), basic("wellDark", "#2b2533"));
    for (const s of [-1, 1]) b.add(boxGeo(V(wx - 0.07, D0 + 0.8, wz + s * 0.78 - 0.07), V(wx + 0.07, D0 + 2.5, wz + s * 0.78 + 0.07)), PM.wood());
    b.add(new THREE.CylinderGeometry(0.07, 0.07, 1.7, 8).rotateX(Math.PI / 2).translate(wx, D0 + 2.1, wz), PM.woodDark());
    for (const s of [-1, 1]) b.add(qf(V(wx - 0.75 * s, D0 + 2.45, wz - 1.05), V(wx - 0.75 * s, D0 + 2.45, wz + 1.05), V(wx, D0 + 2.95, wz + 1.05), V(wx, D0 + 2.95, wz - 1.05), V(-s, 1, 0), 1, 0.5), roofMat("#b8644f"));
    b.add(new THREE.CylinderGeometry(0.16, 0.13, 0.26, 12).translate(wx + 0.95, D0 + 0.98, wz + 0.3), PM.wood());
    // trough, hay pile, a bench and a few barrels by the stable
    const [tx, , tz] = LOC.TROUGH;
    b.add(boxGeo(V(tx - 1.2, D0, tz - 0.35), V(tx + 1.2, D0 + 0.6, tz + 0.35), 1), PM.wood());
    b.add(qf(V(tx - 1.12, D0 + 0.52, tz + 0.28), V(tx + 1.12, D0 + 0.52, tz + 0.28), V(tx + 1.12, D0 + 0.52, tz - 0.28), V(tx - 1.12, D0 + 0.52, tz - 0.28), V(0, 1, 0)), lam("troughWater", () => ({ color: "#4f78a8" })));
    const hay = lam("hay", () => ({ color: "#d9b25a" }));
    for (let i = 0; i < 6; i++) b.add(new THREE.SphereGeometry(0.6 + r() * 0.3, 12, 8).scale(1.3, 0.7, 1).translate(1209 - i * 0.7 + r() * 0.3, D0 + 0.15, -64.6 + r() * 0.6), hay);
    b.add(boxGeo(V(1188, D0 + 0.42, -87.5), V(1191, D0 + 0.5, -87.1)), PM.wood());
    for (const x of [1188.3, 1190.7]) b.add(boxGeo(V(x - 0.05, D0, -87.45), V(x + 0.05, D0 + 0.42, -87.15)), PM.wood());
    wallLantern(b, "relay", [LOC.INN_DOOR[0] + 1.3, D0 + 2.9, LOC.INN_FRONT_Z + 0.45], [0, 1], 0.8);
    // houses closing the west (x 1170) and east (x 1230) sides, gaps for the road; the town around
    const rel = { lit: 0.08 };
    row(b, r, 1172, z0 - 4, 0, 1, 14, Math.PI / 2, rel); row(b, r, 1172, RZ + 5, 0, 1, 18, Math.PI / 2, rel);
    row(b, r, 1229, z0 - 4, 0, 1, 14, -Math.PI / 2, rel); row(b, r, 1229, RZ + 5, 0, 1, 18, -Math.PI / 2, rel);
    row(b, r, 1150, -104, 1, 0, 100, 0, rel); row(b, r, 1150, -48, 1, 0, 100, Math.PI, rel);
    for (const [x, z] of [[1180, -60], [1222, -58], [1176, -100], [1236, -94]] as const) tree(b, "round", x, z, 9, x + z);
    // the road leaves the yard between houses (the views west and east looked onto open fields), ending on a house
    row(b, r, 1162, RZ - 4.5, -1, 0, 50, 0, rel); row(b, r, 1162, RZ + 4.5, -1, 0, 50, Math.PI, rel);
    row(b, r, 1236, RZ - 4.5, 1, 0, 50, 0, rel); row(b, r, 1236, RZ + 4.5, 1, 0, 50, Math.PI, rel);
    house(b, 1106, RZ, Math.PI / 2, 16, 8, 8.4, 3, D0, { lit: 0.1, keep: true });
    house(b, 1294, RZ, -Math.PI / 2, 16, 8, 8.4, 5, D0, { lit: 0.1, keep: true });
    // the inn wall west of the door (Drouet's exit is framed tight on it): drainpipe, a second lantern, ivy, a bench
    const dxI = LOC.INN_DOOR[0], zI = LOC.INN_FRONT_Z;
    b.add(new THREE.CylinderGeometry(0.06, 0.06, 6.0, 8).translate(dxI - 4.3, D0 + 3.0, zI + 0.12), PM.iron());
    b.add(new THREE.CylinderGeometry(0.06, 0.09, 0.4, 8).rotateX(0.6).translate(dxI - 4.3, D0 + 0.18, zI + 0.26), PM.iron());
    b.add(boxGeo(V(dxI - 4.5, D0 + 6.0, zI), V(dxI - 4.1, D0 + 6.2, zI + 0.3)), PM.iron());
    wallLantern(b, "relay", [dxI - 1.3, D0 + 2.9, zI + 0.45], [0, 1], 0.8);

    hills(b, 1200, -80, [[-360, -200, 190, 50, 120], [140, -420, 240, 64, 140], [430, -150, 170, 48, 130], [-440, -130, 190, 44, 150], [-300, 160, 200, 46, 120], [300, 200, 200, 50, 120]]);
    treeRing(b, r, 1200, -80, 70, 220, 70, (x, z) => Math.abs(z + 80) < 10);
    const ab = new Batch(); dressRelay(b, ab, groups.relay);
    b.build(groups.relay); buildNoInk(ab, groups.relay); buildNoInk(aoB!, groups.relay); groups.relay.add(innDoor);
  }

  // ===== RIDE + VARENNES (take 4, night) =====
  {
    const b = new Batch(), lb = new Batch(), sleep = { closed: true, lit: 0.18 }; aoB = new Batch();
    forestAB = new Batch();
    // main road (ROAD4) as dirt strips, except over the square and the bridge
    const R4 = LOC.ROAD4;
    for (let i = 0; i + 1 < R4.length; i++) {
      const [a, c] = [R4[i], R4[i + 1]];
      if (a[1] <= -99 && c[1] <= -99 && Math.max(a[0], c[0]) <= 2046) continue;
      roadSeg(lb, a, c[0] < 2046 && c[1] <= -99 ? [2046, -100] : c, 5);
    }
    // fields + meadows around the forest / the escort road
    flat(lb, MAT.field("meadow"), 2046, 2100, -98, -88, 8, 0.008);
    flat(lb, MAT.field("plough"), 2046, 2100, -130, -103, 8, 0.008);
    flat(lb, MAT.field("wheat"), 2036, 2090, -42, 10, 8, 0.008);
    // the mount point: hitching post east of the horse, two houses with lit windows behind
    const [mx, , mz] = LOC.DROUET_MOUNT;
    b.add(boxGeo(V(mx + 1.3, D0, mz - 1.6), V(mx + 1.45, D0 + 1.1, mz - 1.45)), PM.wood());
    b.add(boxGeo(V(mx + 1.3, D0, mz + 1.45), V(mx + 1.45, D0 + 1.1, mz + 1.6)), PM.wood());
    b.add(boxGeo(V(mx + 1.32, D0 + 0.95, mz - 1.6), V(mx + 1.43, D0 + 1.05, mz + 1.6)), PM.wood());
    house(b, mx + 11, mz - 3, -Math.PI / 2, 9, 7, 7, 2, D0, { lit: 0.4 });
    house(b, mx + 11, mz + 8, -Math.PI / 2, 7, 7, 8.4, 5, D0, { lit: 0.4 });
    house(b, mx - 14, mz + 4, Math.PI / 2, 9, 7, 7, 6, D0, { lit: 0.3 });
    wallLantern(b, "ride", [mx + 7.25, D0 + 2.8, mz - 1.0], [-1, 0], 1.4);
    barrelsAt(groups.ride, mx + 6.4, mz - 6.2, 3, 41);
    if (clear(mx + 6.8, mz + 3.2, 1, 0.6)) bench(b, Mx(mx + 6.8, D0, mz + 3.2, Math.PI / 2));
    for (const dz of [-2.4, 0.6, 5.4]) if (clear(mx + 7.1, mz + dz, 0.3, 0.6)) flowerPot(b, mx + 7.1, mz + dz, dz * 9);
    if (clear(mx + 5.6, mz + 10, 1.9, 1)) vegCartAt(b, Mx(mx + 5.6, D0, mz + 10, 1.3), false);
    if (clear(mx + 6, mz - 9.5, 0.5, 0.8)) crate(b, Mx(mx + 6, D0, mz - 9.5, 0.3));
    // the forest shortcut
    buildForest(b, lb);
    // river (north-south), banks, the bridge
    const [rv0, rv1] = LOC.RIVER4_X, yb = D0 - LOC.RIVER4_DEPTH;
    lb.add(qf(V(rv0, yb, 300), V(rv1, yb, 300), V(rv1, yb, -400), V(rv0, yb, -400), V(0, 1, 0), 2.5, 175), lam("bed", () => ({ map: rep(gravelHD(), 1, 1), color: "#8d8070" })));
    for (const [x, dir] of [[rv0, 1], [rv1, -1]] as const) {
      b.add(qf(V(x, yb, dir > 0 ? 300 : -400), V(x, yb, dir > 0 ? -400 : 300), V(x, D0, dir > 0 ? -400 : 300), V(x, D0, dir > 0 ? 300 : -400), V(dir, 0, 0), 175, 0.7), PM.wall());
      b.add(boxGeo(V(x - (dir > 0 ? 0.5 : 0), D0 - 0.05, -400), V(x + (dir > 0 ? 0 : 0.5), D0 + 0.12, 300), 2), PM.cope());
    }
    buildSmallBridge(b);
    recordWins = true; VARENNES_WINDOWS.length = 0;
    // cobbles: the east square (+ the bank strip to the river), the west bridge-head square and the town street
    const [ex0, ez0, ex1, ez1] = LOC.EAST_SQ_BOX;
    flat(lb, cob, rv1, ex1, ez0, ez1, 4, 0.012);
    // ragged cobble fringe fading into the road / meadow past the square's east edge (no hard line in the 1700 aerial)
    lb.add(qf(V(ex1 - 0.5, D0 + 0.015, ez1), V(ex1 + 5.5, D0 + 0.015, ez1), V(ex1 + 5.5, D0 + 0.015, ez0), V(ex1 - 0.5, D0 + 0.015, ez0), V(0, 1, 0), 1, (ez1 - ez0) / 6),
      (() => { const m = lam("cobbleFade", () => ({ map: cobbleFadeHD(), transparent: true, depthWrite: false })); m.polygonOffset = true; m.polygonOffsetFactor = -1; return m; })());
    flat(lb, cob, 1972, rv0, -114, -88, 4, 0.012);
    flat(lb, cob, 1940, 1972, -104, -96, 4, 0.012);
    // the east square: sleeping houses north (fronts z = -118) and on the east corners, gap for the road
    row(b, r, ex0 - 1, ez0 - 2, 1, 0, ex1 - ex0 + 6, 0, sleep, [7, 8.4]);
    row(b, r, ex1 + 3, ez0 - 2, 0, 1, 12, -Math.PI / 2, sleep, [7, 8.4]);
    row(b, r, ex1 + 3, -94.5, 0, 1, 9, -Math.PI / 2, sleep, [7, 8.4]);
    hlx(2040, -114.5, 3.2, "ride")(b);
    hlx(2011.2, -104.2, 3.0, "ride")(b);
    // Varennes upper town (west bank): bridge-head square, street west, rows, the church
    row(b, r, 1992, -116, -1, 0, 46, 0, { ...sleep, shop: 1 });
    row(b, r, 1992, -84, -1, 0, 46, Math.PI, sleep);
    row(b, r, 1970, -96, -1, 0, 26, Math.PI, sleep);
    row(b, r, 1970, -104, -1, 0, 26, 0, sleep);
    row(b, r, 1990, -134, -1, 0, 40, 0, sleep); row(b, r, 1990, -66, -1, 0, 40, Math.PI, sleep);
    church(b, 1934, -128);
    recordWins = false;
    wallLantern(b, "ride", [1990.6, D0 + 3.2, -113.7], [0, 1], 1.2);
    // trees: river banks, gardens, a dark ring around everything
    for (const z of [-140, -128, -76, -64, -54, -44]) { tree(b, "round", 1993.5, z, 8 + r() * 2, z * 3, 1); tree(b, "round", 2008.5, z - 5, 8 + r() * 2, z * 5, 1); }
    treeRing(b, r, 2030, -70, 70, 220, 110, (x, z) => (x > 1945 && x < 2110 && z > -145 && z < 10) || Math.abs(x - 2030) < 8);
    // the escort road east: hedges
    // the escort road's hedges as loose rows of lobed bushes (a continuous rounded hedge read as a green pipe from above)
    for (const z of [-106, -93.6]) for (let x = 2050; x < 2100; x += 1.5 + r() * 0.9) tree(b, "bush", x, z + (r() - 0.5) * 0.6, 0.9 + r() * 0.7, x * 3 + z, 1);
    hills(b, 2030, -80, [[-360, -200, 190, 50, 120], [140, -420, 240, 64, 140], [430, -150, 170, 48, 130], [-440, -130, 190, 44, 150], [300, 200, 200, 50, 120]]);
    const ab = forestAB!; dressVarennes(b, ab, groups.ride);
    b.build(groups.ride); buildNoInk(ab, groups.ride); buildNoInk(aoB!, groups.ride);
    lb.build(groups.ride, false);
  }
  sight = []; aoB = null;
  return { groups, lamps, halos, gate, chimneys, innDoor };
};

// ---------------- foreground framing kits (story.ts FOREGROUND, never culled) ----------------
export type FgKitName = "musket_crate" | "lamppost" | "cannon" | "barrels3" | "cart";
/** a near framing prop as its own group, base at y 0, scaled to height h; `barrels` = BARREL groups to tick */
export const fgKit = (name: FgKitName, h: number) => {
  const grp = new THREE.Group(), b = new Batch(), barrels: THREE.Group[] = [];
  let native = 1;
  if (name === "musket_crate") { crateAt(b, new THREE.Matrix4()); native = 1.0; }
  else if (name === "lamppost") { lampAt(b, new THREE.Matrix4(), h, true); native = h; }
  else if (name === "cannon") { cannonAt(b, new THREE.Matrix4()); native = 1.0; }
  else if (name === "cart") { vegCartAt(b, new THREE.Matrix4()); native = 0.9; }
  else {
    native = BH + 2 * BRM;
    for (const [x, y, z, lying] of [[-0.31, 0, 0, false], [0.31, 0, 0.04, false], [0, BH + BRM - 0.02, -0.02, true]] as const) {
      const g = makeBarrel();
      if (lying) { g.rotation.z = -Math.PI / 2; g.position.set(x - BH / 2, y, z); } else g.position.set(x, y, z);
      grp.add(g); barrels.push(g);
    }
  }
  b.build(grp, false);
  grp.scale.setScalar(h / native);
  return { group: grp, barrels };
};
void pennantAt; void bannerProp; void CUE; void onCircle;
