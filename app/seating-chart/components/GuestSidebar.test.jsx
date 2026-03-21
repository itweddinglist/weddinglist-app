import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import GuestSidebar from "./GuestSidebar.jsx";

const defaultProps = {
  guests: [
    {
      id: 1,
      prenume: "Maria",
      nume: "Popescu",
      grup: "Familie Mireasă",
      status: "confirmat",
      tableId: 1,
    },
    {
      id: 2,
      prenume: "Ion",
      nume: "Ionescu",
      grup: "Familie Mire",
      status: "asteptare",
      tableId: null,
    },
  ],
  filteredUnassigned: [
    {
      id: 2,
      prenume: "Ion",
      nume: "Ionescu",
      grup: "Familie Mire",
      status: "asteptare",
      tableId: null,
    },
  ],
  searchQuery: "",
  setSearchQuery: vi.fn(),
  guestMeta: {
    groups: [
      { name: "Familie Mireasă", count: 1 },
      { name: "Familie Mire", count: 1 },
    ],
  },
  groupColorMap: { "Familie Mireasă": "#C9907A", "Familie Mire": "#48BB78" },
  locateGuest: vi.fn(),
  isDraggingGuest: false,
  setHoveredGuest: vi.fn(),
  setIsDraggingGuest: vi.fn(),
  tables: [{ id: 1, name: "Masa 1" }],
};

describe("GuestSidebar", () => {
  afterEach(() => {
    cleanup();
  });
  it("randează search input", () => {
    render(<GuestSidebar {...defaultProps} />);
    expect(screen.getByPlaceholderText("Caută un invitat...")).toBeTruthy();
  });

  it("randează legenda grupuri", () => {
    render(<GuestSidebar {...defaultProps} />);
    expect(screen.getByText("Familie Mireasă")).toBeTruthy();
    expect(screen.getByText("Familie Mire")).toBeTruthy();
  });

  it("randează invitații neatribuiți", () => {
    render(<GuestSidebar {...defaultProps} />);
    expect(screen.getByText("Ion Ionescu")).toBeTruthy();
  });

  it("click pe invitat → locateGuest apelat", () => {
    render(<GuestSidebar {...defaultProps} />);
    fireEvent.click(screen.getByText("Ion Ionescu"));
    expect(defaultProps.locateGuest).toHaveBeenCalledWith(2);
  });

  it("search input onChange → setSearchQuery apelat", () => {
    render(<GuestSidebar {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText("Caută un invitat..."), {
      target: { value: "maria" },
    });
    expect(defaultProps.setSearchQuery).toHaveBeenCalledWith("maria");
  });

  it("mesaj gol când neatribuiți = 0", () => {
    render(<GuestSidebar {...defaultProps} filteredUnassigned={[]} />);
    expect(screen.getByText("Toți invitații au un loc!")).toBeTruthy();
  });

  it("secțiunea Așezați apare când searchQuery activ și există invitați așezați", () => {
    render(<GuestSidebar {...defaultProps} searchQuery="maria" />);
    expect(screen.getByText("Așezați")).toBeTruthy();
  });
});
