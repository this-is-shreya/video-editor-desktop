'use strict';
const { EventEmitter } = require('events');

const SAMPLE_MS = 16;      // max ~60 samples / second
const DOUBLE_DIST_PX = 10; // two presses further apart than this are not a double-click

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const r4 = (v) => Math.round(v * 10000) / 10000;
const fmt = (ms) => {
  const s = Math.floor(ms / 1000);
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
};

/**
 * Records the cursor while the user is "tracking".
 *   double-click  -> start tracking   (marker event + new segment)
 *   double-click  -> stop tracking    (marker event, segment closed)
 * Positions are normalized to the captured display (0..1) so they are
 * independent of screen size / DPI.
 *
 * Dependencies are injected so the logic can be unit-tested without Electron:
 *   getPoint() -> {x,y} in the same units as bounds
 *   native     -> { primaryButtonDown(), getCursorType(), getDoubleClickTime() } | null
 *   now()      -> ms
 */
class CursorTracker extends EventEmitter {
  constructor({ getPoint, native = null, now = Date.now }) {
    super();
    this.getPoint = getPoint;
    this.native = native;
    this.now = now;
    this.timer = null;
  }

  /** opts.startedAt: epoch ms of video time 0 (so cursor times line up with a capture that started a moment ago). */
  start(bounds, opts = {}) {
    this.bounds = bounds;
    this.t0 = opts.startedAt != null ? opts.startedAt : this.now();
    this.events = [];
    this.segments = [];
    this.cur = null;
    this.prevDown = false;
    this.lastPress = null;
    this.lastSample = null;
    this.track = { samples: [], clicks: [] };   // the whole recording, independent of double-click segments
    this.trackLast = null;
    this.tick = 0;
    this.type = 'arrow';
    this.dblMs = this.native ? this.native.getDoubleClickTime() : 500;
    clearInterval(this.timer);
    this.timer = setInterval(() => this.poll(), 8);
  }

  get active() { return !!this.cur; }

  _norm(p) {
    const b = this.bounds;
    return { x: clamp01((p.x - b.x) / b.width), y: clamp01((p.y - b.y) / b.height) };
  }

  poll() {
    const t = this.now() - this.t0;
    const p = this.getPoint();
    const n = this._norm(p);
    if (this.native) {
      if (this.tick++ % 3 === 0) this.type = this.native.getCursorType();
      const down = this.native.primaryButtonDown();
      if (down && !this.prevDown) this._onPress(t, p, n);
      this.prevDown = down;
    }
    this._record(this.track.samples, 'trackLast', t, n, !this.trackLast);
    if (this.cur) this._sample(t, n);
  }

  _onPress(t, p, n) {
    this.track.clicks.push({ t: Math.round(t), x: r4(n.x), y: r4(n.y) });
    const lp = this.lastPress;
    const isDouble = lp && t - lp.t <= this.dblMs &&
      Math.hypot(p.x - lp.p.x, p.y - lp.p.y) <= DOUBLE_DIST_PX;
    if (isDouble) {
      this.lastPress = null;
      this._toggle(t, n, lp.t);
    } else {
      this.lastPress = { t, p };
      if (this.cur) this.cur.clicks.push({ t, x: r4(n.x), y: r4(n.y) });
    }
  }

  /** Manual toggle (hotkey fallback). */
  toggleNow() {
    const t = this.now() - this.t0;
    this._toggle(t, this._norm(this.getPoint()), t);
  }

  _toggle(t, n, firstPressT) {
    let action;
    if (!this.cur) {
      this.cur = { start: t, end: null, samples: [], clicks: [] };
      this.lastSample = null;
      this._sample(t, n, true);
      action = 'start';
    } else {
      this._finishSegment(firstPressT);
      action = 'stop';
    }
    const event = {
      time: fmt(t),
      coordinate: { x: r4(n.x), y: r4(n.y) },
      type: this.type === 'hidden' ? 'arrow' : this.type,
      action,
      ms: Math.round(t),
    };
    this.events.push(event);
    this.emit('toggle', { active: !!this.cur, event });
  }

  _finishSegment(end) {
    const seg = this.cur;
    // End at the first click of the closing double-click so no stray click ripple shows.
    seg.end = Math.round(Math.max(seg.start, end));
    seg.start = Math.round(seg.start);
    seg.samples = seg.samples.filter((s) => s.t <= seg.end);
    seg.clicks = seg.clicks.filter((c) => c.t < seg.end);
    const last = seg.samples[seg.samples.length - 1];
    if (last && last.t < seg.end) seg.samples.push({ ...last, t: seg.end });
    this.segments.push(seg);
    this.cur = null;
  }

  _sample(t, n, force = false) {
    this._record(this.cur.samples, 'lastSample', t, n, force);
  }

  // Appends a sample to `list` (throttled, only on change). `key` names the "last sample" slot on this.
  _record(list, key, t, n, force = false) {
    const ls = this[key];
    const x = r4(n.x), y = r4(n.y);
    const type = this.type === 'hidden' ? (ls ? ls.type : 'arrow') : this.type;
    if (!force && ls) {
      if (t - ls.t < SAMPLE_MS) return;
      if (ls.x === x && ls.y === y && ls.type === type) return;
      // After idling, pin the previous position so interpolation doesn't glide across the idle gap.
      if (t - ls.t > 3 * SAMPLE_MS) {
        list.push({ t: Math.round(t - SAMPLE_MS), x: ls.x, y: ls.y, type: ls.type });
      }
    }
    const s = { t: Math.round(t), x, y, type };
    list.push(s);
    this[key] = s;
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    const t = this.now() - this.t0;
    if (this.cur) this._finishSegment(t);
    const last = this.trackLast;
    if (last && last.t < t) this.track.samples.push({ ...last, t: Math.round(t) });
    return { events: this.events, segments: this.segments, track: this.track, durationMs: Math.round(t) };
  }
}

module.exports = { CursorTracker, fmt };