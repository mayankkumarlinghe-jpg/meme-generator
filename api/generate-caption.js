const RETRY_ATTEMPTS = 3;
const RETRY_BASE_MS = 1500;

/**
 * Helper to call Grok API (xAI)
 */
async function callGrok(apiKey, prompt) {
    for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt++) {
        try {
            const response = await fetch(
                "https://api.x.ai/v1/chat/completions", // ✅ xAI Endpoint
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        // ✅ Use current Grok model (e.g., grok-4-1-fast or grok-2-1212)
                        model: "grok-4-1-fast", 
                        messages: [
                            { role: "system", content: "You are a professional meme caption writer." },
                            { role: "user", content: prompt }
                        ],
                        max_tokens: 80,
                        temperature: 0.9
                    })
                }
            );

            if (response.ok) return response;

            if ([429, 500, 503].includes(response.status)) {
                if (attempt === RETRY_ATTEMPTS) return response;
                const waitMs = RETRY_BASE_MS * Math.pow(2, attempt);
                console.warn(`Retry ${attempt + 1}/${RETRY_ATTEMPTS} — waiting ${waitMs / 1000}s`);
                await new Promise(r => setTimeout(r, waitMs));
                continue;
            }
            return response;
        } catch (err) {
            if (attempt === RETRY_ATTEMPTS) throw err;
            const waitMs = RETRY_BASE_MS * Math.pow(2, attempt);
            await new Promise(r => setTimeout(r, waitMs));
        }
    }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { templateName, position, context } = req.body || {};
    if (!templateName || !position) {
        return res.status(400).json({ success: false, error: 'Missing templateName or position' });
    }

    // ✅ Using the xAI key
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ success: false, error: 'XAI_API_KEY not configured' });
    }

    const positionLabel = position === 'top' ? 'TOP (first line)' : 'BOTTOM (punchline)';
    const prompt = `Generate a funny, relatable ${positionLabel} caption for the "${templateName}" meme.
Context: ${context || 'general humor'}
Rules:
- Maximum 10 words
- All UPPERCASE
- Return ONLY the caption text, no quotes.`;

    try {
        const response = await callGrok(apiKey, prompt);

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            return res.status(response.status).json({ success: false, error: `Grok API error: ${response.status}` });
        }

        const data = await response.json();
        const raw = data.choices?.[0]?.message?.content ?? '';
        const caption = raw.trim().replace(/^["']|["']$/g, '').toUpperCase();

        return res.status(200).json({ success: true, caption });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}
