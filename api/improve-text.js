export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

    const { topText, bottomText, context } = req.body || {};

    if (!topText && !bottomText) {
        return res.status(400).json({ success: false, error: 'No text provided' });
    }

    const prompt = `You are a meme caption expert. Make these meme captions funnier and more punchy.

Current captions:
- Top text:    "${topText    || '(empty)'}"
- Bottom text: "${bottomText || '(empty)'}"
- Context:     ${context || 'general meme humor'}

Rules:
- Keep each improved caption under 12 words
- ALL UPPERCASE
- Make them funnier, snappier, more relatable
- Preserve the original meaning/joke structure
- If a field is empty, keep it empty

Respond ONLY with a valid JSON object in this exact format (no markdown, no code fences):
{"improvedTop": "...", "improvedBottom": "..."}`;

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
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
                        temperature:     0.8,
                        maxOutputTokens: 150,
                        topP:            0.9
                    }
                })
            }
        );

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error('Gemini error:', response.status, err);
            return res.status(response.status).json({ success: false, error: `Gemini error: ${response.status}` });
        }

        const data = await response.json();
        const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

        // Strip any markdown fences Gemini might add
        const cleaned = raw
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/g, '')
            .trim();

        const parsed = JSON.parse(cleaned);

        return res.status(200).json({
            success:       true,
            improvedTop:    parsed.improvedTop    || topText    || '',
            improvedBottom: parsed.improvedBottom || bottomText || ''
        });

    } catch (err) {
        console.error('improve-text handler error:', err);
        // Return originals on parse failure so the UI doesn't break
        return res.status(200).json({
            success:       false,
            improvedTop:    topText    || '',
            improvedBottom: bottomText || ''
        });
    }
}

