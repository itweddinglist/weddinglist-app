// =============================================================================
// app/settings/page.tsx
// Pagina Settings — Faza 8.4 GDPR
// Date personale & confidențialitate — export + delete cont
// =============================================================================

"use client";

import { useState } from "react";
import { useSession } from "@/app/lib/auth/session/use-session";

type DeleteState = "idle" | "loading" | "success" | "error";

export default function SettingsPage() {
  const sessionState = useSession();
  const [deleteState, setDeleteState] = useState<DeleteState>("idle");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const weddingId =
    sessionState.status === "authenticated"
      ? sessionState.activeWeddingId
      : null;

  const handleDeleteAccount = async () => {
    if (!confirmed) return;
    setDeleteState("loading");
    setDeleteError(null);

    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      const json = await res.json();

      if (!res.ok) {
        const code = json.error?.code;
        if (code === "SOLE_OWNER") {
          setDeleteError("Nu îți poți șterge contul cât timp ești singurul owner al unui wedding activ. Șterge mai întâi wedding-ul sau transferă ownership.");
        } else if (code === "DELETION_IN_PROGRESS") {
          setDeleteError("Ștergerea contului este deja în curs.");
        } else {
          setDeleteError(json.error?.message ?? "A apărut o eroare. Contactează suportul.");
        }
        setDeleteState("error");
        return;
      }

      setDeleteState("success");
      setShowModal(false);
      setTimeout(() => { window.location.href = "/"; }, 2000);
    } catch {
      setDeleteError("A apărut o eroare neașteptată. Încearcă din nou.");
      setDeleteState("error");
    }
  };

  const handleOpenModal = () => {
    setShowModal(true);
    setConfirmed(false);
    setDeleteError(null);
    setDeleteState("idle");
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setConfirmed(false);
    setDeleteError(null);
    setDeleteState("idle");
  };

  if (sessionState.status !== "authenticated") {
    return (
      <div style={styles.page}>
        <div style={styles.emptyState}>
          <div style={{ fontSize: "2rem" }}>🔒</div>
          <p style={styles.emptyText}>Sesiune inactivă. Autentifică-te pentru a accesa Setările.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Setări</h1>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Date personale și confidențialitate</h2>
        <p style={styles.sectionDesc}>
          Conform GDPR, ai dreptul să descarci sau să ștergi datele tale.
        </p>

        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.cardIcon}>📦</div>
            <div style={styles.cardBody}>
              <h3 style={styles.cardTitle}>Descarcă datele tale</h3>
              <p style={styles.cardDesc}>
                Export complet al tuturor datelor asociate contului tău
                (Art. 20 GDPR — Dreptul la portabilitate).
              </p>
            </div>
            <a href={weddingId ? "/export" : "#"} style={styles.linkBtn}>
              Mergi la Export
            </a>
          </div>

          <div style={styles.card}>
            <div style={styles.cardIcon}>⚠️</div>
            <div style={styles.cardBody}>
              <h3 style={styles.cardTitle}>Șterge contul</h3>
              <p style={styles.cardDesc}>
                Contul și datele tale vor fi șterse permanent
                (Art. 17 GDPR — Dreptul la ștergere). Această acțiune este ireversibilă.
              </p>
            </div>
            <button onClick={handleOpenModal} style={styles.btnDanger}>
              Șterge contul
            </button>
          </div>
        </div>
      </div>

      {deleteState === "success" && (
        <div style={styles.successBanner}>
          Contul tău a fost șters. Vei fi redirecționat...
        </div>
      )}

      {showModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>Șterge contul</h2>
            <p style={styles.modalDesc}>
              Această acțiune este <strong>ireversibilă</strong>. Toate datele
              tale vor fi șterse sau anonimizate.
            </p>
            <p style={styles.modalDesc}>
              Recomandăm să descarci datele înainte de a continua.
            </p>
            <a href="/export" style={styles.exportLink}>
              Descarcă datele mai întâi
            </a>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                style={{ marginRight: "0.5rem" }}
              />
              Înțeleg că această acțiune este permanentă și ireversibilă.
            </label>
            {deleteError && <p style={styles.errorText}>{deleteError}</p>}
            <div style={styles.modalActions}>
              <button
                onClick={handleCloseModal}
                disabled={deleteState === "loading"}
                style={styles.btnSecondary}
              >
                Anulează
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={!confirmed || deleteState === "loading"}
                style={{
                  ...styles.btnDanger,
                  opacity: !confirmed || deleteState === "loading" ? 0.5 : 1,
                  cursor: !confirmed || deleteState === "loading" ? "not-allowed" : "pointer",
                }}
              >
                {deleteState === "loading" ? "Se șterge..." : "Șterge contul definitiv"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "2rem", background: "var(--color-bg)", minHeight: "100vh" },
  header: { marginBottom: "2rem" },
  title: { fontFamily: "var(--font-display, serif)", fontSize: "2rem", fontWeight: 300, color: "var(--color-text)", margin: 0 },
  section: { marginBottom: "2rem" },
  sectionTitle: { fontSize: "1rem", fontWeight: 600, color: "var(--color-text)", marginBottom: "0.5rem" },
  sectionDesc: { fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" },
  card: { background: "white", borderRadius: "16px", padding: "1.75rem", boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: "0.75rem" },
  cardIcon: { fontSize: "2rem" },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: "1rem", fontWeight: 600, color: "var(--color-text)", margin: "0 0 0.5rem" },
  cardDesc: { fontSize: "0.82rem", color: "var(--color-text-muted)", lineHeight: 1.6, margin: 0 },
  linkBtn: { display: "inline-block", padding: "0.65rem 1.25rem", background: "white", color: "var(--color-accent)", border: "1px solid var(--color-accent)", borderRadius: "999px", fontSize: "0.85rem", textDecoration: "none" },
  btnSecondary: { padding: "0.65rem 1.25rem", background: "white", color: "var(--color-accent)", border: "1px solid var(--color-accent)", borderRadius: "999px", fontSize: "0.85rem", cursor: "pointer" },
  btnDanger: { padding: "0.65rem 1.25rem", background: "var(--color-danger)", color: "white", border: "none", borderRadius: "999px", fontSize: "0.85rem", fontWeight: 500, cursor: "pointer" },
  errorText: { fontSize: "0.82rem", color: "var(--color-danger)", margin: 0 },
  successBanner: { padding: "1rem 1.5rem", background: "rgba(72,187,120,0.12)", color: "var(--color-success)", borderRadius: "12px", fontSize: "0.9rem", marginBottom: "1rem" },
  overlay: { position: "fixed", inset: 0, background: "rgba(30,35,64,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" },
  modal: { background: "white", borderRadius: "16px", padding: "2rem", maxWidth: "480px", width: "100%", boxShadow: "var(--shadow-md)", display: "flex", flexDirection: "column", gap: "1rem" },
  modalTitle: { fontSize: "1.3rem", fontWeight: 600, color: "var(--color-text)", margin: 0 },
  modalDesc: { fontSize: "0.85rem", color: "var(--color-text-muted)", lineHeight: 1.6, margin: 0 },
  exportLink: { fontSize: "0.82rem", color: "var(--color-accent)", textDecoration: "none" },
  checkboxLabel: { fontSize: "0.82rem", color: "var(--color-text)", display: "flex", alignItems: "flex-start", cursor: "pointer", lineHeight: 1.5 },
  modalActions: { display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" },
  emptyState: { textAlign: "center", padding: "4rem 2rem" },
  emptyText: { color: "var(--color-text-muted)", fontSize: "0.9rem" },
};