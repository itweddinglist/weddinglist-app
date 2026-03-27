"use client";
import {
  Circle,
  Square,
  Minus,
  RectangleHorizontal,
  Wine,
  Plus,
  Minus as MinusZoom,
  Maximize2,
  Lock,
  Unlock,
  Wand2,
  Undo2,
  UtensilsCrossed,
  RotateCcw,
  Download,
  SquircleDashed,
  GalleryThumbnails,
} from "lucide-react";

export default function CanvasToolbar({
  vzoom,
  zoomBy,
  fitToScreen,
  tables,
  lockMode,
  setLockMode,
  showToast,
  magicFill,
  undo,
  setShowCatering,
  setConfirmDialog,
  resetPlan,
  setModal,
  getNextTableName,
  onExport,
}) {
  const btn = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    height: "32px",
    padding: "0 10px",
    borderRadius: "8px",
    border: "1px solid #E8DDD0",
    background: "#FFFDFC",
    color: "#4A4256",
    fontSize: "12px",
    fontWeight: "400",
    letterSpacing: "0.01em",
    cursor: "pointer",
    transition: "all 120ms ease",
    fontFamily: "'DM Sans',sans-serif",
  };

  const btnAccent = {
    ...btn,
    border: "1px solid rgba(201,144,122,0.35)",
    background: "rgba(201,144,122,0.08)",
    color: "#7A4E40",
    fontWeight: "500",
  };

  const btnDanger = {
    ...btn,
    border: "1px solid rgba(229,62,62,0.25)",
    color: "#9B3B3B",
  };

  const iconBtn = {
    ...btn,
    padding: "0",
    width: "32px",
    justifyContent: "center",
  };

  const label = {
    fontSize: "9px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#9B95A3",
    fontWeight: "500",
    fontFamily: "'DM Sans',sans-serif",
    marginBottom: "4px",
  };

  const divider = {
    width: "1px",
    alignSelf: "stretch",
    background: "#E8DDD0",
    margin: "0 4px",
  };

  const group = {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  };

  const row = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: "12px",
        padding: "8px 14px",
        background: "#FBF7F2",
        borderBottom: "1px solid #E8DDD0",
        flexShrink: 0,
        flexWrap: "wrap",
      }}
    >
      {/* MESE */}
      <div style={group}>
        <div style={label}>Mese</div>
        <div style={row}>
          <button
            style={btn}
            onClick={() => setModal({ type: "round", seats: 8, name: getNextTableName() })}
          >
            <Circle size={13} strokeWidth={1.6} /> Rotundă
          </button>
          <button
            style={btn}
            onClick={() => setModal({ type: "square", seats: 4, name: getNextTableName() })}
          >
            <Square size={13} strokeWidth={1.6} /> Pătrată
          </button>
          <button
            style={btn}
            onClick={() => setModal({ type: "rect", seats: 10, name: getNextTableName() })}
          >
            <RectangleHorizontal size={13} strokeWidth={1.6} /> Drept.
          </button>
          <button
            style={{ ...btn, color: "#C9907A", borderColor: "rgba(201,144,122,0.35)" }}
            onClick={() => setModal({ type: "prezidiu", seats: 8, name: "Prezidiu" })}
          >
            <GalleryThumbnails size={13} strokeWidth={1.6} style={{ transform: "rotate(180deg)" }} /> Prezidiu
          </button>
          <button
            style={{ ...btn, color: "#48BB78", borderColor: "rgba(72,187,120,0.35)" }}
            onClick={() => setModal({ type: "bar", seats: 0, name: "Candy Bar" })}
          >
            <Wine size={13} strokeWidth={1.6} /> Bar
          </button>
          <button
            style={{ ...btn, color: "#9DA3BC", borderColor: "rgba(157,163,188,0.35)" }}
            onClick={() => setModal({ type: "bar", seats: 0, name: "Ring Dans", isRing: true })}
          >
            <SquircleDashed size={13} strokeWidth={1.6} /> Ring
          </button>
        </div>
      </div>

      <div style={divider} />

      {/* VIEW */}
      <div style={group}>
        <div style={label}>View</div>
        <div style={row}>
          <button style={iconBtn} aria-label="zoom-out" onClick={() => zoomBy(-0.1)}>
            <MinusZoom size={13} strokeWidth={1.8} />
          </button>
          <div
            style={{
              ...iconBtn,
              cursor: "default",
              minWidth: "44px",
              fontSize: "12px",
              color: "#6C6477",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {Math.round(vzoom * 100)}%
          </div>
          <button style={iconBtn} onClick={() => zoomBy(0.1)}>
            <Plus size={13} strokeWidth={1.8} />
          </button>
          <button style={iconBtn} title="Fit toate mesele" onClick={() => fitToScreen(tables)}>
            <Maximize2 size={13} strokeWidth={1.8} />
          </button>
          <button
            style={{
              ...iconBtn,
              ...(lockMode
                ? { background: "#1E2340", color: "white", border: "1px solid #1E2340" }
                : {}),
            }}
            onClick={() => {
              setLockMode((prev) => {
                const next = !prev;
                showToast(next ? "Canvas blocat 🔒" : "Canvas deblocat 🔓", "rose");
                return next;
              });
            }}
          >
            {lockMode ? (
              <Lock size={13} strokeWidth={1.8} />
            ) : (
              <Unlock size={13} strokeWidth={1.8} />
            )}
          </button>
        </div>
      </div>

      <div style={divider} />

      {/* ACTIUNI */}
      <div style={group}>
        <div style={label}>Acțiuni</div>
        <div style={row}>
          <button style={btnAccent} onClick={magicFill}>
            <Wand2 size={13} strokeWidth={1.7} /> Magic Fill
          </button>
          <button style={btn} onClick={undo}>
            <Undo2 size={13} strokeWidth={1.7} /> Undo
          </button>
          <button
            style={{ ...btn, color: "#4299E1", borderColor: "rgba(66,153,225,0.35)" }}
            onClick={() => setShowCatering(true)}
          >
            <UtensilsCrossed size={13} strokeWidth={1.7} /> Catering
          </button>
          <button
            style={{ ...btn, color: "#9F7AEA", borderColor: "rgba(159,122,234,0.35)" }}
            onClick={onExport}
          >
            <Download size={13} strokeWidth={1.7} /> Export
          </button>
          <button
            style={btnDanger}
            onClick={() =>
              setConfirmDialog({
                title: "Ștergi toate mesele?",
                sub: "Toți invitații vor reveni în neatribuiți. Template-ul va fi restaurat.",
                onOk: resetPlan,
              })
            }
          >
            <RotateCcw size={13} strokeWidth={1.7} /> Reset
          </button>
        </div>
      </div>
    </div>
  );
}
