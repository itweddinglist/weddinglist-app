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

export default function GuestTable({
  guests,
  isLoading,
  onEdit,
  onDelete,
  highlightedGuestId,
}: Props) {
  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        className="overflow-hidden rounded-xl"
        style={{
          background: "white",
          boxShadow: "0 2px 12px rgba(26,31,58,0.07)",
        }}
      >
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex animate-pulse items-center gap-4 px-4 py-3"
            style={{ borderBottom: "1px solid var(--cream-line)" }}
          >
            <div
              className="h-8 w-8 flex-shrink-0 rounded-full"
              style={{ background: "var(--cream)" }}
            />
            <div className="flex-1 space-y-2">
              <div className="h-3 rounded" style={{ background: "var(--cream)", width: "40%" }} />
              <div className="h-2 rounded" style={{ background: "var(--cream)", width: "25%" }} />
            </div>
            <div className="h-6 w-20 rounded-full" style={{ background: "var(--cream)" }} />
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
        <div className="mb-4 text-4xl">👥</div>
        <h3
          className="mb-2 text-lg font-light"
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
      className="overflow-hidden rounded-xl"
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
                className="px-4 py-3 text-left text-xs font-medium tracking-wider uppercase"
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
