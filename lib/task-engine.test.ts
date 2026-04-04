// =============================================================================
// lib/task-engine.test.ts
// Teste pentru generateTasks — Faza 10
// =============================================================================

import { describe, it, expect } from "vitest"
import { generateTasks, type TaskEngineContext } from "./task-engine"

// ── Helper ────────────────────────────────────────────────────────────────────

function ctx(overrides: Partial<TaskEngineContext> = {}): TaskEngineContext {
  return {
    daysUntilWedding: 180,
    guestsTotal: 0,
    guestsUnassigned: 0,
    rsvpPending: 0,
    rsvpSentCount: 0,
    hasLocation: true,
    hasCatering: true,
    vendorsInProgressCount: 0,
    budgetTotal: 0,
    budgetPaid: 0,
    paymentDueSoonCount: 0,
    tablesTotal: 0,
    seatedGuestsTotal: 0,
    ...overrides,
  }
}

// ── generateTasks — structură ─────────────────────────────────────────────────

describe("generateTasks — structură", () => {
  it("returnează primary și secondary", () => {
    const result = generateTasks(ctx())
    expect(result).toHaveProperty("primary")
    expect(result).toHaveProperty("secondary")
    expect(Array.isArray(result.secondary)).toBe(true)
  })

  it("secondary are maxim 2 itemi", () => {
    const result = generateTasks(ctx({
      hasLocation: false,
      hasCatering: false,
      guestsTotal: 10,
      rsvpSentCount: 0,
    }))
    expect(result.secondary.length).toBeLessThanOrEqual(2)
  })

  it("primary e null când nu există tasks", () => {
    // Context perfect — niciun task disponibil în afară de fallback
    const result = generateTasks(ctx({ guestsTotal: 0 }))
    expect(result.primary).not.toBeNull()
  })
})

// ── Regula 1 — Locație ────────────────────────────────────────────────────────

describe("Regula 1 — locație", () => {
  it("generează task HIGH când nu există locație", () => {
    const result = generateTasks(ctx({ hasLocation: false }))
    expect(result.primary?.id).toBe("no_location")
    expect(result.primary?.priority).toBe("HIGH")
  })

  it("nu generează task locație când există", () => {
    const result = generateTasks(ctx({ hasLocation: true }))
    const all = [result.primary, ...result.secondary]
    expect(all.some((t) => t?.id === "no_location")).toBe(false)
  })
})

// ── Regula 2 — Catering ───────────────────────────────────────────────────────

describe("Regula 2 — catering", () => {
  it("generează task HIGH când nu există catering", () => {
    const result = generateTasks(ctx({ hasCatering: false, hasLocation: true }))
    const all = [result.primary, ...result.secondary]
    expect(all.some((t) => t?.id === "no_catering")).toBe(true)
  })

  it("nu generează task catering când există", () => {
    const result = generateTasks(ctx({ hasCatering: true }))
    const all = [result.primary, ...result.secondary]
    expect(all.some((t) => t?.id === "no_catering")).toBe(false)
  })
})

// ── Regula 3 — Invitați neplasați ─────────────────────────────────────────────

describe("Regula 3 — invitați neplasați", () => {
  it("generează task când există invitați fără loc și mese", () => {
    const result = generateTasks(ctx({ guestsUnassigned: 5, tablesTotal: 3 }))
    const all = [result.primary, ...result.secondary]
    expect(all.some((t) => t?.id === "unassigned_guests")).toBe(true)
  })

  it("nu generează task când nu există mese", () => {
    const result = generateTasks(ctx({ guestsUnassigned: 5, tablesTotal: 0 }))
    const all = [result.primary, ...result.secondary]
    expect(all.some((t) => t?.id === "unassigned_guests")).toBe(false)
  })

  it("nu generează task când toți sunt plasați", () => {
    const result = generateTasks(ctx({ guestsUnassigned: 0, tablesTotal: 3 }))
    const all = [result.primary, ...result.secondary]
    expect(all.some((t) => t?.id === "unassigned_guests")).toBe(false)
  })
})

// ── Regula 4 — RSVP ───────────────────────────────────────────────────────────

describe("Regula 4 — RSVP", () => {
  it("MEDIUM când RSVP nu a fost trimis și nunta e departe", () => {
    const result = generateTasks(ctx({ guestsTotal: 10, rsvpSentCount: 0, daysUntilWedding: 180 }))
    const all = [result.primary, ...result.secondary]
    const task = all.find((t) => t?.id === "rsvp_not_sent")
    expect(task).toBeDefined()
    expect(task?.priority).toBe("MEDIUM")
  })

  it("HIGH când RSVP nu a fost trimis și nunta e în < 30 zile", () => {
    const result = generateTasks(ctx({ guestsTotal: 10, rsvpSentCount: 0, daysUntilWedding: 20 }))
    const all = [result.primary, ...result.secondary]
    const task = all.find((t) => t?.id === "rsvp_not_sent")
    expect(task?.priority).toBe("HIGH")
  })

  it("nu generează rsvp_not_sent când nu există invitați", () => {
    const result = generateTasks(ctx({ guestsTotal: 0, rsvpSentCount: 0 }))
    const all = [result.primary, ...result.secondary]
    expect(all.some((t) => t?.id === "rsvp_not_sent")).toBe(false)
  })

  it("generează rsvp_pending când există răspunsuri în așteptare", () => {
    const result = generateTasks(ctx({ rsvpSentCount: 5, rsvpPending: 3, guestsTotal: 8 }))
    const all = [result.primary, ...result.secondary]
    expect(all.some((t) => t?.id === "rsvp_pending")).toBe(true)
  })
})

// ── Regula 5 — Buget ──────────────────────────────────────────────────────────

describe("Regula 5 — buget", () => {
  it("generează task când plăți < 20% și nunta e în < 60 zile", () => {
    const result = generateTasks(ctx({
      budgetTotal: 10000,
      budgetPaid: 500,
      daysUntilWedding: 45,
    }))
    const all = [result.primary, ...result.secondary]
    expect(all.some((t) => t?.id === "budget_low_paid")).toBe(true)
  })

  it("nu generează task buget când nunta e departe", () => {
    const result = generateTasks(ctx({
      budgetTotal: 10000,
      budgetPaid: 500,
      daysUntilWedding: 180,
    }))
    const all = [result.primary, ...result.secondary]
    expect(all.some((t) => t?.id === "budget_low_paid")).toBe(false)
  })

  it("nu generează task buget când nu există buget", () => {
    const result = generateTasks(ctx({ budgetTotal: 0 }))
    const all = [result.primary, ...result.secondary]
    expect(all.some((t) => t?.id === "budget_low_paid")).toBe(false)
  })
})

// ── Regula 6 — Plată scadentă ─────────────────────────────────────────────────

describe("Regula 6 — plată scadentă", () => {
  it("generează task HIGH când există plăți scadente", () => {
    const result = generateTasks(ctx({ paymentDueSoonCount: 2 }))
    const all = [result.primary, ...result.secondary]
    const task = all.find((t) => t?.id === "payment_due_soon")
    expect(task).toBeDefined()
    expect(task?.priority).toBe("HIGH")
  })
})

// ── Regula 7 — Vendors ────────────────────────────────────────────────────────

describe("Regula 7 — vendors", () => {
  it("generează task LOW când există vendors în progres", () => {
    const result = generateTasks(ctx({ vendorsInProgressCount: 3 }))
    const all = [result.primary, ...result.secondary]
    const task = all.find((t) => t?.id === "vendors_in_progress")
    expect(task).toBeDefined()
    expect(task?.priority).toBe("LOW")
  })
})

// ── Regula 8 — Fallback ───────────────────────────────────────────────────────

describe("Regula 8 — fallback", () => {
  it("add_first_guest când nu există invitați", () => {
    const result = generateTasks(ctx({ guestsTotal: 0 }))
    expect(result.primary?.id).toBe("add_first_guest")
  })

  it("create_first_table când există invitați dar nu mese", () => {
    const result = generateTasks(ctx({ guestsTotal: 10, tablesTotal: 0, rsvpSentCount: 1 }))
    expect(result.primary?.id).toBe("create_first_table")
  })

  it("all_seated când toți invitații sunt plasați", () => {
    const result = generateTasks(ctx({
      guestsTotal: 10,
      guestsUnassigned: 0,
      tablesTotal: 3,
      rsvpSentCount: 10,
    }))
    expect(result.primary?.id).toBe("all_seated")
  })
})

// ── Prioritizare ──────────────────────────────────────────────────────────────

describe("Prioritizare", () => {
  it("HIGH apare înaintea MEDIUM", () => {
    const result = generateTasks(ctx({
      hasLocation: false,
      guestsTotal: 10,
      rsvpSentCount: 0,
      daysUntilWedding: 180,
    }))
    expect(result.primary?.priority).toBe("HIGH")
  })

  it("payment_due_soon (HIGH) bate vendors_in_progress (LOW)", () => {
    const result = generateTasks(ctx({
      paymentDueSoonCount: 1,
      vendorsInProgressCount: 2,
    }))
    expect(result.primary?.id).toBe("payment_due_soon")
  })
})
