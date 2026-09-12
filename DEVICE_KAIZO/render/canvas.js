


import { HEART_MASK, BATTLEBG_MASK, TOOTH_MASK, FOUNTAIN_MASK, SPRITE_MASKS } from '../sim/masks.js';
import { loadSprites, SPRITE_FOR } from './sprites.js';
import { drawPointingCone } from './draw/pointing-cone.js';
import { drawPointingStar } from './draw/pointing-star.js';
import { drawPointingStarchild } from './draw/pointing-starchild.js';
import { drawRoaring, drawScreenPiece, resetScreenCut, roaringCover, drawRoaringCover } from './draw/roaring.js';
import { drawRoaringknightSlash } from './draw/slash.js';
import { drawGrowtangle, tinted, fogged } from './draw/gm.js';
import { drawSplitCut } from './draw/splitcut.js';
import { drawMenu } from './menu.js';
import { knightDrawCalls } from './knightdraw.js';
import { drawTensionBar } from './tensionbar.js';
import { drawGraze } from './graze.js';
import { drawFightBar } from './fightbar.js';
import { drawBackground } from './background.js';
import { drawSnowBackdrop } from './draw/intro-fx.js';
import { CAM_X } from '../sim/intro.js';
import { drawDmgNumbers, drawAttackVfx, drawHealWriters } from './dmgnumbers.js';
import { drawRudeBuster } from './rudebuster.js';
import { drawDialogue } from './dialogue.js';
import {
  drawSwordTunnelSword, drawTrackingSword, drawTrackingSwordsManager,
  drawSplitslashStrike,
} from './draw/swords.js';
import { drawKnightCircle } from './draw/knight-circle.js';
import { drawKnightStream } from './draw/knight-stream.js';
import { drawFallingSword, drawSwordfallKnight } from './draw/swordfall.js';
import { drawWeirdCircle, drawWeirdBottomManager } from './draw/underbox.js';
import { drawTunnelslash } from './draw/knightlines.js';
import { drawRotatingSlashTelegraph } from './draw/rotating-slash.js';
import { createSplitBox } from './splitbox.js';
import { scrEaseOut, clamp01, lerp } from '../sim/gml.js';

const VIEW_W = 640;
const VIEW_H = 480;

const COLORS = {
  bg: '#000000',
  box: '#ffffff',
  soul: '#ff0000',
  soulHurt: '#7a0000',
  fallback: '#ffffff',
  slash: '#ff4444',
};



const MASK_FOR = {
  obj_heart: HEART_MASK,
  obj_growtangle: BATTLEBG_MASK,
  obj_roaringknight_split_bullet: TOOTH_MASK,
  obj_roaringknight_fountain_bullet: FOUNTAIN_MASK,
};


function bakeMask(mask, color) {
  const c = document.createElement('canvas');
  c.width = mask.w;
  c.height = mask.h;
  const g = c.getContext('2d');
  const img = g.createImageData(mask.w, mask.h);
  const r = parseInt(color.slice(1, 3), 16);
  const gg = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  for (let y = 0; y < mask.h; y++) {
    for (let x = 0; x < mask.w; x++) {
      const i = (y * mask.w + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = gg;
      img.data[i + 2] = b;
      img.data[i + 3] = mask.px[y][x] ? 255 : 0;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}



let ghostScratch = null;
let flatScratch = null;
function getScratch(ref, w, h) {
  if (!ref || ref.width !== w || ref.height !== h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d').imageSmoothingEnabled = false;
    return c;
  }
  return ref;
}



function drawScreenGhost(ctx, e, state, deps) {
  if (e.draw_end) return true;
  if (!(e.alpha > 0)) return true;
  const { VIEW_W: W, VIEW_H: H } = deps;
  flatScratch = getScratch(flatScratch, W, H);
  const g = flatScratch.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, W, H);
  g.drawImage(ctx.canvas, 0, 0);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = Math.min(1, e.alpha);
  const sx = (e.x - state.view.x) - e.anchor_x * e.xscale;
  const sy = (e.y - state.view.y) - e.anchor_y * e.yscale;
  ctx.drawImage(flatScratch, sx, sy, W * e.xscale, H * e.yscale);
  ctx.restore();
  return true;
}



export async function createRenderer(canvas, { overrides = null } = {}) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const overrideMap = overrides && typeof overrides === 'object' ? overrides : {};
  for (const [name, fn] of Object.entries(overrideMap)) {
    if (typeof fn !== 'function') {
      throw new TypeError(`createRenderer: overrides.${name} must be a function, got ${typeof fn}`);
    }
  }

  const overrideFor = (name) => (
    Object.prototype.hasOwnProperty.call(overrideMap, name) ? overrideMap[name] : undefined
  );

  let sprites = new Map();
  try {
    sprites = await loadSprites();
  } catch (err) {
    console.warn('sprites unavailable, falling back to collision masks:', err.message);
  }

  const baked = {
    obj_heart: bakeMask(HEART_MASK, COLORS.soul),
    heartHurt: bakeMask(HEART_MASK, COLORS.soulHurt),
    obj_growtangle: bakeMask(BATTLEBG_MASK, COLORS.box),
    obj_roaringknight_split_bullet: bakeMask(TOOTH_MASK, COLORS.fallback),
    obj_roaringknight_fountain_bullet: bakeMask(FOUNTAIN_MASK, COLORS.fallback),
  };



  function blit(img, ox, oy, x, y, sx, sy, angleDeg, alpha, blend) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (angleDeg) ctx.rotate((-angleDeg * Math.PI) / 180);
    ctx.scale(sx, sy);

    ctx.drawImage(blend ? tinted(img, blend) : img, -ox, -oy);
    ctx.restore();
  }

  const splitBox = createSplitBox(sprites);




  let roaringWasAlive = false;

  const roaringOwnsIt = (state) =>
    state.entities.some((x) => x.alive && x.type.name === 'obj_knight_roaring2' && !x.stop);

  const DRAW_EVENTS = {


    obj_afterimage_screen: drawScreenGhost,
    obj_knight_pointing_cone: drawPointingCone,

    obj_knight_stream: drawKnightStream,

    obj_fallingsword: drawFallingSword,
    obj_knight_swordfall: drawSwordfallKnight,

    obj_knight_weird_circle: drawWeirdCircle,
    obj_knight_weird_bottom_manager: drawWeirdBottomManager,

    obj_bullet_knight_tunnelslash: drawTunnelslash,


    obj_knight_tunnel_slasher(ctx2, e, state2, deps) {
      const entry = deps.sprites.get(e.sprite_index);
      if (!entry || !entry.frames.length) return true;
      blit(entry.frames[Math.abs(Math.floor(e.image_index ?? 0)) % entry.frames.length],
        entry.meta.ox, entry.meta.oy,
        e.x, e.y + Math.sin(e.fulltimer * 0.1) * 2,
        e.image_xscale ?? 2, e.image_yscale ?? 2, 0, e.image_alpha ?? 1, e.image_blend);
      return true;
    },


    obj_knight_tunnel_slasher_2_revised(ctx2, e, state2, deps) {
      const entry = deps.sprites.get(e.sprite_index);
      const ymod = Math.sin((e.siner ?? 0) / 30) * 8;
      const xs = e.image_xscale ?? 2;
      const ys = e.image_yscale ?? 2;
      const alpha = e.image_alpha ?? 1;

      if (e.sprite_index === 'spr_roaringknight_noarm') {
        const arm = deps.sprites.get('spr_roaringknight_armpoint');
        if (arm && arm.frames.length) {
          const f = Math.abs(Math.floor(e.armpoint_index ?? 0)) % arm.frames.length;
          blit(arm.frames[f], arm.meta.ox, arm.meta.oy,
            e.x + 116, e.y + 62 + ymod, xs, ys, e.armpoint ?? 0, alpha, e.image_blend);
        }
      }
      if (!entry || !entry.frames.length) return true;
      blit(entry.frames[Math.abs(Math.floor(e.image_index ?? 0)) % entry.frames.length],
        entry.meta.ox, entry.meta.oy,
        e.x, e.y + ymod, xs, ys, 0, alpha, e.image_blend);
      return true;
    },
    obj_bullet_knight_stream: () => true,
    obj_knight_streamline: () => true,
    obj_bullet_stream_diamond: () => true,
    obj_knight_pointing_star: drawPointingStar,
    obj_knight_roaring2: drawRoaring,
    obj_marker_screenpiece: drawScreenPiece,


    obj_roaringknight_slash: drawRoaringknightSlash,

    obj_sword_tunnel_sword: drawSwordTunnelSword,
    obj_tracking_sword1: drawTrackingSword,
    obj_tracking_swords_manager: drawTrackingSwordsManager,



    obj_tracking_sword_slash: () => true,
    obj_roaringknight_splitslash: drawSplitslashStrike,
    obj_knight_split_growtangle_effect: drawSplitCut,


    obj_growtangle: (ctx, e, state, deps) => {

      if (state.boardVisible === false) return true;

      return drawGrowtangle(ctx, e, deps.sprites, SPRITE_FOR.obj_growtangle);
    },



    obj_knight_roaring_star: (ctx, e, state) => roaringOwnsIt(state),
    obj_particle_generic: (ctx, e, state) => roaringOwnsIt(state),
    obj_afterimage: (ctx, e, state) => roaringOwnsIt(state),
    obj_afterimage_grow: (ctx, e, state) => roaringOwnsIt(state),
    obj_knight_pointing_starchild(ctx, e, state, deps) {
      if (roaringOwnsIt(state)) return true;
      return drawPointingStarchild(ctx, e, state, deps);
    },
    obj_knight_circle: drawKnightCircle,



    obj_oflash(ctx2, e, state2, deps) {
      const entry = deps.sprites.get(e.sprite_index ?? SPRITE_FOR.obj_knight_enemy);
      if (!entry || !entry.frames.length) return true;
      const a = Math.sin(e.siner / 3);
      if (a <= 0) return true;
      const idx = Math.abs(Math.floor(e.image_index ?? 0)) % entry.frames.length;
      blit(fogged(entry.frames[idx], e.flashcolor ?? [255, 255, 255]),
        entry.meta.ox, entry.meta.oy, e.x, e.y,
        e.image_xscale ?? 2, e.image_yscale ?? 2, 0, Math.min(1, a));
      return true;
    },
    obj_knight_rotating_slash: drawRotatingSlashTelegraph,



    obj_knight_enemy(ctx, e, state) {
      const k = state.knight;


      if (k?.chargeupcon === 1) {
        const entry0 = sprites.get(e.sprite_index ?? SPRITE_FOR.obj_knight_enemy);
        if (entry0 && entry0.frames.length) {
          const idx0 = Math.abs(Math.floor(e.image_index ?? 0)) % entry0.frames.length;
          const t = k.chargeuptimer ?? 0;

        for (let back = 12; back >= 1; back--) {
          const bf = t - back;
          if (bf <= 10 || bf % 4 !== 0) continue;
          const dir = frandCanvas(bf, 71) * Math.PI * 2;
          const dist = back * 4;
          const alpha = Math.max(0, 0.6 - back * 0.05);
          if (alpha <= 0) continue;

          blit(fogged(entry0.frames[idx0], [255, 255, 255]), entry0.meta.ox, entry0.meta.oy,
            e.x + Math.cos(dir) * dist, e.y + Math.sin(dir) * dist,
            e.image_xscale ?? 1, e.image_yscale ?? 1, 0, alpha);
        }
        }
      }


      const calls = knightDrawCalls(state, e);

      if (!calls.length) {
        const hidden = e.visible === false
          || (k?.chargeupcon ?? 0) >= 2
          || state.entities.some(
            (x) => x.alive && x.type?.name === 'obj_knight_swordtunnelanim',
          );
        if (!hidden) return false;
      }
      for (const d of calls) {
        const entry = sprites.get(d.sprite);
        if (!entry || !entry.frames.length) continue;
        const idx = Math.abs(Math.floor(d.index)) % entry.frames.length;

        const img = d.fog >= 0
          ? fogged(entry.frames[idx], rgbOf(d.fog))
          : entry.frames[idx];

        blit(img, entry.meta.ox, entry.meta.oy, d.x, d.y, d.xs, d.ys, d.ang, d.alpha,
          d.blend === C_WHITE_GM ? null : rgbOf(d.blend));
      }
      return true;
    },
  };


  const C_WHITE_GM = 16777215;

  function rgbOf(c) {
    return [c & 255, (c >> 8) & 255, (c >> 16) & 255];
  }


  function frandCanvas(frame, salt) {
    let t = (frame * 374761393 + salt * 668265263) >>> 0;
    t = Math.imul(t ^ (t >>> 13), 1274126177) >>> 0;
    return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
  }


  let scratchCanvas = null;
  function scratch(w, h) {
    if (!scratchCanvas) scratchCanvas = document.createElement('canvas');
    if (scratchCanvas.width !== w || scratchCanvas.height !== h) {
      scratchCanvas.width = w;
      scratchCanvas.height = h;
    }
    return scratchCanvas;
  }

  function boxRect(state) {
    const gt = state.entities.find((e) => e.alive && e.type.name === 'obj_growtangle');
    if (!gt) return null;
    const w = 75 * gt.image_xscale;
    const h = 75 * gt.image_yscale;
    return { x: gt.x - w / 2, y: gt.y - h / 2, w, h };
  }

  const drawDeps = { sprites, VIEW_W, VIEW_H, scratch, boxRect };



  const hellSurface = (() => {
    const c = document.createElement('canvas');
    c.width = 142;
    c.height = 142;
    return c;
  })();

  function drawHellSurface(state) {
    const px = sprites.get('spr_pxwhite10_center');
    const flow = sprites.get('spr_knight_bullet_flow');
    if (!px || !px.frames.length) return;

    const gt = state.entities.find((x) => x.alive && x.type.name === 'obj_growtangle');
    const pending = state.entities.filter(
      (x) => x.alive && x.type.name === 'obj_roaringknight_splitslash' && !x.slash,
    );
    if (!gt || !pending.length) return;

    const g = hellSurface.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, 142, 142);

    for (const e of pending) {
      const ease = scrEaseOut(clamp01(e.timer / 30), 3);
      const spin = (ease * 15 - 15) * e.flip;
      const size = lerp(4, 0, ease);
      const length = clamp01(e.timer / 30) * 90;

      g.save();
      g.translate(71 + e.xoffset, 71 + e.yoffset);
      g.rotate((-(spin + e.image_angle + e.angleoffset) * Math.PI) / 180);
      g.scale(length, size);
      g.drawImage(tintedPixel, -px.meta.ox, -px.meta.oy);
      g.restore();


      if (flow && flow.frames.length) {
        g.save();
        g.globalCompositeOperation = 'source-atop';
        const f = flow.frames[2 % flow.frames.length];
        g.scale(0.25, 0.25);
        g.drawImage(f, e.timer / 0.25, e.timer / 0.25);
        g.drawImage(f, (-e.timer + 40) / 0.25, (-e.timer + 40) / 0.25);
        g.restore();
      }
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(hellSurface, gt.x - 71, gt.y - 71);
    ctx.restore();
  }



  function drawTelegraph(e, state) {
    const px = sprites.get('spr_pxwhite10_center');
    if (!px || !px.frames.length) return;

    const gt =
      state.entities.find((x) => x.alive && x.type.name === 'obj_knight_split_growtangle') ??
      state.entities.find((x) => x.alive && x.type.name === 'obj_growtangle');
    if (!gt) return;

    const ease = scrEaseOut(clamp01(e.timer / 30), 3);
    const spin = (ease * 15 - 15) * e.flip;
    const size = lerp(4, 0, ease);
    const length = ease * 180;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(gt.x + e.xoffset, gt.y + e.yoffset);
    ctx.rotate((-(spin + e.image_angle + e.angleoffset) * Math.PI) / 180);
    ctx.scale(length, size);

    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    ctx.drawImage(tintedPixel, -px.meta.ox, -px.meta.oy);
    ctx.restore();
  }


  const tintedPixel = (() => {
    const px = sprites.get('spr_pxwhite10_center');
    const c = document.createElement('canvas');
    c.width = px ? px.meta.w : 10;
    c.height = px ? px.meta.h : 10;
    const g = c.getContext('2d');
    if (px && px.frames.length) g.drawImage(px.frames[0], 0, 0);
    else g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#800000';
    g.fillRect(0, 0, c.width, c.height);
    return c;
  })();

  function drawEntity(e, name, simFrame = 0) {
    let sx = e.image_xscale ?? e.xscale ?? 1;
    let sy = e.image_yscale ?? e.yscale ?? 1;
    const ang = e.image_angle ?? 0;
    const alpha = e.image_alpha ?? 1;


    if (name === 'obj_roaringknight_split_bullet') {

      if (e.drawJitterXs !== undefined) {
        sx += e.drawJitterXs;
        sy += e.drawJitterYs;
      } else {
        sx += (frandCanvas(simFrame, e.seq * 2 + 1) - 0.5) * 0.2;
        sy += (frandCanvas(simFrame, e.seq * 2 + 2) - 0.5) * 0.2;
      }
    }

    const entry = sprites.get(e.sprite_index ?? e.sprite ?? SPRITE_FOR[name]);
    if (entry && entry.frames.length) {
      const idx = Math.abs(Math.floor(e.image_index ?? 0)) % entry.frames.length;

      const dx = e.renderX ?? e.x;
      const dy = e.renderY ?? e.y;
      blit(entry.frames[idx], entry.meta.ox, entry.meta.oy, dx, dy, sx, sy, ang, alpha, e.image_blend);
      return true;
    }

    const mask = MASK_FOR[name];
    if (mask && baked[name]) {
      blit(baked[name], mask.originX, mask.originY, e.x, e.y, sx, sy, ang, alpha);
      return true;
    }


    const sm = SPRITE_MASKS[e.sprite_index];
    if (sm) {
      const key = `sprite:${e.sprite_index}`;
      if (!baked[key]) baked[key] = bakeMask(sm, COLORS.fallback);
      blit(baked[key], sm.originX, sm.originY, e.x, e.y, sx, sy, ang, alpha);
      return true;
    }
    return false;
  }



  function drawTail(e, name, state) {
    if (name === 'obj_knight_split_growtangle') {

      if (splitBox) splitBox.draw(ctx, e, state.frame);
      return;
    }

    if (name === 'obj_roaringknight_splitslash' && !e.slash) {
      drawTelegraph(e, state);
      return;
    }

    if (name === 'obj_roaringknight_slash') {

      ctx.save();
      ctx.globalAlpha = Math.min(1, e.width / 24);
      ctx.strokeStyle = COLORS.slash;
      ctx.lineWidth = Math.max(1, e.width / 3);
      ctx.translate(e.x, e.y);
      ctx.rotate((-e.image_angle * Math.PI) / 180);
      ctx.beginPath();
      ctx.moveTo(-320, 0);
      ctx.lineTo(320, 0);
      ctx.stroke();
      ctx.restore();
      return;
    }

    drawEntity(e, name, state.frame ?? 0);
  }



  function drawVanillaEntity(e, name, state) {
    const custom = DRAW_EVENTS[name];
    if (custom && custom(ctx, e, state, drawDeps)) return true;
    drawTail(e, name, state);
    return true;
  }



  let deferred = [];


  const helpers = Object.freeze({
    ctx, sprites, SPRITE_FOR, SPRITE_MASKS, MASK_FOR, bakeMask, baked, COLORS,
    VIEW_W, VIEW_H,
    blit, tinted, fogged, rgbOf, C_WHITE_GM, frandCanvas,
    scratch, boxRect, deps: drawDeps,
    knightDrawCalls, roaringOwnsIt, roaringCover, drawRoaringCover, resetScreenCut,
    splitBox, tintedPixel, drawTelegraph, drawHellSurface,
    vanilla: (name) => DRAW_EVENTS[name] ?? null,
    drawVanilla: (e, state) => drawVanillaEntity(e, e.type.name, state),
    drawSelf: (e, state) => drawEntity(e, e.type.name, state.frame ?? 0),
    drawTail: (e, state) => drawTail(e, e.type.name, state),
    defer: (fn) => { deferred.push(fn); },
  });

  function draw(state) {
    deferred = [];

    roaringCover.active = false;
    {
      const roaringNow = state.entities.some(
        (e) => e.alive && e.type.name === 'obj_knight_roaring2',
      );
      if (roaringWasAlive && !roaringNow) resetScreenCut();
      roaringWasAlive = roaringNow;
    }
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);


    drawSnowBackdrop(ctx, CAM_X, (state.vistaFsBase ?? 0) + 0.1 * (state.frame ?? 0), sprites);


    drawBackground(ctx, state, sprites);

    ctx.save();


    ctx.translate(-state.view.x, -state.view.y);


    const ordered = state.entities
      .filter((e) => e.alive && e !== state.soul && e.visible !== false)
      .sort((a, b) => (b.depth ?? 0) - (a.depth ?? 0) || a.seq - b.seq);

    for (const e of ordered) {
      const name = e.type.name;


      const override = overrideFor(name);
      if (override) {
        if (override(ctx, e, state, helpers)) continue;
        drawTail(e, name, state);
        continue;
      }

      drawVanillaEntity(e, name, state);
    }


    for (const fn of deferred) fn();
    deferred = [];


    if (overrideFor('obj_roaringknight_boxsplitter_attack')?.ownsHellSurface !== true) {
      drawHellSurface(state);
    }


    const soul = state.soul;
    const drawSoul = () => {
      if (!soul || !soul.alive) return;
      const iFrames = state.invTimer > 0;

      const hidden = state.boardVisible === false
        || (iFrames && Math.floor(state.frame / 2) % 2 === 0);
      if (hidden) return;
      const entry = sprites.get('spr_dodgeheart');
      if (entry && entry.frames.length) {
        ctx.save();
        if (iFrames) ctx.globalAlpha = 0.45;
        blit(entry.frames[0], entry.meta.ox, entry.meta.oy, soul.x, soul.y, 1, 1, 0, 1);
        ctx.restore();
      } else {
        blit(iFrames ? baked.heartHurt : baked.obj_heart,
          HEART_MASK.originX, HEART_MASK.originY, soul.x, soul.y, 1, 1, 0, 1);
      }
    };
    drawSoul();

    drawGraze(ctx, state, sprites);

    ctx.restore();


    drawTensionBar(ctx, state, sprites);

    drawAttackVfx(ctx, state, sprites);
    drawRudeBuster(ctx, state, sprites);
    drawDmgNumbers(ctx, state, sprites);

    drawDialogue(ctx, state, sprites);
    drawMenu(ctx, state, sprites);

    drawHealWriters(ctx, state, sprites);


    const rh = state.returnHeart;
    if (rh) {
      const hs = sprites.get('spr_dodgeheart');
      if (hs?.frames?.length) {
        blit(hs.frames[0], hs.meta.ox, hs.meta.oy, rh.x, rh.y, 1, 1, 0, 1);
      }
    }

    const hb = state.heartBurst;
    if (hb) {
      const hs = sprites.get('spr_dodgeheart');
      if (hs?.frames?.length) {
        const b = hb.burst;
        const rings = [
          [0.25 + b, 0.25 + b / 2, 0.8 - b / 6],
          [0.25 + b / 1.5, 0.25 + b / 3, 1 - b / 6],
          [0.2 + b / 2.5, 0.2 + b / 5, 1.2 - b / 6],
        ];
        for (const [sx, sy, a] of rings) {
          if (a <= 0) continue;
          blit(hs.frames[0], hs.meta.ox, hs.meta.oy, hb.x + 9, hb.y + 9,
            sx, sy, 0, Math.min(1, a));
        }
      }
    }

    drawFightBar(ctx, state.fightBar, sprites, undefined, undefined, state);


    if (roaringCover.active) {
      drawRoaringCover(ctx, state, sprites);
      if (state.soul && state.soul.alive) {
        const entry = sprites.get('spr_dodgeheart');
        if (entry && entry.frames.length) {
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.drawImage(entry.frames[0],
            state.soul.x - state.view.x - entry.meta.ox,
            state.soul.y - state.view.y - entry.meta.oy);
          ctx.restore();
        }
      }
    }


    const ghosts = state.entities.filter(
      (x) => x.alive && x.type.name === 'obj_afterimage_screen',
    );
    if (ghosts.length) {

      const chained = ghosts.filter((g) => g.draw_end);

      const blit = (gst, src) => {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = Math.max(0, Math.min(1, gst.alpha));

        const sx = (gst.x - state.view.x) - gst.anchor_x * gst.xscale;
        const sy = (gst.y - state.view.y) - gst.anchor_y * gst.yscale;
        ctx.drawImage(src, sx, sy, VIEW_W * gst.xscale, VIEW_H * gst.yscale);
        ctx.restore();
      };

      if (chained.length) {

        ghostScratch = getScratch(ghostScratch, VIEW_W, VIEW_H);
        const gg = ghostScratch.getContext('2d');
        gg.setTransform(1, 0, 0, 1, 0, 0);
        gg.clearRect(0, 0, VIEW_W, VIEW_H);
        gg.drawImage(ctx.canvas, 0, 0);
        for (const gst of chained) {
          if (gst.alpha <= 0) continue;
          blit(gst, ghostScratch);
        }
      }

      const heartEntry = sprites.get('spr_dodgeheart');
      if (heartEntry && state.soul?.alive) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(heartEntry.frames[0],
          state.soul.x - state.view.x - heartEntry.meta.ox,
          state.soul.y - state.view.y - heartEntry.meta.oy);
        ctx.restore();
      }
    }


    if (state.endFade) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = Math.min(1, state.endFade);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.restore();
    }
  }


  const spriteFrames = {};
  const spriteRate = {};
  for (const [name, entry] of sprites) {
    spriteFrames[name] = entry.frames.length;
    const m = entry.meta;
    spriteRate[name] =
      m.playbacktype === 'FramesPerSecond' ? (m.playback ?? 30) / 30 : (m.playback ?? 1);
  }


  return {
    draw, ctx, sprites, VIEW_W, VIEW_H,
    spriteCount: sprites.size, spriteFrames, spriteRate,
  };
}
