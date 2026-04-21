export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

    const { templateName, position, context } = req.body || {};

    if (!templateName || !position) {
        return res.status(400).json({ success: false, error: 'Missing templateName or position' });
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
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('GEMINI_API_KEY not set');
            return res.status(500).json({ success: false, error: 'API key not configured' });
        }

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

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error('Gemini API error:', response.status, err);
            return res.status(response.status).json({ success: false, error: `Gemini error: ${response.status}` });
        }

        const data   = await response.json();
        const raw    = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
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
