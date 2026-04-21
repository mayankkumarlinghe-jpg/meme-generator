/* ─── AI Config ────────────────────────────────── */
const AI_CONFIG = {
    cacheEnabled:  true,
    requestDelay:  800,
    maxCacheSize:  120,
    fetchTimeout:  12000
};

const aiCache        = new Map();
const requestQueue   = [];
let isProcessingQueue = false;

/* ─── AIGenerator Class ────────────────────────── */
class AIGenerator {
    constructor() {
        this.requestCount    = 0;
        this.lastRequestTime = 0;
    }

    async generateCaption(templateName, position, context = null) {
        const key = this.cacheKey(templateName, position, context);
        if (AI_CONFIG.cacheEnabled && aiCache.has(key)) return aiCache.get(key);

        return new Promise((resolve, reject) => {
            requestQueue.push({ templateName, position, context, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        if (isProcessingQueue || requestQueue.length === 0) return;
        isProcessingQueue = true;

        while (requestQueue.length > 0) {
            const { templateName, position, context, resolve, reject } = requestQueue.shift();
            await this.rateLimit();
            try {
                this.requestCount++;
                this.lastRequestTime = Date.now();
                const caption = await this.fetchCaption(templateName, position, context);
                const key = this.cacheKey(templateName, position, context);
                this.addToCache(key, caption);
                resolve(caption);
            } catch (err) {
                reject(err);
            }
        }
        isProcessingQueue = false;
    }

    /* ── Vercel serverless route ── */
    async fetchCaption(templateName, position, context) {
        const controller = new AbortController();
        const timeout    = setTimeout(() => controller.abort(), AI_CONFIG.fetchTimeout);

        try {
            const res = await fetch('/api/generate-caption', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ templateName, position, context: context || 'general internet humor' }),
                signal:  controller.signal
            });
            clearTimeout(timeout);

            if (!res.ok) throw new Error(`API ${res.status}`);
            const data = await res.json();
            if (!data.caption) throw new Error('Empty caption');
            return data.caption;
        } catch (err) {
            clearTimeout(timeout);
            console.warn('Caption API failed, using fallback:', err.message);
            return this.smartFallback(this.analyzeTemplate(templateName), position, context);
        }
    }

    /* ── Template analysis for smart fallback ── */
    analyzeTemplate(name) {
        const n = name.toLowerCase();
        const analysis = { type: 'generic', mood: 'neutral' };

        if (n.includes('drake'))                            analysis.type = 'comparison';
        else if (n.includes('distract') || n.includes('boyfriend')) analysis.type = 'distraction';
        else if (n.includes('button'))                      analysis.type = 'choice';
        else if (n.includes('brain') || n.includes('expand')) analysis.type = 'evolution';
        else if (n.includes('bernie'))                      analysis.type = 'political';
        else if (n.includes('uno'))                         analysis.type = 'gaming';
        else if (n.includes('buff')  || n.includes('doge')) analysis.type = 'comparison';
        else if (n.includes('exit')  || n.includes('ramp')) analysis.type = 'choice';
        else if (n.includes('balloon'))                     analysis.type = 'distraction';
        else if (n.includes('change my mind'))              analysis.type = 'debate';
        else if (n.includes('disaster') || n.includes('fine')) analysis.type = 'crisis';
        else if (n.includes('woman')  || n.includes('yell')) analysis.type = 'argument';
        else if (n.includes('this is fine'))                analysis.type = 'crisis';

        if (n.includes('sad') || n.includes('cry')) analysis.mood = 'sad';
        if (n.includes('angry') || n.includes('mad')) analysis.mood = 'angry';

        return analysis;
    }
