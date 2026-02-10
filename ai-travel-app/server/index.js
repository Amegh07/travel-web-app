import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { runAgent, AgentRole, keyManager } from './smartRouter.js';

// Load secrets
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE ---
app.use(cors({ origin: '*' })); // Allow Frontend to talk to Backend
app.use(express.json());

// 📝 DEBUGGER: Log every request
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
        console.warn(`   ⚠️ IATA Resolve Failed for ${keyword}: ${e.message}`);
        return keyword.substring(0, 3).toUpperCase();
    }
}

// --- ✈️ ROUTE 1: FLIGHT SEARCH ---
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
        console.error("❌ FLIGHT API FAILED:");
        if (error.response) {
            console.error("   Status:", error.response.statusCode);
            console.error("   Details:", error.response.result?.errors?.[0]?.detail);
        } else {
            console.error("   System Error:", error.message);
        }
        res.json({ type: 'none', results: [] });
    }
});

// --- 🏨 ROUTE 2: HOTEL SEARCH (FIXED) ---
app.get('/api/hotels', async (req, res) => {
    try {
        // 🔥 FIX: Accept 'destination' OR 'cityCode'
        // This handles both Frontend formats automatically
        const targetCity = req.query.destination || req.query.cityCode;

        console.log(`🏨 Searching Hotels for: ${targetCity}`);
        
        if (!targetCity) {
            console.error("❌ Missing destination parameter");
            return res.json([]);
        }
        
        // Use the resolved IATA code for better accuracy
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

// --- 🔍 ROUTE 3: CITY AUTOCOMPLETE ---
app.get('/api/city-search', async (req, res) => {
    try {
        const { keyword } = req.query;
        if (!keyword) return res.json([]);
        
        const client = keyManager.getAmadeusClient("FLIGHTS");
        const response = await client.referenceData.locations.get({
            keyword,
            subType: 'CITY,AIRPORT'
        });
        res.json(response.data);
    } catch (e) {
        res.json([]); 
    }
});

// --- 🎫 ROUTE 4: AI EVENTS ---
app.post('/api/events', async (req, res) => {
    try {
        console.log("🎫 AI Agent: Finding Events...");
        const { destination, date } = req.body;
        const systemPrompt = "You are a local guide. Return strict JSON array: [{ id, title, category, description }]";
        const userContent = `Find 3 events in ${destination} for ${date}.`;
        const result = await runAgent(AgentRole.GUIDE, systemPrompt, userContent);
        res.json(JSON.parse(result));
    } catch (error) {
        console.error("❌ Events Agent Failed:", error.message);
        res.json([]); 
    }
});

// --- 🤖 ROUTE 5: AI ITINERARY ---
app.post('/api/itinerary', async (req, res) => {
    try {
        console.log("🤖 AI Architect: Building Itinerary...");
        const { destination, days, interests } = req.body;
        const systemPrompt = `You are a travel architect. Return strict JSON.`;
        const userContent = `Create a ${days}-day trip to ${destination}. Interests: ${interests}. Format: { "itinerary": [{ "day": 1, "theme": "string", "activities": [...] }] }`;
        const result = await runAgent(AgentRole.ARCHITECT, systemPrompt, userContent);
        res.json(JSON.parse(result));
    } catch (error) {
        res.status(500).json({ error: "AI Busy" });
    }
});

// --- 🚚 ROUTE 6: LOGISTICS ---
app.post('/api/logistics', async (req, res) => {
    try {
        const { flight, hotel } = req.body;
        const systemPrompt = "Logistics Engine. Return JSON: { distance, duration, method, traffic_note, routeUrl }";
        const userContent = `From Airport to ${hotel.name}.`;
        const result = await runAgent(AgentRole.TRANSFER, systemPrompt, userContent);
        res.json(JSON.parse(result));
    } catch (error) {
        res.json({ distance: "20km", duration: "30min", method: "Taxi", routeUrl: "#" });
    }
});

app.listen(PORT, () => {
    console.log(`\n✅ Travex Server Running on http://localhost:${PORT}`);
    console.log(`📝 Debug Mode: ACTIVATED`);
});