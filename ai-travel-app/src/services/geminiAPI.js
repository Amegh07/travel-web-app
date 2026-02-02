import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// 1. UPDATED 2026 MODEL LIST
// Using models that are definitely available and stable
const MODEL_CANDIDATES = [
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-1.0-pro"
];

// 🔧 HELPER: Defined at the top to prevent "ReferenceError"
const cleanAndParseJSON = (text) => {
  try {
    // Remove markdown code blocks (```json ... ```)
    let cleanText = text.replace(/```json|```/g, "").trim();
    // Find the first '[' or '{'
    const firstBracket = cleanText.indexOf('[');
    const firstBrace = cleanText.indexOf('{');
    const start = (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) 
      ? firstBracket 
      : firstBrace;
    
    if (start !== -1) {
      const endChar = start === firstBracket ? ']' : '}';
      const end = cleanText.lastIndexOf(endChar);
      if (end !== -1) cleanText = cleanText.substring(start, end + 1);
      else cleanText = cleanText.substring(start);
    }
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("JSON Parsing Failed:", error);
    return null; 
  }
};

// 2. CHATBOT FUNCTION
export const chatWithGemini = async (message, history = []) => {
  if (!API_KEY) {
    return "Hi! I'm your AI travel assistant. Ask me anything about your trip!";
  }
  const genAI = new GoogleGenerativeAI(API_KEY);

  let chatHistory = history.map((msg) => ({
    role: msg.sender === "user" ? "user" : "model",
    parts: [{ text: msg.text }],
  }));
  
  // Fix History: Ensure User starts conversation
  if (chatHistory.length > 0 && chatHistory[0].role === "model") chatHistory.shift();

  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const chat = model.startChat({ history: chatHistory });
      const result = await chat.sendMessage(message);
      return await result.response.text(); 
    } catch (error) {
      continue;
    }
  }
  return "Sorry, I'm having trouble connecting. Please check your internet connection.";
};

// 3. ITINERARY GENERATOR
export const generateItinerary = async (city, days, budget, interests) => {
  try {
    // Skip API if key is missing or too short (invalid)
    if (!API_KEY || API_KEY.length < 10) {
      console.warn("Gemini API Key missing or invalid. Using fallback.");
      return generateSampleItinerary(city, days);
    }
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    const prompt = `
      Create a ${days}-day travel itinerary for ${city}.
      Traveler type: ${budget}, Interests: ${interests}.
      Strictly return ONLY a JSON Array.
      Format example:
      [
        { "day": 1, "theme": "City Center", "activities": ["Visit Museum", "Lunch at Cafe"] }
      ]
    `;

    for (const modelName of MODEL_CANDIDATES) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const data = cleanAndParseJSON(result.response.text());
        
        if (data && Array.isArray(data)) return data; 
      } catch (error) {
        console.error(`Itinerary generation failed on ${modelName}:`, error);
        continue; 
      }
    }
    throw new Error("All models failed");
  } catch (error) {
    console.error("Gemini API Error (Itinerary):", error);
    return generateSampleItinerary(city, days);
  }
};

// Helper function for sample itinerary
const generateSampleItinerary = (city, days) => {
  const itinerary = [];
  const themes = ["City Exploration", "Local Culture", "Food & Dining", "Nature & Parks", "Shopping & Markets", "Evening Entertainment"];
  const activities = {
    "City Exploration": ["Visit main attractions", "Walk through historic district", "Take city tour"],
    "Local Culture": ["Visit museums", "Explore local galleries", "Attend cultural show"],
    "Food & Dining": ["Try local cuisine", "Visit food markets", "Restaurant hopping"],
    "Nature & Parks": ["Hiking", "Park visit", "Outdoor activities"],
    "Shopping & Markets": ["Visit markets", "Shopping district", "Local shops"],
    "Evening Entertainment": ["Dining experience", "Live music", "Night entertainment"]
  };
  
  for (let i = 1; i <= Math.min(days, 7); i++) {
    const theme = themes[(i - 1) % themes.length];
    itinerary.push({
      day: i,
      theme: `${theme} - Day ${i}`,
      activities: activities[theme] || ["Explore and enjoy the city", "Rest and relax"]
    });
  }
  itinerary._isMock = true;
  return itinerary;
};

// 4. PACKING LIST GENERATOR
export const generatePackingList = async (city, days, interests) => {
  try {
    // Skip API if key is missing or too short (invalid)
    if (!API_KEY || API_KEY.length < 10) {
      return generateSamplePackingList();
    }
    const genAI = new GoogleGenerativeAI(API_KEY);

    const prompt = `
      Generate a packing list for ${city}, ${days} days, ${interests}.
      Strictly return ONLY a JSON Object.
      Format example: { "Essentials": ["Item 1"], "Clothing": ["Item 2"] }
    `;

    for (const modelName of MODEL_CANDIDATES) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const data = cleanAndParseJSON(result.response.text());

        if (data && typeof data === 'object') return data;
      } catch (error) {
        console.error(`Packing list generation failed on ${modelName}:`, error);
        continue; 
      }
    }
    throw new Error("All models failed");
  } catch (error) {
    console.error("Gemini API Error (Packing List):", error);
    return generateSamplePackingList();
  }
};

// Helper function for sample packing list
const generateSamplePackingList = () => {
  const list = {
    "Essentials": ["Passport", "Visa/Travel documents", "Travel insurance", "Credit cards", "Cash", "Phone charger"],
    "Clothing": ["T-shirts", "Shorts", "Pants", "Light jacket", "Comfortable shoes", "Underwear", "Socks"],
    "Toiletries": ["Toothbrush", "Toothpaste", "Shampoo", "Deodorant", "Sunscreen", "Medications"],
    "Tech & Accessories": ["Phone", "Headphones", "Portable charger", "Travel adapter", "Camera"],
    "Documents": ["Hotel confirmations", "Flight tickets", "Travel itinerary", "Emergency contacts"]
  };
  list._isMock = true;
  return list;
};

// 5. HOTEL PROPOSALS GENERATOR
export const generateHotelProposals = async (city, budget, interests) => {
  // Skip API if key is missing or too short (invalid)
  if (!API_KEY || API_KEY.length < 10) {
    return generateSampleHotels();
  }
  const genAI = new GoogleGenerativeAI(API_KEY);

  const prompt = `
    Suggest 3 hotels in ${city} for a traveler with budget: ${budget} and interests: ${interests}.
    Strictly return ONLY a JSON Array.
    Each object must have:
    - id (unique string)
    - name (string)
    - rating (number 1-5)
    - price (string)
    - image (use "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80" as placeholder)
    - description (short string)
    - amenities (array of strings)
  `;

  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const data = cleanAndParseJSON(result.response.text());

      if (data && Array.isArray(data)) return data;
    } catch (error) {
      console.error(`Hotel generation failed on ${modelName}:`, error);
      continue;
    }
  }
  return generateSampleHotels();
};

// Helper function for sample hotels
const generateSampleHotels = () => {
  return [
    {
      id: "1",
      name: "Grand Plaza Hotel",
      rating: 4.5,
      price: "$150/night",
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
      description: "Luxury accommodation in the city center.",
      amenities: ["Free WiFi", "Pool", "Spa", "Gym"]
    },
    {
      id: "2",
      name: "City Comfort Inn",
      rating: 4.0,
      price: "$100/night",
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
      description: "Comfortable stay with easy access to transit.",
      amenities: ["Breakfast Included", "WiFi", "24h Front Desk"]
    },
    {
      id: "3",
      name: "Budget Backpackers",
      rating: 3.5,
      price: "$50/night",
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
      description: "Affordable and social atmosphere.",
      amenities: ["Shared Lounge", "Kitchen", "Lockers"]
    }
  ];
};