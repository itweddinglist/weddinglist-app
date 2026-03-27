"use client";

import React from "react";

/**
 * SaveIndicator — Trust Signals (#19) + Error Recovery UX (#18)
 *
 * Status-uri:
 *  idle    → null (invizibil)
 *  saving  → spinner + "Se sincronizează..."
 *  saved   → ✔ verde + "Salvat"
 *  error   → ⚠ roșu + mesaj recovery (datele sunt în siguranță)
 *  offline → 📶 galben + "Offline · salvat local"
 *
 * Izolat complet de canvas — position: fixed, React.memo,
 * re-render DOAR când status sau isOffline se schimbă.
 */

const STYLES = {
  saving: {
    color: "var(--color-text-muted, #9DA3BC)",
    bg: "rgba(157,163,188,0.08)",
    border: "rgba(157,163,188,0.2)",
  },
  saved: {
    color: "var(--color-success, #48BB78)",
    bg: "rgba(72,187,120,0.08)",
    border: "rgba(72,187,120,0.2)",
  },
  error: {
    color: "var(--color-danger, #E53E3E)",
    bg: "rgba(229,62,62,0.06)",
    border: "rgba(229,62,62,0.2)",
  },
  offline: {
    color: "var(--color-warning, #ECC94B)",
    bg: "rgba(236,201,75,0.08)",
    border: "rgba(236,201,75,0.2)",
  },
};

function Spinner() {
  return (
    <>
      <span
        style={{
          display: "inline-block",
          width: 10,
          height: 10,
          borderRadius: "50%",
          border: "2px solid currentColor",
          borderTopColor: "transparent",
          animation: "si-spin 0.7s linear infinite",
          flexShrink: 0,
          marginTop: 2,
        }}
      />
      <style>{`@keyframes si-spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

function SaveIndicator({ status, isOffline }) {
  // Offline suprascriere vizuală — dar doar dacă nu suntem în saving activ
  const effectiveStatus =
    isOffline && status !== "saving" ? "offline" : status;

  if (effectiveStatus === "idle") return null;

  const s = STYLES[effectiveStatus];
  if (!s) return null;

  const content = {
    saving: (
      <>
        <Spinner />
        <span>Se sincronizează...</span>
      </>
    ),
    saved: (
      <>
        <span style={{ fontSize: "0.9em", lineHeight: 1, marginTop: 1 }}>✔</span>
        <span>Salvat</span>
      </>
    ),
    error: (
      <>
        <span style={{ fontSize: "0.9em", lineHeight: 1, marginTop: 2 }}>⚠</span>
        <span>
          Salvare eșuată
          <span
            style={{
              display: "block",
              fontSize: "0.78em",
              opacity: 0.85,
              marginTop: 1,
              fontWeight: 400,
            }}
          >
            Datele sunt în siguranță în browser
          </span>
        </span>
      </>
    ),
    offline: (
      <>
        <span style={{ fontSize: "0.85em", lineHeight: 1, marginTop: 2 }}>📶</span>
        <span>
          Offline
          <span
            style={{
              display: "block",
              fontSize: "0.78em",
              opacity: 0.85,
              marginTop: 1,
              fontWeight: 400,
            }}
          >
            Salvat local în browser
          </span>
        </span>
      </>
    ),
  }[effectiveStatus];

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        display: "flex",
        alignItems: "flex-start",
        gap: 7,
        padding: "7px 12px",
        borderRadius: 10,
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
        fontSize: "0.78rem",
        fontFamily: "var(--font-body, 'DM Sans', sans-serif)",
        fontWeight: 500,
        lineHeight: 1.4,
        zIndex: 9998,
        pointerEvents: "none",
        userSelect: "none",
        animation: "si-fadein 0.18s ease",
        backdropFilter: "blur(4px)",
      }}
    >
      {content}
      <style>{`
        @keyframes si-fadein {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default React.memo(SaveIndicator);
