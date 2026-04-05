// =============================================================================
// app/guest-list/components/GuestTable.tsx
// Tabelul principal de invitați
// =============================================================================

import GuestRow from "./GuestRow";
import type { GuestWithRelations } from "@/types/guests";

interface Props {
  guests: GuestWithRelations[];
  isLoading: boolean;
  onEdit: (guest: GuestWithRelations) => void;
  onDelete: (id: string) => void;
  highlightedGuestId?: string | null;
}

export default function GuestTable({ guests, isLoading, onEdit, onDelete, highlightedGuestId }: Props) {
  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "white",
          boxShadow: "0 2px 12px rgba(26,31,58,0.07)",
        }}
      >
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3 animate-pulse"
            style={{ borderBottom: "1px solid var(--cream-line)" }}
          >
            <div
              className="w-8 h-8 rounded-full flex-shrink-0"
              style={{ background: "var(--cream)" }}
            />
            <div className="flex-1 space-y-2">
              <div
                className="h-3 rounded"
                style={{ background: "var(--cream)", width: "40%" }}
              />
              <div
                className="h-2 rounded"
                style={{ background: "var(--cream)", width: "25%" }}
              />
            </div>
            <div
              className="h-6 w-20 rounded-full"
              style={{ background: "var(--cream)" }}
            />
          </div>
        ))}
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (guests.length === 0) {
    return (
      <div
        className="rounded-xl p-12 text-center"
        style={{
          background: "white",
          boxShadow: "0 2px 12px rgba(26,31,58,0.07)",
        }}
      >
        <div className="text-4xl mb-4">👥</div>
        <h3
          className="text-lg font-light mb-2"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--navy)",
          }}
        >
          Niciun invitat găsit
        </h3>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Adaugă primul invitat sau modifică filtrele active.
        </p>
      </div>
    );
  }

  // ── Tabel ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "white",
        boxShadow: "0 2px 12px rgba(26,31,58,0.07)",
      }}
    >
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: "2px solid var(--cream-line)" }}>
            {[
              { label: "Nume", width: "30%" },
              { label: "Grup", width: "20%" },
              { label: "Parte", width: "12%" },
              { label: "Status", width: "15%" },
              { label: "Evenimente", width: "10%" },
              { label: "", width: "13%" },
            ].map((col) => (
              <th
                key={col.label}
                className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider"
                style={{
                  color: "var(--muted)",
                  width: col.width,
                  letterSpacing: "0.08em",
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {guests.map((guest) => (
            <GuestRow
              key={guest.id}
              guest={guest}
              onEdit={onEdit}
              onDelete={onDelete}
              isHighlighted={!!highlightedGuestId && guest.id === highlightedGuestId}
            />
          ))}
        </tbody>
      </table>

      {/* Footer cu count */}
      <div
        className="px-4 py-3 text-xs"
        style={{
          borderTop: "1px solid var(--cream-line)",
          color: "var(--muted)",
        }}
      >
        {guests.length} {guests.length === 1 ? "invitat" : "invitați"}
      </div>
    </div>
  );
}