import { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, Snowflake, Zap, Loader2, Thermometer } from 'lucide-react';

const getWeatherIcon = (code) => {
    // Open-Meteo WMO Weather interpretation codes
    if (code === 0) return <Sun size={20} className="text-yellow-400" />;
    if (code >= 1 && code <= 3) return <Cloud size={20} className="text-slate-300" />;
    if (code >= 45 && code <= 48) return <Cloud size={20} className="text-slate-400" />;
    if (code >= 51 && code <= 67) return <CloudRain size={20} className="text-blue-400" />;
    if (code >= 71 && code <= 77) return <Snowflake size={20} className="text-blue-200" />;
    if (code >= 80 && code <= 82) return <CloudRain size={20} className="text-blue-500" />;
    if (code >= 95 && code <= 99) return <Zap size={20} className="text-yellow-500" />;
    return <Sun size={20} className="text-yellow-400" />;
};

const getWeatherText = (code) => {
    if (code === 0) return 'Clear';
    if (code === 1) return 'Mostly Clear';
    if (code === 2) return 'Partly Cloudy';
    if (code === 3) return 'Overcast';
    if (code >= 45 && code <= 48) return 'Fog';
    if (code >= 51 && code <= 55) return 'Drizzle';
    if (code >= 61 && code <= 65) return 'Rain';
    if (code >= 71 && code <= 77) return 'Snow';
    if (code >= 80 && code <= 82) return 'Showers';
    if (code >= 95 && code <= 99) return 'Thunderstorm';
    return 'Clear';
};

const WeatherWidget = ({ destination }) => {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!destination) return;

        const fetchWeather = async () => {
            setLoading(true);
            try {
                // 1. Geocoding
                const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=en&format=json`);
                const geoData = await geoRes.json();

                if (!geoData.results || geoData.results.length === 0) {
                    setLoading(false);
                    return;
                }

                const { latitude, longitude } = geoData.results[0];

                // 2. Weather Forecase (3 days)
                const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=3`);
                const weatherData = await weatherRes.json();

                setWeather(weatherData.daily);
            } catch (error) {
                console.error("Failed to fetch weather:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchWeather();
    }, [destination]);

    if (loading) {
        return (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 flex items-center justify-center border border-slate-200 shadow-sm w-full h-24">
                <Loader2 className="animate-spin text-blue-500" size={24} />
            </div>
        );
    }

    if (!weather) return null;

    return (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-slate-200 text-slate-900 min-w-[250px] shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                <Thermometer size={16} className="text-blue-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">3-Day Forecast</h3>
            </div>
            <div className="flex justify-between items-center gap-4">
                {weather.time.map((dateStr, index) => {
                    const date = new Date(dateStr);
                    const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
                    const maxTemp = Math.round(weather.temperature_2m_max[index]);
                    const minTemp = Math.round(weather.temperature_2m_min[index]);
                    const code = weather.weathercode[index];

                    return (
                        <div key={index} className="flex flex-col items-center">
                            <span className="text-xs text-slate-500 font-medium mb-1">{dayName}</span>
                            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-inner mb-2" title={getWeatherText(code)}>
                                {getWeatherIcon(code)}
                            </div>
                            <div className="text-xs font-bold text-slate-900">
                                {maxTemp}°<span className="text-slate-400 font-normal">/{minTemp}°</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default WeatherWidget;
