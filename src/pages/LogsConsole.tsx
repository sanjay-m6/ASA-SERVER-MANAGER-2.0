import { useState } from 'react';
import { Filter, Send } from 'lucide-react';
import { cn } from '../utils/helpers';

const MOCK_LOGS = [
    { time: '06:05:12', level: 'info', message: 'Server listening on port 7777' },
    { time: '06:05:15', level: 'info', message: 'Player "Steve123" connected from 192.168.1.100' },
    { time: '06:05:18', level: 'warning', message: 'Mod "Structures Plus" version mismatch detected' },
    { time: '06:05:22', level: 'error', message: 'Failed to load save file: corrupted data' },
    { time: '06:05:25', level: 'info', message: 'Successfully loaded map: TheIsland' },
];

export default function LogsConsole() {
    const [command, setCommand] = useState('');
    const [filter, setFilter] = useState('all');

    const filteredLogs = filter === 'all'
        ? MOCK_LOGS
        : MOCK_LOGS.filter(log => log.level === filter);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Logs Console</h1>
                    <p className="text-dark-400 mt-1">View server logs and execute console commands</p>
                </div>

                <div className="flex items-center space-x-2">
                    <Filter className="w-5 h-5 text-dark-500" />
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-600"
                    >
                        <option value="all">All Logs</option>
                        <option value="info">Info</option>
                        <option value="warning">Warnings</option>
                        <option value="error">Errors</option>
                    </select>
                </div>
            </div>

            {/* Logs */}
            <div className="bg-dark-950 border border-dark-800 rounded-xl p-4 font-mono text-sm h-96 overflow-y-auto">
                {filteredLogs.map((log, index) => (
                    <div key={index} className="py-1 hover:bg-dark-900">
                        <span className="text-dark-500">[{log.time}]</span>
                        <span className={cn(
                            'ml-2 font-semibold',
                            log.level === 'info' && 'text-blue-400',
                            log.level === 'warning' && 'text-yellow-400',
                            log.level === 'error' && 'text-red-400'
                        )}>
                            [{log.level.toUpperCase()}]
                        </span>
                        <span className="ml-2 text-dark-300">{log.message}</span>
                    </div>
                ))}
            </div>

            {/* Console Input */}
            <div className="flex space-x-2">
                <input
                    type="text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder="Enter RCON command..."
                    className="flex-1 px-4 py-3 bg-dark-900 border border-dark-800 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
                <button className="flex items-center space-x-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors">
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                </button>
            </div>
        </div>
    );
}
