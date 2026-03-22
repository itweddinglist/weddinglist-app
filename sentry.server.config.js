import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // GDPR — fără date personale implicite
  sendDefaultPii: false,

  // Doar erori reale
  sampleRate: 1.0,

  // Scrubbing GDPR server-side
  beforeSend(event) {
    // Eliminăm IP-ul utilizatorului
    if (event.user) {
      delete event.user.ip_address;
      delete event.user.email;
      delete event.user.username;
    }

    // Redactăm RSVP tokens și date sensibile din URL-uri
    if (event.request?.url) {
      event.request.url = event.request.url
        .replace(/token=[^&]+/g, "token=[REDACTED]")
        .replace(/email=[^&]+/g, "email=[REDACTED]");
    }

    // Redactăm query strings
    if (event.request?.query_string) {
      event.request.query_string = "[REDACTED]";
    }

    // Redactăm headers sensibile
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
    }

    return event;
  },
});