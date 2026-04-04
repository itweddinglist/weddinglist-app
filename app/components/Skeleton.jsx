"use client";

export function SkeletonBox({ width = "100%", height = "16px", borderRadius = "4px" }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: "var(--cream)",
        backgroundImage:
          "linear-gradient(90deg, var(--cream) 0%, var(--cream-line) 50%, var(--cream) 100%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-shimmer 1.4s ease infinite",
      }}
    />
  );
}

export function SkeletonText({ lines = 3, gap = "8px" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox
          key={i}
          width={i === lines - 1 ? "60%" : "100%"}
          height="14px"
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ height = "120px" }) {
  return (
    <div
      style={{
        padding: "20px",
        borderRadius: "12px",
        backgroundColor: "var(--navy-card)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        minHeight: height,
      }}
    >
      <SkeletonBox width="40%" height="14px" />
      <SkeletonBox width="60%" height="32px" />
      <SkeletonBox width="80%" height="12px" />
    </div>
  );
}

export function SkeletonGuestRow() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 0",
        borderBottom: "1px solid var(--cream-line)",
      }}
    >
      <SkeletonBox width="32px" height="32px" borderRadius="50%" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
        <SkeletonBox width="40%" height="13px" />
        <SkeletonBox width="25%" height="11px" />
      </div>
    </div>
  );
}

export function Spinner({ size = "20px", color = "var(--rose)" }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid var(--cream-line)`,
        borderTopColor: color,
        animation: "skeleton-shimmer-spin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

// Adăugăm keyframes global
export function SkeletonStyles() {
  return (
    <style>{`
      @keyframes skeleton-shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      @keyframes skeleton-shimmer-spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  );
}