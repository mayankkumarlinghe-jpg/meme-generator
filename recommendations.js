

// Configuration
const AI_CONFIG = {
    apiEndpoint: '/api/generate-caption',
    fallbackMode: true,
    cacheEnabled: true,
    requestDelay: 1000, // Delay between requests to avoid rate limiting
    maxCacheSize: 100,
    fetchTimeout: 10000 // Added timeout for fetch
};

// Enhanced cache system
const aiCache = new Map();

// Queue for requests to handle concurrency (FIXED: Added this declaration)
const requestQueue = [];

// Processing flag
let isProcessingQueue = false;

/**
 * Smart AI caption generator with caching and queueing
 */
class AIGenerator {
    constructor() {
        this.isProcessing = false;
        this.requestCount = 0;
        this.lastRequestTime = 0;
    }

    async generateCaption(templateName, position, context = null) {
        const cacheKey = this.getCacheKey(templateName, position, context);
        
        // Check cache first
        if (AI_CONFIG.cacheEnabled && aiCache.has(cacheKey)) {
            console.log('Cache hit for:', cacheKey);
            return aiCache.get(cacheKey);
        }

        // Queue the request
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
            
            // Rate limiting
            await this.waitForRateLimit();

            try {
                this.requestCount++;
                this.lastRequestTime = Date.now();
                
                const caption = await this.fetchFromAI(templateName, position, context);
                
                // Cache the result
                if (AI_CONFIG.cacheEnabled) {
                    this.addToCache(this.getCacheKey(templateName, position, context), caption);
                }
                
                resolve(caption);
            } catch (error) {
                reject(error);
            }
        }
        
        isProcessingQueue = false;
    }

    async fetchFromAI(templateName, position, context) {
    try {
        const response = await fetch('/api/generate-caption', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                templateName,
                position,
                context: context || 'general internet humor'
            })
        });

        if (!response.ok) {
            throw new Error(`API route returned ${response.status}`);
        }

        const data = await response.json();
        return data.caption;
    } catch (error) {
        console.error('Serverless API failed:', error);
        return null; // will trigger your smart fallback
    }
}

    getEnhancedFallback(templateName, position, context) {
        const templateAnalysis = this.analyzeTemplate(templateName);
        
        if (context) {
            return this.getContextualCaption(templateAnalysis, position, context);
        }
        
        return this.getSmartFallback(templateAnalysis, position);
    }

    analyzeTemplate(templateName) {
        const name = templateName.toLowerCase();
        const analysis = {
            type: 'generic',
            themes: [],
            mood: 'neutral'
        };

        // Expanded detection
        if (name.includes('drake')) analysis.type = 'comparison';
        else if (name.includes('distract') || name.includes('boyfriend')) analysis.type = 'distraction';
        else if (name.includes('button')) analysis.type = 'choice';
        else if (name.includes('brain') || name.includes('expanding')) analysis.type = 'evolution';
        else if (name.includes('bernie')) analysis.type = 'political';
        else if (name.includes('uno')) analysis.type = 'gaming';
        else if (name.includes('buff') || name.includes('doge')) analysis.type = 'comparison';
        else if (name.includes('exit') || name.includes('ramp')) analysis.type = 'choice'; // Added
        else if (name.includes('balloon')) analysis.type = 'distraction'; // Added
        else if (name.includes('change my mind')) analysis.type = 'debate'; // Added

        // Detect themes
        if (name.includes('hotline') || name.includes('bling')) analysis.themes.push('music', 'style');
        if (name.includes('change my mind')) analysis.themes.push('debate', 'opinion');
        if (name.includes('exit') || name.includes('ramp')) analysis.themes.push('driving', 'confusion');
        if (name.includes('balloon')) analysis.themes.push('escape', 'freedom');
        if (name.includes('cheems')) analysis.themes.push('dog', 'meme');

        // Detect mood
        if (name.includes('happy') || name.includes('smile')) analysis.mood = 'happy';
        if (name.includes('sad') || name.includes('cry')) analysis.mood = 'sad';
        if (name.includes('angry') || name.includes('mad')) analysis.mood = 'angry';
        if (name.includes('confus')) analysis.mood = 'confused';

        return analysis;
    }

    getSmartFallback(analysis, position) {
        const captions = {
            comparison: {
                top: [
                    "WHEN YOU SEE THE PERFECT SOLUTION",
                    "THE WAY I PLANNED MY DAY",
                    "EXPECTATIONS FOR THE WEEKEND",
                    "HOW I THINK I LOOK"
                ],
                bottom: [
                    "VS WHAT ACTUALLY HAPPENS",
                    "REALITY AT 3 PM",
                    "WHAT I ACTUALLY DO",
                    "HOW I ACTUALLY LOOK"
                ]
            },
            distraction: {
                top: [
                    "MY CURRENT RESPONSIBILITY",
                    "THE TASK I'M SUPPOSED TO DO",
                    "MY ORIGINAL PLAN"
                ],
                bottom: [
                    "A NEW SHINY DISTRACTION",
                    "WHAT I ACTUALLY GET DONE",
                    "MY BRAIN SEEING SOMETHING NEW"
                ]
            },
            choice: {
                top: [
                    "CHOOSE: GET WORK DONE",
                    "OPTION A: BE PRODUCTIVE",
                    "PRESS FOR SUCCESS"
                ],
                bottom: [
                    "OR: WATCH MEMES ALL DAY",
                    "OPTION B: PROCRASTINATE",
                    "PRESS FOR FUN"
                ]
            },
            evolution: {
                top: [
                    "SMALL BRAIN: REGULAR THINKING",
                    "LEVEL 1: BASIC UNDERSTANDING",
                    "STAGE ONE: BEGINNER"
                ],
                bottom: [
                    "GALAXY BRAIN: ADVANCED KNOWLEDGE",
                    "LEVEL 100: EXPERT MODE",
                    "FINAL FORM: MASTER"
                ]
            },
            generic: {
                top: [
                    "WHEN YOU FINALLY SUCCEED",
                    "ME TRYING TO EXPLAIN",
                    "HOW IT FEELS TO WIN",
                    "WHEN THE PLAN WORKS"
                ],
                bottom: [
                    "AND NOBODY NOTICES",
                    "VS WHAT THEY UNDERSTAND",
                    "VICTORY DANCE INITIATED",
                    "SUCCESS ACHIEVED"
                ]
            }
        };

        const type = analysis.type in captions ? analysis.type : 'generic';
        const options = captions[type][position] || captions.generic[position];
        
        return options[Math.floor(Math.random() * options.length)];
    }

    getContextualCaption(analysis, position, context) {
        const contextualTemplates = {
            work: {
                top: ["ME STARTING A NEW PROJECT", "THE DEADLINE APPROACHING"],
                bottom: ["ME AT 11:59 PM", "PROCRASTINATION LEVEL: MAX"]
            },
            school: {
                top: ["STUDYING FOR EXAMS", "THE SYLLABUS"],
                bottom: ["WHAT I ACTUALLY REMEMBER", "REALITY OF ONLINE CLASS"]
            },
            gaming: {
                top: ["TRYING TO WIN", "GAMER MODE ACTIVATED"],
                bottom: ["GETTING DEFEATED", "CONTROLLER THROWN"]
            },
            love: {
                top: ["EXPECTATIONS FOR DATE NIGHT", "ROMANTIC MOVIES"],
                bottom: ["REALITY OF NETFLIX & CHILL", "ACTUAL DATE NIGHT"]
            }
        };

        if (context in contextualTemplates) {
            const options = contextualTemplates[context][position];
            return options[Math.floor(Math.random() * options.length)];
        }

        return this.getSmartFallback(analysis, position);
    }

    async getAIThemes(templateName) {
        const analysis = this.analyzeTemplate(templateName);
        
        const themeCategories = {
            comparison: [
                { name: "Before vs After", description: "Contrast two states", topText: "BEFORE THE UPDATE", bottomText: "AFTER THE UPDATE" },
                { name: "Expectation vs Reality", description: "Dream vs actual outcome", topText: "HOW I IMAGINED IT", bottomText: "HOW IT ACTUALLY WENT" }
            ],
            distraction: [
                { name: "Work vs Distraction", description: "Focus struggle", topText: "MY IMPORTANT WORK", bottomText: "A RANDOM THOUGHT" },
                { name: "Plan vs Actual", description: "Derailed plans", topText: "MY ORIGINAL PLAN", bottomText: "WHAT I ACTUALLY DID" }
            ],
            choice: [
                { name: "Good vs Evil", description: "Moral dilemma", topText: "DO THE RIGHT THING", bottomText: "DO THE FUN THING" },
                { name: "Smart vs Dumb", description: "Decision making", topText: "LOGICAL CHOICE", bottomText: "WHAT I ACTUALLY CHOOSE" }
            ],
            generic: [
                { name: "Success Story", description: "Achievement meme", topText: "THE STRUGGLE", bottomText: "THE VICTORY" },
                { name: "Tech Problems", description: "Digital life struggles", topText: "WHEN THE CODE WORKS", bottomText: "WHEN IT BREAKS IN PRODUCTION" },
                { name: "Social Media", description: "Online life", topText: "INSTAGRAM LIFE", bottomText: "REAL LIFE" }
            ]
        };

        const themes = themeCategories[analysis.type] || themeCategories.generic;
        
        // Add some random variations
        return themes.map(theme => ({
            ...theme,
            topText: this.varyText(theme.topText),
            bottomText: this.varyText(theme.bottomText)
        }));
    }

    varyText(text) {
        const variations = {
            "BEFORE THE UPDATE": ["BEFORE THE CHANGE", "OLD VERSION", "TRADITIONAL WAY"],
            "AFTER THE UPDATE": ["AFTER THE CHANGE", "NEW VERSION", "MODERN WAY"],
            "HOW I IMAGINED IT": ["MY EXPECTATIONS", "THE DREAM", "PERFECT SCENARIO"],
            "HOW IT ACTUALLY WENT": ["THE REALITY", "ACTUAL OUTCOME", "WHAT HAPPENED"]
        };

        return variations[text] ? 
            variations[text][Math.floor(Math.random() * variations[text].length)] : 
            text;
    }

    async improveTextWithAI(topText, bottomText) {
        // Improved logic: Chain multiple improvements deterministically for better quality
        const improvements = [
            (text) => text.toUpperCase(),
            (text) => text + (text.endsWith('!') ? '' : '!'),
            (text) => text.replace(/I/g, 'WE').replace(/my/g, 'OUR')
            // Removed hashtag as it's not always appropriate
        ];

        const applyImprovements = (text) => improvements.reduce((acc, fn) => fn(acc), text);

        return {
            top: topText ? applyImprovements(topText) : '',
            bottom: bottomText ? applyImprovements(bottomText) : ''
        };
    }

    getCacheKey(templateName, position, context) {
        return `${templateName}-${position}-${context || 'default'}`;
    }

    addToCache(key, value) {
        if (aiCache.size >= AI_CONFIG.maxCacheSize) {
            const firstKey = aiCache.keys().next().value;
            aiCache.delete(firstKey);
        }
        aiCache.set(key, value);
    }

    async waitForRateLimit() {
        const now = Date.now();
        const timeSinceLast = now - this.lastRequestTime;
        
        if (timeSinceLast < AI_CONFIG.requestDelay) {
            await new Promise(resolve => 
                setTimeout(resolve, AI_CONFIG.requestDelay - timeSinceLast)
            );
        }
    }
}

// Create singleton instance
const aiGenerator = new AIGenerator();

// Public API functions
async function getAICaption(templateName, position, context = null) {
    return await aiGenerator.generateCaption(templateName, position, context);
}

async function getAIThemes(templateName) {
    return await aiGenerator.getAIThemes(templateName);
}

async function improveTextWithAI(topText, bottomText) {
    // First, check if we have meaningful text to improve
    if ((!topText || topText.trim() === '') && (!bottomText || bottomText.trim() === '')) {
        return { top: topText, bottom: bottomText };
    }
    
    try {
        // Try to get AI improvement first
        const response = await fetch('/api/improve-text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                topText,
                bottomText,
                context: 'meme humor'
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.improvedTop || data.improvedBottom) {
                return {
                    top: data.improvedTop || topText,
                    bottom: data.improvedBottom || bottomText
                };
            }
        }
    } catch (error) {
        console.warn('AI improvement failed, using local enhancement:', error);
    }
    
    // Fallback: Use local text enhancement
    return localTextEnhancement(topText, bottomText);
}

function localTextEnhancement(topText, bottomText) {
    const enhancements = [
        // Make text more meme-like
        (text) => {
            if (!text) return '';
            let enhanced = text.toUpperCase();
            
            // Add emphasis for short texts
            if (enhanced.length < 20) {
                if (!enhanced.endsWith('!') && !enhanced.endsWith('?') && !enhanced.endsWith('.')) {
                    enhanced += '!';
                }
            }
            
            // Add common meme phrases
            const memePhrases = [
                ' WHEN', ' EVERYWHERE', ' ALWAYS', ' NEVER', ' LITERALLY',
                ' 100%', ' FOR REAL', ' THOUGH', ' TBH', ' I CAN\'T'
            ];
            
            // Randomly add a meme phrase (30% chance)
            if (Math.random() > 0.7 && enhanced.length < 50) {
                const phrase = memePhrases[Math.floor(Math.random() * memePhrases.length)];
                enhanced += phrase;
            }
            
            return enhanced;
        },
        
        // Add humor elements
        (text) => {
            if (!text) return '';
            let humorous = text;
            
            // Replace boring words with funnier alternatives
            const replacements = {
                'GOOD': ['GREAT', 'AMAZING', 'EPIC', 'LEGENDARY'],
                'BAD': ['TERRIBLE', 'AWFUL', 'HORRIBLE', 'DISASTROUS'],
                'HAPPY': ['EXCITED', 'THRILLED', 'OVERJOYED', 'ECSTATIC'],
                'SAD': ['DEVASTATED', 'HEARTBROKEN', 'DEPRESSED', 'MISERABLE'],
                'BIG': ['HUGE', 'ENORMOUS', 'MASSIVE', 'GIGANTIC'],
                'SMALL': ['TINY', 'MINUSCULE', 'MICROSCOPIC', 'PETITE']
            };
            
            Object.keys(replacements).forEach(word => {
                if (humorous.includes(word)) {
                    const alternatives = replacements[word];
                    humorous = humorous.replace(
                        new RegExp(word, 'g'), 
                        alternatives[Math.floor(Math.random() * alternatives.length)]
                    );
                }
            });
            
            return humorous;
        }
    ];
    
    // Apply enhancements with higher probability for shorter texts
    const applyToTop = topText && topText.length > 0;
    const applyToBottom = bottomText && bottomText.length > 0;
    
    let improvedTop = topText;
    let improvedBottom = bottomText;
    
    if (applyToTop) {
        enhancements.forEach(enhance => {
            if (Math.random() > 0.3) { // 70% chance to apply each enhancement
                improvedTop = enhance(improvedTop);
            }
        });
    }
    
    if (applyToBottom) {
        enhancements.forEach(enhance => {
            if (Math.random() > 0.3) { // 70% chance to apply each enhancement
                improvedBottom = enhance(improvedBottom);
            }
        });
    }
    
    return {
        top: improvedTop,
        bottom: improvedBottom
    };
}

function getFallbackCaption(templateName, position) {
    return aiGenerator.getEnhancedFallback(templateName, position);
}

function getPredefinedThemes() {
    return [
        {
            name: "Tech Life",
            description: "Programmer struggles",
            topText: "WHEN THE CODE COMPILES",
            bottomText: "WHEN IT RUNS WITHOUT ERRORS"
        },
        {
            name: "Monday Mood",
            description: "Start of week struggles",
            topText: "MONDAY MORNING ENERGY",
            bottomText: "MONDAY AFTERNOON REALITY"
        },
        {
            name: "Social Media",
            description: "Online vs offline life",
            topText: "INSTAGRAM PERFECTION",
            bottomText: "REAL LIFE CHAOS"
        },
        {
            name: "Gamer Life",
            description: "Gaming struggles",
            topText: "TRYING TO WIN",
            bottomText: "GETTING DEFEATED INSTANTLY"
        },
        {
            name: "Student Life",
            description: "Academic struggles",
            topText: "STUDYING ALL NIGHT",
            bottomText: "FORGETTING EVERYTHING"
        },
        {
            name: "Work Life",
            description: "Office humor",
            topText: "ME IN MEETINGS",
            bottomText: "ME AFTER MEETINGS"
        }
    ];
}

// Initialize
console.log('AI Generator initialized with enhanced capabilities');

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getAICaption,
        getAIThemes,
        improveTextWithAI,
        getFallbackCaption,
        getPredefinedThemes
    };
}
