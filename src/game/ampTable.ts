// Part 5-3c3a: amplitude picks from Parts 4-7a..4-9 (1.0 = full clip angles). Data only; nothing imports it yet.
export const SPECIAL_AMP: Record<string, number> = {
 "shah": 1.0,
 "rahul": 1.0,
 "yogi": 0.4,
 "rajnath": 0.8,
 "sitharaman": 1.0,
 "kharge": 0.4,
 "kejriwal": 0.8,
 "mamata": 1.0
};
export const SUPER_AMP: Record<string, number> = {
 "shah": 1.0,
 "rahul": 0.4,
 "yogi": 1.0,
 "rajnath": 1.0,
 "sitharaman": 0.4,
 "kharge": 0.4,
 "kejriwal": 0.8,
 "mamata": 0.4
};
export const ENDING_AMP: Record<string, Record<'pickup'|'win'|'ko', number>> = {
 "rahul": {
  "pickup": 1.0,
  "win": 0.4,
  "ko": 0.4
 },
 "shah": {
  "pickup": 1.0,
  "win": 1.0,
  "ko": 1.0
 },
 "rajnath": {
  "pickup": 1.0,
  "win": 0.4,
  "ko": 1.0
 },
 "yogi": {
  "pickup": 1.0,
  "win": 0.4,
  "ko": 1.0
 },
 "kejriwal": {
  "pickup": 0.4,
  "win": 0.7,
  "ko": 1.0
 },
 "mamata": {
  "pickup": 0.7,
  "win": 0.4,
  "ko": 1.0
 },
 "sitharaman": {
  "pickup": 1.0,
  "win": 0.7,
  "ko": 1.0
 },
 "kharge": {
  "pickup": 1.0,
  "win": 0.4,
  "ko": 0.7
 }
};
export function ampFor(kind:'special'|'super'|'pickup'|'win'|'ko', id:string):number{
  const v = kind==='special'?SPECIAL_AMP[id]:kind==='super'?SUPER_AMP[id]:ENDING_AMP[id]?.[kind];
  return v===undefined?1:v;
}

// Part 5-3c3b: punch and kick picks (data only; nothing imports this yet).
// PUNCH_IN_DEG: inward swing of the punch arm for the wide four (4-5). Others: 0.
export const PUNCH_IN_DEG: Record<string, number> = {
 "kejriwal": 20,
 "mamata": 10,
 "sitharaman": 20,
 "kharge": 30
};
// TWIST_SCALE: torso-twist scale per clip (4-5b). 1.0 = full twist.
export const TWIST_SCALE: Record<string, {jab:number; cross:number}> = {
 "rahul": {
  "jab": 1.0,
  "cross": 1.0
 },
 "shah": {
  "jab": 1.0,
  "cross": 0.75
 },
 "rajnath": {
  "jab": 1.0,
  "cross": 1.0
 },
 "yogi": {
  "jab": 1.0,
  "cross": 1.0
 },
 "kejriwal": {
  "jab": 0.75,
  "cross": 1.0
 },
 "mamata": {
  "jab": 1.0,
  "cross": 0.75
 },
 "sitharaman": {
  "jab": 1.0,
  "cross": 1.0
 },
 "kharge": {
  "jab": 1.0,
  "cross": 1.0
 }
};
// KICK_PICK: a = peak thigh degrees, f = chamber knee fold factor, resolved=false means no angle met the caps (ships at 40).
export const KICK_PICK: Record<string, Record<'lead'|'rear'|'air', {a:number; f:number; resolved:boolean}>> = {
 "rahul": {
  "lead": {
   "a": 80,
   "f": 1.0,
   "resolved": true
  },
  "rear": {
   "a": 60,
   "f": 1.0,
   "resolved": true
  },
  "air": {
   "a": 40,
   "f": 1.0,
   "resolved": false
  }
 },
 "shah": {
  "lead": {
   "a": 40,
   "f": 1.0,
   "resolved": true
  },
  "rear": {
   "a": 80,
   "f": 1.0,
   "resolved": true
  },
  "air": {
   "a": 40,
   "f": 1.0,
   "resolved": true
  }
 },
 "rajnath": {
  "lead": {
   "a": 60,
   "f": 0.5,
   "resolved": true
  },
  "rear": {
   "a": 40,
   "f": 1.0,
   "resolved": false
  },
  "air": {
   "a": 80,
   "f": 1.0,
   "resolved": true
  }
 },
 "yogi": {
  "lead": {
   "a": 40,
   "f": 1.0,
   "resolved": false
  },
  "rear": {
   "a": 40,
   "f": 1.0,
   "resolved": false
  },
  "air": {
   "a": 40,
   "f": 1.0,
   "resolved": false
  }
 },
 "kejriwal": {
  "lead": {
   "a": 60,
   "f": 0.5,
   "resolved": true
  },
  "rear": {
   "a": 40,
   "f": 1.0,
   "resolved": false
  },
  "air": {
   "a": 80,
   "f": 1.0,
   "resolved": true
  }
 },
 "mamata": {
  "lead": {
   "a": 40,
   "f": 1.0,
   "resolved": false
  },
  "rear": {
   "a": 40,
   "f": 1.0,
   "resolved": false
  },
  "air": {
   "a": 40,
   "f": 1.0,
   "resolved": true
  }
 },
 "sitharaman": {
  "lead": {
   "a": 40,
   "f": 1.0,
   "resolved": false
  },
  "rear": {
   "a": 40,
   "f": 1.0,
   "resolved": true
  },
  "air": {
   "a": 40,
   "f": 1.0,
   "resolved": false
  }
 },
 "kharge": {
  "lead": {
   "a": 40,
   "f": 1.0,
   "resolved": false
  },
  "rear": {
   "a": 40,
   "f": 1.0,
   "resolved": false
  },
  "air": {
   "a": 40,
   "f": 1.0,
   "resolved": false
  }
 }
};
