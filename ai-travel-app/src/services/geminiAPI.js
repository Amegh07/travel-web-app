// ai-travel-app/src/services/geminiAPI.js

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "mixtral-8x7b-32768"; // Very fast, high quality

// Helper: Call Groq API
async function callGroq(prompt) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  
  if (!apiKey) {
    console.error("Missing VITE_GROQ_API_KEY in .env");
    throw new Error("API Key missing");
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: "You are a helpful travel assistant. Output strictly valid JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 2048
      })
    });

    if (!response.ok) {
        // Handle 429 (Rate Limit) or other errors
        if (response.status === 429) throw new Error("Rate Limited");
        throw new Error(`Groq API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
    
  } catch (error) {
    console.error("AI Call Failed:", error);
    throw error;
  }
}

// --- 1. TRANSPORT OPTIONS ---
export async function getTransportOptions(origin, destination) {
  const prompt = `
    I am traveling from ${origin} to ${destination}.
    Analyze the best ways to travel (Flight, Train, Bus, Car).
    Return a JSON array with 3 options.
    Format:
    [
      {
        "mode": "Train",
        "title": "High Speed Rail",
        "duration": "2h 30m",
        "cost": "$50",
        "recommended": true
      },
      {
        "mode": "Bus",
        "title": "Express Bus",
        "duration": "5h",
        "cost": "$20",
        "recommended": false
      }
    ]
    Return ONLY valid JSON. No markdown formatting.
  `;

  try {
    const text = await callGroq(prompt);
    return parseJSON(text) || [];
  } catch (e) {
    // Fallback if AI fails
    return [
      { mode: "Flight", title: "Check Availability", duration: "Varies", cost: "See below", recommended: true },
      { mode: "Car", title: "Drive", duration: "Check Maps", cost: "Fuel cost" }
    ];
  }
}

// --- 2. ITINERARY GENERATOR ---
export async function generateItinerary(destination, duration, budget, interests) {
  const safeDuration = parseInt(duration) || 3;
  
  const prompt = `
    Create a ${safeDuration}-day travel itinerary for ${destination}.
    Budget: ${budget}. Interests: ${interests}.
    
    Return ONLY a valid JSON array in this format:
    [
      { 
        "day": 1, 
        "theme": "Arrival & City Highlights", 
        "activities": ["Activity 1", "Activity 2", "Activity 3"] 
      },
      { 
        "day": 2, 
        "theme": "Culture & History", 
        "activities": ["Activity A", "Activity B"] 
      }
    ]
    Do not wrap in markdown code blocks. Just raw JSON.
  `;

  try {
    const text = await callGroq(prompt);
    const data = parseJSON(text);
    
    if (Array.isArray(data) && data.length > 0) return data;
    throw new Error("Invalid format");
    
  } catch (e) {
    console.warn("AI Itinerary failed, using fallback");
    return generateFallbackItinerary(destination, safeDuration);
  }
}

// --- HELPERS ---

// Robust JSON parser to handle AI output quirks
function parseJSON(text) {
  try {
    // Remove markdown code blocks if present (```json ... ```)
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    return null;
  }
}

function generateFallbackItinerary(destination, duration) {
  return Array.from({ length: duration }, (_, i) => ({
    day: i + 1,
    theme: `Explore ${destination}`,
    activities: [
      `Visit top landmarks in ${destination}`,
      `Enjoy local cuisine for lunch`,
      `Evening walk in the city center`
    ]
  }));
}