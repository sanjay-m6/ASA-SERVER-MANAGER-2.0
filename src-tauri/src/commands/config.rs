use crate::services::config_generator::{ConfigGenerator, MapProfile, ServerConfig};
use crate::AppState;
use chrono::Local;
use std::fs;
use std::path::PathBuf;
use tauri::State;

/// Helper to get server install path from database
fn get_server_install_path(state: &State<'_, AppState>, server_id: i64) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db.get_connection().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT install_path FROM servers WHERE id = ?1",
        [server_id],
        |row| row.get(0),
    )
    .map_err(|e| e.to_string())
}

/// Get config file path
fn get_config_path(install_path: &str, config_type: &str) -> PathBuf {
    PathBuf::from(install_path)
        .join("ShooterGame/Saved/Config/WindowsServer")
        .join(format!("{}.ini", config_type))
}

/// Get backup directory path
fn get_backup_dir(install_path: &str) -> PathBuf {
    PathBuf::from(install_path).join("ShooterGame/Saved/Config/WindowsServer/Backups")
}

#[tauri::command]
pub async fn read_config(
    state: State<'_, AppState>,
    server_id: i64,
    config_type: String,
) -> Result<String, String> {
    let install_path = get_server_install_path(&state, server_id)?;
    let path = get_config_path(&install_path, &config_type);

    if path.exists() {
        fs::read_to_string(path).map_err(|e| e.to_string())
    } else {
        // Return default/empty config if file doesn't exist
        Ok(String::new())
    }
}

#[tauri::command]
pub async fn save_config(
    state: State<'_, AppState>,
    server_id: i64,
    config_type: String,
    content: String,
) -> Result<(), String> {
    let install_path = get_server_install_path(&state, server_id)?;

    let dir_path = PathBuf::from(&install_path).join("ShooterGame/Saved/Config/WindowsServer");

    fs::create_dir_all(&dir_path).map_err(|e| e.to_string())?;

    let file_path = dir_path.join(format!("{}.ini", config_type));

    fs::write(file_path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn backup_config(
    state: State<'_, AppState>,
    server_id: i64,
    config_type: String,
) -> Result<String, String> {
    let install_path = get_server_install_path(&state, server_id)?;
    let config_path = get_config_path(&install_path, &config_type);

    if !config_path.exists() {
        return Ok("No config file to backup".to_string());
    }

    let backup_dir = get_backup_dir(&install_path);
    fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;

    // Create timestamped backup filename
    let timestamp = Local::now().format("%Y%m%d_%H%M%S");
    let backup_filename = format!("{}_{}.ini.bak", config_type, timestamp);
    let backup_path = backup_dir.join(&backup_filename);

    fs::copy(&config_path, &backup_path).map_err(|e| e.to_string())?;

    println!("📦 Created backup: {:?}", backup_path);
    Ok(backup_filename)
}

#[tauri::command]
pub async fn restore_config(
    state: State<'_, AppState>,
    server_id: i64,
    config_type: String,
    backup_filename: String,
) -> Result<(), String> {
    let install_path = get_server_install_path(&state, server_id)?;
    let backup_dir = get_backup_dir(&install_path);
    let backup_path = backup_dir.join(&backup_filename);

    if !backup_path.exists() {
        return Err(format!("Backup file not found: {}", backup_filename));
    }

    let config_path = get_config_path(&install_path, &config_type);

    fs::copy(&backup_path, &config_path).map_err(|e| e.to_string())?;

    println!("🔄 Restored config from: {:?}", backup_path);
    Ok(())
}

#[tauri::command]
pub async fn list_config_backups(
    state: State<'_, AppState>,
    server_id: i64,
    config_type: String,
) -> Result<Vec<String>, String> {
    let install_path = get_server_install_path(&state, server_id)?;
    let backup_dir = get_backup_dir(&install_path);

    if !backup_dir.exists() {
        return Ok(vec![]);
    }

    let prefix = format!("{}_", config_type);
    let mut backups: Vec<String> = fs::read_dir(&backup_dir)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with(&prefix) && name.ends_with(".ini.bak") {
                Some(name)
            } else {
                None
            }
        })
        .collect();

    // Sort by newest first
    backups.sort();
    backups.reverse();

    Ok(backups)
}

// ===============================================
// Config Generator Commands
// ===============================================

/// Get all available map profiles with recommended settings
#[tauri::command]
pub async fn get_map_profiles() -> Result<Vec<MapProfile>, String> {
    Ok(ConfigGenerator::get_map_profiles())
}

/// Get profile for a specific map
#[tauri::command]
pub async fn get_map_profile(map_id: String) -> Result<Option<MapProfile>, String> {
    Ok(ConfigGenerator::get_profile_for_map(&map_id))
}

/// Generate GameUserSettings.ini content preview
#[tauri::command]
pub async fn preview_game_user_settings(config: ServerConfig) -> Result<String, String> {
    Ok(ConfigGenerator::generate_game_user_settings(&config))
}

/// Generate Game.ini content preview
#[tauri::command]
pub async fn preview_game_ini(config: ServerConfig) -> Result<String, String> {
    Ok(ConfigGenerator::generate_game_ini(&config))
}

/// Generate startup command for server
#[tauri::command]
pub async fn generate_startup_command(
    config: ServerConfig,
    install_path: String,
) -> Result<String, String> {
    let path = PathBuf::from(install_path);
    Ok(ConfigGenerator::generate_startup_command(&config, &path))
}

/// Apply map profile to server config and return updated config
#[tauri::command]
pub async fn apply_map_profile_to_config(
    mut config: ServerConfig,
    map_id: String,
) -> Result<ServerConfig, String> {
    if let Some(profile) = ConfigGenerator::get_profile_for_map(&map_id) {
        ConfigGenerator::apply_map_profile(&mut config, &profile);
        config.map_name = map_id;
    }
    Ok(config)
}

/// Write config files to server directory
#[tauri::command]
pub async fn write_server_configs(
    _state: State<'_, AppState>,
    install_path: String,
    config: ServerConfig,
    backup: bool,
) -> Result<(), String> {
    let path = PathBuf::from(install_path);
    ConfigGenerator::write_configs(&path, &config, backup)
}

/// Backup all config files for a server
#[tauri::command]
pub async fn backup_all_configs(
    _state: State<'_, AppState>,
    install_path: String,
) -> Result<String, String> {
    let path = PathBuf::from(install_path);
    let backup_path = ConfigGenerator::backup_configs(&path)?;
    Ok(backup_path.to_string_lossy().to_string())
}

/// Get default server config
#[tauri::command]
pub async fn get_default_config() -> Result<ServerConfig, String> {
    Ok(ServerConfig::default())
}
