import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
  origin: '*', // Or specify your frontend URL
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get("/", (req, res) => {
  res.json({ message: "Meme Generator API is running" });
});

// AI Caption Generation Route
app.post("/api/generate-caption", async (req, res) => {
  try {
    const { templateName, position, context = "general internet humor" } = req.body;

    console.log(`Generating ${position} caption for: ${templateName}`);

    // Check for API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY not found, using fallback");
      return res.json({ 
        caption: getFallbackCaption(templateName, position)
      });
    }

    // Prepare prompt for Gemini
    const prompt = `Create a funny meme caption for the ${position} of the "${templateName}" meme template.
The context is: ${context}
Rules:
1. Make it ALL CAPS
2. Maximum 8 words
3. Make it humorous and relevant to the template
4. No emojis
5. Keep it concise

Example for "Distracted Boyfriend" template:
Top: "MY CURRENT GIRLFRIEND"
Bottom: "SOMETHING SHINY AND NEW"

Generate the ${position} caption now:`;

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 50,
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract caption from response
    let caption = "AI GENERATION FAILED";
    
    if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      caption = data.candidates[0].content.parts[0].text
        .trim()
        .toUpperCase()
        .replace(/"/g, '')
        .replace(/\n/g, ' ');
      
      // Ensure it's not too long
      const words = caption.split(' ');
      if (words.length > 8) {
        caption = words.slice(0, 8).join(' ');
      }
    }

    console.log(`Generated caption: ${caption}`);
    
    res.json({ 
      success: true,
      caption: caption
    });

  } catch (error) {
    console.error("Error generating caption:", error);
    
    // Fallback response
    res.json({
      success: false,
      caption: getFallbackCaption(req.body?.templateName || "Unknown", req.body?.position || "top")
    });
  }
});

// Fallback caption generator
function getFallbackCaption(templateName, position) {
  const fallbacks = {
    top: [
      "WHEN YOU FINALLY UNDERSTAND",
      "ME TRYING TO EXPLAIN",
      "WHEN THE PLAN WORKS",
      "EXPECTATIONS VS REALITY",
      "BEFORE THE MEETING",
      "HOW I THINK I LOOK"
    ],
    bottom: [
      "AND NOBODY NOTICES",
      "WHAT THEY ACTUALLY HEAR",
      "BUT IT ACTUALLY FAILED",
      "DREAMS VS ACTUALITY",
      "AFTER THE MEETING",
      "HOW I ACTUALLY LOOK"
    ]
  };
  
  const options = fallbacks[position] || fallbacks.top;
  return options[Math.floor(Math.random() * options.length)];
}

// Health check
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy",
    aiAvailable: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Themes endpoint
app.post("/api/generate-themes", async (req, res) => {
  try {
    const { templateName } = req.body;
    
    // For now, return predefined themes
    res.json({
      success: true,
      themes: [
        {
          name: "Tech Life",
          description: "Programmer struggles",
          topText: "WHEN THE CODE COMPILES",
          bottomText: "WHEN IT RUNS WITHOUT ERRORS"
        },
        {
          name: "Social Media",
          description: "Online vs offline",
          topText: "INSTAGRAM PERFECTION",
          bottomText: "REAL LIFE CHAOS"
        }
      ]
    });
  } catch (error) {
    console.error("Error generating themes:", error);
    res.json({ success: false, themes: [] });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`AI Available: ${!!process.env.GEMINI_API_KEY ? 'Yes' : 'No'}`);
});