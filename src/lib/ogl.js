import {
  Renderer,
  Camera,
  Transform,
  Plane,
  Mesh,
  Program,
  Texture,
} from "ogl";

let renderer, gl, camera, scene, mesh, texture;
let initialized = false;

const OVERFLOW = 1.5; // 50% padding each side for rotation bleed

export const initOGLTiltRenderer = () => {
  if (initialized) return;

  renderer = new Renderer({
    alpha: true,
    premultipliedAlpha: false,
  });

  gl = renderer.gl;

  camera = new Camera(gl, { fov: 45 });
  scene = new Transform();
  texture = new Texture(gl, { generateMipmaps: false });

  const geometry = new Plane(gl, { width: 1, height: 1 });

  const program = new Program(gl, {
    vertex: `
      attribute vec3 position;
      attribute vec2 uv;
      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragment: `
      precision highp float;
      uniform sampler2D tMap;
      varying vec2 vUv;
      void main() {
        gl_FragColor = texture2D(tMap, vUv);
      }
    `,
    uniforms: { tMap: { value: texture } },
  });

  mesh = new Mesh(gl, { geometry, program });
  mesh.setParent(scene);

  initialized = true;
};

const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const renderTiltedVideo = (
  ctx,
  video,
  tilt,
  rect,
  currentTime,
  start,
  end,
) => {
  if (!tilt || !video || !initialized) return;

  const { x, y, width, height } = rect;
  const dpr = window.devicePixelRatio || 1;

  // ----------------------------------------
  // Resize GL canvas to rect size * OVERFLOW
  // so the mesh fills the rect exactly, and
  // rotation bleeds into the padded area.
  // ----------------------------------------
  const glW = Math.round(width * OVERFLOW);
  const glH = Math.round(height * OVERFLOW);

  renderer.setSize(glW * dpr, glH * dpr);
  gl.canvas.style.width = glW + "px";
  gl.canvas.style.height = glH + "px";

  // Place camera so the unit plane fills exactly the inner (non-overflow) rect.
  // For a plane of width=1 with fov=45:
  //   half-height visible = tan(fov/2) * camZ
  //   we want half-height of inner rect (in NDC) = 0.5
  //   but the GL canvas is OVERFLOW× taller, so the inner rect occupies
  //   1/OVERFLOW of the canvas height in NDC.
  //   So we need: visibleHalfHeight * (1/OVERFLOW) = 0.5
  //   → camZ = 0.5 * OVERFLOW / tan(fov/2)
  const fovRad = (45 * Math.PI) / 180;
  const camZ = (0.5 * OVERFLOW) / Math.tan(fovRad / 2);

  // Aspect of the GL canvas
  const aspect = glW / glH;

  // Also scale the plane so it fills the rect aspect ratio exactly
  // (Plane is 1×1 by default; we stretch it to match rect aspect)
  const rectAspect = width / height;

  camera.perspective({ fov: 45, aspect, near: 0.01, far: 100 });
  camera.position.z = camZ;

  // The plane is 1 unit tall; scale X to match rect aspect
  // so there's no stretching regardless of rect shape.
  // We keep the base scale at 1 for Y and rectAspect for X.
  const baseScaleX = rectAspect;
  const baseScaleY = 1;

  // -----------------------------
  // TIMINGS
  // -----------------------------
  const TILT_IN_DURATION = tilt.inDuration ?? 0.7;
  const TILT_OUT_DURATION = tilt.outDuration ?? 1.7;

  const tiltInEnd = start + TILT_IN_DURATION;
  const tiltOutStart = end - TILT_OUT_DURATION;

  let progress = 1;

  if (currentTime <= start) {
    progress = 0;
  } else if (currentTime < tiltInEnd) {
    progress = easeOutQuart(
      Math.min((currentTime - start) / TILT_IN_DURATION, 1),
    );
  } else if (currentTime <= tiltOutStart) {
    progress = 1;
  } else if (currentTime < end) {
    progress =
      1 -
      easeInOutCubic(
        Math.min((currentTime - tiltOutStart) / TILT_OUT_DURATION, 1),
      );
  } else {
    progress = 0;
  }

  // -----------------------------
  // VIDEO TEXTURE
  // -----------------------------
  texture.image = video;
  texture.needsUpdate = true;

  // -----------------------------
  // ROTATION — no scale compensation needed;
  // the mesh never changes size, it just rotates in place.
  // The overflow canvas absorbs the bleed.
  // -----------------------------
  const targetRotX = (tilt.rotateX ?? 0) * progress;
  const targetRotY = (tilt.rotateY ?? 0) * progress;
  const targetZ = (tilt.depth ?? 0) * progress;

  const lerp = 0.15;
  mesh.rotation.x += (targetRotX - mesh.rotation.x) * lerp;
  mesh.rotation.y += (targetRotY - mesh.rotation.y) * lerp;
  mesh.position.z += (targetZ - mesh.position.z) * lerp;

  // Scale: always baseScale, no zoom in/out
  mesh.scale.x = baseScaleX;
  mesh.scale.y = baseScaleY;

  // Snap to rest to avoid float drift
  if (
    progress === 0 &&
    Math.abs(mesh.rotation.x) < 0.001 &&
    Math.abs(mesh.rotation.y) < 0.001
  ) {
    mesh.rotation.x = 0;
    mesh.rotation.y = 0;
    mesh.position.z = 0;
  }

  // -----------------------------
  // RENDER
  // -----------------------------
  renderer.render({ scene, camera });

  // -----------------------------
  // DRAW — paint the oversized GL canvas centered on the rect.
  // The inner (non-overflow) portion lands exactly on x,y,w,h.
  // Rotation bleed goes outside that area (into neighboring canvas space).
  // -----------------------------
  const padX = (width * (OVERFLOW - 1)) / 2;
  const padY = (height * (OVERFLOW - 1)) / 2;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 30 * progress;
  ctx.shadowOffsetY = 10 * progress;

  ctx.drawImage(
    gl.canvas,
    x - padX,
    y - padY,
    width * OVERFLOW,
    height * OVERFLOW,
  );

  ctx.restore();
};

// ---------- FX ENGINE (add to same file) ----------
// ===================== FX ENGINE v2 =====================
// Replaces the previous FX section. Keep it in the same file as the tilt renderer:
// it uses renderer, gl, camera, texture, initOGLTiltRenderer and the ogl imports
// (Transform, Plane, Program, Mesh).

const FX_OVERFLOW = 2; // bigger bleed area so slide-ins / fly-ins aren't cropped
const GLOW_SCALE = 1.15;
let fxScene, fxMesh, glowMesh, fxProg, glowProg;

// <poses>
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOutBack = (t) => { const u = t - 1; return 1 + 2.70158 * u * u * u + 1.70158 * u * u; };
const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeOutBounce = (x) => {
  const n = 7.5625, d = 2.75;
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
  return n * (x -= 2.625 / d) * x + 0.984375;
};

// INTRO ONLY. fn(p) gets p = 0..1 over `dur` seconds and returns an offset pose that
// ends at rest (all zeros). Nothing happens at the end of the clip anymore.
// pose fields: rx ry rz (rad), x y z (1 unit = rect height), alpha, flash
export const FX_PRESETS = {
  whip: { dur: 0.55, color: [0.25, 0.8, 1], fn: (p) => { const a = 1 - easeOutBack(p);
    return { ry: 1.4 * a, rx: 0.15 * a, rz: 0.18 * a, z: -0.3 * a, alpha: clamp(p * 5) }; } },
  flip: { dur: 0.9, color: [1, 0.3, 0.8], fn: (p) => { const a = 1 - easeOutExpo(p);
    return { ry: Math.PI * 2 * a, z: 0.25 * Math.sin(Math.PI * p) }; } },
  tumble: { dur: 0.75, color: [0.6, 0.4, 1], fn: (p) => { const a = 1 - easeOutBack(p);
    return { rx: -1.2 * a, ry: 0.5 * a, rz: -0.6 * a, z: 0.4 * a }; } },
  dolly: { dur: 0.8, color: [1, 0.75, 0.3], fn: (p) => { // fly in from far away
    const a = 1 - easeOutExpo(p), b = 1 - easeOutBack(p);
    return { z: -2.2 * a, ry: -0.8 * b, rz: 0.1 * b, alpha: clamp(p * 4) }; } },
  slam: { dur: 0.7, color: [1, 0.4, 0.2], fn: (p) => { // drops from the camera, bounces, flashes on impact
    const a = 1 - easeOutBounce(p);
    return { z: 0.9 * a, rx: 0.5 * a, flash: 0.5 * Math.exp(-Math.pow((p - 0.364) * 14, 2)) }; } },
  carousel: { dur: 0.8, color: [0.3, 1, 0.7], fn: (p) => { // 3D card slides in along an arc
    const a = 1 - easeOutBack(p);
    return { x: 2.6 * a, ry: -0.9 * a, z: -0.6 * a, rz: -0.05 * a }; } },
  pendulum: { dur: 1.2, color: [0.4, 0.7, 1], fn: (p) => { // drops in, then swings and settles
    const d = Math.exp(-4.5 * p);
    return { y: 1.2 * (1 - easeOutBounce(clamp(p * 1.5))), rz: 0.55 * d * Math.cos(16 * p), ry: 0.25 * d * Math.sin(12 * p) }; } },
};
export const FX_NAMES = {
  WHIP:"whip",
  FLIP:"flip",
  DOLLY:"dolly",
  CAROUSEL:"carousel",
  VHS: "VHS",
  OLD_FILM: "oldFilm",
  POLAROID: "polaroid",
  FILM_DAMAGE: "filmDamage"  
};

const DEF = { rx: 0, ry: 0, rz: 0, x: 0, y: 0, z: 0, alpha: 1, flash: 0 };
export const poseAt = (name, t, s, float = 0.5) => {
  const pr = FX_PRESETS[name] || FX_PRESETS.whip;
  const p = clamp((t - s) / pr.dur);
  const o = { ...DEF, ...pr.fn(p) };
  const settle = clamp((t - s - pr.dur) / 0.6); // idle float fades in only after the intro
  o.ry += float * 0.06 * Math.sin(t * 2) * settle;
  o.rx += float * 0.03 * Math.cos(t * 1.7) * settle;
  return o;
};
const speedAt = (name, t, s, float) => {
  const a = poseAt(name, t, s, float), b = poseAt(name, t - 1 / 60, s, float);
  return (Math.abs(a.rx - b.rx) + Math.abs(a.ry - b.ry) + Math.abs(a.rz - b.rz) +
    2 * (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z))) * 60;
};
// </poses>

export const initFXRenderer = () => {
  initOGLTiltRenderer();
  if (fxScene) return;
  fxScene = new Transform();
  const geometry = new Plane(gl, { width: 1, height: 1 });
  const vertex = `
    attribute vec3 position; attribute vec2 uv;
    uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix;
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

  fxProg = new Program(gl, {
    vertex,
    fragment: `
      precision highp float;
      uniform sampler2D tMap;
      uniform float uAb, uGlow, uSweep, uFlash, uAlpha; uniform vec3 uColor;
      varying vec2 vUv;
      void main(){
        vec2 d = vUv - 0.5;
        vec3 c = vec3(texture2D(tMap, vUv + d*uAb).r, texture2D(tMap, vUv).g, texture2D(tMap, vUv - d*uAb).b);
        float edge = min(min(vUv.x, 1.-vUv.x), min(vUv.y, 1.-vUv.y));
        c += uColor * smoothstep(0.04, 0.0, edge) * uGlow * 1.5;
        float k = vUv.x + vUv.y*0.4 - uSweep;
        c += vec3(0.35) * uGlow * exp(-k*k*60.0);
        c += vec3(uFlash);
        gl_FragColor = vec4(c, uAlpha);
      }`,
    uniforms: { tMap: { value: texture }, uAb: { value: 0 }, uGlow: { value: 0 }, uSweep: { value: 0 },
      uFlash: { value: 0 }, uAlpha: { value: 1 }, uColor: { value: [0.25, 0.8, 1] } },
    transparent: true,
  });

  glowProg = new Program(gl, {
    vertex,
    fragment: `
      precision highp float;
      uniform float uGlow, uInner, uAlpha; uniform vec3 uColor;
      varying vec2 vUv;
      void main(){
        vec2 q = abs(vUv - 0.5) * 2.0;
        float d = max(q.x, q.y) - uInner;
        if (d <= 0.0) discard;
        gl_FragColor = vec4(uColor, exp(-d*10.0) * uGlow * 0.9 * uAlpha);
      }`,
    uniforms: { uGlow: { value: 0 }, uInner: { value: 1 / GLOW_SCALE }, uAlpha: { value: 1 }, uColor: { value: [0.25, 0.8, 1] } },
    transparent: true, depthWrite: false,
  });

  fxMesh = new Mesh(gl, { geometry, program: fxProg });
  glowMesh = new Mesh(gl, { geometry, program: glowProg });
  fxMesh.setParent(fxScene);
  glowMesh.setParent(fxScene);
};

/**
 * Intro-only 3D effect. Returns true if it drew, false if the caller should draw the plain video
 * (before `start`, or once the intro is over and options.float === 0).
 * options: { preset, samples, shutter, color, float (idle sway 0..1), restGlow, resolution (GL quality 0.5..1) }
 */
export const renderFX = (ctx, video, rect, currentTime, start, end, options = {}) => {
  if (!video || !fxScene || currentTime < start || currentTime > end) return false;
  const pr = FX_PRESETS[options.preset] || FX_PRESETS.whip;
  const { samples = 5, shutter = 1 / 30, color = pr.color, float = 0.5, restGlow = 0.1, resolution = 1 } = options;
  const name = options.preset in FX_PRESETS ? options.preset : "whip";
  if (float === 0 && currentTime > start + pr.dur + 0.02) return false;

  const { x, y, width, height } = rect;
  const dpr = Math.min(window.devicePixelRatio || 1, 1) * resolution;
  const glW = Math.round(width * FX_OVERFLOW), glH = Math.round(height * FX_OVERFLOW);
  const W = Math.round(glW * dpr), H = Math.round(glH * dpr);
  if (gl.canvas.width !== W || gl.canvas.height !== H) renderer.setSize(W, H); // only when changed
  gl.canvas.style.width = glW + "px";
  gl.canvas.style.height = glH + "px";

  const fovRad = (45 * Math.PI) / 180;
  camera.perspective({ fov: 45, aspect: glW / glH, near: 0.01, far: 100 });
  camera.position.z = (0.5 * FX_OVERFLOW) / Math.tan(fovRad / 2);

  texture.image = video;
  texture.needsUpdate = true;

  const aspect = width / height;
  fxMesh.scale.set(aspect, 1, 1);
  glowMesh.scale.set(aspect * GLOW_SCALE, GLOW_SCALE, 1);
  glowMesh.position.z = -0.001;
  fxProg.uniforms.uColor.value = color;
  glowProg.uniforms.uColor.value = color;

  const padX = (width * (FX_OVERFLOW - 1)) / 2, padY = (height * (FX_OVERFLOW - 1)) / 2;
  const n = speedAt(name, currentTime, start, float) > 0.05 ? samples : 1; // no blur passes while holding

  ctx.save();
  const baseAlpha = ctx.globalAlpha;
  for (let i = 0; i < n; i++) {
    const t = currentTime - (shutter * i) / n;
    const p = poseAt(name, t, start, float);
    const s = clamp(speedAt(name, t, start, float) / 12);
    const glow = restGlow + (1 - restGlow) * s;

    fxProg.uniforms.uAb.value = 0.03 * s;
    fxProg.uniforms.uGlow.value = glow;
    fxProg.uniforms.uSweep.value = -0.3 + clamp((t - start) / 1.0) * 2;
    fxProg.uniforms.uFlash.value = p.flash;
    fxProg.uniforms.uAlpha.value = p.alpha;
    glowProg.uniforms.uGlow.value = glow;
    glowProg.uniforms.uAlpha.value = p.alpha;

    fxScene.position.set(p.x, p.y, p.z);
    fxScene.rotation.set(p.rx, p.ry, p.rz);
    renderer.render({ scene: fxScene, camera });

    ctx.globalAlpha = baseAlpha / (i + 1); // progressive average = motion blur
    ctx.drawImage(gl.canvas, x - padX, y - padY, width * FX_OVERFLOW, height * FX_OVERFLOW);
  }
  ctx.restore();
  return true;
};

// Pro canvas effects. Signature: (ctx, video, rect, currentTime, start, end, options)
// All are pure functions of time -> safe for scrubbing + export.

const lerp = (a, b, t) => a + (b - a) * t;

// Motion blur: draws the scene at sub-frame times, progressively averaged.
// Inside fn, MULTIPLY ctx.globalAlpha, never overwrite it.
const motionBlur = (ctx, t, samples, shutter, fn) => {
  for (let i = 0; i < samples; i++) {
    ctx.save();
    ctx.globalAlpha *= 1 / (i + 1);
    fn(t - (shutter * i) / samples);
    ctx.restore();
  }
};

const rnd = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };



let _noise;
const noise = () => {
  if (_noise) return _noise;
  _noise = document.createElement("canvas"); _noise.width = _noise.height = 128;
  const g = _noise.getContext("2d"), d = g.createImageData(128, 128);
  for (let i = 0; i < d.data.length; i += 4) { d.data[i] = d.data[i + 1] = d.data[i + 2] = Math.random() * 255; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0);
  return _noise;
};

// ---------- FILM DAMAGE overlay: grain, flicker, dust, hairs, scratches, vignette ----------
// Draw it AFTER your video. intensity 0..1.
export const renderFilmDamage = (ctx, rect, t, o = {}) => {
  const { x, y, width: w, height: h } = rect;
  const { intensity = 1, fps = 12 } = o;
  if (intensity <= 0) return;
  const seed = Math.floor(t * fps);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();

  ctx.save();                                                    // grain
  ctx.globalCompositeOperation = "overlay"; ctx.globalAlpha = 0.28 * intensity;
  const ox = rnd(seed) * 128, oy = rnd(seed + 9) * 128;
  ctx.translate(x - ox, y - oy); ctx.fillStyle = ctx.createPattern(noise(), "repeat");
  ctx.fillRect(ox, oy, w, h);
  ctx.restore();

  ctx.fillStyle = `rgba(0,0,0,${0.07 * intensity * rnd(seed * 3.1)})`;   // projector flicker
  ctx.fillRect(x, y, w, h);

  const vg = ctx.createRadialGradient(x + w / 2, y + h / 2, h * 0.3, x + w / 2, y + h / 2, w * 0.65);
  vg.addColorStop(0, "rgba(40,20,0,0)"); vg.addColorStop(1, `rgba(40,20,0,${0.5 * intensity})`);
  ctx.fillStyle = vg; ctx.fillRect(x, y, w, h);

  for (let i = 0; i < 16; i++) {                                 // dust: white + dark specks
    if (rnd(seed * 17 + i) < 0.4) continue;
    const px = x + rnd(seed * 5 + i * 3) * w, py = y + rnd(seed * 11 + i * 7) * h, r = 0.6 + rnd(seed + i * 13) * 2.2;
    ctx.fillStyle = i % 3 ? `rgba(255,248,230,${0.45 * intensity + 0.3})` : `rgba(20,10,0,${0.6 * intensity})`;
    ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill();
  }
  if (rnd(seed * 2.3) > 0.7) {                                   // hair
    const hx = x + rnd(seed * 4.1) * w, hy = y + rnd(seed * 6.7) * h * 0.7;
    ctx.strokeStyle = `rgba(255,245,225,${0.6 * intensity})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(hx + 18, hy + 22, hx - 6, hy + 46); ctx.stroke();
  }
  for (let i = 0; i < 2; i++) {                                  // vertical scratches (last ~3 frames)
    const sd = Math.floor(seed / 3);
    if (rnd(sd * 29 + i) < 0.55) continue;
    const sx = x + rnd(sd * 7 + i * 5) * w, sy = y + rnd(sd + i) * h * 0.3;
    ctx.strokeStyle = `rgba(255,245,225,${0.4 * intensity})`; ctx.lineWidth = 1 + rnd(sd + i * 3);
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + (rnd(sd) - 0.5) * 4, sy + h * (0.5 + rnd(sd * 3 + i) * 0.5)); ctx.stroke();
  }
  ctx.restore();
};

// sepia: keeps luminosity, replaces hue/saturation. Call inside a clipped region.
const sepia = (ctx, x, y, w, h, a) => {
  ctx.save();
  ctx.globalCompositeOperation = "color"; ctx.fillStyle = `rgba(165,105,50,${0.75 * a})`; ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = `rgba(255,214,160,${0.45 * a})`; ctx.fillRect(x, y, w, h);
  ctx.restore();
};

// ---------- 2) OLD FILM: sepia + projector flicker + gate weave + damage on the whole clip ----------
export const renderOldFilm = (ctx, video, rect, t, start, end, o = {}) => {
  const { x, y, width: w, height: h } = rect;
  const { intensity = 1, sepiaAmt = 1, fadeIn = 0.4 } = o;
  const k = intensity * clamp((t - start) / fadeIn);
  const seed = Math.floor(t * 12);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.drawImage(video, x + (rnd(seed) - 0.5) * 3 * k, y + (rnd(seed + 5) - 0.5) * 3 * k, w, h); // gate weave
  sepia(ctx, x, y, w, h, sepiaAmt * k);
  ctx.restore();
  renderFilmDamage(ctx, rect, t, { intensity: k });
};

// ---------- 3) VHS: RGB bleed, scanlines, rolling tracking band, static, PLAY + timecode ----------
let _v, _scan;
export const renderVHS = (ctx, video, rect, t, start, end, o = {}) => {
  const { x, y, width: w, height: h } = rect;
  _v = _v || [0, 1, 2, 3].map(() => document.createElement("canvas"));
  _v.forEach((c) => { c.width = w; c.height = h; });
  const cols = ["#f00", "#0f0", "#00f"];
  for (let i = 0; i < 3; i++) {
    const g = _v[i].getContext("2d");
    g.drawImage(video, 0, 0, w, h); g.globalCompositeOperation = "multiply"; g.fillStyle = cols[i]; g.fillRect(0, 0, w, h);
  }
  const seed = Math.floor(t * 30), g0 = 1 - clamp((t - start) / 0.8);          // heavy at start, calms down
  const D = _v[3].getContext("2d");
  D.fillStyle = "#000"; D.fillRect(0, 0, w, h); D.globalCompositeOperation = "lighter";
  const sp = w * (0.004 + 0.02 * g0);
  [-1, 0, 1].forEach((d, ch) => D.drawImage(_v[ch], d * sp, 0, w, h));
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.drawImage(_v[3], x, y);
  const by = ((t * 0.3) % 1.3 - 0.15) * h, bh = h * 0.07;                     // tracking band
  ctx.drawImage(_v[3], 0, by, w, bh, x + Math.sin(t * 40) * w * 0.03, y + by, w, bh);
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.35 + 0.5 * g0;
  ctx.drawImage(noise(), rnd(seed) * 64, rnd(seed + 3) * 64, 64, 4, x, y + by, w, bh);
  ctx.globalAlpha = 0.5 * g0; ctx.drawImage(noise(), 0, 0, 128, 128, x, y, w, h);  // full-frame static
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  if (!_scan) { _scan = document.createElement("canvas"); _scan.width = 1; _scan.height = 4; const s = _scan.getContext("2d"); s.fillStyle = "rgba(0,0,0,.28)"; s.fillRect(0, 0, 1, 2); }
  ctx.fillStyle = ctx.createPattern(_scan, "repeat"); ctx.fillRect(x, y, w, h);
  const fs = Math.round(h * 0.06);
  ctx.font = `bold ${fs}px monospace`; ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(0,120,255,.9)"; ctx.shadowBlur = 6;
  ctx.fillText("PLAY \u25B6", x + fs, y + fs * 1.6);
  const s = Math.floor(t), tc = `00:${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  ctx.textAlign = "right"; ctx.fillText(tc, x + w - fs, y + h - fs);
  ctx.restore();
};

// ---------- 4) POLAROID DROP: card drops in with bounce, photo "develops", border melts away ----------
export const renderPolaroid = (ctx, video, rect, t, start, end, o = {}) => {
  const { x, y, width: w, height: h } = rect;
  const { dur = 0.9, hold = 0.6, tilt = -0.22 } = o;
  const p = clamp((t - start) / dur), q = clamp((t - start - dur - hold) / 0.5), e = easeInOutCubic(q);
  const drop = 1 - easeOutBounce(p);
  const rot = (tilt * (1 - easeOutBack(p)) * 1.5 + tilt * 0.35) * (1 - e);
  const sc = lerp(0.74, 1, e), bd = w * 0.045 * (1 - e), bb = w * 0.17 * (1 - e);
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2 - drop * h * 1.4); ctx.rotate(rot); ctx.scale(sc, sc);
  ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 30 * (1 - e); ctx.shadowOffsetY = 14 * (1 - e);
  ctx.fillStyle = "#f4efe4";
  ctx.beginPath(); ctx.roundRect(-w / 2 - bd, -h / 2 - bd, w + bd * 2, h + bd + bb, 6 * (1 - e)); ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.clip();
  ctx.drawImage(video, -w / 2, -h / 2, w, h);
  const dev = 1 - clamp((t - start - dur) / (hold + 0.5));                       // develops from dark/milky to normal
  ctx.fillStyle = `rgba(60,55,45,${0.85 * dev})`; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.restore();
};




