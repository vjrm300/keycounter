import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Settings {
  always_on_top: boolean; theme: string; opacity: number;
  hotkey_toggle_visibility: string; hotkey_toggle_topmost: string;
  auto_start: boolean; minimize_to_tray: boolean; data_retention_days: number;
  floating_ball_key: string; floating_ball_visible: boolean;
}

const COMMON_KEYS = [
  { value: "Space", label: "空格" }, { value: "Return", label: "回车" },
  { value: "BackSpace", label: "退格" }, { value: "Tab", label: "Tab" },
  { value: "Escape", label: "Esc" },
  { value: "ShiftLeft", label: "左Shift" }, { value: "ShiftRight", label: "右Shift" },
  { value: "ControlLeft", label: "左Ctrl" }, { value: "ControlRight", label: "右Ctrl" },
  { value: "Alt", label: "Alt" }, { value: "Meta", label: "Win/Cmd" },
  { value: "KeyA", label: "A" }, { value: "KeyB", label: "B" }, { value: "KeyC", label: "C" },
  { value: "KeyD", label: "D" }, { value: "KeyE", label: "E" }, { value: "KeyF", label: "F" },
  { value: "KeyG", label: "G" }, { value: "KeyH", label: "H" }, { value: "KeyI", label: "I" },
  { value: "KeyJ", label: "J" }, { value: "KeyK", label: "K" }, { value: "KeyL", label: "L" },
  { value: "KeyM", label: "M" }, { value: "KeyN", label: "N" }, { value: "KeyO", label: "O" },
  { value: "KeyP", label: "P" }, { value: "KeyQ", label: "Q" }, { value: "KeyR", label: "R" },
  { value: "KeyS", label: "S" }, { value: "KeyT", label: "T" }, { value: "KeyU", label: "U" },
  { value: "KeyV", label: "V" }, { value: "KeyW", label: "W" }, { value: "KeyX", label: "X" },
  { value: "KeyY", label: "Y" }, { value: "KeyZ", label: "Z" },
  { value: "Num0", label: "0" }, { value: "Num1", label: "1" }, { value: "Num2", label: "2" },
  { value: "Num3", label: "3" }, { value: "Num4", label: "4" }, { value: "Num5", label: "5" },
  { value: "Num6", label: "6" }, { value: "Num7", label: "7" }, { value: "Num8", label: "8" },
  { value: "Num9", label: "9" },
  { value: "F1", label: "F1" }, { value: "F2", label: "F2" }, { value: "F3", label: "F3" },
  { value: "F4", label: "F4" }, { value: "F5", label: "F5" }, { value: "F6", label: "F6" },
  { value: "F7", label: "F7" }, { value: "F8", label: "F8" }, { value: "F9", label: "F9" },
  { value: "F10", label: "F10" }, { value: "F11", label: "F11" }, { value: "F12", label: "F12" },
];

export default function Settings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    invoke<Settings>("get_settings").then((s) => setSettings(s)).catch((e) => console.error("[Settings] 加载设置失败:", e));
  }, []);

  const updateSetting = async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    if (!settings) return;
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setSaving(true);
    try { await invoke("update_settings", { settings: newSettings }); }
    catch (e) { console.error("[Settings] 保存设置失败:", e); }
    finally { setSaving(false); }
  };

  if (!settings) return <div className="flex items-center justify-center h-full"><span className="text-xs" style={{ color: "var(--text-tertiary)" }}>加载中...</span></div>;

  return (
    <div className="p-4 space-y-4">
      <section>
        <h3 className="text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>悬浮球</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs" style={{ color: "var(--text-primary)" }}>监控按键</label>
            <select value={settings.floating_ball_key} onChange={(e) => updateSetting("floating_ball_key", e.target.value)} className="text-xs px-2 py-1 rounded-md border" style={{ background: "var(--bg-elevated)", color: "var(--text-primary)", borderColor: "var(--border)", minWidth: 100 }}>
              {COMMON_KEYS.map((key) => (<option key={key.value} value={key.value}>{key.label}</option>))}
            </select>
          </div>
        </div>
      </section>
      <section>
        <h3 className="text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>通用</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs" style={{ color: "var(--text-primary)" }}>窗口置顶</label>
            <button onClick={() => updateSetting("always_on_top", !settings.always_on_top)} className="w-10 h-5 rounded-full transition-colors relative" style={{ background: settings.always_on_top ? "var(--accent)" : "var(--border-strong)" }}><div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform" style={{ transform: settings.always_on_top ? "translateX(22px)" : "translateX(2px)" }} /></button>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs" style={{ color: "var(--text-primary)" }}>最小化到托盘</label>
            <button onClick={() => updateSetting("minimize_to_tray", !settings.minimize_to_tray)} className="w-10 h-5 rounded-full transition-colors relative" style={{ background: settings.minimize_to_tray ? "var(--accent)" : "var(--border-strong)" }}><div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform" style={{ transform: settings.minimize_to_tray ? "translateX(22px)" : "translateX(2px)" }} /></button>
          </div>
        </div>
      </section>
      {saving && <div className="text-center"><span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>保存中...</span></div>}
    </div>
  );
}