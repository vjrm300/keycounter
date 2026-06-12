pub mod key_listener;
pub mod state;
pub mod storage;

use state::AppState;
use storage::{DailyStats, Settings};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use chrono::{Local, Duration as ChronoDuration, Datelike};

#[tauri::command]
fn get_today_stats(app_state: tauri::State<'_, AppState>) -> DailyStats {
    app_state.get_today_stats()
}

#[tauri::command]
fn get_stats_by_date(date: String) -> DailyStats {
    storage::load_by_date(&date)
}

#[tauri::command]
fn get_settings() -> Settings {
    storage::load_settings()
}

#[tauri::command]
fn update_settings(settings: Settings) -> Result<(), String> {
    storage::save_settings(&settings)
}

#[tauri::command]
fn set_always_on_top(window: tauri::Window, enabled: bool) -> Result<(), String> {
    window.set_always_on_top(enabled).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_data(app_state: tauri::State<'_, AppState>) -> Result<(), String> {
    app_state.flush()
}

#[tauri::command]
fn get_window_label(window: tauri::WebviewWindow) -> String {
    window.label().to_string()
}

#[tauri::command]
fn get_key_count(app_state: tauri::State<'_, AppState>, key_name: String) -> u64 {
    let stats = app_state.get_today_stats();
    stats.keys.get(&key_name).map(|k| k.count).unwrap_or(0)
}

#[tauri::command]
async fn create_floating_ball(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("floating") {
        let _ = window.set_focus();
        return Ok(());
    }
    let window = WebviewWindowBuilder::new(&app, "floating", WebviewUrl::App("floating.html".into()))
        .title("KeyCounter Ball")
        .inner_size(100.0, 100.0)
        .decorations(false)
        .transparent(false)
        .always_on_top(true)
        .resizable(false)
        .skip_taskbar(true)
        .position(100.0, 100.0)
        .visible(false)
        .build()
        .map_err(|e| e.to_string())?;
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn close_floating_ball(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("floating") {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn get_weekly_stats() -> DailyStats {
    let today = Local::now();
    let weekday = today.weekday().num_days_from_monday();
    let monday = today - ChronoDuration::days(weekday as i64);
    let start = monday.format("%Y-%m-%d").to_string();
    let end = today.format("%Y-%m-%d").to_string();
    let daily_stats = storage::load_date_range(&start, &end);
    storage::aggregate_stats(&daily_stats, &start, &end)
}

#[tauri::command]
fn get_monthly_stats() -> DailyStats {
    let today = Local::now();
    let start = today.format("%Y-%m-01").to_string();
    let end = today.format("%Y-%m-%d").to_string();
    let daily_stats = storage::load_date_range(&start, &end);
    storage::aggregate_stats(&daily_stats, &start, &end)
}

/// 导出所有数据为 JSON 文件
#[tauri::command]
fn export_data() -> Result<String, String> {
    storage::export_all()
}

/// 从 JSON 字符串导入数据
#[tauri::command]
fn import_data(json: String) -> Result<usize, String> {
    storage::import_from_json(&json)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_state = AppState::new();
            app.manage(app_state);

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_always_on_top(true);
                let _ = window.set_title("KeyCounter");
            }

            let rx = key_listener::start_listener();
            let app_handle = app.handle().clone();

            let handle = app_handle.clone();
            std::thread::spawn(move || {
                let state = handle.state::<AppState>();
                let mut save_counter: u32 = 0;
                loop {
                    match rx.recv() {
                        Ok(key_name) => {
                            state.record_key(&key_name);
                            save_counter += 1;
                            if save_counter >= 100 {
                                let _ = state.flush();
                                save_counter = 0;
                            }
                        }
                        Err(_) => break,
                    }
                }
            });

            let handle2 = app_handle.clone();
            std::thread::spawn(move || {
                loop {
                    std::thread::sleep(std::time::Duration::from_secs(30));
                    let state = handle2.state::<AppState>();
                    state.check_date_rollover();
                    let _ = state.flush();
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_today_stats,
            get_stats_by_date,
            get_weekly_stats,
            get_monthly_stats,
            get_settings,
            update_settings,
            set_always_on_top,
            save_data,
            get_window_label,
            get_key_count,
            create_floating_ball,
            close_floating_ball,
            export_data,
            import_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}