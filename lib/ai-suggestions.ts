
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function aggregateUserData(userId: string) {
    const { data: sessions, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId);

    if (error || !sessions) return null;

    // 1. Base Preferences
    const animatedCount = sessions.filter(s => s.content_type === 'Digital Art').length;
    const realLifeCount = sessions.filter(s => s.content_type === 'Real Life').length;
    
    // Format: Inferred from duration (0 = Photos/Comics, >0 = Videos)
    const videoCount = sessions.filter(s => (parseInt(s.duration_minutes) || 0) > 0).length;
    const photoCount = sessions.filter(s => (parseInt(s.duration_minutes) || 0) === 0).length;

    // 2. Aggregate Tags
    const tagCounts: Record<string, number> = {};
    const ignoredTags = ['4k', '1080p', 'hd', 'unknown'];
    
    sessions.forEach(s => {
        if (Array.isArray(s.categories)) {
            s.categories.forEach((tag: string) => {
                const normalized = tag.toLowerCase().trim();
                if (!ignoredTags.includes(normalized) && normalized.length > 1) {
                    tagCounts[normalized] = (tagCounts[normalized] || 0) + 1;
                }
            });
        }
    });

    const topTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag]) => tag);

    // 3. Aggregate Performers
    const performerCounts: Record<string, number> = {};
    sessions.forEach(s => {
        if (s.performer && s.performer.toLowerCase() !== 'unknown') {
            const name = s.performer.trim();
            performerCounts[name] = (performerCounts[name] || 0) + 1;
        }
    });

    const topPerformers = Object.entries(performerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name]) => name);

    // 4. Other Preferences
    const avgDuration = sessions.length > 0
        ? sessions.reduce((sum, s) => sum + (parseInt(s.duration_minutes) || 0), 0) / sessions.length
        : 0;

    return {
        base_preferences: {
            theme: animatedCount > realLifeCount ? 'Animated/Gezeichnet' : 'Real Life',
            format: videoCount > photoCount ? 'Videos' : 'Photos/Comics'
        },
        top_tags: topTags,
        top_performers: topPerformers,
        avg_duration_minutes: Math.round(avgDuration)
    };
}
