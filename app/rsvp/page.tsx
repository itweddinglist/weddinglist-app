// =============================================================================
// app/rsvp/page.tsx
// RSVP Dashboard — pentru cuplu
// Source of truth: rsvp_responses (răspuns) + rsvp_invitations (delivery)
// Polling 30s, nu realtime
// =============================================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/app/lib/auth/session/use-session";
import { getTranslations } from "@/lib/rsvp/rsvp-translations";

const t = getTranslations("ro");

// ─── Types ────────────────────────────────────────────────────────────────────

interface RsvpGuestRow {
  guest_id: string;
  display_name: string;
  first_name: string;
  guest_event_id: string;
  event_id: string;
  event_name: string;
  // Din rsvp_responses
  rsvp_status: "pending" | "accepted" | "declined" | "maybe" | null;
  meal_choice: "standard" | "vegetarian" | null;
  dietary_notes: string | null;
  responded_at: string | null;
  rsvp_source: "guest_link" | "couple_manual" | "import" | null;
  // Din rsvp_invitations
  invitation_id: string | null;
  token_raw: null; // nu expunem tokenul raw în dashboard
  delivery_channel: string | null;
  delivery_status: string | null;
  opened_at: string | null;
  last_sent_at: string | null;
  is_active: boolean | null;
}

interface RsvpStats {
  total: number;
  accepted: number;
  declined: number;
  pending: number;
  maybe: number;
  response_rate: number;
  opened_not_answered: number;
  special_meals: number;
  has_allergies: number;
}

type FilterStatus = "all" | "accepted" | "declined" | "pending" | "maybe" | "opened_not_answered" | "not_invited";

// ─── Component ────────────────────────────────────────────────────────────────

export default function RsvpDashboard() {
  const sessionState = useSession();
  const [guests, setGuests] = useState<RsvpGuestRow[]>([]);
  const [stats, setStats] = useState<RsvpStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generatingLinks, setGeneratingLinks] = useState<Set<string>>(new Set());
  const [manualOverride, setManualOverride] = useState<string | null>(null);

  const weddingId = sessionState.status === "authenticated" ? sessionState.activeWeddingId : null;
  const token = null; // JWT nu e expus în client — API routes folosesc cookie-ul WP

  // ─── Fetch data ─────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!weddingId || !token) return;

    try {
      const res = await fetch(`/api/rsvp/dashboard?wedding_id=${weddingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Eroare la încărcarea datelor.");
        return;
      }
      setGuests(json.data.guests);
      setStats(json.data.stats);
      setError(null);
    } catch {
      setError("Eroare la încărcarea datelor.");
    } finally {
      setLoading(false);
    }
  }, [weddingId, token]);

  // Initial fetch + polling 30s
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ─── Filtered guests ─────────────────────────────────────────────────────────

  const filtered = guests.filter((g) => {
    const matchSearch = g.display_name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .includes(
        search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      );

    const matchFilter =
      filterStatus === "all" ||
      (filterStatus === "not_invited" && !g.invitation_id) ||
      (filterStatus === "opened_not_answered" &&
        g.opened_at && g.rsvp_status === "pending") ||
      g.rsvp_status === filterStatus;

    return matchSearch && matchFilter;
  });

  // ─── Actions ──────────────────────────────────────────────────────────────────

  const generateLink = async (guestId: string) => {
    if (!weddingId || !token) return;
    setGeneratingLinks((prev) => new Set(prev).add(guestId));
    try {
      const res = await fetch("/api/rsvp/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ wedding_id: weddingId, guest_id: guestId }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchData();
      }
    } finally {
      setGeneratingLinks((prev) => {
        const next = new Set(prev);
        next.delete(guestId);
        return next;
      });
    }
  };

  const copyLink = async (invitationId: string, tokenRaw: string) => {
    const url = `${window.location.origin}/rsvp/${tokenRaw}`;
    await navigator.clipboard.writeText(url);
  };

  const sendWhatsApp = async (
    guest: RsvpGuestRow,
    invitationToken: string,
    invitationId: string
  ) => {
    const link = `${window.location.origin}/rsvp/${invitationToken}`;
    const message = t.dashboard.whatsapp_message
      .replace("{firstName}", guest.first_name)
      .replace("{rsvpLink}", link);

    // Track în DB
    await fetch(`/api/rsvp/invitations/${invitationId}/mark-sent`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ delivery_channel: "whatsapp" }),
    }).catch(() => {}); // fire and forget

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const manualOverrideStatus = async (
    guestEventId: string,
    status: "accepted" | "declined" | "maybe"
  ) => {
    if (!token) return;
    await fetch(`/api/rsvp/manual`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ guest_event_id: guestEventId, status }),
    });
    setManualOverride(null);
    await fetchData();
  };

  const bulkGenerateLinks = async () => {
    const withoutInvitation = filtered.filter((g) => !g.invitation_id);
    for (const g of withoutInvitation) {
      await generateLink(g.guest_id);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (sessionState.status !== "authenticated") {
    return (
      <div style={styles.page}>
        <div style={styles.emptyState}>
          <div style={{ fontSize: "2rem" }}>🔒</div>
          <p style={styles.emptyText}>Sesiune inactivă</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>Se încarcă...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.emptyState}>
          <p style={{ color: "var(--color-danger)" }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>RSVP</h1>
        <button onClick={fetchData} style={styles.refreshBtn}>↻ Actualizează</button>
      </div>

      {/* Stats */}
      {stats && <RsvpStats stats={stats} />}

      {/* Action Bar */}
      <div style={styles.actionBar}>
        <button onClick={bulkGenerateLinks} style={styles.primaryBtn}>
          Generează invitații
        </button>
        <button
          onClick={() => {
            const rows = filtered.map((g) => [
              g.display_name,
              g.rsvp_status ?? "pending",
              g.meal_choice ?? "",
              g.dietary_notes ?? "",
              g.responded_at ?? "",
            ]);
            const csv = [
              ["Nume", "Status", "Meniu", "Alergii", "Data răspuns"],
              ...rows,
            ]
              .map((r) => r.join(","))
              .join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "rsvp-raspunsuri.csv";
            a.click();
          }}
          style={styles.secondaryBtn}
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <input
          type="text"
          placeholder="Caută invitat..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <div style={styles.filterBtns}>
          {(["all", "accepted", "declined", "pending", "maybe", "opened_not_answered", "not_invited"] as FilterStatus[]).map(
            (f) => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                style={{
                  ...styles.filterBtn,
                  ...(filterStatus === f ? styles.filterBtnActive : {}),
                }}
              >
                {filterLabels[f]}
              </button>
            )
          )}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>Niciun invitat găsit.</p>
        </div>
      )}

      {/* Guest list */}
      <div style={styles.table}>
        {filtered.map((g) => (
          <GuestRow
            key={g.guest_event_id}
            guest={g}
            token={token!}
            onGenerate={() => generateLink(g.guest_id)}
            onWhatsApp={(invToken) => sendWhatsApp(g, invToken, g.invitation_id!)}
            onManual={(status) => manualOverrideStatus(g.guest_event_id, status)}
            isGenerating={generatingLinks.has(g.guest_id)}
            manualOpen={manualOverride === g.guest_event_id}
            onToggleManual={() =>
              setManualOverride(
                manualOverride === g.guest_event_id ? null : g.guest_event_id
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

// ─── Stats Component ──────────────────────────────────────────────────────────

function RsvpStats({ stats }: { stats: RsvpStats }) {
  return (
    <div style={styles.statsGrid}>
      <StatCard label="Confirmați" value={stats.accepted} color="var(--color-success)" />
      <StatCard label="Refuzați" value={stats.declined} color="var(--color-danger)" />
      <StatCard label="În așteptare" value={stats.pending} color="var(--color-text-muted)" />
      <StatCard label="Poate" value={stats.maybe} color="var(--color-warning)" />
      <StatCard label="Rată răspuns" value={`${stats.response_rate}%`} color="var(--color-accent)" />
      <StatCard label="Deschis, fără răspuns" value={stats.opened_not_answered} color="var(--color-warning)" />
      <StatCard label="Total invitați" value={stats.total} color="var(--color-text)" />
      <StatCard label="Meniuri speciale" value={stats.special_meals} color="var(--color-accent)" />
      <StatCard label="Alergii" value={stats.has_allergies} color="var(--color-danger)" />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={styles.statCard}>
      <p style={{ ...styles.statValue, color }}>{value}</p>
      <p style={styles.statLabel}>{label}</p>
    </div>
  );
}

// ─── Guest Row Component ──────────────────────────────────────────────────────

function GuestRow({
  guest,
  onGenerate,
  onWhatsApp,
  onManual,
  isGenerating,
  manualOpen,
  onToggleManual,
}: {
  guest: RsvpGuestRow;
  token: string;
  onGenerate: () => void;
  onWhatsApp: (token: string) => void;
  onManual: (status: "accepted" | "declined" | "maybe") => void;
  isGenerating: boolean;
  manualOpen: boolean;
  onToggleManual: () => void;
}) {
  const hasInvitation = !!guest.invitation_id && guest.is_active;

  return (
    <div style={styles.row}>
      {/* Nume + event */}
      <div style={{ flex: 2 }}>
        <p style={styles.guestName}>{guest.display_name}</p>
        <p style={styles.guestEvent}>{guest.event_name}</p>
      </div>

      {/* RSVP Status badge */}
      <div style={{ flex: 1 }}>
        <span style={{ ...styles.badge, ...badgeColors[guest.rsvp_status ?? "pending"] }}>
          {statusLabels[guest.rsvp_status ?? "pending"]}
        </span>
      </div>

      {/* Invitation status */}
      <div style={{ flex: 1 }}>
        <span style={styles.invStatus}>
          {!guest.invitation_id
            ? "Fără link"
            : guest.opened_at
            ? "Deschis"
            : "Link generat"}
        </span>
      </div>

      {/* Data răspuns */}
      <div style={{ flex: 1 }}>
        <p style={styles.date}>
          {guest.responded_at
            ? new Date(guest.responded_at).toLocaleDateString("ro-RO")
            : "—"}
        </p>
      </div>

      {/* Acțiuni */}
      <div style={{ flex: 2, display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {!hasInvitation ? (
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            style={styles.actionBtn}
          >
            {isGenerating ? "..." : "Generează link"}
          </button>
        ) : (
          <button
            onClick={() => onWhatsApp(guest.invitation_id!)}
            style={styles.whatsappBtn}
          >
            WhatsApp
          </button>
        )}

        <button onClick={onToggleManual} style={styles.secondaryActionBtn}>
          Manual
        </button>

        {manualOpen && (
          <div style={styles.manualMenu}>
            {(["accepted", "declined", "maybe"] as const).map((s) => (
              <button key={s} onClick={() => onManual(s)} style={styles.manualBtn}>
                {statusLabels[s]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Labels + Colors ──────────────────────────────────────────────────────────

const statusLabels: Record<string, string> = {
  pending: "În așteptare",
  accepted: "Confirmat",
  declined: "Refuzat",
  maybe: "Poate",
};

const filterLabels: Record<FilterStatus, string> = {
  all: "Toți",
  accepted: "Confirmați",
  declined: "Refuzați",
  pending: "În așteptare",
  maybe: "Poate",
  opened_not_answered: "Deschis, fără răspuns",
  not_invited: "Fără invitație",
};

const badgeColors: Record<string, React.CSSProperties> = {
  pending: { background: "rgba(157,163,188,0.15)", color: "var(--color-text-muted)" },
  accepted: { background: "rgba(72,187,120,0.12)", color: "var(--color-success)" },
  declined: { background: "rgba(229,62,62,0.12)", color: "var(--color-danger)" },
  maybe: { background: "rgba(236,201,75,0.12)", color: "var(--color-warning)" },
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "2rem", background: "var(--color-bg)", minHeight: "100vh" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" },
  title: { fontFamily: "var(--font-display, serif)", fontSize: "2rem", fontWeight: 300, color: "var(--color-text)", margin: 0 },
  refreshBtn: { background: "none", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "0.4rem 0.8rem", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "0.8rem" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "1rem", marginBottom: "2rem" },
  statCard: { background: "white", borderRadius: "12px", padding: "1.25rem", boxShadow: "var(--shadow-sm)" },
  statValue: { fontSize: "1.8rem", fontWeight: 600, margin: 0, fontVariantNumeric: "tabular-nums" },
  statLabel: { fontSize: "0.75rem", color: "var(--color-text-muted)", margin: "0.25rem 0 0", textTransform: "uppercase", letterSpacing: "0.06em" },
  actionBar: { display: "flex", gap: "0.75rem", marginBottom: "1.5rem" },
  primaryBtn: { background: "var(--color-accent)", color: "white", border: "none", borderRadius: "999px", padding: "0.6rem 1.25rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500 },
  secondaryBtn: { background: "white", color: "var(--color-accent)", border: "1px solid var(--color-accent)", borderRadius: "999px", padding: "0.6rem 1.25rem", cursor: "pointer", fontSize: "0.85rem" },
  filters: { marginBottom: "1.5rem" },
  searchInput: { width: "100%", padding: "0.65rem 1rem", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "0.75rem", background: "white", color: "var(--color-text)", outline: "none", boxSizing: "border-box" },
  filterBtns: { display: "flex", gap: "0.5rem", flexWrap: "wrap" },
  filterBtn: { padding: "0.35rem 0.85rem", borderRadius: "999px", border: "1px solid var(--color-border)", background: "white", color: "var(--color-text-muted)", fontSize: "0.78rem", cursor: "pointer" },
  filterBtnActive: { background: "var(--color-accent-soft)", borderColor: "var(--color-accent)", color: "var(--color-accent)", fontWeight: 500 },
  table: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  row: { background: "white", borderRadius: "12px", padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem", boxShadow: "var(--shadow-sm)", flexWrap: "wrap" },
  guestName: { fontWeight: 500, color: "var(--color-text)", margin: 0, fontSize: "0.9rem" },
  guestEvent: { fontSize: "0.75rem", color: "var(--color-text-muted)", margin: "0.15rem 0 0" },
  badge: { padding: "0.25rem 0.65rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 500 },
  invStatus: { fontSize: "0.78rem", color: "var(--color-text-light)" },
  date: { fontSize: "0.78rem", color: "var(--color-text-muted)", margin: 0 },
  actionBtn: { padding: "0.4rem 0.85rem", borderRadius: "999px", background: "var(--color-accent)", color: "white", border: "none", fontSize: "0.78rem", cursor: "pointer" },
  whatsappBtn: { padding: "0.4rem 0.85rem", borderRadius: "999px", background: "#25D366", color: "white", border: "none", fontSize: "0.78rem", cursor: "pointer" },
  secondaryActionBtn: { padding: "0.4rem 0.85rem", borderRadius: "999px", background: "white", color: "var(--color-text-muted)", border: "1px solid var(--color-border)", fontSize: "0.78rem", cursor: "pointer" },
  manualMenu: { display: "flex", gap: "0.4rem", flexWrap: "wrap" },
  manualBtn: { padding: "0.3rem 0.7rem", borderRadius: "999px", background: "var(--color-accent-soft)", color: "var(--color-accent)", border: "1px solid var(--color-accent)", fontSize: "0.75rem", cursor: "pointer" },
  emptyState: { textAlign: "center", padding: "4rem 2rem" },
  emptyText: { color: "var(--color-text-muted)", fontSize: "0.9rem" },
};