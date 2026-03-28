"use client";
import React from "react";
import { getGroupColor } from "../utils/geometry.js";

function GuestSidebar({
  guests,
  filteredUnassigned,
  searchQuery,
  setSearchQuery,
  guestMeta,
  groupColorMap,
  locateGuest,
  isDraggingGuest,
  setHoveredGuest,
  setIsDraggingGuest,
  tables,
  highlightGroupId,
  setHighlightGroupId,
  activeGroupId,
  setActiveGroupId,
  onExport,
}) {
  const allSeated = guests.length > 0 && filteredUnassigned.length === 0 && !searchQuery && !activeGroupId;
  const noGuests = guests.length === 0;
  const noResults = searchQuery && filteredUnassigned.length === 0;

  return (
    <aside className="sc-sidebar">
      <div className="sb-search-wrap">
        <input
          className="sb-search"
          placeholder="Caută un invitat..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {(searchQuery || activeGroupId) && (
          <button className="sb-search-clear" onClick={() => { setSearchQuery(""); setActiveGroupId(null); }}>
            ×
          </button>
        )}
      </div>

      <div className="sb-divider" />
      {guestMeta.groups.length > 0 && (
        <div style={{ padding: "0 1rem 0.5rem", maxHeight: "32vh", overflowY: "auto" }}>
          <div className="sb-section-label" style={{ marginBottom: "0.4rem" }}>
            Grupuri
          </div>
          {guestMeta.groups.map((g) => (
            <div
              key={g.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.2rem 0.4rem",
                cursor: "pointer",
                borderRadius: "5px",
                background: activeGroupId === g.name ? "rgba(201,144,122,0.12)" : "transparent",
              }}
              onClick={() => setActiveGroupId(activeGroupId === g.name ? null : g.name)}
              onMouseEnter={() => setHighlightGroupId(g.name)}
              onMouseLeave={() => setHighlightGroupId(null)}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: groupColorMap[g.name],
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: "0.68rem", color: "#9DA3BC", flex: 1 }}>{g.name}</span>
              <span style={{ fontSize: "0.6rem", color: "#6E7490" }}>{g.count}</span>
            </div>
          ))}
        </div>
      )}
      <div className="sb-divider" />
      <div className="sb-section-label sb-label-pad">
        Neatribuiți <span className="sb-badge">{filteredUnassigned.length}</span>
      </div>
      <div className="sb-guests" style={{ overflowY: "auto", flex: 1 }}>
        {noGuests && (
          <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>👥</div>
            <div
              style={{
                fontSize: "0.72rem",
                color: "#FAF7F2",
                fontWeight: 500,
                marginBottom: "0.3rem",
              }}
            >
              Niciun invitat încă
            </div>
            <div style={{ fontSize: "0.62rem", color: "#6E7490", lineHeight: 1.5 }}>
              Adaugă invitați din pagina de gestionare pentru a începe planul de mese.
            </div>
          </div>
        )}
        {allSeated && (
          <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.6rem" }}>✨</div>
            <div
              style={{
                fontSize: "0.78rem",
                color: "#48BB78",
                fontWeight: 600,
                marginBottom: "0.3rem",
              }}
            >
              Toți invitații au un loc!
            </div>
            <div style={{ fontSize: "0.62rem", color: "#6E7490", lineHeight: 1.5, marginBottom: "1rem" }}>
              Planul de mese este complet. Exportă-l pentru restaurant.
            </div>
            <button
              onClick={() => onExport && onExport()}
              style={{
                background: "rgba(72,187,120,0.12)",
                border: "1px solid rgba(72,187,120,0.3)",
                borderRadius: "999px",
                color: "#48BB78",
                fontSize: "0.62rem",
                fontWeight: 600,
                padding: "0.35rem 0.9rem",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: "0.04em",
              }}
            >
              Exportă PNG →
            </button>
          </div>
        )}
        {noResults && (
          <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🔍</div>
            <div
              style={{
                fontSize: "0.72rem",
                color: "#FAF7F2",
                fontWeight: 500,
                marginBottom: "0.3rem",
              }}
            >
              Niciun rezultat
            </div>
            <div style={{ fontSize: "0.62rem", color: "#6E7490", lineHeight: 1.5 }}>
              Nu am găsit invitați neatribuiți pentru <em>„{searchQuery}"</em>.
            </div>
          </div>
        )}
        {filteredUnassigned.map((g) => {
          const gc = getGroupColor(g.grup);
          return (
            <div
              key={g.id}
              className="sb-guest-row"
              draggable="true"
              onDragStart={(e) => {
                setIsDraggingGuest(true);
                setHoveredGuest(null);
                e.dataTransfer.setData("guestId", String(g.id));
              }}
              onDragEnd={() => setIsDraggingGuest(false)}
              onClick={() => locateGuest(g.id)}
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
              <span className="sb-guest-name">
                {g.prenume} {g.nume}
              </span>
              <span
                className="sb-status-dot"
                style={{ background: g.status === "confirmat" ? "#48BB78" : "#ECC94B" }}
              />
            </div>
          );
        })}
      </div>
      {searchQuery &&
        guests.filter(
          (g) =>
            g.tableId &&
            `${g.prenume} ${g.nume} ${g.grup}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
        ).length > 0 && (
          <>
            <div className="sb-section-label sb-label-pad" style={{ marginTop: "0.5rem" }}>
              Așezați{" "}
              <span className="sb-badge">
                {
                  guests.filter(
                    (g) =>
                      g.tableId &&
                      `${g.prenume} ${g.nume} ${g.grup}`
                        .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                        .includes(searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
                  ).length
                }
              </span>
            </div>
            <div className="sb-guests" style={{ maxHeight: "120px" }}>
              {guests
                .filter(
                  (g) =>
                    g.tableId &&
                    `${g.prenume} ${g.nume} ${g.grup}`
                      .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                      .includes(searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
                )
                .map((g) => {
                  const gc = getGroupColor(g.grup);
                  const table = tables.find((t) => t.id === g.tableId);
                  return (
                    <div
                      key={g.id}
                      className="sb-guest-row"
                      style={{ cursor: "pointer" }}
                      onClick={() => locateGuest(g.id)}
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
                      <span className="sb-guest-name">
                        {g.prenume} {g.nume}
                      </span>
                      <span style={{ fontSize: "0.6rem", color: "#6E7490", whiteSpace: "nowrap" }}>
                        {table?.name}
                      </span>
                    </div>
                  );
                })}
            </div>
          </>
        )}
    </aside>
  );
}

export default React.memo(GuestSidebar);
