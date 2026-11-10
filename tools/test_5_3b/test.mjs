import * as L from './animLib.mjs'; import * as P from './poseApply.mjs'; import fs from 'fs';
const j=JSON.parse(fs.readFileSync(process.argv[2])); const NAMES=['Hips','Spine','Spine1','Spine2','Neck','Head','LeftShoulder','LeftArm','LeftForeArm','LeftHand','RightShoulder','RightArm','RightForeArm','RightHand','LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase','RightUpLeg','RightLeg','RightFoot','RightToeBase'];
let fail=0,n=0; const chk=(c,m)=>{n++;if(!c){fail++;console.log('FAIL',m)}};
const mk=()=>{const b={};for(const k of NAMES){b[k]={q:[9,9,9,9],p:null,quaternion:{set(x,y,z,w){b[k].q=[x,y,z,w]}},position:{set(x,y,z){b[k].p=[x,y,z]}}}}return b};
const rest=[0,0.95,0];
for(const cname of Object.keys(j.clips)){const clip=j.clips[cname]; for(const t of [0,clip.duration*0.3,clip.duration*0.77,clip.duration,clip.duration+1]){
  const pose=L.sample(clip,t); const b=mk(); const w=P.applyPose(b,pose,rest);
  chk(w===22,`${cname} wrote ${w}`);
  for(const k of NAMES){const e=L.qOf(pose,k); chk(b[k].q.every((v,i)=>v===e[i]),`${cname} t=${t} ${k}`)}
  chk(b.Hips.p.every((v,i)=>Math.abs(v-(rest[i]+pose.root[i]))<1e-12),`${cname} hips pos`);
  chk(NAMES.slice(1).every(k=>b[k].p===null),`${cname} non-hips position untouched`);
}}
// stale-rotation test: a bone missing from the pose is reset
{const b=mk();P.applyPose(b,{q:{Head:[0,0.7071,0,0.7071]},root:[0,0,0]},rest);P.applyPose(b,{q:{},root:[0,0,0]},rest);chk(b.Head.q.join()==='0,0,0,1','stale Head rotation');}
// resetPose
{const b=mk();P.resetPose(b,rest);chk(NAMES.every(k=>b[k].q.join()==='0,0,0,1'),'resetPose');chk(b.Hips.p.join()===rest.join(),'reset hips');}
// no hipsRest / no position object
{const b=mk();delete b.Hips.position;chk(P.applyPose(b,L.sample(j.clips.idle,0.1))===22,'no position ok');const b2=mk();P.applyPose(b2,L.sample(j.clips.idle,0.1));chk(b2.Hips.p===null,'no hipsRest leaves position');}
console.log(`${n-fail} pass, ${fail} fail`);process.exit(fail?1:0);
