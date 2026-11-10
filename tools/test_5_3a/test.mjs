import * as L from './animLib.mjs'; import fs from 'fs';
const r=JSON.parse(fs.readFileSync(new URL('./ref.json',import.meta.url)));
const clip=r.clip; const m={...clip,keys:clip.keys.map(k=>({...k,pose:L.mirrorPose(k.pose)}))};
let worst=0,n=0,fail=0;
function cmp(a,b,tag){ // compare poses; quaternion sign-insensitive
  const names=new Set([...Object.keys(a.q),...Object.keys(b.q)]);
  for(const nme of names){const x=L.qn(L.qOf(a,nme)),y=L.qn(L.qOf(b,nme));const d=Math.abs(x[0]*y[0]+x[1]*y[1]+x[2]*y[2]+x[3]*y[3]);const e=Math.acos(Math.min(1,d))*2*180/Math.PI;worst=Math.max(worst,e);if(e>1e-3){fail++;console.log('FAIL',tag,nme,e)}}
  for(let i=0;i<3;i++){const e=Math.abs(a.root[i]-b.root[i]);if(e>2e-6){fail++;console.log('FAIL root',tag)}}
  n++;
}
let pa=L.sample(clip,0),pb=L.sample(clip,0.12);
for(const c of r.cases){let p;
 if(c.op==='sample')p=L.sample(clip,c.t);
 else if(c.op==='mirror_sample')p=L.sample(m,c.t);
 else if(c.op==='cross')p=L.crossfade(pa,pb,c.e,c.fade);
 else p=L.limitPose(L.sample(clip,c.t),r.scales,r.max);
 cmp(p,c.res,c.op+c.t)}
// extra: mirror twice identity, slerp q/-q
const p0=L.sample(clip,0.1),mm=L.mirrorPose(L.mirrorPose(p0));cmp(mm,p0,'mirror2');
const s=L.slerp([0,0,0,1],[0,0,0,-1],0.5);if(Math.abs(Math.abs(s[3])-1)>1e-9){fail++;console.log('FAIL slerp')}
console.log(`cases ${n}, failures ${fail}, worst angle diff ${worst.toExponential(2)} deg`);
process.exit(fail?1:0)
