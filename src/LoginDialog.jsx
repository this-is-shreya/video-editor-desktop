import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { loginWithGoogle } from "./lib/firebase";
import { useApp } from "./AppContext"; // adjust the path

export default function LoginDialog({ open, onClose }) {
  const dialogRef = useRef(null);
  const { user } = useApp();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Close as soon as the user is logged in. Works for the website and the desktop app, because
  // AppContext updates `user` once the browser login completes (see AppContext.jsx).
  useEffect(() => {
    if (open && user?.isLoggedIn) onClose();
  }, [open, user?.isLoggedIn]);

  const handleLogin = () => {
    if (window.cursorStudio?.auth) window.cursorStudio.auth.login().catch(() => {});
    else loginWithGoogle();
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      style={{
        border: "none",
        borderRadius: 18,
        padding: 0,
        background: "#18181b",
        color: "#fff",
        width: "min(420px, calc(100vw - 32px))",
        overflow: "hidden",
        boxShadow: "0 30px 80px rgba(0,0,0,.6)",
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        margin: 0,
      }}
    >
      <div
        style={{
          padding: 28,
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            border: "none",
            background: "transparent",
            color: "#888",
            cursor: "pointer",
          }}
        >
          <X size={18} />
        </button>

        <h2
          style={{
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          Sign in to continue
        </h2>

        <p
          style={{
            color: "rgba(255,255,255,.65)",
            fontSize: 14,
            lineHeight: 1.6,
            marginBottom: 28,
          }}
        >
          Login to purchase RookieClip Pro, manage your license, and receive
          future updates.
        </p>

        <button
          onClick={handleLogin}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 10,
            border: "none",
            background: "#fff",
            color: "#111",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 15,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 10,
          }}
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt=""
            width={20}
            height={20}
          />
          Continue with Google
        </button>

        <p
          style={{
            marginTop: 18,
            textAlign: "center",
            color: "rgba(255,255,255,.45)",
            fontSize: 12,
          }}
        >
          By continuing you agree to the Terms & Privacy Policy.
        </p>
      </div>
    </dialog>
  );
}