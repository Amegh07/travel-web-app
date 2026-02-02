const CLIENT_ID = import.meta.env.VITE_AMADEUS_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_AMADEUS_CLIENT_SECRET;

// --- 🕵️ API DIAGNOSTIC TOOL (Runs automatically on load) ---
(async function checkKeys() {
  console.group("🔑 API Key Diagnostic");
  
  // 1. Check if Variables Exist
  if (!CLIENT_ID) console.error("❌ MISSING: VITE_AMADEUS_CLIENT_ID is undefined. Check your .env file.");
  else console.log("✅ Client ID detected:", CLIENT_ID.substring(0, 4) + "...");

  if (!CLIENT_SECRET) console.error("❌ MISSING: VITE_AMADEUS_CLIENT_SECRET is undefined.");
  else console.log("✅ Client Secret detected.");

  // 2. Test Real Connection
  if (CLIENT_ID && CLIENT_SECRET) {
    try {
      console.log("🌐 Testing connection to Amadeus...");
      const response = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=client_credentials&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`,
      });

      if (response.ok) {
        console.log("✅ CONNECTION SUCCESS: API Token received!");
      } else {
        const err = await response.json();
        console.error("❌ CONNECTION FAILED:", response.status, err);
        if (response.status === 401) console.error("👉 ACTION REQUIRED: Your API Keys are invalid or expired.");
      }
    } catch (e) {
      console.error("❌ NETWORK ERROR: Could not reach Amadeus.", e);
    }
  }
  console.groupEnd();
})();
// --- END DIAGNOSTIC ---


let token = null;
let tokenExpiry = 0;

// --- 1. AUTHENTICATION ---
const getAmadeusToken = async () => {
  if (token && Date.now() < tokenExpiry) return token;

  try {
    const response = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=client_credentials&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`,
    });
    const data = await response.json();
    if (!data.access_token) throw new Error("No token returned");
    
    token = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000);
    return token;
  } catch (error) {
    console.error("Auth Error:", error);
    return null;
  }
};

// --- 2. CITY SEARCH (For Autocomplete) ---
export const searchCities = async (keyword) => {
  if (!keyword || keyword.length < 2) return [];
  
  try {
    const authToken = await getAmadeusToken();
    if (!authToken) return [];

    const response = await fetch(
      `https://test.api.amadeus.com/v1/reference-data/locations?subType=CITY&keyword=${keyword}&page[limit]=5`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return (data.data || []).map(city => ({
      name: city.name,
      iataCode: city.iataCode,
      address: { countryName: city.address?.countryName || "" }
    }));
  } catch (error) {
    console.warn("City Search Failed:", error);
    return [];
  }
};

// --- 3. HELPER: Smart Code Resolver (Fixes "New York" -> "NYC") ---
const resolveIataCode = async (input, authToken) => {
  if (!input) return "XXX";
  // If it's already a 3-letter code (like "JFK"), use it.
  if (input.length === 3) return input.toUpperCase();

  // Otherwise, search for the code
  try {
    const response = await fetch(
      `https://test.api.amadeus.com/v1/reference-data/locations?subType=CITY&keyword=${input}&page[limit]=1`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    const data = await response.json();
    // Return the first found IATA code, or fallback to first 3 letters
    return data.data?.[0]?.iataCode || input.substring(0, 3).toUpperCase();
  } catch (e) {
    return input.substring(0, 3).toUpperCase();
  }
};

// --- 4. FLIGHT SEARCH (With Smart Resolver) ---
export const fetchFlights = async (fromCity, toCity, date) => {
  try {
    const authToken = await getAmadeusToken();
    if (!authToken) throw new Error("No Auth Token");

    // Resolve inputs to valid IATA codes first
    const originCode = await resolveIataCode(fromCity, authToken);
    const destCode = await resolveIataCode(toCity, authToken);

    console.log(`✈️ Searching Flights: ${originCode} -> ${destCode}`); 

    const response = await fetch(
      `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${originCode}&destinationLocationCode=${destCode}&departureDate=${date}&adults=1&max=5`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const data = await response.json();
    return data.data || [];

  } catch (error) {
    console.warn("Flight Search Failed:", error);
    return []; 
  }
};

// --- 5. HOTEL SEARCH (With Smart Resolver) ---
export const fetchHotels = async (cityInput) => {
    try {
        const authToken = await getAmadeusToken();
        if (!authToken) throw new Error("No Auth Token");

        // Resolve input to valid IATA code first
        const cityCode = await resolveIataCode(cityInput, authToken);

        console.log(`🏨 Searching Hotels in: ${cityCode}`);

        const response = await fetch(
            `https://test.api.amadeus.com/v3/shopping/hotel-offers?cityCode=${cityCode}&adults=1&radius=20&radiusUnit=KM&view=FULL_ALL_IMAGES`,
            { headers: { Authorization: `Bearer ${authToken}` } }
        );

        if (!response.ok) return [];

        const data = await response.json();
        return (data.data || []).map((offer) => {
            const hotel = offer.hotel;
            const priceData = offer.offers?.[0]?.price;
            
            return {
                id: hotel.hotelId,
                name: hotel.name,
                // Fallback image logic if API doesn't provide one
                image: hotel.media?.[0]?.uri || `https://source.unsplash.com/featured/?hotel,${hotel.name}`,
                rating: hotel.rating || "4.0",
                price: priceData?.total || "N/A",
                currency: priceData?.currency || "USD",
                amenities: hotel.amenities ? hotel.amenities.slice(0, 3) : ["Standard Room"]
            };
        });

    } catch (error) {
        console.error("Hotel Search Failed:", error);
        return [];
    }
};