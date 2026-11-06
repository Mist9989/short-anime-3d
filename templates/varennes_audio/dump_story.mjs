// Dumps the picture's per-frame state from MAIN story.ts (read-only) into story_frames.json for the sound pipeline.
// Run: node dump_story.mjs   (Node >= 23 strips the TypeScript types natively)
import { writeFileSync } from "node:fs";
// usage: node dump_story.mjs [story.ts path] [out.json]   (defaults: MAIN story.ts -> story_frames.json)
const SRC = process.argv[2] ?? "../remotion/src/videos/varennes/story.ts"; // path to YOUR project's story.ts
const OUT = process.argv[3] ?? "story_frames.json";
const S = await import("file:///" + SRC.split("\\").join("/"));
const out = { CUE: S.CUE, TOTAL: S.TOTAL, frames: [] };
for (let f = 0; f < S.TOTAL; f++) {
  const sh = S.shotAt(f), id = sh.id, c = S.coachAt(id, f), team = S.teamAt(id, f), cam = S.camAt(id, f);
  const d = S.drouetAt(id, f), cart = S.bridgeCartAt(f), bill = S.assignatAt(id, f), sw = S.teamSwapAt(f);
  out.frames.push({
    f, id, cam: cam.pos, look: cam.look,
    coach: { pos: c.pos, s: c.s, v: c.speed, gait: c.gait, door: c.door, dir: c.dir },
    team: team.map((h) => ({ pos: h.pos, ph: h.phase, gait: h.gait })),
    drouet: { mode: d.mode, pos: d.pos, v: d.speed, ph: d.phase, mount: d.mount, hph: d.horse ? d.horse.phase : null, hgait: d.horse ? d.horse.gait : null },
    cart: { pos: cart.pos, u: cart.u, barrels: cart.barrels }, bill: { mode: bill.mode, pos: bill.pos },
    swap: sw, fade: S.fadeAt(f), sky: S.skyAt(id, f).k,
  });
}
writeFileSync(OUT, JSON.stringify(out));
console.log("frames", out.frames.length);
