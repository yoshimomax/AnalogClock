// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem,
};

/// Return the current screen cursor position in physical pixels.
/// Used by the frontend to detect hover over the window in click-through mode.
#[tauri::command]
fn get_cursor_pos() -> (i32, i32) {
    #[cfg(target_os = "windows")]
    {
        #[repr(C)]
        struct POINT { x: i32, y: i32 }
        extern "system" { fn GetCursorPos(lpPoint: *mut POINT) -> i32; }
        let mut pt = POINT { x: 0, y: 0 };
        unsafe { GetCursorPos(&mut pt); }
        (pt.x, pt.y)
    }
    #[cfg(not(target_os = "windows"))]
    { (0, 0) }
}

fn build_tray() -> SystemTray {
    let show_hide = CustomMenuItem::new("show_hide", "表示 / 非表示");
    let quit      = CustomMenuItem::new("quit",      "終了");
    let menu = SystemTrayMenu::new()
        .add_item(show_hide)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);
    SystemTray::new().with_menu(menu)
}

fn toggle_window(app: &tauri::AppHandle) {
    if let Some(win) = app.get_window("main") {
        if win.is_visible().unwrap_or(false) {
            let _ = win.hide();
        } else {
            let _ = win.show();
            let _ = win.set_focus();
        }
    }
}

fn main() {
    tauri::Builder::default()
        .system_tray(build_tray())
        .on_system_tray_event(|app, event| match event {
            // Left-click: toggle window visibility
            SystemTrayEvent::LeftClick { .. } => toggle_window(app),
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "show_hide" => toggle_window(app),
                "quit"      => std::process::exit(0),
                _           => {}
            },
            _ => {}
        })
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![get_cursor_pos])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
