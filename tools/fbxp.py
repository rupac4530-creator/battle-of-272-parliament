import struct,zlib,sys
def parse(path):
    d=open(path,'rb').read(); ver=struct.unpack('<I',d[23:27])[0]; big=ver>=7500
    def rd(o):
        if big: end,np_,pl,nl=struct.unpack('<QQQB',d[o:o+25]); o+=25
        else: end,np_,pl,nl=struct.unpack('<IIIB',d[o:o+13]); o+=13
        if end==0: return None,o
        name=d[o:o+nl].decode('latin1'); o+=nl; props=[]; p=o
        for _ in range(np_):
            t=chr(d[p]); p+=1
            if t in 'YCFDIL':
                f={'Y':'<h','C':'<?','F':'<f','D':'<d','I':'<i','L':'<q'}[t]; props.append(struct.unpack_from(f,d,p)[0]); p+=struct.calcsize(f)
            elif t in 'fdilb':
                n,enc,cl=struct.unpack_from('<III',d,p); p+=12; raw=d[p:p+cl]; p+=cl
                if enc: raw=zlib.decompress(raw)
                sz={'f':4,'d':8,'i':4,'l':8,'b':1}[t]; props.append(('arr',t,len(raw)//sz))
            elif t in 'SR':
                n=struct.unpack_from('<I',d,p)[0]; p+=4; s=d[p:p+n]; p+=n
                props.append(s.decode('latin1') if t=='S' else b'')
        o=p; kids=[]
        while o<end:
            k,o=rd(o)
            if k is None: break
            kids.append(k)
        return (name,props,kids),end
    o=27; top=[]
    while o<len(d)-40:
        n,o=rd(o)
        if n is None: break
        top.append(n)
    return top
