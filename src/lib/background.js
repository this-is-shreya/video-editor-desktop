// // Client-side video background removal using MediaPipe Tasks Vision (selfie segmenter).
// // Loads the library as an ES module from a CDN so it works in-browser without bundling wasm.
// // Public API:
// //   removeVideoBackground(blobUrl, { onProgress, previewCanvas }) -> Promise<Blob>
// //   downloadVideo(blob, filename)
// //   removeBackgroundAndDownload(blobUrl, filename, { onProgress, previewCanvas })

// const MP_VERSION = "0.10.14";
// const VISION_MODULE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/vision_bundle.mjs`;
// const VISION_WASM_ROOT = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
// const MODEL_URL =
//   "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

// const MAX_DURATION_SEC = 60;

// let segmenterPromise = null;

// async function loadSegmenter() {
//   if (segmenterPromise) return segmenterPromise;
//   segmenterPromise = (async () => {
//     // Dynamic ESM import — the old `vision_bundle.js` (UMD) doesn't expose globals in modern builds,
//     // which is why the original snippet silently failed.
//     const vision = await import(/* @vite-ignore */ VISION_MODULE_URL);
//     const { FilesetResolver, ImageSegmenter } = vision;
//     const fileset = await FilesetResolver.forVisionTasks(VISION_WASM_ROOT);
//     return ImageSegmenter.createFromOptions(fileset, {
//       baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
//       runningMode: "VIDEO",
//       outputCategoryMask: true,
//       outputConfidenceMasks: false,
//     });
//   })();
//   return segmenterPromise;
// }

// function pickRecorderMime() {
//   const candidates = [
//     // Alpha channel in WebM is only reliably supported by VP8 in Chromium.
//     // VP9 in MediaRecorder currently drops alpha, producing a black background.
//     "video/webm;codecs=vp8",
//     "video/webm;codecs=vp9",
//     "video/webm",
//   ];
//   for (const m of candidates) {
//     if (
//       typeof MediaRecorder !== "undefined" &&
//       MediaRecorder.isTypeSupported(m)
//     )
//       return m;
//   }
//   return "video/webm";
// }

// /**
//  * Remove background from a video (blob URL) and return a WebM Blob with transparency
//  * where supported. Renders each processed frame to `previewCanvas` live.
//  */
// export async function removeVideoBackground(
//   blobUrl,
//   { onProgress, previewCanvas } = {},
// ) {
//   const segmenter = await loadSegmenter();

//   const video = document.createElement("video");
//   video.src = blobUrl;
//   video.muted = true;
//   video.playsInline = true;
//   video.crossOrigin = "anonymous";
//   video.preload = "auto";

//   await new Promise((resolve, reject) => {
//     video.onloadedmetadata = () => resolve();
//     video.onerror = () => reject(new Error("Failed to load video metadata"));
//   });

//   const width = video.videoWidth;
//   const height = video.videoHeight;
//   const duration = Math.min(video.duration, MAX_DURATION_SEC);

//   if (!width || !height) throw new Error("Video has no dimensions");

//   // Offscreen processing canvas.
//   const canvas = document.createElement("canvas");
//   canvas.width = width;
//   canvas.height = height;
//   const ctx = canvas.getContext("2d", { willReadFrequently: true });

//   // Preview canvas (visible). Sized to the video.
//   if (previewCanvas) {
//     previewCanvas.width = width;
//     previewCanvas.height = height;
//   }
//   const previewCtx = previewCanvas ? previewCanvas.getContext("2d") : null;

//   // Set up recording of the processing canvas so alpha is preserved.
//   const fps = 30;
//   const stream = canvas.captureStream(fps);
//   const mimeType = pickRecorderMime();
//   const recorder = new MediaRecorder(stream, {
//     mimeType,
//     videoBitsPerSecond: 8_000_000,
//   });
//   const chunks = [];
//   recorder.ondataavailable = (e) => {
//     if (e.data && e.data.size) chunks.push(e.data);
//   };
//   const recorderDone = new Promise((resolve) => {
//     recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
//   });
//   recorder.start();

//   // Play the video and process each rendered frame. requestVideoFrameCallback
//   // gives us actual decoded frames in real time — no fragile seek loop.
//   const hasRVFC = typeof video.requestVideoFrameCallback === "function";

//   await video.play().catch(() => {
//     // Autoplay policies: muted + user gesture upstream should allow this.
//   });

//   await new Promise((resolve) => {
//     const stopAt = duration;

//     const processCurrentFrame = () => {
//       ctx.clearRect(0, 0, width, height);
//       ctx.drawImage(video, 0, 0, width, height);

//       let result;
//       try {
//         result = segmenter.segmentForVideo(video, performance.now());
//       } catch (err) {
//         console.warn("segmentForVideo failed", err);
//       }

//       if (result && result.categoryMask) {
//         const mask = result.categoryMask.getAsUint8Array();
//         const frame = ctx.getImageData(0, 0, width, height);
//         const pixels = frame.data;
//         // selfie_segmenter category mask: 0 = person, non-zero = background.
//         for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
//           if (mask[i] !== 0) {
//             pixels[p + 3] = 0; // transparent background
//           }
//         }
//         ctx.clearRect(0, 0, width, height);
//         ctx.putImageData(frame, 0, 0);
//         if (typeof result.close === "function") result.close();
//       }

//       if (previewCtx) {
//         previewCtx.clearRect(0, 0, width, height);
//         previewCtx.drawImage(canvas, 0, 0);
//       }

//       if (onProgress) {
//         const pct = Math.min(
//           100,
//           Math.round((video.currentTime / stopAt) * 100),
//         );
//         onProgress(pct);
//       }
//     };

//     const finish = () => {
//       try {
//         video.pause();
//       } catch {}
//       // Give the recorder one tick to flush the last frame.
//       setTimeout(() => {
//         if (recorder.state !== "inactive") recorder.stop();
//         resolve();
//       }, 100);
//     };

//     const tick = () => {
//       if (video.ended || video.currentTime >= stopAt) {
//         processCurrentFrame();
//         finish();
//         return;
//       }
//       processCurrentFrame();
//       if (hasRVFC) {
//         video.requestVideoFrameCallback(tick);
//       } else {
//         requestAnimationFrame(tick);
//       }
//     };

//     if (hasRVFC) {
//       video.requestVideoFrameCallback(tick);
//     } else {
//       requestAnimationFrame(tick);
//     }

//     // Hard cap in case the video never fires 'ended'.
//     setTimeout(finish, (stopAt + 1) * 1000);
//   });

//   const blob = await recorderDone;
//   return blob;
// }

// export function downloadVideo(blob, filename = "video_no_bg.webm") {
//   const url = URL.createObjectURL(blob);
//   const a = document.createElement("a");
//   a.href = url;
//   a.download = filename;
//   document.body.appendChild(a);
//   a.click();
//   document.body.removeChild(a);
//   setTimeout(() => URL.revokeObjectURL(url), 1000);
// }

// export async function removeBackgroundAndDownload(
//   blobUrl,
//   filename = "video_no_bg.webm",
//   opts = {},
// ) {
//   const blob = await removeVideoBackground(blobUrl, opts);
//   downloadVideo(blob, filename);
//   return blob;
// }

// Client-side video background removal using MediaPipe Tasks Vision (selfie segmenter).
// Loads the library as an ES module from a CDN so it works in-browser without bundling wasm.
// Public API:
//   removeVideoBackground(blobUrl, { onProgress, previewCanvas }) -> Promise<Blob>
//   downloadVideo(blob, filename)
//   removeBackgroundAndDownload(blobUrl, filename, { onProgress, previewCanvas })

// Client-side video background removal using MediaPipe Tasks Vision (selfie segmenter).
// Loads the library as an ES module from a CDN so it works in-browser without bundling wasm.
// Public API:
//   removeVideoBackground(blobUrl, { onProgress, previewCanvas }) -> Promise<Blob>
//   downloadVideo(blob, filename)
//   removeBackgroundAndDownload(blobUrl, filename, { onProgress, previewCanvas })

const MP_VERSION = "0.10.14";
const VISION_MODULE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/vision_bundle.mjs`;
const VISION_WASM_ROOT = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

const MAX_DURATION_SEC = 60;

let segmenterPromise = null;

async function loadSegmenter() {
  if (segmenterPromise) return segmenterPromise;
  segmenterPromise = (async () => {
    // Dynamic ESM import — the old `vision_bundle.js` (UMD) doesn't expose globals in modern builds,
    // which is why the original snippet silently failed.
    const vision = await import(/* @vite-ignore */ VISION_MODULE_URL);
    const { FilesetResolver, ImageSegmenter } = vision;
    const fileset = await FilesetResolver.forVisionTasks(VISION_WASM_ROOT);
    return ImageSegmenter.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      outputCategoryMask: true,
      outputConfidenceMasks: false,
    });
  })();
  return segmenterPromise;
}

function pickRecorderMime() {
  const candidates = [
    // Alpha channel in WebM is only reliably supported by VP8 in Chromium.
    // VP9 in MediaRecorder currently drops alpha, producing a black background.
    "video/webm;codecs=vp8",
    "video/webm;codecs=vp9",
    "video/webm",
  ];
  for (const m of candidates) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(m)
    )
      return m;
  }
  return "video/webm";
}

/**
 * Remove background from a video (blob URL) and return a WebM Blob with transparency
 * where supported. Renders each processed frame to `previewCanvas` live.
 */
export async function removeVideoBackground(
  blobUrl,
  { onProgress, previewCanvas, isBackgroundRemoval } = {},
) {
  const segmenter = await loadSegmenter();

  const video = document.createElement("video");
  video.src = blobUrl;
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = "anonymous";
  video.preload = "auto";

  await new Promise((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Failed to load video metadata"));
  });

  const width = video.videoWidth;
  const height = video.videoHeight;
  // Some WebM/streamed files report Infinity/NaN duration until seeked.
  let rawDuration = video.duration;
  if (!Number.isFinite(rawDuration) || rawDuration <= 0) {
    rawDuration = await new Promise((resolve) => {
      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        const d = Number.isFinite(video.duration)
          ? video.duration
          : MAX_DURATION_SEC;
        video.currentTime = 0;
        resolve(d);
      };
      video.addEventListener("seeked", onSeeked);
      try {
        video.currentTime = 1e101;
      } catch {
        video.removeEventListener("seeked", onSeeked);
        resolve(MAX_DURATION_SEC);
      }
      setTimeout(() => {
        video.removeEventListener("seeked", onSeeked);
        resolve(
          Number.isFinite(video.duration) ? video.duration : MAX_DURATION_SEC,
        );
      }, 3000);
    });
  }
  const duration = Math.min(rawDuration, MAX_DURATION_SEC);

  if (!width || !height) throw new Error("Video has no dimensions");

  // Offscreen processing canvas.
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  // Preview canvas (visible). Sized to the video.
  if (previewCanvas) {
    previewCanvas.width = width;
    previewCanvas.height = height;
  }
  const previewCtx = previewCanvas ? previewCanvas.getContext("2d") : null;

  // Mask canvas — used to feather (soften + slightly erode) the segmentation
  // edge so there's no hard 1px halo of background color around the person.
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });
  const maskImage = maskCtx.createImageData(width, height);

  // Feather radius scales with resolution; ~0.5% of the shorter side.
  const featherPx = Math.max(1.5, Math.round(Math.min(width, height) * 0.005));
  // Bias > 0.5 pulls the edge inward (erodes), cutting the background fringe.
  const EDGE_BIAS = 0.62;
  const EDGE_SOFTNESS = 0.42;

  // Set up recording of the processing canvas so alpha is preserved.
  const fps = 30;
  const stream = canvas.captureStream(fps);
  const mimeType = pickRecorderMime();
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 8_000_000,
  });
  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };
  const recorderDone = new Promise((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });
  recorder.start();

  // Play the video and process each rendered frame. requestVideoFrameCallback
  // gives us actual decoded frames in real time — no fragile seek loop.
  const hasRVFC = typeof video.requestVideoFrameCallback === "function";

  await video.play().catch(() => {
    // Autoplay policies: muted + user gesture upstream should allow this.
  });

  await new Promise((resolve) => {
    const stopAt = duration;
    let finished = false;
    let hardCapTimer = null;
    let progressTimer = null;

    const reportProgress = () => {
      if (!onProgress) return;
      const pct = Math.min(
        100,
        Math.max(0, Math.round((video.currentTime / stopAt) * 100)),
      );
      onProgress(pct);
    };

    const processCurrentFrame = () => {
      if (!isBackgroundRemoval) {
        finish();
        return;
      }
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(video, 0, 0, width, height);

      let result;
      try {
        result = segmenter.segmentForVideo(video, performance.now());
      } catch (err) {
        console.warn("segmentForVideo failed", err);
      }

      if (result && result.categoryMask) {
        const mask = result.categoryMask.getAsUint8Array();
        // selfie_segmenter category mask: 0 = person, non-zero = background.
        // Build a white/opaque person mask.
        const md = maskImage.data;
        for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
          const person = mask[i] === 0 ? 255 : 0;
          md[p] = 255;
          md[p + 1] = 255;
          md[p + 2] = 255;
          md[p + 3] = person;
        }
        maskCtx.putImageData(maskImage, 0, 0);

        // Blur the mask to soften the edge, then remap alpha with a bias so the
        // soft edge sits slightly inside the person (removes the visible line).
        maskCtx.save();
        maskCtx.filter = `blur(${featherPx}px)`;
        maskCtx.globalCompositeOperation = "copy";
        maskCtx.drawImage(maskCanvas, 0, 0);
        maskCtx.restore();

        const blurred = maskCtx.getImageData(0, 0, width, height);
        const bd = blurred.data;
        const lo = EDGE_BIAS - EDGE_SOFTNESS / 2;
        const hi = EDGE_BIAS + EDGE_SOFTNESS / 2;
        for (let p = 3; p < bd.length; p += 4) {
          const a = bd[p] / 255;
          let t = (a - lo) / (hi - lo);
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          bd[p] = (t * t * (3 - 2 * t) * 255) | 0; // smoothstep
        }
        maskCtx.putImageData(blurred, 0, 0);

        // Apply the feathered mask as alpha on the frame.
        ctx.save();
        ctx.globalCompositeOperation = "destination-in";
        ctx.drawImage(maskCanvas, 0, 0);
        ctx.restore();

        if (typeof result.close === "function") result.close();
      }

      if (previewCtx) {
        previewCtx.clearRect(0, 0, width, height);
        previewCtx.drawImage(canvas, 0, 0);
      }

      reportProgress();
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      if (hardCapTimer) clearTimeout(hardCapTimer);
      if (progressTimer) clearInterval(progressTimer);
      try {
        video.pause();
      } catch {}
      if (onProgress) onProgress(100);
      // Give the recorder one tick to flush the last frame.
      setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
        resolve();
      }, 100);
    };

    const tick = () => {
      if (finished) return;
      if (video.ended || video.currentTime >= stopAt) {
        processCurrentFrame();
        finish();
        return;
      }
      processCurrentFrame();
      if (hasRVFC) {
        video.requestVideoFrameCallback(tick);
      } else {
        requestAnimationFrame(tick);
      }
    };

    // Progress ticks independently of frame callbacks, which can stall while
    // the tab throttles or a heavy frame is being segmented.
    progressTimer = setInterval(reportProgress, 200);
    video.addEventListener("ended", finish);

    if (hasRVFC) {
      video.requestVideoFrameCallback(tick);
    } else {
      requestAnimationFrame(tick);
    }

    // Hard cap in case the video never fires 'ended'.
    hardCapTimer = setTimeout(finish, (stopAt + 5) * 1000);
  });

  const blob = await recorderDone;
  return blob;
}

export function downloadVideo(blob, filename = "video_no_bg.webm") {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function removeBackgroundAndDownload(
  blobUrl,
  filename = "video_no_bg.webm",
  opts = {},
) {
  const blob = await removeVideoBackground(blobUrl, opts);
  downloadVideo(blob, filename);
  return blob;
}