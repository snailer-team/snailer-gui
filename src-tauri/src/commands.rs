use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize)]
pub struct EngineStartResponse {
    pub url: String,
    pub token: String,
    pub default_project_path: String,
}

#[derive(Debug, Clone)]
struct EngineState {
    url: String,
    token: String,
}

fn engine_state() -> &'static Mutex<Option<EngineState>> {
    static STATE: OnceLock<Mutex<Option<EngineState>>> = OnceLock::new();
    STATE.get_or_init(|| Mutex::new(None))
}

fn find_free_port() -> std::io::Result<u16> {
    let listener = std::net::TcpListener::bind("127.0.0.1:0")?;
    Ok(listener.local_addr()?.port())
}

fn default_project_path() -> PathBuf {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let candidate = manifest_dir.join("../../snailer");
    if candidate.is_dir() {
        return candidate;
    }
    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
}

fn home_dir() -> PathBuf {
    if let Ok(home) = std::env::var("HOME") {
        if !home.trim().is_empty() {
            return PathBuf::from(home);
        }
    }
    #[cfg(target_os = "windows")]
    {
        if let Ok(home) = std::env::var("USERPROFILE") {
            if !home.trim().is_empty() {
                return PathBuf::from(home);
            }
        }
    }
    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
}

fn snailer_home_dir() -> PathBuf {
    home_dir().join(".snailer")
}

fn snailer_attachments_dir() -> PathBuf {
    snailer_home_dir().join("gui_attachments")
}

fn snailer_cli_prefix_dir() -> PathBuf {
    snailer_home_dir().join("npm_cli")
}

fn snailer_cli_bin_path(prefix: &Path) -> PathBuf {
    let base = prefix.join("node_modules").join(".bin");
    #[cfg(target_os = "windows")]
    {
        return base.join("snailer.cmd");
    }
    #[cfg(not(target_os = "windows"))]
    {
        return base.join("snailer");
    }
}

fn snailer_cli_is_installed(prefix: &Path) -> bool {
    let pkg = prefix
        .join("node_modules")
        .join("@felixaihub")
        .join("snailer")
        .join("package.json");
    pkg.is_file() && snailer_cli_bin_path(prefix).is_file()
}

fn gui_settings_path() -> PathBuf {
    snailer_home_dir().join("gui_settings.json")
}

fn read_gui_settings_env_file() -> Option<String> {
    let path = gui_settings_path();
    let Ok(text) = std::fs::read_to_string(&path) else {
        return None;
    };
    let Ok(v) = serde_json::from_str::<serde_json::Value>(&text) else {
        return None;
    };
    v.get("snailerEnvFile")
        .and_then(|x| x.as_str())
        .map(|s| s.to_string())
        .filter(|s| !s.trim().is_empty())
}

fn read_gui_settings_auth_addr() -> Option<String> {
    let path = gui_settings_path();
    let Ok(text) = std::fs::read_to_string(&path) else {
        return None;
    };
    let Ok(v) = serde_json::from_str::<serde_json::Value>(&text) else {
        return None;
    };
    v.get("authAddr")
        .and_then(|x| x.as_str())
        .map(|s| s.to_string())
        .filter(|s| !s.trim().is_empty())
}

fn write_gui_settings_env_file(value: Option<&str>) -> Result<(), String> {
    let path = gui_settings_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("mkdir failed: {}", e))?;
    }
    let mut obj = if let Ok(text) = std::fs::read_to_string(&path) {
        serde_json::from_str::<serde_json::Map<String, serde_json::Value>>(&text).unwrap_or_default()
    } else {
        serde_json::Map::new()
    };
    if let Some(v) = value {
        obj.insert(
            "snailerEnvFile".to_string(),
            serde_json::Value::String(v.to_string()),
        );
    } else {
        obj.insert("snailerEnvFile".to_string(), serde_json::Value::Null);
    }
    let text = serde_json::Value::Object(obj).to_string();
    std::fs::write(&path, text).map_err(|e| format!("write failed: {}", e))?;
    Ok(())
}

fn write_gui_settings_auth_addr(value: Option<&str>) -> Result<(), String> {
    let path = gui_settings_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("mkdir failed: {}", e))?;
    }

    let mut obj = if let Ok(text) = std::fs::read_to_string(&path) {
        serde_json::from_str::<serde_json::Map<String, serde_json::Value>>(&text).unwrap_or_default()
    } else {
        serde_json::Map::new()
    };

    if let Some(v) = value {
        obj.insert("authAddr".to_string(), serde_json::Value::String(v.to_string()));
    } else {
        obj.insert("authAddr".to_string(), serde_json::Value::Null);
    }
    let text = serde_json::Value::Object(obj).to_string();
    std::fs::write(&path, text).map_err(|e| format!("write failed: {}", e))?;
    Ok(())
}

fn shared_env_path() -> Result<PathBuf, String> {
    let dir = snailer_home_dir();
    std::fs::create_dir_all(&dir).map_err(|e| format!("mkdir failed: {}", e))?;
    Ok(dir.join(".env"))
}

fn ensure_shared_env_selected() -> Result<PathBuf, String> {
    let p = shared_env_path()?;
    if !p.exists() {
        std::fs::write(&p, b"").map_err(|e| format!("write failed: {}", e))?;
    }
    std::env::set_var("SNAILER_ENV_FILE", &p);
    write_gui_settings_env_file(Some(&p.to_string_lossy()))?;
    Ok(p)
}

/// Return the default shared `.env` path used by the GUI: `~/.snailer/.env`.
#[tauri::command]
pub async fn env_global_path() -> Result<String, String> {
    Ok(shared_env_path()?.to_string_lossy().to_string())
}

/// Get the currently configured `SNAILER_ENV_FILE` for this GUI (persisted under `~/.snailer/gui_settings.json`).
#[tauri::command]
pub async fn snailer_env_file_get() -> Result<Option<String>, String> {
    Ok(read_gui_settings_env_file())
}

/// Set (or clear) the `SNAILER_ENV_FILE` used by Snailer when launched from this GUI.
/// Also sets the process env var immediately so subsequent calls can observe it.
#[tauri::command]
pub async fn snailer_env_file_set(path: Option<String>) -> Result<Option<String>, String> {
    match path.as_deref() {
        Some(p) if !p.trim().is_empty() => {
            std::env::set_var("SNAILER_ENV_FILE", p);
            write_gui_settings_env_file(Some(p))?;
            Ok(Some(p.to_string()))
        }
        _ => {
            std::env::remove_var("SNAILER_ENV_FILE");
            write_gui_settings_env_file(None)?;
            Ok(None)
        }
    }
}

fn default_auth_addr() -> Option<String> {
    let build_default = option_env!("SNAILER_AUTH_ADDR_DEFAULT")
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string());
    if build_default.is_some() {
        return build_default;
    }
    None
}

fn resolve_auth_addr() -> Result<String, String> {
    if let Ok(v) = std::env::var("SNAILER_AUTH_ADDR") {
        if !v.trim().is_empty() {
            return Ok(v);
        }
    }

    if let Some(v) = read_gui_settings_auth_addr() {
        if !v.trim().is_empty() {
            return Ok(v);
        }
    }

    if let Some(v) = default_auth_addr() {
        return Ok(v);
    }

    Err("Auth server address is not configured. Set SNAILER_AUTH_ADDR (environment) or set `authAddr` in `~/.snailer/gui_settings.json` (or provide a build default).".to_string())
}

const KEYCHAIN_SERVICE: &str = "com.snailer.gui";
const KEYCHAIN_AUTH_KEY: &str = "snailer-auth";

#[derive(Debug, Clone, Serialize, Deserialize)]
struct StoredAuth {
    access_token: String,
    refresh_token: String,
    account_id: String,
    email: String,
    name: String,
    expires_at: Option<i64>,
}

fn auth_keychain_entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_AUTH_KEY)
        .map_err(|e| format!("keychain init failed: {}", e))
}

fn auth_keychain_get() -> Result<Option<StoredAuth>, String> {
    let entry = auth_keychain_entry()?;
    match entry.get_password() {
        Ok(text) => {
            let v = serde_json::from_str::<StoredAuth>(&text)
                .map_err(|e| format!("keychain data invalid: {}", e))?;
            Ok(Some(v))
        }
        Err(e) => {
            let msg = e.to_string().to_lowercase();
            if msg.contains("no entry") || msg.contains("not found") || msg.contains("no such") {
                Ok(None)
            } else {
                Err(format!("keychain read failed: {}", e))
            }
        }
    }
}

fn auth_keychain_set(value: &StoredAuth) -> Result<(), String> {
    let entry = auth_keychain_entry()?;
    let text = serde_json::to_string(value).map_err(|e| format!("serialize failed: {}", e))?;
    entry
        .set_password(&text)
        .map_err(|e| format!("keychain write failed: {}", e))?;
    Ok(())
}

fn auth_keychain_clear() -> Result<(), String> {
    let entry = auth_keychain_entry()?;
    match entry.delete_password() {
        Ok(()) => Ok(()),
        Err(e) => {
            let msg = e.to_string().to_lowercase();
            if msg.contains("no entry") || msg.contains("not found") || msg.contains("no such") {
                Ok(())
            } else {
                Err(format!("keychain delete failed: {}", e))
            }
        }
    }
}

/// Get the configured auth server address persisted by this GUI (does not include env overrides).
#[tauri::command]
pub async fn auth_addr_get() -> Result<Option<String>, String> {
    Ok(read_gui_settings_auth_addr())
}

/// Set (or clear) the auth server address persisted by this GUI.
#[tauri::command]
pub async fn auth_addr_set(addr: Option<String>) -> Result<Option<String>, String> {
    match addr.as_deref() {
        Some(v) if !v.trim().is_empty() => {
            write_gui_settings_auth_addr(Some(v))?;
            Ok(Some(v.to_string()))
        }
        _ => {
            write_gui_settings_auth_addr(None)?;
            Ok(None)
        }
    }
}

/// Resolve the effective auth server address (env overrides > GUI setting > build default).
#[tauri::command]
pub async fn auth_addr_resolve() -> Result<String, String> {
    Ok(resolve_auth_addr()?)
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachmentSaveRequest {
    pub name: String,
    pub mime: String,
    pub data_base64: String,
}

fn ext_from_mime(mime: &str) -> Option<&'static str> {
    match mime {
        "image/png" => Some("png"),
        "image/jpeg" => Some("jpg"),
        "image/jpg" => Some("jpg"),
        "image/webp" => Some("webp"),
        "image/gif" => Some("gif"),
        "image/bmp" => Some("bmp"),
        _ => None,
    }
}

/// Save an uploaded image into `~/.snailer/gui_attachments` and return the file path.
#[tauri::command]
pub async fn attachment_save_image(req: AttachmentSaveRequest) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mime = req.mime.trim().to_lowercase();
        if !mime.starts_with("image/") {
            return Err("Only image attachments are supported.".to_string());
        }

        let dir = snailer_attachments_dir();
        std::fs::create_dir_all(&dir).map_err(|e| format!("mkdir failed: {}", e))?;

        let data = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, req.data_base64.trim())
            .map_err(|_| "Invalid base64 payload.".to_string())?;

        const MAX_BYTES: usize = 12 * 1024 * 1024;
        if data.is_empty() {
            return Err("Empty file.".to_string());
        }
        if data.len() > MAX_BYTES {
            return Err("Image is too large (max 12MB).".to_string());
        }

        let ext = ext_from_mime(&mime)
            .map(|s| s.to_string())
            .or_else(|| {
                let lower = req.name.to_lowercase();
                let ext = lower.rsplit('.').next().unwrap_or("");
                match ext {
                    "png" | "jpg" | "jpeg" | "webp" | "gif" | "bmp" => Some(ext.to_string()),
                    _ => None,
                }
            })
            .ok_or_else(|| "Unsupported image type.".to_string())?;

        let file_name = format!("{}.{}", uuid::Uuid::new_v4(), ext);
        let path = dir.join(file_name);
        std::fs::write(&path, data).map_err(|e| format!("write failed: {}", e))?;
        Ok(path.to_string_lossy().to_string())
    })
    .await
    .map_err(|e| format!("save task failed: {}", e))?
}

/// Ensure the Snailer npm CLI (`@felixaihub/snailer`) is installed for this user.
///
/// Installs into `~/.snailer/npm_cli` (not global) and returns the resolved CLI binary path.
#[tauri::command]
pub async fn snailer_cli_ensure_installed() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(|| {
        if let Ok(ok) = std::process::Command::new("snailer")
            .arg("--version")
            .output()
        {
            if ok.status.success() {
                return Ok("snailer".to_string());
            }
        }

        let prefix = snailer_cli_prefix_dir();
        if snailer_cli_is_installed(&prefix) {
            return Ok(snailer_cli_bin_path(&prefix).to_string_lossy().to_string());
        }

        std::fs::create_dir_all(&prefix).map_err(|e| format!("Failed to create install dir: {}", e))?;

        let npm_check = std::process::Command::new("npm")
            .arg("--version")
            .output()
            .map_err(|_| "npm not found. Please install Node.js (which includes npm) and try again.".to_string())?;
        if !npm_check.status.success() {
            return Err("npm is installed but not working. Please reinstall Node.js/npm and try again.".to_string());
        }

        let out = std::process::Command::new("npm")
            .current_dir(&prefix)
            .env("npm_config_update_notifier", "false")
            .args([
                "install",
                "--no-fund",
                "--no-audit",
                "--silent",
                "@felixaihub/snailer",
            ])
            .output()
            .map_err(|e| format!("Failed to run npm install: {}", e))?;

        if !out.status.success() {
            let mut msg = String::new();
            if !out.stdout.is_empty() {
                msg.push_str(&String::from_utf8_lossy(&out.stdout));
            }
            if !out.stderr.is_empty() {
                if !msg.is_empty() {
                    msg.push('\n');
                }
                msg.push_str(&String::from_utf8_lossy(&out.stderr));
            }
            let trimmed = msg.trim();
            let clipped = if trimmed.len() > 4000 {
                format!("{}...", &trimmed[..4000])
            } else {
                trimmed.to_string()
            };
            return Err(if clipped.is_empty() {
                "npm install failed (no output).".to_string()
            } else {
                format!("npm install failed:\n{}", clipped)
            });
        }

        if !snailer_cli_is_installed(&prefix) {
            return Err("npm install reported success, but Snailer CLI was not found after install.".to_string());
        }

        Ok(snailer_cli_bin_path(&prefix).to_string_lossy().to_string())
    })
    .await
    .map_err(|e| format!("Install task failed: {}", e))?
}

#[tauri::command]
pub async fn engine_start() -> Result<EngineStartResponse, String> {
    let mut guard = engine_state()
        .lock()
        .map_err(|_| "engine state lock poisoned".to_string())?;

    if let Some(ref st) = *guard {
        return Ok(EngineStartResponse {
            url: st.url.clone(),
            token: st.token.clone(),
            default_project_path: default_project_path().to_string_lossy().to_string(),
        });
    }

    // Shared-only: always use `~/.snailer/.env` so API keys are reusable across workspaces.
    let _ = ensure_shared_env_selected();

    let port = find_free_port().map_err(|e| format!("failed to pick free port: {}", e))?;
    let token = uuid::Uuid::new_v4().to_string();
    let url = format!("ws://127.0.0.1:{port}");

    let token_for_task = token.clone();
    std::thread::spawn(move || {
        let rt = match tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
        {
            Ok(rt) => rt,
            Err(e) => {
                log::error!("Failed to build daemon runtime: {e:?}");
                return;
            }
        };

        rt.block_on(async move {
            let daemon = snailer::daemon::SnailerDaemon::new(port, token_for_task);
            if let Err(e) = daemon.run().await {
                log::error!("Snailer daemon crashed: {e:?}");
            }
        });
    });

    *guard = Some(EngineState {
        url: url.clone(),
        token: token.clone(),
    });

    Ok(EngineStartResponse {
        url,
        token,
        default_project_path: default_project_path().to_string_lossy().to_string(),
    })
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub kind: String, // "file" | "dir"
}

fn should_skip(path: &Path) -> bool {
    let Some(name) = path.file_name().and_then(|s| s.to_str()) else {
        return false;
    };
    matches!(
        name,
        ".git" | "node_modules" | "target" | "dist" | "build" | ".snailer" | ".DS_Store"
    )
}

#[tauri::command]
pub async fn fs_list_tree(root: String, max_depth: usize) -> Result<Vec<FileNode>, String> {
    let root = PathBuf::from(root);
    if !root.is_dir() {
        return Err("root is not a directory".to_string());
    }

    let mut out = Vec::new();
    for entry in WalkDir::new(&root)
        .follow_links(false)
        .max_depth(max_depth.max(1))
        .into_iter()
        .filter_map(Result::ok)
    {
        let path = entry.path();
        if path == root {
            continue;
        }
        if should_skip(path) {
            continue;
        }
        if path.components().any(|c| should_skip(&PathBuf::from(c.as_os_str()))) {
            continue;
        }

        let kind = if entry.file_type().is_dir() { "dir" } else { "file" };
        let name = path
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or_default()
            .to_string();
        out.push(FileNode {
            name,
            path: path.to_string_lossy().to_string(),
            kind: kind.to_string(),
        });
    }

    Ok(out)
}

#[tauri::command]
pub async fn fs_read_text(path: String, max_bytes: usize) -> Result<String, String> {
    let path = PathBuf::from(path);
    let data = std::fs::read(&path).map_err(|e| format!("read failed: {}", e))?;
    let max = max_bytes.min(data.len()).max(0);
    let slice = &data[..max];
    String::from_utf8(slice.to_vec()).map_err(|_| "file is not valid utf-8".to_string())
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvFindResponse {
    pub found: bool,
    pub demonstrate_order: Vec<String>,
    pub selected_path: Option<String>,
    pub all_found_paths: Vec<String>,
}

fn find_env_in_ancestors(mut dir: PathBuf) -> Option<PathBuf> {
    loop {
        let p = dir.join(".env");
        if p.is_file() {
            return Some(p);
        }
        if let Some(parent) = dir.parent() {
            dir = parent.to_path_buf();
        } else {
            return None;
        }
    }
}

/// Locate which `.env` the CLI/daemon would *likely* load.
/// Mirrors the ordering used by `snailer`:
/// 1) `SNAILER_ENV_FILE` (if set)
/// 2) `<projectPath>/.env`
/// 3) `.env` in project path ancestors (so selecting a subfolder still finds the repo root `.env`)
/// 4) `.env` in current working directory ancestors
/// 5) `.env` in executable path ancestors
#[tauri::command]
pub async fn env_find(project_path: String) -> Result<EnvFindResponse, String> {
    let mut demonstrate_order = Vec::new();
    let mut all_found_paths: Vec<String> = Vec::new();

    // 1) SNAILER_ENV_FILE
    if let Ok(custom) = std::env::var("SNAILER_ENV_FILE") {
        demonstrate_order.push(format!("SNAILER_ENV_FILE={}", custom));
        let p = PathBuf::from(custom);
        if p.is_file() {
            let s = p.to_string_lossy().to_string();
            all_found_paths.push(s.clone());
            return Ok(EnvFindResponse {
                found: true,
                demonstrate_order,
                selected_path: Some(s.clone()),
                all_found_paths,
            });
        }
    } else {
        demonstrate_order.push("SNAILER_ENV_FILE=<unset>".to_string());
    }

    // 2) projectPath/.env
    if !project_path.trim().is_empty() {
        let root = PathBuf::from(project_path);
        demonstrate_order.push(format!("projectPath/.env={}", root.join(".env").display()));
        let p = root.join(".env");
        if p.is_file() {
            let s = p.to_string_lossy().to_string();
            all_found_paths.push(s.clone());
            return Ok(EnvFindResponse {
                found: true,
                demonstrate_order,
                selected_path: Some(s.clone()),
                all_found_paths,
            });
        }

        // 3) projectPath ancestors (matches dotenv behavior when running in a subdir)
        demonstrate_order.push(format!("projectPath ancestors from {}", root.display()));
        if let Some(p) = find_env_in_ancestors(root) {
            let s = p.to_string_lossy().to_string();
            all_found_paths.push(s.clone());
            return Ok(EnvFindResponse {
                found: true,
                demonstrate_order,
                selected_path: Some(s.clone()),
                all_found_paths,
            });
        }
    }

    // 4) current working directory ancestors
    if let Ok(cwd) = std::env::current_dir() {
        demonstrate_order.push(format!("cwd ancestors from {}", cwd.display()));
        if let Some(p) = find_env_in_ancestors(cwd) {
            let s = p.to_string_lossy().to_string();
            all_found_paths.push(s.clone());
            return Ok(EnvFindResponse {
                found: true,
                demonstrate_order,
                selected_path: Some(s.clone()),
                all_found_paths,
            });
        }
    } else {
        demonstrate_order.push("cwd=<unavailable>".to_string());
    }

    // 5) executable path ancestors
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            demonstrate_order.push(format!("exe ancestors from {}", dir.display()));
            if let Some(p) = find_env_in_ancestors(dir.to_path_buf()) {
                let s = p.to_string_lossy().to_string();
                all_found_paths.push(s.clone());
                return Ok(EnvFindResponse {
                    found: true,
                    demonstrate_order,
                    selected_path: Some(s.clone()),
                    all_found_paths,
                });
            }
        } else {
            demonstrate_order.push("exe parent=<unavailable>".to_string());
        }
    } else {
        demonstrate_order.push("exe=<unavailable>".to_string());
    }

    Ok(EnvFindResponse {
        found: false,
        demonstrate_order,
        selected_path: None,
        all_found_paths,
    })
}

/// Ensure `<projectPath>/.env` exists (creates an empty file if missing).
#[tauri::command]
pub async fn env_ensure_file(project_path: String) -> Result<String, String> {
    let root = PathBuf::from(project_path);
    if !root.is_dir() {
        return Err("projectPath is not a directory".to_string());
    }
    let env_path = root.join(".env");
    if env_path.exists() {
        return Ok(env_path.to_string_lossy().to_string());
    }
    std::fs::write(&env_path, b"").map_err(|e| format!("write failed: {}", e))?;
    Ok(env_path.to_string_lossy().to_string())
}

/// Ensure an `.env` file exists at an explicit path (creates an empty file if missing).
#[tauri::command]
pub async fn env_ensure_file_at_path(path: String) -> Result<String, String> {
    let env_path = PathBuf::from(path);
    let parent = env_path
        .parent()
        .ok_or_else(|| "env path has no parent directory".to_string())?;
    std::fs::create_dir_all(parent).map_err(|e| format!("mkdir failed: {}", e))?;
    if env_path.exists() {
        return Ok(env_path.to_string_lossy().to_string());
    }
    std::fs::write(&env_path, b"").map_err(|e| format!("write failed: {}", e))?;
    Ok(env_path.to_string_lossy().to_string())
}

// ============================================================================
// Budget Commands (Starter plan tuning)
// ============================================================================

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BudgetStatusResponse {
    pub plan: String,
    pub is_starter: bool,
    pub env_main_override: Option<f32>,
    pub main_limit_usd: f32,
    pub main_spent_usd: f32,
    pub minimax_limit_usd: f32,
    pub minimax_spent_usd: f32,
    pub month: u32,
    pub year: i32,
}

#[tauri::command]
pub async fn budget_get_status() -> Result<BudgetStatusResponse, String> {
    use chrono::Datelike;
    use snailer::analytics::budget_monitor::BudgetMonitor;

    let plan = std::env::var("SNAILER_PLAN").unwrap_or_else(|_| "starter".to_string());
    let is_starter = plan.to_lowercase() == "starter";
    let env_main_override = std::env::var("SNAILER_BUDGET_MAIN")
        .ok()
        .and_then(|v| v.parse::<f32>().ok());

    let monitor = BudgetMonitor::from_env();
    let stats = monitor.stats();
    let now = chrono::Utc::now();

    Ok(BudgetStatusResponse {
        plan,
        is_starter,
        env_main_override,
        main_limit_usd: stats.main_limit,
        main_spent_usd: stats.main_spent,
        minimax_limit_usd: monitor.minimax_limit(),
        minimax_spent_usd: monitor.minimax_spent(),
        month: now.month(),
        year: now.year(),
    })
}

#[tauri::command]
pub async fn budget_set_main_limit(main_limit_usd: f32) -> Result<BudgetStatusResponse, String> {
    use snailer::analytics::budget_monitor::BudgetMonitor;

    if !main_limit_usd.is_finite() || main_limit_usd < 0.0 {
        return Err("mainLimitUsd must be a non-negative number".to_string());
    }

    BudgetMonitor::update_persisted_main_limit(main_limit_usd);

    // Return refreshed snapshot
    budget_get_status().await
}

fn format_env_value(value: &str) -> String {
    // Keep simple values unquoted; quote when whitespace or comment char could break parsing.
    let needs_quotes = value.chars().any(|c| c.is_whitespace() || c == '#');
    if !needs_quotes {
        return value.to_string();
    }
    let escaped = value.replace('\\', "\\\\").replace('"', "\\\"");
    format!("\"{}\"", escaped)
}

/// Upsert a single key into `<projectPath>/.env` (creates the file if missing).
#[tauri::command]
pub async fn env_upsert_key(project_path: String, env_var: String, value: String) -> Result<String, String> {
    let root = PathBuf::from(project_path);
    if !root.is_dir() {
        return Err("projectPath is not a directory".to_string());
    }
    if env_var.trim().is_empty() {
        return Err("envVar is empty".to_string());
    }

    let env_path = root.join(".env");
    let existing = std::fs::read_to_string(&env_path).unwrap_or_default();
    let mut lines: Vec<String> = existing.split('\n').map(|s| s.trim_end_matches('\r').to_string()).collect();

    let mut updated = false;
    for line in lines.iter_mut() {
        let raw = line.clone();
        let trimmed_start = raw.trim_start();
        if trimmed_start.starts_with('#') || trimmed_start.is_empty() {
            continue;
        }

        let (export_prefix, rest) = if let Some(after) = trimmed_start.strip_prefix("export ") {
            ("export ", after.trim_start())
        } else {
            ("", trimmed_start)
        };

        if let Some(after_key) = rest.strip_prefix(env_var.as_str()) {
            let after_key = after_key.trim_start();
            if after_key.starts_with('=') {
                let indent_len = raw.len().saturating_sub(trimmed_start.len());
                let indent = &raw[..indent_len];
                *line = format!(
                    "{}{}{}={}",
                    indent,
                    export_prefix,
                    env_var.trim(),
                    format_env_value(value.trim())
                );
                updated = true;
                break;
            }
        }
    }

    if !updated {
        if !lines.is_empty() && lines.last().is_some_and(|l| !l.is_empty()) {
            lines.push(String::new());
        }
        lines.push(format!("{}={}", env_var.trim(), format_env_value(value.trim())));
    }

    let mut out = lines.join("\n");
    if !out.ends_with('\n') {
        out.push('\n');
    }
    std::fs::write(&env_path, out).map_err(|e| format!("write failed: {}", e))?;

    Ok(env_path.to_string_lossy().to_string())
}

/// Upsert a single key into an explicit `.env` path (creates the file if missing).
#[tauri::command]
pub async fn env_upsert_key_at_path(path: String, env_var: String, value: String) -> Result<String, String> {
    let env_path = PathBuf::from(path);
    if env_var.trim().is_empty() {
        return Err("envVar is empty".to_string());
    }
    let parent = env_path
        .parent()
        .ok_or_else(|| "env path has no parent directory".to_string())?;
    if !parent.is_dir() {
        return Err("env path parent is not a directory".to_string());
    }

    let existing = std::fs::read_to_string(&env_path).unwrap_or_default();
    let mut lines: Vec<String> = existing
        .split('\n')
        .map(|s| s.trim_end_matches('\r').to_string())
        .collect();

    let mut updated = false;
    for line in lines.iter_mut() {
        let raw = line.clone();
        let trimmed_start = raw.trim_start();
        if trimmed_start.starts_with('#') || trimmed_start.is_empty() {
            continue;
        }

        let (export_prefix, rest) = if let Some(after) = trimmed_start.strip_prefix("export ") {
            ("export ", after.trim_start())
        } else {
            ("", trimmed_start)
        };

        if let Some(after_key) = rest.strip_prefix(env_var.as_str()) {
            let after_key = after_key.trim_start();
            if after_key.starts_with('=') {
                let indent_len = raw.len().saturating_sub(trimmed_start.len());
                let indent = &raw[..indent_len];
                *line = format!(
                    "{}{}{}={}",
                    indent,
                    export_prefix,
                    env_var.trim(),
                    format_env_value(value.trim())
                );
                updated = true;
                break;
            }
        }
    }

    if !updated {
        if !lines.is_empty() && lines.last().is_some_and(|l| !l.is_empty()) {
            lines.push(String::new());
        }
        lines.push(format!("{}={}", env_var.trim(), format_env_value(value.trim())));
    }

    let mut out = lines.join("\n");
    if !out.ends_with('\n') {
        out.push('\n');
    }
    std::fs::write(&env_path, out).map_err(|e| format!("write failed: {}", e))?;

    Ok(env_path.to_string_lossy().to_string())
}

/// Ensure a line exists in `<projectPath>/.gitignore` (creates the file if missing).
#[tauri::command]
pub async fn gitignore_ensure_line(project_path: String, line: String) -> Result<String, String> {
    let root = PathBuf::from(project_path);
    if !root.is_dir() {
        return Err("projectPath is not a directory".to_string());
    }
    let needle = line.trim();
    if needle.is_empty() {
        return Err("line is empty".to_string());
    }

    let path = root.join(".gitignore");
    let existing = std::fs::read_to_string(&path).unwrap_or_default();
    let has = existing
        .lines()
        .map(|l| l.trim())
        .any(|l| !l.is_empty() && l == needle);

    if !has {
        let mut out = existing;
        if !out.is_empty() && !out.ends_with('\n') {
            out.push('\n');
        }
        out.push_str(needle);
        out.push('\n');
        std::fs::write(&path, out).map_err(|e| format!("write failed: {}", e))?;
    }

    Ok(path.to_string_lossy().to_string())
}

/// Opens a native folder picker dialog
#[tauri::command]
pub async fn pick_folder() -> Result<Option<String>, String> {
    // Use rfd for cross-platform native dialog
    use std::sync::mpsc;

    let (tx, rx) = mpsc::channel();

    // Must run on main thread for macOS
    std::thread::spawn(move || {
        let result = rfd::FileDialog::new()
            .set_title("Select Project Folder")
            .pick_folder();

        let _ = tx.send(result.map(|p| p.to_string_lossy().to_string()));
    });

    rx.recv()
        .map_err(|_| "dialog cancelled".to_string())
}

// ============================================================================
// Auth Commands
// ============================================================================

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceCodeResponse {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub verification_uri_complete: String,
    pub expires_in: i32,
    pub interval: i32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TokenResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub account_id: String,
    pub email: String,
    pub name: String,
    pub expires_in: i32,
}

fn auth_state() -> &'static Mutex<Option<DeviceCodeResponse>> {
    static STATE: OnceLock<Mutex<Option<DeviceCodeResponse>>> = OnceLock::new();
    STATE.get_or_init(|| Mutex::new(None))
}

fn get_auth_addr() -> Result<String, String> {
    resolve_auth_addr()
}

/// Start device login flow - returns device code info for user to complete auth in browser
#[tauri::command]
pub async fn auth_start_device_login() -> Result<DeviceCodeResponse, String> {
    use snailer::auth::pb;

    let auth_addr = get_auth_addr()?;

    // Build channel
    let channel = build_auth_channel(&auth_addr)
        .await
        .map_err(|e| format!("Failed to connect to auth server: {}", e))?;

    let mut client = pb::device_auth_service_client::DeviceAuthServiceClient::new(channel);

    // Create device code
    let req = pb::CreateDeviceCodeRequest {
        client_id: "snailer-cli".to_string(),
        scope: "read write".to_string(),
        idempotency_key: uuid::Uuid::new_v4().to_string(),
        user_agent: format!("snailer-gui/{}", env!("CARGO_PKG_VERSION")),
    };

    let mut creq = tonic::Request::new(req);
    creq.set_timeout(Duration::from_secs(10));

    let resp = client
        .create_device_code(creq)
        .await
        .map_err(|e| format!("Failed to create device code: {}", e))?
        .into_inner();

    let device_code_resp = DeviceCodeResponse {
        device_code: resp.device_code.clone(),
        user_code: resp.user_code,
        verification_uri: resp.verification_uri,
        verification_uri_complete: resp.verification_uri_complete,
        expires_in: resp.expires_in,
        interval: if resp.interval > 0 { resp.interval } else { 5 },
    };

    // Store device code for polling
    if let Ok(mut guard) = auth_state().lock() {
        *guard = Some(device_code_resp.clone());
    }

    // Try to open browser
    #[cfg(target_os = "macos")]
    {
        let url = device_code_resp.verification_uri_complete.clone();
        let _ = std::process::Command::new("open").arg(&url).spawn();
    }
    #[cfg(target_os = "linux")]
    {
        let url = device_code_resp.verification_uri_complete.clone();
        let _ = std::process::Command::new("xdg-open").arg(&url).spawn();
    }
    #[cfg(target_os = "windows")]
    {
        let url = device_code_resp.verification_uri_complete.clone();
        let _ = std::process::Command::new("cmd")
            .args(["/C", "start", &url])
            .spawn();
    }

    Ok(device_code_resp)
}

/// Poll for device token after user completes browser auth
#[tauri::command]
pub async fn auth_poll_device_token(device_code: String) -> Result<TokenResponse, String> {
    use snailer::auth::pb;

    let auth_addr = get_auth_addr()?;

    let channel = build_auth_channel(&auth_addr)
        .await
        .map_err(|e| format!("Failed to connect to auth server: {}", e))?;

    let mut client = pb::device_auth_service_client::DeviceAuthServiceClient::new(channel);

    let poll = pb::PollDeviceTokenRequest {
        device_code,
        client_id: "snailer-cli".to_string(),
    };

    let mut preq = tonic::Request::new(poll);
    preq.set_timeout(Duration::from_secs(5));

    match client.poll_device_token(preq).await {
        Ok(ok) => {
            let t = ok.into_inner();
            let now = chrono::Utc::now().timestamp();
            let expires_at = now + (t.expires_in as i64);

            // Store tokens in OS keychain / secure storage
            auth_keychain_set(&StoredAuth {
                access_token: t.access_token.clone(),
                refresh_token: t.refresh_token.clone(),
                account_id: t.account_id.clone(),
                email: t.email.clone(),
                name: t.name.clone(),
                expires_at: Some(expires_at),
            })
            .map_err(|e| format!("Failed to store credentials in OS keychain: {}", e))?;

            // Save tokens using snailer's UserAuth
            if let Ok(mut ua) = snailer::user_auth::UserAuth::load() {
                ua.access_token = Some(t.access_token.clone());
                ua.refresh_token = Some(t.refresh_token.clone());
                ua.account_id = Some(t.account_id.clone());
                ua.email = Some(t.email.clone());
                ua.name = Some(t.name.clone());
                ua.expires_at = Some(
                    (chrono::Utc::now() + chrono::Duration::seconds(t.expires_in as i64))
                        .timestamp(),
                );
                let _ = ua.save();
            }

            // Also write to account config
            let _ = snailer::account_config::write_config(
                &t.account_id,
                &t.email,
                &t.access_token,
                "cloud",
            );

            // Clear stored device code
            if let Ok(mut guard) = auth_state().lock() {
                *guard = None;
            }

            Ok(TokenResponse {
                access_token: t.access_token,
                refresh_token: t.refresh_token,
                account_id: t.account_id,
                email: t.email,
                name: t.name,
                expires_in: t.expires_in,
            })
        }
        Err(status) => {
            use tonic::Code;
            match status.code() {
                Code::FailedPrecondition => {
                    let msg = status.message().to_string();
                    if msg.contains("authorization_pending") {
                        Err("authorization_pending".to_string())
                    } else if msg.contains("expired_token") {
                        Err("expired_token".to_string())
                    } else {
                        Err(format!("Precondition failed: {}", msg))
                    }
                }
                Code::ResourceExhausted => Err("slow_down".to_string()),
                Code::Unauthenticated => Err("Invalid client".to_string()),
                _ => Err(format!("Error polling token: {}", status)),
            }
        }
    }
}

/// Set API key directly (for users who prefer API key auth)
#[tauri::command]
pub async fn auth_set_api_key(api_key: String) -> Result<(), String> {
    auth_keychain_set(&StoredAuth {
        access_token: api_key.clone(),
        refresh_token: String::new(),
        account_id: String::new(),
        email: "API Key User".to_string(),
        name: "API Key".to_string(),
        expires_at: None,
    })
    .map_err(|e| format!("Failed to store credentials in OS keychain: {}", e))?;

    // Save API key to snailer config
    let mut ua = snailer::user_auth::UserAuth::load().unwrap_or_default();
    ua.access_token = Some(api_key.clone());
    ua.email = Some("API Key User".to_string());
    ua.name = Some("API Key".to_string());
    ua.save().map_err(|e| format!("Failed to save API key: {}", e))?;

    Ok(())
}

/// Logout - clear stored auth
#[tauri::command]
pub async fn auth_logout() -> Result<(), String> {
    let _ = auth_keychain_clear();

    // Clear UserAuth
    let ua = snailer::user_auth::UserAuth::default();
    ua.save().map_err(|e| format!("Failed to clear auth: {}", e))?;

    // Clear account config (matches CLI `/account` → Logout behavior)
    if let Err(e) = snailer::account_config::clear_config() {
        log::warn!("Failed to clear account config: {e:?}");
    }

    // Clear device code state
    if let Ok(mut guard) = auth_state().lock() {
        *guard = None;
    }

    Ok(())
}

/// Check if user is logged in
#[tauri::command]
pub async fn auth_check() -> Result<Option<TokenResponse>, String> {
    if let Ok(Some(st)) = auth_keychain_get() {
        if let Some(expires_at) = st.expires_at {
            let now = chrono::Utc::now().timestamp();
            if now > expires_at {
                let _ = auth_keychain_clear();
                return Ok(None);
            }
            return Ok(Some(TokenResponse {
                access_token: st.access_token,
                refresh_token: st.refresh_token,
                account_id: st.account_id,
                email: st.email,
                name: st.name,
                expires_in: (expires_at - now).max(0) as i32,
            }));
        }

        return Ok(Some(TokenResponse {
            access_token: st.access_token,
            refresh_token: st.refresh_token,
            account_id: st.account_id,
            email: st.email,
            name: st.name,
            expires_in: 0,
        }));
    }

    match snailer::user_auth::UserAuth::load() {
        Ok(ua) => {
            if let Some(ref token) = ua.access_token {
                // Check expiration
                if let Some(expires_at) = ua.expires_at {
                    let now = chrono::Utc::now().timestamp();
                    if now > expires_at {
                        return Ok(None); // Expired
                    }
                }

                let now = chrono::Utc::now().timestamp();
                let expires_at = ua.expires_at;
                let expires_in = expires_at.map(|e| (e - now).max(0) as i32).unwrap_or(0);
                let resp = TokenResponse {
                    access_token: token.clone(),
                    refresh_token: ua.refresh_token.clone().unwrap_or_default(),
                    account_id: ua.account_id.clone().unwrap_or_default(),
                    email: ua.email.clone().unwrap_or_default(),
                    name: ua.name.clone().unwrap_or_default(),
                    expires_in,
                };

                // Best-effort migration to keychain.
                let _ = auth_keychain_set(&StoredAuth {
                    access_token: resp.access_token.clone(),
                    refresh_token: resp.refresh_token.clone(),
                    account_id: resp.account_id.clone(),
                    email: resp.email.clone(),
                    name: resp.name.clone(),
                    expires_at,
                });

                Ok(Some(resp))
            } else {
                Ok(None)
            }
        }
        Err(_) => Ok(None),
    }
}

async fn build_auth_channel(
    addr: &str,
) -> Result<tonic::transport::Channel, Box<dyn std::error::Error + Send + Sync>> {
    use tonic::transport::{Certificate, ClientTlsConfig, Endpoint};

    let insecure = std::env::var("SNAILER_GRPC_INSECURE").unwrap_or_default() == "1";
    let ca_path = std::env::var("SNAILER_GRPC_CA_CERT")
        .ok()
        .or_else(|| std::env::var("USAGE_GRPC_CA_CERT").ok());
    let domain_override = std::env::var("SNAILER_GRPC_DOMAIN").ok();

    let has_scheme = addr.starts_with("http://") || addr.starts_with("https://");
    let url = if has_scheme {
        addr.to_string()
    } else if insecure {
        format!("http://{}", addr)
    } else {
        format!("https://{}", addr)
    };

    let host_for_sni = domain_override.or_else(|| {
        url.split("//")
            .nth(1)
            .map(|rest| rest.split('/').next().unwrap_or(rest))
            .map(|hostport| hostport.split(':').next().unwrap_or(hostport).to_string())
    });

    let mut ep = Endpoint::from_shared(url)?
        .connect_timeout(Duration::from_secs(10))
        .timeout(Duration::from_secs(30));

    if !insecure {
        let mut cfg = ClientTlsConfig::new();
        if let Some(host) = host_for_sni.clone() {
            cfg = cfg.domain_name(host);
        }
        if let Some(p) = ca_path {
            if let Ok(pem) = std::fs::read(p) {
                cfg = cfg.ca_certificate(Certificate::from_pem(pem));
            }
        } else if let Some(pem) = load_system_ca_bundle() {
            cfg = cfg.ca_certificate(Certificate::from_pem(pem));
        }
        ep = ep.tls_config(cfg)?;
    }

    Ok(ep.connect().await?)
}

fn load_system_ca_bundle() -> Option<Vec<u8>> {
    let candidates = [
        "/etc/ssl/certs/ca-certificates.crt",
        "/etc/pki/tls/certs/ca-bundle.crt",
        "/etc/ssl/ca-bundle.pem",
        "/usr/local/etc/openssl/cert.pem",
        "/etc/ssl/cert.pem",
    ];
    for p in candidates {
        if let Ok(b) = std::fs::read(p) {
            return Some(b);
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn picks_free_port() {
        let port = find_free_port().expect("port");
        assert!(port > 0);
    }

    #[test]
    fn default_project_path_is_absoluteish() {
        let p = default_project_path();
        assert!(!p.to_string_lossy().is_empty());
    }
}
