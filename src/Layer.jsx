import React, { useState, useRef, useEffect } from "react";

const Layer = ({ element, setElements, isCrop, parentWidth, parentHeight, setSelectedElement }) => {

  // console.log(">>received ", element);
  if(!element) return null;
const [box, setBox] = useState({
  x: isCrop ? (element.cropDraft?.x ?? element.crop?.x ?? 0) : element.x,
  y: isCrop ? (element.cropDraft?.y ?? element.crop?.y ?? 0) : element.y,
  width: isCrop
    ? (element.cropDraft?.width ?? element.crop?.width ?? element.width)
    : element.width,
  height: isCrop
    ? (element.cropDraft?.height ?? element.crop?.height ?? element.height)
    : element.height,
});

const isCropRef = useRef(isCrop);

useEffect(() => {
  isCropRef.current = isCrop;
}, [isCrop]);
    
  const isDragging = useRef(false);
  const isResizing = useRef(null);
  const startPos = useRef(null);
const aspectRatio = useRef(element.width / element.height);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if ((!isDragging.current && !isResizing.current))
        return;
      if (!startPos.current || startPos.current === null) return;

      const dx = e.clientX - startPos.current.mouseX;
      const dy = e.clientY - startPos.current.mouseY;

      if (isDragging.current) {
        if (!startPos.current || startPos.current === null) return;
        setBox((prev) => {
          // Clamp X and Y to keep box inside parent boundaries
          if (!startPos.current || startPos.current === null) return prev;
          //clamp within canvas bounds
          // const newX = Math.max(
          //   0,
          //   Math.min(startPos.current.boxX + dx, parentWidth - prev.width),
          // );
          // const newY = Math.max(
          //   0,
          //   Math.min(startPos.current.boxY + dy, parentHeight - prev.height),
          // );
          const newX = startPos.current.boxX + dx;
          const newY = startPos.current.boxY + dy;
          return { ...prev, x: newX, y: newY };
        });
      } else if (isResizing.current) {
        setBox(() => {
          if (!startPos.current) return box;

          let { boxX, boxY, boxW, boxH } = startPos.current;
          const type = isResizing.current;
          
          if (isCropRef.current) {
            // FREEHAND CROP (your old logic)
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
          } else {
            // NORMAL RESIZE (keep aspect ratio)
            const ratio = aspectRatio.current;

            if (type.includes("r")) boxW = boxW + dx;
            if (type.includes("l")) boxW = boxW - dx;

            let newH = boxW / ratio;

            if (type.includes("l")) {
              boxX = boxX + (startPos.current.boxW - boxW);
            }

            if (type.includes("t")) {
              boxY = boxY + (startPos.current.boxH - newH);
            }

            boxH = newH;
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

    aspectRatio.current = box.width / box.height;
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

  useEffect(()=>{
    setBox({
      x: isCrop ? (element.cropDraft?.x ?? element.crop?.x ?? 0) : element.x,
      y: isCrop ? (element.cropDraft?.y ?? element.crop?.y ?? 0) : element.y,
      width: isCrop
        ? (element.cropDraft?.width ?? element.crop?.width ?? element.width)
        : element.width,
      height: isCrop
        ? (element.cropDraft?.height ?? element.crop?.height ?? element.height)
        : element.height,
    });
  },[element.id])

  useEffect(() => {
    if (isCrop) {

      setElements((prevElements) =>
        prevElements.map((el) =>
          el.id === element.id
            ? {
                ...el,
                cropDraft: {
                  x: box.x,
                  y: box.y,
                  width: box.width,
                  height: box.height,
                },
              }
            : el,
        ),
      );
    } else {
        setElements((prevElements) =>
          prevElements.map((el) =>
            el.id === element.id
              ? {
                  ...el,
                  
                  x: box.x,
                  y: box.y,
                  width: box.width,
                  height: box.height,
                }
              : el,
          ),
        );
      
    }

  }, [box, isCrop]);

  return (
    <div
      onMouseDown={(e) => onMouseDown(e, "drag")}
      onDoubleClick={() => setSelectedElement(null)}
      style={{
        position: "absolute",
        left: box?.x,
        top: box?.y,
        width: box?.width,
        height: box?.height,
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

export default Layer;
