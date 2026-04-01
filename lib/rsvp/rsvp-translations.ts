// =============================================================================
// lib/rsvp/rsvp-translations.ts
// Traduceri pentru modulul RSVP — Faza 7
// Structură pregătită pentru multilingv — doar RO acum
// Adaugă EN: copiezi obiectul ro, traduci valorile, gata.
// =============================================================================

export type RsvpLocale = 'ro'; // | 'en' | 'hu' — adaugă după launch

export interface RsvpTranslations {
  // Pagina publică
  page: {
    title: string;
    subtitle: string;
    loading: string;
    error_invalid: string;
    error_expired: string;
    error_used: string;
    error_generic: string;
  };
  // Răspuns per eveniment
  response: {
    label_attend: string;
    label_decline: string;
    label_maybe: string;
    heading_events: string;
    heading_meal: string;
    heading_notes: string;
    meal_standard: string;
    meal_vegetarian: string;
    notes_placeholder: string;
    notes_label: string;
  };
  // Submit
  submit: {
    button: string;
    button_loading: string;
    success_title: string;
    success_subtitle: string;
    error_required: string;
    error_generic: string;
  };
  // Status badges
  status: {
    pending: string;
    accepted: string;
    declined: string;
    maybe: string;
  };
  // Dashboard cuplu
  dashboard: {
    title: string;
    total: string;
    confirmed: string;
    declined: string;
    pending: string;
    maybe: string;
    response_rate: string;
    send_invitations: string;
    send_reminder: string;
    add_manual: string;
    opened_not_answered: string;
    copy_link: string;
    generate_qr: string;
    mark_sent: string;
    resend: string;
  };
}

const ro: RsvpTranslations = {
  page: {
    title: 'Confirmare participare',
    subtitle: 'Ne bucurăm să te avem alături',
    loading: 'Se încarcă invitația...',
    error_invalid: 'Linkul de invitație nu este valid.',
    error_expired: 'Linkul de invitație a expirat. Contactează cuplul pentru un link nou.',
    error_used: 'Ai confirmat deja participarea. Contactează cuplul dacă dorești să modifici răspunsul.',
    error_generic: 'A apărut o eroare. Te rugăm să încerci din nou.',
  },
  response: {
    label_attend: 'Confirm participarea',
    label_decline: 'Nu pot ajunge',
    label_maybe: 'Poate particip',
    heading_events: 'Evenimente',
    heading_meal: 'Preferință meniu',
    heading_notes: 'Observații',
    meal_standard: 'Meniu standard',
    meal_vegetarian: 'Meniu vegetarian',
    notes_placeholder: 'Alergii, preferințe sau orice altceva...',
    notes_label: 'Observații și alergii (opțional)',
  },
  submit: {
    button: 'Trimite răspunsul',
    button_loading: 'Se trimite...',
    success_title: 'Mulțumim!',
    success_subtitle: 'Răspunsul tău a fost înregistrat. Te așteptăm cu drag.',
    error_required: 'Te rugăm să selectezi un răspuns pentru fiecare eveniment.',
    error_generic: 'A apărut o eroare la trimiterea răspunsului. Încearcă din nou.',
  },
  status: {
    pending: 'În așteptare',
    accepted: 'Confirmat',
    declined: 'Refuzat',
    maybe: 'Poate',
  },
  dashboard: {
    title: 'RSVP',
    total: 'Total invitați',
    confirmed: 'Confirmați',
    declined: 'Refuzați',
    pending: 'În așteptare',
    maybe: 'Poate',
    response_rate: 'Rată răspuns',
    send_invitations: 'Trimite invitații',
    send_reminder: 'Trimite reminder',
    add_manual: 'Adaugă manual',
    opened_not_answered: 'A deschis dar nu a răspuns',
    copy_link: 'Copiază link',
    generate_qr: 'Generează QR',
    mark_sent: 'Marchează trimis',
    resend: 'Retrimite',
  },
};

// Adaugă alte limbi aici:
// const en: RsvpTranslations = { ... };

const translations: Record<RsvpLocale, RsvpTranslations> = {
  ro,
};

export function getTranslations(locale: RsvpLocale = 'ro'): RsvpTranslations {
  return translations[locale] ?? translations.ro;
}

export default translations;