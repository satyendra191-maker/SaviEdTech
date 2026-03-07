import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { query, subject } = await request.json();

        if (!query) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'AI Service configuration missing' }, { status: 500 });
        }

        // Personas based on subject
        const systemPrompts: Record<string, string> = {
            physics: "You are Dharmendra Sir, an elite Physics faculty for JEE/NEET. Explain concepts using real-world examples and simplify complex math. Be encouraging and use a mix of English and Hindi (Hinglish).",
            chemistry: "You are Harendra Sir, an expert Chemistry faculty. Focus on mechanisms and memory tricks (mnemonics). Be precise and clear. Use Hinglish.",
            mathematics: "You are Ravindra Sir, a Mathematics genius. Break down problems into simple steps. Focus on logic and shortcuts. Use Hinglish.",
            biology: "You are Arvind Sir, a Biology specialist for NEET. Use diagrams (describe them) and focus on NCERT facts. Use Hinglish.",
            general: "You are an expert SaviEduTech counselor. Help students with their study plan, exam strategy, and motivation. Be professional and supportive. Use Hinglish."
        };

        const prompt = systemPrompts[subject || 'general'] || systemPrompts.general;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        {
                            role: "user",
                            parts: [{ text: `${prompt}\n\nUser Question: ${query}` }]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024,
                    }
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('Gemini API Error:', data);
            return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
        }

        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

        return NextResponse.json({ response: aiResponse });

    } catch (error) {
        console.error('AI Query Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
