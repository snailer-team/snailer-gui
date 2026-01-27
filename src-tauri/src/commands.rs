use serde::Serialize;
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

fn get_auth_addr() -> String {
    std::env::var("SNAILER_AUTH_ADDR")
        .unwrap_or_else(|_| "https://snailer.ai:443".to_string())
}

/// Start device login flow - returns device code info for user to complete auth in browser
#[tauri::command]
pub async fn auth_start_device_login() -> Result<DeviceCodeResponse, String> {
    use snailer::auth::pb;

    let auth_addr = get_auth_addr();

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

    let auth_addr = get_auth_addr();

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
    // Clear UserAuth
    let ua = snailer::user_auth::UserAuth::default();
    ua.save().map_err(|e| format!("Failed to clear auth: {}", e))?;

    // Clear device code state
    if let Ok(mut guard) = auth_state().lock() {
        *guard = None;
    }

    Ok(())
}

/// Check if user is logged in
#[tauri::command]
pub async fn auth_check() -> Result<Option<TokenResponse>, String> {
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

                Ok(Some(TokenResponse {
                    access_token: token.clone(),
                    refresh_token: ua.refresh_token.unwrap_or_default(),
                    account_id: ua.account_id.unwrap_or_default(),
                    email: ua.email.unwrap_or_default(),
                    name: ua.name.unwrap_or_default(),
                    expires_in: ua.expires_at.map(|e| (e - chrono::Utc::now().timestamp()) as i32).unwrap_or(0),
                }))
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
