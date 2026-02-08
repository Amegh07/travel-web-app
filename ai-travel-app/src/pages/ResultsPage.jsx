import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plane, Hotel, MapPin, Calendar, Loader2, DollarSign, Sun } from 'lucide-react';

import { getWeather } from '../services/weatherService';
import { fetchFlights, fetchHotels } from '../services/amadeusAPI';

import ItineraryTimeline from '../components/ItineraryTimeline';
import DestinationBackground from '../components/DestinationBackground';

const ResultsPage = ({ searchData, onBack }) => {
  const [weather, setWeather] = useState(null);
  const [flights, setFlights] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- 🔥 FIX START: Safe Data Extraction ---
  // The SearchForm sends objects now, so we must extract strings to avoid crashes.
  const getCityName = (data) => data?.name || data || "Destination";
  const getCityCode = (data) => data?.iataCode || data || "";

  const destinationName = searchData ? getCityName(searchData.toCity) : "";
  const destinationCode = searchData ? getCityCode(searchData.toCity) : "";
  const originCode = searchData ? getCityCode(searchData.fromCity) : "";
  // --- 🔥 FIX END ---

  useEffect(() => {
    if (!searchData) return;

    const loadAllData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Flights (Uses IATA Codes: DEL, LHR)
        const flightResults = await fetchFlights(
          originCode,       // Fixed: Was passing object
          destinationCode,  // Fixed: Was passing object
          searchData.departDate || searchData.departureDate, // Handle both key names
          searchData.returnDate
        );
        setFlights(flightResults);

        // 2. Fetch Weather & Hotels (Uses City Name: "Delhi")
        const [weatherData, hotelResults] = await Promise.all([
          getWeather(destinationName),
          fetchHotels(destinationName)
        ]);

        setWeather(weatherData);
        setHotels(hotelResults);

      } catch (err) {
        console.error("Data Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [searchData]);

  const formatTime = (isoString) => {
    if (!isoString) return "--:--";
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (duration) => {
    if (!duration) return "";
    return duration.replace("PT", "").replace("H", "h ").replace("M", "m");
  };

  if (!searchData) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No search data</h2>
          <button onClick={onBack} className="bg-blue-600 px-6 py-2 rounded-lg">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    // Fixed: Pass string name, not object
    <DestinationBackground destination={destinationName}>
      
      {loading ? (
        <div className="min-h-screen flex flex-col items-center justify-center text-white">
          <Loader2 size={48} className="animate-spin text-blue-500 mb-4" />
          {/* Fixed: Render string name */}
          <h2 className="text-2xl font-bold">Discovering {destinationName}...</h2>
          <p className="text-gray-400 mt-2">Loading flights, hotels & experiences</p>
        </div>
      ) : (
        <div className="min-h-screen p-6 md:p-10">
          
          {/* Header */}
          <div className="max-w-6xl mx-auto mb-8">
            <button 
              onClick={onBack}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft size={20} /> Back to Search
            </button>

            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                {/* Fixed: Render string name */}
                <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tight mb-3 text-white drop-shadow-lg">
                  {destinationName}
                </h1>
                <div className="flex items-center gap-3 text-gray-300">
                  <span className="flex items-center gap-1 bg-white/10 backdrop-blur px-4 py-2 rounded-full text-sm">
                    <Calendar size={16} /> {searchData.departDate || searchData.departureDate}
                    {searchData.returnDate && ` - ${searchData.returnDate}`}
                  </span>
                  <span className="flex items-center gap-1 bg-white/10 backdrop-blur px-4 py-2 rounded-full text-sm">
                    <DollarSign size={16} /> {searchData.budget}
                  </span>
                </div>
              </div>

              {/* Weather Widget */}
              {weather && (
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 flex items-center gap-4">
                  <Sun size={40} className="text-yellow-400" />
                  <div>
                    <p className="text-3xl font-bold">{weather.temp}°C</p>
                    <p className="text-sm text-gray-300">{weather.condition}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column - Flights & Hotels */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Flights Section */}
              <section>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-200">
                  <Plane className="text-blue-400" /> Best Flights
                </h2>
                
                <div className="space-y-4">
                  {flights.length > 0 ? (
                    flights.slice(0, 3).map((flight) => {
                      const outbound = flight.itineraries?.[0];
                      const segments = outbound?.segments || [];
                      const firstSeg = segments[0];
                      const lastSeg = segments[segments.length - 1];
                      const airline = flight.validatingAirlineCodes?.[0] || "Unknown";

                      return (
                        <motion.div 
                          key={flight.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-black/40 backdrop-blur-md border border-white/10 p-5 rounded-2xl hover:bg-black/50 transition-all"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-4">
                            
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                                <span className="text-black font-bold text-xs">{airline}</span>
                              </div>
                              <div>
                                <p className="font-bold text-white">{airline}</p>
                                <p className="text-xs text-gray-400">{formatDuration(outbound?.duration)}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-center">
                              <div>
                                <p className="text-2xl font-bold text-white">{firstSeg?.departure?.iataCode}</p>
                                <p className="text-xs text-gray-400">{formatTime(firstSeg?.departure?.at)}</p>
                              </div>
                              
                              <div className="flex flex-col items-center w-20">
                                <Plane size={16} className="text-blue-400 rotate-90" />
                                <div className="w-full h-px bg-gray-600 my-1"></div>
                              </div>

                              <div>
                                <p className="text-2xl font-bold text-white">{lastSeg?.arrival?.iataCode}</p>
                                <p className="text-xs text-gray-400">{formatTime(lastSeg?.arrival?.at)}</p>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-2xl font-bold text-emerald-400">
                                {flight.price?.currency} {flight.price?.total}
                              </p>
                              <button className="mt-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-full transition-colors">
                                Select
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="bg-black/30 border border-white/10 p-8 rounded-2xl text-center text-gray-400">
                      <Plane size={48} className="mx-auto mb-4 opacity-30" />
                      <p>No direct flights found via Amadeus.</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Hotels Section */}
              <section>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-200">
                  <Hotel className="text-purple-400" /> Where to Stay
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {hotels.length > 0 ? (
                    hotels.map((hotel) => (
                      <motion.div 
                        key={hotel.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all group"
                      >
                        <div className="h-40 overflow-hidden relative">
                          <img 
                            src={hotel.image} 
                            alt={hotel.name} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-yellow-400 text-sm font-bold">
                            ★ {hotel.rating}
                          </div>
                        </div>
                        
                        <div className="p-4">
                          <h3 className="font-bold text-lg text-white mb-1 truncate">{hotel.name}</h3>
                          <p className="text-sm text-gray-400 flex items-center gap-1 mb-3">
                            <MapPin size={14} /> City Center
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-emerald-400 font-bold">
                              {hotel.price}
                            </span>
                            <button className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-sm px-4 py-2 rounded-lg transition-colors">
                              View Deal
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-2 bg-black/30 border border-white/10 p-8 rounded-2xl text-center text-gray-400">
                      <Hotel size={48} className="mx-auto mb-4 opacity-30" />
                      <p>No hotels found.</p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Right Column - Itinerary */}
            <div>
              <ItineraryTimeline 
                // Fixed: Pass string name
                destination={destinationName}
                days={3} 
                budget={searchData.budget} 
                interests={searchData.interests}
              />
            </div>

          </div>
        </div>
      )}
    </DestinationBackground>
  );
};

export default ResultsPage;