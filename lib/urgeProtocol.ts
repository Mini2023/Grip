import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// We can use the service role key if needed from process.env.SUPABASE_SERVICE_ROLE_KEY or just anon
const supabase = createClient(supabaseUrl || "https://placeholder.supabase.co", supabaseKey || "placeholder-anon-key");

export async function generateUrgeContext(userId: string): Promise<string> {
    const { data: sessions, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error || !sessions) {
        return "User Profil konnte nicht geladen werden.";
    }

    // 1. Calculate current streak and relapses
    let relapses = 0;
    
    // Sort oldest to newest to calculate streak and relapses
    const sorted = [...sessions].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    let streakStart = sorted.length > 0 ? new Date(sorted[0].created_at) : new Date();

    for (const s of sorted) {
        if ((s.regret_score || 0) > 7) {
            relapses++;
            streakStart = new Date(s.created_at); // streak resets on relapse
        }
    }

    const now = new Date();
    const streakMinutes = Math.max(0, Math.floor((now.getTime() - streakStart.getTime()) / 60000));
    
    const days = Math.floor(streakMinutes / 1440);
    const hours = Math.floor((streakMinutes % 1440) / 60);
    const streakStr = `${days} Tage, ${hours} Stunden`;

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
        .slice(0, 3)
        .map(([tag]) => tag);

    const tagsStr = topTags.length > 0 ? topTags.join(', ') : 'Keine';

    return `User Profil: Aktueller Streak: ${streakStr}. Haupt-Trigger: [${tagsStr}]. Bisherige Rückschläge: ${relapses}.`;
}
