use anyhow::{Context, Result};
use serde::Serialize;
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[cfg(target_os = "windows")]
mod window_hider {
    use std::sync::atomic::{AtomicU32, Ordering};
    use windows_sys::Win32::Foundation::{BOOL, HWND, LPARAM};
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetWindowThreadProcessId, ShowWindow, SW_HIDE,
    };

    static TARGET_PID: AtomicU32 = AtomicU32::new(0);

    unsafe extern "system" fn enum_windows_callback(hwnd: HWND, _lparam: LPARAM) -> BOOL {
        let mut window_pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, &mut window_pid);

        if window_pid == TARGET_PID.load(Ordering::SeqCst) {
            ShowWindow(hwnd, SW_HIDE);
        }
        1
    }

    pub fn hide_process_windows(pid: u32) {
        TARGET_PID.store(pid, Ordering::SeqCst);
        unsafe {
            EnumWindows(Some(enum_windows_callback), 0);
        }
    }
}

#[derive(Clone, Serialize)]
pub struct ServerLogEvent {
    pub server_id: i64,
    pub line: String,
    pub is_stderr: bool,
}

struct ServerProcess {
    child: Child,
    stop_flag: Arc<AtomicBool>,
}

pub struct ProcessManager {
    processes: Arc<Mutex<HashMap<i64, ServerProcess>>>,
    app_handle: AppHandle,
}

impl ProcessManager {
    pub fn new(app_handle: AppHandle) -> Self {
        ProcessManager {
            processes: Arc::new(Mutex::new(HashMap::new())),
            app_handle,
        }
    }

    /// Start ARK server
    pub fn start_server(
        &self,
        server_id: i64,
        _server_type: &str,
        install_path: &PathBuf,
        map_name: &str,
        session_name: &str,
        game_port: u16,
        query_port: u16,
        rcon_port: u16,
        max_players: i32,
        server_password: Option<&str>,
        admin_password: &str,
        ip_address: Option<&str>,
        cluster_id: Option<&str>,
        cluster_dir: Option<&str>,
    ) -> Result<()> {
        let executable = install_path
            .join("ShooterGame")
            .join("Binaries")
            .join("Win64")
            .join("ArkAscendedServer.exe");

        if !executable.exists() {
            return Err(anyhow::anyhow!(
                "Server executable not found at {:?}",
                executable
            ));
        }

        // Log file path
        let log_file_path = install_path
            .join("ShooterGame")
            .join("Saved")
            .join("Logs")
            .join("ShooterGame.log");

        // Build launch arguments
        let mut args = vec![
            map_name.to_string(),
            format!("listen"),
            format!("?SessionName={}", session_name),
            format!("?Port={}", game_port),
            format!("?QueryPort={}", query_port),
            format!("?RCONPort={}", rcon_port),
            format!("?MaxPlayers={}", max_players),
            format!("?ServerAdminPassword={}", admin_password),
        ];

        if let Some(password) = server_password {
            args.push(format!("?ServerPassword={}", password));
        }

        args.push("-log".to_string());
        args.push("-NoBattlEye".to_string());

        // Add MultiHome for IP binding
        if let Some(ip) = ip_address {
            if !ip.is_empty() {
                args.push(format!("-MultiHome={}", ip));
            }
        }

        // Add cluster configuration for cross-ARK travel
        if let (Some(cid), Some(cdir)) = (cluster_id, cluster_dir) {
            if !cid.is_empty() && !cdir.is_empty() {
                args.push(format!("-clusterid={}", cid));
                args.push(format!("-ClusterDirOverride=\"{}\"", cdir));
                println!(
                    "  🔗 Server {} joining cluster: {} at {}",
                    server_id, cid, cdir
                );
            }
        }

        let mut command = Command::new(&executable);
        command
            .args(&args)
            .stdout(Stdio::null())
            .stderr(Stdio::null());

        #[cfg(target_os = "windows")]
        {
            command.creation_flags(CREATE_NO_WINDOW);
        }

        let child = command.spawn().context("Failed to start server process")?;
        let child_pid = child.id();

        // Create stop flag for log watcher
        let stop_flag = Arc::new(AtomicBool::new(false));
        let stop_flag_clone = stop_flag.clone();

        // Store process
        {
            let mut processes = self.processes.lock().unwrap();
            processes.insert(server_id, ServerProcess { child, stop_flag });
        }

        // Start log file watcher
        let app_handle = self.app_handle.clone();
        std::thread::spawn(move || {
            // Wait for log file to be created
            let mut attempts = 0;
            while !log_file_path.exists() && attempts < 30 {
                std::thread::sleep(std::time::Duration::from_secs(1));
                attempts += 1;
            }

            if !log_file_path.exists() {
                let _ = app_handle.emit(
                    "server_log",
                    ServerLogEvent {
                        server_id,
                        line: "[Manager] Log file not found".to_string(),
                        is_stderr: true,
                    },
                );
                return;
            }

            // Open log file
            let file = match File::open(&log_file_path) {
                Ok(f) => f,
                Err(e) => {
                    let _ = app_handle.emit(
                        "server_log",
                        ServerLogEvent {
                            server_id,
                            line: format!("[Manager] Failed to open log file: {}", e),
                            is_stderr: true,
                        },
                    );
                    return;
                }
            };

            let mut reader = BufReader::new(file);

            // Seek to end to only read new lines
            let _ = reader.seek(SeekFrom::End(0));

            // Read new lines as they appear
            while !stop_flag_clone.load(Ordering::SeqCst) {
                let mut line = String::new();
                match reader.read_line(&mut line) {
                    Ok(0) => {
                        // No new data, wait a bit
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

        // Hide the ASA console windows after a delay
        #[cfg(target_os = "windows")]
        {
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_secs(3));
                window_hider::hide_process_windows(child_pid);
                std::thread::sleep(std::time::Duration::from_secs(5));
                window_hider::hide_process_windows(child_pid);
            });
        }

        Ok(())
    }

    /// Stop ARK server
    pub fn stop_server(&self, server_id: i64) -> Result<()> {
        let mut processes = self.processes.lock().unwrap();

        if let Some(mut server_proc) = processes.remove(&server_id) {
            // Signal log watcher to stop
            server_proc.stop_flag.store(true, Ordering::SeqCst);

            server_proc
                .child
                .kill()
                .context("Failed to kill server process")?;
            server_proc
                .child
                .wait()
                .context("Failed to wait for server process")?;
        }
        // If not found, it may have been started before app restart
        Ok(())
    }

    /// Check if server is running
    pub fn is_running(&self, server_id: i64) -> bool {
        let mut processes = self.processes.lock().unwrap();

        if let Some(server_proc) = processes.get_mut(&server_id) {
            match server_proc.child.try_wait() {
                Ok(Some(_)) => {
                    server_proc.stop_flag.store(true, Ordering::SeqCst);
                    processes.remove(&server_id);
                    false
                }
                Ok(None) => true,
                Err(_) => false,
            }
        } else {
            false
        }
    }

    /// Restart server
    pub fn restart_server(
        &self,
        server_id: i64,
        server_type: &str,
        install_path: &PathBuf,
        map_name: &str,
        session_name: &str,
        game_port: u16,
        query_port: u16,
        rcon_port: u16,
        max_players: i32,
        server_password: Option<&str>,
        admin_password: &str,
        ip_address: Option<&str>,
        cluster_id: Option<&str>,
        cluster_dir: Option<&str>,
    ) -> Result<()> {
        if self.is_running(server_id) {
            self.stop_server(server_id)?;
        }

        std::thread::sleep(std::time::Duration::from_secs(2));

        self.start_server(
            server_id,
            server_type,
            install_path,
            map_name,
            session_name,
            game_port,
            query_port,
            rcon_port,
            max_players,
            server_password,
            admin_password,
            ip_address,
            cluster_id,
            cluster_dir,
        )
    }
}
