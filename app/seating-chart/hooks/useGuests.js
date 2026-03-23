"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  PLAN_CX,
  PLAN_CY,
  PLAN_W,
  PLAN_H,
  GRID,
  INITIAL_GUESTS,
  buildTemplate,
  getTableDims,
  getGroupColor,
} from "../utils/geometry.js";
import { loadStorageState, saveStorageState } from "../utils/storage.js";
import { calculateMagicFill } from "../utils/magicFill.js";

// ── SPAWN SPIRAL ──────────────────────────────────────────────────────────────
// Prima masă apare în centrul viewport-ului.
// Restul în spirală strânsă — distanța = dimensiunea mesei + 20px gap.

function getSpawnPosition(proto, spawnIndex, camRef, canvasWRef, canvasHRef) {
  const cam = camRef.current;
  const cw = canvasWRef.current;
  const ch = canvasHRef.current;
  const d = getTableDims(proto);

  const OFFSET = Math.min(Math.max(Math.max(d.w, d.h) * 0.2, 32), 72); // offset per masă nouă

  // Centrul viewport-ului
  const cx = cam.vx + cw / cam.z / 2 - d.w / 2;
  const cy = cam.vy + ch / cam.z / 2 - d.h / 2;

  const rawX = cx + spawnIndex * OFFSET;
  const rawY = cy + spawnIndex * OFFSET;

  const x = Math.max(0, Math.min(PLAN_W - d.w, Math.round(rawX / GRID) * GRID));
  const y = Math.max(0, Math.min(PLAN_H - d.h, Math.round(rawY / GRID) * GRID));

  return { x, y };
}

// Ring dans only — pentru reset
function buildRingOnly() {
  return [
    {
      id: 1,
      name: "Ring Dans",
      type: "bar",
      seats: 0,
      x: 5100,
      y: 5150,
      rotation: 0,
      isRing: true,
    },
  ];
}

const RING_CENTER_X = 5100 + 300 / 2;
const RING_CENTER_Y = 5150 + 200 / 2;
const RESET_ZOOM = 0.9;

// ── HOOK ──────────────────────────────────────────────────────────────────────

export function useGuests(cam, camRef, canvasWRef, canvasHRef) {
  const [guests, setGuests] = useState(() => INITIAL_GUESTS.map((g) => ({ ...g })));
  const [tables, setTables] = useState(() => buildTemplate());
  const [nextId, setNextId] = useState(10);
  const [hydrated, setHydrated] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [lockMode, setLockMode] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [showCatering, setShowCatering] = useState(false);
  const [isDraggingGuest, setIsDraggingGuest] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [modal, setModal] = useState(null);
  const [editPanel, setEditPanel] = useState(null);
  const [editName, setEditName] = useState("");
  const [editSeats, setEditSeats] = useState(8);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [hoveredGuest, setHoveredGuest] = useState(null);
  const [clickedSeat, setClickedSeat] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [newTableIds, setNewTableIds] = useState(new Set());

  const tablesRef = useRef(tables);
  const guestsRef = useRef(guests);
  const historyRef = useRef([]);
  const spawnCounterRef = useRef(0);

  useEffect(() => { tablesRef.current = tables; }, [tables]);
  useEffect(() => { guestsRef.current = guests; }, [guests]);

  useEffect(() => {
    const result = loadStorageState(1200, 700);
    if (result.data.guests) setGuests(result.data.guests);
    if (result.data.tables) setTables(result.data.tables);
    if (result.data.nextId) setNextId(result.data.nextId);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => {
      const result = saveStorageState({ guests, tables, nextId, cam });
      if (result && !result.ok) showToast("Eroare la salvare: spatiu insuficient!", "red");
    }, 500);
    return () => clearTimeout(timer);
  }, [guests, tables, nextId, cam, hydrated]);

  const showToast = useCallback((msg, type = "rose") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  const saveAction = useCallback(() => {
    historyRef.current = [
      ...historyRef.current.slice(-20),
      {
        guests: JSON.parse(JSON.stringify(guestsRef.current)),
        tables: JSON.parse(JSON.stringify(tablesRef.current)),
      },
    ];
  }, []);

  const undo = useCallback(() => {
    if (!historyRef.current.length) { showToast("Nimic de anulat", "yellow"); return; }
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    setGuests(prev.guests);
    setTables(prev.tables);
    showToast("Actiune anulata ↩", "rose");
  }, [showToast]);

  const guestsByTable = useMemo(() => {
    const map = {};
    guests.forEach((g) => {
      if (g.tableId != null) {
        if (!map[g.tableId]) map[g.tableId] = [];
        map[g.tableId].push(g);
      }
    });
    return map;
  }, [guests]);

  const realTables = useMemo(() => tables.filter((t) => t.type !== "bar" && !t.isRing), [tables]);
  const totalSeats = useMemo(() => realTables.reduce((s, t) => s + t.seats, 0), [realTables]);
  const assignedCount = useMemo(() => guests.filter((g) => g.tableId).length, [guests]);
  const unassigned = useMemo(() => guests.filter((g) => !g.tableId), [guests]);
  const filteredUnassigned = useMemo(
    () => searchQuery
      ? unassigned.filter((g) =>
          `${g.prenume} ${g.nume} ${g.grup}`.toLowerCase().includes(searchQuery.toLowerCase()))
      : unassigned,
    [unassigned, searchQuery]
  );
  const progress = guests.length > 0 ? (assignedCount / guests.length) * 100 : 0;
  const menuStats = useMemo(
    () => guests.reduce((acc, g) => { acc[g.meniu] = (acc[g.meniu] || 0) + 1; return acc; }, {}),
    [guests]
  );
  const guestMeta = useMemo(() => {
    const groupsMap = new Map();
    for (const guest of guests) {
      const group = guest.grup?.trim();
      if (!group) continue;
      groupsMap.set(group, (groupsMap.get(group) || 0) + 1);
    }
    return {
      total: guests.length,
      seated: assignedCount,
      unseated: unassigned.length,
      groups: Array.from(groupsMap, ([name, count]) => ({ name, count })),
    };
  }, [guests, assignedCount, unassigned]);

  const groupColorMap = useMemo(() => {
    const map = {};
    for (const group of guestMeta.groups) map[group.name] = getGroupColor(group.name);
    return map;
  }, [guestMeta.groups]);

  const assignGuest = useCallback((gId, tableId) => {
    const table = tablesRef.current.find((t) => t.id === tableId);
    if (!table || table.type === "bar" || table.isRing) return;
    const guest = guestsRef.current.find((g) => g.id === parseInt(gId));
    if (!guest || guest.tableId === tableId) return;
    const occupied = guestsRef.current.filter((g) => g.tableId === tableId).length;
    if (occupied >= table.seats) { showToast("Masa este plină!", "yellow"); return; }
    saveAction();
    showToast(`✓ ${guest.prenume} ${guest.nume[0]}. → ${table.name}`, "green");
    setGuests((prev) => prev.map((g) => (g.id === parseInt(gId) ? { ...g, tableId } : g)));
    setClickedSeat(null);
  }, [showToast, saveAction]);

  const unassignGuest = useCallback((guestId) => {
    if (!guestId) return;
    const guest = guestsRef.current.find((g) => g.id === guestId);
    if (!guest || guest.tableId === null) return;
    saveAction();
    showToast(`${guest.prenume} ${guest.nume[0]}. eliminat`, "rose");
    setGuests((prev) => prev.map((g) => (g.id === guestId ? { ...g, tableId: null } : g)));
    setClickedSeat(null);
  }, [showToast, saveAction]);

  const magicFill = useCallback(() => {
    const anyUnassigned = guestsRef.current.some(
      (g) => g.tableId === null && g.status !== "declinat" &&
        !(g.grup && g.grup.toLowerCase() === "prezidiu")
    );
    if (!anyUnassigned) { showToast("Toti invitatii au deja un loc!", "yellow"); return; }
    const result = calculateMagicFill(guestsRef.current, tablesRef.current);
    const { assignments, assignmentsCount, skippedGuests, prezidiuSkipped, skippedGroups, limitReached } = result;
    saveAction();
    setGuests((prev) => prev.map((g) => assignments[g.id] !== undefined ? { ...g, tableId: assignments[g.id] } : g));
    showToast(`✨ ${assignmentsCount} invitați așezați automat`, "green");
    if (prezidiuSkipped > 0) showToast(`ℹ ${prezidiuSkipped} invitati din grupul "Prezidiu" au fost exclusi`, "rose");
    if (skippedGuests.length > 0) showToast(`⚠ ${skippedGuests.length} invitati fara loc disponibil`, "yellow");
    for (const sg of skippedGroups) showToast(`⚠ ${sg.reason}`, "yellow");
    if (limitReached) showToast("⚠ Solutie partiala — limita atinsa, se foloseste cel mai bun rezultat gasit", "yellow");
  }, [showToast, saveAction]);

  const getNextTableName = useCallback(
    () => `Masa ${tables.filter((t) => t.type !== "bar" && !t.isRing).length + 1}`,
    [tables]
  );

  const createTable = useCallback(() => {
    if (modal?.type !== "bar" && !modal?.name?.trim()) {
      showToast("Introdu numele mesei!", "red");
      return;
    }
    saveAction();
    const id = nextId;
    setNextId((n) => n + 1);
    spawnCounterRef.current++;

    const proto = { type: modal.type, seats: modal.seats || 0, isRing: false, rotation: 0 };
    const { x, y } = getSpawnPosition(proto, newTableIds.size, camRef, canvasWRef, canvasHRef);

    setTables((prev) => [
      ...prev,
      { id, name: modal.name.trim() || "Bar", type: modal.type, seats: modal.seats || 0, x, y, rotation: 0 },
    ]);
    setNewTableIds((prev) => new Set([...prev, id]));
    setSelectedTableId(id);
    showToast(`✓ "${modal.name || "Bar"}" creat`, "green");
    setModal(null);
  }, [modal, nextId, showToast, saveAction, camRef, canvasWRef, canvasHRef]);

  const clearNewTableHighlight = useCallback((tableId) => {
    setNewTableIds((prev) => {
      if (!prev.has(tableId)) return prev;
      const next = new Set(prev);
      next.delete(tableId);
      return next;
    });
  }, []);

  const deleteTable = useCallback((tableId) => {
    const t = tables.find((x) => x.id === tableId);
    setConfirmDialog({
      title: `Stergi "${t?.name}"?`,
      sub: t?.isRing ? "Ring-ul dans va fi eliminat."
        : t?.type === "bar" ? "Obiectul va fi eliminat."
        : "Invitatii revin in neatribuiti.",
      onOk: () => {
        saveAction();
        setGuests((prev) => prev.map((g) => (g.tableId === tableId ? { ...g, tableId: null } : g)));
        setTables((prev) => prev.filter((x) => x.id !== tableId));
        setNewTableIds((prev) => { const next = new Set(prev); next.delete(tableId); return next; });
        setEditPanel(null);
        setSelectedTableId(null);
        showToast(`"${t?.name}" sters`, "red");
      },
    });
  }, [tables, showToast, saveAction]);

  const rotateTable = useCallback((tableId, deg) => {
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, rotation: ((t.rotation || 0) + deg) % 360 } : t))
    );
  }, []);

  const saveEdit = useCallback(() => {
    if (!editName.trim()) return;
    setTables((prev) =>
      prev.map((t) => t.id === editPanel.tableId ? { ...t, name: editName.trim(), seats: editSeats } : t)
    );
    setEditPanel(null);
    showToast("Actualizat", "rose");
  }, [editName, editSeats, editPanel, showToast]);

  const resetPlan = useCallback((dispatchCam) => {
    saveAction();
    setTables(buildRingOnly());
    setGuests((prev) => prev.map((g) => ({ ...g, tableId: null })));
    setNextId(10);
    setNewTableIds(new Set());
    
    if (dispatchCam && canvasWRef.current && canvasHRef.current) {
      const z = RESET_ZOOM;
      dispatchCam({
        type: "CAM_SET",
        vx: RING_CENTER_X - canvasWRef.current / z / 2,
        vy: RING_CENTER_Y - canvasHRef.current / z / 2,
        z,
        canvasW: canvasWRef.current,
        canvasH: canvasHRef.current,
      });
    }
    showToast("Plan resetat", "red");
  }, [saveAction, showToast, canvasWRef, canvasHRef]);

  return {
    guests, tables, nextId, hydrated, setTables, guestsRef, tablesRef, spawnCounterRef,
    newTableIds, clearNewTableHighlight,
    guestsByTable, realTables, totalSeats, assignedCount, unassigned, filteredUnassigned,
    progress, menuStats, guestMeta, groupColorMap, toasts, searchQuery, setSearchQuery,
    lockMode, setLockMode, showStats, setShowStats, showCatering, setShowCatering,
    showToast, saveAction, undo, assignGuest, unassignGuest, magicFill, createTable,
    deleteTable, rotateTable, saveEdit, getNextTableName, resetPlan,
    getGuestTableId: (guestId) => {
      const guest = guestsRef.current.find((g) => g.id === guestId);
      return guest?.tableId ?? null;
    },
    modal, setModal, editPanel, setEditPanel, editName, setEditName, editSeats, setEditSeats,
    confirmDialog, setConfirmDialog, selectedTableId, setSelectedTableId,
    clickedSeat, setClickedSeat, hoveredGuest, setHoveredGuest, dragOver, setDragOver,
    isDraggingGuest, setIsDraggingGuest,
  };
}
