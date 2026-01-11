// Configuration schema types and mappings for ARK Server settings
// Enhanced with sliders, dropdowns, and categories for Visual Settings Manager

export type FieldType = 'text' | 'number' | 'boolean' | 'slider' | 'dropdown';

export interface ConfigField {
    section: string;
    key: string;
    label: string;
    type: FieldType;
    defaultValue?: string;
    description?: string;
    // Slider properties
    min?: number;
    max?: number;
    step?: number;
    // Dropdown options
    options?: { value: string; label: string; group?: string }[];
}

export interface ConfigGroup {
    title: string;
    description?: string;
    category: 'server' | 'gameplay' | 'player' | 'dino' | 'breeding' | 'structure' | 'pvp' | 'advanced';
    icon?: string;
    fields: ConfigField[];
}

// Category metadata for UI
export const CATEGORY_INFO: Record<string, { label: string; icon: string; color: string }> = {
    server: { label: 'Server', icon: '🖥️', color: 'from-blue-500 to-cyan-500' },
    gameplay: { label: 'Gameplay', icon: '🎮', color: 'from-purple-500 to-pink-500' },
    player: { label: 'Player', icon: '👤', color: 'from-green-500 to-emerald-500' },
    dino: { label: 'Dinosaurs', icon: '🦖', color: 'from-orange-500 to-amber-500' },
    breeding: { label: 'Breeding', icon: '🥚', color: 'from-pink-500 to-rose-500' },
    structure: { label: 'Structures', icon: '🏠', color: 'from-slate-500 to-gray-500' },
    pvp: { label: 'PvP/PvE', icon: '⚔️', color: 'from-red-500 to-orange-500' },
    advanced: { label: 'Advanced', icon: '⚙️', color: 'from-violet-500 to-purple-500' },
};

// GameUserSettings.ini schema - Enhanced with sliders and categories
export const GAME_USER_SETTINGS_SCHEMA: ConfigGroup[] = [
    {
        title: 'Server Identity',
        description: 'Basic server configuration',
        category: 'server',
        fields: [
            {
                section: 'ServerSettings',
                key: 'ServerName',
                label: 'Server Name',
                type: 'text',
                defaultValue: 'ARK Server',
                description: 'The name of your server'
            },
            {
                section: 'ServerSettings',
                key: 'ServerPassword',
                label: 'Server Password',
                type: 'text',
                defaultValue: '',
                description: 'Password required to join'
            },
            {
                section: 'ServerSettings',
                key: 'ServerAdminPassword',
                label: 'Admin Password',
                type: 'text',
                defaultValue: '',
                description: 'Password for admin access'
            },
            {
                section: 'ServerSettings',
                key: 'MaxPlayers',
                label: 'Max Players',
                type: 'slider',
                defaultValue: '70',
                min: 1,
                max: 127,
                step: 1,
                description: 'Maximum number of players'
            },
            {
                section: 'ServerSettings',
                key: 'MapName',
                label: 'Map',
                type: 'dropdown',
                defaultValue: 'TheIsland_WP',
                options: [
                    // Released Maps
                    { value: 'TheIsland_WP', label: '🏝️ The Island', group: 'released' },
                    { value: 'ScorchedEarth_WP', label: '🏜️ Scorched Earth', group: 'released' },
                    { value: 'TheCenter_WP', label: '🌊 The Center', group: 'released' },
                    { value: 'Aberration_WP', label: '🍄 Aberration', group: 'released' },
                    { value: 'Extinction_WP', label: '🏚️ Extinction', group: 'released' },
                    { value: 'Ragnarok_WP', label: '⚔️ Ragnarok', group: 'released' },
                    { value: 'Valguero_WP', label: '🦖 Valguero', group: 'released' },
                    { value: 'LostColony_WP', label: '🚀 Lost Colony', group: 'released' },
                    // Premium Mod Maps
                    { value: 'Astraeos_WP', label: '✨ Astraeos', group: 'premium' },
                    { value: 'Forglar_WP', label: '🌿 Forglar', group: 'premium' },
                    // Coming 2026
                    { value: 'Genesis_WP', label: '🧬 Genesis Part 1', group: 'upcoming' },
                    { value: 'Genesis2_WP', label: '🛸 Genesis Part 2', group: 'upcoming' },
                    { value: 'CrystalIsles_WP', label: '💎 Crystal Isles', group: 'upcoming' },
                    { value: 'LostIsland_WP', label: '🗿 Lost Island', group: 'upcoming' },
                    { value: 'Fjordur_WP', label: '❄️ Fjordur', group: 'upcoming' }
                ],
                description: 'The map to load'
            },
            {
                section: 'ServerSettings',
                key: 'IPAddress',
                label: 'Server IP Address',
                type: 'text',
                defaultValue: '',
                description: 'Bind server to specific IP address (leave empty for all interfaces)'
            },
            {
                section: 'ServerSettings',
                key: 'RCONEnabled',
                label: 'RCON Enabled',
                type: 'boolean',
                defaultValue: 'True',
                description: 'Enable remote console access for server management'
            },
            {
                section: 'ServerSettings',
                key: 'RCONPort',
                label: 'RCON Port',
                type: 'slider',
                defaultValue: '27020',
                min: 1,
                max: 65535,
                step: 1,
                description: 'Port for RCON connections (default: 27020)'
            }
        ]
    },
    {
        title: 'XP & Progression',
        description: 'Experience and leveling settings',
        category: 'gameplay',
        fields: [
            {
                section: 'ServerSettings',
                key: 'XPMultiplier',
                label: 'XP Multiplier',
                type: 'slider',
                defaultValue: '1.0',
                min: 0.1,
                max: 10,
                step: 0.1,
                description: 'Experience gain multiplier'
            },
            {
                section: 'ServerSettings',
                key: 'DifficultyOffset',
                label: 'Difficulty',
                type: 'slider',
                defaultValue: '1.0',
                min: 0,
                max: 1,
                step: 0.1,
                description: 'Server difficulty (affects max wild dino level)'
            },
            {
                section: 'ServerSettings',
                key: 'OverrideOfficialDifficulty',
                label: 'Override Max Difficulty',
                type: 'slider',
                defaultValue: '5.0',
                min: 1,
                max: 15,
                step: 0.5,
                description: 'Override max wild dino level (5.0 = level 150)'
            }
        ]
    },
    {
        title: 'Harvesting',
        description: 'Resource gathering rates',
        category: 'gameplay',
        fields: [
            {
                section: 'ServerSettings',
                key: 'HarvestAmountMultiplier',
                label: 'Harvest Amount',
                type: 'slider',
                defaultValue: '1.0',
                min: 0.1,
                max: 10,
                step: 0.1,
                description: 'Resource harvest amount multiplier'
            },
            {
                section: 'ServerSettings',
                key: 'HarvestHealthMultiplier',
                label: 'Harvest Health',
                type: 'slider',
                defaultValue: '1.0',
                min: 0.1,
                max: 10,
                step: 0.1,
                description: 'Resource node health multiplier'
            },
            {
                section: 'ServerSettings',
                key: 'ResourcesRespawnPeriodMultiplier',
                label: 'Resource Respawn',
                type: 'slider',
                defaultValue: '1.0',
                min: 0.1,
                max: 5,
                step: 0.1,
                description: 'Resource respawn rate (lower = faster)'
            }
        ]
    },
    {
        title: 'Taming',
        description: 'Creature taming settings',
        category: 'dino',
        fields: [
            {
                section: 'ServerSettings',
                key: 'TamingSpeedMultiplier',
                label: 'Taming Speed',
                type: 'slider',
                defaultValue: '1.0',
                min: 0.1,
                max: 20,
                step: 0.5,
                description: 'How fast creatures are tamed'
            },
            {
                section: 'ServerSettings',
                key: 'DinoCharacterFoodDrainMultiplier',
                label: 'Dino Food Drain',
                type: 'slider',
                defaultValue: '1.0',
                min: 0.1,
                max: 5,
                step: 0.1,
                description: 'Dino food consumption rate'
            }
        ]
    },
    {
        title: 'Dino Stats',
        description: 'Dinosaur stat multipliers',
        category: 'dino',
        fields: [
            {
                section: 'ServerSettings',
                key: 'DinoCountMultiplier',
                label: 'Wild Dino Count',
                type: 'slider',
                defaultValue: '1.0',
                min: 0.1,
                max: 3,
                step: 0.1,
                description: 'Wild dino spawn density'
            },
            {
                section: 'ServerSettings',
                key: 'DinoDamageMultiplier',
                label: 'Dino Damage',
                type: 'slider',
                defaultValue: '1.0',
                min: 0.1,
                max: 5,
                step: 0.1,
                description: 'Dino damage output'
            },
            {
                section: 'ServerSettings',
                key: 'DinoResistanceMultiplier',
                label: 'Dino Resistance',
                type: 'slider',
                defaultValue: '1.0',
                min: 0.1,
                max: 5,
                step: 0.1,
                description: 'Dino damage resistance'
            }
        ]
    },
    {
        title: 'Player Stats',
        description: 'Player stat multipliers',
        category: 'player',
        fields: [
            {
                section: 'ServerSettings',
                key: 'PlayerDamageMultiplier',
                label: 'Player Damage',
                type: 'slider',
                defaultValue: '1.0',
                min: 0.1,
                max: 5,
                step: 0.1,
                description: 'Player damage output'
            },
            {
                section: 'ServerSettings',
                key: 'PlayerResistanceMultiplier',
                label: 'Player Resistance',
                type: 'slider',
                defaultValue: '1.0',
                min: 0.1,
                max: 5,
                step: 0.1,
                description: 'Player damage resistance'
            },
            {
                section: 'ServerSettings',
                key: 'PlayerCharacterWaterDrainMultiplier',
                label: 'Water Drain',
                type: 'slider',
                defaultValue: '1.0',
                min: 0.1,
                max: 3,
                step: 0.1,
                description: 'Water consumption rate'
            },
            {
                section: 'ServerSettings',
                key: 'PlayerCharacterFoodDrainMultiplier',
                label: 'Food Drain',
                type: 'slider',
                defaultValue: '1.0',
                min: 0.1,
                max: 3,
                step: 0.1,
                description: 'Food consumption rate'
            },
            {
                section: 'ServerSettings',
                key: 'PlayerCharacterStaminaDrainMultiplier',
                label: 'Stamina Drain',
                type: 'slider',
                defaultValue: '1.0',
                min: 0.1,
                max: 3,
                step: 0.1,
                description: 'Stamina consumption rate'
            },
            {
                section: 'ServerSettings',
                key: 'PlayerCharacterHealthRecoveryMultiplier',
                label: 'Health Recovery',
                type: 'slider',
                defaultValue: '1.0',
                min: 0.1,
                max: 5,
                step: 0.1,
                description: 'Health regeneration rate'
            }
        ]
    },
    {
        title: 'Structure Settings',
        description: 'Building and decay options',
        category: 'structure',
        fields: [
            {
                section: 'ServerSettings',
                key: 'StructureResistanceMultiplier',
                label: 'Structure Resistance',
                type: 'slider',
                defaultValue: '1.0',
                min: 0.1,
                max: 5,
                step: 0.1,
                description: 'Structure damage resistance'
            },
            {
                section: 'ServerSettings',
                key: 'StructureDamageMultiplier',
                label: 'Structure Damage',
                type: 'slider',
                defaultValue: '1.0',
                min: 0.1,
                max: 5,
                step: 0.1,
                description: 'Damage to structures'
            },
            {
                section: 'ServerSettings',
                key: 'PvEStructureDecayPeriodMultiplier',
                label: 'Structure Decay Rate',
                type: 'slider',
                defaultValue: '1.0',
                min: 0.1,
                max: 5,
                step: 0.1,
                description: 'Structure decay period'
            },
            {
                section: 'ServerSettings',
                key: 'AlwaysAllowStructurePickup',
                label: 'Allow Structure Pickup',
                type: 'boolean',
                defaultValue: 'False',
                description: 'Allow picking up placed structures'
            }
        ]
    },
    {
        title: 'Day/Night Cycle',
        description: 'Time and lighting settings',
        category: 'gameplay',
        fields: [
            {
                section: 'ServerSettings',
                key: 'DayTimeSpeedScale',
                label: 'Day Speed',
                type: 'slider',
                defaultValue: '1.0',
                min: 0.1,
                max: 5,
                step: 0.1,
                description: 'Daytime speed multiplier'
            },
            {
                section: 'ServerSettings',
                key: 'NightTimeSpeedScale',
                label: 'Night Speed',
                type: 'slider',
                defaultValue: '1.0',
                min: 0.1,
                max: 5,
                step: 0.1,
                description: 'Nighttime speed multiplier'
            },
            {
                section: 'ServerSettings',
                key: 'DayCycleSpeedScale',
                label: 'Day Cycle Speed',
                type: 'slider',
                defaultValue: '1.0',
                min: 0.1,
                max: 5,
                step: 0.1,
                description: 'Overall day/night cycle speed'
            }
        ]
    },
    {
        title: 'PvP / PvE Mode',
        description: 'Player vs Player settings',
        category: 'pvp',
        fields: [
            {
                section: 'ServerSettings',
                key: 'serverPVE',
                label: 'PvE Mode',
                type: 'boolean',
                defaultValue: 'False',
                description: 'Enable PvE mode (no player damage)'
            },
            {
                section: 'ServerSettings',
                key: 'AllowCaveBuildingPvE',
                label: 'Allow Cave Building',
                type: 'boolean',
                defaultValue: 'False',
                description: 'Allow building inside caves'
            },
            {
                section: 'ServerSettings',
                key: 'PreventTribeAlliances',
                label: 'Prevent Alliances',
                type: 'boolean',
                defaultValue: 'False',
                description: 'Prevent tribe alliances'
            },
            {
                section: 'ServerSettings',
                key: 'AllowFlyerCarryPvE',
                label: 'Allow Flyer Carry',
                type: 'boolean',
                defaultValue: 'False',
                description: 'Allow flyers to carry players'
            },
            {
                section: 'ServerSettings',
                key: 'EnablePvPGamma',
                label: 'Enable PvP Gamma',
                type: 'boolean',
                defaultValue: 'False',
                description: 'Allow gamma adjustment in PvP'
            },
            {
                section: 'ServerSettings',
                key: 'DisableFriendlyFire',
                label: 'Disable Friendly Fire',
                type: 'boolean',
                defaultValue: 'False',
                description: 'Prevent tribe members hurting each other'
            }
        ]
    }
];

// Game.ini schema - Enhanced with sliders and categories
export const GAME_INI_SCHEMA: ConfigGroup[] = [
    {
        title: 'Breeding Speed',
        description: 'Egg hatching and baby maturation',
        category: 'breeding',
        fields: [
            {
                section: '/Script/ShooterGame.ShooterGameMode',
                key: 'EggHatchSpeedMultiplier',
                label: 'Egg Hatch Speed',
                type: 'slider',
                defaultValue: '1.0',
                min: 1,
                max: 100,
                step: 1,
                description: 'How fast eggs hatch'
            },
            {
                section: '/Script/ShooterGame.ShooterGameMode',
                key: 'BabyMatureSpeedMultiplier',
                label: 'Baby Mature Speed',
                type: 'slider',
                defaultValue: '1.0',
                min: 1,
                max: 100,
                step: 1,
                description: 'How fast babies mature'
            },
            {
                section: '/Script/ShooterGame.ShooterGameMode',
                key: 'BabyFoodConsumptionSpeedMultiplier',
                label: 'Baby Food Consumption',
                type: 'slider',
                defaultValue: '1.0',
                min: 0.1,
                max: 5,
                step: 0.1,
                description: 'Baby food consumption rate'
            }
        ]
    },
    {
        title: 'Mating & Imprinting',
        description: 'Mating intervals and imprinting settings',
        category: 'breeding',
        fields: [
            {
                section: '/Script/ShooterGame.ShooterGameMode',
                key: 'MatingIntervalMultiplier',
                label: 'Mating Interval',
                type: 'slider',
                defaultValue: '1.0',
                min: 0.01,
                max: 1,
                step: 0.01,
                description: 'Time between matings (lower = faster)'
            },
            {
                section: '/Script/ShooterGame.ShooterGameMode',
                key: 'BabyCuddleIntervalMultiplier',
                label: 'Cuddle Interval',
                type: 'slider',
                defaultValue: '1.0',
                min: 0.01,
                max: 1,
                step: 0.01,
                description: 'Time between imprint cuddles (lower = faster)'
            },
            {
                section: '/Script/ShooterGame.ShooterGameMode',
                key: 'BabyCuddleGracePeriodMultiplier',
                label: 'Cuddle Grace Period',
                type: 'slider',
                defaultValue: '1.0',
                min: 1,
                max: 10,
                step: 0.5,
                description: 'Grace period for imprinting'
            },
            {
                section: '/Script/ShooterGame.ShooterGameMode',
                key: 'BabyImprintAmountMultiplier',
                label: 'Imprint Amount',
                type: 'slider',
                defaultValue: '1.0',
                min: 1,
                max: 10,
                step: 0.5,
                description: 'Imprint percentage per cuddle'
            }
        ]
    },
    {
        title: 'Tribe Settings',
        description: 'Tribe size and governance',
        category: 'advanced',
        fields: [
            {
                section: '/Script/ShooterGame.ShooterGameMode',
                key: 'MaxNumberOfPlayersInTribe',
                label: 'Max Tribe Size',
                type: 'slider',
                defaultValue: '70',
                min: 1,
                max: 500,
                step: 1,
                description: 'Maximum players per tribe'
            },
            {
                section: '/Script/ShooterGame.ShooterGameMode',
                key: 'MaxAlliancesPerTribe',
                label: 'Max Alliances',
                type: 'slider',
                defaultValue: '10',
                min: 0,
                max: 50,
                step: 1,
                description: 'Maximum alliances per tribe'
            },
            {
                section: '/Script/ShooterGame.ShooterGameMode',
                key: 'MaxTribesPerAlliance',
                label: 'Max Tribes Per Alliance',
                type: 'slider',
                defaultValue: '10',
                min: 2,
                max: 50,
                step: 1,
                description: 'Maximum tribes in an alliance'
            }
        ]
    },
    {
        title: 'Level & XP Overrides',
        description: 'Advanced leveling configuration',
        category: 'advanced',
        fields: [
            {
                section: '/Script/ShooterGame.ShooterGameMode',
                key: 'OverrideMaxExperiencePointsPlayer',
                label: 'Max Player XP',
                type: 'number',
                defaultValue: '0',
                description: 'Total XP required for max level'
            },
            {
                section: '/Script/ShooterGame.ShooterGameMode',
                key: 'LevelExperienceRampOverrides',
                label: 'XP Ramp Override',
                type: 'text',
                defaultValue: '',
                description: 'Custom XP curve (array)'
            }
        ]
    },
    {
        title: 'Loot Quality',
        description: 'Supply crate and loot settings',
        category: 'gameplay',
        fields: [
            {
                section: '/Script/ShooterGame.ShooterGameMode',
                key: 'SupplyCrateLootQualityMultiplier',
                label: 'Supply Crate Quality',
                type: 'slider',
                defaultValue: '1.0',
                min: 1,
                max: 10,
                step: 0.5,
                description: 'Supply crate loot quality'
            },
            {
                section: '/Script/ShooterGame.ShooterGameMode',
                key: 'FishingLootQualityMultiplier',
                label: 'Fishing Loot Quality',
                type: 'slider',
                defaultValue: '1.0',
                min: 1,
                max: 10,
                step: 0.5,
                description: 'Fishing loot quality'
            },
            {
                section: '/Script/ShooterGame.ShooterGameMode',
                key: 'CraftingSkillBonusMultiplier',
                label: 'Crafting Skill Bonus',
                type: 'slider',
                defaultValue: '1.0',
                min: 1,
                max: 10,
                step: 0.5,
                description: 'Crafting skill effectiveness'
            }
        ]
    },
    {
        title: 'Advanced Options',
        description: 'Advanced gameplay tweaks',
        category: 'advanced',
        fields: [
            {
                section: '/Script/ShooterGame.ShooterGameMode',
                key: 'bAllowUnlimitedRespecs',
                label: 'Unlimited Mindwipes',
                type: 'boolean',
                defaultValue: 'False',
                description: 'Allow unlimited mindwipe tonics'
            },
            {
                section: '/Script/ShooterGame.ShooterGameMode',
                key: 'bDisableDinoDecayPvE',
                label: 'Disable Dino Decay',
                type: 'boolean',
                defaultValue: 'False',
                description: 'Disable dino decay in PvE'
            },
            {
                section: '/Script/ShooterGame.ShooterGameMode',
                key: 'bPassiveDefensesDamageRiderlessDinos',
                label: 'Turrets Attack Riderless',
                type: 'boolean',
                defaultValue: 'False',
                description: 'Turrets damage riderless dinos'
            },
            {
                section: '/Script/ShooterGame.ShooterGameMode',
                key: 'bUseSingleplayerSettings',
                label: 'Singleplayer Settings',
                type: 'boolean',
                defaultValue: 'False',
                description: 'Use singleplayer-like rates'
            },
            {
                section: '/Script/ShooterGame.ShooterGameMode',
                key: 'bDisableStructurePlacementCollision',
                label: 'Disable Placement Collision',
                type: 'boolean',
                defaultValue: 'False',
                description: 'Allow overlapping structures'
            }
        ]
    }
];

// Helper to get all config groups for a specific category
export function getGroupsByCategory(category: string): ConfigGroup[] {
    return [
        ...GAME_USER_SETTINGS_SCHEMA.filter(g => g.category === category),
        ...GAME_INI_SCHEMA.filter(g => g.category === category)
    ];
}

// Helper to get all categories with their groups
export function getAllCategories(): { category: string; info: typeof CATEGORY_INFO[string]; groups: ConfigGroup[] }[] {
    return Object.entries(CATEGORY_INFO).map(([category, info]) => ({
        category,
        info,
        groups: getGroupsByCategory(category)
    })).filter(c => c.groups.length > 0);
}

// Parse INI content into key-value map
export function parseIniContent(content: string): Map<string, Map<string, string>> {
    const sections = new Map<string, Map<string, string>>();
    let currentSection = '';

    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            currentSection = trimmed.slice(1, -1);
            if (!sections.has(currentSection)) {
                sections.set(currentSection, new Map());
            }
        } else if (trimmed.includes('=') && currentSection) {
            const [key, ...valueParts] = trimmed.split('=');
            const value = valueParts.join('=');
            sections.get(currentSection)?.set(key.trim(), value.trim());
        }
    }

    return sections;
}

// Generate INI content from sections map
export function generateIniContent(sections: Map<string, Map<string, string>>): string {
    let content = '';

    for (const [section, values] of sections) {
        content += `[${section}]\n`;
        for (const [key, value] of values) {
            content += `${key}=${value}\n`;
        }
        content += '\n';
    }

    return content;
}
