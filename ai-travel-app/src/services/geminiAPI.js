import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// 1. UPDATED 2026 MODEL LIST
// We removed '1.5-flash' because it is retired/offline.
const MODEL_CANDIDATES = [
  "gemini-2.5-flash",       // Current Stable Standard (Best for 2026)
  "gemini-3-flash",         // Newest Fast Model
  "gemini-pro"              // Universal Fallback
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
      cleanText = cleanText.substring(start);
    }
    return JSON.parse(cleanText);
  } catch (error) {
    // We log 'error' so ESLint doesn't complain about unused variables
    console.error("JSON Parsing Failed:", error);
    return null; 
  }
};

// 2. CHATBOT FUNCTION
export const chatWithGemini = async (message, history = []) => {
  if (!API_KEY) return "⚠️ API Key missing. Check .env file.";
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
      console.warn(`Model ${modelName} failed:`, error.message);
      continue;
    }
  }
  return "❌ I'm having trouble connecting. Please check your internet connection.";
};

// 3. ITINERARY GENERATOR
export const generateItinerary = async (city, days, budget, interests) => {
  if (!API_KEY) return [];
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
      console.warn(`Itinerary generation failed on ${modelName}:`, error.message);
      continue; 
    }
  }
  return []; 
};

// 4. PACKING LIST GENERATOR
export const generatePackingList = async (city, days, interests) => {
  const fallback = { "Essentials": ["Passport", "Wallet"], "Clothing": ["T-shirt"] };
  if (!API_KEY) return fallback;
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
      console.warn(`Packing list generation failed on ${modelName}:`, error.message);
      continue; 
    }
  }
  return fallback;
};