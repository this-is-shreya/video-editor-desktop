// Vector cursor sprites drawn on a canvas. All geometry is in "cursor units"
// (an arrow is ~20 units tall); the caller scales with ctx.scale(unit).

const PALETTES = {
  black: (accent) => ({ fill: '#101114', stroke: '#ffffff' }),
  white: (accent) => ({ fill: '#ffffff', stroke: '#101114' }),
  accent: (accent) => ({ fill: accent, stroke: '#ffffff' }),
};

// paths -----------------------------------------------------------------
const arrow = (c) => {
  c.beginPath();
  c.moveTo(0, 0); c.lineTo(0, 17.5); c.lineTo(4.3, 13.6); c.lineTo(7.1, 20);
  c.lineTo(10, 18.7); c.lineTo(7.2, 12.4); c.lineTo(12.8, 12.4); c.closePath();
};
const hand = (c) => {
  c.beginPath();
  c.roundRect(5, 0, 4.4, 14, 2.2);        // index
  c.roundRect(9.4, 6, 3.8, 10, 1.9);      // middle
  c.roundRect(13.2, 7.4, 3.6, 9, 1.8);    // ring
  c.roundRect(16.8, 9, 3.4, 8, 1.7);      // little
  c.roundRect(5, 11, 15.2, 11, [2, 2, 6, 6]); // palm
  c.roundRect(0.8, 11.5, 5, 6, 3);        // thumb
};
const ibeam = (c) => {
  c.beginPath();
  c.rect(-1, -8.5, 2, 17);
  c.rect(-3.6, -8.5, 7.2, 2);
  c.rect(-3.6, 6.5, 7.2, 2);
};
const cross = (c) => { c.beginPath(); c.rect(-1, -9, 2, 18); c.rect(-9, -1, 18, 2); };
const dblArrow = (c) => {
  c.beginPath();
  c.moveTo(-10, 0); c.lineTo(-5, -4.6); c.lineTo(-5, -1.5); c.lineTo(5, -1.5); c.lineTo(5, -4.6);
  c.lineTo(10, 0); c.lineTo(5, 4.6); c.lineTo(5, 1.5); c.lineTo(-5, 1.5); c.lineTo(-5, 4.6); c.closePath();
};

function paint(ctx, path, fill, stroke, lw, shadow) {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.save();
  if (shadow) { ctx.shadowColor = 'rgba(0,0,0,.38)'; ctx.shadowBlur = 3.2; ctx.shadowOffsetY = 1.4; }
  path(ctx); ctx.lineWidth = lw * 2; ctx.strokeStyle = stroke; ctx.stroke();
  ctx.restore();
  path(ctx); ctx.fillStyle = fill; ctx.fill();
}

/**
 * Draws a cursor whose hotspot sits at (x, y) in canvas pixels.
 * opts: { style:'black'|'white'|'accent', accent, unit, adaptive, alpha, timeMs, scale }
 */
function drawCursor(ctx, type, x, y, opts) {
  const { fill, stroke } = (PALETTES[opts.style] || PALETTES.black)(opts.accent || '#5ab0ff');
  const t = opts.adaptive === false ? 'arrow' : type;
  if (t === 'hidden') return;
  const unit = opts.unit * (opts.scale || 1);
  ctx.save();
  ctx.globalAlpha *= opts.alpha == null ? 1 : opts.alpha;
  ctx.translate(x, y);
  ctx.scale(unit, unit);
  const lw = 1.25;
  const sh = opts.shadow !== false;

  switch (t) {
    case 'pointer': ctx.translate(-7.2, -0.6); paint(ctx, hand, fill, stroke, lw, sh); break;
    case 'text':    paint(ctx, ibeam, fill, stroke, lw, sh); break;
    case 'crosshair': paint(ctx, cross, fill, stroke, lw, sh); break;
    case 'resize-h': paint(ctx, dblArrow, fill, stroke, lw, sh); break;
    case 'resize-v': ctx.rotate(Math.PI / 2); paint(ctx, dblArrow, fill, stroke, lw, sh); break;
    case 'resize-d1': ctx.rotate(Math.PI / 4); paint(ctx, dblArrow, fill, stroke, lw, sh); break;
    case 'resize-d2': ctx.rotate(-Math.PI / 4); paint(ctx, dblArrow, fill, stroke, lw, sh); break;
    case 'move':
      paint(ctx, (c) => { dblArrow(c); }, fill, stroke, lw, sh);
      ctx.rotate(Math.PI / 2); paint(ctx, dblArrow, fill, stroke, lw, false);
      break;
    case 'wait': {
      ctx.rotate(((opts.timeMs || 0) / 650) * Math.PI * 2);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 1.5);
      ctx.lineWidth = 5.4; ctx.strokeStyle = stroke; ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = fill; ctx.stroke();
      break;
    }
    case 'not-allowed': {
      const ring = () => { ctx.beginPath(); ctx.arc(0, 0, 7.5, 0, Math.PI * 2); ctx.moveTo(-5.3, -5.3); ctx.lineTo(5.3, 5.3); };
      ctx.lineCap = 'round';
      ring(); ctx.lineWidth = 5.4; ctx.strokeStyle = stroke; ctx.stroke();
      ring(); ctx.lineWidth = 3; ctx.strokeStyle = fill; ctx.stroke();
      break;
    }
    default: paint(ctx, arrow, fill, stroke, lw, sh);
  }
  ctx.restore();
}

// sparkles --------------------------------------------------------------
function sparkleColor(kind, tone, accent) {
  switch (kind) {
    case 'rainbow': return `hsl(${Math.round(tone * 360)} 95% 68%)`;
    case 'pink': return tone > 0.5 ? '#ff8fd1' : '#ffd0ec';
    case 'blue': return tone > 0.5 ? '#7fd0ff' : '#d6f1ff';
    case 'white': return '#ffffff';
    case 'accent': return accent;
    default: return tone > 0.55 ? '#ffd86b' : (tone > 0.2 ? '#fff1b8' : '#ffffff'); // gold
  }
}

function drawSparkle(ctx, x, y, r, rot, color, alpha) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.shadowColor = color; ctx.shadowBlur = r * 1.6;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const rr = i % 2 === 0 ? r : r * 0.26;
    i ? ctx.lineTo(Math.sin(a) * rr, -Math.cos(a) * rr) : ctx.moveTo(0, -rr);
  }
  ctx.closePath(); ctx.fill();
  ctx.restore();
}


const CURSOR_TYPES = ['arrow', 'pointer', 'text', 'crosshair', 'resize-h', 'resize-d1', 'move', 'not-allowed', 'wait'];
export { drawCursor, drawSparkle, sparkleColor, CURSOR_TYPES };
