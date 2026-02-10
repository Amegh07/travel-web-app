import Amadeus from "amadeus";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// --- 1. SETUP ENVIRONMENT ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log("\n🔍 --- DEBUGGING HOTEL KEYS ---");

// Check if keys exist
const CLIENT_ID = process.env.AMA_ID_2;
const CLIENT_SECRET = process.env.AMA_SEC_2;

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("❌ MISSING KEYS: Please check AMA_ID_2 and AMA_SEC_2 in server/.env");
    process.exit(1);
}

// --- 2. INITIALIZE AMADEUS ---
const amadeus = new Amadeus({
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET
});

// --- 3. TEST HOTEL SEARCH ---
async function testHotelConnection() {
  console.log("📡 Connecting to Amadeus Hotel API...");
  
  try {
    // Search for hotels in Paris (PAR)
    const response = await amadeus.referenceData.locations.hotels.byCity.get({
      cityCode: 'PAR',
      radius: 5,
      radiusUnit: 'KM'
    });

    console.log("\n✅ SUCCESS! Hotel API is working.");
    console.log("------------------------------------------------");
    console.log(`🏨 Found ${response.data.length} hotels in Paris.`);
    console.log(`example: ${response.data[0].name}`);
    console.log("------------------------------------------------");

  } catch (error) {
    console.error("\n❌ HOTEL API FAILED.");
    console.error("------------------------------------------------");
    if (error.response) {
        console.error("⚠️ Status:", error.response.statusCode);
        console.error("⚠️ Code:", error.response.result?.errors?.[0]?.code);
        console.error("⚠️ Detail:", error.response.result?.errors?.[0]?.detail);
    } else {
        console.error("⚠️ Error:", error.message);
    }
    console.error("------------------------------------------------");
  }
}

testHotelConnection();