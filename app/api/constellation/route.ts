import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/* ── Junk filters (same as grip-wrapped) ────────────────────────────── */
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

interface GraphNode {
    id: string;
    label: string;
    type: 'tag' | 'artist' | 'media';
    count: number;
    connections: number;
}

interface GraphLink {
    source: string;
    target: string;
    weight: number;
}

export async function POST(req: Request) {
    try {
        const { userId } = await req.json();
        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const { data: sessions, error } = await supabase
            .from('sessions')
            .select('categories, performer, content_type, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw new Error('Failed to fetch sessions: ' + error.message);
        const allSessions = sessions || [];

        /* ── Build node counts ──────────────────────────────────────── */
        const tagCounts = new Map<string, number>();
        const artistCounts = new Map<string, number>();
        const mediaCounts = new Map<string, number>();
        const linkMap = new Map<string, number>();

        for (const s of allSessions) {
            // Extract clean tags
            const tags: string[] = [];
            const cats = s.categories;
            if (Array.isArray(cats)) {
                for (const c of cats) {
                    const t = c?.toString().trim().toLowerCase();
                    if (t && t.length >= 2 && !JUNK_TAGS.has(t)) tags.push(t);
                }
            } else if (typeof cats === 'string' && cats.trim()) {
                for (const c of cats.split(',')) {
                    const t = c.trim().toLowerCase();
                    if (t && t.length >= 2 && !JUNK_TAGS.has(t)) tags.push(t);
                }
            }

            // Count tags
            for (const t of tags) {
                tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
            }

            // Count performer
            const perf = s.performer?.toString().trim().toLowerCase();
            const hasPerf = perf && !JUNK_PERFORMERS.has(perf);
            if (hasPerf) {
                artistCounts.set(perf, (artistCounts.get(perf) || 0) + 1);
            }

            // Count media type
            const media = (s.content_type || 'unknown').toString().trim().toLowerCase();
            if (media && media !== 'unknown') {
                mediaCounts.set(media, (mediaCounts.get(media) || 0) + 1);
            }

            // Build co-occurrence links
            const sessionItems: string[] = [];
            for (const t of tags) sessionItems.push(`tag:${t}`);
            if (hasPerf) sessionItems.push(`artist:${perf}`);
            if (media && media !== 'unknown') sessionItems.push(`media:${media}`);

            // Create links between all pairs in this session
            for (let i = 0; i < sessionItems.length; i++) {
                for (let j = i + 1; j < sessionItems.length; j++) {
                    const key = [sessionItems[i], sessionItems[j]].sort().join('|');
                    linkMap.set(key, (linkMap.get(key) || 0) + 1);
                }
            }
        }

        /* ── Build nodes (only top items to avoid clutter) ──────────── */
        const nodes: GraphNode[] = [];
        const nodeIds = new Set<string>();

        // Top 15 tags
        const sortedTags = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15);
        for (const entry of sortedTags) {
            const id = `tag:${entry[0]}`;
            nodes.push({ id, label: entry[0], type: 'tag', count: entry[1], connections: 0 });
            nodeIds.add(id);
        }

        // Top 8 artists
        const sortedArtists = Array.from(artistCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
        for (const entry of sortedArtists) {
            const id = `artist:${entry[0]}`;
            nodes.push({ id, label: entry[0], type: 'artist', count: entry[1], connections: 0 });
            nodeIds.add(id);
        }

        // Media types
        Array.from(mediaCounts.entries()).forEach(([name, count]) => {
            const id = `media:${name}`;
            nodes.push({ id, label: name, type: 'media', count, connections: 0 });
            nodeIds.add(id);
        });

        /* ── Build links (only between existing nodes) ──────────────── */
        const links: GraphLink[] = [];
        Array.from(linkMap.entries()).forEach(([key, weight]) => {
            const [source, target] = key.split('|');
            if (nodeIds.has(source) && nodeIds.has(target) && weight >= 1) {
                links.push({ source, target, weight });

                // Increment connection counts
                const srcNode = nodes.find(n => n.id === source);
                const tgtNode = nodes.find(n => n.id === target);
                if (srcNode) srcNode.connections++;
                if (tgtNode) tgtNode.connections++;
            }
        });

        /* ── Build detail map (top 3 connections per node) ──────────── */
        const details: Record<string, { topConnections: { id: string; label: string; weight: number }[] }> = {};

        for (const node of nodes) {
            const nodeLinks = links
                .filter(l => l.source === node.id || l.target === node.id)
                .map(l => {
                    const otherId = l.source === node.id ? l.target : l.source;
                    const other = nodes.find(n => n.id === otherId);
                    return { id: otherId, label: other?.label || otherId, weight: l.weight };
                })
                .sort((a, b) => b.weight - a.weight)
                .slice(0, 3);

            details[node.id] = { topConnections: nodeLinks };
        }

        return NextResponse.json({
            nodes,
            links,
            details,
            meta: {
                total_sessions: allSessions.length,
                total_nodes: nodes.length,
                total_links: links.length,
            }
        });

    } catch (error: any) {
        console.error('Constellation map error:', error);
        return NextResponse.json(
            { error: 'Failed to generate constellation data', detail: error.message },
            { status: 500 }
        );
    }
}
