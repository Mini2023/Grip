import { NextResponse } from 'next/server';
import { aggregateUserData } from '@/lib/ai-suggestions';
import { executeGeminiWithFallback } from '@/lib/gemini-fallback';

export async function POST(req: Request) {
    try {
        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const userData = await aggregateUserData(userId);
        if (!userData) {
            return NextResponse.json({ error: 'No user data found' }, { status: 404 });
        }

        const modelChain = ['gemini-3.0-flash-preview', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite'];

        const systemPrompt = `
            Du bist ein hochintelligenter KI-Analyst für ein diskretes Tracking-System namens "Grip".
            Deine Aufgabe ist es, basierend auf dem gezeigten User-Profil personalisierte Empfehlungen zu generieren.

            STRIKTE REGELN:
            1. Data Sanitization: Ignoriere zwingend alle Metadaten-Tags wie '4k', '1080p', 'HD', '720p', '60fps' oder unbrauchbare Werte wie 'unknown'. Diese dürfen die Vorschläge nicht beeinflussen.
            2. Contextual Search: Nutze die getrackten Darsteller (Performers), um deren übliche Kategorien abzuleiten und in die Empfehlungen einfließen zu lassen.
            3. Zielgruppe: Der User nutzt das System, um seine Gewohnheiten zu verstehen. Die Vorschläge sollen präzise auf seinen Geschmack zugeschnitten sein.
            4. Output-Format: Erzwinge zwingend einen validen JSON-Output nach exakt diesem Schema:
            {
                "recommended_videos": [
                    { 
                        "title": "Beispiel Titel", 
                        "reason": "Grund basierend auf Tag X und Darsteller Y", 
                        "search_query": "exakter suchbegriff für beste ergebnisse" 
                    }
                ],
                "recommended_actors": [
                    { 
                        "name": "Name", 
                        "category": "Hauptkategorie", 
                        "search_query": "name + bekannteste kategorie" 
                    }
                ],
                "recommended_tags": [
                    { "display_name": "Tag Name", "pornhub_query": "tag query", "rule34_query": "booru_tag_query" }
                ]
            }

            STRIKTE REGELN FÜR SUCH-STRINGS:
            
            1. pornhub_query:
               - Darf natürliche Suchbegriffe enthalten.
               - MUSS zwingend NSFW-Modifikatoren wie 'xxx' oder 'porn' enthalten, um Filter zu umgehen.
               - Beispiel: 'tifa lockhart xxx porn'.

            2. rule34_query (BOORU-SYNTAX):
               - KEINE NSFW-FÜLLER: Füge NIEMALS Begriffe wie 'xxx', 'porn' oder 'rule34' hinzu. Das führt auf Imageboards zu Fehlern.
               - UNTERSTRICH-REGEL: Mehrteilige Namen oder Franchise-Titel MÜSSEN mit einem Unterstrich verbunden werden (z.B. 'blue_archive', 'big_breasts').
               - LEERZEICHEN-REGEL: Verschiedene, unabhängige Tags werden durch ein einzelnes Leerzeichen getrennt.
               - BEISPIEL: Wenn der User 'Kisaki' aus 'Blue Archive' mag, lautet der rule34_query: 'kisaki blue_archive'.
               - CASE: Immer Kleinschreibung verwenden.
        `;

        const userPrompt = `
            User-Profil:
            - Basis-Präferenz: ${userData.base_preferences.theme}
            - Format-Fokus: ${userData.base_preferences.format}
            - Top-Kategorien: ${userData.top_tags.join(', ')}
            - Top-Darsteller: ${userData.top_performers.join(', ')}
            - Durchschnittliche Dauer: ${userData.avg_duration_minutes} Minuten

            Generiere basierend auf diesen Daten die Vorschläge.
        `;

        const suggestions = await executeGeminiWithFallback(modelChain, systemPrompt, userPrompt);
        return NextResponse.json(suggestions);
    } catch (error: any) {
        console.error('AI Suggestions Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
