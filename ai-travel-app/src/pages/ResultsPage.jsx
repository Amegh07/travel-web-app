import { useEffect, useState, useMemo } from 'react';
import { 
  ArrowLeft, Plane, Hotel, Calendar, DollarSign, Loader2, Car, 
  Ticket, MapPin, Clock, ArrowRight, X, CheckCircle, ExternalLink, 
  Lock, Sun, Navigation, Sparkles, CloudRain, Wind, Star, Filter, ChevronDown, Globe,
  Music, Utensils, Moon, Camera, Heart
} from 'lucide-react';
import { fetchFlights, fetchHotels, fetchEvents, fetchItinerary } from '../services/api'; 
import ItineraryTimeline from '../components/ItineraryTimeline';
import ChatBot from '../components/ChatBot'; 
import { motion, AnimatePresence } from 'framer-motion';

// --- HELPERS ---
const formatDuration = (ptString) => ptString ? ptString.replace("PT", "").toLowerCase() : "";
const getAirlineLogo = (code) => code ? `https://pics.avs.io/200/200/${code}.png` : '';
const calculateNights = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    return Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)));
};
const openDirectionsToAirport = (originName) => {
    if (!originName) return;
    const query = encodeURIComponent(`${originName} Airport`);
    window.open(`http://googleusercontent.com/maps.google.com/?q=${query}`, '_blank');
};

// --- COMPONENT: FLIGHT CARD ---
const FlightCard = ({ flight, isSelected, onSelect, showBook = false }) => {
    const isRoundTrip = flight.itineraries?.length > 1;
    const outbound = flight.itineraries?.[0];
    const returnLeg = flight.itineraries?.[1];
    const airlineCode = flight.validatingAirlineCodes?.[0];

    return (
        <div 
            onClick={() => onSelect(flight)}
            className={`
                relative p-6 rounded-3xl border transition-all cursor-pointer group
                ${isSelected 
                    ? 'bg-purple-900/20 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.15)]' 
                    : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-purple-500/30'}
            `}
        >
            {isSelected && <div className="absolute top-6 right-6 text-purple-400"><CheckCircle size={24} fill="currentColor" className="text-black" /></div>}

            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-white rounded-2xl p-2 flex items-center justify-center shadow-lg">
                        <img src={getAirlineLogo(airlineCode)} alt={airlineCode} className="max-w-full max-h-full" />
                    </div>
                    <div>
                        <div className="font-bold text-white text-xl">{airlineCode} Airlines</div>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <span className="bg-white/10 px-2.5 py-0.5 rounded-md text-slate-300 font-medium">{isRoundTrip ? 'Round Trip' : 'One Way'}</span>
                            <span>• {flight.numberOfBookableSeats} seats</span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-black text-white tracking-tight">{flight.price?.currency} {flight.price?.total}</div>
                    {showBook && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); window.open(`https://www.google.com/search?q=book+flight+${airlineCode}`, '_blank'); }} 
                            className="mt-3 text-sm bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-4 py-2 rounded-full flex items-center gap-2 ml-auto transition-transform hover:scale-105"
                        >
                            <Globe size={14}/> Book Now
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm">
                    <Plane size={16} className="text-slate-500 rotate-45"/>
                    <div className="flex-1 flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5">
                        <span className="font-mono text-white text-lg font-bold">{outbound?.segments[0]?.departure?.iataCode}</span>
                        <div className="flex flex-col items-center w-32">
                            <div className="h-[2px] w-full bg-slate-700 relative">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-slate-500 rounded-full"></div>
                            </div>
                            <span className="text-[11px] text-slate-400 mt-1 uppercase tracking-wide font-medium">{formatDuration(outbound?.duration)}</span>
                        </div>
                        <span className="font-mono text-white text-lg font-bold">{outbound?.segments[outbound.segments.length - 1]?.arrival?.iataCode}</span>
                    </div>
                </div>
                {isRoundTrip && (
                    <div className="flex items-center gap-4 text-sm">
                        <Plane size={16} className="text-slate-500 -rotate-135"/>
                        <div className="flex-1 flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5">
                            <span className="font-mono text-white text-lg font-bold">{returnLeg?.segments[0]?.departure?.iataCode}</span>
                            <div className="flex flex-col items-center w-32">
                                <div className="h-[2px] w-full bg-slate-700 relative">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-slate-500 rounded-full"></div>
                                </div>
                                <span className="text-[11px] text-slate-400 mt-1 uppercase tracking-wide font-medium">{formatDuration(returnLeg?.duration)}</span>
                            </div>
                            <span className="font-mono text-white text-lg font-bold">{returnLeg?.segments[returnLeg.segments.length - 1]?.arrival?.iataCode}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- COMPONENT: HOTEL CARD ---
const HotelCard = ({ hotel, isSelected, onSelect, nights, showBook = false }) => {
    const rawPrice = parseFloat(hotel.price?.replace(/[^0-9.]/g, '') || "200");
    const totalPrice = rawPrice * nights;

    return (
        <div 
            onClick={() => onSelect(hotel)}
            className={`
                group relative rounded-3xl overflow-hidden border transition-all cursor-pointer flex flex-col
                ${isSelected 
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)]' 
                    : 'border-white/10 hover:border-white/30 hover:bg-white/5'}
            `}
        >
            <div className="relative h-56 overflow-hidden bg-slate-800">
                <img 
                    src={hotel.image} 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                    alt={hotel.name}
                    onError={(e) => e.target.src = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80"}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent"></div>
                {isSelected && <div className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg"><CheckCircle size={12}/> SELECTED</div>}
                <div className="absolute bottom-4 left-4 flex gap-2">
                    <span className="text-xs font-bold bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-lg flex items-center gap-1">
                        <Star size={12} className="text-yellow-400 fill-yellow-400"/> {hotel.rating || "4.5"}
                    </span>
                </div>
            </div>

            <div className="p-6 flex-1 flex flex-col">
                <h3 className="font-bold text-white text-xl leading-tight mb-2">{hotel.name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-6 uppercase tracking-wide font-medium">
                    <MapPin size={12}/> {hotel.distance || "City Center"}
                </div>

                <div className="mt-auto border-t border-white/10 pt-4 flex justify-between items-end">
                    <div>
                        <div className="text-xs text-slate-500 font-mono mb-1">{nights} Nights • ${rawPrice}/night</div>
                        <div className="text-2xl font-black text-emerald-400">${totalPrice} <span className="text-xs text-slate-500 font-normal">Total</span></div>
                    </div>
                    {showBook && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); window.open(`https://www.google.com/search?q=book+${hotel.name}`, '_blank'); }} 
                            className="text-sm bg-white text-black font-bold px-4 py-2 rounded-xl hover:scale-105 transition-transform"
                        >
                            Book Stay
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT: EVENT CARD ---
const EventCard = ({ event, isAdded, onToggle }) => {
    const getIcon = (cat) => {
        const c = (cat || "").toLowerCase();
        if (c.includes('music') || c.includes('concert')) return <Music size={14}/>;
        if (c.includes('food') || c.includes('dinner')) return <Utensils size={14}/>;
        if (c.includes('night') || c.includes('party')) return <Moon size={14}/>;
        return <Camera size={14}/>;
    };

    return (
        <div className={`relative flex gap-5 p-5 rounded-3xl border transition-all ${isAdded ? 'bg-pink-500/10 border-pink-500' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
            <div className="w-28 h-28 rounded-2xl overflow-hidden bg-slate-800 flex-shrink-0">
                <img 
                    src={event.image || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=400&q=80"} 
                    className="w-full h-full object-cover" 
                    alt={event.title} 
                />
            </div>
            <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5 bg-pink-500/10 px-2 py-1 rounded-md">
                        {getIcon(event.category)} {event.category || "Experience"}
                    </div>
                    <button onClick={() => onToggle(event)} className={`p-2 rounded-full transition-all ${isAdded ? 'bg-pink-500 text-white' : 'bg-white/10 text-slate-400 hover:bg-white/20'}`}>
                        {isAdded ? <CheckCircle size={18}/> : <Heart size={18}/>}
                    </button>
                </div>
                <h4 className="text-white font-bold text-lg leading-tight mb-1">{event.title}</h4>
                <p className="text-slate-400 text-sm line-clamp-2 mb-3">{event.description || "A wonderful local experience you shouldn't miss."}</p>
                
                <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                        <span>{event.date || "Daily"}</span>
                        <span>• {event.price || "Check Price"}</span>
                    </div>
                    {event.url && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); window.open(event.url, '_blank'); }}
                            className="flex items-center gap-1.5 text-xs bg-pink-600 hover:bg-pink-500 text-white px-3 py-1.5 rounded-lg font-bold transition-colors"
                        >
                            <Ticket size={12}/> Tickets
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- MODALS ---
const FlightModal = ({ isOpen, onClose, flights, selectedId, onSelect }) => {
    const [sort, setSort] = useState('cheap');
    const sortedFlights = useMemo(() => { if (!flights) return []; return [...flights].sort((a, b) => sort === 'cheap' ? parseFloat(a.price.total) - parseFloat(b.price.total) : a.itineraries[0].duration.localeCompare(b.itineraries[0].duration)); }, [flights, sort]);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-2xl bg-[#0f1115] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#1a1d24]"><div><h2 className="text-2xl font-bold text-white">All Flights</h2><p className="text-slate-400 text-sm">{flights.length} options</p></div><button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={24}/></button></div>
                <div className="p-4 flex gap-3 border-b border-white/10 bg-black/20 overflow-x-auto">{['cheap', 'fast'].map(type => (<button key={type} onClick={() => setSort(type)} className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${sort === type ? 'bg-white text-black border-white' : 'text-slate-400 border-white/20'}`}>{type === 'cheap' ? 'Cheapest' : 'Fastest'}</button>))}</div>
                <div className="overflow-y-auto p-4 space-y-4">{sortedFlights.map((f, i) => <FlightCard key={i} flight={f} isSelected={selectedId === f.id} onSelect={(fl) => { onSelect(fl); onClose(); }} showBook={true} />)}</div>
            </div>
        </div>
    );
};

const HotelModal = ({ isOpen, onClose, hotels, selectedId, onSelect, nights }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-4xl bg-[#0f1115] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#1a1d24]"><div><h2 className="text-2xl font-bold text-white">All Stays</h2><p className="text-slate-400 text-sm">{hotels.length} options available</p></div><button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={24}/></button></div>
                <div className="overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">{hotels.map((h, i) => <HotelCard key={i} hotel={h} nights={nights} isSelected={selectedId === h.id} onSelect={(ht) => { onSelect(ht); onClose(); }} showBook={true} />)}</div>
            </div>
        </div>
    );
};

const EventModal = ({ isOpen, onClose, events, addedEvents, onToggle }) => {
    const [filter, setFilter] = useState('all');
    const categories = ['all', ...new Set(events.map(e => e.category || 'Other'))];
    const filteredEvents = filter === 'all' ? events : events.filter(e => (e.category || 'Other') === filter);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-2xl bg-[#0f1115] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#1a1d24]"><div><h2 className="text-2xl font-bold text-white">Local Vibes</h2><p className="text-slate-400 text-sm">{events.length} experiences found</p></div><button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={24}/></button></div>
                <div className="p-4 flex gap-2 border-b border-white/10 bg-black/20 overflow-x-auto">{categories.slice(0, 5).map(cat => (<button key={cat} onClick={() => setFilter(cat)} className={`px-4 py-1.5 rounded-full text-xs font-bold border capitalize transition-all ${filter === cat ? 'bg-pink-500 text-white border-pink-500' : 'text-slate-400 border-white/20 hover:border-white'}`}>{cat}</button>))}</div>
                <div className="overflow-y-auto p-4 space-y-4">{filteredEvents.map((ev, i) => <EventCard key={i} event={ev} isAdded={addedEvents.some(e => e.id === ev.id)} onToggle={onToggle} />)}{filteredEvents.length === 0 && <div className="text-center text-slate-500 py-12">No events found in this category.</div>}</div>
            </div>
        </div>
    );
};

// --- MINI-MAP BRIDGE ---
const MiniMapBridge = ({ data, loading }) => (
    <div className="relative w-full h-64 bg-[#0f1115] rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col group">
        <div className="absolute inset-0 opacity-50 transition-opacity group-hover:opacity-70">
            <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)]"></div>
            {data && !loading && (
                <svg className="absolute inset-0 w-full h-full">
                    <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, ease: "easeInOut" }} d="M 80 80 Q 400 150 700 80" stroke="url(#gradient-line)" strokeWidth="4" fill="none" strokeLinecap="round" />
                    <defs><linearGradient id="gradient-line"><stop stopColor="#3b82f6" /><stop offset="1" stopColor="#10b981" /></linearGradient></defs>
                    <circle cx="80" cy="80" r="6" fill="#3b82f6" className="animate-ping"/>
                    <circle cx="700" cy="80" r="6" fill="#10b981" className="animate-ping"/>
                </svg>
            )}
        </div>
        <div className="relative z-10 flex-1 p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start"><div className="inline-flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full"><Sparkles size={12} className="text-purple-400" /><span className="text-[10px] font-bold text-white uppercase tracking-wider">AI Logistics</span></div></div>
            {loading ? <div className="space-y-3"><div className="h-4 bg-white/10 rounded w-3/4 animate-pulse"/><div className="h-4 bg-white/10 rounded w-1/2 animate-pulse"/></div> : data ? (<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4"><div className="flex justify-between items-end"><div><div className="text-xs text-slate-400 uppercase font-bold mb-1">Transfer</div><div className="text-3xl font-bold text-white">{data.duration}</div><div className="flex items-center gap-2 text-emerald-400 text-sm font-bold mt-1"><Car size={14}/> {data.distance} • {data.traffic}</div></div><button onClick={() => window.open(data.routeUrl, '_blank')} className="bg-white text-black p-3 rounded-xl hover:scale-105 transition-transform shadow-lg"><Navigation size={20}/></button></div></motion.div>) : <div className="text-slate-500 text-sm text-center">Select Flight & Hotel to unlock route.</div>}
        </div>
    </div>
);

// --- MAIN PAGE ---
const ResultsPage = ({ searchData, onBack }) => {
  const [transport, setTransport] = useState({ type: 'loading', data: [], journey: null });
  const [hotels, setHotels] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroImage, setHeroImage] = useState(null);
  const [keyStatus, setKeyStatus] = useState("Checking..."); 
  
  // MODAL STATES
  const [isFlightModalOpen, setIsFlightModalOpen] = useState(false);
  const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  // 🔒 AI STATE
  const [confirmedFlight, setConfirmedFlight] = useState(null);
  const [confirmedHotel, setConfirmedHotel] = useState(null);
  const [addedEvents, setAddedEvents] = useState([]); 
  const [miniMapData, setMiniMapData] = useState(null); 
  const [bridgeLoading, setBridgeLoading] = useState(false);
  const [aiItinerary, setAiItinerary] = useState(null); 
  const [plannerLoading, setPlannerLoading] = useState(false);

  // DYNAMIC DATA
  const getName = (data) => data?.name || data || "Destination";
  const rawDestName = searchData ? getName(searchData.toCity) : "Destination";
  const originName = searchData ? getName(searchData.fromCity) : "Origin";
  const destName = rawDestName.replace(/\b(INTL|INTERNATIONAL|AIRPORT|AIR PORT)\b/gi, "").trim();
  const arrivalDate = searchData?.departDate;
  const departureDate = searchData?.returnDate || new Date(new Date(arrivalDate).setDate(new Date(arrivalDate).getDate() + 3)).toISOString().split('T')[0];
  const nights = calculateNights(arrivalDate, departureDate);

  // SELECTION TOGGLES
  const toggleFlight = (flight) => { if (confirmedFlight?.id === flight.id) { setConfirmedFlight(null); setAiItinerary(null); } else setConfirmedFlight(flight); };
  const toggleHotel = (hotel) => { if (confirmedHotel?.id === hotel.id) { setConfirmedHotel(null); setAiItinerary(null); } else setConfirmedHotel(hotel); };
  const toggleEvent = (event) => {
      if (addedEvents.some(e => e.id === event.id)) {
          setAddedEvents(addedEvents.filter(e => e.id !== event.id));
      } else {
          setAddedEvents([...addedEvents, event]);
      }
  };

  // --- 1. INITIAL DATA FETCH ---
  useEffect(() => {
    if (!searchData) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const UNSPLASH_KEY = "dNatqPd4crOANylynm5YUCkNG2NAfUjmMdwirbo7xDo";
        setKeyStatus("✅ KEY ACTIVE");
        
        // 1. BANNER IMAGE
        const primaryQuery = `${destName} tourism`;
        fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(primaryQuery)}&orientation=landscape&per_page=1&client_id=${UNSPLASH_KEY}`)
            .then(res => res.json())
            .then(data => {
                if (data.results && data.results.length > 0) setHeroImage(data.results[0].urls.regular);
                else {
                    fetch(`https://api.unsplash.com/search/photos?query=India%20travel&orientation=landscape&per_page=1&client_id=${UNSPLASH_KEY}`)
                        .then(r => r.json()).then(d => { if (d.results && d.results.length > 0) setHeroImage(d.results[0].urls.regular); });
                }
            }).catch(err => console.error(err));

        // 2. MAIN DATA
        const [transportData, hotelData, eventData] = await Promise.all([
            fetchFlights(originName, destName, searchData.departDate),
            fetchHotels(destName),
            fetchEvents(destName, searchData.departDate)
        ]);

        // 3. HOTEL & EVENT IMAGES (BATCH FETCH)
        if (UNSPLASH_KEY) {
            if (Array.isArray(hotelData) && hotelData.length > 0) {
                const hotelQuery = `${destName} luxury hotel interior`;
                fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(hotelQuery)}&per_page=${hotelData.length}&client_id=${UNSPLASH_KEY}`)
                .then(r => r.json()).then(d => {
                     if (d.results) hotelData.forEach((h, i) => { if (d.results[i]) h.image = d.results[i].urls.regular; });
                });
            }
            if (Array.isArray(eventData) && eventData.length > 0) {
                 const eventsNeedingImages = eventData.filter(e => !e.image);
                 if (eventsNeedingImages.length > 0) {
                     const eventQuery = `${destName} culture festival`;
                     fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(eventQuery)}&per_page=${eventsNeedingImages.length}&client_id=${UNSPLASH_KEY}`)
                     .then(r => r.json()).then(d => {
                          if (d.results) eventsNeedingImages.forEach((e, i) => { if (d.results[i]) e.image = d.results[i].urls.small; });
                     });
                 }
            }
        }

        setTransport(transportData);
        setHotels(Array.isArray(hotelData) ? hotelData : []);
        setEvents(Array.isArray(eventData) ? eventData : []); 
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    };
    loadData();
  }, [searchData, destName]);

  // --- 2. AI UNLOCK LOGIC ---
  useEffect(() => {
    if (confirmedFlight && confirmedHotel && !aiItinerary && !plannerLoading) {
        setPlannerLoading(true);
        setBridgeLoading(true);
        const buildPlan = async () => {
            const payload = {
                destination: destName,
                dates: { arrival: arrivalDate, departure: departureDate }, 
                hotel: confirmedHotel,
                budget: { total: searchData.budget, currency: "USD", remaining: 2000 },
                interests: searchData.interests || []
            };
            const plan = await fetchItinerary(payload);
            setAiItinerary(plan);
            setPlannerLoading(false);
            setTimeout(() => {
                const airline = confirmedFlight.validatingAirlineCodes?.[0] || 'Airline';
                setMiniMapData({
                    origin: `${airline} Terminal`,
                    destination: confirmedHotel.name,
                    distance: "24 km", duration: "35 min", traffic: "Light Traffic",
                    routeUrl: `http://googleusercontent.com/maps.google.com/?q=${encodeURIComponent(confirmedHotel.name)}`
                });
                setBridgeLoading(false);
            }, 1000);
        };
        buildPlan();
    }
  }, [confirmedFlight, confirmedHotel]);

  const progress = (confirmedFlight ? 50 : 0) + (confirmedHotel ? 50 : 0);
  const bgImage = heroImage || `https://images.unsplash.com/photo-1480796927426-f609979314bd?auto=format&fit=crop&w=1600&q=80`;

  if (!searchData) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-cyan-500/30">
      <ChatBot destination={destName} />
      
      {/* MODALS */}
      <FlightModal isOpen={isFlightModalOpen} onClose={() => setIsFlightModalOpen(false)} flights={transport.results} selectedId={confirmedFlight?.id} onSelect={toggleFlight} />
      <HotelModal isOpen={isHotelModalOpen} onClose={() => setIsHotelModalOpen(false)} hotels={hotels} nights={nights} selectedId={confirmedHotel?.id} onSelect={toggleHotel} />
      <EventModal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} events={events} addedEvents={addedEvents} onToggle={toggleEvent} />

      {/* DEBUG */}
      <div className="fixed top-4 left-4 z-50 bg-black/50 backdrop-blur px-3 py-1 rounded-full border border-white/10 text-[10px] font-mono text-emerald-400">UNSPLASH: {keyStatus}</div>
      
      {loading ? (
        <div className="h-screen flex flex-col items-center justify-center z-50 fixed inset-0 bg-[#020617]"><Loader2 className="animate-spin text-cyan-500 mb-4" size={48} /><h2 className="text-2xl font-bold text-white animate-pulse">Designing trip to {destName}...</h2></div>
      ) : (
        <div className="max-w-[1200px] mx-auto p-4 lg:p-8 pb-32 animate-fade-in space-y-12">
            
            {/* 1. HERO */}
            <div className="relative w-full h-[500px] rounded-[3rem] overflow-hidden shadow-2xl border border-white/10 group">
                <img src={bgImage} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-105" alt={destName} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/40 to-transparent"></div>
                <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-between z-10">
                    <div className="flex justify-between items-start"><button onClick={onBack} className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-full text-white flex items-center gap-2 transition-all border border-white/10 font-medium"><ArrowLeft size={18}/> Back</button></div>
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                        <div className="space-y-4 max-w-4xl">
                            <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter drop-shadow-2xl uppercase leading-none break-words">{destName}</h1>
                            <div className="flex flex-wrap gap-3"><span className="bg-white/10 backdrop-blur-md px-5 py-2 rounded-full border border-white/10 flex items-center gap-2 text-white font-medium"><Calendar size={16} className="text-cyan-400"/> {arrivalDate} - {departureDate}</span></div>
                        </div>
                        <div className="w-full lg:w-96 bg-black/60 backdrop-blur-xl p-5 rounded-3xl border border-white/10">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2"><span>Trip Readiness</span><span className="text-white">{progress}%</span></div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-gradient-to-r from-cyan-500 to-purple-500" /></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. JOURNEY (FLIGHTS) */}
            <div className="bg-slate-900/50 backdrop-blur-sm border border-white/5 rounded-[2.5rem] p-8 relative">
                <div className="flex items-center gap-3 mb-8"><div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20"><Plane size={24} className="text-white"/></div><h2 className="text-3xl font-bold text-white">Your Journey</h2></div>
                <div className="space-y-6">
                    <div className="relative flex gap-6 p-5 rounded-2xl bg-white/5 border border-white/5">
                        <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30 text-blue-400"><Car size={20}/></div>
                        <div className="flex-1">
                            <h3 className="text-white font-bold text-lg">Drive to {originName} Airport</h3>
                            <button onClick={() => openDirectionsToAirport(originName)} className="text-xs text-blue-300 font-bold mt-2 hover:underline flex items-center gap-1">Get Directions <ExternalLink size={10}/></button>
                        </div>
                    </div>
                    {(transport.results || []).slice(0, 3).map((f, i) => <FlightCard key={i} flight={f} isSelected={confirmedFlight?.id === f.id} onSelect={toggleFlight} />)}
                    <button onClick={() => setIsFlightModalOpen(true)} className="w-full py-4 rounded-2xl border border-dashed border-white/20 text-slate-400 hover:text-white hover:border-white/50 hover:bg-white/5 transition-all text-sm font-bold flex items-center justify-center gap-2">View all {transport.results?.length} flights <ChevronDown size={14}/></button>
                </div>
            </div>

            {/* 3. STAYS (HOTELS) */}
            <div className="bg-slate-900/50 backdrop-blur-sm border border-white/5 rounded-[2.5rem] p-8">
                <div className="flex items-center gap-3 mb-8"><div className="p-3 bg-purple-600 rounded-2xl shadow-lg shadow-purple-500/20"><Hotel size={24} className="text-white"/></div><h2 className="text-3xl font-bold text-white">Select Stay</h2></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{hotels.slice(0, 3).map((h, i) => <HotelCard key={i} hotel={h} nights={nights} isSelected={confirmedHotel?.id === h.id} onSelect={toggleHotel} />)}</div>
                <button onClick={() => setIsHotelModalOpen(true)} className="w-full mt-6 py-4 rounded-2xl border border-dashed border-white/20 text-slate-400 hover:text-white hover:border-white/50 hover:bg-white/5 transition-all text-sm font-bold flex items-center justify-center gap-2">View all {hotels.length} hotels <ChevronDown size={14}/></button>
            </div>

            {/* 4. LOCAL VIBES (EVENTS) */}
            <div className="bg-slate-900/50 backdrop-blur-sm border border-white/5 rounded-[2.5rem] p-8">
                <div className="flex items-center gap-3 mb-8"><div className="p-3 bg-pink-600 rounded-2xl shadow-lg shadow-pink-500/20"><Ticket size={24} className="text-white"/></div><h2 className="text-3xl font-bold text-white">Local Vibes</h2></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{(events || []).slice(0, 4).map((ev, i) => <EventCard key={i} event={ev} isAdded={addedEvents.some(e => e.id === ev.id)} onToggle={toggleEvent} />)}</div>
                <button onClick={() => setIsEventModalOpen(true)} className="w-full mt-6 py-4 rounded-2xl border border-dashed border-white/20 text-slate-400 hover:text-white hover:border-white/50 hover:bg-white/5 transition-all text-sm font-bold flex items-center justify-center gap-2">Discover more vibes <ChevronDown size={14}/></button>
            </div>

            {/* 5. LOGISTICS (MAP) */}
            <div className="relative">
                <MiniMapBridge data={miniMapData} loading={bridgeLoading} />
            </div>

            {/* 6. AI PLANNER (BOTTOM) */}
            <div className="bg-slate-900/50 backdrop-blur-sm border border-white/5 rounded-[2.5rem] p-8 relative min-h-[400px]">
                {!aiItinerary ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                        {plannerLoading ? (
                            <div className="flex flex-col items-center gap-4"><Loader2 className="animate-spin text-purple-500" size={48}/><p className="text-purple-300 font-bold animate-pulse text-lg">AI Architect is crafting your perfect trip...</p></div>
                        ) : (
                            <><Lock size={48} className="text-slate-600 mb-6"/><h3 className="text-white font-bold text-2xl">Itinerary Locked</h3><p className="text-slate-500 mt-2 max-w-md">Select a Flight and Hotel above to unlock your personalized Llama-70B daily plan.</p></>
                        )}
                    </div>
                ) : (
                    <ItineraryTimeline plan={aiItinerary} />
                )}
            </div>

        </div>
      )}
    </div>
  );
};

export default ResultsPage;