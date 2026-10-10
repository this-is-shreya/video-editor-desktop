// // Recorder for the Electron shell. Screen and camera are recorded separately, kept IN MEMORY as Blobs
// // (nothing is written to disk), and handed back together with the cursor data.
// //
// //   const session = await startRecording({ mode:'both', displayId, cameraId, micId }, { onFinished, onError });
// //   session.stop()           // optional - the floating toolbar / F10 also stop it
// //   -> onFinished({ screenBlob, cameraBlob, cursor:{events,segments}, durationMs })

// export const isElectron = () => typeof window !== "undefined" && !!window.cursorStudio;

// const needsScreen = (m) => m !== "camera";
// const needsCam = (m) => m !== "screen";

// function pickMime() {
//   for (const m of ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]) {
//     if (MediaRecorder.isTypeSupported(m)) return m;
//   }
//   return "";
// }

// export function friendlyError(e) {
//   if (e?.name === "NotAllowedError") return "Access was blocked. In Windows Settings > Privacy & security, allow desktop apps to use the camera and microphone.";
//   if (e?.name === "NotFoundError" || e?.name === "OverconstrainedError") return "That device could not be found. Pick another one.";
//   if (e?.name === "NotReadableError") return "The device is busy. Close other apps using it and try again.";
//   return e?.message || String(e);
// }

// // export async function listDevices() {
// //   const screens = await window.cursorStudio.listScreens();
// //   const devs = await navigator.mediaDevices.enumerateDevices();
// //   return {
// //     screens,
// //     cameras: devs.filter((d) => d.kind === "videoinput").map((d, i) => ({ id: d.deviceId, label: d.label || `Camera ${i + 1}` })),
// //     mics: devs.filter((d) => d.kind === "audioinput" && d.deviceId !== "communications").map((d, i) => ({ id: d.deviceId, label: d.label || `Microphone ${i + 1}` })),
// //   };
// // }


// export async function listDevices() {
//   const screens = await window.cursorStudio.listScreens();

//   let devs = await navigator.mediaDevices.enumerateDevices();

//   // Electron/Chromium may not expose useful audio/video device
//   // information until media permission has been requested.
//   const hasAudio = devs.some((d) => d.kind === "audioinput");
//   const hasVideo = devs.some((d) => d.kind === "videoinput");

//   if (!hasAudio || !hasVideo) {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         audio: true,
//         video: true,
//       });

//       // Stop immediately. We only needed permission/device enumeration.
//       stream.getTracks().forEach((track) => track.stop());

//       devs = await navigator.mediaDevices.enumerateDevices();
//     } catch (err) {
//       console.warn("Could not request media permissions:", err);
//     }
//   }

//   return {
//     screens,

//     cameras: devs
//       .filter((d) => d.kind === "videoinput")
//       .map((d, i) => ({
//         id: d.deviceId,
//         label: d.label || `Camera ${i + 1}`,
//       })),

//     mics: devs
//       .filter(
//         (d) =>
//           d.kind === "audioinput" &&
//           d.deviceId !== "communications"
//       )
//       .map((d, i) => ({
//         id: d.deviceId,
//         label: d.label || `Microphone ${i + 1}`,
//       })),
//   };
// }



// function makeRecorder(stream, bitrate) {
//   const chunks = [];
//   const rec = new MediaRecorder(stream, { mimeType: pickMime(), videoBitsPerSecond: bitrate });
//   rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
//   const stopped = new Promise((res) => { rec.onstop = res; });
//   return { rec, stopped, blob: () => new Blob(chunks, { type: "video/webm" }) };
// }
// const release = (streams) => streams.filter(Boolean).forEach((s) => s.getTracks().forEach((t) => t.stop()));

// export async function startRecording({ mode, displayId, cameraId, micId }, { onFinished, onError } = {}) {
//   const api = window.cursorStudio;
//   const withScreen = needsScreen(mode), withCam = needsCam(mode);
//   let screenStream = null, camStream = null, micStream = null;

//   try {
//     if (withScreen) {
//       await api.setCaptureSource(displayId);              // main process answers getDisplayMedia with this display
//       screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 30, max: 60 }, cursor: "never" }, audio: false });
//     }
//     if (withCam) {
//       camStream = await navigator.mediaDevices.getUserMedia({
//         video: { deviceId: cameraId ? { exact: cameraId } : undefined, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
//         audio: false,
//       });
//     }
//     if (micId && micId !== "none") {
//       micStream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: micId }, echoCancellation: true, noiseSuppression: true }, video: false });
//     }
//   } catch (e) {
//     release([screenStream, camStream, micStream]);
//     throw e;
//   }

//   let unsubscribe = () => {};
//   try {
//     await api.prepareRecording({ withScreen, displayId });      // minimizes the window, shows toolbar, 3-2-1

//     // mic audio rides on the primary track (screen if present, else camera)
//     const primaryVideo = screenStream || camStream;
//     const primary = new MediaStream([...primaryVideo.getVideoTracks(), ...(micStream ? micStream.getAudioTracks() : [])]);
//     const main = makeRecorder(primary, withScreen ? 8e6 : 3e6);
//     const cam = withScreen && withCam ? makeRecorder(camStream, 3e6) : null;

//     main.rec.start(1000);
//     cam?.rec.start(1000);
//     const t0 = performance.now();
//     await api.startTracking({ withScreen });

//     let stopping = null;
//     const stop = () => {
//       if (stopping) return stopping;
//       stopping = (async () => {
//         try {
//           const cursor = await api.stopTracking();            // freeze cursor data first
//           const durationMs = Math.round(performance.now() - t0);
//           const recs = [main, cam].filter(Boolean);
//           recs.forEach((r) => r.rec.state !== "inactive" && r.rec.stop());
//           await Promise.all(recs.map((r) => r.stopped));
//           release([screenStream, camStream, micStream]);
//           const result = {
//             screenBlob: withScreen ? main.blob() : null,
//             cameraBlob: withScreen ? (cam ? cam.blob() : null) : main.blob(),
//             cursor: { events: cursor.events || [], segments: cursor.segments || [] },
//             durationMs,
//           };
//           return result;
//         } finally {
//           unsubscribe();
//           await api.finishRecording();                        // restores the window, hides toolbar
//         }
//       })();
//       stopping.then((r) => onFinished?.(r), (e) => onError?.(e));
//       return stopping;
//     };

//     unsubscribe = api.onStopRequest(stop);                    // toolbar Stop button / F10
//     if (screenStream) screenStream.getVideoTracks()[0].onended = stop;
//     return { stop };
//   } catch (e) {
//     release([screenStream, camStream, micStream]);
//     unsubscribe();
//     await api.finishRecording();
//     throw e;
//   }
// }

// Recorder for the Electron shell. Screen and camera are recorded separately, kept IN MEMORY as Blobs
// (nothing is written to disk), and handed back together with the cursor data.
//
//   const session = await startRecording({ mode:'both', displayId, cameraId, micId, hideCursor:true }, { onFinished, onError });
//   session.stop()           // optional - the floating toolbar / F10 also stop it
//   -> onFinished({ screenBlob, cameraBlob, cursor:{events,segments}, durationMs, cameraOffsetMs, nativeScreen })
//
// hideCursor (default true): on Windows the screen is captured natively WITHOUT the mouse cursor (the cursor path
// is recorded separately and drawn by the editor), like Screen Studio. The user still sees their cursor live.
// If native capture is unavailable it falls back to Chromium capture, where the cursor is baked into the video.
// cameraOffsetMs: the camera clip starts this many ms after the screen clip (place it that much later on the timeline).

// Recorder for the Electron shell. Screen and camera are recorded separately, kept IN MEMORY as Blobs
// (nothing is written to disk), and handed back together with the cursor data.
//
//   const session = await startRecording({ mode:'both', displayId, cameraId, micId, hideCursor:true }, { onFinished, onError });
//   session.stop()           // optional - the floating toolbar / F10 also stop it
//   -> onFinished({ screenBlob, cameraBlob, cursor:{events,segments}, durationMs, cameraOffsetMs, nativeScreen })
//
// hideCursor (default true): on Windows the screen is captured natively WITHOUT the mouse cursor (the cursor path
// is recorded separately and drawn by the editor), like Screen Studio. The user still sees their cursor live.
// If native capture is unavailable it falls back to Chromium capture, where the cursor is baked into the video.
// cameraOffsetMs: the camera clip starts this many ms after the screen clip (place it that much later on the timeline).

export const isElectron = () => typeof window !== "undefined" && !!window.cursorStudio;

const needsScreen = (m) => m !== "camera";
const needsCam = (m) => m !== "screen";

function pickMime() {
  for (const m of ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}

export function friendlyError(e) {
  if (e?.name === "NotAllowedError") return "Access was blocked. In Windows Settings > Privacy & security, allow desktop apps to use the camera and microphone.";
  if (e?.name === "NotFoundError" || e?.name === "OverconstrainedError") return "That device could not be found. Pick another one.";
  if (e?.name === "NotReadableError") return "The device is busy. Close other apps using it and try again.";
  return e?.message || String(e);
}

export async function listDevices() {
  const screens = await window.cursorStudio.listScreens();
  const devs = await navigator.mediaDevices.enumerateDevices();
  return {
    screens,
    cameras: devs.filter((d) => d.kind === "videoinput").map((d, i) => ({ id: d.deviceId, label: d.label || `Camera ${i + 1}` })),
    mics: devs.filter((d) => d.kind === "audioinput" && d.deviceId !== "communications").map((d, i) => ({ id: d.deviceId, label: d.label || `Microphone ${i + 1}` })),
  };
}

function makeRecorder(stream, bitrate, mimeType = pickMime()) {
  const chunks = [];
  const rec = new MediaRecorder(stream, { mimeType, ...(bitrate ? { videoBitsPerSecond: bitrate } : {}) });
  rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
  const stopped = new Promise((res) => { rec.onstop = res; });
  return { rec, stopped, startedAt: 0, blob: () => new Blob(chunks, { type: rec.mimeType || "video/webm" }) };
}
const release = (streams) => streams.filter(Boolean).forEach((s) => s.getTracks().forEach((t) => t.stop()));

export async function startRecording({ mode, displayId, cameraId, micId, hideCursor = true }, { onFinished, onError } = {}) {
  const api = window.cursorStudio;
  const withScreen = needsScreen(mode), withCam = needsCam(mode);
  const support = await api.trackingSupport();
  const native = withScreen && hideCursor && !!support.nativeScreen;   // cursor-less capture, done by the main process
  let screenStream = null, camStream = null, micStream = null;

  try {
    if (withScreen && !native) {
      await api.setCaptureSource(displayId);              // main process answers getDisplayMedia with this display
      screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 30, max: 60 }, cursor: "never" }, audio: false });
    }
    if (withCam) {
      camStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: cameraId ? { exact: cameraId } : undefined, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: false,
      });
    }
    if (micId && micId !== "none") {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: micId }, echoCancellation: true, noiseSuppression: true }, video: false });
    }
  } catch (e) {
    release([screenStream, camStream, micStream]);
    throw e;
  }

  let unsubscribe = () => {};
  try {
    await api.prepareRecording({ withScreen, displayId });      // minimizes the window, shows toolbar, 3-2-1

    let main = null, cam = null, mic = null, t0, startedAt;
    if (native) {
      // 1) start the cursor-less screen capture + cursor tracker; they share the clock of the first captured frame
      const info = await api.startTracking({ withScreen: true, nativeScreen: true });
      const recordingStart = performance.now();
      // 2) camera and mic start right after; the mic is muxed into the screen file when recording stops
      if (camStream) cam = makeRecorder(camStream, 3e6);
      if (micStream) mic = makeRecorder(new MediaStream(micStream.getAudioTracks()), 0, "audio/webm;codecs=opus");
      [cam, mic].forEach((r) => { if (r) { r.rec.start(); } });
      
      startedAt = recordingStart;
      if (!withCam) cam = null;
    } else {
      // mic audio rides on the primary track (screen if present, else camera)
      const primaryVideo = screenStream || camStream;
      const primary = new MediaStream([...primaryVideo.getVideoTracks(), ...(micStream ? micStream.getAudioTracks() : [])]);
      main = makeRecorder(primary, withScreen ? 8e6 : 3e6);
      cam = withScreen && withCam ? makeRecorder(camStream, 3e6) : null;
      main.rec.start(1000);
      cam?.rec.start(1000);
      [main, cam].forEach((r) => { if (r) r.startedAt = Date.now(); });
      await api.startTracking({ withScreen });
      startedAt = main.startedAt;
    }
    t0 = performance.now();

    let stopping = null;
    const stop = () => {
      if (stopping) return stopping;
      stopping = (async () => {
        try {
          const cursor = await api.stopTracking();            // freeze cursor data first
          const durationMs = Math.round(performance.now() - t0);
          const recs = [main, cam, mic].filter(Boolean);
          recs.forEach((r) => r.rec.state !== "inactive" && r.rec.stop());
          await Promise.all(recs.map((r) => r.stopped));
          release([screenStream, camStream, micStream]);

          let screenBlob = null;
          if (native) {
            // finalize the cursor-less file (and mux the mic into it)
            const micBuf = mic ? await mic.blob().arrayBuffer() : null;
            const res = await api.stopNativeScreen({ audio: micBuf, audioOffsetMs: mic ? mic.startedAt - startedAt : 0 });
            if (!res) throw new Error("The screen recording could not be finalized.");
            screenBlob = new Blob([res.bytes], { type: res.mime });
          } else if (withScreen) {
            screenBlob = main.blob();
          }
          const cameraRec = native ? cam : cam || (!withScreen ? main : null);
          return {
            screenBlob,
            cameraBlob: cameraRec ? cameraRec.blob() : null,
            cursor: { events: cursor.events || [], segments: cursor.segments || [], track: cursor.track || null, durationMs: cursor.durationMs },
            durationMs,
            cameraOffsetMs: cameraRec && withScreen ? Math.max(0, cameraRec.startedAt - startedAt) : 0,
            nativeScreen: native,
          };
        } finally {
          unsubscribe();
          await api.finishRecording();                        // restores the window, hides toolbar
        }
      })();
      stopping.then((r) => onFinished?.(r), (e) => onError?.(e));
      return stopping;
    };

    unsubscribe = api.onStopRequest(stop);                    // toolbar Stop button / F10
    if (screenStream) screenStream.getVideoTracks()[0].onended = stop;
    return { stop };
  } catch (e) {
    release([screenStream, camStream, micStream]);
    unsubscribe();
    await api.finishRecording();
    throw e;
  }
}