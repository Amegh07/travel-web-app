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

// --- 1. UNIVERSAL GEOCODER (Amadeus + OSM) ---
async function getCoords(location) {
    try {
        const response = await amadeus.referenceData.locations.get({ keyword: location, subType: 'CITY' });
        if (response.data?.[0]?.geoCode) return response.data[0].geoCode;
    } catch (e) {}

    try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
        const res = await fetch(url, { headers: { 'User-Agent': 'TravexApp/1.0' } });
        const data = await res.json();
        if (data?.[0]) return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    } catch (e) { console.error("OSM Error"); }
    return null;
}

// --- 2. SMART ROUTING ENGINE (OSRM + Math) ---
async function getRoadTrip(origin, dest) {
    try {
        // Try Real OSRM API
        const url = `http://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${dest.longitude},${dest.latitude}?overview=false`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const hours = Math.floor(route.duration / 3600);
            const minutes = Math.round((route.duration % 3600) / 60);
            const km = Math.round(route.distance / 1000);
            return { duration: `${hours}h ${minutes}m`, distance: `${km} km` };
        }
    } catch (e) { console.log("OSM API busy, switching to Math Fallback..."); }
    return null;
}

function calculateFallbackRoute(lat1, lon1, lat2, lon2) {
    // Haversine Formula for "As the crow flies" + 20% road curvature buffer
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = Math.round(R * c * 1.2); // 1.2 buffer for roads
    
    const hours = Math.floor(distance / 60); // Assume 60km/h avg
    const minutes = Math.round(distance % 60);
    return { duration: `${hours}h ${minutes}m`, distance: `${distance} km` };
}

// --- 3. AI ENGINE (Gemini) ---
async function tryGemini(prompt) {
  if (!process.env.GEMINI_API_KEY) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const response = await fetch(url, { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) 
    });
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch (e) { return null; }
}

async function callHybridAI(prompt, jsonMode = true) {
    let text = await tryGemini(prompt);
    if (!text) throw new Error("AI unavailable");
    try { return jsonMode ? JSON.parse(text.replace(/```json|```/g, "").trim()) : text; }
    catch (e) { return jsonMode ? [] : text; }
}

// --- ROUTES ---

// ✈️ 🚗 1. SMART TRANSPORT
app.get('/api/flights', async (req, res) => {
  try {
    const { origin, destination, date } = req.query;
    if (!origin || !destination) return res.json({ results: [], type: 'none' });

    console.log(`Processing: ${origin} -> ${destination}`);

    // A. FLIGHTS
    try {
        const flightRes = await amadeus.shopping.flightOffersSearch.get({
            originLocationCode: origin, destinationLocationCode: destination, departureDate: date, adults: '1', max: '3'
        });
        if (flightRes.data && flightRes.data.length > 0) {
            return res.json({ results: flightRes.data, type: 'flight' });
        }
    } catch (e) {}

    // B. ROAD TRIP (Unbreakable Logic)
    console.log("⚠️ No flights. Calculating road trip...");
    const [originCoords, destCoords] = await Promise.all([getCoords(origin), getCoords(destination)]);

    if (originCoords && destCoords) {
        let route = await getRoadTrip(originCoords, destCoords);
        if (!route) route = calculateFallbackRoute(originCoords.latitude, originCoords.longitude, destCoords.latitude, destCoords.longitude);

        return res.json({ 
            results: [{
                type: 'road_trip',
                duration: route.duration,
                distance: route.distance,
                message: `No flights found. We calculated a driving route for you.`
            }], 
            type: 'road_trip' 
        });
    }

    res.json({ results: [], type: 'none' });

  } catch (e) { res.json({ results: [], type: 'none' }); }
});

// 🏨 2. HOTELS
app.get('/api/hotels', async (req, res) => {
    try {
        const { cityCode } = req.query;
        const r = await amadeus.referenceData.locations.hotels.byCity.get({ cityCode });
        const hotels = r.data.slice(0, 6).map(h => ({
            id: h.hotelId, name: h.name, price: "Check Rates", rating: "4.2",
            image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800"
        }));
        res.json(hotels);
    } catch (e) { res.json([]); }
});

// 📅 3. ITINERARY
app.post('/api/itinerary', async (req, res) => {
    try {
        const prompt = `Create ${req.body.days}-day trip for ${req.body.destination}. Return JSON array.`;
        const data = await callHybridAI(prompt, true);
        res.json(data);
    } catch (e) { res.json([]); }
});

// 💬 4. CHAT
app.post('/api/chat', async (req, res) => {
    try { res.json({ reply: await callHybridAI(req.body.message, false) }); }
    catch (e) { res.json({ reply: "Offline" }); }
});

// 🎒 5. PACKING LIST
app.post('/api/packing', async (req, res) => {
    try { 
        const prompt = `Generate packing list for ${req.body.destination} (${req.body.interests}). Return JSON object with categories.`;
        const data = await callHybridAI(prompt, true);
        res.json(data);
    } catch (e) { res.json({}); }
});

// 🔍 6. CITY SEARCH
app.get('/api/city-search', async (req, res) => {
    try {
        const r = await amadeus.referenceData.locations.get({ keyword: req.query.keyword, subType: 'CITY,AIRPORT' });
        res.json(r.data);
    } catch (e) { res.json([]); }
});

app.listen(PORT, () => console.log(`🔥 Server running on ${PORT}`));