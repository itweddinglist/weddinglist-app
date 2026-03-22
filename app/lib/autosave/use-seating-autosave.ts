"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type SaveStatus,
  type SeatingPersistenceAdapter,
  type SeatingSnapshot,
} from "./types";
import { localAdapter } from "./local-adapter";
import { createSupabaseAdapter } from "./supabase-adapter";

const DEBOUNCE_MS = 500;
const SAVED_DISPLAY_MS = 1500;
const RETRY_DELAYS = [1000, 3000];

type UseSeatingAutosaveProps = {
  mode: "local" | "remote";
  weddingId: string | null;
  eventId: string | null;
  snapshot: SeatingSnapshot | null;
  enabled?: boolean;
};

export function useSeatingAutosave({
  mode,
  weddingId,
  eventId,
  snapshot,
  enabled = true,
}: UseSeatingAutosaveProps): { status: SaveStatus } {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSnapshotRef = useRef<SeatingSnapshot | null>(null);
  const retryCountRef = useRef(0);
  const saveRef = useRef<((snap: SeatingSnapshot) => Promise<void>) | null>(null);

  const getAdapter = useCallback((): SeatingPersistenceAdapter => {
    if (mode === "local") return localAdapter;
    if (!weddingId) return localAdapter;
    return createSupabaseAdapter(weddingId, eventId);
  }, [mode, weddingId, eventId]);

  const save = useCallback(
    async (snap: SeatingSnapshot) => {
      const adapter = getAdapter();
      setStatus("saving");

      try {
        await adapter.save(snap);
        retryCountRef.current = 0;

        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        setStatus("saved");
        savedTimerRef.current = setTimeout(() => {
          setStatus("idle");
        }, SAVED_DISPLAY_MS);
      } catch {
        const retryIndex = retryCountRef.current;

        if (retryIndex < RETRY_DELAYS.length) {
          retryCountRef.current += 1;
          const delay = RETRY_DELAYS[retryIndex] ?? 3000;

          setTimeout(() => {
            const current = lastSnapshotRef.current;
            const fn = saveRef.current;
            if (current && fn) void fn(current);
          }, delay);
        } else {
          retryCountRef.current = 0;
          setStatus("error");
        }
      }
    },
    [getAdapter]
  );

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    if (!enabled || !snapshot) return;
    if (lastSnapshotRef.current === snapshot) return;
    lastSnapshotRef.current = snapshot;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setStatus("saving");
      void save(snapshot);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [snapshot, enabled, save]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  return { status };
}