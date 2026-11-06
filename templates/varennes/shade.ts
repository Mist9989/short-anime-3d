// Stylised two-tone lighting for every world material (lighting.md 9.2, world part): albedo x mix(shadeCol, litCol,
// sunTerm), sunTerm = real shadow-map visibility x a soft N.L terminator. The sun visibility is captured inside three's
// own light loop (LFB), so nothing is computed twice. Character cards (cardShade) live in the CHAR agent's file and
// can import LFB / CHAR from here; world.ts sets every uniform below once per frame from LIGHTS.
import * as THREE from "three";

export const TONE = {
  uLitCol: { value: new THREE.Vector3(1.5, 1.44, 1.32) }, uShadeCol: { value: new THREE.Vector3(0.6, 0.58, 0.86) },
  uShadeLift: { value: new THREE.Vector3() }, uLambert: { value: 0.35 }, uSideK: { value: 0.84 }, uTerm: { value: 0.2 },
  uBounce: { value: new THREE.Vector3() }, // warm bounce on shaded faces turned to the camera (golden only; day = 0)
  uSat: { value: 1 }, // world albedo saturation around its luminance (characters are not twoTone, so unaffected)
};
/** warm light pools (lanterns, torches, the king's window, coach lamps): NPOOL nearest sources, VIEW-space position +
 *  radius (xyz, w) and linear colour x intensity. world.ts fills them every frame (unused slots: radius 0). twoTone adds
 *  albedo x colour x (1 - d / r)^2 x soft N.L on top of the moon/sun two-tone. Exported for cardshade.ts too. */
export const NPOOL = 8;
export const POOLS = {
  uPoolPos: { value: Array.from({ length: NPOOL }, () => new THREE.Vector4(0, 0, 0, 0)) },
  uPoolCol: { value: Array.from({ length: NPOOL }, () => new THREE.Vector3()) },
};
/** character-card uniforms (lighting.md 9.2 cardShade); world.ts keeps them in sync with LIGHTS for cardshade.ts */
export const CHAR = {
  uCharTint: { value: new THREE.Vector3(1, 0.94, 0.92) }, uCharShade: { value: 0.86 }, uGrad: { value: 0.07 },
  uBodyGrad: { value: 0.2 }, uSideTint: { value: new THREE.Vector3(0.92, 0.9, 0.96) },
};

// directional light 0 = the sun = the only shadow caster (three sorts shadow-casting lights first). Only the
// UNROLLED index 0 compiles the shadow block, so sunVis is written once.
export const LFB = THREE.ShaderChunk.lights_fragment_begin
  .replace("directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ]",
    "sunVis = ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ]")
  .replace("vDirectionalShadowCoord[ i ] ) : 1.0;", "vDirectionalShadowCoord[ i ] ) : 1.0;\n\t\tdirectLight.color *= sunVis;");
if (!LFB.includes("directLight.color *= sunVis")) throw new Error("shade.ts: three lights_fragment_begin changed");

const TWO_TONE = /* glsl */ `
#if NUM_DIR_LIGHTS > 0
{
  vec3 sunV = directionalLights[ 0 ].direction;                               // view space, towards the sun
  vec3 upV = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
  float ndl = max( dot( geometryNormal, sunV ), 0.0 );
#ifdef SOFT_TERM
  // foliage: a wide soft terminator and most self-shadowing ignored (canopy lobes split into hard green / blue stripes)
  float sunTerm = mix( sunVis, 1.0, 0.7 ) * smoothstep( -0.3, 0.6, dot( geometryNormal, sunV ) );
#else
  float sunTerm = sunVis * smoothstep( 0.0, uTerm, ndl );                     // 0 = cast/form shadow, 1 = lit
#endif
  float skyK = mix( uSideK, 1.0, 0.5 + 0.5 * dot( geometryNormal, upV ) );    // up-facing a bit brighter
  vec3 lit = uLitCol * mix( 1.0, ndl, uLambert );                             // keep some cosine modelling
  float facing = max( dot( geometryNormal, geometryViewDir ), 0.0 );        // 1 = faces the lens
  vec3 alb = max( mix( vec3( dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) ) ), diffuseColor.rgb, uSat ), 0.0 );
  // the shade side (albedo x shade + lift) is capped just under the lit side of the same albedo: on dark albedos the lift
  // made cast shadows lighter than the moonlit ground around them (QA r3b #11)
  vec3 litV = alb * lit * skyK;
  vec3 shV = min( alb * uShadeCol * skyK + uBounce * alb * facing * clamp( 1.0 - dot( geometryNormal, upV ), 0.0, 1.0 ) + uShadeLift * LIFT_K, litV * 0.88 + 0.004 );
  reflectedLight.directDiffuse = mix( shV, litV, sunTerm );
  vec3 poolL = vec3( 0.0 ), fragV = - vViewPosition;
  for ( int i = 0; i < NPOOL; i ++ ) {
    vec3 dP = uPoolPos[ i ].xyz - fragV; float dL = length( dP );
    // windowed inverse-square falloff (bright near the flame, a long soft tail, exactly 0 at the radius), capped at 1
    float q = dL / max( uPoolPos[ i ].w, 1e-3 ), win = clamp( 1.0 - q * q * q * q, 0.0, 1.0 );
    float a = min( 1.0, 1.6 / ( 1.0 + 0.35 * dL * dL ) ) * win * win;
    poolL += uPoolCol[ i ] * a * ( 0.3 + 0.7 * max( dot( geometryNormal, dP / max( dL, 1e-3 ) ), 0.0 ) );
  }
  reflectedLight.directDiffuse += alb * poolL;
  reflectedLight.indirectDiffuse = vec3( 0.0 );                               // hemisphere/fill no longer used here
}
#endif
`;
const DECL = `#include <common>\nuniform vec3 uLitCol; uniform vec3 uShadeCol; uniform vec3 uShadeLift; uniform float uLambert; uniform float uSideK; uniform float uTerm; uniform vec3 uBounce; uniform float uSat;
#define NPOOL ${NPOOL}
uniform vec4 uPoolPos[ NPOOL ]; uniform vec3 uPoolCol[ NPOOL ];`;

/** Lambert (or Phong: its specular term is kept, masked by the shadow) -> two-tone. Call once per material. */
export function twoTone<T extends THREE.MeshLambertMaterial | THREE.MeshPhongMaterial>(m: T, liftK = 1, soft = false): T {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, TONE, POOLS);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", DECL + `\n#define LIFT_K ${liftK.toFixed(3)}` + (soft ? "\n#define SOFT_TERM" : ""))
      .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
      .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n" + TWO_TONE);
  };
  m.customProgramCacheKey = () => "twoTone6_" + liftK.toFixed(3) + (soft ? "s" : "");
  return m;
}

// ---------------- tone-map inversion ----------------
// The composer ends in PBR-Neutral tone mapping, so a colour written to the scene buffer is NOT what lands on screen
// (toe: -0.04 linear offset, shoulder above 0.76). Self-lit things whose on-screen colour is a measured target (sky,
// fog, river) are written as untone(target): the linear value that the Neutral curve maps onto the target.
const neutral = (c: number[]) => {
  const x = Math.min(c[0], c[1], c[2]), off = x < 0.08 ? x - 6.25 * x * x : 0.04;
  const v = c.map((k) => k - off), peak = Math.max(v[0], v[1], v[2]), S = 0.76;
  if (peak < S) return v;
  const d = 1 - S, np = 1 - (d * d) / (peak + d - S), g = 1 - 1 / (0.15 * (peak - np) + 1);
  return v.map((k) => (k * np) / peak * (1 - g) + np * g);
};
/** linear input that the Neutral tone map turns into the given on-screen colour (hex or THREE.Color, sRGB target) */
export const untone = (target: THREE.ColorRepresentation, out = new THREE.Color()) => {
  const t = new THREE.Color(target); // linear working space
  const tt = [t.r, t.g, t.b].map((k) => Math.min(k, 0.985));
  let c = tt.slice();
  for (let i = 0; i < 60; i++) { const y = neutral(c); c = c.map((k, j) => Math.max(0, k + (tt[j] - y[j]))); }
  return out.setRGB(c[0], c[1], c[2]);
};
