"use client";

import { useCallback, useEffect, useState } from "react";
import { clearSessionCache } from "@/app/lib/auth/session/session-bridge";

// ── Types ────────────────────────────────────────────────────────────────────

type DevSession = {
  status: string;
  source: "wordpress" | "dev_mock";
  app_user_id: string | null;
  wedding_id: string | null;
  event_id: string | null;
  provisioning_status: string | null;
  wp_user_id: number | null;
};

type DevFlags = Record<string, boolean>;

type DevHealth = {
  supabase: "ok" | "error";
  wordpress: "ok" | "error" | "skipped";
  isReadOnly: boolean;
  readOnlyReason?: string;
  timestamp: string;
};

type FetchState<T> =
  | { status: "loading" }
  | { status: "ok"; data: T; fetchedAt: number }
  | { status: "error"; message: string };

// ── Module-level stale check (o singură dată la import, în afara oricărui render) ──

function computeStaleWarning(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const raw = sessionStorage.getItem("wl_session_cache");
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { cachedAt?: number };
    if (typeof parsed.cachedAt !== "number") return false;
    return Date.now() - parsed.cachedAt > 5 * 60 * 1000;
  } catch {
    return false;
  }
}

const SHOW_STALE_WARNING = computeStaleWarning();

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

// ── Main component ───────────────────────────────────────────────────────────

export default function DevPanel(): React.ReactElement {
  // Start in "loading" — no sync setState calls inside load()
  const [session, setSession] = useState<FetchState<DevSession>>({
    status: "loading",
  });
  const [flags, setFlags] = useState<FetchState<DevFlags>>({
    status: "loading",
  });
  const [health, setHealth] = useState<FetchState<DevHealth>>({
    status: "loading",
  });
  const [errors, setErrors] = useState<string[]>([]);

  // Stale session warning — constantă de modul, nu citire ref în render
  const showStaleWarning = SHOW_STALE_WARNING;

  const addError = useCallback((msg: string) => {
    setErrors((prev) =>
      [`[${new Date().toISOString()}] ${msg}`, ...prev].slice(0, 20)
    );
  }, []);

  // All setState calls here happen AFTER the first await — avoids set-state-in-effect
  const load = useCallback(() => {
    Promise.allSettled([
      fetchJson<DevSession>("/api/dev/session")
        .then((data) =>
          setSession({ status: "ok", data, fetchedAt: Date.now() })
        )
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e);
          setSession({ status: "error", message: msg });
          addError(`session: ${msg}`);
        }),

      fetchJson<DevFlags>("/api/dev/flags")
        .then((data) =>
          setFlags({ status: "ok", data, fetchedAt: Date.now() })
        )
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e);
          setFlags({ status: "error", message: msg });
          addError(`flags: ${msg}`);
        }),

      fetchJson<DevHealth>("/api/dev/health")
        .then((data) =>
          setHealth({ status: "ok", data, fetchedAt: Date.now() })
        )
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e);
          setHealth({ status: "error", message: msg });
          addError(`health: ${msg}`);
        }),
    ]).catch(() => {
      // Promise.allSettled nu aruncă niciodată, dar TypeScript o cere
    });
  }, [addError]);

  useEffect(() => {
    load();
  }, [load]);

  const handleClearCache = useCallback(() => {
    clearSessionCache();
    addError("Cache sesiune șters manual.");
    load();
  }, [addError, load]);

  const handleForceResync = useCallback(() => {
    clearSessionCache();
    sessionStorage.clear();
    addError("SessionStorage golit. Reîncărcare...");
    window.location.reload();
  }, [addError]);

  return (
    <div
      style={{
        fontFamily: "DM Sans, ui-sans-serif, sans-serif",
        background: "#F5F2EE",
        minHeight: "100vh",
        padding: "2rem",
        color: "#1E2340",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
        }}
      >
        <h1
          style={{
            fontFamily: "Cormorant Garamond, serif",
            fontStyle: "italic",
            fontSize: 28,
            fontWeight: 700,
            margin: 0,
          }}
        >
          Dev Panel
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} style={btnStyle("#C9907A", "#fff")}>
            Reload
          </button>
          <button
            onClick={handleClearCache}
            style={btnStyle("transparent", "#C9907A", "#C9907A")}
          >
            Clear Cache
          </button>
          <button onClick={handleForceResync} style={btnStyle("#E53E3E", "#fff")}>
            Force Resync
          </button>
        </div>
      </div>

      {/* Stale session warning */}
      {showStaleWarning && (
        <div style={warningBanner}>
          ⚠️ Sesiunea nu a fost reîmprospătată de peste 5 minute.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1rem",
        }}
      >
        {/* Session */}
        <Card title="Session">
          {session.status === "loading" && <Muted>Se încarcă...</Muted>}
          {session.status === "error" && (
            <ErrorText>{session.message}</ErrorText>
          )}
          {session.status === "ok" && (
            <table style={tableStyle}>
              <tbody>
                <Row label="status" value={session.data.status} />
                <Row
                  label="source"
                  value={
                    <Badge
                      value={session.data.source}
                      ok={session.data.source === "wordpress"}
                    />
                  }
                />
                <Row
                  label="app_user_id"
                  value={session.data.app_user_id ?? "—"}
                  mono
                />
                <Row
                  label="wedding_id"
                  value={session.data.wedding_id ?? "—"}
                  mono
                />
                <Row
                  label="event_id"
                  value={session.data.event_id ?? "—"}
                  mono
                />
                <Row
                  label="provisioning"
                  value={session.data.provisioning_status ?? "—"}
                />
                <Row
                  label="wp_user_id"
                  value={
                    session.data.wp_user_id !== null
                      ? String(session.data.wp_user_id)
                      : "—"
                  }
                />
                <Row
                  label="fetched at"
                  value={new Date(session.fetchedAt).toLocaleTimeString(
                    "ro-RO"
                  )}
                />
              </tbody>
            </table>
          )}
        </Card>

        {/* Health */}
        <Card title="Health">
          {health.status === "loading" && <Muted>Se verifică...</Muted>}
          {health.status === "error" && (
            <ErrorText>{health.message}</ErrorText>
          )}
          {health.status === "ok" && (
            <table style={tableStyle}>
              <tbody>
                <Row
                  label="supabase"
                  value={
                    <Badge
                      value={health.data.supabase}
                      ok={health.data.supabase === "ok"}
                    />
                  }
                />
                <Row
                  label="wordpress"
                  value={
                    <Badge
                      value={health.data.wordpress}
                      ok={health.data.wordpress === "ok"}
                    />
                  }
                />
                <Row
                  label="read-only"
                  value={
                    <Badge
                      value={health.data.isReadOnly ? "DA" : "nu"}
                      ok={!health.data.isReadOnly}
                    />
                  }
                />
                {health.data.readOnlyReason !== undefined && (
                  <Row label="motiv" value={health.data.readOnlyReason} />
                )}
                <Row
                  label="timestamp"
                  value={new Date(health.data.timestamp).toLocaleTimeString(
                    "ro-RO"
                  )}
                />
              </tbody>
            </table>
          )}
        </Card>

        {/* Feature Flags */}
        <Card title="Feature Flags">
          {flags.status === "loading" && <Muted>Se încarcă...</Muted>}
          {flags.status === "error" && <ErrorText>{flags.message}</ErrorText>}
          {flags.status === "ok" && (
            <table style={tableStyle}>
              <tbody>
                {Object.entries(flags.data).map(([key, val]) => (
                  <Row
                    key={key}
                    label={key}
                    value={<Badge value={val ? "on" : "off"} ok={val} />}
                  />
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* Error log */}
        {errors.length > 0 && (
          <Card title="Error Log">
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: 6,
              }}
            >
              <button
                onClick={() => setErrors([])}
                style={{
                  fontSize: 12,
                  color: "#9DA3BC",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Șterge log
              </button>
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 11,
                color: "#E53E3E",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {errors.map((e, i) => (
                <div key={i}>{e}</div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: "1.25rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <h2
        style={{
          fontSize: 13,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#9DA3BC",
          margin: "0 0 0.75rem",
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function Badge({
  value,
  ok,
}: {
  value: string;
  ok: boolean;
}): React.ReactElement {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: ok ? "#C6F6D5" : "#FED7D7",
        color: ok ? "#276749" : "#9B2C2C",
      }}
    >
      {value}
    </span>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}): React.ReactElement {
  return (
    <tr>
      <td
        style={{
          color: "#9DA3BC",
          fontSize: 12,
          paddingRight: 12,
          paddingBottom: 4,
          whiteSpace: "nowrap",
          verticalAlign: "top",
        }}
      >
        {label}
      </td>
      <td
        style={{
          fontSize: 12,
          paddingBottom: 4,
          fontFamily: mono ? "monospace" : undefined,
          wordBreak: "break-all",
        }}
      >
        {value}
      </td>
    </tr>
  );
}

function Muted({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <p style={{ color: "#9DA3BC", fontSize: 13, margin: 0 }}>{children}</p>
  );
}

function ErrorText({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <p style={{ color: "#E53E3E", fontSize: 13, margin: 0 }}>{children}</p>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const warningBanner: React.CSSProperties = {
  background: "#FEFCBF",
  border: "1px solid #ECC94B",
  borderRadius: 8,
  padding: "0.75rem 1rem",
  marginBottom: "1rem",
  fontSize: 13,
  color: "#744210",
};

function btnStyle(
  bg: string,
  color: string,
  borderColor?: string
): React.CSSProperties {
  return {
    background: bg,
    color,
    border: borderColor ? `1px solid ${borderColor}` : "none",
    borderRadius: 999,
    padding: "6px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}
