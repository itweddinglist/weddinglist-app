// =============================================================================
// app/guest-list/page.tsx
// UI Lista Invitați — Faza 3 UI
// Folosește session-bridge pentru wedding_id — consistent cu restul aplicației
// =============================================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { resolveSession } from "@/app/lib/auth/session/session-bridge";
import GuestListHeader from "./components/GuestListHeader";
import GuestFilters from "./components/GuestFilters";
import GuestTable from "./components/GuestTable";
import GuestFormModal from "./components/GuestFormModal";
import GuestImportModal from "./components/GuestImportModal";
import type { GuestWithRelations } from "@/types/guests";

export default function GuestListPage() {
  const [guests, setGuests] = useState<GuestWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string>("loading");

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSide, setFilterSide] = useState<string>("all");
  const [filterGroup, setFilterGroup] = useState<string>("all");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<GuestWithRelations | null>(null);

  // ── Session ────────────────────────────────────────────────────────────────

  useEffect(() => {
    resolveSession().then((session) => {
      setSessionStatus(session.status);

      if (session.status === "authenticated") {
        setWeddingId(session.activeWeddingId);
        // Token-ul vine din sessionStorage cache — folosim același pattern ca seating
        const raw = sessionStorage.getItem("wl_session_cache");
        if (raw) {
          try {
            const cached = JSON.parse(raw);
            setToken(cached.data?.token ?? null);
          } catch {
            setToken(null);
          }
        }
      } else {
        setIsLoading(false);
      }
    });
  }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchGuests = useCallback(async () => {
    if (!weddingId || !token) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/guests?wedding_id=${weddingId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

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
  }, [weddingId, token]);

  useEffect(() => {
    if (weddingId && token) fetchGuests();
  }, [weddingId, token, fetchGuests]);

  // ── Filtrare locală ────────────────────────────────────────────────────────

  const filteredGuests = guests.filter((g) => {
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

  const handleGuestSaved = useCallback(() => {
    setIsAddModalOpen(false);
    setEditingGuest(null);
    fetchGuests();
  }, [fetchGuests]);

  const handleImportDone = useCallback(() => {
    setIsImportModalOpen(false);
    fetchGuests();
  }, [fetchGuests]);

  const handleEdit = useCallback((guest: GuestWithRelations) => {
    setEditingGuest(guest);
    setIsAddModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (guestId: string) => {
    if (!confirm("Ești sigur că vrei să ștergi acest invitat?")) return;
    if (!token) return;

    try {
      const res = await fetch(`/api/guests/${guestId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Eroare la ștergerea invitatului.");
      fetchGuests();
    } catch (err: any) {
      alert(err.message);
    }
  }, [token, fetchGuests]);

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
          />
        )}
      </div>

      {isAddModalOpen && weddingId && token && (
        <GuestFormModal
          guest={editingGuest}
          groups={groups}
          weddingId={weddingId}
          onSave={handleGuestSaved}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingGuest(null);
          }}
          devToken={token}
        />
      )}

      {isImportModalOpen && token && (
        <GuestImportModal
          onDone={handleImportDone}
          onClose={() => setIsImportModalOpen(false)}
          devToken={token}
        />
      )}
    </div>
  );
}