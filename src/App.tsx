import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import Leaderboard from "./components/Leaderboard";
import Heatmap from "./components/Heatmap";
import Settings from "./components/Settings";
import ErrorBoundary from "./components/ErrorBoundary";

type Tab = "leaderboard" | "heatmap" | "settings";

interface DailyStats {
  date: string;
  total_presses: number;
  active_keys: number;
  first_press_time: string | null;
  last_press_time: string | null;
  keys: Record<string, { count: number; category: string; hourly: number[]; last_pressed: number }>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>("leaderboard");
  const [isTopmost, setIsTopmost] = useState(true);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const data = await invoke<DailyStats>("get_today_stats");
      if (data && typeof data.total_presses === "number") {
        setStats(data);
        setError(null);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[KeyCounter] 获取统计数据失败:", msg);
      setError("断开");
    }
  }, []);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 2000);
    return () => clearInterval(interval);
  }, [loadStats]);

  const toggleTopmost = async () => {
    try {
      await invoke("set_always_on_top", { enabled: !isTopmost });
      setIsTopmost(!isTopmost);
    } catch (e) {
      console.error("[KeyCounter] 切换置顶失败:", e);
    }
  };

  const openFloatingBall = async () => {
    try {
      await invoke("create_floating_ball");
    } catch (e) {
      console.error("[KeyCounter] 打开悬浮球失败:", e);
    }
  };

  const total = stats?.total_presses ?? 0;
  const active = stats?.active_keys ?? 0;

  return (
    <div className="h-screen flex flex-col" style={{ background: "var(--bg-primary)" }}>
      {/* 标题栏 */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}
        data-tauri-drag-region
      >
        <div className="flex items-center gap-2.5" data-tauri-drag-region>
          <span className="num text-sm font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            {total > 0 ? total.toLocaleString() : "—"}
          </span>
          <span className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>
            {active > 0 ? `${active} keys` : ""}
          </span>
          {error && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: "var(--red)", color: "#fff" }}>
              {error}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={openFloatingBall} className="p-1 rounded-md transition-all duration-150" style={{ color: "var(--text-secondary)" }} aria-label="打开悬浮球" title="悬浮球模式">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="7" cy="7" r="2" fill="currentColor" />
            </svg>
          </button>
          <button onClick={toggleTopmost} className="p-1 rounded-md transition-all duration-150" style={{ color: isTopmost ? "var(--accent)" : "var(--text-secondary)" }} aria-label={isTopmost ? "取消置顶" : "置顶"} title={isTopmost ? "取消置顶" : "置顶"}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M8.5 1.5L12.5 5.5L10 5.5L10 10L4 10L4 5.5L1.5 5.5L5.5 1.5H8.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill={isTopmost ? "currentColor" : "none"} fillOpacity={isTopmost ? 0.15 : 0} />
            </svg>
          </button>
        </div>
      </div>
      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto min-h-0" role="tabpanel" id={`panel-${activeTab}`}>
        {activeTab === "leaderboard" && <Leaderboard stats={stats} />}
        {activeTab === "heatmap" && <Heatmap stats={stats} />}
        {activeTab === "settings" && <Settings />}
      </div>
      {/* 底部 Tab 栏 */}
      <div className="flex shrink-0 relative" role="tablist" aria-label="导航" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-card)" }}>
        <div className="absolute top-0 h-[2px] rounded-full transition-all duration-250" style={{ background: "var(--accent)", width: "33.33%", left: activeTab === "leaderboard" ? "0%" : activeTab === "heatmap" ? "33.33%" : "66.66%" }} />
        {(["leaderboard", "heatmap", "settings"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} role="tab" aria-selected={activeTab === tab} className="flex-1 flex items-center justify-center py-2 transition-all duration-150" style={{ color: activeTab === tab ? "var(--accent)" : "var(--text-tertiary)", background: activeTab === tab ? "var(--accent-light)" : "transparent" }}>
            <span className="text-[11px] font-medium">{{ leaderboard: "排行", heatmap: "热图", settings: "设置" }[tab]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}