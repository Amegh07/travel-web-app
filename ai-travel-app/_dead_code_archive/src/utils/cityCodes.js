// A simple dictionary for common cities
const cityDatabase = {
  "paris": "PAR",
  "london": "LON",
  "new york": "NYC",
  "dubai": "DXB",
  "delhi": "DEL",
  "new delhi": "DEL",
  "mumbai": "BOM",
  "bangalore": "BLR",
  "singapore": "SIN",
  "tokyo": "TYO",
  "bangkok": "BKK",
  "los angeles": "LAX",
  "san francisco": "SFO",
  "sydney": "SYD",
  "melbourne": "MEL",
  "toronto": "YTO",
  "vancouver": "YVR",
  "barcelona": "BCN",
  "madrid": "MAD",
  "rome": "ROM",
  "milan": "MIL",
  "amsterdam": "AMS",
  "berlin": "BER",
  "munich": "MUC",
  "istanbul": "IST",
  "hong kong": "HKG",
  "kuala lumpur": "KUL",
  "seoul": "SEL",
  "kochi": "COK",
  "chennai": "MAA",
  "hyderabad": "HYD",
  "goa": "GOI"
};

export const getCityCode = (cityName) => {
  if (!cityName) return "";
  
  // 1. If it's already a 3-letter code (like "DEL"), just uppercase it
  if (cityName.length === 3) return cityName.toUpperCase();

  // 2. Try to find the name in our database
  const normalized = cityName.toLowerCase().trim();
  return cityDatabase[normalized] || cityName.toUpperCase();
};