// =============================================================================
// app/budget/page.tsx
// Budget UI — Faza 12.3
// CRUD budget items + payments, state machine vizuală, summary cards
// Pattern: useSession + fetch paralel + inline styles + var(--*) CSS variables
// =============================================================================

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ReactNode, CSSProperties, FormEvent, ChangeEvent } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  CreditCard,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { useSession } from "@/app/lib/auth/session/use-session";
import type {
  BudgetItemRow,
  PaymentRow,
  BudgetSummary,
  BudgetItemStatus,
} from "@/types/budget";

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  BudgetItemStatus,
  { label: string; color: string; bg: string }
> = {
  planned:   { label: "Planificat", color: "#92700a",  bg: "rgba(236,201,75,0.12)"   },
  confirmed: { label: "Confirmat",  color: "#2b6cb0",  bg: "rgba(66,153,225,0.12)"   },
  paid:      { label: "Plătit",     color: "#276749",  bg: "rgba(72,187,120,0.12)"   },
  cancelled: { label: "Anulat",     color: "#718096",  bg: "rgba(160,174,192,0.12)"  },
};

// ─── State machine transitions ─────────────────────────────────────────────────
// planned → confirmed | cancelled
// confirmed → paid | cancelled
// paid, cancelled → terminal

const TRANSITIONS: Record<
  BudgetItemStatus,
  { to: BudgetItemStatus; label: string; color: string }[]
> = {
  planned:   [
    { to: "confirmed", label: "Confirmă",         color: "#2b6cb0" },
    { to: "cancelled", label: "Anulează",          color: "#718096" },
  ],
  confirmed: [
    { to: "paid",      label: "Marchează plătit", color: "#276749" },
    { to: "cancelled", label: "Anulează",          color: "#718096" },
  ],
  paid:      [],
  cancelled: [],
};

// ─── Toast system ──────────────────────────────────────────────────────────────

type ToastType = "success" | "error";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

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
                : "rgba(229,62,62,0.12)",
            border: `1px solid ${
              t.type === "success" ? "var(--green)" : "var(--red)"
            }`,
            boxShadow: "0 4px 16px rgba(19,23,46,0.1)",
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
            {t.type === "success" ? "✓" : "✕"}
          </span>
          <p
            style={{
              flex: 1,
              fontSize: "0.85rem",
              lineHeight: 1.4,
              color:
                t.type === "success" ? "var(--green)" : "var(--red)",
            }}
          >
            {t.message}
          </p>
          <button
            onClick={() => onDismiss(t.id)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--muted)",
              padding: 0,
              flexShrink: 0,
            }}
          >
            <X size={14} strokeWidth={1.8} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BudgetItemStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.2rem 0.6rem",
        borderRadius: "999px",
        fontSize: "0.72rem",
        fontWeight: 500,
        color: cfg.color,
        background: cfg.bg,
      }}
    >
      {cfg.label}
    </span>
  );
}

// ─── ModalOverlay ──────────────────────────────────────────────────────────────

function ModalOverlay({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(19,23,46,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}

// ─── ItemModal (create / edit) ─────────────────────────────────────────────────

interface ItemFormState {
  name: string;
  category: string;
  estimated_amount: string;
  actual_amount: string;
  currency: string;
  status: BudgetItemStatus;
  due_date: string;
  notes: string;
}

function ItemModal({
  item,
  weddingId,
  onSave,
  onClose,
}: {
  item: BudgetItemRow | null;
  weddingId: string;
  onSave: (saved: BudgetItemRow) => void;
  onClose: () => void;
}) {
  const isEdit = item !== null;
  const isPaid = item?.status === "paid";

  const [form, setForm] = useState<ItemFormState>({
    name:             item?.name                               ?? "",
    category:         item?.category                          ?? "",
    estimated_amount: item ? String(item.estimated_amount)    : "",
    actual_amount:    item?.actual_amount != null
                        ? String(item.actual_amount)
                        : "",
    currency:         item?.currency                          ?? "RON",
    status:           item?.status                            ?? "planned",
    due_date:         item?.due_date                          ?? "",
    notes:            item?.notes                             ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function fieldHandler(key: keyof ItemFormState) {
    return (
      e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const body: Record<string, unknown> = {
      name:             form.name,
      category:         form.category || null,
      estimated_amount: parseFloat(form.estimated_amount) || 0,
      actual_amount:    form.actual_amount ? parseFloat(form.actual_amount) : null,
      currency:         form.currency || "RON",
      status:           form.status,
      due_date:         form.due_date || null,
      notes:            form.notes || null,
    };

    try {
      const url = isEdit
        ? `/api/weddings/${weddingId}/budget/items/${item.id}`
        : `/api/weddings/${weddingId}/budget/items`;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: BudgetItemRow;
        error?: { message?: string; errors?: { message: string }[] };
      };

      if (!res.ok || !json.success) {
        const msg =
          json.error?.message ??
          json.error?.errors?.[0]?.message ??
          "Eroare la salvare.";
        setFormError(msg);
        return;
      }

      onSave(json.data!);
    } catch {
      setFormError("Eroare de rețea.");
    } finally {
      setSaving(false);
    }
  }

  const base: CSSProperties = {
    width: "100%",
    padding: "0.5rem 0.75rem",
    borderRadius: "8px",
    border: "1px solid var(--cream-line)",
    fontSize: "0.875rem",
    color: "var(--navy)",
    background: isPaid ? "#f8f8f8" : "white",
    outline: "none",
  };

  const labelStyle: CSSProperties = {
    display: "block",
    fontSize: "0.78rem",
    fontWeight: 500,
    color: "var(--navy)",
    marginBottom: "0.4rem",
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          boxShadow: "0 8px 40px rgba(19,23,46,0.15)",
          width: "100%",
          maxWidth: "520px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--cream-line)",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.3rem",
              fontWeight: 300,
              color: "var(--navy)",
            }}
          >
            {isEdit ? "Editează cheltuială" : "Cheltuială nouă"}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--muted)",
              padding: "0.25rem",
              display: "flex",
            }}
          >
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(e) => void handleSubmit(e)} style={{ padding: "1.5rem" }}>
          {isPaid && (
            <div
              style={{
                background: "rgba(72,187,120,0.08)",
                border: "1px solid rgba(72,187,120,0.3)",
                borderRadius: "8px",
                padding: "0.75rem 1rem",
                marginBottom: "1rem",
                fontSize: "0.82rem",
                color: "#276749",
              }}
            >
              Itemul este marcat ca plătit și nu poate fi modificat.
            </div>
          )}

          {/* Name */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>Denumire *</label>
            <input
              type="text"
              value={form.name}
              onChange={fieldHandler("name")}
              required
              disabled={isPaid}
              placeholder="ex: Salon, Catering, Fotograf..."
              style={base}
            />
          </div>

          {/* Category + Status */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div>
              <label style={labelStyle}>Categorie</label>
              <input
                type="text"
                value={form.category}
                onChange={fieldHandler("category")}
                disabled={isPaid}
                placeholder="ex: Venue, Foto, Muzică..."
                style={base}
              />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={form.status}
                onChange={fieldHandler("status")}
                disabled={isPaid}
                style={base}
              >
                <option value="planned">Planificat</option>
                <option value="confirmed">Confirmat</option>
                {isEdit && <option value="paid">Plătit</option>}
                <option value="cancelled">Anulat</option>
              </select>
            </div>
          </div>

          {/* Amounts + Currency */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 80px",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div>
              <label style={labelStyle}>Estimat *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.estimated_amount}
                onChange={fieldHandler("estimated_amount")}
                required
                disabled={isPaid}
                placeholder="0.00"
                style={base}
              />
            </div>
            <div>
              <label style={labelStyle}>Actual</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.actual_amount}
                onChange={fieldHandler("actual_amount")}
                disabled={isPaid}
                placeholder="0.00"
                style={base}
              />
            </div>
            <div>
              <label style={labelStyle}>Monedă</label>
              <input
                type="text"
                value={form.currency}
                onChange={fieldHandler("currency")}
                disabled={isPaid}
                maxLength={3}
                placeholder="RON"
                style={{ ...base, textTransform: "uppercase" }}
              />
            </div>
          </div>

          {/* Due date */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>Dată limită</label>
            <input
              type="date"
              value={form.due_date}
              onChange={fieldHandler("due_date")}
              disabled={isPaid}
              style={base}
            />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={labelStyle}>Note</label>
            <textarea
              value={form.notes}
              onChange={fieldHandler("notes")}
              disabled={isPaid}
              rows={3}
              placeholder="Detalii suplimentare..."
              style={{ ...base, resize: "vertical", minHeight: "72px" }}
            />
          </div>

          {formError && (
            <div
              style={{
                background: "rgba(229,62,62,0.08)",
                border: "1px solid rgba(229,62,62,0.3)",
                borderRadius: "8px",
                padding: "0.75rem 1rem",
                marginBottom: "1rem",
                fontSize: "0.82rem",
                color: "var(--red)",
              }}
            >
              {formError}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "999px",
                fontSize: "0.85rem",
                border: "1px solid var(--cream-line)",
                color: "var(--muted)",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              Anulează
            </button>
            {!isPaid && (
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "0.5rem 1.25rem",
                  borderRadius: "999px",
                  fontSize: "0.85rem",
                  background: saving ? "var(--muted)" : "var(--rose)",
                  color: "white",
                  border: "none",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontWeight: 500,
                }}
              >
                {saving ? "Se salvează..." : isEdit ? "Salvează" : "Adaugă"}
              </button>
            )}
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

// ─── PaymentModal ──────────────────────────────────────────────────────────────

interface PaymentFormState {
  amount: string;
  currency: string;
  paid_at: string;
  payment_method: string;
  note: string;
}

function PaymentModal({
  item,
  weddingId,
  onSave,
  onClose,
}: {
  item: BudgetItemRow;
  weddingId: string;
  onSave: (payment: PaymentRow) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<PaymentFormState>({
    amount:         "",
    currency:       item.currency,
    paid_at:        new Date().toISOString().slice(0, 10),
    payment_method: "",
    note:           "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function fieldHandler(key: keyof PaymentFormState) {
    return (e: ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const res = await fetch(
        `/api/weddings/${weddingId}/budget/items/${item.id}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount:         parseFloat(form.amount),
            currency:       form.currency || item.currency,
            paid_at:        form.paid_at || null,
            payment_method: form.payment_method || null,
            note:           form.note || null,
          }),
        }
      );
      const json = (await res.json()) as {
        success: boolean;
        data?: PaymentRow;
        error?: { message?: string; errors?: { message: string }[] };
      };

      if (!res.ok || !json.success) {
        const msg =
          json.error?.message ??
          json.error?.errors?.[0]?.message ??
          "Eroare la salvare.";
        setFormError(msg);
        return;
      }

      onSave(json.data!);
    } catch {
      setFormError("Eroare de rețea.");
    } finally {
      setSaving(false);
    }
  }

  const base: CSSProperties = {
    width: "100%",
    padding: "0.5rem 0.75rem",
    borderRadius: "8px",
    border: "1px solid var(--cream-line)",
    fontSize: "0.875rem",
    color: "var(--navy)",
    background: "white",
    outline: "none",
  };

  const labelStyle: CSSProperties = {
    display: "block",
    fontSize: "0.78rem",
    fontWeight: 500,
    color: "var(--navy)",
    marginBottom: "0.4rem",
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          boxShadow: "0 8px 40px rgba(19,23,46,0.15)",
          width: "100%",
          maxWidth: "420px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--cream-line)",
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.2rem",
                fontWeight: 300,
                color: "var(--navy)",
              }}
            >
              Adaugă plată
            </h2>
            <p
              style={{
                fontSize: "0.78rem",
                color: "var(--muted)",
                marginTop: "0.15rem",
              }}
            >
              {item.name}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--muted)",
              padding: "0.25rem",
              display: "flex",
            }}
          >
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(e) => void handleSubmit(e)} style={{ padding: "1.5rem" }}>
          {/* Amount + Currency */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 80px",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div>
              <label style={labelStyle}>Sumă *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={fieldHandler("amount")}
                required
                autoFocus
                placeholder="0.00"
                style={base}
              />
            </div>
            <div>
              <label style={labelStyle}>Monedă</label>
              <input
                type="text"
                value={form.currency}
                onChange={fieldHandler("currency")}
                maxLength={3}
                placeholder="RON"
                style={{ ...base, textTransform: "uppercase" }}
              />
            </div>
          </div>

          {/* Paid at */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>Data plății</label>
            <input
              type="date"
              value={form.paid_at}
              onChange={fieldHandler("paid_at")}
              style={base}
            />
          </div>

          {/* Payment method */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>Metodă plată</label>
            <input
              type="text"
              value={form.payment_method}
              onChange={fieldHandler("payment_method")}
              placeholder="ex: Card, Transfer, Cash..."
              style={base}
            />
          </div>

          {/* Note */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={labelStyle}>Notă</label>
            <input
              type="text"
              value={form.note}
              onChange={fieldHandler("note")}
              placeholder="Opțional"
              style={base}
            />
          </div>

          {formError && (
            <div
              style={{
                background: "rgba(229,62,62,0.08)",
                border: "1px solid rgba(229,62,62,0.3)",
                borderRadius: "8px",
                padding: "0.75rem 1rem",
                marginBottom: "1rem",
                fontSize: "0.82rem",
                color: "var(--red)",
              }}
            >
              {formError}
            </div>
          )}

          <div
            style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "999px",
                fontSize: "0.85rem",
                border: "1px solid var(--cream-line)",
                color: "var(--muted)",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "999px",
                fontSize: "0.85rem",
                background: saving ? "var(--muted)" : "var(--rose)",
                color: "white",
                border: "none",
                cursor: saving ? "not-allowed" : "pointer",
                fontWeight: 500,
              }}
            >
              {saving ? "Se salvează..." : "Adaugă plată"}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

// ─── Icon button helper ────────────────────────────────────────────────────────

function IconBtn({
  onClick,
  title,
  hoverColor = "var(--navy)",
  children,
}: {
  onClick: () => void;
  title: string;
  hoverColor?: string;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        padding: "0.35rem",
        borderRadius: "8px",
        border: "1px solid var(--cream-line)",
        background: "transparent",
        cursor: "pointer",
        color: "var(--muted)",
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = hoverColor;
        e.currentTarget.style.borderColor = hoverColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--muted)";
        e.currentTarget.style.borderColor = "var(--cream-line)";
      }}
    >
      {children}
    </button>
  );
}

// ─── BudgetPage ────────────────────────────────────────────────────────────────

export default function BudgetPage() {
  const session = useSession();
  const weddingId =
    session.status === "authenticated" ? session.activeWeddingId : null;

  const [items, setItems] = useState<BudgetItemRow[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payments: lazy-loaded per item
  const [paymentsMap, setPaymentsMap] = useState<Record<string, PaymentRow[]>>(
    {}
  );
  const [loadingPayments, setLoadingPayments] = useState<
    Record<string, boolean>
  >({});
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Modals
  const [itemModal, setItemModal] = useState<{
    open: boolean;
    item: BudgetItemRow | null;
  }>({ open: false, item: null });
  const [paymentModal, setPaymentModal] = useState<{
    open: boolean;
    item: BudgetItemRow | null;
  }>({ open: false, item: null });

  // ── Toast ──────────────────────────────────────────────────────────────────

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const addToast = useCallback(
    (type: ToastType, message: string, ms = 3500) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, type, message }].slice(-3));
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        toastTimers.current.delete(id);
      }, ms);
      toastTimers.current.set(id, timer);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    const timer = toastTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const timers = toastTimers.current;
    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  // ── Fetch items + summary ──────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!weddingId) return;
    setIsLoading(true);
    setError(null);

    try {
      const [itemsRes, summaryRes] = await Promise.all([
        fetch(`/api/weddings/${weddingId}/budget/items`),
        fetch(`/api/weddings/${weddingId}/budget/summary`),
      ]);

      if (!itemsRes.ok || !summaryRes.ok) {
        throw new Error("Eroare la încărcarea bugetului.");
      }

      const [itemsJson, summaryJson] = (await Promise.all([
        itemsRes.json(),
        summaryRes.json(),
      ])) as [
        { success: boolean; data?: BudgetItemRow[] },
        { success: boolean; data?: BudgetSummary },
      ];

      setItems(itemsJson.data ?? []);
      setSummary(summaryJson.data ?? null);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Eroare necunoscută."
      );
    } finally {
      setIsLoading(false);
    }
  }, [weddingId]);

  useEffect(() => {
    if (weddingId) {
      void fetchData();
    } else if (session.status !== "loading") {
      setIsLoading(false);
    }
  }, [weddingId, fetchData, session.status]);

  // ── Load payments for item ─────────────────────────────────────────────────

  const loadPayments = useCallback(
    async (itemId: string) => {
      if (!weddingId) return;
      if (paymentsMap[itemId] !== undefined) return;

      setLoadingPayments((prev) => ({ ...prev, [itemId]: true }));
      try {
        const res = await fetch(
          `/api/weddings/${weddingId}/budget/items/${itemId}/payments`
        );
        const json = (await res.json()) as {
          success: boolean;
          data?: PaymentRow[];
        };
        setPaymentsMap((prev) => ({
          ...prev,
          [itemId]: json.data ?? [],
        }));
      } catch {
        // non-critical — payments panel will show empty
      } finally {
        setLoadingPayments((prev) => ({ ...prev, [itemId]: false }));
      }
    },
    [weddingId, paymentsMap]
  );

  // ── Toggle payments panel ──────────────────────────────────────────────────

  const toggleExpand = useCallback(
    (itemId: string) => {
      setExpandedItemId((prev) => {
        const next = prev === itemId ? null : itemId;
        if (next) void loadPayments(next);
        return next;
      });
    },
    [loadPayments]
  );

  // ── Status transition ──────────────────────────────────────────────────────

  const handleStatusTransition = useCallback(
    async (item: BudgetItemRow, toStatus: BudgetItemStatus) => {
      if (!weddingId) return;
      try {
        const res = await fetch(
          `/api/weddings/${weddingId}/budget/items/${item.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: toStatus }),
          }
        );
        const json = (await res.json()) as {
          success: boolean;
          data?: BudgetItemRow;
          error?: { message?: string };
        };
        if (!res.ok || !json.success) {
          addToast("error", json.error?.message ?? "Eroare la actualizare.");
          return;
        }
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? json.data! : i))
        );
        addToast("success", `Status: ${STATUS_CONFIG[toStatus].label}`);
      } catch {
        addToast("error", "Eroare de rețea.");
      }
    },
    [weddingId, addToast]
  );

  // ── Delete item ────────────────────────────────────────────────────────────

  const handleDeleteItem = useCallback(
    async (item: BudgetItemRow) => {
      if (item.status === "paid") {
        addToast("error", "Un item plătit nu poate fi șters.");
        return;
      }
      if (!confirm(`Ștergi "${item.name}"? Acțiunea nu poate fi anulată.`))
        return;
      if (!weddingId) return;

      try {
        const res = await fetch(
          `/api/weddings/${weddingId}/budget/items/${item.id}`,
          { method: "DELETE" }
        );
        const json = (await res.json()) as {
          success: boolean;
          error?: { message?: string };
        };
        if (!res.ok || !json.success) {
          addToast("error", json.error?.message ?? "Eroare la ștergere.");
          return;
        }
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        void fetchData();
        addToast("success", `"${item.name}" a fost șters.`);
      } catch {
        addToast("error", "Eroare de rețea.");
      }
    },
    [weddingId, addToast, fetchData]
  );

  // ── Delete payment ─────────────────────────────────────────────────────────

  const handleDeletePayment = useCallback(
    async (item: BudgetItemRow, paymentId: string) => {
      if (!weddingId) return;
      if (!confirm("Ștergi această plată?")) return;

      try {
        const res = await fetch(
          `/api/weddings/${weddingId}/budget/items/${item.id}/payments/${paymentId}`,
          { method: "DELETE" }
        );
        const json = (await res.json()) as {
          success: boolean;
          error?: { message?: string };
        };
        if (!res.ok || !json.success) {
          addToast("error", json.error?.message ?? "Eroare la ștergere plată.");
          return;
        }
        setPaymentsMap((prev) => ({
          ...prev,
          [item.id]: (prev[item.id] ?? []).filter((p) => p.id !== paymentId),
        }));
        void fetchData();
        addToast("success", "Plată ștearsă.");
      } catch {
        addToast("error", "Eroare de rețea.");
      }
    },
    [weddingId, addToast, fetchData]
  );

  // ── Item saved (create / edit) ─────────────────────────────────────────────

  const handleItemSaved = useCallback(
    (saved: BudgetItemRow) => {
      setItems((prev) => {
        const idx = prev.findIndex((i) => i.id === saved.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [...prev, saved];
      });
      setItemModal({ open: false, item: null });
      void fetchData();
      addToast("success", "Cheltuială salvată.");
    },
    [addToast, fetchData]
  );

  // ── Payment saved ──────────────────────────────────────────────────────────

  const handlePaymentSaved = useCallback(
    (payment: PaymentRow) => {
      setPaymentsMap((prev) => ({
        ...prev,
        [payment.budget_item_id]: [
          ...(prev[payment.budget_item_id] ?? []),
          payment,
        ],
      }));
      setPaymentModal({ open: false, item: null });
      void fetchData();
      addToast("success", "Plată adăugată.");
    },
    [addToast, fetchData]
  );

  // ── Session guards ─────────────────────────────────────────────────────────

  if (session.status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{
            borderColor: "var(--rose)",
            borderTopColor: "transparent",
          }}
        />
      </div>
    );
  }

  if (session.status !== "authenticated" || !weddingId) {
    return (
      <div
        className="rounded-xl p-12 text-center max-w-md mx-auto mt-16"
        style={{
          background: "white",
          boxShadow: "0 2px 12px rgba(26,31,58,0.07)",
        }}
      >
        <div className="text-4xl mb-4">🔐</div>
        <h3
          className="text-lg font-light mb-2"
          style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
        >
          Sesiune inactivă
        </h3>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Autentifică-te pentru a accesa bugetul.
        </p>
      </div>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const currency = summary?.currency ?? "RON";
  const deRamasDePlata = summary
    ? summary.total_estimated - summary.total_paid
    : 0;

  function fmtAmount(n: number) {
    return n.toLocaleString("ro-RO", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: "var(--ivory)" }}>
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1
                className="text-4xl font-light"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--navy)",
                }}
              >
                Buget{" "}
                <em className="italic" style={{ color: "var(--rose)" }}>
                  Nuntă
                </em>
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                {items.length === 0
                  ? "Nicio cheltuială înregistrată"
                  : `${items.length} cheltuiel${
                      items.length === 1 ? "ă" : "i"
                    } înregistrate`}
              </p>
            </div>
            <button
              onClick={() => setItemModal({ open: true, item: null })}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{ background: "var(--rose)", color: "white" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--rose-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--rose)";
              }}
            >
              <Plus size={15} strokeWidth={1.8} />
              Adaugă cheltuială
            </button>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-4 gap-4">
            {(
              [
                {
                  label: "Total Estimat",
                  value: summary ? fmtAmount(summary.total_estimated) : "—",
                  color: "var(--rose)",
                  suffix: summary ? ` ${currency}` : "",
                },
                {
                  label: "Total Actual",
                  value: summary ? fmtAmount(summary.total_actual) : "—",
                  color: "var(--navy)",
                  suffix: summary ? ` ${currency}` : "",
                },
                {
                  label: "Total Plătit",
                  value: summary ? fmtAmount(summary.total_paid) : "—",
                  color: "var(--green)",
                  suffix: summary ? ` ${currency}` : "",
                },
                {
                  label: "De plătit",
                  value: summary ? fmtAmount(Math.abs(deRamasDePlata)) : "—",
                  color: deRamasDePlata > 0 ? "var(--red)" : "var(--green)",
                  suffix: summary ? ` ${currency}` : "",
                },
              ] as const
            ).map((stat) => (
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
                  className="font-light"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.75rem",
                    color: stat.color,
                    lineHeight: 1,
                  }}
                >
                  {isLoading ? (
                    <span style={{ color: "var(--muted)", fontSize: "1.2rem" }}>
                      ...
                    </span>
                  ) : (
                    <>
                      {stat.value}
                      {stat.suffix && (
                        <span
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--muted)",
                            marginLeft: "0.25rem",
                          }}
                        >
                          {stat.suffix}
                        </span>
                      )}
                    </>
                  )}
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

          {summary?.has_mixed_currencies && (
            <div
              style={{
                marginTop: "0.75rem",
                padding: "0.6rem 1rem",
                borderRadius: "8px",
                background: "rgba(236,201,75,0.1)",
                border: "1px solid rgba(236,201,75,0.4)",
                fontSize: "0.78rem",
                color: "#92700a",
              }}
            >
              ⚠ Ai cheltuieli în valute diferite — totalurile sunt calculate
              global, fără conversie.
            </div>
          )}
        </div>

        {/* ── Content ── */}
        {error ? (
          <div
            className="rounded-xl p-6 text-center"
            style={{
              background: "white",
              border: "1px solid var(--cream-line)",
            }}
          >
            <p className="text-sm mb-3" style={{ color: "var(--red)" }}>
              {error}
            </p>
            <button
              onClick={() => void fetchData()}
              className="px-4 py-2 rounded-full text-sm font-medium"
              style={{ background: "var(--rose)", color: "white" }}
            >
              Încearcă din nou
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div
              className="w-8 h-8 rounded-full border-2 animate-spin"
              style={{
                borderColor: "var(--rose)",
                borderTopColor: "transparent",
              }}
            />
          </div>
        ) : items.length === 0 ? (
          /* Empty state */
          <div
            className="rounded-xl p-12 text-center"
            style={{
              background: "white",
              boxShadow: "0 2px 12px rgba(26,31,58,0.07)",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>💰</div>
            <h3
              className="text-lg font-light mb-2"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--navy)",
              }}
            >
              Nicio cheltuială încă
            </h3>
            <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
              Adaugă prima cheltuială pentru a urmări bugetul nunții tale.
            </p>
            <button
              onClick={() => setItemModal({ open: true, item: null })}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium"
              style={{ background: "var(--rose)", color: "white" }}
            >
              <Plus size={15} strokeWidth={1.8} />
              Adaugă cheltuială
            </button>
          </div>
        ) : (
          /* Items list */
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {items.map((item) => {
              const isExpanded = expandedItemId === item.id;
              const payments = paymentsMap[item.id] ?? [];
              const payLoading = loadingPayments[item.id] ?? false;
              const transitions = TRANSITIONS[item.status];
              const canAddPayment =
                item.status === "planned" || item.status === "confirmed";

              return (
                <div
                  key={item.id}
                  style={{
                    background: "white",
                    borderRadius: "12px",
                    boxShadow: "0 2px 12px rgba(26,31,58,0.07)",
                    overflow: "hidden",
                    border:
                      item.status === "cancelled"
                        ? "1px solid rgba(160,174,192,0.3)"
                        : "1px solid transparent",
                    opacity: item.status === "cancelled" ? 0.7 : 1,
                  }}
                >
                  {/* Item row */}
                  <div style={{ padding: "1rem 1.25rem" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "1rem",
                      }}
                    >
                      {/* Left: name + meta */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.6rem",
                            flexWrap: "wrap",
                            marginBottom: "0.3rem",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.95rem",
                              fontWeight: 500,
                              color: "var(--navy)",
                            }}
                          >
                            {item.name}
                          </span>
                          <StatusBadge status={item.status} />
                          {item.category && (
                            <span
                              style={{
                                fontSize: "0.7rem",
                                color: "var(--muted)",
                                background: "var(--ivory)",
                                padding: "0.15rem 0.5rem",
                                borderRadius: "999px",
                                border: "1px solid var(--cream-line)",
                              }}
                            >
                              {item.category}
                            </span>
                          )}
                        </div>

                        {/* Amounts */}
                        <div
                          style={{
                            display: "flex",
                            gap: "1.5rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{ fontSize: "0.8rem", color: "var(--muted)" }}
                          >
                            Estimat:{" "}
                            <strong style={{ color: "var(--navy)" }}>
                              {item.estimated_amount.toLocaleString("ro-RO")}{" "}
                              {item.currency}
                            </strong>
                          </span>
                          {item.actual_amount != null && (
                            <span
                              style={{
                                fontSize: "0.8rem",
                                color: "var(--muted)",
                              }}
                            >
                              Actual:{" "}
                              <strong style={{ color: "var(--navy)" }}>
                                {item.actual_amount.toLocaleString("ro-RO")}{" "}
                                {item.currency}
                              </strong>
                            </span>
                          )}
                          {item.due_date && (
                            <span
                              style={{
                                fontSize: "0.8rem",
                                color: "var(--muted)",
                              }}
                            >
                              Scadență:{" "}
                              <strong style={{ color: "var(--navy)" }}>
                                {item.due_date}
                              </strong>
                            </span>
                          )}
                        </div>

                        {item.notes && (
                          <p
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--muted)",
                              marginTop: "0.3rem",
                            }}
                          >
                            {item.notes}
                          </p>
                        )}
                      </div>

                      {/* Right: actions */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          flexShrink: 0,
                          flexWrap: "wrap",
                          justifyContent: "flex-end",
                        }}
                      >
                        {/* Status transitions */}
                        {transitions.map((t) => (
                          <button
                            key={t.to}
                            onClick={() =>
                              void handleStatusTransition(item, t.to)
                            }
                            style={{
                              padding: "0.3rem 0.75rem",
                              borderRadius: "999px",
                              fontSize: "0.72rem",
                              fontWeight: 500,
                              border: `1px solid ${t.color}`,
                              color: t.color,
                              background: "transparent",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = `${t.color}18`;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            {t.label}
                          </button>
                        ))}

                        {/* Add payment */}
                        {canAddPayment && (
                          <IconBtn
                            onClick={() =>
                              setPaymentModal({ open: true, item })
                            }
                            title="Adaugă plată"
                          >
                            <CreditCard size={15} strokeWidth={1.8} />
                          </IconBtn>
                        )}

                        {/* Edit */}
                        <IconBtn
                          onClick={() => setItemModal({ open: true, item })}
                          title="Editează"
                        >
                          <Edit2 size={15} strokeWidth={1.8} />
                        </IconBtn>

                        {/* Delete */}
                        {item.status !== "paid" && (
                          <IconBtn
                            onClick={() => void handleDeleteItem(item)}
                            title="Șterge"
                            hoverColor="var(--red)"
                          >
                            <Trash2 size={15} strokeWidth={1.8} />
                          </IconBtn>
                        )}

                        {/* Expand */}
                        <IconBtn
                          onClick={() => toggleExpand(item.id)}
                          title={isExpanded ? "Ascunde plăți" : "Arată plăți"}
                        >
                          {isExpanded ? (
                            <ChevronUp size={15} strokeWidth={1.8} />
                          ) : (
                            <ChevronDown size={15} strokeWidth={1.8} />
                          )}
                        </IconBtn>
                      </div>
                    </div>
                  </div>

                  {/* Payments panel */}
                  {isExpanded && (
                    <div
                      style={{
                        borderTop: "1px solid var(--cream-line)",
                        background: "var(--ivory)",
                        padding: "0.75rem 1.25rem",
                      }}
                    >
                      {payLoading ? (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            padding: "1rem",
                          }}
                        >
                          <div
                            className="w-5 h-5 rounded-full border-2 animate-spin"
                            style={{
                              borderColor: "var(--rose)",
                              borderTopColor: "transparent",
                            }}
                          />
                        </div>
                      ) : payments.length === 0 ? (
                        <p
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--muted)",
                            textAlign: "center",
                            padding: "0.5rem 0",
                          }}
                        >
                          Nicio plată înregistrată
                          {canAddPayment && (
                            <>
                              {" — "}
                              <button
                                onClick={() =>
                                  setPaymentModal({ open: true, item })
                                }
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: "var(--rose)",
                                  fontSize: "0.8rem",
                                  padding: 0,
                                }}
                              >
                                adaugă prima plată
                              </button>
                            </>
                          )}
                        </p>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.4rem",
                          }}
                        >
                          {/* Payments header */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "0.25rem",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.72rem",
                                fontWeight: 500,
                                color: "var(--muted)",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                              }}
                            >
                              Plăți ({payments.length})
                            </span>
                            {canAddPayment && (
                              <button
                                onClick={() =>
                                  setPaymentModal({ open: true, item })
                                }
                                style={{
                                  fontSize: "0.72rem",
                                  color: "var(--rose)",
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: 0,
                                }}
                              >
                                + Adaugă plată
                              </button>
                            )}
                          </div>

                          {/* Payment rows */}
                          {payments.map((p) => (
                            <div
                              key={p.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "0.5rem 0.75rem",
                                borderRadius: "8px",
                                background: "white",
                                border: "1px solid var(--cream-line)",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  gap: "1rem",
                                  flexWrap: "wrap",
                                  alignItems: "center",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "0.85rem",
                                    fontWeight: 500,
                                    color: "var(--navy)",
                                  }}
                                >
                                  {p.amount.toLocaleString("ro-RO")}{" "}
                                  {p.currency}
                                </span>
                                {p.paid_at && (
                                  <span
                                    style={{
                                      fontSize: "0.78rem",
                                      color: "var(--muted)",
                                    }}
                                  >
                                    {p.paid_at}
                                  </span>
                                )}
                                {p.payment_method && (
                                  <span
                                    style={{
                                      fontSize: "0.78rem",
                                      color: "var(--muted)",
                                    }}
                                  >
                                    {p.payment_method}
                                  </span>
                                )}
                                {p.note && (
                                  <span
                                    style={{
                                      fontSize: "0.78rem",
                                      color: "var(--muted)",
                                      fontStyle: "italic",
                                    }}
                                  >
                                    {p.note}
                                  </span>
                                )}
                              </div>
                              {canAddPayment && (
                                <button
                                  onClick={() =>
                                    void handleDeletePayment(item, p.id)
                                  }
                                  title="Șterge plată"
                                  style={{
                                    padding: "0.25rem",
                                    borderRadius: "6px",
                                    border: "none",
                                    background: "transparent",
                                    cursor: "pointer",
                                    color: "var(--muted)",
                                    display: "flex",
                                    alignItems: "center",
                                    flexShrink: 0,
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color = "var(--red)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color =
                                      "var(--muted)";
                                  }}
                                >
                                  <Trash2 size={14} strokeWidth={1.8} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {itemModal.open && weddingId && (
        <ItemModal
          item={itemModal.item}
          weddingId={weddingId}
          onSave={handleItemSaved}
          onClose={() => setItemModal({ open: false, item: null })}
        />
      )}

      {paymentModal.open && paymentModal.item && weddingId && (
        <PaymentModal
          item={paymentModal.item}
          weddingId={weddingId}
          onSave={handlePaymentSaved}
          onClose={() => setPaymentModal({ open: false, item: null })}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
