import { useState, useEffect } from 'react';
import { Save, Loader2, FileText, Settings, Database } from 'lucide-react';
import { cn } from '../utils/helpers';
import { readConfig, saveConfig } from '../utils/tauri';
import toast from 'react-hot-toast';
import { useServerStore } from '../stores/serverStore';
import { useLocation } from 'react-router-dom';
import { GAME_USER_SETTINGS_SCHEMA, GAME_INI_SCHEMA, ConfigGroup } from '../data/configMappings';

// Simple INI parser/serializer
const parseIni = (content: string) => {
    const config: Record<string, Record<string, string>> = {};
    let currentSection = '';

    content.split('\n').forEach(line => {
        line = line.trim();
        if (line.startsWith('[') && line.endsWith(']')) {
            currentSection = line.slice(1, -1);
            config[currentSection] = {};
        } else if (line.includes('=') && currentSection) {
            const [key, ...valueParts] = line.split('=');
            const value = valueParts.join('=');
            config[currentSection][key.trim()] = value.trim();
        }
    });

    return config;
};

const stringifyIni = (config: Record<string, Record<string, string>>) => {
    let content = '';
    for (const [section, settings] of Object.entries(config)) {
        content += `[${section}]\n`;
        for (const [key, value] of Object.entries(settings)) {
            content += `${key}=${value}\n`;
        }
        content += '\n';
    }
    return content;
};

export default function ConfigEditor() {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState<'visual' | 'raw'>('visual');
    const [configContent, setConfigContent] = useState('');
    const [parsedConfig, setParsedConfig] = useState<Record<string, Record<string, string>>>({});
    const [configFile, setConfigFile] = useState<string>('GameUserSettings');
    const [isLoading, setIsLoading] = useState(false);
    const { servers } = useServerStore();
    const [selectedServerId, setSelectedServerId] = useState<number | null>(null);

    // Initialize from navigation state if available
    useEffect(() => {
        if (location.state?.serverId) {
            setSelectedServerId(location.state.serverId);
        }
    }, [location.state]);

    // Select first server by default
    useEffect(() => {
        if (servers.length > 0 && !selectedServerId) {
            setSelectedServerId(servers[0].id);
        }
    }, [servers, selectedServerId]);

    // Load config
    useEffect(() => {
        const loadConfig = async () => {
            if (!selectedServerId) return;

            setIsLoading(true);
            try {
                const content = await readConfig(selectedServerId, configFile);
                setConfigContent(content);
                setParsedConfig(parseIni(content));
            } catch (error) {
                console.error('Failed to load config:', error);
                toast.error('Failed to load config');
            } finally {
                setIsLoading(false);
            }
        };

        loadConfig();
    }, [selectedServerId, configFile]);

    const handleSave = async () => {
        if (!selectedServerId) return;

        try {
            const contentToSave = activeTab === 'visual' ? stringifyIni(parsedConfig) : configContent;
            await saveConfig(selectedServerId, configFile, contentToSave);
            toast.success('Configuration saved successfully');

            // Reload to ensure sync
            const content = await readConfig(selectedServerId, configFile);
            setConfigContent(content);
            setParsedConfig(parseIni(content));
        } catch (error) {
            console.error('Failed to save config:', error);
            toast.error('Failed to save config');
        }
    };

    const updateSetting = (section: string, key: string, value: string) => {
        setParsedConfig(prev => {
            const newState = { ...prev };
            // Ensure section exists
            if (!newState[section]) {
                newState[section] = {};
            }
            // Update value
            newState[section] = {
                ...newState[section],
                [key]: value
            };
            return newState;
        });
    };

    // Helper to safely get a setting
    const getSetting = (section: string, key: string, defaultValue: string = '') => {
        return parsedConfig[section]?.[key] || defaultValue;
    };

    const getSchemaForFile = (): ConfigGroup[] | null => {
        switch (configFile) {
            case 'GameUserSettings':
                return GAME_USER_SETTINGS_SCHEMA;
            case 'Game':
                return GAME_INI_SCHEMA;
            default:
                return null;
        }
    };

    const renderVisualEditor = () => {
        const schema = getSchemaForFile();

        if (!schema) {
            return (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-800/30 rounded-2xl border border-slate-700/50">
                    <FileText className="w-16 h-16 text-slate-600 mb-4" />
                    <h3 className="text-xl font-medium text-white mb-2">Visual Editor Not Available</h3>
                    <p className="text-slate-400 max-w-md">
                        The visual editor is not yet available for {configFile}.ini.
                        Please use the Raw Text mode to edit this configuration file.
                    </p>
                    <button
                        onClick={() => setActiveTab('raw')}
                        className="mt-6 px-6 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg transition-colors"
                    >
                        Switch to Raw Text
                    </button>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 gap-8">
                {schema.map((group, groupIdx) => (
                    <div key={groupIdx} className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
                        <div className="mb-6">
                            <h3 className="text-xl font-semibold text-white flex items-center">
                                <span className={`w-1 h-6 rounded-full mr-3 ${groupIdx % 2 === 0 ? 'bg-emerald-500' : 'bg-cyan-500'}`}></span>
                                {group.title}
                            </h3>
                            {group.description && (
                                <p className="text-slate-400 text-sm mt-1 ml-4">{group.description}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {group.fields.map((field) => (
                                <div key={`${field.section}.${field.key}`} className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300 flex items-center justify-between">
                                        {field.label}
                                        {field.description && (
                                            <span className="text-xs text-slate-500 ml-2 truncate" title={field.description}>
                                                {field.description}
                                            </span>
                                        )}
                                    </label>

                                    {field.type === 'boolean' ? (
                                        <div className="flex items-center space-x-3 mt-1">
                                            <button
                                                onClick={() => updateSetting(field.section, field.key, getSetting(field.section, field.key, field.defaultValue?.toLowerCase()) === 'True' ? 'False' : 'True')}
                                                className={cn(
                                                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900",
                                                    getSetting(field.section, field.key, field.defaultValue?.toLowerCase()) === 'True' ? "bg-emerald-500" : "bg-slate-700"
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                        getSetting(field.section, field.key, field.defaultValue?.toLowerCase()) === 'True' ? "translate-x-6" : "translate-x-1"
                                                    )}
                                                />
                                            </button>
                                            <span className="text-sm text-slate-400">
                                                {getSetting(field.section, field.key, field.defaultValue?.toLowerCase()) === 'True' ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </div>
                                    ) : field.type === 'dropdown' && field.options ? (
                                        <select
                                            value={getSetting(field.section, field.key, field.defaultValue)}
                                            onChange={(e) => updateSetting(field.section, field.key, e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                                        >
                                            {/* Group options if they have groups */}
                                            {field.options.some(o => o.group) ? (
                                                <>
                                                    <optgroup label="🌍 Released Maps">
                                                        {field.options.filter(o => o.group === 'released').map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </optgroup>
                                                    <optgroup label="🎨 Premium Mods">
                                                        {field.options.filter(o => o.group === 'premium').map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </optgroup>
                                                    <optgroup label="🚀 Coming 2026">
                                                        {field.options.filter(o => o.group === 'upcoming').map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </optgroup>
                                                </>
                                            ) : (
                                                field.options.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))
                                            )}
                                        </select>
                                    ) : field.type === 'slider' ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="range"
                                                    min={field.min}
                                                    max={field.max}
                                                    step={field.step}
                                                    value={parseFloat(getSetting(field.section, field.key, field.defaultValue)) || field.min}
                                                    onChange={(e) => updateSetting(field.section, field.key, e.target.value)}
                                                    className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                                />
                                                <input
                                                    type="number"
                                                    min={field.min}
                                                    max={field.max}
                                                    step={field.step}
                                                    value={getSetting(field.section, field.key, field.defaultValue)}
                                                    onChange={(e) => updateSetting(field.section, field.key, e.target.value)}
                                                    className="w-20 px-3 py-1.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <input
                                            type={field.type === 'number' ? 'number' : 'text'}
                                            step={field.step}
                                            value={getSetting(field.section, field.key, field.defaultValue)}
                                            onChange={(e) => updateSetting(field.section, field.key, e.target.value)}
                                            className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                                            placeholder={field.defaultValue}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                        Config Editor
                    </h1>
                    <p className="text-slate-400 mt-1">Manage server settings and rules</p>
                </div>

                <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
                    <button
                        onClick={() => setActiveTab('visual')}
                        className={cn(
                            'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                            activeTab === 'visual'
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                : 'text-slate-400 hover:text-white'
                        )}
                    >
                        <Settings className="w-4 h-4" />
                        Visual Editor
                    </button>
                    <button
                        onClick={() => setActiveTab('raw')}
                        className={cn(
                            'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                            activeTab === 'raw'
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                : 'text-slate-400 hover:text-white'
                        )}
                    >
                        <FileText className="w-4 h-4" />
                        Raw Text
                    </button>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                <div className="flex md:flex-1 items-center gap-4 w-full">
                    <div className="relative min-w-[200px]">
                        <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                            value={selectedServerId || ''}
                            onChange={(e) => setSelectedServerId(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                        >
                            {servers.map(server => (
                                <option key={server.id} value={server.id}>{server.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="h-8 w-px bg-slate-700 mx-2 hidden md:block" />

                    <div className="flex items-center gap-2 flex-1 overflow-x-auto no-scrollbar">
                        {['GameUserSettings', 'Game', 'Engine', 'Scaling', 'Custom'].map((file) => (
                            <button
                                key={file}
                                onClick={() => setConfigFile(file)}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border",
                                    configFile === file
                                        ? "bg-slate-700 border-emerald-500/50 text-white"
                                        : "bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-slate-700/50"
                                )}
                            >
                                {file}.ini
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-shrink-0 w-full md:w-auto">
                    <button
                        onClick={handleSave}
                        className="w-full md:w-auto flex items-center justify-center space-x-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-lg shadow-emerald-500/20 font-medium"
                    >
                        <Save className="w-4 h-4" />
                        <span>Save Changes</span>
                    </button>
                </div>
            </div>

            {/* Editor Content */}
            <div className="glass-panel rounded-2xl p-6 min-h-[500px]">
                {isLoading ? (
                    <div className="flex flex-col justify-center items-center h-full py-32">
                        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                        <p className="text-slate-400">Loading configuration...</p>
                    </div>
                ) : activeTab === 'visual' ? (
                    renderVisualEditor()
                ) : (
                    <textarea
                        value={configContent}
                        onChange={(e) => setConfigContent(e.target.value)}
                        className="w-full h-[70vh] bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none leading-relaxed"
                        spellCheck={false}
                    />
                )}
            </div>
        </div>
    );
}
