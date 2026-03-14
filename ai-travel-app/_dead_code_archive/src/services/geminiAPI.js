 
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. CONFIGURATION
// Read keys from window.ENV (safest method)
const GROQ_KEY = window.ENV?.GROQ_API_KEY || "";
const GEMINI_KEY = window.ENV?.GEMINI_API_KEY || "";

const TEXT_MODEL = "llama3-70b-8192";
const BACKUP_MODEL = "gemini-2.5-flash"; 

// 2. INITIALIZE CLIENTS
const groq = new Groq({ apiKey: GROQ_KEY, dangerouslyAllowBrowser: true });
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

// 3. MAIN ROUTER
export const generateItinerary = async (tripData, imageFile = null) => {
  console.log("🚀 Router Started");

  // Check for valid image file
  const validImage = (imageFile instanceof File || imageFile instanceof Blob) ? imageFile : null;

  try {
    // A. VISION -> GEMINI
    if (validImage) {
       console.log("📸 Image detected. Using Gemini Vision...");
       return await callGeminiVision(tripData, validImage);
    }

    // B. TEXT -> GROQ
    console.log(`⚡ Text Request. Using Groq (${TEXT_MODEL})...`);
    return await callGroqText(tripData);

  } catch (primaryError) {
    console.error("❌ Groq Failed. Switching to Backup...", primaryError);
    // C. BACKUP -> GEMINI
    return await callGeminiText(tripData);
  }
};

// --- WORKER FUNCTIONS ---

async function callGroqText(tripData) {
  const completion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: "Return strict JSON only." },
      { role: "user", content: `Create a trip to ${tripData.destination} for ${tripData.dates}. Budget: ${tripData.budget}` }
    ],
    model: TEXT_MODEL,
    response_format: { type: "json_object" }
  });
  return JSON.parse(completion.choices[0].message.content);
}

async function callGeminiText(tripData) {
  const model = genAI.getGenerativeModel({ model: BACKUP_MODEL });
  const prompt = `Create a JSON itinerary for ${tripData.destination}. Return ONLY valid JSON.`;
  const result = await model.generateContent(prompt);
  const text = result.response.text().replace(/```json|```/g, "").trim();
  return JSON.parse(text);
}

async function callGeminiVision(tripData, file) {
  const model = genAI.getGenerativeModel({ model: BACKUP_MODEL });
  const imagePart = await fileToGenerativePart(file);
  const prompt = `Plan a trip to ${tripData.destination} based on this image. Return valid JSON.`;
  const result = await model.generateContent([prompt, imagePart]);
  const text = result.response.text().replace(/```json|```/g, "").trim();
  return JSON.parse(text);
}

async function fileToGenerativePart(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve({
      inlineData: { data: reader.result.split(',')[1], mimeType: file.type }
    });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}