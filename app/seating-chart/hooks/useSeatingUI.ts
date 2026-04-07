"use client";
import { useState, useCallback, useRef, useEffect } from "react";

// ── TIPURI INTERNE ────────────────────────────────────────────────────────────

interface Toast {
  id: string
  msg: string
  type: string
}

interface ClickedSeat {
  tableId: number
  seatIndex: number
}

interface EditPanel {
  tableId: number
}

interface ConfirmDialog {
  title: string
  sub?: string
  onConfirm: () => void
}

/**
 * useSeatingUI
 *
 * Owner exclusiv al UI state pentru seating chart.
 * NU face data mutations directe.
 * NU știe de tabele, invitați sau logică de business.
 *
 * State owned:
 * - selectedTableId, clickedSeat, hoveredGuest, dragOver, isDraggingGuest
 * - modal, editPanel, editName, editSeats, confirmDialog
 * - lockMode, showStats, showCatering
 * - toasts (inclusiv showToast, removeToast)
 */
export function useSeatingUI() {
  // ── Selection & interaction ──
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [clickedSeat, setClickedSeat] = useState<ClickedSeat | null>(null);
  const [hoveredGuest, _setHoveredGuestState] = useState<number | null>(null);
  const hoveredGuestRef = useRef<number | null>(null);
  const setHoveredGuest = useCallback((data: number | null) => {
    hoveredGuestRef.current = data;
    _setHoveredGuestState(data);
  }, []);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [isDraggingGuest, setIsDraggingGuest] = useState(false);

  // ── Modals & panels ──
  const [modal, setModal] = useState<Record<string, unknown> | null>(null);
  const [editPanel, setEditPanel] = useState<EditPanel | null>(null);
  const [editName, setEditName] = useState("");
  const [editSeats, setEditSeats] = useState(8);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);

  // ── Canvas modes ──
  const [lockMode, setLockMode] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [showCatering, setShowCatering] = useState(false);

  // ── Toasts ──
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const showToast = useCallback((message: string, type = "rose") => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, msg: message, type }]);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
    toastTimersRef.current.push(timer);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    return () => {
      toastTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  return {
    // Selection & interaction
    selectedTableId,
    setSelectedTableId,
    clickedSeat,
    setClickedSeat,
    hoveredGuest,
    hoveredGuestRef,
    setHoveredGuest,
    dragOver,
    setDragOver,
    isDraggingGuest,
    setIsDraggingGuest,

    // Modals & panels
    modal,
    setModal,
    editPanel,
    setEditPanel,
    editName,
    setEditName,
    editSeats,
    setEditSeats,
    confirmDialog,
    setConfirmDialog,

    // Canvas modes
    lockMode,
    setLockMode,
    showStats,
    setShowStats,
    showCatering,
    setShowCatering,

    // Toasts
    toasts,
    showToast,
    removeToast,
  };
}
