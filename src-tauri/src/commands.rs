use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;
use walkdir::WalkDir;

/// LLM API response with token usage information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmCompletionResponse {
    pub content: String,
    pub model: String,
    pub input_tokens: u64,
    pub output_tokens: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct GitHubCliStatusResponse {
    pub installed: bool,
    pub version: Option<String>,
    pub auth: String, // "ok" | "not_logged_in" | "unknown"
    pub auth_output: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct EngineStartResponse {
    pub url: String,
    pub token: String,
    pub default_project_path: String,
}

fn run_cmd_capture(cmd: &str, args: &[&str], cwd: Option<&str>) -> Result<(i32, String), String> {
    let mut c = std::process::Command::new(cmd);
    c.args(args);
    // macOS .app bundles have a limited PATH; inject common tool locations
    let current_path = std::env::var("PATH").unwrap_or_default();
    let extra_dirs = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"];
    let mut full_path = current_path.clone();
    for dir in &extra_dirs {
        if !current_path.contains(dir) {
            full_path = format!("{}:{}", dir, full_path);
        }
    }
    c.env("PATH", &full_path);
    if let Some(dir) = cwd {
        if !dir.trim().is_empty() {
            c.current_dir(dir);
        }
    }
    let out = c.output().map_err(|e| format!("Failed to run {cmd}: {e}"))?;
    let code = out.status.code().unwrap_or(-1);
    let mut text = String::new();
    if !out.stdout.is_empty() {
        text.push_str(&String::from_utf8_lossy(&out.stdout));
    }
    if !out.stderr.is_empty() {
        if !text.is_empty() && !text.ends_with('\n') {
            text.push('\n');
        }
        text.push_str(&String::from_utf8_lossy(&out.stderr));
    }
    Ok((code, text.trim().to_string()))
}

#[tauri::command]
pub fn github_cli_status(cwd: Option<String>) -> Result<GitHubCliStatusResponse, String> {
    let cwd_ref = cwd.as_deref();

    // 1) gh --version (installed?)
    let version_out = std::process::Command::new("gh")
        .arg("--version")
        .output();

    let Ok(version_out) = version_out else {
        return Ok(GitHubCliStatusResponse {
            installed: false,
            version: None,
            auth: "unknown".to_string(),
            auth_output: None,
        });
    };

    let installed = version_out.status.success();
    let version_text = String::from_utf8_lossy(&version_out.stdout).lines().next().unwrap_or("").trim().to_string();
    let version = if version_text.is_empty() { None } else { Some(version_text) };

    if !installed {
        return Ok(GitHubCliStatusResponse {
            installed: false,
            version,
            auth: "unknown".to_string(),
            auth_output: None,
        });
    }

    // 2) gh auth status
    let (_code, auth_text) = run_cmd_capture("gh", &["auth", "status", "-h", "github.com"], cwd_ref)?;
    let auth_lower = auth_text.to_lowercase();
    let auth = if auth_lower.contains("logged in to github.com") || auth_lower.contains("authenticated") {
        "ok"
    } else if auth_lower.contains("not logged") || auth_lower.contains("no github hosts") {
        "not_logged_in"
    } else {
        "unknown"
    };

    Ok(GitHubCliStatusResponse {
        installed: true,
        version,
        auth: auth.to_string(),
        auth_output: if auth_text.is_empty() { None } else { Some(auth_text) },
    })
}

#[derive(Debug)]
struct EngineState {
    url: String,
    token: String,
    child: Option<std::process::Child>,
}

fn engine_state() -> &'static Mutex<Option<EngineState>> {
    static STATE: OnceLock<Mutex<Option<EngineState>>> = OnceLock::new();
    STATE.get_or_init(|| Mutex::new(None))
}

fn find_free_port() -> std::io::Result<u16> {
    let listener = std::net::TcpListener::bind("127.0.0.1:0")?;
    Ok(listener.local_addr()?.port())
}

fn wait_for_port(port: u16, timeout: Duration) -> Result<(), String> {
    let start = std::time::Instant::now();
    let addr = format!("127.0.0.1:{port}");
    while start.elapsed() < timeout {
        if std::net::TcpStream::connect(&addr).is_ok() {
            return Ok(());
        }
        std::thread::sleep(Duration::from_millis(50));
    }
    Err(format!("Timed out waiting for Snailer daemon to listen on {addr}"))
}

fn default_project_path() -> PathBuf {
    // Try current working directory first (likely the project root)
    if let Ok(cwd) = std::env::current_dir() {
        // Check if it looks like a git repo
        if cwd.join(".git").exists() {
            return cwd;
        }
    }
    // Fallback to home directory
    home_dir()
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

fn snailer_node_root_dir() -> PathBuf {
    snailer_home_dir().join("node")
}

fn snailer_node_current_dir() -> PathBuf {
    snailer_node_root_dir().join("current")
}

fn snailer_node_current_bin_dir() -> PathBuf {
    snailer_node_current_dir().join("bin")
}

fn prepend_path(dir: &Path) -> String {
    let dir = dir.to_string_lossy();
    let old = std::env::var("PATH").unwrap_or_default();
    if old.is_empty() {
        dir.to_string()
    } else {
        format!("{}:{}", dir, old)
    }
}

fn node_platform_string() -> Result<&'static str, String> {
    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;
    match (os, arch) {
        ("macos", "aarch64") => Ok("darwin-arm64"),
        ("macos", "x86_64") => Ok("darwin-x64"),
        ("linux", "x86_64") => Ok("linux-x64"),
        ("linux", "aarch64") => Ok("linux-arm64"),
        ("windows", "x86_64") => Ok("win-x64"),
        ("windows", "aarch64") => Ok("win-arm64"),
        _ => Err(format!("Unsupported platform for auto Node install: {os}/{arch}")),
    }
}

fn detect_latest_lts_node_version() -> Option<String> {
    // Best-effort: fetch Node.js dist index and pick first LTS entry.
    // Falls back to a pinned version if this fails.
    let resp = ureq::get("https://nodejs.org/dist/index.json").call().ok()?;
    let mut body = String::new();
    resp.into_reader().read_to_string(&mut body).ok()?;
    let v: serde_json::Value = serde_json::from_str(&body).ok()?;
    let arr = v.as_array()?;
    for item in arr {
        let lts = item.get("lts")?;
        if lts.is_boolean() && !lts.as_bool().unwrap_or(false) {
            continue;
        }
        // Node uses `false` for non-LTS, otherwise string/bool.
        if lts.is_null() {
            continue;
        }
        if lts.is_boolean() && lts.as_bool().unwrap_or(false) == false {
            continue;
        }
        let ver = item.get("version")?.as_str()?.trim().to_string();
        if ver.starts_with('v') {
            return Some(ver);
        }
    }
    None
}

fn install_node_if_needed() -> Result<PathBuf, String> {
    let bin = snailer_node_current_bin_dir();
    let npm = if cfg!(target_os = "windows") {
        bin.join("npm.cmd")
    } else {
        bin.join("npm")
    };
    let node = if cfg!(target_os = "windows") {
        bin.join("node.exe")
    } else {
        bin.join("node")
    };
    if npm.is_file() && node.is_file() {
        return Ok(bin);
    }

    let version = detect_latest_lts_node_version().unwrap_or_else(|| "v20.11.1".to_string());
    let platform = node_platform_string()?;

    let root = snailer_node_root_dir();
    std::fs::create_dir_all(&root).map_err(|e| format!("mkdir failed: {}", e))?;
    let cache_dir = root.join("cache");
    std::fs::create_dir_all(&cache_dir).map_err(|e| format!("mkdir failed: {}", e))?;

    let file_name = format!("node-{}-{}.tar.gz", version, platform);
    let url = format!("https://nodejs.org/dist/{}/{}", version, file_name);
    let archive_path = cache_dir.join(&file_name);

    // Download
    let resp = ureq::get(&url)
        .call()
        .map_err(|e| format!("Failed to download Node.js: {e}"))?;
    let mut reader = resp.into_reader();
    let mut out = std::fs::File::create(&archive_path).map_err(|e| format!("write failed: {e}"))?;
    std::io::copy(&mut reader, &mut out).map_err(|e| format!("download write failed: {e}"))?;

    // Extract to a temp dir, then move into `current`
    let tmp = root.join(format!("tmp-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&tmp).map_err(|e| format!("mkdir failed: {}", e))?;
    let status = std::process::Command::new("tar")
        .arg("-xzf")
        .arg(&archive_path)
        .arg("-C")
        .arg(&tmp)
        .status()
        .map_err(|e| format!("Failed to run tar: {e}"))?;
    if !status.success() {
        return Err("Failed to extract Node.js archive (tar)".to_string());
    }

    let extracted = tmp.join(format!("node-{}-{}", version, platform));
    if !extracted.is_dir() {
        return Err("Node.js archive extracted but expected directory was not found.".to_string());
    }

    let current = snailer_node_current_dir();
    if current.exists() {
        let _ = std::fs::remove_dir_all(&current);
    }
    std::fs::rename(&extracted, &current).map_err(|e| format!("install failed: {}", e))?;
    let _ = std::fs::remove_dir_all(&tmp);

    let bin = snailer_node_current_bin_dir();
    let npm = if cfg!(target_os = "windows") {
        bin.join("npm.cmd")
    } else {
        bin.join("npm")
    };
    if !npm.is_file() {
        return Err("Node.js installed but npm was not found.".to_string());
    }
    Ok(bin)
}

fn resolve_npm_command() -> Result<(String, Option<PathBuf>), String> {
    // First try system npm.
    if let Ok(out) = std::process::Command::new("npm").arg("--version").output() {
        if out.status.success() {
            return Ok(("npm".to_string(), None));
        }
    }

    // Fallback: install bundled Node/npm under ~/.snailer/node/current
    let bin = install_node_if_needed()?;
    let npm_path = if cfg!(target_os = "windows") {
        bin.join("npm.cmd")
    } else {
        bin.join("npm")
    };
    Ok((npm_path.to_string_lossy().to_string(), Some(bin)))
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
        .join("@snailer-team")
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

/// Ensure the Snailer npm CLI (`@snailer-team/snailer`) is installed for this user.
///
/// Installs into `~/.snailer/npm_cli` (not global) and returns the resolved CLI binary path.
#[tauri::command]
pub async fn snailer_cli_ensure_installed() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let (npm_cmd, maybe_node_bin) = resolve_npm_command()?;

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

        // Ensure package.json exists so npm installs into this directory
        let pkg_json = prefix.join("package.json");
        if !pkg_json.is_file() {
            std::fs::write(&pkg_json, "{\"private\":true}")
                .map_err(|e| format!("Failed to create package.json: {}", e))?;
        }

        let mut npm_check = std::process::Command::new(&npm_cmd);
        if let Some(bin) = maybe_node_bin.as_ref() {
            npm_check.env("PATH", prepend_path(bin));
        }
        let npm_check = npm_check
            .arg("--version")
            .output()
            .map_err(|_| "npm not found and auto-install failed. Please install Node.js (which includes npm) and try again.".to_string())?;
        if !npm_check.status.success() {
            return Err("npm is installed but not working. Please reinstall Node.js/npm and try again.".to_string());
        }

        let mut out_cmd = std::process::Command::new(&npm_cmd);
        if let Some(bin) = maybe_node_bin.as_ref() {
            out_cmd.env("PATH", prepend_path(bin));
        }
        let out = out_cmd
            .current_dir(&prefix)
            .env("npm_config_update_notifier", "false")
            .args([
                "install",
                "--no-fund",
                "--no-audit",
                "@snailer-team/snailer",
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
            let expected_bin = snailer_cli_bin_path(&prefix);
            let expected_pkg = prefix.join("node_modules").join("@snailer-team").join("snailer").join("package.json");
            let mut diag = format!(
                "npm install reported success, but Snailer CLI was not found after install.\n\
                 Expected binary: {}\n\
                 Binary exists: {}\n\
                 package.json exists: {}",
                expected_bin.display(),
                expected_bin.is_file(),
                expected_pkg.is_file(),
            );
            // Capture npm output for debugging
            let stdout_str = String::from_utf8_lossy(&out.stdout);
            let stderr_str = String::from_utf8_lossy(&out.stderr);
            if !stdout_str.trim().is_empty() {
                diag.push_str(&format!("\nnpm stdout: {}", &stdout_str[..stdout_str.len().min(2000)]));
            }
            if !stderr_str.trim().is_empty() {
                diag.push_str(&format!("\nnpm stderr: {}", &stderr_str[..stderr_str.len().min(2000)]));
            }
            return Err(diag);
        }

        Ok(snailer_cli_bin_path(&prefix).to_string_lossy().to_string())
    })
    .await
    .map_err(|e| format!("Install task failed: {}", e))?
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SnailerCliStatus {
    pub installed: bool,
    pub cli_path: Option<String>,
    pub npm_available: bool,
    pub using_bundled_node: bool,
    pub bundled_node_path: Option<String>,
    pub prefix_dir: String,
}

#[tauri::command]
pub async fn snailer_cli_status() -> Result<SnailerCliStatus, String> {
    tauri::async_runtime::spawn_blocking(|| {
        // npm availability (system or already-bundled). This must not trigger auto-install.
        let system_npm_ok = std::process::Command::new("npm")
            .arg("--version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);

        let bundled_bin = snailer_node_current_bin_dir();
        let bundled_npm = if cfg!(target_os = "windows") {
            bundled_bin.join("npm.cmd")
        } else {
            bundled_bin.join("npm")
        };
        let bundled_ok = if bundled_npm.is_file() {
            let mut cmd = std::process::Command::new(&bundled_npm);
            cmd.env("PATH", prepend_path(&bundled_bin));
            cmd.arg("--version")
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false)
        } else {
            false
        };

        let npm_available = system_npm_ok || bundled_ok;
        let using_bundled_node = !system_npm_ok && bundled_ok;

        let prefix = snailer_cli_prefix_dir();
        let prefix_dir = prefix.to_string_lossy().to_string();

        // Installed CLI resolution order: global `snailer` then local prefix.
        if let Ok(ok) = std::process::Command::new("snailer")
            .arg("--version")
            .output()
        {
            if ok.status.success() {
                return Ok(SnailerCliStatus {
                    installed: true,
                    cli_path: Some("snailer".to_string()),
                    npm_available,
                    using_bundled_node,
                    bundled_node_path: if bundled_ok {
                        Some(bundled_bin.to_string_lossy().to_string())
                    } else {
                        None
                    },
                    prefix_dir,
                });
            }
        }

        if snailer_cli_is_installed(&prefix) {
            return Ok(SnailerCliStatus {
                installed: true,
                cli_path: Some(snailer_cli_bin_path(&prefix).to_string_lossy().to_string()),
                npm_available,
                using_bundled_node,
                bundled_node_path: if bundled_ok {
                    Some(bundled_bin.to_string_lossy().to_string())
                } else {
                    None
                },
                prefix_dir,
            });
        }

        Ok(SnailerCliStatus {
            installed: false,
            cli_path: None,
            npm_available,
            using_bundled_node,
            bundled_node_path: if bundled_ok {
                Some(bundled_bin.to_string_lossy().to_string())
            } else {
                None
            },
            prefix_dir,
        })
    })
    .await
    .map_err(|e| format!("Status task failed: {}", e))?
}

#[tauri::command]
pub async fn engine_start() -> Result<EngineStartResponse, String> {
    {
        let mut guard = engine_state()
            .lock()
            .map_err(|_| "engine state lock poisoned".to_string())?;

        if let Some(ref mut st) = *guard {
            if let Some(ref mut child) = st.child {
                // If the daemon process died, restart.
                if child.try_wait().ok().flatten().is_some() {
                    *guard = None;
                } else {
                    return Ok(EngineStartResponse {
                        url: st.url.clone(),
                        token: st.token.clone(),
                        default_project_path: default_project_path().to_string_lossy().to_string(),
                    });
                }
            } else {
                return Ok(EngineStartResponse {
                    url: st.url.clone(),
                    token: st.token.clone(),
                    default_project_path: default_project_path().to_string_lossy().to_string(),
                });
            }
        }
    }

    // Shared-only: always use `~/.snailer/.env` so API keys are reusable across workspaces.
    let shared_env = ensure_shared_env_selected().ok();

    let port = find_free_port().map_err(|e| format!("failed to pick free port: {}", e))?;
    let token = uuid::Uuid::new_v4().to_string();
    let url = format!("ws://127.0.0.1:{port}");

    // Launch external Snailer daemon via the npm-installed CLI.
    let cli_bin = snailer_cli_ensure_installed().await?;
    let token_for_daemon = token.clone();
    let env_file = read_gui_settings_env_file()
        .map(PathBuf::from)
        .or(shared_env)
        .or_else(|| shared_env_path().ok());
    let env_file = env_file.map(|p| p.to_string_lossy().to_string());

    let child = tauri::async_runtime::spawn_blocking(move || -> Result<std::process::Child, String> {
        let mut cmd = std::process::Command::new(&cli_bin);
        cmd.arg("daemon")
            .arg("--port")
            .arg(port.to_string())
            .arg("--token")
            .arg(token_for_daemon);

        if let Some(p) = env_file.as_deref() {
            cmd.env("SNAILER_ENV_FILE", p);
        }

        // If we installed Node/npm under ~/.snailer/node/current, ensure it's on PATH
        // so `#!/usr/bin/env node` shims work.
        let node_bin = snailer_node_current_bin_dir();
        if node_bin.is_dir() {
            cmd.env("PATH", prepend_path(&node_bin));
        }

        // Avoid inherited interactive prompts from npm.
        cmd.env("CI", "true");

        let child = cmd.spawn().map_err(|e| format!("Failed to spawn Snailer daemon: {e}"))?;
        wait_for_port(port, Duration::from_secs(8))?;
        Ok(child)
    })
    .await
    .map_err(|e| format!("daemon spawn task failed: {}", e))??;

    {
        let mut guard = engine_state()
            .lock()
            .map_err(|_| "engine state lock poisoned".to_string())?;
        *guard = Some(EngineState {
            url: url.clone(),
            token: token.clone(),
            child: Some(child),
        });
    }

    Ok(EngineStartResponse {
        url,
        token,
        default_project_path: default_project_path().to_string_lossy().to_string(),
    })
}

pub fn engine_kill() {
    let Ok(mut guard) = engine_state().lock() else {
        return;
    };
    if let Some(mut st) = guard.take() {
        if let Some(mut child) = st.child.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
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

#[derive(Debug, Clone, Serialize, Deserialize)]
struct BudgetState {
    month: u32,
    year: i32,
    spent_minimax: f32,
    spent_main: f32,
    monthly_limit_minimax: f32,
    monthly_limit_main: f32,
}

fn budget_state_path() -> Result<PathBuf, String> {
    let dir = snailer_home_dir();
    std::fs::create_dir_all(&dir).map_err(|e| format!("mkdir failed: {}", e))?;
    Ok(dir.join("budget_state.json"))
}

fn default_main_limit_for_plan(plan: &str) -> f32 {
    match plan.to_lowercase().as_str() {
        "starter" => 15.0_f32,
        "max" => 30.0_f32,
        "heavy" => 60.0_f32,
        "super rich" | "superrich" => 700.0_f32,
        _ => 15.0_f32,
    }
}

fn read_budget_state(
    plan: &str,
    env_main_override: Option<f32>,
    env_minimax_override: Option<f32>,
) -> BudgetState {
    use chrono::Datelike;

    let now = chrono::Utc::now();
    let limit_minimax = env_minimax_override.unwrap_or(13.0_f32).min(13.0_f32);
    let default_main = default_main_limit_for_plan(plan);
    let limit_main = env_main_override.unwrap_or(default_main).max(0.0);

    let fresh = || BudgetState {
        month: now.month(),
        year: now.year(),
        spent_minimax: 0.0,
        spent_main: 0.0,
        monthly_limit_minimax: limit_minimax,
        monthly_limit_main: limit_main,
    };

    let path = match budget_state_path() {
        Ok(p) => p,
        Err(_) => return fresh(),
    };
    let Ok(contents) = std::fs::read_to_string(&path) else {
        return fresh();
    };
    let Ok(mut state) = serde_json::from_str::<BudgetState>(&contents) else {
        return fresh();
    };

    // Month rollover: reset spend for the new month/year.
    if state.month != now.month() || state.year != now.year() {
        state = fresh();
    }

    // Env overrides take precedence over persisted limits.
    state.monthly_limit_minimax = limit_minimax;
    state.monthly_limit_main = limit_main;
    state
}

fn write_budget_state(state: &BudgetState) -> Result<(), String> {
    let path = budget_state_path()?;
    let text = serde_json::to_string(state).map_err(|e| format!("serialize failed: {}", e))?;
    std::fs::write(&path, text).map_err(|e| format!("write failed: {}", e))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(metadata) = std::fs::metadata(&path) {
            let mut perms = metadata.permissions();
            perms.set_mode(0o600);
            let _ = std::fs::set_permissions(&path, perms);
        }
    }
    Ok(())
}

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

    let plan = std::env::var("SNAILER_PLAN").unwrap_or_else(|_| "starter".to_string());
    let is_starter = plan.to_lowercase() == "starter";
    let env_main_override = std::env::var("SNAILER_BUDGET_MAIN")
        .ok()
        .and_then(|v| v.parse::<f32>().ok());
    let env_minimax_override = std::env::var("SNAILER_BUDGET_MINIMAX")
        .ok()
        .and_then(|v| v.parse::<f32>().ok());

    let state = read_budget_state(&plan, env_main_override, env_minimax_override);
    let now = chrono::Utc::now();

    Ok(BudgetStatusResponse {
        plan,
        is_starter,
        env_main_override,
        main_limit_usd: state.monthly_limit_main,
        main_spent_usd: state.spent_main,
        minimax_limit_usd: state.monthly_limit_minimax,
        minimax_spent_usd: state.spent_minimax,
        month: now.month(),
        year: now.year(),
    })
}

#[tauri::command]
pub async fn budget_set_main_limit(main_limit_usd: f32) -> Result<BudgetStatusResponse, String> {
    if !main_limit_usd.is_finite() || main_limit_usd < 0.0 {
        return Err("mainLimitUsd must be a non-negative number".to_string());
    }

    let plan = std::env::var("SNAILER_PLAN").unwrap_or_else(|_| "starter".to_string());
    let env_main_override = std::env::var("SNAILER_BUDGET_MAIN")
        .ok()
        .and_then(|v| v.parse::<f32>().ok());
    let env_minimax_override = std::env::var("SNAILER_BUDGET_MINIMAX")
        .ok()
        .and_then(|v| v.parse::<f32>().ok());

    let mut state = read_budget_state(&plan, env_main_override, env_minimax_override);
    state.monthly_limit_main = main_limit_usd.max(0.0);
    write_budget_state(&state)?;

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
    use crate::auth_pb as pb;

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
    use crate::auth_pb as pb;

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

    Ok(())
}

/// Logout - clear stored auth
#[tauri::command]
pub async fn auth_logout() -> Result<(), String> {
    let _ = auth_keychain_clear();

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

    Ok(None)
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

// ============================================================================
// xAI Direct API Call (CEO Auto-Cycle)
// ============================================================================

fn read_env_key(key: &str) -> Result<String, String> {
    let env_path = snailer_home_dir().join(".env");
    let contents = std::fs::read_to_string(&env_path)
        .map_err(|e| format!("Failed to read ~/.snailer/.env: {}", e))?;

    for line in contents.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        if let Some(rest) = trimmed.strip_prefix(key) {
            let rest = rest.trim_start();
            if let Some(value) = rest.strip_prefix('=') {
                let value = value.trim();
                // Remove surrounding quotes if present
                let value = if (value.starts_with('"') && value.ends_with('"'))
                    || (value.starts_with('\'') && value.ends_with('\''))
                {
                    &value[1..value.len() - 1]
                } else {
                    value
                };
                if !value.is_empty() {
                    return Ok(value.to_string());
                }
            }
        }
    }

    Err(format!("{} not found in ~/.snailer/.env", key))
}

/// Call xAI chat completions API directly with grok-4 model.
#[tauri::command]
pub async fn xai_chat_completion(
    system_prompt: String,
    user_prompt: String,
) -> Result<LlmCompletionResponse, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let api_key = read_env_key("XAI_API_KEY")?;
        let model_name = "grok-4";

        let body = serde_json::json!({
            "model": model_name,
            "messages": [
                { "role": "system", "content": system_prompt },
                { "role": "user", "content": user_prompt }
            ],
            "temperature": 0.3
        });

        let resp = ureq::post("https://api.x.ai/v1/chat/completions")
            .set("Authorization", &format!("Bearer {}", api_key))
            .set("Content-Type", "application/json")
            .send_json(body)
            .map_err(|e| format!("xAI API request failed: {}", e))?;

        let resp_json: serde_json::Value = resp
            .into_json()
            .map_err(|e| format!("Failed to parse xAI API response: {}", e))?;

        let content = resp_json
            .get("choices")
            .and_then(|c| c.get(0))
            .and_then(|c| c.get("message"))
            .and_then(|m| m.get("content"))
            .and_then(|c| c.as_str())
            .ok_or_else(|| {
                format!(
                    "Unexpected xAI API response structure: {}",
                    serde_json::to_string_pretty(&resp_json).unwrap_or_default()
                )
            })?;

        // Extract usage info
        let usage = resp_json.get("usage");
        let input_tokens = usage
            .and_then(|u| u.get("prompt_tokens"))
            .and_then(|t| t.as_u64())
            .unwrap_or(0);
        let output_tokens = usage
            .and_then(|u| u.get("completion_tokens"))
            .and_then(|t| t.as_u64())
            .unwrap_or(0);

        Ok(LlmCompletionResponse {
            content: content.to_string(),
            model: model_name.to_string(),
            input_tokens,
            output_tokens,
        })
    })
    .await
    .map_err(|e| format!("xAI task failed: {}", e))?
}

/// Call OpenAI chat completions API directly with gpt-4o model (used by PM agent).
#[tauri::command]
pub async fn openai_chat_completion(
    system_prompt: String,
    user_prompt: String,
) -> Result<LlmCompletionResponse, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let api_key = read_env_key("OPENAI_API_KEY")?;
        let model_name = "gpt-4o";

        let body = serde_json::json!({
            "model": model_name,
            "messages": [
                { "role": "system", "content": system_prompt },
                { "role": "user", "content": user_prompt }
            ],
            "temperature": 0.3
        });

        let resp = ureq::post("https://api.openai.com/v1/chat/completions")
            .set("Authorization", &format!("Bearer {}", api_key))
            .set("Content-Type", "application/json")
            .send_json(body)
            .map_err(|e| format!("OpenAI API request failed: {}", e))?;

        let resp_json: serde_json::Value = resp
            .into_json()
            .map_err(|e| format!("Failed to parse OpenAI API response: {}", e))?;

        let content = resp_json
            .get("choices")
            .and_then(|c| c.get(0))
            .and_then(|c| c.get("message"))
            .and_then(|m| m.get("content"))
            .and_then(|c| c.as_str())
            .ok_or_else(|| {
                format!(
                    "Unexpected OpenAI API response structure: {}",
                    serde_json::to_string_pretty(&resp_json).unwrap_or_default()
                )
            })?;

        // Extract usage info
        let usage = resp_json.get("usage");
        let input_tokens = usage
            .and_then(|u| u.get("prompt_tokens"))
            .and_then(|t| t.as_u64())
            .unwrap_or(0);
        let output_tokens = usage
            .and_then(|u| u.get("completion_tokens"))
            .and_then(|t| t.as_u64())
            .unwrap_or(0);

        Ok(LlmCompletionResponse {
            content: content.to_string(),
            model: model_name.to_string(),
            input_tokens,
            output_tokens,
        })
    })
    .await
    .map_err(|e| format!("OpenAI task failed: {}", e))?
}

/// Call OpenAI GPT-5.2 via Responses API with reasoning support (used by QA agent).
#[tauri::command]
pub async fn openai_gpt52_completion(
    system_prompt: String,
    user_prompt: String,
    reasoning_effort: Option<String>,
) -> Result<LlmCompletionResponse, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let api_key = read_env_key("OPENAI_API_KEY")?;
        let model_name = "gpt-5.2";
        let effort = reasoning_effort.unwrap_or_else(|| "medium".to_string());

        let body = serde_json::json!({
            "model": model_name,
            "input": format!("{}\n\n{}", system_prompt, user_prompt),
            "reasoning": {
                "effort": effort
            },
            "text": {
                "verbosity": "medium"
            }
        });

        let resp = ureq::post("https://api.openai.com/v1/responses")
            .set("Authorization", &format!("Bearer {}", api_key))
            .set("Content-Type", "application/json")
            .send_json(body)
            .map_err(|e| format!("OpenAI GPT-5.2 API request failed: {}", e))?;

        let resp_json: serde_json::Value = resp
            .into_json()
            .map_err(|e| format!("Failed to parse OpenAI GPT-5.2 API response: {}", e))?;

        // Responses API returns output array with text items
        let content = resp_json
            .get("output")
            .and_then(|o| o.as_array())
            .and_then(|arr| {
                arr.iter()
                    .find(|item| item.get("type").and_then(|t| t.as_str()) == Some("message"))
            })
            .and_then(|msg| msg.get("content"))
            .and_then(|c| c.as_array())
            .and_then(|arr| {
                arr.iter()
                    .find(|item| item.get("type").and_then(|t| t.as_str()) == Some("output_text"))
            })
            .and_then(|txt| txt.get("text"))
            .and_then(|t| t.as_str())
            .ok_or_else(|| {
                format!(
                    "Unexpected OpenAI GPT-5.2 API response structure: {}",
                    serde_json::to_string_pretty(&resp_json).unwrap_or_default()
                )
            })?;

        // Extract usage info
        let usage = resp_json.get("usage");
        let input_tokens = usage
            .and_then(|u| u.get("input_tokens"))
            .and_then(|t| t.as_u64())
            .unwrap_or(0);
        let output_tokens = usage
            .and_then(|u| u.get("output_tokens"))
            .and_then(|t| t.as_u64())
            .unwrap_or(0);

        Ok(LlmCompletionResponse {
            content: content.to_string(),
            model: model_name.to_string(),
            input_tokens,
            output_tokens,
        })
    })
    .await
    .map_err(|e| format!("OpenAI GPT-5.2 task failed: {}", e))?
}

/// Call Kimi chat completions API with built-in `$web_search` tool.
///
/// Uses a tool_calls loop: if `finish_reason == "tool_calls"`, the assistant message and
/// tool results (arguments echoed back) are appended and a follow-up request is made.
/// The loop runs at most 5 iterations to prevent runaway requests.
#[tauri::command]
pub async fn kimi_web_search_completion(
    system_prompt: String,
    user_prompt: String,
) -> Result<LlmCompletionResponse, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let api_key = read_env_key("MOONSHOT_API_KEY")?;

        // Use MOONSHOT_API_BASE env var, default to global endpoint (api.moonshot.ai)
        // Both endpoints support web search with kimi-k2-turbo-preview
        let api_base = std::env::var("MOONSHOT_API_BASE")
            .unwrap_or_else(|_| "https://api.moonshot.ai".to_string());
        let api_url = format!("{}/v1/chat/completions", api_base);

        // Use kimi-k2-turbo-preview for web search (works on both endpoints)
        let model_name = std::env::var("MOONSHOT_MODEL")
            .unwrap_or_else(|_| "kimi-k2-turbo-preview".to_string());

        let mut messages = vec![
            serde_json::json!({ "role": "system", "content": system_prompt }),
            serde_json::json!({ "role": "user", "content": user_prompt }),
        ];

        // Web search tools (same format for both endpoints)
        let tools = serde_json::json!([
            {
                "type": "builtin_function",
                "function": { "name": "$web_search" }
            }
        ]);

        const MAX_ITERATIONS: usize = 5;

        // Track cumulative token usage across iterations
        let mut total_input_tokens: u64 = 0;
        let mut total_output_tokens: u64 = 0;

        for _iter in 0..MAX_ITERATIONS {
            let body = serde_json::json!({
                "model": model_name,
                "messages": messages,
                "tools": tools,
                "temperature": 0.6
            });

            let resp = ureq::post(&api_url)
                .set("Authorization", &format!("Bearer {}", api_key))
                .set("Content-Type", "application/json")
                .send_json(body)
                .map_err(|e| format!("Kimi API request failed: {}", e))?;

            let resp_json: serde_json::Value = resp
                .into_json()
                .map_err(|e| format!("Failed to parse Kimi API response: {}", e))?;

            // Extract usage from this iteration
            let usage = resp_json.get("usage");
            total_input_tokens += usage
                .and_then(|u| u.get("prompt_tokens"))
                .and_then(|t| t.as_u64())
                .unwrap_or(0);
            total_output_tokens += usage
                .and_then(|u| u.get("completion_tokens"))
                .and_then(|t| t.as_u64())
                .unwrap_or(0);

            let choice = resp_json
                .get("choices")
                .and_then(|c| c.get(0))
                .ok_or_else(|| {
                    format!(
                        "Unexpected Kimi API response: {}",
                        serde_json::to_string_pretty(&resp_json).unwrap_or_default()
                    )
                })?;

            let finish_reason = choice
                .get("finish_reason")
                .and_then(|f| f.as_str())
                .unwrap_or("");

            let message = choice.get("message").cloned().unwrap_or(serde_json::json!({}));

            if finish_reason == "stop" {
                let content = message
                    .get("content")
                    .and_then(|c| c.as_str())
                    .unwrap_or("");
                return Ok(LlmCompletionResponse {
                    content: content.to_string(),
                    model: model_name.clone(),
                    input_tokens: total_input_tokens,
                    output_tokens: total_output_tokens,
                });
            }

            if finish_reason == "tool_calls" {
                messages.push(message.clone());

                if let Some(tool_calls) = message.get("tool_calls").and_then(|tc| tc.as_array()) {
                    for tc in tool_calls {
                        let tool_call_id = tc
                            .get("id")
                            .and_then(|id| id.as_str())
                            .unwrap_or("");
                        let function = tc.get("function").cloned().unwrap_or(serde_json::json!({}));
                        let name = function
                            .get("name")
                            .and_then(|n| n.as_str())
                            .unwrap_or("$web_search");
                        let arguments = function
                            .get("arguments")
                            .and_then(|a| a.as_str())
                            .unwrap_or("{}");

                        messages.push(serde_json::json!({
                            "role": "tool",
                            "tool_call_id": tool_call_id,
                            "name": name,
                            "content": arguments
                        }));
                    }
                }
                continue;
            }

            let content = message
                .get("content")
                .and_then(|c| c.as_str())
                .unwrap_or("");
            if !content.is_empty() {
                return Ok(LlmCompletionResponse {
                    content: content.to_string(),
                    model: model_name.clone(),
                    input_tokens: total_input_tokens,
                    output_tokens: total_output_tokens,
                });
            }

            return Err(format!(
                "Kimi API returned unexpected finish_reason: {}",
                finish_reason
            ));
        }

        Err("Kimi API: Max iterations reached without final response".to_string())
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Call xAI Responses API with grok-4-1-fast model + web_search tool.
/// Used by the AI/ML Research agent for real-time AI/ML research.
#[tauri::command]
pub async fn xai_web_search_completion(
    system_prompt: String,
    user_prompt: String,
) -> Result<LlmCompletionResponse, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let api_key = read_env_key("XAI_API_KEY")?;
        let model_name = "grok-4-1-fast";

        let body = serde_json::json!({
            "model": model_name,
            "input": [
                { "role": "system", "content": system_prompt },
                { "role": "user", "content": user_prompt }
            ],
            "tools": [{ "type": "web_search" }]
        });

        let resp = ureq::post("https://api.x.ai/v1/responses")
            .set("Authorization", &format!("Bearer {}", api_key))
            .set("Content-Type", "application/json")
            .send_json(body)
            .map_err(|e| format!("xAI Responses API request failed: {}", e))?;

        let resp_json: serde_json::Value = resp
            .into_json()
            .map_err(|e| format!("Failed to parse xAI Responses API response: {}", e))?;

        // Extract usage from xAI Responses API (uses input_tokens/output_tokens)
        let usage = resp_json.get("usage");
        let input_tokens = usage
            .and_then(|u| u.get("input_tokens"))
            .and_then(|t| t.as_u64())
            .unwrap_or(0);
        let output_tokens = usage
            .and_then(|u| u.get("output_tokens"))
            .and_then(|t| t.as_u64())
            .unwrap_or(0);

        // Extract text from output[].type=="message" → content[].type=="output_text" → .text
        let output = resp_json.get("output").and_then(|o| o.as_array());
        if let Some(items) = output {
            for item in items {
                if item.get("type").and_then(|t| t.as_str()) == Some("message") {
                    if let Some(content) = item.get("content").and_then(|c| c.as_array()) {
                        for block in content {
                            if block.get("type").and_then(|t| t.as_str()) == Some("output_text") {
                                if let Some(text) = block.get("text").and_then(|t| t.as_str()) {
                                    if !text.is_empty() {
                                        return Ok(LlmCompletionResponse {
                                            content: text.to_string(),
                                            model: model_name.to_string(),
                                            input_tokens,
                                            output_tokens,
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        Err(format!(
            "Unexpected xAI Responses API response structure: {}",
            serde_json::to_string_pretty(&resp_json).unwrap_or_default()
        ))
    })
    .await
    .map_err(|e| format!("xAI web search task failed: {}", e))?
}

/// Call Anthropic Messages API directly with claude-sonnet-4-20250514 model (used by SWE agents).
#[tauri::command]
pub async fn anthropic_chat_completion(
    system_prompt: String,
    user_prompt: String,
) -> Result<LlmCompletionResponse, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let api_key = read_env_key("ANTHROPIC_API_KEY")?;
        let model_name = "claude-sonnet-4-20250514";

        let body = serde_json::json!({
            "model": model_name,
            "max_tokens": 4096,
            "system": system_prompt,
            "messages": [
                { "role": "user", "content": user_prompt }
            ]
        });

        let resp = ureq::post("https://api.anthropic.com/v1/messages")
            .set("x-api-key", &api_key)
            .set("anthropic-version", "2023-06-01")
            .set("Content-Type", "application/json")
            .send_json(body)
            .map_err(|e| format!("Anthropic API request failed: {}", e))?;

        let resp_json: serde_json::Value = resp
            .into_json()
            .map_err(|e| format!("Failed to parse Anthropic API response: {}", e))?;

        let content = resp_json
            .get("content")
            .and_then(|c| c.get(0))
            .and_then(|c| c.get("text"))
            .and_then(|t| t.as_str())
            .ok_or_else(|| {
                format!(
                    "Unexpected Anthropic API response structure: {}",
                    serde_json::to_string_pretty(&resp_json).unwrap_or_default()
                )
            })?;

        // Extract usage from Anthropic API (uses input_tokens/output_tokens)
        let usage = resp_json.get("usage");
        let input_tokens = usage
            .and_then(|u| u.get("input_tokens"))
            .and_then(|t| t.as_u64())
            .unwrap_or(0);
        let output_tokens = usage
            .and_then(|u| u.get("output_tokens"))
            .and_then(|t| t.as_u64())
            .unwrap_or(0);

        Ok(LlmCompletionResponse {
            content: content.to_string(),
            model: model_name.to_string(),
            input_tokens,
            output_tokens,
        })
    })
    .await
    .map_err(|e| format!("Anthropic task failed: {}", e))?
}

// ============================================================================
// File System Commands (Agent Execution)
// ============================================================================

/// Write text content to a file (creates parent dirs if needed).
#[tauri::command]
pub async fn fs_write_text(path: String, content: String) -> Result<String, String> {
    let file_path = PathBuf::from(&path);
    if let Some(parent) = file_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("mkdir failed: {}", e))?;
    }
    std::fs::write(&file_path, content.as_bytes()).map_err(|e| format!("write failed: {}", e))?;
    Ok(path)
}

/// Apply a unified diff patch string to the working directory.
/// Uses `git apply` for robust patch handling.
#[tauri::command]
pub async fn git_apply_patch(cwd: String, patch: String) -> Result<String, String> {
    // Write patch to a temp file
    let patch_dir = PathBuf::from(&cwd).join(".snailer-patches");
    std::fs::create_dir_all(&patch_dir).map_err(|e| format!("mkdir failed: {}", e))?;
    let patch_file = patch_dir.join(format!("patch-{}.diff", uuid::Uuid::new_v4()));
    std::fs::write(&patch_file, patch.as_bytes()).map_err(|e| format!("write patch failed: {}", e))?;

    // Try git apply
    let (_code, text) = run_cmd_capture(
        "git",
        &["apply", "--stat", &patch_file.to_string_lossy()],
        Some(&cwd),
    )?;

    let (apply_code, apply_text) = run_cmd_capture(
        "git",
        &["apply", "--allow-empty", &patch_file.to_string_lossy()],
        Some(&cwd),
    )?;

    // Clean up
    let _ = std::fs::remove_file(&patch_file);
    let _ = std::fs::remove_dir(&patch_dir); // Only removes if empty

    if apply_code != 0 {
        return Err(format!("git apply failed (exit {}): {}", apply_code, apply_text));
    }

    Ok(format!("Patch applied successfully. Stats: {}", text.trim()))
}

/// Run an arbitrary shell command in the project directory (for agent execution).
/// Returns (exit_code, combined stdout+stderr).
#[tauri::command]
pub async fn shell_execute(cwd: String, command: String, args: Vec<String>) -> Result<(i32, String), String> {
    let args_ref: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    run_cmd_capture(&command, &args_ref, Some(&cwd))
}

/// Run a bash command string in a directory (convenience wrapper).
#[tauri::command]
pub async fn run_bash(cwd: String, command: String) -> Result<String, String> {
    let (code, text) = run_cmd_capture("bash", &["-c", &command], Some(&cwd))?;
    if code != 0 {
        return Err(format!("bash failed (exit {}): {}", code, text));
    }
    Ok(text)
}

/// Get git status summary for the project (for agent context).
#[tauri::command]
pub async fn git_status_summary(cwd: String) -> Result<String, String> {
    let mut result = String::new();

    // Current branch
    let (_, branch) = run_cmd_capture("git", &["branch", "--show-current"], Some(&cwd))?;
    result.push_str(&format!("Branch: {}\n", branch.trim()));

    // Short status
    let (_, status) = run_cmd_capture("git", &["status", "--short"], Some(&cwd))?;
    if status.trim().is_empty() {
        result.push_str("Working tree: clean\n");
    } else {
        result.push_str(&format!("Changes:\n{}\n", status.trim()));
    }

    // Recent commits (last 5)
    let (_, log) = run_cmd_capture(
        "git",
        &["log", "--oneline", "-5"],
        Some(&cwd),
    )?;
    if !log.trim().is_empty() {
        result.push_str(&format!("Recent commits:\n{}\n", log.trim()));
    }

    // Remote
    let (_, remote) = run_cmd_capture("git", &["remote", "-v"], Some(&cwd))?;
    if !remote.trim().is_empty() {
        let first_line = remote.lines().next().unwrap_or("").trim();
        result.push_str(&format!("Remote: {}\n", first_line));
    }

    Ok(result)
}

// ============================================================================
// GitHub / Git CLI Commands (Autonomous Workflow)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GhIssueResponse {
    pub number: i64,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GhIssueItem {
    pub number: i64,
    pub title: String,
    pub state: String,
    pub url: String,
    pub author: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitBranchResponse {
    pub success: bool,
    pub branch: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitCommitPushResponse {
    pub success: bool,
    pub sha: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GhPrResponse {
    pub number: i64,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GhPrItem {
    pub number: i64,
    pub title: String,
    pub state: String,
    pub url: String,
    pub head_branch: String,
    pub author: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GhPrCheckItem {
    pub name: String,
    pub status: String,
    pub conclusion: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GhPrChecksResponse {
    pub status: String,
    pub checks: Vec<GhPrCheckItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GhCommentResponse {
    pub id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GhMergeResponse {
    pub success: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitDiffResponse {
    pub patch: String,
}

/// Create a GitHub issue via `gh issue create`.
#[tauri::command]
pub async fn gh_issue_create(
    cwd: String,
    title: String,
    body: String,
    labels: Option<String>,
    assignees: Option<String>,
) -> Result<GhIssueResponse, String> {
    let mut args = vec![
        "issue".to_string(),
        "create".to_string(),
        "--title".to_string(),
        title,
        "--body".to_string(),
        body,
    ];
    if let Some(l) = labels {
        if !l.trim().is_empty() {
            args.push("--label".to_string());
            args.push(l);
        }
    }
    if let Some(a) = assignees {
        if !a.trim().is_empty() {
            args.push("--assignee".to_string());
            args.push(a);
        }
    }
    let args_ref: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let (code, text) = run_cmd_capture("gh", &args_ref, Some(&cwd))?;
    if code != 0 {
        return Err(format!("gh issue create failed (exit {}): {}", code, text));
    }
    // gh outputs the issue URL on success
    let url = text.lines().last().unwrap_or("").trim().to_string();
    let number = url
        .rsplit('/')
        .next()
        .and_then(|s| s.parse::<i64>().ok())
        .unwrap_or(0);
    Ok(GhIssueResponse { number, url })
}

/// List GitHub issues via `gh issue list`.
#[tauri::command]
pub async fn gh_issue_list(
    cwd: String,
    state: Option<String>,
    labels: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<GhIssueItem>, String> {
    let limit_str = limit.unwrap_or(20).to_string();
    let state_str = state.unwrap_or_else(|| "open".to_string());
    let mut args = vec![
        "issue", "list",
        "--state", &state_str,
        "--limit", &limit_str,
        "--json", "number,title,state,url,author",
    ];
    let labels_owned;
    if let Some(ref l) = labels {
        if !l.trim().is_empty() {
            labels_owned = l.clone();
            args.push("--label");
            args.push(&labels_owned);
        }
    }
    let (code, text) = run_cmd_capture("gh", &args, Some(&cwd))?;
    if code != 0 {
        return Err(format!("gh issue list failed (exit {}): {}", code, text));
    }
    let items: Vec<serde_json::Value> =
        serde_json::from_str(&text).map_err(|e| format!("JSON parse error: {}", e))?;
    let result = items
        .iter()
        .map(|v| GhIssueItem {
            number: v.get("number").and_then(|n| n.as_i64()).unwrap_or(0),
            title: v.get("title").and_then(|s| s.as_str()).unwrap_or("").to_string(),
            state: v.get("state").and_then(|s| s.as_str()).unwrap_or("").to_string(),
            url: v.get("url").and_then(|s| s.as_str()).unwrap_or("").to_string(),
            author: v
                .get("author")
                .and_then(|a| a.get("login"))
                .and_then(|s| s.as_str())
                .unwrap_or("")
                .to_string(),
        })
        .collect();
    Ok(result)
}

/// Create a git branch and switch to it. If branch already exists, just switch to it.
#[tauri::command]
pub async fn git_branch_create(
    cwd: String,
    branch_name: String,
) -> Result<GitBranchResponse, String> {
    // Sanitize branch name: replace spaces and invalid chars with dashes
    let sanitized = branch_name
        .trim()
        .replace(' ', "-")
        .replace("'", "")
        .replace("\"", "")
        .replace(":", "-")
        .replace("..", "-")
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_' || *c == '/')
        .collect::<String>();

    if sanitized.is_empty() {
        return Err("Invalid branch name".to_string());
    }

    let (code, text) = run_cmd_capture("git", &["checkout", "-b", &sanitized], Some(&cwd))?;
    if code != 0 {
        // If branch already exists, try to just checkout
        if text.contains("already exists") || text.contains("already exist") {
            let (code2, text2) = run_cmd_capture("git", &["checkout", &sanitized], Some(&cwd))?;
            if code2 != 0 {
                return Err(format!("git checkout failed (exit {}): {}", code2, text2));
            }
            return Ok(GitBranchResponse {
                success: true,
                branch: format!("{} (switched to existing)", sanitized),
            });
        }
        // Also handle "is not a valid branch name"
        if text.contains("not a valid branch name") {
            return Err(format!("Invalid branch name '{}': {}", branch_name, text));
        }
        return Err(format!("git checkout -b failed (exit {}): {}", code, text));
    }
    Ok(GitBranchResponse {
        success: true,
        branch: sanitized,
    })
}

/// Stage files, commit, and push to remote.
#[tauri::command]
pub async fn git_commit_and_push(
    cwd: String,
    branch: String,
    message: String,
    files: Vec<String>,
) -> Result<GitCommitPushResponse, String> {
    // Stage files
    if files.is_empty() {
        let (code, text) = run_cmd_capture("git", &["add", "-A"], Some(&cwd))?;
        if code != 0 {
            return Err(format!("git add -A failed (exit {}): {}", code, text));
        }
    } else {
        let mut args = vec!["add"];
        let file_refs: Vec<&str> = files.iter().map(|s| s.as_str()).collect();
        args.extend(file_refs);
        let (code, text) = run_cmd_capture("git", &args, Some(&cwd))?;
        if code != 0 {
            return Err(format!("git add failed (exit {}): {}", code, text));
        }
    }

    // Commit (handle "nothing to commit" gracefully)
    let (code, text) = run_cmd_capture("git", &["commit", "-m", &message], Some(&cwd))?;
    if code != 0 {
        // Check if it's just "nothing to commit"
        if text.contains("nothing to commit") || text.contains("working tree clean") {
            // Not an error - just no changes to commit
            return Ok(GitCommitPushResponse {
                success: true,
                sha: "no-changes".to_string(),
                message: Some("No changes to commit (working tree clean)".to_string()),
            });
        }
        return Err(format!("git commit failed (exit {}): {}", code, text));
    }

    // Get SHA
    let (_, sha_text) = run_cmd_capture("git", &["rev-parse", "HEAD"], Some(&cwd))?;
    let sha = sha_text.trim().to_string();

    // Push
    let (code, text) = run_cmd_capture(
        "git",
        &["push", "-u", "origin", &branch],
        Some(&cwd),
    )?;
    if code != 0 {
        return Err(format!("git push failed (exit {}): {}", code, text));
    }

    Ok(GitCommitPushResponse {
        success: true,
        sha,
        message: None,
    })
}

/// Create a pull request via `gh pr create`.
/// Automatically pushes the branch first if needed.
#[tauri::command]
pub async fn gh_pr_create(
    cwd: String,
    base: String,
    head: String,
    title: String,
    body: String,
) -> Result<GhPrResponse, String> {
    // First, ensure the branch is pushed to remote
    let branch_to_push = if head.is_empty() {
        // Get current branch name
        let (_, current_branch) = run_cmd_capture("git", &["branch", "--show-current"], Some(&cwd))?;
        current_branch.trim().to_string()
    } else {
        head.clone()
    };

    // Push the branch (ignore errors if already up to date)
    let _ = run_cmd_capture(
        "git",
        &["push", "-u", "origin", &branch_to_push],
        Some(&cwd),
    );

    // Now create the PR
    let head_ref = if head.is_empty() { &branch_to_push } else { &head };
    let (code, text) = run_cmd_capture(
        "gh",
        &[
            "pr", "create",
            "--base", &base,
            "--head", head_ref,
            "--title", &title,
            "--body", &body,
        ],
        Some(&cwd),
    )?;
    if code != 0 {
        return Err(format!("gh pr create failed (exit {}): {}", code, text));
    }
    let url = text.lines().last().unwrap_or("").trim().to_string();
    let number = url
        .rsplit('/')
        .next()
        .and_then(|s| s.parse::<i64>().ok())
        .unwrap_or(0);
    Ok(GhPrResponse { number, url })
}

/// List pull requests via `gh pr list`.
#[tauri::command]
pub async fn gh_pr_list(
    cwd: String,
    state: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<GhPrItem>, String> {
    let limit_str = limit.unwrap_or(20).to_string();
    let state_str = state.unwrap_or_else(|| "open".to_string());
    let (code, text) = run_cmd_capture(
        "gh",
        &[
            "pr", "list",
            "--state", &state_str,
            "--limit", &limit_str,
            "--json", "number,title,state,url,headRefName,author",
        ],
        Some(&cwd),
    )?;
    if code != 0 {
        return Err(format!("gh pr list failed (exit {}): {}", code, text));
    }
    let items: Vec<serde_json::Value> =
        serde_json::from_str(&text).map_err(|e| format!("JSON parse error: {}", e))?;
    let result = items
        .iter()
        .map(|v| GhPrItem {
            number: v.get("number").and_then(|n| n.as_i64()).unwrap_or(0),
            title: v.get("title").and_then(|s| s.as_str()).unwrap_or("").to_string(),
            state: v.get("state").and_then(|s| s.as_str()).unwrap_or("").to_string(),
            url: v.get("url").and_then(|s| s.as_str()).unwrap_or("").to_string(),
            head_branch: v
                .get("headRefName")
                .and_then(|s| s.as_str())
                .unwrap_or("")
                .to_string(),
            author: v
                .get("author")
                .and_then(|a| a.get("login"))
                .and_then(|s| s.as_str())
                .unwrap_or("")
                .to_string(),
        })
        .collect();
    Ok(result)
}

/// Get PR checks status via `gh pr checks`.
#[tauri::command]
pub async fn gh_pr_checks(
    cwd: String,
    pr_number: i64,
) -> Result<GhPrChecksResponse, String> {
    let pr_str = pr_number.to_string();
    let (code, text) = run_cmd_capture(
        "gh",
        &["pr", "checks", &pr_str, "--json", "name,state,conclusion"],
        Some(&cwd),
    )?;
    // gh pr checks may return non-zero if checks haven't started
    if code != 0 && !text.contains("no checks") {
        return Err(format!("gh pr checks failed (exit {}): {}", code, text));
    }
    if text.trim().is_empty() || text.contains("no checks") {
        return Ok(GhPrChecksResponse {
            status: "no_checks".to_string(),
            checks: vec![],
        });
    }
    let items: Vec<serde_json::Value> =
        serde_json::from_str(&text).map_err(|e| format!("JSON parse error: {}", e))?;
    let checks: Vec<GhPrCheckItem> = items
        .iter()
        .map(|v| GhPrCheckItem {
            name: v.get("name").and_then(|s| s.as_str()).unwrap_or("").to_string(),
            status: v.get("state").and_then(|s| s.as_str()).unwrap_or("").to_string(),
            conclusion: v
                .get("conclusion")
                .and_then(|s| s.as_str())
                .unwrap_or("")
                .to_string(),
        })
        .collect();
    let all_pass = checks.iter().all(|c| c.conclusion == "SUCCESS" || c.conclusion == "success");
    let any_fail = checks.iter().any(|c| c.conclusion == "FAILURE" || c.conclusion == "failure");
    let status = if any_fail {
        "failure"
    } else if all_pass {
        "success"
    } else {
        "pending"
    };
    Ok(GhPrChecksResponse {
        status: status.to_string(),
        checks,
    })
}

/// Comment on a PR via `gh pr comment`.
#[tauri::command]
pub async fn gh_pr_comment(
    cwd: String,
    pr_number: i64,
    body: String,
) -> Result<GhCommentResponse, String> {
    let pr_str = pr_number.to_string();
    let (code, text) = run_cmd_capture(
        "gh",
        &["pr", "comment", &pr_str, "--body", &body],
        Some(&cwd),
    )?;
    if code != 0 {
        return Err(format!("gh pr comment failed (exit {}): {}", code, text));
    }
    Ok(GhCommentResponse {
        id: text.lines().last().unwrap_or("").trim().to_string(),
    })
}

/// Merge a PR via `gh pr merge`.
#[tauri::command]
pub async fn gh_pr_merge(
    cwd: String,
    pr_number: i64,
    method: Option<String>,
) -> Result<GhMergeResponse, String> {
    let pr_str = pr_number.to_string();
    let merge_method = match method.as_deref() {
        Some("rebase") => "--rebase",
        Some("squash") => "--squash",
        _ => "--merge",
    };
    let (code, text) = run_cmd_capture(
        "gh",
        &["pr", "merge", &pr_str, merge_method, "--auto"],
        Some(&cwd),
    )?;
    if code != 0 {
        return Err(format!("gh pr merge failed (exit {}): {}", code, text));
    }
    Ok(GhMergeResponse { success: true })
}

/// Get git diff between two refs.
#[tauri::command]
pub async fn git_diff(
    cwd: String,
    base: Option<String>,
    head: Option<String>,
) -> Result<GitDiffResponse, String> {
    let mut args = vec!["diff"];
    let base_owned = base.unwrap_or_default();
    let head_owned = head.unwrap_or_default();
    if !base_owned.is_empty() {
        args.push(&base_owned);
    }
    if !head_owned.is_empty() {
        args.push(&head_owned);
    }
    let (code, text) = run_cmd_capture("git", &args, Some(&cwd))?;
    if code != 0 {
        return Err(format!("git diff failed (exit {}): {}", code, text));
    }
    Ok(GitDiffResponse { patch: text })
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
