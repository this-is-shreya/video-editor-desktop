// Electron tracker output  ->  entries for your `zooms` array.
//
// tracker segment (ms, relative to recording start)        zoom entry (timeline seconds)
// { start, end, samples:[{t,x,y,type}], clicks:[{t,x,y}] }  { type:"cursor", start, end, scale, points:[{time,x,y,type}], clicks:[{time,x,y}] }
//
// offsetSec    = where the recorded screen clip starts on the timeline
// syncOffsetMs = nudge if the cursor leads/trails the video (positive = cursor later)
export function cursorSegmentsToZooms(segments, { offsetSec = 0, scale = 1.2, maxScale = 2.0, syncOffsetMs = 0 } = {}, videoId) {
  const sec = (ms) => offsetSec + (ms + syncOffsetMs) / 1000;
  const base = Date.now();
  return (segments || [])
    .filter((s) => s.samples?.length >= 2 && s.end > s.start)
    .map((s, i) => ({
      id: base + i,
      parentVideoId: videoId,
      type: "cursor",
      start: sec(s.start),
      end: sec(s.end),
      originalStart: sec(s.start),
      originalEnd: sec(s.end),
      scale,
      maxScale,
      x: 0, y: 0, w: 1, h: 1,            // identity rect: if anything treats this as a normal zoom, it is a no-op
      points: s.samples.map((p) => ({ time: sec(p.t), x: p.x, y: p.y, type: p.type })),
      clicks: (s.clicks || []).map((c) => ({ time: sec(c.t), x: c.x, y: c.y })),
    }));
}

/** True if [start,end] overlaps any existing zoom (your timeline forbids overlapping zooms). */
export function overlapsExisting(zooms, start, end) {
  return zooms.some((z) => start < z.end && end > z.start);
}

/**
 * Whole-recording cursor path -> a zoom-like object in CLIP (video) time, in seconds.
 * Keep it OUTSIDE `elements`/`zooms` (e.g. cursorTracks[element.source]) so undo snapshots stay small.
 * The editor looks it up with the clip's own time, (trimLeft + (currentTime - start) * speed), so the
 * cursor stays glued to the video when the clip is trimmed, moved, sped up or split.
 */
export function cursorTrackToOverlay(track, durationMs, videoId, { syncOffsetMs = 0 } = {}) {
  const sec = (ms) => (ms + syncOffsetMs) / 1000;
  const samples = track?.samples || [];
  return {
    start: 0,
    end: Math.max(sec(durationMs || 0), samples.length ? sec(samples[samples.length - 1].t) : 0),
    points: samples.map((p) => ({ time: sec(p.t), x: p.x, y: p.y, type: p.type })),
    clicks: (track?.clicks || []).map((c) => ({ time: sec(c.t), x: c.x, y: c.y })),
  };
}