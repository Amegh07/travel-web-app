/* -------------------------------------------------------------------------- */
/* server/index.js (FINAL MERGE: GEMINI AI + YOUR CITY SEARCH)                */
/* -------------------------------------------------------------------------- */
import express from 'express';
import cors from 'cors';
import Amadeus from 'amadeus';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// --- 1. SMART ENV LOADING ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try loading .env from 'server/' folder
dotenv.config({ path: path.join(__dirname, '.env') });
// Try loading .env from root 'ai-travel-app/' folder (backup)
dotenv.config({ path: path.join(__dirname, '../.env') });

// --- 2. DEBUG CHECK ---
console.log("\n---------------------------------------------------");
console.log("🔑 API KEY DEBUG CHECK:");
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ FATAL ERROR: GEMINI_API_KEY is missing!");
} else if (process.env.GEMINI_API_KEY.startsWith("AIza")) {
  console.log("✅ Key found (Starts with 'AIza...')");
} else {
  console.warn("⚠️ WARNING: Key found but looks invalid (doesn't start with 'AIza')");
}
console.log("---------------------------------------------------\n");

const app = express();
const PORT = 5000;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true }));
app.use(express.json());

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET
});

// 🧠 CONFIG: The "Use All Others + Include This" Strategy
const AI_CONFIG = {
  planner: {
    models: [
      "gemini-3-pro-preview", // 1. Try Bleeding Edge
      "gemini-2.5-pro",       // 2. Try High Intelligence
      "gemini-2.5-flash",     // 3. ✅ THE PROVEN WORKER
      "gemini-1.5-pro"        // 4. Ultimate Safety Net
    ]
  },
  lister: {
    models: [
      "gemini-3-flash-preview",
      "gemini-2.5-flash",     // ✅ THE PROVEN WORKER
      "gemini-1.5-flash"
    ]
  }
};

// 🧠 GEMINI API HELPER
async function callGemini(role, prompt) {
  const modelsToTry = AI_CONFIG[role].models;

  console.log(`\n==================================================`);
  console.log(`🤖 STARTING AI REQUEST: [${role.toUpperCase()}]`);

  for (const model of modelsToTry) {
    try {
      console.log(`🔌 CONNECTING TO: ${model}...`);
      
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            response_mime_type: "application/json" 
          }
        })
      });

      if (!response.ok) {
        console.warn(`⚠️ ${model} Failed (${response.status}). Switching...`);
        continue;
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0].content) {
        console.warn(`⚠️ ${model} returned empty. Switching...`);
        continue;
      }

      const text = data.candidates[0].content.parts[0].text;
      console.log(`✅ SUCCESS with ${model}!`);
      return JSON.parse(text);

    } catch (e) {
      console.error(`❌ Error with ${model}:`, e.message);
    }
  }

  console.log("❌ ALL MODELS FAILED. Returning empty.");
  return null;
}

// --- ROUTES ---

// ---------------------------------------------------------------------------
// 🏙️ CITY + AIRPORT SEARCH (YOUR REQUESTED CODE)
// ---------------------------------------------------------------------------
app.get('/api/city-search', async (req, res) => {
  const { keyword } = req.query;

  if (!keyword || keyword.length < 2) {
    return res.json([]);
  }

  try {
    const response = await amadeus.referenceData.locations.get({
      keyword,
      subType: [Amadeus.location.city, Amadeus.location.airport],
      page: { limit: 10 }
    });

    const results = (response.data || []).map((loc) => ({
      name: loc.name,
      iataCode: loc.iataCode,
      city: loc.address?.cityName || loc.name,
      countryCode: loc.address?.countryCode || '',
      country:
        loc.address?.countryName ||
        loc.address?.countryCode ||
        ''
    }));

    console.log(`🏙️ CITY SEARCH "${keyword}" → ${results.length} results`);
    res.json(results);
  } catch (err) {
    console.error('❌ CITY SEARCH ERROR:', err.message);
    res.json([]);
  }
});

// ---------------------------------------------------------------------------
// ✈️ FLIGHT SEARCH
// ---------------------------------------------------------------------------
app.get('/api/flights', async (req, res) => {
  const { origin, destination, date, returnDate } = req.query;
  console.log(`✈️ SEARCHING: ${origin} -> ${destination}`);
  try {
    let destCountryCode = '';
    // Try to get country code for destination to help UI
    try {
        const destLoc = await amadeus.referenceData.locations.get({ keyword: destination, subType: Amadeus.location.city });
        if (destLoc.data?.[0]) destCountryCode = destLoc.data[0].address.countryCode;
    } catch (e) {}

    const r = await amadeus.shopping.flightOffersSearch.get({ originLocationCode: origin, destinationLocationCode: destination, departureDate: date, adults: '1', max: '10' });
    
    const enhanced = r.data.map(f => ({
      ...f,
      airlineLogo: `https://pics.avs.io/200/200/${f.itineraries[0].segments[0].carrierCode}.png`,
      airlineName: f.itineraries[0].segments[0].carrierCode,
      destCountryCode 
    }));
    console.log(`✅ FOUND ${enhanced.length} FLIGHTS`);
    res.json(enhanced);
  } catch (e) { 
    console.error("❌ FLIGHT ERROR:", e.message);
    res.json([]); 
  }
});

// ---------------------------------------------------------------------------
// 📅 AI ITINERARY
// ---------------------------------------------------------------------------
app.post('/api/itinerary', async (req, res) => {
  const { destination, startDate, endDate } = req.body;
  let duration = 3;
  if (startDate && endDate) duration = Math.ceil(Math.abs(new Date(endDate) - new Date(startDate)) / (86400000)) + 1;
  
  const prompt = `Create a ${duration}-day travel itinerary for ${destination}.
  Return a JSON Array where each object has "day" (number), "theme" (string), and "activities" (array of strings).
  Example: [{"day": 1, "theme": "Arrival", "activities": ["Check in"]}]`;
  
  const data = await callGemini('planner', prompt);
  res.json(data || []); 
});

// ---------------------------------------------------------------------------
// 🎒 AI PACKING LIST
// ---------------------------------------------------------------------------
app.post('/api/packing', async (req, res) => {
  const prompt = `Create a packing list for ${req.body.destination}.
  Return a JSON Object with categories like "Essentials", "Clothes", "Tech".
  Example: {"Essentials": ["Passport"], "Clothes": ["Shirt"]}`;

  const data = await callGemini('lister', prompt);
  res.json(data || {});
});

// ---------------------------------------------------------------------------
// 💰 RATES, EVENTS, HOTELS
// ---------------------------------------------------------------------------
app.get('/api/rates', async (req, res) => {
  try {
    const response = await fetch(`https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API_KEY}/latest/USD`);
    const data = await response.json();
    res.json(data.conversion_rates || {});
  } catch (e) { res.json({}); }
});

app.get('/api/events', async (req, res) => {
  try {
    const response = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?apikey=${process.env.TICKETMASTER_API_KEY}&keyword=${req.query.keyword}&size=5`);
    const data = await response.json();
    res.json(data._embedded?.events || []);
  } catch (e) { res.json([]); }
});

app.get('/api/country-info', async (req, res) => {
  try {
    const response = await fetch(`https://restcountries.com/v3.1/alpha/${req.query.code}`);
    const data = await response.json();
    res.json(data[0] || null);
  } catch (e) { res.json(null); }
});

app.get('/api/hotels', async (req, res) => {
  try {
    const r = await amadeus.referenceData.locations.hotels.byCity.get({ cityCode: req.query.cityCode, radius: 20, radiusUnit: 'KM' });
    const h = await Promise.all(r.data.slice(0, 20).map(async (x) => ({ ...x, media: [{ uri: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80" }] })));
    res.json(h);
  } catch (e) { res.json([]); }
});

app.listen(PORT, () => console.log(`🔥 Backend running on http://localhost:${PORT}`));