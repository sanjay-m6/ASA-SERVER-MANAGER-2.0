use crate::models::{RconConfig, Server, ServerConfig, ServerPorts, ServerStatus};
use crate::services::network;
use crate::services::server_installer::ServerInstaller;
use crate::AppState;
use std::path::PathBuf;
use tauri::State;

#[tauri::command]
pub async fn get_all_servers(state: State<'_, AppState>) -> Result<Vec<Server>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db.get_connection().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, install_path, status, game_port, query_port, rcon_port, 
             max_players, server_password, admin_password, map_name, session_name, 
             motd, mods, custom_args, rcon_enabled, created_at, last_started 
             FROM servers",
        )
        .map_err(|e| e.to_string())?;

    let mut servers = Vec::new();
    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;

    while let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let status_str: String = row.get(3).unwrap_or_else(|_| "stopped".to_string());
        let status = match status_str.as_str() {
            "running" => ServerStatus::Running,
            "starting" => ServerStatus::Starting,
            "stopped" => ServerStatus::Stopped,
            "crashed" => ServerStatus::Crashed,
            "updating" => ServerStatus::Updating,
            "restarting" => ServerStatus::Restarting,
            _ => ServerStatus::Stopped,
        };

        let mods_str: String = row.get(13).unwrap_or_else(|_| String::new());
        let mods: Vec<String> = if mods_str.is_empty() {
            vec![]
        } else {
            mods_str.split(',').map(|s| s.to_string()).collect()
        };

        servers.push(Server {
            id: row.get(0).unwrap_or(0),
            name: row.get(1).unwrap_or_else(|_| "Unknown".to_string()),
            install_path: PathBuf::from(row.get::<_, String>(2).unwrap_or_default()),
            status,
            ports: ServerPorts {
                game_port: row.get(4).unwrap_or(7777),
                query_port: row.get(5).unwrap_or(27015),
                rcon_port: row.get(6).unwrap_or(27020),
            },
            config: ServerConfig {
                max_players: row.get(7).unwrap_or(70),
                server_password: row.get(8).ok(),
                admin_password: row.get(9).unwrap_or_else(|_| "admin123".to_string()),
                map_name: row.get(10).unwrap_or_else(|_| "TheIsland_WP".to_string()),
                session_name: row.get(11).unwrap_or_else(|_| "My Server".to_string()),
                motd: row.get(12).ok(),
                mods,
                custom_args: row.get(14).ok(),
            },
            rcon_config: RconConfig {
                enabled: row.get(15).unwrap_or(true),
                password: row
                    .get::<_, String>(9)
                    .unwrap_or_else(|_| "admin123".to_string()),
            },
            created_at: row
                .get(16)
                .unwrap_or_else(|_| chrono::Utc::now().to_rfc3339()),
            last_started: row.get(17).ok(),
        });
    }

    Ok(servers)
}

#[tauri::command]
pub async fn get_server_by_id(
    _state: State<'_, AppState>,
    _server_id: i64,
) -> Result<Option<Server>, String> {
    // TODO: Implement
    Ok(None)
}

#[tauri::command]
pub async fn install_server(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    install_path: String,
    name: String,
    map_name: String,
    game_port: u16,
    query_port: u16,
    rcon_port: u16,
) -> Result<Server, String> {
    println!("🚀 Installing server: {} at {}", name, install_path);

    let path = PathBuf::from(&install_path);

    // Create the installer and run the installation
    let installer = ServerInstaller::new(app_handle);
    installer.install_asa_server(&path).await?;

    // Create database entry
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db.get_connection().map_err(|e| e.to_string())?;

    // Check if server name already exists and make it unique
    let mut unique_name = name.clone();
    let mut counter = 1;
    loop {
        let exists: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM servers WHERE name = ?1)",
                [&unique_name],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if !exists {
            break;
        }
        counter += 1;
        unique_name = format!("{} ({})", name, counter);
    }

    conn.execute(
        "INSERT INTO servers (name, install_path, status, game_port, query_port, rcon_port, 
         max_players, admin_password, map_name, session_name, server_type) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        (
            &unique_name,
            &install_path,
            "stopped",
            game_port,
            query_port,
            rcon_port,
            70,
            "admin123",
            &map_name,
            &unique_name,
            "ASA", // Server type - ARK: Survival Ascended
        ),
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    Ok(Server {
        id,
        name: unique_name.clone(),
        install_path: PathBuf::from(install_path),
        status: ServerStatus::Stopped,
        ports: ServerPorts {
            game_port,
            query_port,
            rcon_port,
        },
        config: ServerConfig {
            max_players: 70,
            server_password: None,
            admin_password: "admin123".to_string(),
            map_name: map_name.clone(),
            session_name: unique_name,
            motd: None,
            mods: vec![],
            custom_args: None,
        },
        rcon_config: RconConfig {
            enabled: true,
            password: "admin123".to_string(),
        },
        created_at: chrono::Utc::now().to_rfc3339(),
        last_started: None,
    })
}

#[tauri::command]
pub async fn start_server(state: State<'_, AppState>, server_id: i64) -> Result<(), String> {
    println!("▶️ Starting server {}", server_id);

    // Get server details
    let (
        install_path,
        map_name,
        session_name,
        game_port,
        query_port,
        rcon_port,
        max_players,
        server_password,
        admin_password,
    ) = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let conn = db.get_connection().map_err(|e| e.to_string())?;

        conn.query_row(
            "SELECT install_path, map_name, session_name, game_port, query_port, rcon_port, 
             max_players, server_password, admin_password FROM servers WHERE id = ?1",
            [server_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, u16>(3)?,
                    row.get::<_, u16>(4)?,
                    row.get::<_, u16>(5)?,
                    row.get::<_, i32>(6)?,
                    row.get::<_, Option<String>>(7)?,
                    row.get::<_, String>(8)?,
                ))
            },
        )
        .map_err(|e| format!("Server not found: {}", e))?
    };

    // Start the server process
    state
        .process_manager
        .start_server(
            server_id,
            "ASA",
            &PathBuf::from(&install_path),
            &map_name,
            &session_name,
            game_port,
            query_port,
            rcon_port,
            max_players,
            server_password.as_deref(),
            &admin_password,
        )
        .map_err(|e| e.to_string())?;

    // Update status in database
    {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let conn = db.get_connection().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE servers SET status = 'running', last_started = datetime('now') WHERE id = ?1",
            [server_id],
        )
        .map_err(|e| e.to_string())?;
    }

    println!("  ✅ Server {} started", server_id);
    Ok(())
}

#[tauri::command]
pub async fn stop_server(state: State<'_, AppState>, server_id: i64) -> Result<(), String> {
    println!("⏹️ Stopping server {}", server_id);

    state
        .process_manager
        .stop_server(server_id)
        .map_err(|e| e.to_string())?;

    // Update status in database
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db.get_connection().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE servers SET status = 'stopped' WHERE id = ?1",
        [server_id],
    )
    .map_err(|e| e.to_string())?;

    println!("  ✅ Server {} stopped", server_id);
    Ok(())
}

#[tauri::command]
pub async fn restart_server(state: State<'_, AppState>, server_id: i64) -> Result<(), String> {
    println!("🔄 Restarting server {}", server_id);

    // Get server details
    let (
        install_path,
        map_name,
        session_name,
        game_port,
        query_port,
        rcon_port,
        max_players,
        server_password,
        admin_password,
    ) = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let conn = db.get_connection().map_err(|e| e.to_string())?;

        conn.query_row(
            "SELECT install_path, map_name, session_name, game_port, query_port, rcon_port, 
             max_players, server_password, admin_password FROM servers WHERE id = ?1",
            [server_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, u16>(3)?,
                    row.get::<_, u16>(4)?,
                    row.get::<_, u16>(5)?,
                    row.get::<_, i32>(6)?,
                    row.get::<_, Option<String>>(7)?,
                    row.get::<_, String>(8)?,
                ))
            },
        )
        .map_err(|e| format!("Server not found: {}", e))?
    };

    // Restart the server
    state
        .process_manager
        .restart_server(
            server_id,
            "ASA",
            &PathBuf::from(&install_path),
            &map_name,
            &session_name,
            game_port,
            query_port,
            rcon_port,
            max_players,
            server_password.as_deref(),
            &admin_password,
        )
        .map_err(|e| e.to_string())?;

    // Update status
    {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let conn = db.get_connection().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE servers SET status = 'running', last_started = datetime('now') WHERE id = ?1",
            [server_id],
        )
        .map_err(|e| e.to_string())?;
    }

    println!("  ✅ Server {} restarted", server_id);
    Ok(())
}

#[tauri::command]
pub async fn delete_server(state: State<'_, AppState>, server_id: i64) -> Result<(), String> {
    println!("🗑️ Deleting server {}", server_id);

    let db = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db.get_connection().map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM servers WHERE id = ?1", [server_id])
        .map_err(|e| e.to_string())?;

    println!("  ✅ Server {} deleted", server_id);
    Ok(())
}

#[tauri::command]
pub async fn update_server(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    server_id: i64,
) -> Result<(), String> {
    println!("📥 Updating server {}", server_id);

    // Get server install path
    let install_path = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let conn = db.get_connection().map_err(|e| e.to_string())?;

        conn.query_row(
            "SELECT install_path FROM servers WHERE id = ?1",
            [server_id],
            |row| row.get::<_, String>(0),
        )
        .map_err(|e| format!("Server not found: {}", e))?
    };

    // Update status to updating
    {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let conn = db.get_connection().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE servers SET status = 'updating' WHERE id = ?1",
            [server_id],
        )
        .map_err(|e| e.to_string())?;
    }

    // Run the update
    let installer = ServerInstaller::new(app_handle);
    installer
        .update_server(&PathBuf::from(&install_path))
        .await?;

    // Update status back to stopped
    {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let conn = db.get_connection().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE servers SET status = 'stopped' WHERE id = ?1",
            [server_id],
        )
        .map_err(|e| e.to_string())?;
    }

    println!("  ✅ Server {} updated", server_id);
    Ok(())
}

#[tauri::command]
pub async fn check_server_reachability(port: u16) -> Result<String, String> {
    // 1. Get Public IP
    let public_ip = match network::get_public_ip().await {
        Ok(ip) => ip,
        Err(_) => return Ok("LAN".to_string()), // If we can't get public IP, assume LAN or Offline
    };

    // 2. Check if port is open on that IP
    // Note: This checks if the port is reachable from "externally" (or at least hairpinned)
    let is_open = network::check_port_open(&public_ip, port);

    if is_open {
        Ok("Public".to_string())
    } else {
        Ok("LAN".to_string())
    }
}

#[tauri::command]
pub async fn start_log_watcher(
    server_id: i64,
    install_path: String,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    use crate::services::process_manager::ServerLogEvent;
    use std::fs::File;
    use std::io::{BufRead, BufReader, Seek, SeekFrom};
    use tauri::Emitter;

    let log_file_path = PathBuf::from(&install_path)
        .join("ShooterGame")
        .join("Saved")
        .join("Logs")
        .join("ShooterGame.log");

    // Spawn log watcher thread
    std::thread::spawn(move || {
        // Check if log file exists immediately (no waiting)
        if !log_file_path.exists() {
            let _ = app_handle.emit(
                "server_log",
                ServerLogEvent {
                    server_id,
                    line: format!("[Manager] Log file not found: {:?}", log_file_path),
                    is_stderr: true,
                },
            );
            return;
        }

        let file = match File::open(&log_file_path) {
            Ok(f) => f,
            Err(e) => {
                let _ = app_handle.emit(
                    "server_log",
                    ServerLogEvent {
                        server_id,
                        line: format!("[Manager] Failed to open log: {}", e),
                        is_stderr: true,
                    },
                );
                return;
            }
        };

        let mut reader = BufReader::new(file);

        // Seek to get last 100KB of logs (recent history)
        let file_meta = std::fs::metadata(&log_file_path);
        if let Ok(meta) = file_meta {
            let file_size = meta.len() as i64;
            let seek_pos = std::cmp::max(0, file_size - 100000);
            let _ = reader.seek(SeekFrom::Start(seek_pos as u64));
            // Skip partial first line if we seeked into the middle
            if seek_pos > 0 {
                let mut skip = String::new();
                let _ = reader.read_line(&mut skip);
            }
        }

        // First pass: read all existing content quickly
        loop {
            let mut line = String::new();
            match reader.read_line(&mut line) {
                Ok(0) => break, // No more data, exit first pass
                Ok(_) => {
                    let line = line.trim_end().to_string();
                    if !line.is_empty() {
                        let _ = app_handle.emit(
                            "server_log",
                            ServerLogEvent {
                                server_id,
                                line,
                                is_stderr: false,
                            },
                        );
                    }
                }
                Err(_) => break,
            }
        }

        // Second pass: tail new lines as they appear
        loop {
            let mut line = String::new();
            match reader.read_line(&mut line) {
                Ok(0) => {
                    std::thread::sleep(std::time::Duration::from_millis(100));
                }
                Ok(_) => {
                    let line = line.trim_end().to_string();
                    if !line.is_empty() {
                        let _ = app_handle.emit(
                            "server_log",
                            ServerLogEvent {
                                server_id,
                                line,
                                is_stderr: false,
                            },
                        );
                    }
                }
                Err(_) => {
                    std::thread::sleep(std::time::Duration::from_millis(100));
                }
            }
        }
    });

    Ok(())
}
