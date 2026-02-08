import { useEffect, useState } from 'react';
import { ArrowLeft, Plane, Hotel, Calendar, DollarSign, Loader2, Car } from 'lucide-react';
import { fetchFlights, fetchHotels } from '../services/api'; 
import ItineraryTimeline from '../components/ItineraryTimeline';
import DestinationBackground from '../components/DestinationBackground';
import ChatBot from '../components/ChatBot';

const ResultsPage = ({ searchData, onBack }) => {
  const [transport, setTransport] = useState({ type: 'loading', data: [] });
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  // Safe Extraction
  const getName = (data) => data?.name || data || "Destination";
  const getCode = (data) => data?.iataCode || data || "";

  const destName = searchData ? getName(searchData.toCity) : "";
  const destCode = searchData ? getCode(searchData.toCity) : "";
  const originCode = searchData ? getCode(searchData.fromCity) : "";

  useEffect(() => {
    if (!searchData) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // 1. Smart Transport (Flights OR Road Trip via OSRM)
        const transportData = await fetchFlights(originCode, destCode, searchData.departDate);
        setTransport({ type: transportData.type, data: transportData.results });

        // 2. Hotels
        const hotelData = await fetchHotels(destCode);
        setHotels(hotelData || []);
        
      } catch (err) { 
        console.error("Failed to load results:", err); 
      } finally { 
        setLoading(false); 
      }
    };

    loadData();
  }, [searchData]);

  if (!searchData) return <div className="text-white text-center mt-20">No Data</div>;

  return (
    <DestinationBackground destination={destName}>
      
      {/* Floating ChatBot Agent */}
      <ChatBot destination={destName} />

      {loading ? (
        <div className="h-screen flex flex-col items-center justify-center text-white bg-black/50 backdrop-blur-sm">
            <Loader2 className="animate-spin mb-4" size={48} />
            <h2 className="text-2xl font-bold">Planning trip to {destName}...</h2>
            <p className="text-gray-400 mt-2">Checking flights and road conditions...</p>
        </div>
      ) : (
        <div className="min-h-screen p-6 max-w-6xl mx-auto pb-24">
            {/* Header */}
            <button onClick={onBack} className="text-white flex items-center gap-2 mb-6 hover:text-blue-300 transition-colors">
                <ArrowLeft/> Back
            </button>
            
            <h1 className="text-6xl font-black text-white mb-2 drop-shadow-lg">{destName}</h1>
            
            <div className="flex gap-4 text-gray-200 mb-10">
                <span className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full border border-white/5">
                    <Calendar size={16}/> {searchData.departDate}
                </span>
                <span className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full border border-white/5">
                    <DollarSign size={16}/> {searchData.budget} {searchData.currency}
                </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Transport & Hotels */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* TRANSPORT SECTION */}
                    <section>
                        <h2 className="text-xl font-bold text-white mb-4 flex gap-2 items-center">
                            {transport.type === 'road_trip' ? <Car className="text-emerald-400"/> : <Plane className="text-blue-400"/>} 
                            {transport.type === 'road_trip' ? 'Recommended Drive' : 'Best Flights'}
                        </h2>

                        <div className="space-y-3">
                            {transport.type === 'road_trip' ? (
                                <div className="bg-emerald-900/40 backdrop-blur p-6 rounded-xl border border-emerald-500/30 text-white shadow-xl">
                                    <div className="flex items-start gap-4">
                                        <div className="bg-emerald-500 p-3 rounded-full shadow-lg">
                                            <Car size={24} className="text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-emerald-200">Road Trip Recommended</h3>
                                            {transport.data[0] && (
                                                <>
                                                    <p className="text-emerald-100 mt-1">{transport.data[0].message}</p>
                                                    <div className="mt-4 flex gap-6 text-sm font-mono text-emerald-200/80 bg-black/20 p-2 rounded-lg inline-flex">
                                                        <span>⏱️ {transport.data[0].duration}</span>
                                                        <span>🛣️ {transport.data[0].distance}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : transport.data.length > 0 ? (
                                transport.data.slice(0,3).map((f, i) => (
                                    <div key={i} className="bg-black/40 backdrop-blur p-5 rounded-xl border border-white/10 text-white hover:bg-black/60 transition-all cursor-default">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="font-bold text-lg">{f.validatingAirlineCodes[0]}</div>
                                                <div className="text-sm text-gray-400">
                                                    {f.itineraries[0].duration.replace("PT", "").toLowerCase()}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-emerald-400">{f.price.currency} {f.price.total}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-gray-400 bg-black/20 p-6 rounded-xl border border-white/5 text-center">
                                    No direct transport routes found. Try adjusting your dates.
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Hotels Section */}
                    <section>
                        <h2 className="text-xl font-bold text-white mb-4 flex gap-2"><Hotel className="text-purple-400"/> Top Stays</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {hotels.length > 0 ? hotels.map((h, i) => (
                                <div key={i} className="bg-black/40 backdrop-blur rounded-xl overflow-hidden border border-white/10 group hover:border-purple-500/50 transition-all cursor-pointer">
                                    <div className="h-40 overflow-hidden">
                                        <img src={h.image} alt={h.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"/>
                                    </div>
                                    <div className="p-4 text-white">
                                        <h3 className="font-bold truncate text-lg">{h.name}</h3>
                                        <div className="flex justify-between items-center mt-3">
                                            <div className="text-sm text-yellow-400 font-bold">★ {h.rating}</div>
                                            <div className="text-xs bg-white/10 px-3 py-1 rounded-full group-hover:bg-purple-500 transition-colors">View Details</div>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-2 text-gray-400 text-center py-10 bg-black/20 rounded-xl border border-white/5">
                                    No hotel availability found for these dates.
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* Right Column: AI Itinerary */}
                <div className="lg:col-span-1">
                    <ItineraryTimeline 
                        destination={destName} 
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