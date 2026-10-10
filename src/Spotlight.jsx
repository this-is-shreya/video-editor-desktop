import React, { useState, useRef, useEffect } from "react";

const SpotlightBox = ({
  parentWidth = 1080,
  parentHeight = 600,
  spotlight,
  setSpotlights,
}) => {
  const { x, y, width, height, id } = spotlight;
  // console.log("spotlight>>", spotlight);

  const [box, setBox] = useState({
    x: x,
    y: y,
    width: width,
    height: height,
  });

  const isDragging = useRef(false);
  const isResizing = useRef(null);
  const startPos = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if ((!isDragging.current && !isResizing.current) || !startPos.current)
        return;

      const dx = e.clientX - startPos.current?.mouseX;
      const dy = e.clientY - startPos.current?.mouseY;

      if (isDragging.current) {
        setBox((prev) => {
          const newX = Math.max(
            0,
            Math.min(startPos.current?.boxX + dx, parentWidth - prev.width),
          );
          const newY = Math.max(
            0,
            Math.min(startPos.current?.boxY + dy, parentHeight - prev.height),
          );
          return { ...prev, x: newX, y: newY };
        });
      } else if (isResizing.current) {
        if (
          !startPos.current ||
          !startPos.current.boxW ||
          !startPos.current.boxH ||
          !startPos.current.boxX ||
          !startPos.current.boxY
        )
          return;
        setBox(() => {
          let { boxX = 0, boxY = 0, boxW = 100, boxH = 100 } = startPos.current;
          const type = isResizing.current;

          // FREEHAND RESIZE (no aspect ratio)
          if (type.includes("t")) {
            const newY = Math.max(0, boxY + dy);
            boxH = boxH + (boxY - newY);
            boxY = newY;
          }

          if (type.includes("b")) {
            boxH = Math.min(boxH + dy, parentHeight - boxY);
          }

          if (type.includes("l")) {
            const newX = Math.max(0, boxX + dx);
            boxW = boxW + (boxX - newX);
            boxX = newX;
          }

          if (type.includes("r")) {
            boxW = Math.min(boxW + dx, parentWidth - boxX);
          }

          return {
            x: boxX,
            y: boxY,
            width: Math.max(50, boxW),
            height: Math.max(50, boxH),
          };
        });
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      isResizing.current = null;
      startPos.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [parentWidth, parentHeight]);

  const onMouseDown = (e, type) => {
    e.stopPropagation();
    e.preventDefault();

    if (type === "drag") isDragging.current = true;
    else isResizing.current = type;

    startPos.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      boxX: box.x,
      boxY: box.y,
      boxW: box.width,
      boxH: box.height,
    };
  };

  const handleStyle = {
    position: "absolute",
    width: "12px",
    height: "12px",
    backgroundColor: "#00e0ff",
    border: "1px solid white",
    borderRadius: "50%",
    zIndex: 3,
  };

  // 🔥 Spotlight overlay (dark outside, transparent inside)
  const spotlightStyle = {
    position: "absolute",
    left: box.x,
    top: box.y,
    width: box.width,
    height: box.height,
    background: "transparent",
    boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
    pointerEvents: "none",
    zIndex: 1,
  };

  // Sync back to state (normalized)
  useEffect(() => {
    setSpotlights((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              x: box.x,
              y: box.y,
              width: box.width,
              height: box.height,
            }
          : s,
      ),
    );
  }, [box]);

  return (
    <>
      {/* DARK OVERLAY */}
      <div style={spotlightStyle} />

      {/* RESIZABLE BOX */}
      <div
        onMouseDown={(e) => onMouseDown(e, "drag")}
        style={{
          position: "absolute",
          left: box.x,
          top: box.y,
          width: box.width,
          height: box.height,
          border: "2px solid #00e0ff",
          borderRadius: "8px",
          cursor: "move",
          boxSizing: "border-box",
          zIndex: 2,
        }}
      >
        {/* HANDLES */}
        <div
          onMouseDown={(e) => onMouseDown(e, "tl")}
          style={{ ...handleStyle, top: -6, left: -6, cursor: "nw-resize" }}
        />
        <div
          onMouseDown={(e) => onMouseDown(e, "tr")}
          style={{ ...handleStyle, top: -6, right: -6, cursor: "ne-resize" }}
        />
        <div
          onMouseDown={(e) => onMouseDown(e, "bl")}
          style={{ ...handleStyle, bottom: -6, left: -6, cursor: "sw-resize" }}
        />
        <div
          onMouseDown={(e) => onMouseDown(e, "br")}
          style={{ ...handleStyle, bottom: -6, right: -6, cursor: "se-resize" }}
        />
      </div>
    </>
  );
};

export default SpotlightBox;
