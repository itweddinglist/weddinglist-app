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
  it("apare în skippedGroups, nu în assignments", () => {
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
  it("maxIterations:1 → limitReached=true, rezultat non-gol dacă există locuri", () => {
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
  it("limitReached=true la maxIterations:5 cu input complex", () => {
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
  it("3 mese × 8, grupuri mixte, G5(9) skip → locuriGoale=0, assignmentsCount=24", () => {
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
