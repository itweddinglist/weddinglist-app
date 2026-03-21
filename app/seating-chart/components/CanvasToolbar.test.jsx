import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import CanvasToolbar from './CanvasToolbar.jsx';

const defaultProps = {
  vzoom: 1,
  zoomBy: vi.fn(),
  fitToScreen: vi.fn(),
  tables: [],
  lockMode: false,
  setLockMode: vi.fn(),
  showToast: vi.fn(),
  magicFill: vi.fn(),
  undo: vi.fn(),
  setShowCatering: vi.fn(),
  setConfirmDialog: vi.fn(),
  resetPlan: vi.fn(),
  setModal: vi.fn(),
  getNextTableName: vi.fn(() => 'Masa 1'),
};

describe('CanvasToolbar', () => {
  afterEach(() => { cleanup(); });

  it('randează fără erori', () => {
    render(<CanvasToolbar {...defaultProps} />);
    expect(screen.getByText('Magic Fill')).toBeTruthy();
  });

  it('afișează zoom-ul corect', () => {
    render(<CanvasToolbar {...defaultProps} />);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('click zoom in → zoomBy(0.1)', () => {
    render(<CanvasToolbar {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    const zoomInBtn = buttons.find(b => b.querySelector('.lucide-plus'));
    fireEvent.click(zoomInBtn);
    expect(defaultProps.zoomBy).toHaveBeenCalledWith(0.1);
  });

  it('click zoom out → zoomBy(-0.1)', () => {
    render(<CanvasToolbar {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    const zoomOutBtn = screen.getByRole('button', { name: 'zoom-out' });
    fireEvent.click(zoomOutBtn);
    expect(defaultProps.zoomBy).toHaveBeenCalledWith(-0.1);
  });

  it('click Magic Fill → magicFill apelat', () => {
    render(<CanvasToolbar {...defaultProps} />);
    fireEvent.click(screen.getByText('Magic Fill'));
    expect(defaultProps.magicFill).toHaveBeenCalled();
  });

  it('click Undo → undo apelat', () => {
    render(<CanvasToolbar {...defaultProps} />);
    fireEvent.click(screen.getByText('Undo'));
    expect(defaultProps.undo).toHaveBeenCalled();
  });

  it('click Catering → setShowCatering(true)', () => {
    render(<CanvasToolbar {...defaultProps} />);
    fireEvent.click(screen.getByText('Catering'));
    expect(defaultProps.setShowCatering).toHaveBeenCalledWith(true);
  });
});