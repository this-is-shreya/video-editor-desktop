import axios from "axios";
import { Check } from "lucide-react";
import { useState } from "react";

export default function PricingCard({ open, onClose, loading = false }) {
  const [yearly, setYearly] = useState(false);

  if (!open) return null;

  const price = yearly ? 30 : 5;

  const features = [
    "No watermark",
    "Unlimited exports",
    "Commercial use",
    yearly ? "1 year of updates" : "1 month of updates",
  ];

  const handleBuyNow = async () => {
    // console.log("entered buynow")
    const res = await axios.post(
      `${import.meta.env.VITE_SERVER_URL}/pay`,
      {
        plan: yearly ? "yearly" : "monthly",
      },
      {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    return res;
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.65)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 410,
          borderRadius: 20,
          background: "#141416",
          border: "1px solid rgba(59,130,246,.22)",
          boxShadow: "0 30px 80px rgba(0,0,0,.55)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            width: 220,
            height: 220,
            background: "#2563eb",
            opacity: 0.08,
            filter: "blur(90px)",
            borderRadius: "50%",
            top: -100,
            left: "50%",
            transform: "translateX(-50%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            padding: "26px 28px",
            position: "relative",
            zIndex: 2,
          }}
        >
          {/* Header */}
          <div
            style={{
              marginBottom: 20,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
            }}
          >
            <h2
              className="price-serif"
              style={{
                margin: 0,
                color: "#fff",
                fontWeight: 600,
                fontSize: 28,
                lineHeight: 1.1,
              }}
            >
              Remove Watermark
            </h2>

            {/* Toggle */}
            <div
              style={{
                display: "flex",
                background: "rgba(255,255,255,.05)",
                border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 999,
                padding: 3,
              }}
            >
              <button
                onClick={() => setYearly(false)}
                style={{
                  padding: "6px 12px",
                  border: "none",
                  cursor: "pointer",
                  borderRadius: 999,
                  fontWeight: 600,
                  fontSize: 11,
                  background: yearly ? "transparent" : "#fff",
                  color: yearly ? "rgba(255,255,255,.55)" : "#111",
                  transition: ".15s",
                }}
              >
                Month
              </button>

              <button
                onClick={() => setYearly(true)}
                style={{
                  padding: "6px 12px",
                  border: "none",
                  cursor: "pointer",
                  borderRadius: 999,
                  fontWeight: 600,
                  fontSize: 11,
                  background: yearly ? "#fff" : "transparent",
                  color: yearly ? "#111" : "rgba(255,255,255,.55)",
                  transition: ".15s",
                }}
              >
                Year
              </button>
            </div>
          </div>

          {/* Price */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: 8,
              marginBottom: 18,
            }}
          >
            <div
              className="price-serif"
              style={{
                fontSize: 46,
                fontWeight: 600,
                color: "#fff",
                lineHeight: 1,
              }}
            >
              ${price}
            </div>

            <div
              style={{
                color: "rgba(255,255,255,.45)",
                fontSize: 12,
                marginBottom: 5,
              }}
            >
              one-time
            </div>
          </div>

          <div
            style={{
              height: 1,
              background: "rgba(255,255,255,.08)",
              marginBottom: 18,
            }}
          />

          {/* Features */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginBottom: 24,
            }}
          >
            {features.map((feature) => (
              <div
                key={feature}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  color: "rgba(255,255,255,.82)",
                  fontSize: 13.5,
                }}
              >
                <Check size={16} color="#60a5fa" />
                {feature}
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            disabled={loading}
            onClick={async() => {const res = await handleBuyNow(); 
              window.location.href = res.data.url;}}
            style={{
              width: "100%",
              height: 46,
              borderRadius: 11,
              border: "none",
              background: "#2563eb",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 14,
              transition: "background .15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#1d4ed8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#2563eb";
            }}
          >
            {loading ? "Redirecting..." : `Unlock Pro — $${price}`}
          </button>

          <button
            onClick={onClose}
            style={{
              width: "100%",
              marginTop: 12,
              border: "none",
              background: "transparent",
              color: "rgba(255,255,255,.45)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Maybe Later
          </button>

          <div
            style={{
              marginTop: 18,
              textAlign: "center",
              color: "rgba(255,255,255,.3)",
              fontSize: 11.5,
            }}
          >
            Pay once • No subscription • Instant activation
          </div>
        </div>
      </div>
    </div>
  );
}
