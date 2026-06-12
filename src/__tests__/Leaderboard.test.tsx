import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Leaderboard from '../components/Leaderboard';

const mockStats = {
  date: '2026-06-11', total_presses: 5000, active_keys: 10,
  first_press_time: '2026-06-11T08:00:00', last_press_time: '2026-06-11T22:00:00',
  keys: {
    Space: { count: 1500, category: 'special', hourly: new Array(24).fill(0), last_pressed: 1000 },
    KeyA: { count: 1200, category: 'letter', hourly: new Array(24).fill(0), last_pressed: 1000 },
    KeyE: { count: 800, category: 'letter', hourly: new Array(24).fill(0), last_pressed: 1000 },
    KeyT: { count: 600, category: 'letter', hourly: new Array(24).fill(0), last_pressed: 1000 },
    KeyO: { count: 400, category: 'letter', hourly: new Array(24).fill(0), last_pressed: 1000 },
  },
};

describe('Leaderboard', () => {
  it('renders empty state', () => { render(<Leaderboard stats={null} />); expect(screen.getByText('按下任意键开始')).toBeInTheDocument(); });
  it('renders top 3 keys', () => { render(<Leaderboard stats={mockStats} />); expect(screen.getByText('Space')).toBeInTheDocument(); expect(screen.getByText('KeyA')).toBeInTheDocument(); expect(screen.getByText('KeyE')).toBeInTheDocument(); });
  it('shows expand button', () => { render(<Leaderboard stats={mockStats} />); expect(screen.getByText('展开全部 5 项')).toBeInTheDocument(); });
  it('expands on click', () => { render(<Leaderboard stats={mockStats} />); fireEvent.click(screen.getByText('展开全部 5 项')); expect(screen.getByText('KeyT')).toBeInTheDocument(); expect(screen.getByText('收起')).toBeInTheDocument(); });
  it('collapses on second click', () => { render(<Leaderboard stats={mockStats} />); fireEvent.click(screen.getByText('展开全部 5 项')); fireEvent.click(screen.getByText('收起')); expect(screen.getByText('展开全部 5 项')).toBeInTheDocument(); });
  it('displays medals', () => { render(<Leaderboard stats={mockStats} />); expect(screen.getByText('🥇')).toBeInTheDocument(); expect(screen.getByText('🥈')).toBeInTheDocument(); expect(screen.getByText('🥉')).toBeInTheDocument(); });
});