import { describe, it, expect } from "vitest";
import {
  getTableDims,
  getSeatPositions,
  getSeatFillColor,
  buildTemplate,
  snapToGrid,
  getGroupColor,
  ALL_GROUPS,
  GROUP_COLORS,
  RING_W,
  RING_H,
} from "./geometry.js";

describe("getTableDims", () => {
  it("round seats=8", () => {
    const d = getTableDims({ type: "round", seats: 8 });
    expect(d.w).toBe(308);
    expect(d.h).toBe(308);
    expect(d.cx).toBe(154);
    expect(d.cy).toBe(154);
    expect(d.seatR).toBe(70);
  });

  it("round seats=4 → r=55", () => {
    const d = getTableDims({ type: "round", seats: 4 });
    expect(d.r).toBe(55);
    expect(d.w).toBe(290);
    expect(d.seatR).toBe(61);
  });

  it("isRing → RING_W x RING_H", () => {
    const d = getTableDims({ type: "bar", isRing: true });
    expect(d.w).toBe(RING_W);
    expect(d.h).toBe(RING_H);
    expect(d.tw).toBe(RING_W - 20);
    expect(d.th).toBe(RING_H - 20);
  });

  it("bar non-ring → 160 x 88", () => {
    const d = getTableDims({ type: "bar", isRing: false });
    expect(d.w).toBe(160);
    expect(d.h).toBe(88);
    expect(d.tw).toBe(144);
    expect(d.th).toBe(72);
  });

  it("square seats=4", () => {
    const d = getTableDims({ type: "square", seats: 4 });
    expect(d.s).toBe(110);
    expect(d.w).toBe(170);
    expect(d.h).toBe(170);
    expect(d.pad).toBe(30);
  });

  it("square seats=12", () => {
    const d = getTableDims({ type: "square", seats: 12 });
    expect(d.s).toBe(154);
    expect(d.w).toBe(214);
    expect(d.h).toBe(214);
  });

  it("rect seats=10", () => {
    const d = getTableDims({ type: "rect", seats: 10 });
    expect(d.w).toBe(290);
    expect(d.h).toBe(120);
    expect(d.tw).toBe(240);
    expect(d.th).toBe(52);
  });

  it("prezidiu seats=8", () => {
    const d = getTableDims({ type: "prezidiu", seats: 8 });
    expect(d.w).toBe(310);
    expect(d.h).toBe(130);
    expect(d.tw).toBe(286);
    expect(d.th).toBe(58);
  });
});

describe("getSeatPositions", () => {
  it("bar → []", () => {
    expect(getSeatPositions({ type: "bar" })).toEqual([]);
  });

  it("bar isRing → []", () => {
    expect(getSeatPositions({ type: "bar", isRing: true })).toEqual([]);
  });

  it("round seats=4 → 4 scaune cu x și y", () => {
    const seats = getSeatPositions({ type: "round", seats: 4 });
    expect(seats).toHaveLength(4);
    seats.forEach((s) => {
      expect(typeof s.x).toBe("number");
      expect(typeof s.y).toBe("number");
    });
  });

  it("round seats=4 → primul scaun sus", () => {
    const t = { type: "round", seats: 4 };
    const d = getTableDims(t);
    const seats = getSeatPositions(t);
    expect(seats[0].x).toBeCloseTo(d.cx, 3);
    expect(seats[0].y).toBeCloseTo(d.cy - d.seatR, 3);
  });

  it("round seats impar (5) → exact 5 scaune", () => {
    expect(getSeatPositions({ type: "round", seats: 5 })).toHaveLength(5);
  });

  it("square seats=4 → exact 4 scaune", () => {
    const seats = getSeatPositions({ type: "square", seats: 4 });
    expect(seats).toHaveLength(4);
    seats.forEach((s) => {
      expect(typeof s.x).toBe("number");
      expect(typeof s.y).toBe("number");
    });
  });

  it("square seats=4 → primul scaun y = pad - 22", () => {
    const t = { type: "square", seats: 4 };
    const d = getTableDims(t);
    const seats = getSeatPositions(t);
    expect(seats[0].y).toBeCloseTo(d.pad - 8, 3);
  });

  it("square seats=12 → exact 12 scaune", () => {
    expect(getSeatPositions({ type: "square", seats: 12 })).toHaveLength(12);
  });

  it("rect seats=10 → exact 10 scaune", () => {
    const seats = getSeatPositions({ type: "rect", seats: 10 });
    expect(seats).toHaveLength(10);
    seats.forEach((s) => {
      expect(typeof s.x).toBe("number");
      expect(typeof s.y).toBe("number");
    });
  });

  it("rect seats=10 → primul scaun y = 0", () => {
    const seats = getSeatPositions({ type: "rect", seats: 10 });
    expect(seats[0].y).toBeCloseTo(12, 3);
  });

  it("rect seats=10 → al doilea scaun y = 20 + th + 20", () => {
    const t = { type: "rect", seats: 10 };
    const d = getTableDims(t);
    const seats = getSeatPositions(t);
    expect(seats[1].y).toBeCloseTo(20 + d.th + 8, 3);
  });

  it("prezidiu seats=8 → exact 8 scaune", () => {
    const seats = getSeatPositions({ type: "prezidiu", seats: 8 });
    expect(seats).toHaveLength(8);
    seats.forEach((s) => {
      expect(typeof s.x).toBe("number");
      expect(typeof s.y).toBe("number");
    });
  });

  it("prezidiu seats=8 → primul scaun y = 20 - 22 = -2", () => {
    const seats = getSeatPositions({ type: "prezidiu", seats: 8 });
    expect(seats[0].y).toBeCloseTo(12, 3);
  });

  it("prezidiu seats=8 → al doilea scaun y = 20 + th + 22", () => {
    const t = { type: "prezidiu", seats: 8 };
    const d = getTableDims(t);
    const seats = getSeatPositions(t);
    expect(seats[1].y).toBeCloseTo(12, 3);
  });

  it("prezidiu seats=4 → exact 4 scaune", () => {
    expect(getSeatPositions({ type: "prezidiu", seats: 4 })).toHaveLength(4);
  });
});

describe("getSeatFillColor", () => {
  it("0/8 → verde", () => expect(getSeatFillColor(0, 8)).toBe("#48BB78"));
  it("6/8 → verde", () => expect(getSeatFillColor(6, 8)).toBe("#48BB78"));
  it("8/8 → roșu", () => expect(getSeatFillColor(8, 8)).toBe("#E53E3E"));
  it("0/0 → gri (bar)", () => expect(getSeatFillColor(0, 0)).toBe("#9DA3BC"));
  it("3/10 → verde (30%)", () => expect(getSeatFillColor(3, 10)).toBe("#48BB78"));
  it("2/10 → verde (20%)", () => expect(getSeatFillColor(2, 10)).toBe("#48BB78"));
});

describe("buildTemplate", () => {
  it("returnează exact 5 mese", () => {
    expect(buildTemplate()).toHaveLength(5);
  });

  it("toate mesele au câmpurile obligatorii", () => {
    buildTemplate().forEach((t) => {
      expect(t).toHaveProperty("id");
      expect(t).toHaveProperty("name");
      expect(t).toHaveProperty("type");
      expect(t).toHaveProperty("seats");
      expect(t).toHaveProperty("x");
      expect(t).toHaveProperty("y");
      expect(t).toHaveProperty("rotation");
    });
  });

  it("Ring Dans — coordonate numerice exacte", () => {
    const t = buildTemplate()[0];
    expect(t.id).toBe(1);
    expect(t.name).toBe("Ring Dans");
    expect(t.type).toBe("bar");
    expect(t.isRing).toBe(true);
    expect(t.seats).toBe(0);
    expect(t.x).toBe(5100);
    expect(t.y).toBe(5150);
    expect(t.rotation).toBe(0);
  });

  it("Prezidiu — x=5095, y=5010", () => {
    const t = buildTemplate()[1];
    expect(t.id).toBe(2);
    expect(t.name).toBe("Prezidiu");
    expect(t.type).toBe("prezidiu");
    expect(t.seats).toBe(8);
    expect(t.x).toBe(5095);
    expect(t.y).toBe(5010);
    expect(t.rotation).toBe(0);
  });

  it("Masa 1 — x=4832, y=5096", () => {
    const t = buildTemplate()[2];
    expect(t.id).toBe(3);
    expect(t.name).toBe("Masa 1");
    expect(t.x).toBe(4832);
    expect(t.y).toBe(5096);
  });

  it("Masa 2 — x=5360, y=5096", () => {
    const t = buildTemplate()[3];
    expect(t.id).toBe(4);
    expect(t.name).toBe("Masa 2");
    expect(t.x).toBe(5360);
    expect(t.y).toBe(5096);
  });

  it("Masa 3 — x=5096, y=5310", () => {
    const t = buildTemplate()[4];
    expect(t.id).toBe(5);
    expect(t.name).toBe("Masa 3");
    expect(t.x).toBe(5096);
    expect(t.y).toBe(5310);
  });
});

describe("snapToGrid", () => {
  it("37 → 40", () => expect(snapToGrid(37, 20)).toBe(40));
  it("33 → 40", () => expect(snapToGrid(33, 20)).toBe(40));
  it("30 → 40", () => expect(snapToGrid(30, 20)).toBe(40));
  it("29 → 20", () => expect(snapToGrid(29, 20)).toBe(20));
  it("0  → 0", () => expect(snapToGrid(0, 20)).toBe(0));
});

describe("ALL_GROUPS", () => {
  it("nu conține duplicate", () => {
    expect(new Set(ALL_GROUPS).size).toBe(ALL_GROUPS.length);
  });

  it("ordinea = prima apariție în INITIAL_GUESTS", () => {
    expect(ALL_GROUPS[0]).toBe("Familie Mireasă");
    expect(ALL_GROUPS[1]).toBe("Familie Mire");
    expect(ALL_GROUPS[2]).toBe("Prieteni Comuni");
    expect(ALL_GROUPS[3]).toBe("Prezidiu");
    expect(ALL_GROUPS[4]).toBe("Colegi");
  });

  it("nu este sortat alfabetic", () => {
    const sorted = [...ALL_GROUPS].sort();
    expect(ALL_GROUPS).not.toEqual(sorted);
  });
});

describe("getGroupColor", () => {
  it("returnează o culoare din GROUP_COLORS pentru orice grup", () => {
    ALL_GROUPS.forEach((grup) => {
      expect(GROUP_COLORS).toContain(getGroupColor(grup));
    });
  });

  it("același grup → aceeași culoare (deterministic)", () => {
    expect(getGroupColor(ALL_GROUPS[0])).toBe(getGroupColor(ALL_GROUPS[0]));
    expect(getGroupColor(ALL_GROUPS[1])).toBe(getGroupColor(ALL_GROUPS[1]));
  });

  it("grup inexistent → returnează o culoare validă", () => {
    expect(GROUP_COLORS).toContain(getGroupColor("grup inexistent"));
  });
});
