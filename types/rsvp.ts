// =============================================================================
// types/rsvp.ts
// Domain types pentru modulul RSVP — Faza 7
// =============================================================================

// ─── Enums ───────────────────────────────────────────────────────────────────

export type RsvpAttendanceStatus = 'pending' | 'accepted' | 'declined' | 'maybe';

export type RsvpMealChoice = 'standard' | 'vegetarian';

export type RsvpDeliveryChannel =
  | 'whatsapp'
  | 'email'
  | 'sms'
  | 'facebook'
  | 'qr'
  | 'link'
  | 'manual';

export type RsvpDeliveryStatus = 'draft' | 'ready' | 'sent' | 'failed';

export type RsvpResponseSource = 'guest_link' | 'couple_manual' | 'import';

// ─── DB Row Types ─────────────────────────────────────────────────────────────

export interface RsvpInvitationRow {
  id: string;
  wedding_id: string;
  event_id: string;
  guest_id: string | null;
  token_hash: string;
  status: string;
  delivery_channel: RsvpDeliveryChannel | null;
  delivery_status: RsvpDeliveryStatus;
  opened_at: string | null;
  sent_at: string | null;
  last_sent_at: string | null;
  responded_at: string | null;
  is_active: boolean;
  max_guests: number | null;
  created_at: string;
  updated_at: string;
}

export interface RsvpResponseRow {
  id: string;
  wedding_id: string;
  event_id: string;
  invitation_id: string;
  guest_event_id: string;
  status: RsvpAttendanceStatus;
  meal_choice: RsvpMealChoice | null;
  dietary_notes: string | null;
  note: string | null;
  rsvp_source: RsvpResponseSource;
  responded_at: string;
  used_at: string | null;
}

// ─── API Request Types ────────────────────────────────────────────────────────

/** POST /api/rsvp/invitations — Creează o invitație nouă pentru un invitat */
export interface CreateRsvpInvitationInput {
  wedding_id: string;
  guest_id: string;
  delivery_channel?: RsvpDeliveryChannel;
}

/** POST /api/rsvp/[token] — Submit răspuns RSVP de pe pagina publică */
export interface SubmitRsvpInput {
  responses: RsvpEventResponse[];
}

/** Răspuns per eveniment — invitatul poate fi la mai multe events */
export interface RsvpEventResponse {
  guest_event_id: string;
  status: RsvpAttendanceStatus;
  meal_choice?: RsvpMealChoice | null;
  dietary_notes?: string | null;
  note?: string | null;
}

// ─── API Response Types ───────────────────────────────────────────────────────

/** GET /api/rsvp/[token] — Date returnate pentru pagina publică */
export interface RsvpPageData {
  invitation: {
    id: string;
    guest_id: string;
    is_active: boolean;
    expires_at: string | null;
  };
  guest: {
    id: string;
    display_name: string;
    first_name: string;
  };
  events: RsvpEventData[];
  existing_responses: RsvpResponseRow[];
}

export interface RsvpEventData {
  guest_event_id: string;
  event_id: string;
  event_name: string;
  event_date: string | null;
  event_type: string;
  current_response: RsvpResponseRow | null;
}

/** POST /api/rsvp/[token] — Rezultat submit */
export interface RsvpSubmitResult {
  success: true;
  responses_saved: number;
  invitation_id: string;
}

// ─── Token ────────────────────────────────────────────────────────────────────

export interface GeneratedToken {
  raw: string;    // trimis invitatului — nu se stochează
  hash: string;   // SHA-256 hex — stocat în DB
}