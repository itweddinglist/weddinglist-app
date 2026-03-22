import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGuests } from "./useGuests.js";
import { buildTemplate } from "../utils/geometry.js";
import { STORAGE_KEY } from "../utils/storage.js";

// ── Mock localStorage ─────────────────────────────────────────────────────────

function makeMockStorage() {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, val) => {
      store[key] = String(val);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
}

const DEFAULT_CAM = { vx: 4500, vy: 4500, z: 0.8 };

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
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Test 1 — return shape ─────────────────────────────────────────────────────

describe("useGuests — return shape", () => {
  it("returnează toate cheile cerute", () => {
    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    const keys = [
      "guests",
      "tables",
      "nextId",
      "hydrated",
      "guestsRef",
      "tablesRef",
      "spawnCounterRef",
      "guestsByTable",
      "realTables",
      "totalSeats",
      "assignedCount",
      "unassigned",
      "filteredUnassigned",
      "progress",
      "menuStats",
      "toasts",
      "searchQuery",
      "setSearchQuery",
      "lockMode",
      "setLockMode",
      "showStats",
      "setShowStats",
      "showCatering",
      "setShowCatering",
      "showToast",
      "saveAction",
      "undo",
      "assignGuest",
      "unassignGuest",
      "magicFill",
      "createTable",
      "deleteTable",
      "rotateTable",
      "saveEdit",
      "getNextTableName",
      "modal",
      "setModal",
      "editPanel",
      "setEditPanel",
      "editName",
      "setEditName",
      "editSeats",
      "setEditSeats",
      "confirmDialog",
      "setConfirmDialog",
      "selectedTableId",
      "setSelectedTableId",
      "clickedSeat",
      "setClickedSeat",
      "hoveredGuest",
      "setHoveredGuest",
      "dragOver",
      "setDragOver",
      "isDraggingGuest",
      "setIsDraggingGuest",
    ];
    keys.forEach((k) => expect(result.current).toHaveProperty(k));
  });
});

// ── Test 2 — hydration ────────────────────────────────────────────────────────

describe("useGuests — hydration", () => {
  it("hydrated === true după mount", () => {
    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    expect(result.current.hydrated).toBe(true);
  });

  it("guests.length > 0 după mount", () => {
    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    expect(result.current.guests.length).toBeGreaterThan(0);
  });

  it("tables.length > 0 după mount", () => {
    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    expect(result.current.tables.length).toBeGreaterThan(0);
  });
});

// ── Test 3 — hydration din storage ───────────────────────────────────────────

describe("useGuests — hydration din storage", () => {
  it("guests și tables vin din storage dacă există date valide", () => {
    const tables = buildTemplate();
    const guests = [
      {
        id: 1,
        prenume: "Test",
        nume: "User",
        grup: "Familie Mireasă",
        status: "confirmat",
        meniu: "Standard",
        tableId: null,
      },
    ];
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ guests, tables, nextId: 5, cam: DEFAULT_CAM })
    );

    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    expect(result.current.guests).toHaveLength(1);
    expect(result.current.guests[0].prenume).toBe("Test");
    expect(result.current.tables).toHaveLength(tables.length);
  });
});

// ── Test 4 — save effect ──────────────────────────────────────────────────────

describe("useGuests — save effect", () => {
  it("saveStorageState apelat după modificare guests", async () => {
    const storageModule = await import("../utils/storage.js");
    const saveSpy = vi.spyOn(storageModule, "saveStorageState");

    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    act(() => {
      result.current.setSearchQuery("test");
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(saveSpy).toHaveBeenCalled();
    const lastCall = saveSpy.mock.calls[saveSpy.mock.calls.length - 1][0];
    expect(lastCall).toHaveProperty("guests");
    expect(lastCall).toHaveProperty("tables");
    expect(lastCall).toHaveProperty("nextId");
    expect(lastCall).toHaveProperty("cam");
  });
});

// ── Test 5 — showToast ────────────────────────────────────────────────────────

describe("useGuests — showToast", () => {
  it("showToast adaugă toast în toasts", () => {
    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    act(() => {
      result.current.showToast("Mesaj test", "green");
    });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].msg).toBe("Mesaj test");
  });

  it("toast dispare după 2800ms", () => {
    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    act(() => {
      result.current.showToast("Mesaj test", "green");
    });
    expect(result.current.toasts).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(2800);
    });
    expect(result.current.toasts).toHaveLength(0);
  });
});

// ── Test 6 — saveAction + undo ────────────────────────────────────────────────

describe("useGuests — saveAction + undo", () => {
  it("saveAction salvează snapshot și undo îl restaurează", () => {
    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    const originalGuests = result.current.guests;

    act(() => {
      result.current.saveAction();
    });
    act(() => {
      result.current.assignGuest(
        result.current.guests[0].id,
        result.current.tables.find((t) => t.type !== "bar" && !t.isRing)?.id
      );
    });

    act(() => {
      result.current.undo();
    });
    expect(result.current.guests[0].tableId).toBe(originalGuests[0].tableId);
  });

  it("undo pe history gol → toast Nimic de anulat", () => {
    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    act(() => {
      result.current.undo();
    });
    expect(result.current.toasts[0]?.msg).toBe("Nimic de anulat");
  });
});

// ── Test 7 — assignGuest ──────────────────────────────────────────────────────

describe("useGuests — assignGuest", () => {
  it("guest neatribuit → atribuit la masă", () => {
    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    const table = result.current.tables.find((t) => t.type !== "bar" && !t.isRing);
    const guest = result.current.guests.find((g) => !g.tableId);

    act(() => {
      result.current.assignGuest(guest.id, table.id);
    });
    expect(result.current.guests.find((g) => g.id === guest.id).tableId).toBe(table.id);
  });

  it("masă plină → toast Masa este plină!", () => {
    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    const table = result.current.tables.find((t) => t.type !== "bar" && !t.isRing);

    act(() => {
      result.current.guests.slice(0, table.seats).forEach((g) => {
        result.current.assignGuest(g.id, table.id);
      });
    });

    const remaining = result.current.guests.find((g) => !g.tableId);
    if (remaining) {
      act(() => {
        result.current.assignGuest(remaining.id, table.id);
      });
      const toastMsgs = result.current.toasts.map((t) => t.msg);
      expect(toastMsgs).toContain("Masa este plină!");
    }
  });

  it("masă de tip bar → ignorat", () => {
    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    const bar = result.current.tables.find((t) => t.type === "bar");
    const guest = result.current.guests[0];

    if (bar) {
      act(() => {
        result.current.assignGuest(guest.id, bar.id);
      });
      expect(result.current.guests.find((g) => g.id === guest.id).tableId).toBeNull();
    }
  });
});

// ── Test 8 — unassignGuest ────────────────────────────────────────────────────

describe("useGuests — unassignGuest", () => {
  it("guest atribuit → tableId devine null", () => {
    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    const table = result.current.tables.find((t) => t.type !== "bar" && !t.isRing);
    const guest = result.current.guests[0];

    act(() => {
      result.current.assignGuest(guest.id, table.id);
    });
    act(() => {
      result.current.unassignGuest(guest.id);
    });
    expect(result.current.guests.find((g) => g.id === guest.id).tableId).toBeNull();
  });

  it("guest neatribuit → nimic nu se întâmplă", () => {
    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    const guest = result.current.guests.find((g) => !g.tableId);
    const toastsBefore = result.current.toasts.length;

    act(() => {
      result.current.unassignGuest(guest.id);
    });
    expect(result.current.toasts.length).toBe(toastsBefore);
  });
});

// ── Test 9 — magicFill ────────────────────────────────────────────────────────

describe("useGuests — magicFill", () => {
  it("guests neatribuiți → atribuiți la mese", () => {
    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    act(() => {
      result.current.magicFill();
    });
    const toastMsg = result.current.toasts.find((t) => t.msg.includes("invitați așezați"));
    expect(toastMsg).toBeTruthy();
    expect(result.current.guests.some((g) => g.tableId !== null)).toBe(true);
  });

  it("dacă nu există unassigned → toast", () => {
    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    act(() => {
      result.current.magicFill();
    });
    act(() => {
      vi.advanceTimersByTime(2800);
    });
    act(() => {
      result.current.magicFill();
    });
    expect(result.current.toasts.some((t) => t.msg.includes("deja un loc"))).toBe(true);
  });
});

// ── Test 10 — createTable ─────────────────────────────────────────────────────

describe("useGuests — createTable", () => {
  it("masă nouă adăugată în tables", () => {
    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    const countBefore = result.current.tables.length;

    act(() => {
      result.current.setModal({ type: "round", name: "Masa Test", seats: 8 });
    });
    act(() => {
      result.current.createTable();
    });

    expect(result.current.tables.length).toBe(countBefore + 1);
    expect(result.current.tables.find((t) => t.name === "Masa Test")).toBeTruthy();
  });

  it("nextId incrementat după createTable", () => {
    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    const idBefore = result.current.nextId;

    act(() => {
      result.current.setModal({ type: "round", name: "Masa Test", seats: 8 });
    });
    act(() => {
      result.current.createTable();
    });

    expect(result.current.nextId).toBe(idBefore + 1);
  });

  it("fără name → toast eroare", () => {
    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    act(() => {
      result.current.setModal({ type: "round", name: "", seats: 8 });
    });
    act(() => {
      result.current.createTable();
    });
    expect(result.current.toasts.some((t) => t.msg.includes("Introdu"))).toBe(true);
  });
});

// ── Test 11 — deleteTable ─────────────────────────────────────────────────────

describe("useGuests — deleteTable", () => {
  it("setConfirmDialog apelat cu title corect", () => {
    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    const table = result.current.tables.find((t) => t.type !== "bar" && !t.isRing);

    act(() => {
      result.current.deleteTable(table.id);
    });
    expect(result.current.confirmDialog).not.toBeNull();
    expect(result.current.confirmDialog.title).toContain(table.name);
  });

  it("după onOk: table ștearsă, guests unassigned", () => {
    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    const table = result.current.tables.find((t) => t.type !== "bar" && !t.isRing);
    const guest = result.current.guests[0];

    act(() => {
      result.current.assignGuest(guest.id, table.id);
    });
    act(() => {
      result.current.deleteTable(table.id);
    });
    act(() => {
      result.current.confirmDialog.onOk();
    });

    expect(result.current.tables.find((t) => t.id === table.id)).toBeUndefined();
    expect(result.current.guests.find((g) => g.id === guest.id).tableId).toBeNull();
  });
});

// ── Test 12 — rotateTable ─────────────────────────────────────────────────────

describe("useGuests — rotateTable", () => {
  it("rotation incrementat cu deg % 360", () => {
    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    const table = result.current.tables.find((t) => t.type !== "bar" && !t.isRing);

    act(() => {
      result.current.rotateTable(table.id, 90);
    });
    expect(result.current.tables.find((t) => t.id === table.id).rotation).toBe(90);

    act(() => {
      result.current.rotateTable(table.id, 300);
    });
    expect(result.current.tables.find((t) => t.id === table.id).rotation).toBe(390 % 360);
  });
});

// ── Test 13 — guestsByTable ───────────────────────────────────────────────────

describe("useGuests — guestsByTable", () => {
  it("guests atribuiți apar în guestsByTable[tableId]", () => {
    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    const table = result.current.tables.find((t) => t.type !== "bar" && !t.isRing);
    const guest = result.current.guests[0];

    act(() => {
      result.current.assignGuest(guest.id, table.id);
    });
    expect(result.current.guestsByTable[table.id]).toBeDefined();
    expect(result.current.guestsByTable[table.id].some((g) => g.id === guest.id)).toBe(true);
  });
});

// ── Test 14 — stats ───────────────────────────────────────────────────────────

describe("useGuests — stats", () => {
  it("totalSeats === suma seats din realTables", () => {
    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    const expected = result.current.realTables.reduce((s, t) => s + t.seats, 0);
    expect(result.current.totalSeats).toBe(expected);
  });

  it("progress === assignedCount/guests.length * 100", () => {
    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    const table = result.current.tables.find((t) => t.type !== "bar" && !t.isRing);

    act(() => {
      result.current.assignGuest(result.current.guests[0].id, table.id);
    });
    const expected = (result.current.assignedCount / result.current.guests.length) * 100;
    expect(result.current.progress).toBeCloseTo(expected, 3);
  });
});

// ── Test 15 — filteredUnassigned ──────────────────────────────────────────────

describe("useGuests — filteredUnassigned", () => {
  it("searchQuery filtrează după prenume", () => {
    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    const firstName = result.current.guests[0].prenume;

    act(() => {
      result.current.setSearchQuery(firstName);
    });
    expect(
      result.current.filteredUnassigned.every((g) =>
        `${g.prenume} ${g.nume} ${g.grup}`.toLowerCase().includes(firstName.toLowerCase())
      )
    ).toBe(true);
  });

  it("searchQuery gol → toți unassigned", () => {
    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    act(() => {
      result.current.setSearchQuery("");
    });
    expect(result.current.filteredUnassigned).toEqual(result.current.unassigned);
  });
});

// ── Test 16 — saveEdit ────────────────────────────────────────────────────────

describe("useGuests — saveEdit", () => {
  it("table name și seats actualizate", () => {
    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    const table = result.current.tables.find((t) => t.type !== "bar" && !t.isRing);

    act(() => {
      result.current.setEditPanel({ tableId: table.id, x: 0, y: 0 });
      result.current.setEditName("Masă Nouă");
      result.current.setEditSeats(12);
    });
    act(() => {
      result.current.saveEdit();
    });

    const updated = result.current.tables.find((t) => t.id === table.id);
    expect(updated.name).toBe("Masă Nouă");
    expect(updated.seats).toBe(12);
  });

  it("editPanel setat la null după saveEdit", () => {
    const { result } = renderHook(() => useGuests(DEFAULT_CAM));
    const table = result.current.tables.find((t) => t.type !== "bar" && !t.isRing);

    act(() => {
      result.current.setEditPanel({ tableId: table.id, x: 0, y: 0 });
      result.current.setEditName("Test");
      result.current.setEditSeats(8);
    });
    act(() => {
      result.current.saveEdit();
    });
    expect(result.current.editPanel).toBeNull();
  });
});
