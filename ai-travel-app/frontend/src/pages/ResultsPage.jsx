import { useEffect, useState, useMemo, useRef } from 'react';
import {
    ArrowLeft, Plane, Hotel, Calendar, DollarSign, Loader2, Car,
    Ticket, MapPin, X, CheckCircle, ExternalLink, Navigation, Star, ChevronDown, Globe,
    Music, Utensils, Moon, Camera, Heart, Share, Copy, Check
} from 'lucide-react';
import { searchAll, fetchItineraryStream } from '../services/api';
import ItineraryTimeline from '../components/ItineraryTimeline';
import ChatBot from '../components/ChatBot';
import { motion, AnimatePresence } from 'framer-motion';

// --- HELPERS ---
const formatDuration = (ptString) => ptString ? ptString.replace("PT", "").toLowerCase() : "";
const getAirlineLogo = (code) => code ? `https://pics.avs.io/200/200/${code}.png` : '';
const getAirlineLogoFallback = () => `https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=100&q=60`;

const getHotelImage = (hotel) => {
    if (hotel.image) return hotel.image;
    const query = encodeURIComponent((hotel.name || 'luxury hotel') + ' hotel');
    return `https://source.unsplash.com/800x500/?${query}`;
};

const getEventImage = (event) => {
    if (event.image) return event.image;
    const seed = String(event.id || event.title || 'event').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 800;
    return `https://picsum.photos/seed/${seed}/800/500`;
};

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

// --- COMPONENT: CHECKOUT BAR ---
const CheckoutBar = ({ flight, hotel, currencySymbol, nights, originName, pax = 1, arrivalDate = new Date() }) => {
    if (!flight || !hotel) return null;

    const flightPrice = parseFloat(flight.price?.total || 0);
    const hotelPrice = parseFloat((hotel?.price || '0').replace(/[^0-9.]/g, '')) * nights;
    const total = flightPrice + hotelPrice;

    return (
        <div className="w-full bg-[#1C1916] text-[#FDFCFA] rounded-3xl overflow-hidden shadow-[0_16px_48px_rgba(28,25,22,0.2)] border border-[#B89A6A]/20">
            <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 flex-1">
                    <div>
                        <div className="text-[10px] text-[#9C9690] tracking-widest uppercase mb-1">Total Journey + Stay</div>
                        <div className="serif-text text-4xl font-light tracking-tight">{currencySymbol} {total.toFixed(2)}</div>
                        <div className="text-[#9C9690] text-[10px] mt-1 tracking-wide">{nights} night{nights > 1 ? 's' : ''} · {flight.validatingAirlineCodes?.[0] || 'Flight'} + {hotel.name}</div>
                    </div>
                    <div className="hidden md:block h-14 w-px bg-[#B89A6A]/20" />
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
                        <div className="text-[#9C9690] uppercase tracking-widest text-[10px]">Flight</div>
                        <div className="text-[#FDFCFA] font-medium">{currencySymbol} {flightPrice.toFixed(2)}</div>
                        <div className="text-[#9C9690] uppercase tracking-widest text-[10px]">Hotel</div>
                        <div className="text-[#FDFCFA] font-medium">{currencySymbol} {hotelPrice.toFixed(2)}</div>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full md:w-auto">
                    <button
                        onClick={() => {
                            const outbound = flight.itineraries?.[0];
                            const firstSeg = outbound?.segments?.[0];
                            const lastSeg = outbound?.segments?.[outbound.segments.length - 1];
                            const origin = firstSeg?.departure?.iataCode || '';
                            const dest = lastSeg?.arrival?.iataCode || '';
                            const dateObj = new Date(firstSeg?.departure?.at || arrivalDate);
                            const skyscannerDate = `${String(dateObj.getDate()).padStart(2, '0')}${String(dateObj.getMonth() + 1).padStart(2, '0')}${String(dateObj.getFullYear()).slice(-2)}`;
                            window.open(
                                `https://www.skyscanner.co.in/transport/flights/${origin}/${dest}/${skyscannerDate}/?adults=${pax}`,
                                '_blank'
                            );
                        }}
                        className="flex-1 md:flex-none border border-[#B89A6A] hover:bg-[#B89A6A]/10 text-[#B89A6A] px-7 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 group"
                    >
                        <Plane size={14} className="group-hover:translate-x-0.5 transition-transform" /> Book Flight
                    </button>
                    <button
                        onClick={() => window.open(`https://www.google.com/search?btnI=1&q=${encodeURIComponent(hotel.name)}+official+website+book+room`, '_blank')}
                        className="flex-1 md:flex-none bg-[#B89A6A] hover:bg-[#A8876A] text-[#1C1916] px-7 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 group shadow-[0_4px_16px_rgba(184,154,106,0.3)]"
                    >
                        <Hotel size={14} className="group-hover:scale-110 transition-transform" /> Book Hotel
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT: FLIGHT CARD ---
const FlightCard = ({ flight, isSelected, onSelect, showBook = false, pax = 1, arrivalDate = new Date() }) => {
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
                    <div className="w-12 h-12 bg-[#F4F1EB] rounded-xl overflow-hidden flex items-center justify-center border border-[#E8E4DC] font-bold text-[#B89A6A] text-sm">
                        {airlineCode
                            ? <img
                                src={getAirlineLogo(airlineCode)}
                                alt={airlineCode}
                                className="w-full h-full object-contain p-1"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = getAirlineLogoFallback();
                                    e.target.className = 'w-full h-full object-cover';
                                }}
                            />
                            : <Plane size={20} />
                        }
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
                            onClick={(e) => {
                                e.stopPropagation();
                                const outbound = flight.itineraries?.[0];
                                const firstSeg = outbound?.segments?.[0];
                                const lastSeg = outbound?.segments?.[outbound.segments.length - 1];
                                const origin = firstSeg?.departure?.iataCode || '';
                                const dest = lastSeg?.arrival?.iataCode || '';
                                const dateObj = new Date(firstSeg?.departure?.at || arrivalDate);
                                const skyscannerDate = `${String(dateObj.getDate()).padStart(2, '0')}${String(dateObj.getMonth() + 1).padStart(2, '0')}${String(dateObj.getFullYear()).slice(-2)}`;
                                window.open(
                                    `https://www.skyscanner.co.in/transport/flights/${origin}/${dest}/${skyscannerDate}/?adults=${pax}`,
                                    '_blank'
                                );
                            }}
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
            <div className="relative h-48 w-full shrink-0 overflow-hidden bg-[#2E3C3A]">
                <img
                    src={getHotelImage(hotel)}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    alt={hotel.name}
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1542314831-c6a4d14248cb?w=800&q=80'; }}
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

                <div className="mt-auto border-t border-[#E8E4DC] pt-4 flex flex-wrap justify-between items-center gap-3">
                    <div>
                        <div className="text-[10px] text-[#9C9690] tracking-widest uppercase mb-1">{nights} Nights · {currencySymbol} {rawPrice.toFixed(2)}/night</div>
                        <div className="serif-text text-2xl font-light text-[#1C1916] leading-none">{currencySymbol} {totalPrice.toFixed(2)} <span className="text-[10px] text-[#9C9690] font-normal tracking-widest uppercase">Total</span></div>
                    </div>
                    {showBook && (
                        <button
                            onClick={(e) => { e.stopPropagation(); window.open(`https://www.google.com/search?btnI=1&q=${encodeURIComponent(hotel.name)}+official+website+book+room`, '_blank'); }}
                            className="text-[10px] whitespace-nowrap bg-[#F4F1EB] hover:bg-[#E8E4DC] border border-[#E8E4DC] text-[#1C1916] font-medium px-4 py-2 rounded-xl transition-all tracking-widest uppercase"
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
                    src={getEventImage(event)}
                    className="w-full h-full object-cover relative z-10"
                    alt={event.title}
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400&q=80'; }}
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
const FlightModal = ({ isOpen, onClose, flights, selectedId, onSelect, pax = 1, arrivalDate = new Date() }) => {
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
                <div className="overflow-y-auto p-6 space-y-4">{sortedFlights.map((f, i) => <FlightCard key={i} flight={f} isSelected={selectedId === f.id} onSelect={(fl) => { onSelect(fl); onClose(); }} showBook={true} pax={pax} arrivalDate={arrivalDate} />)}</div>
            </div>
        </div>
    );
};

const HotelModal = ({ isOpen, onClose, hotels, selectedId, onSelect, nights }) => {
    const [sort, setSort] = useState('price_asc');
    const [minStars, setMinStars] = useState(0);

    const filtered = useMemo(() => {
        let list = [...hotels];
        if (minStars > 0) {
            list = list.filter(h => parseFloat(h.rating || 0) >= minStars);
        }
        if (sort === 'price_asc') list.sort((a, b) => parseFloat(a.price.replace(/[^0-9.]/g, '')) - parseFloat(b.price.replace(/[^0-9.]/g, '')));
        else if (sort === 'price_desc') list.sort((a, b) => parseFloat(b.price.replace(/[^0-9.]/g, '')) - parseFloat(a.price.replace(/[^0-9.]/g, '')));
        else if (sort === 'distance') list.sort((a, b) => parseFloat(a.distance || '99') - parseFloat(b.distance || '99'));
        return list;
    }, [hotels, sort, minStars]);

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1C1916]/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-5xl bg-[#FDFCFA] border border-[#E8E4DC] rounded-[2rem] shadow-[0_16px_48px_rgba(28,25,22,0.1)] overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-[#E8E4DC] flex justify-between items-center bg-[#F4F1EB]">
                    <div>
                        <h2 className="serif-text text-3xl font-light text-[#1C1916] tracking-tight">Select Stay</h2>
                        <p className="text-[#9C9690] text-[10px] tracking-widest uppercase mt-1">{filtered.length} of {hotels.length} options</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[#E8E4DC] rounded-full text-[#1C1916] transition-colors"><X size={20} /></button>
                </div>

                <div className="p-4 border-b border-[#E8E4DC] bg-[#FDFCFA] flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-[#9C9690] uppercase tracking-widest font-medium">Sort:</span>
                        {[
                            { id: 'price_asc', label: 'Price ↑' },
                            { id: 'price_desc', label: 'Price ↓' },
                            { id: 'distance', label: 'Nearest' },
                        ].map(s => (
                            <button key={s.id} onClick={() => setSort(s.id)}
                                className={`px-3 py-1.5 rounded-xl text-[10px] tracking-widest uppercase font-medium border transition-all
                                ${sort === s.id ? 'bg-[#1C1916] text-[#FDFCFA] border-[#1C1916]' : 'text-[#9C9690] border-[#E8E4DC] bg-[#F4F1EB] hover:border-[#1C1916]/30'}`}>
                                {s.label}
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-5 bg-[#E8E4DC]" />

                    <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-[#9C9690] uppercase tracking-widest font-medium">Stars:</span>
                        {[
                            { val: 0, label: 'Any' },
                            { val: 3, label: '3★+' },
                            { val: 4, label: '4★+' },
                            { val: 5, label: '5★' },
                        ].map(s => (
                            <button key={s.val} onClick={() => setMinStars(s.val)}
                                className={`px-3 py-1.5 rounded-xl text-[10px] tracking-widest uppercase font-medium border transition-all
                                ${minStars === s.val ? 'bg-[#B89A6A] text-[#FDFCFA] border-[#B89A6A]' : 'text-[#9C9690] border-[#E8E4DC] bg-[#F4F1EB] hover:border-[#B89A6A]/40'}`}>
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {filtered.length > 0
                        ? filtered.map((h, i) => <HotelCard key={i} hotel={h} nights={nights} isSelected={selectedId === h.id} onSelect={(ht) => { onSelect(ht); onClose(); }} showBook={true} />)
                        : <div className="col-span-3 text-center text-[#9C9690] py-16 serif-text text-xl">No hotels match your filters.</div>
                    }
                </div>
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
const MiniMapBridge = ({ data, loading }) => {
    if (loading) return (
        <div className="flex items-center gap-3 bg-[#FDFCFA] border border-[#E8E4DC] rounded-2xl px-5 py-3.5 animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-[#F4F1EB] border border-[#E8E4DC]" />
            <div className="h-3 bg-[#F4F1EB] rounded w-40" />
        </div>
    );
    if (!data) return null;
    return (
        <div className="flex items-center gap-4 bg-[#FDFCFA] border border-[#E8E4DC] rounded-2xl px-5 py-3.5 shadow-[0_1px_4px_rgba(28,25,22,0.05)]">
            <div className="w-8 h-8 rounded-xl bg-[#F4F1EB] border border-[#E8E4DC] flex items-center justify-center flex-shrink-0">
                <Car className="w-4 h-4 text-[#B89A6A]" />
            </div>
            <div className="flex-1">
                <span className="text-[#1C1916] text-sm font-medium">Transfer to hotel</span>
                <span className="text-[#9C9690] text-xs ml-2">{data.duration} · {data.distance} · {data.traffic}</span>
            </div>
            <button
                onClick={() => window.open(data.routeUrl, '_blank')}
                className="text-[10px] text-[#B89A6A] font-medium hover:underline flex items-center gap-1 tracking-widest uppercase flex-shrink-0"
            >
                Directions <ExternalLink className="w-3 h-3" />
            </button>
        </div>
    );
};

// --- MAIN PAGE ---
const ResultsPage = ({ searchData, onBack }) => {
    // DYNAMIC DATA
    const getName = (data) => data?.name || data || "Destination";
    const rawDestName = searchData ? getName(searchData.toCity) : "Destination";
    const destName = rawDestName.replace(/\b(INTL|INTERNATIONAL|AIRPORT|AIR PORT)\b/gi, "").trim();
    const originName = searchData ? getName(searchData.fromCity) : "Origin";

    const tripType = searchData?.tripType || 'round';
    const isRoundTrip = tripType === 'round' && !!searchData?.returnDate;

    const arrivalDate = searchData?.departDate;
    const departureDate = isRoundTrip
        ? searchData.returnDate
        : (() => {
            const d = new Date(arrivalDate);
            d.setDate(d.getDate() + 3);
            return d.toISOString().split('T')[0];
        })();

    const nights = calculateNights(arrivalDate, departureDate);

    const journeyCurrency = searchData?.currency || 'INR';
    const journeySymbol = journeyCurrency === 'USD' ? '$' : journeyCurrency === 'EUR' ? '€' : journeyCurrency === 'GBP' ? '£' : '₹';

    // CACHE INITIATION
    const getCache = () => {
        try {
            const cache = JSON.parse(localStorage.getItem('travex_results_cache')) || {};
            if (cache.lastSearchDestination && cache.lastSearchDestination !== destName) return {};
            return cache;
        }
        catch { return {}; }
    };

    const initialCache = getCache();

    const [transport, setTransport] = useState(() => initialCache.transport || { type: 'loading', data: [], journey: null });
    const [hotels, setHotels] = useState(() => initialCache.hotels || []);
    const [events, setEvents] = useState(() => {
        const cached = initialCache.events;
        if (Array.isArray(cached)) return cached;
        if (cached && typeof cached === 'object') return cached.events || cached.activities || [];
        return [];
    });
    const [loading, setLoading] = useState(() => initialCache.hotels?.length > 0 ? false : true);
    const [heroImage, setHeroImage] = useState(() => initialCache.heroImage || null);

    const [isFlightModalOpen, setIsFlightModalOpen] = useState(false);
    const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);

    // 🔒 AI STATE
    const [confirmedFlight, setConfirmedFlight] = useState(() => initialCache.confirmedFlight || null);
    const [confirmedHotel, setConfirmedHotel] = useState(() => initialCache.confirmedHotel || null);
    const [addedEvents, setAddedEvents] = useState(() => initialCache.addedEvents || []);
    const [miniMapData, setMiniMapData] = useState(() => initialCache.miniMapData || null);
    const [bridgeLoading, setBridgeLoading] = useState(false);
    const [aiItinerary, setAiItinerary] = useState(() => initialCache.aiItinerary || null);
    const [aiError, setAiError] = useState(null);
    const [plannerLoading, setPlannerLoading] = useState(false);
    const [isThinking, setIsThinking] = useState(false);

    // Save & Share State
    const [isSaving, setIsSaving] = useState(false);
    const [shareLink, setShareLink] = useState(null);
    const [copied, setCopied] = useState(false);

    // Refs for stream control
    const plannerHasFired = useRef(false);
    const abortControllerRef = useRef(null);
    const isStreamingRef = useRef(false);

    useEffect(() => {
        if (isFlightModalOpen || isHotelModalOpen || isEventModalOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isFlightModalOpen, isHotelModalOpen, isEventModalOpen]);

    useEffect(() => {
        const cacheObj = {
            lastSearchDestination: destName,
            transport, hotels, events, heroImage,
            confirmedFlight, confirmedHotel, addedEvents,
            miniMapData, aiItinerary
        };
        localStorage.setItem('travex_results_cache', JSON.stringify(cacheObj));
    }, [destName, transport, hotels, events, heroImage, confirmedFlight, confirmedHotel, addedEvents, miniMapData, aiItinerary]);

    const [toastMsg, setToastMsg] = useState(null);
    const showToast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3000);
    };

    // --- SAVE & SHARE LOGIC ---
    const handleSaveTrip = async () => {
        setIsSaving(true);
        try {
            const cache = localStorage.getItem('travex_results_cache');
            const searchDataStr = sessionStorage.getItem('travex_search') || localStorage.getItem('travex_search');

            const payload = {
                searchData: searchDataStr ? JSON.parse(searchDataStr) : searchData,
                resultsData: cache ? JSON.parse(cache) : {}
            };

            const response = await fetch('http://localhost:5000/api/save-trip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (data.id) {
                const url = `${window.location.origin}/shared/${data.id}`;
                setShareLink(url);
            } else {
                alert('Failed to save trip');
            }
        } catch (err) {
            console.error(err);
            alert('Error saving trip. Check console.');
        } finally {
            setIsSaving(false);
        }
    };

    const copyToClipboard = () => {
        if (shareLink) {
            navigator.clipboard.writeText(shareLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // --- SELECTION TOGGLES ---
    const toggleFlight = (flight) => {
        if (isStreamingRef.current) {
            abortControllerRef.current?.abort();
            isStreamingRef.current = false;
        }

        if (confirmedFlight?.id === flight.id) {
            // Deselect
            setConfirmedFlight(null);
            setAiItinerary(null);
            setMiniMapData(null);
            plannerHasFired.current = false;
        } else {
            // Select — then directly trigger the stream if hotel is also locked in
            setConfirmedFlight(flight);
            setAiItinerary(null);
            setMiniMapData(null);
            plannerHasFired.current = false;
            if (confirmedHotel) {
                setTimeout(() => startStream(flight, confirmedHotel), 0);
            }
        }
    };

    const toggleHotel = (hotel) => {
        if (isStreamingRef.current) {
            abortControllerRef.current?.abort();
            isStreamingRef.current = false;
        }

        if (confirmedHotel?.id === hotel.id) {
            // Deselect
            setConfirmedHotel(null);
            setAiItinerary(null);
            setMiniMapData(null);
            plannerHasFired.current = false;
        } else {
            // Select — then directly trigger the stream if flight is also locked in
            setConfirmedHotel(hotel);
            setAiItinerary(null);
            setMiniMapData(null);
            plannerHasFired.current = false;
            if (confirmedFlight) {
                setTimeout(() => startStream(confirmedFlight, hotel), 0);
            }
        }
    };

    const toggleEvent = (event) => {
        const isAdded = addedEvents.some(e => e.id === event.id);

        if (isAdded) {
            setAddedEvents(prev => prev.filter(e => e.id !== event.id));
            if (aiItinerary?.daily_plan) {
                setAiItinerary(prev => ({
                    ...prev,
                    daily_plan: prev.daily_plan.map(day => ({
                        ...day,
                        activities: day.activities.filter(a => a._eventId !== event.id)
                    }))
                }));
            }
            showToast(`"${event.title}" removed from your plan.`);
        } else {
            setAddedEvents(prev => [...prev, event]);
            if (aiItinerary?.daily_plan?.length > 0) {
                const dayPlan = [...aiItinerary.daily_plan];
                const targetDayIndex = dayPlan.reduce((minIdx, day, i, arr) =>
                    day.activities.length < arr[minIdx].activities.length ? i : minIdx, 0);

                const newActivity = {
                    _eventId: event.id,
                    time: event.date ? "Evening" : "19:00",
                    activity: event.title,
                    type: "sightseeing",
                    description: event.description || `${event.category} event.`,
                    cost_estimate: parseFloat((event.price || "0").replace(/[^0-9.]/g, '')) || 0,
                    booking_url: event.url || null,
                    transit_instruction: "Check your event ticket for venue directions.",
                    localness_signal: 0.7,
                };

                const updatedPlan = dayPlan.map((day, i) =>
                    i === targetDayIndex
                        ? { ...day, activities: [...day.activities, newActivity] }
                        : day
                );
                setAiItinerary(prev => ({ ...prev, daily_plan: updatedPlan }));
                showToast(`"${event.title}" added to Day ${targetDayIndex + 1}! 🗓️`);
            } else {
                showToast(`"${event.title}" saved! Generate an itinerary to see it in your plan.`);
            }
        }
    };

    const lastSearchCity = useRef(searchData?.toCity || null);

    // --- 1. INITIAL DATA FETCH ---
    useEffect(() => {
        if (!searchData) return;

        if (lastSearchCity.current !== searchData.toCity) {
            setHotels([]);
            setTransport({ type: 'none', results: [] });
            setEvents([]);
            lastSearchCity.current = searchData.toCity;
        } else if (hotels.length > 0) {
            setLoading(false);
            return;
        }

        const loadData = async () => {
            setLoading(true);
            try {
                const results = await searchAll(searchData);
                if (results.heroImage) setHeroImage(results.heroImage);
                setTransport(results.transportData || { type: 'none', results: [] });
                setHotels(results.hotelData || []);
                const rawEvents = results.eventData || [];
                setEvents(Array.isArray(rawEvents) ? rawEvents : (rawEvents.events || rawEvents.activities || []));
            } catch (err) {
                console.error("Aggregation Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [searchData, hotels.length]);


    // --- 2. AI STREAM: Direct-call (no useEffect dep-array instability) ---
    const startStream = (flight, hotel) => {
        if (!flight || !hotel || plannerHasFired.current) return;

        console.log("🚀 startStream: flight", flight.id, "hotel", hotel.id);
        plannerHasFired.current = true;
        setPlannerLoading(true);
        setIsThinking(true);
        setBridgeLoading(true);
        setAiError(null);

        const controller = new AbortController();
        abortControllerRef.current = controller;
        isStreamingRef.current = true;

        const totalBudget = parseFloat(searchData?.budget || 2000);
        const flightCost = parseFloat(flight?.price?.total || 0);
        const hotelCost = parseFloat(hotel?.price?.replace(/[^0-9.]/g, '') || 0) * nights;
        const remaining = Math.max(500, totalBudget - flightCost - hotelCost);
        const dailyAllow = Math.floor(remaining / Math.max(1, nights));

        const payload = {
            destination: destName,
            dates: { arrival: arrivalDate, departure: departureDate },
            hotel,
            flight,
            budget: { total: totalBudget, currency: journeyCurrency, remaining, dailyAllowance: dailyAllow },
            interests: searchData?.interests || [],
            vibeLevel: searchData?.vibeLevel || 1,
            tripPurpose: searchData?.tripPurpose || 'holiday',
            tripType,
            pax: searchData?.pax || 1  // 👥 Pass passenger count to AI
        };

        const tryParsePartialJSON = (s) => {
            let cleaned = s.trim();
            const firstBrace = cleaned.indexOf('{');
            const lastBrace = cleaned.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
                cleaned = cleaned.substring(firstBrace, lastBrace + 1);
            }
            try { return JSON.parse(cleaned); } catch {
                try {
                    let c = cleaned.replace(/,\s*$/, '');
                    const ob = (c.match(/\{/g) || []).length - (c.match(/\}/g) || []).length;
                    const obk = (c.match(/\[/g) || []).length - (c.match(/\]/g) || []).length;
                    if (c.endsWith('"')) c += '"';
                    for (let i = 0; i < obk; i++) c += ']';
                    for (let i = 0; i < ob; i++) c += '}';
                    return JSON.parse(c);
                } catch (e) { return null; }
            }
        };

        let accumulated = "";

        fetchItineraryStream(payload,
            (chunk) => {
                setIsThinking(prev => prev ? false : prev);
                accumulated += chunk;
                const p = tryParsePartialJSON(accumulated);
                if (p?.daily_plan) setAiItinerary(p);
            },
            (err) => {
                console.error("❌ AI Stream Error:", err);
                setAiError("AI unavailable. Please check your API keys or try again shortly.");
            },
            () => {
                console.log("⚠️ Backend triggered retry (JSON validation failed). Resetting stream buffer.");
                accumulated = "";
                setAiItinerary(null);
                setIsThinking(true);
            },
            controller.signal
        ).then(() => {
            if (accumulated.trim()) {
                try {
                    let cleaned = accumulated.trim();
                    const firstBrace = cleaned.indexOf('{');
                    const lastBrace = cleaned.lastIndexOf('}');
                    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
                        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
                    }
                    const f = JSON.parse(cleaned);
                    if (f?.daily_plan) setAiItinerary(f);
                } catch (e) {
                    console.error(`❌ Final JSON parse failed (buffer: ${accumulated.length} chars). Error:`, e);
                    console.debug("🔍 Raw accumulated buffer (last 300 chars):", accumulated.slice(-300));
                }
            }
        }).catch((err) => {
            if (err?.name !== 'AbortError') {
                console.error("❌ startStream network error:", err);
                setAiError("Connection interrupted. Please try again.");
            }
        }).finally(() => {
            isStreamingRef.current = false;
            setPlannerLoading(false);
            setIsThinking(false);
            setTimeout(() => {
                setMiniMapData({
                    origin: `${flight?.validatingAirlineCodes?.[0] || 'Airline'} Terminal`,
                    destination: hotel?.name || 'Your Hotel',
                    distance: "24 km", duration: "35 min", traffic: "Light Traffic",
                    routeUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel?.name || '')}`
                });
                setBridgeLoading(false);
            }, 1000);
        });
    };

    // On page reload: if both were cached, fire once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (confirmedFlight && confirmedHotel && !plannerHasFired.current && !aiItinerary) {
            startStream(confirmedFlight, confirmedHotel);
        }
    }, []); // Empty: runs exactly once on mount


    const bgImage = heroImage || `https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1600&q=80`;

    if (!searchData) return null;

    const sortedFlights = useMemo(() => {
        return [...(transport.results || [])].sort((a, b) => {
            if (confirmedFlight?.id === a.id) return -1;
            if (confirmedFlight?.id === b.id) return 1;
            return 0;
        });
    }, [transport.results, confirmedFlight?.id]);

    const sortedHotels = useMemo(() => {
        return [...hotels].sort((a, b) => {
            if (confirmedHotel?.id === a.id) return -1;
            if (confirmedHotel?.id === b.id) return 1;
            return 0;
        });
    }, [hotels, confirmedHotel?.id]);

    return (
        <div className="selection:bg-[#B89A6A]/20 pb-16 font-sans bg-[#F4F1EB] text-[#1C1916] min-h-screen">
            <ChatBot
                destination={destName}
                aiItinerary={aiItinerary}
                setAiItinerary={(updated) => setAiItinerary({ ...updated })}
                hotels={hotels}
                transport={transport}
                events={events}
                journeySymbol={journeySymbol}
                onSelectHotel={toggleHotel}
                onSelectFlight={toggleFlight}
                onToggleEvent={toggleEvent}
            />

            <AnimatePresence>
                {toastMsg && (
                    <motion.div
                        key="toast"
                        initial={{ opacity: 0, y: 20, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 20, x: '-50%' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                        className="fixed bottom-24 left-1/2 z-[200] bg-[#1C1916] text-[#FDFCFA] px-6 py-3 rounded-2xl shadow-[0_8px_32px_rgba(28,25,22,0.4)] text-sm font-medium tracking-wide flex items-center gap-2 border border-[#B89A6A]/30"
                    >
                        <span className="text-[#B89A6A]">✓</span> {toastMsg}
                    </motion.div>
                )}
            </AnimatePresence>

            <FlightModal isOpen={isFlightModalOpen} onClose={() => setIsFlightModalOpen(false)} flights={sortedFlights} selectedId={confirmedFlight?.id} onSelect={toggleFlight} />
            <HotelModal isOpen={isHotelModalOpen} onClose={() => setIsHotelModalOpen(false)} hotels={sortedHotels} nights={nights} selectedId={confirmedHotel?.id} onSelect={toggleHotel} />
            <EventModal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} events={events} addedEvents={addedEvents} onToggle={toggleEvent} />

            {loading ? (
                <div className="h-screen flex flex-col items-center justify-center z-50 fixed inset-0 bg-[#F4F1EB]">
                    <Loader2 className="animate-spin text-[#B89A6A] mb-4" size={48} />
                    <h2 className="serif-text text-3xl font-light text-[#1C1916] tracking-tight animate-pulse">Curating stay in {destName}...</h2>
                </div>
            ) : (
                <div className="max-w-[1200px] mx-auto p-4 lg:p-8 space-y-8 mt-4 animate-fade-in">

                    {/* HERO */}
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

                            {aiItinerary && (
                                <div className="absolute top-8 right-8">
                                    <button
                                        onClick={handleSaveTrip}
                                        disabled={isSaving}
                                        className={`px-5 py-2.5 rounded-full flex items-center gap-2 transition-all text-sm font-medium tracking-wide shadow-lg border ${isSaving ? 'bg-[#FDFCFA]/50 text-[#9C9690] border-transparent cursor-not-allowed' : 'bg-[#1C1916] text-[#FDFCFA] hover:bg-[#2E3C3A] border-[#1C1916]'}`}
                                    >
                                        <Share className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save & Share Trip'}
                                    </button>
                                </div>
                            )}

                            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 mt-12">
                                <div className="space-y-4 max-w-2xl w-full">
                                    <h1 className="serif-text font-light text-[#1C1916] tracking-tight drop-shadow-sm uppercase leading-none break-words" style={{ fontSize: 'clamp(3rem,6vw,5.5rem)', letterSpacing: '-0.02em' }}>
                                        {destName}
                                    </h1>
                                    <div className="flex flex-wrap gap-3">
                                        <span className="bg-[#FDFCFA]/80 backdrop-blur-md px-4 py-2 rounded-full border border-[#E8E4DC] shadow-sm flex items-center gap-2 text-[#1C1916] text-xs font-medium tracking-widest uppercase">
                                            <Calendar className="w-3.5 h-3.5 text-[#B89A6A]" />
                                            {isRoundTrip
                                                ? `${arrivalDate} — ${departureDate}`
                                                : `${arrivalDate} · One Way`
                                            }
                                        </span>
                                    </div>
                                </div>

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
                                            <span className="flex items-center gap-1.5 text-xs tracking-wide"><Hotel className="w-3.5 h-3.5 text-[#2E3C3A]" />Hotel{isRoundTrip ? ` (${nights}n)` : ''}</span>
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

                    {/* Summary Pill */}
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

                    {/* FLIGHTS */}
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

                            {sortedFlights.slice(0, 2).map((f, i) => <FlightCard key={i} flight={f} isSelected={confirmedFlight?.id === f.id} onSelect={toggleFlight} />)}

                            <button onClick={() => setIsFlightModalOpen(true)} className="w-full mt-2 py-4 rounded-xl border border-dashed border-[#E8E4DC] text-[#9C9690] hover:text-[#1C1916] hover:border-[#B89A6A]/50 bg-[#FDFCFA] transition-all text-[10px] tracking-widest uppercase font-medium flex items-center justify-center gap-2">
                                View all {sortedFlights.length} flights <ChevronDown className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* HOTELS */}
                    <div className="bg-[#FDFCFA] shadow-[0_1px_4px_rgba(28,25,22,0.05)] border border-[#E8E4DC] rounded-3xl p-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-[#F4F1EB] rounded-xl border border-[#E8E4DC]"><Hotel className="w-5 h-5 text-[#2E3C3A]" /></div>
                                <h2 className="serif-text text-3xl font-light text-[#1C1916] tracking-tight">Select Stay</h2>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {sortedHotels.slice(0, 3).map((h, i) => <HotelCard key={i} hotel={h} nights={nights} isSelected={confirmedHotel?.id === h.id} onSelect={toggleHotel} />)}
                        </div>
                        <button onClick={() => setIsHotelModalOpen(true)} className="w-full mt-6 py-4 rounded-xl border border-dashed border-[#E8E4DC] text-[#9C9690] hover:text-[#1C1916] hover:border-[#B89A6A]/50 bg-[#FDFCFA] transition-all text-[10px] tracking-widest uppercase font-medium flex items-center justify-center gap-2">
                            View all {sortedHotels.length} hotels <ChevronDown className="w-4 h-4" />
                        </button>
                    </div>

                    {/* EVENTS */}
                    <div className="bg-[#FDFCFA] shadow-[0_1px_4px_rgba(28,25,22,0.05)] border border-[#E8E4DC] rounded-3xl p-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2.5 bg-[#F4F1EB] rounded-xl border border-[#E8E4DC]"><Ticket className="w-5 h-5 text-[#B89A6A]" /></div>
                            <h2 className="serif-text text-3xl font-light text-[#1C1916] tracking-tight">Local Experiences</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(Array.isArray(events) ? events : []).slice(0, 4).map((ev, i) => <EventCard key={i} event={ev} isAdded={addedEvents.some(e => e.id === ev.id)} onToggle={toggleEvent} />)}
                        </div>
                        <button onClick={() => setIsEventModalOpen(true)} className="w-full mt-6 py-4 rounded-xl border border-dashed border-[#E8E4DC] text-[#9C9690] hover:text-[#1C1916] hover:border-[#B89A6A]/50 bg-[#FDFCFA] transition-all text-[10px] tracking-widest uppercase font-medium flex items-center justify-center gap-2">
                            Discover more <ChevronDown className="w-4 h-4" />
                        </button>
                    </div>

                    {/* MAP LOGISTICS */}
                    <div className="relative">
                        <MiniMapBridge data={miniMapData} loading={bridgeLoading} />
                    </div>

                    {/* AI PLANNER */}
                    <div className="bg-[#FDFCFA] shadow-[0_1px_4px_rgba(28,25,22,0.05)] border border-[#E8E4DC] rounded-3xl p-8 relative min-h-[400px]">
                        {!aiItinerary ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                                {plannerLoading ? (
                                    isThinking ? (
                                        <div className="flex flex-col items-center justify-center p-10 space-y-4 animate-pulse">
                                            <div className="w-12 h-12 border-4 border-[#B89A6A] border-t-transparent rounded-full animate-spin"></div>
                                            <div className="text-center">
                                                <h3 className="serif-text text-2xl font-light text-[#1C1916]">AI is Architecting your trip...</h3>
                                                <p className="text-sm text-[#9C9690] mt-2 max-w-sm tracking-wide">
                                                    Calculating transit times, checking budget limits, and avoiding traveler fatigue.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-4">
                                            <Loader2 className="animate-spin text-[#B89A6A]" size={48} />
                                            <p className="serif-text text-2xl font-light text-[#1C1916] tracking-tight animate-pulse">Streaming Itinerary...</p>
                                        </div>
                                    )
                                ) : aiError ? (
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-14 h-14 rounded-full bg-[#F4F1EB] border border-[#E8E4DC] flex items-center justify-center">
                                            <span className="text-2xl">⚠️</span>
                                        </div>
                                        <h3 className="serif-text text-[#1C1916] font-light text-2xl tracking-tight">AI Temporarily Unavailable</h3>
                                        <p className="text-[#9C9690] text-sm max-w-sm">{aiError}</p>
                                        <button
                                            onClick={() => { setAiError(null); plannerHasFired.current = false; setConfirmedHotel({ ...confirmedHotel }); }} // Hack to trigger effect
                                            className="mt-2 px-6 py-2.5 bg-[#1C1916] text-[#FDFCFA] text-[10px] font-medium tracking-widest uppercase rounded-xl hover:bg-[#2E3C3A] transition-colors"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                ) : (
                                    <>
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

                    {/* CHECKOUT BAR */}
                    {confirmedFlight && confirmedHotel && (
                        <CheckoutBar
                            flight={confirmedFlight}
                            hotel={confirmedHotel}
                            currencySymbol={journeySymbol}
                            nights={nights}
                            originName={originName}
                        />
                    )}

                </div>
            )}

            {/* SHARE MODAL */}
            <AnimatePresence>
                {shareLink && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#1C1916]/40 backdrop-blur-sm"
                        onClick={() => setShareLink(null)}
                    >
                        <motion.div
                            initial={{ y: 20, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.95 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#FDFCFA] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-[#E8E4DC]"
                        >
                            <div className="p-6 border-b border-[#E8E4DC] relative">
                                <button onClick={() => setShareLink(null)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-[#F4F1EB] text-[#9C9690] transition-colors">
                                    <X size={18} />
                                </button>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-full bg-[#1C1916] flex items-center justify-center text-[#FDFCFA]">
                                        <Share size={18} />
                                    </div>
                                    <div>
                                        <h3 className="serif-text text-xl text-[#1C1916] font-light">Trip Saved!</h3>
                                        <p className="text-xs text-[#9C9690]">Copy the link below to access your itinerary anytime.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 bg-[#F4F1EB] space-y-4">
                                <div className="flex items-center justify-between p-3 bg-[#FDFCFA] border border-[#E8E4DC] rounded-xl overflow-hidden">
                                    <span className="text-xs font-mono text-[#5A554A] truncate flex-1 select-all">{shareLink}</span>
                                    <button
                                        onClick={copyToClipboard}
                                        className="ml-3 p-2 bg-[#F4F1EB] hover:bg-[#E8E4DC] rounded-lg transition-colors text-[#1C1916]"
                                    >
                                        {copied ? <Check size={16} className="text-[#B89A6A]" /> : <Copy size={16} />}
                                    </button>
                                </div>
                                <button
                                    onClick={() => setShareLink(null)}
                                    className="w-full py-3 bg-[#1C1916] hover:bg-[#2E3C3A] text-[#FDFCFA] rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default ResultsPage;