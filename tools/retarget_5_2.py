import sys,json,struct,numpy as np
sys.path.insert(0,'/home/claude/w')
import modi_rest as M
from modi_rest import models,par,byname,R
STD=['Hips','Spine','Spine1','Spine2','Neck','Head','LeftShoulder','LeftArm','LeftForeArm','LeftHand','RightShoulder','RightArm','RightForeArm','RightHand','LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase','RightUpLeg','RightLeg','RightFoot','RightToeBase']
# --- std bind from rajnath rigged glb
def glb(path):
    d=open(path,'rb').read(); n=struct.unpack('<I',d[12:16])[0]; return json.loads(d[20:20+n])
g=glb('/home/claude/w/x/public/models/rajnath/rajnath.rigged.glb')
nodes=g['nodes']; sp={}
for i,n in enumerate(nodes):
    for c in n.get('children',[]): sp[c]=i
sidx={nodes[i]['name']:i for i in range(len(nodes)) if nodes[i].get('name') in STD}
spar={n:(nodes[sp[sidx[n]]]['name'] if sp.get(sidx[n]) is not None and nodes[sp[sidx[n]]].get('name') in STD else None) for n in STD}
loc={n:np.array(nodes[sidx[n]].get('translation',[0,0,0]),float) for n in STD}
def spos(n):
    p=spar[n]; return loc[n]+(spos(p) if p else 0)
SP={n:spos(n) for n in STD}
sch={n:[c for c in STD if spar[c]==n] for n in STD}
# --- modi rest
def rot_only(u):
    pr=models[u][1]; g_=lambda k:np.array(pr.get(k,(0,0,0)),float)
    return R(g_('PreRotation'))@R(g_('Lcl Rotation'))
def wrot(u):
    r=rot_only(u); return wrot(par[u])@r if u in par else r
MP={n:M.world(byname[n])[:3,3] for n in byname}
WR={n:wrot(byname[n]) for n in byname}
def arc(a,b):
    a=a/np.linalg.norm(a); b=b/np.linalg.norm(b); v=np.cross(a,b); c=a@b
    if c<-0.999999:
        ax=np.cross(a,[1,0,0]); 
        if np.linalg.norm(ax)<1e-3: ax=np.cross(a,[0,1,0])
        ax/=np.linalg.norm(ax); return 2*np.outer(ax,ax)-np.eye(3)
    K=np.array([[0,-v[2],v[1]],[v[2],0,-v[0]],[-v[1],v[0],0]]); return np.eye(3)+K+K@K/(1+c)
# std child used for direction
DIRCHILD={'Hips':'Spine','Spine':'Spine1','Spine1':'Spine2','Spine2':'Neck','Neck':'Head','LeftShoulder':'LeftArm','RightShoulder':'RightArm','LeftArm':'LeftForeArm','RightArm':'RightForeArm','LeftForeArm':'LeftHand','RightForeArm':'RightHand','LeftUpLeg':'LeftLeg','RightUpLeg':'RightLeg','LeftLeg':'LeftFoot','RightLeg':'RightFoot','LeftFoot':'LeftToeBase','RightFoot':'RightToeBase'}
CAL={}
for n in STD:
    if n in DIRCHILD and DIRCHILD[n] in byname:
        CAL[n]=arc(MP[DIRCHILD[n]]-MP[n], SP[DIRCHILD[n]]-SP[n])
    else: CAL[n]=None
for n in STD:
    if CAL[n] is None: CAL[n]=CAL[spar[n]] if spar[n] else np.eye(3)   # hands/toes inherit parent alignment
# nearest std ancestor-or-self for every modi bone
names={u:v[0] for u,v in models.items()}
def anc(u):
    while u is not None:
        if names[u] in STD: return names[u]
        u=par.get(u)
    return None
order=[]
def visit(u):
    order.append(u)
    for c in [k for k,v in par.items() if v==u]: visit(c)
roots=[u for u in models if u not in par]
for r in roots: visit(r)
out=[]
idx={u:i for i,u in enumerate(order)}
def mat2q(m):
    t=np.trace(m)
    if t>0:
        s=np.sqrt(t+1)*2; q=[(m[2,1]-m[1,2])/s,(m[0,2]-m[2,0])/s,(m[1,0]-m[0,1])/s,s/4]
    else:
        i=np.argmax(np.diag(m)); j,k=(i+1)%3,(i+2)%3; s=np.sqrt(1+m[i,i]-m[j,j]-m[k,k])*2
        q=[0,0,0,0]; q[i]=s/4; q[j]=(m[j,i]+m[i,j])/s; q[k]=(m[k,i]+m[i,k])/s; q[3]=(m[k,j]-m[j,k])/s
    q=np.array(q); return (q/np.linalg.norm(q)).tolist()
for u in order:
    a=anc(u); K=(CAL[a]@WR[names[u]]) if a else WR[names[u]]
    out.append({'name':names[u],'parent':idx[par[u]] if u in par else -1,'std':a,'K':mat2q(K),'K_m':K.tolist()})
json.dump({'note':'Part 5-2 Modi retarget: world(b)=Dw(std ancestor a)*K_b; local=inv(world(parent))*world(b). K_b=CAL_a*restWorldRot_b (shortest-arc alignment of Modi rest bone direction to the standard rig bind direction).','std_bones':STD,'std_parent':spar,'bones':[{k:v for k,v in o.items() if k!='K_m'} for o in out]},open('modi_retarget_5_2.json','w'),indent=0)
print(len(out),'bones; non-std bones:',sum(1 for o in out if o['std'] is None or o['name'] not in STD))
# ---- reference pose + validation
clips=json.load(open('/home/claude/w/x/anim/stance_walk_4_2.json'))['clips']
q0=clips['idle']['keys'][0]['pose']['q']
def qm(q):
    x,y,z,w=q; return np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])
Dw={}
def dw(n):
    if n in Dw: return Dw[n]
    r=qm(q0[n]) if n in q0 else np.eye(3); Dw[n]=(dw(spar[n])@r) if spar[n] else r; return Dw[n]
for n in STD: dw(n)
def posed(u0=None):
    W={}; L={}
    for u in order:
        a=anc(u); K=out[idx[u]]['K_m']; W[u]=(Dw[a] if a else np.eye(3))@np.array(K)
        L[u]=(W[par[u]].T@W[u]) if u in par else W[u]
    return W,L
W,L=posed()
# modi posed positions via FK with rest local offsets
def offs(u): 
    return (MP[names[u]]-MP[names[par[u]]]) if u in par else MP[names[u]]
# rest local offset in parent frame = WR[parent]^T * worldoffset
P={}
for u in order:
    if u in par: P[u]=P[par[u]]+W[par[u]]@(WR[names[par[u]]].T@offs(u))
    else: P[u]=MP[names[u]]
# std posed FK
SPp={}
for n in STD:
    p=spar[n]; SPp[n]=(SPp[p]+Dw[p]@loc[n]) if p else loc[n]
errs=[]
for n in STD:
    c=DIRCHILD.get(n)
    if not c or c not in byname: continue
    a=P[byname[c]]-P[byname[n]]; b=SPp[c]-SPp[n]
    ang=np.degrees(np.arccos(np.clip(a@b/np.linalg.norm(a)/np.linalg.norm(b),-1,1))); errs.append((n,round(ang,3)))
print('posed bone direction error vs standard rig (deg):',errs)
print('max',max(e for _,e in errs))
a_=P[byname['LeftHand']]-P[byname['LeftArm']]; print('Modi posed left hand rel arm',np.round(a_,2),' std',np.round(SPp['LeftHand']-SPp['LeftArm'],2))
json.dump({'idle_local':{names[u]:mat2q(L[u]) for u in order}},open('modi_idle_ref_5_2.json','w'))
