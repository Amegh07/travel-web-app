import Amadeus from "amadeus";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// --- 1. ROBUST ENV LOADING ---
// This ensures we find the .env file even if you run the script from the wrong folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log("\n🔍 --- DEBUGGING ENVIRONMENT ---");
console.log("📂 Script Location:", __dirname);
console.log("📄 Looking for .env at:", path.resolve(__dirname, '.env'));

// Check if keys are actually loaded
const CLIENT_ID = process.env.AMA_ID_1;
const CLIENT_SECRET = process.env.AMA_SEC_1;

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("\n❌ CRITICAL ERROR: API Keys are missing!");
    console.error("👉 Please check 'server/.env' and make sure AMA_ID_1 and AMA_SEC_1 are set.");
    console.error("Current Value of AMA_ID_1:", CLIENT_ID);
    process.exit(1); // Stop the script here
} else {
    console.log("✅ API Keys successfully loaded.");
}

// --- 2. INITIALIZE AMADEUS ---
const amadeus = new Amadeus({
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET
});

// --- 3. TEST CONNECTION ---
async function testConnection() {
  console.log("\n📡 --- TESTING AMADEUS API ---");
  try {
    const response = await amadeus.referenceData.locations.get({
      keyword: 'LON',
      subType: 'CITY'
    });

    console.log("✅ CONNECTION SUCCESSFUL!");
    console.log("------------------------------------------------");
    console.log("🌍 Test City Found:", response.data[0].name);
    console.log("📍 IATA Code:", response.data[0].iataCode);
    console.log("------------------------------------------------");

  } catch (error) {
    console.error("\n❌ CONNECTION FAILED.");
    console.error("------------------------------------------------");
    if (error.response) {
        console.error("⚠️  API Error Code:", error.response.statusCode);
        console.error("⚠️  Error Details:", error.response.result.errors[0].detail);
    } else {
        console.error("⚠️  System Error:", error.message);
    }
    console.error("------------------------------------------------");
  }
}

testConnection();