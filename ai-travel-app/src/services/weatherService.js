export const getWeather = async (cityInput) => {
  try {
    if (!cityInput) return null;

    // 1. CLEAN THE INPUT: "London (LON)" -> "London"
    // This fixes the "City not found" error
    const cleanCity = cityInput.split('(')[0].trim();

    // 2. Geocoding
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${cleanCity}&count=1&language=en&format=json`
    );
    const geoData = await geoRes.json();

    if (!geoData.results) throw new Error("City not found");

    const { latitude, longitude, name } = geoData.results[0];

    // 3. Fetch Weather
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
    );
    const weatherData = await weatherRes.json();

    return {
      temp: weatherData.current_weather.temperature,
      condition: decodeWeatherCode(weatherData.current_weather.weathercode),
      city: name
    };
  } catch (error) {
    console.error("Weather Error:", error);
    return null;
  }
};

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