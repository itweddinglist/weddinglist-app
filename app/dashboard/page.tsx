"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "@/app/lib/auth/session/use-session"
import { generateTasks, type TaskEngineResult, type TaskEngineContext } from "@/lib/task-engine"
import type { DashboardStats, TaskContextResponse } from "@/types/dashboard"

const MODULES = [
  {
    id: "seating-chart",
    icon: "🪑",
    label: "Plan Mese",
    description: "Aranjează invitații la mese vizual",
    path: "/seating-chart",
    color: "#C9907A",
  },
  {
    id: "guest-list",
    icon: "👥",
    label: "Listă Invitați",
    description: "Gestionează invitații și RSVP-urile",
    path: "/guest-list",
    color: "#48BB78",
  },
  {
    id: "budget",
    icon: "💰",
    label: "Buget",
    description: "Urmărește cheltuielile nunții",
    path: "/budget",
    color: "#ECC94B",
  },
  {
    id: "export",
    icon: "📄",
    label: "Export",
    description: "Generează rapoarte PDF",
    path: "/export",
    color: "#C9907A",
  },
  {
    id: "settings",
    icon: "⚙️",
    label: "Setări",
    description: "Configurează detaliile nunții",
    path: "/settings",
    color: "#7A7F99",
  },
]

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "#E53E3E",
  MEDIUM: "#ECC94B",
  LOW: "#48BB78",
}

const PRIORITY_LABELS: Record<string, string> = {
  HIGH: "Urgent",
  MEDIUM: "Important",
  LOW: "Recomandat",
}

type LoadingState = "idle" | "loading" | "success" | "error"

function StatCardSkeleton() {
  return (
    <div style={{
      background: "white",
      borderRadius: "12px",
      padding: "1.2rem 1.5rem",
      boxShadow: "0 2px 12px rgba(26,31,58,0.07)",
      borderTop: "3px solid #e2e8f0",
    }}>
      <div style={{ height: "2rem", width: "60%", background: "#f0f0f0", borderRadius: "4px", marginBottom: "0.5rem" }} />
      <div style={{ height: "0.75rem", width: "80%", background: "#f0f0f0", borderRadius: "4px", marginBottom: "0.3rem" }} />
      <div style={{ height: "0.68rem", width: "50%", background: "#f0f0f0", borderRadius: "4px" }} />
    </div>
  )
}

export default function Dashboard() {
  const session = useSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loadingState, setLoadingState] = useState<LoadingState>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [taskResult, setTaskResult] = useState<TaskEngineResult | null>(null)

  const activeWeddingId =
    session.status === "authenticated" ? session.activeWeddingId : null

  const weddingTitle =
    session.status === "authenticated"
      ? (session.weddings.find((w) => w.id === activeWeddingId)?.title ?? "Nunta mea")
      : "Nunta mea"

  useEffect(() => {
    if (session.status !== "authenticated") return
    if (!activeWeddingId) return

    async function fetchStats() {
      setLoadingState("loading")
      setErrorMessage(null)

      try {
        const [statsRes, taskCtxRes] = await Promise.all([
          fetch("/api/dashboard/stats", { cache: "no-store" }),
          fetch("/api/dashboard/task-context", { cache: "no-store" }),
        ])

        const [statsJson, taskCtxJson] = await Promise.all([
          statsRes.json(),
          taskCtxRes.json(),
        ])

        if (!statsRes.ok || !statsJson.success) {
          setLoadingState("error")
          setErrorMessage(statsJson.error?.message ?? "Eroare la încărcarea statisticilor.")
          return
        }

        const statsData: DashboardStats = statsJson.data
        setStats(statsData)
        setLoadingState("success")

        // ── Task Engine ────────────────────────────────────────────────────────
        if (taskCtxRes.ok && taskCtxJson.success) {
          const taskCtxData: TaskContextResponse = taskCtxJson.data
          const daysUntilWedding = statsData.wedding.event_date
            ? Math.max(0, Math.ceil((new Date(statsData.wedding.event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : 365
          const rsvpSentCount =
            statsData.stats.rsvp_accepted +
            statsData.stats.rsvp_declined +
            statsData.stats.rsvp_maybe

          const taskCtx: TaskEngineContext = {
            daysUntilWedding,
            guestsTotal:            statsData.stats.guests_total,
            guestsUnassigned:       Math.max(0, statsData.stats.guests_total - statsData.stats.seated_guests_total),
            rsvpPending:            statsData.stats.rsvp_pending,
            rsvpSentCount,
            hasLocation:            taskCtxData.has_location,
            hasCatering:            taskCtxData.has_catering,
            vendorsInProgressCount: taskCtxData.vendors_in_progress_count,
            budgetTotal:            statsData.stats.budget_total,
            budgetPaid:             statsData.stats.budget_paid,
            paymentDueSoonCount:    taskCtxData.payments_due_soon_count,
            tablesTotal:            statsData.stats.tables_total,
            seatedGuestsTotal:      statsData.stats.seated_guests_total,
          }
          setTaskResult(generateTasks(taskCtx))
        }
      } catch {
        setLoadingState("error")
        setErrorMessage("Nu s-a putut contacta serverul.")
      }
    }

    fetchStats()
  }, [session.status, activeWeddingId])

  const isLoading = loadingState === "loading" || session.status === "loading"

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{
          fontSize: "0.68rem",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          color: "var(--rose)",
          marginBottom: "0.3rem",
        }}>
          Bun venit
        </div>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "2.2rem",
          fontWeight: 300,
          color: "var(--navy)",
        }}>
          {isLoading ? "Se încarcă..." : weddingTitle}
        </h1>
      </div>

      {/* Error state */}
      {loadingState === "error" && (
        <div style={{
          background: "#fff5f5",
          border: "1px solid #feb2b2",
          borderRadius: "10px",
          padding: "1rem 1.2rem",
          marginBottom: "1.5rem",
          color: "#c53030",
          fontSize: "0.85rem",
        }}>
          {errorMessage}
        </div>
      )}

      {/* No wedding state */}
      {session.status === "authenticated" && !activeWeddingId && (
        <div style={{
          background: "#fffbeb",
          border: "1px solid #f6e05e",
          borderRadius: "10px",
          padding: "1rem 1.2rem",
          marginBottom: "1.5rem",
          color: "#744210",
          fontSize: "0.85rem",
        }}>
          Nu ai nicio nuntă activă. Configurează una din Setări.
        </div>
      )}

      {/* Stats cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "1rem",
        marginBottom: "2.5rem",
      }}>
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : stats ? (
          <>
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "1.2rem 1.5rem",
              boxShadow: "0 2px 12px rgba(26,31,58,0.07)",
              borderTop: "3px solid #48BB78",
            }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 300, color: "var(--navy)", lineHeight: 1 }}>
                {stats.stats.guests_total}
              </div>
              <div style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--navy)", marginTop: "0.3rem" }}>
                Invitați
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.15rem" }}>
                {stats.stats.rsvp_accepted} confirmați · {stats.stats.rsvp_pending} în așteptare
              </div>
              {stats.stats.guests_total > 0 && (
                <div style={{ marginTop: "0.6rem", height: "3px", background: "#F0EAE0", borderRadius: "2px" }}>
                  <div style={{ width: `${stats.stats.response_rate}%`, height: "100%", background: "#48BB78", borderRadius: "2px" }} />
                </div>
              )}
            </div>

            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "1.2rem 1.5rem",
              boxShadow: "0 2px 12px rgba(26,31,58,0.07)",
              borderTop: "3px solid #ECC94B",
            }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 300, color: "var(--navy)", lineHeight: 1 }}>
                {stats.stats.budget_total > 0
                  ? `${Math.round((stats.stats.budget_paid / stats.stats.budget_total) * 100)}%`
                  : "—"}
              </div>
              <div style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--navy)", marginTop: "0.3rem" }}>
                Buget achitat
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.15rem" }}>
                {stats.stats.budget_remaining.toLocaleString("ro-RO")} RON rămași
              </div>
            </div>

            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "1.2rem 1.5rem",
              boxShadow: "0 2px 12px rgba(26,31,58,0.07)",
              borderTop: "3px solid #C9907A",
            }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 300, color: "var(--navy)", lineHeight: 1 }}>
                {stats.stats.tables_total}
              </div>
              <div style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--navy)", marginTop: "0.3rem" }}>
                Mese
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.15rem" }}>
                {stats.stats.seated_guests_total} plasați · {stats.stats.seats_total} locuri
              </div>
            </div>
          </>
        ) : activeWeddingId ? (
          <>
            {[
              { label: "Invitați", sub: "Adaugă primul invitat", color: "#48BB78" },
              { label: "Buget achitat", sub: "Configurează bugetul", color: "#ECC94B" },
              { label: "Mese", sub: "Creează primul plan", color: "#C9907A" },
            ].map((card, i) => (
              <div key={i} style={{
                background: "white",
                borderRadius: "12px",
                padding: "1.2rem 1.5rem",
                boxShadow: "0 2px 12px rgba(26,31,58,0.07)",
                borderTop: `3px solid ${card.color}`,
              }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 300, color: "var(--navy)", lineHeight: 1 }}>
                  0
                </div>
                <div style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--navy)", marginTop: "0.3rem" }}>
                  {card.label}
                </div>
                <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.15rem" }}>
                  {card.sub}
                </div>
              </div>
            ))}
          </>
        ) : null}
      </div>

      {/* Task Engine */}
      {taskResult && taskResult.primary && (
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{
            fontSize: "0.68rem",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "var(--muted)",
            marginBottom: "1rem",
          }}>
            Următorul pas
          </div>

          {/* Primary task */}
          <Link href={taskResult.primary.action_path} style={{ textDecoration: "none" }}>
            <div style={{
              background: "white",
              borderRadius: "14px",
              padding: "1.3rem 1.6rem",
              boxShadow: "0 2px 12px rgba(26,31,58,0.07)",
              borderLeft: `4px solid ${PRIORITY_COLORS[taskResult.primary.priority]}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              marginBottom: "0.75rem",
              cursor: "pointer",
              transition: "transform 0.15s",
            }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem" }}>
                  <span style={{
                    fontSize: "0.6rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: PRIORITY_COLORS[taskResult.primary.priority],
                    background: `${PRIORITY_COLORS[taskResult.primary.priority]}15`,
                    padding: "0.15rem 0.5rem",
                    borderRadius: "999px",
                  }}>
                    {PRIORITY_LABELS[taskResult.primary.priority]}
                  </span>
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", fontWeight: 400, color: "var(--navy)", marginBottom: "0.2rem" }}>
                  {taskResult.primary.title}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                  {taskResult.primary.description}
                </div>
              </div>
              <div style={{
                padding: "0.4rem 1rem",
                background: "var(--rose, #C9907A)",
                color: "white",
                borderRadius: "999px",
                fontSize: "0.72rem",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}>
                {taskResult.primary.action_label} →
              </div>
            </div>
          </Link>

          {/* Secondary tasks */}
          {taskResult.secondary.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem" }}>
              {taskResult.secondary.map((task) => (
                <Link key={task.id} href={task.action_path} style={{ textDecoration: "none" }}>
                  <div style={{
                    background: "white",
                    borderRadius: "12px",
                    padding: "1rem 1.2rem",
                    boxShadow: "0 2px 12px rgba(26,31,58,0.07)",
                    borderLeft: `3px solid ${PRIORITY_COLORS[task.priority]}`,
                    cursor: "pointer",
                    transition: "transform 0.15s",
                  }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                  >
                    <div style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--navy)", marginBottom: "0.2rem" }}>
                      {task.title}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                      {task.description}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Module grid */}
      <div style={{
        fontSize: "0.68rem",
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: "var(--muted)",
        marginBottom: "1rem",
      }}>
        Module
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: "1rem",
      }}>
        {MODULES.map((m) => (
          <Link key={m.id} href={m.path} style={{ textDecoration: "none" }}>
            <div
              style={{
                background: "white",
                borderRadius: "14px",
                padding: "1.3rem 1.5rem",
                boxShadow: "0 2px 12px rgba(26,31,58,0.07)",
                cursor: "pointer",
                transition: "all 0.2s",
                borderLeft: `4px solid ${m.color}`,
                height: "100%",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "0.6rem" }}>
                <span style={{ fontSize: "1.4rem" }}>{m.icon}</span>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 400, color: "var(--navy)" }}>
                  {m.label}
                </div>
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.4 }}>
                {m.description}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
