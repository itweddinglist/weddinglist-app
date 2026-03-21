import { describe, it, expect } from "vitest";
import {
  clampCam,
  camReducer,
  getInitialCam,
  ZOOM_MIN,
  ZOOM_MAX,
  ZOOM_DEFAULT,
  PAN_PAD,
} from "./camera.js";
import { PLAN_W, PLAN_H, PLAN_CX, PLAN_CY } from "./geometry.js";

describe("clampCam", () => {
  it("vx prea mic → clampat la -PAN_PAD", () => {
    const r = clampCam(-99999, 0, 1, 1200, 700);
    expect(r.vx).toBe(-PAN_PAD);
  });

  it("vy prea mic → clampat la -PAN_PAD", () => {
    const r = clampCam(0, -99999, 1, 1200, 700);
    expect(r.vy).toBe(-PAN_PAD);
  });

  it("vx prea mare → clampat la PLAN_W + PAN_PAD - canvasW/z", () => {
    const z = 1,
      canvasW = 1200;
    const r = clampCam(99999, 0, z, canvasW, 700);
    expect(r.vx).toBe(PLAN_W + PAN_PAD - canvasW / z);
  });

  it("vy prea mare → clampat la PLAN_H + PAN_PAD - canvasH/z", () => {
    const z = 1,
      canvasH = 700;
    const r = clampCam(0, 99999, z, 1200, canvasH);
    expect(r.vy).toBe(PLAN_H + PAN_PAD - canvasH / z);
  });

  it("z păstrat exact", () => {
    const r = clampCam(0, 0, 0.8, 1200, 700);
    expect(r.z).toBe(0.8);
  });

  it("valori în bounds → returnate nemodificate", () => {
    const r = clampCam(1000, 1000, 1, 1200, 700);
    expect(r.vx).toBe(1000);
    expect(r.vy).toBe(1000);
    expect(r.z).toBe(1);
  });
});

describe("camReducer — CAM_SET", () => {
  it("setează vx, vy, z exact", () => {
    const state = { vx: 0, vy: 0, z: 1 };
    const r = camReducer(state, {
      type: "CAM_SET",
      vx: 2000,
      vy: 2000,
      z: 1.5,
      canvasW: 1200,
      canvasH: 700,
    });
    expect(r.vx).toBe(2000);
    expect(r.vy).toBe(2000);
    expect(r.z).toBe(1.5);
  });

  it("aplică clamp pe vx", () => {
    const state = { vx: 0, vy: 0, z: 1 };
    const r = camReducer(state, {
      type: "CAM_SET",
      vx: 99999,
      vy: 0,
      z: 1,
      canvasW: 1200,
      canvasH: 700,
    });
    expect(r.vx).toBe(PLAN_W + PAN_PAD - 1200 / 1);
  });
});

describe("camReducer — CAM_PAN_BY", () => {
  it("adaugă dxWorld și dyWorld la poziția curentă", () => {
    const state = { vx: 1000, vy: 1000, z: 1 };
    const r = camReducer(state, {
      type: "CAM_PAN_BY",
      dxWorld: 100,
      dyWorld: 200,
      canvasW: 1200,
      canvasH: 700,
    });
    expect(r.vx).toBe(1100);
    expect(r.vy).toBe(1200);
    expect(r.z).toBe(1);
  });

  it("aplică clamp după pan", () => {
    const state = { vx: 0, vy: 0, z: 1 };
    const r = camReducer(state, {
      type: "CAM_PAN_BY",
      dxWorld: -99999,
      dyWorld: 0,
      canvasW: 1200,
      canvasH: 700,
    });
    expect(r.vx).toBe(-PAN_PAD);
  });
});

describe("camReducer — CAM_ZOOM_AT_NORM", () => {
  it("centrul viewport rămâne fix (nx=0.5, ny=0.5)", () => {
    const s = { vx: 4500, vy: 4500, z: 1 };
    const canvasW = 1200,
      canvasH = 700;
    const cxBefore = s.vx + 0.5 * (canvasW / s.z);
    const cyBefore = s.vy + 0.5 * (canvasH / s.z);
    const r = camReducer(s, {
      type: "CAM_ZOOM_AT_NORM",
      nx: 0.5,
      ny: 0.5,
      factor: 2,
      canvasW,
      canvasH,
    });
    const cxAfter = r.vx + 0.5 * (canvasW / r.z);
    const cyAfter = r.vy + 0.5 * (canvasH / r.z);
    expect(cxAfter).toBeCloseTo(cxBefore, 3);
    expect(cyAfter).toBeCloseTo(cyBefore, 3);
  });

  it("zoom in + zoom out revine la starea inițială", () => {
    const s = { vx: 4500, vy: 4500, z: 1 };
    const args = { type: "CAM_ZOOM_AT_NORM", nx: 0.5, ny: 0.5, canvasW: 1200, canvasH: 700 };
    const after = camReducer(camReducer(s, { ...args, factor: 2 }), { ...args, factor: 0.5 });
    expect(after.vx).toBeCloseTo(s.vx, 3);
    expect(after.vy).toBeCloseTo(s.vy, 3);
  });

  it("z clampat la ZOOM_MAX", () => {
    const s = { vx: 0, vy: 0, z: ZOOM_MAX };
    const r = camReducer(s, {
      type: "CAM_ZOOM_AT_NORM",
      nx: 0.5,
      ny: 0.5,
      factor: 999,
      canvasW: 1200,
      canvasH: 700,
    });
    expect(r.z).toBe(ZOOM_MAX);
  });

  it("z clampat la ZOOM_MIN", () => {
    const s = { vx: 0, vy: 0, z: ZOOM_MIN };
    const r = camReducer(s, {
      type: "CAM_ZOOM_AT_NORM",
      nx: 0.5,
      ny: 0.5,
      factor: 0.0001,
      canvasW: 1200,
      canvasH: 700,
    });
    expect(r.z).toBe(ZOOM_MIN);
  });
});

describe("camReducer — default", () => {
  it("acțiune necunoscută → state nemodificat", () => {
    const state = { vx: 1000, vy: 1000, z: 1 };
    const r = camReducer(state, { type: "NECUNOSCUT" });
    expect(r).toBe(state);
  });
});

describe("getInitialCam", () => {
  it("1200x700 → valorile hardcodate din v13.1", () => {
    const cam = getInitialCam(1200, 700);
    expect(cam.vx).toBeCloseTo(PLAN_CX - 1200 / ZOOM_DEFAULT / 2, 5);
    expect(cam.vy).toBeCloseTo(PLAN_CY - 700 / ZOOM_DEFAULT / 2, 5);
    expect(cam.z).toBe(ZOOM_DEFAULT);
  });

  it("1920x1080 → vx și vy diferite față de 1200x700", () => {
    const cam1200 = getInitialCam(1200, 700);
    const cam1920 = getInitialCam(1920, 1080);
    expect(cam1920.vx).not.toBe(cam1200.vx);
    expect(cam1920.vy).not.toBe(cam1200.vy);
  });

  it("1920x1080 → centrat corect pe PLAN_CX/CY", () => {
    const cam = getInitialCam(1920, 1080);
    expect(cam.vx).toBeCloseTo(PLAN_CX - 1920 / ZOOM_DEFAULT / 2, 5);
    expect(cam.vy).toBeCloseTo(PLAN_CY - 1080 / ZOOM_DEFAULT / 2, 5);
  });
});

describe("zoom anchor invariant", () => {
  it("wx și wy la nx=0.3, ny=0.4 rămân fixe după zoom", () => {
    const s = { vx: 4500, vy: 4500, z: 1 };
    const canvasW = 1200,
      canvasH = 700;
    const nx = 0.3,
      ny = 0.4;
    const wxBefore = s.vx + nx * (canvasW / s.z);
    const wyBefore = s.vy + ny * (canvasH / s.z);
    const r = camReducer(s, {
      type: "CAM_ZOOM_AT_NORM",
      nx,
      ny,
      factor: 2,
      canvasW,
      canvasH,
    });
    const wxAfter = r.vx + nx * (canvasW / r.z);
    const wyAfter = r.vy + ny * (canvasH / r.z);
    expect(wxAfter).toBeCloseTo(wxBefore, 3);
    expect(wyAfter).toBeCloseTo(wyBefore, 3);
  });
});
