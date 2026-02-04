/* -------------------------------------------------------------------------- */
/* server/index.js (FINAL MASTER: HYBRID AI + AMADEUS + UNSPLASH)             */
/* -------------------------------------------------------------------------- */
import express from 'express';
import cors from 'cors';
import Amadeus from 'amadeus';
// Note: Native fetch is used (Node 18+)
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
console.log("🚀 STARTING BACKEND (MASTER VERSION)");
console.log(`✈️ AMADEUS:     ${process.env.AMADEUS_CLIENT_ID ? "OK ✅" : "MISSING ❌"}`);
console.log(`🤖 GEMINI KEY:  ${process.env.GEMINI_API_KEY ? "OK ✅" : "MISSING ❌"}`);
console.log(`⚡ GROQ KEY:    ${process.env.GROQ_API_KEY ? "OK ✅" : "MISSING ❌"}`);
console.log(`🖼️ UNSPLASH:    ${process.env.UNSPLASH_ACCESS_KEY ? "OK ✅" : "MISSING ❌"}`);
console.log("==================================================\n");

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET
});

// ==========================================================================
// 1. CITY SEARCH ROUTE
// ==========================================================================
const cityCache = new Map();

app.get('/api/city-search', async (req, res) => {
  const { keyword } = req.query;
  if (!keyword || keyword.length < 2) return res.json([]);
  
  const cacheKey = keyword.toLowerCase().trim();
  
  if (cityCache.has(cacheKey)) {
    console.log(`⚡ CACHE HIT: "${keyword}"`);
    return res.json(cityCache.get(cacheKey));
  }

  console.log(`🔎 ASKING AMADEUS: "${keyword}"...`);

  try {
    const response = await amadeus.referenceData.locations.get({ 
      keyword, 
      subType: 'CITY,AIRPORT' 
    });

    const results = (response.data || []).map((loc) => ({
      name: loc.name,
      iataCode: loc.iataCode,
      city: loc.address?.cityName || loc.name,
      countryCode: loc.address?.countryCode || '',
      country: loc.address?.countryName || loc.address?.countryCode || ''
    }));

    console.log(`✅ AMADEUS FOUND: ${results.length} locations`);
    cityCache.set(cacheKey, results);
    res.json(results);

  } catch (err) {
    console.error(`❌ AMADEUS FAILED for "${keyword}": ${err.message}`);
    res.json([]);
  }
});

// ==========================================================================
// 2. HYBRID AI ENGINE (RICH DATA SUPPORT)
// ==========================================================================
function parseAIResponse(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    // Attempt to strip markdown code blocks
    const match = text.match(/```json([\s\S]*?)```/);
    if (match) { try { return JSON.parse(match[1]); } catch (err) {} }
    // Attempt to find raw JSON object/array
    const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) { try { return JSON.parse(jsonMatch[0]); } catch (err) {} }
    return null;
  }
}

async function tryGemini(prompt) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY?.trim()}`;
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
    
    if (!response.ok) {
      console.warn(`⚠️ GEMINI FAILED (${response.status}). Switching...`);
      return null;
    }
    
    const data = await response.json();
    return parseAIResponse(data.candidates[0].content.parts[0].text);
  } catch (e) { 
    console.error("❌ GEMINI ERROR:", e.message);
    return null; 
  }
}

async function tryGroq(role, prompt) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return null;
  
  const model = role === 'planner' ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant';
  
  console.log(`⚡ SWITCHING TO BACKUP: Groq (${model})...`);

  // Rich Data System Instructions
  const systemInstruction = role === 'planner'
    ? `You are a travel planner. Return strictly valid JSON.
       Output must be an ARRAY of objects.
       Each object must have keys: "day" (number), "theme" (string), "activities" (array).
       IMPORTANT: "activities" must be an array of OBJECTS.
       Each activity object must have:
       - "time" (string, e.g. "Morning", "10:00 AM")
       - "description" (string, activity details)
       - "location" (string, place name)`
    : `You are a packing assistant. Return strictly valid JSON Object where keys are categories and values are arrays of strings.`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST", headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "system", content: systemInstruction }, { role: "user", content: prompt }], model, temperature: 0.2, response_format: { type: "json_object" } })
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    console.log(`✅ SUCCESS with Groq!`);
    return parseAIResponse(data.choices[0].message.content);
  } catch (e) { 
    console.error("❌ GROQ ERROR:", e.message);
    return null; 
  }
}

async function callHybridAI(role, prompt) {
  let result = await tryGemini(prompt);
  if (result) return result;
  
  result = await tryGroq(role, prompt);
  if (result) return result;
  
  // Emergency Fallback
  const FALLBACK_DATA = {
    itinerary: [
      { day: 1, theme: "Arrival", activities: [{ time: "Evening", description: "Check in and relax", location: "City Center" }] },
      { day: 2, theme: "Exploration", activities: [{ time: "Morning", description: "Visit main landmarks", location: "Downtown" }] }
    ],
    packing: { "Essentials": ["Passport", "Wallet"] }
  };
  return role === 'planner' ? FALLBACK_DATA.itinerary : FALLBACK_DATA.packing;
}

// ==========================================================================
// 3. MAIN API ROUTES
// ==========================================================================
app.get('/api/flights', async (req, res) => {
  const { origin, destination, date } = req.query;
  try {
    const r = await amadeus.shopping.flightOffersSearch.get({ originLocationCode: origin, destinationLocationCode: destination, departureDate: date, adults: '1', max: '10' });
    const enhanced = r.data.map(f => ({ ...f, airlineLogo: `https://pics.avs.io/200/200/${f.itineraries[0].segments[0].carrierCode}.png`, airlineName: f.itineraries[0].segments[0].carrierCode }));
    res.json(enhanced);
  } catch (e) { res.json([]); }
});

app.post('/api/itinerary', async (req, res) => {
  const { destination, interests, customInterest } = req.body;
  const interestText = interests?.join(", ") || "general";
  const customText = customInterest ? `User request: "${customInterest}".` : "";
  
  const prompt = `Create a 3-day itinerary for ${destination}. Interests: ${interestText}. ${customText}.
    Return a JSON Array of days.
    Each activity MUST be an object with {time, description, location}.`;
    
  const data = await callHybridAI('planner', prompt);
  res.json(Array.isArray(data) ? data : (data?.itinerary || []));
});

app.post('/api/packing', async (req, res) => {
  const { destination, interests, customInterest } = req.body;
  const customText = customInterest ? `User request: "${customInterest}".` : "";
  const prompt = `Create packing list for ${destination}. Interests: ${interests?.join(", ")}. ${customText}. Return JSON Object.`;
  const data = await callHybridAI('lister', prompt);
  res.json(data);
});

// ==========================================================================
// 4. EXTRA ROUTES (RATES, COUNTRY, EVENTS, HOTELS, IMAGE)
// ==========================================================================
app.get('/api/rates', async (req, res) => { try { const r = await fetch(`https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API_KEY}/latest/USD`); const d = await r.json(); res.json(d.conversion_rates || {}); } catch (e) { res.json({}); } });
app.get('/api/country-info', async (req, res) => { try { const r = await fetch(`https://restcountries.com/v3.1/alpha/${req.query.code}`); const d = await r.json(); res.json(d[0] || null); } catch (e) { res.json(null); } });
app.get('/api/events', async (req, res) => { try { const r = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?apikey=${process.env.TICKETMASTER_API_KEY}&keyword=${req.query.keyword}&size=5`); const d = await r.json(); res.json(d._embedded?.events || []); } catch (e) { res.json([]); } });
app.get('/api/hotels', async (req, res) => { try { const r = await amadeus.referenceData.locations.hotels.byCity.get({ cityCode: req.query.cityCode, radius: 20, radiusUnit: 'KM' }); const h = await Promise.all(r.data.slice(0, 20).map(async (x) => ({ ...x, media: [{ uri: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80" }] }))); res.json(h); } catch (e) { res.json([]); } });

// 🖼️ NEW: UNSPLASH DESTINATION IMAGE ROUTE
app.get('/api/destination-image', async (req, res) => {
  const { query } = req.query;
  if (!query) return res.json({ url: null });

  const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1920&q=80";

  try {
    const apiKey = process.env.UNSPLASH_ACCESS_KEY?.trim();
    if (!apiKey) {
       console.warn("⚠️ No Unsplash Key. Using fallback image.");
       return res.json({ url: FALLBACK_IMAGE });
    }

    const searchQuery = encodeURIComponent(query + " city landmark viewpoint");
    const unsplashUrl = `https://api.unsplash.com/search/photos?query=${searchQuery}&orientation=landscape&per_page=1&client_id=${apiKey}`;
    
    const response = await fetch(unsplashUrl);

    if (!response.ok) {
       console.error(`❌ Unsplash API Error: ${response.status}`);
       return res.json({ url: FALLBACK_IMAGE });
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      console.log(`🖼️ Found background image for: ${query}`);
      res.json({ url: data.results[0].urls.regular });
    } else {
      res.json({ url: FALLBACK_IMAGE });
    }

  } catch (e) {
    console.error("❌ Unsplash Fetch Error:", e.message);
    res.json({ url: FALLBACK_IMAGE });
  }
});

app.listen(PORT, () => console.log(`🔥 Backend running on http://localhost:${PORT}`));