// utils/magicFill.test.js — Magic Fill V1.5
import { describe, it, expect } from "vitest";
import { calculateMagicFill, calculateMagicFillWithLimits } from "./magicFill.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTable(id, seats, type = "round") {
  return { id, name: `Masa ${id}`, type, seats, x: 0, y: 0, rotation: 0, isRing: false };
}

function makeGuest(id, grup, status = "confirmat") {
  return { id, prenume: `P${id}`, nume: `N${id}`, grup, status, meniu: "Standard", tableId: null };
}

// ── Test 1: Grup încape într-o singură masă ───────────────────────────────────

describe("T1 — grup încape compact", () => {
  it("toți membrii grupului la aceeași masă", () => {
    const tables = [makeTable(1, 8)];
    const guests = [
      makeGuest(1, "Familia A"),
      makeGuest(2, "Familia A"),
      makeGuest(3, "Familia A"),
    ];
    const res = calculateMagicFill(guests, tables);
    expect(res.assignments[1]).toBe(1);
    expect(res.assignments[2]).toBe(1);
    expect(res.assignments[3]).toBe(1);
    expect(res.assignmentsCount).toBe(3);
  });
});

// ── Test 2: Grup prea mare → skip complet ────────────────────────────────────

describe("T2 — grup prea mare → skip", () => {
  // SKIP — testa comportamentul vechi buggy. Noul algoritm V2.0 nu populează niciodată
  // `skippedGroups` (returnează mereu []); grupurile care nu încap sunt fie fragmentate
  // prin E4/E5, fie individuale rămân în skippedGuests. Schimbat deliberat conform spec V2.0.
  it.skip("apare în skippedGroups, nu în assignments", () => {
    const tables = [makeTable(1, 4)];
    const guests = [1, 2, 3, 4, 5].map((i) => makeGuest(i, "Mare"));
    const res = calculateMagicFill(guests, tables);
    expect(res.skippedGroups.length).toBe(1);
    expect(res.skippedGroups[0].groupName).toBe("Mare");
    for (let i = 1; i <= 5; i++) {
      expect(res.assignments[i]).toBeUndefined();
    }
    expect(res.assignmentsCount).toBe(0);
  });
});

// ── Test 3: Prezidiu exclus — mese ───────────────────────────────────────────

describe("T3 — masă prezidiu exclusă", () => {
  it("niciun guest asignat la masa prezidiu", () => {
    const tables = [makeTable(1, 8), { ...makeTable(2, 8), type: "prezidiu" }];
    const guests = [1, 2, 3].map((i) => makeGuest(i, "Prieteni"));
    const res = calculateMagicFill(guests, tables);
    for (const gId of Object.keys(res.assignments)) {
      expect(res.assignments[gId]).not.toBe(2);
    }
  });
});

// ── Test 4: Prezidiu exclus — guests ─────────────────────────────────────────

describe("T4 — guests cu grup Prezidiu excluși", () => {
  it("nu apar în assignments, prezidiuSkipped corect", () => {
    const tables = [makeTable(1, 8)];
    const guests = [makeGuest(1, "Prezidiu"), makeGuest(2, "Prezidiu"), makeGuest(3, "Prieteni")];
    const res = calculateMagicFill(guests, tables);
    expect(res.assignments[1]).toBeUndefined();
    expect(res.assignments[2]).toBeUndefined();
    expect(res.assignments[3]).toBe(1);
    expect(res.prezidiuSkipped).toBe(2);
  });
});

// ── Test 5: Prezidiu case-insensitive ─────────────────────────────────────────

describe("T5 — Prezidiu case-insensitive", () => {
  it("prezidiu, Prezidiu, PREZIDIU toate excluse", () => {
    const tables = [makeTable(1, 8)];
    const guests = [
      makeGuest(1, "prezidiu"),
      makeGuest(2, "Prezidiu"),
      makeGuest(3, "PREZIDIU"),
      makeGuest(4, "Normal"),
    ];
    const res = calculateMagicFill(guests, tables);
    expect(res.assignments[1]).toBeUndefined();
    expect(res.assignments[2]).toBeUndefined();
    expect(res.assignments[3]).toBeUndefined();
    expect(res.assignments[4]).toBe(1);
    expect(res.prezidiuSkipped).toBe(3);
  });
});

// ── Test 6: Status declinat exclus ───────────────────────────────────────────

describe("T6 — status declinat exclus", () => {
  it("invitat declinat (RSVP) nu apare în assignments", () => {
    const tables = [makeTable(1, 8)];
    const guests = [
      makeGuest(1, "Grup A"),
      { ...makeGuest(2, "Grup A"), guest_events: [{ attendance_status: "declined" }] },
    ];
    const res = calculateMagicFill(guests, tables);
    expect(res.assignments[1]).toBe(1);
    expect(res.assignments[2]).toBeUndefined();
  });
});

// ── Test 7: Invitații deja asignați nu sunt atinși ───────────────────────────

describe("T7 — invitați deja asignați", () => {
  it("tableId existent rămâne neschimbat", () => {
    const tables = [makeTable(1, 8), makeTable(2, 8)];
    const guests = [
      { ...makeGuest(1, "Grup A"), tableId: 2 }, // deja la masa 2
      makeGuest(2, "Grup A"),
    ];
    const res = calculateMagicFill(guests, tables);
    expect(res.assignments[1]).toBeUndefined(); // nu îl mișcăm
    expect(res.assignments[2]).toBeDefined();
  });
});

// ── Test 8: Determinism ───────────────────────────────────────────────────────

describe("T8 — determinism", () => {
  it("3 apeluri consecutive cu același input → același output", () => {
    const tables = [makeTable(1, 8), makeTable(2, 8)];
    const guests = [
      ...[1, 2, 3].map((i) => makeGuest(i, "Grup A")),
      ...[4, 5].map((i) => makeGuest(i, "Grup B")),
    ];
    const r1 = calculateMagicFill(guests, tables);
    const r2 = calculateMagicFill(guests, tables);
    const r3 = calculateMagicFill(guests, tables);
    expect(r1.assignments).toEqual(r2.assignments);
    expect(r2.assignments).toEqual(r3.assignments);
    expect(r1.locuriGoale).toBe(r2.locuriGoale);
    expect(r2.locuriGoale).toBe(r3.locuriGoale);
  });
});

// ── Test 9: Input-urile originale nu sunt mutate ──────────────────────────────

describe("T9 — input-uri read-only", () => {
  it("guests și tables identice după apel", () => {
    const tables = [makeTable(1, 8)];
    const guests = [makeGuest(1, "Grup A"), makeGuest(2, "Grup A")];
    const tablesCopy = JSON.parse(JSON.stringify(tables));
    const guestsCopy = JSON.parse(JSON.stringify(guests));
    calculateMagicFill(guests, tables);
    expect(guests).toEqual(guestsCopy);
    expect(tables).toEqual(tablesCopy);
  });
});

// ── Test 10: guests gol ───────────────────────────────────────────────────────

describe("T10 — guests gol", () => {
  it("return imediat cu assignments gol", () => {
    const res = calculateMagicFill([], [makeTable(1, 8)]);
    expect(res.assignments).toEqual({});
    expect(res.assignmentsCount).toBe(0);
    expect(res.limitReached).toBe(false);
  });
});

// ── Test 11: tables gol ───────────────────────────────────────────────────────

describe("T11 — tables gol", () => {
  it("return imediat, toți în skippedGuests", () => {
    const guests = [makeGuest(1, "Grup A"), makeGuest(2, "Grup A")];
    const res = calculateMagicFill(guests, []);
    expect(res.assignments).toEqual({});
    expect(res.skippedGuests.length).toBe(2);
    expect(res.limitReached).toBe(false);
  });
});

// ── Test 12: Fallback greedy funcționează ─────────────────────────────────────

describe("T12 — fallback greedy", () => {
  // SKIP — testa comportamentul vechi cu `maxIterations`. Noul algoritm V2.0 este un
  // pipeline single-pass determinist (E0→E1→E2→E4→E3→E5), fără concept de iterații.
  // Parametrul `maxIterations` este ignorat și `limitReached` este mereu false.
  // Schimbat deliberat conform spec V2.0.
  it.skip("maxIterations:1 → limitReached=true, rezultat non-gol dacă există locuri", () => {
    const tables = [makeTable(1, 8), makeTable(2, 8)];
    const guests = [
      ...[1, 2, 3, 4].map((i) => makeGuest(i, "Grup A")),
      ...[5, 6, 7, 8].map((i) => makeGuest(i, "Grup B")),
    ];
    const res = calculateMagicFillWithLimits(guests, tables, {
      maxIterations: 1,
      maxTimeMs: 10000,
    });
    expect(res.limitReached).toBe(true);
    expect(res.assignmentsCount).toBeGreaterThan(0);
  });
});

// ── Test 13: Limita de iterații respectată ────────────────────────────────────

describe("T13 — limita de iterații", () => {
  // SKIP — același motiv ca T12: algoritmul V2.0 nu are bucla de iterații, deci
  // `maxIterations` nu mai declanșează `limitReached`. Schimbat deliberat conform spec V2.0.
  it.skip("limitReached=true la maxIterations:5 cu input complex", () => {
    const tables = [makeTable(1, 10), makeTable(2, 10), makeTable(3, 10)];
    const guests = [];
    let id = 1;
    for (let g = 1; g <= 8; g++) {
      for (let m = 0; m < 3; m++) guests.push(makeGuest(id++, `Grup${g}`));
    }
    const res = calculateMagicFillWithLimits(guests, tables, {
      maxIterations: 5,
      maxTimeMs: 10000,
    });
    expect(res.limitReached).toBe(true);
  });
});

// ── Test 14: Limita de timp respectată ───────────────────────────────────────

describe("T14 — limita de timp", () => {
  it("limitReached=true la maxTimeMs:1 cu input complex", () => {
    const tables = [makeTable(1, 10), makeTable(2, 10), makeTable(3, 10), makeTable(4, 10)];
    const guests = [];
    let id = 1;
    for (let g = 1; g <= 10; g++) {
      for (let m = 0; m < 4; m++) guests.push(makeGuest(id++, `Grup${g}`));
    }
    const res = calculateMagicFillWithLimits(guests, tables, {
      maxIterations: 1000000,
      maxTimeMs: 1,
    });
    // Fie limitReached, fie a terminat rapid (puține grupuri)
    expect(typeof res.limitReached).toBe("boolean");
    expect(res.assignmentsCount).toBeGreaterThanOrEqual(0);
  });
});

// ── Test 15: Backtracking găsește soluție mai bună decât greedy ───────────────

describe("T15 — backtracking bate greedy", () => {
  it("backtracking găsește locuriGoale < greedy", () => {
    // Caz construit: 2 mese × 4, grupuri G1(3), G2(3)
    // Greedy: G1→masa1(3/4, rem=1), G2→masa2(3/4, rem=1) → locuriGoale=2
    // Backtracking: același, dar verificăm că găsim soluția cu locuriGoale minim
    // Alt caz mai bun: G1(4) + G2(4) cu 2 mese × 4 → locuriGoale=0
    const tables = [makeTable(1, 4), makeTable(2, 4)];
    const guests = [
      ...[1, 2, 3, 4].map((i) => makeGuest(i, "G1")),
      ...[5, 6, 7, 8].map((i) => makeGuest(i, "G2")),
    ];
    const res = calculateMagicFill(guests, tables);
    expect(res.locuriGoale).toBe(0);
    expect(res.assignmentsCount).toBe(8);
  });
});

// ── Test 16 — TEST DE REFERINȚĂ OBLIGATORIU ──────────────────────────────────

describe("T16 — test de referință", () => {
  // SKIP — testa că G5(9) apare în `skippedGroups` (comportament vechi: skip grup prea mare).
  // Noul algoritm V2.0 fragmentează G5 prin E4/E5 și nu populează niciodată `skippedGroups`.
  // Restul asertiunilor (locuriGoale=0, assignmentsCount=24, determinism) rămân valide
  // și sunt acoperite de S1-S10. Schimbat deliberat conform spec V2.0.
  it.skip("3 mese × 8, grupuri mixte, G5(9) skip → locuriGoale=0, assignmentsCount=24", () => {
    const tables = [makeTable(1, 8), makeTable(2, 8), makeTable(3, 8)];

    // Grupuri: G10(8), G9(7), G1(6), G7(5), G2(4), G6(3), G3(2), G4(2), G5(9→skip)
    // Total eligibil = 8+7+6+5+4+3+2+2 = 37, dar 3×8=24 locuri
    // G5(9) skip → rămân 8+7+6+5+4+3+2+2=37 dar locuri=24
    // Deci trebuie să găsim combinația care umple exact 24 locuri
    // Combinație validă: G10(8)→m1, G9(7)+G1(1din6 nu merge)
    // Soluție: G10(8)→m1, G2(4)+G6(3)+G3(2)+G4(2)-1=10 prea mult
    // Corect: G10(8)→m1, G9(7)+G1(1)=8→m2 dar G1=6 nu se sparge
    // Soluție optimă: G1(6)+G2(4)-2=8? nu, grupuri nu se sparg
    // G10(8)→m1 | G9(7)+G3(1din2 nu)
    // Trebuie: sum subset = 24 din {8,7,6,5,4,3,2,2}
    // 8+7+... = 8+7=15, +6=21, +3=24 ✓ → G10+G9+G1+G6
    // Sau 8+7+5+4=24 → G10+G9+G7+G2
    // etc. Există combinații de 24 → locuriGoale=0

    const guests = [];
    let id = 1;
    const groupSizes = [
      ["G10", 8],
      ["G9", 7],
      ["G1", 6],
      ["G7", 5],
      ["G2", 4],
      ["G6", 3],
      ["G3", 2],
      ["G4", 2],
      ["G5", 9], // va fi skip
    ];
    for (const [name, size] of groupSizes) {
      for (let i = 0; i < size; i++) {
        guests.push(makeGuest(id++, name));
      }
    }

    const res = calculateMagicFill(guests, tables);

    expect(res.locuriGoale).toBe(0);
    expect(res.limitReached).toBe(false);
    expect(res.assignmentsCount).toBe(24);
    expect(res.skippedGroups.some((sg) => sg.groupName === "G5")).toBe(true);

    // Verifică că nicio masă nu e depășită
    const occupancy = { 1: 0, 2: 0, 3: 0 };
    for (const [gId, tId] of Object.entries(res.assignments)) {
      occupancy[tId] = (occupancy[tId] || 0) + 1;
    }
    expect(occupancy[1]).toBeLessThanOrEqual(8);
    expect(occupancy[2]).toBeLessThanOrEqual(8);
    expect(occupancy[3]).toBeLessThanOrEqual(8);

    // Determinism
    const res2 = calculateMagicFill(guests, tables);
    expect(res.assignments).toEqual(res2.assignments);
  });
});

// ── Test 17: Restaurare la backtrack corectă ──────────────────────────────────

describe("T17 — restaurare la backtrack", () => {
  it("freeSeatsByTableId are exact valoarea dinainte după backtrack", () => {
    // Verificăm indirect: dacă restaurarea e greșită,
    // al doilea apel cu același input va da alt rezultat
    const tables = [makeTable(1, 6), makeTable(2, 6)];
    const guests = [
      ...[1, 2, 3, 4, 5, 6].map((i) => makeGuest(i, "G1")),
      ...[7, 8, 9, 10, 11, 12].map((i) => makeGuest(i, "G2")),
    ];
    const r1 = calculateMagicFill(guests, tables);
    const r2 = calculateMagicFill(guests, tables);
    const r3 = calculateMagicFill(guests, tables);
    expect(r1.assignments).toEqual(r2.assignments);
    expect(r2.assignments).toEqual(r3.assignments);
    expect(r1.locuriGoale).toBe(0);
  });
});

// ── Test 18: Toți invitații rămași sunt Prezidiu ──────────────────────────────

describe("T18 — toți invitații sunt Prezidiu", () => {
  it("prezidiuSkipped=N, assignments={}, limitReached=false, assignmentsCount=0", () => {
    const tables = [makeTable(1, 8)];
    const guests = [makeGuest(1, "Prezidiu"), makeGuest(2, "PREZIDIU"), makeGuest(3, "prezidiu")];
    const res = calculateMagicFill(guests, tables);
    expect(res.prezidiuSkipped).toBe(3);
    expect(res.assignments).toEqual({});
    expect(res.limitReached).toBe(false);
    expect(res.assignmentsCount).toBe(0);
  });
});

// ── S1: Fit perfect mic ───────────────────────────────────────────────────────

describe("S1 — fit perfect mic (80 invitați / 80 locuri, 8×10)", () => {
  it("toți 80 asezați, locuriGoale=0, skippedGuests=0", () => {
    const tables = Array.from({ length: 8 }, (_, i) => makeTable(i + 1, 10));
    let id = 1;
    const groupDefs = [
      ["F.mireasă", 24],
      ["F.mire", 20],
      ["C.mireasă", 16],
      ["C.mire", 12],
      ["Prieteni", 8],
    ];
    const guests = [];
    for (const [grup, n] of groupDefs) {
      for (let i = 0; i < n; i++) guests.push(makeGuest(id++, grup));
    }
    const res = calculateMagicFill(guests, tables);
    expect(res.assignmentsCount).toBe(80);
    expect(res.skippedGuests.length).toBe(0);
    expect(res.locuriGoale).toBe(0);
  });
});

// ── S2: Surplus cu mese eterogene (testează R3) ───────────────────────────────

describe("S2 — surplus cu mese eterogene 168/176 locuri (testează R3)", () => {
  // Fără R3 (reutilizare mese parțiale în E5 FAZA 1), 2 invitați din C.mireasă
  // nu ar găsi masă goală și ar rămâne neasezați.
  it("toți 168 asezați — fără R3, 2 rămân neasezați", () => {
    const tables = [
      // M1-M6: 12 locuri
      ...Array.from({ length: 6 }, (_, i) => makeTable(i + 1, 12)),
      // M7-M14: 10 locuri
      ...Array.from({ length: 8 }, (_, i) => makeTable(i + 7, 10)),
      // M15-M17: 8 locuri
      ...Array.from({ length: 3 }, (_, i) => makeTable(i + 15, 8)),
    ];
    let id = 1;
    const groupDefs = [
      ["F.mireasă", 45],
      ["F.mire", 38],
      ["Prieteni", 30],
      ["C.mireasă", 22],
      ["C.mire", 18],
      ["Vecini", 15],
    ];
    const guests = [];
    for (const [grup, n] of groupDefs) {
      for (let i = 0; i < n; i++) guests.push(makeGuest(id++, grup));
    }
    const res = calculateMagicFill(guests, tables);
    expect(res.assignmentsCount).toBe(168);
    expect(res.skippedGuests.length).toBe(0);
  });
});

// ── S3: Capacitate insuficientă ───────────────────────────────────────────────

describe("S3 — capacitate insuficientă (320 invitați / 296 locuri)", () => {
  it("296 asezați, 24 skipped, niciun grup complet respins", () => {
    const tables = [
      // M1-M20: 10 locuri
      ...Array.from({ length: 20 }, (_, i) => makeTable(i + 1, 10)),
      // M21-M28: 12 locuri
      ...Array.from({ length: 8 }, (_, i) => makeTable(i + 21, 12)),
    ];
    let id = 1;
    const groupDefs = [
      ["F.mireasă", 80],
      ["F.mire", 75],
      ["Colegi", 60],
      ["Vecini", 45],
      ["C.serviciu", 40],
      ["Copii", 20],
    ];
    const guests = [];
    for (const [grup, n] of groupDefs) {
      for (let i = 0; i < n; i++) guests.push(makeGuest(id++, grup));
    }
    const res = calculateMagicFill(guests, tables);
    expect(res.assignmentsCount).toBe(296);
    expect(res.skippedGuests.length).toBe(24);
    // niciun grup complet respins — cel puțin 1 membru din fiecare grup e asezat
    for (const [grup] of groupDefs) {
      const anyPlaced = guests
        .filter((g) => g.grup === grup)
        .some((g) => res.assignments[g.id] !== undefined);
      expect(anyPlaced).toBe(true);
    }
  });
});

// ── S4: Grup mai mare decât orice masă ───────────────────────────────────────

describe("S4 — grup mai mare decât orice masă (F.mireasă 35, 9×10)", () => {
  it("toți 89 asezați, F.mireasă pe ≥3 mese distincte", () => {
    const tables = Array.from({ length: 9 }, (_, i) => makeTable(i + 1, 10));
    let id = 1;
    const fMireasa = Array.from({ length: 35 }, () => makeGuest(id++, "F.mireasă"));
    const fMire    = Array.from({ length: 18 }, () => makeGuest(id++, "F.mire"));
    const prieteni = Array.from({ length: 22 }, () => makeGuest(id++, "Prieteni"));
    const cMire    = Array.from({ length: 14 }, () => makeGuest(id++, "C.mire"));
    const guests = [...fMireasa, ...fMire, ...prieteni, ...cMire];

    const res = calculateMagicFill(guests, tables);

    expect(res.assignmentsCount).toBe(89);
    expect(res.skippedGuests.length).toBe(0);

    const fMireasaTables = new Set(
      fMireasa.map((g) => res.assignments[g.id]).filter((t) => t !== undefined)
    );
    expect(fMireasaTables.size).toBeGreaterThanOrEqual(3);
  });
});

// ── S5: Ocupare parțială cu grupuri pure ─────────────────────────────────────

describe("S5 — ocupare parțială cu grupuri pure (invitați pre-asignați)", () => {
  it("78 neasignați asezați, M1/M2/M3 nu primesc oaspeți noi", () => {
    const tables = Array.from({ length: 12 }, (_, i) => makeTable(i + 1, 10));
    let id = 1;
    // F.mireasă: 10 @M1, 10 @M2, 10 neasignați
    const fMireasa = [
      ...Array.from({ length: 10 }, () => ({ ...makeGuest(id++, "F.mireasă"), tableId: 1 })),
      ...Array.from({ length: 10 }, () => ({ ...makeGuest(id++, "F.mireasă"), tableId: 2 })),
      ...Array.from({ length: 10 }, () => makeGuest(id++, "F.mireasă")),
    ];
    // F.mire: 10 @M3, 18 neasignați
    const fMire = [
      ...Array.from({ length: 10 }, () => ({ ...makeGuest(id++, "F.mire"), tableId: 3 })),
      ...Array.from({ length: 18 }, () => makeGuest(id++, "F.mire")),
    ];
    // restul neasignați
    const cMireasa = Array.from({ length: 20 }, () => makeGuest(id++, "C.mireasă"));
    const cMire    = Array.from({ length: 16 }, () => makeGuest(id++, "C.mire"));
    const prieteni = Array.from({ length: 14 }, () => makeGuest(id++, "Prieteni"));

    const guests = [...fMireasa, ...fMire, ...cMireasa, ...cMire, ...prieteni];
    const res = calculateMagicFill(guests, tables);

    expect(res.assignmentsCount).toBe(78);
    expect(res.skippedGuests.length).toBe(0);

    // niciun oaspete inițial neasignat nu merge la M1, M2 sau M3
    const unassigned = guests.filter((g) => g.tableId === null);
    expect(unassigned.filter((g) => res.assignments[g.id] === 1).length).toBe(0);
    expect(unassigned.filter((g) => res.assignments[g.id] === 2).length).toBe(0);
    expect(unassigned.filter((g) => res.assignments[g.id] === 3).length).toBe(0);
  });
});

// ── S6: Mese mixte manual (locked) ───────────────────────────────────────────

describe("S6 — mese locked și continuabilă, capacitate parțială", () => {
  it("55 asezați, 8 skipped, mesele locked intacte", () => {
    const tables = Array.from({ length: 8 }, (_, i) => makeTable(i + 1, 10));
    let id = 1;

    // M1 LOCKED: 3 F.mireasă + 4 F.mire (mixtă, 3 locuri pierdute)
    const fMireasa = [
      ...Array.from({ length: 3 }, () => ({ ...makeGuest(id++, "F.mireasă"), tableId: 1 })),
    ];
    const fMire = [
      ...Array.from({ length: 4 }, () => ({ ...makeGuest(id++, "F.mire"), tableId: 1 })),
    ];

    // M2 LOCKED: 2 Prieteni + 3 C.birou (mixtă, 5 locuri pierdute)
    const prieteni = [
      ...Array.from({ length: 2 }, () => ({ ...makeGuest(id++, "Prieteni"), tableId: 2 })),
    ];
    const cBirou = [
      ...Array.from({ length: 3 }, () => ({ ...makeGuest(id++, "C.birou"), tableId: 2 })),
    ];

    // M3 CONTINUABILĂ: 5 F.mireasă (pură, 5 locuri libere)
    fMireasa.push(...Array.from({ length: 5 }, () => ({ ...makeGuest(id++, "F.mireasă"), tableId: 3 })));

    // Neasignați: total 63
    fMireasa.push(...Array.from({ length: 17 }, () => makeGuest(id++, "F.mireasă")));
    fMire.push(...Array.from({ length: 18 }, () => makeGuest(id++, "F.mire")));
    prieteni.push(...Array.from({ length: 16 }, () => makeGuest(id++, "Prieteni")));
    cBirou.push(...Array.from({ length: 12 }, () => makeGuest(id++, "C.birou")));

    const guests = [...fMireasa, ...fMire, ...prieteni, ...cBirou];
    const res = calculateMagicFill(guests, tables);

    expect(res.assignmentsCount).toBe(55);
    expect(res.skippedGuests.length).toBe(8);

    // niciun oaspete neasignat nu merge la M1 sau M2 (mese locked)
    const unassigned = guests.filter((g) => g.tableId === null);
    expect(unassigned.filter((g) => res.assignments[g.id] === 1).length).toBe(0);
    expect(unassigned.filter((g) => res.assignments[g.id] === 2).length).toBe(0);
  });
});

// ── S7: Multe grupuri mici (testează R5/E3) ──────────────────────────────────

describe("S7 — grupuri mici, combinații R5 (40×G2 + 10×H3 + 5×I1)", () => {
  it("toți 115 asezați, ≥2 mese cu ≥3 grupuri distincte", () => {
    const tables = [
      ...Array.from({ length: 8 }, (_, i) => makeTable(i + 1, 10)),  // M1-M8
      ...Array.from({ length: 4 }, (_, i) => makeTable(i + 9, 8)),   // M9-M12
      makeTable(13, 4),                                                 // M13
    ];
    let id = 1;
    const guests = [];

    // 40 grupuri × 2 persoane (G01..G40)
    for (let g = 1; g <= 40; g++) {
      const name = `G${String(g).padStart(2, "0")}`;
      guests.push(makeGuest(id++, name));
      guests.push(makeGuest(id++, name));
    }
    // 10 grupuri × 3 persoane (H01..H10)
    for (let h = 1; h <= 10; h++) {
      const name = `H${String(h).padStart(2, "0")}`;
      for (let m = 0; m < 3; m++) guests.push(makeGuest(id++, name));
    }
    // 5 singletons cu grupuri unice (I01..I05)
    for (let i = 1; i <= 5; i++) {
      guests.push(makeGuest(id++, `I${String(i).padStart(2, "0")}`));
    }

    const res = calculateMagicFill(guests, tables);

    expect(res.assignmentsCount).toBe(115);
    expect(res.skippedGuests.length).toBe(0);

    // ≥2 mese au ≥3 grupuri distincte (E3 a împachetat combos)
    const tableGroups = {};
    for (const g of guests) {
      const tId = res.assignments[g.id];
      if (tId !== undefined) {
        if (!tableGroups[tId]) tableGroups[tId] = new Set();
        tableGroups[tId].add(g.grup);
      }
    }
    const tablesWithManyGroups = Object.values(tableGroups).filter((s) => s.size >= 3);
    expect(tablesWithManyGroups.length).toBeGreaterThanOrEqual(2);
  });
});

// ── S8: Stress 500 invitați + 30 singletons (testează R6 FAZA 2) ─────────────

describe("S8 — stress 500 invitați + 30 singletons (testează R6 FAZA 2)", () => {
  it("toți 500 asezați, ≥2 mese cu ≥3 singletons grupați", () => {
    const tables = [
      ...Array.from({ length: 30 }, (_, i) => makeTable(i + 1, 12)),  // M1-M30
      ...Array.from({ length: 15 }, (_, i) => makeTable(i + 31, 10)), // M31-M45
    ];
    let id = 1;
    const guests = [];
    for (const [grup, n] of [
      ["F.mireasă", 120],
      ["F.mire", 110],
      ["C+P mireasă", 85],
      ["C+P mire", 75],
      ["Cunoștințe", 60],
      ["Copii", 20],
    ]) {
      for (let i = 0; i < n; i++) guests.push(makeGuest(id++, grup));
    }
    for (let s = 1; s <= 30; s++) {
      guests.push(makeGuest(id++, `Onoare${String(s).padStart(2, "0")}`));
    }

    const res = calculateMagicFill(guests, tables);

    expect(res.assignmentsCount).toBe(500);
    expect(res.skippedGuests.length).toBe(0);

    // R6 FAZA 2: singletons grupați împreună pe ≥2 mese cu ≥3 fiecare
    const singletonGrupuri = new Set(
      guests.filter((g) => g.grup.startsWith("Onoare")).map((g) => g.grup)
    );
    const singletonTableCount = {};
    for (const g of guests.filter((g) => singletonGrupuri.has(g.grup))) {
      const tId = res.assignments[g.id];
      if (tId !== undefined) {
        singletonTableCount[tId] = (singletonTableCount[tId] ?? 0) + 1;
      }
    }
    const tablesWithManySingletons = Object.values(singletonTableCount).filter((c) => c >= 3);
    expect(tablesWithManySingletons.length).toBeGreaterThanOrEqual(2);
  });
});

// ── S9: Grupuri epuizate manual ───────────────────────────────────────────────

describe("S9 — grupuri pre-asignate epuizate, E1 plasează restul", () => {
  it("doar 10 Prieteni asezați la M5, assignmentsCount===10", () => {
    const tables = Array.from({ length: 5 }, (_, i) => makeTable(i + 1, 10));
    let id = 1;
    const fMireasa = [
      ...Array.from({ length: 10 }, () => ({ ...makeGuest(id++, "F.mireasă"), tableId: 1 })),
      ...Array.from({ length: 10 }, () => ({ ...makeGuest(id++, "F.mireasă"), tableId: 2 })),
    ];
    const fMire = [
      ...Array.from({ length: 10 }, () => ({ ...makeGuest(id++, "F.mire"), tableId: 3 })),
      ...Array.from({ length: 10 }, () => ({ ...makeGuest(id++, "F.mire"), tableId: 4 })),
    ];
    const prieteni = Array.from({ length: 10 }, () => makeGuest(id++, "Prieteni"));
    const guests = [...fMireasa, ...fMire, ...prieteni];

    const res = calculateMagicFill(guests, tables);

    expect(res.assignmentsCount).toBe(10);
    expect(res.skippedGuests.length).toBe(0);
    for (const g of prieteni) {
      expect(res.assignments[g.id]).toBe(5);
    }
  });
});

// ── S10: Prezidiu exclus ──────────────────────────────────────────────────────

describe("S10 — masă prezidiu exclusă, invitați Prezidiu pre-asignați", () => {
  it("108 asezați, prezidiuSkipped===0, M99 intactă", () => {
    const tables = [
      { ...makeTable(99, 12), type: "prezidiu" },
      ...Array.from({ length: 9 }, (_, i) => makeTable(i + 1, 12)),
    ];
    let id = 1;
    const prezidiuGuests = Array.from({ length: 12 }, () => ({
      ...makeGuest(id++, "Prezidiu"),
      tableId: 99,
    }));
    const fMireasa = Array.from({ length: 36 }, () => makeGuest(id++, "F.mireasă"));
    const fMire    = Array.from({ length: 30 }, () => makeGuest(id++, "F.mire"));
    const prieteni = Array.from({ length: 42 }, () => makeGuest(id++, "Prieteni"));
    const guests = [...prezidiuGuests, ...fMireasa, ...fMire, ...prieteni];

    const res = calculateMagicFill(guests, tables);

    expect(res.assignmentsCount).toBe(108);
    expect(res.prezidiuSkipped).toBe(0);
    for (const [, tId] of Object.entries(res.assignments)) {
      expect(tId).not.toBe(99);
    }
  });
});
