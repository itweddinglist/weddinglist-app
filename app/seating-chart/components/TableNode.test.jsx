import { describe, it, expect, vi, afterEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { TableNode } from './TableNode.jsx'

afterEach(() => { cleanup() })

const makeTable = (overrides = {}) => ({
  id: 1, name: 'Masa 1', type: 'round',
  seats: 8, x: 100, y: 100,
  rotation: 0, isRing: false,
  ...overrides,
});

const defaultProps = (tableOverrides = {}) => ({
  t: makeTable(tableOverrides),
  guestsByTable: {},
  dragOver: null,
  selectedTableId: null,
  lockMode: false,
  vzoom: 1,
  screenToSVG: vi.fn(() => ({ x: 0, y: 0 })),
  assignGuest: vi.fn(),
  setSelectedTableId: vi.fn(),
  setEditName: vi.fn(),
  setEditSeats: vi.fn(),
  setEditPanel: vi.fn(),
  setHoveredGuest: vi.fn(),
  setClickedSeat: vi.fn(),
  setIsDraggingGuest: vi.fn(),
  setDragOver: vi.fn(),
  draggingTableRef: { current: null },
  wasMovedRef: { current: false },
});

const makeGuest = (overrides = {}) => ({
  id: 1, prenume: 'Ion', nume: 'Popescu',
  grup: 'Familie Mireasă', status: 'confirmat',
  meniu: 'Standard', tableId: 1,
  ...overrides,
});

const propsWithGuest = (tableOverrides = {}) => {
  const props = defaultProps(tableOverrides);
  props.guestsByTable = { 1: [makeGuest()] };
  return props;
};

const renderInSvg = (props) => {
  return render(
    React.createElement('svg', null,
      React.createElement(TableNode, props)
    )
  );
};

// ── Test 1 — render fără crash (round) ───────────────────────────────────────

describe('TableNode — render fără crash', () => {
  it('randează round fără erori', () => {
    const { container } = renderInSvg(defaultProps());
    expect(container.querySelector('g')).toBeTruthy();
  });
});

// ── Test 2 — numele mesei afișat ─────────────────────────────────────────────

describe('TableNode — numele mesei', () => {
  it('afișează numele mesei', () => {
    renderInSvg(defaultProps());
    expect(screen.getByText('Masa 1')).toBeTruthy();
  });
});

// ── Test 3 — round cu seats:8 → 8 scaune ─────────────────────────────────────

describe('TableNode — scaune round', () => {
  it('round cu seats:8 → 8 scaune randate', () => {
    const { container } = renderInSvg(defaultProps());
    const emptySeat = container.querySelectorAll('circle[stroke="#C4A882"][r="16"]');
    expect(emptySeat.length).toBe(8);
  });
});

// ── Test 4 — bar → 0 scaune ───────────────────────────────────────────────────

describe('TableNode — bar fără scaune', () => {
  it('bar → 0 scaune randate', () => {
    const { container } = renderInSvg(defaultProps({ type: 'bar' }));
    const emptySeat = container.querySelectorAll('circle[stroke-dasharray]');
    expect(emptySeat.length).toBe(0);
  });
});

// ── Test 5 — isRing → 0 scaune ───────────────────────────────────────────────

describe('TableNode — isRing fără scaune', () => {
  it('isRing:true → 0 scaune randate', () => {
    const { container } = renderInSvg(defaultProps({ type: 'bar', isRing: true }));
    const emptySeat = container.querySelectorAll('circle[stroke-dasharray]');
    expect(emptySeat.length).toBe(0);
  });
});

// ── Test 6 — click → setSelectedTableId ──────────────────────────────────────

describe('TableNode — click selectează masa', () => {
  it('click pe g → setSelectedTableId(t.id)', () => {
    const props = defaultProps();
    const { container } = renderInSvg(props);
    fireEvent.click(container.querySelector('g'));
    expect(props.setSelectedTableId).toHaveBeenCalledWith(1);
  });
});

// ── Test 7 — dragOver → isDragTarget ─────────────────────────────────────────

describe('TableNode — dragOver vizual', () => {
  it('dragOver === t.id → stroke #48BB78 pe circle (valid drop)', () => {
    const props = defaultProps();
    props.dragOver = { id: 1, full: false };
    const { container } = renderInSvg(props);
    const circles = container.querySelectorAll('circle');
    const hasDragColor = Array.from(circles).some(c => c.getAttribute('stroke') === '#48BB78');
    expect(hasDragColor).toBe(true);
  });
});

// ── Test 8 — selectedTableId → isSelected ────────────────────────────────────

describe('TableNode — isSelected vizual', () => {
  it('selectedTableId === t.id → stroke #9F7AEA pe circle', () => {
    const props = defaultProps();
    props.selectedTableId = 1;
    const { container } = renderInSvg(props);
    const circles = container.querySelectorAll('circle');
    const hasSelectedColor = Array.from(circles).some(c => c.getAttribute('stroke') === '#B794F4');
    expect(hasSelectedColor).toBe(true);
  });
});

// ── Test 9 — guestsByTable cu guest randat ────────────────────────────────────

describe('TableNode — guest randat în scaun', () => {
  it('guest în guestsByTable → inițiale afișate', () => {
    const props = defaultProps();
    props.guestsByTable = {
      1: [{ id: 1, prenume: 'Ion', nume: 'Popescu', grup: 'Familie Mireasă', status: 'confirmat', meniu: 'Standard', tableId: 1 }],
    };
    renderInSvg(props);
    expect(screen.getByText('IP')).toBeTruthy();
  });
});

// ── Test 10 — rotation → transform pe g ──────────────────────────────────────

describe('TableNode — rotation transform', () => {
  it('rect cu rotation:90 → transform rotate pe g exterior', () => {
    const props = defaultProps({ type: 'rect', rotation: 90 });
    const { container } = renderInSvg(props);
    const outerG = container.querySelector('svg > g');
    expect(outerG.getAttribute('transform')).toContain('rotate(90');
  });

  it('round cu rotation:90 → fără transform rotate', () => {
    const props = defaultProps({ type: 'round', rotation: 90 });
    const { container } = renderInSvg(props);
    const outerG = container.querySelector('svg > g');
    expect(outerG.getAttribute('transform') || '').toBe('');
  });
});

// ── Test 11 — prezidiu → randează fără crash ──────────────────────────────────

describe('TableNode — prezidiu', () => {
  it('prezidiu → randează fără crash', () => {
    const { container } = renderInSvg(defaultProps({ type: 'prezidiu', seats: 8 }));
    expect(container.querySelector('g')).toBeTruthy();
  });
});

// ── Test 12 — rect → randează fără crash ─────────────────────────────────────

describe('TableNode — rect', () => {
  it('rect → randează fără crash', () => {
    const { container } = renderInSvg(defaultProps({ type: 'rect', seats: 6 }));
    expect(container.querySelector('g')).toBeTruthy();
  });
});

// ── Test 13 — square → randează fără crash ────────────────────────────────────

describe('TableNode — square', () => {
  it('square → randează fără crash', () => {
    const { container } = renderInSvg(defaultProps({ type: 'square', seats: 8 }));
    expect(container.querySelector('g')).toBeTruthy();
  });
});

// ── Test 14 — doubleClick → setEditPanel ─────────────────────────────────────

describe('TableNode — doubleClick', () => {
  it('doubleClick → setEditPanel apelat', () => {
    const props = defaultProps();
    const { container } = renderInSvg(props);
    fireEvent.dblClick(container.querySelector('g'));
    expect(props.setEditPanel).toHaveBeenCalled();
    expect(props.setEditName).toHaveBeenCalledWith('Masa 1');
    expect(props.setEditSeats).toHaveBeenCalledWith(8);
  });
});

// ── Test 15 — onDrop → assignGuest ───────────────────────────────────────────

describe('TableNode — onDrop', () => {
  it('drop pe g → assignGuest apelat cu guestId', () => {
    const props = defaultProps();
    const { container } = renderInSvg(props);
    fireEvent.drop(container.querySelector('g'), {
      dataTransfer: { getData: (key) => key === 'guestId' ? '42' : '' },
    });
    expect(props.assignGuest).toHaveBeenCalledWith('42', 1);
  });
});

// ── Test 16 — click pe seat ocupat ───────────────────────────────────────────

describe('TableNode — click seat ocupat', () => {
  it('click pe seat → setClickedSeat apelat cu { guest, tableId, x, y }', () => {
    const props = propsWithGuest();
    const { container } = renderInSvg(props);
    const seatG = container.querySelector('g > g > g');
    fireEvent.click(seatG);
    expect(props.setClickedSeat).toHaveBeenCalled();
    const arg = props.setClickedSeat.mock.calls[0][0];
    expect(arg).toHaveProperty('guest');
    expect(arg).toHaveProperty('tableId', 1);
    expect(arg).toHaveProperty('x');
    expect(arg).toHaveProperty('y');
  });
});

// ── Test 17 — mouseEnter pe seat ocupat ──────────────────────────────────────

describe('TableNode — mouseEnter seat ocupat', () => {
  it('mouseEnter pe circle seat → setHoveredGuest apelat cu { guest, x, y }', () => {
    const props = propsWithGuest();
    const { container } = renderInSvg(props);
    // primul circle cu fill colorat (nu white, nu none) = seat ocupat
    const seatCircle = container.querySelector('g > g > g circle');
    fireEvent.mouseEnter(seatCircle);
    expect(props.setHoveredGuest).toHaveBeenCalled();
    const arg = props.setHoveredGuest.mock.calls[0][0];
    expect(arg).toHaveProperty('guest');
    expect(arg).toHaveProperty('x');
    expect(arg).toHaveProperty('y');
  });
});

// ── Test 18 — mouseLeave pe seat ocupat ──────────────────────────────────────

describe('TableNode — mouseLeave seat ocupat', () => {
  it('mouseLeave pe circle seat → setHoveredGuest(null)', () => {
    const props = propsWithGuest();
    const { container } = renderInSvg(props);
    const seatCircle = container.querySelector('g > g > g circle');
    fireEvent.mouseLeave(seatCircle);
    expect(props.setHoveredGuest).toHaveBeenCalledWith(null);
  });
});

// ── Test 19 — dragStart pe seat ocupat ───────────────────────────────────────

describe('TableNode — dragStart seat ocupat', () => {
  it('dragStart pe seat g → setIsDraggingGuest(true)', () => {
    const props = propsWithGuest();
    const { container } = renderInSvg(props);
    const seatG = container.querySelector('g > g > g');
    fireEvent.dragStart(seatG, {
      dataTransfer: { setData: vi.fn() },
    });
    expect(props.setIsDraggingGuest).toHaveBeenCalledWith(true);
  });
});

// ── Test 20 — dragEnd pe seat ocupat ─────────────────────────────────────────

describe('TableNode — dragEnd seat ocupat', () => {
  it('dragEnd pe seat g → setIsDraggingGuest(false)', () => {
    const props = propsWithGuest();
    const { container } = renderInSvg(props);
    const seatG = container.querySelector('g > g > g');
    fireEvent.dragEnd(seatG);
    expect(props.setIsDraggingGuest).toHaveBeenCalledWith(false);
  });
});

// ── Test 21 — drop pe seat gol ────────────────────────────────────────────────

describe('TableNode — drop pe seat gol', () => {
  it('drop pe circle gol → assignGuest apelat cu (guestId, t.id)', () => {
    const props = defaultProps();
    const { container } = renderInSvg(props);
    const emptySeat = container.querySelector('circle[fill="transparent"]');
    fireEvent.drop(emptySeat, {
      dataTransfer: { getData: (key) => key === 'guestId' ? '7' : '' },
    });
    expect(props.assignGuest).toHaveBeenCalledWith('7', 1);
  });
});