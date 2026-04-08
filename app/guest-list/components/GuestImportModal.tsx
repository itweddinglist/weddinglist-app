// =============================================================================
// app/guest-list/components/GuestImportModal.tsx
// Modal import CSV invitați
// =============================================================================

"use client";

import { useState, useRef } from "react";
import { X, Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import type { ImportResult, ImportRowWarning } from "@/types/guest-import";

interface Props {
  onImport: (result: { imported: number; warnings?: ImportRowWarning[] }) => void;
  onClose: () => void;
}

type Step = "upload" | "importing" | "done";

export default function GuestImportModal({ onImport, onClose }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.name.endsWith(".csv")) {
      setError("Doar fișiere CSV sunt acceptate.");
      return;
    }
    setFile(f);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleImport = async () => {
    if (!file) return;

    setStep("importing");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/guests/import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? "Eroare la import.");
      }

      const json = await res.json();
      const importResult: ImportResult = json.data;
      setResult(importResult);
      setStep("done");
      onImport({ imported: importResult.created, warnings: importResult.warnings });
    } catch (err: any) {
      setError(err.message ?? "Eroare necunoscută.");
      setStep("upload");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(19,23,46,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl"
        style={{
          background: "white",
          boxShadow: "0 20px 60px rgba(19,23,46,0.2)",
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--cream-line)" }}
        >
          <h2
            className="text-xl font-light"
            style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
          >
            Import invitați CSV
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--muted)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--cream)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        <div className="px-6 py-5">
          {step === "upload" && (
            <div className="space-y-4">
              <div
                className="rounded-lg p-3 text-xs"
                style={{ background: "var(--cream)", color: "var(--muted)" }}
              >
                <p className="font-medium mb-1" style={{ color: "var(--navy)" }}>
                  Format CSV acceptat:
                </p>
                <p>first_name, last_name, group, side, notes, is_vip</p>
                <p className="mt-1">Doar <strong>first_name</strong> este obligatoriu.</p>
              </div>

              <div
                className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all"
                style={{
                  borderColor: isDragging ? "var(--rose)" : "var(--cream-line)",
                  background: isDragging ? "rgba(201,144,122,0.04)" : "var(--ivory)",
                }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText size={32} strokeWidth={1.5} style={{ color: "var(--rose)" }} />
                    <p className="text-sm font-medium" style={{ color: "var(--navy)" }}>
                      {file.name}
                    </p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload size={32} strokeWidth={1.5} style={{ color: "var(--muted)" }} />
                    <p className="text-sm font-medium" style={{ color: "var(--navy)" }}>
                      Trage fișierul aici sau click pentru a selecta
                    </p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      Doar fișiere .csv
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <p className="text-sm" style={{ color: "var(--red)" }}>{error}</p>
              )}
            </div>
          )}

          {step === "importing" && (
            <div className="py-8 text-center">
              <div
                className="w-12 h-12 rounded-full border-2 mx-auto mb-4 animate-spin"
                style={{ borderColor: "var(--rose)", borderTopColor: "transparent" }}
              />
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Se importă invitații...
              </p>
            </div>
          )}

          {step === "done" && result && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div
                  className="rounded-xl p-3 text-center"
                  style={{ background: "rgba(72,187,120,0.08)" }}
                >
                  <p
                    className="text-2xl font-light"
                    style={{ fontFamily: "var(--font-display)", color: "var(--green)" }}
                  >
                    {result.created}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Adăugați</p>
                </div>
                <div
                  className="rounded-xl p-3 text-center"
                  style={{ background: "rgba(236,201,75,0.08)" }}
                >
                  <p
                    className="text-2xl font-light"
                    style={{ fontFamily: "var(--font-display)", color: "var(--yellow)" }}
                  >
                    {result.skipped}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Săriți</p>
                </div>
                <div
                  className="rounded-xl p-3 text-center"
                  style={{
                    background: result.errors.length > 0
                      ? "rgba(229,62,62,0.08)"
                      : "rgba(72,187,120,0.08)",
                  }}
                >
                  <p
                    className="text-2xl font-light"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: result.errors.length > 0 ? "var(--red)" : "var(--green)",
                    }}
                  >
                    {result.errors.length}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Erori</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div
                  className="rounded-lg p-3 space-y-1 max-h-32 overflow-y-auto"
                  style={{ background: "rgba(229,62,62,0.06)" }}
                >
                  {result.errors.slice(0, 5).map((e, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <AlertCircle
                        size={12}
                        className="flex-shrink-0 mt-0.5"
                        style={{ color: "var(--red)" }}
                      />
                      <p className="text-xs" style={{ color: "var(--red)" }}>
                        Rând {e.row}: {e.message}
                      </p>
                    </div>
                  ))}
                  {result.errors.length > 5 && (
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      +{result.errors.length - 5} erori suplimentare
                    </p>
                  )}
                </div>
              )}

              {result.created > 0 && (
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} style={{ color: "var(--green)" }} />
                  <p className="text-sm" style={{ color: "var(--green)" }}>
                    {result.created} invitați adăugați cu succes.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: "1px solid var(--cream-line)" }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-sm font-medium"
            style={{
              border: "1px solid var(--cream-line)",
              color: "var(--muted)",
            }}
          >
            {step === "done" ? "Închide" : "Anulează"}
          </button>

          {step === "upload" && (
            <button
              onClick={handleImport}
              disabled={!file}
              className="px-5 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                background: file ? "var(--rose)" : "var(--cream-line)",
                color: file ? "white" : "var(--muted)",
                cursor: file ? "pointer" : "not-allowed",
              }}
            >
              Importă
            </button>
          )}

          {step === "done" && result && result.created > 0 && (
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-full text-sm font-medium"
              style={{ background: "var(--rose)", color: "white" }}
            >
              Finalizat →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}