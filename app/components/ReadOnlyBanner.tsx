"use client";

// =============================================================================
// app/components/ReadOnlyBanner.tsx
// Banner persistent read-only — Faza 4 SPEC secțiunea 8.3.
//
// Vizibil DOAR când isReadOnly === true.
// Nu se poate închide — persistent până la clearReadOnlyMode().
// =============================================================================

import { useReadOnlyMode } from "@/lib/system/read-only";

export default function ReadOnlyBanner(): React.ReactElement | null {
  const { isReadOnly } = useReadOnlyMode();

  if (!isReadOnly) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 9999,
        background: "#FEFCBF",
        borderBottom: "1px solid #ECC94B",
        padding: "0.6rem 1.25rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        fontSize: "0.8rem",
        fontFamily: "'DM Sans', ui-sans-serif, sans-serif",
        fontWeight: 500,
        color: "#744210",
      }}
    >
      <span aria-hidden="true" style={{ fontSize: "1rem", flexShrink: 0 }}>
        ⚠️
      </span>
      Sistem temporar indisponibil. Poți vizualiza planul, dar nu îl poți salva.
    </div>
  );
}
