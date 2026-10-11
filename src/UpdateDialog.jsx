
import { useEffect, useState } from "react";

export default function UpdateDialog({setUpdateDialogOpen}) {
  const [update, setUpdate] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const unsubscribeStatus = window.cursorStudio.onUpdateStatus((data) => {
      setUpdate(data);
    });

    const unsubscribeProgress = window.cursorStudio.onUpdateProgress(
      (data) => setProgress(data.percent)
    );

    return () => {
      unsubscribeStatus();
      unsubscribeProgress();
    };
  }, []);

  if (!update) {
    setUpdateDialogOpen(false);
    return null;
  } 

  const downloaded = update.state === "downloaded";
  const downloading = update.state === "downloading";
  const error = update.state === "error";

  return (
    <div style={styles.overlay}>
      <div style={styles.dialog}>
        <div style={styles.icon}>
          {downloaded ? "✓" : error ? "!" : "↻"}
        </div>

        <h2 style={styles.title}>
          {downloaded
            ? "Update ready to install"
            : error
            ? "Update failed"
            : "New version released"}
        </h2>

        <p style={styles.message}>{update.message}</p>

        {downloading && (
          <div style={styles.progressTrack}>
            <div
              style={{
                ...styles.progress,
                width: `${progress}%`,
              }}
            />
          </div>
        )}

        {downloading && (
          <p style={styles.percent}>{progress}% downloaded</p>
        )}

        {downloaded && (
          <button
            style={styles.primary}
            onClick={() => window.cursorStudio.installUpdate()}
          >
            Restart and Install
          </button>
        )}

        {(error || downloaded) && (
          <button
            style={styles.secondary}
            onClick={() => setUpdate(null)}
          >
            {error ? "Close" : "Later"}
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 99999,
    background: "rgba(0,0,0,0.68)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(5px)",
  },
  dialog: {
    width: 360,
    padding: 28,
    borderRadius: 16,
    background: "#1c1f26",
    border: "1px solid #343944",
    color: "#f9fafb",
    textAlign: "center",
    boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
  },
  icon: {
    width: 48,
    height: 48,
    margin: "0 auto 16px",
    borderRadius: 14,
    background: "#263b61",
    color: "#60a5fa",
    display: "grid",
    placeItems: "center",
    fontSize: 24,
  },
  title: {
    fontSize: 19,
    margin: "0 0 10px",
    fontWeight: 650,
  },
  message: {
    color: "#aeb6c5",
    fontSize: 13,
    lineHeight: 1.6,
    marginBottom: 22,
  },
  progressTrack: {
    height: 6,
    background: "#343944",
    borderRadius: 8,
    overflow: "hidden",
  },
  progress: {
    height: "100%",
    background: "#3b82f6",
    transition: "width 200ms ease",
  },
  percent: {
    fontSize: 12,
    color: "#aeb6c5",
    marginBottom: 20,
  },
  primary: {
    width: "100%",
    padding: 12,
    background: "#2563eb",
    color: "white",
    border: 0,
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    marginTop: 8,
  },
  secondary: {
    width: "100%",
    padding: 10,
    background: "transparent",
    color: "#cbd5e1",
    border: "1px solid #414653",
    borderRadius: 8,
    cursor: "pointer",
    marginTop: 10,
  },
};
