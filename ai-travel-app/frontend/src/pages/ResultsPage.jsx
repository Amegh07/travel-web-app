import { useEffect, useState, useMemo, useRef, startTransition } from 'react';
import {
    ArrowLeft, Plane, Hotel, Calendar, DollarSign, Loader2, Car,
    Ticket, MapPin, X, CheckCircle, ExternalLink, Navigation, Star, ChevronDown, Globe,
    Music, Utensils, Moon, Camera, Heart, Share, Copy, Check
} from 'lucide-react';
import { searchAll, fetchItineraryStream, API_BASE } from '../services/api';
import ItineraryTimeline from '../components/ItineraryTimeline';
import { healItinerary } from '../utils/healer';
import ChatBot from '../components/ChatBot';
import { motion, AnimatePresence } from 'framer-motion';

import { calculateNights, openDirectionsToAirport } from '../utils/formatters';
import CheckoutBar from '../components/CheckoutBar';
import FlightCard from '../components/FlightCard';
import HotelCard from '../components/HotelCard';
import EventCard from '../components/EventCard';
import { FlightModal, HotelModal, EventModal } from '../components/SelectionModals';

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
            // Bug N fix: use duration from search if provided, otherwise 5-day default
            const d = new Date(arrivalDate);
            const tripNights = parseInt(searchData?.duration) || 5;
            d.setDate(d.getDate() + tripNights);
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

    // Bug C fix: initial transport shape uses `results` not `data` to match all consumers
    const [transport, setTransport] = useState(() => initialCache.transport || { type: 'loading', results: [], journey: null });
    const [hotels, setHotels] = useState(() => initialCache.hotels || []);
    const [events, setEvents] = useState(() => {
        const cached = initialCache.events;
        if (Array.isArray(cached)) return cached;
        if (cached && typeof cached === 'object') return cached.events || cached.activities || [];
        return [];
    });
    const [loading, setLoading] = useState(() => initialCache.hotels?.length > 0 ? false : true);
    const [heroImage, setHeroImage] = useState(() => initialCache.heroImage || null);
    const [searchWarnings, setSearchWarnings] = useState(() => initialCache.searchWarnings || []);

    const [isFlightModalOpen, setIsFlightModalOpen] = useState(false);
    const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);

    const [showAllHotels, setShowAllHotels] = useState(false);
    const hotelsSectionRef = useRef(null);

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
    const [isRefining, setIsRefining] = useState(false);

    // Save & Share State
    const [isSaving, setIsSaving] = useState(false);
    const [shareLink, setShareLink] = useState(null);
    const [copied, setCopied] = useState(false);

    // Refs for stream control
    const plannerHasFired = useRef(false);
    const abortControllerRef = useRef(null);
    const isStreamingRef = useRef(false);
    const isMountedStore = useRef(true);

    useEffect(() => {
        isMountedStore.current = true;
        return () => { isMountedStore.current = false; };
    }, []);

    useEffect(() => {
        if (isFlightModalOpen || isHotelModalOpen || isEventModalOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isFlightModalOpen, isHotelModalOpen, isEventModalOpen]);

    useEffect(() => {
        const cacheObj = {
            lastSearchDestination: destName,
            transport, hotels, events, heroImage,
            confirmedFlight, confirmedHotel, addedEvents, searchWarnings,
            miniMapData, aiItinerary
        };
        localStorage.setItem('travex_results_cache', JSON.stringify(cacheObj));
    }, [destName, transport, hotels, events, heroImage, confirmedFlight, confirmedHotel, addedEvents, searchWarnings, miniMapData, aiItinerary]);

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

            let parsedSearchData = searchData;
            try { if (searchDataStr) parsedSearchData = JSON.parse(searchDataStr); } catch (e) { console.error('Silent JSON parse fail on searchData', e); }

            let parsedResultsData = {};
            try { if (cache) parsedResultsData = JSON.parse(cache); } catch (e) { console.error('Silent JSON parse fail on cache', e); }

            const payload = {
                searchData: parsedSearchData,
                resultsData: parsedResultsData,
                shareId: parsedSearchData?.shareId || null
            };

            const response = await fetch(`${API_BASE}/api/save-trip`, {
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
                startStream(flight, confirmedHotel);
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
                startStream(confirmedFlight, hotel);
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
                // Bug L fix: add to the last full (non-arrival, non-departure) day
                // instead of the day with fewest activities (which is usually Day 1)
                const fullDays = dayPlan.slice(1, dayPlan.length - 1);
                const targetDayIndex = fullDays.length > 0
                    ? 1 + fullDays.reduce((bestIdx, day, i, arr) =>
                        day.activities.length >= arr[bestIdx].activities.length ? bestIdx : i, 0)
                    : dayPlan.length - 1;

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
            setSearchWarnings([]);
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
                setSearchWarnings(results.searchWarnings || []);
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
        const paxCount = parseInt(searchData?.pax || 1);
        // Bug M fix: account for multiple rooms when group is large
        const roomCount = Math.ceil(paxCount / 2);
        const pricePerNight = parseFloat(hotel?.price?.replace(/[^0-9.]/g, '') || 0);
        const hotelCost = pricePerNight * nights * roomCount;
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
        let lastParsedTime = Date.now();

        fetchItineraryStream(payload,
            (chunk) => {
                setIsThinking(prev => prev ? false : prev);
                accumulated += chunk;
                
                const now = Date.now();
                // Throttle expensive JSON parsing to every 250ms to prevent main thread blocking
                if (now - lastParsedTime >= 250) {
                    lastParsedTime = now;
                    const p = tryParsePartialJSON(accumulated);
                    if (p?.daily_plan) {
                        startTransition(() => {
                            setAiItinerary(p);
                        });
                    }
                }
            },
            (err) => {
                console.error("❌ AI Stream Error:", err);
                setAiError("AI unavailable. Please check your API keys or try again shortly.");
                // Bug G fix: reset the fired flag so retry button actually works
                plannerHasFired.current = false;
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
                setIsRefining(true);
                setTimeout(() => {
                    try {
                        let cleaned = accumulated.trim();
                        const firstBrace = cleaned.indexOf('{');
                        const lastBrace = cleaned.lastIndexOf('}');
                        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
                            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
                        }
                        const f = JSON.parse(cleaned);
                        const healedData = healItinerary(f, parseFloat(searchData?.budget || 2000));
                        if (healedData?.daily_plan) setAiItinerary(healedData);
                    } catch (e) {
                        console.error(`❌ Final JSON parse failed (buffer: ${accumulated.length} chars). Error:`, e);
                        console.debug("🔍 Raw accumulated buffer (last 300 chars):", accumulated.slice(-300));
                    } finally {
                        setIsRefining(false);
                    }
                }, 800);
            }
        }).catch((err) => {
            if (err?.name !== 'AbortError') {
                console.error("❌ startStream network error:", err);
                setAiError("Connection interrupted. Please try again.");
                // Bug G fix: reset the fired flag so retry button actually works
                plannerHasFired.current = false;
            }
        }).finally(() => {
            isStreamingRef.current = false;
            setPlannerLoading(false);
            setIsThinking(false);
            setTimeout(() => {
                if (!isMountedStore.current) return;
                setMiniMapData({
                    origin: `${flight?.validatingAirlineCodes?.[0] || 'Airline'} Terminal`,
                    destination: hotel?.name || 'Your Hotel',
                    // Fix #4/#9: Label as estimates; use maps/dir/ for real directions (not place search)
                    distance: "~24 km (est.)", duration: "~35 min (est.)", traffic: "Verify before travel",
                    routeUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hotel?.name || '')}&travelmode=driving`
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

    // Bug O fix: re-sync aiItinerary from localStorage when user returns from DayDetailPage
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                try {
                    const cache = localStorage.getItem('travex_results_cache');
                    if (cache) {
                        const parsed = JSON.parse(cache);
                        if (parsed.aiItinerary) {
                            setAiItinerary(parsed.aiItinerary);
                        }
                    }
                } catch (e) { /* silent */ }
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);


    // ── derived sorted lists must be declared BEFORE any early return to satisfy Rules of Hooks
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
            return parseFloat(b.rating || 0) - parseFloat(a.rating || 0);
        });
    }, [hotels, confirmedHotel?.id]);

    if (!searchData) return null;

    const bgImage = heroImage || `https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1600&q=80`;

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

                    {searchWarnings.length > 0 && (
                        <div className="bg-[#FFF8F2] border border-[#E7C9A9] rounded-2xl p-5 space-y-2 shadow-[0_1px_4px_rgba(28,25,22,0.05)]">
                            <div className="flex items-center gap-2 text-[#8C5A2B] text-xs font-semibold tracking-[0.18em] uppercase">
                                <Globe className="w-4 h-4" />
                                Live Provider Status
                            </div>
                            {searchWarnings.map((warning, index) => (
                                <p key={index} className="text-sm text-[#5A554A]">
                                    {warning}
                                </p>
                            ))}
                        </div>
                    )}

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

                            {sortedFlights.length > 0 ? (
                                <>
                                    {sortedFlights.slice(0, 2).map((f, i) => <FlightCard key={i} flight={f} isSelected={confirmedFlight?.id === f.id} onSelect={toggleFlight} />)}

                                    <button onClick={() => setIsFlightModalOpen(true)} className="w-full mt-2 py-4 rounded-xl border border-dashed border-[#E8E4DC] text-[#9C9690] hover:text-[#1C1916] hover:border-[#B89A6A]/50 bg-[#FDFCFA] transition-all text-[10px] tracking-widest uppercase font-medium flex items-center justify-center gap-2">
                                        View all {sortedFlights.length} flights <ChevronDown className="w-4 h-4" />
                                    </button>
                                </>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-[#E8E4DC] bg-[#FDFCFA] px-5 py-8 text-center">
                                    <p className="serif-text text-xl font-light text-[#1C1916]">Flights unavailable right now</p>
                                    <p className="mt-2 text-sm text-[#9C9690]">The app is waiting on Amadeus to recover instead of showing made-up fares.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* HOTELS */}
                    <div ref={hotelsSectionRef} className="bg-[#FDFCFA] shadow-[0_1px_4px_rgba(28,25,22,0.05)] border border-[#E8E4DC] rounded-3xl p-8 transition-all duration-300 scroll-mt-24">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-[#F4F1EB] rounded-xl border border-[#E8E4DC]"><Hotel className="w-5 h-5 text-[#2E3C3A]" /></div>
                                <h2 className="serif-text text-3xl font-light text-[#1C1916] tracking-tight">Select Stay</h2>
                            </div>
                        </div>

                        {sortedHotels.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {sortedHotels.slice(0, showAllHotels ? 13 : 3).map((h, i) => <HotelCard key={i} hotel={h} nights={nights} isSelected={confirmedHotel?.id === h.id} onSelect={toggleHotel} />)}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-[#E8E4DC] bg-[#FDFCFA] px-5 py-8 text-center">
                                <p className="serif-text text-xl font-light text-[#1C1916]">Hotels unavailable right now</p>
                                <p className="mt-2 text-sm text-[#9C9690]">No synthetic stays are being shown. The backend is reporting the live provider outage directly.</p>
                            </div>
                        )}
                        
                        {sortedHotels.length > 3 && (
                            <button 
                                onClick={() => {
                                    const nextState = !showAllHotels;
                                    setShowAllHotels(nextState);
                                    if (nextState && hotelsSectionRef.current) {
                                        hotelsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                }} 
                                className="w-full mt-6 py-4 rounded-xl border border-dashed border-[#E8E4DC] text-[#9C9690] hover:text-[#1C1916] hover:border-[#B89A6A]/50 bg-[#FDFCFA] transition-all text-[10px] tracking-widest uppercase font-medium flex items-center justify-center gap-2"
                            >
                                {showAllHotels ? 'Show fewer hotels' : `View ${Math.min(10, sortedHotels.length - 3)} more top rated hotels`} <ChevronDown className={`w-4 h-4 transition-transform ${showAllHotels ? 'rotate-180' : ''}`} />
                            </button>
                        )}
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
                                            onClick={() => { setAiError(null); plannerHasFired.current = false; startStream(confirmedFlight, confirmedHotel); }}
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
                                {isRefining ? (
                                    <div className="flex flex-col items-center justify-center p-12 space-y-4 animate-fade-in min-h-[400px]">
                                        <div className="relative">
                                            <div className="absolute inset-0 border-4 border-[#B89A6A]/30 rounded-full animate-ping"></div>
                                            <div className="w-16 h-16 border-4 border-[#B89A6A] border-t-transparent rounded-full animate-spin"></div>
                                            <span className="absolute inset-0 flex items-center justify-center text-xl">✨</span>
                                        </div>
                                        <div className="text-center">
                                            <h3 className="serif-text text-2xl font-light text-[#1C1916]">Refining Itinerary...</h3>
                                            <p className="text-sm text-[#9C9690] mt-2 max-w-sm tracking-wide animate-pulse">
                                                Applying logical constraints and calculating budget.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="p-2.5 bg-[#F4F1EB] rounded-xl border border-[#E8E4DC]"><Calendar className="w-5 h-5 text-[#2E3C3A]" /></div>
                                            <h2 className="serif-text text-3xl font-light text-[#1C1916] tracking-tight">Your Daily Itinerary</h2>
                                        </div>
                                        <ItineraryTimeline plan={aiItinerary} />
                                    </>
                                )}
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
