// utils/magicFill.ts — Magic Fill V1.5
import { isSeatingEligible } from './seating-eligibility.js';
import type { SeatingGuest, SeatingTable } from '@/types/seating';

const DEFAULT_MAX_ITERATIONS = 10000;
const DEFAULT_MAX_TIME_MS = 500;

// ── TIPURI PUBLICE ─────────────────────────────────────────────────────────────

export interface MagicFillOpts {
  maxIterations?: number
  maxTimeMs?: number
}

export interface SkippedGroup {
  groupName: string
  reason: string
}

export interface MagicFillResult {
  assignments: { [key: string]: number }
  assignmentsCount: number
  locuriGoale: number
  skippedGuests: SeatingGuest[]
  prezidiuSkipped: number
  skippedGroups: SkippedGroup[]
  limitReached: boolean
}

// ── TIPURI INTERNE ────────────────────────────────────────────────────────────

interface Group {
  name: string
  members: SeatingGuest[]
}

interface BestSolution {
  assignments: { [key: string]: number }
  assignmentsCount: number
  locuriGoale: number
}

// ── FUNCȚII PUBLICE ───────────────────────────────────────────────────────────

export function calculateMagicFill(guests: SeatingGuest[], tables: SeatingTable[]): MagicFillResult {
  return calculateMagicFillWithLimits(guests, tables, {
    maxIterations: DEFAULT_MAX_ITERATIONS,
    maxTimeMs: DEFAULT_MAX_TIME_MS,
  });
}

export function calculateMagicFillWithLimits(
  guests: SeatingGuest[],
  tables: SeatingTable[],
  opts: MagicFillOpts = {}
): MagicFillResult {
  const maxIterations = opts.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const maxTimeMs = opts.maxTimeMs ?? DEFAULT_MAX_TIME_MS;

  const eligibleTables = (tables || []).filter(
    (t) => t.type !== "bar" && t.type !== "prezidiu" && !t.isRing
  );

  // Map acceptă chei number (set inițial) și string (Object.entries loop ulterior)
  const freeSeatsByTableId = new Map<number | string, number>();
  for (const t of eligibleTables) {
    const occupied = (guests || []).filter((g) => g.tableId === t.id).length;
    freeSeatsByTableId.set(t.id, t.seats - occupied);
  }

  const availableTables = eligibleTables.filter((t) => (freeSeatsByTableId.get(t.id) || 0) > 0);

  let prezidiuSkipped = 0;
  const eligibleGuests: SeatingGuest[] = [];
  for (const g of guests || []) {
    if (g.tableId !== null && g.tableId !== undefined) continue;
    if (!isSeatingEligible(g)) continue;
    if (g.grup && g.grup.toLowerCase() === "prezidiu") {
      prezidiuSkipped++;
      continue;
    }
    eligibleGuests.push(g);
  }

  if (eligibleGuests.length === 0 || availableTables.length === 0) {
    return {
      assignments: {},
      assignmentsCount: 0,
      locuriGoale: _calcLocuriGoaleFromMap(eligibleTables, freeSeatsByTableId),
      skippedGuests: eligibleGuests.slice(),
      prezidiuSkipped,
      skippedGroups: [],
      limitReached: false,
    };
  }

  const groupsMap = new Map<string, SeatingGuest[]>();
  for (const g of eligibleGuests) {
    const key = g.grup && g.grup.trim() !== "" ? g.grup : "fara_grup";
    if (!groupsMap.has(key)) groupsMap.set(key, []);
    // groupsMap.get(key) este garantat non-undefined după has+set de mai sus
    (groupsMap.get(key) as SeatingGuest[]).push(g);
  }

  const faraGrupGuests = groupsMap.get("fara_grup") || [];
  groupsMap.delete("fara_grup");

  const sortedGroups: Group[] = [...groupsMap.entries()]
    .sort(([nameA, mA], [nameB, mB]) => {
      if (mB.length !== mA.length) return mB.length - mA.length;
      return nameA.localeCompare(nameB);
    })
    .map(([name, members]) => ({ name, members }));

  const skippedGroups: SkippedGroup[] = [];
  const skippedGuestsSet = new Set<SeatingGuest>();
  const backtrackGroups: Group[] = [];

  for (const group of sortedGroups) {
    const canFit = availableTables.some(
      (t) => (freeSeatsByTableId.get(t.id) || 0) >= group.members.length
    );
    if (!canFit) {
      skippedGroups.push({
        groupName: group.name,
        reason: `Grupul ${group.name} are ${group.members.length} invitați — nicio masă nu are suficiente locuri. Adaugă o masă mai mare și rulează Magic Fill din nou.`,
      });
      for (const g of group.members) skippedGuestsSet.add(g);
    } else {
      backtrackGroups.push(group);
    }
  }

  // Greedy fallback
  const greedyFree = new Map<number | string, number>(freeSeatsByTableId);
  const greedyAssignments: { [key: string]: number } = {};
  for (const group of backtrackGroups) {
    const bestId = _bestFitTable(group.members.length, availableTables, greedyFree);
    if (bestId !== null) {
      // greedyFree.get(bestId) garantat număr — bestId vine din _bestFitTable care verifică free >= groupSize
      greedyFree.set(bestId, (greedyFree.get(bestId) as number) - group.members.length);
      for (const g of group.members) greedyAssignments[g.id] = bestId;
    }
  }

  let bestSolution: BestSolution = {
    assignments: { ...greedyAssignments },
    assignmentsCount: Object.keys(greedyAssignments).length,
    locuriGoale: _calcLocuriGoaleFromMap(eligibleTables, greedyFree),
  };

  // Backtracking
  let iterations = 0;
  let limitReached = false;
  const startTime = Date.now();
  let perfectFound = false;

  const btFree = new Map<number | string, number>(freeSeatsByTableId);
  const btAssign: { [key: string]: number } = {};

  function recurse(groupIdx: number): void {
    if (perfectFound) return;
    if (iterations > maxIterations || Date.now() - startTime > maxTimeMs) {
      limitReached = true;
      return;
    }

    if (groupIdx === backtrackGroups.length) {
      const locuriGoale = _calcLocuriGoaleFromMap(eligibleTables, btFree);
      const assignmentsCount = Object.keys(btAssign).length;
      const isBetter =
        locuriGoale < bestSolution.locuriGoale ||
        (locuriGoale === bestSolution.locuriGoale &&
          assignmentsCount > bestSolution.assignmentsCount);
      if (isBetter) {
        bestSolution = { assignments: { ...btAssign }, assignmentsCount, locuriGoale };
        if (locuriGoale === 0) perfectFound = true;
      }
      return;
    }

    const group = backtrackGroups[groupIdx];

    // Bound check: dacă nu putem îmbunătăți bestSolution → prune
    const totalFreeNow = [...btFree.values()].reduce((s, v) => s + v, 0);
    const totalRemaining = backtrackGroups
      .slice(groupIdx)
      .reduce((s, g) => s + g.members.length, 0);
    const bestPossible = Math.max(0, totalFreeNow - totalRemaining);
    if (bestPossible > bestSolution.locuriGoale) {
      return;
    }

    const candidates = availableTables
      .filter((t) => (btFree.get(t.id) || 0) >= group.members.length)
      .sort((a, b) => {
        const remA = (btFree.get(a.id) || 0) - group.members.length;
        const remB = (btFree.get(b.id) || 0) - group.members.length;
        if (remA !== remB) return remA - remB;
        return a.id - b.id;
      });

    if (candidates.length === 0) {
      recurse(groupIdx + 1);
      return;
    }

    for (const t of candidates) {
      if (perfectFound) return;
      iterations++;
      if (iterations > maxIterations || Date.now() - startTime > maxTimeMs) {
        limitReached = true;
        return;
      }
      // btFree.get(t.id) garantat număr — t este din candidates filtrat cu btFree.get >= groupSize
      const previousFreeSeats = btFree.get(t.id) as number;
      btFree.set(t.id, previousFreeSeats - group.members.length);
      for (const g of group.members) btAssign[g.id] = t.id;

      recurse(groupIdx + 1);

      btFree.set(t.id, previousFreeSeats);
      for (const g of group.members) delete btAssign[g.id];
    }

    if (!perfectFound) {
      recurse(groupIdx + 1);
    }
  }

  recurse(0);

  // Singletons fara_grup
  const finalFree = new Map<number | string, number>(freeSeatsByTableId);
  for (const [gId, tId] of Object.entries(bestSolution.assignments)) {
    finalFree.set(tId, (finalFree.get(tId) || 0) - 1);
  }

  const finalAssignments: { [key: string]: number } = { ...bestSolution.assignments };
  const faraGrupSorted = [...faraGrupGuests].sort((a, b) => a.id - b.id);

  for (const g of faraGrupSorted) {
    const candidateId = _bestFitTableForSingleton(availableTables, finalFree, eligibleTables);
    if (candidateId !== null) {
      finalFree.set(candidateId, (finalFree.get(candidateId) || 0) - 1);
      finalAssignments[g.id] = candidateId;
    } else {
      skippedGuestsSet.add(g);
    }
  }

  for (const group of backtrackGroups) {
    const anyAssigned = group.members.some((g) => finalAssignments[g.id] !== undefined);
    if (!anyAssigned) {
      for (const g of group.members) skippedGuestsSet.add(g);
    }
  }

  return {
    assignments: finalAssignments,
    assignmentsCount: Object.keys(finalAssignments).length,
    locuriGoale: _calcLocuriGoaleFromMap(eligibleTables, finalFree),
    skippedGuests: [...skippedGuestsSet],
    prezidiuSkipped,
    skippedGroups,
    limitReached,
  };
}

// ── FUNCȚII PRIVATE ───────────────────────────────────────────────────────────

function _bestFitTable(
  groupSize: number,
  tables: SeatingTable[],
  freeMap: Map<number | string, number>
): number | null {
  let bestId: number | null = null,
    bestRem = Infinity;
  for (const t of tables) {
    const free = freeMap.get(t.id) || 0;
    if (free < groupSize) continue;
    const rem = free - groupSize;
    if (rem < bestRem || (rem === bestRem && t.id < (bestId as number))) {
      bestRem = rem;
      bestId = t.id;
    }
  }
  return bestId;
}

function _bestFitTableForSingleton(
  availableTables: SeatingTable[],
  freeMap: Map<number | string, number>,
  eligibleTables: SeatingTable[]
): number | null {
  const occupied = availableTables.filter((t) => {
    const origSeats = eligibleTables.find((et) => et.id === t.id)?.seats ?? 0;
    const free = freeMap.get(t.id) || 0;
    return free > 0 && free < origSeats;
  });
  if (occupied.length > 0) return _bestFitTable(1, occupied, freeMap);
  return _bestFitTable(1, availableTables, freeMap);
}

function _calcLocuriGoaleFromMap(
  eligibleTables: SeatingTable[],
  freeMap: Map<number | string, number>
): number {
  return eligibleTables.reduce((s, t) => s + (freeMap.get(t.id) || 0), 0);
}
