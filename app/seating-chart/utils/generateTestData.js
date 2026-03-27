/**
 * generateTestData.js
 *
 * Script de generare date de test pentru Seating Chart — Faza 2B.
 * Populează localStorage cu 60 mese și 600 invitați distribuiți realist.
 *
 * Rulare din browser console:
 *   const { generateAndLoad } = await import('/seating-chart/utils/generateTestData.js');
 *   generateAndLoad();
 *   // Apoi reload pagina pentru a vedea datele
 *
 * Sau, dacă scriptul e deja încărcat:
 *   generateAndLoad();
 */

// ── CONSTANTE (aliniate cu geometry.js) ──────────────────────────────────────

const STORAGE_KEY = "wedding_seating_v14";
const PLAN_CX = 5250;
const PLAN_CY = 5250;
const GRID = 20;

// ── DATE REALISTE ROMÂNEȘTI ──────────────────────────────────────────────────

const PRENUME_M = [
  "Alexandru", "Andrei", "Bogdan", "Călin", "Claudiu",
  "Constantin", "Cosmin", "Cristian", "Dan", "Daniel",
  "David", "Dragoș", "Emil", "Florin", "Gabriel",
  "George", "Gheorghe", "Iancu", "Ionuț", "Ion",
  "Iulian", "Liviu", "Lucian", "Marian", "Mihai",
  "Mircea", "Nicolae", "Octavian", "Paul", "Petru",
  "Radu", "Robert", "Silviu", "Ștefan", "Teodor",
  "Tudor", "Valentin", "Vasile", "Victor", "Vlad",
];

const PRENUME_F = [
  "Alexandra", "Alina", "Ana", "Andreea", "Bianca",
  "Carmen", "Cătălina", "Claudia", "Corina", "Cristina",
  "Diana", "Elena", "Gabriela", "Georgiana", "Ioana",
  "Irina", "Laura", "Lavinia", "Lidia", "Loredana",
  "Lucia", "Luminița", "Maria", "Mihaela", "Monica",
  "Nicoleta", "Oana", "Raluca", "Ramona", "Roxana",
  "Simona", "Sorina", "Ștefania", "Teodora", "Valentina",
];

const NUME = [
  "Alexandrescu", "Badea", "Barbu", "Bogdan", "Bratu",
  "Ciobanu", "Cojocaru", "Constantin", "Costea", "Cristea",
  "Dima", "Dragomir", "Dumitrescu", "Florescu", "Gheorghe",
  "Grecu", "Iacob", "Ionescu", "Iordache", "Lazar",
  "Lungu", "Manole", "Marinescu", "Matei", "Mihai",
  "Moldovan", "Nedelcu", "Niculescu", "Oprea", "Popa",
  "Popescu", "Radu", "Roman", "Rusu", "Sava",
  "Stan", "Stanciu", "Stoica", "Toma", "Tudor",
  "Ungureanu", "Vasile", "Vlad", "Zamfir", "Zaharia",
];

const GRUPURI = [
  "Familie Mireasă",
  "Familie Mire",
  "Prezidiu",
  "Prieteni Comuni",
  "Colegi Mireasă",
  "Colegi Mire",
  "Vecini Mireasă",
  "Vecini Mire",
  "Prieteni Copilărie Mireasă",
  "Prieteni Copilărie Mire",
  "Rude Mireasă",
  "Rude Mire",
  "Nași",
  "Martori",
  "Amici Comuni",
  "Colegi Foști",
  "Familie Extinsă Mireasă",
  "Familie Extinsă Mire",
  "Prieteni din Facultate",
  "Colegi de Muncă",
];

const MENIURI = [
  "Standard", "Standard", "Standard", "Standard", "Standard",
  "Vegetarian", "Vegetarian",
  "Vegan",
  "Fără gluten",
  "Copil",
];

const STATUSURI = [
  "confirmat", "confirmat", "confirmat", "confirmat",
  "in_asteptare",
  "confirmat",
];

// ── UTILITARE ────────────────────────────────────────────────────────────────

function snapToGrid(val) {
  return Math.round(val / GRID) * GRID;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── GENERARE MESE ────────────────────────────────────────────────────────────

/**
 * Generează 60 de mese:
 * - id 1: Ring dans (bar, isRing, 0 locuri) — centrul planului
 * - id 2: Prezidiu (10 locuri) — deasupra ringului
 * - id 3–27: 25 mese rotunde (8-12 locuri) — inel interior
 * - id 28–47: 20 mese dreptunghiulare (8-14 locuri) — inel exterior
 * - id 48–59: 12 mese pătrate (8 locuri) — colțuri
 * - Total: 60 mese
 */
function generateTables() {
  const tables = [];
  let id = 1;

  // ── 1. Ring dans — centrul planului ──
  tables.push({
    id: id++,
    name: "Ring Dans",
    type: "bar",
    seats: 0,
    x: snapToGrid(PLAN_CX - 150),
    y: snapToGrid(PLAN_CY - 100),
    rotation: 0,
    isRing: true,
  });

  // ── 2. Prezidiu — deasupra ringului ──
  tables.push({
    id: id++,
    name: "Prezidiu",
    type: "prezidiu",
    seats: 10,
    x: snapToGrid(PLAN_CX - 180),
    y: snapToGrid(PLAN_CY - 360),
    rotation: 0,
  });

  // ── 3–27: 25 mese rotunde — inel interior (raza ~500px) ──
  const INNER_RADIUS = 520;
  const ROUND_COUNT = 25;
  for (let i = 0; i < ROUND_COUNT; i++) {
    const angle = (i / ROUND_COUNT) * 2 * Math.PI - Math.PI / 2;
    const seats = pick([8, 8, 8, 10, 10, 12]);
    tables.push({
      id: id++,
      name: `Masa ${id - 2}`,
      type: "round",
      seats,
      x: snapToGrid(PLAN_CX + INNER_RADIUS * Math.cos(angle) - 55 - seats * 8),
      y: snapToGrid(PLAN_CY + INNER_RADIUS * Math.sin(angle) - 55 - seats * 8),
      rotation: 0,
    });
  }

  // ── 28–47: 20 mese dreptunghiulare — inel exterior (raza ~950px) ──
  const OUTER_RADIUS = 950;
  const RECT_COUNT = 20;
  for (let i = 0; i < RECT_COUNT; i++) {
    const angle = (i / RECT_COUNT) * 2 * Math.PI - Math.PI / 4;
    const seats = pick([8, 8, 10, 10, 12, 14]);
    tables.push({
      id: id++,
      name: `Masa ${id - 2}`,
      type: "rect",
      seats,
      x: snapToGrid(PLAN_CX + OUTER_RADIUS * Math.cos(angle) - 150),
      y: snapToGrid(PLAN_CY + OUTER_RADIUS * Math.sin(angle) - 60),
      rotation: 0,
    });
  }

  // ── 48–59: 12 mese pătrate — colțuri și margini (raza ~1350px) ──
  const CORNER_RADIUS = 1350;
  const SQUARE_COUNT = 12;
  for (let i = 0; i < SQUARE_COUNT; i++) {
    const angle = (i / SQUARE_COUNT) * 2 * Math.PI;
    const seats = pick([8, 8, 8, 12]);
    tables.push({
      id: id++,
      name: `Masa ${id - 2}`,
      type: "square",
      seats,
      x: snapToGrid(PLAN_CX + CORNER_RADIUS * Math.cos(angle) - 80),
      y: snapToGrid(PLAN_CY + CORNER_RADIUS * Math.sin(angle) - 80),
      rotation: 0,
    });
  }

  return tables;
}

// ── GENERARE INVITAȚI ────────────────────────────────────────────────────────

/**
 * Generează 600 invitați distribuiți în grupuri de 4-12 persoane.
 * Distribuie invitații pe mese respectând capacitatea fiecărei mese.
 */
function generateGuests(tables) {
  // Construim lista de mese cu locuri disponibile (excludem ring/bar)
  const seatingTables = tables.filter(
    (t) => t.type !== "bar" && !t.isRing && t.seats > 0
  );

  // Calculăm capacitatea totală disponibilă
  const totalCapacity = seatingTables.reduce((sum, t) => sum + t.seats, 0);

  // Mapă tableId → locuri rămase
  const seatMap = new Map();
  seatingTables.forEach((t) => seatMap.set(t.id, t.seats));

  const guests = [];
  let guestId = 1;
  const usedNames = new Set();

  // Generăm 600 invitați în grupuri de 4-12
  const TARGET_GUESTS = 600;
  let grupIndex = 0;

  while (guests.length < TARGET_GUESTS) {
    const grupNume = GRUPURI[grupIndex % GRUPURI.length];
    const grupSuffix = grupIndex >= GRUPURI.length ? ` ${Math.floor(grupIndex / GRUPURI.length) + 1}` : "";
    const grupComplet = grupNume + grupSuffix;
    grupIndex++;

    const groupSize = randInt(4, 12);
    const actualSize = Math.min(groupSize, TARGET_GUESTS - guests.length);

    for (let i = 0; i < actualSize; i++) {
      // Generăm nume unic
      let prenume, nume, fullName;
      let attempts = 0;
      do {
        const isFemale = Math.random() < 0.5;
        prenume = isFemale ? pick(PRENUME_F) : pick(PRENUME_M);
        nume = pick(NUME);
        fullName = `${prenume} ${nume}`;
        attempts++;
      } while (usedNames.has(fullName) && attempts < 20);
      usedNames.add(fullName);

      guests.push({
        id: guestId++,
        prenume,
        nume,
        grup: grupComplet,
        status: pick(STATUSURI),
        meniu: pick(MENIURI),
        tableId: null, // se setează mai jos
      });
    }
  }

  // Distribuim invitații pe mese (câte 1 la rând, grupuri întregi pe aceeași masă când e posibil)
  // Grupăm invitații după grup
  const byGroup = new Map();
  guests.forEach((g) => {
    if (!byGroup.has(g.grup)) byGroup.set(g.grup, []);
    byGroup.get(g.grup).push(g);
  });

  // Queue mese cu locuri libere
  const tableQueue = seatingTables.map((t) => ({ id: t.id, free: t.seats }));
  let tableIdx = 0;

  // Alocăm fiecare grup pe mese consecutive
  for (const [, groupGuests] of byGroup) {
    for (const guest of groupGuests) {
      // Găsim masa cu loc disponibil
      let placed = false;
      for (let tries = 0; tries < tableQueue.length; tries++) {
        const tbl = tableQueue[tableIdx % tableQueue.length];
        if (tbl.free > 0) {
          guest.tableId = tbl.id;
          tbl.free--;
          placed = true;
          break;
        }
        tableIdx++;
      }
      if (!placed) {
        // Dacă nu mai sunt locuri, lăsăm nealocat
        guest.tableId = null;
      }
    }
    // Avansăm la masa următoare după fiecare grup (grupuri la mese separate pe cât posibil)
    if (tableIdx < tableQueue.length - 1) tableIdx++;
  }

  return guests;
}

// ── FUNCȚIE PRINCIPALĂ ───────────────────────────────────────────────────────

/**
 * Generează și salvează datele de test în localStorage.
 * Apelează din browser console: generateAndLoad()
 * Apoi reîncarcă pagina.
 */
export function generateAndLoad() {
  const tables = generateTables();
  const guests = generateGuests(tables);
  const nextId = Math.max(...tables.map((t) => t.id)) + 1;

  // Camera centrată pe planul de mese, zoom implicit
  const ZOOM_DEFAULT = 0.5; // zoom out pentru a vedea toate mesele
  const cam = {
    vx: PLAN_CX - 1200 / ZOOM_DEFAULT / 2,
    vy: PLAN_CY - 700 / ZOOM_DEFAULT / 2,
    z: ZOOM_DEFAULT,
  };

  const state = { guests, tables, nextId, cam };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("[generateTestData] localStorage.setItem failed:", e);
    return { ok: false, error: e, state };
  }

  // Raport
  const assignedGuests = guests.filter((g) => g.tableId !== null).length;
  const tableBreakdown = tables.reduce((acc, t) => {
    const key = t.isRing ? "ring" : t.type;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const totalCapacity = tables
    .filter((t) => t.type !== "bar" && !t.isRing)
    .reduce((sum, t) => sum + t.seats, 0);

  const report = {
    ok: true,
    tables: tables.length,
    tableBreakdown,
    guests: guests.length,
    assignedGuests,
    unassignedGuests: guests.length - assignedGuests,
    totalCapacity,
    storageKey: STORAGE_KEY,
    message: `OK — ${tables.length} mese, ${guests.length} invitați (${assignedGuests} alocați). Reîncarcă pagina pentru a vedea datele.`,
  };

  console.log("[generateTestData]", report.message);
  console.table(tableBreakdown);

  return report;
}

// ── EXPORT ────────────────────────────────────────────────────────────────────

export { STORAGE_KEY };

// Auto-expose pe window pentru rulare directă din console (non-module context)
if (typeof window !== "undefined") {
  window.__generateTestData = generateAndLoad;
}
