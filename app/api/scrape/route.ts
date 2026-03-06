import { NextResponse } from 'next/server';

// ── Hot-List: bekannte, relevante Kategorien (Ranking-Priorität) ─────────────
const HOT_TAGS = [
    'pov', 'amateur', 'creampie', 'blowjob', 'anal', 'teen', 'milf',
    'lesbian', 'threesome', 'hardcore', 'solo', 'masturbation', 'facial',
    'handjob', 'gangbang', 'bdsm', 'squirting', 'orgasm', 'outdoor',
    'public', 'voyeur', 'cumshot', 'deepthroat', 'doggystyle', 'cowgirl',
    'interracial', 'casting', 'homemade', 'verified', 'big ass', 'big tits',
    'ebony', 'asian', 'latina', 'bbw', 'petite', 'redhead', 'blonde', 'brunette',
    'hentai', 'animated', 'sfm', 'mmd', 'blender', '3d', '2d', 'rule34',
];

// ── Animation-Schlüsselwörter für content_type Erkennung ─────────────────────
const ANIMATION_KEYWORDS = [
    'hentai', '3d', 'blender', 'sfm', 'mmd', 'rule34', 'animated',
    '2d', 'animation', 'cartoon', 'ecchi', 'ahegao', 'tentacle',
    'overwatch', 'fortnite', 'lol', 'league of legends', 'valorant',
    'overwatch porn', 'game', 'render', 'bbc edit', 'ai generated',
    'digital art', 'futanari', 'furry', 'danbooru', 'gelbooru',
];

// ── Rausch-Filter: Begriffe die nicht als Tags gespeichert werden ─────────────
const NOISE_TAGS = [
    'video', 'watch', 'online', 'free', 'hd', 'porn', 'sex', 'rule34',
    'xxx', 'pornhub', 'xvideos', 'xnxx', 'redtube', 'tube', 'hub',
    'com', 'www', 'http', 'https', 'net', 'loading', 'download',
    'stream', 'mobile', 'desktop', 'app', 'premium', 'exclusive',
];

// ── Hilfsfunktion: HTML-Entities dekodieren ───────────────────────────────────
function decodeEntities(str: string): string {
    return str
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .trim();
}

// ── Tags ranken und filtern ───────────────────────────────────────────────────
function rankAndFilterTags(rawTags: string[], limit = 10): string[] {
    const unique = Array.from(new Set(
        rawTags
            .map(t => t.trim().toLowerCase())
            .filter(t => t.length > 1 && t.length < 50)
            .filter(t => !NOISE_TAGS.includes(t))
            .filter(t => !/^\d+$/.test(t))
    ));

    // Bekannte Hot-Tags zuerst, dann der Rest
    const hot = unique.filter(t => HOT_TAGS.some(h => t.includes(h) || h.includes(t)));
    const rest = unique.filter(t => !HOT_TAGS.some(h => t.includes(h) || h.includes(t)));

    return [...hot, ...rest].slice(0, limit).map(t =>
        // Capitalize first letter sauber
        t.charAt(0).toUpperCase() + t.slice(1)
    );
}

// ── content_type aus URL + Titel ableiten ─────────────────────────────────────
function detectContentType(url: string, title: string, html: string): string {
    const combined = (url + ' ' + title).toLowerCase();

    // Domain-spezifisch: immer Animation
    if (
        url.includes('rule34.xxx') || url.includes('rule34.paheal') ||
        url.includes('danbooru.donmai') || url.includes('gelbooru.com') ||
        url.includes('e621.net') || url.includes('anime-pictures') ||
        url.includes('nhentai') || url.includes('hanime')
    ) {
        return 'Animation';
    }

    // Keyword-basiert in URL oder Titel
    if (ANIMATION_KEYWORDS.some(kw => combined.includes(kw))) {
        return 'Animation';
    }

    // Keyword-basiert im HTML-Body (weniger zuverlässig, nur als Fallback)
    const lowerHtml = html.substring(0, 50_000).toLowerCase(); // nur ersten 50k chars
    const animationHtmlHits = ANIMATION_KEYWORDS.filter(kw => lowerHtml.includes(kw)).length;
    if (animationHtmlHits >= 2) {
        return 'Animation';
    }

    return 'Real Life';
}

// ── Tags aus HTML extrahieren (domain-spezifisch + generisch) ────────────────
function extractTags(url: string, html: string, title: string, description: string): string[] {
    let raw: string[] = [];

    // ── Rule34 / Danbooru / Gelbooru ─────────────────────────────────────────
    if (
        url.includes('rule34.xxx') || url.includes('danbooru') ||
        url.includes('gelbooru') || url.includes('paheal')
    ) {
        // .tag-type-general, .tag-type-character, .tag-type-copyright spans
        const tagMatches = [
            ...Array.from(html.matchAll(/class="tag-type-general[^"]*"[^>]*>.*?<a[^>]*>([^<]+)<\/a>/g)),
            ...Array.from(html.matchAll(/class="tag-type-character[^"]*"[^>]*>.*?<a[^>]*>([^<]+)<\/a>/g)),
            ...Array.from(html.matchAll(/class="tag-type-copyright[^"]*"[^>]*>.*?<a[^>]*>([^<]+)<\/a>/g)),
            ...Array.from(html.matchAll(/data-tag-name="([^"]+)"/g)),
            ...Array.from(html.matchAll(/tag-name="([^"]+)"/g)),
        ];
        raw = tagMatches.map(m => m[1].replace(/_/g, ' ').trim());

        // Fallback: keywords meta tag (space-separated wie auf Rule34 üblich)
        if (raw.length === 0) {
            const kwMatch = html.match(/<meta name="keywords" content="([^"]+)"/);
            if (kwMatch) raw = kwMatch[1].split(' ').map(t => t.replace(/_/g, ' ').trim());
        }
    }

    // ── Pornhub ──────────────────────────────────────────────────────────────
    else if (url.includes('pornhub.com')) {
        // .tag-list li tags
        const tagListMatches = [
            ...Array.from(html.matchAll(/<a[^>]+class="[^"]*tag[^"]*"[^>]*>([^<]+)<\/a>/g)),
            ...Array.from(html.matchAll(/<li[^>]+class="[^"]*tag[^"]*"[^>]*>.*?<span[^>]*>([^<]+)<\/span>/g)),
            ...Array.from(html.matchAll(/"keywords"\s*:\s*"([^"]+)"/g)),
        ];
        raw = tagListMatches.map(m => m[1].trim());

        // Fallback: keywords meta
        if (raw.length === 0) {
            const kwMatch = html.match(/<meta name="keywords" content="([^"]+)"/);
            if (kwMatch) raw = kwMatch[1].split(',').map(t => t.trim());
        }
    }

    // ── XVideos / XHamster / RedTube / Generic ───────────────────────────────
    else if (
        url.includes('xvideos.com') || url.includes('xhamster.com') ||
        url.includes('redtube.com') || url.includes('xnxx.com')
    ) {
        const tagMatches = [
            ...Array.from(html.matchAll(/<a[^>]+class="[^"]*tag[^"]*"[^>]*>([^<]+)<\/a>/g)),
            ...Array.from(html.matchAll(/<span[^>]+class="[^"]*tag[^"]*"[^>]*>([^<]+)<\/span>/g)),
        ];
        raw = tagMatches.map(m => m[1].trim());

        if (raw.length === 0) {
            const kwMatch = html.match(/<meta name="keywords" content="([^"]+)"/);
            if (kwMatch) raw = kwMatch[1].split(',').map(t => t.trim());
        }
    }

    // ── Generischer Fallback ──────────────────────────────────────────────────
    if (raw.length === 0) {
        const kwMatch = html.match(/<meta name="keywords" content="([^"]+)"/);
        if (kwMatch) {
            // Komma- oder Leerzeichen-getrennt
            raw = kwMatch[1].split(/[,|]/).map(t => t.trim());
        }
    }

    // ── Metadata-Fallback: Titel + Description nach Hot-Tags scannen ──────────
    if (raw.length < 3) {
        const combined = (title + ' ' + description).toLowerCase();
        const foundInMeta = HOT_TAGS.filter(tag => combined.includes(tag));
        raw = [...raw, ...foundInMeta];
    }

    return rankAndFilterTags(raw);
}

// ── Performer extrahieren ─────────────────────────────────────────────────────
function extractPerformer(url: string, html: string): string {
    if (url.includes('pornhub.com')) {
        const matches = [
            html.match(/"author"\s*:\s*"([^"]+)"/),
            html.match(/class="username[^"]*"[^>]*>([^<]+)<\/a>/),
            html.match(/class="actorName[^"]*"[^>]*>([^<]+)<\/span>/),
            html.match(/Models?:\s*<[^>]+>([^<]+)<\/a>/i),
            html.match(/data-mxptype="Pornstar"[^>]*>([^<]+)</),
        ];
        for (const m of matches) {
            if (m?.[1]?.trim()) return m[1].trim();
        }
    }

    if (url.includes('xvideos.com') || url.includes('xhamster.com')) {
        const m = html.match(/class="uploader-tag"[^>]*>([^<]+)<\/a>/);
        if (m?.[1]) return m[1].trim();
    }

    // JSON-LD author fallback
    const jldAuthor = html.match(/"author"\s*:\s*\{\s*"name"\s*:\s*"([^"]+)"/);
    if (jldAuthor?.[1]) return jldAuthor[1].trim();

    return '';
}

// ── Duration extrahieren ──────────────────────────────────────────────────────
function extractDuration(url: string, html: string): string {
    const patterns = [
        html.match(/"duration"\s*:\s*"PT(\d+)M(\d+)S"/),  // ISO 8601
        html.match(/"duration"\s*:\s*"(\d+:\d+)"/),
        html.match(/content="(\d+:\d+)"\s*itemprop="duration"/),
        html.match(/class="duration[^"]*"[^>]*>([^<]+)<\/span>/),
        html.match(/<meta property="video:duration" content="(\d+)"/),
    ];

    for (const m of patterns) {
        if (!m) continue;
        if (m[2]) {
            // ISO 8601 form: PTxMxS
            return `${m[1]}:${m[2].padStart(2, '0')}`;
        }
        const raw = m[1].trim();
        if (raw.includes(':')) return raw;
        const secs = parseInt(raw);
        if (!isNaN(secs)) return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;
    }

    return '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// API Route Handler
// ═══════════════════════════════════════════════════════════════════════════════
export async function POST(req: Request) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }
        });

        if (!response.ok) {
            return NextResponse.json({ error: `Site returned ${response.status}` }, { status: 502 });
        }

        const html = await response.text();

        // ── Basic Metadata ───────────────────────────────────────────────────
        const titleMatch =
            html.match(/<meta property="og:title" content="([^"]+)"/) ||
            html.match(/<meta name="title" content="([^"]+)"/) ||
            html.match(/<title>([^<]+)<\/title>/);

        const imageMatch =
            html.match(/<meta property="og:image" content="([^"]+)"/) ||
            html.match(/<link rel="image_src" href="([^"]+)"/) ||
            html.match(/<meta name="twitter:image" content="([^"]+)"/);

        const descriptionMatch =
            html.match(/<meta property="og:description" content="([^"]+)"/) ||
            html.match(/<meta name="description" content="([^"]+)"/);

        const title = titleMatch ? decodeEntities(titleMatch[1]) : 'Unknown Title';
        const image = imageMatch ? decodeEntities(imageMatch[1]) : '';
        const description = descriptionMatch ? decodeEntities(descriptionMatch[1]) : '';

        // ── Domain-aware extraction ──────────────────────────────────────────
        const type = detectContentType(url, title, html);
        const performer = extractPerformer(url, html);
        const duration = extractDuration(url, html);
        const tags = extractTags(url, html, title, description);

        console.log('[scrape]', { url: url.substring(0, 60), type, performer, tagCount: tags.length, tags: tags.slice(0, 5) });

        return NextResponse.json({ title, image, description, performer, duration, type, tags });

    } catch (error: any) {
        console.error('Scraping error:', error?.message ?? error);
        return NextResponse.json({ error: 'Failed to scrape URL', detail: error?.message }, { status: 500 });
    }
}
