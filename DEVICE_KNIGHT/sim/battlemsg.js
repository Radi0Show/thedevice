




export const BATTLE_MSG = {
  1: {
    0: '* You felt lightheaded.&* You saw silver stars...',
    1: '* You felt something hovering close behind your head...',
    2: '* Suddenly, the north wind blew fiercely.',
    3: '* Your vision narrows.',
    4: '* Your chest feels tight.',
  },
  2: {
    0: '* You felt lightheaded.&* You saw golden stars...',
    1: '* Suddenly, the north and east winds blew fiercely.',
    2: '* Your vision narrows.&* ... Your head is spinning.',
    3: '* You feel surrounded.',
    4: '* You felt your chest twisting.',
  },
  3: {
    0: '* You felt lightheaded.&* You felt a migraine coming on...',
    1: '* Suddenly, a tempest.',
    2: '* Your vision narrows.&* ... The world revolves around you.',
    3: '* You feel cornered.',
    4: '* Your heartbeat becomes twisted.',
  },
};



export function phase4Msg(phase4turn, susieHp, haveusedroaring, progamer = false) {
  if (phase4turn === 3 && progamer) {
    return '* Kris coughed.&* The enemy slowly tilted its head...';
  }
  if (phase4turn === 2) return "* The Knight's hands glow a strange color...";
  if (phase4turn > 2) return '* The enemy suddenly let down its guard!';
  if (phase4turn === 0) return '* Your heartbeat becomes twisted.';
  if (phase4turn === 1) {
    return susieHp > 0
      ? '* Susie grew pale.'
      : '* Susie struggled to give some kind of warning.';
  }
  return null;
}



export function downMsg(partyHp, seen) {
  let kris = '';
  let susie = '';
  let ralsei = '';
  let count = 0;
  let msg = null;

  if (!seen.kris && partyHp[0] < 1) {
    kris = '* Kris kneeled in silence.&';
    count++;
    seen.kris = true;
    msg = kris;
  }
  if (!seen.susie && partyHp[1] < 1) {
    susie = '* Susie was hurt and beaten.&';
    count++;
    seen.susie = true;
    msg = susie;
  }
  if (!seen.ralsei && partyHp[2] < 1) {
    ralsei = '* Ralsei became a pile of fluff.&';
    count++;
    seen.ralsei = true;
    msg = ralsei;
  }

  if (count === 2) msg = kris + susie + ralsei;
  return msg;
}


export const OPENING_MSG = '* The Roaring Knight appeared.';



export function battleMsgFor(phase, phaseturn, opts = {}) {
  const { phase4turn, partyHp, haveusedroaring, progamer, downSeen } = opts;


  if (partyHp && downSeen) {
    const down = downMsg(partyHp, downSeen);
    if (down) return down;
  }

  if (phase4turn !== undefined) {
    return phase4Msg(phase4turn, partyHp?.[1] ?? 1, haveusedroaring, progamer);
  }
  return BATTLE_MSG[phase]?.[phaseturn] ?? null;
}
