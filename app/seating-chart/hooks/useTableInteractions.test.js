import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTableInteractions } from "./useTableInteractions.js";

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
  global.requestAnimationFrame = (cb) => {
    cb();
    return 1;
  };
  global.cancelAnimationFrame = () => {};
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const defaultArgs = () => ({
  tables: [{ id: 1, name: "Masa 1", type: "round", seats: 8, x: 100, y: 100, rotation: 0 }],
  setTables: vi.fn(),
  selectedTableId: null,
  lockMode: false,
  undo: vi.fn(),
  saveAction: vi.fn(),
  setModal: vi.fn(),
  setEditPanel: vi.fn(),
  setConfirmDialog: vi.fn(),
  setClickedSeat: vi.fn(),
  setShowCatering: vi.fn(),
  setSelectedTableId: vi.fn(),
  setHoveredGuest: vi.fn(),
  setIsDraggingGuest: vi.fn(),
  camRef: { current: { vx: 0, vy: 0, z: 1 } },
  canvasWRef: { current: 1200 },
  canvasHRef: { current: 700 },
  screenToSVG: vi.fn(() => ({ x: 150, y: 150 })),
  dispatchCam: vi.fn(),
});

// ── Test 1 — return shape ─────────────────────────────────────────────────────

describe("useTableInteractions — return shape", () => {
  it("returnează toate cheile cerute", () => {
    const { result } = renderHook(() => useTableInteractions(defaultArgs()));
    expect(result.current).toHaveProperty("draggingTableRef");
    expect(result.current).toHaveProperty("panningRef");
    expect(result.current).toHaveProperty("spaceDownRef");
    expect(result.current).toHaveProperty("handleSvgMouseDown");
    expect(result.current).toHaveProperty("dragPreviewRef");
  });
});

// ── Test 2 — Space keydown ────────────────────────────────────────────────────

describe("useTableInteractions — Space keydown", () => {
  it("Space keydown → spaceDownRef.current === true", () => {
    const { result } = renderHook(() => useTableInteractions(defaultArgs()));
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", bubbles: true }));
    });
    expect(result.current.spaceDownRef.current).toBe(true);
  });
});

// ── Test 3 — Space keyup ──────────────────────────────────────────────────────

describe("useTableInteractions — Space keyup", () => {
  it("Space keyup → spaceDownRef.current === false", () => {
    const { result } = renderHook(() => useTableInteractions(defaultArgs()));
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", bubbles: true }));
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "Space", bubbles: true }));
    });
    expect(result.current.spaceDownRef.current).toBe(false);
  });
});

// ── Test 4 — Ctrl+Z → undo ───────────────────────────────────────────────────

describe("useTableInteractions — Ctrl+Z", () => {
  it("Ctrl+Z → undo apelat", () => {
    const args = defaultArgs();
    renderHook(() => useTableInteractions(args));
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true })
      );
    });
    expect(args.undo).toHaveBeenCalled();
  });
});

// ── Test 5 — Escape ───────────────────────────────────────────────────────────

describe("useTableInteractions — Escape", () => {
  it("Escape → toate setter-ele apelate", () => {
    const args = defaultArgs();
    renderHook(() => useTableInteractions(args));
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(args.setModal).toHaveBeenCalledWith(null);
    expect(args.setEditPanel).toHaveBeenCalledWith(null);
    expect(args.setConfirmDialog).toHaveBeenCalledWith(null);
    expect(args.setClickedSeat).toHaveBeenCalledWith(null);
    expect(args.setShowCatering).toHaveBeenCalledWith(false);
    expect(args.setSelectedTableId).toHaveBeenCalledWith(null);
  });
});

// ── Test 6 — Arrow key cu selectedTableId ────────────────────────────────────

describe("useTableInteractions — Arrow key", () => {
  it("ArrowRight cu selectedTableId → setTables apelat cu x modificat", () => {
    const args = { ...defaultArgs(), selectedTableId: 1 };
    renderHook(() => useTableInteractions(args));
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    expect(args.setTables).toHaveBeenCalled();
    const fn = args.setTables.mock.calls[0][0];
    const result = fn(args.tables);
    expect(result[0].x).toBe(104);
  });

  it("ArrowDown cu Shift → step = GRID (20)", () => {
    const args = { ...defaultArgs(), selectedTableId: 1 };
    renderHook(() => useTableInteractions(args));
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", shiftKey: true, bubbles: true })
      );
    });
    expect(args.setTables).toHaveBeenCalled();
    const fn = args.setTables.mock.calls[0][0];
    const result = fn(args.tables);
    expect(result[0].y).toBe(120);
  });
});

// ── Test 7 — keyboard ignorat în INPUT ───────────────────────────────────────

describe("useTableInteractions — Space ignorat în INPUT", () => {
  it("Space pe INPUT → spaceDownRef rămâne false", () => {
    const { result } = renderHook(() => useTableInteractions(defaultArgs()));
    const input = document.createElement("input");
    act(() => {
      const event = new KeyboardEvent("keydown", { code: "Space", bubbles: true });
      Object.defineProperty(event, "target", { value: input });
      window.dispatchEvent(event);
    });
    expect(result.current.spaceDownRef.current).toBe(false);
  });
});

// ── Test 8 — mousemove fără drag ─────────────────────────────────────────────

describe("useTableInteractions — mousemove fără drag", () => {
  it("draggingTableRef null → setTables nu e apelat", () => {
    const args = defaultArgs();
    renderHook(() => useTableInteractions(args));
    act(() => {
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 200, clientY: 200, bubbles: true })
      );
    });
    expect(args.setTables).not.toHaveBeenCalled();
  });
});

// ── Test 9 — mousemove cu drag ────────────────────────────────────────────────

describe("useTableInteractions — mousemove cu drag", () => {
  it("draggingTableRef setat → dragPreviewRef actualizat, setTables NU apelat în mousemove", () => {
    const args = defaultArgs();
    const { result } = renderHook(() => useTableInteractions(args));
    act(() => {
      result.current.draggingTableRef.current = { id: 1, ox: 10, oy: 10, dw: 140, dh: 140 };
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 200, clientY: 200, bubbles: true })
      );
    });
    // setTables NU mai e apelat în mousemove — doar la mouseup
    expect(args.setTables).not.toHaveBeenCalled();
    // dragPreviewRef ținere minte poziția vizuală
    expect(result.current.dragPreviewRef.current).not.toBeNull();
    expect(result.current.dragPreviewRef.current).toHaveProperty("tableId", 1);
    expect(result.current.dragPreviewRef.current).toHaveProperty("x");
    expect(result.current.dragPreviewRef.current).toHaveProperty("y");
  });

  it("la mouseup după drag → setTables apelat o singură dată cu poziția finală", () => {
    const args = defaultArgs();
    const { result } = renderHook(() => useTableInteractions(args));
    act(() => {
      result.current.draggingTableRef.current = { id: 1, ox: 10, oy: 10, dw: 140, dh: 140 };
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 200, clientY: 200, bubbles: true })
      );
    });
    act(() => {
      window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });
    expect(args.setTables).toHaveBeenCalledTimes(1);
    const updater = args.setTables.mock.calls[0][0];
    const updated = updater(args.tables);
    expect(updated[0]).toHaveProperty("id", 1);
    expect(updated[0]).toHaveProperty("x");
    expect(updated[0]).toHaveProperty("y");
  });
});

// ── Test 10 — mouseup finalizează drag ───────────────────────────────────────

describe("useTableInteractions — mouseup", () => {
  it("mouseup → draggingTableRef null, setIsDraggingGuest(false), setHoveredGuest(null)", () => {
    const args = defaultArgs();
    const { result } = renderHook(() => useTableInteractions(args));
    act(() => {
      result.current.draggingTableRef.current = { id: 1, ox: 0, oy: 0 };
      window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });
    expect(result.current.draggingTableRef.current).toBeNull();
    expect(args.setIsDraggingGuest).toHaveBeenCalledWith(false);
    expect(args.setHoveredGuest).toHaveBeenCalledWith(null);
  });
});

// ── Test 11 — handleSvgMouseDown cu Space ────────────────────────────────────

describe("useTableInteractions — handleSvgMouseDown Space", () => {
  it("Space down + mousedown → panningRef setat cu sx/sy/vx0/vy0", () => {
    const args = defaultArgs();
    const { result } = renderHook(() => useTableInteractions(args));
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", bubbles: true }));
    });
    const e = { button: 0, clientX: 300, clientY: 400, preventDefault: vi.fn() };
    act(() => {
      result.current.handleSvgMouseDown(e);
    });
    expect(result.current.panningRef.current).toMatchObject({ sx: 300, sy: 400, vx0: 0, vy0: 0 });
  });
});

// ── Test 12 — handleSvgMouseDown middle button ────────────────────────────────

describe("useTableInteractions — handleSvgMouseDown middle button", () => {
  it("button===1 → panningRef setat", () => {
    const args = defaultArgs();
    const { result } = renderHook(() => useTableInteractions(args));
    const e = { button: 1, clientX: 100, clientY: 200, preventDefault: vi.fn() };
    act(() => {
      result.current.handleSvgMouseDown(e);
    });
    expect(result.current.panningRef.current).toMatchObject({ sx: 100, sy: 200 });
  });
});

// ── Test 13 — handleSvgMouseDown normal click ─────────────────────────────────

describe("useTableInteractions — handleSvgMouseDown normal click", () => {
  it("button===0 fără Space → panningRef rămâne null", () => {
    const args = defaultArgs();
    const { result } = renderHook(() => useTableInteractions(args));
    const e = { button: 0, clientX: 100, clientY: 200, preventDefault: vi.fn() };
    act(() => {
      result.current.handleSvgMouseDown(e);
    });
    expect(result.current.panningRef.current).toBeNull();
  });
});

// ── Test 14 — screenToSVG null în drag ───────────────────────────────────────

describe("useTableInteractions — screenToSVG null", () => {
  it("screenToSVG returnează null → nu crapă, setTables nu e apelat", () => {
    const args = { ...defaultArgs(), screenToSVG: vi.fn(() => null) };
    const { result } = renderHook(() => useTableInteractions(args));
    act(() => {
      result.current.draggingTableRef.current = { id: 1, ox: 0, oy: 0 };
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 200, clientY: 200, bubbles: true })
      );
    });
    expect(args.setTables).not.toHaveBeenCalled();
  });
});

// ── Test 15 — lockMode guard ──────────────────────────────────────────────────

describe("useTableInteractions — lockMode", () => {
  it("lockMode===true → drag ignorat în mousemove", () => {
    const args = { ...defaultArgs(), lockMode: true };
    const { result } = renderHook(() => useTableInteractions(args));
    act(() => {
      result.current.draggingTableRef.current = { id: 1, ox: 0, oy: 0 };
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 200, clientY: 200, bubbles: true })
      );
    });
    expect(args.setTables).not.toHaveBeenCalled();
  });
});

// ── Test 16 — listeners mount/unmount ────────────────────────────────────────

describe("useTableInteractions — listeners mount/unmount", () => {
  it("la mount: addEventListener apelat pentru keydown, keyup, mousemove, mouseup", () => {
    const added = [];
    const origAdd = window.addEventListener;
    window.addEventListener = (type, ...rest) => {
      added.push(type);
      return origAdd.call(window, type, ...rest);
    };
    renderHook(() => useTableInteractions(defaultArgs()));
    expect(added).toContain("keydown");
    expect(added).toContain("keyup");
    expect(added).toContain("mousemove");
    expect(added).toContain("mouseup");
    window.addEventListener = origAdd;
  });

  it("la unmount: removeEventListener apelat", () => {
    const removed = [];
    const origRemove = window.removeEventListener;
    window.removeEventListener = (type, ...rest) => {
      removed.push(type);
      return origRemove.call(window, type, ...rest);
    };
    const { unmount } = renderHook(() => useTableInteractions(defaultArgs()));
    act(() => {
      unmount();
    });
    expect(removed).toContain("keydown");
    expect(removed).toContain("mousemove");
    window.removeEventListener = origRemove;
  });
});

// ── Test 17 — pan prin mousemove ──────────────────────────────────────────────

describe("useTableInteractions — pan mousemove", () => {
  it("panningRef setat → dispatchCam apelat cu CAM_SET", () => {
    const args = defaultArgs();
    const { result } = renderHook(() => useTableInteractions(args));

    const e = { button: 1, clientX: 100, clientY: 200, preventDefault: vi.fn() };
    act(() => {
      result.current.handleSvgMouseDown(e);
    });

    act(() => {
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 150, clientY: 250, bubbles: true })
      );
    });

    expect(args.dispatchCam).toHaveBeenCalled();
    const call = args.dispatchCam.mock.calls[0][0];
    expect(call.type).toBe("CAM_SET");
  });
});
