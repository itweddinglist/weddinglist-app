"use client";
import { useEffect, useRef, useCallback } from "react";
import type { MutableRefObject } from "react";
import { GRID, PLAN_W, PLAN_H, getTableDims } from "../utils/geometry.js";
import type { SeatingTable, CameraState, Point } from "@/types/seating";

const PAN_PAD = 1000;

interface DraggingTable {
  id: number
  ox: number
  oy: number
  dw: number
  dh: number
}

interface PanState {
  sx: number
  sy: number
  vx0: number
  vy0: number
}

interface DragPreview {
  tableId: number
  x: number
  y: number
}

interface UseTableInteractionsProps {
  tables: SeatingTable[]
  setTables: (updater: SeatingTable[] | ((prev: SeatingTable[]) => SeatingTable[])) => void
  selectedTableId: number | null
  lockMode: boolean
  undo: () => void
  saveAction: () => void
  setModal: (config: Record<string, unknown> | null) => void
  setEditPanel: (panel: { tableId: number } | null) => void
  setConfirmDialog: (dialog: Record<string, unknown> | null) => void
  setClickedSeat: (seat: { tableId: number; seatIndex: number } | null) => void
  setShowCatering: (value: boolean) => void
  setSelectedTableId: (id: number | null) => void
  setHoveredGuest: (guest: number | null) => void
  setIsDraggingGuest: (value: boolean) => void
  camRef: MutableRefObject<CameraState>
  canvasWRef: MutableRefObject<number>
  canvasHRef: MutableRefObject<number>
  screenToSVG: (clientX: number, clientY: number) => Point | null
  dispatchCam: (action: { type: string; [key: string]: unknown }) => void
  notifyDrag?: (() => void) | null
}

export function useTableInteractions({
  tables,
  setTables,
  selectedTableId,
  lockMode,
  undo,
  saveAction,
  setModal,
  setEditPanel,
  setConfirmDialog,
  setClickedSeat,
  setShowCatering,
  setSelectedTableId,
  setHoveredGuest,
  setIsDraggingGuest,
  camRef,
  canvasWRef,
  canvasHRef,
  screenToSVG,
  dispatchCam,
  notifyDrag = null,
}: UseTableInteractionsProps) {
  const draggingTableRef = useRef<DraggingTable | null>(null);
  const panningRef = useRef<PanState | null>(null);
  const spaceDownRef = useRef<boolean>(false);
  const hoveredGuestClearedRef = useRef<boolean>(false);
  const dragPreviewRef = useRef<DragPreview | null>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName) &&
        !(e.target as HTMLElement).isContentEditable
      ) {
        spaceDownRef.current = true;
        e.preventDefault();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
      if (e.key === "Escape") {
        setModal(null);
        setEditPanel(null);
        setConfirmDialog(null);
        setClickedSeat(null);
        setShowCatering(false);
        setSelectedTableId(null);
      }
      if (selectedTableId && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? GRID : 4;
        if (!e.repeat) saveAction();
        setTables((prev) =>
          prev.map((t) => {
            if (t.id !== selectedTableId) return t;
            const d = getTableDims(t);
            return {
              ...t,
              x: Math.max(
                0,
                Math.min(
                  PLAN_W - (d.w as number),
                  e.key === "ArrowLeft" ? t.x - step : e.key === "ArrowRight" ? t.x + step : t.x
                )
              ),
              y: Math.max(
                0,
                Math.min(
                  PLAN_H - (d.h as number),
                  e.key === "ArrowUp" ? t.y - step : e.key === "ArrowDown" ? t.y + step : t.y
                )
              ),
            };
          })
        );
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceDownRef.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [undo, selectedTableId, saveAction, setTables, setModal, setEditPanel, setConfirmDialog, setClickedSeat, setShowCatering, setSelectedTableId]);

  useEffect(() => {
    const rafRef: { current: number | null } = { current: null };
    const move = (e: MouseEvent) => {
      if ((draggingTableRef.current || panningRef.current) && !hoveredGuestClearedRef.current) {
        hoveredGuestClearedRef.current = true;
        setHoveredGuest(null);
      }
      if (panningRef.current) {
        const { sx, sy, vx0, vy0 } = panningRef.current;
        const z = camRef.current.z;
        const dxWorld = -(e.clientX - sx) / z;
        const dyWorld = -(e.clientY - sy) / z;
        const cW = canvasWRef.current;
        const cH = canvasHRef.current;
        dispatchCam({
          type: "CAM_SET",
          vx: Math.max(-PAN_PAD, Math.min(PLAN_W + PAN_PAD - cW / z, vx0 + dxWorld)),
          vy: Math.max(-PAN_PAD, Math.min(PLAN_H + PAN_PAD - cH / z, vy0 + dyWorld)),
          z,
          canvasW: cW,
          canvasH: cH,
        });
        return;
      }
      if (draggingTableRef.current && !lockMode) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        const cx = e.clientX,
          cy = e.clientY;
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          if (!draggingTableRef.current) return;
          const { id, ox, oy, dw, dh } = draggingTableRef.current;
          const pt = screenToSVG(cx, cy);
          if (!pt) return;
          dragPreviewRef.current = {
            tableId: id,
            x: Math.max(0, Math.min(PLAN_W - dw, pt.x - ox)),
            y: Math.max(0, Math.min(PLAN_H - dh, pt.y - oy)),
          };
          notifyDrag?.();
        });
      }
    };
    const up = () => {
      const wasDragging = !!draggingTableRef.current;
      const wasPanning = !!panningRef.current;
      if (draggingTableRef.current) {
        saveAction();
        if (dragPreviewRef.current) {
          const { tableId, x, y } = dragPreviewRef.current;
          setTables((prev) => prev.map((t) => (t.id !== tableId ? t : { ...t, x, y })));
        }
      }
      draggingTableRef.current = null;
      dragPreviewRef.current = null;
      panningRef.current = null;
      hoveredGuestClearedRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setIsDraggingGuest(false);
      // Tooltip: clear doar după drag/pan activ — nu la click simplu
      if (wasDragging || wasPanning) setHoveredGuest(null);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [screenToSVG, lockMode, dispatchCam]);

  const handleSvgMouseDown = useCallback(
    (e: { button: number; clientX: number; clientY: number; preventDefault: () => void }) => {
      if (e.button === 1 || spaceDownRef.current) {
        e.preventDefault();
        panningRef.current = {
          sx: e.clientX,
          sy: e.clientY,
          vx0: camRef.current.vx,
          vy0: camRef.current.vy,
        };
      }
    },
    [camRef]
  );

  return {
    draggingTableRef,
    panningRef,
    spaceDownRef,
    handleSvgMouseDown,
    dragPreviewRef,
  };
}
