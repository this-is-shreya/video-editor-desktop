
import React from "react";
import { DEFAULT_CURSOR_STYLE } from "./lib/cursor/overlay";

const col = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
};

const lab = {
  fontSize: "13px",
  color: "#9ca3af",
};

const h = {
  fontSize: 13,
  fontWeight: 600,
  margin: "6px 0 0",
  color: "#e7e9ee",
};

function Range({ label, value, min, max, step, fmt = (v) => v, onChange }) {
  return (
    <label style={{ ...lab, display: "grid", gap: 4 }}>
      <span
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{label}</span>
        <span style={{ color: "#e7e9ee" }}>{fmt(value)}</span>
      </span>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}

function Check({ label, value, onChange }) {
  return (
    <label
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        fontSize: 13,
        color: "#e7e9ee",
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function Choice({ label, value, options, onChange }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <span style={lab}>{label}</span>

      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
        }}
        role="radiogroup"
      >
        {options.map(([v, t]) => (
          <button
            key={v}
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            style={{
              flex: "1 1 56px",
              padding: "6px 8px",
              fontSize: 12,
              borderRadius: 6,
              cursor: "pointer",
              color: "#e7e9ee",
              border: `1px solid ${
                value === v ? "#5ab0ff" : "#2f3440"
              }`,
              background: value === v ? "#242833" : "transparent",
            }}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

function ColorControl({ label, value, onChange }) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 13,
        color: "#9ca3af",
        cursor: "pointer",
      }}
    >
      <span>{label}</span>

      <span
        style={{
          position: "relative",
          width: 24,
          height: 24,
          borderRadius: 6,
          overflow: "hidden",
          border: "1px solid #3a3f4a",
          background: value,
          flexShrink: 0,
        }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            position: "absolute",
            inset: -4,
            width: 32,
            height: 32,
            padding: 0,
            border: 0,
            opacity: 0,
            cursor: "pointer",
          }}
        />
      </span>
    </label>
  );
}

/**
 * Sidebar "Cursor" options.
 *
 * style / setStyle : cursorStyle state held in App.jsx
 * zooms / setZooms : change zoom level of all cursor segments at once
 */
export default function CursorPanel({
  style,
  setStyle,
  zooms,
  setZooms,
  hasTrack = false,
}) {
  const cursorZooms = zooms.filter((z) => z.type === "cursor");

  const set = (k, v) =>
    setStyle((s) => ({
      ...s,
      [k]: v,
    }));

  const setG = (k, v) =>
    setStyle((s) => ({
      ...s,
      glitter: {
        ...s.glitter,
        [k]: v,
      },
    }));

  if (!cursorZooms.length && !hasTrack) {
    return (
      <div
        style={{
          ...lab,
          lineHeight: 1.5,
        }}
      >
        No cursor data yet. Record your screen and double-click to start
        tracking the cursor, then double-click again to stop. Each tracked
        part appears on the timeline as a cursor zoom.
      </div>
    );
  }

  const hasZooms = cursorZooms.length > 0;
  const avgScale = hasZooms
    ? cursorZooms[0].scale || 1.2
    : 1.2;

  return (
    <div style={col}>
      <div
        style={{
          ...lab,
          fontSize: 12,
          lineHeight: 1.45,
        }}
      >
        {hasTrack
          ? "The custom cursor is drawn for the whole recording. Double-click segments also zoom and follow it."
          : "The custom cursor only appears while the playhead is inside a cursor zoom on the timeline."}
      </div>

      <Choice
        label="Style"
        value={style.style}
        onChange={(v) => set("style", v)}
        options={[
          ["black", "Black"],
          ["white", "White"],
          ["accent", "Color"],
        ]}
      />

      {(style.style === "accent" ||
        style.ripple ||
        style.style === "Color") && (
        <ColorControl
          label="Cursor / ripple color"
          value={style.accent}
          onChange={(v) => set("accent", v)}
        />
      )}

      <Range
        label="Size"
        value={style.size}
        min={0.5}
        max={3}
        step={0.05}
        fmt={(v) => v.toFixed(2) + "x"}
        onChange={(v) => set("size", v)}
      />

      <Check
        label="Change shape with the system cursor"
        value={style.adaptive}
        onChange={(v) => set("adaptive", v)}
      />

      <Check
        label="Grow with zoom level"
        value={style.followZoom}
        onChange={(v) => set("followZoom", v)}
      />

      <Check
        label="Ripple on click"
        value={style.ripple}
        onChange={(v) => set("ripple", v)}
      />

      <Range
        label="Smoothing (cursor and zoom camera)"
        value={style.smoothing}
        min={0}
        max={1}
        step={0.05}
        fmt={(v) => Math.round(v * 100) + "%"}
        onChange={(v) => set("smoothing", v)}
      />

      <p style={h}>Glitter trail</p>

      <Check
        label="Sparkles behind the cursor"
        value={style.glitter.enabled}
        onChange={(v) => setG("enabled", v)}
      />

      <Choice
        label="Color"
        value={style.glitter.color}
        onChange={(v) => setG("color", v)}
        options={[
          ["gold", "Gold"],
          ["rainbow", "Rainbow"],
          ["pink", "Pink"],
          ["blue", "Blue"],
          ["white", "White"],
          ["accent", "Custom"],
        ]}
      />

      {style.glitter.color === "accent" && (
        <ColorControl
          label="Glitter color"
          value={style.accent}
          onChange={(v) => set("accent", v)}
        />
      )}

      <Range
        label="Trail length"
        value={style.glitter.life}
        min={300}
        max={1500}
        step={50}
        fmt={(v) => v + " ms"}
        onChange={(v) => setG("life", v)}
      />

      <Range
        label="Sparkle size"
        value={style.glitter.size}
        min={0.5}
        max={2.5}
        step={0.05}
        fmt={(v) => v.toFixed(2) + "x"}
        onChange={(v) => setG("size", v)}
      />

      {hasZooms && (
        <>
          <p style={h}>Zoom</p>

          <Range
            label={`Zoom level (all ${cursorZooms.length} cursor segments)`}
            value={avgScale}
            min={1}
            max={2}
            step={0.1}
            fmt={(v) => v.toFixed(1) + "x"}
            onChange={(v) =>
              setZooms((zs) =>
                zs.map((z) =>
                  z.type === "cursor"
                    ? { ...z, scale: v }
                    : z
                )
              )
            }
          />
        </>
      )}

      <p style={h}>Sync</p>

      <Range
        label="Cursor delay"
        value={style.delayMs}
        min={-2600}
        max={2600}
        step={10}
        fmt={(v) => v + " ms"}
        onChange={(v) => set("delayMs", v)}
      />

      <button
        onClick={() => setStyle(DEFAULT_CURSOR_STYLE)}
        style={{
          padding: "7px 10px",
          borderRadius: 6,
          border: "1px solid #2f3440",
          background: "transparent",
          color: "#e7e9ee",
          cursor: "pointer",
        }}
      >
        Reset to defaults
      </button>
    </div>
  );
}