// =============================================================================
// lib/task-engine.ts
// Task Engine — Faza 10
// Funcție pură fără side effects. Rulează la fiecare load dashboard.
// Returnează 1 PRIMARY task + max 2 SECONDARY tasks.
// =============================================================================

// ── Tipuri ────────────────────────────────────────────────────────────────────

export type TaskPriority = "HIGH" | "MEDIUM" | "LOW"

export type Task = {
  id: string
  priority: TaskPriority
  title: string
  description: string
  action_label: string
  action_path: string
}

export type TaskEngineContext = {
  daysUntilWedding: number
  guestsTotal: number
  guestsUnassigned: number
  rsvpPending: number
  rsvpSentCount: number
  hasLocation: boolean
  hasCatering: boolean
  vendorsInProgressCount: number
  budgetTotal: number
  budgetPaid: number
  paymentDueSoonCount: number  // plăți scadente în < 3 zile
  tablesTotal: number
  seatedGuestsTotal: number
}

export type TaskEngineResult = {
  primary: Task | null
  secondary: Task[]
}

// ── Reguli în ordine de prioritate ───────────────────────────────────────────

function buildCandidates(ctx: TaskEngineContext): Task[] {
  const tasks: Task[] = []

  // Regula 1 — Nu există locație rezervată
  if (!ctx.hasLocation) {
    tasks.push({
      id: "no_location",
      priority: "HIGH",
      title: "Rezervă locația nunții",
      description: "Nicio locație nu a fost confirmată încă.",
      action_label: "Caută furnizori",
      action_path: "/vendors",
    })
  }

  // Regula 2 — Nu există catering rezervat
  if (!ctx.hasCatering) {
    tasks.push({
      id: "no_catering",
      priority: "HIGH",
      title: "Confirmă catering-ul",
      description: "Niciun furnizor de catering nu a fost confirmat.",
      action_label: "Caută furnizori",
      action_path: "/vendors",
    })
  }

  // Regula 3 — Există invitați fără loc la mese
  if (ctx.guestsUnassigned > 0 && ctx.tablesTotal > 0) {
    tasks.push({
      id: "unassigned_guests",
      priority: "HIGH",
      title: `${ctx.guestsUnassigned} invitați fără loc la masă`,
      description: "Plasează invitații rămași în planul de mese.",
      action_label: "Deschide Plan Mese",
      action_path: "/seating-chart",
    })
  }

  // Regula 4 — RSVP nu a fost trimis sau e urgent
  if (ctx.rsvpSentCount === 0 && ctx.guestsTotal > 0) {
    const priority: TaskPriority = ctx.daysUntilWedding < 30 ? "HIGH" : "MEDIUM"
    tasks.push({
      id: "rsvp_not_sent",
      priority,
      title: "Trimite invitațiile RSVP",
      description: `${ctx.guestsTotal} invitați așteaptă să fie contactați.`,
      action_label: "Deschide RSVP",
      action_path: "/rsvp",
    })
  }

  // Regula 4b — RSVP trimis dar mulți în așteptare
  if (ctx.rsvpSentCount > 0 && ctx.rsvpPending > 0) {
    const priority: TaskPriority = ctx.daysUntilWedding < 30 ? "HIGH" : "MEDIUM"
    tasks.push({
      id: "rsvp_pending",
      priority,
      title: `${ctx.rsvpPending} invitați nu au răspuns`,
      description: "Urmărește răspunsurile RSVP și retrimite invitațiile.",
      action_label: "Vezi RSVP",
      action_path: "/rsvp",
    })
  }

  // Regula 5 — Buget problematic
  if (ctx.budgetTotal > 0) {
    const paidPercent = Math.round((ctx.budgetPaid / ctx.budgetTotal) * 100)
    if (paidPercent < 20 && ctx.daysUntilWedding < 60) {
      tasks.push({
        id: "budget_low_paid",
        priority: "MEDIUM",
        title: "Bugetul are plăți restante",
        description: `Doar ${paidPercent}% din buget a fost achitat.`,
        action_label: "Vezi Buget",
        action_path: "/budget",
      })
    }
  }

  // Regula 6 — Plată scadentă în < 3 zile
  if (ctx.paymentDueSoonCount > 0) {
    tasks.push({
      id: "payment_due_soon",
      priority: "HIGH",
      title: `${ctx.paymentDueSoonCount} plată scadentă în curând`,
      description: "Ai plăți care trebuie efectuate în următoarele 3 zile.",
      action_label: "Vezi Buget",
      action_path: "/budget",
    })
  }

  // Regula 7 — Vendors în progres
  if (ctx.vendorsInProgressCount > 0) {
    tasks.push({
      id: "vendors_in_progress",
      priority: "LOW",
      title: `${ctx.vendorsInProgressCount} furnizori în negociere`,
      description: "Finalizează contractele cu furnizorii în progres.",
      action_label: "Vezi Furnizori",
      action_path: "/vendors",
    })
  }

  // Regula 8 — Fallback contextual
  if (tasks.length === 0) {
    if (ctx.guestsTotal === 0) {
      tasks.push({
        id: "add_first_guest",
        priority: "MEDIUM",
        title: "Adaugă primul invitat",
        description: "Începe lista de invitați pentru nunta ta.",
        action_label: "Listă Invitați",
        action_path: "/guest-list",
      })
    } else if (ctx.tablesTotal === 0) {
      tasks.push({
        id: "create_first_table",
        priority: "MEDIUM",
        title: "Creează planul de mese",
        description: "Ai invitați dar nicio masă configurată.",
        action_label: "Plan Mese",
        action_path: "/seating-chart",
      })
    } else if (ctx.guestsUnassigned === 0 && ctx.guestsTotal > 0) {
      tasks.push({
        id: "all_seated",
        priority: "LOW",
        title: "Toți invitații sunt plasați",
        description: "Planul de mese e complet. Exportă-l pentru restaurant.",
        action_label: "Exportă PDF",
        action_path: "/export",
      })
    } else {
      tasks.push({
        id: "continue_planning",
        priority: "LOW",
        title: "Continuă planificarea",
        description: "Verifică toate modulele și asigură-te că totul e la zi.",
        action_label: "Vezi Export",
        action_path: "/export",
      })
    }
  }

  return tasks
}

// ── Funcție principală ────────────────────────────────────────────────────────

export function generateTasks(ctx: TaskEngineContext): TaskEngineResult {
  const candidates = buildCandidates(ctx)

  // Sortează: HIGH > MEDIUM > LOW
  const priorityOrder: Record<TaskPriority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }
  const sorted = [...candidates].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  )

  const primary = sorted[0] ?? null
  const secondary = sorted.slice(1, 3)

  return { primary, secondary }
}
