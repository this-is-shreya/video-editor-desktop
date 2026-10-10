const LIMIT = 10;

export const undoRedo = (history, action, newState = null) => {
  const { past, present, future } = history;

  switch (action) {
    case "set": {
      const newPast = [...past, present];

      if (newPast.length > LIMIT) {
        newPast.shift(); // remove oldest
      }
      // console.log("returning: ", {
      //   past: newPast,
      //   present: newState,
      //   future: [],
      // });
      
      return {
        past: newPast,
        present: newState,
        future: [],
      };
    }

    case "undo": {
      if (past.length === 0) return history;

      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);
        // console.log("returning for undo: ", {
        //   past: newPast,
        //   present: previous,
        //   future: [present, ...future],
        // });
        
      return {
        past: newPast,
        present: previous,
        future: [present, ...future],
      };
    }

    case "redo": {
      if (future.length === 0) return history;

      const next = future[0];
      const newFuture = future.slice(1);

      return {
        past: [...past, present],
        present: next,
        future: newFuture,
      };
    }

    default:
      return history;
  }
};
