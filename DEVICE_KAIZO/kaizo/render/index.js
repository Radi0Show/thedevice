

import {
  drawObjFallingsword, drawObjKnightSwordfall, drawObjSwordTunnelSword,
  drawObjKnightSwordtunnelanim,
} from './draw/swords.js';
import {
  drawObjKnightPointingCone, drawObjKnightPointingStar, drawObjKnightPointingStarchild,
} from './draw/pointing.js';
import { drawObjKnightRoaring2, drawObjRoaringknightSlash } from './draw/roaring.js';
import {
  drawObjRoaringknightQuickslash, drawObjRoaringknightQuickslashAttack,
  drawObjRoaringknightQuickslashBig, drawObjKnightRotatingSlash,
} from './draw/quickslash.js';
import {
  drawObjRoaringknightBoxsplitterAttack, drawObjRoaringknightSplitslash,
  drawObjRoaringknightSplitBullet, drawObjKnightSplitGrowtangleEffect,
} from './draw/split.js';
import {
  drawObjKnightStream, drawObjKnightTunnelSlasher, drawObjKnightTunnelSlasher2Revised,
  drawObjKnightDiamondswordbulletExt,
} from './draw/stream.js';
import {
  drawObjTrackingSwordSlash, drawObjTrackingSwordSlashExtraGraze, drawObjKnightEnemy,
} from './draw/tracking.js';
import { drawObjSpellSnowgrave, drawObjSpellSnowgraveSnowflake } from './draw/snowgrave.js';
import { drawObjKnightLightorb } from './draw/lightorb.js';
import { drawActorParty } from './draw/party.js';

export const KAIZO_DRAW_OVERRIDES = Object.freeze({

  obj_fallingsword: drawObjFallingsword,
  obj_knight_swordfall: drawObjKnightSwordfall,
  obj_sword_tunnel_sword: drawObjSwordTunnelSword,
  obj_knight_swordtunnelanim: drawObjKnightSwordtunnelanim,

  obj_knight_pointing_cone: drawObjKnightPointingCone,
  obj_knight_pointing_star: drawObjKnightPointingStar,
  obj_knight_pointing_starchild: drawObjKnightPointingStarchild,

  obj_knight_roaring2: drawObjKnightRoaring2,
  obj_roaringknight_slash: drawObjRoaringknightSlash,

  obj_roaringknight_quickslash: drawObjRoaringknightQuickslash,
  obj_roaringknight_quickslash_attack: drawObjRoaringknightQuickslashAttack,

  obj_roaringknight_quickslash_big: drawObjRoaringknightQuickslashBig,
  obj_knight_rotating_slash: drawObjKnightRotatingSlash,

  obj_roaringknight_boxsplitter_attack: drawObjRoaringknightBoxsplitterAttack,
  obj_roaringknight_splitslash: drawObjRoaringknightSplitslash,
  obj_roaringknight_split_bullet: drawObjRoaringknightSplitBullet,
  obj_knight_split_growtangle_effect: drawObjKnightSplitGrowtangleEffect,

  obj_knight_stream: drawObjKnightStream,
  obj_knight_tunnel_slasher: drawObjKnightTunnelSlasher,
  obj_knight_tunnel_slasher_2_revised: drawObjKnightTunnelSlasher2Revised,

  obj_knight_diamondswordbullet_ext: drawObjKnightDiamondswordbulletExt,

  obj_tracking_sword_slash: drawObjTrackingSwordSlash,
  obj_tracking_sword_slash_extra_graze: drawObjTrackingSwordSlashExtraGraze,
  obj_knight_enemy: drawObjKnightEnemy,

  obj_spell_snowgrave: drawObjSpellSnowgrave,
  obj_spell_snowgrave_snowflake: drawObjSpellSnowgraveSnowflake,

  obj_knight_lightorb: drawObjKnightLightorb,

  actor_party: drawActorParty,
});

export const KAIZO_DRAW_OBJECTS = Object.freeze(Object.keys(KAIZO_DRAW_OVERRIDES));

export { drawKaizoEpilogue, objShakeOffset, epilogueRalseiSprite } from './draw/ending.js';
