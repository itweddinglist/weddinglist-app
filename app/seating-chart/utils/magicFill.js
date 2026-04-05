// utils/magicFill.js — Magic Fill V1.5
import { isSeatingEligible } from './seating-eligibility.js';

const DEFAULT_MAX_ITERATIONS = 10000;
const DEFAULT_MAX_TIME_MS = 500;

export function calculateMagicFill(guests, tables) {
  return calculateMagicFillWithLimits(guests, tables, {
    maxIterations: DEFAULT_MAX_ITERATIONS,
    maxTimeMs: DEFAULT_MAX_TIME_MS,
  });
}

export function calculateMagicFillWithLimits(guests, tables, opts = {}) {
  const maxIterations = opts.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const maxTimeMs = opts.maxTimeMs ?? DEFAULT_MAX_TIME_MS;

  const eligibleTables = (tables || []).filter(
    (t) => t.type !== "bar" && t.type !== "prezidiu" && !t.isRing
  );

  const freeSeatsByTableId = new Map();
  for (const t of eligibleTables) {
    const occupied = (guests || []).filter((g) => g.tableId === t.id).length;
    freeSeatsByTableId.set(t.id, t.seats - occupied);
  }

  const availableTables = eligibleTables.filter((t) => (freeSeatsByTableId.get(t.id) || 0) > 0);

  let prezidiuSkipped = 0;
  const eligibleGuests = [];
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

  const groupsMap = new Map();
  for (const g of eligibleGuests) {
    const key = g.grup && g.grup.trim() !== "" ? g.grup : "fara_grup";
    if (!groupsMap.has(key)) groupsMap.set(key, []);
    groupsMap.get(key).push(g);
  }

  const faraGrupGuests = groupsMap.get("fara_grup") || [];
  groupsMap.delete("fara_grup");

  const sortedGroups = [...groupsMap.entries()]
    .sort(([nameA, mA], [nameB, mB]) => {
      if (mB.length !== mA.length) return mB.length - mA.length;
      return nameA.localeCompare(nameB);
    })
    .map(([name, members]) => ({ name, members }));

  const skippedGroups = [];
  const skippedGuestsSet = new Set();
  const backtrackGroups = [];

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
  const greedyFree = new Map(freeSeatsByTableId);
  const greedyAssignments = {};
  for (const group of backtrackGroups) {
    const bestId = _bestFitTable(group.members.length, availableTables, greedyFree);
    if (bestId !== null) {
      greedyFree.set(bestId, greedyFree.get(bestId) - group.members.length);
      for (const g of group.members) greedyAssignments[g.id] = bestId;
    }
  }

  let bestSolution = {
    assignments: { ...greedyAssignments },
    assignmentsCount: Object.keys(greedyAssignments).length,
    locuriGoale: _calcLocuriGoaleFromMap(eligibleTables, greedyFree),
  };

  // Backtracking
  let iterations = 0;
  let limitReached = false;
  const startTime = Date.now();
  let perfectFound = false;

  const btFree = new Map(freeSeatsByTableId);
  const btAssign = {};

  function recurse(groupIdx) {
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
      const previousFreeSeats = btFree.get(t.id);
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
  const finalFree = new Map(freeSeatsByTableId);
  for (const [gId, tId] of Object.entries(bestSolution.assignments)) {
    finalFree.set(tId, (finalFree.get(tId) || 0) - 1);
  }

  const finalAssignments = { ...bestSolution.assignments };
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

function _bestFitTable(groupSize, tables, freeMap) {
  let bestId = null,
    bestRem = Infinity;
  for (const t of tables) {
    const free = freeMap.get(t.id) || 0;
    if (free < groupSize) continue;
    const rem = free - groupSize;
    if (rem < bestRem || (rem === bestRem && t.id < bestId)) {
      bestRem = rem;
      bestId = t.id;
    }
  }
  return bestId;
}

function _bestFitTableForSingleton(availableTables, freeMap, eligibleTables) {
  const occupied = availableTables.filter((t) => {
    const origSeats = eligibleTables.find((et) => et.id === t.id)?.seats ?? 0;
    const free = freeMap.get(t.id) || 0;
    return free > 0 && free < origSeats;
  });
  if (occupied.length > 0) return _bestFitTable(1, occupied, freeMap);
  return _bestFitTable(1, availableTables, freeMap);
}

function _calcLocuriGoaleFromMap(eligibleTables, freeMap) {
  return eligibleTables.reduce((s, t) => s + (freeMap.get(t.id) || 0), 0);
}
