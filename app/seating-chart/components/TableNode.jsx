"use client";
import React from "react";
import {
  getTableDims,
  getSeatPositions,
  getSeatFillColor,
  getGroupColor,
} from "../utils/geometry.js";

// Galben washed pentru mese noi nemutate
const NEW_TABLE_STROKE = "#ECC94B";
const NEW_TABLE_FILL = "rgba(236,201,75,0.15)";

export const TableNode = React.memo(function TableNode({
  t,
  guestsByTable,
  dragOver,
  selectedTableId,
  lockMode,
  screenToSVG,
  assignGuest,
  setSelectedTableId,
  setEditName,
  setEditSeats,
  setEditPanel,
  setHoveredGuest,
  setClickedSeat,
  setIsDraggingGuest,
  setDragOver,
  draggingTableRef,
  wasMovedRef,
  isHighlighted,
  highlightGuestId,
  highlightGroupId,
  isFocused,
  vzoom,
  newTableIds,
  clearNewTableHighlight,
  spaceDownRef,
}) {
  const d = getTableDims(t);
  const cx = t.x + d.w / 2,
    cy = t.y + d.h / 2;
  const rot = t.type === "rect" || t.type === "prezidiu" || t.type === "bar" ? t.rotation || 0 : 0;
  const assignedGuests = guestsByTable[t.id] || [];
  const isDragTarget = dragOver?.id === t.id || dragOver === t.id;
  const isDragFull = dragOver?.id === t.id && dragOver?.full;
  const isSelected = selectedTableId === t.id;
  const isNew = newTableIds?.has(t.id);

  // Border color: new (galben) > drag > selected > highlighted > default
  const bs = isDragFull
    ? "#E53E3E"
    : isDragTarget
      ? "#48BB78"
      : isSelected
        ? "#B794F4"
        : isNew
          ? NEW_TABLE_STROKE
          : isHighlighted
            ? "#C9907A"
            : "#C4A882";
  const bw = isDragTarget || isSelected ? 2.5 : isNew ? 2 : 1.5;
  const bDash = isNew ? "6,3" : "none";

  const seatPositions = getSeatPositions(t);
  const fillColor = getSeatFillColor(assignedGuests.length, t.seats);

  const handleMouseDown = (e) => {
    if (lockMode || e.button !== 0) return;
    if (spaceDownRef?.current) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedTableId(t.id);
    const pt = screenToSVG(e.clientX, e.clientY);
    if (!pt) return;
    draggingTableRef.current = { id: t.id, ox: pt.x - t.x, oy: pt.y - t.y };
    // Rimoving new highlight la prima mutare
    if (isNew && clearNewTableHighlight) clearNewTableHighlight(t.id);
  };

  return (
    <g
      transform={rot ? `rotate(${rot},${cx},${cy})` : ""}
      style={{ cursor: lockMode ? "default" : "move", opacity: isFocused ? 1 : 0.5 }}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedTableId(t.id);
        setClickedSeat(null);
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (wasMovedRef?.current) return;
        setEditName(t.name);
        setEditSeats(t.seats);
        setEditPanel({ tableId: t.id, x: e.clientX, y: e.clientY });
      }}
      onDragOver={(e) => {
        if (t.type !== "bar" && !t.isRing) {
          e.preventDefault();
          e.stopPropagation();
          setDragOver({ id: t.id, full: assignedGuests.length >= t.seats });
        }
      }}
      onDragLeave={(e) => {
        e.stopPropagation();
        setDragOver(null);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(null);
        const gId = e.dataTransfer.getData("guestId");
        if (gId && t.type !== "bar" && !t.isRing) assignGuest(gId, t.id);
      }}
    >
      <g transform={`translate(${t.x},${t.y})`}>
        {/* RING DANS */}
        {t.isRing && (
          <>
            <ellipse
              cx={d.w / 2}
              cy={d.h / 2}
              rx={d.tw / 2}
              ry={d.th / 2}
              fill="rgba(196,168,130,0.04)"
              stroke={isSelected ? "#B794F4" : "rgba(196,168,130,0.3)"}
              strokeWidth={isSelected ? 2 : 1}
              strokeDasharray="6,4"
              filter={isSelected ? "url(#glow-sel)" : "none"}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={d.w / 2}
              y={d.h / 2}
              textAnchor="middle"
              fill="#1E2340"
              fontSize="12"
              fontFamily="Cormorant Garamond,serif"
              fontWeight="400"
              fontStyle="italic"
              style={{ pointerEvents: "none" }}
              opacity="0.9"
            >
              Ring Dans
            </text>
          </>
        )}

        {/* BAR */}
        {!t.isRing && t.type === "bar" && (
          <>
            <path
              d={`M 8,${d.th} A ${d.tw / 2},${d.th} 0 0,1 ${d.tw + 8},${d.th} Z`}
              fill={isNew ? NEW_TABLE_FILL : "rgba(72,187,120,0.08)"}
              stroke={isSelected ? "#B794F4" : isNew ? NEW_TABLE_STROKE : "rgba(72,187,120,0.45)"}
              strokeWidth={bw}
              strokeDasharray={bDash}
              filter={isSelected ? "url(#glow-sel)" : "url(#shadow-sm)"}
              vectorEffect="non-scaling-stroke"
            />
            <text x={d.tw / 2 + 8} y={d.th * 0.62} textAnchor="middle" fill="#276749" fontSize="10"
              fontFamily="Cormorant Garamond,serif" fontWeight="600" fontStyle="italic"
              style={{ pointerEvents: "none" }}>
              {t.name}
            </text>
            <text x={d.tw / 2 + 8} y={d.th * 0.82} textAnchor="middle" fill="#48BB78" fontSize="7.5"
              fontFamily="DM Sans,sans-serif" style={{ pointerEvents: "none" }}>
              🍹 decor
            </text>
          </>
        )}

        {/* ROUND */}
        {t.type === "round" && (
          <>
            <circle
              cx={d.cx}
              cy={d.cy}
              r={d.r}
              fill={isNew ? NEW_TABLE_FILL : "#FAF7F2"}
              stroke={bs}
              strokeWidth={bw}
              strokeDasharray={bDash}
              filter={isSelected ? "url(#glow-sel)" : "url(#shadow-sm)"}
              vectorEffect="non-scaling-stroke"
              style={{ transition: "stroke 0.15s ease, stroke-width 0.15s ease" }}
            />
            <circle cx={d.cx} cy={d.cy} r={d.r - 10} fill="none"
              stroke="rgba(201,144,122,0.1)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            {t.seats > 0 && assignedGuests.length > 0 && (() => {
              const arcR = d.r - 28;
              const pct = assignedGuests.length / t.seats;
              const arcColor = assignedGuests.length >= t.seats ? "#E53E3E" : "#8BA888";
              const startAngle = -Math.PI / 2;
              const endAngle = startAngle + pct * 2 * Math.PI;
              const x1 = d.cx + arcR * Math.cos(startAngle);
              const y1 = d.cy + arcR * Math.sin(startAngle);
              const x2 = d.cx + arcR * Math.cos(endAngle);
              const y2 = d.cy + arcR * Math.sin(endAngle);
              const largeArc = pct > 0.5 ? 1 : 0;
              if (assignedGuests.length >= t.seats)
                return <circle cx={d.cx} cy={d.cy} r={arcR} fill="none" stroke={arcColor}
                  strokeWidth="3" opacity={isSelected ? 0.7 : 0.5} vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: "none" }} />;
              return <path d={`M ${x1} ${y1} A ${arcR} ${arcR} 0 ${largeArc} 1 ${x2} ${y2}`}
                fill="none" stroke={arcColor} strokeWidth="3" strokeLinecap="round"
                opacity={isSelected ? 0.7 : 0.5} vectorEffect="non-scaling-stroke"
                style={{ pointerEvents: "none" }} />;
            })()}
            {vzoom >= 0.5 && (
              <text x={d.cx} y={d.cy - 10} textAnchor="middle" fill="#1E2340" fontSize="15"
                fontFamily="Cormorant Garamond,serif" fontWeight="700" style={{ pointerEvents: "none" }}>
                {t.name}
              </text>
            )}
            {vzoom >= 0.5 && (
              <text x={d.cx} y={d.cy + 8} textAnchor="middle" fill={fillColor} fontSize="12"
                fontFamily="DM Sans,sans-serif" fontWeight="700"
                style={{ pointerEvents: "none", fontVariantNumeric: "tabular-nums" }}>
                {assignedGuests.length}/{t.seats}
              </text>
            )}
            {vzoom < 0.5 && (
              <text x={d.cx} y={d.cy + 4} textAnchor="middle" fill={fillColor} fontSize="13"
                fontFamily="DM Sans,sans-serif" fontWeight="700"
                style={{ pointerEvents: "none", fontVariantNumeric: "tabular-nums" }}>
                {assignedGuests.length}/{t.seats}
              </text>
            )}
          </>
        )}

        {/* SQUARE */}
        {t.type === "square" && (
          <>
            <rect x={d.pad} y={d.pad} width={d.s} height={d.s} rx="10"
              fill={isNew ? NEW_TABLE_FILL : "white"}
              stroke={bs} strokeWidth={bw} strokeDasharray={bDash}
              filter={isSelected ? "url(#glow-sel)" : "url(#shadow-sm)"}
              vectorEffect="non-scaling-stroke" />
            <text x={d.pad + d.s / 2} y={d.pad + d.s / 2 - 10} textAnchor="middle"
              fill="#13172E" fontSize="13" fontFamily="Cormorant Garamond,serif" fontWeight="600"
              style={{ pointerEvents: "none" }}>{t.name}</text>
            <text x={d.pad + d.s / 2} y={d.pad + d.s / 2 + 8} textAnchor="middle"
              fill={fillColor} fontSize="11" fontFamily="DM Sans,sans-serif" fontWeight="700"
              style={{ pointerEvents: "none" }}>{assignedGuests.length}/{t.seats}</text>
          </>
        )}

        {/* PREZIDIU */}
        {t.type === "prezidiu" && (
          <>
            <rect x="25" y="22" width={d.tw} height={d.th} rx="12"
              fill={isNew ? NEW_TABLE_FILL : "rgba(201,144,122,0.07)"}
              stroke={isDragTarget ? "#C9907A" : isSelected ? "#B794F4" : isNew ? NEW_TABLE_STROKE : "rgba(201,144,122,0.4)"}
              strokeWidth={bw} strokeDasharray={bDash}
              filter={isSelected ? "url(#glow-sel)" : "url(#shadow-prez)"}
              vectorEffect="non-scaling-stroke" />
            <text x={25 + d.tw / 2} y={22 + d.th / 2 - 8} textAnchor="middle"
              fill="#13172E" fontSize="13" fontFamily="Cormorant Garamond,serif"
              fontWeight="600" fontStyle="italic" style={{ pointerEvents: "none" }}>{t.name}</text>
            <text x={25 + d.tw / 2} y={22 + d.th / 2 + 10} textAnchor="middle"
              fill={fillColor} fontSize="11" fontFamily="DM Sans,sans-serif" fontWeight="700"
              style={{ pointerEvents: "none" }}>{assignedGuests.length}/{t.seats}</text>
          </>
        )}

        {/* RECT */}
        {t.type === "rect" && (
          <>
            <rect x="25" y="22" width={d.tw} height={d.th} rx="10"
              fill={isNew ? NEW_TABLE_FILL : "white"}
              stroke={bs} strokeWidth={bw} strokeDasharray={bDash}
              filter={isSelected ? "url(#glow-sel)" : "url(#shadow-sm)"}
              vectorEffect="non-scaling-stroke" />
            <text x={25 + d.tw / 2} y={22 + d.th / 2 - 8} textAnchor="middle"
              fill="#13172E" fontSize="13" fontFamily="Cormorant Garamond,serif" fontWeight="600"
              style={{ pointerEvents: "none" }}>{t.name}</text>
            <text x={25 + d.tw / 2} y={22 + d.th / 2 + 10} textAnchor="middle"
              fill={fillColor} fontSize="11" fontFamily="DM Sans,sans-serif" fontWeight="700"
              style={{ pointerEvents: "none" }}>{assignedGuests.length}/{t.seats}</text>
          </>
        )}

        {/* SEATS */}
        {seatPositions.map((pos, idx) => {
          const guest = assignedGuests[idx];
          const gc = guest ? getGroupColor(guest.grup) : "#48BB78";
          if (guest)
            return (
              <g key={idx} style={{ cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setHoveredGuest(null);
                  setClickedSeat({ guest, tableId: t.id, x: e.clientX + 14, y: e.clientY - 14 });
                }}
                draggable="true"
                onDragStart={(e) => {
                  e.stopPropagation();
                  setIsDraggingGuest(true);
                  setHoveredGuest(null);
                  e.dataTransfer.setData("guestId", String(guest.id));
                  e.dataTransfer.setData("fromTableId", String(t.id));
                }}
                onDragEnd={() => setIsDraggingGuest(false)}
              >
                <circle cx={pos.x} cy={pos.y} r="18" fill={gc} stroke="white" strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  opacity={
                    highlightGuestId && guest.id !== highlightGuestId ? 0.3
                    : highlightGroupId && guest.grup !== highlightGroupId ? 0.3 : 1
                  }
                  style={{ pointerEvents: "all", cursor: "pointer", transition: "opacity 0.15s ease" }}
                  onMouseEnter={(e) => { e.stopPropagation(); setHoveredGuest({ guest, x: e.clientX, y: e.clientY }); }}
                  onMouseLeave={(e) => { e.stopPropagation(); setHoveredGuest(null); }}
                />
                <text x={pos.x} y={pos.y + 4} textAnchor="middle" fill="white" fontSize="10"
                  fontFamily="DM Sans,sans-serif" fontWeight="700"
                  style={{ pointerEvents: "none", userSelect: "none" }}>
                  {(guest.prenume?.[0] ?? '') + (guest.nume?.[0] ?? '')}
                </text>
                <circle cx={pos.x + 10} cy={pos.y - 10} r="4"
                  fill={guest.status === "confirmat" ? "#48BB78" : "#ECC94B"}
                  stroke="white" strokeWidth="1.2" style={{ pointerEvents: "none" }}
                  vectorEffect="non-scaling-stroke" />
                {highlightGuestId === guest.id && (
                  <circle cx={pos.x} cy={pos.y} r="19" fill="none" stroke="#C9907A"
                    strokeWidth="2" vectorEffect="non-scaling-stroke" opacity="0.8"
                    style={{ pointerEvents: "none" }} />
                )}
                {vzoom >= 0.4 && (
                  <text x={pos.x} y={pos.y + 28} textAnchor="middle" fill="#1E2340" fontSize="9"
                    fontFamily="DM Sans,sans-serif" fontWeight="500"
                    style={{ pointerEvents: "none", userSelect: "none" }} opacity="0.9">
                    {guest.prenume} {guest.nume?.[0] ?? ''}.
                  </text>
                )}
              </g>
            );
          return (
            <g key={`empty-${idx}`}>
              <circle cx={pos.x} cy={pos.y} r="16" fill="white" stroke="#C4A882"
                strokeWidth="1.2" vectorEffect="non-scaling-stroke" opacity="0.9"
                style={{ pointerEvents: "none" }} />
              <circle cx={pos.x} cy={pos.y} r="22" fill="transparent" stroke="none"
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const gId = e.dataTransfer.getData("guestId");
                  if (gId) assignGuest(gId, t.id);
                }}
              />
            </g>
          );
        })}
      </g>
    </g>
  );
});
