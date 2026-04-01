// =============================================================================
// app/guest-list/components/GuestStatusBadge.tsx
// Badge colorat pentru status RSVP
// =============================================================================

type Status = "pending" | "invited" | "attending" | "declined" | "maybe" | null;

interface Props {
  status: Status;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  attending: { label: "Confirmat", color: "var(--green)", bg: "rgba(72,187,120,0.12)" },
  declined:  { label: "Refuzat",   color: "var(--red)",   bg: "rgba(229,62,62,0.12)"  },
  maybe:     { label: "Poate",     color: "var(--yellow)", bg: "rgba(236,201,75,0.12)" },
  invited:   { label: "Invitat",   color: "var(--rose)",  bg: "rgba(201,144,122,0.12)"},
  pending:   { label: "În așteptare", color: "var(--muted)", bg: "rgba(122,127,153,0.12)" },
};

export default function GuestStatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status ?? "pending"] ?? STATUS_CONFIG.pending;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ color: config.color, background: config.bg }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: config.color }}
      />
      {config.label}
    </span>
  );
}