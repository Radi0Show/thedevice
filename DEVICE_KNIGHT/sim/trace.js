


export const BASE_FIELDS = ['frame', 'soul_x', 'soul_y', 'hp', 'inv_timer', 'phase'];



export const WIDE_FIELDS = [
  'frame',
  'soul_x', 'soul_y', 'inv_timer',
  'hp0', 'hp1', 'hp2',
  'tension',
  'knight_hp', 'knight_dr',
  'phase', 'turn',
  'menu', 'bar', 'balloon',
  'bullets',
];



export function real(v) {

  const s = v.toFixed(20);
  const dot = s.indexOf('.');
  const keep = s.slice(0, dot + 11);
  const rest = s.slice(dot + 11);

  if (rest === '' || rest[0] < '5') return keep;

  const isTie = rest[0] === '5' && /^0*$/.test(rest.slice(1));
  const lastDigit = keep.charCodeAt(keep.length - 1) - 48;
  if (isTie && lastDigit % 2 === 0) return keep;


  const neg = keep[0] === '-';
  const digits = (neg ? keep.slice(1) : keep).replace('.', '').split('');
  let i = digits.length - 1;
  for (; i >= 0; i--) {
    if (digits[i] === '9') {
      digits[i] = '0';
    } else {
      digits[i] = String(Number(digits[i]) + 1);
      break;
    }
  }
  if (i < 0) digits.unshift('1');
  const intLen = digits.length - 10;
  return (neg ? '-' : '') + digits.slice(0, intLen).join('') + '.' + digits.slice(intLen).join('');
}


export function int(v) {
  return String(v);
}

export function traceHeader(state) {
  if (state.traceWide) {
    const cols = [...WIDE_FIELDS];
    for (let i = 0; i < state.traceBulletSlots; i++) {

      cols.push(`b${i}_x`, `b${i}_y`, `b${i}_a`, `b${i}_xs`, `b${i}_ys`);
    }
    return cols.join(',');
  }
  const cols = [...BASE_FIELDS];
  for (let i = 0; i < state.traceBulletSlots; i++) {
    cols.push(`b${i}_x`, `b${i}_y`);
  }

  if (state.traceExtraHeader) cols.push(...state.traceExtraHeader);
  return cols.join(',');
}



export function traceRow(state) {
  const soul = state.soul;
  if (state.traceWide) return wideRow(state);

  const cells = [
    int(state.frame),
    real(soul ? soul.x : 0),
    real(soul ? soul.y : 0),
    int(state.hp),
    int(state.invTimer),
    state.phase,
  ];

  const bullets = state.entities
    .filter((e) => e.alive && e.isBullet)
    .sort((a, b) => a.seq - b.seq);

  for (let i = 0; i < state.traceBulletSlots; i++) {
    const b = bullets[i];
    cells.push(b ? real(b.x) : '', b ? real(b.y) : '');
  }

  if (state.traceExtra) cells.push(...state.traceExtra(state));

  return cells.join(',');
}



function wideRow(state) {
  const soul = state.soul;
  const bullets = state.entities
    .filter((e) => e.alive && e.isBullet && e.type.name !== 'obj_heart')
    .sort((a, b) => a.seq - b.seq);

  const cells = [
    int(state.frame),
    real(soul ? soul.x : 0),
    real(soul ? soul.y : 0),
    real(state.invTimer ?? 0),
    int(state.partyHp?.[0] ?? 0),
    int(state.partyHp?.[1] ?? 0),
    int(state.partyHp?.[2] ?? 0),
    real(state.tension ?? 0),
    int(state.knight?.hp ?? 0),
    real(state.knight?.damagereduction ?? 0),

    int(state.phaseNum ?? 0),

    int(state.phaseturn ?? 0),

    state.menu?.open
      ? ({ magic: 'act', actpick: 'act', actgrid: '9' }[state.menu.submenu]
        ?? state.menu.submenu ?? 'buttons')
      : '-',
    state.fightBar ? int(state.fightBar.boltx) : '-',
    int(state.dialogue?.balloonturn ?? 0),
    int(bullets.length),
  ];

  for (let i = 0; i < state.traceBulletSlots; i++) {
    const b = bullets[i];
    if (!b) {
      cells.push('', '', '', '', '');
      continue;
    }
    cells.push(real(b.x), real(b.y), real(b.image_angle ?? 0),
      real(b.image_xscale ?? 1), real(b.image_yscale ?? 1));
  }
  return cells.join(',');
}
