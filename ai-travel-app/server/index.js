import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { runAgent, AgentRole, keyManager } from './smartRouter.js';

// Load secrets
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE ---
app.use(cors({ origin: '*' }));
app.use(express.json());

// 📝 DEBUGGER
app.use((req, res, next) => {
    console.log(`\n📥 [${req.method}] ${req.url}`);
    next();
});

// --- 🛠️ HELPER: IATA Code Resolution ---
async function resolveToIata(keyword) {
    if (!keyword || keyword.length === 3) return keyword?.toUpperCase();
    try {
        console.log(`   🔎 Resolving City: "${keyword}"...`);
        const client = keyManager.getAmadeusClient("FLIGHTS");
        const response = await client.referenceData.locations.get({
            keyword,
            subType: 'CITY,AIRPORT'
        });
        const code = response.data?.[0]?.iataCode;
        console.log(`   ✅ Resolved: ${code}`);
        return code || keyword.substring(0, 3).toUpperCase();
    } catch (e) {
        return keyword.substring(0, 3).toUpperCase();
    }
}

// --- 🔍 ROUTE 1: CITY SEARCH (Autocomplete) ---
// Moved to TOP to prevent 404 errors
app.get('/api/city-search', async (req, res) => {
    try {
        const { keyword } = req.query;
        if (!keyword || keyword.length < 2) return res.json([]);
        
        console.log(`🔎 Autocomplete: ${keyword}`);
        const client = keyManager.getAmadeusClient("FLIGHTS");
        const response = await client.referenceData.locations.get({
            keyword,
            subType: 'CITY,AIRPORT'
        });
        res.json(response.data);
    } catch (e) {
        console.error("⚠️ City Search Error:", e.message);
        res.json([]); 
    }
});

// --- ✈️ ROUTE 2: FLIGHT SEARCH ---
app.get('/api/flights', async (req, res) => {
    try {
        const { origin, destination, date } = req.query;
        console.log(`✈️  Starting Flight Search: ${origin} -> ${destination} on ${date}`);

        const originCode = await resolveToIata(origin);
        const destCode = await resolveToIata(destination);

        const amadeus = keyManager.getAmadeusClient("FLIGHTS");
        const response = await amadeus.shopping.flightOffersSearch.get({
            originLocationCode: originCode,
            destinationLocationCode: destCode,
            departureDate: date,
            adults: '1',
            max: '5'
        });

        console.log(`   ✅ Success! Found ${response.data.length} flights.`);
        
        res.json({ 
            type: 'multi_modal', 
            results: response.data,
            journey: { originHub: originCode, destHub: destCode }
        });

    } catch (error) {
        console.error("❌ FLIGHT API FAILED:", error.message);
        res.json({ type: 'none', results: [] });
    }
});

// --- 🏨 ROUTE 3: HOTEL SEARCH ---
app.get('/api/hotels', async (req, res) => {
    try {
        const targetCity = req.query.destination || req.query.cityCode;
        console.log(`🏨 Searching Hotels for: ${targetCity}`);
        
        if (!targetCity) return res.json([]);
        
        const cityCode = await resolveToIata(targetCity);
        const amadeus = keyManager.getAmadeusClient("HOTELS");

        const response = await amadeus.referenceData.locations.hotels.byCity.get({
            cityCode: cityCode,
            radius: 10,
            radiusUnit: 'KM'
        });

        console.log(`   ✅ Found ${response.data.length} hotels.`);

        const hotels = response.data.slice(0, 6).map(h => ({
            id: h.hotelId,
            name: h.name,
            image: `https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80`,
            rating: "4.5",
            price: "$200"
        }));

        res.json(hotels);

    } catch (error) {
        console.error("❌ HOTEL API FAILED:", error.message);
        res.json([]);
    }
});

// --- 🔓 ROUTE 4: AI ARCHITECT (THE PLANNER) ---
app.post('/api/itinerary', async (req, res) => {
    try {
        console.log("🤖 AI Architect: Generating Itinerary...");
        const { destination, dates, hotel, budget, interests } = req.body;

        const start = new Date(dates.arrival);
        const end = new Date(dates.departure);
        const diffTime = Math.abs(end - start);
        const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        console.log(`   📅 Planning for ${daysCount} Days (${dates.arrival} to ${dates.departure})`);

        const systemPrompt = `
        You are an elite Travel Architect using Llama-3.3-70B. 
        Create a strictly structured JSON itinerary for a ${daysCount}-DAY trip.
        HARD RULES:
        1. You MUST generate exactly ${daysCount} daily entries (Day 1 to Day ${daysCount}).
        2. Day 1 starts with "Arrival" and Check-in at ${hotel?.name}.
        3. The last day (Day ${daysCount}) ends with "Departure".
        4. Respect budget: ${budget?.remaining} ${budget?.currency} remaining.
        5. Return ONLY JSON. No markdown.
        Format: { "trip_name": "String", "daily_plan": [{ "day": 1, "date": "YYYY-MM-DD", "theme": "String", "activities": [{ "time": "HH:MM", "activity": "String", "type": "food|sightseeing|logistics", "cost_estimate": Number }] }] }
        `;

        const userContent = `Plan a ${daysCount}-day trip to ${destination}. 
        Arrival: ${dates?.arrival}. Departure: ${dates?.departure}.
        Interests: ${interests?.join(", ") || "General Sightseeing"}.`;

        const result = await runAgent(AgentRole.ARCHITECT, systemPrompt, userContent);
        res.json(JSON.parse(result));

    } catch (error) {
        console.error("❌ Architect Agent Failed:", error.message);
        res.status(500).json({ error: "AI Busy" });
    }
});

// --- 🗺️ ROUTE 5: AI MAPPING ---
app.post('/api/mapping', async (req, res) => {
    try {
        const { segments } = req.body;
        const result = await runAgent(AgentRole.MAPPING, 
            `You are a Logistics AI. Return JSON: { "logistics": [{ "segment_id": 0, "method": "Train|Walk|Taxi", "duration": "String", "cost": Number, "google_maps_link": "String" }] }`, 
            `Analyze: ${JSON.stringify(segments)}`
        );
        res.json(JSON.parse(result));
    } catch (error) { res.json({ logistics: [] }); }
});

// --- 💰 ROUTE 6: CFO ---
app.post('/api/cfo', async (req, res) => {
    try {
        const { total_budget, spent, query } = req.body;
        const result = await runAgent(AgentRole.CFO, 
            `You are a Travel CFO. Return JSON: { "status": "safe|warning|danger", "message": "String", "suggestion": "String" }`, 
            `Total: ${total_budget}. Spent: ${spent}. User asks: "${query}"`
        );
        res.json(JSON.parse(result));
    } catch (error) { res.json({ status: "warning", message: "Budget service offline." }); }
});

// --- 🎫 ROUTE 7: EVENTS ---
app.post('/api/events', async (req, res) => {
    try {
        const { destination, date } = req.body;
        const result = await runAgent(AgentRole.GUIDE, 
            "You are a local guide. Return strict JSON array: [{ id, title, category, description }]", 
            `Find 3 events in ${destination} for ${date}.`
        );
        res.json(JSON.parse(result));
    } catch (error) { res.json([]); }
});

// --- 💬 ROUTE 8: CHATBOT (CONCIERGE) ---
app.post('/api/chat', async (req, res) => {
    try {
        const { message, context } = req.body;
        const result = await runAgent(AgentRole.ROUTER, 
            `You are Travex, a helpful AI Travel Concierge. Keep answers short. Return JSON: { "reply": "Your response string" }`, 
            `Context: ${JSON.stringify(context || {})}. User says: "${message}"`
        );
        res.json(JSON.parse(result));
    } catch (error) { res.json({ reply: "I'm busy planning trips right now!" }); }
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`\n✅ Travex Server Running on http://localhost:${PORT}`);
    console.log(`📝 Debug Mode: ACTIVATED`);
});