use crate::storage::{self, DailyStats};
use chrono::{Local, Timelike};
use std::sync::Mutex;

struct AppStateInner {
    stats: DailyStats,
    dirty: bool,
}

pub struct AppState {
    inner: Mutex<AppStateInner>,
}

impl AppState {
    pub fn new() -> Self {
        let stats = storage::load_today();
        Self { inner: Mutex::new(AppStateInner { stats, dirty: false }) }
    }

    pub fn check_date_rollover(&self) -> bool {
        let mut inner = self.inner.lock().unwrap_or_else(|e| e.into_inner());
        let today = Local::now().format("%Y-%m-%d").to_string();
        if inner.stats.date != today {
            if let Err(e) = storage::save(&inner.stats) {
                eprintln!("[KeyCounter] 保存昨日数据失败: {}", e);
            }
            inner.stats = DailyStats::default();
            inner.dirty = false;
            return true;
        }
        false
    }

    pub fn record_key(&self, key_name: &str) {
        let mut inner = self.inner.lock().unwrap_or_else(|e| e.into_inner());
        let today = Local::now().format("%Y-%m-%d").to_string();
        if inner.stats.date != today {
            if let Err(e) = storage::save(&inner.stats) {
                eprintln!("[KeyCounter] 跨日保存失败: {}", e);
            }
            inner.stats = DailyStats::default();
        }
        inner.stats.total_presses += 1;
        let now = Local::now();
        let hour = now.hour() as usize;
        let entry = inner.stats.keys.entry(key_name.to_string()).or_insert_with(|| {
            storage::KeyStat { count: 0, category: storage::classify_key(key_name), hourly: [0; 24], last_pressed: 0 }
        });
        entry.count += 1;
        entry.hourly[hour] += 1;
        entry.last_pressed = now.timestamp_millis();
        inner.stats.active_keys = inner.stats.keys.len() as u32;
        if inner.stats.first_press_time.is_none() {
            inner.stats.first_press_time = Some(now.to_rfc3339());
        }
        inner.stats.last_press_time = Some(now.to_rfc3339());
        inner.dirty = true;
    }

    pub fn flush(&self) -> Result<(), String> {
        let mut inner = self.inner.lock().unwrap_or_else(|e| e.into_inner());
        if inner.dirty {
            storage::save(&inner.stats)?;
            inner.dirty = false;
        }
        Ok(())
    }

    pub fn get_today_stats(&self) -> DailyStats {
        let inner = self.inner.lock().unwrap_or_else(|e| e.into_inner());
        inner.stats.clone()
    }
}