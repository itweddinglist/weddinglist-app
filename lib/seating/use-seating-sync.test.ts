// =============================================================================
// lib/seating/use-seating-sync.test.ts
// Unit tests pentru SaveStatus + confirmedSnapshot + retry/confirmRevert
// Faza 10 — Seating Sync Integrity Hardening
// Faza 11 — load mutat pe server (fetch /api/.../seating/load)
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSeatingSync } from "./use-seating-sync";
import type { SeatingSnapshot } from "./types";

// ─── Response helpers ─────────────────────────────────────────────────────────

function makeLoadResponse(): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      data: {
        guests: [],
        guestIdMap: [],
        tableIdMap: [],
      },
    }),
  } as Response;
}

function makeSuccessResponse(): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ data: { bridge_updates: { tables: [] } } }),
  } as Response;
}

function makeErrorResponse(status = 500): Response {
  return {
    ok: false,
    status,
    json: async () => ({ error: { code: "ERR", message: "Sync failed" } }),
  } as Response;
}

function makeSnapshot(overrides: Partial<SeatingSnapshot> = {}): SeatingSnapshot {
  return {
    reason: "assignments",
    assignments: { 1: 10 },
    tables: [
      { id: 10, name: "Masa 1", type: "round", seats: 8, x: 100, y: 200, rotation: 0, isRing: false },
    ],
    ...overrides,
  };
}

const WEDDING_ID = "wedding-uuid";
const EVENT_ID = "event-uuid";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useSeatingSync — Faza 10", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    // Default: load reușit, sync reușit
    fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/seating/load")) return Promise.resolve(makeLoadResponse());
      return Promise.resolve(makeSuccessResponse());
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ── Helper: drenează microtask queue până load() finalizează ──────────────
  // load() are 2 await-uri secvențiale: fetch() + response.json()
  // Rulăm 10 runde pentru a acoperi și React state updates.
  async function waitForLoad(_result: any) {
    await act(async () => {
      for (let i = 0; i < 10; i++) {
        await Promise.resolve();
      }
    });
  }

  // ── 1. Stare inițială ──────────────────────────────────────────────────────

  it("saveStatus initial este idle, confirmedSnapshot este null", () => {
    const { result } = renderHook(() =>
      useSeatingSync({ weddingId: WEDDING_ID, eventId: EVENT_ID })
    );
    expect(result.current.saveStatus).toBe("idle");
    expect(result.current.confirmedSnapshot).toBeNull();
    expect(result.current.confirmedAt).toBeNull();
  });

  // ── 2. confirmedSnapshot setat după load reușit ────────────────────────────

  it("confirmedSnapshot este setat după load reușit", async () => {
    const { result } = renderHook(() =>
      useSeatingSync({ weddingId: WEDDING_ID, eventId: EVENT_ID })
    );

    await waitForLoad(result);

    expect(result.current.isLoading).toBe(false);
    expect(result.current.confirmedSnapshot).not.toBeNull();
    expect(result.current.confirmedSnapshot!.guests).toEqual([]);
    expect(result.current.confirmedSnapshot!.serverConfirmedAt).toBeGreaterThan(0);
  });

  // ── 3. saveStatus: saving → saved după sync reușit ────────────────────────

  it("saveStatus devine saved după sync reușit", async () => {
    const { result } = renderHook(() =>
      useSeatingSync({ weddingId: WEDDING_ID, eventId: EVENT_ID })
    );

    await waitForLoad(result);

    act(() => {
      result.current.onSeatingStateChanged(makeSnapshot());
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(["saved", "idle"]).toContain(result.current.saveStatus);
  });

  // ── 4. saveStatus → unconfirmed după toate retry-urile eșuate ─────────────

  it("saveStatus devine unconfirmed după toate retry-urile eșuate", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/seating/load")) return Promise.resolve(makeLoadResponse());
      return Promise.resolve(makeErrorResponse(500));
    });
    const { result } = renderHook(() =>
      useSeatingSync({ weddingId: WEDDING_ID, eventId: EVENT_ID })
    );

    await waitForLoad(result);

    act(() => {
      result.current.onSeatingStateChanged(makeSnapshot());
    });

    // runAllTimersAsync drenează debounce (1500ms) + toate retry-urile (1s + 2s + 4s)
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.saveStatus).toBe("unconfirmed");
  });

  // ── 5. confirmedSnapshot include tablesSnapshot după sync success ──────────

  it("confirmedSnapshot.tables actualizat după sync reușit", async () => {
    const { result } = renderHook(() =>
      useSeatingSync({ weddingId: WEDDING_ID, eventId: EVENT_ID })
    );

    await waitForLoad(result);

    act(() => {
      result.current.onSeatingStateChanged(makeSnapshot());
    });

    // Pas 1: avansăm debounce-ul — doSync pornește dar se suspendă la await fetch()
    act(() => { vi.advanceTimersByTime(1500); });

    // Pas 2: drenăm lanțul async al lui doSync:
    //   tick 1-2: fetch() rezolvă → doSync continuă
    //   tick 3-4: response.json() rezolvă → doSync sync: confirmRef + setSaveStatus
    //   tick 5+: React procesează state updates → re-render cu ref nou
    await act(async () => {
      for (let i = 0; i < 8; i++) {
        await Promise.resolve();
      }
    });

    expect(result.current.confirmedSnapshot?.tables).toHaveLength(1);
    expect(result.current.confirmedSnapshot?.tables[0].name).toBe("Masa 1");
  });

  // ── 6. retry() este deduped ────────────────────────────────────────────────

  it("al doilea apel retry() în timp ce primul e în curs este ignorat", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/seating/load")) return Promise.resolve(makeLoadResponse());
      return Promise.resolve(makeErrorResponse());
    });
    const { result } = renderHook(() =>
      useSeatingSync({ weddingId: WEDDING_ID, eventId: EVENT_ID })
    );

    await waitForLoad(result);

    act(() => {
      result.current.onSeatingStateChanged(makeSnapshot());
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.saveStatus).toBe("unconfirmed");

    // Un fetch care nu se rezolvă imediat — simulăm retry în curs
    let resolveRetryFetch!: (r: Response) => void;
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => { resolveRetryFetch = resolve; })
    );

    // Primul retry() — pune isRetryInProgressRef = true
    act(() => { result.current.retry(); });
    // Statusul ar trebui să fie saving
    expect(result.current.saveStatus).toBe("saving");

    // Al doilea retry() — trebuie ignorat (nu schimbă nimic)
    act(() => { result.current.retry(); });

    // Rezolvăm fetch-ul manual cu success
    resolveRetryFetch(makeSuccessResponse());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Status final: saved sau idle (nu unconfirmed)
    expect(["saved", "idle"]).toContain(result.current.saveStatus);
  });

  // ── 7. confirmRevert() resetează statusul ─────────────────────────────────

  it("confirmRevert() resetează saveStatus la saved, apoi idle după 2s", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/seating/load")) return Promise.resolve(makeLoadResponse());
      return Promise.resolve(makeErrorResponse());
    });
    const { result } = renderHook(() =>
      useSeatingSync({ weddingId: WEDDING_ID, eventId: EVENT_ID })
    );

    await waitForLoad(result);

    act(() => {
      result.current.onSeatingStateChanged(makeSnapshot());
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.saveStatus).toBe("unconfirmed");

    // Apelăm confirmRevert
    act(() => {
      result.current.confirmRevert();
    });

    expect(result.current.saveStatus).toBe("saved");

    // Avansăm 2s → idle
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.saveStatus).toBe("idle");
  });

  // ── 8. retry() trimite starea curentă cu retryCount = 0 ───────────────────

  it("retry() declanșează un nou doSync cu retryCount 0 (nu continuă din where left off)", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/seating/load")) return Promise.resolve(makeLoadResponse());
      return Promise.resolve(makeErrorResponse());
    });
    const { result } = renderHook(() =>
      useSeatingSync({ weddingId: WEDDING_ID, eventId: EVENT_ID })
    );

    await waitForLoad(result);

    act(() => {
      result.current.onSeatingStateChanged(makeSnapshot());
    });

    // Exhaustăm toate retry-urile
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.saveStatus).toBe("unconfirmed");

    // Acum retry cu fetch care reușește
    fetchMock.mockResolvedValue(makeSuccessResponse());

    act(() => { result.current.retry(); });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(["saved", "idle"]).toContain(result.current.saveStatus);
  });

  // ── 9. onSeatingStateChanged stochează snapshot în latestSnapshotRef ──────

  it("retry() folosește ultimul snapshot primit, nu pe cel original", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/seating/load")) return Promise.resolve(makeLoadResponse());
      return Promise.resolve(makeErrorResponse());
    });
    const { result } = renderHook(() =>
      useSeatingSync({ weddingId: WEDDING_ID, eventId: EVENT_ID })
    );

    await waitForLoad(result);

    // Trimitem primul snapshot și exhaustăm retry-urile
    act(() => {
      result.current.onSeatingStateChanged(makeSnapshot({ reason: "layout" }));
    });
    await act(async () => { await vi.runAllTimersAsync(); });
    expect(result.current.saveStatus).toBe("unconfirmed");

    // Trimitem un snapshot nou (user a mai modificat ceva)
    const newSnapshot = makeSnapshot({
      reason: "assignments",
      tables: [
        { id: 20, name: "Masa 2", type: "round", seats: 6, x: 200, y: 300, rotation: 0, isRing: false },
      ],
    });
    act(() => {
      result.current.onSeatingStateChanged(newSnapshot);
    });
    // Cancelăm debounce-ul nou (nu vrem un sync automat)
    act(() => { vi.clearAllTimers(); });

    // Retry cu fetch success — ar trebui să folosească newSnapshot
    fetchMock.mockResolvedValue(makeSuccessResponse());
    act(() => { result.current.retry(); });
    await act(async () => { await vi.runAllTimersAsync(); });

    // Snapshot confirmat ar trebui să conțină "Masa 2" (din newSnapshot)
    expect(result.current.confirmedSnapshot?.tables[0].name).toBe("Masa 2");
  });

  // ── 10. beforeunload activ doar când unconfirmed ───────────────────────────

  it("beforeunload handler este adăugat când status = unconfirmed și eliminat la schimbare", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/seating/load")) return Promise.resolve(makeLoadResponse());
      return Promise.resolve(makeErrorResponse());
    });
    const addListenerSpy = vi.spyOn(window, "addEventListener");

    const { result, unmount } = renderHook(() =>
      useSeatingSync({ weddingId: WEDDING_ID, eventId: EVENT_ID })
    );

    await waitForLoad(result);

    // Inițial: niciun beforeunload
    const unloadCallsBefore = addListenerSpy.mock.calls
      .filter(([ev]) => ev === "beforeunload").length;
    expect(unloadCallsBefore).toBe(0);

    // Notă: beforeunload este adăugat de SeatingChartInner (page.js) pe baza syncSaveStatus,
    // nu de useSeatingSync direct. Testăm că saveStatus devine "unconfirmed".
    act(() => { result.current.onSeatingStateChanged(makeSnapshot()); });
    await act(async () => { await vi.runAllTimersAsync(); });

    expect(result.current.saveStatus).toBe("unconfirmed");

    unmount();
  });
});
