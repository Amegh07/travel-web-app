const CLIENT_ID = import.meta.env.VITE_AMADEUS_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_AMADEUS_CLIENT_SECRET;

let token = null;
let tokenExpiry = 0;

const getAmadeusToken = async () => {
  if (token && Date.now() < tokenExpiry) return token;
  try {
    const response = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=client_credentials&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`,
    });
    const data = await response.json();
    if (!data.access_token) return null;
    token = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000);
    return token;
  } catch (error) {
    console.error("Auth Error:", error);
    return null;
  }
};

// --- CITY SEARCH ---
export const searchCities = async (keyword) => {
  if (!keyword || keyword.length < 2) return [];
  try {
    const authToken = await getAmadeusToken();
    if (!authToken) return [];

    const response = await fetch(
      `https://test.api.amadeus.com/v1/reference-data/locations?subType=CITY,AIRPORT&keyword=${keyword}&page[limit]=10`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return (data.data || []).map(place => ({
      name: place.name,
      iataCode: place.iataCode,
      geoCode: place.geoCode, 
      city: place.address?.cityName || place.name,
      country: place.address?.countryName || "" 
    }));
  } catch (error) {
    return [];
  }
};

// --- RESOLVER ---
const SAFETY_AIRPORT_MAP = {
  "LON": "LHR", "NYC": "JFK", "PAR": "CDG", "TYO": "HND",
  "BKK": "BKK", "IST": "IST", "DXB": "DXB", "BOM": "BOM",
  "DEL": "DEL", "BLR": "BLR", "SYD": "SYD", "COK": "COK"
};

const resolveLocationDetails = async (input, authToken) => {
  let code = "XXX";
  const match = input.match(/\(([A-Z]{3})\)/);
  if (match) code = match[1];
  else if (/^[A-Z]{3}$/.test(input)) code = input;

  let geoCode = null;
  try {
    // Attempt API lookup to get coordinates
    const response = await fetch(
      `https://test.api.amadeus.com/v1/reference-data/locations?subType=CITY,AIRPORT&keyword=${code}&page[limit]=1`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    if (response.ok) {
        const data = await response.json();
        const loc = data.data?.[0];
        if (loc) {
            code = loc.iataCode;
            geoCode = loc.geoCode;
        }
    }
  } catch (e) { /* ignore */ }

  const finalCode = SAFETY_AIRPORT_MAP[code] || code;
  return { code: finalCode, geoCode };
};

// --- FLIGHT SEARCH (Now Supports Return Date) ---
export const fetchFlights = async (fromCity, toCity, date, returnDate = null) => {
  try {
    const authToken = await getAmadeusToken();
    if (!authToken) return [];
    
    const origin = await resolveLocationDetails(fromCity, authToken);
    const dest = await resolveLocationDetails(toCity, authToken);
    
    if (origin.code === "XXX" || dest.code === "XXX") return [];

    console.log(`✈️ Searching: ${origin.code} -> ${dest.code} (Return: ${returnDate})`);

    let url = `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${origin.code}&destinationLocationCode=${dest.code}&departureDate=${date}&adults=1&max=5`;
    
    // Add return date if provided
    if (returnDate) {
        url += `&returnDate=${returnDate}`;
    }

    const response = await fetch(url, { headers: { Authorization: `Bearer ${authToken}` } });

    if (!response.ok) {
        console.warn(`Flight API Error: ${response.status}`);
        return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    return [];
  }
};

// --- HOTEL SEARCH ---
export const fetchHotels = async (cityInput) => {
    try {
        const authToken = await getAmadeusToken();
        if (!authToken) return [];
        
        const location = await resolveLocationDetails(cityInput, authToken);
        
        if (location.geoCode) {
            const response = await fetch(
                `https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-geocode?latitude=${location.geoCode.latitude}&longitude=${location.geoCode.longitude}&radius=10&radiusUnit=KM&hotelSource=ALL`,
                { headers: { Authorization: `Bearer ${authToken}` } }
            );
            if (response.ok) {
                const data = await response.json();
                if (data.data && data.data.length > 0) return mapHotelData(data.data);
            }
        }
        
        // Fallback to city code
        if (location.code !== "XXX") {
            const response = await fetch(
                `https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=${location.code}&radius=5&radiusUnit=KM&hotelSource=ALL`,
                { headers: { Authorization: `Bearer ${authToken}` } }
            );
            if (response.ok) {
                const data = await response.json();
                return mapHotelData(data.data || []);
            }
        }
        return [];
    } catch (error) {
        return [];
    }
};

const mapHotelData = (hotels) => {
    return hotels.slice(0, 6).map((hotel) => ({
        id: hotel.hotelId,
        name: hotel.name,
        image: `https://placehold.co/600x400?text=${encodeURIComponent(hotel.name)}`,
        rating: "4.0", 
        price: "View Rates", 
        currency: "",
        amenities: ["WiFi", "AC", "24h Front Desk"]
    }));
};