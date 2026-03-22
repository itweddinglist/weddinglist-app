import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // GDPR — fără date personale implicite
  sendDefaultPii: false,

  // Doar erori reale — fără noise
  sampleRate: 1.0,

  // Session Replay — OFF (GDPR)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Scrubbing GDPR — înainte să trimitem orice eroare
  beforeSend(event) {
    // Eliminăm IP-ul utilizatorului
    if (event.user) {
      delete event.user.ip_address;
      delete event.user.email;
      delete event.user.username;
    }

    // Redactăm RSVP tokens din URL-uri
    if (event.request?.url) {
      event.request.url = event.request.url
        .replace(/token=[^&]+/g, "token=[REDACTED]")
        .replace(/email=[^&]+/g, "email=[REDACTED]");
    }

    // Redactăm query strings sensibile
    if (event.request?.query_string) {
      event.request.query_string = "[REDACTED]";
    }

    return event;
  },
});