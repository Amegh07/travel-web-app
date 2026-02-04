/* -------------------------------------------------------------------------- */
/* server/index.js (FIXED: NATIVE FETCH + TRIMMED KEYS)                       */
/* -------------------------------------------------------------------------- */
import express from 'express';
import cors from 'cors';
import Amadeus from 'amadeus';
// import fetch from 'node-fetch'; <--- DELETED (Using Native Node Fetch)
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = 5000;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true }));
app.use(express.json());

// --- STARTUP CHECK ---
console.log("\n==================================================");
console.log("🚀 STARTING HYBRID AI ENGINE (Native Fetch)");
console.log(`🤖 GEMINI KEY:  ${process.env.GEMINI_API_KEY ? "OK ✅" : "MISSING ❌"}`);
console.log(`⚡ GROQ KEY:    ${process.env.GROQ_API_KEY ? "OK ✅" : "MISSING ❌"}`);
console.log("==================================================\n");

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET
});

// ==========================================================================
// 🧹 HELPER: CLEAN AI GARBAGE
// ==========================================================================
function parseAIResponse(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/```json([\s\S]*?)```/);
    if (match) { try { return JSON.parse(match[1]); } catch (err) {} }
    const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) { try { return JSON.parse(jsonMatch[0]); } catch (err) {} }
    console.error("❌ FAILED TO PARSE AI JSON:", text.substring(0, 100));
    return null;
  }
}

// ==========================================================================
// 1. PRIMARY: GEMINI 2.5 FLASH
// ==========================================================================
async function tryGemini(prompt) {
  console.log("🔌 CONNECTING TO: gemini-2.5-flash...");
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY?.trim()}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" }
      })
    });

    if (!response.ok) {
      console.warn(`⚠️ GEMINI FAILED (${response.status}). Switching to Groq...`);
      return null;
    }

    const data = await response.json();
    const rawText = data.candidates[0].content.parts[0].text;
    return parseAIResponse(rawText);
  } catch (e) {
    console.error("❌ GEMINI ERROR:", e.message);
    return null;
  }
}

// ==========================================================================
// 2. BACKUP: GROQ (STRICT FORMATTING)
// ==========================================================================
async function tryGroq(role, prompt) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return null;

  const model = role === 'planner' ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant';
  const url = "https://api.groq.com/openai/v1/chat/completions";

  console.log(`⚡ SWITCHING TO BACKUP: Groq (${model})...`);
  
  // Strict System Prompt
  const systemInstruction = role === 'planner'
    ? `You are a travel planner. Return strictly valid JSON. Output must be an ARRAY of objects. Each object must have keys: "day" (number), "theme" (string), "activities" (array of strings).`
    : `You are a packing assistant. Return strictly valid JSON. Output must be a SIMPLE OBJECT where keys are categories and values are arrays of strings.`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        model: model,
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("❌ GROQ FAILED:", err);
      return null;
    }

    const data = await response.json();
    console.log(`✅ SUCCESS with Groq (${model})!`);
    return parseAIResponse(data.choices[0].message.content);
  } catch (e) {
    console.error("❌ GROQ ERROR:", e.message);
    return null;
  }
}

// ==========================================================================
// 🛡️ EMERGENCY DATA (Fallback)
// ==========================================================================
const FALLBACK_DATA = {
  itinerary: [
    { day: 1, theme: "Arrival", activities: ["Check in", "City Walk", "Dinner"] },
    { day: 2, theme: "Explore", activities: ["Landmarks", "Museum", "Local Park"] },
    { day: 3, theme: "Departure", activities: ["Shopping", "Cafe", "Airport"] }
  ],
  packing: {
    "Essentials": ["Passport", "Wallet", "Phone"],
    "Clothes": ["T-Shirts", "Jeans", "Jacket"]
  }
};

// ==========================================================================
// 🧠 MAIN AI HANDLER
// ==========================================================================
async function callHybridAI(role, prompt) {
  let result = await tryGemini(prompt);
  if (result) return result;

  result = await tryGroq(role, prompt);
  if (result) return result;

  console.log("❌ ALL AI MODELS FAILED. Using hardcoded fallback.");
  return role === 'planner' ? FALLBACK_DATA.itinerary : FALLBACK_DATA.packing;
}

// ==========================================================================
// 🛣️ ROUTES
// ==========================================================================
const cityCache = new Map();
app.get('/api/city-search', async (req, res) => {
  const { keyword } = req.query;
  if (!keyword || keyword.length < 2) return res.json([]);
  
  const cacheKey = keyword.toLowerCase().trim();
  if (cityCache.has(cacheKey)) return res.json(cityCache.get(cacheKey));

  try {
    const response = await amadeus.referenceData.locations.get({ keyword, subType: 'CITY,AIRPORT' });
    const results = (response.data || []).map((loc) => ({
      name: loc.name,
      iataCode: loc.iataCode,
      city: loc.address?.cityName || loc.name,
      countryCode: loc.address?.countryCode || '',
      country: loc.address?.countryName || loc.address?.countryCode || ''
    }));
    cityCache.set(cacheKey, results);
    res.json(results);
  } catch (err) { res.json([]); }
});

app.get('/api/flights', async (req, res) => {
  const { origin, destination, date } = req.query;
  try {
    const r = await amadeus.shopping.flightOffersSearch.get({ originLocationCode: origin, destinationLocationCode: destination, departureDate: date, adults: '1', max: '10' });
    const enhanced = r.data.map(f => ({
      ...f,
      airlineLogo: `https://pics.avs.io/200/200/${f.itineraries[0].segments[0].carrierCode}.png`,
      airlineName: f.itineraries[0].segments[0].carrierCode
    }));
    res.json(enhanced);
  } catch (e) { res.json([]); }
});

app.post('/api/itinerary', async (req, res) => {
  const { destination } = req.body;
  const prompt = `Create a 3-day itinerary for ${destination}. Return JSON.`;
  const data = await callHybridAI('planner', prompt);
  res.json(Array.isArray(data) ? data : (data.itinerary || FALLBACK_DATA.itinerary));
});

app.post('/api/packing', async (req, res) => {
  const prompt = `Create packing list for ${req.body.destination}. Return JSON.`;
  const data = await callHybridAI('lister', prompt);
  res.json(data);
});

// 💰 EXTRAS
app.get('/api/rates', async (req, res) => {
  try {
    const r = await fetch(`https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API_KEY}/latest/USD`);
    const d = await r.json();
    res.json(d.conversion_rates || {});
  } catch (e) { res.json({}); }
});

app.get('/api/country-info', async (req, res) => {
  try {
    const r = await fetch(`https://restcountries.com/v3.1/alpha/${req.query.code}`);
    const d = await r.json();
    res.json(d[0] || null);
  } catch (e) { res.json(null); }
});

app.get('/api/events', async (req, res) => {
  try {
    const r = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?apikey=${process.env.TICKETMASTER_API_KEY}&keyword=${req.query.keyword}&size=5`);
    const d = await r.json();
    res.json(d._embedded?.events || []);
  } catch (e) { res.json([]); }
});

app.get('/api/hotels', async (req, res) => {
  try {
    const r = await amadeus.referenceData.locations.hotels.byCity.get({ cityCode: req.query.cityCode, radius: 20, radiusUnit: 'KM' });
    const h = await Promise.all(r.data.slice(0, 20).map(async (x) => ({ ...x, media: [{ uri: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80" }] })));
    res.json(h);
  } catch (e) { res.json([]); }
});

app.listen(PORT, () => console.log(`🔥 Backend running on http://localhost:${PORT}`));