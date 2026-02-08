/* src/services/api.js */

// Use environment variable or default to localhost
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

// 1. CITY SEARCH
export const searchCities = async (keyword) => {
  if (!keyword || keyword.length < 2) return [];
  try {
    const res = await fetch(`${API_BASE}/city-search?keyword=${encodeURIComponent(keyword)}`);
    if (!res.ok) throw new Error("City search failed");
    return await res.json();
  } catch (error) {
    console.error("City Search Error:", error);
    return [];
  }
};

// 2. ITINERARY GENERATION
export const generateItinerary = async (tripData) => {
  try {
    const res = await fetch(`${API_BASE}/itinerary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destination: tripData.destination,
        days: tripData.days || 3,
        budget: tripData.budget,
        interests: tripData.interests || [],
        customInterest: tripData.customPrompt || ""
      }),
    });

    if (!res.ok) throw new Error("Itinerary generation failed");
    return await res.json();
  } catch (error) {
    console.error("Itinerary Error:", error);
    return []; 
  }
};

// 3. CHAT BOT
export const chatWithAI = async (message, context = []) => {
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, context }),
      });
  
      if (!res.ok) throw new Error("Chat failed");
      const data = await res.json();
      return data.reply;
    } catch (error) {
      console.error("Chat Error:", error);
      return "I'm having trouble connecting to the server right now.";
    }
  };

// 4. FLIGHT SEARCH
export const searchFlights = async (searchParams) => {
  try {
    const query = new URLSearchParams({
      origin: searchParams.origin,
      destination: searchParams.destination,
      date: searchParams.date
    }).toString();

    const res = await fetch(`${API_BASE}/flights?${query}`);
    if (!res.ok) throw new Error("Flight search failed");
    return await res.json();
  } catch (error) {
    console.error("Flight Search Error:", error);
    return [];
  }
};

// 5. PACKING LIST
export const getPackingList = async (destination, interests) => {
  try {
    const res = await fetch(`${API_BASE}/packing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destination, interests }),
    });
    if (!res.ok) return {};
    return await res.json();
  } catch (error) {
    console.error("Packing List Error:", error);
    return {};
  }
};

// 6. HOTELS
export const fetchHotels = async (city) => {
    try {
        const res = await fetch(`${API_BASE}/hotels?cityCode=${encodeURIComponent(city)}`);
        if (!res.ok) throw new Error("Hotel search failed");
        return await res.json();
    } catch (error) {
        console.error("Hotel Search Error:", error);
        return [];
    }
}