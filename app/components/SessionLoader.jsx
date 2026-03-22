"use client";

import { Spinner } from "./Skeleton";

export default function SessionLoader() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "var(--ivory)",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <Spinner size="32px" />
      <p
        style={{
          fontSize: "0.875rem",
          color: "var(--muted)",
          fontFamily: "var(--font-body)",
          margin: 0,
        }}
      >
        {"Se încarcă..."}
      </p>
    </div>
  );
}