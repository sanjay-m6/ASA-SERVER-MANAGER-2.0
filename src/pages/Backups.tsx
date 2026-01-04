import { useState, useEffect } from 'react';
import { Database as BackupIcon, Plus, RotateCcw, Trash2, Loader2, FileArchive, Calendar, Clock } from 'lucide-react';
import { formatBytes } from '../utils/helpers';
import { createBackup, getBackups, restoreBackup, deleteBackup } from '../utils/tauri';
import { Backup } from '../types';
import toast from 'react-hot-toast';
import { useServerStore } from '../stores/serverStore';

export default function Backups() {
    const [backups, setBackups] = useState<Backup[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { servers } = useServerStore();
    const [selectedServerId, setSelectedServerId] = useState<number | null>(null);

    // Select first server by default
    useEffect(() => {
        if (servers.length > 0 && !selectedServerId) {
            setSelectedServerId(servers[0].id);
        }
    }, [servers, selectedServerId]);

    const fetchBackups = async () => {
        if (!selectedServerId) return;
        
        setIsLoading(true);
        try {
            const data = await getBackups(selectedServerId);
            setBackups(data);
        } catch (error) {
            console.error('Failed to fetch backups:', error);
            toast.error('Failed to fetch backups');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBackups();
    }, [selectedServerId]);

    const handleCreateBackup = async () => {
        if (!selectedServerId) return;

        try {
            await createBackup(selectedServerId, 'manual');
            toast.success('Backup created successfully');
            fetchBackups();
        } catch (error) {
            console.error('Failed to create backup:', error);
            toast.error('Failed to create backup');
        }
    };

    const handleRestore = async (id: number) => {
        if (!confirm('Are you sure? This will overwrite current server data.')) return;

        try {
            await restoreBackup(id);
            toast.success('Server restored from backup');
        } catch (error) {
            console.error('Failed to restore backup:', error);
            toast.error('Failed to restore backup');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this backup?')) return;

        try {
            await deleteBackup(id);
            toast.success('Backup deleted');
            fetchBackups();
        } catch (error) {
            console.error('Failed to delete backup:', error);
            toast.error('Failed to delete backup');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                        Backups & Rollbacks
                    </h1>
                    <p className="text-slate-400 mt-2 text-lg">Secure your progress with instant snapshots</p>
                </div>
                
                <div className="flex items-center space-x-4">
                    <select 
                        value={selectedServerId || ''}
                        onChange={(e) => setSelectedServerId(Number(e.target.value))}
                        className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                        {servers.map(server => (
                            <option key={server.id} value={server.id}>{server.name}</option>
                        ))}
                    </select>

                    <button 
                        onClick={handleCreateBackup}
                        className="flex items-center space-x-2 px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors shadow-lg shadow-amber-500/20 font-medium"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Create Backup</span>
                    </button>
                </div>
            </div>

            {/* Timeline */}
            <div className="space-y-6 relative pl-4">
                {/* Timeline Line */}
                <div className="absolute left-[27px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-amber-500/50 to-transparent" />

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                    </div>
                ) : backups.length === 0 ? (
                    <div className="text-center py-20 glass-panel rounded-2xl border-dashed border-2 border-slate-700/50 ml-8">
                        <FileArchive className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-slate-300">No Backups Found</h3>
                        <p className="text-slate-500 mt-2">Create a manual backup or wait for auto-backup</p>
                    </div>
                ) : (
                    backups.map((backup) => (
                        <div key={backup.id} className="relative pl-12 group">
                            {/* Timeline Dot */}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-900 border-2 border-amber-500 rounded-full z-10 group-hover:scale-110 transition-transform shadow-[0_0_10px_rgba(245,158,11,0.5)]" />

                            <div className="glass-panel rounded-2xl p-6 flex items-center justify-between hover:border-amber-500/30 transition-all">
                                <div className="flex items-center space-x-6">
                                    <div className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center border border-amber-500/20">
                                        <BackupIcon className="w-7 h-7 text-amber-500" />
                                    </div>
                                    <div>
                                        <div className="flex items-center space-x-3 mb-1">
                                            <h3 className="text-lg font-bold text-white capitalize">{backup.backupType} Backup</h3>
                                            <span className="px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-400 border border-slate-700">
                                                ID: {backup.id}
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-4 text-sm text-slate-400">
                                            <span className="flex items-center">
                                                <Calendar className="w-4 h-4 mr-1.5 text-slate-500" />
                                                {new Date(backup.createdAt).toLocaleDateString()}
                                            </span>
                                            <span className="flex items-center">
                                                <Clock className="w-4 h-4 mr-1.5 text-slate-500" />
                                                {new Date(backup.createdAt).toLocaleTimeString()}
                                            </span>
                                            <span className="flex items-center">
                                                <FileArchive className="w-4 h-4 mr-1.5 text-slate-500" />
                                                {formatBytes(backup.size)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => handleRestore(backup.id)}
                                        className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-green-600/20 hover:text-green-400 text-slate-300 rounded-lg transition-colors border border-slate-700 hover:border-green-500/50"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        <span>Restore</span>
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(backup.id)}
                                        className="p-2 bg-slate-800 hover:bg-red-600/20 hover:text-red-400 text-slate-300 rounded-lg transition-colors border border-slate-700 hover:border-red-500/50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
