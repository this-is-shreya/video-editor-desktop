// Draws one frame of a `type: "cursor"` zoom: a window of the screen video that follows the cursor,
// eased in/out, with the custom cursor / glitter / ripples on top.
// Kept out of App.jsx so it can be tested without the editor.
import { getCursorPoint, drawCursorOverlay } from "./overlay";

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const IN_SEC = 1.0;
const OUT_SEC = 0.6;

/** 0 = full frame, 1 = fully zoomed on the cursor. */
export function cursorZoomAmount(zoom, t) {
  const tin = clamp((t - zoom.start) / IN_SEC, 0, 1);
  const tout = clamp((zoom.end - t) / OUT_SEC, 0, 1);
  const easeIn = 1 - Math.pow(1 - tin, 3);          // easeOutCubic
  const easeOut = tout * tout * (3 - 2 * tout);     // smoothstep
  return Math.min(easeIn, easeOut);
}

/**
 * crop      : { sx, sy, sw, sh } - source rect in video pixels (the whole frame unless the clip is cropped)
 * renderRect: { x, y, width, height } - where the clip sits on the canvas
 * returns false when there is nothing to draw (caller falls back to the normal draw)
 */
export function drawCursorZoomFrame(ctx, { video, crop, renderRect, zoom, currentTime, style }) {
  const point = getCursorPoint(zoom, currentTime, style);
  if (!point) return false;
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) return false;

  const { sx, sy, sw, sh } = crop;
  const e = cursorZoomAmount(zoom, currentTime);
  const f = 1 + ((zoom.scale || 1.2) - 1) * e;       // current zoom factor
  const srcW = sw / f, srcH = sh / f;

  // Window position: full frame at e=0; at e=1 the cursor sits 1/3 across and 1/4 down.
  const cx = point.x * vw, cy = point.y * vh;
  let x = sx + (cx - srcW / 3 - sx) * e;
  let y = sy + (cy - srcH / 4 - sy) * e;
  x = clamp(x, sx, sx + sw - srcW);                  // never pan past the edge of the video
  y = clamp(y, sy, sy + sh - srcH);

  ctx.save();
  ctx.drawImage(video, x, y, srcW, srcH, renderRect.x, renderRect.y, renderRect.width, renderRect.height);

  ctx.beginPath();
  ctx.rect(renderRect.x, renderRect.y, renderRect.width, renderRect.height);
  ctx.clip();                                        // sparkles never spill outside the video
  drawCursorOverlay(ctx, {
    zoom, timeSec: currentTime, style, zoomFactor: f, unitBase: renderRect.width / 1920,
    project: (nx, ny) => ({
      x: renderRect.x + ((nx * vw - x) / srcW) * renderRect.width,
      y: renderRect.y + ((ny * vh - y) / srcH) * renderRect.height,
    }),
  });
  ctx.restore();
  return true;
}
