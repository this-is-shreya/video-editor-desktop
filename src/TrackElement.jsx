import React, { useEffect, useRef } from "react";

const TrackElement = ({
  el,
  SCALE,
  selectedElement,
  setSelectedElement,
  setElements,
  type = "element",
  setTransitions,
  handleUndoRedo,
  toast,
  trimCursorZooms,
}) => {
  const TYPE_COLORS = {
    zoom: "green",
    cursorZoom:"orange",
    text: "#e8cf2a",
    element: "blue",
    image: "#9D4EDD",
    audio: "#e82ae4",
    effect: "#a607c4",
  };

  const bg = TYPE_COLORS[type] || "#555";

  const dragState = useRef({
    active: false,
    elementId: null,
    startX: 0,
  });

  const resizeState = useRef({
    active: false,
    handle: null,
    elementId: null,
    startX: 0,
  });

  const handleClipPointerDown = (e, elementId) => {
    if (type === "cursorZoom") {
      return;
    }
    e.stopPropagation();
    resizeState.current.active = false;
    dragState.current = {
      active: true,
      elementId,
      startX: e.clientX,
      originalStart: el.start,
      originalEnd: el.end,
    };

    e.target.setPointerCapture(e.pointerId);
  };

  const handleClipPointerMove = (e) => {
    if (!dragState.current.active) return;
    if (type === "cursorZoom") {
      return;
    }
    resizeState.current.active = false;

    const rawDx = (e.clientX - dragState.current.startX) / SCALE;

    setElements((prev) =>
      prev.map((item) => {
        if (item.id !== dragState.current.elementId) return item;

        const duration = item.end - item.start;
        const nextStart = item.start + rawDx;
        const nextEnd = nextStart + duration;

        if (nextStart <= 0) {
          return {
            ...item,
            start: 0,
            end: duration,
          };
        }

        // 🚫 Check overlap BEFORE applying move
        const isColliding = prev.some((other) => {
          if (other.id === item.id || other.track != item.track) return false;
          return nextStart < other.end && nextEnd > other.start;
        });

        if (isColliding) {
          return item; // ❌ Block movement
        }
        setTransitions((prevTransitions) =>
          prevTransitions.map((t) => {
            if (t.id !== item.id) return t;

            return {
              ...t,
              start: Number(nextEnd - 1).toFixed(2),
            };
          }),
        );

        return {
          ...item,
          start: nextStart,
          end: nextEnd,
        };
      }),
    );

    // ❗ Only update startX if movement actually happened
    dragState.current.startX = e.clientX;
  };

  const handleClipPointerUp = (e) => {
    if (type === "cursorZoom") {
      return;
    }
    dragState.current.active = false;
    dragState.current.elementId = null;
    resizeState.current.active = false;

    try {
      e.target.releasePointerCapture(e.pointerId);
      handleUndoRedo();
    } catch {}
  };

  const handlePointerDown = (e, handleType, elementId) => {
    if (type === "cursorZoom") {
      return;
    }
    e.stopPropagation();
    if (dragState.current.active) return;
    if(selectedElement.track <3 && selectedElement.speed !== 1) {
      toast.error("Cannot trim while speed is not 1x. Please reset speed to 1x to trim.", { duration: 3000 });
      return;
    }
    resizeState.current = {
      active: true,
      handle: handleType,
      elementId,
      startX: e.clientX,
    };

    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!resizeState.current.active) return;
    if (dragState.current.active) return;
    if (type === "cursorZoom") {
      return;
    }
    const { startX, handle, elementId } = resizeState.current;
    const deltaX = (e.clientX - startX) / SCALE;

    resizeState.current.startX = e.clientX;

    onUpdate(elementId, deltaX, handle);
  };

  const handlePointerUp = (e) => {
    if (type === "cursorZoom") {
      return;
    }
    resizeState.current.active = false;
    resizeState.current.handle = null;
    resizeState.current.elementId = null;

    try {
      e.target.releasePointerCapture(e.pointerId);
      handleUndoRedo();
    } catch {}
  };

  const onUpdate = (targetId, deltaX, handleType) => {
    if (type === "cursorZoom") {
      return;
    }
    const MIN_DURATION = 3;
    setElements((prevElements) =>
      prevElements.map((el) => {
        if (el.id !== targetId) return el;
        const videoDuration = el.originalEnd - el.originalStart;
        let { start, end, trimLeft, trimRight } = el;
        if (type === "image" || type === "effect") {
          if (handleType === "right") {
            const newEnd = Math.max(start + MIN_DURATION, end + deltaX);

            // 🚫 Prevent overlap
            const isColliding = prevElements.some((other) => {
              if (other.id === el.id || other.track !== el.track)
                return false;

              return start < other.end && newEnd > other.start;
            });

            if (isColliding) return el;

            return { ...el, end: newEnd };
          }

          if (handleType === "left") {
            const newStart = Math.min(end - MIN_DURATION, start + deltaX);

            const isColliding = prevElements.some((other) => {
              if (other.id === el.id || other.track !== el.track)
                return false;

              return newStart < other.end && end > other.start;
            });

            if (isColliding) return el;
            trimCursorZooms(zooms, el, newStart, el.end)
            return { ...el, start: newStart };
          }

          return el;
        }
        if (handleType === "right") {
          // deltaX is positive when moving right, negative when moving left
          if (deltaX === 0) return el;
          else if (deltaX < 0) {
            // check if it's greater than start
            if (end + deltaX - start < MIN_DURATION) {

              setTransitions((prev) =>
                prev.map((t) => {
                  if (t.id !== el.id) return t;

                    return {
                      ...t,
                      start: Number(start + MIN_DURATION).toFixed(2),
                    };

                }),
              );
              return {
                ...el,
                end: start + MIN_DURATION,
                trimRight: videoDuration - (start + MIN_DURATION),
              };
            } else {
              setTransitions((prev) =>
                prev.map((t) => {
                  if (t.id !== el.id) return t;

                  return {
                    ...t,
                    start: Number(end + deltaX).toFixed(2),
                  };
                }),
              );
              trimCursorZooms(el, el.start, el.end - (trimRight + Math.abs(deltaX)))
              return {
                ...el,
                end: end + deltaX,
                trimRight: trimRight + Math.abs(deltaX),
              };
            }
          } else {
            // check if it's within trimmed end
            if (deltaX > trimRight) {
                setTransitions((prev) =>
                  prev.map((t) => {
                    if (t.id !== el.id) return t;

                    return {
                      ...t,
                      start: Number(end + trimRight).toFixed(2),
                    };
                  }),
                );
              return { ...el, end: end + trimRight, trimRight: 0 };
            } else {
              setTransitions((prev) =>
                prev.map((t) => {
                  if (t.id !== el.id) return t;

                  return {
                    ...t,
                    start: end + deltaX,
                  };
                }),
              );
              trimCursorZooms(el, el.start, el.end - (el.trimRight - deltaX))

              return {
                ...el,
                end: end + deltaX,
                trimRight: trimRight - deltaX,
              };
            }
          }
        }
        if (handleType === "left") {
          // deltaX is positive when moving right, negative when moving left
          if (deltaX === 0) return el;
          else if (deltaX > 0) {
            // check if it's less than end - MIN_DURATION
            const newStart = Math.min(start + deltaX, end - MIN_DURATION);
            const actualDelta = newStart - start;
            return {
              ...el,
              start: newStart,
              trimLeft: trimLeft + actualDelta,
            };
          } else {
            // check if it's within trimmed start
            if (Math.abs(deltaX) > trimLeft) {
              trimCursorZooms(el, start - trimLeft, el.end)

              return { ...el, start: start - trimLeft, trimLeft: 0 };
            }
            const newStart = start + deltaX;
              trimCursorZooms(el, newStart, el.end)

            return { ...el, start: newStart, trimLeft: trimLeft + deltaX };
          }
        }
        return el;
      }),
    );
  };

  return (
    <div
      onPointerDown={(e) => handleClipPointerDown(e, el.id)}
      onPointerMove={handleClipPointerMove}
      onPointerUp={handleClipPointerUp}
      onClick={() => setSelectedElement(el)}
      onDoubleClick={() => setSelectedElement(null)}
      key={el.id}
      id={el.id}
      style={{
        position: "absolute",
        left: el.start * SCALE,
        width: (el.end - el.start) * SCALE,
        height: 30,
        marginTop: 5,
        background: bg,
        borderColor:
          selectedElement && selectedElement.id === el.id ? "red" : "",
        borderWidth: 2,
        borderStyle: "solid",
        borderRadius: 4,
      }}
    >
      {/* Left Handle */}
      <div
        onPointerDown={(e) => handlePointerDown(e, "left", el.id)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position: "absolute",
          left: 0,
          width: "10px",
          height: "100%",
          cursor: "ew-resize",
          background: "rgba(255,255,255,0.3)",
        }}
      />
      {/* Right Handle */}
      <div
        onPointerDown={(e) => handlePointerDown(e, "right", el.id)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position: "absolute",
          right: 0,
          width: "10px",
          height: "100%",
          cursor: "ew-resize",
          background: "rgba(255,255,255,0.3)",
        }}
      />
    </div>
  );
};

export default TrackElement;
