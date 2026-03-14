const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// 🪄 MAGIC SEARCH: NLP Extraction
export const extractIntent = async (query, userLocation) => {
    try {
        const res = await fetch(`${API_BASE}/api/extract-intent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, userLocation })
        });
        return await res.json();
    } catch (error) {
        console.error("Extraction API Error:", error);
        return null;
    }
};

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
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
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
    } catch (error) {
        console.error("City Search Failed:", error);
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
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error("Chat API Error:", error);
        return { reply: "I'm having trouble connecting to the travel network right now." };
    }
};

// 3. Flight Search (Uses the associated Airport Code)
export const fetchFlights = async (origin, destination, date, currency) => {
    try {
        const originCode = typeof origin === 'object' ? origin.code : origin;
        const destCode = typeof destination === 'object' ? destination.code : destination;
        const currencyParam = currency ? `&currency=${currency}` : '';
        const res = await fetch(`${API_BASE}/api/flights?origin=${originCode}&destination=${destCode}&date=${date}${currencyParam}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error("Flights API Error:", error);
        return { results: [] };
    }
};

export const fetchHotels = async (destination, budget, currency, checkIn, checkOut) => {
    try {
        const destCode = typeof destination === 'object' ? destination.code : destination;
        const datesParam = (checkIn && checkOut) ? `&checkIn=${checkIn}&checkOut=${checkOut}` : '';
        const res = await fetch(`${API_BASE}/api/hotels?destination=${destCode}&budget=${budget || 5000}&currency=${currency || 'INR'}${datesParam}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error("Hotels API Error:", error);
        return [];
    }
};

export const fetchEvents = async (destination, date) => {
    try {
        const destName = typeof destination === 'object' ? destination.name : destination;
        const res = await fetch(`${API_BASE}/api/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destination: destName, date })
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error("Events API Error:", error);
        return [];
    }
};

// --- 🧠 AI ARCHITECT ENDPOINTS ---

export const fetchItinerary = async (payload) => {
    try {
        const res = await fetch(`${API_BASE}/api/itinerary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
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
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error("Mapping API Error:", error);
        return { logistics: [] };
    }
};

export const fetchCFO = async (budgetData) => {
    try {
        const res = await fetch(`${API_BASE}/api/cfo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(budgetData)
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error("CFO API Error:", error);
        return { status: "safe", message: "Budget tracker offline" };
    }
};