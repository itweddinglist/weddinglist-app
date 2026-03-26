"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GRID,
  PLAN_W,
  PLAN_H,
  LIMITS,
  TYPE_LABELS,
  getGroupColor,
  getTableDims,
} from "./utils/geometry.js";
import { useCamera } from "./hooks/useCamera.js";
import { useSeatingData } from "./hooks/useSeatingData.js";
import { useSeatingUI } from "./hooks/useSeatingUI.js";
import { applySeatingEffect } from "./utils/applySeatingEffect.js";
import { useGuestLocator } from "./hooks/useGuestLocator.js";
import { useTableInteractions } from "./hooks/useTableInteractions.js";
import { TableNode } from "./components/TableNode.jsx";
import GuestSidebar from "./components/GuestSidebar.jsx";
import CanvasToolbar from "./components/CanvasToolbar.jsx";
import StatsPanel from "./components/StatsPanel.jsx";
import CateringModal from "./components/CateringModal.jsx";
import EditPanel from "./components/EditPanel.jsx";
import ConfirmDialog from "./components/ConfirmDialog.jsx";
import ToastStack from "./components/ToastStack.jsx";
import { exportToPng } from "./utils/exportPng.js";
import FpsCounter from "./components/FpsCounter.jsx";

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

export default function SeatingChart() {
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

  // ── Layer 2: Data ──
  const data = useSeatingData(cam, camRef, canvasWRef, canvasHRef);

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
  const filteredUnassigned = useMemo(
    () => data.filteredUnassigned(searchQuery),
    [data.filteredUnassigned, searchQuery]
  );

  // ── Export state (UI local) ──
  const [savedAt, setSavedAt] = useState(null);
  const [highlightGroupId, setHighlightGroupId] = useState(null);
  const [exportDialog, setExportDialog] = useState(false);
  const [exportMode, setExportMode] = useState("fit");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!savedAt) return;
    const timer = setTimeout(() => setSavedAt(null), 2000);
    return () => clearTimeout(timer);
  }, [savedAt]);

  const vzoom = cam.z;

  // ── saveAction cu indicator ──
  const saveActionWithIndicator = useCallback(() => {
    data.saveAction();
    setSavedAt(Date.now());
  }, [data]);

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
  const { highlightTableId, highlightGuestId, locateGuest } = useGuestLocator({
    tables: data.tables,
    getGuestTableId: data.getGuestTableId,
    focusPoint,
  });

  // ── Clear clicked seat on nav ──
  useEffect(() => {
    ui.setClickedSeat(null);
  }, [cam.vx, cam.vy, cam.z, ui.selectedTableId, ui.isDraggingGuest, data.assignedCount]);

  // ── Layer 3: Interactions ──
  const { draggingTableRef, panningRef, spaceDownRef, handleSvgMouseDown, dragPreviewRef } = useTableInteractions({
    tables: data.tables,
    setTables: data.setTables,
    selectedTableId: ui.selectedTableId,
    lockMode: ui.lockMode,
    undo: () => handleResult(data.undo()),
    saveAction: saveActionWithIndicator,
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
    handleResult(data.magicFill());
  }, [data, handleResult]);

  const handleCreateTable = useCallback(() => {
    if (!ui.modal) return;
    const result = data.createTable(ui.modal);
    handleResult(result);
  }, [data, ui.modal, handleResult]);

  const handleSaveEdit = useCallback(() => {
    if (!ui.editPanel) return;
    const result = data.saveEdit(ui.editName, ui.editSeats, ui.editPanel.tableId);
    handleResult(result);
  }, [data, ui.editPanel, ui.editName, ui.editSeats, handleResult]);

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
      <style>{css}</style>
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
            {savedAt && (
              <span style={{ color: "#48BB78", fontStyle: "normal", fontWeight: 500, animation: "fadeUp 0.2s ease" }}>
                ✓ Salvat
              </span>
            )}
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
          />
          <div className="sc-canvas-col">
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
            />

            <div className="sc-canvas" ref={canvasRef} tabIndex={0} style={{ outline: "none" }}>
              <svg
                ref={svgRef}
                width="100%"
                height="100%"
                viewBox={viewBox}
                onMouseDown={handleSvgMouseDown}
                onClick={(e) => {
                  if (e.target === svgRef.current || e.target.getAttribute?.("data-bg") === "1") {
                    ui.setClickedSeat(null);
                    ui.setEditPanel(null);
                    ui.setSelectedTableId(null);
                    ui.setHoveredGuest(null);
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
                      isHighlighted={highlightTableId === t.id}
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
          <div style={{ fontWeight: 600, fontSize: "0.78rem", color: "#13172E", marginBottom: "0.1rem" }}>
            {ui.clickedSeat.guest.prenume} {ui.clickedSeat.guest.nume}
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

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=DM+Sans:wght@300;400;500;600&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  body{overflow:hidden;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  .sc-root{font-family:'DM Sans',sans-serif;height:100vh;display:flex;flex-direction:column;overflow:hidden;background:#FAF7F2;}
  .sc-nav{background:#13172E;height:56px;display:flex;align-items:center;padding:0 1.4rem;gap:1rem;flex-shrink:0;}
  .sc-logo{font-family:'Cormorant Garamond',serif;font-size:1.2rem;font-weight:300;color:#FAF7F2;text-decoration:none;letter-spacing:0.05em;white-space:nowrap;}
  .sc-logo em{color:#C9907A;font-style:italic;}
  .nav-divider{width:1px;height:22px;background:rgba(255,255,255,0.1);flex-shrink:0;}
  .nav-stats{display:flex;gap:1.5rem;}
  .nav-stat{display:flex;flex-direction:column;}
  .nav-stat-num{font-family:'Cormorant Garamond',serif;font-size:1.1rem;color:#FAF7F2;line-height:1.1;}
  .nav-stat-lbl{font-size:0.52rem;text-transform:uppercase;letter-spacing:0.08em;color:#6E7490;}
  .nav-back{margin-left:auto;font-size:0.72rem;color:#C9907A;text-decoration:none;letter-spacing:0.04em;padding:0.3rem 0.8rem;border:1px solid rgba(201,144,122,0.3);border-radius:6px;transition:all 0.2s;white-space:nowrap;}
  .nav-back:hover{background:rgba(201,144,122,0.1);border-color:#C9907A;}
  .sc-progress{background:#13172E;height:30px;display:flex;align-items:center;gap:1rem;padding:0 1.4rem;border-bottom:1px solid rgba(255,255,255,0.05);flex-shrink:0;}
  .progress-track{width:280px;height:3px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;flex-shrink:0;}
  .progress-fill{height:100%;background:linear-gradient(90deg,#C9907A,#E8C4A0);border-radius:2px;transition:width 0.5s ease;}
  .progress-text{font-size:0.64rem;color:#9DA3BC;}
  .sc-body{display:flex;flex:1;overflow:hidden;}
  .sc-sidebar{width:248px;flex-shrink:0;background:#1E2340;border-right:1px solid rgba(196,168,130,0.15);display:flex;flex-direction:column;overflow:hidden;}
  .sb-search-wrap{padding:1rem 1rem 0.5rem;position:relative;}
  .sb-search{width:100%;background:transparent;border:none;border-bottom:1px solid rgba(232,221,208,0.2);padding:6px 24px 6px 0;color:#E8E9F0;font-family:'DM Sans',sans-serif;font-size:0.8rem;outline:none;caret-color:#C9907A;}
  .sb-search::placeholder{color:#6E7490;font-style:italic;}
  .sb-search:focus{border-bottom-color:#C9907A;}
  .sb-search-clear{position:absolute;right:1rem;top:1.2rem;background:none;border:none;color:#6E7490;cursor:pointer;font-size:1rem;}
  .sb-add-section{padding:0.6rem 1rem 0.4rem;}
  .sb-section-label{font-size:0.55rem;text-transform:uppercase;letter-spacing:0.12em;color:#6E7490;margin-bottom:0.4rem;}
  .sb-label-pad{padding:0 1rem;display:flex;align-items:center;justify-content:space-between;margin-bottom:0.4rem;}
  .sb-badge{background:#C9907A;color:white;font-size:0.55rem;padding:0.1rem 0.45rem;border-radius:10px;}
  .sb-add-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.3rem;}
  .sb-add-btn{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:0.4rem 0.3rem;font-family:'DM Sans',sans-serif;font-size:0.6rem;color:#9DA3BC;cursor:pointer;transition:all 0.2s;text-align:center;}
  .sb-add-btn:hover{background:rgba(201,144,122,0.1);border-color:rgba(201,144,122,0.3);color:#F0C9B0;}
  .sb-add-icon{font-size:0.85rem;display:block;margin-bottom:0.12rem;}
  .sb-prezidiu{grid-column:span 2;border-color:rgba(201,144,122,0.2);color:#C9907A;}
  .sb-bar{grid-column:span 2;border-color:rgba(72,187,120,0.2);color:#48BB78;}
  .sb-bar:hover{background:rgba(72,187,120,0.1)!important;border-color:rgba(72,187,120,0.4)!important;color:#48BB78!important;}
  .sb-divider{height:1px;background:rgba(255,255,255,0.06);margin:0.5rem 0;}
  .sb-guests{flex:1;overflow-y:auto;padding:0 1rem;}
  .sb-guests::-webkit-scrollbar{width:3px;}
  .sb-guests::-webkit-scrollbar-thumb{background:rgba(201,144,122,0.25);border-radius:2px;}
  .sb-guest-row{display:flex;align-items:center;gap:0.55rem;padding:0.38rem 0.5rem;border-radius:7px;border:1px solid rgba(255,255,255,0.05);margin-bottom:0.22rem;cursor:grab;background:rgba(255,255,255,0.02);transition:background 0.15s ease, border-color 0.15s ease;}
  .sb-guest-row:hover{background:rgba(201,144,122,0.07);border-color:rgba(201,144,122,0.18);}
  .sb-avatar{width:23px;height:23px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.58rem;font-weight:600;flex-shrink:0;cursor:help;}
  .sb-guest-name{font-size:0.72rem;color:#E8E9F0;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .sb-status-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
  .sb-empty{text-align:center;padding:1rem 0;font-size:0.72rem;color:#6E7490;font-style:italic;}
  .sb-footer{padding:0.6rem 1rem;border-top:1px solid rgba(255,255,255,0.06);display:flex;gap:1rem;}
  .sb-footer-stat{display:flex;flex-direction:column;}
  .sb-footer-num{font-family:'Cormorant Garamond',serif;font-size:1rem;color:#FAF7F2;}
  .sb-footer-lbl{font-size:0.52rem;text-transform:uppercase;letter-spacing:0.07em;color:#6E7490;}
  .sc-canvas-col{flex:1;display:flex;flex-direction:column;overflow:hidden;}
  .sc-toolbar{padding:0.45rem 0.9rem;background:rgba(250,247,242,0.98);border-bottom:1px solid #E8DDD0;display:flex;align-items:center;gap:0.35rem;flex-shrink:0;flex-wrap:wrap;}
  .tb-btn{padding:0.25rem 0.65rem;border-radius:6px;font-family:'DM Sans',sans-serif;font-size:0.6rem;letter-spacing:0.05em;text-transform:uppercase;cursor:pointer;border:1px solid #E8DDD0;background:white;color:#13172E;transition:all 0.2s;white-space:nowrap;}
  .tb-btn:hover{border-color:#C9907A;color:#C9907A;}
  .tb-prez{color:#C9907A;border-color:rgba(201,144,122,0.35);}
  .tb-bar{color:#48BB78;border-color:rgba(72,187,120,0.35);}
  .tb-bar:hover{border-color:#48BB78!important;color:#48BB78!important;}
  .tb-magic{color:#9F7AEA;border-color:rgba(159,122,234,0.35);}
  .tb-magic:hover{border-color:#9F7AEA!important;color:#9F7AEA!important;}
  .tb-catering{color:#4299E1;border-color:rgba(66,153,225,0.35);}
  .tb-catering:hover{border-color:#4299E1!important;color:#4299E1!important;}
  .tb-lock-on{background:#13172E;color:white;border-color:#13172E;}
  .tb-danger:hover{border-color:#E53E3E;color:#E53E3E;}
  .tb-sep{width:1px;height:18px;background:#E8DDD0;flex-shrink:0;}
  .tb-zoom{font-size:0.62rem;color:#7A7F99;min-width:34px;text-align:center;}
  .tb-hint{margin-left:auto;font-size:0.62rem;color:#9DA3BC;font-style:italic;white-space:nowrap;}
  .sc-canvas{flex:1;overflow:hidden;background:#FAF7F2;}
  .sc-canvas svg{display:block;width:100%;height:100%;}
  .stats-panel{position:fixed;bottom:1.5rem;left:265px;background:#1A1F3A;border:1px solid rgba(201,144,122,0.2);border-radius:12px;padding:0.8rem 1rem;min-width:180px;z-index:200;}
  .stats-header{display:flex;align-items:center;justify-content:space-between;font-size:0.62rem;text-transform:uppercase;letter-spacing:0.08em;color:#9DA3BC;margin-bottom:0.5rem;}
  .stats-row{display:flex;justify-content:space-between;align-items:center;font-size:0.68rem;color:#9DA3BC;margin-bottom:0.2rem;}
  .stats-row strong{color:#FAF7F2;font-size:0.78rem;}
  .stats-divider{height:1px;background:rgba(255,255,255,0.07);margin:0.4rem 0;}
  .stats-toggle{position:fixed;bottom:1.5rem;left:265px;background:#1A1F3A;border:1px solid rgba(201,144,122,0.2);border-radius:8px;padding:0.4rem 0.6rem;color:#9DA3BC;cursor:pointer;font-size:0.9rem;z-index:200;}
  .sc-edit-panel{position:fixed;z-index:400;background:white;border-radius:13px;padding:1.1rem;width:210px;box-shadow:0 8px 32px rgba(26,31,58,0.16);border:1px solid #E8DDD0;animation:fadeUp 0.18s ease;}
  .ep-title{font-family:'Cormorant Garamond',serif;font-size:1rem;color:#13172E;margin-bottom:0.7rem;}
  .ep-label{font-size:0.57rem;text-transform:uppercase;letter-spacing:0.08em;color:#7A7F99;margin-bottom:0.2rem;display:block;}
  .ep-input{width:100%;padding:0.36rem 0.6rem;border:1px solid #E8DDD0;border-radius:6px;font-family:'DM Sans',sans-serif;font-size:0.78rem;outline:none;margin-bottom:0.6rem;color:#13172E;}
  .ep-counter{display:flex;align-items:center;gap:0.5rem;margin-bottom:0.6rem;}
  .ep-cnt-btn{width:24px;height:24px;border-radius:5px;border:1px solid #E8DDD0;background:none;cursor:pointer;font-size:0.9rem;color:#13172E;}
  .ep-cnt-val{font-family:'Cormorant Garamond',serif;font-size:1.1rem;color:#13172E;min-width:22px;text-align:center;}
  .ep-rot-btn{flex:1;padding:0.3rem;border-radius:6px;border:1px solid #E8DDD0;background:none;font-family:'DM Sans',sans-serif;font-size:0.6rem;cursor:pointer;color:#7A7F99;transition:all 0.2s;}
  .ep-rot-btn:hover{border-color:#C9907A;color:#C9907A;}
  .ep-save{flex:1;padding:0.35rem;border-radius:6px;border:none;background:#C9907A;color:white;font-family:'DM Sans',sans-serif;font-size:0.62rem;text-transform:uppercase;letter-spacing:0.05em;cursor:pointer;}
  .ep-del{padding:0.35rem 0.7rem;border-radius:6px;border:1.5px solid #E53E3E;background:#fff5f5;color:#E53E3E;font-size:0.65rem;font-weight:600;cursor:pointer;transition:all 0.2s;white-space:nowrap;}
  .ep-del:hover{background:#E53E3E;color:white;}
  .sc-overlay{position:fixed;inset:0;background:rgba(19,23,46,0.55);z-index:500;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);}
  .sc-confirm,.sc-modal{background:white;border-radius:16px;padding:1.8rem;width:340px;box-shadow:0 20px 60px rgba(0,0,0,0.2);animation:fadeUp 0.22s ease;}
  .sc-modal{width:370px;}
  .conf-title,.modal-title{font-family:'Cormorant Garamond',serif;font-size:1.3rem;color:#13172E;margin-bottom:0.3rem;}
  .conf-sub{font-size:0.78rem;color:#7A7F99;margin-bottom:1.3rem;line-height:1.5;}
  .modal-type-badge{font-size:0.58rem;text-transform:uppercase;letter-spacing:0.1em;padding:0.12rem 0.5rem;border-radius:20px;background:rgba(201,144,122,0.1);color:#C9907A;display:inline-block;margin-bottom:1rem;}
  .conf-cancel{flex:1;padding:0.45rem;border-radius:8px;border:1px solid #E8DDD0;background:none;font-family:'DM Sans',sans-serif;font-size:0.65rem;text-transform:uppercase;letter-spacing:0.05em;cursor:pointer;color:#7A7F99;}
  .conf-ok{flex:2;padding:0.45rem;border-radius:8px;border:none;background:#C9907A;color:white;font-family:'DM Sans',sans-serif;font-size:0.65rem;text-transform:uppercase;letter-spacing:0.05em;cursor:pointer;}
`;
