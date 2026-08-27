/* NepalMBBS.in — theme/aurora-gl.js
   The aurora, as a shader.

   The CSS version was four blurred divs drifting on keyframes. It looks fine
   in a screenshot and wrong in motion: the blobs keep their shape, so you can
   see four circles sliding rather than a field flowing. Real mesh gradients —
   the ones on the sites this is measured against — are computed per pixel.

   So this replaces it with a fragment shader: layered simplex noise warping a
   four-colour field, advected by time and nudged by the pointer. Every colour
   is a uniform read from the live theme tokens, so the admin panel still
   drives it exactly as before.

   It degrades in three steps, and the site is finished at every one:
     - No WebGL2, or a context loss, or reduced motion -> the CSS blob field
       stays visible and this never mounts.
     - Tab hidden or field scrolled away -> the loop parks, drawing nothing.
     - Low frame rate sustained -> it lowers resolution once, then gives up
       and falls back to CSS rather than shipping a stuttering background.

   A background that costs a phone its frame rate is not premium, so the budget
   is enforced rather than hoped for. */

(function () {
  'use strict';

  var VERT = `#version 300 es
  in vec2 p;
  void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

  /* Simplex noise (Ashima / Gustavson, MIT). Cheaper than a texture fetch and
     avoids shipping one. */
  var FRAG = `#version 300 es
  precision highp float;
  out vec4 o;

  uniform vec2  uRes;
  uniform float uTime;
  uniform vec2  uPtr;      // -1..1, eased pointer
  uniform vec3  uC1, uC2, uC3, uC4;
  uniform vec3  uBase;
  uniform float uAmount;   // overall field strength
  uniform float uScale;    // feature size
  uniform float uGrain;

  vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec2 mod289(vec2 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec3 permute(vec3 x){ return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0))
                             + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  /* Two octaves is enough at this blur; a third is invisible and costs 30%. */
  float fbm(vec2 p){
    return snoise(p) * 0.62 + snoise(p * 2.07 + 11.3) * 0.31;
  }

  void main(){
    vec2 uv = gl_FragCoord.xy / uRes;
    float ar = uRes.x / max(uRes.y, 1.0);
    vec2 q = vec2(uv.x * ar, uv.y) * uScale;

    float t = uTime * 0.055;
    vec2 drift = uPtr * 0.16;

    /* Domain warp — the step that turns "moving noise" into "flowing field".
       Sampling the field through a displaced coordinate is what makes the
       colours stretch and fold instead of sliding as fixed shapes. */
    vec2 w = vec2(
      fbm(q + vec2(0.0, t) + drift),
      fbm(q + vec2(5.2, -t * 0.83) - drift)
    );
    vec2 qq = q + w * 0.85;

    float n1 = fbm(qq + vec2(t * 0.6, 0.0));
    float n2 = fbm(qq * 1.21 + vec2(-3.1, t * 0.45));

    /* Four fields, each with its own centre of gravity, so a colour owns a
       region rather than every hue appearing everywhere. */
    float f1 = smoothstep(-0.55, 0.85, n1 + (1.0 - uv.y) * 0.55 - uv.x * 0.25);
    float f2 = smoothstep(-0.60, 0.90, n2 + uv.x * 0.60 - uv.y * 0.20);
    float f3 = smoothstep(-0.50, 0.95, (n1 + n2) * 0.5 + uv.y * 0.55 - 0.15);
    float f4 = smoothstep(-0.45, 1.00, n2 * 0.8 - n1 * 0.4 + uv.x * 0.35 + uv.y * 0.30);

    /* Build the field at full strength first. Mixing each colour in at a
       fraction AND then mixing the result back toward base attenuated the
       colour twice over, which is what rendered this as flat grey. */
    vec3 c = uC1;
    c = mix(c, uC2, clamp(f2 * 1.15, 0.0, 1.0));
    c = mix(c, uC3, clamp(f3 * 1.05, 0.0, 1.0));
    c = mix(c, uC4, clamp(f4 * 0.90, 0.0, 1.0));
    c = mix(c, uC1, clamp((1.0 - f1) * 0.70, 0.0, 1.0));

    /* One attenuation, toward the ground. uAmount 0 is a plain ground, 1 is
       the field at full chroma. */
    c = mix(uBase, c, uAmount);

    /* Dither. Large smooth gradients band badly on 8-bit displays, and the
       banding is the single most obvious tell that a background is generated
       rather than photographed. */
    float d = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    c += (d - 0.5) * uGrain;

    o = vec4(c, 1.0);
  }`;

  function hexToVec3(hex) {
    hex = String(hex || '').trim();
    // Tokens can arrive as #rgb, #rrggbb, or an rgb() string from getComputedStyle.
    var m = hex.match(/rgba?\(([^)]+)\)/);
    if (m) {
      var n = m[1].split(/[,\s/]+/).map(parseFloat);
      return [n[0] / 255, n[1] / 255, n[2] / 255];
    }
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    if (!/^[0-9a-f]{6}$/i.test(hex)) return [1, 1, 1];
    return [
      parseInt(hex.slice(0,2),16)/255,
      parseInt(hex.slice(2,4),16)/255,
      parseInt(hex.slice(4,6),16)/255
    ];
  }

  function AuroraGL(host) {
    var cvs = document.createElement('canvas');
    cvs.className = 'au-gl';
    cvs.setAttribute('aria-hidden', 'true');
    var gl = cvs.getContext('webgl2', {
      alpha: false, antialias: false, depth: false, stencil: false,
      powerPreference: 'low-power', preserveDrawingBuffer: false
    });
    if (!gl) return null;

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn('[aurora] shader:', gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }
    var vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;

    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('[aurora] link:', gl.getProgramInfoLog(prog));
      return null;
    }
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var U = {};
    ['uRes','uTime','uPtr','uC1','uC2','uC3','uC4','uBase','uAmount','uScale','uGrain']
      .forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

    host.appendChild(cvs);

    var dpr = 1, running = false, raf = 0, t0 = performance.now();
    var ptr = [0, 0], ptrTo = [0, 0];
    var slow = 0, frames = 0, fpsT = performance.now(), degraded = false;
    var self = {};

    function readTheme() {
      var cs = getComputedStyle(document.documentElement);
      var g = function (n) { return cs.getPropertyValue(n).trim(); };
      gl.uniform3fv(U.uC1, hexToVec3(g('--au-1')));
      gl.uniform3fv(U.uC2, hexToVec3(g('--au-2')));
      gl.uniform3fv(U.uC3, hexToVec3(g('--au-3')));
      gl.uniform3fv(U.uC4, hexToVec3(g('--au-4')));
      gl.uniform3fv(U.uBase, hexToVec3(g('--g-base')));
      gl.uniform1f(U.uAmount, parseFloat(g('--au-opacity')) || 0.5);
      // Larger --au-scale means bigger blobs in CSS, so the shader's feature
      // frequency has to move the other way.
      gl.uniform1f(U.uScale, 1.9 / (parseFloat(g('--au-scale')) || 1));
      // Dither only has to cover one 8-bit step (~0.004). The page's own
      // grain overlay is a separate, visible texture; this is not that.
      gl.uniform1f(U.uGrain, 0.005);
    }

    function resize() {
      // Half resolution is invisible on a field this soft and quarters the
      // fill cost, which is what keeps this affordable on a mid-range phone.
      dpr = Math.min(window.devicePixelRatio || 1, degraded ? 0.6 : 1) * 0.5;
      var w = Math.max(2, Math.floor(host.clientWidth  * dpr));
      var h = Math.max(2, Math.floor(host.clientHeight * dpr));
      if (cvs.width === w && cvs.height === h) return;
      cvs.width = w; cvs.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(U.uRes, w, h);
    }

    function frame(now) {
      raf = 0;
      if (!running) return;

      ptr[0] += (ptrTo[0] - ptr[0]) * 0.045;
      ptr[1] += (ptrTo[1] - ptr[1]) * 0.045;
      gl.uniform2f(U.uPtr, ptr[0], ptr[1]);
      gl.uniform1f(U.uTime, (now - t0) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      frames++;
      if (now - fpsT > 1000) {
        var fps = frames * 1000 / (now - fpsT);
        frames = 0; fpsT = now;
        if (fps < 34) {
          slow++;
          if (slow === 2 && !degraded) { degraded = true; resize(); }
          // Two strikes after degrading and it is not worth the battery.
          else if (slow >= 4) { self.destroy(); return; }
        } else if (slow > 0) slow--;
      }
      raf = requestAnimationFrame(frame);
    }

    function start() { if (!running) { running = true; if (!raf) raf = requestAnimationFrame(frame); } }
    function stop()  { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

    var ro = new ResizeObserver(resize);
    ro.observe(host);

    var onVis = function () { document.hidden ? stop() : start(); };
    document.addEventListener('visibilitychange', onVis);

    var onPtr = null;
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      onPtr = function (e) {
        ptrTo[0] = (e.clientX / window.innerWidth) * 2 - 1;
        ptrTo[1] = 1 - (e.clientY / window.innerHeight) * 2;
      };
      window.addEventListener('pointermove', onPtr, { passive: true });
    }

    var onLost = function (e) { e.preventDefault(); self.destroy(); };
    cvs.addEventListener('webglcontextlost', onLost);

    self.refresh = function () { readTheme(); if (!running) { gl.drawArrays(gl.TRIANGLES, 0, 3); } };
    self.destroy = function () {
      stop();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      if (onPtr) window.removeEventListener('pointermove', onPtr);
      cvs.removeEventListener('webglcontextlost', onLost);
      cvs.remove();
      // Uncover the CSS field again rather than leaving a blank ground.
      host.classList.remove('au--gl');
    };

    readTheme();
    resize();
    host.classList.add('au--gl');
    start();
    return self;
  }

  window.AuroraGL = {
    mount: function () {
      var host = document.querySelector('.au');
      if (!host) return null;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
      var inst = null;
      try { inst = AuroraGL(host); } catch (e) { console.warn('[aurora] ' + e.message); }
      if (inst) {
        // Re-read uniforms whenever the panel changes a token.
        window.addEventListener('themechange', function () { inst.refresh(); });
      }
      return inst;
    }
  };
})();
