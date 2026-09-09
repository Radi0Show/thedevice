


import { gmlRound } from './gml.js';
import { cue } from './audio.js';
import { damageKnight, KNIGHT_MAXHP } from './knight.js';
import { scrOflash } from './fx.js';
import { spawnDmgNumber, resetDmgStack } from './dmgnumbers.js';


export const ANIM_FRAMES = 28;
export const BOLT_LAUNCH = 10;


export const BONUS = [30, 28, 22, 20, 13, 11, 10];

export function createRudeBuster() {
  return { anim: null, bolt: null };
}



export function castRudeBuster(state, susieX, susieY, damage, targetX, targetY) {
  state.rude = state.rude ?? createRudeBuster();
  state.rude.anim = { t: 0, x: susieX, y: susieY, index: 0 };
  state.rude.pending = { damage, targetX, targetY };
}


export function stepRudeBuster(state, press = false) {
  const r = state.rude;
  if (!r) return;


  if (r.anim) {
    const a = r.anim;
    a.index = a.t / 2;
    if (a.t === BOLT_LAUNCH && r.pending) {
      cue(state, 'snd_rudebuster_swing');

      const { damage, targetX, targetY } = r.pending;
      const bx = a.x + 40;
      const by = a.y + 30;

      const cy = targetY;
      let dir = (Math.atan2(-(cy - by), targetX - bx) * 180) / Math.PI;
      if (dir < 0) dir += 360;
      r.bolt = {
        x: bx,
        y: by,
        cx: targetX,
        cy,

        direction: dir - 20,
        speed: 24,
        damage,
        t: 0,
        boltTimer: 0,
        chosen: 0,
        locked: false,
        explode: 0,
        alpha: 0,
        trail: [],
        bonusAnim: 0,
        dealt: 0,
      };
      r.pending = null;

      r.justSpawned = true;
    }
    a.t += 1;
    if (a.t >= ANIM_FRAMES) r.anim = null;
  }


  const b = r.bolt;
  if (!b) return;
  if (r.justSpawned) {
    r.justSpawned = false;
    return;
  }

  if (b.alpha < 1) b.alpha = Math.min(1, b.alpha + 0.25);

  if (b.explode === 0) {
    b.boltTimer += 1;


    if (press && b.boltTimer >= 4 && b.chosen === 0 && !b.locked) {
      b.chosen = b.boltTimer;
      b.locked = true;
    }


    let want = (Math.atan2(-(b.cy - b.y), b.cx - b.x) * 180) / Math.PI;
    if (want < 0) want += 360;
    let diff = ((want - b.direction + 540) % 360) - 180;
    b.direction = (b.direction + diff / 4 + 360) % 360;


    b.speed -= -1.5;
    const rad = (b.direction * Math.PI) / 180;
    b.x += b.speed * Math.cos(rad);
    b.y += -b.speed * Math.sin(rad);

    b.trail.push({ x: b.x, y: b.y, angle: b.direction, scale: 1.8, alpha: b.alpha - 0.2 });

    if (Math.hypot(b.cx - b.x, b.cy - b.y) <= 40) {

      const final = b.boltTimer;
      let dmg = b.damage;
      if (b.chosen > 0) {
        const gap = final - b.chosen;
        if (gap >= 0 && gap < BONUS.length) dmg += BONUS[gap];
        if (Math.abs(b.chosen - final) <= 2) {
          b.bonusAnim = 1;
          cue(state, 'snd_scytheburst');
        }
      }

      dmg = gmlRound(dmg / 2);
      b.dealt = dmg;
      damageKnight(state, dmg);

      resetDmgStack(state);
      spawnDmgNumber(state, b.cx, b.cy, dmg, 1, 2);
      cue(state, 'snd_rudebuster_hit');

      const knight = state.entities.find(
        (x) => x.alive && x.type.name === 'obj_knight_enemy',
      );
      if (knight) scrOflash(state, knight);
      b.explode = 1;
      b.t = 1;

      b.bursts = Array.from({ length: 8 }, (_, i) => ({
        x: b.cx,
        y: b.cy,
        angle: 45 + i * 90,
        speed: b.bonusAnim === 1 ? 40 : 25,
        scale: 1,
        slow: i < 4 ? 0.75 : 0.8,
      }));
      return;
    }
  } else {
    b.t += 1;
    for (const s of b.bursts ?? []) {
      s.x += Math.cos((s.angle * Math.PI) / 180) * s.speed;
      s.y += -Math.sin((s.angle * Math.PI) / 180) * s.speed;
      s.speed *= s.slow;
      s.scale *= 0.8;
    }
    if (b.t >= 18) r.bolt = null;
  }


  for (const a of b.trail) {
    a.scale -= 0.1;
    if (b.explode === 1) {
      a.alpha -= 0.07;
      a.scale *= 0.9;
    }
  }
  b.trail = b.trail.filter((a) => a.scale > 0.1 && a.alpha > 0);
}


export function rudeBusterBusy(state) {
  const r = state.rude;
  return !!(r && (r.anim || r.bolt || r.pending));
}

export { KNIGHT_MAXHP };
