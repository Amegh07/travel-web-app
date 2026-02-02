export const getWeather = async (city) => {
  try {
    // 1. First, we need coordinates (Lat/Lon) for the city
    // We use a free geocoding API for this
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1&language=en&format=json`
    );
    const geoData = await geoRes.json();

    if (!geoData.results) throw new Error("City not found");

    const { latitude, longitude, name } = geoData.results[0];

    // 2. Now fetch the actual weather
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
    );
    const weatherData = await weatherRes.json();

    return {
      temp: weatherData.current_weather.temperature, // e.g., 24
      condition: decodeWeatherCode(weatherData.current_weather.weathercode), // e.g., "Rain"
      city: name
    };
  } catch (error) {
    console.error("Weather Error:", error);
    return null;
  }
};

// Helper: Open-Meteo uses codes (0, 1, 2, etc.) instead of text.
// This translates them into human-readable text.
function decodeWeatherCode(code) {
  const codes = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Fog",
    51: "Drizzle",
    61: "Rain",
    71: "Snow",
    95: "Thunderstorm"
  };
  return codes[code] || "Unknown";
}