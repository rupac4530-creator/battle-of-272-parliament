import sys,numpy as np; sys.path.insert(0,'/home/claude/w')
from fbxp import parse
t=parse('/home/claude/w/g/battle-of-272-parliament-master/public/models/modi/modi.fbx')
ob=[n for n in t if n[0]=='Objects'][0]; cn=[n for n in t if n[0]=='Connections'][0]
models={}
for k in ob[2]:
    if k[0]!='Model': continue
    uid=k[1][0]; name=k[1][1].split('\x00')[0]; pr={}
    for c in k[2]:
        if c[0]=='Properties70':
            for p in c[2]:
                if p[0]=='P': pr[p[1][0]]=tuple(p[1][4:7])
    models[uid]=(name,pr)
par={}
for c in cn[2]:
    if c[0]=='C' and c[1][0]=='OO' and c[1][1] in models and c[1][2] in models: par[c[1][1]]=c[1][2]
def R(e,order='XYZ'):
    a=np.radians(e); m=np.eye(3)
    mats={'X':lambda x:np.array([[1,0,0],[0,np.cos(x),-np.sin(x)],[0,np.sin(x),np.cos(x)]]),
          'Y':lambda x:np.array([[np.cos(x),0,np.sin(x)],[0,1,0],[-np.sin(x),0,np.cos(x)]]),
          'Z':lambda x:np.array([[np.cos(x),-np.sin(x),0],[np.sin(x),np.cos(x),0],[0,0,1]])}
    r=np.eye(3)
    # FBX XYZ order: R = Rz*Ry*Rx
    return mats['Z'](a[2])@mats['Y'](a[1])@mats['X'](a[0])
byname={v[0]:u for u,v in models.items()}
def local(u):
    pr=models[u][1]; g=lambda k,d=(0,0,0):np.array(pr.get(k,d),float)
    T=g('Lcl Translation'); rot=R(g('Lcl Rotation')); pre=R(g('PreRotation')); S=g('Lcl Scaling',(1,1,1))
    M=np.eye(4); M[:3,:3]=pre@rot*S; M[:3,3]=T; return M
def world(u):
    M=local(u)
    return (world(par[u])@M) if u in par else M
if __name__=='__main__':
    for n in ['Hips','Spine2','LeftShoulder','LeftArm','LeftForeArm','LeftHand','RightArm','RightForeArm','RightHand','LeftUpLeg','LeftLeg','LeftFoot','Head']:
        W=world(byname[n]); print(n,np.round(W[:3,3],2))
    for s in 'LeftRight':pass
    for side in ['Left','Right']:
        a=world(byname[side+'Arm'])[:3,3]; f=world(byname[side+'ForeArm'])[:3,3]; h=world(byname[side+'Hand'])[:3,3]
        v=f-a; ang=np.degrees(np.arccos(-v[1]/np.linalg.norm(v)))
        print(side,'upper arm dir',np.round(v/np.linalg.norm(v),3),'angle from straight-down',round(ang,1),'forearm dir',np.round((h-f)/np.linalg.norm(h-f),3))
