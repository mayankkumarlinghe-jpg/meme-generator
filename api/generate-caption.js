const GEMINI_RETRY_ATTEMPTS = 4;
const GEMINI_RETRY_BASE_MS  = 1500; // 1.5s → 3s → 6s → 12s

async function callGemini(apiKey, prompt) {
    for (let attempt = 0; attempt <= GEMINI_RETRY_ATTEMPTS; attempt++) {
        const response = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: 'POST',
                headers: {
                    "Authorization": `Bearer ${apiKey}`, // SAME variable
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama3-8b-8192",
                    messages: [
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.9,
                    max_tokens: 80
                })
            }
        );

        // Success
        if (response.ok) return response;

        // Retry on 429 / 500 / 503
        if ([429, 500, 503].includes(response.status)) {
            if (attempt === GEMINI_RETRY_ATTEMPTS) return response;

            const waitMs = GEMINI_RETRY_BASE_MS * Math.pow(2, attempt);

            console.warn(
                `API retry ${attempt + 1}/${GEMINI_RETRY_ATTEMPTS} — waiting ${waitMs / 1000}s`
            );

            await new Promise(r => setTimeout(r, waitMs));
            continue;
        }

        return response;
    }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

    const { templateName, position, context } = req.body || {};

    if (!templateName || !position) {
        return res.status(400).json({ success: false, error: 'Missing templateName or position' });
    }

    const apiKey = process.env.GEMINI_API_KEY; // SAME NAME
    if (!apiKey) {
        console.error('GEMINI_API_KEY not set');
        return res.status(500).json({ success: false, error: 'API key not configured' });
    }

    const positionLabel = position === 'top' ? 'TOP (first line)' : 'BOTTOM (punchline)';

    const prompt = `You are a professional meme caption writer. Generate a funny, relatable ${positionLabel} caption for the "${templateName}" meme.

Context/theme: ${context || 'general internet humor'}

Rules:
- Maximum 10 words
- All UPPERCASE
- Make it punchy and funny
- Match the template's typical use case
- Return ONLY the caption text — no quotes, no explanations

Caption:`;

    try {
        const response = await callGemini(apiKey, prompt);

        if (response.status === 429) {
            res.setHeader('Retry-After', '30');
            return res.status(429).json({ success: false, error: 'Rate limit — retry later' });
        }

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error('API error:', response.status, err);
            return res.status(response.status).json({ success: false, error: `API error: ${response.status}` });
        }

        const data = await response.json();

        // 🔥 CHANGED PARSING (Groq format)
        const raw = data.choices?.[0]?.message?.content ?? '';

        const caption = raw
            .trim()
            .replace(/^["']|["']$/g, '')
            .toUpperCase();

        if (!caption) {
            return res.status(500).json({ success: false, error: 'Empty response' });
        }

        return res.status(200).json({ success: true, caption });

    } catch (err) {
        console.error('handler error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
}
