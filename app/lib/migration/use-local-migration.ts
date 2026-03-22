"use client";

import { useEffect, useState } from "react";

type MigrationStatus =
  | "idle"
  | "checking"
  | "migrating"
  | "completed"
  | "skipped"
  | "error";

type UseLocalMigrationProps = {
  appUserId: string | null;
  weddingId: string | null;
};

export function useLocalMigration({
  appUserId,
  weddingId,
}: UseLocalMigrationProps): { status: MigrationStatus; error: string | null } {
  const [status, setStatus] = useState<MigrationStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appUserId || !weddingId) return;

    let isMounted = true;

    async function run() {
      setStatus("checking");

      // Verificăm dacă există date în localStorage
      const raw = localStorage.getItem("seating_state");
      if (!raw) {
        if (isMounted) setStatus("skipped");
        return;
      }

      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        if (isMounted) setStatus("skipped");
        return;
      }

      if (!data?.guests?.length && !data?.tables?.length) {
        if (isMounted) setStatus("skipped");
        return;
      }

      setStatus("migrating");

      try {
        const response = await fetch("/api/migrate-local", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            app_user_id: appUserId,
            wedding_id: weddingId,
            data: {
              guests: data.guests ?? [],
              tables: data.tables ?? [],
              seatAssignments: data.seatAssignments ?? [],
            },
          }),
        });

        const result = await response.json();

        if (!isMounted) return;

        if (result.ok) {
          // Curățăm localStorage după migrare reușită
          if (result.status === "completed") {
            localStorage.removeItem("seating_state");
          }
          setStatus("completed");
        } else {
          setError(result.error ?? "Migration failed");
          setStatus("error");
        }
      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setStatus("error");
      }
    }

    void run();

    return () => {
      isMounted = false;
    };
  }, [appUserId, weddingId]);

  return { status, error };
}