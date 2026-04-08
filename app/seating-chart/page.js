"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GRID,
  PLAN_W,
  PLAN_H,
  LIMITS,
  TYPE_LABELS,
  getGroupColor,
  getTableDims,
} from "./utils/geometry.ts";
import { useCamera } from "./hooks/useCamera.ts";
import { useSeatingData } from "./hooks/useSeatingData.ts";
import { useSeatingUI } from "./hooks/useSeatingUI.ts";
import { applySeatingEffect } from "./utils/applySeatingEffect.js";
import { useGuestLocator } from "./hooks/useGuestLocator.js";
import { useTableInteractions } from "./hooks/useTableInteractions.ts";
import { TableNode } from "./components/TableNode.tsx";
import GuestSidebar from "./components/GuestSidebar.tsx";
import CanvasToolbar from "./components/CanvasToolbar.tsx";
import StatsPanel from "./components/StatsPanel.tsx";
import CateringModal from "./components/CateringModal.jsx";
import EditPanel from "./components/EditPanel.tsx";
import ConfirmDialog from "./components/ConfirmDialog.jsx";
import ToastStack from "./components/ToastStack.jsx";
import { exportToPng } from "./utils/exportPng.ts";
import FpsCounter from "./components/FpsCounter.jsx";
import SaveIndicator from "../components/SaveIndicator.jsx";
import ReadOnlyBanner from "../components/ReadOnlyBanner.tsx";
import { supabaseClient } from "../lib/supabase/client";
import { useSeatingSync } from "../../lib/seating/use-seating-sync";
import { useSession } from "../lib/auth/session/use-session";
import { clearSessionCache } from "../lib/auth/session/session-bridge";
import { useReadOnlyMode } from "../../lib/system/read-only";
import "./seating-chart.css";

const EMPTY_ARRAY = [];

function isTableVisible(t, cam, canvasW, canvasH) {
  const CULL_PAD = 300;
  const d = getTableDims(t);
  return (
    t.x + d.w + CULL_PAD > cam.vx &&
    t.x - CULL_PAD < cam.vx + canvasW / cam.z &&
    t.y + d.h + CULL_PAD > cam.vy &&
    t.y - CULL_PAD < cam.vy + canvasH / cam.z
  );
}

function SeatingChartInner({
  initialGuests,
  onSeatingStateChanged,
  syncSaveStatus,
  confirmedAt,
  confirmedSnapshot,
  onRetry,
  onRevertConfirmed,
}) {
  // ── Layer 1: Camera ──
  const {
    cam,
    dispatchCam,
    camRef,
    canvasRef,
    svgRef,
    canvasW,
    canvasH,
    canvasWRef,
    canvasHRef,
    viewBox,
    screenToSVG,
    zoomBy,
    fitToScreen,
    hydrated,
    focusPoint,
  } = useCamera();

  // ── Read-only mode ──
  const { isReadOnly } = useReadOnlyMode();

  // ── Save status — vine din useSeatingSync (API sync) ──
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );

  useEffect(() => {
    const onOnline  = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // ── beforeunload — activ DOAR când syncSaveStatus === "unconfirmed" ──
  useEffect(() => {
    if (syncSaveStatus !== "unconfirmed") return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [syncSaveStatus]);

  // ── Layer 2: Data ──
  const data = useSeatingData(cam, camRef, canvasWRef, canvasHRef, {
    initialGuests,
    onSeatingStateChanged,
  });

  // ── Layer 3: UI ──
  const ui = useSeatingUI();

  // ── Effect handler ──
  const handleResult = useCallback((result) => {
    result?.effects?.forEach((effect) => applySeatingEffect(effect, ui));
  }, [ui]);

  // ── Drag preview tick — forțează re-render vizual fără setTables per frame ──
  const [, setDragTick] = useState(0);

  // ── Search state (UI local) ──
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightGroupId, setHighlightGroupId] = useState(null);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const filteredUnassigned = useMemo(
    () => {
      let result = data.filteredUnassigned(searchQuery);
      if (activeGroupId) result = result.filter((g) => g.grup === activeGroupId);
      return result;
    },
    [data.filteredUnassigned, searchQuery, activeGroupId]
  );
  const [exportDialog, setExportDialog] = useState(false);
  const [exportMode, setExportMode] = useState("fit");
  const [exporting, setExporting] = useState(false);

  const vzoom = cam.z;

  // ── Reset ──
  const handleReset = useCallback(() => {
    const result = data.resetPlan(dispatchCam);
    handleResult(result);
  }, [data, dispatchCam, handleResult]);

  // ── Export ──
  const handleExport = useCallback(async () => {
    if (!svgRef.current) return;
    setExporting(true);
    try {
      const blob = await exportToPng({
        svgEl: svgRef.current,
        tables: data.tables,
        getTableDims,
        mode: exportMode,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `plan-mese-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setExportDialog(false);
      ui.showToast("✓ Export reușit!", "green");
    } catch (err) {
      ui.showToast("Eroare la export. Încearcă din nou.", "red");
    } finally {
      setExporting(false);
    }
  }, [svgRef, data.tables, exportMode, ui]);

  // ── Guest locator ──
  const { highlightGuestId, locateGuest: locateGuestRaw, clearHighlight } = useGuestLocator({
    tables: data.tables,
    getGuestTableId: data.getGuestTableId,
    focusPoint,
  });

  // ── Locate guest — resetează selectedTableId când navigăm la un invitat ──
  const locateGuest = useCallback((guestId) => {
    ui.setSelectedTableId(null);
    ui.setClickedSeat(null);
    locateGuestRaw(guestId);
  }, [locateGuestRaw, ui]);

  // ── Clear clicked seat on nav ──
  useEffect(() => {
    ui.setClickedSeat(null);
  }, [cam.vx, cam.vy, cam.z, ui.selectedTableId, ui.isDraggingGuest, data.assignedCount]);

  // ── Clear highlight când userul selectează o masă ──
  useEffect(() => {
    if (ui.selectedTableId) clearHighlight();
  }, [ui.selectedTableId, clearHighlight]);

  // ── Layer 3: Interactions ──
  const { draggingTableRef, panningRef, spaceDownRef, handleSvgMouseDown, dragPreviewRef } = useTableInteractions({
    tables: data.tables,
    setTables: data.setTables,
    selectedTableId: ui.selectedTableId,
    lockMode: ui.lockMode,
    undo: () => handleResult(data.undo()),
    saveAction: data.saveAction,
    setModal: ui.setModal,
    setEditPanel: ui.setEditPanel,
    setConfirmDialog: ui.setConfirmDialog,
    setClickedSeat: ui.setClickedSeat,
    setShowCatering: ui.setShowCatering,
    setSelectedTableId: ui.setSelectedTableId,
    setHoveredGuest: ui.setHoveredGuest,
    setIsDraggingGuest: ui.setIsDraggingGuest,
    camRef,
    canvasWRef,
    canvasHRef,
    screenToSVG,
    dispatchCam,
    notifyDrag: () => setDragTick((n) => n + 1),
  });

  // ── Wrapped actions ──
  const handleAssignGuest = useCallback((gId, tableId) => {
    handleResult(data.assignGuest(gId, tableId));
  }, [data, handleResult]);

  const handleUnassignGuest = useCallback((guestId) => {
    handleResult(data.unassignGuest(guestId));
  }, [data, handleResult]);

  const handleMagicFill = useCallback(() => {
    if (isReadOnly) return;
    handleResult(data.magicFill());
  }, [data, handleResult, isReadOnly]);

  const handleCreateTable = useCallback(() => {
    if (!ui.modal) return;
    const result = data.createTable(ui.modal);
    handleResult(result);
  }, [data, ui.modal, handleResult]);

  const handleSaveEdit = useCallback(() => {
    if (isReadOnly || !ui.editPanel) return;
    const result = data.saveEdit(ui.editName, ui.editSeats, ui.editPanel.tableId);
    handleResult(result);
  }, [data, ui.editPanel, ui.editName, ui.editSeats, handleResult, isReadOnly]);

  const handleDeleteTable = useCallback((tableId) => {
    const result = data.deleteTable(tableId);
    if (result.confirmRequired) {
      ui.setConfirmDialog({
        title: result.confirmRequired.title,
        sub: result.confirmRequired.sub,
        onOk: () => {
          const confirmResult = result.confirmRequired.onConfirm();
          handleResult(confirmResult);
        },
      });
    }
  }, [data, ui, handleResult]);

  const handleUndo = useCallback(() => {
    handleResult(data.undo());
  }, [data, handleResult]);

  if (!hydrated) return <div style={{ minHeight: "100vh", background: "#FAF7F2" }} />;

  return (
    <>
      <div className="sc-root">
        <nav className="sc-nav">
          <Link href="/dashboard" className="sc-logo">
            wedding<em>list</em>
          </Link>
          <div className="nav-divider" />
          <div className="nav-stats">
            {[
              { v: data.realTables.length, l: "Mese" },
              { v: data.totalSeats, l: "Locuri" },
              { v: data.assignedCount, l: "Ocupate" },
              { v: data.unassigned.length, l: "Neatribuiți" },
            ].map((s, i) => (
              <div key={i} className="nav-stat">
                <span className="nav-stat-num">{s.v}</span>
                <span className="nav-stat-lbl">{s.l}</span>
              </div>
            ))}
          </div>
          <Link href="/dashboard" className="nav-back">
            ← Dashboard
          </Link>
        </nav>

        <div className="sc-progress">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${data.progress}%` }} />
          </div>
          <span className="progress-text">
            {data.unassigned.length === 0 && data.guests.length > 0 ? (
              "✨ Toți invitații au un loc!"
            ) : (
              <>
                Mai ai <strong style={{ color: "#F0C9B0" }}>{data.unassigned.length}</strong> invitați de
                așezat
              </>
            )}
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: "0.6rem",
              color: "#6E7490",
              fontStyle: "italic",
              display: "flex",
              alignItems: "center",
              gap: "0.8rem",
            }}
          >
            Scroll=pan · Ctrl+Scroll=zoom · Space+drag=pan · Săgeți=mută masa
          </span>
        </div>

        <div className="sc-body">
          <GuestSidebar
            guests={data.guests}
            filteredUnassigned={filteredUnassigned}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            guestMeta={data.guestMeta}
            groupColorMap={data.groupColorMap}
            locateGuest={locateGuest}
            isDraggingGuest={ui.isDraggingGuest}
            setHoveredGuest={ui.setHoveredGuest}
            setIsDraggingGuest={ui.setIsDraggingGuest}
            tables={data.tables}
            highlightGroupId={highlightGroupId}
            setHighlightGroupId={setHighlightGroupId}
            activeGroupId={activeGroupId}
            setActiveGroupId={setActiveGroupId}
            onExport={() => setExportDialog(true)}
          />
          <div className="sc-canvas-col">
            <ReadOnlyBanner />
            <CanvasToolbar
              vzoom={vzoom}
              zoomBy={zoomBy}
              fitToScreen={fitToScreen}
              tables={data.tables}
              lockMode={ui.lockMode}
              setLockMode={ui.setLockMode}
              showToast={ui.showToast}
              magicFill={handleMagicFill}
              undo={handleUndo}
              setShowCatering={ui.setShowCatering}
              setConfirmDialog={ui.setConfirmDialog}
              resetPlan={handleReset}
              setModal={ui.setModal}
              getNextTableName={data.getNextTableName}
              onExport={() => setExportDialog(true)}
              isReadOnly={isReadOnly}
            />

            <div className="sc-canvas" ref={canvasRef} tabIndex={0} style={{ outline: "none" }}>
              <svg
                ref={svgRef}
                width="100%"
                height="100%"
                viewBox={viewBox}
                onMouseDown={handleSvgMouseDown}
                style={isReadOnly ? { pointerEvents: "none" } : undefined}
                onMouseEnter={() => setHighlightGroupId(null)}
                onClick={(e) => {
                  if (e.target === svgRef.current || e.target.getAttribute?.("data-bg") === "1") {
                    ui.setClickedSeat(null);
                    ui.setEditPanel(null);
                    ui.setSelectedTableId(null);
                    ui.setHoveredGuest(null);
                    clearHighlight();
                  }
                }}
              >
                <defs>
                  <pattern id="grid-pat" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
                    <path
                      d={`M ${GRID} 0 L 0 0 0 ${GRID} M ${GRID} 0 L ${GRID} ${GRID} M 0 ${GRID} L ${GRID} ${GRID}`}
                      fill="none"
                      stroke="#DDD5C8"
                      strokeWidth="0.4"
                    />
                  </pattern>
                  <filter id="shadow-sm" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="10" floodColor="rgba(196,168,130,0.5)" />
                  </filter>
                  <filter id="shadow-prez" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="3" stdDeviation="8" floodColor="rgba(201,144,122,0.2)" />
                  </filter>
                  <filter id="glow-sel" x="-40%" y="-40%" width="180%" height="180%">
                    <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#9F7AEA" floodOpacity="0.55" />
                  </filter>
                </defs>

                <rect
                  data-bg="1"
                  x="0" y="0"
                  width={PLAN_W} height={PLAN_H}
                  fill="url(#grid-pat)"
                  onClick={() => {
                    ui.setClickedSeat(null);
                    ui.setEditPanel(null);
                    ui.setSelectedTableId(null);
                    ui.setHoveredGuest(null);
                    clearHighlight();
                  }}
                />
                <rect
                  data-border="1"
                  x="0" y="0"
                  width={PLAN_W} height={PLAN_H}
                  fill="none"
                  stroke="#C4A882"
                  strokeWidth="3"
                  opacity="0.6"
                  style={{ pointerEvents: "none" }}
                />

                <g>
                  {data.tables.map((t) => {
                    const preview = dragPreviewRef.current?.tableId === t.id ? dragPreviewRef.current : null;
                    const tVisual = preview ? { ...t, x: preview.x, y: preview.y } : t;
                    if (!isTableVisible(tVisual, cam, canvasW, canvasH)) return null;
                    return (
                    <TableNode
                      key={t.id}
                      t={tVisual}
                      assignedGuests={data.guestsByTable[t.id] || EMPTY_ARRAY}
                      dragOver={ui.dragOver}
                      selectedTableId={ui.selectedTableId}
                      lockMode={ui.lockMode}
                      screenToSVG={screenToSVG}
                      assignGuest={handleAssignGuest}
                      setSelectedTableId={ui.setSelectedTableId}
                      setEditName={ui.setEditName}
                      setEditSeats={ui.setEditSeats}
                      setEditPanel={ui.setEditPanel}
                      setHoveredGuest={ui.setHoveredGuest}
                      setClickedSeat={ui.setClickedSeat}
                      setIsDraggingGuest={ui.setIsDraggingGuest}
                      setDragOver={ui.setDragOver}
                      draggingTableRef={draggingTableRef}
                      isHighlighted={false}
                      vzoom={vzoom}
                      isFocused={!ui.selectedTableId || ui.selectedTableId === t.id}
                      highlightGuestId={highlightGuestId}
                      highlightGroupId={highlightGroupId}
                      newTableIds={data.newTableIds}
                      clearNewTableHighlight={data.clearNewTableHighlight}
                      spaceDownRef={spaceDownRef}
                    />
                    );
                  })}
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <StatsPanel
        showStats={ui.showStats}
        setShowStats={ui.setShowStats}
        guests={data.guests}
        assignedCount={data.assignedCount}
        unassigned={data.unassigned}
        menuStats={data.menuStats}
      />

      <CateringModal
        showCatering={ui.showCatering}
        setShowCatering={ui.setShowCatering}
        tables={data.tables}
        guests={data.guests}
        menuStats={data.menuStats}
        showToast={ui.showToast}
        realTables={data.realTables}
      />

      {ui.hoveredGuest && !draggingTableRef.current && !panningRef.current && (() => {
        const hg = ui.hoveredGuestRef.current;
        if (!hg) return null;
        return (
          <div
            style={{
              position: "fixed",
              zIndex: 9999,
              background: "#1A1F3A",
              color: "#FAF7F2",
              padding: "0.55rem 0.85rem",
              borderRadius: "10px",
              fontSize: "0.7rem",
              pointerEvents: "none",
              boxShadow: "0 6px 28px rgba(0,0,0,0.4)",
              border: "1px solid rgba(201,144,122,0.25)",
              minWidth: "155px",
              left: Math.min(window.innerWidth - 180, hg.x + 14),
              top: Math.max(10, hg.y - 14),
              animation: "fadeUp 0.12s ease",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: "0.76rem", marginBottom: "0.18rem" }}>
              {hg.guest.prenume} {hg.guest.nume}
            </div>
            <div style={{ fontSize: "0.65rem", color: getGroupColor(hg.guest.grup), marginBottom: "0.1rem" }}>
              👥 {hg.guest.grup}
            </div>
            <div style={{ fontSize: "0.65rem", color: "#9DA3BC", marginBottom: "0.1rem" }}>
              🍽️ {hg.guest.meniu}
            </div>
            <div style={{ fontSize: "0.65rem", color: "#9DA3BC" }}>
              {hg.guest.status === "confirmat" ? "✅ Confirmat" : "⏳ În așteptare"}
            </div>
          </div>
        );
      })()}

      {ui.clickedSeat && (
        <div
          style={{
            position: "fixed",
            zIndex: 9998,
            background: "white",
            borderRadius: "10px",
            padding: "0.7rem 0.85rem",
            boxShadow: "0 6px 28px rgba(26,31,58,0.18)",
            border: "1px solid #E8DDD0",
            minWidth: "165px",
            left: ui.clickedSeat.x,
            top: ui.clickedSeat.y,
            animation: "fadeUp 0.15s ease",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.1rem" }}>
            <div style={{ fontWeight: 600, fontSize: "0.78rem", color: "#13172E" }}>
              {ui.clickedSeat.guest.prenume} {ui.clickedSeat.guest.nume}
            </div>
            <button
              style={{ background: "none", border: "none", cursor: "pointer", color: "#9DA3BC", fontSize: "0.85rem", lineHeight: 1, padding: "0 0 0 0.5rem", flexShrink: 0 }}
              onClick={() => ui.setClickedSeat(null)}
            >
              ×
            </button>
          </div>
          <div style={{ fontSize: "0.65rem", color: getGroupColor(ui.clickedSeat.guest.grup), marginBottom: "0.5rem" }}>
            {ui.clickedSeat.guest.grup}
          </div>
          <button
            style={{
              width: "100%",
              padding: "0.3rem 0.6rem",
              borderRadius: "6px",
              border: "1.5px solid #E53E3E",
              background: "#fff5f5",
              color: "#E53E3E",
              fontFamily: "'DM Sans',sans-serif",
              fontSize: "0.65rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              cursor: "pointer",
            }}
            onClick={() => handleUnassignGuest(ui.clickedSeat.guest.id)}
          >
            × Elimină de la masă
          </button>
        </div>
      )}

      <EditPanel
        editPanel={ui.editPanel}
        setEditPanel={ui.setEditPanel}
        tables={data.tables}
        editName={ui.editName}
        setEditName={ui.setEditName}
        editSeats={ui.editSeats}
        setEditSeats={ui.setEditSeats}
        saveEdit={handleSaveEdit}
        deleteTable={handleDeleteTable}
        rotateTable={data.rotateTable}
      />

      <ConfirmDialog confirmDialog={ui.confirmDialog} setConfirmDialog={ui.setConfirmDialog} />

      {ui.modal && (
        <ModalCreate
          modal={ui.modal}
          setModal={ui.setModal}
          createTable={handleCreateTable}
        />
      )}

      {ui.selectedTableId && (
        <div
          style={{
            position: "fixed",
            bottom: "1.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(19,23,46,0.85)",
            color: "#FAF7F2",
            padding: "0.4rem 1.2rem",
            borderRadius: "20px",
            fontSize: "0.65rem",
            zIndex: 200,
            pointerEvents: "none",
            backdropFilter: "blur(8px)",
          }}
        >
          ⌨️ Săgeți = mută · Shift+Săgeți = mută 20px · Dbl-click = editare · Esc = deselectează
        </div>
      )}

      <ToastStack toasts={ui.toasts} />

      {exportDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 400,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(19,23,46,0.15)",
          }}
          onClick={() => setExportDialog(false)}
        >
          <div
            style={{
              width: 300,
              background: "#1A1F3A",
              border: "1px solid rgba(201,144,122,0.25)",
              borderRadius: "16px",
              padding: "1.4rem",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
              animation: "fadeUp 0.18s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontFamily: "Cormorant Garamond,serif", fontSize: "1.1rem", color: "#FAF7F2", marginBottom: "1rem", fontWeight: 600 }}>
              Export PNG
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.2rem" }}>
              {["fit", "a4"].map((mode) => (
                <label
                  key={mode}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    cursor: "pointer",
                    padding: "0.6rem",
                    borderRadius: "8px",
                    border: `1px solid ${exportMode === mode ? "rgba(201,144,122,0.5)" : "rgba(255,255,255,0.1)"}`,
                    background: exportMode === mode ? "rgba(201,144,122,0.08)" : "transparent",
                  }}
                >
                  <input
                    type="radio"
                    name="exportMode"
                    value={mode}
                    checked={exportMode === mode}
                    onChange={() => setExportMode(mode)}
                    style={{ accentColor: "#C9907A" }}
                  />
                  <div>
                    <div style={{ fontSize: "0.78rem", color: "#FAF7F2", fontWeight: 500 }}>
                      {mode === "fit" ? "Fit to content" : "A4 landscape"}
                    </div>
                    <div style={{ fontSize: "0.62rem", color: "#6E7490" }}>
                      {mode === "fit" ? "Dimensiune optimă — ideal pentru share" : "Print ready — ideal pentru restaurant"}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                style={{ flex: 1, padding: "0.4rem", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "none", color: "#9DA3BC", fontFamily: "DM Sans,sans-serif", fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer" }}
                onClick={() => setExportDialog(false)}
              >
                Anulează
              </button>
              <button
                style={{ flex: 1, padding: "0.4rem", borderRadius: 6, border: "none", background: "#C9907A", color: "white", fontFamily: "DM Sans,sans-serif", fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer", opacity: exporting ? 0.7 : 1 }}
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? "Se exportă..." : "Exportă →"}
              </button>
            </div>
          </div>
        </div>
      )}
      <SaveIndicator status={syncSaveStatus} isOffline={isOffline} />
      {syncSaveStatus === "unconfirmed" && (
        <UnconfirmedBanner
          confirmedAt={confirmedAt}
          hasSnapshot={!!confirmedSnapshot}
          onRetry={onRetry}
          onRevert={() => {
            const ora = confirmedAt
              ? new Date(confirmedAt).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })
              : "necunoscută";
            ui.setConfirmDialog({
              title: "Revenire la starea salvată",
              sub: `Vei pierde modificările nesalvate. Revenim la starea salvată la ${ora}. Continui?`,
              onOk: () => {
                if (confirmedSnapshot) {
                  data.revertToSnapshot(confirmedSnapshot);
                }
                onRevertConfirmed();
              },
            });
          }}
        />
      )}
      <FpsCounter />
    </>
  );
}

function ModalCreate({ modal, setModal, createTable }) {
  const isBar = modal.type === "bar";
  return (
    <div className="sc-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
      <div className="sc-modal">
        <div className="modal-title">{isBar ? "Obiect Decor" : "Masă nouă"}</div>
        <div className="modal-type-badge">{TYPE_LABELS[modal.type]}</div>
        <label className="ep-label">{isBar ? "Numele obiectului" : "Numele mesei *"}</label>
        <input
          autoFocus
          className="ep-input"
          value={modal.name}
          onChange={(e) => setModal((m) => ({ ...m, name: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && createTable()}
          placeholder={isBar ? "ex: Candy Bar, Ring Dans" : "ex: Masa 1"}
        />
        {!isBar && (
          <>
            <label className="ep-label">Număr locuri</label>
            <div className="ep-counter" style={{ marginBottom: "1.3rem" }}>
              <button className="ep-cnt-btn" onClick={() => setModal((m) => ({ ...m, seats: Math.max(LIMITS[m.type].min, m.seats - 1) }))}>−</button>
              <span className="ep-cnt-val">{modal.seats}</span>
              <button className="ep-cnt-btn" onClick={() => setModal((m) => ({ ...m, seats: Math.min(LIMITS[m.type].max, m.seats + 1) }))}>+</button>
              <span style={{ marginLeft: "auto", fontSize: "0.62rem", color: "#7A7F99" }}>
                {LIMITS[modal.type].min}–{LIMITS[modal.type].max}
              </span>
            </div>
          </>
        )}
        {isBar && (
          <p style={{ fontSize: "0.72rem", color: "#7A7F99", marginBottom: "1.2rem", lineHeight: 1.5 }}>
            Obiect decorativ — nu are locuri, nu apare în statistici.
          </p>
        )}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="conf-cancel" onClick={() => setModal(null)}>Anulează</button>
          <button className="conf-ok" onClick={createTable}>Creează →</button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SeatingChartWrapper — fetch canonical data + inject into SeatingChartInner.
// Authenticated sync error = explicit error state. No local fallback.
// =============================================================================

function SeatingChartWrapperInner({ weddingId, eventId }) {
  const {
    initialGuests,
    isLoading,
    error,
    onSeatingStateChanged,
    saveStatus,
    confirmedAt,
    confirmedSnapshot,
    retry,
    confirmRevert,
  } = useSeatingSync({
    weddingId,
    eventId,
    supabase: supabaseClient,
  });

  if (isLoading) {
    return <FullPageLoader message="Se încarcă planul de mese..." />;
  }

  if (error) {
    // Authenticated user — NEVER fall back to local mode. Show explicit error.
    return <SyncErrorState error={error} />;
  }

  return (
    <SeatingChartInner
      initialGuests={initialGuests}
      onSeatingStateChanged={onSeatingStateChanged}
      syncSaveStatus={saveStatus}
      confirmedAt={confirmedAt}
      confirmedSnapshot={confirmedSnapshot}
      onRetry={retry}
      onRevertConfirmed={confirmRevert}
    />
  );
}

// =============================================================================
// UI States
// =============================================================================

function FullPageLoader({ message }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#FAF7F2",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: "1rem",
    }}>
      <div style={{
        width: 32,
        height: 32,
        border: "3px solid #E8DDD0",
        borderTopColor: "#C9907A",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      {message && (
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "0.8rem",
          color: "#6E7490",
        }}>
          {message}
        </p>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ForceResyncButton() {
  const handleResync = useCallback(() => {
    clearSessionCache();
    window.location.reload();
  }, []);

  return (
    <button
      onClick={handleResync}
      style={{
        marginTop: "0.5rem",
        padding: "0.5rem 1.5rem",
        borderRadius: "999px",
        border: "none",
        background: "#C9907A",
        color: "white",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "0.72rem",
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      Reîncearcă
    </button>
  );
}

function ProvisioningErrorState({ error }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#FAF7F2",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: "1rem",
      padding: "2rem",
    }}>
      <div style={{ fontSize: "2rem" }}>⚠️</div>
      <p style={{
        fontFamily: "Cormorant Garamond, serif",
        fontSize: "1.2rem",
        color: "#1E2340",
        fontWeight: 600,
        textAlign: "center",
      }}>
        Nu am putut încărca datele contului
      </p>
      <p style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "0.75rem",
        color: "#6E7490",
        textAlign: "center",
        maxWidth: 400,
      }}>
        {error || "Încearcă din nou sau contactează suportul dacă problema persistă."}
      </p>
      <ForceResyncButton />
    </div>
  );
}

// =============================================================================
// UnconfirmedBanner — banner persistent roșu când sync a eșuat definitiv
// NU blochează editorul. Butoane: Reîncearcă / Revenire.
// =============================================================================

function UnconfirmedBanner({ confirmedAt, hasSnapshot, onRetry, onRevert }) {
  const ora = confirmedAt
    ? new Date(confirmedAt).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "rgba(229,62,62,0.95)",
        color: "#fff",
        padding: "0.6rem 1.2rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "0.78rem",
        fontWeight: 500,
        backdropFilter: "blur(4px)",
        boxShadow: "0 2px 12px rgba(229,62,62,0.4)",
      }}
    >
      <span style={{ flex: 1 }}>
        ⚠ Modificările nu au putut fi salvate pe server.
        {ora && <span style={{ opacity: 0.85, marginLeft: 6 }}>Ultima salvare confirmată: {ora}</span>}
      </span>
      <button
        onClick={onRetry}
        style={{
          padding: "0.3rem 0.9rem",
          borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.5)",
          background: "transparent",
          color: "#fff",
          fontFamily: "inherit",
          fontSize: "0.72rem",
          fontWeight: 600,
          cursor: "pointer",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        Reîncearcă
      </button>
      {hasSnapshot && (
        <button
          onClick={onRevert}
          style={{
            padding: "0.3rem 0.9rem",
            borderRadius: 6,
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "#fff",
            fontFamily: "inherit",
            fontSize: "0.72rem",
            fontWeight: 600,
            cursor: "pointer",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Revenire
        </button>
      )}
    </div>
  );
}

function SyncErrorState({ error }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#FAF7F2",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: "1rem",
      padding: "2rem",
    }}>
      <div style={{ fontSize: "2rem" }}>⚠️</div>
      <p style={{
        fontFamily: "Cormorant Garamond, serif",
        fontSize: "1.2rem",
        color: "#1E2340",
        fontWeight: 600,
        textAlign: "center",
      }}>
        Nu am putut sincroniza planul de mese
      </p>
      <p style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "0.75rem",
        color: "#6E7490",
        textAlign: "center",
        maxWidth: 400,
      }}>
        {error || "Verifică conexiunea la internet și încearcă din nou."}
      </p>
      <ForceResyncButton />
    </div>
  );
}

function EmptyEventState() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#FAF7F2",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: "1rem",
      padding: "2rem",
    }}>
      <div style={{ fontSize: "2rem" }}>🪑</div>
      <p style={{
        fontFamily: "Cormorant Garamond, serif",
        fontSize: "1.2rem",
        color: "#1E2340",
        fontWeight: 600,
      }}>
        Planul de mese nu este încă disponibil
      </p>
      <p style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "0.75rem",
        color: "#6E7490",
        textAlign: "center",
        maxWidth: 400,
      }}>
        Contul tău este în curs de configurare. Revino în câteva momente.
      </p>
      <ForceResyncButton />
    </div>
  );
}

function GuestModeBanner() {
  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 300,
      background: "rgba(30, 35, 64, 0.92)",
      backdropFilter: "blur(8px)",
      padding: "0.6rem 1.2rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "1rem",
    }}>
      <p style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "0.72rem",
        color: "#FAF7F2",
        margin: 0,
      }}>
        Ești în modul vizitator — modificările nu sunt salvate.
      </p>
      <a
        href={typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_WP_BASE_URL || "/") : "/"}
        style={{
          padding: "0.3rem 1rem",
          borderRadius: "999px",
          border: "none",
          background: "#C9907A",
          color: "white",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "0.65rem",
          fontWeight: 600,
          textDecoration: "none",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Conectează-te →
      </a>
    </div>
  );
}

// =============================================================================
// Default export — strict flow: session → seating
// All operational context from bootstrap → session. No second resolver.
// =============================================================================

export default function SeatingChart() {
  const session = useSession();

  // ── Session loading → full page loader (NEVER flash local mode) ──
  if (session.status === "loading") {
    return <FullPageLoader message="Se conectează..." />;
  }

  // ── Guest (not authenticated) → local mode with banner ──
  if (session.status === "guest" || session.status === "wp_down") {
    return (
      <>
        <SeatingChartInner initialGuests={null} onSeatingStateChanged={null} />
        <GuestModeBanner />
      </>
    );
  }

  // ── Session error → error state with force re-sync ──
  if (session.status === "error") {
    return <ProvisioningErrorState error={session.message} />;
  }

  // ── Authenticated — strict state machine ──

  // Provisioning failed at bootstrap level
  if (session.provisioningStatus === "failed") {
    return <ProvisioningErrorState error="Provizionarea contului a eșuat." />;
  }

  // Provisioning pending (no wedding or no event yet)
  if (session.provisioningStatus === "pending") {
    return <EmptyEventState />;
  }

  // No activeWeddingId — should not happen if provisioning_status is ready
  if (!session.activeWeddingId) {
    return <ProvisioningErrorState error="Nu am găsit o nuntă activă." />;
  }

  // No activeEventId — explicit empty state
  if (!session.activeEventId) {
    return <EmptyEventState />;
  }

  // ── Everything ready — render seating with full sync ──
  return (
    <SeatingChartWrapperInner
      weddingId={session.activeWeddingId}
      eventId={session.activeEventId}
    />
  );
}
