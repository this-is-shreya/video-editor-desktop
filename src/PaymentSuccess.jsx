import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const PaymentSuccess = () => {
  const [status, setStatus] = useState("verifying");
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_SERVER_URL}/auth/status`,
          {
            withCredentials: true,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (res.data.user?.isPaid) {
          setStatus("success");
          clearInterval(interval);
          setTimeout(() => navigate("/"), 1500);
        }
        else{
            setStatus("failed");
            clearInterval(interval);
            setTimeout(() => navigate("/"), 1500);
        }
      } catch {}
    }, 2000);

    return () => clearInterval(interval);
  }, []);

return (
  <div
    style={{
      minHeight: "100vh",
      minWidth: "100vw",
      background: "#121417",
      color: "white",
      fontFamily: "Inter, sans-serif",
      position: "relative",
      overflow: "hidden",
    }}
  >
    {/* Background glow */}
    <div
      style={{
        position: "absolute",
        width: 700,
        height: 700,
        borderRadius: "50%",
        top: "-220px",
        left: "50%",
        transform: "translateX(-50%)",
        pointerEvents: "none",
      }}
    />

    {/* Logo */}
    <div
      style={{
        position: "absolute",
        top: 28,
        left: 36,
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor:"pointer"
      }}
      onClick={() => navigate("/")}
    >
      <img
        src="/favicon.png"
        alt="RookieClip"
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
        }}
      />

      <span
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          letterSpacing: 2,
          fontSize: 26,
        }}
      >
        RookieClip
      </span>
    </div>

    {/* Main */}
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          fontSize: 50,
          marginBottom: 24,
        }}
      >
        {status === "verifying" && "⏳"}
        {status === "success" && "✅"}
        {status === "failed" && "❌"}
      </div>

      <h1
        style={{
          margin: 0,
          fontWeight: 700,
          fontSize: 40,
          letterSpacing: "-0.02em",
        }}
      >
        {status === "verifying" && "Verifying payment"}
        {status === "success" && "Payment successful"}
        {status === "failed" && "Payment failed"}
      </h1>

      <p
        style={{
          marginTop: 18,
          maxWidth: 520,
          color: "#9CA3AF",
          fontSize: 15,
          lineHeight: 1.7,
        }}
      >
        {status === "verifying" &&
          "We're securely confirming your payment with Razorpay. This usually takes only a few seconds."}

        {status === "success" &&
          "Your purchase has been confirmed successfully. You'll be redirected to your dashboard automatically."}

        {status === "failed" &&
          "Unfortunately we couldn't verify your payment. If money was deducted, it will be refunded automatically according to your bank's timeline."}
      </p>

      {status === "verifying" && (
        <div
          style={{
            width: 260,
            height: 4,
            marginTop: 40,
            background: "#23272F",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "45%",
              height: "100%",
              borderRadius: 999,
              background: "#3B82F6",
            }}
          />
        </div>
      )}
    </div>
  </div>
);
};

export default PaymentSuccess;
