// utils/magicFill.ts — Magic Fill V2.0 (implementare iterativă în 6 etape)
import { isSeatingEligible } from './seating-eligibility.ts';
import type { SeatingGuest, SeatingTable } from '@/types/seating';

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
  assignments: Record<number, number>
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

// TableRef: referință la o masă cu locuri libere (snapshot la momentul citirii)
interface TableRef {
  id: number
  seats: number   // capacitate totală originală
  free: number    // locuri libere curente
}

// ── FUNCȚII PUBLICE ───────────────────────────────────────────────────────────

export function calculateMagicFill(guests: SeatingGuest[], tables: SeatingTable[]): MagicFillResult {
  return calculateMagicFillWithLimits(guests, tables, {});
}

export function calculateMagicFillWithLimits(
  guests: SeatingGuest[],
  tables: SeatingTable[],
  _opts: MagicFillOpts = {}
): MagicFillResult {
  // _opts păstrat pentru compatibilitate API — noul algoritm e pur iterativ,
  // fără limite necesare. limitReached returnează mereu false.

  // ── PREPROCESARE ──────────────────────────────────────────────────────────

  const allGuests = guests || [];
  const allTables = tables || [];

  // Mese eligibile: exclude bar, prezidiu, ring
  const eligibleTables = allTables.filter(
    (t) => t.type !== "bar" && t.type !== "prezidiu" && !t.isRing
  );

  // Invitați eligibili: neasezați, eligibili RSVP, nu prezidiu
  let prezidiuSkipped = 0;
  const eligibleGuests: SeatingGuest[] = [];
  for (const g of allGuests) {
    if (g.tableId !== null && g.tableId !== undefined) continue;
    if (!isSeatingEligible(g)) continue;
    if (g.grup && g.grup.toLowerCase() === "prezidiu") {
      prezidiuSkipped++;
      continue;
    }
    eligibleGuests.push(g);
  }

  // Locuri libere inițiale per masă
  const initialFreeByTableId = new Map<number, number>();
  for (const t of eligibleTables) {
    const occupied = allGuests.filter((g) => g.tableId === t.id).length;
    initialFreeByTableId.set(t.id, t.seats - occupied);
  }

  if (eligibleGuests.length === 0) {
    return {
      assignments: {},
      assignmentsCount: 0,
      locuriGoale: _calcLocuriGoale(eligibleTables, initialFreeByTableId),
      skippedGuests: [],
      prezidiuSkipped,
      skippedGroups: [],
      limitReached: false,
    };
  }

  // Grupare invitați eligibili
  const groupsMap = new Map<string, SeatingGuest[]>();
  for (const g of eligibleGuests) {
    const key = g.grup && g.grup.trim() !== "" ? g.grup : "fara_grup";
    if (!groupsMap.has(key)) groupsMap.set(key, []);
    (groupsMap.get(key) as SeatingGuest[]).push(g);
  }

  // Singletons fara_grup — procesați în E5
  const faraGrupGuests: SeatingGuest[] = groupsMap.get("fara_grup") ?? [];
  groupsMap.delete("fara_grup");

  // Sortare DESCRESCĂTOARE după mărime, tie-break ALFABETIC pe nume
  const sortedGroups: Group[] = [...groupsMap.entries()]
    .sort(([nameA, mA], [nameB, mB]) => {
      if (mB.length !== mA.length) return mB.length - mA.length;
      return nameA.localeCompare(nameB);
    })
    .map(([name, members]) => ({ name, members }));

  // Pool de lucru cu copii mutable ale membrilor
  let pool: Group[] = sortedGroups.map((g) => ({ name: g.name, members: [...g.members] }));

  // Assignments acumulate și starea locurilor libere (sursa de adevăr)
  const assignments: Record<number, number> = {};
  const freeByTableId = new Map<number, number>(initialFreeByTableId);

  // Tables excluse din getFreeTables():
  //   - continuable: excludem din pool generic dar păstrăm free real în freeByTableId
  //   - locked: setăm freeByTableId la 0
  const excludedFromPool = new Set<number>();

  // ── ETAPA 0: CLASIFICARE MESE PARȚIAL OCUPATE ────────────────────────────

  // continuableTables[groupName] = mese parțial ocupate EXCLUSIV cu grupul G
  // care mai are neasezați → pot fi completate în E4 PAS A
  const continuableTables = new Map<string, TableRef[]>();

  for (const t of eligibleTables) {
    const free = freeByTableId.get(t.id) ?? 0;
    const occupied = t.seats - free;

    if (occupied === 0) continue;         // (goală) → rămâne în freeTables
    if (occupied === t.seats) continue;   // (plină, free==0) → exclusă automat

    const seatedHere = allGuests.filter((g) => g.tableId === t.id);
    const uniqueGroups = new Set(seatedHere.map((g) => g.grup?.trim() ?? ""));

    if (uniqueGroups.size > 1) {
      // (b) LOCKED — invitați din grupuri diferite → excludem
      freeByTableId.set(t.id, 0);
      continue;
    }

    // (c) Toți din același grup G
    const groupName = seatedHere[0]?.grup?.trim() ?? "";
    const poolGroup = pool.find((pg) => pg.name === groupName);

    if (poolGroup && poolGroup.members.length > 0) {
      // G mai are neasezați → CONTINUABILĂ
      // Notă: NU setăm freeByTableId la 0 — păstrăm valoarea reală pentru E4 PAS A
      const tableRef: TableRef = { id: t.id, seats: t.seats, free };
      if (!continuableTables.has(groupName)) continuableTables.set(groupName, []);
      (continuableTables.get(groupName) as TableRef[]).push(tableRef);
      excludedFromPool.add(t.id); // scoatem din pool generic
    }
    // altfel: G epuizat → EFECTIVĂ LIBERĂ cu `free` locuri (rămâne în pool)
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────

  // Lista curentă de mese disponibile în pool general (exclude locked, continuable)
  function getFreeTables(): TableRef[] {
    return eligibleTables
      .filter((t) => (freeByTableId.get(t.id) ?? 0) > 0 && !excludedFromPool.has(t.id))
      .map((t) => ({ id: t.id, seats: t.seats, free: freeByTableId.get(t.id) ?? 0 }))
      .sort((a, b) => a.id - b.id);
  }

  // Plasează membrii la o masă și actualizează freeByTableId
  function place(members: SeatingGuest[], tableId: number): void {
    for (const g of members) assignments[g.id] = tableId;
    freeByTableId.set(tableId, (freeByTableId.get(tableId) ?? 0) - members.length);
  }

  // ── ETAPA 1: PERFECT FIT ──────────────────────────────────────────────────

  const remainingAfterE1: Group[] = [];
  for (const group of pool) {
    const size = group.members.length;
    // Masă goală integrală cu capacitate exact egală cu grupul, tie-break id crescător
    const perfectTable = getFreeTables().find((t) => t.seats === size && t.free === t.seats);
    if (perfectTable) {
      place(group.members, perfectTable.id);
    } else {
      remainingAfterE1.push(group);
    }
  }
  pool = remainingAfterE1;

  // ── ETAPA 2: MULTIPLI PERFECȚI (R4) ──────────────────────────────────────

  const remainingAfterE2: Group[] = [];
  for (const group of pool) {
    const size = group.members.length;
    const freeTables = getFreeTables();

    // Dimensiuni distincte de mese pure goale (free == seats), DESCRESCĂTOR (R4)
    const availableDims = [...new Set(
      freeTables.filter((t) => t.free === t.seats).map((t) => t.seats)
    )].sort((a, b) => b - a);

    let consumed = false;
    for (const D of availableDims) {
      if (size % D !== 0) continue;
      const needed = size / D;
      const tablesOfDim = freeTables
        .filter((t) => t.seats === D && t.free === D)
        .sort((a, b) => a.id - b.id);
      if (tablesOfDim.length < needed) continue;

      let memberIdx = 0;
      for (let i = 0; i < needed; i++) {
        place(group.members.slice(memberIdx, memberIdx + D), tablesOfDim[i].id);
        memberIdx += D;
      }
      consumed = true;
      break; // cea mai mare dimensiune care funcționează (R4)
    }

    if (!consumed) remainingAfterE2.push(group);
  }
  pool = remainingAfterE2;

  // ── ETAPA 4: SLICE CASCADĂ (R1 + R2) CU CONTINUABILE ────────────────────

  const remainingAfterE4: Group[] = [];
  for (const group of pool) {

    // PAS A — Continuabile pentru G (ordine id crescător)
    const contTables = (continuableTables.get(group.name) ?? [])
      .slice()
      .sort((a, b) => a.id - b.id);

    for (const tableRef of contTables) {
      if (group.members.length === 0) break;
      // Citim free REAL din freeByTableId (nu din tableRef.free care e snapshot E0)
      const currentFree = freeByTableId.get(tableRef.id) ?? 0;
      if (currentFree <= 0) continue;
      const toPlace = Math.min(group.members.length, currentFree);
      place(group.members.slice(0, toPlace), tableRef.id);
      group.members = group.members.slice(toPlace);
    }

    if (group.members.length === 0) continue;

    // PAS B — Slice cascadă pe mese pure goale (R1)
    // Calculăm dimensiunile disponibile o singură dată (la start PAS B)
    const initialDims = [...new Set(
      getFreeTables().filter((t) => t.free === t.seats).map((t) => t.seats)
    )].sort((a, b) => b - a);

    for (const D of initialDims) {
      while (group.members.length >= D) {
        // R2: nu lăsa rest de exact 1 om
        if (group.members.length - D === 1) break;
        // Refresh — poate s-a consumat o masă în iterația precedentă
        const pureTable = getFreeTables()
          .filter((t) => t.seats === D && t.free === D)
          .sort((a, b) => a.id - b.id)[0];
        if (!pureTable) break; // nicio masă de dim D mai disponibilă
        place(group.members.slice(0, D), pureTable.id);
        group.members = group.members.slice(D);
      }
    }

    if (group.members.length === 0) continue;

    // PAS C — Perfect fit pe rest (masă cu free == G.size, inclusiv efective libere)
    const fitTable = getFreeTables().find((t) => t.free === group.members.length);
    if (fitTable) {
      place(group.members, fitTable.id);
      group.members = [];
    }

    if (group.members.length > 0) {
      remainingAfterE4.push({ name: group.name, members: group.members });
    }
  }
  pool = remainingAfterE4;

  // ── ETAPA 3: COMBINAȚII EXACTE (R5) ──────────────────────────────────────

  // restPool = resturi de grupuri după E4
  const restPool: Group[] = [...pool];

  // Sortare descrescătoare pentru pruning eficient în findCombos
  restPool.sort((a, b) => {
    if (b.members.length !== a.members.length) return b.members.length - a.members.length;
    return a.name.localeCompare(b.name);
  });

  // Comparator pur pentru combinații — aceleași criterii ca anterior în chooseBestCombo.
  // Returnează < 0 dacă a e mai bun, > 0 dacă b e mai bun, 0 dacă identici.
  function compareCombo(a: number[], b: number[], sp: Group[]): number {
    // 1. fără singletons > cu singletons
    const aHS = a.some((i) => sp[i].members.length === 1) ? 1 : 0;
    const bHS = b.some((i) => sp[i].members.length === 1) ? 1 : 0;
    if (aHS !== bHS) return aHS - bHS;
    // 2. mai puține resturi
    if (a.length !== b.length) return a.length - b.length;
    // 3. cel mai mare rest (consum agresiv) — compară size-uri sortate desc
    const aSizes = a.map((i) => sp[i].members.length).sort((x, y) => y - x);
    const bSizes = b.map((i) => sp[i].members.length).sort((x, y) => y - x);
    for (let k = 0; k < aSizes.length; k++) {
      if (aSizes[k] !== bSizes[k]) return bSizes[k] - aSizes[k];
    }
    // 4. alfabetic pe numele resturilor (sortate în cadrul combinației)
    const aNames = a.map((i) => sp[i].name).sort((x, y) => x.localeCompare(y));
    const bNames = b.map((i) => sp[i].name).sort((x, y) => x.localeCompare(y));
    for (let k = 0; k < aNames.length; k++) {
      const cmp = aNames[k].localeCompare(bNames[k]);
      if (cmp !== 0) return cmp;
    }
    return 0;
  }

  // Găsește cel mai bun combo de indici din sortedPool cu sumă exactă = target.
  // Menține doar ctx.bestSoFar (O(maxItems) memorie) în loc de un array de rezultate.
  // OPT1: oprește la combo ideal (2 resturi, fără singletons)
  // OPT4: timeout intern per masă
  function findCombos(
    target: number,
    sortedPool: Group[],
    maxItems: number,
    startIdx: number,
    current: number[],
    currentSum: number,
    ctx: { foundPerfect: boolean; deadline: number; bestSoFar: number[] | null }
  ): void {
    if (ctx.foundPerfect) return;
    if (performance.now() > ctx.deadline) return; // OPT4
    if (currentSum === target) {
      // Actualizează bestSoFar dacă current e mai bun
      if (ctx.bestSoFar === null || compareCombo(current, ctx.bestSoFar, sortedPool) < 0) {
        ctx.bestSoFar = [...current];
      }
      // OPT1: perfect score = fără singletons + exact 2 resturi → nu poate fi mai bine
      if (
        current.length === 2 &&
        current.every((i) => sortedPool[i].members.length > 1)
      ) {
        ctx.foundPerfect = true;
      }
      return;
    }
    if (current.length >= maxItems) return;
    for (let i = startIdx; i < sortedPool.length; i++) {
      if (ctx.foundPerfect) return;
      const sz = sortedPool[i].members.length;
      if (currentSum + sz > target) continue; // pruning
      current.push(i);
      findCombos(target, sortedPool, maxItems, i + 1, current, currentSum + sz, ctx);
      current.pop();
    }
  }

  // Snapshot mese libere la intrarea în E3 (id crescător)
  const e3Tables = getFreeTables();
  const E3_PER_TABLE_TIMEOUT_MS = 50; // OPT4: timeout per masă
  for (const tableRef of e3Tables) {
    if (restPool.length === 0) break;
    const curFree = freeByTableId.get(tableRef.id) ?? 0;
    if (curFree <= 0) continue; // masă consumată de un iter anterior

    // OPT2: maxItems adaptiv — limitează explozia combinatorică pe pool mare
    const maxPoolSize = restPool.length > 0 ? restPool[0].members.length : 1;
    const minItemsNeeded = Math.ceil(curFree / maxPoolSize);
    const effectiveMaxItems = restPool.length > 25
      ? Math.min(5, Math.max(3, minItemsNeeded + 1))
      : 5;
    const ctx: { foundPerfect: boolean; deadline: number; bestSoFar: number[] | null } = {
      foundPerfect: false,
      deadline: performance.now() + E3_PER_TABLE_TIMEOUT_MS,
      bestSoFar: null,
    };
    findCombos(curFree, restPool, effectiveMaxItems, 0, [], 0, ctx);
    if (ctx.bestSoFar === null) continue;

    const chosen = ctx.bestSoFar;
    // Plasează toți membrii din combinație la această masă
    for (const idx of chosen) {
      place(restPool[idx].members, tableRef.id);
    }
    // Scoate din restPool în ordine descrescătoare de index (evită shifting)
    const toRemove = [...chosen].sort((a, b) => b - a);
    for (const idx of toRemove) restPool.splice(idx, 1);
  }

  pool = restPool;

  // ── ETAPA 5: BEST FIT CU R3 + R6 ─────────────────────────────────────────

  // Adaugă faraGrupGuests ca singletons individuali (sortați numeric după id)
  for (const g of [...faraGrupGuests].sort((a, b) => a.id - b.id)) {
    pool.push({ name: `fara_grup_${g.id}`, members: [g] });
  }

  const nonSingletons = pool
    .filter((g) => g.members.length >= 2)
    .sort((a, b) => {
      if (b.members.length !== a.members.length) return b.members.length - a.members.length;
      return a.name.localeCompare(b.name);
    });

  const singletons = pool
    .filter((g) => g.members.length === 1)
    .sort((a, b) => a.members[0].id - b.members[0].id);

  const skippedGuests: SeatingGuest[] = [];

  // FAZA 1 — nonSingletons (R6): best fit, poate reutiliza mese parțiale din FAZA 1
  const phase1OpenedTables = new Set<number>();

  for (const rest of nonSingletons) {
    const size = rest.members.length;
    // Best fit: min free care încă încape, tie id crescător
    const candidate = getFreeTables()
      .filter((t) => t.free >= size)
      .sort((a, b) => {
        if (a.free !== b.free) return a.free - b.free;
        return a.id - b.id;
      })[0];

    if (!candidate) {
      for (const g of rest.members) skippedGuests.push(g);
      continue;
    }
    place(rest.members, candidate.id);
    phase1OpenedTables.add(candidate.id);
  }

  // FAZA 2 — singletons (R6): separare strictă față de FAZA 1
  const phase2OpenedTables = new Set<number>();

  for (const rest of singletons) {
    const g = rest.members[0];

    // Prioritate 1: mese deja deschise în FAZA 2 (conțin deja singletons)
    const p1 = [...phase2OpenedTables]
      .filter((id) => (freeByTableId.get(id) ?? 0) >= 1)
      .sort((a, b) => a - b);

    if (p1.length > 0) {
      place([g], p1[0]);
      // p1[0] deja în phase2OpenedTables
      continue;
    }

    // Prioritate 2: mese complet libere (free == seats), NU din FAZA 1
    const p2 = getFreeTables()
      .filter((t) => t.free === t.seats && !phase1OpenedTables.has(t.id))
      .sort((a, b) => a.id - b.id);

    if (p2.length > 0) {
      place([g], p2[0].id);
      phase2OpenedTables.add(p2[0].id);
      continue;
    }

    skippedGuests.push(g);
  }

  // ── REZULTAT FINAL ─────────────────────────────────────────────────────────

  return {
    assignments,
    assignmentsCount: Object.keys(assignments).length,
    // locuriGoale: exclude mese continuabile (locked efectiv pentru alte grupuri)
    locuriGoale: _calcLocuriGoale(eligibleTables, freeByTableId, excludedFromPool),
    skippedGuests,
    prezidiuSkipped,
    skippedGroups: [],
    limitReached: false,
  };
}

// ── FUNCȚII PRIVATE ───────────────────────────────────────────────────────────

function _calcLocuriGoale(
  eligibleTables: SeatingTable[],
  freeMap: Map<number, number>,
  excluded?: Set<number>
): number {
  return eligibleTables.reduce(
    (s, t) => s + (excluded?.has(t.id) ? 0 : (freeMap.get(t.id) ?? 0)),
    0
  );
}
