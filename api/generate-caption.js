const GEMINI_RETRY_ATTEMPTS = 4;
const GEMINI_RETRY_BASE_MS  = 1500; // 1.5s → 3s → 6s → 12s

async function callGemini(apiKey, prompt) {
    for (let attempt = 0; attempt <= GEMINI_RETRY_ATTEMPTS; attempt++) {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature:     0.9,
                        maxOutputTokens: 80,
                        topP:            0.95
                    }
                })
            }
        );

        // Success — return the response
        if (response.ok) return response;

        // 429 — wait and retry
        if (response.status === 429) {
            if (attempt === GEMINI_RETRY_ATTEMPTS) {
                // All retries exhausted — return the 429 so caller can handle it
                return response;
            }

            // Gemini sometimes includes retryDelay in the error body
            let waitMs = GEMINI_RETRY_BASE_MS * Math.pow(2, attempt);
            try {
                const errBody = await response.json();
                const suggested = errBody?.error?.details?.find(
                    d => d['@type']?.includes('RetryInfo')
                )?.retryDelay;
                if (suggested) {
                    // Gemini returns retryDelay as e.g. "30s"
                    const seconds = parseFloat(suggested);
                    if (!isNaN(seconds)) waitMs = seconds * 1000;
                }
            } catch { /* ignore parse errors, use backoff */ }

            console.warn(
                `Gemini 429 — attempt ${attempt + 1}/${GEMINI_RETRY_ATTEMPTS}, ` +
                `waiting ${Math.round(waitMs / 1000)}s`
            );
            await new Promise(r => setTimeout(r, waitMs));
            continue;
        }

        // Any other non-OK status — return immediately, no retry
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

    const apiKey = process.env.GEMINI_API_KEY;
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
- Return ONLY the caption text — no quotes, no explanations, nothing else

Caption:`;

    try {
        const response = await callGemini(apiKey, prompt);

        // Still 429 after all retries — tell frontend to back off for 30s
        if (response.status === 429) {
            console.error('Gemini 429 — all retries exhausted');
            res.setHeader('Retry-After', '30');
            return res.status(429).json({ success: false, error: 'Rate limit — please retry shortly' });
        }

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error('Gemini API error:', response.status, err);
            return res.status(response.status).json({ success: false, error: `Gemini error: ${response.status}` });
        }

        const data    = await response.json();
        const raw     = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        const caption = raw.trim().replace(/^["']|["']$/g, '').trim().toUpperCase();

        if (!caption) {
            return res.status(500).json({ success: false, error: 'Empty response from Gemini' });
        }

        return res.status(200).json({ success: true, caption });

    } catch (err) {
        console.error('generate-caption handler error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
}
