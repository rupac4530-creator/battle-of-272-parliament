"""animrig.py -- minimal glTF skinning reader copied unchanged from run_anim_4_1.py (Part 4-1). Reads only rigged_models/*.glb."""
import json
import numpy as np
import animlib as A
CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
def read_glb(path):
    d = open(path, 'rb').read(); assert d[:4] == b'glTF'
    jl = int.from_bytes(d[12:16], 'little'); js = json.loads(d[20:20+jl]); off = 20 + jl; bl = int.from_bytes(d[off:off+4], 'little')
    return js, d[off+8:off+8+bl]
def accessor(js, bin_, i):
    a = js['accessors'][i]; bv = js['bufferViews'][a['bufferView']]; n = NC[a['type']]
    assert 'byteStride' not in bv
    arr = np.frombuffer(bin_, dtype=CT[a['componentType']], count=a['count']*n, offset=bv.get('byteOffset', 0) + a.get('byteOffset', 0))
    return arr.reshape(a['count'], n) if n > 1 else arr

class Rig:
    def __init__(self, path):
        js, bn = read_glb(path); pr = js['meshes'][0]['primitives'][0]; at = pr['attributes']
        self.V = accessor(js, bn, at['POSITION']).astype(np.float64)
        idx = accessor(js, bn, pr['indices']).reshape(-1, 3).astype(np.int64)
        self.J = accessor(js, bn, at['JOINTS_0']).astype(np.int64); w = accessor(js, bn, at['WEIGHTS_0']).astype(np.float64)
        self.W = w / np.maximum(w.sum(1, keepdims=True), 1e-12)
        sk = js['skins'][0]; self.joints = sk['joints']; nodes = js['nodes']
        self.names = [nodes[j]['name'] for j in self.joints]
        self.IBM = accessor(js, bn, sk['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1).astype(np.float64)
        par = {}
        for i, n in enumerate(nodes):
            for c in n.get('children', []): par[c] = i
        pos = {j: k for k, j in enumerate(self.joints)}
        self.parent = [pos.get(par.get(j)) for j in self.joints]
        self.trans = np.array([nodes[j].get('translation', [0, 0, 0]) for j in self.joints], float)
        E = np.r_[idx[:, [0, 1]], idx[:, [1, 2]], idx[:, [2, 0]]]; self.E = np.unique(np.sort(E, axis=1), axis=0)
        self.rest = np.linalg.norm(self.V[self.E[:, 0]] - self.V[self.E[:, 1]], axis=1) + 1e-9
        self.bind = {}; 
        for k in range(22):
            self.bind[k] = self.trans[k] + (self.bind[self.parent[k]] if self.parent[k] is not None else 0)
        self.bind = np.array([self.bind[k] for k in range(22)])
        self.bi = {n: k for k, n in enumerate(self.names)}
    def world(self, p):
        G = [None]*22
        for k in range(22):
            M = np.eye(4); M[:3, :3] = A.m_from_q(A.q_of(p, self.names[k])); t = self.trans[k].copy()
            if self.parent[k] is None: t = t + p['root']
            M[:3, 3] = t; G[k] = M if self.parent[k] is None else G[self.parent[k]] @ M
        return np.array(G)
    def skin(self, p):
        JM = self.world(p) @ self.IBM; vh = np.c_[self.V, np.ones(len(self.V))]; out = np.zeros_like(self.V)
        for k in range(4): out += self.W[:, k, None] * np.einsum('nij,nj->ni', JM[self.J[:, k]][:, :3, :], vh)
        return out
    def stretch(self, p):
        P = self.skin(p); L = np.linalg.norm(P[self.E[:, 0]] - P[self.E[:, 1]], axis=1) + 1e-9
        return np.maximum(L / self.rest, self.rest / L)
    def counts(self, p):
        s = self.stretch(p); return int((s > 3).sum()), int((s > 6).sum()), int((s > 10).sum()), float(s.max())
    def joint_pos(self, p, name):
        return (self.world(p)[self.bi[name]][:3, 3])

