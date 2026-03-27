"use client";
import React, { useMemo, useRef } from "react";
import {
  getTableDims,
  getSeatPositions,
  getSeatFillColor,
  getGroupColor,
} from "../utils/geometry.js";

// Galben washed pentru mese noi nemutate
const NEW_TABLE_STROKE = "#ECC94B";
const NEW_TABLE_FILL = "rgba(236,201,75,0.15)";

function TableNodeImpl({
  t,
  assignedGuests,
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
  const d = useMemo(() => getTableDims(t), [t.type, t.seats, t.isRing]);
  const cx = t.x + d.w / 2,
    cy = t.y + d.h / 2;
  const rot = t.type === "rect" || t.type === "prezidiu" || t.type === "bar" ? t.rotation || 0 : 0;
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
  // Border culoare occupancy — doar la zoom 0.2-0.4, doar dacă nu e drag/selected/new
  const occupancyBs = (vzoom >= 0.2 && vzoom < 0.4 && !isDragTarget && !isSelected && !isNew && !isHighlighted && assignedGuests.length > 0)
    ? (assignedGuests.length >= t.seats ? "#E53E3E"
      : assignedGuests.length / t.seats >= 0.8 ? "#ECC94B"
      : "#48BB78")
    : bs;

  const seatPositions = useMemo(() => getSeatPositions(t), [t.type, t.seats, t.isRing]);
  const fillColor = getSeatFillColor(assignedGuests.length, t.seats);
  const occupancyText = assignedGuests.length + "/" + t.seats;
    const shortName = vzoom < 0.5
    ? (t.type === "bar"
      ? t.name.split(" ")[0]
      : t.name.startsWith("Masa ") ? t.name.slice(5) : t.name)
    : t.name;
  const isDraggingThisTable = draggingTableRef?.current?.id === t.id;
  const tooltipTimeoutRef = useRef(null);
  const isDimmed =
    (highlightGuestId != null && !assignedGuests.some((g) => g.id === highlightGuestId)) ||
    (highlightGroupId != null && !assignedGuests.some((g) => g.grup === highlightGroupId));
  const tableOpacity = !isFocused ? 0.5 : isDimmed ? 0.3 : 1;

  const handleMouseDown = (e) => {
    if (lockMode || e.button !== 0) return;
    if (spaceDownRef?.current) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedTableId(t.id);
    const pt = screenToSVG(e.clientX, e.clientY);
    if (!pt) return;
    draggingTableRef.current = { id: t.id, ox: pt.x - t.x, oy: pt.y - t.y, dw: d.w, dh: d.h };
    // Rimoving new highlight la prima mutare
    if (isNew && clearNewTableHighlight) clearNewTableHighlight(t.id);
  };

  return (
    <g
      transform={rot ? `rotate(${rot},${cx},${cy})` : ""}
      style={{ cursor: lockMode ? "default" : "move", opacity: tableOpacity, willChange: "transform" }}
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
        {/* ULTRA-LOW ZOOM — dreptunghi simplu + occupancy */}
        {vzoom < 0.2 && (
          <>
            <rect x={0} y={0} width={d.w} height={d.h} rx="6"
              fill={isNew ? NEW_TABLE_FILL : "rgba(196,168,130,0.15)"}
              stroke={bs} strokeWidth={bw} vectorEffect="non-scaling-stroke"
            />
            {!t.isRing && t.seats > 0 && (
              <text x={d.w / 2} y={d.h / 2 + 5} textAnchor="middle" fill={fillColor}
                fontSize="16" fontFamily="DM Sans,sans-serif" fontWeight="700"
                style={{ pointerEvents: "none" }}>
                {occupancyText}
              </text>
            )}
          </>
        )}
        {/* FULL RENDER — vzoom >= 0.2 */}
        {vzoom >= 0.2 && <>
        {/* RING DANS */}
        {t.isRing && (
          <>
                        <circle
              cx={d.w / 2}
              cy={d.h / 2}
              r={Math.min(d.tw, d.th) / 2}
              fill="rgba(196,168,130,0.04)"
              stroke={isSelected ? "#B794F4" : "rgba(196,168,130,0.35)"}
              strokeWidth={isSelected ? 2 : 1.5}
              strokeDasharray="6,4"
              vectorEffect="non-scaling-stroke"
              style={{ pointerEvents: "none" }}
            />
            <text
              x={d.w / 2}
              y={d.h / 2}
              textAnchor="middle"
              fill="#1E2340"
              fontSize="20"
              fontFamily="Cormorant Garamond,serif"
              fontWeight="400"
              fontStyle="italic"
              style={{ pointerEvents: "none" }}
              opacity="0.9"
            >
              {t.name}
            </text>
                        {/* Hit zone transparent pentru drag/click/doubleclick */}
            <rect x={0} y={0} width={d.w} height={d.h} fill="transparent" stroke="none"
              style={{ pointerEvents: "all", cursor: "move" }} />
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
              filter={isDraggingThisTable || vzoom < 0.3 ? "none" : isSelected ? "url(#glow-sel)" : "url(#shadow-sm)"}
              vectorEffect="non-scaling-stroke"
            />
            {vzoom >= 0.4 && (
              <>
                <text x={d.tw / 2 + 8} y={d.th * 0.62} textAnchor="middle" fill="#276749" fontSize="10"
                  fontFamily="Cormorant Garamond,serif" fontWeight="600" fontStyle="italic"
                  style={{ pointerEvents: "none" }}>
                  {shortName}
                </text>
                <text x={d.tw / 2 + 8} y={d.th * 0.82} textAnchor="middle" fill="#48BB78" fontSize="7.5"
                  fontFamily="DM Sans,sans-serif" style={{ pointerEvents: "none" }}>
                  🍹 decor
                </text>
              </>
            )}
            {vzoom >= 0.2 && vzoom < 0.4 && (
              <text x={d.tw / 2 + 8} y={d.th * 0.7} textAnchor="middle" fill="#276749" fontSize="32"
                fontFamily="Cormorant Garamond,serif" fontWeight="600" fontStyle="italic"
                style={{ pointerEvents: "none" }}>
                {shortName}
              </text>
            )}
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
              stroke={occupancyBs}
              strokeWidth={bw}
              strokeDasharray={bDash}
              filter={isDraggingThisTable || vzoom < 0.3 ? "none" : isSelected ? "url(#glow-sel)" : "url(#shadow-sm)"}
              vectorEffect="non-scaling-stroke"
            />
            {vzoom >= 0.4 && (
              <circle cx={d.cx} cy={d.cy} r={d.r - 10} fill="none"
                stroke="rgba(201,144,122,0.1)" strokeWidth="1"
                style={{ pointerEvents: "none" }} />
            )}
            {t.seats > 0 && assignedGuests.length > 0 && vzoom >= 0.4 && !isDraggingThisTable && (() => {
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
                  strokeWidth="3" opacity={isSelected ? 0.7 : 0.5}
                  style={{ pointerEvents: "none" }} />;
              return <path d={`M ${x1} ${y1} A ${arcR} ${arcR} 0 ${largeArc} 1 ${x2} ${y2}`}
                fill="none" stroke={arcColor} strokeWidth="3" strokeLinecap="round"
                opacity={isSelected ? 0.7 : 0.5}
                style={{ pointerEvents: "none" }} />;
            })()}
            {vzoom >= 0.5 && (
              <>
                <text x={d.cx} y={d.cy - 10} textAnchor="middle" fill="#1E2340" fontSize="15"
                  fontFamily="Cormorant Garamond,serif" fontWeight="700" style={{ pointerEvents: "none" }}>
                  {shortName}
                </text>
                <text x={d.cx} y={d.cy + 8} textAnchor="middle" fill={fillColor} fontSize="12"
                  fontFamily="DM Sans,sans-serif" fontWeight="700"
                  style={{ pointerEvents: "none", fontVariantNumeric: "tabular-nums" }}>
                  {occupancyText}
                </text>
              </>
            )}
            {vzoom >= 0.4 && vzoom < 0.5 && (
              <>
                <text x={d.cx} y={d.cy - 8} textAnchor="middle" fill="#1E2340" fontSize="32"
                  fontFamily="Cormorant Garamond,serif" fontWeight="700"
                  style={{ pointerEvents: "none" }}>
                  {shortName}
                </text>
                <text x={d.cx} y={d.cy + 10} textAnchor="middle" fill={fillColor} fontSize="12"
                  fontFamily="DM Sans,sans-serif" fontWeight="700"
                  style={{ pointerEvents: "none", fontVariantNumeric: "tabular-nums" }}>
                  {occupancyText}
                </text>
              </>
            )}
            {vzoom >= 0.2 && vzoom < 0.4 && (
              <text x={d.cx} y={d.cy + 6} textAnchor="middle" fill="#1E2340" fontSize="32"
                fontFamily="Cormorant Garamond,serif" fontWeight="700"
                style={{ pointerEvents: "none" }}>
                {shortName}
              </text>
            )}
          </>
        )}

        {/* SQUARE */}
        {t.type === "square" && (
          <>
            <rect x={d.pad} y={d.pad} width={d.s} height={d.s} rx="10"
              fill={isNew ? NEW_TABLE_FILL : "white"}
              stroke={occupancyBs} strokeWidth={bw} strokeDasharray={bDash}
              filter={isDraggingThisTable || vzoom < 0.3 ? "none" : isSelected ? "url(#glow-sel)" : "url(#shadow-sm)"}
              vectorEffect="non-scaling-stroke" />
            {t.seats > 0 && assignedGuests.length > 0 && vzoom >= 0.4 && !isDraggingThisTable && (() => {
              const pct = assignedGuests.length / t.seats;
              const arcColor = assignedGuests.length >= t.seats ? "#E53E3E" : "#8BA888";
              const perimeter = (d.s + d.s) * 2;
              const dashLen = pct * perimeter;
              return <rect x={d.pad} y={d.pad} width={d.s} height={d.s} rx="10"
                fill="none" stroke={arcColor} strokeWidth="3"
                strokeDasharray={`${dashLen} ${perimeter}`}
                opacity={isSelected ? 0.7 : 0.5}
                style={{ pointerEvents: "none" }}/>;
            })()}
            {vzoom >= 0.4 && (
              <>
                <text x={d.pad + d.s / 2} y={d.pad + d.s / 2 - 10} textAnchor="middle"
                  fill="#13172E" fontSize="13" fontFamily="Cormorant Garamond,serif" fontWeight="600"
                  style={{ pointerEvents: "none" }}>{shortName}</text>
                <text x={d.pad + d.s / 2} y={d.pad + d.s / 2 + 8} textAnchor="middle"
                  fill={fillColor} fontSize="11" fontFamily="DM Sans,sans-serif" fontWeight="700"
                  style={{ pointerEvents: "none" }}>{occupancyText}</text>
              </>
            )}
            {vzoom >= 0.2 && vzoom < 0.4 && (
              <text x={d.pad + d.s / 2} y={d.pad + d.s / 2 + 10} textAnchor="middle"
                fill="#13172E" fontSize="32" fontFamily="Cormorant Garamond,serif" fontWeight="600"
                style={{ pointerEvents: "none" }}>{shortName}</text>
            )}
          </>
        )}

        {/* PREZIDIU */}
        {t.type === "prezidiu" && (
          <>
            <rect x="25" y="22" width={d.tw} height={d.th} rx="12"
              fill={isNew ? NEW_TABLE_FILL : "rgba(201,144,122,0.07)"}
              stroke={isDragTarget ? "#C9907A" : isSelected ? "#B794F4" : isNew ? NEW_TABLE_STROKE : "rgba(201,144,122,0.4)"}
              strokeWidth={bw} strokeDasharray={bDash}
              filter={isDraggingThisTable || vzoom < 0.3 ? "none" : isSelected ? "url(#glow-sel)" : "url(#shadow-prez)"}
              vectorEffect="non-scaling-stroke" />
            {vzoom >= 0.4 && (
              <>
                <text x={25 + d.tw / 2} y={22 + d.th / 2 - 8} textAnchor="middle"
                  fill="#13172E" fontSize="13" fontFamily="Cormorant Garamond,serif"
                  fontWeight="600" fontStyle="italic" style={{ pointerEvents: "none" }}>{shortName}</text>
                <text x={25 + d.tw / 2} y={22 + d.th / 2 + 10} textAnchor="middle"
                  fill={fillColor} fontSize="11" fontFamily="DM Sans,sans-serif" fontWeight="700"
                  style={{ pointerEvents: "none" }}>{occupancyText}</text>
              </>
            )}
            {vzoom >= 0.2 && vzoom < 0.4 && (
              <text x={25 + d.tw / 2} y={22 + d.th / 2 + 6} textAnchor="middle"
                fill="#13172E" fontSize="32" fontFamily="Cormorant Garamond,serif"
                fontWeight="600" fontStyle="italic" style={{ pointerEvents: "none" }}>{shortName}</text>
            )}
          </>
        )}

        {/* RECT */}
        {t.type === "rect" && (
          <>
            <rect x="25" y="22" width={d.tw} height={d.th} rx="10"
              fill={isNew ? NEW_TABLE_FILL : "white"}
              stroke={occupancyBs} strokeWidth={bw} strokeDasharray={bDash}
              filter={isDraggingThisTable || vzoom < 0.3 ? "none" : isSelected ? "url(#glow-sel)" : "url(#shadow-sm)"}
              vectorEffect="non-scaling-stroke" />
            {t.seats > 0 && assignedGuests.length > 0 && vzoom >= 0.4 && !isDraggingThisTable && (() => {
              const pct = assignedGuests.length / t.seats;
              const arcColor = assignedGuests.length >= t.seats ? "#E53E3E" : "#8BA888";
              const perimeter = (d.tw + d.th) * 2;
              const dashLen = pct * perimeter;
              return <rect x="25" y="22" width={d.tw} height={d.th} rx="10"
                fill="none" stroke={arcColor} strokeWidth="3"
                strokeDasharray={`${dashLen} ${perimeter}`}
                opacity={isSelected ? 0.7 : 0.5}
                style={{ pointerEvents: "none" }}/>;
            })()}
            {vzoom >= 0.4 && (
              <>
                <text x={25 + d.tw / 2} y={22 + d.th / 2 - 8} textAnchor="middle"
                  fill="#13172E" fontSize="13" fontFamily="Cormorant Garamond,serif" fontWeight="600"
                  style={{ pointerEvents: "none" }}>{shortName}</text>
                <text x={25 + d.tw / 2} y={22 + d.th / 2 + 10} textAnchor="middle"
                  fill={fillColor} fontSize="11" fontFamily="DM Sans,sans-serif" fontWeight="700"
                  style={{ pointerEvents: "none" }}>{occupancyText}</text>
              </>
            )}
            {vzoom >= 0.2 && vzoom < 0.4 && (
              <text x={25 + d.tw / 2} y={22 + d.th / 2 + 6} textAnchor="middle"
                fill="#13172E" fontSize="32" fontFamily="Cormorant Garamond,serif" fontWeight="600"
                style={{ pointerEvents: "none" }}>{shortName}</text>
            )}
          </>
        )}

        {/* SEATS */}
        {vzoom >= 0.4 && seatPositions.map((pos, idx) => {
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
                onMouseDown={(e) => { e.stopPropagation(); }}
                onDragStart={(e) => {
                  e.stopPropagation();
                  setIsDraggingGuest(true);
                  setHoveredGuest(null);
                  e.dataTransfer.setData("guestId", String(guest.id));
                  e.dataTransfer.setData("fromTableId", String(t.id));
                }}
                onDragEnd={() => setIsDraggingGuest(false)}
                onMouseEnter={(e) => { e.stopPropagation(); clearTimeout(tooltipTimeoutRef.current); setHoveredGuest({ guest, x: e.clientX, y: e.clientY }); }}
                onMouseLeave={(e) => { e.stopPropagation(); tooltipTimeoutRef.current = setTimeout(() => setHoveredGuest(null), 250); }}
                >
                  <circle cx={pos.x} cy={pos.y} r="18" fill={gc} stroke="white" strokeWidth="2"
                    style={{ pointerEvents: "none", cursor: "pointer" }}
                  />
                {!isDraggingThisTable && (
                  <text x={pos.x} y={pos.y + 4} textAnchor="middle" fill="white" fontSize="10"
                    fontFamily="DM Sans,sans-serif" fontWeight="700"
                    style={{ pointerEvents: "none", userSelect: "none" }}>
                    {(guest.prenume?.[0] ?? '') + (guest.nume?.[0] ?? '')}
                  </text>
                )}
                {vzoom >= 0.5 && !isDraggingThisTable && (
                  <circle cx={pos.x + 10} cy={pos.y - 10} r="4"
                    fill={guest.status === "confirmat" ? "#48BB78" : "#ECC94B"}
                    stroke="white" strokeWidth="1.2" style={{ pointerEvents: "none" }} />
                )}
                {highlightGuestId === guest.id && (
                  <circle cx={pos.x} cy={pos.y} r="19" fill="none" stroke="#C9907A"
                    strokeWidth="2" opacity="0.8"
                    style={{ pointerEvents: "none" }} />
                )}
                {vzoom >= 0.4 && !isDraggingThisTable && (
                  <text x={pos.x} y={(t.type === "rect" || t.type === "prezidiu") ? (pos.y < cy - t.y ? pos.y - 20 : pos.y + 28) : pos.y + 28} textAnchor="middle" fill="#1E2340" fontSize="9"
                    fontFamily="DM Sans,sans-serif" fontWeight="500"
                    style={{ pointerEvents: "none", userSelect: "none" }} opacity="0.9">
                    {guest.prenume} {guest.nume?.[0] ?? ''}.
                  </text>
                )}
                <circle cx={pos.x} cy={pos.y} r="24" fill="transparent" stroke="none"
                  style={{ pointerEvents: "all", cursor: "pointer" }} />
              </g>
            );
          if (assignedGuests.length === 0 && vzoom < 0.5) return null;
          return (
            <g key={`empty-${idx}`}>
              <circle cx={pos.x} cy={pos.y} r="16" fill="white" stroke="#C4A882"
                strokeWidth="1.2" opacity="0.9"
                style={{ pointerEvents: "none" }} />
              <circle cx={pos.x} cy={pos.y} r="28" fill="transparent" stroke="none"
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
        </>}
      </g>
    </g>
  );
}

function tableNodeComparator(prev, next) {
  if (prev.t !== next.t) return false;
  if (prev.assignedGuests !== next.assignedGuests) return false;
  if (prev.lockMode !== next.lockMode) return false;
  if (prev.vzoom !== next.vzoom) return false;
  if (prev.isHighlighted !== next.isHighlighted) return false;
  if (prev.isFocused !== next.isFocused) return false;

  // selectedTableId: re-render doar dacă implică această masă
  if (prev.selectedTableId !== next.selectedTableId) {
    if (prev.selectedTableId === prev.t.id || next.selectedTableId === next.t.id) return false;
  }

  // dragOver: re-render doar dacă afectează această masă
  if (prev.dragOver !== next.dragOver) {
    const prevAffects = prev.dragOver?.id === prev.t.id || prev.dragOver === prev.t.id;
    const nextAffects = next.dragOver?.id === next.t.id || next.dragOver === next.t.id;
    if (prevAffects || nextAffects) return false;
  }

  // highlightGuestId: re-render doar dacă guest-ul e în assignedGuests
  if (prev.highlightGuestId !== next.highlightGuestId) {
    const guests = next.assignedGuests;
    const prevIn = guests.some((g) => g.id === prev.highlightGuestId);
    const nextIn = guests.some((g) => g.id === next.highlightGuestId);
    if (prevIn || nextIn) return false;
  }

  // highlightGroupId: re-render toate mesele când grupul se schimbă
  if (prev.highlightGroupId !== next.highlightGroupId) return false;

  // newTableIds: re-render doar dacă schimbarea afectează această masă
  if (prev.newTableIds !== next.newTableIds) {
    const prevHas = prev.newTableIds?.has(prev.t.id) ?? false;
    const nextHas = next.newTableIds?.has(next.t.id) ?? false;
    if (prevHas !== nextHas) return false;
  }

  return true;
}

export const TableNode = React.memo(TableNodeImpl, tableNodeComparator);
