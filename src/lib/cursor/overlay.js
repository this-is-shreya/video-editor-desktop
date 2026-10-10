// Cursor overlay for the canvas editor.
// Works directly on your existing `type: "cursor"` zoom objects:
//   { id, type:"cursor", start, end, scale, maxScale, points:[{time,x,y,type}], clicks:[{time,x,y}] }
// (time/start/end in timeline SECONDS, x/y normalized 0..1 over the recorded screen)
import * as E from "./engine";
import { drawCursor, drawSparkle, sparkleColor } from "./sprites";

export const DEFAULT_CURSOR_STYLE = {
  enabled: true,
  style: "black",            // black | white | accent
  accent: "#5ab0ff",
  size: 1,
  adaptive: true,            // cursor shape follows the recorded system cursor type
  smoothing: 0.5,            // 0..1  (also smooths the zoom camera, so both stay in step)
  ripple: true,
  delayMs: 0,                // shift cursor vs. video if they ever drift
  followZoom: true,          // cursor grows with the zoom level, like a real recorded cursor
  glitter: { enabled: true, color: "gold", density: 0.7, life: 700, size: 1 },
};

const LS_KEY = "cursorStyle.v1";
export function loadCursorStyle() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    return { ...DEFAULT_CURSOR_STYLE, ...saved, glitter: { ...DEFAULT_CURSOR_STYLE.glitter, ...(saved.glitter || {}) } };
  } catch {
    return DEFAULT_CURSOR_STYLE;
  }
}
export function saveCursorStyle(style) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(style)); } catch { /* ignore */ }
}

// zoom -> engine segment (ms). Cached per `points` array so we convert once, not per frame.
const cache = new WeakMap();
function toSegment(zoom) {
  let c = cache.get(zoom.points);
  if (!c) {
    c = {
      samples: zoom.points.map((p) => ({ t: p.time * 1000, x: p.x, y: p.y, type: p.type || "arrow" })),
      clicks: (zoom.clicks || []).map((k) => ({ t: k.time * 1000, x: k.x, y: k.y })),
    };
    cache.set(zoom.points, c);
  }
  return { start: zoom.start * 1000, end: zoom.end * 1000, samples: c.samples, clicks: c.clicks };
}

/** Smoothed cursor position {x,y} (0..1) at `timeSec`. Use for BOTH the zoom camera and the overlay. */
export function getCursorPoint(zoom, timeSec, style = DEFAULT_CURSOR_STYLE) {
  if (!zoom?.points?.length) return null;
  const seg = toSegment(zoom);
  const t = Math.min(seg.end, Math.max(seg.start, timeSec * 1000 - (style.delayMs || 0)));
  return E.smoothPos(seg, t, (style.smoothing || 0) * 140);
}

/**
 * Draw sparkles, click ripples and the cursor.
 *  project(nx, ny) -> {x, y} : maps a normalized screen point to canvas pixels
 *  unitBase        : canvasWidth / 1920 (keeps the cursor the same visual size on any canvas)
 *  zoomFactor      : current zoom level, so the cursor scales with the zoom
 */
// export function drawCursorOverlay(ctx, { zoom, timeSec, style, project, unitBase = 1, zoomFactor = 1 }) {
//   if (!style?.enabled || !zoom?.points?.length) return;
//   const seg = toSegment(zoom);
//   const ct = timeSec * 1000 - (style.delayMs || 0);
//   const hit = E.activeSegment([seg], ct);
//   if (!hit) return;

//   const unit = unitBase * 1.8 * style.size * (style.followZoom ? zoomFactor : 1);
//   const smoothMs = style.smoothing * 140;
//   const pos = E.smoothPos(seg, ct, smoothMs);
//   const g = style.glitter;

//   ctx.save();
//   ctx.globalAlpha *= hit.alpha;

//   if (g.enabled) {
//     for (const p of E.glitter(seg, ct, { life: g.life, density: g.density, size: g.size, smoothMs })) {
//       const q = project(p.x, p.y);
//       drawSparkle(ctx, q.x + p.ox * unit, q.y + p.oy * unit, p.size * unit, p.rot, sparkleColor(g.color, p.tone, style.accent), p.alpha);
//     }
//   }
//   if (style.ripple) {
//     for (const r of E.ripples(seg, ct, 480)) {
//       const q = project(r.x, r.y);
//       ctx.save();
//       ctx.globalAlpha *= (1 - r.k) * 0.9;
//       ctx.beginPath();
//       ctx.arc(q.x, q.y, (8 + 34 * r.k) * unit, 0, Math.PI * 2);
//       ctx.fillStyle = style.accent + "33";
//       ctx.fill();
//       ctx.lineWidth = (3.2 * (1 - r.k) + 0.8) * unit;
//       ctx.strokeStyle = style.accent;
//       ctx.stroke();
//       ctx.restore();
//     }
//   }
//   const q = project(pos.x, pos.y);
//   drawCursor(ctx, E.typeAt(seg, ct), q.x, q.y, {
//     style: style.style, accent: style.accent, unit, adaptive: style.adaptive,
//     scale: E.pressScale(seg, ct), timeMs: timeSec * 1000,
//   });
//   ctx.restore();
// }

export function drawCursorOverlay(
  ctx,
  {
    zoom,
    timeSec,
    style,
    project,
    unitBase = 1,
    zoomFactor = 1,
    speed = 1,
  }
) {
  if (!style?.enabled || !zoom?.points?.length) return;
console.log("speed is", speed)
  const seg = toSegment(zoom);

  // Advance cursor animation faster/slower with the video.
  const cursorTimeSec = timeSec * speed;
  const ct = cursorTimeSec * 1000 - (style.delayMs || 0);

  const hit = E.activeSegment([seg], ct);
  if (!hit) return;

  const unit = unitBase * 1.8 * style.size *
    (style.followZoom ? zoomFactor : 1);

  const smoothMs = style.smoothing * 140;
  const pos = E.smoothPos(seg, ct, smoothMs);
  const g = style.glitter;

  ctx.save();
  ctx.globalAlpha *= hit.alpha;

  if (g.enabled) {
    for (const p of E.glitter(seg, ct, {
      life: g.life,
      density: g.density,
      size: g.size,
      smoothMs,
    })) {
      const q = project(p.x, p.y);
      drawSparkle(
        ctx,
        q.x + p.ox * unit,
        q.y + p.oy * unit,
        p.size * unit,
        p.rot,
        sparkleColor(g.color, p.tone, style.accent),
        p.alpha
      );
    }
  }

  if (style.ripple) {
    for (const r of E.ripples(seg, ct, 480)) {
      const q = project(r.x, r.y);

      ctx.save();
      ctx.globalAlpha *= (1 - r.k) * 0.9;
      ctx.beginPath();
      ctx.arc(q.x, q.y, (8 + 34 * r.k) * unit, 0, Math.PI * 2);
      ctx.fillStyle = style.accent + "33";
      ctx.fill();
      ctx.lineWidth = (3.2 * (1 - r.k) + 0.8) * unit;
      ctx.strokeStyle = style.accent;
      ctx.stroke();
      ctx.restore();
    }
  }

  const q = project(pos.x, pos.y);

  drawCursor(ctx, E.typeAt(seg, ct), q.x, q.y, {
    style: style.style,
    accent: style.accent,
    unit,
    adaptive: style.adaptive,
    scale: E.pressScale(seg, ct),
    timeMs: cursorTimeSec * 1000,
  });

  ctx.restore();
}
