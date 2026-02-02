import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { fetchFlights, fetchHotels } from '../services/amadeusAPI';
import { getWeather } from '../services/weatherService';
import FlightCard from '../components/FlightCard'; 
import HotelCard from '../components/HotelCard';
import ItineraryTimeline from '../components/ItineraryTimeline';
import PackingList from '../components/PackingList';
import { ArrowLeft, ExternalLink, Cloud, Sun, Volume2, Umbrella } from 'lucide-react';

const ResultsPage = () => {
  const location = useLocation();
  const searchData = location.state?.searchData || {}; 
  
  const fromCity = searchData.fromCity || "Origin";
  const toCity = searchData.toCity || "Destination";
  const departureDate = searchData.departureDate || "TBD";
  const budget = searchData.budget || "Standard";

  const [flights, setFlights] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (toCity === "Destination") return; 

      try {
        setLoading(true);
        console.log("🚀 Starting Search for:", toCity);

        // Fetch Data
        const flightData = await fetchFlights(fromCity, toCity, departureDate);
        const hotelData = await fetchHotels(toCity);
        
        setFlights(flightData);
        setHotels(hotelData);

      } catch (err) {
        console.error("❌ Error generating plan:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toCity, fromCity, departureDate]);

  // --- FEATURE: Gamification (Digital Scratch Map) ---
  useEffect(() => {
    if (toCity && toCity !== "Destination") {
      const visited = JSON.parse(localStorage.getItem('visited_cities') || '[]');
      if (!visited.includes(toCity)) {
        localStorage.setItem('visited_cities', JSON.stringify([...visited, toCity]));
      }
    }
  }, [toCity]);

  // --- FEATURE: Smart Context (Weather) ---
  useEffect(() => {
    if (!toCity || toCity === "Destination") return;
    
    const fetchWeather = async () => {
      const data = await getWeather(toCity);
      if (data) {
        const isRainy = ['Rain', 'Drizzle', 'Thunderstorm', 'Snow'].includes(data.condition);
        
        setWeather({
          temp: data.temp,
          condition: data.condition,
          advice: isRainy ? 'Pack an umbrella! Great day for museums.' : 'Perfect weather for outdoor adventures!'
        });
      }
    };

    fetchWeather();
  }, [toCity]);

  // --- FEATURE: Audio (Local Lingo) ---
  const getLocalPhrases = (city) => {
    // Mock dictionary - expand this or use an API
    const dict = {
      'Paris': { lang: 'fr-FR', phrases: [{o:'Bonjour', t:'Hello'}, {o:'Merci', t:'Thank you'}, {o:'Où sont les toilettes?', t:'Where is the bathroom?'}] },
      'Tokyo': { lang: 'ja-JP', phrases: [{o:'Konnichiwa', t:'Hello'}, {o:'Arigato', t:'Thank you'}, {o:'Toire wa doko desu ka?', t:'Where is the bathroom?'}] },
      'Rome': { lang: 'it-IT', phrases: [{o:'Ciao', t:'Hello'}, {o:'Grazie', t:'Thank you'}, {o:'Dov\'è il bagno?', t:'Where is the bathroom?'}] },
    };
    return dict[city] || { lang: 'en-US', phrases: [{o:'Hello', t:'Hello'}, {o:'Thank you', t:'Thank you'}, {o:'Where is the bathroom?', t:'Where is the bathroom?'}] };
  };
  const localLingo = getLocalPhrases(toCity);

  const speakPhrase = (text, lang) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  };

  if (toCity === "Destination") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No Search Data Found</h2>
          <Link to="/" className="text-blue-600 hover:underline">Return Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50/50 pb-12">
      <div className="bg-white/80 backdrop-blur-md pt-8 pb-12 px-4 shadow-sm border-b border-orange-100">
        <div className="max-w-6xl mx-auto">
          <Link to="/" className="inline-flex items-center text-gray-500 hover:text-blue-600 mb-6 transition">
             <ArrowLeft className="w-5 h-5 mr-2" /> Edit Search
          </Link>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-2 tracking-tight">
            Trip to <span className="text-blue-600">{toCity}</span>
          </h1>
          <div className="flex flex-wrap gap-4 text-gray-500 font-medium">
             <span>✈️ {fromCity} ➝ {toCity}</span> 
             <span>📅 {departureDate}</span> 
             <span>💰 Budget: {budget}</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-6 relative z-10 space-y-12">
        {loading && (
            <div className="bg-white p-12 text-center rounded-2xl shadow-xl border border-gray-100">
                <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-500 font-medium">Building your perfect trip...</p>
            </div>
        )}
        
        {!loading && (
          <>
            {/* Smart Context: Weather Widget */}
            {weather && (
            <div className={`rounded-2xl p-6 text-white shadow-lg flex items-center justify-between ${['Sunny', 'Clear Sky', 'Mainly Clear', 'Partly Cloudy'].includes(weather.condition) ? 'bg-gradient-to-r from-blue-400 to-blue-500' : 'bg-gradient-to-r from-gray-500 to-gray-600'}`}>
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  {['Sunny', 'Clear Sky', 'Mainly Clear', 'Partly Cloudy'].includes(weather.condition) ? <Sun className="text-yellow-300" /> : <Cloud className="text-gray-300" />}
                  Forecast for your trip
                </h3>
                <p className="opacity-90 mt-1">{weather.temp}°C • {weather.condition} • {weather.advice}</p>
                {['Rain', 'Drizzle', 'Thunderstorm', 'Snow', 'Rainy'].includes(weather.condition) && (
                  <div className="mt-2 inline-flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-sm">
                    <Umbrella size={14} /> Indoor alternatives suggested
                  </div>
                )}
              </div>
              <div className="text-4xl font-bold">{weather.temp}°</div>
            </div>
            )}

            {/* Audio Feature: Local Lingo Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Volume2 className="text-purple-600" size={20} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Local Lingo: Survival Phrases</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {localLingo.phrases.map((phrase, idx) => (
                  <button 
                    key={idx}
                    onClick={() => speakPhrase(phrase.o, localLingo.lang)}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all group text-left"
                  >
                    <div>
                      <p className="font-bold text-gray-800">{phrase.o}</p>
                      <p className="text-sm text-gray-500">{phrase.t}</p>
                    </div>
                    <div className="bg-gray-100 group-hover:bg-white p-2 rounded-full transition-colors">
                      <Volume2 size={16} className="text-gray-400 group-hover:text-purple-600" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <FlightCard flights={flights} />

            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                   🏨 Recommended Stays
                </h2>
                {hotels.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {hotels.map((hotel, index) => (
                      <HotelCard key={hotel.id || index} hotel={hotel} />
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-white rounded-xl border border-dashed border-gray-300 text-gray-500">
                    No hotels found in {toCity} (API Limit).
                  </div>
                )}
                
                <a href={`https://www.booking.com/searchresults.html?ss=${toCity}`} target="_blank" rel="noopener noreferrer" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition">
                    See All Available Hotels in {toCity} <ExternalLink className="w-4 h-4" />
                </a>
            </div>

            <ItineraryTimeline destination={toCity} budget={budget} interests={searchData.interests} />
            <PackingList destination={toCity} days={5} interests={searchData.interests} />
          </>
        )}
      </div>
    </div>
  );
};

export default ResultsPage;