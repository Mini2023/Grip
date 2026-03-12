import { NextResponse } from 'next/server';
import { executeGeminiWithFallback } from '@/lib/gemini-fallback';

export async function POST(req: Request) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // 1. Fetch the raw HTML
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            }
        });

        if (!response.ok) {
            return NextResponse.json({ error: `Site returned ${response.status}` }, { status: 502 });
        }

        const html = await response.text();
        // Truncate HTML to save tokens and stay within limits, focusing on head and early body
        const truncatedHtml = html.substring(0, 30000);

        // 2. Setup Gemini Cascade
        const modelChain = ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite'];

        const systemPrompt = `
            Du bist ein hochspezialisierter Web-Daten-Analyst für das Projekt "Grip".
            Analysiere den bereitgestellten HTML-Code einer Seite und extrahiere präzise Metadaten.
            
            STRIKTE REGELN:
            1. Title: Der Titel des Videos oder Beitrags.
            2. Performer: Der Haupt-Darsteller oder Uploader.
            3. Duration: Die Videolänge im Format MM:SS. Wenn kein Video, leer lassen.
            4. Tags: Eine Liste von 5 bis maximal 8 der WICHTIGSTEN Tags. 
               - PRIORITÄT: Fokus auf Handlung (Actions), Charaktere und Anatomie.
               - EXKLUSION: Ignoriere Hintergrunddetails ('beach background'), sekundäre Merkmale ('blonde male') oder Spieletitel ('Final Fantasy'), wenn diese bereits im Titel stehen oder redundant sind.
               - FORMAT: Zusammenhängende Begriffe mit Unterstrichen wie 'big_breasts'.
            5. Type: Entscheide zwischen 'Real Life' oder 'Digital Art' (für Animationen/Hentai/3D).
            6. Description: Eine kurze Zusammenfassung des Inhalts.

            Output-Format:
            {
                "title": "...",
                "performer": "...",
                "duration": "...",
                "tags": ["tag1", "tag2", ...],
                "type": "Real Life" | "Digital Art",
                "description": "..."
            }
        `;

        const userPrompt = `HTML Content der URL: ${url}\n\n${truncatedHtml}`;

        const scrapedData = await executeGeminiWithFallback(modelChain, systemPrompt, userPrompt);

        return NextResponse.json(scrapedData);

    } catch (error: any) {
        console.error('AI Scraping error:', error);
        return NextResponse.json({ error: 'AI Deep Scrape failed', detail: error.message }, { status: 500 });
    }
}
