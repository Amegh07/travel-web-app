const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

export const searchCities = async (keyword) => {
  try {
    const res = await fetch(`${API_BASE}/city-search?keyword=${encodeURIComponent(keyword)}`);
    if (!res.ok) throw new Error("City search failed");
    return await res.json();
  } catch (error) { return []; }
};

export const fetchFlights = async (origin, destination, date) => {
  try {
    const res = await fetch(`${API_BASE}/flights?origin=${origin}&destination=${destination}&date=${date}`);
    const data = await res.json();
    return {
        results: data.results || [],
        type: data.type || 'none'
    };
  } catch (error) {
    return { results: [], type: 'none' };
  }
};

export const fetchHotels = async (cityCode) => {
  try {
    const res = await fetch(`${API_BASE}/hotels?cityCode=${encodeURIComponent(cityCode)}`);
    return await res.json();
  } catch (error) { return []; }
};

export const generateItinerary = async (tripData) => {
  try {
    const res = await fetch(`${API_BASE}/itinerary`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tripData),
    });
    return await res.json();
  } catch (error) { return []; }
};

export const chatWithAI = async (message, context = []) => {
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, context }),
      });
      const data = await res.json();
      return data.reply;
    } catch (error) { return "Connection error."; }
};

export const getPackingList = async (destination, interests) => {
  try {
    const res = await fetch(`${API_BASE}/packing`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destination, interests }),
    });
    return await res.json();
  } catch (error) { return {}; }
};