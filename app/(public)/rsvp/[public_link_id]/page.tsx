// =============================================================================
// app/(public)/rsvp/[public_link_id]/page.tsx
// Pagina publică RSVP — fără auth, fără sidebar
// Invitatul confirmă participarea printr-un link personalizat
// =============================================================================

"use client";

import { useState, useEffect } from "react";
import { getTranslations } from "@/lib/rsvp/rsvp-translations";
import { isRsvpAccepted, isRsvpDeclined, isRsvpMaybe } from "@/lib/domain";
import {
  getMealChoiceForSubmit,
  hasAnyAccepted,
  getSharedDietaryNotes,
  applyDietaryNotesToAccepted,
  type EventAnswer,
} from "@/lib/rsvp/rsvp-form-helpers";
import type { RsvpPageData, RsvpAttendanceStatus, RsvpMealChoice } from "@/types/rsvp";

const t = getTranslations("ro");

type PageState = "loading" | "ready" | "error" | "submitted";

export default function RsvpPage({
  params,
}: {
  params: Promise<{ public_link_id: string }>;
}) {
  const [publicLinkId, setPublicLinkId] = useState<string | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [pageData, setPageData] = useState<RsvpPageData | null>(null);
  const [answers, setAnswers] = useState<Record<string, EventAnswer>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Honey pot — invizibil pentru oameni, completat de boți
  const [_rsvpConfirmExtra, setRsvpConfirmExtra] = useState("");

  // ── Resolve params ─────────────────────────────────────────────────────────
  useEffect(() => {
    params.then((p) => setPublicLinkId(p.public_link_id));
  }, [params]);

  // ── Fetch invitation data ──────────────────────────────────────────────────
  useEffect(() => {
    if (!publicLinkId) return;

    fetch(`/api/rsvp/${publicLinkId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) {
          setErrorMessage(json.error?.message ?? t.page.error_generic);
          setPageState("error");
          return;
        }

        const data: RsvpPageData = json.data;
        setPageData(data);

        // Inițializează answers cu răspunsurile existente
        const initialAnswers: Record<string, EventAnswer> = {};
        for (const event of data.events) {
          const existing = event.current_response;
          initialAnswers[event.guest_event_id] = {
            guest_event_id: event.guest_event_id,
            status: existing?.status ?? null,
            meal_choice: existing?.meal_choice ?? null,
            dietary_notes: existing?.dietary_notes ?? "",
            note: existing?.note ?? "",
          };
        }
        setAnswers(initialAnswers);
        setPageState("ready");
      })
      .catch(() => {
        setErrorMessage(t.page.error_generic);
        setPageState("error");
      });
  }, [publicLinkId]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    // Validare — toate evenimentele trebuie să aibă status
    const unanswered = Object.values(answers).filter((a) => !a.status);
    if (unanswered.length > 0) {
      setSubmitError(t.submit.error_required);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const responses = Object.values(answers).map((a) => ({
        guest_event_id: a.guest_event_id,
        status: a.status,
        meal_choice: getMealChoiceForSubmit(a),
        dietary_notes: a.dietary_notes || null,
        note: a.note || null,
      }));

      const res = await fetch(`/api/rsvp/${publicLinkId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses, _rsvp_confirm_extra_: _rsvpConfirmExtra }),
      });

      const json = await res.json();

      if (!json.success) {
        setSubmitError(json.error?.message ?? t.submit.error_generic);
        return;
      }

      setPageState("submitted");
    } catch {
      setSubmitError(t.submit.error_generic);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateAnswer = (
    guestEventId: string,
    field: keyof EventAnswer,
    value: string | null
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [guestEventId]: { ...prev[guestEventId], [field]: value },
    }));
  };

  // ── Render: Loading ────────────────────────────────────────────────────────
  if (pageState === "loading") {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.spinner} />
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "1rem" }}>
            {t.page.loading}
          </p>
        </div>
      </div>
    );
  }

  // ── Render: Error ──────────────────────────────────────────────────────────
  if (pageState === "error") {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🔒</div>
          <h2 style={styles.heading}>{errorMessage}</h2>
        </div>
      </div>
    );
  }

  // ── Render: Submitted ──────────────────────────────────────────────────────
  if (pageState === "submitted") {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✨</div>
          <h2 style={{ ...styles.heading, fontFamily: "var(--font-display)", fontSize: "2rem" }}>
            {t.submit.success_title}
          </h2>
          <p style={{ color: "var(--muted)", marginTop: "0.5rem", lineHeight: 1.6 }}>
            {t.submit.success_subtitle}
          </p>
        </div>
      </div>
    );
  }

  // ── Render: Ready ──────────────────────────────────────────────────────────
  if (!pageData) return null;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--rose)", marginBottom: "0.5rem" }}>
          weddinglist
        </p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.2rem", fontWeight: 300, color: "var(--navy)", margin: 0 }}>
          {t.page.subtitle}
        </h1>
        <p style={{ color: "var(--muted)", marginTop: "0.5rem", fontSize: "1rem" }}>
          Bună, <strong style={{ color: "var(--navy)" }}>{pageData.guest.first_name}</strong>!
        </p>
      </div>

      {/* Events */}
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>{t.response.heading_events}</h2>

        {pageData.events.map((event) => {
          const answer = answers[event.guest_event_id];
          if (!answer) return null;

          return (
            <div key={event.guest_event_id} style={styles.eventBlock}>
              <div style={styles.eventHeader}>
                <div>
                  <p style={{ fontWeight: 500, color: "var(--navy)", margin: 0 }}>
                    {event.event_name}
                  </p>
                  {event.event_date && (
                    <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: "0.2rem 0 0" }}>
                      {new Date(event.event_date).toLocaleDateString("ro-RO", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </p>
                  )}
                </div>
              </div>

              {/* Status buttons */}
              <div style={styles.statusButtons}>
                {(["accepted", "declined", "maybe"] as RsvpAttendanceStatus[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => updateAnswer(event.guest_event_id, "status", status)}
                    style={{
                      ...styles.statusBtn,
                      ...(answer.status === status ? styles.statusBtnActive(status) : {}),
                    }}
                  >
                    {isRsvpAccepted(status) && "✓ "}
                    {isRsvpDeclined(status) && "✗ "}
                    {isRsvpMaybe(status) && "? "}
                    {t.status[status]}
                  </button>
                ))}
              </div>

              {/* Meal choice — doar dacă accepted */}
              {isRsvpAccepted(answer.status) && (
                <div style={{ marginTop: "1rem" }}>
                  <p style={styles.label}>{t.response.heading_meal}</p>
                  <div style={styles.statusButtons}>
                    {(["standard", "vegetarian"] as RsvpMealChoice[]).map((meal) => (
                      <button
                        key={meal}
                        onClick={() => updateAnswer(event.guest_event_id, "meal_choice", meal)}
                        style={{
                          ...styles.statusBtn,
                          ...(answer.meal_choice === meal ? styles.mealBtnActive : {}),
                        }}
                      >
                        {meal === "standard" ? "🍽 " : "🥗 "}
                        {meal === "standard" ? t.response.meal_standard : t.response.meal_vegetarian}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Dietary notes — dacă cel puțin un accepted */}
        {hasAnyAccepted(answers) && (
          <div style={{ marginTop: "1.5rem" }}>
            <label style={styles.label}>{t.response.notes_label}</label>
            <textarea
              placeholder={t.response.notes_placeholder}
              rows={3}
              value={getSharedDietaryNotes(answers)}
              onChange={(e) =>
                setAnswers((prev) => applyDietaryNotesToAccepted(prev, e.target.value))
              }
              style={styles.textarea}
            />
          </div>
        )}

        {/* Honey pot — invizibil pentru utilizatori, completat de boți */}
        <input
          type="text"
          name="_rsvp_confirm_extra_"
          value={_rsvpConfirmExtra}
          onChange={(e) => setRsvpConfirmExtra(e.target.value)}
          tabIndex={-1}
          aria-hidden="true"
          autoComplete="off"
          style={{ position: "fixed", opacity: 0, top: 0, left: 0, height: 0, width: 0, pointerEvents: "none" }}
        />

        {/* Submit error */}
        {submitError && (
          <p style={{ color: "var(--red)", fontSize: "0.85rem", marginTop: "1rem" }}>
            {submitError}
          </p>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          style={{
            ...styles.submitBtn,
            opacity: isSubmitting ? 0.7 : 1,
            cursor: isSubmitting ? "not-allowed" : "pointer",
          }}
        >
          {isSubmitting ? t.submit.button_loading : t.submit.button}
        </button>
      </div>

      {/* Footer */}
      <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--muted)", marginTop: "2rem" }}>
        Powered by weddinglist.ro
      </p>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: "100vh",
    background: "var(--ivory)",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "flex-start",
    padding: "2rem 1rem",
  },
  header: {
    textAlign: "center" as const,
    marginBottom: "2rem",
    maxWidth: "480px",
    width: "100%",
  },
  card: {
    background: "white",
    borderRadius: "16px",
    padding: "2rem",
    boxShadow: "0 4px 24px rgba(26,31,58,0.08)",
    width: "100%",
    maxWidth: "480px",
    textAlign: "center" as const,
  },
  heading: {
    fontFamily: "var(--font-display)",
    fontSize: "1.3rem",
    fontWeight: 300,
    color: "var(--navy)",
    margin: 0,
  },
  sectionTitle: {
    fontSize: "0.7rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.12em",
    color: "var(--muted)",
    marginBottom: "1.5rem",
    textAlign: "left" as const,
  },
  eventBlock: {
    borderBottom: "1px solid var(--cream-line)",
    paddingBottom: "1.5rem",
    marginBottom: "1.5rem",
    textAlign: "left" as const,
  },
  eventHeader: {
    marginBottom: "1rem",
  },
  statusButtons: {
    display: "flex",
    gap: "0.5rem",
    flexWrap: "wrap" as const,
  },
  statusBtn: {
    padding: "0.5rem 1rem",
    borderRadius: "999px",
    border: "1px solid var(--cream-line)",
    background: "white",
    color: "var(--muted)",
    fontSize: "0.82rem",
    cursor: "pointer",
    transition: "all 0.15s",
    fontFamily: "var(--font-body)",
  },
  statusBtnActive: (status: RsvpAttendanceStatus) => ({
    background: isRsvpAccepted(status)
      ? "rgba(72,187,120,0.12)"
      : isRsvpDeclined(status)
      ? "rgba(229,62,62,0.12)"
      : "rgba(236,201,75,0.12)",
    borderColor: isRsvpAccepted(status)
      ? "var(--green)"
      : isRsvpDeclined(status)
      ? "var(--red)"
      : "var(--yellow)",
    color: isRsvpAccepted(status)
      ? "var(--green)"
      : isRsvpDeclined(status)
      ? "var(--red)"
      : "var(--yellow)",
    fontWeight: 500,
  }),
  mealBtnActive: {
    background: "rgba(201,144,122,0.12)",
    borderColor: "var(--rose)",
    color: "var(--rose)",
    fontWeight: 500,
  },
  label: {
    fontSize: "0.75rem",
    fontWeight: 500,
    color: "var(--muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    display: "block",
    marginBottom: "0.5rem",
  },
  textarea: {
    width: "100%",
    border: "1px solid var(--cream-line)",
    borderRadius: "8px",
    padding: "0.75rem",
    fontSize: "0.85rem",
    color: "var(--navy)",
    background: "var(--ivory)",
    outline: "none",
    resize: "none" as const,
    fontFamily: "var(--font-body)",
    boxSizing: "border-box" as const,
  },
  submitBtn: {
    width: "100%",
    marginTop: "1.5rem",
    padding: "0.85rem",
    background: "var(--rose)",
    color: "white",
    border: "none",
    borderRadius: "999px",
    fontSize: "0.95rem",
    fontWeight: 500,
    fontFamily: "var(--font-body)",
    letterSpacing: "0.03em",
  },
  spinner: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    border: "2px solid var(--rose)",
    borderTopColor: "transparent",
    animation: "spin 0.8s linear infinite",
    margin: "0 auto",
  },
};
