// =============================================================================
// app/guest-list/page.tsx
// UI Lista Invitați — Faza 3 UI
// Folosește session-bridge pentru wedding_id — consistent cu restul aplicației
// =============================================================================

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, AlertTriangle } from "lucide-react";
import { resolveSession } from "@/app/lib/auth/session/session-bridge";
import GuestListHeader from "./components/GuestListHeader";
import GuestFilters from "./components/GuestFilters";
import GuestTable from "./components/GuestTable";
import GuestFormModal from "./components/GuestFormModal";
import GuestImportModal from "./components/GuestImportModal";
import type { GuestWithRelations } from "@/types/guests";
import type { ImportRowWarning } from "@/types/guest-import";

// ─── Toast system ──────────────────────────────────────────────────────────────

type ToastType = "success" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  autoDismissMs?: number;
}

// ─── Warning helpers ───────────────────────────────────────────────────────────

const WARNING_MAP: Record<string, string> = {
  duplicate: "Există deja un invitat cu același nume în lista ta.",
};

function mapSingleGuestWarning(message: string): string | null {
  if (message.includes("already exists")) return WARNING_MAP.duplicate;
  return null;
}

function mapImportWarning(message: string): string | null {
  if (message.includes("already exists")) return "Există deja un invitat cu acest nume.";
  if (message.includes("duplicate of another row")) return "Duplicat în fișierul CSV.";
  if (message.includes("Group") && message.includes("ignored")) return null;
  return null;
}

// ─── Import report state ───────────────────────────────────────────────────────

interface ImportReport {
  imported: number;
  relevantWarnings: Array<{ row: number; message: string; mapped: string }>;
}

// ─── Toast component ───────────────────────────────────────────────────────────

function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "1.5rem",
        right: "1.5rem",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        maxWidth: "360px",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            padding: "0.75rem 1rem",
            borderRadius: "10px",
            background:
              t.type === "success"
                ? "rgba(72,187,120,0.12)"
                : "rgba(236,201,75,0.15)",
            border: `1px solid ${t.type === "success" ? "var(--green)" : "var(--yellow)"}`,
            boxShadow: "0 4px 16px rgba(19,23,46,0.1)",
            animation: "fadeUp 0.2s ease-out",
          }}
        >
          <span
            style={{
              fontSize: "1rem",
              lineHeight: 1,
              marginTop: "0.05rem",
              flexShrink: 0,
            }}
          >
            {t.type === "success" ? "✓" : "⚠"}
          </span>
          <p
            style={{
              flex: 1,
              fontSize: "0.85rem",
              color: t.type === "success" ? "var(--green)" : "#92700a",
              lineHeight: 1.4,
            }}
          >
            {t.message}
          </p>
          {t.type === "warning" && (
            <button
              onClick={() => onDismiss(t.id)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--muted)",
                padding: "0",
                flexShrink: 0,
              }}
            >
              <X size={14} strokeWidth={1.8} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default function GuestListPage() {
  const [guests, setGuests] = useState<GuestWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string>("loading");

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSide, setFilterSide] = useState<string>("all");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [filterDuplicates, setFilterDuplicates] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<GuestWithRelations | null>(null);

  // ── Toasts ─────────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const addToast = useCallback((type: ToastType, message: string, autoDismissMs?: number) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => {
      const next = [...prev, { id, type, message, autoDismissMs }];
      return next.slice(-3);
    });
    if (autoDismissMs) {
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        toastTimers.current.delete(id);
      }, autoDismissMs);
      toastTimers.current.set(id, timer);
    }
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    const timer = toastTimers.current.get(id);
    if (timer) { clearTimeout(timer); toastTimers.current.delete(id); }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = toastTimers.current;
    return () => { timers.forEach(clearTimeout); };
  }, []);

  // ── Guest highlight ────────────────────────────────────────────────────────
  const [highlightedGuestId, setHighlightedGuestId] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const highlightGuest = useCallback((guestId: string) => {
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    setHighlightedGuestId(guestId);
    highlightTimer.current = setTimeout(() => {
      setHighlightedGuestId(null);
      highlightTimer.current = null;
    }, 3000);
  }, []);

  useEffect(() => {
    return () => { if (highlightTimer.current) clearTimeout(highlightTimer.current); };
  }, []);

  // ── Import report panel ────────────────────────────────────────────────────
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [importReportExpanded, setImportReportExpanded] = useState(false);

  // ── Session ────────────────────────────────────────────────────────────────

  useEffect(() => {
    resolveSession().then((session) => {
      setSessionStatus(session.status);

      if (session.status === "authenticated") {
        setWeddingId(session.activeWeddingId);
      } else {
        setIsLoading(false);
      }
    });
  }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchGuests = useCallback(async () => {
    if (!weddingId) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/guests?wedding_id=${weddingId}`);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? "Eroare la încărcarea invitaților.");
      }

      const json = await res.json();
      setGuests(json.data ?? []);
    } catch (err: any) {
      setError(err.message ?? "Eroare necunoscută.");
    } finally {
      setIsLoading(false);
    }
  }, [weddingId]);

  useEffect(() => {
    if (weddingId) fetchGuests();
  }, [weddingId, fetchGuests]);

  // ── Filtrare locală ────────────────────────────────────────────────────────

  // Build set of duplicate display names from current import report warnings
  const duplicateDisplayNames = importReport
    ? new Set(
        importReport.relevantWarnings
          .map((w) => {
            const m = w.message.match(/guest "(.+)" already exists/);
            return m ? m[1] : null;
          })
          .filter((n): n is string => n !== null)
      )
    : null;

  const filteredGuests = guests.filter((g) => {
    if (filterDuplicates && duplicateDisplayNames) {
      if (!duplicateDisplayNames.has(g.display_name)) return false;
    }

    if (search) {
      const q = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const name = `${g.first_name} ${g.last_name ?? ""} ${g.display_name}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      if (!name.includes(q)) return false;
    }

    if (filterSide !== "all" && g.side !== filterSide) return false;
    if (filterGroup !== "all" && g.guest_group_id !== filterGroup) return false;

    if (filterStatus !== "all") {
      const status = g.guest_events?.[0]?.attendance_status ?? "pending";
      if (status !== filterStatus) return false;
    }

    return true;
  });

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = {
    total: guests.length,
    confirmed: guests.filter((g) =>
      g.guest_events?.some((e) => e.attendance_status === "attending")
    ).length,
    pending: guests.filter((g) =>
      g.guest_events?.some((e) =>
        e.attendance_status === "pending" || e.attendance_status === "invited"
      )
    ).length,
    declined: guests.filter((g) =>
      g.guest_events?.some((e) => e.attendance_status === "declined")
    ).length,
  };

  // ── Grupuri unice ──────────────────────────────────────────────────────────

  const groups = Array.from(
    new Map(
      guests
        .filter((g) => g.guest_group)
        .map((g) => [g.guest_group!.id, g.guest_group!])
    ).values()
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleGuestSaved = useCallback(
    ({ guest, warnings }: { guest: GuestWithRelations; warnings?: string[] }) => {
      setIsAddModalOpen(false);
      setEditingGuest(null);
      fetchGuests().then(() => {
        highlightGuest(guest.id);
      });

      addToast("success", "Invitat salvat", 3000);

      const mappedWarnings = (warnings ?? [])
        .map(mapSingleGuestWarning)
        .filter((w): w is string => w !== null);

      if (mappedWarnings.length > 0) {
        setTimeout(() => {
          addToast("warning", mappedWarnings[0], 8000);
        }, 300);
      }
    },
    [fetchGuests, highlightGuest, addToast]
  );

  const handleImportDone = useCallback(
    ({ imported, warnings }: { imported: number; warnings?: ImportRowWarning[] }) => {
      setIsImportModalOpen(false);
      fetchGuests();

      addToast("success", `${imported} invitați importați cu succes`, 3000);

      const relevant = (warnings ?? [])
        .map((w) => {
          const mapped = mapImportWarning(w.message);
          return mapped ? { ...w, mapped } : null;
        })
        .filter((w): w is { row: number; message: string; mapped: string } => w !== null);

      if (relevant.length > 0) {
        setImportReport({ imported, relevantWarnings: relevant });
        setImportReportExpanded(false);
        setFilterDuplicates(false);
      }
    },
    [fetchGuests, addToast]
  );

  const handleEdit = useCallback((guest: GuestWithRelations) => {
    setEditingGuest(guest);
    setIsAddModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (guestId: string) => {
    if (!confirm("Ești sigur că vrei să ștergi acest invitat?")) return;

    try {
      const res = await fetch(`/api/guests/${guestId}`, { method: "DELETE" });

      if (!res.ok) throw new Error("Eroare la ștergerea invitatului.");
      fetchGuests();
    } catch (err: any) {
      alert(err.message);
    }
  }, [fetchGuests]);

  // ── Session states ─────────────────────────────────────────────────────────

  if (sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: "var(--rose)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (sessionStatus === "guest" || sessionStatus === "wp_down" || !weddingId) {
    return (
      <div
        className="rounded-xl p-12 text-center max-w-md mx-auto mt-16"
        style={{ background: "white", boxShadow: "0 2px 12px rgba(26,31,58,0.07)" }}
      >
        <div className="text-4xl mb-4">🔐</div>
        <h3
          className="text-lg font-light mb-2"
          style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
        >
          Sesiune inactivă
        </h3>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Autentifică-te prin WordPress pentru a accesa lista de invitați.
        </p>
      </div>
    );
  }

  // ── Render principal ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: "var(--ivory)" }}>
      <div className="max-w-7xl mx-auto px-6 py-8">

        <GuestListHeader
          stats={stats}
          onAddGuest={() => {
            setEditingGuest(null);
            setIsAddModalOpen(true);
          }}
          onImport={() => setIsImportModalOpen(true)}
        />

        <GuestFilters
          search={search}
          onSearchChange={setSearch}
          filterStatus={filterStatus}
          onFilterStatusChange={setFilterStatus}
          filterSide={filterSide}
          onFilterSideChange={setFilterSide}
          filterGroup={filterGroup}
          onFilterGroupChange={setFilterGroup}
          groups={groups}
        />

        {/* Import Report Panel */}
        {importReport && (
          <div
            className="mt-6 rounded-xl"
            style={{
              background: "rgba(236,201,75,0.08)",
              border: "1px solid rgba(236,201,75,0.4)",
            }}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} strokeWidth={1.8} style={{ color: "var(--yellow)", flexShrink: 0 }} />
                <span className="text-sm font-medium" style={{ color: "var(--navy)" }}>
                  Import finalizat — {importReport.imported} invitați importați
                </span>
              </div>
              <button
                onClick={() => { setImportReport(null); setFilterDuplicates(false); }}
                className="p-1 rounded"
                style={{ color: "var(--muted)" }}
              >
                <X size={14} strokeWidth={1.8} />
              </button>
            </div>

            <div
              className="px-4 pb-3"
              style={{ borderTop: "1px solid rgba(236,201,75,0.3)" }}
            >
              <p className="text-sm mt-2" style={{ color: "#92700a" }}>
                ⚠ {importReport.relevantWarnings.length} duplicate detectate
              </p>

              <div className="mt-2 space-y-1">
                {(importReportExpanded
                  ? importReport.relevantWarnings
                  : importReport.relevantWarnings.slice(0, 10)
                ).map((w, i) => (
                  <p key={i} className="text-xs" style={{ color: "var(--muted)" }}>
                    Rând {w.row}: {w.mapped}
                  </p>
                ))}
                {!importReportExpanded && importReport.relevantWarnings.length > 10 && (
                  <button
                    onClick={() => setImportReportExpanded(true)}
                    className="text-xs"
                    style={{ color: "var(--rose)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    + {importReport.relevantWarnings.length - 10} mai multe
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => { setImportReport(null); setFilterDuplicates(false); }}
                  className="px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ border: "1px solid var(--cream-line)", color: "var(--muted)" }}
                >
                  Închide
                </button>
                <button
                  onClick={() => setFilterDuplicates((v) => !v)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    background: filterDuplicates ? "var(--yellow)" : "transparent",
                    border: "1px solid var(--yellow)",
                    color: filterDuplicates ? "white" : "#92700a",
                  }}
                >
                  {filterDuplicates ? "Afișează toți" : "Filtrează duplicatele"}
                </button>
              </div>
            </div>
          </div>
        )}

        {error ? (
          <div
            className="mt-6 rounded-xl p-6 text-center"
            style={{ background: "white", border: "1px solid var(--cream-line)" }}
          >
            <p className="text-sm" style={{ color: "var(--red)" }}>{error}</p>
            <button
              onClick={fetchGuests}
              className="mt-3 px-4 py-2 rounded-full text-sm font-medium"
              style={{ background: "var(--rose)", color: "white" }}
            >
              Încearcă din nou
            </button>
          </div>
        ) : (
          <GuestTable
            guests={filteredGuests}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            highlightedGuestId={highlightedGuestId}
          />
        )}
      </div>

      {isAddModalOpen && weddingId && (
        <GuestFormModal
          guest={editingGuest}
          groups={groups}
          weddingId={weddingId}
          onSave={handleGuestSaved}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingGuest(null);
          }}
        />
      )}

      {isImportModalOpen && (
        <GuestImportModal
          onImport={handleImportDone}
          onClose={() => setIsImportModalOpen(false)}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}