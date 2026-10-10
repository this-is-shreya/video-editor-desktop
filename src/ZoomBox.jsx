import React, { useState, useRef, useEffect } from "react";

const ZoomBox = ({
  parentWidth = 1080,
  parentHeight = 600,
  setZoomSelected,
  zoom,
  setZooms,
}) => {
  const { x, y, w, h } = zoom;
  const DISPLAY_WIDTH = 720;
  const DISPLAY_HEIGHT = 405;

  const [box, setBox] = useState({
    x: x * DISPLAY_WIDTH,
    y: y * DISPLAY_HEIGHT,
    width: w * DISPLAY_WIDTH,
    height: h * DISPLAY_HEIGHT,
  });
  const isDragging = useRef(false);
  const isResizing = useRef(null);
  const startPos = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if ((!isDragging.current && !isResizing.current) || !startPos.current)
        return;

      const dx = e.clientX - startPos.current.mouseX;
      const dy = e.clientY - startPos.current.mouseY;

      if (isDragging.current) {
        if (!startPos.current) return;

        setBox((prev) => {
          // Clamp X and Y to keep box inside parent boundaries
          if (!startPos.current || startPos.current === null) return prev;

          const newX = Math.max(
            0,
            Math.min(startPos.current.boxX + dx, parentWidth - prev.width),
          );
          const newY = Math.max(
            0,
            Math.min(startPos.current.boxY + dy, parentHeight - prev.height),
          );
          return { ...prev, x: newX, y: newY };
        });
      } else if (isResizing.current) {
        setBox(() => {
          if (!startPos.current) return box;
          let { boxX, boxY, boxW, boxH } = startPos.current;
          const type = isResizing.current;

          // Vertical Resize & Position Clamping
          if (type.includes("t")) {
            const newY = Math.max(0, boxY + dy); // Can't go above 0
            boxH = boxH + (boxY - newY); // Adjust height based on actual change in Y
            boxY = newY;
          }
          if (type.includes("b")) {
            boxH = Math.min(boxH + dy, parentHeight - boxY); // Can't exceed parent height
          }

          // Horizontal Resize & Position Clamping
          if (type.includes("l")) {
            const newX = Math.max(0, boxX + dx); // Can't go left of 0
            boxW = boxW + (boxX - newX); // Adjust width based on actual change in X
            boxX = newX;
          }
          if (type.includes("r")) {
            boxW = Math.min(boxW + dx, parentWidth - boxX); // Can't exceed parent width
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
  }, [parentWidth, parentHeight]); // Re-run if parent dimensions change

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
    backgroundColor: "#3b82f6",
    border: "1px solid white",
    borderRadius: "50%",
    zIndex: 10,
  };

  useEffect(() => {
    setZooms((prevZooms) =>
      prevZooms.map((z) =>
        z.id === zoom.id
          ? {
              ...z,
              x: box.x / parentWidth,
              y: box.y / parentHeight,
              w: box.width / parentWidth,
              h: box.height / parentHeight,
            }
          : z,
      ),
    );
  }, [box]);

  return (
    <div
      onMouseDown={(e) => onMouseDown(e, "drag")}
      onDoubleClick={() => setZoomSelected(null)}
      style={{
        position: "absolute",
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        border: "2px solid #3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        cursor: "move",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          padding: "8px",
          fontSize: "11px",
          pointerEvents: "none",
          color: "#333",
        }}
      >
        {Math.round(box.x)}, {Math.round(box.y)} | {Math.round(box.width)}x
        {Math.round(box.height)}
      </div>

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
  );
};

export default ZoomBox;
