import { useEffect, useState } from 'react';
import { ArrowLeft, Plane, Hotel, Calendar, DollarSign, Loader2, Car, Ticket, MapPin, Clock, ArrowRight, X, CheckCircle, ExternalLink, Lock } from 'lucide-react';
import { fetchFlights, fetchHotels, fetchEvents } from '../services/api'; 
import ItineraryTimeline from '../components/ItineraryTimeline';
import DestinationBackground from '../components/DestinationBackground';
import ChatBot from '../components/ChatBot';
import { motion, AnimatePresence } from 'framer-motion';

// --- HELPER: LOGO URL ---
const getAirlineLogo = (code) => `https://content.airhex.com/content/logos/airlines_${code}_200_200_s.png`;

// --- HELPER: BOOKING LINKS ---
const openFlightBooking = (airlineCode, flightNumber) => {
    const query = `book flight ${airlineCode} ${flightNumber} official site`;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
};

const openHotelBooking = (hotelName) => {
    const query = encodeURIComponent(hotelName);
    window.open(`https://www.booking.com/searchresults.html?ss=${query}`, '_blank');
};

// --- SUB-COMPONENT: BOOKING MODAL ---
const BookingModal = ({ flight, onClose, onConfirm }) => {
  if (!flight) return null;
  const airline = flight.validatingAirlineCodes[0];
  const flightNum = flight.id;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="bg-slate-900 border border-white/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 p-2 rounded-full"><X size={18}/></button>
          <h3 className="text-2xl font-bold text-white mb-1">Confirm Flight</h3>
          <p className="text-blue-100 text-sm">Lock in this flight to generate your itinerary</p>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
            <div className="text-center">
              <img src={getAirlineLogo(airline)} alt={airline} className="w-12 h-12 object-contain mx-auto mb-2 bg-white rounded-full p-1"/>
              <div className="text-xl font-bold text-white">{airline}</div>
            </div>
            <div className="flex-1 px-4 flex flex-col items-center">
               <div className="text-xs text-gray-500 mb-1">Direct</div>
               <div className="w-full h-[1px] bg-white/20 relative">
                  <Plane size={14} className="absolute left-1/2 -top-2 text-blue-400 bg-slate-900 px-1"/>
               </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{flightNum}</div>
              <div className="text-xs text-gray-400">Flight No</div>
            </div>
          </div>

          <button 
            onClick={() => {
                openFlightBooking(airline, flightNum);
                onConfirm(); // ✅ Triggers Itinerary Unlock
            }}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 group"
          >
             <span>Confirm & Book</span> <ExternalLink size={18} className="group-hover:translate-x-1 transition-transform"/>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- MAIN PAGE ---
const ResultsPage = ({ searchData, onBack }) => {
  const [transport, setTransport] = useState({ type: 'loading', data: [], journey: null });
  const [hotels, setHotels] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 🔒 STATE FOR UNLOCKING ITINERARY
  const [selectedFlight, setSelectedFlight] = useState(null); 
  const [confirmedFlight, setConfirmedFlight] = useState(null);
  const [confirmedHotel, setConfirmedHotel] = useState(null);

  const getName = (data) => data?.name || data || "Destination";
  const destName = searchData ? getName(searchData.toCity) : "";
  const originName = searchData ? getName(searchData.fromCity) : "";

  useEffect(() => {
    if (!searchData) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const transportData = await fetchFlights(originName, destName, searchData.departDate);
        setTransport(transportData);
        
        const hotelData = await fetchHotels(destName);
        setHotels(Array.isArray(hotelData) ? hotelData : []);
        
        const eventData = await fetchEvents(destName, searchData.departDate);
        setEvents(Array.isArray(eventData) ? eventData : []); 

      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    };
    loadData();
  }, [searchData]);

  if (!searchData) return <div className="text-white text-center mt-20">No Data</div>;

  return (
    <DestinationBackground destination={destName}>
      <ChatBot destination={destName} />
      <AnimatePresence>
        {selectedFlight && (
            <BookingModal 
                flight={selectedFlight} 
                onClose={() => setSelectedFlight(null)} 
                onConfirm={() => {
                    setConfirmedFlight(selectedFlight);
                    setSelectedFlight(null);
                }}
            />
        )}
      </AnimatePresence>

      {loading ? (
        <div className="h-screen flex flex-col items-center justify-center text-white bg-black/80 backdrop-blur-md z-50">
            <Loader2 className="animate-spin mb-4 text-blue-500" size={48} />
            <h2 className="text-3xl font-bold">Planning trip to {destName}...</h2>
        </div>
      ) : (
        <div className="min-h-screen p-6 max-w-7xl mx-auto pb-24">
            <button onClick={onBack} className="text-white flex items-center gap-2 mb-6 hover:text-blue-300 transition-colors"><ArrowLeft/> Back</button>
            <h1 className="text-6xl font-black text-white mb-2 drop-shadow-xl capitalize">{destName}</h1>
            
            <div className="flex gap-4 text-gray-200 mb-10">
                <span className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full border border-white/10"><Calendar size={16}/> {searchData.departDate}</span>
                <span className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full border border-white/10"><DollarSign size={16}/> {searchData.budget}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-10">
                    
                    {/* JOURNEY SECTION */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-6 flex gap-2 items-center">
                           <MapPin className="text-emerald-400"/> Your Journey Plan
                        </h2>

                        {/* MULTI-MODAL */}
                        {transport.type === 'multi_modal' && transport.journey && (
                            <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative overflow-hidden">
                                <div className="absolute left-[1.9rem] top-8 bottom-8 w-0.5 bg-white/10"></div>

                                {/* STEP 1 */}
                                <div className="relative flex gap-6 mb-10">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/20 flex items-center justify-center z-10 text-white font-bold text-xs shadow-lg">1</div>
                                    <div className="flex-1">
                                        <h3 className="text-white font-bold text-lg mb-1">Drive to {transport.journey.originHub}</h3>
                                        <p className="text-gray-400 text-sm flex items-center gap-2"><Car size={14}/> {transport.journey.startRoad}</p>
                                    </div>
                                </div>

                                {/* STEP 2: FLIGHTS */}
                                <div className="relative flex gap-6 mb-10">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 text-white font-bold shadow-lg transition-all ${confirmedFlight ? 'bg-emerald-500 border-emerald-400' : 'bg-blue-600 border-blue-400'}`}>
                                        {confirmedFlight ? <CheckCircle size={18}/> : <Plane size={18}/>}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-white font-bold text-lg mb-4 flex justify-between">
                                            <span>{confirmedFlight ? "Flight Confirmed" : "Select Your Flight"}</span>
                                            {confirmedFlight && <span className="text-emerald-400 text-sm bg-emerald-500/10 px-2 py-1 rounded">Booked</span>}
                                        </h3>
                                        
                                        {!confirmedFlight ? (
                                            <div className="grid grid-cols-1 gap-3">
                                                {(transport.results || []).slice(0, 3).map((f, i) => (
                                                    <button 
                                                        key={i} 
                                                        onClick={() => setSelectedFlight(f)}
                                                        className="w-full bg-white/5 hover:bg-blue-600/20 border border-white/10 hover:border-blue-500/50 p-4 rounded-xl flex justify-between items-center transition-all group"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <img src={getAirlineLogo(f.validatingAirlineCodes[0])} className="w-8 h-8 object-contain bg-white rounded-md p-0.5" alt="Airline"/>
                                                            <div className="text-left">
                                                                <div className="text-white font-bold text-lg">{f.validatingAirlineCodes[0]} <span className="text-gray-500 text-sm font-normal">#{f.id}</span></div>
                                                                <div className="text-xs text-gray-400 mt-1 flex gap-2">
                                                                    <span className="bg-white/10 px-1 rounded">Economy Class</span>
                                                                    <span>{f.numberOfBookableSeats} seats left</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-emerald-400 font-bold text-xl">{f.price.currency} {f.price.total}</div>
                                                            <div className="text-xs text-blue-300 mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">Select <ArrowRight size={12}/></div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <img src={getAirlineLogo(confirmedFlight.validatingAirlineCodes[0])} className="w-10 h-10 object-contain bg-white rounded-full p-1"/>
                                                    <div>
                                                        <div className="font-bold text-white">{confirmedFlight.validatingAirlineCodes[0]} #{confirmedFlight.id}</div>
                                                        <div className="text-emerald-400 text-xs">Confirmed • Economy</div>
                                                    </div>
                                                </div>
                                                <button onClick={() => setConfirmedFlight(null)} className="text-xs text-gray-400 hover:text-white underline">Change</button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* STEP 3 */}
                                <div className="relative flex gap-6">
                                    <div className="w-10 h-10 rounded-full bg-emerald-600 border border-emerald-400 flex items-center justify-center z-10 text-white font-bold shadow-lg shadow-emerald-900/50"><MapPin size={18}/></div>
                                    <div className="flex-1">
                                        <h3 className="text-white font-bold text-lg mb-1">Arrive in {destName}</h3>
                                        <p className="text-gray-400 text-sm flex items-center gap-2"><Car size={14}/> {transport.journey.endRoad}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* ROAD TRIP (Auto-Confirm) */}
                        {transport.type === 'road_trip' && (
                            <div className="bg-emerald-900/40 border border-emerald-500/30 rounded-3xl p-8">
                                <div className="flex items-center gap-6">
                                    <div className="bg-emerald-500 p-4 rounded-2xl"><Car size={32} className="text-white" /></div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white">Scenic Drive Recommended</h3>
                                        <div className="mt-2 flex gap-6 text-emerald-200">
                                            <span className="font-mono text-xl">{transport.results[0].duration}</span>
                                            <span className="font-mono text-xl">{transport.results[0].distance}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* HOTELS */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-6 flex gap-2 items-center"><Hotel className="text-purple-400"/> Top Stays</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(hotels || []).map((h, i) => (
                                <div key={i} className={`bg-black/40 rounded-2xl overflow-hidden border transition-all flex flex-col ${confirmedHotel?.name === h.name ? 'border-emerald-500 ring-2 ring-emerald-500/50' : 'border-white/10'}`}>
                                    <div className="h-48 overflow-hidden relative">
                                        <img src={h.image} className="h-full w-full object-cover"/>
                                        {confirmedHotel?.name === h.name && (
                                            <div className="absolute inset-0 bg-emerald-500/40 backdrop-blur-[2px] flex items-center justify-center">
                                                <div className="bg-white text-emerald-600 font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-xl"><CheckCircle size={16}/> Selected</div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-5 text-white flex-1 flex flex-col">
                                        <h3 className="font-bold truncate text-lg mb-1">{h.name}</h3>
                                        <p className="text-xs text-gray-400 mb-4">Luxury Stay • Free Wifi</p>
                                        
                                        {confirmedHotel?.name === h.name ? (
                                            <button onClick={() => setConfirmedHotel(null)} className="mt-auto w-full bg-red-500/20 hover:bg-red-500/40 text-red-200 text-sm font-bold py-3 rounded-xl transition-colors">
                                                Remove Selection
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => {
                                                    openHotelBooking(h.name);
                                                    setConfirmedHotel(h);
                                                }}
                                                className="mt-auto w-full bg-white/10 hover:bg-white/20 text-white text-sm font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                                            >
                                                View & Select <ExternalLink size={14}/>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* EVENTS */}
                    <section>
                         <h2 className="text-2xl font-bold text-white mb-6 flex gap-2 items-center"><Ticket className="text-pink-400"/> Local Vibes</h2>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(events || []).length > 0 ? (events || []).map((ev, i) => (
                                <div key={i} className="bg-white/5 p-5 rounded-2xl border border-white/5">
                                    <h3 className="font-bold text-pink-200">{ev.title}</h3>
                                    <p className="text-xs text-gray-400 mt-1">{ev.category}</p>
                                    <p className="text-sm text-gray-300 mt-2">{ev.description}</p>
                                </div>
                            )) : <div className="text-gray-500 text-center py-6 bg-white/5 rounded-xl col-span-2">No events found.</div>}
                         </div>
                    </section>
                </div>
                
                {/* SIDEBAR: ITINERARY - LOCKED UNTIL SELECTION */}
                <div className="lg:col-span-1">
                    {(confirmedFlight || transport.type === 'road_trip') && confirmedHotel ? (
                        <ItineraryTimeline destination={destName} days={3} budget={searchData.budget} interests={searchData.interests} />
                    ) : (
                        <div className="sticky top-6 bg-slate-900/60 p-8 rounded-[2rem] border border-white/10 backdrop-blur-md shadow-xl text-center h-96 flex flex-col items-center justify-center">
                            <div className="bg-white/5 p-6 rounded-full mb-6 relative">
                                <Lock size={48} className="text-gray-500" />
                                <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1.5 border-4 border-slate-900">
                                    <Clock size={16} className="text-white"/>
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Itinerary Locked</h3>
                            <p className="text-gray-400 leading-relaxed max-w-xs mx-auto">
                                Please <strong>Select a Flight</strong> and a <strong>Hotel</strong> to unlock your AI-generated daily plan.
                            </p>
                            
                            <div className="mt-6 flex gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                <span className={confirmedFlight || transport.type === 'road_trip' ? "text-emerald-400" : "text-gray-600"}>1. Transport</span>
                                <span className="text-gray-700">•</span>
                                <span className={confirmedHotel ? "text-emerald-400" : "text-gray-600"}>2. Hotel</span>
                                <span className="text-gray-700">•</span>
                                <span className="text-gray-600">3. Plan</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </DestinationBackground>
  );
};

export default ResultsPage;