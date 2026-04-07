"use client";
import React, { useRef, useState, useCallback, useEffect } from "react";
import { getGroupColor } from "../utils/geometry.ts";
import type { SeatingGuest, SeatingTable } from "@/types/seating";

const GUEST_ROW_HEIGHT = 38; // px per rând — fix, consistent cu CSS
const OVERSCAN = 5; // rânduri extra deasupra/dedesubt pentru scroll smooth

// ── LOCAL TYPES ───────────────────────────────────────────────────────────────

interface GuestGroup {
  name: string
  count: number
}

interface GuestMetaSummary {
  groups: GuestGroup[]
}

interface HoveredGuestTooltip {
  guest: SeatingGuest
  x: number
  y: number
}

interface VirtualListProps {
  items: SeatingGuest[]
  height: number
  renderItem: (item: SeatingGuest, index: number) => React.ReactNode
}

interface GuestSidebarProps {
  guests: SeatingGuest[]
  filteredUnassigned: SeatingGuest[]
  searchQuery: string
  setSearchQuery: (value: string) => void
  guestMeta: GuestMetaSummary
  groupColorMap: Record<string, string>
  locateGuest: (id: number) => void
  isDraggingGuest: boolean
  setHoveredGuest: (value: HoveredGuestTooltip | null) => void
  setIsDraggingGuest: (value: boolean) => void
  tables: SeatingTable[]
  highlightGroupId: string | null
  setHighlightGroupId: (id: string | null) => void
  activeGroupId?: string | null
  setActiveGroupId?: (id: string | null) => void
  onExport?: () => void
}

/**
 * VirtualList — virtualizare nativă fără dependențe externe.
 * Randează doar rândurile vizibile + OVERSCAN buffer.
 * Compatibil 100% cu Next.js 16 + Turbopack.
 */
function VirtualList({ items, height, renderItem }: VirtualListProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const totalHeight = items.length * GUEST_ROW_HEIGHT;
  const visibleCount = Math.ceil(height / GUEST_ROW_HEIGHT);

  const startIndex = Math.max(0, Math.floor(scrollTop / GUEST_ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(items.length - 1, startIndex + visibleCount + OVERSCAN * 2);

  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    visibleItems.push(
      <div
        key={items[i].id}
        style={{
          position: "absolute",
          top: i * GUEST_ROW_HEIGHT,
          left: 0,
          right: 0,
          height: GUEST_ROW_HEIGHT,
        }}
      >
        {renderItem(items[i], i)}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height,
        overflowY: "auto",
        position: "relative",
      }}
      className="sb-virtual-scroll"
    >
      {/* Spacer care dă înălțimea totală listei */}
      <div style={{ height: totalHeight, position: "relative" }}>
        {visibleItems}
      </div>
    </div>
  );
}

function GuestSidebar({
  guests, filteredUnassigned, searchQuery, setSearchQuery,
  guestMeta, groupColorMap, locateGuest, isDraggingGuest,
  setHoveredGuest, setIsDraggingGuest, tables, highlightGroupId,
  setHighlightGroupId, activeGroupId, setActiveGroupId, onExport,
}: GuestSidebarProps) {
  const allSeated = guests.length > 0 && filteredUnassigned.length === 0 && !searchQuery && !activeGroupId;
  const noGuests = guests.length === 0;
  const noResults = searchQuery && filteredUnassigned.length === 0;

  // Înălțimea listei virtualizate — măsurată din containerul real via ResizeObserver
  const [containerHeight, setContainerHeight] = useState(400);
  const unassignedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = unassignedRef.current;
    if (!el) return;
    // Guard pentru jsdom (teste) care nu are ResizeObserver
    if (typeof ResizeObserver === "undefined") return;

    const updateHeight = () => {
      const listEl = el.querySelector('.sb-unassigned-list');
      if (!listEl) return;
      const available = listEl.getBoundingClientRect().height;
      const listH = filteredUnassigned.length * GUEST_ROW_HEIGHT;
      setContainerHeight(Math.max(60, Math.min(listH, available)));
    };

    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    const raf = requestAnimationFrame(updateHeight);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, [filteredUnassigned.length, searchQuery]);

  const renderUnassignedRow = useCallback((g: SeatingGuest) => {
    const gc = getGroupColor(g.grup);
    return (
      <div
        className="sb-guest-row"
        draggable="true"
        onDragStart={(e) => {
          setIsDraggingGuest(true);
          setHoveredGuest(null);
          e.dataTransfer.setData("guestId", String(g.id));
        }}
        onDragEnd={() => setIsDraggingGuest(false)}
        onClick={() => locateGuest(g.id)}
        style={{ height: GUEST_ROW_HEIGHT, boxSizing: "border-box" }}
      >
        <div
          className="sb-avatar"
          style={{ background: `${gc}22`, border: `1.5px solid ${gc}`, color: gc }}
          onMouseEnter={(e) => {
            if (!isDraggingGuest) {
              const r = e.currentTarget.getBoundingClientRect();
              setHoveredGuest({ guest: g, x: r.right + 8, y: r.top - 4 });
            }
          }}
          onMouseLeave={() => setHoveredGuest(null)}
        >
          {g.prenume[0] + g.nume[0]}
        </div>
        <span className="sb-guest-name">{g.prenume} {g.nume}</span>
        <span className="sb-status-dot" style={{ background: g.status === "confirmat" ? "#48BB78" : "#ECC94B" }} />
      </div>
    );
  }, [isDraggingGuest, setHoveredGuest, setIsDraggingGuest, locateGuest]);

  const seatedSearchResults = searchQuery
    ? guests.filter((g) =>
        g.tableId &&
        `${g.prenume} ${g.nume} ${g.grup}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .includes(searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
      )
    : [];

  return (
    <aside className="sc-sidebar">
      {/* Search */}
      <div className="sb-search-wrap">
        <input
          className="sb-search"
          placeholder="Caută un invitat..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {(searchQuery || activeGroupId) && (
          <button className="sb-search-clear" onClick={() => { setSearchQuery(""); setActiveGroupId?.(null); }}>×</button>
        )}
      </div>

      <div className="sb-divider" />

      {/* GRUPURI */}
      {guestMeta.groups.length > 0 && (
        <div className="sb-section-groups">
          <div className="sb-section-label" style={{ marginBottom: "0.4rem" }}>Grupuri</div>
          <div className="sb-groups-scroll">
            {guestMeta.groups.map((g) => (
              <div
                key={g.name}
                style={{
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  padding: "0.2rem 0.4rem", cursor: "pointer", borderRadius: "5px",
                  background: activeGroupId === g.name ? "rgba(201,144,122,0.12)" : "transparent",
                }}
                onClick={() => setActiveGroupId?.(activeGroupId === g.name ? null : g.name)}
                onMouseEnter={() => setHighlightGroupId(g.name)}
                onMouseLeave={() => setHighlightGroupId(null)}
              >
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: groupColorMap[g.name], flexShrink: 0 }} />
                <span style={{ fontSize: "0.68rem", color: "#9DA3BC", flex: 1 }}>{g.name}</span>
                <span style={{ fontSize: "0.6rem", color: "#6E7490" }}>{g.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="sb-divider" />

      {/* NEATRIBUIȚI */}
      <div className={`sb-section-unassigned${searchQuery ? " has-search" : ""}`} ref={unassignedRef}>
        <div className="sb-section-label sb-label-pad">
          Neatribuiți <span className="sb-badge">{filteredUnassigned.length}</span>
        </div>

        <div className="sb-unassigned-list">
          {noGuests && (
            <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>👥</div>
              <div style={{ fontSize: "0.72rem", color: "#FAF7F2", fontWeight: 500, marginBottom: "0.3rem" }}>Niciun invitat încă</div>
              <div style={{ fontSize: "0.62rem", color: "#6E7490", lineHeight: 1.5 }}>Adaugă invitați din pagina de gestionare pentru a începe planul de mese.</div>
            </div>
          )}
          {allSeated && (
            <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.6rem" }}>✨</div>
              <div style={{ fontSize: "0.78rem", color: "#48BB78", fontWeight: 600, marginBottom: "0.3rem" }}>Toți invitații au un loc!</div>
              <div style={{ fontSize: "0.62rem", color: "#6E7490", lineHeight: 1.5, marginBottom: "1rem" }}>Planul de mese este complet. Exportă-l pentru restaurant.</div>
              <button
                onClick={() => onExport && onExport()}
                style={{ background: "rgba(72,187,120,0.12)", border: "1px solid rgba(72,187,120,0.3)", borderRadius: "999px", color: "#48BB78", fontSize: "0.62rem", fontWeight: 600, padding: "0.35rem 0.9rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.04em" }}
              >
                Exportă PNG →
              </button>
            </div>
          )}
          {noResults && (
            <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🔍</div>
              <div style={{ fontSize: "0.72rem", color: "#FAF7F2", fontWeight: 500, marginBottom: "0.3rem" }}>Niciun rezultat</div>
              <div style={{ fontSize: "0.62rem", color: "#6E7490", lineHeight: 1.5 }}>Nu am găsit invitați neatribuiți pentru <em>„{searchQuery}"</em>.</div>
            </div>
          )}
          {filteredUnassigned.length > 0 && containerHeight > 0 && (
            <VirtualList
              items={filteredUnassigned}
              height={containerHeight}
              renderItem={renderUnassignedRow}
            />
          )}
        </div>
      </div>

      {/* AȘEZAȚI — doar la search */}
      {seatedSearchResults.length > 0 && (
        <>
          <div className="sb-divider" />
          <div className="sb-section-seated">
            <div className="sb-section-label sb-label-pad" style={{ marginTop: "0.5rem" }}>
              Așezați <span className="sb-badge">{seatedSearchResults.length}</span>
            </div>
            <div className="sb-guests sb-seated-scroll">
              {seatedSearchResults.map((g) => {
                const gc = getGroupColor(g.grup);
                const table = tables.find((t) => t.id === g.tableId);
                return (
                  <div key={g.id} className="sb-guest-row" style={{ cursor: "pointer" }} onClick={() => locateGuest(g.id)}>
                    <div
                      className="sb-avatar"
                      style={{ background: `${gc}22`, border: `1.5px solid ${gc}`, color: gc }}
                      onMouseEnter={(e) => {
                        if (!isDraggingGuest) {
                          const r = e.currentTarget.getBoundingClientRect();
                          setHoveredGuest({ guest: g, x: r.right + 8, y: r.top - 4 });
                        }
                      }}
                      onMouseLeave={() => setHoveredGuest(null)}
                    >
                      {g.prenume[0] + g.nume[0]}
                    </div>
                    <span className="sb-guest-name">{g.prenume} {g.nume}</span>
                    <span style={{ fontSize: "0.6rem", color: "#6E7490", whiteSpace: "nowrap" }}>{table?.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}

export default React.memo(GuestSidebar);
