// const DISPLAY_WIDTH = 720;
// const DISPLAY_HEIGHT = 405;
// const CANVAS_WIDTH = 1920;
// const CANVAS_HEIGHT = 1080;
// const renderScaleX = CANVAS_WIDTH / DISPLAY_WIDTH;
// const renderScaleY = CANVAS_HEIGHT / DISPLAY_HEIGHT;

import { calculateScale } from "./elements";

/* =========================================================================
   1. ENUM OF TRANSITION TYPES
   ========================================================================= */
const TransitionType = Object.freeze({
  CROSSFADE_ZOOM: "crossfadeZoom",
  PUSH_LEFT: "pushLeft",
  PUSH_RIGHT: "pushRight",
});

/* =========================================================================
   3. EASING HELPERS
   ========================================================================= */
const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeOutElastic = (t) => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

export function drawCrossfadeZoom(ctx, currentTime, transition, aspectRatio, fromSource, toSource) {
  const { start, duration } = transition;
  const elapsed = currentTime - start;
  if (elapsed < 0 || elapsed > duration) return;
  const progress = Math.min(elapsed / duration, 1);
  const eased = easeInOutQuad(progress);

  const { renderScaleX, renderScaleY, DISPLAY_WIDTH, DISPLAY_HEIGHT } = calculateScale(aspectRatio);
  const width = DISPLAY_WIDTH * renderScaleX;
  const height = DISPLAY_HEIGHT * renderScaleY;

  ctx.save();
  ctx.globalAlpha = 1 - eased;
  const sOut = 1 + 0.08 * eased;
  ctx.translate(width / 2, height / 2);
  ctx.scale(sOut, sOut);
  ctx.translate(-width / 2, -height / 2);
  ctx.drawImage(fromSource, 0, 0, width, height);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = eased;
  const sIn = 1.08 - 0.08 * eased;
  ctx.translate(width / 2, height / 2);
  ctx.scale(sIn, sIn);
  ctx.translate(-width / 2, -height / 2);
  ctx.drawImage(toSource, 0, 0, width, height);
  ctx.restore();
}

export function drawPushLeft(ctx, currentTime, transition, aspectRatio, fromSource, toSource) {
  const { start, duration} = transition;
  const elapsed = currentTime - start;
  if (elapsed < 0 || elapsed > duration) return;
  const progress = Math.min(elapsed / duration, 1);
  const eased = easeInOutQuad(progress);

  const { renderScaleX, renderScaleY, DISPLAY_WIDTH, DISPLAY_HEIGHT } = calculateScale(aspectRatio);
  const width = DISPLAY_WIDTH * renderScaleX;
  const height = DISPLAY_HEIGHT * renderScaleY;

  ctx.save();
  ctx.drawImage(fromSource, -width * eased, 0, width, height);
  ctx.drawImage(toSource, width - width * eased, 0, width, height);
  ctx.restore();
}

export function drawPushRight(ctx, currentTime, transition, aspectRatio, fromSource, toSource) {
  const { start } = transition;
  const duration = 1.5;
  const elapsed = currentTime - start;
  if (elapsed < 0 || elapsed > duration) return;
  const progress = Math.min(elapsed / duration, 1);
  const eased = easeInOutQuad(progress);

  const { renderScaleX, renderScaleY, DISPLAY_WIDTH, DISPLAY_HEIGHT } = calculateScale(aspectRatio);
  const width = DISPLAY_WIDTH * renderScaleX;
  const height = DISPLAY_HEIGHT * renderScaleY;

  ctx.save();
  ctx.drawImage(fromSource, width * eased, 0, width, height);
  ctx.drawImage(toSource, -width + width * eased, 0, width, height);
  ctx.restore();
}


/* =========================================================================
   5. DISPATCHER
   Central lookup so callers don't need a switch statement — same pattern
   as your drawBlockWipe, just routed by type.
   ========================================================================= */
const transitionDrawers = {
  [TransitionType.CROSSFADE_ZOOM]: drawCrossfadeZoom,
  [TransitionType.PUSH_LEFT]: drawPushLeft,
  [TransitionType.PUSH_RIGHT]: drawPushRight,
};

export function drawTransition(type, ctx, currentTime, transition, aspectRatio,
  fromSource, toSource) {
    console.log("type is", type)
  const fn = transitionDrawers[type] || drawPushLeft;
  fn(ctx, currentTime, transition, aspectRatio, fromSource, toSource);
}

export function drawBlockWipe(ctx, currentTime, transition, aspectRatio) {
  const TRANSITION_START = transition.start; // when transition begins (seconds)
  const DURATION = transition.duration; // transition length (seconds)

  const elapsed = currentTime - TRANSITION_START;
  if (elapsed < 0) return;
  if (elapsed > DURATION) return;

  const progress = Math.min(elapsed / DURATION, 1);
    const { renderScaleX, renderScaleY, DISPLAY_WIDTH, DISPLAY_HEIGHT } = calculateScale(aspectRatio);
  
  const x = 0;
  const y = 0;
  const width = DISPLAY_WIDTH * renderScaleX;
  const height = DISPLAY_HEIGHT * renderScaleY;

  const cols = 6;
const colors = [
  "#e75480", // muted rose pink
  "#4f7cff", // refined blue
  "#1e1f26", // rich charcoal
  "#2a2d36", // dark slate grey
  "#9aa0a6", // cool grey
  "#111318", // deep near-black
];


  const colW = width / cols;

  ctx.save();

  for (let i = 0; i < cols; i++) {
    const delay = i * 0.08; // stagger
    const local = Math.max(0, Math.min(1, (progress - delay) / 0.6));

    const eased = 1 - Math.pow(1 - local, 3);
    const h = height * eased;

    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(x + i * colW, y, colW, h);
  }

  ctx.restore();
}

export function drawSlideWipe(ctx, currentTime, transition, aspectRatio) {
  const TRANSITION_START = transition.start;
  const DURATION = transition.duration;

  const elapsed = currentTime - TRANSITION_START;
  if (elapsed < 0 || elapsed > DURATION) return;

  const progress = elapsed / DURATION;
  const eased = 1 - Math.pow(1 - progress, 3);

  const { renderScaleX, renderScaleY, DISPLAY_WIDTH, DISPLAY_HEIGHT } =
    calculateScale(aspectRatio);

  const width = DISPLAY_WIDTH * renderScaleX;
  const height = DISPLAY_HEIGHT * renderScaleY;

  ctx.save();

  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, width * eased, height);

  ctx.restore();
}

export function drawRadialReveal(ctx, currentTime, transition, aspectRatio) {
  const TRANSITION_START = transition.start;
  const DURATION = transition.duration;

  const elapsed = currentTime - TRANSITION_START;
  if (elapsed < 0 || elapsed > DURATION) return;

  const progress = elapsed / DURATION;
  const eased = 1 - Math.pow(1 - progress, 3);

  const { renderScaleX, renderScaleY, DISPLAY_WIDTH, DISPLAY_HEIGHT } =
    calculateScale(aspectRatio);

  const width = DISPLAY_WIDTH * renderScaleX;
  const height = DISPLAY_HEIGHT * renderScaleY;

  const maxRadius = Math.sqrt(width * width + height * height);
  const radius = maxRadius * eased;

  ctx.save();
  ctx.globalCompositeOperation = "destination-out";

  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    radius * 0.7,
    width / 2,
    height / 2,
    radius,
  );

  gradient.addColorStop(0, "rgba(0,0,0,1)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}


export function drawRGBGlitch(ctx, currentTime, transition, aspectRatio) {
  const TRANSITION_START = transition.start;
  const DURATION = transition.duration;

  const elapsed = currentTime - TRANSITION_START;
  if (elapsed < 0) return;
  if (elapsed > DURATION) return;

  const progress = Math.min(elapsed / DURATION, 1);

  const { renderScaleX, renderScaleY, DISPLAY_WIDTH, DISPLAY_HEIGHT } =
    calculateScale(aspectRatio);

  const width = DISPLAY_WIDTH * renderScaleX;
  const height = DISPLAY_HEIGHT * renderScaleY;

  ctx.save();

  const intensity = Math.sin(progress * Math.PI) * 20;

  // Random horizontal slices
  const slices = 8;
  for (let i = 0; i < slices; i++) {
    const sliceY = Math.random() * height;
    const sliceH = 5 + Math.random() * 30;
    const offset = (Math.random() - 0.5) * intensity;

    const img = ctx.getImageData(0, sliceY, width, sliceH);
    ctx.putImageData(img, offset, sliceY);
  }

  // RGB shift overlay
  ctx.globalCompositeOperation = "screen";

  ctx.fillStyle = "rgba(255,0,0,0.08)";
  ctx.fillRect(-5, 0, width, height);

  ctx.fillStyle = "rgba(0,255,255,0.08)";
  ctx.fillRect(5, 0, width, height);

  ctx.globalCompositeOperation = "source-over";

  ctx.restore();
}

export function drawFlashWhite(ctx, currentTime, transition, aspectRatio) {
  const TRANSITION_START = transition.start;
  const DURATION = transition.duration;

  const elapsed = currentTime - TRANSITION_START;
  if (elapsed < 0) return;
  if (elapsed > DURATION) return;

  const progress = Math.min(elapsed / DURATION, 1);
  const { renderScaleX, renderScaleY, DISPLAY_WIDTH, DISPLAY_HEIGHT } =
    calculateScale(aspectRatio);

  const width = DISPLAY_WIDTH * renderScaleX;
  const height = DISPLAY_HEIGHT * renderScaleY;

  ctx.save();

  const half = progress < 0.5 ? progress * 2 : (1 - progress) * 2;

  const alpha = 1 - Math.pow(1 - half, 3);

  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}

export function drawFilmBurn(ctx, currentTime, transition, aspectRatio) {
  const TRANSITION_START = transition.start;
  const DURATION = transition.duration;

  const elapsed = currentTime - TRANSITION_START;
  if (elapsed < 0) return;
  if (elapsed > DURATION) return;

  const progress = Math.min(elapsed / DURATION, 1);

  const { renderScaleX, renderScaleY, DISPLAY_WIDTH, DISPLAY_HEIGHT } =
    calculateScale(aspectRatio);

  const width = DISPLAY_WIDTH * renderScaleX;
  const height = DISPLAY_HEIGHT * renderScaleY;

  ctx.save();

  const cx = width * (0.3 + Math.sin(progress * 6) * 0.1);
  const cy = height * (0.5 + Math.cos(progress * 4) * 0.1);

  const radius = Math.sin(progress * Math.PI) * width * 0.8;

  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);

  gradient.addColorStop(0, "rgba(255,200,50,0.95)");
  gradient.addColorStop(0.3, "rgba(255,80,0,0.7)");
  gradient.addColorStop(0.6, "rgba(200,0,0,0.4)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");

  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = "source-over";

  ctx.restore();
}

export function drawFadeIn(ctx, currentTime, transition, aspectRatio) {
  const TRANSITION_START = transition.start;
  const DURATION = 1;

  const elapsed = currentTime - TRANSITION_START;
  if (elapsed < 0 || elapsed > DURATION) return;

  const progress = elapsed / DURATION;

  const { renderScaleX, renderScaleY, DISPLAY_WIDTH, DISPLAY_HEIGHT } =
    calculateScale(aspectRatio);

  const width = DISPLAY_WIDTH * renderScaleX;
  const height = DISPLAY_HEIGHT * renderScaleY;

  // easeOutQuad
  const eased = 1 - Math.pow(1 - progress, 2);

  ctx.save();

  // Fade the CURRENT (previous) clip
  ctx.globalAlpha = 1 - eased; // 👈 reverse it

  ctx.fillStyle = "#000"; // color doesn't matter, we're using alpha
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}


// reveal transitions

export function drawPixelDissolveReveal(ctx, currentTime, transition, aspectRatio) {
  const TRANSITION_START = transition.start;
  const DURATION = transition.duration;

  const elapsed = currentTime - TRANSITION_START;
  if (elapsed < 0) return;
  if (elapsed > DURATION) return;

  const progress = Math.min(elapsed / DURATION, 1);
  const { renderScaleX, renderScaleY, DISPLAY_WIDTH, DISPLAY_HEIGHT } =
    calculateScale(aspectRatio);

  const x = 0;
  const y = 0;
  const width = DISPLAY_WIDTH * renderScaleX;
  const height = DISPLAY_HEIGHT * renderScaleY;

  const blockSize = 16 * renderScaleX;
  const cols = Math.ceil(width / blockSize);
  const rows = Math.ceil(height / blockSize);

  // simple seeded random function
  function seededRandom(seed) {
    const x = Math.sin(seed) * 43758.5453;
    return x - Math.floor(x);
  }

  ctx.save();
  ctx.fillStyle = "#ffffff";
  // punch out blocks based on random threshold
  ctx.globalCompositeOperation = "destination-out";

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const seed = row * cols + col;
      const threshold = seededRandom(seed);

      // easeInOutQuad
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      if (eased > threshold) {
        const bx = x + col * blockSize;
        const by = y + row * blockSize;
        
        ctx.fillRect(bx, by, blockSize, blockSize);
      }
    }
  }

  ctx.restore();
}

export function drawVenetianBlindsReveal(ctx, currentTime, transition, aspectRatio) {
  const TRANSITION_START = transition.start;
  const DURATION = transition.duration;

  const elapsed = currentTime - TRANSITION_START;
  if (elapsed < 0) return;
  if (elapsed > DURATION) return;

  const progress = Math.min(elapsed / DURATION, 1);

  const { renderScaleX, renderScaleY, DISPLAY_WIDTH, DISPLAY_HEIGHT } =
    calculateScale(aspectRatio);

  const x = 0;
  const y = 0;
  const width = DISPLAY_WIDTH * renderScaleX;
  const height = DISPLAY_HEIGHT * renderScaleY;

  const slats = 12;
  const slатHeight = height / slats;

  // easeOutQuart
  const eased = 1 - Math.pow(1 - progress, 4);

  ctx.save();

  for (let i = 0; i < slats; i++) {
    const sy = y + i * slатHeight;
    
    // slight stagger
    const delay = (i % 3) * 0.05;
    const localProgress = Math.max(0, Math.min(1, (progress - delay) / 0.95));
    const localEased = 1 - Math.pow(1 - localProgress, 4);

    // slat opens horizontally
    const reveal = localEased;
    const maskWidth = width * (1 - reveal);

    if (maskWidth > 0) {
      ctx.fillStyle = "#000000";
      ctx.fillRect(x, sy, maskWidth, slатHeight);

      // subtle shadow on revealed edge
      if (reveal > 0.05 && reveal < 0.95) {
        const shadowGrad = ctx.createLinearGradient(
          x + maskWidth - 15 * renderScaleX,
          sy,
          x + maskWidth,
          sy
        );
        shadowGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
        shadowGrad.addColorStop(1, "rgba(0, 0, 0, 0.4)");
        
        ctx.fillStyle = shadowGrad;
        ctx.fillRect(x + maskWidth - 15 * renderScaleX, sy, 15 * renderScaleX, slатHeight);
      }
    }
  }

  ctx.restore();
}


export function drawClockWipeReveal(ctx, currentTime, transition, aspectRatio) {
  const TRANSITION_START = transition.start;
  const DURATION = transition.duration;

  const elapsed = currentTime - TRANSITION_START;
  if (elapsed < 0) return;
  if (elapsed > DURATION) return;

  const progress = Math.min(elapsed / DURATION, 1);

  const { renderScaleX, renderScaleY, DISPLAY_WIDTH, DISPLAY_HEIGHT } =
    calculateScale(aspectRatio);

  const x = 0;
  const y = 0;
  const width = DISPLAY_WIDTH * renderScaleX;
  const height = DISPLAY_HEIGHT * renderScaleY;

  const cx = x + width / 2;
  const cy = y + height / 2;
  const radius = Math.hypot(width, height);

  // easeInOutQuad
  const eased = progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;

  // sweep angle (starts from top, goes clockwise)
  const startAngle = -Math.PI / 2; // 12 o'clock
  const sweepAngle = eased * Math.PI * 2;

  ctx.save();

  // draw the mask (un-revealed area)
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, radius, startAngle, startAngle + sweepAngle);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export const transitionTypes = Object.freeze({
  BLOCK_WIPE: "blockWipe",
  SLIDE_WIPE: "slideWipe",
  RADIAL_REVEAL: "radialReveal",
  RGB_GLITCH: "rgbGlitch",
  FLASH_WHITE: "flashWhite",
  FILM_BURN: "filmBurn",
  FADE_IN: "fadeIn",
  PIXEL_DISSOLVE_REVEAL: "pixelDissolveReveal",
  VENETIAN_BLINDS_REVEAL: "venetianBlindsReveal",
  CLOCK_WIPE_REVEAL: "clockWipeReveal",
  CROSSFADE_ZOOM: "crossfadeZoom",
  PUSH_LEFT: "pushLeft",
  PUSH_RIGHT: "pushRight",
});


