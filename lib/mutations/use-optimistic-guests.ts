// =============================================================================
// lib/mutations/use-optimistic-guests.ts
// Optimistic CRUD mutations for the guest list — V2 Pragmatic
//
// Design:
//   - guestsRef mirrors React state for synchronous reads inside async handlers
//   - opSeqRef tracks per-id operation sequence; prevents stale rollbacks
//   - editRollbackRef / deleteRollbackRef hold snapshots for rollback
//   - Manual shape validation (Zod not in project deps)
// =============================================================================

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type {
  GuestWithRelations,
  CreateGuestInput,
  UpdateGuestInput,
} from "@/types/guests";

// ─── Module-level counter for tmpId uniqueness ────────────────────────────────
let counter = 0;

// ─── Runtime response validator ──────────────────────────────────────────────

/**
 * Runtime shape guard for GuestWithRelations.
 * Replaces Zod — validates the fields we actually consume.
 */
export function isGuestWithRelations(value: unknown): value is GuestWithRelations {
  if (!value || typeof value !== "object") return false;
  const g = value as Record<string, unknown>;
  return (
    typeof g.id === "string" &&
    g.id.length > 0 &&
    typeof g.wedding_id === "string" &&
    typeof g.first_name === "string" &&
    typeof g.display_name === "string" &&
    typeof g.is_vip === "boolean" &&
    typeof g.created_at === "string" &&
    typeof g.updated_at === "string" &&
    Array.isArray(g.guest_events)
  );
}

/**
 * Parses a raw server JSON body into GuestWithRelations.
 * Throws on shape mismatch — caller must rollback + show error toast.
 */
export function parseGuestResponse(json: unknown): GuestWithRelations {
  if (!json || typeof json !== "object") {
    throw new Error("Răspuns invalid de la server.");
  }
  const body = json as Record<string, unknown>;
  if (body.success === false) {
    const errObj = body.error as Record<string, string> | undefined;
    throw new Error(errObj?.message ?? "Eroare de la server.");
  }
  if (!isGuestWithRelations(body.data)) {
    throw new Error("Structura răspunsului server este invalidă.");
  }
  return body.data;
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface DeleteSnapshot {
  guest: GuestWithRelations;
  index: number;
}

// ─── Public interface ─────────────────────────────────────────────────────────

export interface UseOptimisticGuestsOptions {
  token: string;
  /** Called with a human-readable message on errors requiring user feedback. */
  onError?: (message: string) => void;
}

export interface UseOptimisticGuestsReturn {
  /** Optimistic list — may include pending entries identified by tmpId. */
  guests: GuestWithRelations[];
  /** tmpIds currently in-flight (use for pending spinners / disabled rows). */
  pendingIds: ReadonlySet<string>;
  createGuest: (input: CreateGuestInput) => Promise<void>;
  updateGuest: (id: string, input: UpdateGuestInput) => Promise<void>;
  deleteGuest: (id: string) => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOptimisticGuests(
  serverGuests: GuestWithRelations[],
  options: UseOptimisticGuestsOptions
): UseOptimisticGuestsReturn {
  const { token, onError } = options;

  // ── State + synchronous mirror ─────────────────────────────────────────────
  const [guestsRaw, setGuestsRaw] = useState<GuestWithRelations[]>(serverGuests);
  const guestsRef = useRef<GuestWithRelations[]>(serverGuests);

  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  // ── Op tracking ────────────────────────────────────────────────────────────
  /** tmpId/guestId → current opSeq. Incremented at the start of every operation. */
  const opSeqRef = useRef<Map<string, number>>(new Map());
  /** guestId → old GuestWithRelations before edit (for edit rollback). */
  const editRollbackRef = useRef<Map<string, GuestWithRelations>>(new Map());
  /** guestId → { guest, index } before delete (for exact-position restore). */
  const deleteRollbackRef = useRef<Map<string, DeleteSnapshot>>(new Map());

  // ── Sync from server ───────────────────────────────────────────────────────
  useEffect(() => {
    guestsRef.current = serverGuests;
    setGuestsRaw(serverGuests);
  }, [serverGuests]);

  // ── Stable setter (reads from ref — correct under React batching) ──────────
  const setGuests = useCallback(
    (
      updater:
        | GuestWithRelations[]
        | ((prev: GuestWithRelations[]) => GuestWithRelations[])
    ) => {
      const next =
        typeof updater === "function" ? updater(guestsRef.current) : updater;
      guestsRef.current = next;
      setGuestsRaw(next);
    },
    []
  );

  // ── Seq helpers ────────────────────────────────────────────────────────────
  const nextSeqFor = useCallback((id: string): number => {
    const seq = (opSeqRef.current.get(id) ?? 0) + 1;
    opSeqRef.current.set(id, seq);
    return seq;
  }, []);

  const isSeqCurrent = useCallback(
    (id: string, seq: number): boolean => opSeqRef.current.get(id) === seq,
    []
  );

  // ── Create ─────────────────────────────────────────────────────────────────
  const createGuest = useCallback(
    async (input: CreateGuestInput): Promise<void> => {
      const tmpId = `tmp_${Date.now()}_${counter++}`;
      const capturedSeq = nextSeqFor(tmpId);

      // Optimistic entry — tmpId stands in for the real guest_id
      const now = new Date().toISOString();
      const optimistic: GuestWithRelations = {
        id: tmpId,
        wedding_id: input.wedding_id,
        guest_group_id: input.guest_group_id ?? null,
        first_name: input.first_name,
        last_name: input.last_name ?? null,
        display_name:
          input.display_name ??
          [input.first_name, input.last_name].filter(Boolean).join(" "),
        side: input.side ?? null,
        notes: input.notes ?? null,
        is_vip: input.is_vip ?? false,
        created_at: now,
        updated_at: now,
        guest_group: null,
        guest_events: [],
      };

      setGuests((prev) => [...prev, optimistic]);
      setPendingIds((prev) => new Set(prev).add(tmpId));

      try {
        const res = await fetch("/api/guests", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(input),
        });

        // Superseded — another operation invalidated this tmpId; ignore completely
        if (!isSeqCurrent(tmpId, capturedSeq)) return;

        const json: unknown = await res.json().catch(() => null);

        if (!isSeqCurrent(tmpId, capturedSeq)) return;

        if (!res.ok) {
          const errObj = (json as Record<string, Record<string, string>> | null)
            ?.error;
          throw new Error(errObj?.message ?? "Eroare la adăugarea invitatului.");
        }

        let realGuest: GuestWithRelations;
        try {
          realGuest = parseGuestResponse(json);
        } catch (parseErr) {
          if (!isSeqCurrent(tmpId, capturedSeq)) return;
          setGuests((prev) => prev.filter((g) => g.id !== tmpId));
          onError?.(
            (parseErr as Error).message ?? "Răspuns invalid. Invitatul a fost eliminat."
          );
          return;
        }

        if (!isSeqCurrent(tmpId, capturedSeq)) return;

        // Replace tmp → real
        setGuests((prev) => prev.map((g) => (g.id === tmpId ? realGuest : g)));
      } catch (err: unknown) {
        if (!isSeqCurrent(tmpId, capturedSeq)) return;
        setGuests((prev) => prev.filter((g) => g.id !== tmpId));
        onError?.((err as Error).message ?? "Eroare la adăugarea invitatului.");
      } finally {
        if (isSeqCurrent(tmpId, capturedSeq)) {
          setPendingIds((prev) => {
            const next = new Set(prev);
            next.delete(tmpId);
            return next;
          });
          opSeqRef.current.delete(tmpId);
        }
      }
    },
    [token, onError, setGuests, nextSeqFor, isSeqCurrent]
  );

  // ── Update ─────────────────────────────────────────────────────────────────
  const updateGuest = useCallback(
    async (id: string, input: UpdateGuestInput): Promise<void> => {
      const capturedSeq = nextSeqFor(id);

      // Snapshot old state for rollback — read from ref (always current)
      const oldGuest = guestsRef.current.find((g) => g.id === id);
      if (!oldGuest) return;
      editRollbackRef.current.set(id, oldGuest);

      // Instant optimistic update
      // Strip undefined/null display_name from input to avoid overwriting the
      // computed non-nullable field from GuestRow with an invalid value.
      const { display_name, ...restInput } = input;
      const mergedInput = display_name != null ? { ...restInput, display_name } : restInput;
      setGuests((prev) =>
        prev.map((g) =>
          g.id === id
            ? { ...g, ...mergedInput, updated_at: new Date().toISOString() }
            : g
        )
      );

      try {
        const res = await fetch(`/api/guests/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(input),
        });

        if (!isSeqCurrent(id, capturedSeq)) return;

        const json: unknown = await res.json().catch(() => null);

        if (!isSeqCurrent(id, capturedSeq)) return;

        if (!res.ok) {
          const errObj = (json as Record<string, Record<string, string>> | null)
            ?.error;
          throw new Error(
            errObj?.message ?? "Eroare la actualizarea invitatului."
          );
        }

        let realGuest: GuestWithRelations;
        try {
          realGuest = parseGuestResponse(json);
        } catch (parseErr) {
          if (!isSeqCurrent(id, capturedSeq)) return;
          const saved = editRollbackRef.current.get(id);
          if (saved) {
            setGuests((prev) => prev.map((g) => (g.id === id ? saved : g)));
          }
          onError?.(
            (parseErr as Error).message ??
              "Răspuns invalid. Modificarea a fost anulată."
          );
          return;
        }

        if (!isSeqCurrent(id, capturedSeq)) return;

        // Apply confirmed server state
        setGuests((prev) => prev.map((g) => (g.id === id ? realGuest : g)));
      } catch (err: unknown) {
        if (!isSeqCurrent(id, capturedSeq)) return;
        const saved = editRollbackRef.current.get(id);
        if (saved) {
          setGuests((prev) => prev.map((g) => (g.id === id ? saved : g)));
        }
        onError?.(
          (err as Error).message ?? "Eroare la actualizarea invitatului."
        );
      } finally {
        if (isSeqCurrent(id, capturedSeq)) {
          editRollbackRef.current.delete(id);
          opSeqRef.current.delete(id);
        }
      }
    },
    [token, onError, setGuests, nextSeqFor, isSeqCurrent]
  );

  // ── Delete ─────────────────────────────────────────────────────────────────
  const deleteGuest = useCallback(
    async (id: string): Promise<void> => {
      const capturedSeq = nextSeqFor(id);

      // Snapshot { guest, index } for exact-position restore on failure
      const idx = guestsRef.current.findIndex((g) => g.id === id);
      if (idx === -1) return;
      deleteRollbackRef.current.set(id, {
        guest: guestsRef.current[idx],
        index: idx,
      });

      // Instant optimistic remove
      setGuests((prev) => prev.filter((g) => g.id !== id));

      try {
        const res = await fetch(`/api/guests/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!isSeqCurrent(id, capturedSeq)) return;

        if (!res.ok) {
          const json: unknown = await res.json().catch(() => null);
          const errObj = (json as Record<string, Record<string, string>> | null)
            ?.error;
          throw new Error(errObj?.message ?? "Eroare la ștergerea invitatului.");
        }
      } catch (err: unknown) {
        if (!isSeqCurrent(id, capturedSeq)) return;
        const snapshot = deleteRollbackRef.current.get(id);
        if (snapshot) {
          setGuests((prev) => {
            const next = [...prev];
            next.splice(snapshot.index, 0, snapshot.guest);
            return next;
          });
        }
        onError?.((err as Error).message ?? "Eroare la ștergerea invitatului.");
      } finally {
        if (isSeqCurrent(id, capturedSeq)) {
          deleteRollbackRef.current.delete(id);
          opSeqRef.current.delete(id);
        }
      }
    },
    [token, onError, setGuests, nextSeqFor, isSeqCurrent]
  );

  return {
    guests: guestsRaw,
    pendingIds,
    createGuest,
    updateGuest,
    deleteGuest,
  };
}
