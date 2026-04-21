const RETRY_ATTEMPTS = 3;
const RETRY_BASE_MS  = 1500;

async function callClaude(apiKey, prompt) {
    for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt++) {
        try {
            const response = await fetch(
                "https://api.anthropic.com/v1/messages",
                {
                    method: "POST",
                    headers: {
                        "x-api-key":         apiKey,
                        "anthropic-version": "2023-06-01",
                        "Content-Type":      "application/json"
                    },
                    body: JSON.stringify({
                        model:      "claude-haiku-4-5",
                        max_tokens: 80,
                        messages:   [{ role: "user", content: prompt }]
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
            console.warn(`Network error attempt ${attempt + 1}: ${err.message} — retrying in ${waitMs / 1000}s`);
            await new Promise(r => setTimeout(r, waitMs));
        }
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

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
        console.error('ANTHROPIC_API_KEY not set in environment variables');
        return res.status(500).json({ success: false, error: 'API key not configured' });
    }

    const positionLabel = position === 'top' ? 'TOP (first line)' : 'BOTTOM (punchline)';

    const prompt = `You are a professional meme caption writer. Generate a funny, relatable ${positionLabel} caption for the "${templateName}" meme.
Context/theme: ${context || 'general internet humor'}
Rules:
- Maximum 10 words
- All UPPERCASE
- Make it punchy and funny
- Return ONLY the caption text, nothing else, no quotes
Caption:`;

    try {
        const response = await callClaude(apiKey, prompt);

        if (response.status === 429) {
            res.setHeader('Retry-After', '20');
            return res.status(429).json({ success: false, error: 'Rate limit — retry later' });
        }

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error('Anthropic API error:', response.status, err);
            return res.status(response.status).json({ success: false, error: `API error: ${response.status}` });
        }

        const data = await response.json();

        // ✅ Anthropic response parsing
        const raw = data.content?.[0]?.text ?? '';
        const caption = raw
            .trim()
            .replace(/^["']|["']$/g, '')
            .toUpperCase();

        if (!caption) {
            return res.status(500).json({ success: false, error: 'Empty response from API' });
        }

        return res.status(200).json({ success: true, caption });

    } catch (err) {
        console.error('Handler error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
}
