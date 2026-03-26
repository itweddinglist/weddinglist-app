"use client";
import { useState, useCallback, useRef, useEffect } from "react";

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
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [clickedSeat, setClickedSeat] = useState(null);
  const [hoveredGuest, _setHoveredGuestState] = useState(null);
  const hoveredGuestRef = useRef(null);
  const setHoveredGuest = useCallback((data) => {
    hoveredGuestRef.current = data;
    _setHoveredGuestState(data);
  }, []);
  const [dragOver, setDragOver] = useState(null);
  const [isDraggingGuest, setIsDraggingGuest] = useState(false);

  // ── Modals & panels ──
  const [modal, setModal] = useState(null);
  const [editPanel, setEditPanel] = useState(null);
  const [editName, setEditName] = useState("");
  const [editSeats, setEditSeats] = useState(8);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // ── Canvas modes ──
  const [lockMode, setLockMode] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [showCatering, setShowCatering] = useState(false);

  // ── Toasts ──
  const [toasts, setToasts] = useState([]);
  const toastTimersRef = useRef([]);

  const showToast = useCallback((message, type = "rose") => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, msg: message, type }]);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
    toastTimersRef.current.push(timer);
  }, []);

  const removeToast = useCallback((id) => {
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
