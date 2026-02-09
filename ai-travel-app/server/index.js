import express from 'express';
import cors from 'cors';
import Amadeus from 'amadeus';
import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch'; 
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = 5000;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true }));
app.use(express.json());

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET
});

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// --- 🛠️ HELPER: Resolve City Name to IATA (Fixes "Tokyo" Bug) ---
async function resolveToIata(keyword) {
    try {
        const response = await amadeus.referenceData.locations.get({ keyword, subType: 'CITY' });
        return response.data?.[0]?.iataCode || null;
    } catch (e) { return null; }
}

// --- 🛠️ HELPER: Get Coordinates (For Road Trips) ---
async function getCoords(location) {
    try {
        const response = await amadeus.referenceData.locations.get({ keyword: location, subType: 'CITY' });
        if (response.data?.[0]?.geoCode) return { ...response.data[0].geoCode, iataCode: response.data[0].iataCode };
    } catch (e) {}
    try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
        const res = await fetch(url, { headers: { 'User-Agent': 'TravexApp/1.0' } });
        const data = await res.json();
        if (data?.[0]) return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon), iataCode: null };
    } catch (e) {}
    return null;
}

// --- 🧠 GROQ JOURNEY ARCHITECT ---
async function getJourneyPlan(originName, destName) {
    if (!GROQ_API_KEY) return null;
    const prompt = `Decide transport mode from "${originName}" to "${destName}".
    Rules: 
    1. If distance < 400km and no ocean, return "road_trip".
    2. If distance > 400km OR ocean crossing, return "multi_modal".
    3. For "multi_modal", identify the nearest International Airport IATA code for BOTH.
    Return JSON: { "type": "road_trip" | "multi_modal", "originHub": "IATA", "destHub": "IATA", "reason": "string" }`;

    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" } })
        });
        const data = await res.json();
        return JSON.parse(data.choices[0].message.content);
    } catch (e) { return null; }
}

// --- ROUTES ---

// ✈️ SMART ROUTING (Flights + Road)
app.get('/api/flights', async (req, res) => {
    try {
        const { origin, destination, date } = req.query;
        console.log(`🚀 Planning: ${origin} -> ${destination}`);

        let plan = await getJourneyPlan(origin, destination);
        
        // FAILSAFE: Manual Resolution if Groq fails
        if (!plan || !plan.originHub || !plan.destHub) {
            const [oCode, dCode] = await Promise.all([resolveToIata(origin), resolveToIata(destination)]);
            plan = { 
                type: (oCode && dCode) ? "multi_modal" : "road_trip", 
                originHub: oCode || origin, 
                destHub: dCode || destination 
            };
        }

        // 🚗 CASE: ROAD TRIP
        if (plan.type === 'road_trip') {
            const [oCoords, dCoords] = await Promise.all([getCoords(origin), getCoords(destination)]);
            if (oCoords && dCoords) {
                // Math Distance Calculation
                const R = 6371; const dLat = (dCoords.latitude - oCoords.latitude) * (Math.PI/180); const dLon = (dCoords.longitude - oCoords.longitude) * (Math.PI/180);
                const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(oCoords.latitude*(Math.PI/180))*Math.cos(dCoords.latitude*(Math.PI/180))*Math.sin(dLon/2)*Math.sin(dLon/2);
                const dist = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 1.2);
                const hours = Math.floor(dist/60);
                return res.json({
                    type: 'road_trip',
                    results: [{ message: `Direct drive recommended.`, duration: `${hours}h ${dist%60}m`, distance: `${dist} km` }]
                });
            }
        }

        // ✈️ CASE: MULTI-MODAL
        console.log(`Searching Flights: ${plan.originHub} -> ${plan.destHub}`);
        const flightRes = await amadeus.shopping.flightOffersSearch.get({
            originLocationCode: plan.originHub, destinationLocationCode: plan.destHub, departureDate: date, adults: '1', max: '3'
        });

        res.json({
            type: 'multi_modal',
            results: flightRes.data,
            journey: { 
                originHub: plan.originHub, 
                destHub: plan.destHub, 
                startRoad: `Drive to ${plan.originHub} Airport`, 
                endRoad: `Transfer to ${destination}` 
            }
        });

    } catch (e) {
        console.error("Flight Error:", e);
        res.json({ results: [], type: 'none' });
    }
});

// 🎉 EVENTS (New Feature!)
app.post('/api/events', async (req, res) => {
    try {
        const { destination, date } = req.body;
        const prompt = `List 3 major events/activities in ${destination} around ${date}. Return JSON array: [{title, category, description}].`;
        
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" } })
        });
        const data = await response.json();
        const json = JSON.parse(data.choices[0].message.content);
        res.json(json.events || json); 
    } catch (e) { res.json([]); }
});

// 🏨 HOTELS
app.get('/api/hotels', async (req, res) => {
    try {
        const { cityCode } = req.query;
        // Auto-resolve "Tokyo" to "TYO" if needed
        const code = (cityCode && cityCode.length === 3) ? cityCode : await resolveToIata(cityCode);
        const r = await amadeus.referenceData.locations.hotels.byCity.get({ cityCode: code || 'COK' });
        res.json(r.data.slice(0, 4).map(h => ({ id: h.hotelId, name: h.name, rating: "4.5", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800" })));
    } catch (e) { res.json([]); }
});

// 📅 ITINERARY GENERATOR
app.post('/api/itinerary', async (req, res) => {
    try {
        const { destination, days, interests } = req.body;
        const prompt = `Create a ${days}-day itinerary for ${destination} focusing on ${interests}. Return JSON: { "itinerary": [{ "day": 1, "theme": "string", "activities": [{ "time": "string", "description": "string" }] }] }`;
        
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" } })
        });
        const data = await response.json();
        res.json(JSON.parse(data.choices[0].message.content));
    } catch (e) { res.json({ itinerary: [] }); }
});

// 💬 CHATBOT
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: [{ role: "user", content: message }] })
        });
        const data = await response.json();
        res.json({ reply: data.choices[0].message.content });
    } catch (e) { res.json({ reply: "I'm offline right now." }); }
});

// 🔍 CITY SEARCH
app.get('/api/city-search', async (req, res) => {
    try {
        const r = await amadeus.referenceData.locations.get({ keyword: req.query.keyword, subType: 'CITY,AIRPORT' });
        res.json(r.data);
    } catch (e) { res.json([]); }
});

app.listen(PORT, () => console.log(`🔥 Travex Server running on ${PORT}`));