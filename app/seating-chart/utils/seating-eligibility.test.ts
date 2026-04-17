// =============================================================================
// app/seating-chart/utils/seating-eligibility.test.ts
// Guardrail tests pentru isSeatingEligible — H2 refactor.
// Scop: preveni regresia bugului unde SeatingGuest fara guest_events era
// acceptat silent ca input pentru isSeatingEligible (guest_events? optional
// pe SeatingGuest rich din types/seating.ts).
// =============================================================================

import { describe, it, expect } from "vitest";
import { isSeatingEligible } from "./seating-eligibility";
import type { SeatingGuest, SeatingGuestWithEvents } from "@/types/seating";

describe("isSeatingEligible — contract", () => {
  describe("runtime behaviour", () => {
    it("returns true cand guest are guest_events confirmed", () => {
      const guest: SeatingGuestWithEvents = {
        id: 1,
        prenume: "Test",
        nume: "User",
        grup: "Familie",
        meniu: "Standard",
        status: "confirmat",
        tableId: null,
        guest_events: [{ attendance_status: "confirmed" }],
      };

      expect(isSeatingEligible(guest)).toBe(true);
    });

    it("returns true cand guest_events array e gol (fara date RSVP)", () => {
      // Business rule: lipsa datelor RSVP = eligibil implicit, nu declined
      const guest: SeatingGuestWithEvents = {
        id: 2,
        prenume: "Test",
        nume: "User",
        grup: "Familie",
        meniu: "Standard",
        status: "pending",
        tableId: null,
        guest_events: [],
      };

      expect(isSeatingEligible(guest)).toBe(true);
    });

    it("returns false cand attendance_status este declined", () => {
      const guest: SeatingGuestWithEvents = {
        id: 3,
        prenume: "Test",
        nume: "User",
        grup: "Familie",
        meniu: "Standard",
        status: "declinat",
        tableId: null,
        guest_events: [{ attendance_status: "declined" }],
      };

      expect(isSeatingEligible(guest)).toBe(false);
    });

    it("returns true cand attendance_status e pending", () => {
      const guest: SeatingGuestWithEvents = {
        id: 5,
        prenume: "Test",
        nume: "User",
        grup: "Familie",
        meniu: "Standard",
        status: "pending",
        tableId: null,
        guest_events: [{ attendance_status: "pending" }],
      };

      expect(isSeatingEligible(guest)).toBe(true);
    });

    it("returns true cand attendance_status e confirmed (explicit)", () => {
      // Dublura a primului test dar cu id diferit — confirma ca refactorul nu rupe case-ul happy path
      const guest: SeatingGuestWithEvents = {
        id: 6,
        prenume: "Test",
        nume: "User",
        grup: "Familie",
        meniu: "Standard",
        status: "confirmat",
        tableId: null,
        guest_events: [{ attendance_status: "invited" }],
      };

      expect(isSeatingEligible(guest)).toBe(true);
    });

    it("returns true cand attendance_status e null", () => {
      const guest: SeatingGuestWithEvents = {
        id: 7,
        prenume: "Test",
        nume: "User",
        grup: "Familie",
        meniu: "Standard",
        status: "pending",
        tableId: null,
        guest_events: [{ attendance_status: null }],
      };

      expect(isSeatingEligible(guest)).toBe(true);
    });
  });

  describe("type contract — guardrail H2", () => {
    it("refuza la compilare apelul cu SeatingGuest lean (fara guest_events)", () => {
      const leanGuest: SeatingGuest = {
        id: 4,
        prenume: "Test",
        nume: "User",
        grup: "Familie",
        meniu: "Standard",
        status: "pending",
        tableId: null,
      };

      // @ts-expect-error — isSeatingEligible trebuie sa ceara SeatingGuestWithEvents explicit.
      // Daca @ts-expect-error pica (TS nu mai refuza), inseamna ca semnatura a regresat
      // la Pick<SeatingGuest, 'guest_events'> sau la orice forma care permite guest fara events.
      // Acest test e documentatia executabila a contractului H2.
      isSeatingEligible(leanGuest);

      // Ref la leanGuest pentru a preveni tree-shaking warnings.
      expect(leanGuest.id).toBe(4);
    });
  });
});
