import { useEffect, useState, useMemo } from 'react';
import {
    ArrowLeft, Plane, Hotel, Calendar, DollarSign, Loader2, Car,
    Ticket, MapPin, X, CheckCircle, ExternalLink,
    Lock, Navigation, Sparkles, Star, ChevronDown, Globe,
    Music, Utensils, Moon, Camera, Heart
} from 'lucide-react';
import { fetchFlights, fetchHotels, fetchEvents, fetchItinerary } from '../services/api';
import ItineraryTimeline from '../components/ItineraryTimeline';
import ChatBot from '../components/ChatBot';
import { motion } from 'framer-motion';

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
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
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
                relative p-6 rounded-2xl border transition-all cursor-pointer group bg-[#FDFCFA]
                ${isSelected
                    ? 'border-[#B89A6A] shadow-[0_4px_24px_rgba(184,154,106,0.15)]'
                    : 'border-[#E8E4DC] hover:border-[#B89A6A]/50 hover:shadow-[0_4px_16px_rgba(28,25,22,0.06)]'}
            `}
        >
            {isSelected && <div className="absolute top-5 right-5 text-[#B89A6A]"><CheckCircle className="w-5 h-5" /></div>}

            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#F4F1EB] rounded-xl p-2 flex items-center justify-center border border-[#E8E4DC] font-bold text-[#B89A6A]">
                        {airlineCode ? <img src={getAirlineLogo(airlineCode)} alt={airlineCode} className="max-w-full max-h-full" /> : 'AF'}
                    </div>
                    <div>
                        <div className="serif-text font-medium text-[#1C1916] text-xl tracking-tight">{airlineCode} Airlines</div>
                        <div className="flex items-center gap-2 text-xs text-[#9C9690] mt-1 tracking-widest uppercase">
                            <span className="bg-[#F4F1EB] px-2 py-0.5 rounded text-[#9C9690] font-medium border border-[#E8E4DC] text-[10px]">
                                {isRoundTrip ? 'Round Trip' : 'One Way'}
                            </span>
                            <span>· {flight.numberOfBookableSeats} seats</span>
                        </div>
                    </div>
                </div>
                <div className="text-right pr-8">
                    <div className="serif-text text-3xl font-light text-[#1C1916] tracking-tight">{(flight.price?.currency === 'INR' ? '₹' : flight.price?.currency === 'EUR' ? '€' : flight.price?.currency === 'GBP' ? '£' : '$')} {parseFloat(flight.price?.total || 0).toFixed(2)}</div>
                    {showBook && (
                        <button
                            onClick={(e) => { e.stopPropagation(); window.open(`https://www.google.com/search?q=book+flight+${airlineCode}`, '_blank'); }}
                            className="mt-3 text-[10px] bg-[#B89A6A] hover:bg-[#A8876A] text-[#FDFCFA] font-medium px-4 py-2 rounded-xl flex items-center gap-2 ml-auto transition-all tracking-widest uppercase"
                        >
                            <Globe size={14} /> Book Now
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-4 text-sm">
                    <Plane className="w-4 h-4 text-[#B89A6A] rotate-45" />
                    <div className="flex-1 flex justify-between items-center bg-[#F4F1EB] p-3 rounded-xl border border-[#E8E4DC]">
                        <span className="serif-text text-[#1C1916] text-lg font-light tracking-wider">{outbound?.segments[0]?.departure?.iataCode || 'DEP'}</span>
                        <div className="flex flex-col items-center w-28">
                            <div className="h-px w-full bg-gradient-to-r from-[#E8E4DC] via-[#B89A6A] to-[#E8E4DC]"></div>
                            <span className="text-[10px] text-[#9C9690] mt-1 uppercase tracking-widest">{formatDuration(outbound?.duration)}</span>
                        </div>
                        <span className="serif-text text-[#1C1916] text-lg font-light tracking-wider">{outbound?.segments[outbound.segments.length - 1]?.arrival?.iataCode || 'ARR'}</span>
                    </div>
                </div>
                {isRoundTrip && (
                    <div className="flex items-center gap-4 text-sm">
                        <Plane className="w-4 h-4 text-[#B89A6A] rotate-[225deg]" />
                        <div className="flex-1 flex justify-between items-center bg-[#F4F1EB] p-3 rounded-xl border border-[#E8E4DC]">
                            <span className="serif-text text-[#1C1916] text-lg font-light tracking-wider">{returnLeg?.segments[0]?.departure?.iataCode || 'ARR'}</span>
                            <div className="flex flex-col items-center w-28">
                                <div className="h-px w-full bg-gradient-to-r from-[#E8E4DC] via-[#B89A6A] to-[#E8E4DC]"></div>
                                <span className="text-[10px] text-[#9C9690] mt-1 uppercase tracking-widest">{formatDuration(returnLeg?.duration)}</span>
                            </div>
                            <span className="serif-text text-[#1C1916] text-lg font-light tracking-wider">{returnLeg?.segments[returnLeg.segments.length - 1]?.arrival?.iataCode || 'DEP'}</span>
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
    const currencyMatch = hotel.price?.match(/[$€£₹]/);
    const currencySymbol = currencyMatch ? currencyMatch[0] : '₹';
    const totalPrice = rawPrice * nights;

    return (
        <div
            onClick={() => onSelect(hotel)}
            className={`
                group relative rounded-2xl overflow-hidden border transition-all cursor-pointer flex flex-col bg-[#FDFCFA]
                ${isSelected
                    ? 'border-[#B89A6A] shadow-[0_8px_32px_rgba(184,154,106,0.18)]'
                    : 'border-[#E8E4DC] shadow-[0_1px_4px_rgba(28,25,22,0.05)] hover:border-[#B89A6A]/40 hover:shadow-[0_8px_24px_rgba(28,25,22,0.08)]'}
            `}
        >
            <div className="relative h-56 overflow-hidden bg-[#2E3C3A]">
                <img
                    src={hotel.image}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    alt={hotel.name}
                    onError={(e) => e.target.src = "https://images.unsplash.com/photo-1542314831-c6a4d14248cb?w=800&q=80"}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1C1916]/60 via-transparent to-transparent"></div>
                {isSelected && (
                    <div className="absolute top-4 right-4 bg-[#B89A6A] text-[#FDFCFA] px-3 py-1 rounded-full text-[10px] font-medium flex items-center gap-1 tracking-widest uppercase">
                        <CheckCircle className="w-3 h-3" /> Selected
                    </div>
                )}
                <div className="absolute bottom-4 left-4 flex gap-2">
                    <span className="text-[10px] font-medium bg-black/50 backdrop-blur-md text-[#FDFCFA] px-3 py-1.5 rounded-lg flex items-center gap-1 tracking-widest uppercase">
                        <Star className="w-3 h-3 text-[#B89A6A] fill-current" /> {hotel.rating || "4.8"}
                    </span>
                </div>
            </div>

            <div className="p-5 flex-1 flex flex-col relative groups-hover:opacity-100">
                <h3 className="serif-text font-light text-[#1C1916] text-2xl leading-tight mb-1.5 tracking-tight">{hotel.name}</h3>
                <div className="flex items-center gap-1.5 text-[10px] text-[#9C9690] mb-5 uppercase tracking-widest font-medium">
                    <MapPin className="w-3 h-3" /> {hotel.distance || "City Center"}
                </div>

                <div className="absolute top-4 right-4 bg-[#FDFCFA]/90 backdrop-blur-md border border-[#E8E4DC] p-1.5 rounded-xl shadow-[0_4px_16px_rgba(28,25,22,0.06)] flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                    <button
                        onClick={(e) => { e.stopPropagation(); window.open(`https://www.google.com/search?q=photos+${encodeURIComponent(hotel.name)}`, '_blank'); }}
                        className="text-[#9C9690] hover:text-[#1C1916] transition-colors p-2"
                        title="View Photos"
                    >
                        <Camera className="w-4 h-4" />
                    </button>
                    <div className="w-8 h-[1px] bg-[#E8E4DC]"></div>
                    <button
                        onClick={(e) => { e.stopPropagation(); window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.name)}`, '_blank'); }}
                        className="text-[#9C9690] hover:text-[#B89A6A] transition-colors p-2"
                        title="View on Map"
                    >
                        <Navigation className="w-4 h-4" />
                    </button>
                </div>

                <div className="mt-auto border-t border-[#E8E4DC] pt-4 flex justify-between items-end">
                    <div>
                        <div className="text-[10px] text-[#9C9690] tracking-widest uppercase mb-1">{nights} Nights · {currencySymbol} {rawPrice.toFixed(2)}/night</div>
                        <div className="serif-text text-2xl font-light text-[#1C1916]">{currencySymbol} {totalPrice.toFixed(2)} <span className="text-[10px] text-[#9C9690] font-normal tracking-widest uppercase">Total</span></div>
                    </div>
                    {showBook && (
                        <button
                            onClick={(e) => { e.stopPropagation(); window.open(`https://www.google.com/search?q=book+${hotel.name}`, '_blank'); }}
                            className="text-[10px] bg-[#F4F1EB] hover:bg-[#E8E4DC] border border-[#E8E4DC] text-[#1C1916] font-medium px-4 py-2 rounded-xl transition-all tracking-widest uppercase"
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
        if (c.includes('music') || c.includes('concert')) return <Music className="w-3 h-3" />;
        if (c.includes('food') || c.includes('dinner')) return <Utensils className="w-3 h-3" />;
        if (c.includes('night') || c.includes('party')) return <Moon className="w-3 h-3" />;
        return <Camera className="w-3 h-3" />;
    };

    return (
        <div className={`relative flex gap-4 p-4 rounded-2xl border transition-all bg-[#FDFCFA] ${isAdded ? 'border-[#B89A6A]/50 shadow-[0_4px_16px_rgba(184,154,106,0.1)]' : 'border-[#E8E4DC] hover:shadow-[0_4px_16px_rgba(28,25,22,0.06)]'}`}>
            <div className="w-28 h-28 rounded-xl overflow-hidden bg-[#F4F1EB] flex-shrink-0 relative">
                <img
                    src={event.image || "https://images.unsplash.com/photo-1543349689-cead14c99551?w=400&q=80"}
                    className="w-full h-full object-cover relative z-10"
                    alt={event.title}
                />
            </div>
            <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <div className="text-[10px] font-medium uppercase tracking-widest text-[#B89A6A] flex items-center gap-1.5 bg-[#F4F1EB] px-2 py-1 rounded border border-[#E8E4DC]">
                        {getIcon(event.category)} {event.category || "Culture"}
                    </div>
                    <button onClick={() => onToggle(event)} className={`p-1.5 rounded-full transition-all border ${isAdded ? 'bg-[#B89A6A] text-[#FDFCFA] border-[#B89A6A]' : 'bg-[#F4F1EB] text-[#9C9690] border-[#E8E4DC] hover:border-[#B89A6A]/50'}`}>
                        {isAdded ? <CheckCircle className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
                    </button>
                </div>
                <h4 className="serif-text text-[#1C1916] font-light text-xl leading-tight mb-1 tracking-tight pr-4">{event.title}</h4>
                <p className="text-[#9C9690] text-xs line-clamp-2 mb-3 leading-relaxed">{event.description || "A remarkable local experience not to be missed."}</p>

                <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[10px] text-[#9C9690] tracking-widest uppercase">
                        <span>{event.date || "Daily"}</span>
                        <span>· {event.price || "Check Price"}</span>
                    </div>
                    {event.url && (
                        <button
                            onClick={(e) => { e.stopPropagation(); window.open(event.url, '_blank'); }}
                            className="bg-[#F4F1EB] hover:bg-[#E8E4DC] border border-[#E8E4DC] text-[#1C1916] px-2.5 py-1 rounded-lg transition-colors"
                        >
                            <Ticket className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1C1916]/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-3xl bg-[#FDFCFA] border border-[#E8E4DC] rounded-[2rem] shadow-[0_16px_48px_rgba(28,25,22,0.1)] overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-[#E8E4DC] flex justify-between items-center bg-[#F4F1EB]">
                    <div><h2 className="serif-text text-3xl font-light text-[#1C1916] tracking-tight">All Flights</h2><p className="text-[#9C9690] text-sm tracking-wide uppercase text-[10px]">{flights.length} options</p></div>
                    <button onClick={onClose} className="p-2 hover:bg-[#E8E4DC] rounded-full text-[#1C1916] transition-colors"><X size={20} /></button>
                </div>
                <div className="p-4 flex gap-3 border-b border-[#E8E4DC] bg-[#FDFCFA] overflow-x-auto">
                    {['cheap', 'fast'].map(type => (
                        <button key={type} onClick={() => setSort(type)} className={`px-4 py-2 rounded-xl text-[10px] tracking-widest uppercase font-medium border transition-all ${sort === type ? 'bg-[#1C1916] text-[#FDFCFA] border-[#1C1916]' : 'text-[#9C9690] border-[#E8E4DC] hover:border-[#1C1916]/30 bg-[#F4F1EB]'}`}>{type === 'cheap' ? 'Cheapest' : 'Fastest'}</button>
                    ))}
                </div>
                <div className="overflow-y-auto p-6 space-y-4">{sortedFlights.map((f, i) => <FlightCard key={i} flight={f} isSelected={selectedId === f.id} onSelect={(fl) => { onSelect(fl); onClose(); }} showBook={true} />)}</div>
            </div>
        </div>
    );
};

const HotelModal = ({ isOpen, onClose, hotels, selectedId, onSelect, nights }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1C1916]/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-5xl bg-[#FDFCFA] border border-[#E8E4DC] rounded-[2rem] shadow-[0_16px_48px_rgba(28,25,22,0.1)] overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-[#E8E4DC] flex justify-between items-center bg-[#F4F1EB]">
                    <div><h2 className="serif-text text-3xl font-light text-[#1C1916] tracking-tight">Select Stay</h2><p className="text-[#9C9690] text-[10px] tracking-widest uppercase mt-1">{hotels.length} options available</p></div>
                    <button onClick={onClose} className="p-2 hover:bg-[#E8E4DC] rounded-full text-[#1C1916] transition-colors"><X size={20} /></button>
                </div>
                <div className="overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">{hotels.map((h, i) => <HotelCard key={i} hotel={h} nights={nights} isSelected={selectedId === h.id} onSelect={(ht) => { onSelect(ht); onClose(); }} showBook={true} />)}</div>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1C1916]/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-4xl bg-[#FDFCFA] border border-[#E8E4DC] rounded-[2rem] shadow-[0_16px_48px_rgba(28,25,22,0.1)] overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-[#E8E4DC] flex justify-between items-center bg-[#F4F1EB]">
                    <div><h2 className="serif-text text-3xl font-light text-[#1C1916] tracking-tight">Local Experiences</h2><p className="text-[#9C9690] text-[10px] tracking-widest uppercase mt-1">{events.length} experiences found</p></div>
                    <button onClick={onClose} className="p-2 hover:bg-[#E8E4DC] rounded-full text-[#1C1916] transition-colors"><X size={20} /></button>
                </div>
                <div className="p-4 flex gap-2 border-b border-[#E8E4DC] bg-[#FDFCFA] overflow-x-auto">
                    {categories.slice(0, 5).map(cat => (
                        <button key={cat} onClick={() => setFilter(cat)} className={`px-4 py-1.5 rounded-xl text-[10px] tracking-widest uppercase font-medium border transition-all ${filter === cat ? 'bg-[#B89A6A] text-[#FDFCFA] border-[#B89A6A]' : 'text-[#9C9690] border-[#E8E4DC] bg-[#F4F1EB] hover:border-[#1C1916]/20'}`}>{cat}</button>
                    ))}
                </div>
                <div className="overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredEvents.map((ev, i) => <EventCard key={i} event={ev} isAdded={addedEvents.some(e => e.id === ev.id)} onToggle={onToggle} />)}
                    {filteredEvents.length === 0 && <div className="col-span-1 md:col-span-2 text-center text-[#9C9690] py-12 serif-text text-xl">No experiences found.</div>}
                </div>
            </div>
        </div>
    );
};

// --- MINI-MAP BRIDGE ---
const MiniMapBridge = ({ data, loading }) => (
    <div className="relative w-full h-64 bg-[#1C1916] rounded-2xl border border-[#2E3C3A] overflow-hidden shadow-[0_8px_32px_rgba(28,25,22,0.2)] flex flex-col group">
        <div className="absolute inset-0 opacity-40 transition-opacity group-hover:opacity-60">
            <div className="absolute inset-0 bg-[radial-gradient(#B89A6A_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)]"></div>
            {data && !loading && (
                <svg className="absolute inset-0 w-full h-full">
                    <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, ease: "easeInOut" }} d="M 80 80 Q 400 150 700 80" stroke="url(#gradient-line)" strokeWidth="3" fill="none" strokeLinecap="round" />
                    <defs><linearGradient id="gradient-line"><stop stopColor="#B89A6A" /><stop offset="1" stopColor="#2E3C3A" /></linearGradient></defs>
                    <circle cx="80" cy="80" r="5" fill="#B89A6A" className="animate-ping" />
                    <circle cx="700" cy="80" r="5" fill="#2E3C3A" className="animate-ping" />
                </svg>
            )}
        </div>
        <div className="relative z-10 flex-1 p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div className="inline-flex items-center gap-2 bg-[#FDFCFA]/10 backdrop-blur-md border border-[#FDFCFA]/10 px-3 py-1.5 rounded-full">
                    <Sparkles className="w-3 h-3 text-[#B89A6A]" />
                    <span className="text-[10px] font-medium text-[#FDFCFA] uppercase tracking-widest">AI Logistics</span>
                </div>
            </div>
            {loading ? (
                <div className="space-y-4">
                    <div className="h-4 bg-[#FDFCFA]/10 rounded-full w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-[#FDFCFA]/10 rounded-full w-1/2 animate-pulse"></div>
                </div>
            ) : data ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="text-[10px] text-[#FDFCFA]/40 uppercase tracking-widest font-medium mb-1">Transfer</div>
                            <div className="serif-text text-3xl font-light text-[#FDFCFA] tracking-tight">{data.duration}</div>
                            <div className="flex items-center gap-2 text-[#B89A6A] text-xs font-medium mt-1 tracking-wide">
                                <Car className="w-3 h-3" /> {data.distance} · {data.traffic}
                            </div>
                        </div>
                        <button onClick={() => window.open(data.routeUrl, '_blank')} className="bg-[#FDFCFA] text-[#1C1916] p-2.5 rounded-xl hover:scale-105 transition-transform shadow-lg">
                            <Navigation className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            ) : (
                <div className="text-[#9C9690] text-sm tracking-wide">Select a Flight and Hotel to unlock route details.</div>
            )}
        </div>
    </div>
);

// --- MAIN PAGE ---
const ResultsPage = ({ searchData, onBack }) => {
    // CACHE INITIATION
    const getCache = () => {
        try { return JSON.parse(sessionStorage.getItem('travex_results_cache')) || {}; }
        catch { return {}; }
    };

    const [transport, setTransport] = useState(() => getCache().transport || { type: 'loading', data: [], journey: null });
    const [hotels, setHotels] = useState(() => getCache().hotels || []);
    const [events, setEvents] = useState(() => getCache().events || []);
    const [loading, setLoading] = useState(() => getCache().hotels ? false : true);
    const [heroImage, setHeroImage] = useState(() => getCache().heroImage || null);

    // MODAL STATES
    const [isFlightModalOpen, setIsFlightModalOpen] = useState(false);
    const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);

    // 🔒 AI STATE
    const [confirmedFlight, setConfirmedFlight] = useState(() => getCache().confirmedFlight || null);
    const [confirmedHotel, setConfirmedHotel] = useState(() => getCache().confirmedHotel || null);
    const [addedEvents, setAddedEvents] = useState(() => getCache().addedEvents || []);
    const [miniMapData, setMiniMapData] = useState(() => getCache().miniMapData || null);
    const [bridgeLoading, setBridgeLoading] = useState(false);
    const [aiItinerary, setAiItinerary] = useState(() => getCache().aiItinerary || null);
    const [plannerLoading, setPlannerLoading] = useState(false);

    // SAVE TO CACHE
    useEffect(() => {
        const cacheObj = {
            transport, hotels, events, heroImage,
            confirmedFlight, confirmedHotel, addedEvents,
            miniMapData, aiItinerary
        };
        sessionStorage.setItem('travex_results_cache', JSON.stringify(cacheObj));
    }, [transport, hotels, events, heroImage, confirmedFlight, confirmedHotel, addedEvents, miniMapData, aiItinerary]);

    // DYNAMIC DATA
    const getName = (data) => data?.name || data || "Destination";
    const rawDestName = searchData ? getName(searchData.toCity) : "Destination";
    const originName = searchData ? getName(searchData.fromCity) : "Origin";
    const destName = rawDestName.replace(/\b(INTL|INTERNATIONAL|AIRPORT|AIR PORT)\b/gi, "").trim();
    const arrivalDate = searchData?.departDate;
    const departureDate = searchData?.returnDate || new Date(new Date(arrivalDate).setDate(new Date(arrivalDate).getDate() + 3)).toISOString().split('T')[0];
    const nights = calculateNights(arrivalDate, departureDate);

    const journeyCurrency = searchData?.currency || 'INR';
    const journeySymbol = journeyCurrency === 'USD' ? '$' : journeyCurrency === 'EUR' ? '€' : journeyCurrency === 'GBP' ? '£' : '₹';

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
        if (hotels.length > 0) {
            setLoading(false);
            return;
        }

        const loadData = async () => {
            setLoading(true);
            try {
                const UNSPLASH_KEY = "dNatqPd4crOANylynm5YUCkNG2NAfUjmMdwirbo7xDo";

                // 1. BANNER IMAGE
                const primaryQuery = `${destName} tourism`;
                fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(primaryQuery)}&orientation=landscape&per_page=1&client_id=${UNSPLASH_KEY}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.results && data.results.length > 0) setHeroImage(data.results[0].urls.regular);
                        else {
                            fetch(`https://api.unsplash.com/search/photos?query=Paris%20travel&orientation=landscape&per_page=1&client_id=${UNSPLASH_KEY}`)
                                .then(r => r.json()).then(d => { if (d.results && d.results.length > 0) setHeroImage(d.results[0].urls.regular); });
                        }
                    }).catch(err => console.error(err));

                // 2. MAIN DATA
                const [transportData, hotelData, eventData] = await Promise.all([
                    fetchFlights(originName, destName, searchData.departDate, searchData.currency),
                    fetchHotels(destName, searchData.budget, searchData.currency, arrivalDate, departureDate),
                    fetchEvents(destName, searchData.departDate)
                ]);

                // 3. HOTEL & EVENT IMAGES
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
    }, [searchData, destName, arrivalDate, departureDate, originName, hotels.length]);

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
                        routeUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(confirmedHotel.name)}`
                    });
                    setBridgeLoading(false);
                }, 1000);
            };
            buildPlan();
        }
    }, [confirmedFlight, confirmedHotel, aiItinerary, arrivalDate, departureDate, destName, plannerLoading, searchData]);

    const bgImage = heroImage || `https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1600&q=80`;

    if (!searchData) return null;

    return (
        <div className="selection:bg-[#B89A6A]/20 pb-32 font-sans bg-[#F4F1EB] text-[#1C1916] min-h-screen">
            <ChatBot destination={destName} />

            {/* MODALS */}
            <FlightModal isOpen={isFlightModalOpen} onClose={() => setIsFlightModalOpen(false)} flights={transport.results} selectedId={confirmedFlight?.id} onSelect={toggleFlight} />
            <HotelModal isOpen={isHotelModalOpen} onClose={() => setIsHotelModalOpen(false)} hotels={hotels} nights={nights} selectedId={confirmedHotel?.id} onSelect={toggleHotel} />
            <EventModal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} events={events} addedEvents={addedEvents} onToggle={toggleEvent} />

            {loading ? (
                <div className="h-screen flex flex-col items-center justify-center z-50 fixed inset-0 bg-[#F4F1EB]">
                    <Loader2 className="animate-spin text-[#B89A6A] mb-4" size={48} />
                    <h2 className="serif-text text-3xl font-light text-[#1C1916] tracking-tight animate-pulse">Curating stay in {destName}...</h2>
                </div>
            ) : (
                <div className="max-w-[1200px] mx-auto p-4 lg:p-8 space-y-8 mt-4 animate-fade-in">

                    {/* 1. HERO */}
                    <div className="relative w-full rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(28,25,22,0.08)] border border-[#E8E4DC] group bg-[#FDFCFA]">
                        <div className="absolute inset-0 h-[350px]">
                            <img src={bgImage} className="w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-105" alt={destName} />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#FDFCFA]/90 via-[#FDFCFA]/30 to-transparent"></div>
                        </div>

                        <div className="relative p-8 md:p-12 z-10 pt-[150px]">
                            <div className="absolute top-8 left-8">
                                <button onClick={onBack} className="bg-[#FDFCFA]/70 hover:bg-[#FDFCFA]/90 backdrop-blur-md px-5 py-2.5 rounded-full text-[#1C1916] flex items-center gap-2 transition-all border border-[#E8E4DC] shadow-sm text-sm font-medium tracking-wide">
                                    <ArrowLeft className="w-4 h-4" /> Return
                                </button>
                            </div>

                            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 mt-12">
                                <div className="space-y-4 max-w-2xl w-full">
                                    <h1 className="serif-text font-light text-[#1C1916] tracking-tight drop-shadow-sm uppercase leading-none break-words" style={{ fontSize: 'clamp(3rem,6vw,5.5rem)', letterSpacing: '-0.02em' }}>
                                        {destName}
                                    </h1>
                                    <div className="flex flex-wrap gap-3">
                                        <span className="bg-[#FDFCFA]/80 backdrop-blur-md px-4 py-2 rounded-full border border-[#E8E4DC] shadow-sm flex items-center gap-2 text-[#1C1916] text-xs font-medium tracking-widest uppercase">
                                            <Calendar className="w-3.5 h-3.5 text-[#B89A6A]" /> {arrivalDate} — {departureDate}
                                        </span>
                                    </div>
                                </div>

                                {/* Summary Widget */}
                                <div className="w-full xl:w-[450px] bg-[#FDFCFA]/90 backdrop-blur-xl p-6 rounded-2xl border border-[#E8E4DC] shadow-[0_4px_24px_rgba(28,25,22,0.08)] relative overflow-hidden">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2 text-[#9C9690] font-medium uppercase tracking-widest text-[10px]">
                                            <DollarSign className="w-3.5 h-3.5 text-[#B89A6A]" /> Journey Budget
                                        </div>
                                        <div className="serif-text font-light text-[#1C1916] text-xl tracking-tight">
                                            {journeySymbol} {parseFloat(searchData?.budget || 3000).toFixed(2)} <span className="text-[10px] text-[#9C9690] font-normal tracking-widest uppercase">Total</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3 text-sm font-medium">
                                        <div className="flex justify-between text-[#9C9690]">
                                            <span className="flex items-center gap-1.5 text-xs tracking-wide"><Plane className="w-3.5 h-3.5 text-[#B89A6A]" />Flight</span>
                                            <span className="text-[#1C1916] text-xs">{confirmedFlight ? `-${journeySymbol} ${parseFloat(confirmedFlight.price?.total || 0).toFixed(2)}` : 'Pending'}</span>
                                        </div>
                                        <div className="flex justify-between text-[#9C9690]">
                                            <span className="flex items-center gap-1.5 text-xs tracking-wide"><Hotel className="w-3.5 h-3.5 text-[#2E3C3A]" />Hotel ({nights}n)</span>
                                            <span className="text-[#1C1916] text-xs">{confirmedHotel ? `-${journeySymbol} ${(parseFloat(confirmedHotel.price.replace(/[^0-9.]/g, '')) * nights).toFixed(2)}` : 'Pending'}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[#9C9690]">
                                            <span className="flex items-center gap-1.5 text-xs tracking-wide">
                                                <Ticket className="w-3.5 h-3.5 text-amber-600" /> Experiences ({addedEvents.length})
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-amber-700">TBD</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 h-px bg-[#E8E4DC] rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-[#2E3C3A] to-[#B89A6A]" style={{ width: `${(confirmedFlight ? 50 : 0) + (confirmedHotel ? 50 : 0)}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Smart Trip Summary Pill */}
                    <div className="bg-[#FDFCFA] border border-[#E8E4DC] rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center gap-4 relative overflow-hidden shadow-[0_1px_4px_rgba(28,25,22,0.05)]">
                        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-[#2E3C3A] via-[#B89A6A] to-[#E8E4DC]"></div>
                        <div className="flex-1">
                            <p className="text-[#1C1916] text-sm tracking-wide">
                                <span className="text-[#B89A6A] font-medium">Smart Trip — </span>
                                A <span className="font-medium">{nights}-day</span> <span className="text-[#2E3C3A] font-medium">holiday</span> to <span className="font-medium">{destName}</span> from <span className="font-medium">{arrivalDate}</span>.
                            </p>
                        </div>
                        <button onClick={onBack} className="px-4 py-2 bg-[#F4F1EB] border border-[#E8E4DC] text-[#1C1916] rounded-xl text-[10px] font-medium tracking-widest uppercase hover:border-[#B89A6A]/50 transition-all">
                            Refine
                        </button>
                    </div>

                    {/* 2. JOURNEY (FLIGHTS) */}
                    <div className="bg-[#FDFCFA] shadow-[0_1px_4px_rgba(28,25,22,0.05)] border border-[#E8E4DC] rounded-3xl p-8 relative transition-colors">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2.5 bg-[#F4F1EB] rounded-xl border border-[#E8E4DC]"><Plane className="w-5 h-5 text-[#B89A6A]" /></div>
                            <h2 className="serif-text text-3xl font-light text-[#1C1916] tracking-tight">Your Journey</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="relative flex gap-5 p-4 rounded-2xl bg-[#F4F1EB] border border-[#E8E4DC]">
                                <div className="w-10 h-10 rounded-full bg-[#FDFCFA] flex items-center justify-center border border-[#E8E4DC] text-[#B89A6A]"><Car className="w-4 h-4" /></div>
                                <div className="flex-1">
                                    <h3 className="serif-text text-[#1C1916] font-light text-base tracking-tight">Drive to {originName} Airport</h3>
                                    <button onClick={() => openDirectionsToAirport(originName)} className="text-[10px] text-[#B89A6A] font-medium mt-1.5 hover:underline flex items-center gap-1 tracking-widest uppercase">Directions <ExternalLink className="w-3 h-3" /></button>
                                </div>
                            </div>

                            {(transport.results || []).slice(0, 2).map((f, i) => <FlightCard key={i} flight={f} isSelected={confirmedFlight?.id === f.id} onSelect={toggleFlight} />)}

                            <button onClick={() => setIsFlightModalOpen(true)} className="w-full mt-2 py-4 rounded-xl border border-dashed border-[#E8E4DC] text-[#9C9690] hover:text-[#1C1916] hover:border-[#B89A6A]/50 bg-[#FDFCFA] transition-all text-[10px] tracking-widest uppercase font-medium flex items-center justify-center gap-2">
                                View all {transport.results?.length || 0} flights <ChevronDown className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* 3. STAYS (HOTELS) */}
                    <div className="bg-[#FDFCFA] shadow-[0_1px_4px_rgba(28,25,22,0.05)] border border-[#E8E4DC] rounded-3xl p-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-[#F4F1EB] rounded-xl border border-[#E8E4DC]"><Hotel className="w-5 h-5 text-[#2E3C3A]" /></div>
                                <h2 className="serif-text text-3xl font-light text-[#1C1916] tracking-tight">Select Stay</h2>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {hotels.slice(0, 3).map((h, i) => <HotelCard key={i} hotel={h} nights={nights} isSelected={confirmedHotel?.id === h.id} onSelect={toggleHotel} />)}
                        </div>
                        <button onClick={() => setIsHotelModalOpen(true)} className="w-full mt-6 py-4 rounded-xl border border-dashed border-[#E8E4DC] text-[#9C9690] hover:text-[#1C1916] hover:border-[#B89A6A]/50 bg-[#FDFCFA] transition-all text-[10px] tracking-widest uppercase font-medium flex items-center justify-center gap-2">
                            View all {hotels.length} hotels <ChevronDown className="w-4 h-4" />
                        </button>
                    </div>

                    {/* 4. LOCAL VIBES (EVENTS) */}
                    <div className="bg-[#FDFCFA] shadow-[0_1px_4px_rgba(28,25,22,0.05)] border border-[#E8E4DC] rounded-3xl p-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2.5 bg-[#F4F1EB] rounded-xl border border-[#E8E4DC]"><Ticket className="w-5 h-5 text-[#B89A6A]" /></div>
                            <h2 className="serif-text text-3xl font-light text-[#1C1916] tracking-tight">Local Experiences</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(events || []).slice(0, 4).map((ev, i) => <EventCard key={i} event={ev} isAdded={addedEvents.some(e => e.id === ev.id)} onToggle={toggleEvent} />)}
                        </div>
                        <button onClick={() => setIsEventModalOpen(true)} className="w-full mt-6 py-4 rounded-xl border border-dashed border-[#E8E4DC] text-[#9C9690] hover:text-[#1C1916] hover:border-[#B89A6A]/50 bg-[#FDFCFA] transition-all text-[10px] tracking-widest uppercase font-medium flex items-center justify-center gap-2">
                            Discover more <ChevronDown className="w-4 h-4" />
                        </button>
                    </div>

                    {/* 5. LOGISTICS (MAP) */}
                    <div className="relative">
                        <MiniMapBridge data={miniMapData} loading={bridgeLoading} />
                    </div>

                    {/* 6. AI PLANNER (BOTTOM) */}
                    <div className="bg-[#FDFCFA] shadow-[0_1px_4px_rgba(28,25,22,0.05)] border border-[#E8E4DC] rounded-3xl p-8 relative min-h-[400px]">
                        {!aiItinerary ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                                {plannerLoading ? (
                                    <div className="flex flex-col items-center gap-4">
                                        <Loader2 className="animate-spin text-[#B89A6A]" size={48} />
                                        <p className="serif-text text-2xl font-light text-[#1C1916] tracking-tight animate-pulse">Personalising your journey...</p>
                                    </div>
                                ) : (
                                    <>
                                        <Lock className="w-10 h-10 text-[#E8E4DC] mb-6" />
                                        <h3 className="serif-text text-[#1C1916] font-light text-3xl tracking-tight">Itinerary Awaits</h3>
                                        <p className="text-[#9C9690] mt-2 max-w-md text-sm tracking-wide">Select a flight and hotel above to unlock your personalised daily plan.</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="p-2.5 bg-[#F4F1EB] rounded-xl border border-[#E8E4DC]"><Calendar className="w-5 h-5 text-[#2E3C3A]" /></div>
                                    <h2 className="serif-text text-3xl font-light text-[#1C1916] tracking-tight">Your Daily Itinerary</h2>
                                </div>
                                <ItineraryTimeline plan={aiItinerary} />
                            </div>
                        )}
                    </div>

                    {/* Floating Summary Cart Wrapper (Optional, implemented in HTML file, could add it here if needed later) */}

                </div>
            )}
        </div>
    );
};

export default ResultsPage;