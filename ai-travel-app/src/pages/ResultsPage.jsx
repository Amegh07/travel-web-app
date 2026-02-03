import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plane, Hotel, MapPin, Calendar, Cloud, Loader2, DollarSign } from 'lucide-react';

// API Services
import { getWeather } from '../services/weatherService';
import { fetchFlights, fetchHotels } from '../services/amadeusAPI';

// AI Components
import ItineraryTimeline from '../components/ItineraryTimeline';
import PackingList from '../components/PackingList';

const ResultsPage = ({ searchData, onBack }) => {
  const [weather, setWeather] = useState(null);
  const [flights, setFlights] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch Weather
        const weatherData = await getWeather(searchData.toCity);
        setWeather(weatherData);

        // 2. Fetch Flights (Passing returnDate if it exists)
        const flightResults = await fetchFlights(
          searchData.fromCity,
          searchData.toCity,
          searchData.departureDate,
          searchData.returnDate // <--- CRITICAL: Pass return date
        );
        setFlights(flightResults);

        // 3. Fetch Hotels
        const hotelResults = await fetchHotels(searchData.toCity);
        setHotels(hotelResults);

      } catch (err) {
        console.error("Data Fetch Error:", err);
        setError("Could not load some travel details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (searchData) {
      loadAllData();
    }
  }, [searchData]);

  // Helper to format date/time
  const formatTime = (isoString) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white">
        <Loader2 size={48} className="animate-spin text-blue-500 mb-4" />
        <h2 className="text-2xl font-bold">Planning your trip to {searchData.toCity}...</h2>
        <p className="text-white/60">Finding best flights and hotels</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 pb-20">
      
      {/* HEADER */}
      <div className="max-w-6xl mx-auto mb-8">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={20} /> Back to Search
        </button>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-2 uppercase tracking-tight">
              {searchData.toCity}
            </h1>
            <div className="flex items-center gap-4 text-white/80">
              <span className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full text-sm backdrop-blur-md">
                <Calendar size={14} /> {searchData.departureDate}
                {searchData.returnDate && ` - ${searchData.returnDate}`}
              </span>
              <span className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full text-sm backdrop-blur-md">
                <DollarSign size={14} /> Budget: {searchData.budget}
              </span>
            </div>
          </div>

          {weather && (
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center gap-4 text-white">
              <Cloud size={32} className="text-blue-400" />
              <div>
                <p className="text-2xl font-bold">{weather.temp}°C</p>
                <p className="text-sm opacity-80">{weather.condition}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Flights & Hotels */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* FLIGHTS SECTION */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Plane className="text-blue-400" /> Available Flights
            </h2>
            <div className="grid gap-4">
              {flights.length > 0 ? (
                flights.slice(0, 3).map((flight) => (
                  <motion.div 
                    key={flight.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/10 backdrop-blur-md border border-white/10 p-5 rounded-2xl hover:bg-white/15 transition-all text-white"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-lg mb-1">
                          {flight.validatingAirlineCodes?.[0] || "Airline"}
                        </p>
                        <div className="text-sm opacity-70 flex gap-4">
                          <span>Out: {formatTime(flight.itineraries?.[0]?.segments?.[0]?.departure?.at)}</span>
                          {flight.itineraries?.[1] && (
                            <span>Ret: {formatTime(flight.itineraries?.[1]?.segments?.[0]?.departure?.at)}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-emerald-400">
                          {flight.price?.currency} {flight.price?.total}
                        </p>
                        <button className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full mt-2 transition-colors">
                          Select
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="p-6 bg-white/5 rounded-2xl text-center text-white/50 border border-white/5">
                  No flights found for this route/date. Try changing dates.
                </div>
              )}
            </div>
          </section>

          {/* HOTELS SECTION */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Hotel className="text-purple-400" /> Top Hotels
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hotels.length > 0 ? (
                hotels.map((hotel) => (
                  <motion.div 
                    key={hotel.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white/10 backdrop-blur-md border border-white/10 overflow-hidden rounded-2xl group"
                  >
                    <div className="h-32 overflow-hidden relative">
                      <img 
                        src={hotel.image} 
                        alt={hotel.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs text-yellow-400 font-bold flex items-center gap-1">
                        ★ {hotel.rating}
                      </div>
                    </div>
                    <div className="p-4 text-white">
                      <h3 className="font-bold truncate">{hotel.name}</h3>
                      <p className="text-xs text-white/60 flex items-center gap-1 mb-3">
                        <MapPin size={10} /> City Center
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-emerald-400 font-bold text-sm">
                          {hotel.currency} {hotel.price}
                        </span>
                        <button className="text-xs bg-purple-500/20 text-purple-200 hover:bg-purple-500/40 px-3 py-1 rounded-lg transition-colors">
                          View
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-2 p-6 bg-white/5 rounded-2xl text-center text-white/50 border border-white/5">
                  No hotels found in this area.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: AI Itinerary & Packing */}
        <div className="space-y-8">
          <ItineraryTimeline 
            destination={searchData.toCity} 
            days={3} 
            budget={searchData.budget} 
            interests={searchData.interests}
          />
          
          <PackingList 
            destination={searchData.toCity} 
            days={3} 
            interests={searchData.interests}
          />
        </div>

      </div>
    </div>
  );
};

export default ResultsPage;