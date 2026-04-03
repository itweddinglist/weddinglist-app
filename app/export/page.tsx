// =============================================================================
// app/export/page.tsx
// Pagina Export — Faza 8.1
// Export JSON complet + Export PNG (existent)
// =============================================================================

"use client";

import { useState } from "react";
import { useSession } from "@/app/lib/auth/session/use-session";

type ExportState = "idle" | "loading" | "success" | "error";

export default function ExportPage() {
  const sessionState = useSession();
  const [jsonState, setJsonState] = useState<ExportState>("idle");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const weddingId =
    sessionState.status === "authenticated"
      ? sessionState.activeWeddingId
      : null;

  const handleExportJson = async () => {
    if (!weddingId) return;

    setJsonState("loading");
    setJsonError(null);

    try {
      const res = await fetch(`/api/export/json?wedding_id=${weddingId}`);

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setJsonError(json.error?.message ?? "Eroare la export.");
        setJsonState("error");
        return;
      }

      // Descarcă fișierul
      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] ?? "weddinglist-export.json";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setJsonState("success");
      setTimeout(() => setJsonState("idle"), 3000);
    } catch {
      setJsonError("A apărut o eroare neașteptată. Încearcă din nou.");
      setJsonState("error");
    }
  };

  if (sessionState.status !== "authenticated") {
    return (
      <div style={styles.page}>
        <div style={styles.emptyState}>
          <div style={{ fontSize: "2rem" }}>🔒</div>
          <p style={styles.emptyText}>
            Sesiune inactivă. Autentifică-te pentru a accesa Export.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Export</h1>
        <p style={styles.subtitle}>
          Descarcă datele nunții tale pentru backup sau transfer.
        </p>
      </div>

      {/* Export cards */}
      <div style={styles.grid}>

        {/* JSON Export */}
        <div style={styles.card}>
          <div style={styles.cardIcon}>📦</div>
          <h2 style={styles.cardTitle}>Export JSON</h2>
          <p style={styles.cardDescription}>
            Backup complet cu toți invitații, planul de mese, bugetul și
            răspunsurile RSVP. Folosit pentru transfer sau arhivare.
          </p>
          <div style={styles.cardMeta}>
            <span style={styles.metaTag}>Invitați</span>
            <span style={styles.metaTag}>Plan mese</span>
            <span style={styles.metaTag}>Buget</span>
            <span style={styles.metaTag}>RSVP</span>
          </div>

          {jsonError && (
            <p style={styles.errorText}>{jsonError}</p>
          )}

          <button
            onClick={handleExportJson}
            disabled={jsonState === "loading"}
            style={{
              ...styles.btn,
              ...(jsonState === "loading" ? styles.btnDisabled : {}),
              ...(jsonState === "success" ? styles.btnSuccess : {}),
            }}
          >
            {jsonState === "loading" && "⏳ Se exportă..."}
            {jsonState === "success" && "✓ Descărcat"}
            {jsonState === "error" && "Încearcă din nou"}
            {jsonState === "idle" && "Descarcă JSON"}
          </button>
        </div>

        {/* PNG Export — placeholder pentru când e conectat */}
        <div style={{ ...styles.card, ...styles.cardDisabled }}>
          <div style={styles.cardIcon}>🖼️</div>
          <h2 style={styles.cardTitle}>Export PNG</h2>
          <p style={styles.cardDescription}>
            Imagine A4 a planului de mese. Disponibil din modulul Plan Mese.
          </p>
          <div style={styles.cardMeta}>
            <span style={styles.metaTag}>Plan mese</span>
          </div>
          <button
            disabled
            style={{ ...styles.btn, ...styles.btnDisabled }}
          >
            Disponibil în Plan Mese
          </button>
        </div>

        {/* PDF Export — coming soon */}
        <div style={{ ...styles.card, ...styles.cardDisabled }}>
          <div style={styles.cardIcon}>📄</div>
          <h2 style={styles.cardTitle}>Export PDF</h2>
          <p style={styles.cardDescription}>
            Listă completă cu invitații per masă, meniuri și status RSVP.
            Disponibil în curând.
          </p>
          <div style={styles.cardMeta}>
            <span style={styles.metaTag}>Invitați</span>
            <span style={styles.metaTag}>Plan mese</span>
            <span style={styles.metaTag}>RSVP</span>
          </div>
          <button
            disabled
            style={{ ...styles.btn, ...styles.btnDisabled }}
          >
            În curând
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: "2rem",
    background: "var(--color-bg)",
    minHeight: "100vh",
  },
  header: {
    marginBottom: "2rem",
  },
  title: {
    fontFamily: "var(--font-display, serif)",
    fontSize: "2rem",
    fontWeight: 300,
    color: "var(--color-text)",
    margin: "0 0 0.5rem",
  },
  subtitle: {
    fontSize: "0.9rem",
    color: "var(--color-text-muted)",
    margin: 0,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "1.5rem",
  },
  card: {
    background: "white",
    borderRadius: "16px",
    padding: "1.75rem",
    boxShadow: "var(--shadow-sm)",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardIcon: {
    fontSize: "2rem",
  },
  cardTitle: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "var(--color-text)",
    margin: 0,
  },
  cardDescription: {
    fontSize: "0.85rem",
    color: "var(--color-text-muted)",
    margin: 0,
    lineHeight: 1.6,
    flex: 1,
  },
  cardMeta: {
    display: "flex",
    gap: "0.4rem",
    flexWrap: "wrap",
  },
  metaTag: {
    padding: "0.2rem 0.6rem",
    borderRadius: "999px",
    background: "var(--color-accent-soft)",
    color: "var(--color-accent)",
    fontSize: "0.72rem",
    fontWeight: 500,
  },
  btn: {
    marginTop: "0.5rem",
    padding: "0.65rem 1.25rem",
    background: "var(--color-accent)",
    color: "white",
    border: "none",
    borderRadius: "999px",
    fontSize: "0.85rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "opacity 0.15s",
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  btnSuccess: {
    background: "var(--color-success)",
  },
  errorText: {
    fontSize: "0.82rem",
    color: "var(--color-danger)",
    margin: 0,
  },
  emptyState: {
    textAlign: "center",
    padding: "4rem 2rem",
  },
  emptyText: {
    color: "var(--color-text-muted)",
    fontSize: "0.9rem",
  },
};