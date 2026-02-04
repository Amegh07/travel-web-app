/* -------------------------------------------------------------------------- */
/* src/services/geminiAPI.js (Fixed: Calls Backend to avoid CORS)             */
/* -------------------------------------------------------------------------- */

export const generateItinerary = async (destination, days, budget, interests) => {
  try {
    const response = await fetch('http://localhost:5000/api/itinerary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        destination, 
        startDate: new Date().toISOString(), 
        endDate: new Date(Date.now() + days * 86400000).toISOString(),
        budget, 
        interests 
      })
    });

    if (!response.ok) throw new Error("Backend failed to generate itinerary");
    return await response.json();
  } catch (error) {
    console.error("Itinerary Error:", error);
    // Return empty array fallback to prevent crash
    return [];
  }
};

export const generatePackingList = async (destination, days, interests) => {
  try {
    const response = await fetch('http://localhost:5000/api/packing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination, days, interests })
    });

    if (!response.ok) throw new Error("Backend failed to generate packing list");
    return await response.json();
  } catch (error) {
    console.error("Packing List Error:", error);
    // Return safe fallback object
    return {
      "Essentials": ["Passport", "ID", "Tickets"],
      "Clothes": ["Standard Outfit"],
      "Tech": ["Phone", "Charger"]
    };
  }
};