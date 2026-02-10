const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// --- 🛠️ HELPER: MOCK FALLBACK ---
const getMockItinerary = (dest) => ({
    trip_name: `Trip to ${dest}`,
    daily_plan: [
        { day: 1, theme: "Arrival", activities: [{ time: "16:00", activity: "Check-in", type: "logistics" }] },
        { day: 2, theme: "Exploration", activities: [{ time: "10:00", activity: "City Tour", type: "sightseeing" }] }
    ]
});

// --- 🌐 REAL API CALLS ---

// 1. Enhanced City Search (Associates Airports to Cities)
export const searchCities = async (keyword) => {
    try {
        if (!keyword || keyword.length < 2) return [];
        
        // This endpoint now returns both CITY and AIRPORT records
        const res = await fetch(`${API_BASE}/api/city-search?keyword=${encodeURIComponent(keyword)}`);
        const data = await res.json();
        
        // Filter & Map: Prioritize Airports, but keep Cities if needed
        // format: "London, United Kingdom (LHR)"
        return data.map(item => ({
            name: item.address?.cityName || item.name,
            code: item.iataCode,
            country: item.address?.countryName,
            label: `${item.address?.cityName || item.name} (${item.iataCode})`,
            type: item.subType // "AIRPORT" or "CITY"
        }));
    } catch (e) { 
        console.error("City Search Failed:", e);
        return []; 
    }
};

// 2. ChatBot (The Concierge)
export const chatWithAI = async (message, context) => {
    try {
        const res = await fetch(`${API_BASE}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, context })
        });
        return await res.json();
    } catch (e) { 
        return { reply: "I'm having trouble connecting to the travel network right now." }; 
    }
};

// 3. Flight Search (Uses the associated Airport Code)
export const fetchFlights = async (origin, destination, date) => {
    try {
        // If the input is a full object from searchCities, use the .code (IATA)
        // If it's a raw string, send it as-is and let the backend resolve it
        const originCode = typeof origin === 'object' ? origin.code : origin;
        const destCode = typeof destination === 'object' ? destination.code : destination;

        const res = await fetch(`${API_BASE}/api/flights?origin=${originCode}&destination=${destCode}&date=${date}`);
        return await res.json();
    } catch (e) { return { results: [] }; }
};

export const fetchHotels = async (destination) => {
    try {
        // Prefer city code for hotels to get broader results
        const destCode = typeof destination === 'object' ? destination.code : destination;
        const res = await fetch(`${API_BASE}/api/hotels?destination=${destCode}`);
        return await res.json();
    } catch (e) { return []; }
};

export const fetchEvents = async (destination, date) => {
    try {
        const destName = typeof destination === 'object' ? destination.name : destination;
        const res = await fetch(`${API_BASE}/api/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destination: destName, date })
        });
        return await res.json();
    } catch (e) { return []; }
};

// --- 🧠 AI ARCHITECT ENDPOINTS ---

export const fetchItinerary = async (payload) => {
    try {
        console.log("🤖 Asking Architect...");
        const res = await fetch(`${API_BASE}/api/itinerary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        return data.daily_plan ? data : getMockItinerary(payload.destination);
    } catch (e) {
        console.error(e);
        return getMockItinerary(payload.destination);
    }
};

export const fetchMapping = async (segments) => {
    try {
        const res = await fetch(`${API_BASE}/api/mapping`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ segments })
        });
        return await res.json();
    } catch (e) { return { logistics: [] }; }
};

export const fetchCFO = async (budgetData) => {
    try {
        const res = await fetch(`${API_BASE}/api/cfo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(budgetData)
        });
        return await res.json();
    } catch (e) { return { status: "safe", message: "Budget tracker offline" }; }
};