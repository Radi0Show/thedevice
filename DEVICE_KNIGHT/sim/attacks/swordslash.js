


import { spawn, destroy } from '../entity.js';
import { scrApproach, gmlEq } from '../gml.js';
import { gmlIrandom, gmlIrandomRange, gmlChoose, gmlRandomRange } from '../rng.js';
import {
  regularbulletCreate, regularbulletStep, collidebulletOther15,
} from '../bullets/regularbullet.js';
import { scrLerpvar } from '../lerpvar.js';
import { scrAfterimage, knightWarp, knightWarpIn, knightWarpOut } from '../fx.js';
import { CRESCENT_MASK, enginePairHit } from '../masks.js';
import { cue } from '../audio.js';


const DR_OPENING = 0.04;

export const knightCrescent = {
  name: 'obj_bullet_knightcrescent',

  create(e, state) {
    regularbulletCreate(e, state);
    e.sprite_index = 'spr_bullet_knightcrescent';
    e.damage = 206;

    if (gmlEq(state.knight?.damagereduction ?? 0, DR_OPENING)) e.damage = 50;
    e.grazepoints = 3;
    e.timer = 0;
    e.element = 5;

    e.mask = CRESCENT_MASK;
  },

  step(e, state) {
    regularbulletStep(e, state);
    e.timer += 1;

    const a = scrAfterimage(state, e);
    a.speed = 0;
    a.vspeed = gmlRandomRange(state.gmlRng, -0.5, 0.5);
    a.builtinMotion = true;
    a.image_alpha = 0.35;
    if (state.soul) a.depth = (state.soul.depth ?? 0) + 1;
  },

  collides(e, heart) {
    if (e.active !== 1 && e.active !== true) return false;
    return enginePairHit(heart, e, CRESCENT_MASK);
  },

  other15: collidebulletOther15,
};



export const crescentSlashAnim = {
  name: 'obj_knight_crescentslash_slashinganimation',

  create(e) {
    e.image_xscale = 2;
    e.image_yscale = 2;
    e.image_speed = 0.5;
    e.sprite_index = 'spr_knight_crescentslash';
    e.image_index = 0;
    e.slash1 = 0;
    e.slash2 = 0;
  },

  step(e, state) {

    if (e.image_index > 7) destroy(e);

    if (e.image_index >= 5) e.image_blend = [153, 153, 153];
    if (e.image_index >= 6) e.image_blend = [51, 51, 51];
    if (e.image_index >= 7) e.image_blend = [0, 0, 0];


    if (gmlEq(e.image_index, 1)) {
      cue(state, 'snd_knight_cut2', 1.3, 0.5);
      const lifetime = 8;
      const startalpha = 0.5;
      for (const which of [0, 1]) {
        const m = spawn(state, crescentMarker, { x: e.x - 12, y: e.y - 18 });
        m.sprite_index = 'spr_bullet_knightcrescent';
        m.image_xscale = 2;
        m.image_yscale = which === 0 ? 2 : -2;
        m.image_index = which;
        m.image_alpha = startalpha;
        m.builtinMotion = true;
        m.gravity = which === 0 ? -0.5 : 0.5;
        m.speed = 2;
        m.direction = 0;
        m.doom = lifetime + 1;
        scrLerpvar(state, spawn, m, 'image_alpha', startalpha, 0, lifetime, 2);
        scrLerpvar(state, spawn, m, 'image_yscale',
          m.image_yscale, m.image_yscale * 2, lifetime, 2);
      }
    }

    const fade = scrAfterimage(state, e);
    fade.image_alpha = 0.3;
    fade.fadeSpeed = 0.05;
    fade.image_blend = e.image_blend;
    fade.depth = (e.depth ?? 0) + 1000;
  },
};


export const crescentMarker = {
  name: 'obj_marker',
  create(e) {
    e.image_speed = 0;
    e.doom = -1;
  },
  step(e) {
    if (e.doom > 0) {
      e.doom -= 1;
      if (e.doom === 0) destroy(e);
    }
  },
};

export const crescentGenerator = {
  name: 'obj_bullet_knight_crescentGenerator',


  stepOrder: 0.5,

  create(e, state) {
    e.image_speed = 0;

    e.visible = false;
    e.con = 0;
    e.timer = 0;
    e.box = -1;
    e.yposcount = 7;
    e.posrange = 2;
    e.ypos = [0];
    e.curpos = 3;
    e.shoottimer = 0;
    e.shootrate = 30;
    e.movementmode = 0;
    e.movecon = 0;
    e.moverate = 5;
    e.init = 0;
    e.neverstaystill = false;
    e.movedown = 0;
    e.bulcount = 0;
    e.diagtimer = 0;
    e.subcon = 0;
    e.framecount = 0;
    e.subtimer = 0;
    e.movetimer = 0;
    e.diagattack = false;
    e.diagattackrate = 150;

    e.variant = 2;
    e.slowdelaycount = 0;
    e.createslash = 0;
    e.myspeed = -1;
    e.myfrict = -0.35;
    e.boxheight = 150;
  },

  step(e, state) {
    const box = state.entities.find((x) => x.alive && x.type.name === 'obj_growtangle');

    if (e.init === 0) {

      if (e.variant === 0) {
        e.movementmode = 0; e.shootrate = 30; e.posrange = 2; e.yposcount = 6;
        e.neverstaystill = 1; e.myspeed = -1; e.myfrict = -0.5;
      } else if (e.variant === 1) {
        e.movementmode = 1; e.shootrate = 20; e.posrange = 2; e.yposcount = 6;
        e.myspeed = -1; e.myfrict = -0.5;
      } else if (e.variant === 2) {
        e.movementmode = 1; e.shootrate = 15; e.posrange = 2; e.yposcount = 6;
        e.neverstaystill = 1; e.myspeed = -1; e.myfrict = -0.35;

        if (gmlEq(state.knight?.damagereduction ?? 0, DR_OPENING)) {
          e.shootrate = 20;
          e.myfrict = -0.3;
        }
      } else if (e.variant === 3) {
        e.diagattack = true; e.diagattackrate = 150;
        e.movementmode = 1; e.shootrate = 15; e.posrange = 2; e.yposcount = 6;
        e.neverstaystill = 1; e.myspeed = -1; e.myfrict = -0.35;
      } else if (e.variant === 4) {
        e.movementmode = 1; e.shootrate = 20; e.posrange = 1; e.yposcount = 6;
        e.myspeed = -1; e.myfrict = -0.5; e.neverstaystill = true;
        e.slowdelaycount = 0;
      }
      e.moverate = e.shootrate - 5;


      if (e.box === -1) {
        if (box) e.box = box;
      } else {
        e.init = 1;
      }
    }


    if (!e.init) return;

    if (e.con === 0) {
      e.timer += 1;
      if (e.timer >= 1) {
        e.boxheight = (e.box?.image_yscale ?? 2) * 75;
        e.con = 1;
        e.timer = 0;

        for (let i = 0; i < e.yposcount; i++) {
          e.ypos[i] = (e.box.y - e.boxheight / 2)
            + (e.boxheight / (e.yposcount + 1)) * (i + 1);
        }
        e.curpos = Math.round(e.yposcount / 2) - 1;
      }
    }

    if (e.con === 1) {

      if (state.turntimer > 50) {
        e.shoottimer += 1;
        e.timer += 1;
      } else if (state.turntimer < 20) {

        const knight = state.entities.find(
          (k) => k.alive && k.type.name === 'obj_knight_enemy',
        );
        if (knight) {
          knight.x = knight.xstart;
          knight.hspeed = 0;
          const w = spawn(state, knightWarp, { x: knight.x, y: knight.y });
          w.master = knight;
          knightWarpIn(state, w);
        }
        destroy(e);
        return;
      }

      if (e.diagattack === true) {
        e.diagtimer += 1;
        if (e.diagtimer === e.diagattackrate) {
          e.diagtimer = 0;
          e.con = 10;
          e.subcon = 0;
          e.shoottimer = 0;
          e.movetimer = 0;
          e.movecon = 0;
        }
      }

      if (e.shoottimer === e.shootrate - 4) e.createslash = 1;

      if (e.shoottimer >= e.shootrate) {
        e.bulcount += 1;
        const pair = firePair(state, e);
        if (e.movementmode === 0) {
          scrLerpvar(state, spawn, pair[0], 'y', pair[0].y, pair[0].y - 14, 25);
          scrLerpvar(state, spawn, pair[1], 'y', pair[1].y, pair[1].y + 14, 25);
          e.movecon = 1;
        }
        if (e.movementmode === 1) {
          scrLerpvar(state, spawn, pair[0], 'y', pair[0].y, e.ypos[e.curpos] - 12, 30);
          scrLerpvar(state, spawn, pair[1], 'y', pair[1].y, e.ypos[e.curpos] + 12, 30);

          if (e.variant === 4 && gmlChoose(state.gmlRng, [0, 0, 1]) === 1
            && e.slowdelaycount <= 0) {
            e.slowdelaycount = 2;
            for (const b of pair) { b.friction *= 0.25; b.speed *= 0.5; }
            pair[0].image_yscale = 1;
            pair[1].image_yscale = -1;
          }
          e.movecon = 1;
        }


        if (!e.neverstaystill) {
          e.curpos += gmlIrandomRange(state.gmlRng, -e.posrange, e.posrange);
        } else {
          e.curpos += gmlIrandomRange(state.gmlRng, 1, e.posrange)
            * gmlChoose(state.gmlRng, [-1, 1]);
        }

        if (e.curpos >= e.yposcount) e.curpos -= 2;
        if (e.curpos < 0) e.curpos = -e.curpos;

        e.shoottimer = 0;
        if (e.slowdelaycount === 1) {
          e.shoottimer = -e.shootrate / 2;
          e.slowdelaycount = -1;
        }
        e.slowdelaycount -= 1;
      }

      if (e.movecon === 1) {

        if (e.movementmode === 0) {
          scrLerpvar(state, spawn, e, 'y', e.y, e.ypos[e.curpos], e.moverate, 2);
          e.movecon = 0;
        }
        if (e.movementmode === 1) {
          scrLerpvar(state, spawn, e, 'y', e.y,
            e.ypos[gmlIrandom(state.gmlRng, e.yposcount - 1)], e.moverate, 2);
          e.movecon = 0;
        }
      }
    }


    if (e.con === 10) {
      if (e.subcon === 0) {

        if (e.yprevious === e.y) {
          e.diagtimer += 1;
          if (e.diagtimer === 3) e.subcon = 1;
        }
      }
      if (e.subcon === 1) {
        const desy = gmlIrandom(state.gmlRng, e.yposcount - 2) + 1;
        scrLerpvar(state, spawn, e, 'y', e.y, e.ypos[desy], 10, 2);
        e.subcon = 2;
        e.diagtimer = 0;
      } else if (e.subcon === 2) {
        e.diagtimer += 1;
        if (e.diagtimer >= 30) {
          e.subcon = 3;
          e.diagtimer = 0;

          e.movedown = -1;
          if (e.box && e.box.alive && e.y < e.box.y) e.movedown = 1;

          const heartmovespeed = state.soul?.wspeed ?? 4;
          e.framecount = 15;
          scrLerpvar(state, spawn, e, 'y', e.y,
            e.y + e.framecount * e.movedown * heartmovespeed, e.framecount);
          e.subtimer = 0;
        }
      } else if (e.subcon === 3) {
        if (e.diagtimer === 2) e.createslash = 1;
        if (e.diagtimer <= 0) {
          const pair = firePair(state, e);
          scrLerpvar(state, spawn, pair[0], 'y', pair[0].y, pair[0].y - 16, 25);
          scrLerpvar(state, spawn, pair[1], 'y', pair[1].y, pair[1].y + 16, 25);
          e.diagtimer = 3;
        }
        e.diagtimer -= 1;
        e.subtimer += 1;
        if (e.box && e.box.alive) {
          const half = (e.box.image_yscale ?? 2) * 75 * 0.5;
          if ((e.movedown === 1 && e.y > e.box.y + half - 30)
            || (e.movedown === -1 && e.y < e.box.y - half + 30)) {
            e.subtimer = e.framecount + 1;
          }
        }
        if (e.subtimer >= e.framecount) {
          e.con = 1;
          e.diagtimer = 0;
          e.subcon = 0;
          e.timer = 0;
          e.subtimer = 0;

          e.shoottimer = -10;
          e.movetimer = 0;
        }
      }
    }

    if (e.createslash) {
      const s = spawn(state, crescentSlashAnim, { x: e.x + 12, y: e.y + 18 });
      s.depth = (e.depth ?? 0) - 20 - s.y;
      e.createslash = 0;
    }
    e.yprevious = e.y;
  },
};


function firePair(state, e) {
  const bul = spawn(state, knightCrescent, { x: e.x, y: e.y + 5 });
  const bul2 = spawn(state, knightCrescent, { x: e.x, y: e.y - 5 });
  for (const b of [bul, bul2]) {
    b.image_xscale = 2;
    b.image_yscale = 2;

    b.builtinMotion = true;
    b.speed = 1;
    b.direction = 180;

    b.friction = e.myfrict;
  }

  bul2.image_yscale = -2;
  return [bul, bul2];
}



export function launchSwordslash(state, difficulty = 0) {
  const knight = state.entities.find(
    (k) => k.alive && k.type.name === 'obj_knight_enemy',
  );
  if (knight) {

    const w = spawn(state, knightWarp, { x: knight.x, y: knight.y });
    w.master = knight;
    knightWarpOut(state, w);
    knight.image_alpha = 0;
  }
  const e = spawn(state, crescentGenerator, {
    x: state.view.x + 480,
    y: state.view.y + 160,
  });
  if (difficulty === 1) e.variant = 3;
  return e;
}
