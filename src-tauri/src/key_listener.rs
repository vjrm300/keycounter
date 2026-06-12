use rdev::EventType;
use std::sync::mpsc;
use std::thread;

fn key_name(event_type: &EventType) -> Option<String> {
    match event_type {
        EventType::KeyPress(key) => Some(format!("{:?}", key)),
        _ => None,
    }
}

pub fn start_listener() -> mpsc::Receiver<String> {
    let (tx, rx) = mpsc::channel();
    thread::spawn(move || {
        let callback = move |event: rdev::Event| {
            if let Some(name) = key_name(&event.event_type) {
                let _ = tx.send(name);
            }
        };
        if let Err(e) = rdev::listen(callback) {
            eprintln!("按键监听启动失败: {:?}", e);
        }
    });
    rx
}