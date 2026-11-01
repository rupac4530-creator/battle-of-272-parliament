import struct, zlib, numpy as np
class FBX:
    def __init__(s, path):
        s.d = open(path,'rb').read(); s.ver = struct.unpack_from('<I', s.d, 23)[0]; s.big = s.ver >= 7500
        o = 27; s.top = []
        while o < len(s.d) - 100:
            n, o = s._node(o)
            if n is None: break
            s.top.append(n)
    def _node(s, o):
        d = s.d
        if s.big: end, npr, plen, nl = struct.unpack_from('<QQQB', d, o); o += 25
        else: end, npr, plen, nl = struct.unpack_from('<IIIB', d, o); o += 13
        if end == 0: return None, o
        name = d[o:o+nl].decode('latin1'); o += nl
        props = []; po = o
        for _ in range(npr):
            t = chr(d[po]); po += 1
            if t in 'CYIFDL':
                fmt = {'C':'<B','Y':'<h','I':'<i','F':'<f','D':'<d','L':'<q'}[t]
                props.append(struct.unpack_from(fmt, d, po)[0]); po += struct.calcsize(fmt)
            elif t in 'fdlib':
                n, enc, clen = struct.unpack_from('<III', d, po); po += 12
                props.append(('arr', t, n, enc, clen, po)); po += clen
            elif t in 'SR':
                ln = struct.unpack_from('<I', d, po)[0]; po += 4
                props.append(d[po:po+ln] if t == 'S' else ('raw', po, ln)); po += ln
        o = po; kids = []
        while o < end:
            k, o = s._node(o)
            if k is None: break
            kids.append(k)
        return (name, props, kids), end
    def arr(s, p):
        _, t, n, enc, clen, off = p
        raw = s.d[off:off+clen]
        if enc == 1: raw = zlib.decompress(raw)
        return np.frombuffer(raw, dtype={'f':'<f4','d':'<f8','l':'<i8','i':'<i4','b':'?'}[t])
    def raw(s, p): return s.d[p[1]:p[1]+p[2]]
def child(n, name): return [k for k in n[2] if k[0] == name]
def pname(b): return b.split(b'\x00')[0].decode('latin1')
def props70(n):
    out = {}
    for p in child(n, 'Properties70'):
        for k in p[2]:
            if k[0] == 'P': out[k[1][0].decode()] = k[1][4:]
    return out
