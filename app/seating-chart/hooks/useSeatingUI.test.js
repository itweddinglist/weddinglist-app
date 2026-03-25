import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSeatingUI } from "./useSeatingUI.js";

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
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ── Test 1 — return shape ─────────────────────────────────────────────────────

describe("useSeatingUI — return shape", () => {
  it("returnează toate cheile cerute", () => {
    const { result } = renderHook(() => useSeatingUI());
    const keys = [
      "selectedTableId", "setSelectedTableId",
      "clickedSeat", "setClickedSeat",
      "hoveredGuest", "setHoveredGuest",
      "dragOver", "setDragOver",
      "isDraggingGuest", "setIsDraggingGuest",
      "modal", "setModal",
      "editPanel", "setEditPanel",
      "editName", "setEditName",
      "editSeats", "setEditSeats",
      "confirmDialog", "setConfirmDialog",
      "lockMode", "setLockMode",
      "showStats", "setShowStats",
      "showCatering", "setShowCatering",
      "toasts", "showToast", "removeToast",
    ];
    for (const key of keys) {
      expect(result.current).toHaveProperty(key);
    }
  });
});

// ── Test 2 — toasts ───────────────────────────────────────────────────────────

describe("useSeatingUI — showToast", () => {
  it("toasts pornește ca array gol", () => {
    const { result } = renderHook(() => useSeatingUI());
    expect(result.current.toasts).toHaveLength(0);
  });

  it("showToast adaugă un toast cu msg și type", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => { result.current.showToast("Mesaj test", "green"); });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].msg).toBe("Mesaj test");
    expect(result.current.toasts[0].type).toBe("green");
  });

  it("showToast fără type → default 'rose'", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => { result.current.showToast("Test"); });
    expect(result.current.toasts[0].type).toBe("rose");
  });

  it("showToast adaugă id unic la fiecare toast", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => {
      result.current.showToast("Primul", "green");
      result.current.showToast("Al doilea", "red");
    });
    const ids = result.current.toasts.map((t) => t.id);
    expect(new Set(ids).size).toBe(2);
  });

  it("mai multe showToast → toasts în ordine", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => {
      result.current.showToast("Primul", "green");
      result.current.showToast("Al doilea", "red");
      result.current.showToast("Al treilea", "yellow");
    });
    expect(result.current.toasts).toHaveLength(3);
    expect(result.current.toasts[0].msg).toBe("Primul");
    expect(result.current.toasts[2].msg).toBe("Al treilea");
  });

  it("toast auto-dispare exact după 2800ms", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => { result.current.showToast("Temporar", "green"); });
    expect(result.current.toasts).toHaveLength(1);
    act(() => { vi.advanceTimersByTime(2800); });
    expect(result.current.toasts).toHaveLength(0);
  });

  it("toast NU dispare înainte de 2800ms", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => { result.current.showToast("Temporar", "green"); });
    act(() => { vi.advanceTimersByTime(2799); });
    expect(result.current.toasts).toHaveLength(1);
  });

  it("fiecare toast are propriul timer — al doilea nu dispare odată cu primul", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => { result.current.showToast("Primul", "green"); });
    act(() => { vi.advanceTimersByTime(1000); });
    act(() => { result.current.showToast("Al doilea", "red"); });
    act(() => { vi.advanceTimersByTime(1800); }); // 2800ms de la primul, 1800ms de la al doilea
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].msg).toBe("Al doilea");
  });
});

// ── Test 3 — removeToast ──────────────────────────────────────────────────────

describe("useSeatingUI — removeToast", () => {
  it("removeToast elimină toast-ul cu id-ul dat", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => { result.current.showToast("Test", "green"); });
    const id = result.current.toasts[0].id;
    act(() => { result.current.removeToast(id); });
    expect(result.current.toasts).toHaveLength(0);
  });

  it("removeToast cu id inexistent → lista neschimbată", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => { result.current.showToast("Test", "green"); });
    act(() => { result.current.removeToast(9999); });
    expect(result.current.toasts).toHaveLength(1);
  });

  it("removeToast elimină doar toast-ul specific, ceilalți rămân", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => {
      result.current.showToast("Primul", "green");
      result.current.showToast("Al doilea", "red");
    });
    const firstId = result.current.toasts[0].id;
    act(() => { result.current.removeToast(firstId); });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].msg).toBe("Al doilea");
  });
});

// ── Test 4 — modal ────────────────────────────────────────────────────────────

describe("useSeatingUI — modal", () => {
  it("modal pornește null", () => {
    const { result } = renderHook(() => useSeatingUI());
    expect(result.current.modal).toBeNull();
  });

  it("setModal actualizează modal", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => { result.current.setModal({ type: "round", seats: 8 }); });
    expect(result.current.modal).toEqual({ type: "round", seats: 8 });
  });

  it("setModal(null) resetează modal", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => { result.current.setModal({ type: "round" }); });
    act(() => { result.current.setModal(null); });
    expect(result.current.modal).toBeNull();
  });
});

// ── Test 5 — editPanel ────────────────────────────────────────────────────────

describe("useSeatingUI — editPanel", () => {
  it("editPanel pornește null", () => {
    const { result } = renderHook(() => useSeatingUI());
    expect(result.current.editPanel).toBeNull();
  });

  it("setEditPanel actualizează editPanel", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => { result.current.setEditPanel({ tableId: 3 }); });
    expect(result.current.editPanel).toEqual({ tableId: 3 });
  });

  it("setEditPanel(null) resetează", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => { result.current.setEditPanel({ tableId: 3 }); });
    act(() => { result.current.setEditPanel(null); });
    expect(result.current.editPanel).toBeNull();
  });

  it("editName pornește ca string gol", () => {
    const { result } = renderHook(() => useSeatingUI());
    expect(result.current.editName).toBe("");
  });

  it("setEditName actualizează editName", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => { result.current.setEditName("Masa Noua"); });
    expect(result.current.editName).toBe("Masa Noua");
  });

  it("editSeats pornește cu 8", () => {
    const { result } = renderHook(() => useSeatingUI());
    expect(result.current.editSeats).toBe(8);
  });

  it("setEditSeats actualizează editSeats", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => { result.current.setEditSeats(12); });
    expect(result.current.editSeats).toBe(12);
  });
});

// ── Test 6 — confirmDialog ────────────────────────────────────────────────────

describe("useSeatingUI — confirmDialog", () => {
  it("confirmDialog pornește null", () => {
    const { result } = renderHook(() => useSeatingUI());
    expect(result.current.confirmDialog).toBeNull();
  });

  it("setConfirmDialog actualizează confirmDialog", () => {
    const { result } = renderHook(() => useSeatingUI());
    const dialog = { title: "Ești sigur?", sub: "Acțiune ireversibilă", onConfirm: vi.fn() };
    act(() => { result.current.setConfirmDialog(dialog); });
    expect(result.current.confirmDialog.title).toBe("Ești sigur?");
    expect(result.current.confirmDialog.sub).toBe("Acțiune ireversibilă");
  });

  it("setConfirmDialog(null) resetează dialogul", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => { result.current.setConfirmDialog({ title: "Test", onConfirm: vi.fn() }); });
    act(() => { result.current.setConfirmDialog(null); });
    expect(result.current.confirmDialog).toBeNull();
  });
});

// ── Test 7 — lockMode ─────────────────────────────────────────────────────────

describe("useSeatingUI — lockMode", () => {
  it("lockMode pornește false", () => {
    const { result } = renderHook(() => useSeatingUI());
    expect(result.current.lockMode).toBe(false);
  });

  it("setLockMode(true) → lockMode === true", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => { result.current.setLockMode(true); });
    expect(result.current.lockMode).toBe(true);
  });

  it("setLockMode(false) → lockMode revine false", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => { result.current.setLockMode(true); });
    act(() => { result.current.setLockMode(false); });
    expect(result.current.lockMode).toBe(false);
  });

  it("toggle repetat funcționează corect", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => { result.current.setLockMode((v) => !v); });
    expect(result.current.lockMode).toBe(true);
    act(() => { result.current.setLockMode((v) => !v); });
    expect(result.current.lockMode).toBe(false);
  });
});

// ── Test 8 — selection state ──────────────────────────────────────────────────

describe("useSeatingUI — selectedTableId", () => {
  it("selectedTableId pornește null", () => {
    const { result } = renderHook(() => useSeatingUI());
    expect(result.current.selectedTableId).toBeNull();
  });

  it("setSelectedTableId actualizează", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => { result.current.setSelectedTableId(3); });
    expect(result.current.selectedTableId).toBe(3);
  });

  it("setSelectedTableId(null) resetează", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => { result.current.setSelectedTableId(3); });
    act(() => { result.current.setSelectedTableId(null); });
    expect(result.current.selectedTableId).toBeNull();
  });
});

describe("useSeatingUI — clickedSeat", () => {
  it("clickedSeat pornește null", () => {
    const { result } = renderHook(() => useSeatingUI());
    expect(result.current.clickedSeat).toBeNull();
  });

  it("setClickedSeat actualizează cu obiect", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => { result.current.setClickedSeat({ tableId: 3, seatIndex: 0 }); });
    expect(result.current.clickedSeat).toEqual({ tableId: 3, seatIndex: 0 });
  });
});

describe("useSeatingUI — hoveredGuest", () => {
  it("hoveredGuest pornește null", () => {
    const { result } = renderHook(() => useSeatingUI());
    expect(result.current.hoveredGuest).toBeNull();
  });

  it("setHoveredGuest actualizează", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => { result.current.setHoveredGuest(5); });
    expect(result.current.hoveredGuest).toBe(5);
  });
});

describe("useSeatingUI — dragOver", () => {
  it("dragOver pornește null", () => {
    const { result } = renderHook(() => useSeatingUI());
    expect(result.current.dragOver).toBeNull();
  });

  it("setDragOver actualizează", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => { result.current.setDragOver(3); });
    expect(result.current.dragOver).toBe(3);
  });
});

describe("useSeatingUI — isDraggingGuest", () => {
  it("isDraggingGuest pornește false", () => {
    const { result } = renderHook(() => useSeatingUI());
    expect(result.current.isDraggingGuest).toBe(false);
  });

  it("setIsDraggingGuest(true) → isDraggingGuest === true", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => { result.current.setIsDraggingGuest(true); });
    expect(result.current.isDraggingGuest).toBe(true);
  });
});

// ── Test 9 — showStats / showCatering ─────────────────────────────────────────

describe("useSeatingUI — showStats", () => {
  it("showStats pornește true", () => {
    const { result } = renderHook(() => useSeatingUI());
    expect(result.current.showStats).toBe(true);
  });

  it("setShowStats(false) → showStats false", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => { result.current.setShowStats(false); });
    expect(result.current.showStats).toBe(false);
  });

  it("setShowStats(true) → showStats true din nou", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => { result.current.setShowStats(false); });
    act(() => { result.current.setShowStats(true); });
    expect(result.current.showStats).toBe(true);
  });
});

describe("useSeatingUI — showCatering", () => {
  it("showCatering pornește false", () => {
    const { result } = renderHook(() => useSeatingUI());
    expect(result.current.showCatering).toBe(false);
  });

  it("setShowCatering(true) → showCatering true", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => { result.current.setShowCatering(true); });
    expect(result.current.showCatering).toBe(true);
  });

  it("setShowCatering(false) după true → revine false", () => {
    const { result } = renderHook(() => useSeatingUI());
    act(() => { result.current.setShowCatering(true); });
    act(() => { result.current.setShowCatering(false); });
    expect(result.current.showCatering).toBe(false);
  });
});

// ── Test 10 — izolare instanțe ────────────────────────────────────────────────

describe("useSeatingUI — izolare instanțe", () => {
  it("două instanțe independente nu se influențează reciproc", () => {
    const { result: r1 } = renderHook(() => useSeatingUI());
    const { result: r2 } = renderHook(() => useSeatingUI());
    act(() => { r1.current.setLockMode(true); });
    expect(r1.current.lockMode).toBe(true);
    expect(r2.current.lockMode).toBe(false);
  });

  it("toast în instanța 1 nu apare în instanța 2", () => {
    const { result: r1 } = renderHook(() => useSeatingUI());
    const { result: r2 } = renderHook(() => useSeatingUI());
    act(() => { r1.current.showToast("Test", "green"); });
    expect(r1.current.toasts).toHaveLength(1);
    expect(r2.current.toasts).toHaveLength(0);
  });
});
