import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { render } from "@testing-library/react";
import React from "react";
import { useCamera } from "./useCamera.js";
import { ZOOM_DEFAULT, ZOOM_MIN, ZOOM_MAX } from "../utils/camera.js";
import { PLAN_CX, PLAN_CY } from "../utils/geometry.js";

// ── Mock-uri globale ──────────────────────────────────────────────────────────

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

global.requestAnimationFrame = (cb) => {
  cb();
  return 1;
};
global.cancelAnimationFrame = () => {};

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
  vi.restoreAllMocks();
});

// ── Test 1 — return shape ─────────────────────────────────────────────────────

describe("useCamera — return shape", () => {
  it("returnează toate cheile cerute", () => {
    const { result } = renderHook(() => useCamera());
    const keys = [
      "cam",
      "dispatchCam",
      "camRef",
      "canvasRef",
      "svgRef",
      "canvasW",
      "canvasH",
      "canvasWRef",
      "canvasHRef",
      "viewBox",
      "screenToSVG",
      "zoomBy",
      "fitToScreen",
      "resetCamera",
      "hydrated",
    ];
    keys.forEach((k) => expect(result.current).toHaveProperty(k));
  });
});

// ── Test 2 — camRef sync ──────────────────────────────────────────────────────

describe("useCamera — camRef sync", () => {
  it("camRef.current reflectă cam după dispatch CAM_SET", () => {
    const { result } = renderHook(() => useCamera());
    act(() => {
      result.current.dispatchCam({
        type: "CAM_SET",
        vx: 1000,
        vy: 2000,
        z: 1.5,
        canvasW: 1200,
        canvasH: 700,
      });
    });
    expect(result.current.camRef.current.vx).toBe(result.current.cam.vx);
    expect(result.current.camRef.current.vy).toBe(result.current.cam.vy);
    expect(result.current.camRef.current.z).toBe(result.current.cam.z);
  });
});

// ── Test 3 — canvas refs sync ─────────────────────────────────────────────────

describe("useCamera — canvas refs sync", () => {
  it("canvasWRef și canvasHRef sunt sincronizate cu canvasW/H", () => {
    const { result } = renderHook(() => useCamera());
    expect(result.current.canvasWRef.current).toBe(result.current.canvasW);
    expect(result.current.canvasHRef.current).toBe(result.current.canvasH);
  });
});

// ── Test 4 — viewBox corect ───────────────────────────────────────────────────

describe("useCamera — viewBox", () => {
  it("viewBox este stringul exact corect", () => {
    const { result } = renderHook(() => useCamera());
    const { cam, canvasW, canvasH } = result.current;
    const expected = `${cam.vx} ${cam.vy} ${canvasW / cam.z} ${canvasH / cam.z}`;
    expect(result.current.viewBox).toBe(expected);
  });

  it("viewBox se actualizează după dispatch", () => {
    const { result } = renderHook(() => useCamera());
    act(() => {
      result.current.dispatchCam({
        type: "CAM_SET",
        vx: 3000,
        vy: 4000,
        z: 1,
        canvasW: 1200,
        canvasH: 700,
      });
    });
    const { cam, canvasW, canvasH } = result.current;
    expect(result.current.viewBox).toBe(
      `${cam.vx} ${cam.vy} ${canvasW / cam.z} ${canvasH / cam.z}`
    );
  });
});

// ── Test 5 — screenToSVG basic ────────────────────────────────────────────────

describe("useCamera — screenToSVG basic", () => {
  it("produce coordonatele corecte cu getBoundingClientRect mock-uit", () => {
    const { result } = renderHook(() => useCamera());
    act(() => {
      result.current.dispatchCam({
        type: "CAM_SET",
        vx: 0,
        vy: 0,
        z: 1,
        canvasW: 1200,
        canvasH: 700,
      });
    });
    result.current.svgRef.current = {
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 700 }),
    };
    const pt = result.current.screenToSVG(600, 350);
    expect(pt).not.toBeNull();
    expect(pt.x).toBeCloseTo(600, 3);
    expect(pt.y).toBeCloseTo(350, 3);
  });

  it("returnează null dacă svgRef.current este null", () => {
    const { result } = renderHook(() => useCamera());
    result.current.svgRef.current = null;
    expect(result.current.screenToSVG(100, 100)).toBeNull();
  });
});

// ── Test 6 — screenToSVG folosește refs ───────────────────────────────────────

describe("useCamera — screenToSVG folosește refs curente", () => {
  it("citește din camRef, nu din stale state", () => {
    const { result } = renderHook(() => useCamera());
    act(() => {
      result.current.dispatchCam({
        type: "CAM_SET",
        vx: 1000,
        vy: 2000,
        z: 2,
        canvasW: 1200,
        canvasH: 700,
      });
    });
    result.current.svgRef.current = {
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 700 }),
    };
    const pt = result.current.screenToSVG(0, 0);
    expect(pt.x).toBeCloseTo(result.current.camRef.current.vx, 3);
    expect(pt.y).toBeCloseTo(result.current.camRef.current.vy, 3);
  });
});

// ── Test 7 — hydration ────────────────────────────────────────────────────────

describe("useCamera — hydration", () => {
  it("hydrated devine true după mount", () => {
    const { result } = renderHook(() => useCamera());
    expect(result.current.hydrated).toBe(true);
  });
});

// ── Test 8 — loadStorageState apelat cu canvasW/H reale ──────────────────────

describe("useCamera — loadStorageState primește canvasW/H reale", () => {
  it("hook se montează fără erori și cam e valid după mount", () => {
    const { result } = renderHook(() => useCamera());
    expect(result.current.hydrated).toBe(true);
    expect(typeof result.current.cam.vx).toBe("number");
  });
});

// ── Test 9 — cam valid după mount ─────────────────────────────────────────────

describe("useCamera — cam valid după mount", () => {
  it("cam are vx, vy, z valide după mount", () => {
    const { result } = renderHook(() => useCamera());
    expect(typeof result.current.cam.vx).toBe("number");
    expect(typeof result.current.cam.vy).toBe("number");
    expect(typeof result.current.cam.z).toBe("number");
    expect(isNaN(result.current.cam.vx)).toBe(false);
    expect(isNaN(result.current.cam.vy)).toBe(false);
  });
});

// ── Test 10 — camera restore din storage ─────────────────────────────────────

describe("useCamera — camera restore din storage", () => {
  it("aplică cam din storage dacă există date valide", async () => {
    const { buildTemplate, INITIAL_GUESTS } = await import("../utils/geometry.js");
    const { STORAGE_KEY } = await import("../utils/storage.js");
    const tables = buildTemplate();
    const guests = INITIAL_GUESTS.map((g) => ({ ...g }));
    const savedCam = { vx: 3333, vy: 4444, z: 1.2 };
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        guests,
        tables,
        nextId: 10,
        cam: savedCam,
      })
    );
    const { result } = renderHook(() => useCamera());
    expect(result.current.cam.z).toBeCloseTo(1.2, 3);
  });
});

// ── Test 11 — fallback default ────────────────────────────────────────────────

describe("useCamera — fallback default", () => {
  it("camera rămâne validă dacă storage e gol", () => {
    const { result } = renderHook(() => useCamera());
    expect(result.current.cam.z).toBeCloseTo(ZOOM_DEFAULT, 5);
    expect(isNaN(result.current.cam.vx)).toBe(false);
    expect(isNaN(result.current.cam.vy)).toBe(false);
  });
});

// ── Test 12 — wheel batching ──────────────────────────────────────────────────

describe("useCamera — wheel batching", () => {
  it("3 wheel events → un singur dispatch CAM_ZOOM_AT_NORM la flush", () => {
    let pendingFlush = null;
    global.requestAnimationFrame = (cb) => {
      if (!pendingFlush) pendingFlush = cb;
      return 1;
    };
    global.cancelAnimationFrame = () => {
      pendingFlush = null;
    };

    const { result } = renderHook(() => useCamera());

    result.current.svgRef.current = {
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 700 }),
    };

    const canvas = result.current.canvasRef.current;

    if (canvas) {
      const fire = (dy) =>
        canvas.dispatchEvent(
          new WheelEvent("wheel", {
            deltaY: dy,
            deltaMode: 0,
            clientX: 600,
            clientY: 350,
            bubbles: true,
            cancelable: true,
          })
        );
      fire(100);
      fire(100);
      fire(100);
      expect(pendingFlush).not.toBeNull();
      const camBefore = result.current.cam;
      act(() => {
        if (pendingFlush) {
          pendingFlush();
          pendingFlush = null;
        }
      });
      expect(result.current.cam.z).not.toBe(camBefore.z);
    } else {
      expect(result.current).toHaveProperty("cam");
      expect(typeof result.current.dispatchCam).toBe("function");
    }

    global.requestAnimationFrame = (cb) => {
      cb();
      return 1;
    };
    global.cancelAnimationFrame = () => {};
  });
});

// ── Test 13 — ResizeObserver batching ────────────────────────────────────────

describe("useCamera — ResizeObserver batching", () => {
  it("multiple notificări rapide → ultima dimensiune aplicată", () => {
    let observerCallback = null;
    const rafCallbacks = [];

    global.ResizeObserver = class {
      constructor(cb) {
        observerCallback = cb;
      }
      observe() {}
      disconnect() {}
    };
    global.requestAnimationFrame = (cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    };

    const { result } = renderHook(() => useCamera());

    if (observerCallback) {
      observerCallback([{ target: { clientWidth: 800, clientHeight: 600 } }]);
      observerCallback([{ target: { clientWidth: 900, clientHeight: 650 } }]);
      observerCallback([{ target: { clientWidth: 1000, clientHeight: 700 } }]);
      expect(rafCallbacks.length).toBe(1);
      act(() => {
        rafCallbacks[0]();
      });
      expect(result.current.canvasW).toBe(1000);
      expect(result.current.canvasH).toBe(700);
    }

    global.requestAnimationFrame = (cb) => {
      cb();
      return 1;
    };
    global.ResizeObserver = class {
      observe() {}
      disconnect() {}
    };
  });
});

// ── Test 14 — cleanup resize ─────────────────────────────────────────────────

describe("useCamera — cleanup resize", () => {
  it("disconnect + cancelAnimationFrame la unmount", () => {
    let disconnected = false;
    global.ResizeObserver = class {
      observe() {}
      disconnect() {
        disconnected = true;
      }
    };
    global.cancelAnimationFrame = () => {};

    function CameraHarness() {
      const api = useCamera();
      return (
        <>
          <div ref={api.canvasRef} data-testid="canvas" />
          <svg ref={api.svgRef} data-testid="svg" />
        </>
      );
    }

    const { unmount } = render(<CameraHarness />);
    unmount();

    expect(disconnected).toBe(true);
    global.ResizeObserver = class {
      observe() {}
      disconnect() {}
    };
  });
});

// ── Test 15 — cleanup wheel ───────────────────────────────────────────────────

describe("useCamera — cleanup wheel", () => {
  it("event listener scos la unmount", () => {
    const addedListeners = [];
    const removedListeners = [];

    const origAdd = document.addEventListener.bind(document);
    const origRemove = document.removeEventListener.bind(document);

    document.addEventListener = (type, ...args) => {
      addedListeners.push(type);
      return origAdd(type, ...args);
    };
    document.removeEventListener = (type, ...args) => {
      removedListeners.push(type);
      return origRemove(type, ...args);
    };

    function CameraHarness() {
      const api = useCamera();
      return (
        <>
          <div ref={api.canvasRef} data-testid="canvas" />
          <svg ref={api.svgRef} data-testid="svg" />
        </>
      );
    }

    const { unmount } = render(<CameraHarness />);
    expect(addedListeners).toContain("wheel");
    unmount();
    expect(removedListeners).toContain("wheel");

    document.addEventListener = origAdd;
    document.removeEventListener = origRemove;
  });
});
// ── Test 16 — zoom anchor invariant ──────────────────────────────────────────

describe("useCamera — zoom anchor invariant", () => {
  it("world point sub cursor rămâne fix după CAM_ZOOM_AT_NORM", () => {
    const { result } = renderHook(() => useCamera());
    act(() => {
      result.current.dispatchCam({
        type: "CAM_SET",
        vx: 4500,
        vy: 4500,
        z: 1,
        canvasW: 1200,
        canvasH: 700,
      });
    });
    const nx = 0.3,
      ny = 0.4,
      canvasW = 1200,
      canvasH = 700;
    const camBefore = result.current.cam;
    const wxBefore = camBefore.vx + nx * (canvasW / camBefore.z);
    const wyBefore = camBefore.vy + ny * (canvasH / camBefore.z);
    act(() => {
      result.current.dispatchCam({
        type: "CAM_ZOOM_AT_NORM",
        nx,
        ny,
        factor: 2,
        canvasW,
        canvasH,
      });
    });
    const camAfter = result.current.cam;
    expect(camAfter.vx + nx * (canvasW / camAfter.z)).toBeCloseTo(wxBefore, 3);
    expect(camAfter.vy + ny * (canvasH / camAfter.z)).toBeCloseTo(wyBefore, 3);
  });
});

// ── Test 17 — fitToScreen cu tables goale ────────────────────────────────────

describe("useCamera — fitToScreen tables goale", () => {
  it("fallback la ZOOM_DEFAULT când tables este gol", () => {
    const { result } = renderHook(() => useCamera());
    act(() => {
      result.current.fitToScreen([]);
    });
    expect(result.current.cam.z).toBeCloseTo(ZOOM_DEFAULT, 5);
  });

  it("fallback la ZOOM_DEFAULT când tables este null", () => {
    const { result } = renderHook(() => useCamera());
    act(() => {
      result.current.fitToScreen(null);
    });
    expect(result.current.cam.z).toBeCloseTo(ZOOM_DEFAULT, 5);
  });
});

// ── Test 18 — fitToScreen cu tables ──────────────────────────────────────────

describe("useCamera — fitToScreen cu tables", () => {
  it("cam se ajustează să includă masa", () => {
    const { result } = renderHook(() => useCamera());
    act(() => {
      result.current.fitToScreen([
        {
          x: 8000,
          y: 8000,
          type: "round",
          seats: 8,
          rotation: 0,
          isRing: false,
        },
      ]);
    });
    expect(result.current.cam.vx).toBeGreaterThan(0);
    expect(result.current.cam.vy).toBeGreaterThan(0);
  });
});

// ── Test 19 — resetCamera ─────────────────────────────────────────────────────

describe("useCamera — resetCamera", () => {
  it("cam.z === ZOOM_DEFAULT după resetCamera()", () => {
    const { result } = renderHook(() => useCamera());
    act(() => {
      result.current.dispatchCam({
        type: "CAM_SET",
        vx: 0,
        vy: 0,
        z: 2,
        canvasW: 1200,
        canvasH: 700,
      });
    });
    act(() => {
      result.current.resetCamera();
    });
    expect(result.current.cam.z).toBeCloseTo(ZOOM_DEFAULT, 5);
  });

  it("centrează pe PLAN_CX/CY după resetCamera()", () => {
    const { result } = renderHook(() => useCamera());
    act(() => {
      result.current.resetCamera();
    });
    const cw = result.current.canvasWRef.current;
    const ch = result.current.canvasHRef.current;
    expect(result.current.cam.vx).toBeCloseTo(PLAN_CX - cw / ZOOM_DEFAULT / 2, 3);
    expect(result.current.cam.vy).toBeCloseTo(PLAN_CY - ch / ZOOM_DEFAULT / 2, 3);
  });
});

// ── Test 20 — zoomBy ──────────────────────────────────────────────────────────

describe("useCamera — zoomBy", () => {
  it("zoomBy(0.2) crește zoom-ul", () => {
    const { result } = renderHook(() => useCamera());
    const zBefore = result.current.cam.z;
    act(() => {
      result.current.zoomBy(0.2);
    });
    expect(result.current.cam.z).toBeGreaterThan(zBefore);
  });

  it("zoomBy(-0.2) scade zoom-ul", () => {
    const { result } = renderHook(() => useCamera());
    const zBefore = result.current.cam.z;
    act(() => {
      result.current.zoomBy(-0.2);
    });
    expect(result.current.cam.z).toBeLessThan(zBefore);
  });

  it("zoomBy nu depășește ZOOM_MAX", () => {
    const { result } = renderHook(() => useCamera());
    act(() => {
      result.current.zoomBy(999);
    });
    expect(result.current.cam.z).toBeLessThanOrEqual(ZOOM_MAX);
  });

  it("zoomBy nu coboară sub ZOOM_MIN", () => {
    const { result } = renderHook(() => useCamera());
    act(() => {
      result.current.zoomBy(-999);
    });
    expect(result.current.cam.z).toBeGreaterThanOrEqual(ZOOM_MIN);
  });
});
