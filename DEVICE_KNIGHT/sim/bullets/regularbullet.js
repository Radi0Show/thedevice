


import { destroy } from '../entity.js';
import { scrDamageAll, scrDamageSingle } from '../damage.js';

export function scrBulletInit(e) {
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
}



export function scrBulletInherit(self, target) {
  if (!target) return;
  if (self.damage !== -1) target.damage = self.damage;
  if (self.grazepoints !== -1) target.grazepoints = self.grazepoints;
  if (self.timepoints !== -1) target.timepoints = self.timepoints;
  if (self.inv !== -1) target.inv = self.inv;
  if (self.target !== -1) target.target = self.target;
  if (self.grazed !== -1) target.grazed = 0;
  if (self.grazetimer !== -1) target.grazetimer = 0;
  target.element = self.element;
}

export function regularbulletCreate(e, state) {
  scrBulletInit(e);
  e.spin = 0;
  e.spinspeed = 0;
  e.image_alpha = 1;
  if (!state.soul || !state.soul.alive) {
    destroy(e, state);
  }
  e.wall_destroy = 1;
  e.bottomfade = 0;

  e.isBullet = true;
  e.builtinMotion = true;
  e.speed = 0;
  e.direction = 0;
  e.image_angle = 0;
}

export function regularbulletStep(e, state) {

  if (e.wall_destroy === 1) {
    if (e.x < state.view.x - 80) destroy(e, state);
    if (e.x > state.view.x + 760) destroy(e, state);
    if (e.y < state.view.y - 80) destroy(e, state);
    if (e.y > state.view.y + 580) destroy(e, state);
  }
  if (e.updateimageangle === 1) {
    e.image_angle = e.direction;
  }
  if (e.spin === 1) {
    e.image_angle += e.spinspeed;
  }
  if (e.bottomfade !== 0) {
    if (e.y > state.view.y + e.bottomfade) {
      e.image_alpha *= 0.8;
    }
  }
}


export function collidebulletOther15(e, state) {

  if (!state.damageEnabled) return;

  if (e.active === 1 || e.active === true) {

    if (state.invTimer < 0) {
      const opts = { flurrySoftened: state.flurrySoftened === true };
      if (e.target === 3) {
        scrDamageAll(state, e.damage ?? 1, opts);
      } else {
        scrDamageSingle(state, e.damage ?? 1, e.target ?? 0, opts);
      }
    }
    if (e.destroyonhit === 1 || e.destroyonhit === true) {
      destroy(e, state);
    }
  }
}
