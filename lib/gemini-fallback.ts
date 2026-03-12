import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
];

export async function executeGeminiWithFallback(
    modelChain: string[],
    systemPrompt: string,
    userPrompt: string
) {
    let lastError = null;

    for (const modelName of modelChain) {
        try {
            console.log(`[Gemini Fallback] Attempting with model: ${modelName}`);
            
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: { responseMimeType: "application/json" },
                safetySettings
            });

            const result = await model.generateContent([systemPrompt, userPrompt]);
            const response = await result.response;
            const text = response.text();

            // Try to parse to ensure it's valid JSON before returning
            return JSON.parse(text);
        } catch (error: any) {
            console.warn(`[Gemini Fallback] Model ${modelName} failed. Error: ${error.message}`);
            lastError = error;
            // Continue to next model
        }
    }

    throw new Error(`All Gemini models in cascade failed. Last error: ${lastError?.message}`);
}
