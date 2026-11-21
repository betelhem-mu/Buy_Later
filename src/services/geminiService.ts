import { GoogleGenAI } from '@google/genai';

const rawApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const apiKey = rawApiKey ? rawApiKey.replace(/^["']|["']$/g, '').trim() : '';

if (!apiKey) {
    throw new Error(
        'Gemini API key is missing. Check your .env file.'
    );
}

if (apiKey.startsWith('AQ.')) {
    console.warn(
        '[Gemini Warning] Your EXPO_PUBLIC_GEMINI_API_KEY appears to be an OAuth/Access token (starts with "AQ."), not an API key. Google Gemini requires an API key from Google AI Studio starting with "AIzaSy...".'
    );
}

const ai = new GoogleGenAI({
    apiKey,
});

// Use gemini-3.8-flash as primary (per Google's latest specification), with active fallbacks
const CANDIDATE_MODELS = [
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-flash-latest',
];

// Test whether BuyLater can communicate with Gemini.
export async function testGeminiConnection(): Promise<string> {
    let lastError: unknown;

    for (const model of CANDIDATE_MODELS) {
        try {
            const response = await ai.models.generateContent({
                model,
                contents: 'Introduce yourself in one short sentence.',
                config: {
                    thinkingConfig: {
                        thinkingBudget: 0,
                    },
                    maxOutputTokens: 100,
                },
            });

            const answer = response.text;
            if (answer) {
                return answer;
            }
        } catch (error: any) {
            console.warn(`Connection test with ${model} failed, trying next...`, error);
            lastError = error;

            const errorStr = JSON.stringify(error) || String(error);
            const isRetryable =
                errorStr.includes('503') ||
                errorStr.includes('high demand') ||
                errorStr.includes('UNAVAILABLE') ||
                errorStr.includes('429') ||
                errorStr.includes('404') ||
                errorStr.includes('NOT_FOUND') ||
                errorStr.includes('no longer available');

            if (isRetryable) {
                if (errorStr.includes('503') || errorStr.includes('high demand')) {
                    await new Promise((resolve) => setTimeout(resolve, 800));
                }
                continue;
            }
            throw error;
        }
    }

    if (lastError) {
        throw lastError;
    }

    throw new Error('Gemini returned an empty response.');
}

export async function generatePurchaseSuggestionsStream(
    purchaseName: string,
    onText: (text: string) => void
): Promise<string> {
    const prompt = `You are a shopping advisor helping someone avoid impulse buying.
Provide quick, concise advice for buying "${purchaseName}".
Format with these exact headings on their own lines:

Important Features:
- 1-2 key features to look for

Things to Consider:
- 1-2 points to check before buying

Possible Alternatives:
- 1-2 cheaper or better alternatives

Buying Advice:
- 1 final recommendation`;

    let lastError: unknown;

    for (const model of CANDIDATE_MODELS) {
        try {
            const responseStream = await ai.models.generateContentStream({
                model,
                contents: prompt,
                config: {
                    thinkingConfig: {
                        thinkingBudget: 0,
                    },
                    maxOutputTokens: 350,
                    temperature: 0.5,
                },
            });

            let fullText = '';

            for await (const chunk of responseStream) {
                if (chunk.text) {
                    fullText += chunk.text;
                    onText(fullText);
                }
            }

            if (fullText) {
                return fullText;
            }
        } catch (error: any) {
            console.warn(`Model ${model} failed, checking fallback...`, error);
            lastError = error;

            const errorStr = JSON.stringify(error) || String(error);
            const isRetryable =
                errorStr.includes('503') ||
                errorStr.includes('high demand') ||
                errorStr.includes('UNAVAILABLE') ||
                errorStr.includes('429') ||
                errorStr.includes('404') ||
                errorStr.includes('NOT_FOUND') ||
                errorStr.includes('no longer available');

            // If it's a server capacity, rate-limit, or model availability issue, seamlessly try the next model
            if (isRetryable) {
                if (errorStr.includes('503') || errorStr.includes('high demand')) {
                    // Brief pause to let temporary Google traffic spikes ease
                    await new Promise((resolve) => setTimeout(resolve, 800));
                }
                continue;
            }

            // If it's an unauthenticated error due to an invalid token format, provide a clear explanation
            if (apiKey.startsWith('AQ.') && errorStr.includes('401')) {
                throw new Error(
                    'Invalid API Key: Your key starts with "AQ." which is an OAuth token, not a Gemini API key. Please generate an API key from Google AI Studio starting with "AIzaSy..." and put it in your .env file.'
                );
            }

            throw error;
        }
    }

    if (lastError) {
        throw lastError;
    }

    throw new Error('Gemini returned an empty response.');
}
