/* src/services/api.js */

const API_BASE = "http://localhost:5000/api";

// 1. CITY SEARCH (Amadeus)
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

// 2. ITINERARY GENERATION (Hybrid AI)
export const generateItinerary = async (tripData) => {
  try {
    const res = await fetch(`${API_BASE}/itinerary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destination: tripData.destination,
        interests: tripData.interests || [],
        customInterest: tripData.customPrompt || "" // Matches backend "customInterest"
      }),
    });

    if (!res.ok) throw new Error("Itinerary generation failed");
    return await res.json();
  } catch (error) {
    console.error("Itinerary Error:", error);
    // Return empty structure to prevent frontend crash
    return []; 
  }
};

// 3. FLIGHT SEARCH (Amadeus)
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

// 4. PACKING LIST (Hybrid AI)
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

// 5. DESTINATION IMAGE (Unsplash)
export const getDestinationImage = async (city) => {
  try {
    const res = await fetch(`${API_BASE}/destination-image?query=${encodeURIComponent(city)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.url;
  } catch (error) {
    console.error("Image Fetch Error:", error);
    return null;
  }
};