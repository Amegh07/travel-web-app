/* server/index.js */
import express from 'express';
import cors from 'cors';
import Amadeus from 'amadeus';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// CONFIGURATION
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
// Fallback: try loading from root if not found in server/
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = 5000;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true }));
app.use(express.json());

// --- STARTUP CHECK ---
console.log("\n==================================================");
console.log("🚀 STARTING BACKEND (HYBRID ENGINE)");
console.log(`🤖 GEMINI KEY:  ${process.env.GEMINI_API_KEY ? "OK ✅" : "MISSING ❌"}`);
console.log(`⚡ GROQ KEY:    ${process.env.GROQ_API_KEY ? "OK ✅" : "MISSING ❌"}`);
console.log(`✈️ AMADEUS:     ${process.env.AMADEUS_CLIENT_ID ? "OK ✅" : "MISSING ❌"}`);
console.log("==================================================\n");

// --- AMADEUS SETUP ---
const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET
});

// --- HELPER: AI CALLER ---
function parseAIResponse(text) {
  try {
    // 1. Try direct parse
    return JSON.parse(text);
  } catch (e) {
    // 2. Try stripping Markdown code blocks
    const match = text.match(/```json([\s\S]*?)```/);
    if (match) { try { return JSON.parse(match[1]); } catch (err) {} }
    
    // 3. Try finding the first '{' or '['
    const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) { try { return JSON.parse(jsonMatch[0]); } catch (err) {} }
    
    return null;
  }
}

// 1. Gemini (Primary)
async function tryGemini(prompt) {
  if (!process.env.GEMINI_API_KEY) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const response = await fetch(url, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) 
    });
    
    if (!response.ok) return null;
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? text.trim() : null;
  } catch (e) { 
    console.error("Gemini Error:", e.message);
    return null; 
  }
}

// 2. Groq (Backup)
async function tryGroq(prompt, jsonMode = true) {
  if (!process.env.GROQ_API_KEY) return null;
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST", 
      headers: { 
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({ 
        messages: [{ role: "user", content: prompt }], 
        model: "llama-3.3-70b-versatile",
        response_format: jsonMode ? { type: "json_object" } : undefined
      })
    });
    
    if (!response.ok) return null;
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (e) { 
    console.error("Groq Error:", e.message);
    return null; 
  }
}

// 3. Hybrid Orchestrator
async function callHybridAI(prompt, jsonMode = true) {
    // A. Try Gemini First
    console.log("🤖 Asking Gemini...");
    let text = await tryGemini(prompt);
    
    // B. Fallback to Groq
    if (!text) {
        console.log("⚡ Gemini failed. Switching to Groq...");
        text = await tryGroq(prompt, jsonMode);
    }

    // C. Validation
    if (!text || text.length < 10) {
        throw new Error("AI returned empty or invalid response");
    }

    return jsonMode ? parseAIResponse(text) : text;
}


// --- API ROUTES ---

// 1. ITINERARY
app.post('/api/itinerary', async (req, res) => {
  const { destination, interests, customInterest, days, budget } = req.body;
  
  // Calculate duration logic if dates provided, else default to 3
  const duration = days || 3;

  const prompt = `Create a ${duration}-day itinerary for ${destination}. 
  Budget: ${budget}. Interests: ${interests?.join(", ") || "General"}. 
  User Request: ${customInterest || "None"}.
  Return strictly valid JSON. Format: Array of objects [{ "day": 1, "theme": "...", "activities": [{ "time": "...", "description": "...", "location": "..." }] }]`;
   
  try {
      const data = await callHybridAI(prompt, true);
      res.json(Array.isArray(data) ? data : (data?.itinerary || []));
  } catch (e) {
      console.error(e);
      // Fallback data so UI doesn't crash
      res.json([{ day: 1, theme: "Explore", activities: [{ time: "Morning", description: "Explore the city center", location: destination }] }]);
  }
});

// 2. CHAT (New!)
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    const prompt = `You are a helpful travel assistant. Answer this briefly: ${message}`;
    
    try {
        const reply = await callHybridAI(prompt, false); // false = plain text
        res.json({ reply });
    } catch (e) {
        res.json({ reply: "I'm offline right now, but I can still help you plan trips!" });
    }
});

// 3. FLIGHTS (Proxy to Amadeus)
app.get('/api/flights', async (req, res) => {
  try {
    const { origin, destination, date } = req.query;
    if (!origin || !destination || !date) return res.json([]);
    
    const r = await amadeus.shopping.flightOffersSearch.get({
        originLocationCode: origin,
        destinationLocationCode: destination,
        departureDate: date,
        adults: '1',
        max: '5'
    });
    res.json(r.data);
  } catch (e) { res.json([]); }
});

// 4. HOTELS (Proxy to Amadeus)
app.get('/api/hotels', async (req, res) => {
    try {
        const { cityCode } = req.query;
        // Basic hotel search
        const r = await amadeus.referenceData.locations.hotels.byCity.get({ cityCode });
        // Mocking images/price since Amadeus Test API data is limited
        const hotels = r.data.slice(0, 6).map(h => ({
            id: h.hotelId,
            name: h.name,
            price: "Check availability", 
            image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
            rating: (Math.random() * 1.5 + 3.5).toFixed(1) // Mock rating 3.5 - 5.0
        }));
        res.json(hotels);
    } catch (e) { res.json([]); }
});

// 5. PACKING
app.post('/api/packing', async (req, res) => {
    const { destination, interests } = req.body;
    const prompt = `Packing list for ${destination}. Interests: ${interests}. Return JSON object { "Essentials": [], "Clothes": [], "Tech": [] }`;
    try {
        const data = await callHybridAI(prompt, true);
        res.json(data);
    } catch (e) { res.json({}); }
});

// 6. CITY SEARCH
app.get('/api/city-search', async (req, res) => {
    try {
        const { keyword } = req.query;
        const r = await amadeus.referenceData.locations.get({ keyword, subType: 'CITY' });
        res.json(r.data);
    } catch (e) { res.json([]); }
});

app.listen(PORT, () => console.log(`🔥 Backend running on http://localhost:${PORT}`));