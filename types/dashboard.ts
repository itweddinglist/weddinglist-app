// types/dashboard.ts
// Contract locked — nu modifica fără aprobare explicită

export type TaskContextResponse = {
  has_location: boolean
  has_catering: boolean
  vendors_in_progress_count: number
  payments_due_soon_count: number
}

export type DashboardStats = {
  wedding: {
    id: string
    title: string
    event_date: string | null
  }
  stats: {
    guests_total: number
    rsvp_accepted: number
    rsvp_declined: number
    rsvp_maybe: number
    rsvp_pending: number
    response_rate: number
    tables_total: number
    seats_total: number
    seated_guests_total: number
    budget_total: number
    budget_paid: number
    budget_remaining: number
  }
}
