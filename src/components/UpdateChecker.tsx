import { useState, useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { Download, X, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '../utils/helpers';

export default function UpdateChecker() {
    const [updateAvailable, setUpdateAvailable] = useState<{ version: string; body: string } | null>(null);
    const [updateObj, setUpdateObj] = useState<Awaited<ReturnType<typeof check>> | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [showBanner, setShowBanner] = useState(false);

    const checkForUpdates = async () => {
        try {
            const update = await check();
            if (update) {
                setUpdateAvailable({
                    version: update.version,
                    body: update.body || 'New version available!',
                });
                setUpdateObj(update);
                setShowBanner(true);
            }
        } catch (err) {
            console.error('Update check failed:', err);
        }
    };

    const downloadAndInstall = async () => {
        if (!updateObj) return;
        
        setIsDownloading(true);
        setError(null);
        
        try {
            let downloaded = 0;
            await updateObj.downloadAndInstall((event) => {
                if (event.event === 'Progress') {
                    downloaded += event.data.chunkLength;
                    setDownloadProgress(Math.min((downloaded / 10000000) * 100, 99));
                }
            });
            await relaunch();
        } catch (err) {
            console.error('Update failed:', err);
            setError('Failed to download update');
            setIsDownloading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(checkForUpdates, 5000);
        return () => clearTimeout(timer);
    }, []);

    if (!showBanner || !updateAvailable) return null;

    return (
        <div className={cn(
            "fixed bottom-4 right-4 z-50 max-w-sm",
            "bg-gradient-to-br from-slate-900 to-slate-800",
            "border border-sky-500/30 rounded-xl shadow-2xl shadow-sky-500/10"
        )}>
            <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-sky-500/20">
                            <Download className="w-5 h-5 text-sky-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">Update Available</h3>
                            <p className="text-sm text-slate-400">Version {updateAvailable.version}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowBanner(false)}
                        className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4 text-slate-400" />
                    </button>
                </div>

                <p className="text-sm text-slate-300 mb-4 line-clamp-3">
                    {updateAvailable.body}
                </p>

                {error && (
                    <div className="flex items-center gap-2 text-red-400 text-sm mb-3">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                {isDownloading && (
                    <div className="mb-3">
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-sky-500 to-cyan-500 transition-all duration-300"
                                style={{ width: `${downloadProgress}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-1 text-center">
                            Downloading... {Math.round(downloadProgress)}%
                        </p>
                    </div>
                )}

                <div className="flex gap-2">
                    <button
                        onClick={downloadAndInstall}
                        disabled={isDownloading}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg",
                            "bg-gradient-to-r from-sky-500 to-cyan-500",
                            "text-white font-medium text-sm",
                            "hover:from-sky-600 hover:to-cyan-600",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                            "transition-all duration-200"
                        )}
                    >
                        {isDownloading ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Installing...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                Update Now
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => setShowBanner(false)}
                        disabled={isDownloading}
                        className={cn(
                            "px-4 py-2 rounded-lg",
                            "bg-slate-700 text-slate-300 font-medium text-sm",
                            "hover:bg-slate-600",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                            "transition-colors"
                        )}
                    >
                        Later
                    </button>
                </div>
            </div>
        </div>
    );
}
