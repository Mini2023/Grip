export interface UserXP {
    totalXP: number;
    level: number;
    progressToNextLevel: number;
    rank: string;
}

export const XP_PER_LEVEL = 100;

export const getRank = (xp: number): string => {
    if (xp < 500) return 'Initiate';
    if (xp < 2000) return 'Sentinel';
    if (xp < 5000) return 'Guardian';
    if (xp < 10000) return 'Elite Operator';
    return 'Grip Master';
};

export const calculateLevel = (totalXP: number): UserXP => {
    const level = Math.floor(totalXP / XP_PER_LEVEL) + 1;
    const progressToNextLevel = ((totalXP % XP_PER_LEVEL) / XP_PER_LEVEL) * 100;
    const rank = getRank(totalXP);
    return {
        totalXP,
        level,
        progressToNextLevel,
        rank
    };
};

export const XP_REWARDS = {
    SHIELD_DAY: 10,
    LAB_ENTRY: 5,
    BADGE_UNLOCK: 50,
    URGE_DEFEATED: 20
};
