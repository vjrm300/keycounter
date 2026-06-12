import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface KeyStat {
  count: number;
  category: string;
  hourly: number[];
  last_pressed: number;
}

interface DailyStats {
  date: string;
  total_presses: number;
  active_keys: number;
  first_press_time: string | null;
  last_press_time: string | null;
  keys: Record<string, KeyStat>;
}

const KEYBOARD_ROWS = [
  {
    keys: ['Escape', null, 'F1', 'F2', 'F3', 'F4', null, 'F5', 'F6', 'F7', 'F8', null, 'F9', 'F10', 'F11', 'F12'],
    widths: [1, 0.5, 1, 1, 1, 1, 0.5, 1, 1, 1, 1, 0.5, 1, 1, 1, 1],
  },
  {
    keys: ['BackQuote', 'Num1', 'Num2', 'Num3', 'Num4', 'Num5', 'Num6', 'Num7', 'Num8', 'Num9', 'Num0', 'Minus', 'Equal', 'BackSpace'],
    widths: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
  },
  {
    keys: ['Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'LeftBracket', 'RightBracket', 'BackSlash'],
    widths: [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
  },
  {
    keys: ['CapsLock', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'SemiColon', 'Quote', 'Return'],
    widths: [1.8, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.2],
  },
  {
    keys: ['ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', 'ShiftRight'],
    widths: [2.3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.7],
  },
  {
    keys: ['ControlLeft', 'MetaLeft', 'AltLeft', 'Space', 'AltRight', 'MetaRight', 'Menu', 'ControlRight'],
    widths: [1.3, 1.2, 1.3, 6.4, 1.3, 1.2, 1.2, 1.3],
  },
];

const KEY_DISPLAY: Record<string, string> = {
  Escape: 'Esc', BackQuote: '`', Minus: '-', Equal: '=', BackSpace: '⌫',
  Tab: '⇥', CapsLock: '⇪', Return: '↵',
  ShiftLeft: '⇧', ShiftRight: '⇧',
  ControlLeft: '⌃', ControlRight: '⌃',
  AltLeft: '⌥', AltRight: '⌥',
  MetaLeft: '⌘', MetaRight: '⌘',
  Space: '␣', BackSlash: '\\', LeftBracket: '[', RightBracket: ']',
  SemiColon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Menu: '☰',
};

function getDisplayKey(keyName: string): string {
  if (KEY_DISPLAY[keyName]) return KEY_DISPLAY[keyName];
  if (keyName.startsWith('Key')) return keyName.slice(3);
  if (keyName.startsWith('Num') && keyName.length === 4) return keyName.slice(3);
  if (keyName.startsWith('F') && /^F\d+$/.test(keyName)) return keyName;
  return keyName;
}

function getKeyColor(ratio: number): string {
  if (ratio === 0) return '#e5e7eb';
  const hue = 220 + ratio * 50;
  const saturation = 60 + ratio * 30;
  const lightness = 85 - ratio * 40;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function getTextColor(ratio: number): string {
  if (ratio === 0) return '#9ca3af';
  if (ratio > 0.6) return '#ffffff';
  return '#1f2937';
}

type TimePeriod = 'today' | 'week' | 'month';

export default function Heatmap({ stats: todayStats }: { stats: DailyStats | null }) {
  const [period, setPeriod] = useState<TimePeriod>('today');
  const [displayStats, setDisplayStats] = useState<DailyStats>(
    todayStats ?? { date: '', total_presses: 0, active_keys: 0, first_press_time: null, last_press_time: null, keys: {} }
  );
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    if (period === 'today') {
      if (todayStats) setDisplayStats(todayStats);
      return;
    }
    setLoading(true);
    try {
      const result = await invoke<DailyStats>(
        period === 'week' ? 'get_weekly_stats' : 'get_monthly_stats'
      );
      setDisplayStats(result);
    } catch (err) {
      console.error('[Heatmap] 获取聚合数据失败:', err);
      if (todayStats) setDisplayStats(todayStats);
    } finally {
      setLoading(false);
    }
  }, [period, todayStats]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const maxCount = Math.max(1, ...Object.values(displayStats.keys).map((k) => k.count));

  const handleKeyHover = (keyName: string | null, e?: React.MouseEvent) => {
    setHoveredKey(keyName);
    if (e) setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handleKeyClick = (keyName: string) => {
    setSelectedKey(selectedKey === keyName ? null : keyName);
  };

  const hourlyData = selectedKey && displayStats.keys[selectedKey]
    ? displayStats.keys[selectedKey].hourly.map((count, hour) => ({ hour: `${hour}:00`, count }))
    : [];

  const periodLabels: Record<TimePeriod, string> = { today: '今日', week: '本周', month: '本月' };

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>键盘热力图</h2>
        <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
          {(['today', 'week', 'month'] as TimePeriod[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className="px-3 py-1 rounded-md text-[11px] font-medium transition-all duration-150" style={{ background: period === p ? "var(--bg-card)" : "transparent", color: period === p ? "var(--text-primary)" : "var(--text-tertiary)", boxShadow: period === p ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>{periodLabels[p]}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-[14px] p-3 border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <p className="text-[10px] font-medium mb-0.5" style={{ color: "var(--text-tertiary)" }}>{periodLabels[period]}总按键</p>
          <p className="text-lg font-bold num tabular-nums" style={{ color: "var(--text-primary)" }}>{loading ? '...' : displayStats.total_presses.toLocaleString()}</p>
        </div>
        <div className="rounded-[14px] p-3 border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <p className="text-[10px] font-medium mb-0.5" style={{ color: "var(--text-tertiary)" }}>活跃键数</p>
          <p className="text-lg font-bold num tabular-nums" style={{ color: "var(--accent)" }}>{loading ? '...' : displayStats.active_keys}</p>
        </div>
      </div>
      <div className="rounded-[14px] p-3 border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <div className="flex flex-col gap-[3px]">
          {KEYBOARD_ROWS.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-[3px]">
              {row.keys.map((keyName, keyIndex) => {
                if (keyName === null) return <div key={`spacer-${rowIndex}-${keyIndex}`} style={{ width: `${row.widths[keyIndex] * 2}rem` }} />;
                const keyStats = displayStats.keys[keyName];
                const count = keyStats?.count ?? 0;
                const ratio = count / maxCount;
                const isHovered = hoveredKey === keyName;
                const isSelected = selectedKey === keyName;
                return (
                  <div key={keyName} className="relative flex items-center justify-center rounded-md cursor-pointer transition-all duration-100 select-none" style={{ width: `${row.widths[keyIndex] * 2}rem`, height: '2rem', backgroundColor: getKeyColor(ratio), color: getTextColor(ratio), transform: isHovered ? 'scale(1.1)' : 'scale(1)', boxShadow: isSelected ? '0 0 0 2px var(--accent)' : isHovered ? '0 2px 8px rgba(0,0,0,0.12)' : 'none', zIndex: isHovered ? 10 : 1 }} onMouseEnter={(e) => handleKeyHover(keyName, e)} onMouseLeave={() => handleKeyHover(null)} onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })} onClick={() => handleKeyClick(keyName)}>
                    <span className="text-[10px] font-medium leading-none num">{getDisplayKey(keyName)}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 mt-3">
          <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>少</span>
          <div className="flex gap-[2px]">
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio) => (<div key={ratio} className="w-4 h-2 rounded-sm" style={{ backgroundColor: getKeyColor(ratio) }} />))}
          </div>
          <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>多</span>
        </div>
      </div>
      {hoveredKey && (
        <div className="fixed pointer-events-none z-50 px-2.5 py-1.5 rounded-lg text-[11px] shadow-lg" style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 36, background: "var(--bg-elevated, #1f2937)", color: "#fff" }}>
          <span className="font-medium">{getDisplayKey(hoveredKey)}</span>
          <span className="ml-1.5 opacity-60">{displayStats.keys[hoveredKey]?.count?.toLocaleString() ?? 0} 次</span>
        </div>
      )}
      {selectedKey && displayStats.keys[selectedKey] && (
        <div className="rounded-[14px] p-4 border animate-fade-in" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{getDisplayKey(selectedKey)} 详细统计</h3>
              <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>{periodLabels[period]}共 {displayStats.keys[selectedKey].count.toLocaleString()} 次</p>
            </div>
            <button onClick={() => setSelectedKey(null)} className="text-[11px] transition-colors duration-100" style={{ color: "var(--text-tertiary)" }}>✕</button>
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#86868b' }} interval={3} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#86868b' }} width={30} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '11px', padding: '6px 10px' }} formatter={(value: number) => [`${value} 次`, '按键数']} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {hourlyData.map((entry, index) => (<Cell key={index} fill={entry.count > 0 ? 'var(--accent)' : '#e5e7eb'} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}