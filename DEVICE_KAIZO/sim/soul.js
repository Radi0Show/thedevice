


import { soulSpeed } from './spells.js';
import { placeMeetingSolid } from './collision.js';


const SPRITE_WIDTH = 20;
const SPRITE_HEIGHT = 20;

export const soul = {
  name: 'obj_heart',

  create(e, state) {

    state.sp = 4;
    e.wspeed = state.sp;

    e.fly = 0;
    e.canmove = 1;
    e.boundaryup = 0;
    e.color = 0;
    e.dmgnoise = 0;


    e.disableslow = 0;
    if (state.input && state.input.focus) {
      e.disableslow = 1;
    }

    e.remove_slow_z_buffer = 40;
  },



  motion(e, state) {
    state.invTimer -= 1;
  },

  step(e, state) {
    const input = state.input;

    e.wallcheck = 0;
    let press_l = 0;
    let press_r = 0;
    let press_d = 0;
    let press_u = 0;
    let bkx = 0;
    let bky = 0;
    let bkxy = 0;
    e.jelly = 2;


    e.wspeed = soulSpeed(state);

    if (input.left) press_l = 1;
    if (input.right) press_r = 1;
    if (input.up) press_u = 1;
    if (input.down) press_d = 1;

    let px = 0;
    let py = 0;

    if (e.canmove) {

      if (press_r === 1) px = e.wspeed;
      if (press_l === 1) px = -e.wspeed;
      if (press_d === 1) py = e.wspeed;
      if (press_u === 1) py = -e.wspeed;

      if (input.focus && state.flag22 === 0) {
        if (e.disableslow === 0) {
          px = Math.ceil(px * 0.5);
          py = Math.ceil(py * 0.5);
        }
      } else {
        e.disableslow = 0;
      }
    }

    e.remove_slow_z_buffer += 0.5;



    if (placeMeetingSolid(state, e.x + px, e.y)) {
      for (let g = e.wspeed; g > 0; g -= 1) {
        let mvd = 0;
        if (press_d === 0 && !placeMeetingSolid(state, e.x + px, e.y - g)) {
          e.y -= g;
          py = 0;
          break;
        }
        if (press_u === 0 && mvd === 0 && !placeMeetingSolid(state, e.x + px, e.y + g)) {
          e.y += g;
          py = 0;
          break;
        }
      }

      bkx = 0;
      if (px > 0) {
        for (let i = px; i >= 0; i -= 1) {
          if (!placeMeetingSolid(state, e.x + i, e.y)) {
            px = i;
            bkx = 1;
            break;
          }
        }
      }
      if (px < 0) {
        for (let i = px; i <= 0; i += 1) {
          if (!placeMeetingSolid(state, e.x + i, e.y)) {
            px = i;
            bkx = 1;
            break;
          }
        }
      }
      if (bkx === 0) px = 0;
    }

    if (placeMeetingSolid(state, e.x, e.y + py)) {
      bky = 0;
      for (let g = e.wspeed; g > 0; g -= 1) {
        let mvd = 0;
        if (press_r === 0 && !placeMeetingSolid(state, e.x - g, e.y + py)) {
          e.x -= g;
          px = 0;
          break;
        }
        if (mvd === 0 && press_l === 0 && !placeMeetingSolid(state, e.x + g, e.y + py)) {
          e.x += g;
          px = 0;
          break;
        }
      }

      if (py > 0) {
        for (let i = py; i >= 0; i -= 1) {
          if (!placeMeetingSolid(state, e.x, e.y + i)) {
            py = i;
            bky = 1;
            break;
          }
        }
      }
      if (py < 0) {
        for (let i = py; i <= 0; i += 1) {
          if (!placeMeetingSolid(state, e.x, e.y + i)) {
            py = i;
            bky = 1;
            break;
          }
        }
      }
      if (bky === 0) py = 0;
    }

    if (placeMeetingSolid(state, e.x + px, e.y + py)) {
      bkxy = 0;
      let i = px;
      let j = py;
      while (j !== 0 || i !== 0) {
        if (!placeMeetingSolid(state, e.x + i, e.y + j)) {
          px = i;
          py = j;
          bkxy = 1;
          break;
        }
        if (Math.abs(j) >= 1) {
          if (j > 0) j -= 1;
          if (j < 0) j += 1;
        } else {
          j = 0;
        }
        if (Math.abs(i) >= 1) {
          if (i > 0) i -= 1;
          if (i < 0) i += 1;
        } else {
          i = 0;
        }
      }
      if (bkxy === 0) {
        px = 0;
        py = 0;
      }
    }


    let shx = 0;
    let shy = 0;
    for (const sh of state.entities) {
      if (sh.alive && sh.type.name === 'obj_shake' && sh.active === 0) {
        shx = sh.shakex;
        shy = sh.shakey;
      }
    }

    if (e.x + px >= state.view.x + shx + 640 - SPRITE_WIDTH) {
      px = state.view.x + shx + 640 - SPRITE_WIDTH - e.x;
    }
    if (e.x + px <= 0) {
      px = -e.x;
    }
    if (e.y + py <= 0) {
      py = -e.y;
    }
    if (e.y + py >= state.view.y + shy + 320 - SPRITE_HEIGHT + e.boundaryup) {
      py = state.view.y + shy + 320 - SPRITE_HEIGHT - e.y + e.boundaryup;
    }


    e.x += px;
    e.y += py;



    state.heartx = e.x + 2 - state.view.x;
    state.hearty = e.y + 2 - state.view.y;


    if (e.color === 1) {
      e.wspeed = 5;
    }
  },
};
