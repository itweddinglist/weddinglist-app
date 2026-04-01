// =============================================================================
// app/guest-list/components/GuestListHeader.tsx
// Header cu stats + butoane principale
// =============================================================================

import { Upload, UserPlus } from "lucide-react";

interface Stats {
  total: number;
  confirmed: number;
  pending: number;
  declined: number;
}

interface Props {
  stats: Stats;
  onAddGuest: () => void;
  onImport: () => void;
}

export default function GuestListHeader({ stats, onAddGuest, onImport }: Props) {
  return (
    <div className="mb-8">
      {/* Titlu */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-4xl font-light"
            style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
          >
            Listă <em className="italic" style={{ color: "var(--rose)" }}>Invitați</em>
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {stats.total} invitați înregistrați
          </p>
        </div>

        {/* Butoane */}
        <div className="flex items-center gap-3">
          <button
            onClick={onImport}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              border: "1px solid var(--rose)",
              color: "var(--rose)",
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(201,144,122,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <Upload size={15} strokeWidth={1.8} />
            Import CSV
          </button>

          <button
            onClick={onAddGuest}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{ background: "var(--rose)", color: "white" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--rose-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--rose)";
            }}
          >
            <UserPlus size={15} strokeWidth={1.8} />
            Adaugă Invitat
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Total invitați",
            value: stats.total,
            color: "var(--rose)",
            bg: "rgba(201,144,122,0.08)",
          },
          {
            label: "Confirmați",
            value: stats.confirmed,
            color: "var(--green)",
            bg: "rgba(72,187,120,0.08)",
          },
          {
            label: "În așteptare",
            value: stats.pending,
            color: "var(--yellow)",
            bg: "rgba(236,201,75,0.08)",
          },
          {
            label: "Refuzați",
            value: stats.declined,
            color: "var(--red)",
            bg: "rgba(229,62,62,0.08)",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-4"
            style={{
              background: "white",
              boxShadow: "0 2px 12px rgba(26,31,58,0.07)",
              borderTop: `3px solid ${stat.color}`,
            }}
          >
            <div
              className="text-3xl font-light"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--navy)",
                lineHeight: 1,
              }}
            >
              {stat.value}
            </div>
            <div
              className="text-xs font-medium mt-2"
              style={{ color: "var(--muted)" }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}