// Pure, stateless cursor math (times in ms). Everything is a function of (data, time) so scrubbing,
// pausing and exporting always produce the same frame.

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function findIdx(samples, t) { // last index with samples[i].t <= t, else -1
  let lo = 0, hi = samples.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

function rawPos(seg, t) {
  const s = seg.samples;
  if (!s.length) return null;
  if (t <= s[0].t) return { x: s[0].x, y: s[0].y };
  const i = findIdx(s, t);
  if (i >= s.length - 1) return { x: s[s.length - 1].x, y: s[s.length - 1].y };
  const a = s[i], b = s[i + 1];
  const k = (t - a.t) / Math.max(1, b.t - a.t);
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}

// Symmetric triangular low-pass: removes hand jitter without adding lag.
function smoothPos(seg, t, halfWindowMs) {
  if (halfWindowMs <= 1) return rawPos(seg, t);
  const taps = 9;
  let sx = 0, sy = 0, sw = 0;
  for (let i = 0; i < taps; i++) {
    const u = (i / (taps - 1)) * 2 - 1;           // -1..1
    const w = 1 - Math.abs(u) + 0.05;
    const tt = clamp(t + u * halfWindowMs, seg.start, seg.end);
    const p = rawPos(seg, tt);
    sx += p.x * w; sy += p.y * w; sw += w;
  }
  return { x: sx / sw, y: sy / sw };
}

function typeAt(seg, t) {
  const i = findIdx(seg.samples, t);
  return seg.samples[i < 0 ? 0 : i].type || 'arrow';
}

const FADE_MS = 160;
function activeSegment(segments, t) {
  for (const seg of segments) {
    if (t >= seg.start && t <= seg.end && seg.samples.length) {
      const alpha = clamp(Math.min((t - seg.start) / FADE_MS, (seg.end - t) / FADE_MS), 0, 1);
      return { seg, alpha: Math.max(alpha, 0.001) };
    }
  }
  return null;
}

function hash(n) { // deterministic 0..1
  n = (n ^ 61) ^ (n >>> 16);
  n = (n + (n << 3)) | 0;
  n = n ^ (n >>> 4);
  n = Math.imul(n, 0x27d4eb2d);
  n = n ^ (n >>> 15);
  return (n >>> 0) / 4294967296;
}

/**
 * Sparkles left behind a moving cursor. A sparkle is "born" every STEP ms (if the
 * cursor was moving and the hash says so) and lives `life` ms - so we can rebuild
 * the full trail for any time t without keeping state.
 * Offsets/sizes are in cursor units; multiply by the on-screen unit when drawing.
 */
const STEP = 22;
function glitter(seg, t, o) {
  const out = [];
  const n = Math.ceil(o.life / STEP);
  const base = Math.floor(t / STEP);
  for (let i = 0; i < n; i++) {
    const idx = base - i;
    const tau = idx * STEP;
    const age = t - tau;
    if (tau < seg.start || tau > seg.end || age < 0 || age > o.life) continue;
    if (hash(idx * 4 + 1) > o.density) continue;
    const a = rawPos(seg, tau), b = rawPos(seg, tau - STEP * 2);
    if (Math.hypot(a.x - b.x, a.y - b.y) < 0.0007) continue;       // only while moving
    const p = smoothPos(seg, tau, o.smoothMs);
    const k = age / o.life;
    const ang = hash(idx * 4 + 2) * Math.PI * 2;
    const rad = (3 + hash(idx * 4 + 3) * 11) * (1 + k * 0.9);
    out.push({
      x: p.x, y: p.y,
      ox: Math.cos(ang) * rad,
      oy: Math.sin(ang) * rad + k * 16,                            // drifts down as it fades
      size: (2.8 + hash(idx * 4 + 4) * 4.4) * (1 - k * 0.45) * o.size,
      rot: hash(idx * 5 + 7) * Math.PI + k * 1.4,
      alpha: Math.pow(1 - k, 1.5),
      tone: hash(idx * 7 + 5),
    });
  }
  return out;
}

function ripples(seg, t, lifeMs) {
  const out = [];
  for (const c of seg.clicks || []) {
    const age = t - c.t;
    if (age >= 0 && age <= lifeMs) out.push({ x: c.x, y: c.y, k: age / lifeMs });
  }
  return out;
}

function pressScale(seg, t) { // tiny "squash" while a click is fresh
  for (const c of seg.clicks || []) {
    const age = t - c.t;
    if (age >= 0 && age < 140) return 1 - 0.14 * Math.sin((age / 140) * Math.PI);
  }
  return 1;
}


export { findIdx, rawPos, smoothPos, typeAt, activeSegment, glitter, ripples, pressScale, hash };
