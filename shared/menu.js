// DEVICE_MENU — the file select, built to live inside a television.
//
// This used to be markup in the front page. It moved here because the menu
// is not a page any more: it is what the console BOOTS, and it is drawn in
// the screen of room_board_sword_intro with Kris standing in front of it.
// Everything is authored at the television's own size — 384x288, the hole
// in spr_gameshow_swordroutebg — and the host scales it to wherever that
// hole has landed on screen.
//
// It stays DOM rather than being painted into the canvas so that it is
// still real text: focusable, findable, readable by a screen reader. The
// canvas behind it is the room; this is the picture.

export const SCREEN_W = 384;
export const SCREEN_H = 288;

const CSS = `
.dev-screen {
  width: ${SCREEN_W}px; height: ${SCREEN_H}px;
  transform-origin: top left;
  background: #000;
  color: #fff;
  font-family: 'Courier New', Courier, monospace;
  font-weight: bold; text-transform: uppercase;
  -webkit-font-smoothing: none;
  overflow: hidden; position: relative;
  padding: 12px 14px;
  cursor: default;
}
.dev-screen .title { font-size: 12px; letter-spacing: .06em; margin-bottom: 12px; }
.dev-screen .blink { animation: devblink 1.05s steps(1) infinite; }
@keyframes devblink { 50% { opacity: 0; } }

.dev-screen .slot-real {
  border: 2px solid #fff; padding: 7px 8px 6px; margin-bottom: 12px; position: relative;
}
.dev-screen .slot-real.sel { border-color: #ffff00; }
.dev-screen .slot-real .slotname { font-size: 16px; }
.dev-screen .slot-real.sel .slotname { color: #ffff00; }
.dev-screen .slot-real .slotmeta { font-size: 8px; color: #5a5a5a; margin-top: 3px; }
.dev-screen .slot-real .slotgo { font-size: 8px; margin-top: 5px; color: #ffff00; display: none; }
.dev-screen .slot-real.sel .slotgo { display: block; }

/* the temmie annotation. exactly one. do not add more. */
.dev-screen .scribble {
  position: absolute; right: -2px; top: -15px;
  font-family: 'Comic Sans MS', 'Comic Sans', cursive;
  font-weight: bold; text-transform: none; font-size: 9px; color: #fff;
  transform: rotate(-7deg);
}
.dev-screen .scribble::after {
  content: "↓"; display: block; text-align: center; transform: rotate(9deg); font-size: 10px;
}

.dev-screen .slot-empty {
  display: block; width: 100%; text-align: left;
  font-size: 11px; color: #2e2e2e; padding: 4px 2px;
  background: none; border: none; font-family: inherit; font-weight: bold;
  text-transform: uppercase; cursor: pointer;
}
.dev-screen .slot-empty.sel { color: #ffff00; }

.dev-screen .info { margin-top: 10px; font-size: 8px; color: #5a5a5a; }
.dev-screen .nav { margin-top: 8px; font-size: 8px; display: flex; gap: 10px; flex-wrap: wrap; }
.dev-screen .nav a, .dev-screen .nav button {
  color: #5a5a5a; text-decoration: none; background: none; border: none;
  font-family: inherit; font-weight: bold; text-transform: uppercase;
  font-size: 8px; cursor: pointer; padding: 0;
}
.dev-screen .nav a:hover, .dev-screen .nav a:focus-visible,
.dev-screen .nav button:hover, .dev-screen .nav button:focus-visible { color: #ffff00; outline: none; }

.dev-screen .legal {
  position: absolute; left: 0; right: 0; bottom: 6px;
  text-align: center; font-size: 7px; color: #2e2e2e; line-height: 1.7;
}
.dev-screen .legal a { color: #2e2e2e; text-decoration: none; }
.dev-screen .legal .dot { color: #0a0a0a; }

/* the failure view, in the same screen */
.dev-screen .fail {
  position: absolute; inset: 0; background: #000; padding: 60px 20px;
  display: none; font-size: 11px; line-height: 1.9;
}
.dev-screen .fail.show { display: block; }
.dev-screen .fail .back {
  margin-top: 24px; color: #5a5a5a; background: none; border: none;
  font-family: inherit; font-weight: bold; text-transform: uppercase;
  font-size: 10px; cursor: pointer; padding: 0;
}
.dev-screen .fail .back:hover { color: #ffff00; }
.dev-screen .fail .support { margin-top: 14px; font-size: 9px; color: #5a5a5a; }
.dev-screen .fail .support a { color: #5a5a5a; }
`;

const MARKUP = `
<div class="title">* SELECT A DEVICE.<span class="blink">_</span></div>

<div class="slot-real" data-slot="0" tabindex="0" role="button"
     aria-label="Knight — the Roaring Knight, Chapter 3. Press Z to begin.">
  <div class="scribble">this one works!!</div>
  <div class="slotname">KNIGHT</div>
  <div class="slotmeta">THE ROARING KNIGHT · CHAPTER 3</div>
  <div class="slotgo">* THE ROARING KNIGHT.</div>
</div>

<button class="slot-empty" data-slot="1" type="button">02&nbsp;&nbsp;J&#9618;&#9618;&#9618;&#9618;</button>
<button class="slot-empty" data-slot="2" type="button">03&nbsp;&nbsp;S&#9618;&#9618;&#9618;&#9618;&#9618;&#9618; &#9618;&#9618;&#9618;</button>
<button class="slot-empty" data-slot="3" type="button">04&nbsp;&nbsp;&#9618;&#9618;&#9618;&#9618;&#9618;&#9618;&#9618;&#9618;</button>

<div class="info">FREE · RUNS IN BROWSER · ARROWS + Z · NO DOWNLOAD</div>

<div class="nav">
  <a data-nav href="DEVICE_INDEX/">DEVICE_INDEX</a>
  <a data-nav href="DEVICE_BOARD/">DEVICE_BOARD</a>
  <a data-nav href="DEVICE_CONTACT/">DEVICE_CONTACT</a>
  <button type="button" data-reconfigure>[ RECONFIGURE ]</button>
</div>

<div class="legal">
  A FAN PROJECT · UNAFFILIATED WITH TOBY FOX<br>
  DELTARUNE © TOBY FOX ·
  <a href="https://deltarune.com" rel="noopener">SUPPORT THE OFFICIAL RELEASE</a>
  <a href="#" class="dot" data-dot aria-label="">.</a>
</div>

<div class="fail" data-fail>
  <div data-failtext></div>
  <div class="support" data-failsupport style="display:none">
    * IF YOU WANT TO SEE IT BUILT — <a href="#" onclick="return false;">[ SUPPORT ]</a>
  </div>
  <button class="back" type="button" data-failback>← DEVICE_MENU</button>
</div>
`;

let styled = false;

/**
 * Put the file select inside `host`.
 *
 * @param {object} opts
 *   base        prefix for the links, since the screen is not at the site root
 *   onLaunch    called with a href instead of navigating, if the host wants
 *               to run its own hand-off
 *   sound       {move, confirm, deny} callbacks; the room owns the audio
 */
export function mountMenu(host, opts = {}) {
  const base = opts.base ?? '';
  const sound = opts.sound ?? {};

  if (!styled) {
    const s = document.createElement('style');
    s.textContent = CSS;
    document.head.append(s);
    styled = true;
  }

  const el = document.createElement('div');
  el.className = 'dev-screen';
  el.innerHTML = MARKUP;
  host.append(el);

  for (const a of el.querySelectorAll('[data-nav]')) a.href = base + a.getAttribute('href');

  const slots = [...el.querySelectorAll('[data-slot]')];
  const fail = el.querySelector('[data-fail]');
  const failText = el.querySelector('[data-failtext]');
  const failSupport = el.querySelector('[data-failsupport]');
  let sel = 0;
  let inFail = false;

  function paint() {
    slots.forEach((s, i) => s.classList.toggle('sel', i === sel));
  }

  function showFail(lines, support) {
    inFail = true;
    fail.classList.add('show');
    failText.textContent = lines;
    failSupport.style.display = support ? 'block' : 'none';
  }
  function hideFail() {
    inFail = false;
    fail.classList.remove('show');
  }

  function activate(i) {
    if (i === 0) {
      sound.confirm?.();
      const href = `${base}DEVICE_KNIGHT/`;
      if (opts.onLaunch) opts.onLaunch(href); else location.href = href;
      return;
    }
    sound.deny?.();
    showFail('* THIS DEVICE HAS NOT BEEN BUILT.\n* COME BACK WHEN YOU ARE STRONGER.', true);
  }

  const onKey = (e) => {
    const k = e.key.toLowerCase();
    if (inFail) {
      if (k === 'x' || k === 'escape' || k === 'z' || k === 'enter') { e.preventDefault(); hideFail(); }
      return;
    }
    if (k === 'arrowup' || k === 'w') { e.preventDefault(); sel = (sel + slots.length - 1) % slots.length; paint(); sound.move?.(); }
    if (k === 'arrowdown' || k === 's') { e.preventDefault(); sel = (sel + 1) % slots.length; paint(); sound.move?.(); }
    if (k === 'z' || k === 'enter') { e.preventDefault(); activate(sel); }
  };
  window.addEventListener('keydown', onKey);

  slots.forEach((s, i) => {
    s.addEventListener('click', () => { sel = i; paint(); activate(i); });
    s.addEventListener('mouseenter', () => { sel = i; paint(); });
  });
  el.querySelector('[data-failback]').addEventListener('click', hideFail);
  el.querySelector('[data-reconfigure]').addEventListener('click', () => {
    // The interrogation lives at the site root; going back to it re-asks.
    location.href = `${base}?reconfigure=1`;
  });
  el.querySelector('[data-dot]').addEventListener('click', (e) => {
    e.preventDefault();
    showFail('* THERE IS NOTHING HERE.\n* . . . YET.', false);
  });

  paint();

  return {
    el,
    destroy() {
      window.removeEventListener('keydown', onKey);
      el.remove();
    },
  };
}
