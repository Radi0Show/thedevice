

import { scrLerpvar } from '../../sim/lerpvar.js';

import { getSwordcolor } from './kaizo-colors.js';
import { spawn, destroy } from '../../sim/entity.js';
import { roaringknightSlash } from '../../sim/attacks/roaringknight-slash.js';
import { knightWarp, knightWarpOut } from '../../sim/fx.js';

import { kaizoKnightCircle } from './knight-circle.js';
import { cue, cueLoop, cueStop } from '../../sim/audio.js';
import { scrApproach, gmlEq } from '../../sim/gml.js';
import { gmlChoose, gmlIrandom, gmlRandom, gmlRandomRange, gmlU32, gmlShuffle } from '../../sim/rng.js';
import {
  scrBulletInherit, regularbulletCreate, regularbulletStep, collidebulletOther15,
} from '../../sim/bullets/regularbullet.js';
import { chainNext } from '../../sim/attacks/combination.js';
import { STARCHILD_MASK, enginePairHit } from '../../sim/masks.js';

function replaySlashOrder(state, list) {
  const q = state.slashOrder;
  if (!q || !q.entries || q.at >= q.entries.length) return;
  const norm = (v) => ((v % 360) + 360) % 360;
  const taken = [];
  const used = new Array(list.length).fill(false);

  const WINDOW = 32;
  let scan = q.at;

  while (taken.length < list.length) {
    if (scan >= q.entries.length || scan >= q.at + WINDOW) break;
    const want = norm(q.entries[scan].angle);
    const idx = list.findIndex((v, i) => !used[i] && Math.abs(norm(v) - want) < 0.01);
    if (idx < 0) { scan += 1; continue; }
    used[idx] = true;
    taken.push(list[idx]);
    q.entries.splice(scan, 1);
  }
  if (taken.length === list.length) {
    for (let i = 0; i < list.length; i++) list[i] = taken[i];
    q.hits = (q.hits ?? 0) + 1;
  } else {
    q.misses = (q.misses ?? 0) + 1;
  }
}

function shuffleList(list, rng) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = gmlU32(rng) % (i + 1);
    const t = list[i];
    list[i] = list[j];
    list[j] = t;
  }
  return list;
}

function kaizoSideb(state) {
  return state.kaizo?.sideb === true;
}

function instanceNumberRotating(state) {
  let n = 0;
  for (const k of state.entities) {
    if (k.alive && k.type.name === 'obj_knight_rotating_slash') n += 1;
  }
  return n;
}

function instanceExists(state, name) {
  return state.entities.some((k) => k.alive && k.type.name === name);
}

export const kaizoDelayedVar = {
  name: 'obj_script_delayed',

  create(e) {
    e.varname = '';
    e.value = 0;
    e.target = -1;

  },

  alarm: {

    0(e) {
      if (e.target && e.target !== -1 && e.target.alive) {
        e.target[e.varname] = e.value;
      }
      destroy(e);
    },
  },
};

export const kaizoScriptRepeat = {
  name: 'obj_script_delayed',

  create(e) {

    e.script = null;
    e.target = -1;
    e.rate = 1;
    e.max_time = 0;
    e.timer = 999;
    e.totaltimer = 0;
  },

  step(e, state) {

    e.timer += 1;
    if (e.timer >= e.rate) {
      if (e.target && e.target !== -1 && e.target.alive && e.totaltimer < e.max_time) {
        e.script(e.target, state);
        e.timer = 0;
      } else {
        destroy(e);
      }
    }
    e.totaltimer += 1;
  },
};

function scrDelayVar(state, target, varname, value, delay) {
  const r = spawn(state, kaizoDelayedVar, { x: 0, y: 0 });
  r.target = target;
  r.varname = varname;
  r.value = value;
  r.alarm[0] = delay;
  return r;
}

function scrScriptRepeat(state, target, script, maxTime, rate) {
  const r = spawn(state, kaizoScriptRepeat, { x: 0, y: 0 });
  r.target = target;
  r.script = script;
  r.max_time = maxTime;
  r.rate = rate;
  return r;
}

export function kaizoSlashbulletStep(target, state) {
  if (state.gmlRng) {
    gmlChoose(state.gmlRng, [-90, 90]);
    gmlRandomRange(state.gmlRng, -0.5, 0.5);
  }
}

export const kaizoSlashRingBullet = {
  name: 'obj_regularbullet',

  create(e, state) {
    regularbulletCreate(e, state);
  },

  step: regularbulletStep,

  collides(e, heart) {
    if (e.active !== 1 && e.active !== true) return false;
    return enginePairHit(heart, e, STARCHILD_MASK);
  },

  other15: collidebulletOther15,
};

export const rotatingSlash = {
  name: 'obj_knight_rotating_slash',

  create(e, state) {

    e.grazed = 0;
    e.grazetimer = 0;
    e.destroyonhit = 1;
    e.target = 0;
    e.inv = 60;
    e.damage = 10;
    e.element = 0;
    e.grazepoints = 1;
    e.timepoints = 1;
    e.active = 1;
    e.updateimageangle = 0;

    e.image_speed = 0;

    e.sprite_index = 'spr_roaringknight_attack_ol';
    e.image_index = 0;

    e.image_xscale = 2;
    e.image_yscale = 2;

    e.difficulty = 2;
    e.slash_number = 1;
    e.rotation = 16;
    e.rotation_base = 16;

    e.r = 0;
    e.g = 0;
    e.b = 0;
    e.line_width = 4;
    e.line2 = -1;
    e.line3 = -1;
    e.rotation_change = 1;
    e.rotation_goal = 2;
    e.timer = 0;
    e.state = 'intro';
    e.turn_type = 'full';
    e.local_turntimer = 0;
    e.aim_direction = 0;
    e.spin = state.spinSequence
      ? state.spinSequence[state.spinIndex++]
      : gmlChoose(state.gmlRng, [-1, 1]);
    e.random_offset = gmlIrandom(state.gmlRng, 360);
    e.slash_array = [1, 2, 2, 3, 3, 4];
    e.slash_counter = 0;
    e.final_counter = 0;
    e.slash_base = 18;
    e.slash_offset = 6;
    e.speed_gain = 16;
    e.cooldown_time = 6;
    e.slash_timer = 8;
    e.aim_type = 0;
    e.anchor_x = e.x;
    e.anchor_y = e.y;
    e.aim_x = e.x;
    e.aim_y = e.y;
    e.slash_list = [];
    e.movebox_x = 40;
    e.movebox_y = 60;
    e.do_final = true;
    e.turn_limit_4 = 270;
    e.slashes_done = false;
    e.done = false;

    e.delay_swords = false;

    e.bul_x = e.x;
    e.bul_y = e.y;
    {

      const knight = state.entities.find(
        (k) => k.alive && k.type.name === 'obj_knight_enemy',
      );
      if (knight && gmlEq(state.currentAc ?? -999, 16)) {
        e.delay_swords = true;
        e.delay_wait = 0;
      }

      if (instanceNumberRotating(state) > 1) {
        for (const other of state.entities) {
          if (!other.alive || other.type.name !== 'obj_knight_rotating_slash') continue;
          if (other === e) continue;
          if (other.firstrot !== undefined && other.firstrot) {
            e.finale_spin = other.finale_spin;
          }
        }
        e.firstrot = 0;
      } else {
        e.firstrot = 1;
        e.finale_spin = gmlChoose(state.gmlRng, [-1, 1]);
      }
    }
  },

  init(e) {
    if (e.difficulty === 1) {
      e.slash_offset = 6;
      e.slash_number = 3;
      e.slash_array = [2, 3, 4, 4, 4, 4];
    }
    if (e.difficulty === 2) {
      e.slash_offset = 0;
      e.slash_number = 3;
      e.slash_array = [3, 4, 4, 4, 4, 4];
    }

    if (e.difficulty === 8) {
      e.slash_offset = 0;
      e.slash_number = 3;
      e.slash_array = [3, 4, 4, 4, 5, 5];
    }

    if (e.turn_type === 'full') e.local_turntimer = 400;
    if (e.turn_type === 'start') e.local_turntimer = 320;
    if (e.turn_type === 'end') {
      e.local_turntimer = 300;
      e.timer = 15;
    }
    if (e.turn_type === 'short start') {
      e.local_turntimer = 270;
      e.timer = 12;
      e.turn_limit_4 = 250;
    }
    if (e.turn_type === 'short mid') {
      e.local_turntimer = 260;
      e.timer = 15;
      e.turn_limit_4 = 250;
    }
    if (e.turn_type === 'short end') {
      e.local_turntimer = 260;
      e.timer = 15;
    }
  },

  cleanUp(e, state) {

    const closing =
      e.turn_type !== 'start' &&
      e.turn_type !== 'short start' &&
      e.turn_type !== 'short mid';

    if (!closing) return;
    const knight = state.entities.find(
      (x) => x.alive && x.type.name === 'obj_knight_enemy',
    );
    if (knight) knight.image_alpha = 1;

    if (kaizoSideb(state) && gmlEq(state.currentAc ?? -999, 111)) {
      const handoff = state.kaizo?.hooks?.vortexendHandoff;
      if (handoff) {

        handoff(state, e);
        return;
      }
      if (state.kaizo) {
        (state.kaizo.approx ??= []).push({
          type: 104, asked: 'sideb ac-111 kaizo_vortexend_step handoff',
          used: 'vanilla turn end (-1)',
          why: 'vortexendHandoff hook not provided (VORTEX item)',
        });
      }
    }
    state.turntimer = -1;
  },

  alarm: {

    3(e, state) {

      destroy(e, state);
    },

    2(e, state) {
      chainNext(state, e, 'rotating_alarm2');

      destroy(e, state);
    },

    1(e) {
      e.line3 = 0;
    },
  },

  step(e, state) {

    {
      const kx = state.entities.find(
        (x) => x.alive && x.type.name === 'obj_knight_enemy',
      );
      if (kx) kx.siner2 = 0;
    }

    e.local_turntimer -= 1;

    if (e.delay_swords) {

      const _adj = kaizoSideb(state) ? 1 : 0;
      e.slash_base = 16 - _adj;
      e.slash_offset = 0;
      e.cooldown_time = 12 - _adj;

      for (const s of state.entities) {
        if (s.alive && s.type.name === 'obj_tracking_sword1') {
          s.fadetohalftime = 5;
          s.waittime = 5;
          s.fadetofulltime = 15 - _adj;
          s.flashtime = 4;
        }
      }
      if (e.delay_wait > 0) {
        e.delay_wait -= 1;
      }
      if (e.delay_wait <= 0) {
        if (e.state === 'aim' && e.timer === 5 - _adj) {

          e.delay_wait = 15 - _adj;
        } else {

          for (const m of state.entities) {
            if (m.alive && m.type.name === 'obj_tracking_swords_manager') {
              m.timer = m.rate - 2;
            }
          }
        }
      }
    }

    if (e.difficulty >= 10 || instanceNumberRotating(state) > 1) {
      if (!e.slashes_done) {
        e.slash_offset = 6;
        if (kaizoSideb(state)) {
          e.slash_offset = 7;
        }
        e.rotation_goal = 0;
        if (e.rotation > 2) {
          e.rotation_change = 1;
        } else {
          e.rotation_change = e.rotation / 8;
        }
      }
    } else if (kaizoSideb(state) && !e.delay_swords) {

      if (e.slash_base > 15) {
        e.slash_base = 15;
      }
    }

    if (globalThis.process?.env?.KNIGHT_RS_DEBUG) {
      const f = globalThis.__simFrame;
      const [a, b] = globalThis.process.env.KNIGHT_RS_DEBUG.split('-').map(Number);
      if (f >= a && f <= (b ?? a) && (e.state !== e._lastLoggedState || e.local_turntimer === 199)) {
        console.error(`[rs] f=${f} state=${e.state} timer=${e.timer} ltt=${e.local_turntimer}`
          + ` sc=${e.slash_counter} done=${e.slashes_done} a3=${e.alarm[3]}`);
        e._lastLoggedState = e.state;
      }
    }

    if (e.local_turntimer < 240 && e.next_up === 1) {
      chainNext(state, e, 'rotating_step');
      e.next_up = -999;
    }
    if (e.local_turntimer < 220 && e.next_up === 3) {
      chainNext(state, e, 'rotating_step');
      e.next_up = -999;
    }
    if (e.local_turntimer < e.turn_limit_4 && e.next_up === 4) {
      chainNext(state, e, 'rotating_step');
      e.next_up = -999;
    }
    if (e.local_turntimer < e.turn_limit_4 && e.next_up === 5) {
      chainNext(state, e, 'rotating_step');
      e.next_up = -999;
    }

    if (e.line2 > -1) {
      e.line2 += 1;
      e.line2 %= 8;
    }
    if (e.line3 > -1) {
      e.line3 += 1;
      e.line3 %= 8;
    }

    if (e.done) return;

    if (e.image_index >= 5 && e.aim_type !== 2) {
      e.image_index = 5;
      e.image_speed = 0;
    }

    if (e.state === 'intro') {
      e.timer += 1;
      if (e.timer > 16) {
        e.state = 'aim';
        e.timer = 0;
      }
    }

    if (e.state === 'aim') {
      e.timer += 1;
      if (e.timer === 1) {

        cueStop(state, 'snd_knight_rotatingslash_line');
        cueLoop(state, 'snd_knight_rotatingslash_line');
        e.rotation = e.rotation_base;

        e.r = 128;
        e.g = 128;
        e.b = 128;
        e.spin = state.spinSequence
      ? state.spinSequence[state.spinIndex++]
      : gmlChoose(state.gmlRng, [-1, 1]);
        e.movebox_x += 20 + gmlIrandom(state.gmlRng, 40);
        e.movebox_y += 30 + gmlIrandom(state.gmlRng, 60);
        if (e.movebox_x > 80) e.movebox_x -= 80;
        if (e.movebox_y > 120) e.movebox_y -= 120;

        if (e.aim_type !== 2) {
          e.image_index = 1;
        } else {
          e.sprite_index = 'spr_roaringknight_flurry_prepare';
          e.image_index = 0;

          e.spin = e.finale_spin;
        }

        {
          const b = boxEdges(state);
          const dur = e.slash_base + e.slash_offset - 8;
          scrLerpvar(state, spawn, e, 'x', e.x, b[0] - 20 + e.movebox_x, dur, 1);
          scrLerpvar(state, spawn, e, 'y', e.y, b[1] - 20 + e.movebox_y, dur, 1);
        }
      }

      if (e.timer === Math.floor((e.slash_base + e.slash_offset) * 0.5) && e.aim_type !== 2) {
        e.image_index += 1;
      }

      if (e.timer === e.slash_base + e.slash_offset) {
        if (e.aim_type !== 2) {
          e.image_speed = 0.5;
        } else {
          scrDelayVar(state, e, 'sprite_index', 'spr_roaringknight_flurry', 4);
          scrDelayVar(state, e, 'image_speed', 1, 4);
        }
      }

      e.aim_direction += e.rotation * e.spin;
      e.rotation = scrApproach(e.rotation, e.rotation_goal, e.rotation_change);

      if (e.timer === 1 && e.aim_type === 0) {
        const heart = state.soul;

        if (!heart) return;

        const hp = state.soulPrev ?? heart;
        e.aim_x = hp.x + 10;
        e.aim_y = hp.y + 10;
      }

      if (e.timer === 1) {

        {
          const hp2 = state.soulPrev ?? state.soul;
          if (hp2) {
            e.bul_x = hp2.x + 10;
            e.bul_y = hp2.y + 10;
          }
        }

        spawn(state, kaizoKnightCircle, { x: e.aim_x, y: e.aim_y });
      } else {

        e.r = scrApproach(e.r, 0, 9.142857142857142);
        e.g = scrApproach(e.g, 0, 9.142857142857142);
        e.b = scrApproach(e.b, 255, 9.142857142857142);
      }

      if (e.timer === e.slash_base + 6 + e.slash_offset) {
        e.state = 'slash';
        e.timer = 0;
      }
    }

    if (e.state === 'slash') {
      e.timer += 1;
      if (e.timer === 1) {
        e.slash_list = [];
        for (let a = 0; a < e.slash_number; a++) {
          e.slash_list.push(
            (360 / (e.slash_number * 2)) * a + e.random_offset + e.aim_direction,
          );
        }

        {
          const _vol = 1 / instanceNumberRotating(state);
          cue(state, 'snd_knight_cut', 1, _vol);
          cue(state, 'snd_explosion_firework', 1, _vol);
        }
        if (state.fixedSlashOrder === true && state.angleLists) {

          if (state.gmlRng) {
            for (let i = 0; i < e.slash_list.length * 16; i++) gmlU32(state.gmlRng);
          }
          const rec = state.angleLists[state.angleIndex++];
          if (rec) e.slash_list = [...rec];
        } else {

          gmlShuffle(state.gmlRng, e.slash_list);

          replaySlashOrder(state, e.slash_list);
        }
      }

      if (e.timer - 1 < e.slash_list.length) {
        const s = spawn(state, roaringknightSlash, { x: e.aim_x, y: e.aim_y });
        s.direction = e.slash_list[e.timer - 1];
        s.image_xscale = 2;
        s.xscale = 2;
        s.image_angle = s.direction;

        s.visible = false;
        s.width = s.width * 2;
        s.aoe = true;

        scrBulletInherit(e, s);

        if (state.gmlRng) {
          gmlRandom(state.gmlRng, 3);
          gmlRandom(state.gmlRng, 1);
          for (let burst = 0; burst < 2; burst++) {
            const reps = 4 + gmlIrandom(state.gmlRng, 3);
            for (let i = 0; i < reps; i++) {
              gmlIrandom(state.gmlRng, 8);
              gmlRandom(state.gmlRng, 60);
              gmlRandom(state.gmlRng, 4);
              gmlRandomRange(state.gmlRng, -10, 10);
            }
          }
        }
      }

      if (e.timer === e.slash_list.length) {
        const _bx = e.bul_x;
        const _by = e.bul_y;
        if (kaizoSideb(state) && e.firstrot) {
          if (e.rotind === undefined) e.rotind = 0;
          if (e.cooldown_time > 2) {
            let _amt = 4;
            const _spd = 10;
            if (e.slash_number > 2) _amt = 6;
            if (e.slash_number > 4) _amt = 8;
            if (instanceExists(state, 'obj_sword_vortex_manager')) _amt = -1;
            if (instanceExists(state, 'obj_knight_weird_bottom_manager')) _amt = -1;

            if (instanceExists(state, 'obj_tracking_swords_manager')
              && (state.knightPhase ?? state.knight?.phase) === 2) _amt = -1;

            for (let i = 0; i < _amt; i++) {
              let _rot = (i / _amt) * 360;
              if (e.rotind % 2 === 1) {
                _rot += (0.5 / _amt) * 360;
              }
              const b = spawn(state, kaizoSlashRingBullet, { x: _bx, y: _by });

              b.flag = 'exp';
              b.target = 0;
              b.damage = 140;

              b.image_blend = getSwordcolor(state);
              b.sprite_index = 'spr_knight_starchild';
              b.direction = _rot;
              b.image_angle = b.direction;
              b.image_xscale = 0;
              b.image_yscale = 0;
              b.speed = 0;
              b.active = 1;
              b.image_alpha = 1;

              scrLerpvar(state, spawn, b, 'image_xscale', 0, 0.9, 12);
              scrLerpvar(state, spawn, b, 'image_yscale', 0, 0.45, 12);
              scrLerpvar(state, spawn, b, 'speed', -1, _spd, 12);
              scrLerpvar(state, spawn, b, 'image_alpha', 3.5, 0, 35);
              scrDelayVar(state, b, 'active', 0, 25);
              b.destroyonhit = 0;
              scrScriptRepeat(state, b, kaizoSlashbulletStep, 35, 1);
            }
            e.rotind += 1;
          }
        }
      }

      if (e.timer === e.slash_timer) {
        e.state = 'cooldown';
        e.timer = 0;
      }
    }

    if (e.state === 'cooldown') {
      e.timer += 1;
      if (e.timer === e.cooldown_time || e.local_turntimer < 200) {
        e.slash_counter += 1;
        if (e.slash_counter < e.slash_array.length) {
          e.slash_number = e.slash_array[e.slash_counter];

          e.slash_offset = scrApproach(e.slash_offset, 0, 6);
          e.slash_base = scrApproach(e.slash_base, 15, 1);
        }

        if (e.local_turntimer < 200 && !e.slashes_done) {
          e.slashes_done = true;
          e.local_turntimer = 99999;
        }

        if (e.slashes_done) {
          if (e.difficulty === 2 && e.turn_type === 'full') {
            if (e.do_final) {

              if (e.firstrot) {
                e.aim_direction = gmlIrandom(state.gmlRng, 359);
              } else {
                for (const other of state.entities) {
                  if (!other.alive || other.type.name !== 'obj_knight_rotating_slash') continue;
                  if (other.firstrot !== undefined && other.firstrot) {
                    e.aim_direction = other.aim_direction
                      + gmlChoose(state.gmlRng, [-45, 45])
                      + gmlRandomRange(state.gmlRng, -5, 5);
                  }
                }
              }

              cue(state, 'snd_knight_puff');
              cue(state, 'snd_knight_teleport', 0.5);

              e.rotation_base = 18;
              e.rotation_change = 0.5;
              e.line_width = 4;
              e.slash_number = 1;
              e.slash_base = 24;
              e.cooldown_time = 2;
              e.slash_timer = 2;
              e.aim_type = scrApproach(e.aim_type, 2, 1);
              e.do_final = false;
              const b = boxEdges(state);
              e.aim_x = (b[2] + b[0]) / 2;
              e.aim_y = (b[1] + b[3]) / 2;
            }
          } else if (e.turn_type === 'start' || e.turn_type === 'short start'
            || e.turn_type === 'short mid') {

            if (!e.handoffArmed) {
              e.handoffArmed = true;
              const w = spawn(state, knightWarp, { x: e.x, y: e.y });
              w.master = e;
              knightWarpOut(state, w);
              e.alarm[2] = 4;
            }
            return;
          } else {
            e.state = 'return';
            e.timer = 0;
            e.done = true;
            e.alarm[3] = 22;
            return;
          }
        }

        if (e.aim_type < 2) {
          e.state = 'aim';
          e.timer = 0;

          if (e.aim_type === 1) {
            e.line2 = 0;
            e.alarm[1] = 4;
            e.aim_type = scrApproach(e.aim_type, 2, 1);
          }
          return;
        }

        e.state = 'slash';
        e.timer = 0;
        e.aim_direction += e.speed_gain * e.spin;
        e.speed_gain = scrApproach(e.speed_gain, 24, 1);
        e.final_counter += 1;

        let _endslashamt = 28;
        if (kaizoSideb(state)) {
          if (instanceExists(state, 'obj_sword_vortex_manager')) {
            _endslashamt = 42;
          } else {
            _endslashamt = 56;
          }
        }
        if (e.final_counter === _endslashamt) {
          e.state = 'return';
          e.done = true;

          e.sprite_index = 'spr_roaringknight_attack_ol';
          e.image_index = 0;
          e.image_speed = 0;

          e.alarm[3] = 22;
        } else {

          const rec = state.finalMoveTable ? state.finalMoveTable[state.finalMoveIndex++] : null;
          e.movebox_x += rec ? rec.mx : 20 + gmlIrandom(state.gmlRng, 40);
          e.movebox_y += rec ? rec.my : 30 + gmlIrandom(state.gmlRng, 60);
          e.sprite_index = 'spr_roaringknight_flurry';
          e.image_speed = 1;
          if (e.movebox_x > 80) e.movebox_x -= 80;
          if (e.movebox_y > 120) e.movebox_y -= 120;
          const b = boxEdges(state);
          const dur = e.slash_base + e.slash_offset - 8;
          scrLerpvar(state, spawn, e, 'x', e.x, b[0] - 20 + e.movebox_x, dur, 1);
          scrLerpvar(state, spawn, e, 'y', e.y, b[1] - 20 + e.movebox_y, dur, 1);
        }
      }
    }
  },
};

function boxEdges(state) {
  const gt = state.entities.find((x) => x.alive && x.type.name === 'obj_growtangle');
  if (!gt) return [0, 0, 0, 0];
  const hw = (gt.spriteWidth ?? 75 * gt.image_xscale) * 0.5;
  const hh = (gt.spriteHeight ?? 75 * gt.image_yscale) * 0.5;
  return [gt.x + hw, gt.y - hh, gt.x - hw, gt.y + hh];
}

export function spawnRotatingSlash(state, x, y, { difficulty = 0 } = {}) {

  const knight = state.entities.find(
    (k) => k.alive && k.type.name === 'obj_knight_enemy',
  );
  if (knight) knight.image_alpha = 0;

  const e = spawn(state, rotatingSlash, { x, y });
  e.difficulty = difficulty;
  rotatingSlash.init(e);
  return e;
}

