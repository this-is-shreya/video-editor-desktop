// Cursor-follow zoom as a CANVAS-LEVEL camera - the same idea as the normal zoom in drawFrame:
// the whole composed scene (background, styled/cropped screen video, ...) is scaled, so after zooming in
// the picture still fills the entire preview. Only the camera position differs: it follows the cursor.
import { getCursorPoint, drawCursorOverlay } from "./overlay";

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const ZOOM_IN_SEC = 1.2;   // glide in, then start following
const ZOOM_OUT_SEC = 1.2;  // glide back out
const CAMERA_SMOOTH = 2.0; // camera looks ~280 ms around each moment, so it floats instead of jittering

/** 0 = full frame, 1 = fully zoomed. Smooth at both ends (zero speed at start and finish). */
export function cursorZoomAmount(zoom, t) {
  const tin = clamp((t - zoom.start) / ZOOM_IN_SEC, 0, 1);
  const tout = clamp((zoom.end - t) / ZOOM_OUT_SEC, 0, 1);
  return Math.min(easeInOut(tin), easeInOut(tout));
}

/**
 * Where the screen clip is on the canvas, and how a normalized cursor point (0..1 of the recorded screen)
 * maps onto it - honouring the clip's position/size and its crop.
 */
export function getScreenMapping(video, el, { DISPLAY_WIDTH, DISPLAY_HEIGHT, renderScaleX, renderScaleY }) {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) return null;
  let sx = 0, sy = 0, sw = vw, sh = vh;
  if (el.crop) {
    const kx = vw / DISPLAY_WIDTH, ky = vh / DISPLAY_HEIGHT;
    sx = el.crop.x * kx; sy = el.crop.y * ky; sw = el.crop.width * kx; sh = el.crop.height * ky;
  }
  const rect = { x: el.x * renderScaleX, y: el.y * renderScaleY, width: el.width * renderScaleX, height: el.height * renderScaleY };
  return {
    rect,
    toCanvas: (nx, ny) => ({
      x: rect.x + ((nx * vw - sx) / sw) * rect.width,
      y: rect.y + ((ny * vh - sy) / sh) * rect.height,
    }),
  };
}

/**
 * Camera for this instant. Apply with:  ctx.save(); ctx.translate(cam.tx, cam.ty); ctx.scale(cam.scale, cam.scale);
 * (a point p on the canvas is drawn at  p * scale + t). The view never leaves the canvas, so no empty edges.
 */
export function getCursorCamera({ zoom, currentTime, style, canvasW, canvasH, toCanvas }) {
  const e = cursorZoomAmount(zoom, currentTime);
  const scale = 1 + ((zoom.scale || 1.2) - 1) * e;

  const p = getCursorPoint(zoom, currentTime, { smoothing: CAMERA_SMOOTH, delayMs: style?.delayMs || 0 });
  const c = p ? toCanvas(p.x, p.y) : { x: canvasW / 2, y: canvasH / 2 };

  // At full zoom the cursor sits 1/3 across and 1/4 down the view; at e = 0 the view is the whole canvas.
  const viewW = canvasW / scale, viewH = canvasH / scale;
  let vx = (c.x - viewW / 3) * e;
  let vy = (c.y - viewH / 4) * e;
  vx = clamp(vx, 0, canvasW - viewW);
  vy = clamp(vy, 0, canvasH - viewH);

  return { scale, tx: -vx * scale, ty: -vy * scale, amount: e };
}

/** Cursor, glitter trail and click ripples, in scene coordinates (draw after the screen video, inside the camera transform). */
export function drawCursorForCamera(ctx, { zoom, currentTime, style, cam, mapping, speed }) {
  drawCursorOverlay(ctx, {
    zoom,
    timeSec: currentTime,
    style,
    zoomFactor: 1,  // the camera transform already enlarges the cursor...
    unitBase: (mapping.rect.width / 1920) * (style.followZoom ? 1 : 1 / cam.scale), // ...unless "Grow with zoom" is off
    project: mapping.toCanvas,
    speed:speed
  });
}