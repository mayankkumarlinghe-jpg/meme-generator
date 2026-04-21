/* ─── AI Config ────────────────────────────────── */
const AI_CONFIG = {
    cacheEnabled:  true,
    requestDelay:  1500,
    maxCacheSize:  120,
    fetchTimeout:  12000,
    maxRetries:    4,
    retryBaseMs:   2000
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
        if (AI_CONFIG.cacheEnabled && aiCache.has(key)) {
            return aiCache.get(key).value;
        }

        return new Promise((resolve, reject) => {
            requestQueue.push({ templateName, position, context, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        if (isProcessingQueue) return;
        isProcessingQueue = true;

        while (requestQueue.length > 0) {
            const job = requestQueue.shift();

            try {
                await this.rateLimit();
                this.lastRequestTime = Date.now();

                const caption = await this.fetchCaption(
                    job.templateName,
                    job.position,
                    job.context
                );

                const key = this.cacheKey(job.templateName, job.position, job.context);
                this.addToCache(key, caption);
                job.resolve(caption);

            } catch (err) {
                job.reject(err);
            }
        }

        isProcessingQueue = false;

        if (requestQueue.length > 0) {
            this.processQueue();
        }
    }

    /* ── Vercel serverless route ── */
    async fetchCaption(templateName, position, context) {
        for (let attempt = 0; attempt <= AI_CONFIG.maxRetries; attempt++) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), AI_CONFIG.fetchTimeout);

            try {
                const res = await fetch('/api/generate-caption', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ templateName, position, context: context || 'general internet humor' }),
                    signal:  controller.signal
                });
                clearTimeout(timeout);

                if (res.status === 429) {
                    if (attempt === AI_CONFIG.maxRetries) {
                        console.warn('Rate limit hit — max retries exhausted, using fallback');
                        break;
                    }
                    const retryAfter = res.headers.get('Retry-After');
                    const waitMs = retryAfter
                        ? parseFloat(retryAfter) * 1000
                        : AI_CONFIG.retryBaseMs * Math.pow(2, attempt);

                    console.warn(`429 rate limit — waiting ${Math.round(waitMs / 1000)}s before retry ${attempt + 1}/${AI_CONFIG.maxRetries}`);
                    await new Promise(r => setTimeout(r, waitMs));
                    continue;
                }

                if (!res.ok) throw new Error(`API ${res.status}`);
                const data = await res.json();
                if (!data.caption) throw new Error('Empty caption');
                return data.caption;

            } catch (err) {
                clearTimeout(timeout);
                if (err.name === 'AbortError') {
                    console.warn('Caption API timed out — using fallback');
                } else if (attempt < AI_CONFIG.maxRetries && !err.message.startsWith('API ')) {
                    const waitMs = AI_CONFIG.retryBaseMs * Math.pow(2, attempt);
                    console.warn(`Network error (${err.message}) — retrying in ${waitMs / 1000}s`);
                    await new Promise(r => setTimeout(r, waitMs));
                    continue;
                } else {
                    console.warn('Caption API failed, using fallback:', err.message);
                }
                break;
            }
        }

        return this.smartFallback(this.analyzeTemplate(templateName), position, context);
    }

    /* ── Template analysis for smart fallback ── */
    analyzeTemplate(name) {
        const n = name.toLowerCase();
        const analysis = { type: 'generic', mood: 'neutral' };

        if (n.includes('drake'))                                    analysis.type = 'comparison';
        else if (n.includes('distract') || n.includes('boyfriend')) analysis.type = 'distraction';
        else if (n.includes('button'))                              analysis.type = 'choice';
        else if (n.includes('brain') || n.includes('expand'))       analysis.type = 'evolution';
        else if (n.includes('bernie'))                              analysis.type = 'political';
        else if (n.includes('uno'))                                 analysis.type = 'gaming';
        else if (n.includes('buff')  || n.includes('doge'))         analysis.type = 'comparison';
        else if (n.includes('exit')  || n.includes('ramp'))         analysis.type = 'choice';
        else if (n.includes('balloon'))                             analysis.type = 'distraction';
        else if (n.includes('change my mind'))                      analysis.type = 'debate';
        else if (n.includes('disaster') || n.includes('fine'))      analysis.type = 'crisis';
        else if (n.includes('woman')  || n.includes('yell'))        analysis.type = 'argument';
        else if (n.includes('this is fine'))                        analysis.type = 'crisis';

        if (n.includes('sad') || n.includes('cry'))   analysis.mood = 'sad';
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
        aiCache.set(key, { value, time: Date.now() });
    }

    async rateLimit() {
        const elapsed = Date.now() - this.lastRequestTime;
        if (elapsed < AI_CONFIG.requestDelay) {
            await new Promise(r => setTimeout(r, AI_CONFIG.requestDelay - elapsed));
        }
    }
}

/* ─── Singleton ────────────────────────────────── */
const aiGenerator = new AIGenerator();

/* ─── Public API ───────────────────────────────── */
async function getAICaption(templateName, position, context = null) {
    return aiGenerator.generateCaption(templateName, position, context);
}

async function getAIThemes(templateName) {
    return aiGenerator.getAIThemes(templateName);
}

async function improveTextWithAI(topText, bottomText) {
    if (!topText && !bottomText) return { top: topText, bottom: bottomText };

    try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), AI_CONFIG.fetchTimeout);

        const res = await fetch('/api/improve-text', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ topText, bottomText, context: 'meme humor' }),
            signal:  controller.signal
        });

        if (res.ok) {
            const data = await res.json();
            if (data.improvedTop || data.improvedBottom) {
                return { top: data.improvedTop || topText, bottom: data.improvedBottom || bottomText };
            }
        }
    } catch (err) {
        console.warn('improve-text API failed:', err.message);
    }

    return localTextEnhancement(topText, bottomText);
}

function localTextEnhancement(topText, bottomText) {
    const replacements = {
        GOOD:  ['GREAT', 'AMAZING', 'EPIC', 'LEGENDARY'],
        BAD:   ['TERRIBLE', 'AWFUL', 'DISASTROUS'],
        HAPPY: ['ECSTATIC', 'THRILLED', 'OVERJOYED'],
        SAD:   ['DEVASTATED', 'HEARTBROKEN'],
        BIG:   ['ENORMOUS', 'MASSIVE', 'COLOSSAL'],
        SMALL: ['TINY', 'MINUSCULE', 'MICROSCOPIC']
    };

    const enhance = text => {
        if (!text) return '';
        let s = text.toUpperCase();
        for (const [word, alts] of Object.entries(replacements)) {
            if (s.includes(word)) {
                s = s.replace(new RegExp(word, 'g'), alts[Math.floor(Math.random() * alts.length)]);
            }
        }
        if (!s.endsWith('!') && !s.endsWith('?') && s.length < 50 && Math.random() > .5) s += '!';
        return s;
    };

    return { top: enhance(topText), bottom: enhance(bottomText) };
}

function getFallbackCaption(templateName, position) {
    return aiGenerator.smartFallback(aiGenerator.analyzeTemplate(templateName), position, null);
}

function getPredefinedThemes() {
    return [
        { name: '🖥️ Tech Life',    description: 'Developer struggles',     topText: 'WHEN THE CODE FINALLY COMPILES',   bottomText: 'AND IMMEDIATELY BREAKS IN PROD'       },
        { name: '😴 Monday Mood',  description: 'Start of week energy',     topText: 'MONDAY 8AM: FULL OF MOTIVATION',   bottomText: 'MONDAY 8:05AM: BACK IN BED'           },
        { name: '📱 Social Media', description: 'Online vs reality',        topText: 'MY INSTAGRAM',                     bottomText: 'MY ACTUAL LIFE'                       },
        { name: '🎮 Gamer Life',   description: 'Gaming rage',              topText: 'ME LOADING INTO THE GAME',         bottomText: 'ME AFTER THE FIRST LOSS'             },
        { name: '📚 Student Life', description: 'Academic suffering',       topText: 'STUDYING THE NIGHT BEFORE',        bottomText: 'FORGETTING EVERYTHING AT THE EXAM'   },
        { name: '💼 Work Life',    description: 'Office culture',           topText: 'THE EMAIL COULD HAVE BEEN A CALL', bottomText: 'THE CALL COULD HAVE BEEN AN EMAIL'   },
        { name: '💰 Money',        description: 'Financial chaos',          topText: 'MY SAVINGS ACCOUNT',               bottomText: 'ONE COFFEE AND A VIBE'               },
        { name: '😴 Sleep',        description: 'Sleep deprivation',        topText: 'GOING TO SLEEP EARLY TONIGHT',     bottomText: 'IT IS 3AM AND I AM WATCHING VIDEOS'  },
        { name: '🏋️ Fitness',     description: 'Gym procrastination',      topText: 'NEW YEAR NEW ME',                  bottomText: 'FEBRUARY: BACK TO SNACKS'            },
        { name: '🍕 Food',         description: 'Eating habits',            topText: 'MEAL PREP SUNDAY',                 bottomText: 'ORDERING PIZZA WEDNESDAY'            },
    ];
}

console.log('✦ AI Meme Generator — recommendations.js loaded');
