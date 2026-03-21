import { buildTemplate, INITIAL_GUESTS } from './geometry.js';
import { clampCam, getInitialCam } from './camera.js';

// Browser-only. Consumă doar din
// useEffect sau client components.
// Nu importa în Server Components.

// ── CHEI STORAGE ──────────────────────────────────────────────────────────────

// v14 folosește cheie nouă pentru testare paralelă cu v13.1
export const STORAGE_KEY = 'wedding_seating_v14';

// Cheile vechi din v13.1: v2-v11 (v4 lipsea din v13.1 — păstrăm lista identică)
// Plus v12 și v13 adăugate explicit în v14 pentru cleanup complet
export const LEGACY_STORAGE_KEYS = [
  'wedding_seating_v2',
  'wedding_seating_v3',
  'wedding_seating_v5',
  'wedding_seating_v6',
  'wedding_seating_v7',
  'wedding_seating_v8',
  'wedding_seating_v9',
  'wedding_seating_v10',
  'wedding_seating_v11',
  // v12 și v13 adăugate în v14 pentru separare clară
  'wedding_seating_v12',
  'wedding_seating_v13',
];

// ── CLEANUP ───────────────────────────────────────────────────────────────────

export function cleanupLegacyStorage() {
  const removed = [];
  const failed = [];
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
      removed.push(key);
    } catch (e) {
      failed.push(key);
    }
  }
  return { removed, failed };
}

// ── VALIDARE INTERNĂ ──────────────────────────────────────────────────────────

function isNumeric(val) {
  return typeof val === 'number' ||
    (typeof val === 'string' && !isNaN(Number(val)));
}

function isValidTable(t) {
  return (
    t !== null &&
    typeof t === 'object' &&
    isNumeric(t.id) &&
    typeof t.name === 'string' &&
    typeof t.type === 'string' &&
    isNumeric(t.seats) &&
    isNumeric(t.x) &&
    isNumeric(t.y) &&
    isNumeric(t.rotation)
  );
}

function isValidGuest(g) {
  return (
    g !== null &&
    typeof g === 'object' &&
    isNumeric(g.id) &&
    typeof g.prenume === 'string' &&
    typeof g.nume === 'string' &&
    typeof g.grup === 'string' &&
    typeof g.status === 'string' &&
    typeof g.meniu === 'string'
  );
}

// ── SANITIZARE ────────────────────────────────────────────────────────────────

export function sanitizeLoadedTables(tables) {
  if (!Array.isArray(tables)) return buildTemplate();
  const valid = tables
    .filter(isValidTable)
    .map(t => ({
      ...t,
      id:       Number(t.id),
      seats:    Number(t.seats),
      x:        Number(t.x),
      y:        Number(t.y),
      rotation: Number(t.rotation),
    }));
  if (valid.length === 0) return buildTemplate();
  return valid;
}

export function sanitizeLoadedGuests(guests, tables) {
  if (!Array.isArray(guests)) return INITIAL_GUESTS.map(g => ({ ...g }));
  const tableIds = new Set(tables.map(t => Number(t.id)));
  const valid = guests
    .filter(isValidGuest)
    .map(g => ({
      ...g,
      id: Number(g.id),
      tableId:
        g.tableId != null && tableIds.has(Number(g.tableId))
          ? Number(g.tableId)
          : null,
    }));
  if (valid.length === 0) return INITIAL_GUESTS.map(g => ({ ...g }));
  return valid;
}

export function sanitizeLoadedNextId(nextId, tables) {
  const maxTableId = tables.reduce((max, t) => Math.max(max, t.id), 0);
  if (typeof nextId === 'number' && nextId > maxTableId) return nextId;
  return maxTableId + 1;
}

export function sanitizeLoadedCam(cam, canvasW, canvasH) {
  // Bugul v13.1: camera era restaurată cu canvasW:1200, canvasH:700 hardcodat.
  // În v14: folosim dimensiunile reale ale canvas-ului.
  if (
    cam === null ||
    typeof cam !== 'object' ||
    typeof cam.vx !== 'number' ||
    typeof cam.vy !== 'number' ||
    typeof cam.z !== 'number'
  ) {
    return getInitialCam(canvasW, canvasH);
  }
  return clampCam(cam.vx, cam.vy, cam.z, canvasW, canvasH);
}

// ── DEFAULT STATE ─────────────────────────────────────────────────────────────

export function buildDefaultStorageState(canvasW, canvasH) {
  const tables = buildTemplate();
  return {
    guests: INITIAL_GUESTS.map(g => ({ ...g })),
    tables,
    nextId: Math.max(...tables.map(t => t.id)) + 1,
    cam: getInitialCam(canvasW, canvasH),
  };
}

// ── LOAD ──────────────────────────────────────────────────────────────────────

export function loadStorageState(canvasW, canvasH) {
  // Pas 1: cleanup chei vechi
  const cleanup = cleanupLegacyStorage();

  // Pas 2: încearcă să citească din storage
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    return {
      ok: true,
      source: 'default',
      data: buildDefaultStorageState(canvasW, canvasH),
      cleanup,
    };
  }

  // Pas 3: nimic în storage → default
  if (raw === null) {
    return {
      ok: true,
      source: 'default',
      data: buildDefaultStorageState(canvasW, canvasH),
      cleanup,
    };
  }

  // Pas 4: încearcă JSON.parse
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return {
      ok: true,
      source: 'default',
      data: buildDefaultStorageState(canvasW, canvasH),
      cleanup,
    };
  }

  // Pas 5: sanitizare
  const tables = sanitizeLoadedTables(parsed.tables);
  const guests = sanitizeLoadedGuests(parsed.guests, tables);
  const nextId = sanitizeLoadedNextId(parsed.nextId, tables);
  // Compatibilitate cu schema veche v13.1 care salva vx/vy/vzoom separat
  const rawCam = parsed.cam
    ?? (parsed.vx != null || parsed.vy != null || parsed.vzoom != null
        ? { vx: parsed.vx, vy: parsed.vy, z: parsed.vzoom }
        : null);
  const cam = sanitizeLoadedCam(rawCam, canvasW, canvasH);

  return {
    ok: true,
    source: 'storage',
    data: { guests, tables, nextId, cam },
    cleanup,
  };
}

// ── SAVE ──────────────────────────────────────────────────────────────────────

export function saveStorageState({ guests, tables, nextId, cam }) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ guests, tables, nextId, cam })
    );
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: e };
  }
}