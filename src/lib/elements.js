//titlecards and lowerthirds
// const DISPLAY_WIDTH = 720;
// const DISPLAY_HEIGHT = 405;
// const PIXEL_RATIO = 2; // or window.devicePixelRatio
// const CANVAS_WIDTH = 1920;
// const CANVAS_HEIGHT = 1080;
// const renderScaleX = CANVAS_WIDTH / DISPLAY_WIDTH;
// const renderScaleY = CANVAS_HEIGHT / DISPLAY_HEIGHT;

export const calculateScale = (aspectRatio = "16:9") => {
  const dimensions = {
    "16:9": { width: 1920, height: 1080 },
    "4:3": { width: 1440, height: 1080 },
    "1:1": { width: 1080, height: 1080 },
    "9:16": { width: 1080, height: 1920 },
  };
  const dimension = dimensions[aspectRatio] || dimensions["16:9"];
  const displayDimensions = {
    "16:9": { DISPLAY_WIDTH: 720, DISPLAY_HEIGHT: 405 },
    "4:3": { DISPLAY_WIDTH: 720, DISPLAY_HEIGHT: 540 },
    "1:1": { DISPLAY_WIDTH: 405, DISPLAY_HEIGHT: 405 },
    "9:16": { DISPLAY_WIDTH: 225, DISPLAY_HEIGHT: 405 },
  };
  const renderScaleX =
    dimension.width / displayDimensions[aspectRatio].DISPLAY_WIDTH;
  const renderScaleY =
    dimension.height / displayDimensions[aspectRatio].DISPLAY_HEIGHT;
  return {
    renderScaleX,
    renderScaleY,
    DISPLAY_WIDTH: displayDimensions[aspectRatio].DISPLAY_WIDTH,
    DISPLAY_HEIGHT: displayDimensions[aspectRatio].DISPLAY_HEIGHT,
    CANVAS_WIDTH: dimension.width,
    CANVAS_HEIGHT: dimension.height,
  };
};
function setupCard(ctx, element, currentTime, aspectRatio) {
  let { text, x, y, width, height, start, style } = element;
  const { renderScaleX, renderScaleY, DISPLAY_WIDTH, DISPLAY_HEIGHT } = calculateScale(aspectRatio);
  x *= renderScaleX; y *= renderScaleY;
  width = DISPLAY_WIDTH * renderScaleX; height = DISPLAY_HEIGHT * renderScaleY;
  return { text, x, y, width, height, elapsed: currentTime - start, style: style || {} };
}
const clamp = t => Math.max(0, Math.min(1, t));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);
export function easeBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;

  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
export function drawRetroScanCard(
  ctx,
  element,
  currentTime,
  aspectRatio
) {
  let {
    text = "VOLUME 01",
    x, y, width, height, start, style
  } = element;

  const {
    renderScaleX,
    renderScaleY,
    DISPLAY_WIDTH,
    DISPLAY_HEIGHT
  } = calculateScale(aspectRatio);

  x *= renderScaleX;
  y *= renderScaleY;
  width = DISPLAY_WIDTH * renderScaleX;
  height = DISPLAY_HEIGHT * renderScaleY;

  const elapsed = currentTime - start;

  if (elapsed < 0) return;

  const p = easeOut(clamp(elapsed / 0.9));

  ctx.save();

  const cx = x + width / 2;
  const cy = y + height / 2;

  // --------------------------------------------------
  // Background
  // --------------------------------------------------

  ctx.fillStyle = "#27231f";
  ctx.fillRect(x, y, width, height);

  // Slight warm gradient
  const bg = ctx.createRadialGradient(
    cx,
    cy,
    0,
    cx,
    cy,
    width * 0.75
  );

  bg.addColorStop(0, "#3a342d");
  bg.addColorStop(0.6, "#292520");
  bg.addColorStop(1, "#171513");

  ctx.fillStyle = bg;
  ctx.fillRect(x, y, width, height);

  // --------------------------------------------------
  // Soft analog texture
  // --------------------------------------------------

  ctx.globalAlpha = 0.07;

  for (let i = 0; i < 250; i++) {
    const px = x + Math.random() * width;
    const py = y + Math.random() * height;
    const size = Math.random() * width * 0.002;

    ctx.fillStyle =
      Math.random() > 0.5
        ? "#fff3d6"
        : "#000000";

    ctx.fillRect(px, py, size, size);
  }

  // --------------------------------------------------
  // Horizontal VHS tracking lines
  // --------------------------------------------------

  ctx.globalAlpha = 0.08;

  for (let i = 0; i < 18; i++) {
    const lineY =
      y +
      ((i / 18) * height);

    ctx.fillStyle = "#d8c7a5";

    ctx.fillRect(
      x,
      lineY,
      width,
      height * 0.0015
    );
  }

  // --------------------------------------------------
  // Moving tracking distortion
  // --------------------------------------------------

  const trackingY =
    y +
    ((elapsed * height * 0.55) %
      (height * 1.25)) -
    height * 0.15;

  ctx.globalAlpha = 0.18;

  ctx.fillStyle = "#c6b08a";

  ctx.fillRect(
    x,
    trackingY,
    width,
    height * 0.012
  );

  ctx.globalAlpha = 0.08;

  ctx.fillRect(
    x,
    trackingY + height * 0.018,
    width,
    height * 0.003
  );

  // --------------------------------------------------
  // Slight horizontal image wobble
  // --------------------------------------------------

  const wobble =
    Math.sin(elapsed * 8) *
    width *
    0.002;

  // --------------------------------------------------
  // Title
  // --------------------------------------------------

  const titleY =
    cy +
    height * 0.015;

  ctx.globalAlpha = p;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font =
    `900 ${height * 0.145}px monospace`;

  // Very subtle warm ghost
  ctx.globalAlpha = p * 0.18;

  ctx.fillStyle = "#b85c45";

  ctx.fillText(
    text,
    cx - width * 0.004 + wobble,
    titleY
  );

  // Main title
  ctx.globalAlpha = p;

  ctx.fillStyle = "#e8dcc3";

  ctx.fillText(
    text,
    cx + wobble,
    titleY
  );

  // Slight dark offset
  ctx.globalAlpha = p * 0.25;

  ctx.fillStyle = "#171411";

  ctx.fillText(
    text,
    cx + width * 0.003,
    titleY + height * 0.006
  );

  // --------------------------------------------------
  // Decorative divider
  // --------------------------------------------------

  ctx.globalAlpha = p * 0.7;

  ctx.strokeStyle = "#b85c45";
  ctx.lineWidth = height * 0.003;

  ctx.beginPath();

  ctx.moveTo(
    cx - width * 0.18,
    cy + height * 0.13
  );

  ctx.lineTo(
    cx + width * 0.18,
    cy + height * 0.13
  );

  ctx.stroke();

  // --------------------------------------------------
  // REC indicator
  // --------------------------------------------------

  const blink =
    Math.floor(elapsed * 3) % 2 === 0;

  ctx.globalAlpha =
    blink ? p : p * 0.25;

  ctx.fillStyle = "#b85c45";

  ctx.beginPath();

  ctx.arc(
    x + width * 0.065,
    y + height * 0.08,
    height * 0.009,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.font =
    `600 ${height * 0.028}px monospace`;

  ctx.textAlign = "left";

  ctx.fillText(
    "REC",
    x + width * 0.085,
    y + height * 0.083
  );

  // --------------------------------------------------
  // Timestamp
  // --------------------------------------------------

  ctx.globalAlpha = p * 0.65;

  ctx.font =
    `${height * 0.027}px monospace`;

  ctx.fillStyle = "#c9bda7";

  ctx.textAlign = "right";

  ctx.fillText(
    "SP  00:01:24",
    x + width * 0.94,
    y + height * 0.92
  );

  // --------------------------------------------------
  // VHS vignette
  // --------------------------------------------------

  const vignette = ctx.createRadialGradient(
    cx,
    cy,
    width * 0.25,
    cx,
    cy,
    width * 0.72
  );

  vignette.addColorStop(
    0,
    "rgba(0,0,0,0)"
  );

  vignette.addColorStop(
    0.7,
    "rgba(0,0,0,0.08)"
  );

  vignette.addColorStop(
    1,
    "rgba(0,0,0,0.48)"
  );

  ctx.globalAlpha = 1;
  ctx.fillStyle = vignette;

  ctx.fillRect(
    x,
    y,
    width,
    height
  );

  ctx.restore();
}
export function drawPinkBubbleCard(ctx, element, currentTime, aspectRatio) {
  let {
    text = "Title here",
    x, y, width, height, start, style
  } = element;

  const {
    renderScaleX,
    renderScaleY,
    DISPLAY_WIDTH,
    DISPLAY_HEIGHT
  } = calculateScale(aspectRatio);

  x *= renderScaleX;
  y *= renderScaleY;
  width = DISPLAY_WIDTH * renderScaleX;
  height = DISPLAY_HEIGHT * renderScaleY;

  const elapsed = currentTime - start;

  if (elapsed < 0) return;

  const p = easeBack(clamp(elapsed / 0.9));

  ctx.save();

  const cx = x + width / 2;
  const cy = y + height / 2;

  // Background
  ctx.fillStyle = "#fff1f2";
  ctx.fillRect(x, y, width, height);

  // Large bubbles
  const bubbles = [
    [0.18, 0.25, 0.18, "#fda4af"],
    [0.78, 0.22, 0.13, "#f9a8d4"],
    [0.82, 0.75, 0.22, "#fecdd3"],
    [0.18, 0.78, 0.11, "#fbcfe8"]
  ];

  bubbles.forEach(([bx, by, r, color], i) => {

    const float =
      Math.sin(elapsed * 2 + i) * height * 0.02;

    ctx.globalAlpha = 0.7;

    ctx.fillStyle = color;

    ctx.beginPath();

    ctx.arc(
      x + width * bx,
      y + height * by + float,
      width * r * p,
      0,
      Math.PI * 2
    );

    ctx.fill();
  });

  // Main pill
  ctx.save();

  ctx.translate(cx, cy);
  ctx.scale(p, p);

  ctx.shadowBlur = width * 0.025;
  ctx.shadowColor = "rgba(244,63,94,0.25)";

  ctx.fillStyle = "#ffffff";

  ctx.roundRect(
    -width * 0.31,
    -height * 0.13,
    width * 0.62,
    height * 0.26,
    height * 0.13
  );

  ctx.fill();

  ctx.shadowBlur = 0;

  ctx.fillStyle = "#be123c";

  ctx.font =
    `800 ${height * 0.085}px Arial`;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText(text, 0, 0);

  ctx.restore();

  // tiny sparkle
  ctx.globalAlpha = p;

  ctx.fillStyle = "#e11d48";
  ctx.font = `${height * 0.07}px Arial`;

  ctx.fillText(
    "✦",
    cx + width * 0.34,
    cy - height * 0.22
  );

  ctx.restore();
}
export function drawCuteScrapbookCard(ctx, element, currentTime, aspectRatio) {
  let {
    text = "A LITTLE UPDATE ♡",
    x, y, width, height, start, style
  } = element;

  const {
    renderScaleX,
    renderScaleY,
    DISPLAY_WIDTH,
    DISPLAY_HEIGHT
  } = calculateScale(aspectRatio);

  x *= renderScaleX;
  y *= renderScaleY;
  width = DISPLAY_WIDTH * renderScaleX;
  height = DISPLAY_HEIGHT * renderScaleY;

  const elapsed = currentTime - start;

  if (elapsed < 0) return;

  const p = easeBack(clamp(elapsed / 0.8));

  ctx.save();

  const cx = x + width / 2;
  const cy = y + height / 2;

  // Soft background
  ctx.fillStyle = style?.background || "#fce7f3";
  ctx.fillRect(x, y, width, height);

  // Paper card
  ctx.save();

  ctx.translate(cx, cy);
  ctx.rotate(-0.025);
  ctx.scale(p, p);

  ctx.shadowBlur = width * 0.025;
  ctx.shadowColor = "rgba(0,0,0,0.15)";

  ctx.fillStyle = "#fffdf8";

  ctx.roundRect(
    -width * 0.32,
    -height * 0.25,
    width * 0.64,
    height * 0.5,
    width * 0.025
  );

  ctx.fill();

  ctx.shadowBlur = 0;

  // Tape
  ctx.fillStyle = "#f9a8d4";

  ctx.translate(-width * 0.18, -height * 0.29);
  ctx.rotate(-0.1);

  ctx.fillRect(
    0,
    0,
    width * 0.18,
    height * 0.07
  );

  ctx.restore();

  // Hearts
  const hearts = [
    [-0.36, -0.30, 0.9],
    [0.38, -0.28, 1.1],
    [0.36, 0.29, 0.8],
    [-0.39, 0.27, 1.2]
  ];

  hearts.forEach(([ox, oy, s], i) => {

    const float =
      Math.sin(elapsed * 3 + i) * height * 0.015;

    ctx.save();

    ctx.translate(
      cx + ox * width,
      cy + oy * height + float
    );

    ctx.scale(p * s, p * s);

    ctx.fillStyle =
      i % 2
        ? "#fb7185"
        : "#ec4899";

    ctx.font = `${height * 0.08}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText("♥", 0, 0);

    ctx.restore();
  });

  // Sparkles
  for (let i = 0; i < 6; i++) {

    const angle = elapsed * 0.8 + i;
    const radius = width * 0.28;

    const sx = cx + Math.cos(angle) * radius;
    const sy = cy + Math.sin(angle) * radius * 0.7;

    ctx.globalAlpha =
      0.5 + Math.sin(elapsed * 4 + i) * 0.5;

    ctx.fillStyle = "#f9a8d4";

    ctx.font = `${height * 0.045}px Arial`;
    ctx.fillText("✦", sx, sy);
  }

  // Text
  ctx.globalAlpha = p;

  ctx.fillStyle =
    style?.textColor || "#831843";

  ctx.font =
    `700 ${height * 0.11}px Georgia`;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText(text, cx, cy);

  ctx.restore();
}
export function drawConfettiTitleCard(ctx, element, currentTime, aspectRatio) {
  let {
    text = "WE DID IT!",
    x, y, width, height, start, style
  } = element;

  const {
    renderScaleX,
    renderScaleY,
    DISPLAY_WIDTH,
    DISPLAY_HEIGHT
  } = calculateScale(aspectRatio);

  x *= renderScaleX;
  y *= renderScaleY;
  width = DISPLAY_WIDTH * renderScaleX;
  height = DISPLAY_HEIGHT * renderScaleY;

  const elapsed = currentTime - start;

  if (elapsed < 0) return;

  const p = easeOut(clamp(elapsed / 1.0));

  ctx.save();

  const cx = x + width / 2;
  const cy = y + height / 2;

  // --------------------------------------------------
  // Background
  // --------------------------------------------------

  ctx.fillStyle =
    style?.background || "#1e1b4b";

  ctx.fillRect(x, y, width, height);

  // --------------------------------------------------
  // Confetti
  // --------------------------------------------------

  const colors = [
    "#f43f5e",
    "#facc15",
    "#22c55e",
    "#38bdf8",
    "#a855f7"
  ];

  for (let i = 0; i < 45; i++) {

    const angle =
      (i / 45) * Math.PI * 2 +
      i * 0.2;

    const distance =
      lerp(0, width * 0.65, p);

    const px =
      cx + Math.cos(angle) * distance;

    const py =
      cy + Math.sin(angle) * distance;

    const size =
      width * (0.006 + (i % 3) * 0.004);

    ctx.save();

    ctx.translate(px, py);

    ctx.rotate(
      elapsed * (i % 2 ? 2 : -2)
    );

    ctx.globalAlpha =
      1 - p * 0.4;

    ctx.fillStyle =
      colors[i % colors.length];

    if (i % 3 === 0) {

      ctx.beginPath();

      ctx.arc(
        0,
        0,
        size * 1.5,
        0,
        Math.PI * 2
      );

      ctx.fill();

    } else {

      ctx.fillRect(
        -size,
        -size,
        size * 2,
        size * 4
      );
    }

    ctx.restore();
  }

  // --------------------------------------------------
  // Text setup
  // --------------------------------------------------

  const fontSize =
    height * 0.11;

  ctx.font =
    `900 ${fontSize}px Arial`;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lines =
    String(text).split("\n");

  const lineHeight =
    fontSize * 1.15;

  // Measure widest line
  let maxTextWidth = 0;

  for (const line of lines) {
    const measured =
      ctx.measureText(line).width;

    maxTextWidth =
      Math.max(maxTextWidth, measured);
  }

  // --------------------------------------------------
  // Badge dimensions
  // --------------------------------------------------

  const horizontalPadding =
    width * 0.06;

  const verticalPadding =
    height * 0.045;

  const badgeWidth =
    Math.min(
      maxTextWidth + horizontalPadding * 2,
      width * 0.85
    );

  const badgeHeight =
    lines.length * lineHeight +
    verticalPadding * 2;

  // --------------------------------------------------
  // Badge animation
  // --------------------------------------------------

  const badgeScale =
    easeBack(clamp(elapsed / 0.7));

  ctx.save();

  ctx.translate(cx, cy);
  ctx.scale(badgeScale, badgeScale);

  // Shadow
  ctx.globalAlpha = 0.25;

  ctx.fillStyle = "#000";

  ctx.roundRect(
    -badgeWidth / 2 + width * 0.012,
    -badgeHeight / 2 + height * 0.015,
    badgeWidth,
    badgeHeight,
    width * 0.03
  );

  ctx.fill();

  // Badge
  ctx.globalAlpha = 1;

  ctx.fillStyle =
    style?.badgeColor || "#ffffff";

  ctx.roundRect(
    -badgeWidth / 2,
    -badgeHeight / 2,
    badgeWidth,
    badgeHeight,
    width * 0.03
  );

  ctx.fill();

  // --------------------------------------------------
  // Multi-line text
  // --------------------------------------------------

  ctx.fillStyle =
    style?.textColor || "#111";

  ctx.globalAlpha = p;

  const totalTextHeight =
    lines.length * lineHeight;

  lines.forEach((line, index) => {

    const lineY =
      -totalTextHeight / 2 +
      lineHeight / 2 +
      index * lineHeight;

    ctx.fillText(
      line,
      0,
      lineY
    );
  });

  ctx.restore();

  ctx.restore();
}

export function drawNeonFrameCard(ctx, element, currentTime, aspectRatio) {
  let {
    text = "WELCOME",
    x,
    y,
    width,
    height,
    start,
    style,
  } = element;

  const {
    renderScaleX,
    renderScaleY,
    DISPLAY_WIDTH,
    DISPLAY_HEIGHT,
  } = calculateScale(aspectRatio);

  x *= renderScaleX;
  y *= renderScaleY;
  width = DISPLAY_WIDTH * renderScaleX;
  height = DISPLAY_HEIGHT * renderScaleY;

  const elapsed = currentTime - start;

  if (elapsed < 0) return;

  const p = easeOut(clamp(elapsed / 1.2));

  ctx.save();

  const cx = x + width / 2;
  const cy = y + height / 2;

  // Background
  ctx.fillStyle = style?.background || "#050505";
  ctx.fillRect(x, y, width, height);

  // --------------------------------------------------
  // TEXT SETUP
  // --------------------------------------------------

  const lines = String(text).split("\n");

  // Count words across all lines
  const wordCount = String(text)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;

  // Font size based on number of words
  let fontRatio;

  if (wordCount <= 2) {
    fontRatio = 0.16;
  } else if (wordCount <= 4) {
    fontRatio = 0.13;
  } else if (wordCount <= 6) {
    fontRatio = 0.105;
  } else if (wordCount <= 8) {
    fontRatio = 0.085;
  } else if (wordCount <= 12) {
    fontRatio = 0.07;
  } else {
    fontRatio = 0.055;
  }

  let fontSize = height * fontRatio;

  const horizontalPadding = width * 0.08;
  const verticalPadding = height * 0.07;

  // Maximum width available for text
  const maxFrameWidth = width * 0.82;

  const maxTextWidth =
    maxFrameWidth - horizontalPadding * 2;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // --------------------------------------------------
  // SHRINK FONT IF TEXT IS TOO WIDE
  // --------------------------------------------------

  function getMaxTextWidth() {
    ctx.font = `900 ${fontSize}px Arial`;

    let maxWidth = 0;

    for (const line of lines) {
      const measuredWidth = ctx.measureText(line).width;

      if (measuredWidth > maxWidth) {
        maxWidth = measuredWidth;
      }
    }

    return maxWidth;
  }

  let measuredWidth = getMaxTextWidth();

  // Keep reducing font size until the longest line fits
  while (
    measuredWidth > maxTextWidth &&
    fontSize > height * 0.035
  ) {
    fontSize *= 0.95;
    measuredWidth = getMaxTextWidth();
  }

  // Set final font
  ctx.font = `900 ${fontSize}px Arial`;

  const lineHeight = fontSize * 1.15;

  // --------------------------------------------------
  // FRAME SIZE
  // --------------------------------------------------

  const frameWidth = Math.min(
    measuredWidth + horizontalPadding * 2,
    maxFrameWidth
  );

  const frameHeight =
    lines.length * lineHeight + verticalPadding * 2;

  const left = cx - frameWidth / 2;
  const right = cx + frameWidth / 2;

  const top = cy - frameHeight / 2;
  const bottom = cy + frameHeight / 2;

  const radius = width * 0.025;

  // --------------------------------------------------
  // NEON FRAME
  // --------------------------------------------------

  const perimeter =
    2 * ((right - left) + (bottom - top));

  const dash = perimeter * p;

  const accent =
    style?.accentColor || "#6366f1";

  ctx.strokeStyle = accent;
  ctx.lineWidth = height * 0.012;
  ctx.lineCap = "round";

  ctx.shadowBlur = width * 0.035;
  ctx.shadowColor = accent;

  ctx.setLineDash([dash, perimeter]);

  ctx.beginPath();

  ctx.roundRect(
    left,
    top,
    frameWidth,
    frameHeight,
    radius
  );

  ctx.stroke();

  ctx.setLineDash([]);

  ctx.shadowBlur = 0;

  // --------------------------------------------------
  // INNER SUBTLE GLOW
  // --------------------------------------------------

  ctx.globalAlpha = 0.18 * p;

  ctx.lineWidth = height * 0.003;

  ctx.strokeStyle = accent;

  ctx.beginPath();

  ctx.roundRect(
    left + height * 0.025,
    top + height * 0.025,
    frameWidth - height * 0.05,
    frameHeight - height * 0.05,
    radius * 0.7
  );

  ctx.stroke();

  // --------------------------------------------------
  // MOVING GLOW DOT
  // --------------------------------------------------

  const dotProgress =
    (elapsed * 0.7) % 1;

  let dotX;
  let dotY;

  const topLength = right - left;
  const rightLength = bottom - top;
  const bottomLength = right - left;

  const distance =
    dotProgress * perimeter;

  if (distance < topLength) {
    // Top
    dotX = left + distance;
    dotY = top;

  } else if (
    distance <
    topLength + rightLength
  ) {
    // Right
    dotX = right;
    dotY =
      top +
      (distance - topLength);

  } else if (
    distance <
    topLength +
      rightLength +
      bottomLength
  ) {
    // Bottom
    dotX =
      right -
      (
        distance -
        topLength -
        rightLength
      );

    dotY = bottom;

  } else {
    // Left
    dotX = left;

    dotY =
      bottom -
      (
        distance -
        topLength -
        rightLength -
        bottomLength
      );
  }

  ctx.globalAlpha = 1;

  ctx.fillStyle = accent;

  ctx.shadowBlur = width * 0.045;
  ctx.shadowColor = accent;

  ctx.beginPath();

  ctx.arc(
    dotX,
    dotY,
    height * 0.012,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.shadowBlur = 0;

  // --------------------------------------------------
  // TEXT
  // --------------------------------------------------

  const textProgress =
    easeOut(
      clamp((elapsed - 0.25) / 0.6)
    );

  ctx.globalAlpha = textProgress;

  ctx.fillStyle =
    style?.textColor || "#fff";

  const totalTextHeight =
    lines.length * lineHeight;

  lines.forEach((line, index) => {
    const lineY =
      -totalTextHeight / 2 +
      lineHeight / 2 +
      index * lineHeight;

    ctx.fillText(
      line,
      cx,
      cy + lineY
    );
  });

  ctx.restore();
}

export function drawParticleBurstCard(
  ctx,
  element,
  currentTime,
  aspectRatio
) {
  let {
    text = "BOOM!",
    x,
    y,
    width,
    height,
    start,
    style,
  } = element;

  const {
    renderScaleX,
    renderScaleY,
    DISPLAY_WIDTH,
    DISPLAY_HEIGHT,
  } = calculateScale(aspectRatio);

  x *= renderScaleX;
  y *= renderScaleY;
  width = DISPLAY_WIDTH * renderScaleX;
  height = DISPLAY_HEIGHT * renderScaleY;

  const elapsed = currentTime - start;

  if (elapsed < 0) return;

  const p = easeOut(clamp(elapsed / 1.1));

  ctx.save();

  const cx = x + width / 2;
  const cy = y + height / 2;

  // --------------------------------------------------
  // BACKGROUND
  // --------------------------------------------------

  ctx.fillStyle =
    style?.background || "#111827";

  ctx.fillRect(
    x,
    y,
    width,
    height
  );

  // --------------------------------------------------
  // PARTICLES
  // --------------------------------------------------

  const particleCount = 35;

  for (let i = 0; i < particleCount; i++) {
    const angle =
      (i / particleCount) * Math.PI * 2;

    const speed =
      width * (0.12 + (i % 5) * 0.035);

    const distance =
      speed *
      easeOut(
        clamp(elapsed / 0.9)
      );

    const px =
      cx +
      Math.cos(angle) * distance;

    const py =
      cy +
      Math.sin(angle) * distance;

    const size =
      width *
      (0.004 + (i % 4) * 0.003);

    ctx.globalAlpha = 1 - p;

    ctx.fillStyle =
      i % 3 === 0
        ? "#f59e0b"
        : style?.particleColor || "#ffffff";

    ctx.beginPath();

    ctx.arc(
      px,
      py,
      size,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  // --------------------------------------------------
  // MAIN CIRCLE
  // --------------------------------------------------

  ctx.globalAlpha = p;

  ctx.fillStyle =
    style?.accentColor || "#f59e0b";

  ctx.beginPath();

  ctx.arc(
    cx,
    cy,
    width * 0.12 * p,
    0,
    Math.PI * 2
  );

  ctx.fill();

  // --------------------------------------------------
  // TEXT SETUP
  // --------------------------------------------------

  const lines = String(text).split("\n");

  // Count all words, including words on
  // different lines.
  const wordCount = String(text)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;

  // --------------------------------------------------
  // FONT SIZE BASED ON WORD COUNT
  // --------------------------------------------------

  let fontRatio;

  if (wordCount <= 2) {
    fontRatio = 0.18;
  } else if (wordCount <= 4) {
    fontRatio = 0.14;
  } else if (wordCount <= 6) {
    fontRatio = 0.115;
  } else if (wordCount <= 8) {
    fontRatio = 0.095;
  } else if (wordCount <= 12) {
    fontRatio = 0.075;
  } else {
    fontRatio = 0.06;
  }

  let fontSize =
    height * fontRatio;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // --------------------------------------------------
  // FIT TEXT INSIDE THE CARD
  // --------------------------------------------------

  // Leave some space around the text.
  const horizontalPadding =
    width * 0.12;

  const maxTextWidth =
    width * 0.72 -
    horizontalPadding;

  function getMaxTextWidth() {
    ctx.font =
      `900 ${fontSize}px Arial`;

    let maxWidth = 0;

    for (const line of lines) {
      const measuredWidth =
        ctx.measureText(line).width;

      if (measuredWidth > maxWidth) {
        maxWidth = measuredWidth;
      }
    }

    return maxWidth;
  }

  let measuredWidth =
    getMaxTextWidth();

  // Reduce font size if the longest
  // line is too wide.
  while (
    measuredWidth > maxTextWidth &&
    fontSize > height * 0.035
  ) {
    fontSize *= 0.95;

    measuredWidth =
      getMaxTextWidth();
  }

  // Apply final font
  ctx.font =
    `900 ${fontSize}px Arial`;

  const lineHeight =
    fontSize * 1.15;

  // --------------------------------------------------
  // TEXT ANIMATION
  // --------------------------------------------------

  const textProgress =
    easeOut(
      clamp((elapsed - 0.15) / 0.5)
    );

  ctx.globalAlpha =
    textProgress;

  ctx.fillStyle =
    style?.textColor || "#fff";

  // Center multiple lines vertically
  const totalTextHeight =
    lines.length * lineHeight;

  lines.forEach((line, index) => {
    const lineY =
      -totalTextHeight / 2 +
      lineHeight / 2 +
      index * lineHeight;

    ctx.fillText(
      line,
      cx,
      cy + lineY
    );
  });

  ctx.restore();
}
export function drawBlobPopCard(ctx, element, currentTime, aspectRatio) {
  let {
    text = "CREATE SOMETHING",
    x, y, width, height, start, style
  } = element;

  const {
    renderScaleX,
    renderScaleY,
    DISPLAY_WIDTH,
    DISPLAY_HEIGHT
  } = calculateScale(aspectRatio);

  x *= renderScaleX;
  y *= renderScaleY;
  width = DISPLAY_WIDTH * renderScaleX;
  height = DISPLAY_HEIGHT * renderScaleY;

  const elapsed = currentTime - start;

  if (elapsed < 0) return;

  const p = easeOut(clamp(elapsed / 1.0));

  ctx.save();

  const cx = x + width / 2;
  const cy = y + height / 2;

  // --------------------------------------------------
  // Background
  // --------------------------------------------------

  ctx.fillStyle =
    style?.background || "#101014";

  ctx.fillRect(
    x,
    y,
    width,
    height
  );

  // --------------------------------------------------
  // Text setup
  // --------------------------------------------------

  const fontSize =
    height * 0.13;

  const lineHeight =
    fontSize * 1.15;

  ctx.font =
    `900 ${fontSize}px Arial`;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lines =
    String(text).split("\n");

  // Measure widest line
  let maxTextWidth = 0;

  for (const line of lines) {

    const measuredWidth =
      ctx.measureText(line).width;

    maxTextWidth =
      Math.max(
        maxTextWidth,
        measuredWidth
      );
  }

  // --------------------------------------------------
  // Text block dimensions
  // --------------------------------------------------

  const horizontalPadding =
    width * 0.06;

  const verticalPadding =
    height * 0.04;

  const textWidth =
    maxTextWidth +
    horizontalPadding * 2;

  const textHeight =
    lines.length * lineHeight +
    verticalPadding * 2;

  // --------------------------------------------------
  // Large blob
  // --------------------------------------------------

  const blobScale =
    easeBack(clamp(elapsed / 0.7));

  ctx.save();

  ctx.translate(
    cx + width * 0.25,
    cy - height * 0.1
  );

  ctx.rotate(elapsed * 0.3);

  ctx.scale(
    blobScale,
    blobScale
  );

  ctx.fillStyle =
    style?.color1 || "#6366f1";

  ctx.beginPath();

  for (let i = 0; i <= 40; i++) {

    const angle =
      (i / 40) * Math.PI * 2;

    const radius =
      width * 0.22 +
      Math.sin(
        angle * 3 + elapsed * 2
      ) * width * 0.025 +
      Math.sin(angle * 5) *
        width * 0.015;

    const px =
      Math.cos(angle) * radius;

    const py =
      Math.sin(angle) * radius;

    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }

  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // --------------------------------------------------
  // Secondary blob
  // --------------------------------------------------

  ctx.save();

  ctx.translate(
    cx - width * 0.3,
    cy + height * 0.18
  );

  ctx.scale(
    p * 0.9,
    p * 0.9
  );

  ctx.fillStyle =
    style?.color2 || "#06b6d4";

  ctx.beginPath();

  ctx.arc(
    0,
    0,
    width * 0.11,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.restore();

  // --------------------------------------------------
  // Small floating circles
  // --------------------------------------------------

  for (let i = 0; i < 5; i++) {

    const angle =
      elapsed *
        (0.4 + i * 0.05) +
      i;

    const orbit =
      width *
      (0.18 + i * 0.025);

    const px =
      cx +
      Math.cos(angle) * orbit;

    const py =
      cy +
      Math.sin(angle) * orbit;

    ctx.globalAlpha = p;

    ctx.fillStyle =
      i % 2 === 0
        ? "#ffffff"
        : style?.accentColor || "#f472b6";

    ctx.beginPath();

    ctx.arc(
      px,
      py,
      width * 0.012,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  // --------------------------------------------------
  // Text
  // --------------------------------------------------

  ctx.globalAlpha = p;

  const textScale =
    easeBack(clamp(elapsed / 0.7));

  ctx.save();

  ctx.translate(
    cx,
    cy
  );

  ctx.scale(
    textScale,
    textScale
  );

  ctx.fillStyle =
    style?.textColor || "#ffffff";

  const totalTextHeight =
    lines.length * lineHeight;

  lines.forEach((line, index) => {

    const lineY =
      -totalTextHeight / 2 +
      lineHeight / 2 +
      index * lineHeight;

    ctx.fillText(
      line,
      0,
      lineY
    );
  });

  ctx.restore();

  ctx.restore();
}

export function drawLetterBlurFocusCard(ctx, element, currentTime, aspectRatio) {
  const { text = "IN FOCUS", x, y, width, height, elapsed, style } = setupCard(ctx, element, currentTime, aspectRatio);
  if (elapsed < 0) return;
  ctx.save();
  ctx.fillStyle = style.textColor || "#fff";
  ctx.font = `800 ${height * 0.16}px Arial`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const chars = [...text];
  const gap = height * 0.01;
  const widths = chars.map(c => ctx.measureText(c).width);
  const totalWidth = widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
  let cx = x + width / 2 - totalWidth / 2;
  chars.forEach((c, i) => {
    const e = easeOut(clamp((elapsed - i * 0.045) / 0.5));
    ctx.save();
    ctx.globalAlpha = e;
    ctx.filter = `blur(${lerp(14, 0, e)}px)`;
    ctx.translate(cx + widths[i] / 2, y + height / 2 + lerp(10, 0, e));
    ctx.fillText(c, 0, 0);
    ctx.restore();
    cx += widths[i] + gap;
  });
  ctx.restore();
}

export function drawGlassCard(ctx, element, currentTime, aspectRatio) {
  let {
    text = "Hello There!",
    x,
    y,
    width,
    height,
    start,
    style = {},
  } = element;

  const { renderScaleX, renderScaleY, DISPLAY_WIDTH, DISPLAY_HEIGHT } = calculateScale(aspectRatio);
  x *= renderScaleX;
  y *= renderScaleY;
  width = DISPLAY_WIDTH * renderScaleX;
  height = DISPLAY_HEIGHT * renderScaleY;

  const elapsed = currentTime - start;
  if (elapsed < 0) return;

  const duration = 1.2;
  const progress = Math.min(elapsed / duration, 1);

  // smoother easing
  const eased = 1 - Math.pow(1 - progress, 3);

  ctx.save();

  const cardW = width * 0.6;
  const cardH = height * 0.28;

  const cx = x + width / 2;
  const cy = y + height / 2 + (1 - eased) * 50;

  const cardX = cx - cardW / 2;
  const cardY = cy - cardH / 2;

  // subtle scale-in
  const scale = 0.95 + eased * 0.05;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);

  // ✨ GLASS BACK (very subtle)
  ctx.globalAlpha = 0.08 * eased;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, cardX, cardY, cardW, cardH, 20);
  ctx.fill();

  // ✨ BORDER (clean glass edge)
  ctx.globalAlpha = 0.25 * eased;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  roundRect(ctx, cardX, cardY, cardW, cardH, 20);
  ctx.stroke();

  // ✨ LINE REVEAL (top & bottom sweep)
  const lineProgress = Math.min(elapsed / 0.8, 1);
  const lineEase = 1 - Math.pow(1 - lineProgress, 3);
  const lineWidth = cardW * lineEase;

  ctx.globalAlpha = 0.6 * eased;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;

  // Top line
  ctx.beginPath();
  ctx.moveTo(cardX, cardY);
  ctx.lineTo(cardX + lineWidth, cardY);
  ctx.stroke();

  // Bottom line
  ctx.beginPath();
  ctx.moveTo(cardX + cardW, cardY + cardH);
  ctx.lineTo(cardX + cardW - lineWidth, cardY + cardH);
  ctx.stroke();

  // ✨ TEXT
  ctx.globalAlpha = eased;
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${cardH * 0.28}px ${"Arial"}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText(text, cx, cy);

  ctx.restore();
}

export function drawCinematicBars(ctx, element, currentTime, aspectRatio) {
  let { text = "Hello There!", x, y, width, height, start } = element;

  const { renderScaleX, renderScaleY, DISPLAY_WIDTH, DISPLAY_HEIGHT } = calculateScale(aspectRatio);

  x *= renderScaleX;
  y *= renderScaleY;
  width = DISPLAY_WIDTH * renderScaleX;
  height = DISPLAY_HEIGHT * renderScaleY;

  const elapsed = currentTime - start;
  if (elapsed < 0) return;

  const duration = 1;
  const progress = Math.min(elapsed / duration, 1);
  const eased = 1 - Math.pow(1 - progress, 3);

  ctx.save();

  const barH = eased * height * 0.15;

  ctx.fillStyle = "#000";
  ctx.fillRect(x, y, width, barH);
  ctx.fillRect(x, y + height - barH, width, barH);

  ctx.globalAlpha = 0.4 * eased;
  ctx.fillRect(x, y, width, height);

  ctx.globalAlpha = eased;
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${height * 0.12}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const scale = 0.8 + eased * 0.2;

  ctx.translate(x + width / 2, y + height / 2);
  ctx.scale(scale, scale);
  ctx.fillText(text, 0, 0);

  ctx.restore();
}

export function drawSpotlightReveal(ctx, element, currentTime, aspectRatio) {
  let { text = "Hello There!", x, y, width, height, start } = element;

  const { renderScaleX, renderScaleY, DISPLAY_WIDTH, DISPLAY_HEIGHT } = calculateScale(aspectRatio);

  x *= renderScaleX;
  y *= renderScaleY;
  width = DISPLAY_WIDTH * renderScaleX;
  height = DISPLAY_HEIGHT * renderScaleY;

  const elapsed = currentTime - start;
  if (elapsed < 0) return;

  const duration = 1.2;
  const progress = Math.min(elapsed / duration, 1);
  const eased = 1 - Math.pow(1 - progress, 3);

  ctx.save();

  // Dark background
  ctx.fillStyle = "#000";
  ctx.fillRect(x, y, width, height);

  // Spotlight mask
  const cx = x + width / 2;
  const cy = y + height / 2;

  const radius = eased * Math.max(width, height);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  // Revealed content (light bg)
  ctx.fillStyle = "#111";
  ctx.fillRect(x, y, width, height);

  ctx.restore();

  // Text
  ctx.globalAlpha = eased;
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${height * 0.12}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy);

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export const titleCardTypes = Object.freeze({
  RETRO_SCAN_CARD: "retroScanCard",
  PINK_BUBBLE_CARD: "pinkBubbleCard",
  CUTE_SCRAP_BOOK_CARD: "cuteScrapBookCard",
  CONFETTI_TITLE_CARD: "confettiTitleCard",
  NEON_FRAME_CARD: "neonFrameCard",
  PARTICLE_BURST_CARD: "particleBurstCard",
  BLOB_POP_CARD: "blobPopCard",
  LETTER_BURST_FOCUS_CARD: "letterBurstFocusCard",
  GLASS_CARD: "glassCard",
  CINEMATIC_BARS: "cinematicBars",
  SPOTLIGHT_REVEAL: "spotlightReveal",
});

// lowerthirds
export function drawLowerThirdSlide(ctx, element, currentTime, aspectRatio) {
  let { text = "Your Name", start } = element;

  const elapsed = currentTime - start;
  if (elapsed < 0) return;

  const progress = Math.min(elapsed / 0.8, 1);
  const eased = 1 - Math.pow(1 - progress, 3);

  ctx.save();
  const { renderScaleX, renderScaleY, DISPLAY_WIDTH, DISPLAY_HEIGHT } =
    calculateScale(aspectRatio);

  const W = DISPLAY_WIDTH * renderScaleX;
  const H = DISPLAY_HEIGHT * renderScaleY;

  const margin = 40 * renderScaleX;
  const x = margin + (1 - eased) * -150;
  const y = H - 90 * renderScaleY;

  const height = 56 * renderScaleY;
  const padding = 20 * renderScaleX;

  const fontSize = Math.max(18, H * 0.035);
  ctx.font = `bold ${fontSize}px Arial`;

  const textW = ctx.measureText(text).width;
  const boxW = textW + padding * 2;

  // Background
  ctx.globalAlpha = 0.85 * eased;
  roundRect(ctx, x, y, boxW, height, 14);
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fill();

  // Text
  ctx.globalAlpha = eased;
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + padding, y + height / 2);

  ctx.restore();
}

export function drawLowerThirdLine(ctx, element, currentTime, aspectRatio) {
  let { text = "Your Title", start } = element;

  const elapsed = currentTime - start;
  if (elapsed < 0) return;

  const duration = 1;
  const progress = Math.min(elapsed / duration, 1);
  const eased = 1 - Math.pow(1 - progress, 3);

  ctx.save();
  const { renderScaleX, renderScaleY, DISPLAY_WIDTH, DISPLAY_HEIGHT } =
    calculateScale(aspectRatio);

  // ✅ Responsive base
  const width = DISPLAY_WIDTH * renderScaleX;
  const height = DISPLAY_HEIGHT * renderScaleY;

  // ✅ Bottom-left positioning
  const margin = 40 * renderScaleX;
  const x = margin;
  const y = height - 60 * renderScaleY;

  // ✅ Responsive font size
  const fontSize = Math.max(86, height * 0.04);
  ctx.font = `bold ${fontSize}px Arial`;

  const textW = ctx.measureText(text).width;

  // ✨ Line reveal
  const lineW = textW * eased;

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(x, y + fontSize * 0.8);
  ctx.lineTo(x + lineW, y + fontSize * 0.5);
  ctx.stroke();

  // ✨ Text
  ctx.globalAlpha = eased;
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "top";
  ctx.fillText(text, x, y);

  ctx.restore();
}

const linkedInLogoImg = new Image();
linkedInLogoImg.src =
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linkedin/linkedin-original.svg";

export function drawLinkedInLowerThird(ctx, element, currentTime, aspectRatio) {
  let { text = "Your Name", start } = element;

  const elapsed = currentTime - start;
  if (elapsed < 0) return;

  const progress = Math.min(elapsed / 1, 1);
  const eased = 1 - Math.pow(1 - progress, 3);

  ctx.save();
  const { renderScaleX, renderScaleY, DISPLAY_WIDTH, DISPLAY_HEIGHT } =
    calculateScale(aspectRatio);
  // ✅ Base dimensions
  const W = DISPLAY_WIDTH * renderScaleX;
  const H = DISPLAY_HEIGHT * renderScaleY;

  const margin = 40 * renderScaleX;
  const x = margin + (1 - eased) * -120; // slide in
  const y = H - 90 * renderScaleY;

  const height = 56 * renderScaleY;
  const padding = 18 * renderScaleX;
  const logoSize = 30 * renderScaleY;

  const fontSize = Math.max(18, H * 0.035);
  ctx.font = `bold ${fontSize}px Arial`;

  const textW = ctx.measureText(text).width;
  const boxW = logoSize + 14 + textW + padding * 2;

  // Background
  ctx.globalAlpha = 0.95 * eased;
  roundRect(ctx, x, y, boxW, height, 16);
  ctx.fillStyle = "#0A66C2";
  ctx.fill();

  // Logo
  ctx.save();
  const angle = (1 - eased) * Math.PI * 2;
  const scale = 0.8 + eased * 0.2;

  ctx.translate(x + padding + logoSize / 2, y + height / 2);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  if (linkedInLogoImg.complete) {
    ctx.drawImage(
      linkedInLogoImg,
      -logoSize / 2,
      -logoSize / 2,
      logoSize,
      logoSize,
    );
  }
  ctx.restore();

  // Divider
  ctx.globalAlpha = 0.4 * eased;
  ctx.beginPath();
  ctx.moveTo(x + padding + logoSize + 8, y + 12);
  ctx.lineTo(x + padding + logoSize + 8, y + height - 12);
  ctx.strokeStyle = "#fff";
  ctx.stroke();

  // Text reveal
  ctx.save();
  const revealW = textW * eased;
  ctx.rect(x + padding + logoSize + 16, y, revealW, height);
  ctx.clip();

  ctx.globalAlpha = eased;
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + padding + logoSize + 16, y + height / 2);

  ctx.restore();
  ctx.restore();
}

const githubLogoImg = new Image();
githubLogoImg.src =
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg";

export function drawGithubLowerThird(ctx, element, currentTime, aspectRatio) {
  let { text = "@username", start } = element;

  const elapsed = currentTime - start;
  if (elapsed < 0) return;

  const progress = Math.min(elapsed / 1, 1);
  const eased = 1 - Math.pow(1 - progress, 3);

  ctx.save();
  const { renderScaleX, renderScaleY, DISPLAY_WIDTH, DISPLAY_HEIGHT } =
    calculateScale(aspectRatio);

  const W = DISPLAY_WIDTH * renderScaleX;
  const H = DISPLAY_HEIGHT * renderScaleY;

  const margin = 40 * renderScaleX;
  const x = margin + (1 - eased) * -120;
  const y = H - 90 * renderScaleY;

  const height = 56 * renderScaleY;
  const padding = 18 * renderScaleX;
  const logoSize = 30 * renderScaleY;

  const fontSize = Math.max(18, H * 0.035);
  ctx.font = `bold ${fontSize}px Arial`;

  const textW = ctx.measureText(text).width;
  const boxW = logoSize + 14 + textW + padding * 2;

  // Background
  ctx.globalAlpha = 0.9 * eased;
  roundRect(ctx, x, y, boxW, height, 16);
  ctx.fillStyle = "#111";
  ctx.fill();

  // Border
  ctx.globalAlpha = 0.2 * eased;
  ctx.strokeStyle = "#fff";
  ctx.stroke();

  // Logo
  // Logo
  ctx.save();

  const angle = (1 - eased) * Math.PI * 2;
  const scale = 0.8 + eased * 0.2;

  const logoCX = x + padding + logoSize / 2;
  const logoCY = y + height / 2;

  ctx.translate(logoCX, logoCY);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  // ✅ White circle background (fix visibility)
  ctx.globalAlpha = eased;
  ctx.beginPath();
  ctx.arc(0, 0, logoSize * 0.7, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // ✅ Draw logo on top
  if (githubLogoImg.complete) {
    ctx.drawImage(
      githubLogoImg,
      -logoSize / 2,
      -logoSize / 2,
      logoSize,
      logoSize,
    );
  }

  ctx.restore();
  // Divider
  ctx.globalAlpha = 0.3 * eased;
  ctx.beginPath();
  ctx.moveTo(x + padding + logoSize + 8, y + 12);
  ctx.lineTo(x + padding + logoSize + 8, y + height - 12);
  ctx.stroke();

  // Text
  ctx.save();
  const revealW = textW * eased;
  ctx.rect(x + padding + logoSize + 16, y, revealW, height);
  ctx.clip();

  ctx.globalAlpha = eased;
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + padding + logoSize + 16, y + height / 2);

  ctx.restore();
  ctx.restore();
}

export const lowerThirdTypes = Object.freeze({
  SLIDE: "slide",
  LINE: "line",
  LINKEDIN: "linkedin",
  GITHUB: "github",
});
