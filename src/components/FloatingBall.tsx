import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

const BALL_SIZE = 80;
const RING_RADIUS = 34;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const MAX_COUNT = 200;

const KEY_DISPLAY_MAP: Record<string, string> = {
  Space: "空格", Return: "↵", BackSpace: "⌫", Tab: "⇥", Escape: "Esc",
  ShiftLeft: "⇧L", ShiftRight: "⇧R", ControlLeft: "⌃L", ControlRight: "⌃R",
  Alt: "⌥", Meta: "⌘",
};

function getDisplayKey(rdevKey: string): string {
  if (KEY_DISPLAY_MAP[rdevKey]) return KEY_DISPLAY_MAP[rdevKey];
  if (rdevKey.startsWith("Key")) return rdevKey.slice(3);
  if (rdevKey.startsWith("Num")) return rdevKey.slice(3);
  return rdevKey;
}

export default function FloatingBall() {
  const [keyName, setKeyName] = useState("Space");
  const [count, setCount] = useState(0);
  const isDragging = useRef(false);
  const mouseDownPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    invoke<{ floating_ball_key: string }>("get_settings").then((s) => setKeyName(s.floating_ball_key || "Space")).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    const poll = () => {
      invoke<number>("get_key_count", { keyName }).then((c) => { if (active) setCount(c); }).catch(() => {});
    };
    poll();
    const id = setInterval(poll, 500);
    return () => { active = false; clearInterval(id); };
  }, [keyName]);

  const progress = Math.min(count / MAX_COUNT, 1);
  const strokeOffset = RING_CIRCUMFERENCE * (1 - progress);

  const handleMouseDown = async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = false;
    mouseDownPos.current = { x: e.screenX, y: e.screenY };
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().startDragging();
    } catch (err) { console.error("[FloatingBall] startDragging 失败:", err); }
  };

  const handleMouseUp = async (e: React.MouseEvent) => {
    const dx = Math.abs(e.screenX - mouseDownPos.current.x);
    const dy = Math.abs(e.screenY - mouseDownPos.current.y);
    if (dx < 5 && dy < 5) {
      try { const { getCurrentWindow } = await import("@tauri-apps/api/window"); await getCurrentWindow().close(); } catch {}
    }
  };

  const handleContextMenu = async (e: React.MouseEvent) => {
    e.preventDefault();
    try { await invoke("close_floating_ball"); } catch {}
  };

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", overflow: "hidden", pointerEvents: "auto" }}>
      <div className="ball-container animate-float-in" onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onContextMenu={handleContextMenu} style={{ cursor: "grab" }}>
        <svg className="ball-ring" width={BALL_SIZE} height={BALL_SIZE} viewBox={`0 0 ${BALL_SIZE} ${BALL_SIZE}`}>
          <circle cx={BALL_SIZE / 2} cy={BALL_SIZE / 2} r={RING_RADIUS} fill="none" stroke="var(--ball-accent)" strokeWidth={3} strokeLinecap="round" strokeDasharray={RING_CIRCUMFERENCE} strokeDashoffset={strokeOffset} transform={`rotate(-90 ${BALL_SIZE / 2} ${BALL_SIZE / 2})`} style={{ transition: "stroke-dashoffset 0.3s ease" }} />
        </svg>
        <div className="ball-text">
          <div className="ball-key-name">{getDisplayKey(keyName)}</div>
          <div className="ball-count">{count}</div>
        </div>
      </div>
    </div>
  );
}