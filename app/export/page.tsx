// =============================================================================
// app/export/page.tsx
// Pagina Export & Import — Faza 8.1 + 8.2
// =============================================================================

"use client";

import { useState, useRef } from "react";
import { useSession } from "@/app/lib/auth/session/use-session";
import type { ImportPreview } from "@/lib/import/validate-import";
import { MAX_FILE_SIZE_BYTES } from "@/lib/import/validate-import";

type ExportState = "idle" | "loading" | "success" | "error";
type ImportState = "idle" | "reading" | "previewing" | "importing" | "success" | "error";

export default function ExportPage() {
  const sessionState = useSession();

  // ── Export state ───────────────────────────────────────────────────────────
  const [jsonState, setJsonState] = useState<ExportState>("idle");
  const [jsonError, setJsonError] = useState<string | null>(null);

  // ── Import state ───────────────────────────────────────────────────────────
  const [importState, setImportState] = useState<ImportState>("idle");
  const [importError, setImportError] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importPayload, setImportPayload] = useState<unknown>(null);
  const [_newWeddingId, setNewWeddingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const weddingId =
    sessionState.status === "authenticated"
      ? sessionState.activeWeddingId
      : null;

  // ── Export JSON ────────────────────────────────────────────────────────────

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

  // ── Import — citire fișier ─────────────────────────────────────────────────

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setImportError("Fișierul depășește limita de 10MB.");
      setImportState("error");
      return;
    }

    setImportState("reading");
    setImportError(null);
    setImportPreview(null);
    setImportPayload(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setImportPayload(parsed);

      // Preview
      const res = await fetch("/api/import/json?preview=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });

      const json = await res.json();

      if (!json.success) {
        setImportError(json.error?.message ?? "Fișier invalid.");
        setImportState("error");
        return;
      }

      setImportPreview(json.data.preview);
      setImportState("previewing");
    } catch {
      setImportError("Fișierul nu este un JSON valid.");
      setImportState("error");
    }
  };

  // ── Import — confirmare ────────────────────────────────────────────────────

  const handleConfirmImport = async () => {
    if (!importPayload) return;

    setImportState("importing");
    setImportError(null);

    try {
      const res = await fetch("/api/import/json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(importPayload),
      });

      const json = await res.json();

      if (!json.success) {
        setImportError(json.error?.message ?? "Import eșuat.");
        setImportState("error");
        return;
      }

      setNewWeddingId(json.data.new_wedding_id);
      setImportState("success");
    } catch {
      setImportError("A apărut o eroare neașteptată.");
      setImportState("error");
    }
  };

  const handleResetImport = () => {
    setImportState("idle");
    setImportError(null);
    setImportPreview(null);
    setImportPayload(null);
    setNewWeddingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Render ─────────────────────────────────────────────────────────────────

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
      <div style={styles.header}>
        <h1 style={styles.title}>Export & Import</h1>
        <p style={styles.subtitle}>
          Descarcă sau restaurează datele nunții tale.
        </p>
      </div>

      <div style={styles.grid}>

        {/* Export JSON */}
        <div style={styles.card}>
          <div style={styles.cardIcon}>📦</div>
          <h2 style={styles.cardTitle}>Export JSON</h2>
          <p style={styles.cardDescription}>
            Backup complet cu toți invitații, planul de mese, bugetul și
            răspunsurile RSVP.
          </p>
          <div style={styles.cardMeta}>
            <span style={styles.metaTag}>Invitați</span>
            <span style={styles.metaTag}>Plan mese</span>
            <span style={styles.metaTag}>Buget</span>
            <span style={styles.metaTag}>RSVP</span>
          </div>
          {jsonError && <p style={styles.errorText}>{jsonError}</p>}
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

        {/* Import JSON */}
        <div style={styles.card}>
          <div style={styles.cardIcon}>📥</div>
          <h2 style={styles.cardTitle}>Import JSON</h2>
          <p style={styles.cardDescription}>
            Restaurează sau transferă datele dintr-un backup. Se va crea un
            wedding nou — datele existente nu sunt afectate.
          </p>

          {/* Idle */}
          {importState === "idle" && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                style={{ display: "none" }}
                id="import-file-input"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={styles.btn}
              >
                Selectează fișier JSON
              </button>
            </>
          )}

          {/* Reading */}
          {importState === "reading" && (
            <p style={styles.infoText}>⏳ Se citește fișierul...</p>
          )}

          {/* Preview */}
          {importState === "previewing" && importPreview && (
            <div style={styles.preview}>
              <p style={styles.previewTitle}>📋 Sumar backup</p>
              <p style={styles.previewItem}>
                <strong>Nuntă:</strong> {importPreview.wedding_title}
              </p>
              <p style={styles.previewItem}>
                <strong>Exportat:</strong>{" "}
                {new Date(importPreview.exported_at).toLocaleDateString("ro-RO")}
              </p>
              <p style={styles.previewItem}>
                <strong>Invitați:</strong> {importPreview.counts.guests}
              </p>
              <p style={styles.previewItem}>
                <strong>Evenimente:</strong> {importPreview.counts.events}
              </p>
              <p style={styles.previewItem}>
                <strong>Mese:</strong> {importPreview.counts.tables}
              </p>

              {importPreview.warnings.length > 0 && (
                <div style={styles.warnings}>
                  {importPreview.warnings.map((w, i) => (
                    <p key={i} style={styles.warningText}>⚠️ {w}</p>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <button onClick={handleConfirmImport} style={styles.btn}>
                  Confirmă importul
                </button>
                <button onClick={handleResetImport} style={styles.btnSecondary}>
                  Anulează
                </button>
              </div>
            </div>
          )}

          {/* Importing */}
          {importState === "importing" && (
            <p style={styles.infoText}>⏳ Se importă datele...</p>
          )}

          {/* Success */}
          {importState === "success" && (
            <div>
              <p style={{ ...styles.infoText, color: "var(--color-success)" }}>
                ✓ Import finalizat! A fost creat un wedding nou.
              </p>
              <button onClick={handleResetImport} style={styles.btnSecondary}>
                Importă alt fișier
              </button>
            </div>
          )}

          {/* Error */}
          {importState === "error" && (
            <div>
              <p style={styles.errorText}>{importError}</p>
              <button onClick={handleResetImport} style={styles.btnSecondary}>
                Încearcă din nou
              </button>
            </div>
          )}
        </div>

        {/* PNG Export */}
        <div style={{ ...styles.card, ...styles.cardDisabled }}>
          <div style={styles.cardIcon}>🖼️</div>
          <h2 style={styles.cardTitle}>Export PNG</h2>
          <p style={styles.cardDescription}>
            Imagine A4 a planului de mese. Disponibil din modulul Plan Mese.
          </p>
          <button disabled style={{ ...styles.btn, ...styles.btnDisabled }}>
            Disponibil în Plan Mese
          </button>
        </div>

        {/* PDF Export */}
        <div style={{ ...styles.card, ...styles.cardDisabled }}>
          <div style={styles.cardIcon}>📄</div>
          <h2 style={styles.cardTitle}>Export PDF</h2>
          <p style={styles.cardDescription}>
            Listă completă cu invitații per masă, meniuri și status RSVP.
            Disponibil în curând.
          </p>
          <button disabled style={{ ...styles.btn, ...styles.btnDisabled }}>
            În curând
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "2rem", background: "var(--color-bg)", minHeight: "100vh" },
  header: { marginBottom: "2rem" },
  title: { fontFamily: "var(--font-display, serif)", fontSize: "2rem", fontWeight: 300, color: "var(--color-text)", margin: "0 0 0.5rem" },
  subtitle: { fontSize: "0.9rem", color: "var(--color-text-muted)", margin: 0 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" },
  card: { background: "white", borderRadius: "16px", padding: "1.75rem", boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: "0.75rem" },
  cardDisabled: { opacity: 0.6 },
  cardIcon: { fontSize: "2rem" },
  cardTitle: { fontSize: "1.1rem", fontWeight: 600, color: "var(--color-text)", margin: 0 },
  cardDescription: { fontSize: "0.85rem", color: "var(--color-text-muted)", margin: 0, lineHeight: 1.6, flex: 1 },
  cardMeta: { display: "flex", gap: "0.4rem", flexWrap: "wrap" },
  metaTag: { padding: "0.2rem 0.6rem", borderRadius: "999px", background: "var(--color-accent-soft)", color: "var(--color-accent)", fontSize: "0.72rem", fontWeight: 500 },
  btn: { marginTop: "0.5rem", padding: "0.65rem 1.25rem", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "999px", fontSize: "0.85rem", fontWeight: 500, cursor: "pointer" },
  btnDisabled: { opacity: 0.5, cursor: "not-allowed" },
  btnSuccess: { background: "var(--color-success)" },
  btnSecondary: { marginTop: "0.5rem", padding: "0.65rem 1.25rem", background: "white", color: "var(--color-accent)", border: "1px solid var(--color-accent)", borderRadius: "999px", fontSize: "0.85rem", cursor: "pointer" },
  errorText: { fontSize: "0.82rem", color: "var(--color-danger)", margin: 0 },
  infoText: { fontSize: "0.85rem", color: "var(--color-text-muted)", margin: 0 },
  preview: { background: "var(--color-bg)", borderRadius: "8px", padding: "1rem" },
  previewTitle: { fontWeight: 600, color: "var(--color-text)", margin: "0 0 0.75rem", fontSize: "0.85rem" },
  previewItem: { fontSize: "0.82rem", color: "var(--color-text-muted)", margin: "0.25rem 0" },
  warnings: { marginTop: "0.75rem", padding: "0.5rem", background: "rgba(236,201,75,0.1)", borderRadius: "6px" },
  warningText: { fontSize: "0.78rem", color: "var(--color-warning)", margin: "0.2rem 0" },
  emptyState: { textAlign: "center", padding: "4rem 2rem" },
  emptyText: { color: "var(--color-text-muted)", fontSize: "0.9rem" },
};