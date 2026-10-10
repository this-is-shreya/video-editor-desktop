import { useState } from "react";

const SidebarButton = ({ icon, label, active, onClick }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 12px",
        width: "100%",
        borderRadius: "10px",
        background: active
          ? "linear-gradient(135deg, #232336, #1a1a28)"
          : hovered
            ? "rgba(255,255,255,0.06)"
            : "transparent",
        color: active ? "#fff" : hovered ? "#fff" : "#9ca3af",
        border: active
          ? "1px solid rgba(255,255,255,0.08)"
          : "1px solid transparent",
        cursor: "pointer",
        transition: "all 0.22s cubic-bezier(0.4,0,0.2,1)",
        transform: hovered ? "translateX(4px)" : "translateX(0px)",
        boxShadow: hovered ? "0 6px 18px rgba(0,0,0,0.22)" : "none",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.22s ease",
        }}
      >
        {icon}
      </div>

      <span
        style={{
          fontSize: "14px",
          fontWeight: active ? 600 : 500,
          letterSpacing: "0.2px",
        }}
      >
        {label}
      </span>
    </button>
  );
};

export default SidebarButton;
