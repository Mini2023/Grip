import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateUrgeContext } from '@/lib/urgeProtocol';

export async function POST(req: Request) {
    try {
        const { messages, toneMode, userId } = await req.json();

        if (!messages || !userId) {
            return NextResponse.json({ error: 'Messages and userId are required' }, { status: 400 });
        }

        const contextStr = await generateUrgeContext(userId);

        const baseRole = 'Du bist der AI Shield Companion der Grip App. Deine einzige Aufgabe ist es, den User davon abzuhalten, seinen Streak zu brechen und in alte Konsummuster zurückzufallen. Halte deine Antworten extrem kurz, prägnant und im Chat-Format (max. 2-3 Sätze).';
        const contextFact = `Hier sind die Daten des Users: ${contextStr}. Nutze diese subtil, um persönlich zu wirken.`;
        
        let toneStr = '';
        if (toneMode === 'drill') {
            toneStr = 'Sei unerbittlich, hart und motivierend wie David Goggins. Nutze militärische Strenge, toleriere keine Ausreden. Erinnere ihn hart an seinen aktuellen Streak.';
        } else {
            toneStr = 'Sei ruhig, therapeutisch und verständnisvoll. Nutze Techniken aus der kognitiven Verhaltenstherapie. Hilf dem User, den Drang (Urge) zu akzeptieren, ohne ihm nachzugeben.';
        }

        const systemInstruction = `${baseRole}\n\n${contextFact}\n\n${toneStr}`;

        const apiKey = process.env.GEMINIAI_API_KEY || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
        const genAI = new GoogleGenerativeAI(apiKey);
        
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            systemInstruction: systemInstruction 
        });

        const history = messages.slice(0, -1).map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

        const chat = model.startChat({
            history: history
        });

        const lastMessage = messages[messages.length - 1].content;
        const result = await chat.sendMessage(lastMessage);

        return NextResponse.json({
            role: 'assistant',
            content: result.response.text()
        });
    } catch (error: any) {
        console.error('Urge Chat error:', error);
        return NextResponse.json({ error: 'Urge Protocol failed', detail: error.message }, { status: 500 });
    }
}
