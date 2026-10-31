/**
 * Real-time 3D fighters (three.js) drawn into the existing 2D stage canvas.
 * - Modi uses the supplied FBX model (public/models/modi/modi.fbx); add ?modi=procedural to force the built-in body.
 * - Everyone else gets a procedural 3D body (capsule limbs, lit skin/cloth, hair, beard, glasses, attire).
 * If WebGL/three fails, draw3D() returns false and the old 2D art is used.
 */
import { Politician } from './types';

export interface Pose3D {
  time?: number; isWalking?: boolean; attackProg?: number; attackPhase?: number;
  airborne?: boolean; blocking?: boolean; stunned?: boolean;
}

const SZ = 384, PX = 87, FEET = 285, DRAW = 2 / 3, TAU = Math.PI * 2;
let T: any = null, renderer: any, scene: any, cam: any, glCanvas: HTMLCanvasElement;
let ready = false, failed = false, started = false, modiFbx: any = null;
const rigs = new Map<string, any>();
const ease = (v: number) => v * v * (3 - 2 * v);
const notify = () => window.dispatchEvent(new Event('fighter3d-ready'));

async function init() {
  try {
    T = await import('three');
    glCanvas = document.createElement('canvas');
    glCanvas.width = glCanvas.height = SZ;
    renderer = new T.WebGLRenderer({ canvas: glCanvas, alpha: true, antialias: true });
    renderer.setPixelRatio(1);
    renderer.setSize(SZ, SZ, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    scene = new T.Scene();
    cam = new T.OrthographicCamera(-SZ / PX / 2, SZ / PX / 2, FEET / PX, -(SZ - FEET) / PX, 0.1, 20);
    cam.position.set(0, 0, 6);
    scene.add(new T.HemisphereLight(0xcfe3ff, 0x3a2a1a, 1.0));
    const key = new T.DirectionalLight(0xfff1dc, 2.4); key.position.set(-2, 4, 4); scene.add(key);
    const rim = new T.DirectionalLight(0xffb86b, 1.6); rim.position.set(3, 2, -3); scene.add(rim);
    ready = true;
    notify();
    if (new URLSearchParams(location.search).get('modi') !== 'procedural') loadModi();
  } catch (e) {
    console.warn('3D unavailable, using 2D fighters', e);
    failed = true;
  }
}

async function loadModi() {
  try {
    const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
    const mgr = new T.LoadingManager();
    const base = (import.meta.env?.BASE_URL || './').replace(/\/$/, '');
    mgr.setURLModifier((u: string) => (/\.(jpe?g|png)$/i.test(u) ? `${base}/models/modi/textures/` + u.split(/[\\/]/).pop() : u));
    new FBXLoader(mgr).load(`${base}/models/modi/modi.fbx`, (obj: any) => {
      const wrap = new T.Group(); wrap.add(obj);
      let box = new T.Box3().setFromObject(obj);
      obj.scale.multiplyScalar(1.82 / (box.max.y - box.min.y));
      obj.updateMatrixWorld(true);
      box = new T.Box3().setFromObject(obj);
      obj.position.set(-(box.max.x + box.min.x) / 2, -box.min.y, -(box.max.z + box.min.z) / 2);
      obj.rotation.y = Math.PI / 2; // model faces +z -> make it face +x
      obj.traverse((o: any) => { if (o.isMesh) o.frustumCulled = false; });
      const root = new T.Group(); root.add(wrap);
      modiFbx = { root, body: wrap, a: null };
      rigs.delete('modi');
      notify();
    });
  } catch (e) { console.warn('Modi FBX failed, using procedural body', e); }
}

function build(c: Politician) {
  const M = (col: string, r = 0.65, m = 0, extra: any = {}) => new T.MeshStandardMaterial({ color: col, roughness: r, metalness: m, ...extra });
  const cap = (r: number, l: number) => new T.CapsuleGeometry(r, l, 6, 14);
  const sph = (r: number, ws = 20, hs = 14) => new T.SphereGeometry(r, ws, hs);
  const add = (g: any, mat: any, parent: any, pos: number[] = [0, 0, 0], scl: number[] = [1, 1, 1]) => {
    const m = new T.Mesh(g, mat); m.position.set(pos[0], pos[1], pos[2]); m.scale.set(scl[0], scl[1], scl[2]); parent.add(m); return m;
  };
  const root = new T.Group(), body = new T.Group(), tor = new T.Group(), head = new T.Group();
  root.add(body); body.add(tor); tor.position.y = 0.92; tor.add(head); head.position.y = 0.78;
  const vest = ['modi_jacket', 'bandhgala', 'waistcoat'].includes(c.accessory);
  const skirt = ['sitharaman', 'mamata', 'yogi'].includes(c.id);
  const kurta = vest || c.id === 'kharge';
  const skin = M(c.skin, 0.55), hair = M(c.hairColor, 0.8), dark = M('#14100e', 0.6);
  const sleeve = M(vest ? '#efe6cf' : c.col, 0.8), top = M(vest ? (c.accessory === 'modi_jacket' ? '#ff9933' : c.col) : c.col, 0.75);
  const gold = M('#ffd700', 0.3, 0.8), pants = M(c.pants, 0.8);

  add(cap(0.17, 0.34), top, tor, [0, 0.3, 0], [0.74, 1, 1.1]);
  if (kurta) add(new T.CylinderGeometry(0.17, 0.21, 0.56, 20), sleeve, tor, [0, -0.1, 0], [0.78, 1, 1.05]);
  add(new T.CylinderGeometry(0.045, 0.05, 0.12, 12), skin, tor, [0, 0.64, 0]);

  const hips: any[] = [], knees: any[] = [], sh: any[] = [], el: any[] = [];
  [-1, 1].forEach((s, i) => {
    const hip = new T.Group(); hip.position.set(0, 0.92, s * 0.09); body.add(hip); hips.push(hip);
    add(cap(0.075, 0.3), pants, hip, [0, -0.23, 0]);
    const knee = new T.Group(); knee.position.y = -0.46; hip.add(knee); knees.push(knee);
    add(cap(0.06, 0.3), pants, knee, [0, -0.23, 0]);
    add(sph(0.06), M(c.id === 'mamata' ? '#2aa3dc' : '#17120f', 0.4), knee, [0.06, -0.45, 0], [1.9, 0.55, 1.05]);
    const arm = new T.Group(); arm.position.set(0, 0.54, s * 0.21); tor.add(arm); sh.push(arm);
    add(cap(0.052, 0.2), sleeve, arm, [0, -0.15, 0]);
    const elbow = new T.Group(); elbow.position.y = -0.3; arm.add(elbow); el.push(elbow);
    add(cap(0.045, 0.18), c.id === 'rahul' ? skin : sleeve, elbow, [0, -0.14, 0]);
    add(sph(0.05), skin, elbow, [0, -0.3, 0]);
    add(sph(0.062), sleeve, arm, [0, 0, 0]);
  });

  let skirtMesh: any = null;
  if (skirt) {
    skirtMesh = add(new T.CylinderGeometry(0.19, 0.27, 0.86, 22, 1, true), M(c.pants, 0.85, 0, { side: T.DoubleSide }), body, [0, 0.5, 0], [0.95, 1, 1.1]);
    add(new T.TorusGeometry(0.27, 0.014, 6, 24), M(c.id === 'mamata' ? '#0288d1' : '#ffd700', 0.4, 0.5), skirtMesh, [0, -0.42, 0], [1, 1, 1]).rotation.x = Math.PI / 2;
  }
  if (c.accessory === 'saree_zari' || c.accessory === 'tant_blue_border' || c.accessory === 'angavastram') {
    const band = add(new T.BoxGeometry(0.03, 0.62, 0.17), M(c.accessory === 'angavastram' ? '#ff9933' : c.pants, 0.8), tor, [0.125, 0.3, 0], [1, 1, 1]);
    band.rotation.x = 0.55;
    add(new T.BoxGeometry(0.035, 0.62, 0.04), M(c.accessory === 'saree_zari' ? '#ffd700' : c.accessory === 'angavastram' ? '#138808' : '#0288d1', 0.4), band, [0.004, 0, 0.06]);
  }
  if (c.accessory === 'modi_jacket' || c.accessory === 'bandhgala' || c.accessory === 'waistcoat')
    for (let i = 0; i < 4; i++) add(sph(0.014, 8, 6), gold, tor, [0.128, 0.5 - i * 0.1, 0]);
  if (c.accessory === 'modi_jacket') add(sph(0.03), gold, tor, [0.12, 0.45, 0.1]);
  if (c.accessory === 'muffler') {
    add(new T.TorusGeometry(0.095, 0.045, 10, 20), M('#880e4f', 0.95), tor, [0, 0.67, 0]).rotation.x = Math.PI / 2;
    add(cap(0.04, 0.3), M('#880e4f', 0.95), tor, [0.1, 0.4, 0.04]);
  }
  if (c.accessory === 'mala') add(new T.TorusGeometry(0.1, 0.012, 6, 20), M('#3e2723', 0.6), tor, [0.02, 0.6, 0], [1, 1, 1]).rotation.x = Math.PI / 2 - 0.4;

  // Head & face (faces +x)
  const hs = [0.95, 1.2, 0.88];
  add(sph(0.11, 28, 20), skin, head, [0, 0, 0], hs);
  add(sph(0.025), skin, head, [0, 0, 0.105], [0.6, 1.2, 0.6]);
  add(sph(0.025), skin, head, [0, 0, -0.105], [0.6, 1.2, 0.6]);
  add(new T.ConeGeometry(0.02, 0.045, 10), skin, head, [0.115, -0.012, 0]).rotation.z = -Math.PI / 2;
  const white = M('#f6f6f0', 0.3);
  [-1, 1].forEach(s => {
    add(sph(0.018), white, head, [0.092, 0.03, s * 0.04]);
    add(sph(0.01), dark, head, [0.108, 0.03, s * 0.04]);
    add(new T.BoxGeometry(0.012, 0.008, 0.04), c.hairStyle === 'beard_glasses' || c.hairStyle === 'glasses_scarf' ? M('#dcdcdc') : dark, head, [0.098, 0.064, s * 0.04]);
  });
  const mouth = add(new T.BoxGeometry(0.01, 0.01, 0.05), M('#3a1410', 0.5), head, [0.097, -0.055, 0]);
  const capGeo = (r = 0.119, th = Math.PI * 0.52) => new T.SphereGeometry(r, 28, 16, 0, TAU, 0, th);
  const beardGeo = (r = 0.108) => new T.SphereGeometry(r, 24, 14, 0, TAU, Math.PI * 0.55, Math.PI * 0.45);
  const style = c.hairStyle;
  const hc = (col: string, th?: number) => { const m = add(capGeo(0.121, th), M(col, 0.85), head, [-0.004, 0.004, 0], [0.97, 1.22, 0.9]); m.rotation.z = 0.28; };
  const bd = (col: string, sc = 1, o = 1) => {
    add(beardGeo(), M(col, 0.9, 0, o < 1 ? { transparent: true, opacity: o } : {}), head, [0.004, -0.01, 0], [0.95 * sc, 1.18 * sc, 0.9 * sc]);
  };
  if (style === 'beard_glasses') { hc('#f4f4f4'); bd('#f1f1f1'); add(new T.BoxGeometry(0.02, 0.012, 0.07), M('#f1f1f1'), head, [0.108, -0.04, 0]); }
  else if (style === 'bald_beard') { bd('#d2d4d6', 0.99); hc('#c9cdd0', Math.PI * 0.28); }
  else if (style === 'wavy_stubble') { hc('#1f2528'); bd('#3b4045', 1, 0.6); [-0.06, 0, 0.06].forEach(z => add(sph(0.035), M('#1f2528'), head, [0.03, 0.14, z])); }
  else if (style === 'shaved_kundal') { add(capGeo(0.113, Math.PI * 0.5), M('#3a2c25', 0.9, 0, { transparent: true, opacity: 0.3 }), head, [0, 0.004, 0], [0.97, 1.21, 0.9]); add(new T.BoxGeometry(0.01, 0.05, 0.012), M('#d32f2f'), head, [0.107, 0.075, 0]); [-1, 1].forEach(s => add(sph(0.014), gold, head, [0, -0.05, s * 0.105])); }
  else if (style === 'parted_tilak') { hc('#8e9aa0'); add(new T.BoxGeometry(0.01, 0.045, 0.012), M('#d50000'), head, [0.107, 0.075, 0]); add(new T.BoxGeometry(0.014, 0.012, 0.06), M('#cfd4d6'), head, [0.105, -0.04, 0]); }
  else if (style === 'bun_bindi' || style === 'bun_saree') { hc('#1a1a1a'); add(sph(0.06), M('#1a1a1a', 0.8), head, [-0.1, 0.07, 0]); add(sph(0.011), M('#b71c1c'), head, [0.108, 0.058, 0]); }
  else if (style === 'glasses_scarf') { hc('#f5f5f5', Math.PI * 0.4); add(new T.BoxGeometry(0.014, 0.012, 0.06), M('#e8e8e8'), head, [0.105, -0.04, 0]); }
  else if (style === 'muffler_topi') {
    add(new T.CylinderGeometry(0.1, 0.118, 0.08, 24), M('#ffffff', 0.9), head, [-0.005, 0.125, 0]);
    add(new T.CylinderGeometry(0.119, 0.119, 0.016, 24), M('#0277bd'), head, [-0.005, 0.092, 0]);
    add(new T.BoxGeometry(0.014, 0.012, 0.07), M('#111'), head, [0.105, -0.038, 0]);
  }
  if (['beard_glasses', 'bald_beard', 'glasses_scarf', 'muffler_topi', 'bun_saree'].includes(style)) {
    const fr = M(style === 'glasses_scarf' ? '#000' : '#2a2a2a', 0.3, 0.6), th = style === 'glasses_scarf' ? 0.006 : 0.004;
    [-1, 1].forEach(s => {
      add(new T.TorusGeometry(0.03, th, 6, 20), fr, head, [0.105, 0.03, s * 0.042]).rotation.y = Math.PI / 2;
      add(new T.CircleGeometry(0.028, 16), M('#9ccbe6', 0.1, 0, { transparent: true, opacity: 0.18, side: T.DoubleSide }), head, [0.106, 0.03, s * 0.042]).rotation.y = Math.PI / 2;
      add(new T.BoxGeometry(0.1, 0.004, 0.004), fr, head, [0.055, 0.04, s * 0.073]);
    });
    add(new T.BoxGeometry(0.004, 0.004, 0.02), fr, head, [0.105, 0.04, 0]);
  }
  root.rotation.y = -0.5;
  return { root, body, tor, head, hips, knees, sh, el, mouth, skirt: skirtMesh, a: true };
}

function pose(r: any, p: Pose3D) {
  const t = p.time || 0, ph = t * 11, s = Math.sin(ph), cs = Math.cos(ph);
  const a = p.attackPhase ?? (p.attackProg ? 0.5 : 0);
  let bob = Math.sin(t * 2.2) * 0.008, lean = -0.04 + Math.sin(t * 1.3) * 0.015, twist = 0, head = 0, lunge = 0;
  let lL = 0, lR = 0, kL = 0, kR = 0, sL = 0.08, sR = 0.08, eL = 0.25, eR = 0.25;
  if (p.stunned) { lean = 0.38; head = 0.3; sL = sR = -0.7; eL = eR = 0.2; lL = 0.2; lR = -0.3; kL = 0.3; kR = 0.4; bob = -0.02; }
  else if (p.airborne) { lL = 0.9; lR = -0.2; kL = 1.2; kR = 0.5; sL = sR = 1.9; eL = eR = 0.4; lean = -0.12; bob = 0; }
  else if (p.blocking) { bob = -0.06; lL = 0.45; lR = -0.25; kL = 0.7; kR = 0.5; sL = sR = 1.35; eL = eR = 1.7; lean = 0.06; }
  else if (a > 0) {
    const w = a < 0.3 ? ease(a / 0.3) : 1 - ease(Math.min(1, (a - 0.3) / 0.2));
    const st = a < 0.3 ? 0 : a < 0.5 ? ease((a - 0.3) / 0.2) : 1 - ease((a - 0.5) / 0.5);
    sR = -0.9 * w + 1.6 * st; eR = 1.3 * w * (1 - st) + 0.05; sL = 0.5; eL = 1.5;
    twist = -0.5 * w + 0.55 * st; lean = 0.08 * w - 0.22 * st; lL = 0.5 * st; lR = -0.4 * st; kL = 0.3 * st; kR = 0.25 * st;
    bob = -0.03 * st; lunge = 0.12 * st; head = -0.05 * st;
  } else if (p.isWalking) {
    lL = s * 0.65; lR = -s * 0.65; kL = Math.max(0, cs) * 0.9; kR = Math.max(0, -cs) * 0.9;
    sL = -s * 0.55; sR = s * 0.55; eL = eR = 0.5; bob = Math.abs(cs) * 0.035; lean = -0.1; twist = s * 0.14;
  }
  r.body.position.set(lunge, bob, 0);
  if (!r.a) { r.body.rotation.z = lean; r.body.rotation.y = twist; return; }
  r.tor.rotation.z = lean; r.tor.rotation.y = twist; r.head.rotation.z = head - lean * 0.5;
  r.sh[0].rotation.z = sL; r.sh[1].rotation.z = sR; r.sh[0].rotation.x = 0.1; r.sh[1].rotation.x = -0.1;
  r.el[0].rotation.z = eL; r.el[1].rotation.z = eR;
  r.hips[0].rotation.z = lL; r.hips[1].rotation.z = lR; r.knees[0].rotation.z = -kL; r.knees[1].rotation.z = -kR;
  r.mouth.scale.y = a > 0.25 ? 3 : 1;
  if (r.skirt) r.skirt.rotation.z = (lL - lR) * 0.05;
}

export function draw3D(ctx: CanvasRenderingContext2D, c: Politician, x: number, y: number, facing: number, scale: number, p: Pose3D): boolean {
  if (failed || typeof window === 'undefined') return false;
  if (!started) { started = true; init(); }
  if (!ready) return false;
  let rig = rigs.get(c.id);
  if (!rig) {
    rig = c.id === 'modi' && modiFbx ? modiFbx : build(c);
    if (rig === modiFbx) rig.root.rotation.y = -0.5;
    rigs.set(c.id, rig);
  }
  scene.add(rig.root);
  pose(rig, p);
  renderer.render(scene, cam);
  scene.remove(rig.root);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * scale * DRAW, scale * DRAW);
  ctx.drawImage(glCanvas, -SZ / 2, -FEET);
  ctx.restore();
  return true;
}
