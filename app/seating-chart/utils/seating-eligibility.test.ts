// =============================================================================
// app/seating-chart/utils/seating-eligibility.test.ts
// Guardrail tests pentru isSeatingEligible — H2 refactor.
// Scop: preveni regresia bugului unde SeatingGuest fara guest_events era
// acceptat silent ca input pentru isSeatingEligible (guest_events? optional
// pe SeatingGuest rich din types/seating.ts).
// =============================================================================

import { describe, it, expect } from "vitest";
import { isSeatingEligible } from "./seating-eligibility";
import { makeGuestEventRow } from "@/lib/seating/test-helpers";
import type { SeatingGuest, SeatingGuestWithEvents } from "@/types/seating";

describe("isSeatingEligible — contract", () => {
  describe("runtime behaviour", () => {
    it("returns true cand guest are guest_events attending", () => {
      const guest: SeatingGuestWithEvents = {
        id: 1,
        prenume: "Test",
        nume: "User",
        grup: "Familie",
        meniu: "Standard",
        status: "confirmat",
        tableId: null,
        guest_events: [makeGuestEventRow({ attendance_status: "attending" })],
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
        guest_events: [makeGuestEventRow({ attendance_status: "declined" })],
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
        guest_events: [makeGuestEventRow({ attendance_status: "pending" })],
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
        guest_events: [makeGuestEventRow({ attendance_status: "invited" })],
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
        guest_events: [makeGuestEventRow({ attendance_status: null })],
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

      // Invariant 1 (compile-time): @ts-expect-error — isSeatingEligible trebuie sa ceara
      // SeatingGuestWithEvents explicit. Daca directiva pica (TS nu mai refuza), inseamna
      // ca semnatura a regresat la o forma care permite guest fara guest_events.
      // Invariant 2 (runtime): apelul TREBUIE sa arunce TypeError — guest_events[0] pe undefined.
      // Ambele invariants formeaza documentatia executabila completa a contractului H2.5.
      expect(() => {
        // @ts-expect-error — contractul H2.5: SeatingGuest fara guest_events e invalid
        isSeatingEligible(leanGuest);
      }).toThrow(TypeError);

      // Ref la leanGuest pentru a preveni tree-shaking warnings.
      expect(leanGuest.id).toBe(4);
    });
  });
});
