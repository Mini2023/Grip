export type BadgeCategory = 'Sentinel' | 'Collector';

export interface Badge {
    id: string;
    name: string;
    description: string;
    howToGet: string;
    category: BadgeCategory;
    icon: string; // Lucide icon name
    threshold: number;
    requirementType: 'streak' | 'logs_count' | 'duration' | 'night_owl' | 'early_bird' | 'regret_score' | 'note_length';
}

export const BADGES: Badge[] = [
    // SENTINEL CATEGORY (Shield Streaks)
    {
        id: 'sent_7',
        name: 'System Reboot',
        description: 'Initial stabilization complete.',
        howToGet: 'Maintain a 7-day shield streak.',
        category: 'Sentinel',
        icon: 'Zap',
        threshold: 7,
        requirementType: 'streak'
    },
    {
        id: 'sent_30',
        name: 'Core Stability',
        description: 'Neural pathways restructured.',
        howToGet: 'Maintain a 30-day shield streak.',
        category: 'Sentinel',
        icon: 'Shield',
        threshold: 30,
        requirementType: 'streak'
    },
    {
        id: 'sent_90',
        name: 'High-Performance Unit',
        description: 'Reaching peak human efficiency.',
        howToGet: 'Maintain a 90-day shield streak.',
        category: 'Sentinel',
        icon: 'Activity',
        threshold: 90,
        requirementType: 'streak'
    },
    {
        id: 'sent_365',
        name: 'Sentinel of Control',
        description: 'Absolute sovereignty over urges.',
        howToGet: 'Maintain a 365-day shield streak.',
        category: 'Sentinel',
        icon: 'Trophy',
        threshold: 365,
        requirementType: 'streak'
    },

    // COLLECTOR CATEGORY (Lab Achievements)
    {
        id: 'coll_pov_10',
        name: 'POV Specialist',
        description: 'Specialist in first-person data.',
        howToGet: 'Log 10 sessions with category POV.',
        category: 'Collector',
        icon: 'Eye',
        threshold: 10,
        requirementType: 'logs_count'
    },
    {
        id: 'coll_night',
        name: 'Night Owl',
        description: 'The darkness is your lab.',
        howToGet: 'Log a session between 00:00 and 04:00.',
        category: 'Collector',
        icon: 'Moon',
        threshold: 1,
        requirementType: 'night_owl'
    },
    {
        id: 'coll_early',
        name: 'Early Bird',
        description: 'Analyzing the dawn.',
        howToGet: 'Log a session between 05:00 and 08:00.',
        category: 'Collector',
        icon: 'Sun',
        threshold: 1,
        requirementType: 'early_bird'
    },
    {
        id: 'coll_marathon',
        name: 'Marathoner',
        description: 'Endurance testing.',
        howToGet: 'Log a session longer than 60 minutes.',
        category: 'Collector',
        icon: 'Timer',
        threshold: 60,
        requirementType: 'duration'
    },
    {
        id: 'coll_quick',
        name: 'Quick Analysis',
        description: 'Fast data extraction.',
        howToGet: 'Log 5 sessions shorter than 5 minutes.',
        category: 'Collector',
        icon: 'Zap',
        threshold: 5,
        requirementType: 'logs_count'
    },
    {
        id: 'coll_scientist',
        name: 'Data Scientist',
        description: 'Volume and precision.',
        howToGet: 'Reach 25 total logs in the lab.',
        category: 'Collector',
        icon: 'Beaker',
        threshold: 25,
        requirementType: 'logs_count'
    },
    {
        id: 'coll_regret_max',
        name: 'Rock Bottom',
        description: 'Absolute clarity through regret.',
        howToGet: 'Log a session with a Regret Score of 10.',
        category: 'Collector',
        icon: 'AlertCircle',
        threshold: 10,
        requirementType: 'regret_score'
    },
    {
        id: 'coll_architect',
        name: 'The Architect',
        description: 'Detailed debriefing.',
        howToGet: 'Write a session note longer than 200 characters.',
        category: 'Collector',
        icon: 'FileText',
        threshold: 200,
        requirementType: 'note_length'
    },
    {
        id: 'coll_loyalist',
        name: 'Brand Loyalist',
        description: 'Source consistency.',
        howToGet: 'Log 10 sessions from the same URL domain.',
        category: 'Collector',
        icon: 'Link',
        threshold: 10,
        requirementType: 'logs_count'
    },
    {
        id: 'coll_variety',
        name: 'Variety King',
        description: 'Diverse data set.',
        howToGet: 'Log sessions with 10 different categories.',
        category: 'Collector',
        icon: 'Layers',
        threshold: 10,
        requirementType: 'logs_count'
    },
    {
        id: 'coll_zen',
        name: 'Zen Master',
        description: 'High recovery efficiency.',
        howToGet: 'Log 5 sessions with a Regret Score of 3 or less.',
        category: 'Collector',
        icon: 'Flower',
        threshold: 5,
        requirementType: 'regret_score'
    },
    {
        id: 'coll_shadow',
        name: 'Shadow Edge',
        description: 'Operating in the margins.',
        howToGet: 'Log 5 sessions while Privacy Mode is active.',
        category: 'Collector',
        icon: 'ShieldAlert',
        threshold: 5,
        requirementType: 'logs_count'
    },
    {
        id: 'coll_quest_master',
        name: 'Quest Master',
        description: 'The champion of daily tasks.',
        howToGet: 'Complete 20 quests.',
        category: 'Collector',
        icon: 'Trophy',
        threshold: 20,
        requirementType: 'logs_count'
    }
];

export const getNextMilestone = (currentStreak: number) => {
    return BADGES.find(b => b.category === 'Sentinel' && b.threshold > currentStreak);
};
