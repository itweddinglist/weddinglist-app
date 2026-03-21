import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import EditPanel from './EditPanel.jsx'

afterEach(() => {
  cleanup()
})

const makeTable = (overrides = {}) => ({
  id: 1,
  name: 'Masa 1',
  type: 'round',
  seats: 8,
  isRing: false,
  rotation: 0,
  ...overrides,
});

const defaultProps = (tableOverrides = {}) => ({
  editPanel:    { tableId: 1, x: 100, y: 200 },
  setEditPanel: vi.fn(),
  tables:       [makeTable(tableOverrides)],
  editName:     'Masa 1',
  setEditName:  vi.fn(),
  editSeats:    8,
  setEditSeats: vi.fn(),
  saveEdit:     vi.fn(),
  deleteTable:  vi.fn(),
  rotateTable:  vi.fn(),
});

// ── Test 1 — render null ──────────────────────────────────────────────────────

describe('EditPanel — render null', () => {
  it('editPanel === null → nu randează nimic', () => {
    const props = defaultProps();
    props.editPanel = null;
    const { container } = render(<EditPanel {...props} />);
    expect(container.firstChild).toBeNull();
  });

  it('tableId inexistent → nu randează nimic', () => {
    const props = defaultProps();
    props.editPanel = { tableId: 999, x: 0, y: 0 };
    const { container } = render(<EditPanel {...props} />);
    expect(container.firstChild).toBeNull();
  });
});

// ── Test 2 — render basic ─────────────────────────────────────────────────────

describe('EditPanel — render basic', () => {
  it('editPanel există → randează inputul de nume', () => {
    render(<EditPanel {...defaultProps()} />);
    expect(screen.getByRole('textbox')).toBeTruthy();
  });

  it('randează butonul Salvează', () => {
    render(<EditPanel {...defaultProps()} />);
    expect(screen.getByText('Salvează')).toBeTruthy();
  });

  it('randează butonul Șterge', () => {
    render(<EditPanel {...defaultProps()} />);
    expect(screen.getByText('🗑 Șterge')).toBeTruthy();
  });
});

// ── Test 3 — name input ───────────────────────────────────────────────────────

describe('EditPanel — name input', () => {
  it('onChange pe input → setEditName apelat', () => {
    const props = defaultProps();
    render(<EditPanel {...props} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Masa Nouă' } });
    expect(props.setEditName).toHaveBeenCalledWith('Masa Nouă');
  });

  it('Enter pe input → saveEdit apelat', () => {
    const props = defaultProps();
    render(<EditPanel {...props} />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(props.saveEdit).toHaveBeenCalled();
  });
});

// ── Test 4 — seats buttons ────────────────────────────────────────────────────

describe('EditPanel — seats buttons', () => {
  it('buton − → setEditSeats apelat cu valoare decrementată', () => {
    const props = defaultProps();
    render(<EditPanel {...props} />);
    fireEvent.click(screen.getByText('−'));
    expect(props.setEditSeats).toHaveBeenCalled();
    const fn = props.setEditSeats.mock.calls[0][0];
    expect(fn(8)).toBe(7);
    expect(fn(4)).toBe(4);
  });

  it('buton + → setEditSeats apelat cu valoare incrementată', () => {
    const props = defaultProps();
    render(<EditPanel {...props} />);
    fireEvent.click(screen.getByText('+'));
    expect(props.setEditSeats).toHaveBeenCalled();
    const fn = props.setEditSeats.mock.calls[0][0];
    expect(fn(8)).toBe(9);
    expect(fn(16)).toBe(16);
  });

  it('secțiunea locuri nu apare pentru isRing', () => {
    const props = defaultProps({ isRing: true });
    render(<EditPanel {...props} />);
    expect(screen.queryByText('Locuri')).toBeNull();
  });

  it('secțiunea locuri nu apare pentru bar', () => {
    const props = defaultProps({ type: 'bar' });
    render(<EditPanel {...props} />);
    expect(screen.queryByText('Locuri')).toBeNull();
  });
});

// ── Test 5 — save ─────────────────────────────────────────────────────────────

describe('EditPanel — save', () => {
  it('click Salvează → saveEdit apelat', () => {
    const props = defaultProps();
    render(<EditPanel {...props} />);
    fireEvent.click(screen.getByText('Salvează'));
    expect(props.saveEdit).toHaveBeenCalled();
  });
});

// ── Test 6 — delete ───────────────────────────────────────────────────────────

describe('EditPanel — delete', () => {
  it('click Șterge → deleteTable apelat cu t.id corect', () => {
    const props = defaultProps();
    render(<EditPanel {...props} />);
    fireEvent.click(screen.getByText('🗑 Șterge'));
    expect(props.deleteTable).toHaveBeenCalledWith(1);
  });
});

// ── Test 7 — rotate ───────────────────────────────────────────────────────────

describe('EditPanel — rotate', () => {
  it('↻ 90° → rotateTable(t.id, 90) pentru rect', () => {
    const props = defaultProps({ type: 'rect' });
    render(<EditPanel {...props} />);
    fireEvent.click(screen.getByText('↻ 90°'));
    expect(props.rotateTable).toHaveBeenCalledWith(1, 90);
  });

  it('↺ −90° → rotateTable(t.id, -90) pentru prezidiu', () => {
    const props = defaultProps({ type: 'prezidiu' });
    render(<EditPanel {...props} />);
    fireEvent.click(screen.getByText('↺ −90°'));
    expect(props.rotateTable).toHaveBeenCalledWith(1, -90);
  });

  it('secțiunea rotație nu apare pentru round', () => {
    const props = defaultProps({ type: 'round' });
    render(<EditPanel {...props} />);
    expect(screen.queryByText('Rotație')).toBeNull();
  });
});

// ── Test 8 — valori controlate ────────────────────────────────────────────────

describe('EditPanel — valori controlate', () => {
  it('inputul de nume reflectă editName din props', () => {
    const props = defaultProps();
    props.editName = 'Masa VIP';
    render(<EditPanel {...props} />);
    expect(screen.getByRole('textbox').value).toBe('Masa VIP');
  });

  it('valoarea locuri reflectă editSeats din props', () => {
    const props = defaultProps();
    props.editSeats = 12;
    render(<EditPanel {...props} />);
    expect(screen.getByText('12')).toBeTruthy();
  });
});