const IconButton = ({ icon, label, onClick, styles }) => (
  <button
    onClick={onClick}
    style={{
      display: "flex",
      alignItems: "center",
      gap: "8px",
      background: "#1f1f2a",
      border: "none",
      color: "#e5e7eb",
      padding: "8px 12px",
      borderRadius: "8px",
      cursor: "pointer",
      transition: "0.2s",
      ...styles,
    }}
  >
    {icon}
    <span style={{ fontSize: "13px" }}>{label}</span>
  </button>
);

export default IconButton;