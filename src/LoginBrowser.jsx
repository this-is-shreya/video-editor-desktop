import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { loginWithGoogle } from "./lib/firebase";
import { useApp } from "./AppContext";

const SERVER = import.meta.env.VITE_SERVER_URL;

const styles = {
  page: {
    minHeight: "100vh",
    width: "100vw",
    boxSizing: "border-box",
    background:
      "radial-gradient(ellipse at 50% 35%, rgba(37,99,235,0.13), transparent 48%), #090b10",
    color: "#f8fafc",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    display: "flex",
    flexDirection: "column",
    overflow: "auto",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    padding: "28px 36px",
    display: "flex",
    alignItems: "center",
    gap: 11,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 11,
    background: "#2563eb",
    display: "grid",
    placeItems: "center",
    boxShadow: "0 0 28px rgba(37,99,235,0.3)",
  },
  brand: {
    fontSize: 20,
    fontWeight: 750,
    letterSpacing: "-0.7px",
  },
  main: {
    flex: 1,
    display: "grid",
    placeItems: "center",
    padding: "110px 24px 48px",
  },
  card: {
    width: "100%",
    maxWidth: 440,
    boxSizing: "border-box",
    padding: "42px 36px 34px",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 22,
    background: "rgba(18,21,29,0.88)",
    boxShadow: "0 24px 90px rgba(0,0,0,0.32)",
    textAlign: "center",
  },
  iconWrap: {
    width: 58,
    height: 58,
    margin: "0 auto 24px",
    borderRadius: 18,
    display: "grid",
    placeItems: "center",
    background: "rgba(37,99,235,0.13)",
    border: "1px solid rgba(96,165,250,0.2)",
    color: "#60a5fa",
  },
  heading: {
    margin: "0 0 12px",
    fontSize: 29,
    fontWeight: 720,
    letterSpacing: "-1px",
    lineHeight: 1.2,
  },
  description: {
    margin: "0 auto 28px",
    maxWidth: 330,
    color: "#9ca3af",
    fontSize: 14,
    lineHeight: 1.75,
  },
  primary: {
    width: "100%",
    minHeight: 48,
    boxSizing: "border-box",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 11,
    padding: "13px 18px",
    border: "1px solid #fff",
    borderRadius: 11,
    background: "#fff",
    color: "#111827",
    fontSize: 14,
    fontWeight: 650,
    textDecoration: "none",
    cursor: "pointer",
    transition: "background 150ms ease",
  },
  secondary: {
    width: "100%",
    minHeight: 46,
    boxSizing: "border-box",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "12px 16px",
    gap:"15px",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 11,
    background: "transparent",
    color: "#e5e7eb",
    fontSize: 14,
    fontWeight: 550,
    textDecoration: "none",
    cursor: "pointer",
  },
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: 11,
  },
  divider: {
    height: 1,
    background: "rgba(255,255,255,0.08)",
    margin: "24px 0 18px",
  },
  footer: {
    textAlign: "center",
    padding: "0 20px 24px",
    color: "#6b7280",
    fontSize: 12,
  },
  error: {
    color: "#fca5a5",
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    lineHeight: 1.6,
    marginBottom: 18,
  },
};

function BrandIcon({ size = "25px" }) {
  return (
    <img src="logo.png" height={size} width={size}/>
  );
}

function GoogleIcon() {
  return (
    <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt=""
            width={20}
            height={20}
          />
  );
}

export default function LoginBrowser() {
  const params = new URLSearchParams(window.location.search);
  const challenge = params.get("challenge");
  const [phase, setPhase] = useState("checking");
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { logout } = useApp();
  

  const checkSession = useCallback(async () => {
    if (!challenge) {
      setPhase("error");
      setError("This sign-in link is missing its challenge. Please start login from RookieClip.");
      return;
    }

    setPhase("checking");
    setError("");

    try {
      const { data } = await axios.get(`${SERVER}/auth/status-desktop`, {
        withCredentials: true,
      });

      if (!data.loggedIn) {
        setPhase("needsLogin");
        return;
      }

      const result = await axios.post(
        `${SERVER}/auth/desktop/code`,
        { challenge },
        { withCredentials: true }
      );

      setLink(`rookieclip://auth?code=${encodeURIComponent(result.data.code)}`);
      setPhase("ready");
    } catch (err) {
      console.error("Desktop login check failed:", err);
      setError("We couldn't verify your session. Please try again.");
      setPhase("error");
    }
  }, [challenge]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  async function handleLogout() {
    setBusy(true);
    setError("");

    try {
      await logout();
      setLink("");
      setPhase("needsLogin");
    } catch (err) {
      console.error("Logout failed:", err);
      setError(
        "Logout failed. Your server must provide POST /auth/logout to clear the browser session."
      );
    } finally {
      setBusy(false);
    }
  }

  function handleDifferentAccount() {
    // Firebase's Google provider should use prompt: "select_account".
    // The current loginWithGoogle function should preserve its redirect behavior.
    loginWithGoogle(
      `/desktop-login?challenge=${encodeURIComponent(challenge)}&switchAccount=1`
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.logo}>
          <BrandIcon size="36px"/>
        </div>
        <span style={styles.brand}>RookieClip</span>
      </header>

      <main style={styles.main}>
        <section style={styles.card}>
          <div style={styles.iconWrap}>
            <BrandIcon size={"30px"} />
          </div>

          {phase === "checking" && (
            <>
              <h1 style={styles.heading}>Checking your session</h1>
              <p style={styles.description}>
                One moment while we securely connect to RookieClip.
              </p>
              <button style={styles.secondary} disabled>
                Checking...
              </button>
            </>
          )}

          {phase === "needsLogin" && (
            <>
              <h1 style={styles.heading}>Welcome to RookieClip</h1>
              <p style={styles.description}>
                Sign in to continue to your desktop editor and pick up where you left off.
              </p>

              <div style={styles.actions}>
                <button
                  style={styles.primary}
                  onClick={() =>
                    loginWithGoogle(
                      `/desktop-login?challenge=${encodeURIComponent(challenge)}`
                    )
                  }
                >
                  <GoogleIcon />
                  Continue with Google
                </button>
              </div>

              <p style={{ ...styles.description, marginTop: 22, marginBottom: 0, fontSize: 12 }}>
                Your account helps sync your RookieClip access.
              </p>
            </>
          )}

          {phase === "ready" && (
            <>
              <h1 style={styles.heading}>You're all set!</h1>
              <p style={styles.description}>
                You're signed in. Open the RookieClip desktop app to continue.
              </p>

              <div style={styles.actions}>
                <a href={link} style={styles.primary}>
                  <BrandIcon size={"20px"} />
                  Open RookieClip
                </a>

                <button
                  type="button"
                  style={{
                    ...styles.secondary,
                    color: "#9ca3af",
                    borderColor: "transparent",
                  }}
                  onClick={handleLogout}
                  disabled={busy}
                >
                  {busy ? "Signing out..." : "Log out"}
                </button>
              </div>
            </>
          )}

          {phase === "error" && (
            <>
              <h1 style={styles.heading}>Couldn't connect</h1>
              <p style={styles.description}>
                We couldn't complete desktop sign-in.
              </p>
              {error && <div style={styles.error}>{error}</div>}
              <div style={styles.actions}>
                <button style={styles.primary} onClick={checkSession}>
                  Try again
                </button>
              </div>
            </>
          )}
        </section>
      </main>

      <footer style={styles.footer}>
        Secure sign-in for RookieClip Desktop
      </footer>
    </div>
  );
}
