// ai-travel-app/src/services/amadeusAPI.js
import { apiCache } from '../utils/apiCache';

const CLIENT_ID = import.meta.env.VITE_AMADEUS_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_AMADEUS_CLIENT_SECRET;

let token = null;
let tokenExpiry = 0;
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 200; // 200ms between requests

// Rate limiter
const rateLimiter = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
};

const getAmadeusToken = async () => {
  if (token && Date.now() < tokenExpiry) return token;
  
  try {
    await rateLimiter();
    const response = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=client_credentials&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`,
    });
    
    if (!response.ok) throw new Error(`Token error: ${response.status}`);
    
    const data = await response.json();
    if (!data.access_token) throw new Error("No access token");
    
    token = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000);
    return token;
  } catch (error) {
    console.error("Auth Error:", error);
    return null;
  }
};

// City code mapping for common cities
const CITY_CODE_MAP = {
  "paris": "CDG", "london": "LHR", "new york": "JFK", "dubai": "DXB",
  "delhi": "DEL", "mumbai": "BOM", "bangalore": "BLR", "singapore": "SIN",
  "tokyo": "HND", "bangkok": "BKK", "sydney": "SYD", "los angeles": "LAX",
  "san francisco": "SFO", "toronto": "YYZ", "vancouver": "YVR",
  "barcelona": "BCN", "madrid": "MAD", "rome": "FCO", "milan": "MXP",
  "amsterdam": "AMS", "berlin": "BER", "munich": "MUC", "istanbul": "IST",
  "hong kong": "HKG", "kuala lumpur": "KUL", "seoul": "ICN",
  "kochi": "COK", "chennai": "MAA", "hyderabad": "HYD", "goa": "GOI"
};

const getCityCode = (input) => {
  if (!input) return null;
  
  // Extract IATA code if present: "Paris (CDG)" -> "CDG"
  const match = input.match(/\(([A-Z]{3})\)/);
  if (match) return match[1];
  
  // Direct 3-letter code
  if (/^[A-Z]{3}$/.test(input)) return input;
  
  // Check city name map
  const normalized = input.toLowerCase().trim();
  return CITY_CODE_MAP[normalized] || null;
};

export const searchCities = async (keyword) => {
  if (!keyword || keyword.length < 2) return [];
  
  // Check cache first
  const cached = apiCache.get('searchCities', { keyword });
  if (cached) return cached;

  try {
    const authToken = await getAmadeusToken();
    if (!authToken) return [];

    await rateLimiter();
    const response = await fetch(
      `https://test.api.amadeus.com/v1/reference-data/locations?subType=CITY,AIRPORT&keyword=${encodeURIComponent(keyword)}&page[limit]=5`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    if (response.status === 429) {
      console.warn("Rate limited - using local mapping");
      const code = getCityCode(keyword);
      return code ? [{ name: keyword, iataCode: code, country: "" }] : [];
    }
    
    if (!response.ok) throw new Error(`Search error: ${response.status}`);
    
    const data = await response.json();
    const results = (data.data || []).map(place => ({
      name: place.name,
      iataCode: place.iataCode,
      geoCode: place.geoCode,
      city: place.address?.cityName || place.name,
      country: place.address?.countryName || ""
    }));
    
    // Cache results
    apiCache.set('searchCities', { keyword }, results);
    return results;
    
  } catch (error) {
    console.error("Search Cities Error:", error);
    // Fallback to local mapping
    const code = getCityCode(keyword);
    return code ? [{ name: keyword, iataCode: code, country: "" }] : [];
  }
};

export const fetchFlights = async (fromCity, toCity, date, returnDate = null) => {
  // Get codes from cache or mapping
  const fromCode = getCityCode(fromCity) || fromCity;
  const toCode = getCityCode(toCity) || toCity;
  
  if (!fromCode || !toCode) {
    console.error("Invalid city codes:", fromCity, toCity);
    return [];
  }

  // Check cache
  const cacheKey = { fromCode, toCode, date, returnDate };
  const cached = apiCache.get('flights', cacheKey);
  if (cached) return cached;

  try {
    const authToken = await getAmadeusToken();
    if (!authToken) return [];

    let url = `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${fromCode}&destinationLocationCode=${toCode}&departureDate=${date}&adults=1&max=10&currencyCode=USD`;
    
    if (returnDate) {
      url += `&returnDate=${returnDate}`;
    }

    await rateLimiter();
    const response = await fetch(url, { 
      headers: { Authorization: `Bearer ${authToken}` } 
    });

    if (response.status === 429) {
      console.warn("Rate limited - please wait");
      return [];
    }

    if (!response.ok) {
      console.warn(`Flight API Error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const flights = data.data || [];
    
    // Cache results
    apiCache.set('flights', cacheKey, flights);
    return flights;
    
  } catch (error) {
    console.error("Fetch Flights Error:", error);
    return [];
  }
};

export const fetchHotels = async (cityInput) => {
  const cityCode = getCityCode(cityInput) || cityInput;
  
  if (!cityCode || cityCode.length !== 3) {
    console.error("Invalid city code for hotels:", cityInput);
    return [];
  }

  // Check cache
  const cached = apiCache.get('hotels', { cityCode });
  if (cached) return cached;

  try {
    const authToken = await getAmadeusToken();
    if (!authToken) return [];

    // Use city code search (more reliable than geocode)
    await rateLimiter();
    const response = await fetch(
      `https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=${cityCode}&radius=10&radiusUnit=KM&hotelSource=ALL`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    if (response.status === 429) {
      console.warn("Rate limited - please wait");
      return [];
    }

    if (!response.ok) {
      console.warn(`Hotel API Error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const hotels = (data.data || []).slice(0, 6).map(hotel => ({
      id: hotel.hotelId,
      name: hotel.name,
      image: `https://source.unsplash.com/600x400/?hotel,${encodeURIComponent(hotel.name.split(' ')[0])}`,
      rating: (Math.random() * 2 + 3).toFixed(1), // Real ratings not in API
      price: "Check Rates",
      currency: "USD",
      amenities: ["WiFi", "AC", "24h Front Desk"]
    }));
    
    // Cache results
    apiCache.set('hotels', { cityCode }, hotels);
    return hotels;
    
  } catch (error) {
    console.error("Fetch Hotels Error:", error);
    return [];
  }
};