// =============================================================================
// app/guest-list/components/GuestRow.tsx
// Un rând din tabelul de invitați
// =============================================================================

import { Pencil, Trash2, Star } from "lucide-react";
import GuestStatusBadge from "./GuestStatusBadge";
import type { GuestWithRelations } from "@/types/guests";

interface Props {
  guest: GuestWithRelations;
  onEdit: (guest: GuestWithRelations) => void;
  onDelete: (id: string) => void;
}

const SIDE_LABELS: Record<string, string> = {
  bride: "Mireasă",
  groom: "Mire",
  both: "Ambii",
  other: "Altele",
};

export default function GuestRow({ guest, onEdit, onDelete }: Props) {
  const status = guest.guest_events?.[0]?.attendance_status ?? null;
  const initials = `${guest.first_name[0]}${guest.last_name?.[0] ?? ""}`.toUpperCase();

  // Culoare avatar bazată pe primul caracter
  const colors = [
    "#C9907A", "#48BB78", "#ECC94B", "#9F7AEA",
    "#F687B3", "#76E4F7", "#FC8181", "#68D391",
  ];
  const colorIndex = guest.first_name.charCodeAt(0) % colors.length;
  const avatarColor = colors[colorIndex];

  return (
    <tr
      className="group transition-colors"
      style={{ borderBottom: "1px solid var(--cream-line)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(201,144,122,0.04)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {/* Nume */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
            style={{
              background: `${avatarColor}22`,
              border: `1.5px solid ${avatarColor}`,
              color: avatarColor,
            }}
          >
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span
                className="text-sm font-medium"
                style={{ color: "var(--navy)" }}
              >
                {guest.display_name}
              </span>
              {guest.is_vip && (
                <Star
                  size={12}
                  strokeWidth={1.8}
                  fill="var(--yellow)"
                  style={{ color: "var(--yellow)" }}
                />
              )}
            </div>
            {guest.last_name && (
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                {guest.first_name} {guest.last_name}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Grup */}
      <td className="py-3 px-4">
        {guest.guest_group ? (
          <span
            className="text-xs px-2 py-1 rounded-full"
            style={{
              background: "var(--cream)",
              color: "var(--muted)",
            }}
          >
            {guest.guest_group.name}
          </span>
        ) : (
          <span className="text-xs" style={{ color: "var(--cream-line)" }}>—</span>
        )}
      </td>

      {/* Parte */}
      <td className="py-3 px-4">
        <span className="text-sm" style={{ color: "var(--muted)" }}>
          {guest.side ? SIDE_LABELS[guest.side] : "—"}
        </span>
      </td>

      {/* Status */}
      <td className="py-3 px-4">
        <GuestStatusBadge status={status as any} />
      </td>

      {/* Evenimente */}
      <td className="py-3 px-4">
        <span
          className="text-xs px-2 py-1 rounded-full"
          style={{
            background: "var(--cream)",
            color: "var(--muted)",
          }}
        >
          {guest.guest_events?.length ?? 0} ev.
        </span>
      </td>

      {/* Acțiuni */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(guest)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--cream)";
              e.currentTarget.style.color = "var(--navy)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--muted)";
            }}
            title="Editează"
          >
            <Pencil size={14} strokeWidth={1.8} />
          </button>
          <button
            onClick={() => onDelete(guest.id)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(229,62,62,0.08)";
              e.currentTarget.style.color = "var(--red)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--muted)";
            }}
            title="Șterge"
          >
            <Trash2 size={14} strokeWidth={1.8} />
          </button>
        </div>
      </td>
    </tr>
  );
}