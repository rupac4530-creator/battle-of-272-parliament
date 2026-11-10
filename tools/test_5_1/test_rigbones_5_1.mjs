// Part 5-1 test: collectRig() on a fake three.js object graph built from the REAL node trees of the 8 rigged GLBs.
// Usage: node tools/test_5_1/test_rigbones_5_1.mjs <path to compiled rigBones.js> <rigged_models dir>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const lib = await import(pathToFileURL(path.resolve(process.argv[2])).href);
const dir = process.argv[3];
const { collectRig, disableCulling, BONE_NAMES } = lib;
let pass = 0, fail = 0;
const chk = (name, cond) => { if (cond) pass++; else { fail++; console.log('FAIL', name); } };

class N {
  constructor(name) { this.name = name; this.parent = null; this.children = []; this.frustumCulled = true; }
  add(c) { c.parent = this; this.children.push(c); return this; }
  traverse(cb) { cb(this); for (const c of this.children) c.traverse(cb); }
}
function glbJson(p) {
  const d = fs.readFileSync(p); const l = d.readUInt32LE(12);
  return JSON.parse(d.subarray(20, 20 + l).toString('utf8'));
}
function build(g) {
  const nodes = g.nodes.map(n => new N(n.name));
  g.nodes.forEach((n, i) => (n.children || []).forEach(c => nodes[i].add(nodes[c])));
  const jointSet = new Set(g.skins[0].joints);
  g.nodes.forEach((n, i) => { if (jointSet.has(i)) nodes[i].isBone = true; if (n.skin !== undefined) { nodes[i].isMesh = true; nodes[i].isSkinnedMesh = true; } });
  const scene = new N('Scene');
  g.scenes[0].nodes.forEach(i => scene.add(nodes[i]));
  g.nodes.forEach((n, i) => { if (n.skin !== undefined) nodes[i].skeleton = { bones: g.skins[0].joints.map(j => nodes[j]) }; });
  return { scene, nodes };
}
const ids = ['rahul', 'shah', 'rajnath', 'yogi', 'kejriwal', 'mamata', 'sitharaman', 'kharge'];
chk('22 bone names', BONE_NAMES.length === 22 && new Set(BONE_NAMES).size === 22);
for (const id of ids) {
  const g = glbJson(path.join(dir, id + '.glb'));
  const { scene, nodes } = build(g);
  const r = collectRig(scene);
  chk(id + ' ok', r.ok);
  chk(id + ' no problems', r.problems.length === 0);
  chk(id + ' 22 bones', Object.keys(r.bones).length === 22);
  chk(id + ' 1 skinned mesh', r.skinned.length === 1);
  chk(id + ' skeleton joint order = BONE_NAMES order', r.skinned[0].skeleton.bones.map(b => b.name).join() === BONE_NAMES.join());
  chk(id + ' culling off', disableCulling(scene) === 1 && r.skinned[0].frustumCulled === false);
  // broken variants must be rejected
  { const s2 = build(g); const b = s2.nodes.find(n => n.name === 'LeftHand'); b.name = 'Hand_L';
    const r2 = collectRig(s2.scene); chk(id + ' renamed bone rejected', !r2.ok && r2.missing.includes('LeftHand')); }
  { const s2 = build(g); const b = s2.nodes.find(n => n.name === 'Head'); const wrong = s2.nodes.find(n => n.name === 'Spine');
    b.parent.children = b.parent.children.filter(c => c !== b); wrong.add(b);
    const r2 = collectRig(s2.scene); chk(id + ' wrong parent rejected', !r2.ok && r2.badParent.includes('Head')); }
  { const s2 = build(g); const m = s2.nodes.find(n => n.isSkinnedMesh); m.isSkinnedMesh = false;
    const r2 = collectRig(s2.scene); chk(id + ' missing skinned mesh rejected', !r2.ok); }
  { const s2 = build(g); const m = s2.nodes.find(n => n.isSkinnedMesh); m.skeleton.bones.pop();
    const r2 = collectRig(s2.scene); chk(id + ' short skeleton rejected', !r2.ok); }
}
// a static (unskinned) scene must be rejected so the loader falls back
{ const s = new N('Scene'); const m = new N('mesh'); m.isMesh = true; s.add(m); const r = collectRig(s); chk('static scene rejected', !r.ok && r.skinned.length === 0); }
// traverse that throws must not throw out of collectRig
{ const r = collectRig({ traverse() { throw new Error('x'); } }); chk('throwing traverse handled', !r.ok); }
console.log(`checks passed ${pass}, failed ${fail}`);
process.exit(fail ? 1 : 0);
