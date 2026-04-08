// =============================================================================
// lib/system/read-only.ts
// Read-only mode global — Faza 4 SPEC secțiunea 8.
//
// triggerReadOnlyMode / clearReadOnlyMode: callable din orice context.
// useReadOnlyMode: hook React pentru componente client.
//
// State-ul este module-level (singleton per process).
// Server-side: trigger/clear actualizează starea server-ului (no-op pentru UI).
// Client-side: notifică toți subscriberii React.
// =============================================================================

import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReadOnlyReason =
  | "supabase_down"
  | "maintenance"
  | "rpc_error_threshold";

export type ReadOnlyState =
  | { isReadOnly: false; reason: null }
  | { isReadOnly: true; reason: ReadOnlyReason };

// ─── Module-level singleton ───────────────────────────────────────────────────

let _state: ReadOnlyState = { isReadOnly: false, reason: null };
const _listeners = new Set<(state: ReadOnlyState) => void>();

function _notify(): void {
  _listeners.forEach((fn) => fn(_state));
}

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * Activează read-only mode cu motivul specificat.
 * Idempotent — apeluri redundante nu produc re-render dacă starea nu se schimbă.
 */
export function triggerReadOnlyMode(reason: ReadOnlyReason): void {
  if (_state.isReadOnly && _state.reason === reason) return;
  _state = { isReadOnly: true, reason };
  _notify();
}

/**
 * Dezactivează read-only mode.
 */
export function clearReadOnlyMode(): void {
  if (!_state.isReadOnly) return;
  _state = { isReadOnly: false, reason: null };
  _notify();
}

/**
 * Hook React — returnează starea curentă.
 * Se re-renderează automat la orice schimbare.
 */
export function useReadOnlyMode(): ReadOnlyState {
  // Lazy initializer — capturează starea curentă la render, fără setState în effect
  const [state, setState] = useState<ReadOnlyState>(() => _state);

  useEffect(() => {
    // Adaugă listener pentru schimbări viitoare — nu apelăm setState sincron
    _listeners.add(setState);
    return () => {
      _listeners.delete(setState);
    };
  }, []);

  return state;
}
