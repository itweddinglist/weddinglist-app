"use client";

export default function SaveIndicator({ status }) {
  if (status === "idle") return null;

  const config = {
    dirty: { text: "", show: false },
    saving: { text: "Se salvează...", color: "#7a7f99" },
    saved: { text: "✓ Salvat", color: "#48bb78" },
    error: { text: "Eroare la salvare", color: "#e53e3e" },
  };

  const current = config[status];
  if (!current || !current.text) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "16px",
        right: "16px",
        fontSize: "0.8rem",
        fontFamily: "var(--font-body)",
        color: current.color,
        display: "flex",
        alignItems: "center",
        gap: "6px",
        zIndex: 9998,
        transition: "opacity 0.2s ease",
        opacity: status === "saving" ? 0.7 : 1,
      }}
    >
      {status === "saving" && (
        <span
          style={{
            display: "inline-block",
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            border: "2px solid #7a7f99",
            borderTopColor: "transparent",
            animation: "spin 0.8s linear infinite",
          }}
        />
      )}
      {current.text}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}