const CLIENT_ID = import.meta.env.VITE_AMADEUS_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_AMADEUS_CLIENT_SECRET;

let accessToken = "";

// 1. Authenticate
const getAccessToken = async () => {
  if (accessToken) return accessToken;

  const response = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=client_credentials&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`,
  });

  const data = await response.json();
  accessToken = data.access_token;
  return accessToken;
};

// 2. Search Flights
export const searchFlights = async (origin, destination, departureDate, returnDate) => {
  const token = await getAccessToken();
  let url = `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${origin}&destinationLocationCode=${destination}&departureDate=${departureDate}&adults=1&max=5&currencyCode=INR`;
  if (returnDate) url += `&returnDate=${returnDate}`;

  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json();
  return data.data || [];
};

// 3. Search Hotels
export const searchHotels = async (cityCode) => {
  const token = await getAccessToken();
  const response = await fetch(
    `https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=${cityCode}&radius=10&radiusUnit=KM&hotelSource=ALL`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();
  return data.data ? data.data.slice(0, 6) : [];
};

// 4. Search Attractions
export const searchAttractions = async (lat, long) => {
  const token = await getAccessToken();
  const response = await fetch(
    `https://test.api.amadeus.com/v1/shopping/activities?latitude=${lat}&longitude=${long}&radius=20`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();
  return data.data || [];
};

// 5. Autocomplete
export const searchCities = async (keyword) => {
  if (!keyword || keyword.length < 2) return [];
  const token = await getAccessToken();
  const response = await fetch(
    `https://test.api.amadeus.com/v1/reference-data/locations?subType=CITY,AIRPORT&keyword=${keyword}&page[limit]=10&view=LIGHT`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();
  return (data.data || []).map(place => ({
    name: place.name,
    code: place.iataCode,
    city: place.address?.cityName || place.name,
    country: place.address?.countryName || ""
  }));
};

// 6. GET CITY DETAILS (This is the missing function causing errors!)
export const getCityDetails = async (cityCode) => {
  const token = await getAccessToken();
  const response = await fetch(
    `https://test.api.amadeus.com/v1/reference-data/locations?subType=CITY&keyword=${cityCode}&page[limit]=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();
  const location = data.data?.[0];

  if (location) {
    return {
      name: location.address.cityName,
      lat: location.geoCode.latitude,
      lng: location.geoCode.longitude
    };
  }
  return null;
};