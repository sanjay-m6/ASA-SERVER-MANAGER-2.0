import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Server, Activity, Cpu, HardDrive, Zap, Shield, Terminal, Copy, Puzzle, ScrollText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useServerStore } from '../stores/serverStore';
import { useUIStore } from '../stores/uiStore';
import { cn, formatBytes } from '../utils/helpers';
import { getAllServers, getSystemInfo } from '../utils/tauri';
import PerformanceMonitor from '../components/performance/PerformanceMonitor';
import InstallServerDialog from '../components/server/InstallServerDialog';

export default function Dashboard() {
  const { servers, setServers } = useServerStore();
  const { systemInfo, setSystemInfo } = useUIStore();
  const [performanceHistory, setPerformanceHistory] = useState<any[]>([]);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const navigate = useNavigate();

  const handleCopyIp = (port: number) => {
    // Use localhost for local servers
    const ip = '127.0.0.1';
    const address = `${ip}:${port}`;
    navigator.clipboard.writeText(address);
    toast.success(`Copied ${address} to clipboard`);
  };

  useEffect(() => {
    // Initial fetch
    getAllServers().then(setServers).catch(console.error);

    const fetchSystemInfo = async () => {
      try {
        const info = await getSystemInfo();
        setSystemInfo(info);

        setPerformanceHistory(prev => {
          const now = new Date();
          const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

          const newPoint = {
            time: timeStr,
            cpu: info.cpuUsage,
            memory: (info.ramUsage / info.ramTotal) * 100,
            players: 0 // TODO: Implement real player count via RCON/Query
          };

          const newHistory = [...prev, newPoint];
          if (newHistory.length > 60) newHistory.shift(); // Keep last 60 seconds
          return newHistory;
        });
      } catch (error) {
        console.error('Failed to fetch system info:', error);
      }
    };

    fetchSystemInfo();

    // Poll for updates
    const interval = setInterval(() => {
      fetchSystemInfo();
      getAllServers().then((currentServers) => {
        setServers(currentServers);

        // Check reachability for running servers that don't have it set or every so often
        // For simplicity, we just trigger it if it's missing or maybe on a slower interval?
        // Let's just do it on load in the other effect or specifically here
        currentServers.forEach(s => {
          if (s.status === 'running') {
            // Check once when status changes, not repeatedly
          }
        });
      }).catch(console.error);
    }, 5000); // Poll every 5 seconds instead of 1 second

    return () => clearInterval(interval);
  }, [setServers, setSystemInfo]);

  // Effect to check reachability
  useEffect(() => {
    servers.forEach(server => {
      if (server.status === 'running' && !server.reachability) {
        useServerStore.getState().checkReachability(server.id, server.ports.gamePort);
      }
    });
  }, [servers]);

  const runningServers = servers.filter(s => s.status === 'running').length;
  const totalServers = servers.length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-violet-400">
            Dashboard
          </h1>
          <p className="text-slate-400 mt-2 text-lg">Monitor your ARK empire in real-time</p>
        </div>
        <div className="flex items-center space-x-2 px-4 py-2 rounded-full glass-panel">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs font-medium text-green-400">System Online</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Servers */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-sky-500/20"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-sky-500/10 rounded-xl">
                <Server className="w-6 h-6 text-sky-400" />
              </div>
              <span className="text-xs font-medium text-sky-400 bg-sky-500/10 px-2 py-1 rounded-lg">
                Total
              </span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{totalServers}</p>
            <p className="text-slate-400 text-sm">Active Servers</p>
          </div>
        </div>

        {/* Running Servers */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-green-500/20"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <Activity className="w-6 h-6 text-green-400" />
              </div>
              <span className="text-xs font-medium text-green-400 bg-green-500/10 px-2 py-1 rounded-lg">
                Online
              </span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{runningServers}</p>
            <p className="text-slate-400 text-sm">Servers Running</p>
          </div>
        </div>

        {/* CPU Usage */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-violet-500/20"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-violet-500/10 rounded-xl">
                <Cpu className="w-6 h-6 text-violet-400" />
              </div>
              <span className="text-xs font-medium text-violet-400 bg-violet-500/10 px-2 py-1 rounded-lg">
                Load
              </span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{systemInfo?.cpuUsage.toFixed(1) || 0}%</p>
            <div className="w-full bg-slate-700/50 rounded-full h-1.5 mt-2">
              <div
                className="bg-violet-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${systemInfo?.cpuUsage || 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* RAM Usage */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-pink-500/20"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-pink-500/10 rounded-xl">
                <HardDrive className="w-6 h-6 text-pink-400" />
              </div>
              <span className="text-xs font-medium text-pink-400 bg-pink-500/10 px-2 py-1 rounded-lg">
                Memory
              </span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {formatBytes((systemInfo?.ramUsage || 0) * 1024 * 1024 * 1024, 1)}
            </p>
            <p className="text-slate-400 text-xs mt-1">
              of {formatBytes((systemInfo?.ramTotal || 0) * 1024 * 1024 * 1024, 1)}
            </p>
          </div>
        </div>
      </div>

      {/* Server List Preview */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-sky-400" />
            Server Status
          </h2>
          <button className="text-sm text-sky-400 hover:text-sky-300 transition-colors">
            View All
          </button>
        </div>

        {servers.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-700/50 rounded-xl bg-slate-800/20">
            <Server className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-300 mb-2">No Servers Detected</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
              Your fleet is empty. Deploy your first ARK server to get started.
            </p>
            <button
              onClick={() => setShowInstallDialog(true)}
              className="px-6 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-lg transition-all shadow-lg shadow-sky-500/20 font-medium">
              Deploy Server
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {servers.slice(0, 5).map((server) => (
              <div
                key={server.id}
                className="flex items-center justify-between p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl hover:bg-slate-800/60 transition-all group"
              >
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className={cn(
                      'w-3 h-3 rounded-full',
                      server.status === 'running' && 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]',
                      server.status === 'stopped' && 'bg-slate-500',
                      server.status === 'crashed' && 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]',
                      server.status === 'starting' && 'bg-yellow-500 animate-pulse',
                      server.status === 'updating' && 'bg-blue-500 animate-pulse'
                    )} />
                    {server.status === 'running' && (
                      <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-sky-400 transition-colors">{server.name}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-700/50 border border-slate-600/50">{server.serverType}</span>
                      <span>Port {server.ports.gamePort}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {/* Connect Info */}
                  <div className="hidden md:flex items-center bg-slate-900/50 rounded-lg px-3 py-1.5 border border-slate-700 hover:border-sky-500/30 transition-colors group/ip">
                    <span className="text-xs font-mono text-slate-400 mr-2">127.0.0.1:{server.ports.gamePort}</span>
                    <button
                      onClick={() => handleCopyIp(server.ports.gamePort)}
                      className="p-1 hover:bg-slate-700 rounded-md transition-colors"
                      title="Copy Connection Info"
                    >
                      <Copy className="w-3 h-3 text-slate-500 group-hover/ip:text-sky-400" />
                    </button>
                  </div>

                  <div className="text-right mr-4">
                    <p className="text-xs text-slate-400">Uptime</p>
                    <p className="text-sm font-mono text-white">
                      {server.status === 'running' ? '2h 14m' : '-'}
                    </p>
                  </div>
                  <span className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5',
                    server.status === 'running' && 'bg-green-500/10 text-green-400 border-green-500/20',
                    server.status === 'stopped' && 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                    server.status === 'crashed' && 'bg-red-500/10 text-red-400 border-red-500/20',
                    server.status === 'starting' && 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
                    server.status === 'updating' && 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  )}>
                    {server.status.charAt(0).toUpperCase() + server.status.slice(1)}
                    {server.status === 'running' && server.reachability && (
                      <span className="opacity-75 font-normal">
                        | {server.reachability === 'Public' ? 'Public' : 'LAN'}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <button
          onClick={() => setShowInstallDialog(true)}
          className="p-6 glass-panel rounded-2xl hover:border-sky-500/50 transition-all text-left group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-sky-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <Zap className="w-6 h-6 text-sky-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Quick Install</h3>
            <p className="text-sm text-slate-400">Deploy a new server</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/visual-settings')}
          className="p-6 glass-panel rounded-2xl hover:border-violet-500/50 transition-all text-left group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <Shield className="w-6 h-6 text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Visual Settings</h3>
            <p className="text-sm text-slate-400">Configure gameplay</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/mods')}
          className="p-6 glass-panel rounded-2xl hover:border-pink-500/50 transition-all text-left group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-pink-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <Puzzle className="w-6 h-6 text-pink-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Mod Manager</h3>
            <p className="text-sm text-slate-400">Install & manage mods</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/logs')}
          className="p-6 glass-panel rounded-2xl hover:border-amber-500/50 transition-all text-left group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <ScrollText className="w-6 h-6 text-amber-400" /> {/* Changed icon to ScrollText to match */}
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">View Logs</h3>
            <p className="text-sm text-slate-400">Server output logs</p>
          </div>
        </button>
      </div>

      {/* Performance Monitor */}
      <PerformanceMonitor data={performanceHistory} />

      {/* Install Server Dialog */}
      {showInstallDialog && (
        <InstallServerDialog onClose={() => setShowInstallDialog(false)} />
      )}
    </div>
  );
}
