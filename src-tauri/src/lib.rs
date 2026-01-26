mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::engine_start,
      commands::fs_list_tree,
      commands::fs_read_text,
      commands::pick_folder,
      commands::auth_start_device_login,
      commands::auth_poll_device_token,
      commands::auth_set_api_key,
      commands::auth_logout,
      commands::auth_check
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
