
// import React, { useEffect, useRef, useState } from "react";
// import {
//   isElectron,
//   listDevices,
//   startRecording,
//   friendlyError,
// } from "./lib/electronRecorder";

// const MODES = [
//   { id: "screen", label: "Screen" },
//   { id: "camera", label: "Camera" },
//   { id: "both", label: "Screen + camera" },
// ];

// const box = {
//   width: "260px",
//   maxWidth: "260px",
//   minWidth: 0,
//   boxSizing: "border-box",
//   display: "flex",
//   flexDirection: "column",
//   gap: "12px",
// };

// const label = {
//   width: "100%",
//   minWidth: 0,
//   boxSizing: "border-box",
//   fontSize: "13px",
//   color: "#9ca3af",
//   display: "flex",
//   flexDirection: "column",
//   gap: "5px",
// };

// const selectStyle = {
//   width: "100%",
//   minWidth: 0,
//   maxWidth: "100%",
//   boxSizing: "border-box",
//   height: "34px",
//   padding: "0 30px 0 9px",
//   borderRadius: "6px",
//   border: "1px solid #2f3440",
//   background: "#181b22",
//   color: "#e7e9ee",
//   fontSize: "12px",
//   outline: "none",
//   overflow: "hidden",
//   textOverflow: "ellipsis",
//   whiteSpace: "nowrap",
// };

// const modeButton = {
//   flex: "1 1 0",
//   minWidth: 0,
//   width: 0,
//   padding: "7px 4px",
//   fontSize: "11px",
//   borderRadius: 6,
//   cursor: "pointer",
//   whiteSpace: "nowrap",
//   overflow: "hidden",
//   textOverflow: "ellipsis",
// };

// const hintStyle = {
//   fontSize: 11,
//   lineHeight: 1.45,
//   color: "#9ca3af",
//   borderLeft: "3px solid #ffd86b",
//   paddingLeft: 9,
// };

// export default function RecordPanel({ onRecorded }) {
//   const [mode, setMode] = useState("screen");
//   const [dev, setDev] = useState({
//     screens: [],
//     cameras: [],
//     mics: [],
//   });
//   const [displayId, setDisplayId] = useState("");
//   const [cameraId, setCameraId] = useState("");
//   const [micId, setMicId] = useState("none");
//   const [status, setStatus] = useState("idle");
//   const [error, setError] = useState("");

//   const sessionRef = useRef(null);
//   const cbRef = useRef(onRecorded);

//   cbRef.current = onRecorded;

//   const refresh = async () => {
//     try {
//       const d = await listDevices();

//       setDev(d);

//       setDisplayId(
//         (cur) =>
//           cur ||
//           (d.screens.find((s) => s.primary) || d.screens[0])?.id ||
//           ""
//       );

//       setCameraId((cur) => cur || d.cameras[0]?.id || "");
//     } catch (e) {
//       console.error("Failed to enumerate recording devices:", e);
//     }
//   };

//   useEffect(() => {
//     if (!isElectron()) return;

//     refresh();

//     navigator.mediaDevices.addEventListener("devicechange", refresh);

//     return () =>
//       navigator.mediaDevices.removeEventListener("devicechange", refresh);
//   }, []);

//   if (!isElectron()) {
//     return (
//       <div style={{ color: "#9ca3af", fontSize: 13 }}>
//         Recording is available in the desktop app.
//       </div>
//     );
//   }

//   const start = async () => {
//     setError("");
//     setStatus("starting");

//     try {
//       sessionRef.current = await startRecording(
//         {
//           mode,
//           displayId,
//           cameraId,
//           micId,
//         },
//         {
//           onFinished: async (result) => {
//             sessionRef.current = null;
//             setStatus("processing");

//             try {
//               await cbRef.current(result);
//             } finally {
//               setStatus("idle");
//               refresh();
//             }
//           },

//           onError: (e) => {
//             sessionRef.current = null;
//             setStatus("idle");
//             setError(friendlyError(e));
//           },
//         }
//       );

//       setStatus("recording");
//     } catch (e) {
//       setStatus("idle");
//       setError(friendlyError(e));
//     }
//   };

//   const busy = status !== "idle";
//   const needScreen = mode !== "camera";
//   const needCam = mode !== "screen";

//   return (
//     <div style={box}>
//       <div
//         style={{
//           display: "flex",
//           gap: 5,
//           width: "100%",
//           minWidth: 0,
//         }}
//         role="radiogroup"
//         aria-label="Recording type"
//       >
//         {MODES.map((m) => (
//           <button
//             key={m.id}
//             role="radio"
//             aria-checked={mode === m.id}
//             disabled={busy}
//             onClick={() => setMode(m.id)}
//             style={{
//               ...modeButton,
//               border: `1px solid ${
//                 mode === m.id ? "#5ab0ff" : "#2f3440"
//               }`,
//               background:
//                 mode === m.id ? "#242833" : "transparent",
//               color: "#e7e9ee",
//               opacity: busy ? 0.6 : 1,
//             }}
//           >
//             {m.label}
//           </button>
//         ))}
//       </div>

//       {needScreen && (
//         <label style={label}>
//           Display

//           <select
//             value={displayId}
//             onChange={(e) => setDisplayId(e.target.value)}
//             disabled={busy}
//             style={selectStyle}
//             title={
//               dev.screens.find((s) => s.id === displayId)?.label || ""
//             }
//           >
//             {dev.screens.length ? (
//               dev.screens.map((s) => (
//                 <option key={s.id} value={s.id}>
//                   {s.label}
//                 </option>
//               ))
//             ) : (
//               <option value="">No display found</option>
//             )}
//           </select>
//         </label>
//       )}

//       {needCam && (
//         <label style={label}>
//           Camera

//           <select
//             value={cameraId}
//             onChange={(e) => setCameraId(e.target.value)}
//             disabled={busy}
//             style={selectStyle}
//             title={
//               dev.cameras.find((c) => c.id === cameraId)?.label || ""
//             }
//           >
//             {dev.cameras.length ? (
//               dev.cameras.map((c) => (
//                 <option key={c.id} value={c.id}>
//                   {c.label}
//                 </option>
//               ))
//             ) : (
//               <option value="">No camera found</option>
//             )}
//           </select>
//         </label>
//       )}

//       <label style={label}>
//         Microphone

//         <select
//           value={micId}
//           onChange={(e) => setMicId(e.target.value)}
//           disabled={busy}
//           style={selectStyle}
//           title={
//             dev.mics.find((m) => m.id === micId)?.label ||
//             "No microphone"
//           }
//         >
//           <option value="none">No microphone</option>

//           {dev.mics.map((m) => (
//             <option key={m.id} value={m.id}>
//               {m.label}
//             </option>
//           ))}
//         </select>
//       </label>

//       {needScreen && (
//         <div style={hintStyle}>
//           While recording,{" "}
//           <b style={{ color: "#e7e9ee" }}>double-click</b> to start
//           tracking the cursor and double-click again to stop.
//           Each tracked part becomes a cursor zoom on the timeline.
//           <br />
//           <kbd>F9</kbd> toggles tracking, <kbd>F10</kbd> stops.
//         </div>
//       )}

//       <button
//         onClick={start}
//         disabled={
//           busy ||
//           (needCam && !cameraId && !dev.cameras.length)
//         }
//         style={{
//           width: "100%",
//           minWidth: 0,
//           boxSizing: "border-box",
//           padding: "9px 10px",
//           borderRadius: 7,
//           border: 0,
//           fontWeight: 600,
//           fontSize: 12,
//           cursor: busy ? "default" : "pointer",
//           background: "#5ab0ff",
//           color: "#06121f",
//           opacity: busy ? 0.6 : 1,
//           overflow: "hidden",
//           textOverflow: "ellipsis",
//           whiteSpace: "nowrap",
//         }}
//       >
//         {status === "starting"
//           ? "Starting..."
//           : status === "recording"
//           ? "Recording..."
//           : status === "processing"
//           ? "Adding to timeline..."
//           : "Start recording"}
//       </button>

//       {error && (
//         <div
//           role="alert"
//           style={{
//             color: "#ff4d5e",
//             fontSize: 12,
//             lineHeight: 1.4,
//             overflowWrap: "anywhere",
//           }}
//         >
//           {error}
//         </div>
//       )}
//     </div>
//   );
// }

import React, { useEffect, useRef, useState } from "react";
import {
  isElectron,
  listDevices,
  startRecording,
  friendlyError,
} from "./lib/electronRecorder";

const MODES = [
  { id: "screen", label: "Screen" },
  { id: "camera", label: "Camera" },
  { id: "both", label: "Screen + camera" },
];

const panel = {
  width: "100%",
  maxWidth: "280px",
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  boxSizing: "border-box",
};

const field = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: "5px",
  fontSize: "12px",
  color: "#9ca3af",
};

const selectStyle = {
  width: "100%",
  minWidth: 0,
  height: "34px",
  padding: "0 9px",
  borderRadius: "7px",
  border: "1px solid #303642",
  background: "#181b22",
  color: "#e7e9ee",
  fontSize: "12px",
  outline: "none",
  boxSizing: "border-box",
};

const section = {
  minWidth: 0,
};

export default function RecordPanel({ onRecorded }) {
  const [mode, setMode] = useState("screen");
  const [dev, setDev] = useState({
    screens: [],
    cameras: [],
    mics: [],
  });
  const [displayId, setDisplayId] = useState("");
  const [cameraId, setCameraId] = useState("");
  const [micId, setMicId] = useState("none");
  const [hideCursor, setHideCursor] = useState(true);
  const [nativeOk, setNativeOk] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const sessionRef = useRef(null);
  const cbRef = useRef(onRecorded);

  cbRef.current = onRecorded;

  const refresh = async () => {
    const d = await listDevices();

    setDev(d);

    setDisplayId(
      (cur) =>
        cur ||
        (d.screens.find((s) => s.primary) || d.screens[0])?.id ||
        ""
    );

    setCameraId((cur) => cur || d.cameras[0]?.id || "");
  };

  useEffect(() => {
    if (!isElectron()) return;

    refresh().catch(() => {});

    window.cursorStudio
      .trackingSupport()
      .then((s) => setNativeOk(!!s.nativeScreen))
      .catch(() => {});

    navigator.mediaDevices.addEventListener("devicechange", refresh);

    return () =>
      navigator.mediaDevices.removeEventListener("devicechange", refresh);
  }, []);

  if (!isElectron()) {
    return (
      <div style={{ color: "#9ca3af", fontSize: 13 }}>
        Recording is available in the desktop app.
      </div>
    );
  }

  const start = async () => {
    setError("");
    setStatus("starting");

    try {
      sessionRef.current = await startRecording(
        {
          mode,
          displayId,
          cameraId,
          micId,
          hideCursor,
        },
        {
          onFinished: async (result) => {
            sessionRef.current = null;
            setStatus("processing");

            try {
              await cbRef.current(result);
            } finally {
              setStatus("idle");
              refresh().catch(() => {});
            }
          },

          onError: (e) => {
            sessionRef.current = null;
            setStatus("idle");
            setError(friendlyError(e));
          },
        }
      );

      setStatus("recording");
    } catch (e) {
      setStatus("idle");
      setError(friendlyError(e));
    }
  };

  const busy = status !== "idle";
  const needScreen = mode !== "camera";
  const needCam = mode !== "screen";

  return (
    <div style={panel}>
      {/* Recording mode */}
      <div
        style={{
          ...section,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1.25fr",
          gap: "5px",
        }}
        role="radiogroup"
        aria-label="Recording type"
      >
        {MODES.map((m) => {
          const active = mode === m.id;

          return (
            <button
              key={m.id}
              role="radio"
              aria-checked={active}
              disabled={busy}
              onClick={() => setMode(m.id)}
              style={{
                minWidth: 0,
                height: "32px",
                padding: "0 6px",
                borderRadius: "7px",
                cursor: busy ? "default" : "pointer",
                border: `1px solid ${
                  active ? "#5ab0ff" : "#303642"
                }`,
                background: active ? "#202631" : "#181b22",
                color: active ? "#f1f5f9" : "#9ca3af",
                fontSize: "11px",
                fontWeight: active ? 600 : 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                boxSizing: "border-box",
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Display */}
      {needScreen && (
        <label style={field}>
          <span>Display</span>
          <select
            value={displayId}
            onChange={(e) => setDisplayId(e.target.value)}
            disabled={busy}
            style={selectStyle}
          >
            {dev.screens.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* Camera */}
      {needCam && (
        <label style={field}>
          <span>Camera</span>
          <select
            value={cameraId}
            onChange={(e) => setCameraId(e.target.value)}
            disabled={busy}
            style={selectStyle}
          >
            {dev.cameras.length ? (
              dev.cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))
            ) : (
              <option value="">No camera found</option>
            )}
          </select>
        </label>
      )}

      {/* Microphone */}
      <label style={field}>
        <span>Microphone</span>
        <select
          value={micId}
          onChange={(e) => setMicId(e.target.value)}
          disabled={busy}
          style={selectStyle}
        >
          <option value="none">No microphone</option>

          {dev.mics.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      {/* Cursor */}
      {needScreen && nativeOk && (
        <label
          style={{
            display: "flex",
            gap: "9px",
            alignItems: "flex-start",
            minWidth: 0,
            color: "#e7e9ee",
            fontSize: "12px",
            lineHeight: 1.45,
            cursor: busy ? "default" : "pointer",
          }}
        >
          {/* <input
            type="checkbox"
            checked={hideCursor}
            disabled={busy}
            onChange={(e) => setHideCursor(e.target.checked)}
            style={{
              margin: "2px 0 0",
              flexShrink: 0,
              accentColor: "#5ab0ff",
            }}
          /> */}

          {/* <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontWeight: 500 }}>
              Leave the cursor out of the video
            </span>

            <span
              style={{
                display: "block",
                marginTop: "2px",
                fontSize: "11px",
                lineHeight: 1.4,
                color: "#7f8794",
              }}
            >
              You still see your cursor while recording. The editor draws
              the styled cursor from the tracked path instead.
            </span>
          </span> */}
        </label>
      )}

      {/* Tracking info */}
      {needScreen && (
        <div
          style={{
            minWidth: 0,
            padding: "8px 9px",
            borderRadius: "6px",
            border: "1px solid #34312a",
            background: "#1b1a17",
            color: "#8f8b80",
            fontSize: "11px",
            lineHeight: 1.45,
            boxSizing: "border-box",
          }}
        >
          <div>
            Double-click to start cursor tracking and double-click again to
            stop.
          </div>

          <div style={{ marginTop: "4px", color: "#747068" }}>
            <kbd
              style={{
                padding: "1px 4px",
                borderRadius: "4px",
                border: "1px solid #3a3833",
                background: "#24221e",
                color: "#aaa59a",
                fontSize: "10px",
              }}
            >
              F9
            </kbd>{" "}
            tracking{" "}
            <span style={{ margin: "0 3px" }}>·</span>{" "}
            <kbd
              style={{
                padding: "1px 4px",
                borderRadius: "4px",
                border: "1px solid #3a3833",
                background: "#24221e",
                color: "#aaa59a",
                fontSize: "10px",
              }}
            >
              F10
            </kbd>{" "}
            stop
          </div>
        </div>
      )}

      {/* Start */}
      <button
        onClick={start}
        disabled={
          busy || (needCam && !cameraId && !dev.cameras.length)
        }
        style={{
          width: "100%",
          height: "36px",
          padding: "0 12px",
          borderRadius: "7px",
          border: "1px solid #5ab0ff",
          fontWeight: 600,
          fontSize: "12px",
          cursor: busy ? "default" : "pointer",
          background: "#5ab0ff",
          color: "#06121f",
          opacity: busy ? 0.6 : 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          boxSizing: "border-box",
        }}
      >
        {status === "starting"
          ? "Starting..."
          : status === "recording"
          ? "Recording... use toolbar to stop"
          : status === "processing"
          ? "Adding to timeline..."
          : "Start recording"}
      </button>

      {error && (
        <div
          role="alert"
          style={{
            minWidth: 0,
            color: "#ff6472",
            fontSize: "12px",
            lineHeight: 1.4,
            overflowWrap: "anywhere",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

