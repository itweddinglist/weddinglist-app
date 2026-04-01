// =============================================================================
// app/guest-list/components/GuestFormModal.tsx
// Modal add / edit invitat
// =============================================================================

"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { GuestWithRelations, GuestSide } from "@/types/guests";

interface Group {
  id: string;
  name: string;
}

interface Props {
  guest: GuestWithRelations | null;
  groups: Group[];
  weddingId: string;
  onSave: () => void;
  onClose: () => void;
  devToken: string;
}

const inputStyle = {
  width: "100%",
  border: "1px solid var(--cream-line)",
  borderRadius: "8px",
  padding: "0.6rem 0.75rem",
  fontSize: "0.85rem",
  color: "var(--navy)",
  background: "var(--ivory)",
  outline: "none",
};

const labelStyle = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 500,
  color: "var(--muted)",
  marginBottom: "0.4rem",
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
};

export default function GuestFormModal({
  guest, groups, weddingId, onSave, onClose, devToken,
}: Props) {
  const isEditing = !!guest;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [groupId, setGroupId] = useState<string>("");
  const [side, setSide] = useState<GuestSide | "">("");
  const [notes, setNotes] = useState("");
  const [isVip, setIsVip] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (guest) {
      setFirstName(guest.first_name);
      setLastName(guest.last_name ?? "");
      setDisplayName(guest.display_name);
      setGroupId(guest.guest_group_id ?? "");
      setSide((guest.side as GuestSide) ?? "");
      setNotes(guest.notes ?? "");
      setIsVip(guest.is_vip);
    } else {
      setFirstName("");
      setLastName("");
      setDisplayName("");
      setGroupId("");
      setSide("");
      setNotes("");
      setIsVip(false);
    }
  }, [guest]);

  const handleFirstNameChange = (v: string) => {
    setFirstName(v);
    const auto = [v, lastName].filter(Boolean).join(" ");
    if (!displayName || displayName === [firstName, lastName].filter(Boolean).join(" ")) {
      setDisplayName(auto);
    }
  };

  const handleLastNameChange = (v: string) => {
    setLastName(v);
    const auto = [firstName, v].filter(Boolean).join(" ");
    if (!displayName || displayName === [firstName, lastName].filter(Boolean).join(" ")) {
      setDisplayName(auto);
    }
  };

  const handleSubmit = async () => {
    if (!firstName.trim()) {
      setError("Prenumele este obligatoriu.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        display_name: displayName.trim() || firstName.trim(),
        guest_group_id: groupId || null,
        side: side || null,
        notes: notes.trim() || null,
        is_vip: isVip,
      };

      let res: Response;

      if (isEditing) {
        res = await fetch(`/api/guests/${guest.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${devToken}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        payload.wedding_id = weddingId;
        res = await fetch("/api/guests", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${devToken}`,
          },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? "Eroare la salvare.");
      }

      onSave();
    } catch (err: any) {
      setError(err.message ?? "Eroare necunoscută.");
    } finally {
      setIsSaving(false);
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
            {isEditing ? "Editează invitat" : "Adaugă invitat"}
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

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Prenume *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => handleFirstNameChange(e.target.value)}
                placeholder="Ion"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Nume</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => handleLastNameChange(e.target.value)}
                placeholder="Popescu"
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Nume afișat</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ion Popescu"
              style={inputStyle}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Grup</label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Fără grup</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Parte</label>
              <select
                value={side}
                onChange={(e) => setSide(e.target.value as GuestSide | "")}
                style={inputStyle}
              >
                <option value="">Neselectat</option>
                <option value="bride">Mireasă</option>
                <option value="groom">Mire</option>
                <option value="both">Ambii</option>
                <option value="other">Altele</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Notițe</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observații despre invitat..."
              rows={3}
              style={{ ...inputStyle, resize: "none" }}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsVip(!isVip)}
              className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
              style={{ background: isVip ? "var(--rose)" : "var(--cream-line)" }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm"
                style={{
                  transform: isVip ? "translateX(1.25rem)" : "translateX(0.125rem)",
                }}
              />
            </button>
            <span className="text-sm" style={{ color: "var(--navy)" }}>
              Invitat VIP ⭐
            </span>
          </div>

          {error && (
            <p className="text-sm" style={{ color: "var(--red)" }}>{error}</p>
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
            Anulează
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-5 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              background: isSaving ? "var(--cream-line)" : "var(--rose)",
              color: isSaving ? "var(--muted)" : "white",
              cursor: isSaving ? "not-allowed" : "pointer",
            }}
          >
            {isSaving ? "Se salvează..." : isEditing ? "Salvează" : "Adaugă"}
          </button>
        </div>
      </div>
    </div>
  );
}