"""diag_4_2.py -- ADDED AFTER SEEING the 4-2 results; changes no clip, rule or pick. Where does the wide four's hand width come from?
Rest pose (no rotation): |x| of LeftArm joint, LeftForeArm joint, LeftHand joint relative to the Head joint, in cm; and the shoulder-to-hand reach."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE)
import numpy as np, animlib as A
from animrig import Rig
for m in ['rahul','shah','rajnath','yogi','kejriwal','mamata','sitharaman','kharge']:
    r = Rig(f'{ROOT}/rigged_models/{m}.glb'); p = A.pose(); hx = r.joint_pos(p,'Head')[0]
    a, e, h = (abs(r.joint_pos(p,b)[0]-hx)*100 for b in ('LeftArm','LeftForeArm','LeftHand'))
    up = np.linalg.norm(r.joint_pos(p,'LeftForeArm')-r.joint_pos(p,'LeftArm'))*100; fo = np.linalg.norm(r.joint_pos(p,'LeftHand')-r.joint_pos(p,'LeftForeArm'))*100
    print(f'{m:11s} rest |x| from head: arm joint {a:5.1f}  elbow {e:5.1f}  hand {h:5.1f}   upper arm {up:5.1f} cm, forearm {fo:5.1f} cm')
