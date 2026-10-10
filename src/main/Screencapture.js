'use strict';
// Native screen capture WITHOUT the mouse cursor, like Screen Studio does.
//
// Chromium's getDisplayMedia() always bakes the cursor into the pixels on Windows (the `cursor: "never"`
// constraint is not honoured there), so on Windows we capture with ffmpeg's `ddagrab` (DXGI Desktop
// Duplication) filter with draw_mouse=0. The cursor path is recorded separately by the tracker.
// ffmpeg runs as a separate process: nothing here blocks the Electron main thread.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function ffmpegPath() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try {
    const p = require('ffmpeg-static');
    return p ? p.replace('app.asar', 'app.asar.unpacked') : null;   // binaries cannot run from inside an asar
  } catch { return null; }
}

function isSupported() {
  if (process.platform !== 'win32' && !process.env.CURSOR_STUDIO_FORCE_NATIVE) return false;
  const p = ffmpegPath();
  return !!p && fs.existsSync(p);
}

function captureArgs({ displayIndex, fps }) {
  if (process.platform === 'win32') {
    return [
      '-f', 'lavfi', '-i', `ddagrab=output_idx=${displayIndex}:framerate=${fps}:draw_mouse=0`,
      '-vf', 'hwdownload,format=bgra,scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p',
    ];
  }
  // Linux: only so the pipeline can be exercised in CI / on a dev box; not shipped as a feature.
  return ['-f', 'x11grab', '-draw_mouse', '0', '-framerate', String(fps), '-i', process.env.DISPLAY || ':0',
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p'];
}

class NativeScreenRecorder {
  /** @param {{displayIndex?:number, fps?:number}} o  displayIndex: 0-based DXGI output (0 = primary) */
  constructor({ displayIndex = 0, fps = 30 } = {}) {
    this.displayIndex = displayIndex;
    this.fps = fps;
    this.dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-studio-'));
    this.rawPath = path.join(this.dir, 'screen.raw.mp4');
    this.finalPath = path.join(this.dir, 'screen.mp4');
    this.proc = null;
    this.exited = null;
    this.log = '';
  }

  /** Resolves with { startedAt } (epoch ms of capture time 0) once the first frame has been encoded. */
 start(timeoutMs = 8000) {
  const bin = ffmpegPath();
  if (!bin) return Promise.reject(new Error('ffmpeg is not available'));

  const startedAt = Date.now();

  const args = [
    '-hide_banner', '-loglevel', 'error', '-y',
    ...captureArgs({ displayIndex: this.displayIndex, fps: this.fps }),
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-g', String(this.fps * 2),
    '-an',
    '-movflags', '+frag_keyframe+empty_moov+default_base_moof',
    '-progress', 'pipe:1',
    '-nostats',
    '-stats_period', '0.05',
    this.rawPath,
  ];

  this.proc = spawn(bin, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true
  });

  this.exited = new Promise((res) =>
    this.proc.once('close', (code) => res(code))
  );

  this.proc.stderr.on('data', (d) => {
    this.log = (this.log + d).slice(-4000);
  });

  this.proc.stdin.on('error', () => {});

  return new Promise((resolve, reject) => {
    let settled = false;
    let buf = '';
    let block = {};

    const done = (fn, v) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        fn(v);
      }
    };

    const timer = setTimeout(() => {
      this.kill();

      done(
        reject,
        new Error(
          'timed out waiting for the first frame. ' +
          this.log.trim()
        )
      );
    }, timeoutMs);

    this.proc.once('error', (e) => done(reject, e));

    this.exited.then((code) => {
      done(
        reject,
        new Error(
          `ffmpeg exited (${code}) before recording started. ` +
          this.log.trim()
        )
      );
    });

    this.proc.stdout.on('data', (d) => {
      buf += d;

      let i;

      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);

        const eq = line.indexOf('=');
        if (eq < 0) continue;

        const k = line.slice(0, eq);
        const v = line.slice(eq + 1);

        block[k] = v;

        if (k === 'progress') {
          if (!settled && Number(block.frame) >= 1) {
            // IMPORTANT:
            // Use the same wall-clock timestamp that was captured
            // immediately before FFmpeg was spawned.
            //
            // Do NOT derive this from out_time_us.
            done(resolve, { startedAt });
          }

          block = {};
        }
      }
    });
  });
}

  kill() { try { this.proc && this.proc.kill('SIGKILL'); } catch { /* already gone */ } }

  /**
   * Stop capturing and produce the final, seekable MP4. If the mic was recorded separately it is muxed in.
   * audio: Buffer (webm/opus) | null,  audioOffsetMs: how long after capture time 0 the mic recording began.
   */
  async stop({ audio = null, audioOffsetMs = 0 } = {}) {
    if (this.proc && this.proc.exitCode === null) {
      try { this.proc.stdin.write('q\n'); } catch { /* ignore */ }
      const t = setTimeout(() => this.kill(), 8000);
      await this.exited;
      clearTimeout(t);
    }
    if (!fs.existsSync(this.rawPath) || fs.statSync(this.rawPath).size === 0) {
      throw new Error('The screen recording is empty. ' + this.log.trim());
    }
    const args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', this.rawPath];
    if (audio && audio.length) {
      const micPath = path.join(this.dir, 'mic.webm');
      fs.writeFileSync(micPath, audio);
      args.push('-itsoffset', (Math.max(0, audioOffsetMs) / 1000).toFixed(3), '-i', micPath,
        '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest');
    } else {
      args.push('-map', '0:v:0', '-c:v', 'copy');
    }
    args.push('-movflags', '+faststart', this.finalPath);
    await new Promise((resolve, reject) => {
      let err = '';
      const p = spawn(ffmpegPath(), args, { windowsHide: true });
      p.stderr.on('data', (d) => { err += d; });
      p.once('error', reject);
      p.once('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg remux failed (${code}) ${err.trim()}`))));
    });
    return this.finalPath;
  }

  cleanup() { try { fs.rmSync(this.dir, { recursive: true, force: true }); } catch { /* ignore */ } }
}

module.exports = { NativeScreenRecorder, isSupported, ffmpegPath, captureArgs };