import { NextResponse } from 'next/server';
import { executeGeminiWithFallback } from '@/lib/gemini-fallback';

export async function POST(req: Request) {
    try {
        const { sessionsData } = await req.json();

        if (!sessionsData || !Array.isArray(sessionsData)) {
            return NextResponse.json({ error: 'Sessions data is required and must be an array.' }, { status: 400 });
        }

        const modelChain = ['gemini-3.0-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];

        const systemPrompt = `
Du bist ein analytischer Verhaltenspsychologe für die Grip-App. Analysiere das folgende Tracking-Verhalten des Users. 
Erstelle einen schonungslosen, hochgradig detaillierten Autopsie-Bericht im Markdown-Format. 
Gliedere ihn strikt und deutlich in diese 4 Bereiche: 
# 1. Gefährlichste Muster
Wann und womit passiert es am meisten? Nutze Listen und sei direkt.
# 2. Versteckte Korrelationen
Welche Tags tauchen oft zusammen auf? Was ist der psychologische Hintergrund?
# 3. Das "Warum?"
Erkläre kurz, welchen Schmerz oder welche Leere der User hier wahrscheinlich zu füllen versucht.
# 4. Taktischer Aktionsplan
Erstelle 3 bis 5 EXTREM ausformulierte, psychologische und praktische Verhaltens-Tipps (Cognitive Behavioral Therapy basiert) FÜR DEN USER SELBST im echten Leben. 
WICHTIG: Erstelle KEINE Vorschläge für App-Features oder Programmier-Tasks! Der Plan muss aus Dingen bestehen, die der User SOFORT selbst umsetzen kann (z.B. "Richte eine iOS Bildschirmzeit-Sperre für bestimmte Webseiten ein", "Vermeide aktiv Suchbegriffe wie...", "Erstelle eine mentale rote Liste"). Kein Blabla, echte anwendbare Werkzeuge.

WICHTIG: Antworte AUSSCHLIESSLICH im validen JSON-Format. Dein JSON muss genau ein Feld namens "report" enthalten, dessen Wert der formatierte Markdown-Text ist. Füge keine Backticks \`\`\`json um die Antwort hinzu, sondern antworte nur mit dem rohen JSON Code.
`;

        const userPrompt = `Historie der letzten Einträge (JSON):\n${JSON.stringify(sessionsData)}`;

        const result = await executeGeminiWithFallback(modelChain, systemPrompt, userPrompt);

        if (!result || !result.report) {
            throw new Error("Invalid output format from AI. Expected { \"report\": \"...\" }");
        }

        return NextResponse.json({ report: result.report });

    } catch (error: any) {
        console.error('AI Autopsy error:', error);
        return NextResponse.json({ error: 'AI Deep Autopsy failed', detail: error.message }, { status: 500 });
    }
}
