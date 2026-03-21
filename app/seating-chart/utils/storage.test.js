import { describe, it, expect, beforeEach } from "vitest";
import {
  STORAGE_KEY,
  LEGACY_STORAGE_KEYS,
  cleanupLegacyStorage,
  sanitizeLoadedGuests,
  sanitizeLoadedNextId,
  sanitizeLoadedCam,
  buildDefaultStorageState,
  loadStorageState,
  saveStorageState,
} from "./storage.js";
import { buildTemplate, INITIAL_GUESTS } from "./geometry.js";
import { getInitialCam, ZOOM_DEFAULT } from "./camera.js";

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

let mockStorage = makeMockStorage();

beforeEach(() => {
  mockStorage = makeMockStorage();
  Object.defineProperty(globalThis, "localStorage", {
    value: mockStorage,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, "window", {
    value: globalThis,
    writable: true,
    configurable: true,
  });
});

// ── Test 1 — buildDefaultStorageState ────────────────────────────────────────

describe("buildDefaultStorageState", () => {
  it("returnează guests, tables, nextId, cam", () => {
    const state = buildDefaultStorageState(1200, 700);
    expect(state).toHaveProperty("guests");
    expect(state).toHaveProperty("tables");
    expect(state).toHaveProperty("nextId");
    expect(state).toHaveProperty("cam");
  });

  it("tables.length > 0", () => {
    const { tables } = buildDefaultStorageState(1200, 700);
    expect(tables.length).toBeGreaterThan(0);
  });

  it("guests.length > 0", () => {
    const { guests } = buildDefaultStorageState(1200, 700);
    expect(guests.length).toBeGreaterThan(0);
  });

  it("nextId > orice table.id", () => {
    const { tables, nextId } = buildDefaultStorageState(1200, 700);
    const maxId = Math.max(...tables.map((t) => t.id));
    expect(nextId).toBeGreaterThan(maxId);
  });
});

// ── Test 2 — sanitizeLoadedGuests orfani ─────────────────────────────────────

describe("sanitizeLoadedGuests — orfani", () => {
  it("tableId inexistent → null", () => {
    const tables = buildTemplate();
    const guests = [{ ...INITIAL_GUESTS[0], tableId: 9999 }];
    const result = sanitizeLoadedGuests(guests, tables);
    expect(result[0].tableId).toBeNull();
  });

  it("tableId valid → păstrat", () => {
    const tables = buildTemplate();
    const validId = tables.find((t) => t.type !== "bar").id;
    const guests = [{ ...INITIAL_GUESTS[0], tableId: validId }];
    const result = sanitizeLoadedGuests(guests, tables);
    expect(result[0].tableId).toBe(validId);
  });

  it("guests invalid → fallback INITIAL_GUESTS", () => {
    const tables = buildTemplate();
    const result = sanitizeLoadedGuests(null, tables);
    expect(result.length).toBe(INITIAL_GUESTS.length);
  });
});

// ── Test 2b — sanitizeLoadedGuests normalizare ID-uri string ─────────────────

describe("sanitizeLoadedGuests — normalizare ID-uri string", () => {
  it("guest.tableId string numeric + table.id number → nu e orfan", () => {
    const tables = buildTemplate();
    const validId = tables.find((t) => t.type !== "bar").id;
    const guests = [{ ...INITIAL_GUESTS[0], tableId: String(validId) }];
    const result = sanitizeLoadedGuests(guests, tables);
    expect(result[0].tableId).toBe(validId);
  });

  it("table.id string numeric + guest.tableId number → nu e orfan", () => {
    const tables = buildTemplate().map((t) => ({ ...t, id: String(t.id) }));
    const validId = buildTemplate().find((t) => t.type !== "bar").id;
    const guests = [{ ...INITIAL_GUESTS[0], tableId: validId }];
    const result = sanitizeLoadedGuests(guests, tables);
    expect(result[0].tableId).toBe(validId);
  });

  it("tableId string numeric inexistent → null", () => {
    const tables = buildTemplate();
    const guests = [{ ...INITIAL_GUESTS[0], tableId: "9999" }];
    const result = sanitizeLoadedGuests(guests, tables);
    expect(result[0].tableId).toBeNull();
  });
});

// ── Test 3 — sanitizeLoadedNextId ────────────────────────────────────────────

describe("sanitizeLoadedNextId", () => {
  it("nextId prea mic → recalculat la maxTableId + 1", () => {
    const tables = buildTemplate();
    const maxId = Math.max(...tables.map((t) => t.id));
    const result = sanitizeLoadedNextId(1, tables);
    expect(result).toBe(maxId + 1);
  });

  it("nextId valid → păstrat", () => {
    const tables = buildTemplate();
    const maxId = Math.max(...tables.map((t) => t.id));
    const result = sanitizeLoadedNextId(maxId + 5, tables);
    expect(result).toBe(maxId + 5);
  });

  it("nextId non-number → recalculat", () => {
    const tables = buildTemplate();
    const maxId = Math.max(...tables.map((t) => t.id));
    const result = sanitizeLoadedNextId("invalid", tables);
    expect(result).toBe(maxId + 1);
  });
});

// ── Test 4 — sanitizeLoadedCam invalid ───────────────────────────────────────

describe("sanitizeLoadedCam — cameră invalidă", () => {
  it("null → getInitialCam(canvasW, canvasH)", () => {
    const result = sanitizeLoadedCam(null, 1200, 700);
    const expected = getInitialCam(1200, 700);
    expect(result.vx).toBeCloseTo(expected.vx, 5);
    expect(result.vy).toBeCloseTo(expected.vy, 5);
    expect(result.z).toBe(expected.z);
  });

  it("obiect fără vx → getInitialCam", () => {
    const result = sanitizeLoadedCam({ vy: 100, z: 1 }, 1200, 700);
    const expected = getInitialCam(1200, 700);
    expect(result.vx).toBeCloseTo(expected.vx, 5);
  });
});

// ── Test 5 — sanitizeLoadedCam clamp ─────────────────────────────────────────

describe("sanitizeLoadedCam — cameră în afara limitelor", () => {
  it("vx prea mic → clampat", () => {
    const result = sanitizeLoadedCam({ vx: -99999, vy: 0, z: 1 }, 1200, 700);
    expect(result.vx).toBeGreaterThan(-99999);
  });

  it("vx prea mare → clampat", () => {
    const result = sanitizeLoadedCam({ vx: 99999, vy: 0, z: 1 }, 1200, 700);
    expect(result.vx).toBeLessThan(99999);
  });
});

// ── Test 6 — loadStorageState fără date ──────────────────────────────────────

describe("loadStorageState — fără date în storage", () => {
  it("source === default când storage e gol", () => {
    const result = loadStorageState(1200, 700);
    expect(result.source).toBe("default");
    expect(result.ok).toBe(true);
  });

  it("data conține guests, tables, nextId, cam", () => {
    const result = loadStorageState(1200, 700);
    expect(result.data).toHaveProperty("guests");
    expect(result.data).toHaveProperty("tables");
    expect(result.data).toHaveProperty("nextId");
    expect(result.data).toHaveProperty("cam");
  });
});

// ── Test 7 — loadStorageState cu JSON corupt ─────────────────────────────────

describe("loadStorageState — JSON corupt", () => {
  it("source === default când JSON e invalid", () => {
    mockStorage.setItem(STORAGE_KEY, "{invalid json}");
    const result = loadStorageState(1200, 700);
    expect(result.source).toBe("default");
    expect(result.ok).toBe(true);
  });
});

// ── Test 8 — loadStorageState cu date valide ─────────────────────────────────

describe("loadStorageState — date valide", () => {
  it("source === storage, date sanitizate returnate", () => {
    const tables = buildTemplate();
    const guests = INITIAL_GUESTS.map((g) => ({ ...g }));
    const cam = { vx: 4500, vy: 4500, z: 1 };
    mockStorage.setItem(STORAGE_KEY, JSON.stringify({ guests, tables, nextId: 10, cam }));
    const result = loadStorageState(1200, 700);
    expect(result.source).toBe("storage");
    expect(result.ok).toBe(true);
    expect(result.data.tables.length).toBe(tables.length);
    expect(result.data.guests.length).toBe(guests.length);
    expect(result.data.nextId).toBeGreaterThan(0);
    expect(result.data.cam).toHaveProperty("vx");
    expect(result.data.cam).toHaveProperty("vy");
    expect(result.data.cam).toHaveProperty("z");
  });
});

// ── Test 9 — cleanupLegacyStorage ────────────────────────────────────────────

describe("cleanupLegacyStorage", () => {
  it("removed conține toate cheile vechi", () => {
    LEGACY_STORAGE_KEYS.forEach((k) => mockStorage.setItem(k, "test"));
    const result = cleanupLegacyStorage();
    expect(result.removed.length).toBe(LEGACY_STORAGE_KEYS.length);
    expect(result.failed.length).toBe(0);
  });

  it("cheile vechi sunt șterse din storage", () => {
    LEGACY_STORAGE_KEYS.forEach((k) => mockStorage.setItem(k, "test"));
    cleanupLegacyStorage();
    LEGACY_STORAGE_KEYS.forEach((k) => {
      expect(mockStorage.getItem(k)).toBeNull();
    });
  });
});

// ── Test 10 — saveStorageState ────────────────────────────────────────────────

describe("saveStorageState", () => {
  it("salvează exact guests, tables, nextId, cam", () => {
    const tables = buildTemplate();
    const guests = INITIAL_GUESTS.map((g) => ({ ...g }));
    const cam = getInitialCam(1200, 700);
    const result = saveStorageState({ guests, tables, nextId: 10, cam });
    expect(result.ok).toBe(true);
    expect(result.error).toBeNull();
    const saved = JSON.parse(mockStorage.getItem(STORAGE_KEY));
    expect(saved).toHaveProperty("guests");
    expect(saved).toHaveProperty("tables");
    expect(saved).toHaveProperty("nextId");
    expect(saved).toHaveProperty("cam");
    expect(saved).not.toHaveProperty("selectedTableId");
    expect(saved).not.toHaveProperty("editPanel");
    expect(saved).not.toHaveProperty("lockMode");
  });
});

// ── Test 11 — saveStorageState error handling ─────────────────────────────────

describe("saveStorageState — error handling", () => {
  it("setItem aruncă eroare → { ok:false, error }", () => {
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        ...mockStorage,
        setItem: () => {
          throw new Error("QuotaExceededError");
        },
      },
      writable: true,
      configurable: true,
    });
    const result = saveStorageState({
      guests: [],
      tables: [],
      nextId: 10,
      cam: getInitialCam(1200, 700),
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });
});

// ── Test 12 — bug fix față de v13.1 ──────────────────────────────────────────

describe("bug fix v13.1 — camera folosește dimensiuni reale", () => {
  it("loadStorageState(1920, 1080) fără cameră → getInitialCam(1920, 1080)", () => {
    const tables = buildTemplate();
    const guests = INITIAL_GUESTS.map((g) => ({ ...g }));
    mockStorage.setItem(STORAGE_KEY, JSON.stringify({ guests, tables, nextId: 10 }));
    const result = loadStorageState(1920, 1080);
    const expected = getInitialCam(1920, 1080);
    expect(result.data.cam.vx).toBeCloseTo(expected.vx, 5);
    expect(result.data.cam.vy).toBeCloseTo(expected.vy, 5);
    expect(result.data.cam.z).toBe(ZOOM_DEFAULT);
  });

  it("rezultatul este diferit față de getInitialCam(1200, 700)", () => {
    const tables = buildTemplate();
    const guests = INITIAL_GUESTS.map((g) => ({ ...g }));
    mockStorage.setItem(STORAGE_KEY, JSON.stringify({ guests, tables, nextId: 10 }));
    const result = loadStorageState(1920, 1080);
    const wrong = getInitialCam(1200, 700);
    expect(result.data.cam.vx).not.toBeCloseTo(wrong.vx, 3);
  });
});
