import { CrownIcon } from "lucide-react";
import React, { useEffect, useMemo, useReducer, useState } from "react";
import { useApp } from "./AppContext";

const dummyTranscript = [
  { id: 1, text: "Hello", start: 0, end: 0.4 },
  { id: 2, text: "everyone,", start: 0.4, end: 0.8 },
  { id: 3, text: "um", start: 0.8, end: 1.0, isFiller: true },
  { id: 4, text: "welcome", start: 1.0, end: 1.5 },
  { id: 5, text: "to", start: 1.5, end: 1.7 },
  { id: 6, text: "RookieClip.", start: 1.7, end: 2.2 },

  { id: 7, text: "Today", start: 2.8, end: 3.2 },
  { id: 8, text: "we're", start: 3.2, end: 3.6 },
  { id: 9, text: "going", start: 3.6, end: 3.9 },
  { id: 10, text: "to", start: 3.9, end: 4.1 },
  { id: 11, text: "uh", start: 4.1, end: 4.3, isFiller: true },
  { id: 12, text: "talk", start: 4.3, end: 4.7 },
  { id: 13, text: "about", start: 4.7, end: 5.1 },
  { id: 14, text: "video", start: 5.1, end: 5.5 },
  { id: 15, text: "editing.", start: 5.5, end: 6.0 },

  { id: 16, text: "This", start: 6.6, end: 6.9 },
  { id: 17, text: "tool", start: 6.9, end: 7.2 },
  { id: 18, text: "helps", start: 7.2, end: 7.6 },
  { id: 19, text: "you", start: 7.6, end: 7.8 },
  { id: 20, text: "edit", start: 7.8, end: 8.2 },
  { id: 21, text: "captions", start: 8.2, end: 8.7 },
  { id: 22, text: "super", start: 8.7, end: 9.1 },
  { id: 23, text: "fast.", start: 9.1, end: 9.5 },

  { id: 24, text: "So,", start: 10.1, end: 10.4 },
  { id: 25, text: "uh", start: 10.4, end: 10.6, isFiller: true },
  { id: 26, text: "let's", start: 10.6, end: 11.0 },
  { id: 27, text: "get", start: 11.0, end: 11.3 },
  { id: 28, text: "started", start: 11.3, end: 11.8 },
  { id: 29, text: "right", start: 11.8, end: 12.1 },
  { id: 30, text: "now.", start: 12.1, end: 12.5 },

  { id: 31, text: "Thanks", start: 13.1, end: 13.5 },
  { id: 32, text: "for", start: 13.5, end: 13.7 },
  { id: 33, text: "watching!", start: 13.7, end: 14.3 },
  { id: 34, text: "um", start: 14.3, end: 14.6, isFiller: true },
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "hi", label: "Hindi" },
  { code: "ja", label: "Japanese" },
];

const MAX_WORD_LENGTH = 30;
const LINE_GAP_THRESHOLD = 0.5; // start a new line after a pause this long
const MAX_WORDS_PER_LINE = 9;

const pad = (n, len = 2) => String(n).padStart(len, "0");

const formatClock = (seconds) => {
  const h = Math.floor(seconds / 60 / 60);
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

const formatSRTTime = (seconds) => {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(totalMs / 3600000);
  const m = Math.floor((totalMs % 3600000) / 60000);
  const s = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
};

// Group words into subtitle-style lines: break on a long pause or once a
// line has enough words, similar to how caption tools chunk transcripts.
const groupIntoLines = (words) => {
  const lines = [];
  let current = [];

  words.forEach((word) => {
    if (current.length === 0) {
      current.push(word);
      return;
    }
    const prev = current[current.length - 1];
    const gap = word.start - prev.end;
    if (gap > LINE_GAP_THRESHOLD || current.length >= MAX_WORDS_PER_LINE) {
      lines.push(current);
      current = [word];
    } else {
      current.push(word);
    }
  });

  if (current.length) lines.push(current);
  return lines;
};

const buildSRT = (lines) => {
  const entries = lines
    .map((line) => {
      const active = line.filter((w) => !w.deleted);
      if (!active.length) return null;
      return {
        start: active[0].start,
        end: active[active.length - 1].end,
        text: active.map((w) => w.text).join(" "),
      };
    })
    .filter(Boolean);

  return entries
    .map(
      (e, i) =>
        `${i + 1}\n${formatSRTTime(e.start)} --> ${formatSRTTime(e.end)}\n${e.text}`,
    )
    .join("\n\n");
};

const DownloadIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3v12" />
    <path d="M7 10l5 5 5-5" />
    <path d="M5 21h14" />
  </svg>
);

const SubtitleEditor = ({ setPlayHeadPosition, setCurrentTime, SCALE,
  transcript,
  setTranscript,
  SUBTITLE_STYLES,
  setSubtitleStyle,
  handleDeleteSubtitle,
  handleRemoveFillers,
  handleUndoRedo,
  elements,
  zooms,
  generateTranscript,
  originalTranscript,
  setSubtitlePosition,
  setDisplaySubtitles,
  isNotPaidUser,
  setPricingDialogOpen,
  setLoginDialogOpen
 }) => {
    const { user } = useApp();
  
  const [language, setLanguage] = useState("en");

  const generateSubtitles = async() => {
    if (isNotPaidUser) {
      if (user === null || !user?.isLoggedIn) {
        setLoginDialogOpen(true);
      } else {
        setPricingDialogOpen(true);
      }
    }
    else{
      await generateTranscript();
      setTranscript(originalTranscript);
      handleUndoRedo({elements, zooms, transcript: originalTranscript})
    }
  };

const updateWord = (id, text) => {
  setTranscript(prev=>prev.map((word) =>
    word.id === id ? { ...word, text: text.slice(0, MAX_WORD_LENGTH) } : word,
  ))
};

const toggleDelete = (id) => {
  const word = transcript.find((w) => w.id === id);
  if (!word) return;

  const deleting = !word.deleted;

  setTranscript(prev=>prev.map((word) =>
    word.id === id ? { ...word, deleted: !word.deleted } : word,
  ));

  handleDeleteSubtitle(id, deleting);
};

  const lines = useMemo(() => groupIntoLines(transcript), [transcript]);

  const handleDownloadSRT = () => {
    const srt = buildSRT(lines);
    const blob = new Blob([srt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subtitles-${language}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const languageSelect = (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value)}
      style={{
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid #374151",
        background: "#1f2937",
        color: "#f3f4f6",
        fontSize: 13,
        cursor: "pointer",
        outline: "none",
      }}
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );

  if (originalTranscript.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: 30,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* {languageSelect} */}
        <button
          onClick={generateSubtitles}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            cursor: "pointer",
            color: "white",
            fontWeight: 600,
          }}
        >
        <div
        style={{
          display: "flex",
          gap: 14,
          boxSizing: "border-box",
            height:"100%"

        }}
      >
      <span>Generate Subtitles</span>
          <CrownIcon size={15} color="#facc15" />
      </div>
          
          
        </button>
      </div>
    );
  }


  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        padding: 20,
        background: "#1a1a23",
        borderRadius: 12,
        border: "1px solid #1f2937",
      }}
    >
      <style>{`
        .word-wrap {
          position: relative;
          display: inline-flex;
        }
        .word-wrap .delete-btn {
          opacity: 0;
          transform: scale(0.8);
          pointer-events: none;
          transition: opacity 0.12s ease, transform 0.12s ease;
        }
        .word-wrap:hover .delete-btn {
          opacity: 1;
          transform: scale(1);
          pointer-events: auto;
        }
        .word-input {
          transition: background 0.12s ease, border-color 0.12s ease;
        }
        .word-input:focus {
          background: #2a3441 !important;
        }
        .word-input-filler:focus {
          background: #4a3a12 !important;
        }
        .download-btn {
          transition: background 0.12s ease, border-color 0.12s ease, transform 0.08s ease;
        }
        .download-btn:hover {
          background: #263042 !important;
          border-color: #4b5563 !important;
        }
        .download-btn:active {
          transform: scale(0.97);
        }
      `}</style>

     <div
  style={{
    width: "100%",
    boxSizing: "border-box",
    padding: "14px 16px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom:"20px"
  }}
>
  {/* Left: Actions */}
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
    }}
  >
    <button
      onClick={generateSubtitles}
      style={{
        height: "38px",
        padding: "0 16px",
        borderRadius: "8px",
        border: "1px solid #3b82f6",
        cursor: "pointer",
        color: "#fff",
        fontSize: "13px",
        fontWeight: 600,
        transition: "background 0.15s ease",
      }}
    >
      Regenerate Subtitles
    </button>

    <button
      onClick={handleRemoveFillers}
      style={{
        height: "38px",
        padding: "0 15px",
        borderRadius: "8px",
        border: "1px solid #333",
        cursor: "pointer",
        background: "#1a1a1a",
        color: "#e5e5e5",
        fontSize: "13px",
        fontWeight: 500,
      }}
    >
      Remove filler words
    </button>
  </div>

  {/* Right: Subtitle settings */}
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "18px",
      flexWrap: "wrap",
    }}
  >
    {/* Display subtitles */}
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        color: "#d4d4d4",
        fontSize: "13px",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      <input
        type="checkbox"
        onChange={(e) =>
          setDisplaySubtitles(e.target.checked)
        }
        style={{
          width: "15px",
          height: "15px",
          accentColor: "#3b82f6",
          cursor: "pointer",
        }}
      />
      Display subtitles
    </label>

    {/* Position */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <label
        style={{
          color: "#737373",
          fontSize: "12px",
        }}
      >
        Position
      </label>

      <select
        defaultValue="bottom"
        onChange={(e) =>
          setSubtitlePosition(e.target.value)
        }
        style={{
          height: "34px",
          padding: "0 30px 0 10px",
          borderRadius: "7px",
          border: "1px solid #333",
          background: "#1a1a1a",
          color: "#e5e5e5",
          fontSize: "13px",
          outline: "none",
          cursor: "pointer",
        }}
      >
        <option value="top">Top</option>
        <option value="mid">Middle</option>
        <option value="bottom">Bottom</option>
      </select>
    </div>

    {/* Style */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <label
        style={{
          color: "#737373",
          fontSize: "12px",
        }}
      >
        Style
      </label>

      <select
        defaultValue={Object.keys(SUBTITLE_STYLES)[0]}
        onChange={(e) =>
          setSubtitleStyle(
            SUBTITLE_STYLES[e.target.value]
          )
        }
        style={{
          height: "34px",
          minWidth: "130px",
          padding: "0 30px 0 10px",
          borderRadius: "7px",
          border: "1px solid #333",
          background: "#1a1a1a",
          color: "#e5e5e5",
          fontSize: "13px",
          outline: "none",
          cursor: "pointer",
        }}
      >
        {Object.keys(SUBTITLE_STYLES).map((ele) => (
          <option key={ele} value={ele}>
            {ele}
          </option>
        ))}
      </select>
    </div>
  </div>
</div>

      <div
        style={{
          width: "100%",
          boxSizing: "border-box",
          maxHeight: "400px",
          overflowY: "scroll",
          overflowX: "hidden",
          maxWidth: "100%",
        }}
      >
        {lines.map((line, li) => (
          <div
            key={li}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
              marginBottom: 14,
            }}
          >
            <span
              className="cursor-pointer hover:underline"
              style={{
                flexShrink: 0,
                minWidth: 40,
                textAlign: "right",
                paddingTop: 8,
                fontSize: 12,
                fontFamily: "monospace",
                color: "#6b7280",
              }}
              onClick={() => {
                setCurrentTime(line[0].start);
                setPlayHeadPosition(line[0].start * SCALE);
              }}
            >
              {formatClock(line[0].start)}
            </span>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                alignItems: "center",
              }}
            >
              {line.map((word) => (
                <div className="word-wrap" key={word.id}>
                  <input
                    className={`word-input ${word.isFiller ? "word-input-filler" : ""}`}
                    value={word.text}
                    onChange={(e) => updateWord(word.id, e.target.value)}
                    size={Math.max(word.text.length, 2)}
                    style={{
                      minWidth: 32,
                      border: word.isFiller
                        ? "1px solid #b45309"
                        : "1px solid #374151",
                      outline: "none",
                      background: word.deleted
                        ? "#27272a"
                        : word.isFiller
                          ? "#3a2e12"
                          : "#1f2937",
                      color: word.deleted
                        ? "#6b7280"
                        : word.isFiller
                          ? "#fbbf24"
                          : "#f3f4f6",
                      textDecoration: word.deleted ? "line-through" : "none",
                      borderRadius: 6,
                      padding: "6px 8px",
                      fontSize: 15,
                      fontFamily: "inherit",
                    }}
                    onClick={()=>{setPlayHeadPosition(word.start*SCALE);
                    setCurrentTime(word.start)}}
                  />
                  <button
                    className="delete-btn"
                    onClick={() => toggleDelete(word.id)}
                    title={word.deleted ? "Restore word" : "Delete word"}
                    style={{
                      position: "absolute",
                      top: -8,
                      right: -8,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: "none",
                      cursor: "pointer",
                      background: "#ffffff",
                      color: "#000000",
                      fontSize: 11,
                      lineHeight: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                    }}
                  >
                    {word.deleted ? "↺" : "✕"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubtitleEditor;
