"""
optimize_fbx.py - turn a huge, static, textured FBX character into a small game-ready GLB.

  python tools/optimize_fbx.py input.fbx public/models/<id>/<id>.glb

What it does (pure Python: needs numpy and pillow only):
  * reads the FBX directly (binary 7.x, embedded textures, no skeleton needed)
  * puts the character upright, feet on y=0, centred, 1.82 m tall (the game's fighter size)
  * bakes the base-colour texture into vertex colours (the game draws fighters ~285 px tall,
    so a 4K texture is wasted on phones)
  * clusters ~1.5M triangles down to roughly 60-130K, keeping the head finer than the body
  * writes a single .glb (positions, normals, linear vertex colours, indices)
Models are assumed to face +Z (the game rotates them to face +X).
"""
import sys, io, json, struct, time, numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
from fbxlib import *

HEIGHT = 1.82
CELL_BODY, CELL_HEAD, HEAD_FRAC = 0.0120, 0.0062, 0.84   # metres; finer cells for the top 16% (head)

def load(path):
    f = FBX(path)
    obj = [n for n in f.top if n[0] == 'Objects'][0]
    geo = child(obj, 'Geometry')[0]
    model = child(obj, 'Model')[0]
    sc = props70(model).get('Lcl Scaling', [1, 1, 1])
    verts = f.arr(child(geo, 'Vertices')[0][1][0]).reshape(-1, 3).astype(np.float64) * np.array(sc)
    pvi = f.arr(child(geo, 'PolygonVertexIndex')[0][1][0]).astype(np.int64)
    corners = np.where(pvi < 0, ~pvi, pvi)
    tris = corners.reshape(-1, 3)
    ln = child(geo, 'LayerElementNormal')[0]
    nrm = f.arr(child(ln, 'Normals')[0][1][0]).reshape(-1, 3)
    nidx = f.arr(child(ln, 'NormalsIndex')[0][1][0])
    vn = nrm[nidx].astype(np.float64) if len(nidx) == len(verts) else None
    lu = child(geo, 'LayerElementUV')[0]
    uv = f.arr(child(lu, 'UV')[0][1][0]).reshape(-1, 2)
    uvi = f.arr(child(lu, 'UVIndex')[0][1][0])
    cuv = uv[uvi]                                   # one UV per polygon corner
    # base colour texture = the embedded image that is not normal/roughness/metallic
    tex = None
    for v in child(obj, 'Video'):
        rel = [k for k in v[2] if k[0] == 'RelativeFilename']
        nm = rel[0][1][0].decode('latin1').lower() if rel else ''
        c = [k for k in v[2] if k[0] == 'Content']
        if c and c[0][1] and isinstance(c[0][1][0], tuple) and not any(w in nm for w in ('normal', 'rough', 'metal')):
            tex = Image.open(io.BytesIO(f.raw(c[0][1][0]))).convert('RGB'); break
    return verts, tris, corners, vn, cuv, tex

def srgb2lin(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

def convert(path, out_glb, cell_mul=1.0):
    t0 = time.time()
    verts, tris, corners, vn, cuv, tex = load(path)
    # normalise: feet at y=0, centred on x/z, height = 1.82 m
    mn, mx = verts.min(0), verts.max(0)
    s = HEIGHT / (mx[1] - mn[1])
    P = (verts - [(mn[0] + mx[0]) / 2, mn[1], (mn[2] + mx[2]) / 2]) * s
    # vertex normals (fallback: from faces)
    if vn is None:
        fn = np.cross(P[tris[:, 1]] - P[tris[:, 0]], P[tris[:, 2]] - P[tris[:, 0]])
        vn = np.zeros_like(P)
        for k in range(3): np.add.at(vn, tris[:, k], fn)
    # per-corner colour from the base texture (nearest sample), averaged onto vertices
    W, H = tex.size
    a = np.asarray(tex)
    px = np.clip((cuv[:, 0] % 1.0) * (W - 1), 0, W - 1).astype(np.int64)
    py = np.clip((1 - (cuv[:, 1] % 1.0)) * (H - 1), 0, H - 1).astype(np.int64)
    ccol = srgb2lin(a[py, px].astype(np.float64))
    vcol = np.zeros((len(P), 3)); cnt = np.zeros(len(P))
    for k in range(3): vcol[:, k] = np.bincount(corners, weights=ccol[:, k], minlength=len(P))
    cnt = np.bincount(corners, minlength=len(P)).astype(np.float64)
    vcol /= np.maximum(cnt, 1)[:, None]
    # vertex clustering with finer cells on the head
    cell = np.where(P[:, 1] > HEIGHT * HEAD_FRAC, CELL_HEAD, CELL_BODY * cell_mul)   # head always stays fine
    q = np.floor(P / cell[:, None]).astype(np.int64)
    lvl = (P[:, 1] > HEIGHT * HEAD_FRAC).astype(np.int64)
    key = ((q[:, 0] + 4096) * 8192 + (q[:, 1] + 4096)) * 8192 + (q[:, 2] + 4096)
    key = key * 2 + lvl
    uniq, inv = np.unique(key, return_inverse=True)
    n = len(uniq); w = np.bincount(inv, minlength=n).astype(np.float64)
    def avg(A): return np.stack([np.bincount(inv, weights=A[:, k], minlength=n) for k in range(3)], 1) / w[:, None]
    Pc, Cc = avg(P), avg(vcol)
    Nc = np.stack([np.bincount(inv, weights=vn[:, k], minlength=n) for k in range(3)], 1)
    Nc /= np.maximum(np.linalg.norm(Nc, axis=1, keepdims=True), 1e-9)
    t = inv[tris]
    ok = (t[:, 0] != t[:, 1]) & (t[:, 1] != t[:, 2]) & (t[:, 0] != t[:, 2])
    t = t[ok]
    srt = np.sort(t, axis=1)
    _, first = np.unique(srt[:, 0] * n * n + srt[:, 1] * n + srt[:, 2], return_index=True)
    t = t[np.sort(first)]
    # drop unreferenced vertices
    used = np.unique(t); remap = -np.ones(n, np.int64); remap[used] = np.arange(len(used))
    Pc, Cc, Nc, t = Pc[used], Cc[used], Nc[used], remap[t]
    write_glb(out_glb, Pc.astype(np.float32), Nc.astype(np.float32), Cc.astype(np.float32), t)
    info = dict(cell_mul=round(cell_mul, 2), src_verts=len(P), src_tris=len(tris), verts=len(Pc), tris=len(t), tex=tex.size, secs=round(time.time() - t0, 1))
    return info, (Pc, Nc, Cc, t)

def write_glb(path, P, N, C, T):
    idx_t, idx_dt = (np.uint16, 5123) if len(P) < 65535 else (np.uint32, 5125)
    I = T.astype(idx_t).reshape(-1)
    def pad(b): return b + b' ' * ((4 - len(b) % 4) % 4)
    parts, views, acc = [], [], []
    def add(arr, target, ctype, count, typ, extra=None):
        b = pad(arr.tobytes()); off = sum(len(x) for x in parts); parts.append(b)
        views.append(dict(buffer=0, byteOffset=off, byteLength=arr.nbytes, target=target))
        a = dict(bufferView=len(views) - 1, componentType=ctype, count=count, type=typ)
        if extra: a.update(extra)
        acc.append(a); return len(acc) - 1
    ip = add(I, 34963, idx_dt, len(I), 'SCALAR')
    pp = add(P, 34962, 5126, len(P), 'VEC3', dict(min=P.min(0).tolist(), max=P.max(0).tolist()))
    pn = add(N, 34962, 5126, len(N), 'VEC3')
    pc = add(C, 34962, 5126, len(C), 'VEC3')
    gltf = dict(asset=dict(version='2.0', generator='battle-of-272 optimiser'), scene=0, scenes=[dict(nodes=[0])],
                nodes=[dict(mesh=0)], meshes=[dict(primitives=[dict(attributes=dict(POSITION=pp, NORMAL=pn, COLOR_0=pc), indices=ip, material=0)])],
                materials=[dict(pbrMetallicRoughness=dict(baseColorFactor=[1, 1, 1, 1], metallicFactor=0.0, roughnessFactor=0.7))],
                accessors=acc, bufferViews=views, buffers=[dict(byteLength=sum(len(x) for x in parts))])
    js = pad(json.dumps(gltf, separators=(',', ':')).encode()); bn = b''.join(parts)
    with open(path, 'wb') as f:
        f.write(struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(bn)))
        f.write(struct.pack('<I4s', len(js), b'JSON') + js); f.write(struct.pack('<I4s', len(bn), b'BIN\x00') + bn)

TARGET_TRIS = 130000

def convert_auto(path, out_glb, target=TARGET_TRIS):
    """Coarsen the clustering grid until the model fits the triangle budget."""
    mul = 1.0
    for _ in range(10):
        info, data = convert(path, out_glb, mul)
        if info['tris'] <= target: break
        mul *= 1.12
    return info, data

if __name__ == '__main__':
    info, _ = convert_auto(sys.argv[1], sys.argv[2]); print(info)
