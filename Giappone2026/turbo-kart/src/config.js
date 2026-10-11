// Shared tuning + roster. Every module reads from here; do not duplicate these values.

export const GAME_TITLE = 'Turbo Kart Rally';

export const RACE = {
  laps: 3,
  racers: 8,
  countdownSeconds: 3,
};

// World scale: 1 unit = 1 meter. Y is up. Track lies roughly in the XZ plane.
export const PHYSICS = {
  gravity: 38,
  kartRadius: 1.3,          // collision radius (kart vs kart / wall / items)
  maxSpeed: 38,             // base top speed on road (units/s) before stat modifiers
  reverseMaxSpeed: 12,
  accel: 22,
  brakeDecel: 45,
  coastDecel: 8,
  offroadMaxSpeedFactor: 0.45,
  boostSpeedBonus: 16,      // added to max speed while boosting
  miniTurboTimes: [0.55, 0.45, 0.5], // blue, orange, purple boost durations (s)
  driftChargeThresholds: [0.9, 1.9, 3.0], // seconds of drifting needed to reach each level
  mushroomBoostTime: 1.3,
  starTime: 7.5,
  spinOutTime: 1.1,
  tumbleTime: 1.6,
  lightningShrinkTime: 5,
};

// stats are 1..5. speed -> top speed, accel -> acceleration, handling -> turn rate/drift,
// weight -> bump resolution (heavier pushes lighter).
export const CHARACTERS = [
  {
    "id": "kitsu",
    "name": "Kitsu",
    "defaultName": "Kitsu",
    "price": 0,
    "color": 14388035,
    "accent": 16772561,
    "skin": 16764057,
    "hat": "cap",
    "body": "traveler",
    "stats": {
      "speed": 3,
      "accel": 3,
      "handling": 3,
      "weight": 3
    }
  },
  {
    "id": "roberto",
    "name": "Robanana",
    "defaultName": "Robanana",
    "price": 250,
    "color": 13588031,
    "accent": 16772561,
    "skin": 16764057,
    "hat": "cap",
    "body": "hero",
    "stats": {
      "speed": 3,
      "accel": 3,
      "handling": 3,
      "weight": 3
    }
  },
  {
    "id": "leonardo",
    "name": "Leonardrift",
    "defaultName": "Leonardrift",
    "price": 300,
    "color": 5544320,
    "accent": 16772561,
    "skin": 16764057,
    "hat": "cap",
    "body": "traveler",
    "stats": {
      "speed": 3,
      "accel": 3,
      "handling": 3,
      "weight": 3
    }
  },
  {
    "id": "francesco",
    "name": "FranTokyo",
    "defaultName": "FranTokyo",
    "price": 350,
    "color": 7046603,
    "accent": 16772561,
    "skin": 16764057,
    "hat": "cap",
    "body": "traveler",
    "stats": {
      "speed": 3,
      "accel": 3,
      "handling": 3,
      "weight": 3
    }
  },
  {
    "id": "andrea",
    "name": "AndreTornado",
    "defaultName": "AndreTornado",
    "price": 400,
    "color": 14656334,
    "accent": 16772561,
    "skin": 16764057,
    "hat": "cap",
    "body": "traveler",
    "stats": {
      "speed": 3,
      "accel": 3,
      "handling": 3,
      "weight": 3
    }
  },
  {
    "id": "antonella",
    "name": "Antornella",
    "defaultName": "Antornella",
    "price": 450,
    "color": 13351135,
    "accent": 16772561,
    "skin": 16764057,
    "hat": "cap",
    "body": "white",
    "stats": {
      "speed": 3,
      "accel": 3,
      "handling": 3,
      "weight": 3
    }
  },
  {
    "id": "erika",
    "name": "Erikart",
    "defaultName": "Erikart",
    "price": 500,
    "color": 14780845,
    "accent": 16772561,
    "skin": 16764057,
    "hat": "cap",
    "body": "traveler",
    "stats": {
      "speed": 3,
      "accel": 3,
      "handling": 3,
      "weight": 3
    }
  },
  {
    "id": "gabriele",
    "name": "Gabbracoli",
    "defaultName": "Gabbracoli",
    "price": 750,
    "color": 8754877,
    "accent": 16772561,
    "skin": 16764057,
    "hat": "cap",
    "body": "octo",
    "stats": {
      "speed": 3,
      "accel": 3,
      "handling": 3,
      "weight": 3
    }
  },
  {
    "id": "giorgia-s",
    "name": "Giorgiaku S.",
    "defaultName": "Giorgiaku S.",
    "price": 550,
    "color": 12750484,
    "accent": 16772561,
    "skin": 16764057,
    "hat": "cap",
    "body": "white",
    "stats": {
      "speed": 3,
      "accel": 3,
      "handling": 3,
      "weight": 3
    }
  },
  {
    "id": "giorgia-i",
    "name": "Giorgiaku I.",
    "defaultName": "Giorgiaku I.",
    "price": 550,
    "color": 8762791,
    "accent": 16772561,
    "skin": 16764057,
    "hat": "cap",
    "body": "traveler",
    "stats": {
      "speed": 3,
      "accel": 3,
      "handling": 3,
      "weight": 3
    }
  },
  {
    "id": "manuel",
    "name": "Manu Turbo",
    "defaultName": "Manu Turbo",
    "price": 600,
    "color": 10529870,
    "accent": 16772561,
    "skin": 16764057,
    "hat": "cap",
    "body": "hero",
    "stats": {
      "speed": 3,
      "accel": 3,
      "handling": 3,
      "weight": 3
    }
  },
  {
    "id": "lorenzo",
    "name": "Lorenzen",
    "defaultName": "Lorenzen",
    "price": 650,
    "color": 7376808,
    "accent": 16772561,
    "skin": 16764057,
    "hat": "cap",
    "body": "traveler",
    "stats": {
      "speed": 3,
      "accel": 3,
      "handling": 3,
      "weight": 3
    }
  },
  {
    "id": "federico",
    "name": "FedeFuga",
    "defaultName": "FedeFuga",
    "price": 700,
    "color": 12423530,
    "accent": 16772561,
    "skin": 16764057,
    "hat": "cap",
    "body": "traveler",
    "stats": {
      "speed": 3,
      "accel": 3,
      "handling": 3,
      "weight": 3
    }
  },
  {
    "id": "valerio",
    "name": "Valerazzo",
    "defaultName": "Valerazzo",
    "price": 800,
    "color": 8944804,
    "accent": 16772561,
    "skin": 16764057,
    "hat": "cap",
    "body": "traveler",
    "stats": {
      "speed": 3,
      "accel": 3,
      "handling": 3,
      "weight": 3
    }
  }
];

export const ITEMS = ['mushroom', 'triple_mushroom', 'banana', 'green_shell', 'red_shell', 'star', 'lightning', 'blue_shell'];

export const DIFFICULTY = {
  easy:   { aiSpeedFactor: 0.86, aiSkill: 0.55, rubberBand: 0.08 },
  normal: { aiSpeedFactor: 0.94, aiSkill: 0.75, rubberBand: 0.12 },
  hard:   { aiSpeedFactor: 1.00, aiSkill: 0.95, rubberBand: 0.16 },
};

export const KEYS = {
  accelerate: ['ArrowUp', 'KeyW'],
  brake: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  drift: ['Space', 'ShiftRight'],
  item: ['KeyE', 'ShiftLeft', 'KeyX'],
  lookBack: ['KeyC'],
  pause: ['Escape', 'KeyP'],
};

