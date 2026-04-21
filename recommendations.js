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
    smartFallback(analysis, position, context) {
        const captions = {
            comparison: {
                top:    ['WHEN YOU HAVE ACTUAL WORK TO DO', 'THE PLAN', 'EXPECTATIONS', 'MY BUDGET'],
                bottom: ['VS WATCHING YOUTUBE FOR 4 HOURS', 'WHAT ACTUALLY HAPPENS', 'REALITY', 'WHAT I SPENT']
            },
            distraction: {
                top:    ['MY RESPONSIBILITIES', 'THE DEADLINE', 'HEALTHY SLEEP SCHEDULE'],
                bottom: ['ONE MORE MEME SCROLL', 'JUST FIVE MORE MINUTES', 'ANOTHER EPISODE AT 2AM']
            },
            choice: {
                top:    ['OPTION A: BE PRODUCTIVE', 'FINISH THE PROJECT', 'GO TO THE GYM'],
                bottom: ['OPTION B: CHAOTIC NAPS', 'WATCH EVERYTHING BURN', 'LAY IN BED THINKING ABOUT GYM']
            },
            evolution: {
                top:    ['SMALL BRAIN: WORRYING', 'ROOKIE MODE: PANIC', 'LEVEL 1: STRESSED'],
                bottom: ['GALAXY BRAIN: WORRYING ABOUT WORRYING', 'GOD MODE: NOT CARING', 'FINAL FORM: UNBOTHERED']
            },
            debate: {
                top:    ['THE MEETING COULD HAVE BEEN AN EMAIL', 'PINEAPPLE BELONGS ON PIZZA'],
                bottom: ['CHANGE MY MIND', 'FIGHT ME']
            },
            crisis: {
                top:    ['EVERYTHING IS FINE', 'NO PROBLEMS HERE'],
                bottom: ['MEANWHILE EVERYTHING IS ON FIRE', 'PROCEEDS TO PANIC INTERNALLY']
            },
            argument: {
                top:    ['ME EXPLAINING WHY I AM RIGHT', 'MY BRAIN AT 3AM'],
                bottom: ['MY BRAIN KNOWING I AM WRONG', 'BRINGING UP THINGS FROM 2017']
            },
            political: {
                top:    ['I AM ONCE AGAIN ASKING'],
                bottom: ['FOR THINGS TO MAKE SENSE']
            },
            gaming: {
                top:    ['DRAW 25 CARDS', 'TAKE THE LOSS'],
                bottom: ['OR ADMIT YOU WERE WRONG', 'OR KEEP PRETENDING YOU ARE FINE']
            },
            generic: {
                top:    ['WHEN THE PLAN WORKS', 'ME EXPLAINING TO MY MOM', 'HOW I LOOK', 'SOCIETY'],
                bottom: ['AND NOBODY NOTICES', 'WHY I AM BROKE', 'VS HOW I FEEL', 'ME']
            }
        };

        if (context) {
            const contextual = this.contextualFallback(analysis, position, context);
            if (contextual) return contextual;
        }

        const type    = captions[analysis.type] ? analysis.type : 'generic';
        const options = captions[type][position] || captions.generic[position];
        return options[Math.floor(Math.random() * options.length)];
    }

    contextualFallback(analysis, position, context) {
        const ctx = context.toLowerCase();
        const map = {
            work:    { top: ['STARTING A NEW PROJECT', 'MY TO-DO LIST'],          bottom: ['3 HOURS OF MEETINGS LATER', 'WHAT I ACTUALLY DID'] },
            school:  { top: ['STUDYING ALL NIGHT',     'THE SYLLABUS'],           bottom: ['FORGETTING EVERYTHING', 'WHAT WAS ACTUALLY ON THE EXAM'] },
            gaming:  { top: ['JUST ONE MORE GAME',     'MY TEAMMATES'],           bottom: ['6 HOURS LATER', 'WHEN WE LOSE'] },
            food:    { top: ['MY MEAL PREP GOALS',     'WHAT I PLANNED TO COOK'], bottom: ['ORDERING PIZZA AGAIN', 'INSTANT NOODLES'] },
            fitness: { top: ['GOING TO THE GYM',       'NEW YEAR RESOLUTION'],    bottom: ['ONCE IN JANUARY', 'FEBRUARY ME'] }
        };
        for (const [k, v] of Object.entries(map)) {
            if (ctx.includes(k)) {
                const opts = v[position];
                return opts[Math.floor(Math.random() * opts.length)];
            }
        }
        return null;
    }

    async getAIThemes(templateName) {
        // Try API first, fall back to predefined
        try {
            const res = await fetch('/api/get-themes', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ templateName })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.themes?.length) return data.themes;
            }
        } catch { /* fallthrough */ }
        return getPredefinedThemes();
    }

    cacheKey(templateName, position, context) {
        return `${templateName}||${position}||${context || 'default'}`;
    }

    addToCache(key, value) {
        if (aiCache.size >= AI_CONFIG.maxCacheSize) {
            aiCache.delete(aiCache.keys().next().value);
        }
        aiCache.set(key, value);
    }

