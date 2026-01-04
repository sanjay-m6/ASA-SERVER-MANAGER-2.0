import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'react-hot-toast';
import {
    GAME_USER_SETTINGS_SCHEMA,
    GAME_INI_SCHEMA,
    getAllCategories,
    parseIniContent,
    generateIniContent,
    ConfigField
} from '../data/configMappings';
import { SettingsSlider, SettingsToggle, SettingsDropdown, SettingsTextInput } from '../components/settings';

interface Server {
    id: number;
    name: string;
}

export default function VisualSettingsManager() {
    const [servers, setServers] = useState<Server[]>([]);
    const [selectedServerId, setSelectedServerId] = useState<number | null>(null);
    const [activeCategory, setActiveCategory] = useState('server');
    const [searchQuery, setSearchQuery] = useState('');
    const [settings, setSettings] = useState<Map<string, Map<string, string>>>(new Map());
    const [originalSettings, setOriginalSettings] = useState<Map<string, Map<string, string>>>(new Map());
    const [isLoading, setIsLoading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    const categories = useMemo(() => getAllCategories(), []);
    const location = useLocation();

    // Load servers on mount AND when navigating to this page
    useEffect(() => {
        loadServers();
    }, [location.key]);

    // Load config when server is selected
    useEffect(() => {
        if (selectedServerId) {
            loadConfig();
        }
    }, [selectedServerId]);

    async function loadServers() {
        try {
            console.log('🔍 Loading servers...');
            const result = await invoke<Server[]>('get_all_servers');
            console.log('📊 Servers result:', result);
            setServers(result);
            if (result.length > 0) {
                setSelectedServerId(result[0].id);
                toast.success(`Found ${result.length} server(s)`);
            } else {
                console.log('⚠️ No servers returned from backend');
            }
        } catch (error) {
            console.error('❌ Failed to load servers:', error);
            toast.error(`Failed to load servers: ${error}`);
        }
    }

    async function loadConfig() {
        if (!selectedServerId) return;
        setIsLoading(true);

        try {
            // Load GameUserSettings.ini
            const gameUserSettings = await invoke<string>('read_config', {
                serverId: selectedServerId,
                configType: 'GameUserSettings'
            });

            // Load Game.ini
            const gameIni = await invoke<string>('read_config', {
                serverId: selectedServerId,
                configType: 'Game'
            });

            const parsed = new Map<string, Map<string, string>>();

            // Parse GameUserSettings
            const gusMap = parseIniContent(gameUserSettings);
            for (const [section, values] of gusMap) {
                if (!parsed.has(section)) parsed.set(section, new Map());
                for (const [key, value] of values) {
                    parsed.get(section)!.set(key, value);
                }
            }

            // Parse Game.ini
            const giMap = parseIniContent(gameIni);
            for (const [section, values] of giMap) {
                if (!parsed.has(section)) parsed.set(section, new Map());
                for (const [key, value] of values) {
                    parsed.get(section)!.set(key, value);
                }
            }

            setSettings(parsed);
            setOriginalSettings(new Map(parsed));
            setHasChanges(false);
            toast.success('Configuration loaded');
        } catch (error) {
            toast.error('Failed to load configuration');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    function getSettingValue(field: ConfigField): string {
        const section = settings.get(field.section);
        if (section) {
            const value = section.get(field.key);
            if (value !== undefined) return value;
        }
        return field.defaultValue || '';
    }

    function setSettingValue(field: ConfigField, value: string) {
        const newSettings = new Map(settings);
        if (!newSettings.has(field.section)) {
            newSettings.set(field.section, new Map());
        }
        newSettings.get(field.section)!.set(field.key, value);
        setSettings(newSettings);
        setHasChanges(true);
    }

    async function saveConfig() {
        if (!selectedServerId) return;
        setIsLoading(true);

        try {
            // Separate settings by file
            const gameUserSettingsSections = new Map<string, Map<string, string>>();
            const gameIniSections = new Map<string, Map<string, string>>();

            for (const [section, values] of settings) {
                if (section.startsWith('/Script/')) {
                    gameIniSections.set(section, values);
                } else {
                    gameUserSettingsSections.set(section, values);
                }
            }

            // Backup before saving
            await invoke('backup_config', {
                serverId: selectedServerId,
                configType: 'GameUserSettings'
            }).catch(() => { }); // Ignore if backup fails

            await invoke('backup_config', {
                serverId: selectedServerId,
                configType: 'Game'
            }).catch(() => { });

            // Save GameUserSettings.ini
            await invoke('save_config', {
                serverId: selectedServerId,
                configType: 'GameUserSettings',
                content: generateIniContent(gameUserSettingsSections)
            });

            // Save Game.ini
            await invoke('save_config', {
                serverId: selectedServerId,
                configType: 'Game',
                content: generateIniContent(gameIniSections)
            });

            setOriginalSettings(new Map(settings));
            setHasChanges(false);
            toast.success('Configuration saved successfully');
        } catch (error) {
            toast.error('Failed to save configuration');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    function rollbackChanges() {
        setSettings(new Map(originalSettings));
        setHasChanges(false);
        toast.success('Changes reverted');
    }

    // Filter settings based on search
    const filteredGroups = useMemo(() => {
        const allGroups = [...GAME_USER_SETTINGS_SCHEMA, ...GAME_INI_SCHEMA];

        if (!searchQuery) {
            return allGroups.filter(g => g.category === activeCategory);
        }

        const query = searchQuery.toLowerCase();
        return allGroups.filter(group =>
            group.fields.some(field =>
                field.label.toLowerCase().includes(query) ||
                field.key.toLowerCase().includes(query) ||
                field.description?.toLowerCase().includes(query)
            )
        ).map(group => ({
            ...group,
            fields: group.fields.filter(field =>
                field.label.toLowerCase().includes(query) ||
                field.key.toLowerCase().includes(query) ||
                field.description?.toLowerCase().includes(query)
            )
        }));
    }, [searchQuery, activeCategory]);

    // Custom Level Logic
    const [customDinoLevel, setCustomDinoLevel] = useState(150);
    const [customPlayerLevel, setCustomPlayerLevel] = useState(105);

    // Sync local state if settings change externally (e.g. load)
    useEffect(() => {
        const diff = getSettingValue({ section: 'ServerSettings', key: 'OverrideOfficialDifficulty', type: 'number', label: '' });
        if (diff) {
            setCustomDinoLevel(Math.round(parseFloat(diff) * 30));
        }
    }, [settings]);

    const applyDinoLevel = (level: number) => {
        setCustomDinoLevel(level);
        const difficulty = (level / 30).toFixed(1);
        setSettingValue({ section: 'ServerSettings', key: 'OverrideOfficialDifficulty', type: 'number', label: '' }, difficulty);
        // Also set DifficultyOffset to 1.0 mostly
        setSettingValue({ section: 'ServerSettings', key: 'DifficultyOffset', type: 'number', label: '' }, '1.0');
    };

    const applyPlayerLevel = (maxLevel: number) => {
        setCustomPlayerLevel(maxLevel);

        // Generate ramp
        // Formula: XP = 10 * Level^2 (Basic curve)
        const levels = [];
        for (let i = 0; i < maxLevel; i++) {
            const xp = Math.floor(10 * Math.pow(i, 2.2)); // Slight curve
            levels.push(`ExperiencePointsForLevel[${i}]=${xp}`);
        }

        const rampString = `(${levels.join(',')})`;

        // We need to set this in Game.ini under /Script/ShooterGame.ShooterGameMode
        // Note: This is an array in INI, might need special handling if our parser/generator doesn't support arrays nicely
        // But usually standard Key=Value works if Value handles the parentheses structure.

        setSettingValue({
            section: '/Script/ShooterGame.ShooterGameMode',
            key: 'LevelExperienceRampOverrides',
            type: 'text',
            label: ''
        }, rampString);

        setSettingValue({
            section: '/Script/ShooterGame.ShooterGameMode',
            key: 'OverrideMaxExperiencePointsPlayer',
            type: 'number',
            label: ''
        }, Math.floor(10 * Math.pow(maxLevel, 2.2)).toString());
    };

    function renderField(field: ConfigField) {
        const value = getSettingValue(field);

        switch (field.type) {
            case 'slider':
                return (
                    <SettingsSlider
                        key={field.key}
                        label={field.label}
                        value={parseFloat(value) || field.min || 0}
                        min={field.min || 0}
                        max={field.max || 10}
                        step={field.step || 0.1}
                        description={field.description}
                        onChange={(v) => setSettingValue(field, v.toString())}
                    />
                );

            case 'boolean':
                return (
                    <SettingsToggle
                        key={field.key}
                        label={field.label}
                        value={value.toLowerCase() === 'true'}
                        description={field.description}
                        onChange={(v) => setSettingValue(field, v ? 'True' : 'False')}
                    />
                );

            case 'dropdown':
                return (
                    <SettingsDropdown
                        key={field.key}
                        label={field.label}
                        value={value}
                        options={field.options || []}
                        description={field.description}
                        onChange={(v) => setSettingValue(field, v)}
                    />
                );

            case 'number':
                return (
                    <SettingsSlider
                        key={field.key}
                        label={field.label}
                        value={parseFloat(value) || 0}
                        min={field.min || 0}
                        max={field.max || 100}
                        step={field.step || 1}
                        description={field.description}
                        onChange={(v) => setSettingValue(field, v.toString())}
                    />
                );

            default:
                return (
                    <SettingsTextInput
                        key={field.key}
                        label={field.label}
                        value={value}
                        description={field.description}
                        onChange={(v) => setSettingValue(field, v)}
                    />
                );
        }
    }

    // Generate preview content
    const previewContent = useMemo(() => {
        const gameUserSettingsSections = new Map<string, Map<string, string>>();
        const gameIniSections = new Map<string, Map<string, string>>();

        for (const [section, values] of settings) {
            if (section.startsWith('/Script/')) {
                gameIniSections.set(section, values);
            } else {
                gameUserSettingsSections.set(section, values);
            }
        }

        return {
            gameUserSettings: generateIniContent(gameUserSettingsSections),
            gameIni: generateIniContent(gameIniSections)
        };
    }, [settings]);

    if (!selectedServerId) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="text-6xl mb-4">⚙️</div>
                    <h2 className="text-xl font-bold text-white mb-2">No Servers Found</h2>
                    <p className="text-slate-400">Install a server first to access settings</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="bg-slate-800/50 border-b border-slate-700 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold text-white">⚙️ Server Settings</h1>

                        {/* Server Selector */}
                        <select
                            value={selectedServerId || ''}
                            onChange={(e) => setSelectedServerId(Number(e.target.value))}
                            className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                        >
                            {servers.map(server => (
                                <option key={server.id} value={server.id}>{server.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Search */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search settings..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400 w-64"
                            />
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        {/* Preview Toggle */}
                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className={`px-4 py-2 rounded-lg transition-colors ${showPreview
                                ? 'bg-cyan-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            📄 Preview
                        </button>

                        {/* Action Buttons */}
                        {hasChanges && (
                            <>
                                <button
                                    onClick={rollbackChanges}
                                    className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                                >
                                    ↩️ Rollback
                                </button>
                                <button
                                    onClick={saveConfig}
                                    disabled={isLoading}
                                    className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50"
                                >
                                    {isLoading ? '⏳ Saving...' : '💾 Save Changes'}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Category Tabs */}
                {!searchQuery && (
                    <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                        {categories.map(({ category, info }) => (
                            <button
                                key={category}
                                onClick={() => setActiveCategory(category)}
                                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${activeCategory === category
                                    ? `bg-gradient-to-r ${info.color} text-white shadow-lg`
                                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                                    }`}
                            >
                                {info.icon} {info.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden flex">
                {/* Settings Panel */}
                <div className={`flex-1 overflow-y-auto p-6 ${showPreview ? 'w-1/2' : 'w-full'}`}>
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-slate-400">Loading configuration...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {filteredGroups.map((group) => (
                                <div key={group.title} className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
                                    <h2 className="text-xl font-bold text-white mb-2">{group.title}</h2>
                                    {group.description && (
                                        <p className="text-slate-400 mb-4">{group.description}</p>
                                    )}
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {group.fields.map(field => renderField(field))}
                                    </div>
                                </div>
                            ))}

                            {filteredGroups.length === 0 && (
                                <div className="text-center py-12">
                                    <div className="text-4xl mb-4">🔍</div>
                                    <p className="text-slate-400">No settings found for "{searchQuery}"</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Custom Level Generator (Special Section) */}
                    {activeCategory === 'gameplay' && !searchQuery && (
                        <div className="mt-8 bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
                            <h2 className="text-xl font-bold text-white mb-2">🎓 Custom Levels Generator</h2>
                            <p className="text-slate-400 mb-6">Easily generate complex difficulty and XP configurations.</p>

                            <div className="grid gap-8 md:grid-cols-2">
                                {/* Dino Levels */}
                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-slate-300">Max Wild Dino Level</label>
                                    <div className="flex gap-4">
                                        <input
                                            type="number"
                                            value={customDinoLevel}
                                            onChange={(e) => applyDinoLevel(parseInt(e.target.value) || 30)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
                                            min="30" max="3000" step="30"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Sets Difficulty Offset to 1.0 and Override Official Difficulty to {(customDinoLevel / 30).toFixed(1)}.
                                    </p>
                                </div>

                                {/* Player Levels */}
                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-slate-300">Max Player Level</label>
                                    <div className="flex gap-4">
                                        <input
                                            type="number"
                                            value={customPlayerLevel}
                                            onChange={(e) => setCustomPlayerLevel(parseInt(e.target.value) || 105)}
                                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
                                        />
                                        <button
                                            onClick={() => applyPlayerLevel(customPlayerLevel)}
                                            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-medium transition-colors"
                                        >
                                            Generate
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Generates a standard exponential XP ramp for {customPlayerLevel} levels.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Preview Panel */}
                {showPreview && (
                    <div className="w-1/2 border-l border-slate-700 bg-slate-900/50 overflow-y-auto p-6">
                        <h2 className="text-lg font-bold text-white mb-4">📄 INI Preview</h2>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-cyan-400 font-mono mb-2">GameUserSettings.ini</h3>
                                <pre className="bg-slate-950 rounded-lg p-4 text-sm text-slate-300 overflow-x-auto font-mono whitespace-pre-wrap">
                                    {previewContent.gameUserSettings || '(empty)'}
                                </pre>
                            </div>

                            <div>
                                <h3 className="text-cyan-400 font-mono mb-2">Game.ini</h3>
                                <pre className="bg-slate-950 rounded-lg p-4 text-sm text-slate-300 overflow-x-auto font-mono whitespace-pre-wrap">
                                    {previewContent.gameIni || '(empty)'}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Unsaved Changes Indicator */}
            {hasChanges && (
                <div className="bg-amber-500/20 border-t border-amber-500/50 px-4 py-2 flex items-center justify-center gap-2">
                    <span className="text-amber-400">⚠️ You have unsaved changes</span>
                </div>
            )}
        </div>
    );
}
