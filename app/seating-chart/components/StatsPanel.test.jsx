import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import StatsPanel from "./StatsPanel.jsx";

const defaultProps = {
  showStats: true,
  setShowStats: vi.fn(),
  guests: [{ id: 1 }, { id: 2 }],
  assignedCount: 1,
  unassigned: [{ id: 2 }],
  menuStats: { Standard: 1, Vegetarian: 1 },
};

describe("StatsPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("randează panelul când showStats=true", () => {
    render(<StatsPanel {...defaultProps} />);
    expect(screen.getByText("📊 Statistici")).toBeTruthy();
  });

  it("afișează numărul total de invitați", () => {
    render(<StatsPanel {...defaultProps} />);
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("afișează meniurile", () => {
    render(<StatsPanel {...defaultProps} />);
    expect(screen.getByText("Standard")).toBeTruthy();
    expect(screen.getByText("Vegetarian")).toBeTruthy();
  });

  it("click × → setShowStats(false)", () => {
    render(<StatsPanel {...defaultProps} />);
    fireEvent.click(screen.getByText("×"));
    expect(defaultProps.setShowStats).toHaveBeenCalledWith(false);
  });

  it("randează butonul 📊 când showStats=false", () => {
    render(<StatsPanel {...defaultProps} showStats={false} />);
    expect(screen.getByText("📊")).toBeTruthy();
  });

  it("click 📊 → setShowStats(true)", () => {
    render(<StatsPanel {...defaultProps} showStats={false} />);
    fireEvent.click(screen.getByText("📊"));
    expect(defaultProps.setShowStats).toHaveBeenCalledWith(true);
  });
});
