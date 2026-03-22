"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ro">
      <body
        style={{
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#faf7f2",
          fontFamily: "sans-serif",
          color: "#13172e",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            alignItems: "center",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
            {"A apărut o eroare"}
          </h1>
          <p style={{ fontSize: "0.95rem", color: "#7a7f99", margin: 0 }}>
            {"Ceva nu a mers cum trebuie. Echipa a fost notificată."}
          </p>
          <button
            onClick={reset}
            style={{
              padding: "10px 24px",
              backgroundColor: "#c9907a",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            {"Încearcă din nou"}
          </button>
        </div>
      </body>
    </html>
  );
}