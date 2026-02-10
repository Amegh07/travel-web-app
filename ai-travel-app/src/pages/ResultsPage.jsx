import { useEffect, useState } from 'react';
import { 
  ArrowLeft, Plane, Hotel, Calendar, DollarSign, Loader2, Car, 
  Ticket, MapPin, Clock, ArrowRight, X, CheckCircle, ExternalLink, 
  Lock, Sun, Navigation, Sparkles, CloudRain, Wind, Star
} from 'lucide-react';
import { fetchFlights, fetchHotels, fetchEvents } from '../services/api'; 
import ItineraryTimeline from '../components/ItineraryTimeline';
import ChatBot from '../components/ChatBot'; 
import { motion, AnimatePresence } from 'framer-motion';

// --- HELPER: LOGO URL (FIXED - Free Public Source) ---
const getAirlineLogo = (code) => code ? `https://pics.avs.io/200/200/${code}.png` : '';

// --- HELPER: OPEN DIRECTIONS ---
const openDirectionsToAirport = (originName) => {
    if (!originName) return;
    const query = encodeURIComponent(`${originName} Airport`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
};

// --- COMPONENTS ---

// 1. MINI-MAP BRIDGE (The "Brain" on the Right)
const MiniMapBridge = ({ data, loading }) => (
    <div className="relative w-full h-80 bg-[#0f1115] rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl flex flex-col mb-6 group">
        {/* Map Visuals */}
        <div className="absolute inset-0 opacity-50 transition-opacity group-hover:opacity-70">
            <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)]"></div>
            {data && !loading && (
                <svg className="absolute inset-0 w-full h-full">
                    <motion.path 
                        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, ease: "easeInOut" }}
                        d="M 80 80 Q 200 200 320 250" stroke="url(#gradient-line)" strokeWidth="4" fill="none" strokeLinecap="round" 
                    />
                    <defs><linearGradient id="gradient-line"><stop stopColor="#3b82f6" /><stop offset="1" stopColor="#10b981" /></linearGradient></defs>
                    <circle cx="80" cy="80" r="6" fill="#3b82f6" className="animate-ping"/>
                    <circle cx="320" cy="250" r="6" fill="#10b981" className="animate-ping"/>
                </svg>
            )}
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 flex-1 p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div className="inline-flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full">
                    <Sparkles size={12} className="text-purple-400" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">AI Logistics</span>
                </div>
            </div>

            {loading ? (
                <div className="space-y-3"><div className="h-4 bg-white/10 rounded w-3/4 animate-pulse"/><div className="h-4 bg-white/10 rounded w-1/2 animate-pulse"/></div>
            ) : data ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="text-xs text-slate-400 uppercase font-bold mb-1">Transfer</div>
                            <div className="text-2xl font-bold text-white">{data.duration}</div>
                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mt-1"><Car size={12}/> {data.distance} • {data.traffic}</div>
                        </div>
                        <button onClick={() => window.open(data.routeUrl, '_blank')} className="bg-white text-black p-3 rounded-xl hover:scale-105 transition-transform shadow-lg"><Navigation size={18}/></button>
                    </div>
                </motion.div>
            ) : (
                <div className="text-slate-500 text-sm text-center">Select Flight & Hotel to unlock route.</div>
            )}
        </div>
    </div>
);

// --- MAIN PAGE ---
const ResultsPage = ({ searchData, onBack }) => {
  const [transport, setTransport] = useState({ type: 'loading', data: [], journey: null });
  const [hotels, setHotels] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 🔒 STATE
  const [confirmedFlight, setConfirmedFlight] = useState(null);
  const [confirmedHotel, setConfirmedHotel] = useState(null);
  const [miniMapData, setMiniMapData] = useState(null); 
  const [bridgeLoading, setBridgeLoading] = useState(false);

  // DYNAMIC DATA
  const getName = (data) => data?.name || data || "Destination";
  const destName = searchData ? getName(searchData.toCity) : "Destination";
  const originName = searchData ? getName(searchData.fromCity) : "Origin";
  
  // High quality background image
  const bgImage = `https://images.unsplash.com/photo-1480796927426-f609979314bd?auto=format&fit=crop&w=1600&q=80`; 

  // --- DATA FETCHING ---
  useEffect(() => {
    if (!searchData) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const [transportData, hotelData, eventData] = await Promise.all([
            fetchFlights(originName, destName, searchData.departDate),
            fetchHotels(destName),
            fetchEvents(destName, searchData.departDate)
        ]);
        setTransport(transportData);
        setHotels(Array.isArray(hotelData) ? hotelData : []);
        setEvents(Array.isArray(eventData) ? eventData : []); 
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    };
    loadData();
  }, [searchData]);

  // --- AI BRIDGE LOGIC ---
  useEffect(() => {
    if (confirmedFlight && confirmedHotel) {
        setBridgeLoading(true);
        setTimeout(() => {
            const airline = confirmedFlight.validatingAirlineCodes?.[0] || 'Airline';
            setMiniMapData({
                origin: `${airline} Terminal`,
                destination: confirmedHotel.name,
                distance: "24 km",
                duration: "35 min",
                traffic: "Light Traffic",
                routeUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(confirmedHotel.name)}`
            });
            setBridgeLoading(false);
        }, 1500);
    }
  }, [confirmedFlight, confirmedHotel]);

  // PROGRESS CALC
  const progress = (confirmedFlight ? 50 : 0) + (confirmedHotel ? 50 : 0);

  if (!searchData) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-cyan-500/30">
      <ChatBot destination={destName} />
      
      {loading ? (
        <div className="h-screen flex flex-col items-center justify-center z-50 fixed inset-0 bg-[#020617]">
            <Loader2 className="animate-spin text-cyan-500 mb-4" size={48} />
            <h2 className="text-2xl font-bold text-white animate-pulse">Designing trip to {destName}...</h2>
        </div>
      ) : (
        <div className="max-w-[1600px] mx-auto p-4 lg:p-8 pb-32 animate-fade-in">
            
            {/* 1. HERO CARD (TOKYO STYLE) */}
            <div className="relative w-full h-[500px] rounded-[3rem] overflow-hidden mb-12 shadow-2xl border border-white/10 group">
                <img src={bgImage} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-105" alt={destName} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/40 to-transparent"></div>
                
                <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-between z-10">
                    <div className="flex justify-between items-start">
                        <button onClick={onBack} className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-full text-white flex items-center gap-2 transition-all border border-white/10 font-medium">
                            <ArrowLeft size={18}/> Back
                        </button>
                        
                        {/* Countdown Widget */}
                        <div className="hidden md:flex gap-4">
                             <div className="bg-black/40 backdrop-blur-xl p-4 rounded-3xl border border-white/10 text-right shadow-xl">
                                <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Departure in</div>
                                <div className="text-2xl font-mono font-bold text-white flex gap-2">
                                    <span className="bg-white/10 px-2 rounded">04</span>:<span className="bg-white/10 px-2 rounded">08</span>:<span className="bg-white/10 px-2 rounded">40</span>
                                </div>
                             </div>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                        <div className="space-y-4">
                            <h1 className="text-7xl md:text-9xl font-black text-white tracking-tighter drop-shadow-2xl capitalize leading-none">{destName}</h1>
                            <div className="flex flex-wrap gap-3">
                                <span className="bg-white/10 backdrop-blur-md px-5 py-2 rounded-full border border-white/10 flex items-center gap-2 text-white font-medium"><Calendar size={16} className="text-cyan-400"/> {searchData.departDate}</span>
                                <span className="bg-white/10 backdrop-blur-md px-5 py-2 rounded-full border border-white/10 flex items-center gap-2 text-white font-medium"><DollarSign size={16} className="text-emerald-400"/> {searchData.budget}</span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full lg:w-96 bg-black/60 backdrop-blur-xl p-5 rounded-3xl border border-white/10">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                <span>Trip Readiness</span>
                                <span className="text-white">{progress}%</span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-gradient-to-r from-cyan-500 to-purple-500" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- SPLIT LAYOUT --- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* LEFT: ACTION FEED (7 Cols) */}
                <div className="lg:col-span-7 space-y-8">
                    
                    {/* JOURNEY TIMELINE */}
                    <div className="bg-slate-900/50 backdrop-blur-sm border border-white/5 rounded-[2.5rem] p-8 relative">
                        <div className="flex items-center gap-3 mb-8">
                             <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20"><Plane size={24} className="text-white"/></div>
                             <h2 className="text-3xl font-bold text-white">Your Journey</h2>
                        </div>

                        <div className="relative pl-6 space-y-12">
                            {/* Vertical Line */}
                            <div className="absolute left-[35px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-blue-500 via-slate-700 to-emerald-500 opacity-30"></div>

                            {/* 1. ORIGIN */}
                            <div className="relative flex gap-6">
                                <div className="w-5 h-5 rounded-full bg-blue-500 border-4 border-slate-900 shadow-lg z-10 mt-1"></div>
                                <div className="flex-1 p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                    <h3 className="text-white font-bold text-lg">Drive to {originName} Airport</h3>
                                    <div className="flex items-center gap-4 mt-3">
                                        <button onClick={() => openDirectionsToAirport(originName)} className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors border border-blue-500/20 font-bold">
                                            <Navigation size={14}/> Get Directions
                                        </button>
                                        <span className="text-slate-400 text-sm flex items-center gap-2"><Clock size={14}/> ~45 min</span>
                                    </div>
                                </div>
                            </div>

                            {/* 2. FLIGHT SELECTION */}
                            <div className="relative flex gap-6">
                                <div className={`w-5 h-5 rounded-full border-4 border-slate-900 shadow-lg z-10 mt-1 transition-colors ${confirmedFlight ? 'bg-purple-500' : 'bg-slate-700'}`}></div>
                                <div className="flex-1">
                                    <div className="mb-4 flex justify-between items-center">
                                        <h3 className="text-white font-bold text-xl">Select Flight</h3>
                                        <span className="text-xs text-slate-500 uppercase tracking-wider">{originName} → {destName}</span>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        {confirmedFlight ? (
                                            <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/30 p-6 rounded-2xl flex justify-between items-center group">
                                                <div className="flex items-center gap-5">
                                                    <img 
                                                        src={getAirlineLogo(confirmedFlight.validatingAirlineCodes?.[0])} 
                                                        className="w-12 h-12 object-contain bg-white rounded-xl p-1" 
                                                        onError={(e) => e.target.style.display = 'none'}
                                                    />
                                                    <div>
                                                        <div className="font-bold text-white text-lg">Flight Confirmed</div>
                                                        <div className="text-sm text-purple-300 font-mono mt-1">
                                                            {confirmedFlight.validatingAirlineCodes?.[0] || 'Airline'} #{confirmedFlight.id}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button onClick={() => setConfirmedFlight(null)} className="text-sm font-bold text-white/50 hover:text-white transition-colors">Change</button>
                                            </motion.div>
                                        ) : (
                                            (transport.results || []).slice(0, 3).map((f, i) => (
                                                <div key={i} onClick={() => setConfirmedFlight(f)} className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-500/30 p-5 rounded-2xl cursor-pointer transition-all flex justify-between items-center group">
                                                    <div className="flex items-center gap-4">
                                                        <img 
                                                            src={getAirlineLogo(f.validatingAirlineCodes?.[0])} 
                                                            className="w-10 h-10 object-contain bg-white rounded-lg p-1 opacity-80 group-hover:opacity-100 transition-opacity" 
                                                            onError={(e) => e.target.style.display = 'none'}
                                                        />
                                                        <div>
                                                            <div className="font-bold text-white">{f.validatingAirlineCodes?.[0] || 'Unknown'}</div>
                                                            <div className="text-xs text-slate-400">08:30 - 20:15</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-white text-lg">{f.price?.currency} {f.price?.total}</div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                        {(!transport.results || transport.results.length === 0) && (
                                             <div className="text-slate-500 text-sm">Searching for best flights...</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 3. ARRIVAL */}
                            <div className="relative flex gap-6">
                                <div className="w-5 h-5 rounded-full bg-emerald-500 border-4 border-slate-900 shadow-lg z-10 mt-1 shadow-emerald-500/20"></div>
                                <div className="flex-1">
                                    <h3 className="text-white font-bold text-lg">Arrive in {destName}</h3>
                                    <p className="text-emerald-400/80 text-sm mt-1 font-mono">Welcome to the city</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* HOTEL SELECTION */}
                    <div className="bg-slate-900/50 backdrop-blur-sm border border-white/5 rounded-[2.5rem] p-8">
                         <div className="flex items-center gap-3 mb-8">
                             <div className="p-3 bg-purple-600 rounded-2xl shadow-lg shadow-purple-500/20"><Hotel size={24} className="text-white"/></div>
                             <h2 className="text-3xl font-bold text-white">Select Stay</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                            {hotels.length > 0 ? hotels.map((h, i) => (
                                <div key={i} className={`group relative rounded-2xl overflow-hidden aspect-[21/9] border transition-all cursor-pointer ${confirmedHotel?.name === h.name ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-white/10 hover:border-white/30'}`} onClick={() => setConfirmedHotel(h)}>
                                    <img src={h.image} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={h.name}/>
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent"></div>
                                    <div className="absolute bottom-0 left-0 p-6">
                                        <h3 className="font-bold text-white text-xl mb-1">{h.name}</h3>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-bold bg-white/20 text-white px-2 py-1 rounded backdrop-blur-md">{h.rating || '4.5'} ★</span>
                                            <span className="text-emerald-400 font-bold">{h.price || '$200'} / night</span>
                                        </div>
                                    </div>
                                    {confirmedHotel?.name === h.name && <div className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle size={12}/> SELECTED</div>}
                                </div>
                            )) : <div className="text-slate-500 text-center py-8">Loading hotels...</div>}
                        </div>
                    </div>
                </div>

                {/* RIGHT: STICKY DASHBOARD (5 Cols) */}
                <div className="lg:col-span-5 relative">
                    <div className="sticky top-6 space-y-6">
                        
                        {/* 1. AI LOGISTICS BRIDGE */}
                        <MiniMapBridge data={miniMapData} loading={bridgeLoading} />

                        {/* 2. LOCAL VIBES (EVENTS) */}
                        <div className="bg-[#0f1115] border border-white/10 rounded-[2.5rem] p-6 shadow-2xl">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Ticket size={18} className="text-pink-500"/> Local Vibes</h3>
                                <div className="flex gap-1">
                                    <button className="p-1 rounded hover:bg-white/10 text-slate-400"><ArrowLeft size={14}/></button>
                                    <button className="p-1 rounded hover:bg-white/10 text-slate-400"><ArrowRight size={14}/></button>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {(events || []).slice(0, 3).map((ev, i) => (
                                    <div key={i} className="bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/5 transition-colors cursor-pointer group flex justify-between items-start">
                                        <div>
                                            <div className="text-[10px] text-pink-400 font-bold uppercase tracking-wider mb-1 border border-pink-500/20 px-2 py-0.5 rounded-full w-fit">{ev.category || 'Event'}</div>
                                            <h4 className="text-white font-bold text-sm group-hover:text-pink-200 transition-colors line-clamp-1">{ev.title}</h4>
                                        </div>
                                        <div className="text-slate-500 group-hover:text-white transition-colors"><ExternalLink size={14}/></div>
                                    </div>
                                ))}
                                {events.length === 0 && <div className="text-center text-slate-500 text-xs py-4">No events found.</div>}
                            </div>
                        </div>

                        {/* 3. AI TIPS / WEATHER */}
                        <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900/40 border border-indigo-500/20 rounded-[2.5rem] p-6 flex items-center gap-4">
                            <div className="bg-indigo-500/20 p-3 rounded-full text-indigo-300"><CloudRain size={20}/></div>
                            <div>
                                <div className="text-xs text-indigo-200 font-bold uppercase">Travel Tip</div>
                                <div className="text-sm text-white leading-tight mt-1">Pack a light jacket. Evening temps drop to 12°C next week.</div>
                            </div>
                        </div>

                        {/* 4. PLANNER UNLOCK */}
                        {!miniMapData && (
                            <div className="p-6 border border-dashed border-white/10 rounded-[2rem] text-center">
                                <Lock size={24} className="text-slate-500 mx-auto mb-2"/>
                                <p className="text-slate-500 text-xs">Complete booking to unlock AI Planner</p>
                            </div>
                        )}
                        {miniMapData && (
                             <ItineraryTimeline destination={destName} days={3} budget={searchData.budget} interests={searchData.interests} />
                        )}

                    </div>
                </div>

            </div>
        </div>
      )}
    </div>
  );
};

export default ResultsPage;