import json,sys,random,numpy as np
sys.path.insert(0,'tools'); import animlib as A
random.seed(7); np.random.seed(7)
ex=json.load(open('anim/example_jab_4_1.json'))
def tojson(c): return A.clip_to_json(c)
def fromjson(j):
    return {'name':j['name'],'duration':j['duration'],'impact':j['impact'],'keys':[{'t':k['t'],'ease':k['ease'],'pose':A.pose({b:v for b,v in k['pose']['q'].items()},k['pose']['root'])} for k in j['keys']]}
c=fromjson(ex)
out={'clip':ex,'cases':[]}
ts=[random.uniform(-0.05,0.35) for _ in range(40)]+[0,0.12,0.28]
for t in ts:
    p=A.sample(c,t); out['cases'].append({'op':'sample','t':t,'res':A.pose_to_json(p)})
m=A.mirror_clip(c)
for t in ts[:15]: out['cases'].append({'op':'mirror_sample','t':t,'res':A.pose_to_json(A.sample(m,t))})
pa=A.sample(c,0);pb=A.sample(c,0.12)
for e in [0,0.02,0.06,0.12,0.2]: out['cases'].append({'op':'cross','e':e,'fade':0.12,'res':A.pose_to_json(A.crossfade(pa,pb,e,0.12))})
sc={'arm_raise':0.6,'elbow':0.8,'thigh':0.5,'knee':0.7,'torso':0.9}
mx={'arm_raise':40}
out['scales']=sc;out['max']=mx
for t in [0.06,0.12,0.2]: out['cases'].append({'op':'limit','t':t,'res':A.pose_to_json(A.limit_pose(A.sample(c,t),sc,mx))})
json.dump(out,open('t/ref.json','w'))
print(len(out['cases']))
