import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import Heatmap from '../components/Heatmap';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

const mockStats = {
  date: '2026-06-11', total_presses: 1000, active_keys: 5,
  first_press_time: '2026-06-11T08:00:00', last_press_time: '2026-06-11T22:00:00',
  keys: {
    KeyA: { count: 300, category: 'letter', hourly: new Array(24).fill(0).map((_, i) => i < 8 ? 0 : 12), last_pressed: 1000 },
    Space: { count: 500, category: 'special', hourly: new Array(24).fill(0).map((_, i) => i < 8 ? 0 : 20), last_pressed: 1000 },
    KeyE: { count: 200, category: 'letter', hourly: new Array(24).fill(0).map((_, i) => i < 8 ? 0 : 8), last_pressed: 1000 },
  },
};

describe('Heatmap', () => {
  it('renders title', () => { render(<Heatmap stats={mockStats} />); expect(screen.getByText('键盘热力图')).toBeInTheDocument(); });
  it('renders overview cards', () => {
    const { container } = render(<Heatmap stats={mockStats} />);
    const cards = container.querySelectorAll('.grid.grid-cols-2 > div');
    expect(cards.length).toBe(2);
    expect(within(cards[0] as HTMLElement).getByText('1,000')).toBeInTheDocument();
    expect(within(cards[1] as HTMLElement).getByText('5')).toBeInTheDocument();
  });
  it('renders time period buttons', () => { render(<Heatmap stats={mockStats} />); expect(screen.getByText('今日')).toBeInTheDocument(); expect(screen.getByText('本周')).toBeInTheDocument(); expect(screen.getByText('本月')).toBeInTheDocument(); });
  it('renders keyboard keys', () => { render(<Heatmap stats={mockStats} />); expect(screen.getByText('Esc')).toBeInTheDocument(); expect(screen.getByText('␣')).toBeInTheDocument(); expect(screen.getByText('↵')).toBeInTheDocument(); });
  it('renders letter keys', () => { render(<Heatmap stats={mockStats} />); expect(screen.getAllByText('A').length).toBeGreaterThanOrEqual(1); expect(screen.getAllByText('E').length).toBeGreaterThanOrEqual(1); });
  it('renders color legend', () => { render(<Heatmap stats={mockStats} />); expect(screen.getByText('少')).toBeInTheDocument(); expect(screen.getByText('多')).toBeInTheDocument(); });
  it('handles null stats', () => {
    const { container } = render(<Heatmap stats={null} />);
    expect(screen.getByText('键盘热力图')).toBeInTheDocument();
    const cards = container.querySelectorAll('.grid.grid-cols-2 > div');
    expect(within(cards[0] as HTMLElement).getByText('0')).toBeInTheDocument();
  });
  it('renders modifier keys', () => {
    render(<Heatmap stats={mockStats} />);
    expect(screen.getAllByText('⇧').length).toBe(2);
    expect(screen.getAllByText('⌃').length).toBe(2);
    expect(screen.getAllByText('⌥').length).toBe(2);
    expect(screen.getAllByText('⌘').length).toBe(2);
  });
});