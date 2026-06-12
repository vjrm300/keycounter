import { useState, useMemo } from "react";

interface KeyStat { count: number; category: string; hourly: number[]; last_pressed: number; }
interface DailyStats { date: string; total_presses: number; active_keys: number; first_press_time: string | null; last_press_time: string | null; keys: Record<string, KeyStat>; }
interface LeaderboardProps { stats: DailyStats | null; }

const medals = ["🥇", "🥈", "🥉"];

export default function Leaderboard({ stats }: LeaderboardProps) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");

  const { sorted, rankMap } = useMemo(() => {
    if (!stats?.keys) return { sorted: [] as [string, KeyStat][], rankMap: new Map<string, number>() };
    const s = Object.entries(stats.keys).filter(([_, v]) => v?.count).sort(([, a], [, b]) => b.count - a.count);
    const map = new Map(s.map(([k], i) => [k, i + 1]));
    return { sorted: s, rankMap: map };
  }, [stats?.keys]);

  if (!stats?.keys || sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--accent-light)" }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="3" y="6" width="14" height="10" rx="2" stroke="var(--accent)" strokeWidth="1.2" />
            <path d="M6 6V4a4 4 0 018 0v2" stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>按下任意键开始</p>
      </div>
    );
  }

  const filtered = search ? sorted.filter(([k]) => k.toLowerCase().includes(search.toLowerCase())) : sorted;
  const top3 = sorted.slice(0, 3);
  const display = expanded ? (search ? filtered : sorted) : top3;
  const max = sorted[0][1].count;

  return (
    <div className="flex flex-col h-full">
      {expanded && (
        <div className="px-3 py-2 shrink-0 animate-fade-in" style={{ borderBottom: "1px solid var(--border)" }}>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索按键..." aria-label="搜索按键" className="w-full px-3 py-1.5 rounded-lg text-[11px] outline-none font-mono" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)" }} autoFocus />
        </div>
      )}
      <div className="flex-1 overflow-y-auto min-h-0">
        {display.map(([keyName, keyStat], i) => {
          const rank = rankMap.get(keyName) ?? 0;
          const barW = max > 0 ? (keyStat.count / max) * 100 : 0;
          const pct = stats.total_presses > 0 ? (keyStat.count / stats.total_presses) * 100 : 0;
          const isTop = rank <= 3;
          return (
            <div key={keyName} className="flex items-center gap-2 px-3 py-2 transition-colors duration-100" style={{ borderBottom: i < display.length - 1 ? "1px solid var(--border)" : "none", background: isTop ? "var(--accent-light)" : "transparent" }}>
              <span className="w-5 text-center shrink-0" style={{ color: "var(--text-tertiary)" }}>{isTop ? <span className="text-sm">{medals[rank - 1]}</span> : <span className="num text-[10px] font-medium">{rank}</span>}</span>
              <span className="shrink-0 px-2 py-0.5 rounded-md num text-[11px] font-semibold leading-none" style={{ background: isTop ? "var(--accent)" : "var(--bg-secondary)", color: isTop ? "#fff" : "var(--text-primary)", minWidth: "28px", textAlign: "center" }}>{keyName}</span>
              <div className="flex-1 h-[3px] rounded-full overflow-hidden min-w-0" style={{ background: "var(--bg-secondary)" }}><div className="h-full rounded-full" style={{ width: `${Math.max(barW, 1)}%`, background: isTop ? "var(--accent)" : "var(--text-tertiary)", opacity: isTop ? 1 : 0.3, transition: "width 600ms cubic-bezier(0.34, 1.56, 0.64, 1)" }} /></div>
              <div className="shrink-0 flex items-baseline gap-1 w-16 justify-end">
                <span className="num text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>{keyStat.count.toLocaleString()}</span>
                <span className="num text-[9px] font-medium" style={{ color: "var(--text-tertiary)" }}>{pct.toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>
      {sorted.length > 3 && (
        <button onClick={() => { setExpanded(!expanded); setSearch(""); }} className="shrink-0 py-2 text-[11px] font-medium transition-colors duration-100" style={{ color: "var(--accent)", borderTop: "1px solid var(--border)", background: "var(--accent-light)" }} aria-expanded={expanded}>
          {expanded ? "收起" : `展开全部 ${sorted.length} 项`}
        </button>
      )}
    </div>
  );
}