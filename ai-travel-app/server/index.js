import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { runAgent, AgentRole, keyManager } from './smartRouter.js';

// Load secrets
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const TICKETMASTER_KEY = process.env.TICKETMASTER_KEY;

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
        return code || keyword.substring(0, 3).toUpperCase();
    } catch (e) {
        return keyword.substring(0, 3).toUpperCase();
    }
}

// --- 🛠️ HELPER: TICKETMASTER FETCH ---
async function fetchTicketmasterEvents(city, date) {
    if (!TICKETMASTER_KEY) return null;
    try {
        console.log(`   🎫 Checking Ticketmaster for ${city}...`);
        
        // Ticketmaster API call
        const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${TICKETMASTER_KEY}&city=${encodeURIComponent(city)}&sort=date,asc&size=5`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (!data._embedded || !data._embedded.events) {
            console.log("   ⚠️ No Ticketmaster events found. Switching to AI.");
            return null;
        }

        console.log(`   ✅ Found ${data._embedded.events.length} real events!`);

        // Map to our App's Format
        return data._embedded.events.map(ev => ({
            id: ev.id,
            title: ev.name,
            category: ev.classifications?.[0]?.segment?.name || "Entertainment",
            description: ev._embedded?.venues?.[0]?.name || "Venue TBD",
            date: ev.dates?.start?.localDate,
            price: ev.priceRanges ? `${ev.priceRanges[0].min} ${ev.priceRanges[0].currency}` : "Check Link",
            image: ev.images?.find(img => img.ratio === "16_9" && img.width > 600)?.url || ev.images?.[0]?.url,
            url: ev.url // Booking Link
        }));

    } catch (error) {
        console.error("   ❌ Ticketmaster Error:", error.message);
        return null;
    }
}

// ==================================================
// 🚨 PRIORITY ROUTE: CITY SEARCH (Must be first)
// ==================================================
app.get('/api/city-search', async (req, res) => {
    try {
        const { keyword } = req.query;
        if (!keyword || keyword.length < 2) return res.json([]);
        const client = keyManager.getAmadeusClient("FLIGHTS");
        const response = await client.referenceData.locations.get({ keyword, subType: 'CITY,AIRPORT' });
        res.json(response.data);
    } catch (e) { res.json([]); }
});

// --- ✈️ ROUTE 2: FLIGHT SEARCH ---
app.get('/api/flights', async (req, res) => {
    try {
        const { origin, destination, date } = req.query;
        console.log(`✈️  Starting Flight Search: ${origin} -> ${destination}`);
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
        res.json({ type: 'multi_modal', results: response.data, journey: { originHub: originCode, destHub: destCode } });
    } catch (error) { res.json({ type: 'none', results: [] }); }
});

// --- 🏨 ROUTE 3: HOTEL SEARCH ---
app.get('/api/hotels', async (req, res) => {
    try {
        const targetCity = req.query.destination || req.query.cityCode;
        console.log(`🏨 Searching Hotels for: ${targetCity}`);
        if (!targetCity) return res.json([]);
        const cityCode = await resolveToIata(targetCity);
        const amadeus = keyManager.getAmadeusClient("HOTELS");
        const response = await amadeus.referenceData.locations.hotels.byCity.get({ cityCode: cityCode, radius: 10, radiusUnit: 'KM' });
        
        const hotels = response.data.slice(0, 6).map(h => ({
            id: h.hotelId,
            name: h.name,
            image: `https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80`,
            rating: "4.5",
            price: "$200",
            distance: "City Center"
        }));
        res.json(hotels);
    } catch (error) { res.json([]); }
});

// --- 🔓 ROUTE 4: AI ARCHITECT ---
app.post('/api/itinerary', async (req, res) => {
    try {
        const { destination, dates, hotel, budget, interests } = req.body;
        const start = new Date(dates.arrival);
        const end = new Date(dates.departure);
        const daysCount = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
        
        console.log(`   📅 Planning ${daysCount} Days for ${destination}`);

        const systemPrompt = `You are an elite Travel Architect (Llama-3.3-70B). Create a ${daysCount}-DAY JSON itinerary. 
        Format: { "trip_name": "String", "daily_plan": [{ "day": 1, "date": "YYYY-MM-DD", "theme": "String", "activities": [{ "time": "HH:MM", "activity": "String", "type": "food|sightseeing|logistics", "cost_estimate": Number, "description": "String" }] }] }`;
        const userContent = `Plan a ${daysCount}-day trip to ${destination}. Stay: ${hotel?.name}. Arrival: ${dates?.arrival}.`;
        
        const result = await runAgent(AgentRole.ARCHITECT, systemPrompt, userContent);
        res.json(JSON.parse(result));
    } catch (error) { res.status(500).json({ error: "AI Busy" }); }
});

// --- 🎫 ROUTE 7: EVENTS (HYBRID: Ticketmaster -> AI) ---
app.post('/api/events', async (req, res) => {
    try {
        const { destination, date } = req.body;
        
        // 1. Try Ticketmaster First
        const realEvents = await fetchTicketmasterEvents(destination, date);
        if (realEvents) {
            return res.json(realEvents);
        }

        // 2. Fallback to AI if no real events found
        console.log("   🤖 Ticketmaster empty. Asking AI Guide...");
        const result = await runAgent(AgentRole.GUIDE, 
            "You are a local guide. Return strict JSON array: [{ id, title, category, description, price, date }]", 
            `Find 3 generic cultural activities in ${destination} for ${date}.`
        );
        res.json(JSON.parse(result));

    } catch (error) { res.json([]); }
});

// --- CHAT & OTHERS ---
app.post('/api/mapping', async (req, res) => { res.json({ logistics: [] }); });
app.post('/api/cfo', async (req, res) => { res.json({ status: "safe" }); });
app.post('/api/chat', async (req, res) => {
    try {
        const result = await runAgent(AgentRole.ROUTER, "You are Travex. Keep answers short. Return JSON: { \"reply\": \"String\" }", `User: ${req.body.message}`);
        res.json(JSON.parse(result));
    } catch (error) { res.json({ reply: "I'm busy." }); }
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`\n✅ Travex Server Running on http://localhost:${PORT}`);
    console.log(`   🎫 Ticketmaster: ${TICKETMASTER_KEY ? 'ACTIVE' : 'OFFLINE'}`);
});