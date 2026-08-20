// THE BOARD'S CRT — obj_board_controller's Draw, running the game's own
// shd_crt (extracted verbatim to assets/crt/shd_crt.frag) over the screen
// region (128,32) 384x288: the RGB triad filter, chromatic aberration,
// vignette, and the glitch shake when a sword-carrying Kris takes a hit
// (crt_glitch = 6, strength 10, decaying 1 a frame).
//
// The pipeline mirrors the game's: the region is copied off the composed
// frame (surface_copy_part), stretched by the glitch jitter
// (draw_surface_stretched with min(0,dx) offsets), run through the shader,
// and drawn back in place.

const REGION = { x: 128, y: 32, w: 384, h: 288 };

const VERT = `
attribute vec2 a_pos;
attribute vec2 a_uv;
varying vec2 v_vTexcoord;
varying vec4 v_vColour;
void main() {
  v_vTexcoord = a_uv;
  v_vColour = vec4(1.0);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

export async function createCRT(base) {
  const frag = await fetch(`${base}crt/shd_crt.frag`).then((r) => r.text());

  const glCanvas = document.createElement('canvas');
  glCanvas.width = REGION.w;
  glCanvas.height = REGION.h;
  const gl = glCanvas.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true });
  if (!gl) return null;                       // no WebGL: the filter stays off

  // The staging canvas receives the region (plus the glitch stretch)
  // before upload — the equivalent of the game's screen_surface.
  const stage = document.createElement('canvas');
  stage.width = REGION.w;
  stage.height = REGION.h;
  const sg = stage.getContext('2d');
  sg.imageSmoothingEnabled = false;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(sh));
    }
    return sh;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog));
  }
  gl.useProgram(prog);

  // One fullscreen quad; v flipped so the texture reads top-down.
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 0, 1, 1, -1, 1, 1, -1, 1, 0, 0,
    -1, 1, 0, 0, 1, -1, 1, 1, 1, 1, 1, 0,
  ]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'a_pos');
  const aUv = gl.getAttribLocation(prog, 'a_uv');
  gl.enableVertexAttribArray(aPos);
  gl.enableVertexAttribArray(aUv);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
  gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const U = (n) => gl.getUniformLocation(prog, n);
  const uTexel = U('texel');
  const uVigScale = U('vignette_scale');
  const uVigInt = U('vignette_intensity');
  const uChrom = U('chromatic_scale');
  const uFilter = U('filter_amount');
  const uTime = U('time');

  // The controller's live state.
  const state = {
    enabled: true,
    timer: 0,                  // crttimer = (t + 0.5) % 3, per frame
    glitch: 0,                 // crt_glitch, decays 1 a frame
    glitchStrength: 10,        // crt_glitchstrength
    chromStrength: 0.5,        // chromStrength
  };

  /** Apply the filter in place over the main 2D canvas. */
  function apply(g2d, srcCanvas) {
    if (!state.enabled) return;
    state.timer = (state.timer + 0.5) % 3;

    // The Draw's uniform derivations, verbatim.
    const gl_ = state.glitch;
    const vig = gl_ ? 0.2 + Math.random() * Math.min(Math.max(gl_ / 200, 0), 0.1) : 0.2;
    const vigInt = Math.pow(1.5, 1.5 - vig) * 18;
    let chrom = gl_
      ? (Math.floor(Math.random() * 9) - 4) * Math.min(Math.max(gl_ / 5, 1), 5)
      : state.chromStrength;
    if (chrom === 0) chrom = 1;
    const filter = 0.1 + Math.min(gl_ / 100, 0.1);
    const dx = gl_ ? (Math.random() * 2 - 1) * Math.min(Math.max(gl_ / state.glitchStrength, 0), 3) : 0;
    const dy = gl_ ? (Math.random() * 2 - 1) * Math.min(Math.max(gl_ / state.glitchStrength, 0), 3) : 0;

    // surface_copy_part + draw_surface_stretched(min(0,dx), min(0,dy),
    // w+|dx|, h+|dy|).
    sg.clearRect(0, 0, REGION.w, REGION.h);
    sg.drawImage(srcCanvas, REGION.x, REGION.y, REGION.w, REGION.h,
      Math.min(0, dx), Math.min(0, dy), REGION.w + Math.abs(dx), REGION.h + Math.abs(dy));

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, stage);
    gl.uniform2f(uTexel, 1 / REGION.w, 1 / REGION.h);
    gl.uniform1f(uVigScale, vig);
    gl.uniform1f(uVigInt, vigInt);
    gl.uniform1f(uChrom, chrom);
    gl.uniform1f(uFilter, filter);
    gl.uniform1f(uTime, state.timer);
    gl.viewport(0, 0, REGION.w, REGION.h);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    g2d.drawImage(glCanvas, REGION.x, REGION.y);

    if (state.glitch > 0) state.glitch -= 1;
  }

  return { apply, state };
}
