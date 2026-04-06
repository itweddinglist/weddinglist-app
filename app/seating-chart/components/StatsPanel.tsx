"use client";
import React from "react";
import type { SeatingGuest } from "@/types/seating";

interface StatsPanelProps {
  showStats: boolean
  setShowStats: (value: boolean) => void
  guests: SeatingGuest[]
  assignedCount: number
  unassigned: SeatingGuest[]
  menuStats: Record<string, number>
}

function StatsPanel({
  showStats,
  setShowStats,
  guests,
  assignedCount,
  unassigned,
  menuStats,
}: StatsPanelProps) {
  if (!showStats)
    return (
      <button className="stats-toggle" onClick={() => setShowStats(true)}>
        📊
      </button>
    );

  return (
    <div className="stats-panel">
      <div className="stats-header">
        <span>📊 Statistici</span>
        <button
          onClick={() => setShowStats(false)}
          style={{ background: "none", border: "none", color: "#9DA3BC", cursor: "pointer" }}
        >
          ×
        </button>
      </div>
      <div className="stats-row">
        <span>Total invitați</span>
        <strong>{guests.length}</strong>
      </div>
      <div className="stats-row">
        <span>Așezați</span>
        <strong style={{ color: "#48BB78" }}>{assignedCount}</strong>
      </div>
      <div className="stats-row">
        <span>Rămași</span>
        <strong style={{ color: "#ECC94B" }}>{unassigned.length}</strong>
      </div>
      <div className="stats-divider" />
      {Object.entries(menuStats).map(([m, c]) => (
        <div key={m} className="stats-row">
          <span style={{ fontSize: "0.6rem" }}>{m}</span>
          <strong>{c}</strong>
        </div>
      ))}
      <div className="stats-divider" />
      <div style={{ fontSize: "0.55rem", color: "#6E7490" }}>↩ Ctrl+Z · ⌨️ Săgeți=mută masa</div>
    </div>
  );
}

export default React.memo(StatsPanel);
