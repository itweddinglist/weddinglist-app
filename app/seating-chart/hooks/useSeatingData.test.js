import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { INITIAL_GUESTS, buildTemplate } from "../utils/geometry.js";
import { loadStorageState } from "../utils/storage.js";
import { calculateMagicFill } from "../utils/magicFill.js";
import { useSeatingData } from "./useSeatingData.js";

vi.mock("../utils/storage.js", () => ({
  loadStorageState: vi.fn(() => ({ data: {}, ok: true, source: "default" })),
  saveStorageState: vi.fn(() => ({ ok: true, error: null })),
}));

vi.mock("../utils/magicFill.js", () => ({
  calculateMagicFill: vi.fn(() => ({
    assignments: {},
    assignmentsCount: 0,
    skippedGuests: [],
    prezidiuSkipped: 0,
    skippedGroups: [],
    limitReached: false,
  })),
}));

// ── Mock localStorage ─────────────────────────────────────────────────────────

function makeMockStorage() {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
}

// ── Shared test refs ──────────────────────────────────────────────────────────

const cam = { vx: 0, vy: 0, z: 1 };
const camRef = { current: { vx: 0, vy: 0, z: 1 } };
const canvasWRef = { current: 1200 };
const canvasHRef = { current: 700 };

function renderData() {
  return renderHook(() => useSeatingData(cam, camRef, canvasWRef, canvasHRef));
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  const mock = makeMockStorage();
  Object.defineProperty(globalThis, "localStorage", {
    value: mock,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, "window", {
    value: globalThis,
    writable: true,
    configurable: true,
  });
  vi.useFakeTimers();
  loadStorageState.mockReturnValue({ data: {}, ok: true, source: "default" });
  calculateMagicFill.mockReturnValue({
    assignments: {},
    assignmentsCount: 0,
    skippedGuests: [],
    prezidiuSkipped: 0,
    skippedGroups: [],
    limitReached: false,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

// ── Test 1 — return shape ─────────────────────────────────────────────────────

describe("useSeatingData — return shape", () => {
  it("returnează toate cheile cerute", () => {
    const { result } = renderData();
    const keys = [
      "guests", "tables", "nextId", "hydrated", "newTableIds",
      "guestsByTable", "realTables", "totalSeats", "assignedCount",
      "unassigned", "progress", "menuStats", "guestMeta", "groupColorMap",
      "tablesRef", "guestsRef", "spawnCounterRef", "setTables",
      "saveAction", "undo", "assignGuest", "unassignGuest", "magicFill",
      "getNextTableName", "createTable", "clearNewTableHighlight",
      "deleteTable", "rotateTable", "saveEdit", "resetPlan",
      "getGuestTableId", "filteredUnassigned",
    ];
    for (const key of keys) {
      expect(result.current).toHaveProperty(key);
    }
  });
});

// ── Test 2 — hydration ────────────────────────────────────────────────────────

describe("useSeatingData — hydration", () => {
  it("hydrated devine true după mount", () => {
    const { result } = renderData();
    expect(result.current.hydrated).toBe(true);
  });

  it("loadStorageState apelat cu dimensiunile canvas", () => {
    renderData();
    expect(loadStorageState).toHaveBeenCalledWith(1200, 700);
  });

  it("state actualizat din storage la hydration", () => {
    const customGuests = [{ ...INITIAL_GUESTS[0], id: 999, prenume: "Test" }];
    const customTables = buildTemplate();
    loadStorageState.mockReturnValueOnce({
      data: { guests: customGuests, tables: customTables, nextId: 50 },
      ok: true,
      source: "storage",
    });
    const { result } = renderData();
    expect(result.current.guests.find((g) => g.id === 999)).toBeTruthy();
    expect(result.current.nextId).toBe(50);
  });

  it("fără date în storage → state rămâne cel default", () => {
    const { result } = renderData();
    expect(result.current.guests.length).toBe(INITIAL_GUESTS.length);
  });
});

// ── Test 3 — saveAction + undo ────────────────────────────────────────────────

describe("useSeatingData — saveAction + undo", () => {
  it("undo fără history → ok:false + SHOW_TOAST yellow", () => {
    const { result } = renderData();
    let res;
    act(() => { res = result.current.undo(); });
    expect(res.ok).toBe(false);
    expect(res.effects[0].type).toBe("SHOW_TOAST");
    expect(res.effects[0].payload.toastType).toBe("yellow");
  });

  it("assignGuest + undo → guest revine neatribuit", () => {
    const { result } = renderData();
    act(() => { result.current.assignGuest(1, 3); });
    expect(result.current.guests.find((g) => g.id === 1).tableId).toBe(3);
    let res;
    act(() => { res = result.current.undo(); });
    expect(res.ok).toBe(true);
    expect(result.current.guests.find((g) => g.id === 1).tableId).toBeNull();
  });

  it("undo ok:true → SHOW_TOAST rose", () => {
    const { result } = renderData();
    act(() => { result.current.assignGuest(1, 3); });
    let res;
    act(() => { res = result.current.undo(); });
    expect(res.effects[0].payload.toastType).toBe("rose");
  });

  it("multiple undo-uri restaurează stările succesiv", () => {
    const { result } = renderData();
    act(() => { result.current.assignGuest(1, 3); });
    act(() => { result.current.assignGuest(2, 3); });
    act(() => { result.current.undo(); });
    expect(result.current.guests.find((g) => g.id === 2).tableId).toBeNull();
    expect(result.current.guests.find((g) => g.id === 1).tableId).toBe(3);
  });
});

// ── Test 4 — assignGuest ──────────────────────────────────────────────────────

describe("useSeatingData — assignGuest", () => {
  it("assign valid → ok:true + guest.tableId setat", () => {
    const { result } = renderData();
    let res;
    act(() => { res = result.current.assignGuest(1, 3); });
    expect(res.ok).toBe(true);
    expect(result.current.guests.find((g) => g.id === 1).tableId).toBe(3);
  });

  it("assign valid → efecte SHOW_TOAST green + CLEAR_CLICKED_SEAT", () => {
    const { result } = renderData();
    let res;
    act(() => { res = result.current.assignGuest(1, 3); });
    const types = res.effects.map((e) => e.type);
    expect(types).toContain("SHOW_TOAST");
    expect(types).toContain("CLEAR_CLICKED_SEAT");
    expect(res.effects.find((e) => e.type === "SHOW_TOAST").payload.toastType).toBe("green");
  });

  it("assign pe masă bar/ring → ok:false", () => {
    const { result } = renderData();
    let res;
    act(() => { res = result.current.assignGuest(1, 1); }); // id 1 = Ring Dans
    expect(res.ok).toBe(false);
    expect(res.effects).toHaveLength(0);
  });

  it("assign guest inexistent → ok:false", () => {
    const { result } = renderData();
    let res;
    act(() => { res = result.current.assignGuest(9999, 3); });
    expect(res.ok).toBe(false);
  });

  it("assign tabel inexistent → ok:false", () => {
    const { result } = renderData();
    let res;
    act(() => { res = result.current.assignGuest(1, 9999); });
    expect(res.ok).toBe(false);
  });

  it("masă plină → ok:false + SHOW_TOAST yellow", () => {
    const fullGuests = INITIAL_GUESTS.map((g, i) =>
      i < 8 ? { ...g, tableId: 3 } : { ...g }
    );
    loadStorageState.mockReturnValueOnce({
      data: { guests: fullGuests, tables: buildTemplate(), nextId: 10 },
      ok: true,
      source: "storage",
    });
    const { result } = renderData();
    let res;
    act(() => { res = result.current.assignGuest(9, 3); }); // guest id 9 (index 8) neatribuit
    expect(res.ok).toBe(false);
    expect(res.effects[0].payload.toastType).toBe("yellow");
  });

  it("assign guest deja la aceeași masă → ok:false", () => {
    const assignedGuests = INITIAL_GUESTS.map((g, i) =>
      i === 0 ? { ...g, tableId: 3 } : { ...g }
    );
    loadStorageState.mockReturnValueOnce({
      data: { guests: assignedGuests, tables: buildTemplate(), nextId: 10 },
      ok: true,
      source: "storage",
    });
    const { result } = renderData();
    let res;
    act(() => { res = result.current.assignGuest(1, 3); }); // deja la masa 3
    expect(res.ok).toBe(false);
  });
});

// ── Test 5 — unassignGuest ────────────────────────────────────────────────────

describe("useSeatingData — unassignGuest", () => {
  it("unassign valid → ok:true + guest.tableId null", () => {
    const assignedGuests = INITIAL_GUESTS.map((g, i) =>
      i === 0 ? { ...g, tableId: 3 } : { ...g }
    );
    loadStorageState.mockReturnValueOnce({
      data: { guests: assignedGuests, tables: buildTemplate(), nextId: 10 },
      ok: true,
      source: "storage",
    });
    const { result } = renderData();
    let res;
    act(() => { res = result.current.unassignGuest(1); });
    expect(res.ok).toBe(true);
    expect(result.current.guests.find((g) => g.id === 1).tableId).toBeNull();
  });

  it("unassign valid → efecte SHOW_TOAST rose + CLEAR_CLICKED_SEAT", () => {
    const assignedGuests = INITIAL_GUESTS.map((g, i) =>
      i === 0 ? { ...g, tableId: 3 } : { ...g }
    );
    loadStorageState.mockReturnValueOnce({
      data: { guests: assignedGuests, tables: buildTemplate(), nextId: 10 },
      ok: true,
      source: "storage",
    });
    const { result } = renderData();
    let res;
    act(() => { res = result.current.unassignGuest(1); });
    const types = res.effects.map((e) => e.type);
    expect(types).toContain("SHOW_TOAST");
    expect(types).toContain("CLEAR_CLICKED_SEAT");
    expect(res.effects.find((e) => e.type === "SHOW_TOAST").payload.toastType).toBe("rose");
  });

  it("unassign null guestId → ok:false", () => {
    const { result } = renderData();
    let res;
    act(() => { res = result.current.unassignGuest(null); });
    expect(res.ok).toBe(false);
  });

  it("unassign guest deja neatribuit → ok:false", () => {
    const { result } = renderData();
    let res;
    act(() => { res = result.current.unassignGuest(1); });
    expect(res.ok).toBe(false);
  });

  it("unassign guest inexistent → ok:false", () => {
    const { result } = renderData();
    let res;
    act(() => { res = result.current.unassignGuest(9999); });
    expect(res.ok).toBe(false);
  });
});

// ── Test 6 — magicFill ────────────────────────────────────────────────────────

describe("useSeatingData — magicFill", () => {
  it("toți invitații au loc → ok:false + SHOW_TOAST yellow", () => {
    const allAssigned = INITIAL_GUESTS.map((g) => ({ ...g, tableId: 3 }));
    loadStorageState.mockReturnValueOnce({
      data: { guests: allAssigned, tables: buildTemplate(), nextId: 10 },
      ok: true,
      source: "storage",
    });
    const { result } = renderData();
    let res;
    act(() => { res = result.current.magicFill(); });
    expect(res.ok).toBe(false);
    expect(res.effects[0].payload.toastType).toBe("yellow");
  });

  it("există neatribuiți → calculateMagicFill apelat + assignments aplicate", () => {
    calculateMagicFill.mockReturnValueOnce({
      assignments: { 1: 3, 2: 3 },
      assignmentsCount: 2,
      skippedGuests: [],
      prezidiuSkipped: 0,
      skippedGroups: [],
      limitReached: false,
    });
    const { result } = renderData();
    let res;
    act(() => { res = result.current.magicFill(); });
    expect(calculateMagicFill).toHaveBeenCalled();
    expect(res.ok).toBe(true);
    expect(result.current.guests.find((g) => g.id === 1).tableId).toBe(3);
    expect(result.current.guests.find((g) => g.id === 2).tableId).toBe(3);
  });

  it("magicFill ok → SHOW_TOAST green cu numărul de invitați", () => {
    calculateMagicFill.mockReturnValueOnce({
      assignments: { 1: 3 },
      assignmentsCount: 1,
      skippedGuests: [],
      prezidiuSkipped: 0,
      skippedGroups: [],
      limitReached: false,
    });
    const { result } = renderData();
    let res;
    act(() => { res = result.current.magicFill(); });
    const toast = res.effects.find(
      (e) => e.type === "SHOW_TOAST" && e.payload.toastType === "green"
    );
    expect(toast).toBeTruthy();
    expect(toast.payload.message).toContain("1");
  });

  it("prezidiuSkipped > 0 → toast suplimentar rose", () => {
    calculateMagicFill.mockReturnValueOnce({
      assignments: { 1: 3 },
      assignmentsCount: 1,
      skippedGuests: [],
      prezidiuSkipped: 2,
      skippedGroups: [],
      limitReached: false,
    });
    const { result } = renderData();
    let res;
    act(() => { res = result.current.magicFill(); });
    const roseToast = res.effects.find(
      (e) => e.type === "SHOW_TOAST" && e.payload.toastType === "rose"
    );
    expect(roseToast).toBeTruthy();
  });

  it("skippedGuests.length > 0 → toast yellow", () => {
    calculateMagicFill.mockReturnValueOnce({
      assignments: { 1: 3 },
      assignmentsCount: 1,
      skippedGuests: [{ id: 2 }],
      prezidiuSkipped: 0,
      skippedGroups: [],
      limitReached: false,
    });
    const { result } = renderData();
    let res;
    act(() => { res = result.current.magicFill(); });
    const yellows = res.effects.filter(
      (e) => e.type === "SHOW_TOAST" && e.payload.toastType === "yellow"
    );
    expect(yellows.length).toBeGreaterThan(0);
  });

  it("limitReached → toast yellow cu mesaj specific", () => {
    calculateMagicFill.mockReturnValueOnce({
      assignments: { 1: 3 },
      assignmentsCount: 1,
      skippedGuests: [],
      prezidiuSkipped: 0,
      skippedGroups: [],
      limitReached: true,
    });
    const { result } = renderData();
    let res;
    act(() => { res = result.current.magicFill(); });
    const limitToast = res.effects.find(
      (e) => e.type === "SHOW_TOAST" && e.payload.message.includes("partiala")
    );
    expect(limitToast).toBeTruthy();
  });
});

// ── Test 7 — createTable ──────────────────────────────────────────────────────

describe("useSeatingData — createTable", () => {
  it("fără nume → ok:false + SHOW_TOAST red", () => {
    const { result } = renderData();
    let res;
    act(() => { res = result.current.createTable({ type: "round", seats: 8, name: "" }); });
    expect(res.ok).toBe(false);
    expect(res.effects[0].payload.toastType).toBe("red");
  });

  it("whitespace-only name → ok:false", () => {
    const { result } = renderData();
    let res;
    act(() => { res = result.current.createTable({ type: "round", seats: 8, name: "   " }); });
    expect(res.ok).toBe(false);
  });

  it("cu nume valid → ok:true + masă adăugată în tables", () => {
    const { result } = renderData();
    const initialCount = result.current.tables.length;
    let res;
    act(() => { res = result.current.createTable({ type: "round", seats: 8, name: "Masa Test" }); });
    expect(res.ok).toBe(true);
    expect(result.current.tables.length).toBe(initialCount + 1);
  });

  it("cu nume valid → efecte SELECT_TABLE + SHOW_TOAST green + CLOSE_MODAL", () => {
    const { result } = renderData();
    let res;
    act(() => { res = result.current.createTable({ type: "round", seats: 8, name: "Masa Test" }); });
    const types = res.effects.map((e) => e.type);
    expect(types).toContain("SELECT_TABLE");
    expect(types).toContain("SHOW_TOAST");
    expect(types).toContain("CLOSE_MODAL");
    expect(res.effects.find((e) => e.type === "SHOW_TOAST").payload.toastType).toBe("green");
  });

  it("tip bar fără nume → ok:true (bar nu necesită nume)", () => {
    const { result } = renderData();
    let res;
    act(() => { res = result.current.createTable({ type: "bar", seats: 0, name: "" }); });
    expect(res.ok).toBe(true);
  });

  it("masă nouă apare cu proprietățile corecte", () => {
    const { result } = renderData();
    act(() => { result.current.createTable({ type: "round", seats: 6, name: "Nova" }); });
    const newTable = result.current.tables.find((t) => t.name === "Nova");
    expect(newTable).toBeTruthy();
    expect(newTable.seats).toBe(6);
    expect(newTable.type).toBe("round");
    expect(newTable.rotation).toBe(0);
  });

  it("nextId crește după createTable", () => {
    const { result } = renderData();
    const initialNextId = result.current.nextId;
    act(() => { result.current.createTable({ type: "round", seats: 8, name: "Test" }); });
    expect(result.current.nextId).toBe(initialNextId + 1);
  });
});

// ── Test 8 — deleteTable ──────────────────────────────────────────────────────

describe("useSeatingData — deleteTable", () => {
  it("masă inexistentă → ok:false", () => {
    const { result } = renderData();
    let res;
    act(() => { res = result.current.deleteTable(9999); });
    expect(res.ok).toBe(false);
  });

  it("masă existentă → returnează confirmRequired cu titlu", () => {
    const { result } = renderData();
    let res;
    act(() => { res = result.current.deleteTable(3); });
    expect(res.ok).toBe(true);
    expect(res.confirmRequired).toBeTruthy();
    expect(res.confirmRequired.title).toContain("Masa 1");
    expect(typeof res.confirmRequired.onConfirm).toBe("function");
  });

  it("onConfirm → masa dispare din tables", () => {
    const { result } = renderData();
    let deleteRes;
    act(() => { deleteRes = result.current.deleteTable(3); });
    act(() => { deleteRes.confirmRequired.onConfirm(); });
    expect(result.current.tables.find((t) => t.id === 3)).toBeUndefined();
  });

  it("onConfirm → invitatii de la masă revin neatribuiți", () => {
    const assignedGuests = INITIAL_GUESTS.map((g, i) =>
      i === 0 ? { ...g, tableId: 3 } : { ...g }
    );
    loadStorageState.mockReturnValueOnce({
      data: { guests: assignedGuests, tables: buildTemplate(), nextId: 10 },
      ok: true,
      source: "storage",
    });
    const { result } = renderData();
    let deleteRes;
    act(() => { deleteRes = result.current.deleteTable(3); });
    act(() => { deleteRes.confirmRequired.onConfirm(); });
    expect(result.current.guests.find((g) => g.id === 1).tableId).toBeNull();
  });

  it("onConfirm returnează efecte CLOSE_EDIT_PANEL + SELECT_TABLE(null) + SHOW_TOAST red", () => {
    const { result } = renderData();
    let deleteRes;
    act(() => { deleteRes = result.current.deleteTable(3); });
    let confirmRes;
    act(() => { confirmRes = deleteRes.confirmRequired.onConfirm(); });
    expect(confirmRes.ok).toBe(true);
    const types = confirmRes.effects.map((e) => e.type);
    expect(types).toContain("CLOSE_EDIT_PANEL");
    expect(types).toContain("SELECT_TABLE");
    expect(types).toContain("SHOW_TOAST");
    expect(confirmRes.effects.find((e) => e.type === "SHOW_TOAST").payload.toastType).toBe("red");
    expect(confirmRes.effects.find((e) => e.type === "SELECT_TABLE").payload.tableId).toBeNull();
  });

  it("ring → sub-text specific", () => {
    const { result } = renderData();
    let res;
    act(() => { res = result.current.deleteTable(1); }); // Ring Dans
    expect(res.confirmRequired.sub).toContain("Ring");
  });
});

// ── Test 9 — rotateTable ──────────────────────────────────────────────────────

describe("useSeatingData — rotateTable", () => {
  it("rotateTable(3, 90) → rotation devine 90", () => {
    const { result } = renderData();
    act(() => { result.current.rotateTable(3, 90); });
    expect(result.current.tables.find((t) => t.id === 3).rotation).toBe(90);
  });

  it("rotateTable(3, 360) → rotation rămâne 0", () => {
    const { result } = renderData();
    act(() => { result.current.rotateTable(3, 360); });
    expect(result.current.tables.find((t) => t.id === 3).rotation).toBe(0);
  });

  it("rotateTable(3, -90) → rotation devine 270", () => {
    const { result } = renderData();
    act(() => { result.current.rotateTable(3, -90); });
    expect(result.current.tables.find((t) => t.id === 3).rotation).toBe(270);
  });

  it("rotateTable → returnează ok:true + effects gol", () => {
    const { result } = renderData();
    let res;
    act(() => { res = result.current.rotateTable(3, 45); });
    expect(res.ok).toBe(true);
    expect(res.effects).toHaveLength(0);
  });
});

// ── Test 10 — saveEdit ────────────────────────────────────────────────────────

describe("useSeatingData — saveEdit", () => {
  it("editName gol → ok:false", () => {
    const { result } = renderData();
    let res;
    act(() => { res = result.current.saveEdit("", 8, 3); });
    expect(res.ok).toBe(false);
  });

  it("editName whitespace → ok:false", () => {
    const { result } = renderData();
    let res;
    act(() => { res = result.current.saveEdit("   ", 8, 3); });
    expect(res.ok).toBe(false);
  });

  it("saveEdit valid → tabelă actualizată cu noul nume și scaune", () => {
    const { result } = renderData();
    act(() => { result.current.saveEdit("Masa Actualizată", 10, 3); });
    const updated = result.current.tables.find((t) => t.id === 3);
    expect(updated.name).toBe("Masa Actualizată");
    expect(updated.seats).toBe(10);
  });

  it("saveEdit → ok:true + efecte CLOSE_EDIT_PANEL + SHOW_TOAST rose", () => {
    const { result } = renderData();
    let res;
    act(() => { res = result.current.saveEdit("Test", 8, 3); });
    expect(res.ok).toBe(true);
    const types = res.effects.map((e) => e.type);
    expect(types).toContain("CLOSE_EDIT_PANEL");
    expect(types).toContain("SHOW_TOAST");
    expect(res.effects.find((e) => e.type === "SHOW_TOAST").payload.toastType).toBe("rose");
  });
});

// ── Test 11 — guestsByTable ───────────────────────────────────────────────────

describe("useSeatingData — guestsByTable", () => {
  it("fără assignate → map gol", () => {
    const { result } = renderData();
    expect(Object.keys(result.current.guestsByTable).length).toBe(0);
  });

  it("cu 2 invitați la masa 3 → guestsByTable[3].length === 2", () => {
    const guests = INITIAL_GUESTS.map((g, i) =>
      i < 2 ? { ...g, tableId: 3 } : { ...g }
    );
    loadStorageState.mockReturnValueOnce({
      data: { guests, tables: buildTemplate(), nextId: 10 },
      ok: true,
      source: "storage",
    });
    const { result } = renderData();
    expect(result.current.guestsByTable[3]).toHaveLength(2);
  });

  it("invitații neatribuiți nu apar în guestsByTable", () => {
    const { result } = renderData();
    for (const key of Object.keys(result.current.guestsByTable)) {
      for (const g of result.current.guestsByTable[key]) {
        expect(g.tableId).not.toBeNull();
      }
    }
  });

  it("invitați la mese diferite → grupați separat", () => {
    const guests = INITIAL_GUESTS.map((g, i) => {
      if (i < 2) return { ...g, tableId: 3 };
      if (i < 4) return { ...g, tableId: 4 };
      return { ...g };
    });
    loadStorageState.mockReturnValueOnce({
      data: { guests, tables: buildTemplate(), nextId: 10 },
      ok: true,
      source: "storage",
    });
    const { result } = renderData();
    expect(result.current.guestsByTable[3]).toHaveLength(2);
    expect(result.current.guestsByTable[4]).toHaveLength(2);
  });
});

// ── Test 12 — stats ───────────────────────────────────────────────────────────

describe("useSeatingData — stats", () => {
  it("assignedCount = 0 când toți neatribuiti", () => {
    const { result } = renderData();
    expect(result.current.assignedCount).toBe(0);
  });

  it("assignedCount crește după assignGuest", () => {
    const { result } = renderData();
    act(() => { result.current.assignGuest(1, 3); });
    expect(result.current.assignedCount).toBe(1);
  });

  it("totalSeats = suma scaunelor din mese reale (32 pentru buildTemplate)", () => {
    const { result } = renderData();
    // Prezidiu(8) + Masa 1(8) + Masa 2(8) + Masa 3(8) = 32
    expect(result.current.totalSeats).toBe(32);
  });

  it("realTables exclude bar și ring", () => {
    const { result } = renderData();
    expect(result.current.realTables.every((t) => t.type !== "bar" && !t.isRing)).toBe(true);
  });

  it("progress = 0 când toți neatribuiti", () => {
    const { result } = renderData();
    expect(result.current.progress).toBe(0);
  });

  it("progress = 100 când toți asignati", () => {
    const allAssigned = INITIAL_GUESTS.map((g) => ({ ...g, tableId: 3 }));
    loadStorageState.mockReturnValueOnce({
      data: { guests: allAssigned, tables: buildTemplate(), nextId: 10 },
      ok: true,
      source: "storage",
    });
    const { result } = renderData();
    expect(result.current.progress).toBe(100);
  });

  it("menuStats calculat corect", () => {
    const { result } = renderData();
    // INITIAL_GUESTS: Standard x8, Vegetarian x2, Vegan x1, Fără gluten x1
    expect(result.current.menuStats["Standard"]).toBe(8);
    expect(result.current.menuStats["Vegetarian"]).toBe(2);
    expect(result.current.menuStats["Vegan"]).toBe(1);
    expect(result.current.menuStats["Fără gluten"]).toBe(1);
  });

  it("guestMeta.total === INITIAL_GUESTS.length", () => {
    const { result } = renderData();
    expect(result.current.guestMeta.total).toBe(INITIAL_GUESTS.length);
  });

  it("guestMeta.unseated = number of unassigned guests", () => {
    const { result } = renderData();
    expect(result.current.guestMeta.unseated).toBe(INITIAL_GUESTS.length);
  });

  it("guestMeta.groups include grupurile unice", () => {
    const { result } = renderData();
    const groupNames = result.current.guestMeta.groups.map((g) => g.name);
    expect(groupNames).toContain("Familie Mireasă");
    expect(groupNames).toContain("Familie Mire");
    expect(groupNames).toContain("Prezidiu");
  });

  it("unassigned = toți invitații când neatribuiți", () => {
    const { result } = renderData();
    expect(result.current.unassigned.length).toBe(INITIAL_GUESTS.length);
  });

  it("unassigned scade după assignGuest", () => {
    const { result } = renderData();
    act(() => { result.current.assignGuest(1, 3); });
    expect(result.current.unassigned.length).toBe(INITIAL_GUESTS.length - 1);
  });
});

// ── Test 13 — filteredUnassigned ──────────────────────────────────────────────

describe("useSeatingData — filteredUnassigned", () => {
  it("string gol → toți neatribuiții", () => {
    const { result } = renderData();
    expect(result.current.filteredUnassigned("").length).toBe(INITIAL_GUESTS.length);
  });

  it("null/undefined → toți neatribuiții", () => {
    const { result } = renderData();
    expect(result.current.filteredUnassigned(null).length).toBe(INITIAL_GUESTS.length);
    expect(result.current.filteredUnassigned(undefined).length).toBe(INITIAL_GUESTS.length);
  });

  it("query pe prenume → rezultate filtrate", () => {
    const { result } = renderData();
    const res = result.current.filteredUnassigned("Ion");
    expect(res.length).toBeGreaterThanOrEqual(1);
    expect(
      res.every((g) =>
        `${g.prenume} ${g.nume} ${g.grup}`.toLowerCase().includes("ion")
      )
    ).toBe(true);
  });

  it("query case-insensitive", () => {
    const { result } = renderData();
    const lower = result.current.filteredUnassigned("ion");
    const upper = result.current.filteredUnassigned("ION");
    expect(lower.length).toBe(upper.length);
  });

  it("query fără match → array gol", () => {
    const { result } = renderData();
    expect(result.current.filteredUnassigned("XYZ_INEXISTENT")).toHaveLength(0);
  });

  it("invitații asignați nu apar în rezultate", () => {
    const { result } = renderData();
    act(() => { result.current.assignGuest(1, 3); });
    const res = result.current.filteredUnassigned("");
    expect(res.find((g) => g.id === 1)).toBeUndefined();
  });

  it("query pe grup → filtrat corect", () => {
    const { result } = renderData();
    const res = result.current.filteredUnassigned("Prezidiu");
    expect(res.every((g) => g.grup === "Prezidiu")).toBe(true);
    expect(res.length).toBe(2); // Mihai Stoica + Carmen Florescu
  });
});

// ── Test 14 — getGuestTableId ─────────────────────────────────────────────────

describe("useSeatingData — getGuestTableId", () => {
  it("guest neatribuit → null", () => {
    const { result } = renderData();
    expect(result.current.getGuestTableId(1)).toBeNull();
  });

  it("guest atribuit → tableId corect", () => {
    const { result } = renderData();
    act(() => { result.current.assignGuest(1, 3); });
    expect(result.current.getGuestTableId(1)).toBe(3);
  });

  it("guest inexistent → null", () => {
    const { result } = renderData();
    expect(result.current.getGuestTableId(9999)).toBeNull();
  });
});
