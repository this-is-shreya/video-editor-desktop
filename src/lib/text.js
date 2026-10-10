// const DISPLAY_WIDTH = 720;
// const DISPLAY_HEIGHT = 405;
// const PIXEL_RATIO = 2; // or window.devicePixelRatio
// const CANVAS_WIDTH = 1920;
// const CANVAS_HEIGHT = 1080;
// const renderScaleX = CANVAS_WIDTH / DISPLAY_WIDTH;

import { calculateScale } from "./elements";

// ---- helpers ----
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const ease3=t=>1-Math.pow(1-t,3);
function easeOutBack(t){const c=1.70158;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);}
function easeOutBounce(t){const n=7.5625,d=2.75;if(t<1/d)return n*t*t;if(t<2/d)return n*(t-=1.5/d)*t+.75;if(t<2.5/d)return n*(t-=2.25/d)*t+.9375;return n*(t-=2.625/d)*t+.984375;}
function scaled(el,aspectRatio){
  const {renderScaleX:sx,renderScaleY:sy,DISPLAY_WIDTH:W,DISPLAY_HEIGHT:H}=calculateScale(aspectRatio);
  return {...el,style:el.style||{},x:el.x*sx,y:el.y*sy,width:el.width*sx,height:el.height*sy,W,H};
}
// word layout with wrapping; *word* marks emphasis. ctx.font must be set first
function layoutWords(ctx,text,maxW,lineH){
  const space=ctx.measureText(" ").width,items=[];let cx=0,line=0;
  text.split("\n").forEach((ln,li)=>{
    if(li>0){cx=0;line++;}
    ln.split(/\s+/).filter(Boolean).forEach(raw=>{
      const emph=/^\*.+\*$/.test(raw),word=emph?raw.slice(1,-1):raw,w=ctx.measureText(word).width;
      if(cx>0&&cx+w>maxW){cx=0;line++;}
      items.push({word,emph,w,x:cx,y:line*lineH});cx+=w+space;
    });
  });
  return items;
}
const easeOutCubic =(t) => {
  return 1 - Math.pow(1 - t, 3);
}
// ------------------------------------------------------------
// TYPING GRADIENT
// Full-height black panel from left
// Centered bold kinetic words
// Auto-sized text + vertical scrolling for long text
// ------------------------------------------------------------
export function drawTypingGradient(
  ctx,
  element,
  currentTime,
  aspectRatio
) {
  const {
    text = "Hello There!",
    start,
    style = {},
  } = scaled(element, aspectRatio);

  // real drawable size, in the units ctx actually draws in
  const tf = ctx.getTransform();
  const W = ctx.canvas.width / tf.a;
  const H = ctx.canvas.height / tf.d;

  const elapsed = currentTime - start;
  if (elapsed < 0 || !text) return;

  // ----------------------------------------------------------
  // LAYOUT
  // ----------------------------------------------------------

  const panelWidth = W * 0.55;   // total panel incl. fade
  const solidWidth = W * 0.40;   // fully black part, text stays inside this

  const paddingX = W * 0.045;
  const paddingY = H * 0.10;

  const maxTextWidth = solidWidth - paddingX * 2;
  const maxTextHeight = H - paddingY * 2;

  const introDuration = Number(style.introDuration) || 0.45;
  const wordStagger = Number(style.wordStagger) || 0.12;
  const wordDuration = Number(style.wordDuration) || 0.38;
  const fontFamily = style.fontFamily || "Arial";
  const color = style.color || "#ffffff";
  const accent = style.accent || "#ffe600";
  const fontScale = Number(style.fontScale) || 1;

  const LINE_HEIGHT = 1.2;       // line height as a multiple of font size
  const GAP = 0.28;              // space between words as a multiple of font size

  // ----------------------------------------------------------
  // PANEL SLIDE-IN
  // ----------------------------------------------------------

  const slideProgress = clamp(elapsed / introDuration);
  const slideEase = easeOutCubic(slideProgress);
  const panelX = -panelWidth + panelWidth * slideEase;

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  const gradient = ctx.createLinearGradient(
    panelX, 0, panelX + panelWidth, 0
  );
  gradient.addColorStop(0, "rgba(0,0,0,1)");
  gradient.addColorStop(0.72, "rgba(0,0,0,1)");
  gradient.addColorStop(0.90, "rgba(0,0,0,0.92)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(panelX, 0, panelWidth + 1, H);
  ctx.restore();

  // wait until the panel is mostly in
  if (slideProgress < 0.55) return;

  // ----------------------------------------------------------
  // PARSE TEXT (supports multi-line, blank lines)
  // ----------------------------------------------------------

  const paragraphs = String(text)
    .replace(/\r/g, "")
    .split("\n")
    .map(p => p.trim().split(/\s+/).filter(Boolean));

  const words = paragraphs.flat();
  if (!words.length) return;

  // ----------------------------------------------------------
  // FONT SIZE (smaller than before, based on text length)
  // ----------------------------------------------------------

  const wordCount = words.length;

  let fontSize;
  if (wordCount <= 2) fontSize = H * 0.09;
  else if (wordCount <= 4) fontSize = H * 0.08;
  else if (wordCount <= 7) fontSize = H * 0.07;
  else if (wordCount <= 10) fontSize = H * 0.06;
  else if (wordCount <= 15) fontSize = H * 0.052;
  else fontSize = H * 0.045;

  fontSize = Math.min(fontSize * fontScale, H * 0.1);

  const minFontSize = Math.max(12, H * 0.035);

  // ----------------------------------------------------------
  // WRAP
  // ----------------------------------------------------------

  const buildLines = (fs) => {
    ctx.font = `900 ${fs}px ${fontFamily}`;

    const gap = fs * GAP;
    const result = [];

    paragraphs.forEach(par => {
      if (!par.length) {
        result.push({ words: [], widths: [], width: 0 });
        return;
      }

      let cur = [];
      let curWidths = [];
      let curW = 0;

      par.forEach(word => {
        const w = ctx.measureText(word).width;
        const next = cur.length ? curW + gap + w : w;

        if (cur.length && next > maxTextWidth) {
          result.push({ words: cur, widths: curWidths, width: curW });
          cur = [word];
          curWidths = [w];
          curW = w;
        } else {
          cur.push(word);
          curWidths.push(w);
          curW = next;
        }
      });

      result.push({ words: cur, widths: curWidths, width: curW });
    });

    return result;
  };

  // ----------------------------------------------------------
  // AUTO-FIT: width must always fit, height may fall back to scroll
  // ----------------------------------------------------------

  let fs = fontSize;
  let lines = [];

  for (let i = 0; i < 60; i++) {
    lines = buildLines(fs);

    const fitsW = lines.every(l => l.width <= maxTextWidth);
    const fitsH = lines.length * fs * LINE_HEIGHT <= maxTextHeight;

    if (fitsW && (fitsH || fs <= minFontSize)) break;
    if (fs <= 6) break;

    fs *= 0.94;
  }

  lines = buildLines(fs); // lines, widths and ctx.font all match the final size

  const lineHeight = fs * LINE_HEIGHT;
  const gap = fs * GAP;

  const contentHeight = lines.length * lineHeight;
  const overflow = contentHeight > maxTextHeight;

  // vertically centered by default, top-anchored when it has to scroll
  const baseY = overflow ? paddingY : H / 2 - contentHeight / 2;

  // ----------------------------------------------------------
  // WORD TIMES + SMOOTH SCROLL
  // ----------------------------------------------------------

  const lineStartTimes = [];
  let counter = 0;

  lines.forEach((line, li) => {
    lineStartTimes[li] = introDuration + counter * wordStagger;
    counter += line.words.length;
  });

  let scrollY = 0;

  if (overflow) {
    let active = 0;
    lineStartTimes.forEach((t, i) => {
      if (elapsed >= t && lines[i].words.length) active = i;
    });

    const target = (l) =>
      Math.max(0, (l + 1) * lineHeight - maxTextHeight);

    const from = active > 0 ? target(active - 1) : 0;
    const t = clamp((elapsed - lineStartTimes[active]) / 0.35);

    scrollY = from + (target(active) - from) * easeOutCubic(t);
  }

  // ----------------------------------------------------------
  // DRAW TEXT (left aligned)
  // ----------------------------------------------------------

  ctx.save();

  if (overflow) {
    ctx.beginPath();
    ctx.rect(0, paddingY * 0.5, W, H - paddingY);
    ctx.clip();
  }

  ctx.font = `900 ${fs}px ${fontFamily}`;
  ctx.textBaseline = "middle";

  // IMPORTANT: each word is drawn around its own centre,
  // so it must be centre-aligned (this was the overlap bug)
  ctx.textAlign = "center";

  ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;

  const emphasizedSet = new Set(
    (style.emphasizedWords || []).map(w =>
      String(w).toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")
    )
  );

  let globalIndex = 0;

  lines.forEach((line, lineIndex) => {
    let cursorX = paddingX; // every line starts at the same X

    const lineY =
      baseY + lineIndex * lineHeight - scrollY + lineHeight / 2;

    line.words.forEach((word, wi) => {
      const wordWidth = line.widths[wi];

      const revealStart = introDuration + globalIndex * wordStagger;
      const p = clamp((elapsed - revealStart) / wordDuration);

      if (p > 0) {
        const e = easeOutCubic(p);

        const impactY = (1 - e) * fs * 0.35;
        const rotation = (1 - e) * (globalIndex % 2 === 0 ? -0.05 : 0.05);
        const scale = 0.8 + 0.2 * e; // never exceeds 1, stays inside the panel

        const emphasized = emphasizedSet.has(
          word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")
        );

        ctx.save();
        ctx.globalAlpha = clamp(p * 3);

        ctx.translate(
          panelX + cursorX + wordWidth / 2,
          lineY + impactY
        );
        ctx.rotate(rotation);
        ctx.scale(scale, scale);

        ctx.fillStyle = emphasized ? accent : color;
        ctx.fillText(word, 0, 0);

        ctx.restore();
      }

      cursorX += wordWidth + gap;
      globalIndex++;
    });
  });

  ctx.restore();
}

export function drawKineticWords(ctx,element,currentTime,aspectRatio){
  let {text="Hello *There!*",x,y,width,height,start,style={}}=scaled(element,aspectRatio);
  const elapsed=currentTime-start;
  if(elapsed<0||!text)return;
  if(text === "Hello There!") {
    text = "Hello *There!*"
  }
  const stagger=style.stagger||0.22,fam=style.fontFamily||"Arial";
  let fs=height*0.8,lineH,items,blockH;

  ctx.save();
  ctx.textBaseline="middle";ctx.textAlign="center";

  // auto-fit the whole block inside the element box so nothing overflows
  for(let i=0;i<20;i++){
    lineH=fs*1.25;
    ctx.font=`900 ${fs}px ${fam}`;
    items=layoutWords(ctx,text,width,lineH);
    blockH=items.reduce((m,it)=>Math.max(m,it.y+lineH),0);
    if((blockH<=height&&items.every(it=>it.w<=width))||fs<8)break;
    fs*=0.92;
  }
  const top=y+(height-blockH)/2;         // vertically centered, fixed for the whole animation

  items.forEach((it,i)=>{
    const p=clamp((elapsed-i*stagger)/0.3);
    if(p<=0)return;
    const e=ease3(p);                    // plain ease-out: no overshoot, no rotation
    const s=0.94+0.06*e;
    ctx.save();
    ctx.globalAlpha=e;
    ctx.translate(x+it.x+it.w/2,top+it.y+lineH/2+(1-e)*fs*0.12);
    ctx.scale(s,s);
    ctx.fillStyle=it.emph?(style.accent||"#ffe600"):(style.color||"#fff");
    ctx.shadowColor="rgba(0,0,0,0.5)";
    ctx.shadowBlur=10;
    ctx.fillText(it.word,0,0);
    ctx.restore();
  });
  ctx.restore();
}

// ---- 3. marker highlight: a highlighter swipes behind *emphasized* words ----
export function drawMarkerHighlight(ctx,element,currentTime,aspectRatio){
  let {text,x,y,height,start,style,width}=scaled(element,aspectRatio);
  if(text === "Hello There!") {
    text = "Hello *There!*";
  }
  const elapsed=currentTime-start;if(elapsed<0)return;
  const fs=height*0.8,lineH=fs*1.3,fade=ease3(clamp(elapsed/0.5));
  ctx.save();
  ctx.font=`bold ${fs}px ${style.fontFamily||"Arial"}`;
  ctx.textBaseline="top";
  const items=layoutWords(ctx,text,width,lineH);
  let k=0;
  items.forEach(it=>{
    it.p=0;
    if(!it.emph)return;
    it.p=ease3(clamp((elapsed-0.6-k*0.5)/0.4));k++;
    ctx.fillStyle=style.marker||"#ffe600";
    ctx.fillRect(x+it.x-6,y+it.y+fs*0.08,(it.w+12)*it.p,fs*0.98);
  });
  ctx.globalAlpha=fade;
  items.forEach(it=>{
    ctx.fillStyle=it.p>0.5?"#111":(style.color||"#fff");
    ctx.shadowColor=it.p>0.5?"transparent":"rgba(0,0,0,0.6)";ctx.shadowBlur=8;
    ctx.fillText(it.word,x+it.x,y+it.y+fs*0.1);
  });
  ctx.restore();
}
export function drawParticleBurst(ctx, element, currentTime, aspectRatio) {
  let { text, x, y, height, start, style, width } = element;
    const { renderScaleX, renderScaleY, DISPLAY_WIDTH, DISPLAY_HEIGHT } = calculateScale(aspectRatio);
  
  x = x * renderScaleX;
  y = y * renderScaleY;
  height = height * renderScaleY;
  width = width * renderScaleX;
  const elapsed = currentTime - start;
  if (elapsed < 0) return;

  const fontSize = height * 0.8;
  const staggerDelay = 0.06;
  const duration = 0.8;
  const particleCount = 6;

  ctx.save();
  ctx.font = `bold ${fontSize}px ${style.fontFamily || "Arial"}`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  const letters = text.split("");
  let drawX = x;

  letters.forEach((char, i) => {
    if (char === "\n") {
      drawX = x; // reset to start
      y += fontSize * 1; // move down
      return;
    }
    const letterDelay = i * staggerDelay;
    const letterElapsed = elapsed - letterDelay;
    const charW = ctx.measureText(char).width;
    const charCX = drawX + charW / 2;

    if (letterElapsed > 0) {
      const progress = Math.min(letterElapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      // Particles converging into letter
      if (progress < 1) {
        for (let p = 0; p < particleCount; p++) {
          const angle = (p / particleCount) * Math.PI * 2 + i * 0.7;
          const dist = (1 - eased) * fontSize * 1.4;
          const pX = charCX + Math.cos(angle) * dist;
          const pY = y + Math.sin(angle) * dist;
          const pAlpha = (1 - eased) * 0.7;
          const pSize = (1 - eased) * fontSize * 0.12;

          ctx.beginPath();
          ctx.arc(pX, pY, Math.max(0.5, pSize), 0, Math.PI * 2);
          ctx.fillStyle = style.particleColor || "#ffffff";
          ctx.globalAlpha = pAlpha;
          ctx.fill();
        }
      }

      // Letter itself fades/scales in
      ctx.globalAlpha = eased;
      ctx.fillStyle = style.color || "white";
      ctx.save();
      const scale = 0.5 + eased * 0.5;
      ctx.translate(charCX, y);
      ctx.scale(scale, scale);
      ctx.fillText(char, -charW / 2, 0);
      ctx.restore();
    }

    drawX += charW;
  });

  ctx.restore();
}

export function drawShatterExplode(ctx, element, currentTime, aspectRatio) {
  let { text, x, y, height, start, style, width } = element;
  const { renderScaleX, renderScaleY, DISPLAY_WIDTH, DISPLAY_HEIGHT } = calculateScale(aspectRatio);
  x = x * renderScaleX;
  y = y * renderScaleY;
  height = height * renderScaleY;
  width = width * renderScaleX;
  const elapsed = currentTime - start;
  if (elapsed < 0) return;

  const fontSize = height * 0.6;
  ctx.save();
  ctx.font = `bold ${fontSize}px ${style.fontFamily || "Arial"}`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  const letters = text.split("");
  const totalWidth = ctx.measureText(text).width;
  let drawX = x;

  // Phase 1: text holds still (0 → 1.2s)
  // Phase 2: each letter flies out (1.2s → 2.0s)
  const holdTime = 1.2;
  const explodeDuration = 0.7;
  const staggerDelay = 0.04;

  letters.forEach((char, i) => {
    if (char === "\n") {
      drawX = x; // reset to start
      y += fontSize * 1; // move down
      return;
    }
    const charW = ctx.measureText(char).width;
    const charCX = drawX + charW / 2;

    if (elapsed <= holdTime) {
      // Sit still — fade in during first 0.3s
      const fadeIn = Math.min(elapsed / 0.3, 1);
      ctx.globalAlpha = fadeIn;
      ctx.fillStyle = style.color || "white";
      ctx.fillText(char, drawX, y);
    } else {
      const explodeElapsed = elapsed - holdTime - i * staggerDelay;
      if (explodeElapsed < 0) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = style.color || "white";
        ctx.fillText(char, drawX, y);
      } else {
        const progress = Math.min(explodeElapsed / explodeDuration, 1);
        const eased = progress * progress; // accelerate out

        // Each letter gets a unique explode direction
        const seed = i * 2.4 + 1.1;
        const angle = seed % (Math.PI * 2);
        const speed = 120 + ((seed * 37) % 80);
        const offsetX = Math.cos(angle) * speed * eased;
        const offsetY = Math.sin(angle) * speed * eased - 40 * eased;
        const rotation = ((seed % 1) - 0.5) * Math.PI * 3 * eased;
        const scale = 1 - eased * 0.5;
        const alpha = 1 - eased;

        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.translate(charCX + offsetX, y + offsetY);
        ctx.rotate(rotation);
        ctx.scale(scale, scale);
        ctx.fillStyle = style.color || "white";
        ctx.fillText(char, -charW / 2, 0);
        ctx.restore();
      }
    }

    drawX += charW;
  });

  ctx.restore();
}

export function drawWordSlam(ctx, element, currentTime, aspectRatio) {
  let { text, x, y, width, height, start, style } = element;
  const { renderScaleX, renderScaleY, DISPLAY_WIDTH, DISPLAY_HEIGHT } = calculateScale(aspectRatio);
  x = x * renderScaleX;
  y = y * renderScaleY;
  height = height * renderScaleY;
  width = width * renderScaleX;
  const elapsed = currentTime - start;
  if (elapsed < 0) return;

  const words = text.split("\n");
  const fontSize = height * 0.55;
  const wordDelay = 0.2;
  const inDuration = 0.2;

  ctx.save();
  ctx.font = `900 ${fontSize}px ${style.fontFamily || "Arial"}`;
  ctx.textBaseline = "top";
  ctx.textAlign = "center";

  const wordWidths = words.map((w) => ctx.measureText(w + " ").width);
  const totalWidth = wordWidths.reduce((a, b) => a + b, 0);
  const isStacked = totalWidth > (width || 400) * 1.0;

  const directions = [
    { dx: 0, dy: -80 },
    { dx: 80, dy: 0 },
    { dx: 0, dy: 80 },
    { dx: -80, dy: 0 },
    { dx: 60, dy: -60 },
    { dx: -60, dy: 60 },
  ];

  if (!isStacked) {
    let drawX = x;
    words.forEach((word, i) => {
      const wElapsed = elapsed - i * wordDelay;
      const wWidth = wordWidths[i];
      const wordCenterX = drawX + wWidth / 2 - ctx.measureText(" ").width / 2;

      if (wElapsed > 0) {
        const progress = Math.min(wElapsed / inDuration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const scale =
          progress < 0.6
            ? 1 + (1 - eased) * 0.5
            : 1 + (eased - 1) * 0.05 + 0.05;
        const dir = directions[i % directions.length];
        const offsetX = dir.dx * (1 - eased);
        const offsetY = dir.dy * (1 - eased);

        ctx.save();
        ctx.translate(wordCenterX + offsetX, y + offsetY);
        ctx.scale(scale, scale);
        ctx.globalAlpha = eased;
        ctx.fillStyle = style.color || "white";
        ctx.fillText(word, 0, 0);
        ctx.restore();
      }
      drawX += wWidth;
    });
  } else {
    const lineH = fontSize * 1.3;
    const startY = y - ((words.length - 1) * lineH) / 2;
    words.forEach((word, i) => {
      const wElapsed = elapsed - i * wordDelay;
      const wordY = startY + i * lineH;

      if (wElapsed > 0) {
        const progress = Math.min(wElapsed / inDuration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const scale =
          progress < 0.6
            ? 1 + (1 - eased) * 0.5
            : 1 + (eased - 1) * 0.05 + 0.05;
        const dir = directions[i % directions.length];

        ctx.save();
        ctx.translate(x + dir.dx * (1 - eased), wordY + dir.dy * (1 - eased));
        ctx.scale(scale, scale);
        ctx.globalAlpha = eased;
        ctx.fillStyle = style.color || "white";
        ctx.fillText(word, 0, 0);
        ctx.restore();
      }
    });
  }

  ctx.restore();
}

export function drawScrambleText(ctx, element, currentTime, aspectRatio) {
  let { text, x, y, height, start, style, width } = element;
  const { renderScaleX, renderScaleY, DISPLAY_WIDTH, DISPLAY_HEIGHT } = calculateScale(aspectRatio);
  x = x * renderScaleX;
  y = y * renderScaleY;
  height = height * renderScaleY;
  width = width * renderScaleX;
  const elapsed = currentTime - start;
  if (elapsed < 0) return;

  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  const scrambleDuration = 0.55;
  const staggerDelay = 0.09;
  const fontSize = height * 0.6;

  ctx.save();
  ctx.font = `bold ${fontSize}px ${style.fontFamily || "Arial"}`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  const letters = text.split("");
  const totalWidth = ctx.measureText(text).width;
  let drawX = x;

  letters.forEach((char, i) => {
    if (char === "\n") {
      drawX = x; // reset to start
      y += fontSize * 1; // move down
      return;
    }
    const letterDelay = i * staggerDelay;
    const letterElapsed = elapsed - letterDelay;
    const charWidth = ctx.measureText(char).width;

    if (letterElapsed <= 0) {
      drawX += charWidth;
      return;
    }

    const progress = Math.min(letterElapsed / scrambleDuration, 1);
    let displayChar;

    if (progress < 1) {
      displayChar = chars[Math.floor(Math.random() * chars.length)];
      ctx.globalAlpha = 0.4 + progress * 0.6;
      ctx.fillStyle = style.accentColor || "#00ff88";
    } else {
      displayChar = char;
      ctx.globalAlpha = 1;
      ctx.fillStyle = style.color || "white";
    }

    ctx.fillText(displayChar, drawX, y);
    drawX += charWidth;
  });

  ctx.restore();
}

export function drawBlurReveal(ctx, element, currentTime, aspectRatio) {
  let { text, x, y, height, start, style , width} = element;
  const { renderScaleX, renderScaleY, DISPLAY_WIDTH, DISPLAY_HEIGHT } = calculateScale(aspectRatio);
   x = x * renderScaleX;
   y = y * renderScaleY;
   height = height * renderScaleY;
   width = width * renderScaleX;
  const elapsed = currentTime - start;
  if (elapsed < 0) return;

  const duration = 1.1;
  const staggerDelay = 0.07;
  const fontSize = height;
  const letters = text.split("");

  ctx.save();

  ctx.font = `bold ${fontSize}px ${style.fontFamily || "Arial"}`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  const totalWidth = ctx.measureText(text).width;
  let drawX = x;

  letters.forEach((char, i) => {
    if (char === "\n") {
      drawX = x; // reset to start
      y += fontSize * 1; // move down
      return;
    }
    const letterDelay = i * staggerDelay;
    const letterElapsed = elapsed - letterDelay;
    if (letterElapsed <= 0) {
      drawX += ctx.measureText(char).width;
      return;
    }

    const progress = Math.min(letterElapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4);
    const scale = 1.8 - eased * 0.8;
    const blurLayers = Math.floor((1 - eased) * 7);
    const spread = (1 - eased) * fontSize * 0.18;
    const charW = ctx.measureText(char).width;
    const centerCharX = drawX + charW / 2;

    ctx.save();
    ctx.translate(centerCharX, y);
    ctx.scale(scale, scale);
    ctx.translate(-centerCharX, -y);

    for (let b = 0; b <= blurLayers; b++) {
      const offsetX = b === 0 ? 0 : (Math.random() - 0.5) * spread;
      const offsetY = b === 0 ? 0 : (Math.random() - 0.5) * spread;
      const layerAlpha = b === 0 ? eased : eased * 0.12;

      ctx.globalAlpha = layerAlpha;
      ctx.fillStyle = style.color || "white";
      ctx.fillText(char, drawX + offsetX, y + offsetY);
    }

    ctx.restore();
    drawX += charW;
  });

  ctx.restore();
}

export function drawTypewriter(ctx, element, currentTime, aspectRatio) {
  let { text, x, y, height, start, style, width } = element;
  const { renderScaleX, renderScaleY, DISPLAY_WIDTH, DISPLAY_HEIGHT } = calculateScale(aspectRatio);
  x = x * renderScaleX;
  y = y * renderScaleY;
  height = height * renderScaleY;
  width = width * renderScaleX;
  const elapsed = currentTime - start;
  if (elapsed < 0) return;

  const charSpeed = 0.09;
  const charsVisible = Math.floor(elapsed / charSpeed);
  const displayText = text.slice(0, charsVisible);
  const isDone = charsVisible >= text.length;

  const fontSize = height;
  ctx.save();
  
  ctx.font = `${fontSize}px ${style.fontFamily}`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillStyle = style.color || "white";
  ctx.globalAlpha = 1;

  const fullWidth = ctx.measureText(text).width;
  const visibleWidth = ctx.measureText(displayText).width;
  const startX = x;

  // ctx.fillText(displayText, startX, y);
const lines = displayText.split("\n");
const lineHeight = fontSize * 1.2;

lines.forEach((line, index) => {
  ctx.fillText(line, startX, y + index * lineHeight);
});

const lastLine = lines[lines.length - 1];
const cursorX = startX + ctx.measureText(lastLine).width + 2;
const cursorY = y + (lines.length - 1) * lineHeight;

const cursorBlink = isDone ? Math.floor(elapsed * 2) % 2 === 0 : true;

if (cursorBlink) {
  ctx.globalAlpha = 0.9;
  ctx.fillRect(cursorX, cursorY, Math.max(2, fontSize * 0.07), fontSize * 0.9);
}


  ctx.restore();
}

export function drawBasicText(ctx, element, currentTime, aspectRatio) {
  let { text, x, y, height, start, style, width } = element;
  const { renderScaleX, renderScaleY, DISPLAY_WIDTH, DISPLAY_HEIGHT } =
    calculateScale(aspectRatio);

  x = x * renderScaleX;
  y = y * renderScaleY;
  height = height * renderScaleY;
  width = width * renderScaleX;

  const elapsed = currentTime - start;
  if (elapsed < 0) return;

  const fontSize = height || 40;
  const fontFamily = style?.fontFamily || "Arial";
  const color = style?.color || "#ffffff";
  const fontWeight = style?.fontWeight || "normal";

  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = color;

  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  const lines = (text || "").split("\n");
  const lineHeight = fontSize * 1.2;

  lines.forEach((line, i) => {
    ctx.fillText(line, x, y + i * lineHeight, width);
  });
}

export const textTypes = Object.freeze({
  BLUR_REVEAL: "blurReveal",
  TYPEWRITER: "typewriter",
  SCRAMBLED_TEXT: "scrambledText",
  WORD_SLAM: "wordSlam",
  SHATTER_EXPLODE: "shatterExplode",
  PARTICLE_BURST: "particleBurst",
  BASIC: "basic",
  TYPING_GRADIENT: "typingGradient",
  KINETIC_TEXT: "kineticText",
  MARKER_HIGHLIGHT: "markerHighlight"
});
