import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // GDPR — fără date personale implicite
  sendDefaultPii: false,

  // Doar erori reale
  sampleRate: 1.0,

  // Scrubbing GDPR edge-side
  beforeSend(event) {
    if (event.user) {
      delete event.user.ip_address;
      delete event.user.email;
      delete event.user.username;
    }

    if (event.request?.url) {
      event.request.url = event.request.url
        .replace(/token=[^&]+/g, "token=[REDACTED]")
        .replace(/email=[^&]+/g, "email=[REDACTED]");
    }

    if (event.request?.query_string) {
      event.request.query_string = "[REDACTED]";
    }

    return event;
  },
});