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

export const calculateStreakMinutes = (sessions: any[], profileCreatedAt?: string): number => {
    if (!sessions || sessions.length === 0) {
        if (!profileCreatedAt) return 0;
        const start = new Date(profileCreatedAt).getTime();
        const now = Date.now();
        return Math.max(0, Math.floor((now - start) / (1000 * 60)));
    }

    // Sort sessions by date (newest first)
    const sorted = [...sessions].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const lastSession = new Date(sorted[0].created_at).getTime();
    const now = Date.now();
    const diffMs = now - lastSession;
    return Math.max(0, Math.floor(diffMs / (1000 * 60)));
};

export const XP_REWARDS = {
    SHIELD_DAY: 10,
    LAB_ENTRY: 5,
    BADGE_UNLOCK: 50,
    URGE_DEFEATED: 20
};
