import { NextResponse } from 'next/server';
import { executeGeminiWithFallback } from '@/lib/gemini-fallback';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";
const supabase = createClient(supabaseUrl, supabaseKey);

/* ── Junk Tag Blacklist ──────────────────────────────────────────────── */
const JUNK_TAGS = new Set([
    '4k', '1080p', '720p', '480p', '60fps', 'hd', 'sd', 'uhd',
    'download', 'free', 'full', 'video', 'videos', 'porn', 'sex',
    'unknown', 'n/a', 'none', 'other', 'undefined', 'null', '',
    'new', 'hot', 'best', 'top', 'popular', 'trending', 'latest',
    'exclusive', 'premium', 'amateur', 'professional', 'homemade',
    'verified', 'official', 'hq', 'mp4', 'mobile',
]);

const JUNK_PERFORMERS = new Set([
    'unknown', 'n/a', 'none', 'undefined', 'null', '', 'various',
    'amateur', 'homemade', 'user', 'anonymous',
]);

/* ── Helpers ─────────────────────────────────────────────────────────── */
const WEEKDAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function countItems(items: string[]): { name: string; count: number }[] {
    const map = new Map<string, number>();
    for (const raw of items) {
        const item = raw?.toString().trim().toLowerCase();
        if (!item || item.length < 2) continue;
        map.set(item, (map.get(item) || 0) + 1);
    }
    return Array.from(map.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
}

function extractCleanTags(s: any): string[] {
    const result: string[] = [];
    const cats = s.categories;
    if (Array.isArray(cats)) {
        for (const tag of cats) {
            const t = tag?.toString().trim().toLowerCase();
            if (t && !JUNK_TAGS.has(t)) result.push(t);
        }
    } else if (typeof cats === 'string' && cats.trim()) {
        const tags = cats.split(',').map((x: string) => x.trim().toLowerCase());
        for (const t of tags) {
            if (t && !JUNK_TAGS.has(t)) result.push(t);
        }
    }
    return result;
}

function getWeekdayIndex(dateStr: string): number {
    const d = new Date(dateStr).getDay(); // 0=Sun
    return d === 0 ? 6 : d - 1; // Convert to 0=Mon
}

export async function POST(req: Request) {
    try {
        const { userId } = await req.json();
        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        /* ── 1) Fetch sessions from last 30 days ────────────────────── */
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const { data: sessions, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('user_id', userId)
            .gte('created_at', thirtyDaysAgo.toISOString())
            .order('created_at', { ascending: true });

        if (error) throw new Error('Failed to fetch sessions: ' + error.message);
        const allSessions = sessions || [];

        const { data: prevSessions } = await supabase
            .from('sessions')
            .select('created_at')
            .eq('user_id', userId)
            .gte('created_at', sixtyDaysAgo.toISOString())
            .lt('created_at', thirtyDaysAgo.toISOString());

        const prevCount = prevSessions?.length || 0;

        /* ── 2) Aggregate: Tags (filtered) + weekday detail ─────────── */
        const allTags: string[] = [];
        const tagWeekdays = new Map<string, number[]>();

        for (const s of allSessions) {
            const tags = extractCleanTags(s);
            const wd = getWeekdayIndex(s.created_at);
            for (const t of tags) {
                allTags.push(t);
                if (!tagWeekdays.has(t)) tagWeekdays.set(t, [0, 0, 0, 0, 0, 0, 0]);
                tagWeekdays.get(t)![wd]++;
            }
        }

        const topTriggersRaw = countItems(allTags).slice(0, 5);
        const topTriggers = topTriggersRaw.map(t => ({
            ...t,
            weekdays: (tagWeekdays.get(t.name) || [0, 0, 0, 0, 0, 0, 0]).map((c, i) => ({
                day: WEEKDAY_NAMES[i], count: c,
            })),
            peak_day: WEEKDAY_NAMES[(tagWeekdays.get(t.name) || [0, 0, 0, 0, 0, 0, 0])
                .reduce((maxI, v, i, a) => v > a[maxI] ? i : maxI, 0)],
        }));

        /* ── 3) Aggregate: Performers (filtered) + weekday detail ───── */
        const allPerformers: string[] = [];
        const perfWeekdays = new Map<string, number[]>();

        for (const s of allSessions) {
            const p = s.performer?.toString().trim().toLowerCase();
            if (p && !JUNK_PERFORMERS.has(p)) {
                allPerformers.push(p);
                const wd = getWeekdayIndex(s.created_at);
                if (!perfWeekdays.has(p)) perfWeekdays.set(p, [0, 0, 0, 0, 0, 0, 0]);
                perfWeekdays.get(p)![wd]++;
            }
        }

        const topArtistsRaw = countItems(allPerformers).slice(0, 3);
        const topArtists = topArtistsRaw.map(a => ({
            ...a,
            weekdays: (perfWeekdays.get(a.name) || [0, 0, 0, 0, 0, 0, 0]).map((c, i) => ({
                day: WEEKDAY_NAMES[i], count: c,
            })),
            peak_day: WEEKDAY_NAMES[(perfWeekdays.get(a.name) || [0, 0, 0, 0, 0, 0, 0])
                .reduce((maxI, v, i, a) => v > a[maxI] ? i : maxI, 0)],
        }));

        /* ── 4) Aggregate: Media Types ──────────────────────────────── */
        const mediaMap = new Map<string, number>();
        for (const s of allSessions) {
            const ct = (s.content_type || 'unknown').toString().trim().toLowerCase();
            mediaMap.set(ct, (mediaMap.get(ct) || 0) + 1);
        }
        const totalMedia = allSessions.length || 1;
        const mediaTypes = Array.from(mediaMap.entries())
            .map(([type, count]) => ({
                type: type.charAt(0).toUpperCase() + type.slice(1),
                count,
                percent: Math.round((count / totalMedia) * 100)
            }))
            .sort((a, b) => b.count - a.count);

        /* ── 5) Aggregate: Weekly activity (this month vs prev) ──── */
        const weeklyThis: number[] = [0, 0, 0, 0];
        const weeklyPrev: number[] = [0, 0, 0, 0];

        for (const s of allSessions) {
            const daysSince = Math.floor(
                (Date.now() - new Date(s.created_at).getTime()) / (1000 * 60 * 60 * 24)
            );
            const weekIdx = Math.min(3, Math.floor(daysSince / 7));
            weeklyThis[3 - weekIdx]++;
        }

        if (prevSessions) {
            for (const s of prevSessions) {
                const daysSince = Math.floor(
                    (thirtyDaysAgo.getTime() - new Date(s.created_at).getTime()) / (1000 * 60 * 60 * 24)
                );
                const weekIdx = Math.min(3, Math.floor(daysSince / 7));
                weeklyPrev[3 - weekIdx]++;
            }
        }

        const behaviorChange = prevCount > 0
            ? Math.round(((allSessions.length - prevCount) / prevCount) * 100)
            : (allSessions.length > 0 ? 100 : 0);

        /* ── 6) Aggregate: Shield Stats ─────────────────────────────── */
        // Simple streak calculation: consecutive days without a high-regret session
        let longestStreak = 0;
        let currentStreak = 0;
        let totalRelapses = 0;
        const relapseTags: string[] = [];

        // Sort by date for streak computation
        const sorted = [...allSessions].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        let prevDate: string | null = null;
        for (const s of sorted) {
            const regret = s.regret_score || 0;
            const dateStr = new Date(s.created_at).toISOString().split('T')[0];

            if (regret >= 7) {
                totalRelapses++;
                currentStreak = 0;
                // Track relapse tags
                const cats = s.categories;
                if (Array.isArray(cats)) {
                    for (const tag of cats) {
                        const t = tag?.toString().trim().toLowerCase();
                        if (t && !JUNK_TAGS.has(t)) relapseTags.push(t);
                    }
                }
            } else {
                if (prevDate !== dateStr) {
                    currentStreak++;
                    longestStreak = Math.max(longestStreak, currentStreak);
                }
            }
            prevDate = dateStr;
        }

        const topRelapseTriggers = countItems(relapseTags).slice(0, 3);
        const mainRelapseTrigger = topRelapseTriggers[0]?.name || 'Keine Daten';

        /* ── 7) Build computed data package ──────────────────────────── */
        const computedData = {
            total_sessions: allSessions.length,
            top_triggers: topTriggers,
            top_artists: topArtists,
            media_types: mediaTypes,
            weekly_this_month: weeklyThis,
            weekly_prev_month: weeklyPrev,
            behavior_change_percent: behaviorChange,
            longest_streak_days: longestStreak,
            total_relapses: totalRelapses,
            main_relapse_trigger: mainRelapseTrigger,
            top_relapse_triggers: topRelapseTriggers,
        };

        /* ── 8) Minimal AI Call: Only storytelling ───────────────────── */
        const modelChain = ['gemini-3.0-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];

        const systemPrompt = `
Du bist die Engine für "Grip Wrapped". Werte das folgende, bereits bereinigte JSON-Datenpaket aus und erstelle für jede Slide einen ultrakurzen, passenden Text (max. 2 Sätze) im JSON-Format. Nutze einen gamifizierten, direkten und heroischen Ton. Wenn Statistiken gut sind, feiere den User. Wenn sie schlecht sind, sei ein ernster Coach.
Alle Texte auf DEUTSCH.
WICHTIG: Antworte AUSSCHLIESSLICH mit validem JSON. Keine Backticks, kein Markdown.
JSON-Output-Schema:
{
  "intro_text": "...",
  "trigger_story": "...",
  "behavior_text": "...",
  "artist_story": "...",
  "media_text": "...",
  "streak_text": "...",
  "relapse_story": "...",
  "summary_text": "...",
  "next_mission_title": "...",
  "next_mission_text": "..."
}
`;
        const userPrompt = `Aggregierte Daten:\n${JSON.stringify(computedData)}`;

        const aiTexts = await executeGeminiWithFallback(modelChain, systemPrompt, userPrompt);

        if (!aiTexts || !aiTexts.intro_text) {
            throw new Error('Invalid AI output format.');
        }

        /* ── 9) Return combined payload ─────────────────────────────── */
        return NextResponse.json({
            computed: computedData,
            stories: aiTexts,
        });

    } catch (error: any) {
        console.error('Grip Wrapped V2 error:', error);
        return NextResponse.json(
            { error: 'Grip Wrapped generation failed', detail: error.message },
            { status: 500 }
        );
    }
}
