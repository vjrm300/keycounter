use chrono::Local;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum KeyCategory { Letter, Number, Function, Special }

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct KeyStat {
    pub count: u64,
    pub category: KeyCategory,
    pub hourly: [u64; 24],
    pub last_pressed: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DailyStats {
    pub date: String,
    pub total_presses: u64,
    pub active_keys: u32,
    pub first_press_time: Option<String>,
    pub last_press_time: Option<String>,
    pub keys: HashMap<String, KeyStat>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Settings {
    pub always_on_top: bool,
    pub theme: String,
    pub opacity: f64,
    pub hotkey_toggle_visibility: String,
    pub hotkey_toggle_topmost: String,
    pub auto_start: bool,
    pub minimize_to_tray: bool,
    pub data_retention_days: u32,
    pub floating_ball_key: String,
    pub floating_ball_visible: bool,
}

/// 导出数据的容器格式
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ExportData {
    pub version: String,
    pub exported_at: String,
    pub settings: Settings,
    pub days: Vec<DailyStats>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            always_on_top: false, theme: "system".to_string(), opacity: 1.0,
            hotkey_toggle_visibility: "Ctrl+Shift+K".to_string(),
            hotkey_toggle_topmost: "Ctrl+Shift+T".to_string(),
            auto_start: false, minimize_to_tray: true, data_retention_days: 90,
            floating_ball_key: "Space".to_string(), floating_ball_visible: false,
        }
    }
}

impl Default for DailyStats {
    fn default() -> Self {
        Self {
            date: Local::now().format("%Y-%m-%d").to_string(),
            total_presses: 0, active_keys: 0,
            first_press_time: None, last_press_time: None, keys: HashMap::new(),
        }
    }
}

pub fn classify_key(key_name: &str) -> KeyCategory {
    match key_name {
        "A"..="Z" => KeyCategory::Letter,
        "Key0"..="Key9" | "Numpad0"..="Numpad9" => KeyCategory::Number,
        "F1"..="F12" | "ShiftLeft" | "ShiftRight" | "ControlLeft" | "ControlRight"
        | "AltLeft" | "AltRight" | "MetaLeft" | "MetaRight" | "Tab" | "CapsLock" | "Escape" => KeyCategory::Function,
        _ => KeyCategory::Special,
    }
}

pub fn get_data_dir() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or_else(|| "无法获取用户主目录".to_string())?;
    let data_dir = home.join(".keycounter");
    fs::create_dir_all(&data_dir).map_err(|e| format!("无法创建数据目录: {}", e))?;
    Ok(data_dir)
}

fn data_dir_or_default() -> PathBuf {
    get_data_dir().unwrap_or_else(|e| { eprintln!("[KeyCounter] {}", e); PathBuf::from(".") })
}

fn is_valid_date(date: &str) -> bool {
    date.len() == 10 && date.chars().enumerate().all(|(i, c)| c.is_ascii_digit() || (i == 4 || i == 7) && c == '-')
}

pub fn get_today_file_path() -> PathBuf {
    data_dir_or_default().join(format!("{}.json", Local::now().format("%Y-%m-%d")))
}

pub fn load_today() -> DailyStats {
    let path = get_today_file_path();
    if path.exists() {
        serde_json::from_str(&fs::read_to_string(&path).unwrap_or_default()).unwrap_or_default()
    } else {
        DailyStats::default()
    }
}

pub fn save(stats: &DailyStats) -> Result<(), String> {
    let path = data_dir_or_default().join(format!("{}.json", stats.date));
    fs::write(path, serde_json::to_string_pretty(stats).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
}

pub fn load_by_date(date: &str) -> DailyStats {
    if !is_valid_date(date) { return DailyStats::default(); }
    let path = data_dir_or_default().join(format!("{}.json", date));
    if path.exists() {
        serde_json::from_str(&fs::read_to_string(&path).unwrap_or_default()).unwrap_or_default()
    } else {
        DailyStats { date: date.to_string(), ..Default::default() }
    }
}

pub fn load_date_range(start: &str, end: &str) -> Vec<DailyStats> {
    let data_dir = data_dir_or_default();
    let mut results = Vec::new();
    if let Ok(entries) = fs::read_dir(&data_dir) {
        for entry in entries.flatten() {
            let file_name = entry.file_name().to_string_lossy().to_string();
            if file_name.ends_with(".json") && file_name != "settings.json" {
                let date = file_name.trim_end_matches(".json");
                if date >= start && date <= end {
                    let stats = load_by_date(date);
                    if stats.total_presses > 0 { results.push(stats); }
                }
            }
        }
    }
    results.sort_by(|a, b| a.date.cmp(&b.date));
    results
}

pub fn aggregate_stats(daily_stats: &[DailyStats], start: &str, end: &str) -> DailyStats {
    let mut aggregated = DailyStats {
        date: format!("{} ~ {}", start, end), total_presses: 0, active_keys: 0,
        first_press_time: None, last_press_time: None, keys: HashMap::new(),
    };
    for daily in daily_stats {
        aggregated.total_presses += daily.total_presses;
        for (key_name, key_stat) in &daily.keys {
            let entry = aggregated.keys.entry(key_name.clone()).or_insert(KeyStat {
                count: 0, category: key_stat.category.clone(), hourly: [0; 24], last_pressed: 0,
            });
            entry.count += key_stat.count;
            for i in 0..24 { entry.hourly[i] += key_stat.hourly[i]; }
            if key_stat.last_pressed > entry.last_pressed { entry.last_pressed = key_stat.last_pressed; }
        }
        match (&aggregated.first_press_time, &daily.first_press_time) {
            (_, None) => {}
            (None, Some(_)) => { aggregated.first_press_time = daily.first_press_time.clone(); }
            (Some(cur), Some(new)) if new < cur => { aggregated.first_press_time = daily.first_press_time.clone(); }
            _ => {}
        }
        match (&aggregated.last_press_time, &daily.last_press_time) {
            (_, None) => {}
            (None, Some(_)) => { aggregated.last_press_time = daily.last_press_time.clone(); }
            (Some(cur), Some(new)) if new > cur => { aggregated.last_press_time = daily.last_press_time.clone(); }
            _ => {}
        }
    }
    aggregated.active_keys = aggregated.keys.len() as u32;
    aggregated
}

pub fn load_settings() -> Settings {
    let path = data_dir_or_default().join("settings.json");
    if path.exists() {
        serde_json::from_str(&fs::read_to_string(&path).unwrap_or_default()).unwrap_or_default()
    } else {
        Settings::default()
    }
}

pub fn save_settings(settings: &Settings) -> Result<(), String> {
    let path = data_dir_or_default().join("settings.json");
    fs::write(path, serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
}

/// 加载所有日期的统计数据
pub fn load_all_stats() -> Vec<DailyStats> {
    let data_dir = data_dir_or_default();
    let mut results = Vec::new();
    if let Ok(entries) = fs::read_dir(&data_dir) {
        for entry in entries.flatten() {
            let file_name = entry.file_name().to_string_lossy().to_string();
            if file_name.ends_with(".json") && file_name != "settings.json" {
                let date = file_name.trim_end_matches(".json");
                if is_valid_date(date) {
                    let stats = load_by_date(date);
                    results.push(stats);
                }
            }
        }
    }
    results.sort_by(|a, b| a.date.cmp(&b.date));
    results
}

/// 导出所有数据为 JSON 字符串
pub fn export_all() -> Result<String, String> {
    let settings = load_settings();
    let days = load_all_stats();
    let export = ExportData {
        version: "1.0.0".to_string(),
        exported_at: Local::now().to_rfc3339(),
        settings,
        days,
    };
    serde_json::to_string_pretty(&export).map_err(|e| e.to_string())
}

/// 从 JSON 字符串导入数据，返回导入的天数
pub fn import_from_json(json: &str) -> Result<usize, String> {
    let import: ExportData = serde_json::from_str(json)
        .map_err(|e| format!("解析 JSON 失败: {}", e))?;

    let mut imported = 0;
    for day in &import.days {
        if is_valid_date(&day.date) && day.total_presses > 0 {
            save(day)?;
            imported += 1;
        }
    }

    // 导入设置（可选，不覆盖现有设置）
    let existing_settings = load_settings();
    if existing_settings.floating_ball_key == "Space" && import.settings.floating_ball_key != "Space" {
        let _ = save_settings(&import.settings);
    }

    Ok(imported)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_classify_key() {
        assert_eq!(classify_key("A"), KeyCategory::Letter);
        assert_eq!(classify_key("Key5"), KeyCategory::Number);
        assert_eq!(classify_key("F1"), KeyCategory::Function);
        assert_eq!(classify_key("Space"), KeyCategory::Special);
    }

    #[test]
    fn test_daily_stats_default() {
        let stats = DailyStats::default();
        assert_eq!(stats.total_presses, 0);
        assert!(stats.keys.is_empty());
    }

    #[test]
    fn test_serialize_roundtrip() {
        let mut stats = DailyStats::default();
        stats.total_presses = 100;
        stats.keys.insert("A".to_string(), KeyStat { count: 50, category: KeyCategory::Letter, hourly: [0; 24], last_pressed: 0 });
        let json = serde_json::to_string(&stats).unwrap();
        let deserialized: DailyStats = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.total_presses, 100);
    }

    #[test]
    fn test_aggregate_empty() {
        let result = aggregate_stats(&[], "2026-06-01", "2026-06-07");
        assert_eq!(result.total_presses, 0);
    }

    #[test]
    fn test_aggregate_multiple_days() {
        let mut day1 = DailyStats::default();
        day1.total_presses = 100;
        day1.keys.insert("KeyA".to_string(), KeyStat { count: 50, category: KeyCategory::Letter, hourly: [0; 24], last_pressed: 1000 });
        let mut day2 = DailyStats::default();
        day2.total_presses = 200;
        day2.keys.insert("KeyA".to_string(), KeyStat { count: 80, category: KeyCategory::Letter, hourly: [0; 24], last_pressed: 2000 });
        day2.keys.insert("Space".to_string(), KeyStat { count: 120, category: KeyCategory::Special, hourly: [0; 24], last_pressed: 2000 });
        let result = aggregate_stats(&[day1, day2], "2026-06-01", "2026-06-02");
        assert_eq!(result.total_presses, 300);
        assert_eq!(result.keys["KeyA"].count, 130);
        assert_eq!(result.keys["Space"].count, 120);
    }

    #[test]
    fn test_is_valid_date() {
        assert!(is_valid_date("2026-06-01"));
        assert!(!is_valid_date("not-a-date"));
    }

    #[test]
    fn test_export_import_roundtrip() {
        let mut stats = DailyStats::default();
        stats.date = "2026-06-01".to_string();
        stats.total_presses = 500;
        stats.active_keys = 3;
        stats.keys.insert("Space".to_string(), KeyStat { count: 200, category: KeyCategory::Special, hourly: [0; 24], last_pressed: 1000 });
        stats.keys.insert("KeyA".to_string(), KeyStat { count: 150, category: KeyCategory::Letter, hourly: [0; 24], last_pressed: 900 });

        let export = ExportData {
            version: "1.0.0".to_string(),
            exported_at: "2026-06-01T12:00:00+08:00".to_string(),
            settings: Settings::default(),
            days: vec![stats],
        };

        let json = serde_json::to_string_pretty(&export).unwrap();
        let parsed: ExportData = serde_json::from_str(&json).unwrap();

        assert_eq!(parsed.version, "1.0.0");
        assert_eq!(parsed.days.len(), 1);
        assert_eq!(parsed.days[0].total_presses, 500);
        assert_eq!(parsed.days[0].keys["Space"].count, 200);
    }
}