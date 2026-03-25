import { useState, useRef, useEffect } from 'react';
import { X, Send, MessageSquare, Wand2, RotateCcw, Plane, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatWithAI, modifyItinerary } from '../services/api';

// Render structured AI text: supports **bold**, bullet points, icons
const FormattedMessage = ({ text }) => {
    if (!text) return null;
    const lines = text.split('\n').filter(l => l.trim());
    return (
        <div className="space-y-1.5">
            {lines.map((line, i) => {
                const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('• ');
                const cleanLine = line.replace(/^[-•]\s*/, '').trim();

                // Replace **bold** with styled spans
                const renderBold = (str) =>
                    str.split(/\*\*(.*?)\*\*/g).map((part, j) =>
                        j % 2 === 1
                            ? <span key={j} className="font-bold text-[#1C1916]">{part}</span>
                            : <span key={j}>{part}</span>
                    );

                if (isBullet) {
                    return (
                        <div key={i} className="flex items-start gap-2">
                            <span className="text-[#B89A6A] mt-0.5 flex-shrink-0">◆</span>
                            <span>{renderBold(cleanLine)}</span>
                        </div>
                    );
                }
                return <p key={i}>{renderBold(line)}</p>;
            })}
        </div>
    );
};

const QUICK_EDITS = [
    { label: '🍜 Change Day 1 food', prompt: 'Change the Day 1 food activity to something more authentic and local.' },
    { label: '🏖️ Add beach time', prompt: 'Add a beach or waterfront activity on the last day.' },
    { label: '💆 Make it relaxed', prompt: 'Reduce the number of activities per day to make the trip more relaxed.' },
    { label: '💸 Stay on budget', prompt: 'Optimize the itinerary to reduce total activity costs by 20%.' },
];

// Inline Hotel Card for chat
const ChatHotelCard = ({ hotel, onSelect }) => (
    <div className="bg-white border border-[#E8E4DC] rounded-xl p-3 shadow-sm w-full">
        <div className="flex items-start gap-3">
            <img src={hotel.image} alt={hotel.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="font-bold text-[#1C1916] text-xs truncate">{hotel.name}</div>
                <div className="flex items-center gap-1 mt-0.5">
                    <Star size={10} className="text-amber-500 fill-amber-500" />
                    <span className="text-[10px] text-[#9C9690]">{hotel.rating}</span>
                    <span className="text-[10px] text-[#9C9690] ml-1">{hotel.distance}</span>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs font-bold text-[#1C1916]">{hotel.price}</span>
                    <button
                        onClick={() => onSelect(hotel)}
                        className="px-2 py-1 bg-[#1C1916] text-[#FDFCFA] text-[9px] uppercase tracking-wider font-bold rounded-lg hover:bg-[#2E3C3A] transition-colors"
                    >
                        Select
                    </button>
                </div>
            </div>
        </div>
    </div>
);

// Inline Event Card for chat
const ChatEventCard = ({ event, symbol, onToggle }) => (
    <div className="bg-white border border-[#E8E4DC] rounded-xl p-3 shadow-sm w-full">
        <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-lg bg-[#F4F1EB] border border-[#E8E4DC] flex-shrink-0 flex items-center justify-center">
               <Star size={18} className="text-[#B89A6A]" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-bold text-[#1C1916] text-xs truncate">{event.title}</div>
                <div className="text-[10px] text-[#9C9690] truncate mt-0.5">{event.category || 'Experience'}</div>
                <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs font-bold text-[#1C1916]">{event.price || 'Check Info'}</span>
                    <button
                        onClick={() => onToggle && onToggle(event)}
                        className="px-2 py-1 bg-[#1C1916] text-[#FDFCFA] text-[9px] uppercase tracking-wider font-bold rounded-lg hover:bg-[#2E3C3A] transition-colors"
                    >
                        Toggle
                    </button>
                </div>
            </div>
        </div>
    </div>
);

// Inline Flight Card for chat
const ChatFlightCard = ({ flight, symbol, onSelect }) => {
    const itinerary = flight.itineraries?.[0];
    const firstSeg = itinerary?.segments?.[0];
    const lastSeg = itinerary?.segments?.[itinerary.segments.length - 1];
    const airline = flight.validatingAirlineCodes?.[0] || 'Airline';
    const price = flight.price?.total || '—';
    const stops = (itinerary?.segments?.length || 1) - 1;

    return (
        <div className="bg-white border border-[#E8E4DC] rounded-xl p-3 shadow-sm w-full">
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-[#F4F1EB] flex items-center justify-center">
                        <Plane size={12} className="text-[#B89A6A]" />
                    </div>
                    <span className="text-xs font-bold text-[#1C1916]">{airline}</span>
                </div>
                <span className="text-xs font-bold text-[#1C1916]">{symbol}{price}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-[#5A554A] mb-2 px-1">
                <div className="text-center">
                    <div className="font-bold text-[#1C1916] text-xs">{firstSeg?.departure?.at?.split('T')[1]?.slice(0,5) || '—'}</div>
                    <div>{firstSeg?.departure?.iataCode || '—'}</div>
                </div>
                <div className="flex-1 flex flex-col items-center px-2">
                    <span className="text-[9px] text-[#9C9690] mb-0.5">{itinerary?.duration?.replace('PT','').toLowerCase() || '—'}</span>
                    <div className="w-full h-px bg-[#E8E4DC] relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#B89A6A]"></div>
                    </div>
                    <span className="text-[9px] text-[#B89A6A] mt-0.5">{stops === 0 ? 'Direct' : `${stops} Stop`}</span>
                </div>
                <div className="text-center">
                    <div className="font-bold text-[#1C1916] text-xs">{lastSeg?.arrival?.at?.split('T')[1]?.slice(0,5) || '—'}</div>
                    <div>{lastSeg?.arrival?.iataCode || '—'}</div>
                </div>
            </div>
            <button
                onClick={() => onSelect(flight)}
                className="w-full py-1.5 bg-[#1C1916] text-[#FDFCFA] text-[10px] uppercase tracking-wider font-bold rounded-lg hover:bg-[#2E3C3A] transition-colors"
            >
                Select Flight
            </button>
        </div>
    );
};

const ChatBot = ({ destination, aiItinerary, setAiItinerary, currentDay, hotels = [], transport, events = [], journeySymbol = '₹', onSelectHotel, onSelectFlight, onToggleEvent }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([{
        role: 'assistant',
        text: `Hi! I'm your **Travex AI Concierge** 🌍\n\nI can:\n- Answer questions about **${destination || 'your destination'}**\n- Show **hotels** or **flights** (e.g. "hotels under 5000")\n- Edit your **itinerary** on demand\n\nJust tell me what you need!`,
        type: 'greeting'
    }]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [unread, setUnread] = useState(0);
    const scrollRef = useRef(null);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!isOpen && messages.length > 1) setUnread(prev => prev + 1);
    }, [messages]);

    const handleOpen = () => { setIsOpen(true); setUnread(0); };

    // Parse price from string like "₹5000/night" or "$120/night"
    const parsePrice = (priceStr) => {
        if (!priceStr) return 0;
        const num = priceStr.replace(/[^0-9.]/g, '');
        return parseFloat(num) || 0;
    };

    // Detect hotel query and extract budget
    const detectHotelQuery = (prompt) => {
        const lower = prompt.toLowerCase();
        const hotelKeywords = ['hotel', 'stay', 'accommodation', 'lodge', 'room'];
        if (!hotelKeywords.some(k => lower.includes(k))) return null;

        // Extract price threshold: "under 5000", "below 3000", "less than 8000", "cheaper than 10000"
        const priceMatch = lower.match(/(?:under|below|less\s+than|cheaper\s+than|within|max|budget)\s*(?:₹|\$|€|rs\.?|inr|usd)?\s*(\d+)/i);
        const maxPrice = priceMatch ? parseInt(priceMatch[1]) : null;

        // Also detect "cheapest" or "affordable"
        const wantsCheap = /cheap|afford|budget|low.?cost|bargain/i.test(lower);

        return { maxPrice, wantsCheap };
    };

    // Detect flight query
    const detectFlightQuery = (prompt) => {
        const lower = prompt.toLowerCase();
        const flightKeywords = ['flight', 'fly', 'airline', 'plane', 'cheapest flight', 'direct flight'];
        if (!flightKeywords.some(k => lower.includes(k))) return null;

        const priceMatch = lower.match(/(?:under|below|less\s+than|cheaper\s+than|within|max)\s*(?:₹|\$|€|rs\.?|inr|usd)?\s*(\d+)/i);
        const maxPrice = priceMatch ? parseInt(priceMatch[1]) : null;
        const wantsCheap = /cheap|afford|budget|low.?cost|bargain/i.test(lower);
        const wantsDirect = /direct|non.?stop|nonstop/i.test(lower);

        return { maxPrice, wantsCheap, wantsDirect };
    };

    // Detect event query
    const detectEventQuery = (prompt) => {
        const lower = prompt.toLowerCase();
        const eventKeywords = ['event', 'activity', 'thing to do', 'experience', 'tour', 'place to visit'];
        if (!eventKeywords.some(k => lower.includes(k))) return null;
        const wantsCheap = /cheap|afford|budget|free/i.test(lower);
        return { wantsCheap };
    };

    const handleSend = async (overridePrompt) => {
        const userPrompt = overridePrompt || input.trim();
        if (!userPrompt) return;

        setMessages(prev => [...prev, { role: 'user', text: userPrompt }]);
        setInput('');
        setLoading(true);

        // 1. Check for hotel query
        const hotelQuery = detectHotelQuery(userPrompt);
        if (hotelQuery && hotels.length > 0) {
            let filtered = [...hotels];

            if (hotelQuery.maxPrice) {
                filtered = filtered.filter(h => parsePrice(h.price) <= hotelQuery.maxPrice);
            }
            if (hotelQuery.wantsCheap) {
                filtered.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
            }

            const results = filtered.slice(0, 4);

            if (results.length > 0) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    text: hotelQuery.maxPrice
                        ? `Here are **${results.length} hotels** under ${journeySymbol}${hotelQuery.maxPrice}:`
                        : `Here are the **best hotel options** for your trip:`,
                    type: 'hotel_suggestions',
                    hotelData: results
                }]);
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    text: hotelQuery.maxPrice
                        ? `No hotels found under ${journeySymbol}${hotelQuery.maxPrice}. Try a higher budget or check the hotels section above.`
                        : `I couldn't find matching hotels. Check the hotels section above for all options.`
                }]);
            }
            setLoading(false);
            return;
        }

        // 2. Check for flight query
        const flightQuery = detectFlightQuery(userPrompt);
        const flightResults = transport?.results || [];
        if (flightQuery && flightResults.length > 0) {
            let filtered = [...flightResults];

            if (flightQuery.maxPrice) {
                filtered = filtered.filter(f => parseFloat(f.price?.total || 0) <= flightQuery.maxPrice);
            }
            if (flightQuery.wantsDirect) {
                filtered = filtered.filter(f => (f.itineraries?.[0]?.segments?.length || 1) === 1);
            }
            if (flightQuery.wantsCheap) {
                filtered.sort((a, b) => parseFloat(a.price?.total || 0) - parseFloat(b.price?.total || 0));
            }

            const results = filtered.slice(0, 3);

            if (results.length > 0) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    text: flightQuery.maxPrice
                        ? `Found **${results.length} flights** under ${journeySymbol}${flightQuery.maxPrice}:`
                        : flightQuery.wantsDirect
                            ? `Here are the **direct flights** available:`
                            : `Here are the **best flight options**:`,
                    type: 'flight_suggestions',
                    flightData: results
                }]);
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    text: `No flights match that criteria. Check the flights section above for all options.`
                }]);
            }
            setLoading(false);
            return;
        }

        // 3. Detect event query
        const eventQuery = detectEventQuery(userPrompt);
        if (eventQuery && events && events.length > 0) {
            let filtered = [...events];
            if (eventQuery.wantsCheap) filtered.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
            const results = filtered.slice(0, 3);
            if (results.length > 0) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    text: `Here are some great **local experiences** for you:`,
                    type: 'event_suggestions',
                    eventData: results
                }]);
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    text: `I couldn't find specific events right now, but check the Local Experiences section above!`
                }]);
            }
            setLoading(false);
            return;
        }

        // 4. Detect edit intent — if itinerary exists AND prompt sounds like a modification
        const editKeywords = ['change day', 'swap', 'remove the', 'replace', 'add activity', 'update day', 'delete', 'move to day', 'fewer activities', 'make it cheaper'];
        const isEditRequest = aiItinerary && editKeywords.some(kw => userPrompt.toLowerCase().includes(kw));

        try {
            if (isEditRequest) {
                setMessages(prev => [...prev, { role: 'assistant', text: '✦ Applying your changes...', type: 'system' }]);
                const data = await modifyItinerary(userPrompt, aiItinerary, { currentDay });
                if (data?.updatedItinerary) {
                    setAiItinerary(data.updatedItinerary);
                    setMessages(prev => [
                        ...prev.filter(m => m.text !== '✦ Applying your changes...'),
                        { role: 'assistant', text: data.message || `**Itinerary updated!** ✓\n\nYour plan has been adjusted based on your request. Scroll up to see the changes in the timeline.`, type: 'success' }
                    ]);
                } else {
                    setMessages(prev => [
                        ...prev.filter(m => m.text !== '✦ Applying your changes...'),
                        { role: 'assistant', text: 'I ran into an issue updating the itinerary. Please try again or rephrase your request.' }
                    ]);
                }
            } else {
                // 4. General AI chat
                const data = await chatWithAI(`Context: Planning trip to ${destination}. Question: ${userPrompt}`, { currentDay });
                setMessages(prev => [...prev, { role: 'assistant', text: data?.reply || "I'm having trouble connecting. Try again shortly." }]);
            }
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', text: 'Something went wrong. My systems are busy.' }]);
        }

        setLoading(false);
    };

    return (
        <div className="fixed bottom-6 right-6 z-[150] flex flex-col items-end gap-3">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 24, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 24, scale: 0.92 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        className="w-[360px] bg-[#FDFCFA] border border-[#E8E4DC] rounded-[1.75rem] shadow-[0_20px_60px_rgba(28,25,22,0.15)] overflow-hidden flex flex-col"
                        style={{ maxHeight: '560px' }}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#1C1916] to-[#2E3C3A] p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#B89A6A]/20 border border-[#B89A6A]/30 flex items-center justify-center">
                                    <Wand2 size={16} className="text-[#B89A6A]" />
                                </div>
                                <div>
                                    <div className="text-[#FDFCFA] font-semibold text-sm tracking-wide">Travex AI</div>
                                    <div className="text-[#9C9690] text-[10px] tracking-widest uppercase">Your Travel Concierge</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => { setMessages([{ role: 'assistant', text: `Hi again! How can I help with **${destination || 'your trip'}**?`, type: 'greeting' }]); }}
                                    className="text-[#9C9690] hover:text-[#FDFCFA] transition-colors p-1.5 rounded-lg hover:bg-white/10"
                                    title="Reset chat"
                                >
                                    <RotateCcw size={14} />
                                </button>
                                <button onClick={() => setIsOpen(false)} className="text-[#9C9690] hover:text-[#FDFCFA] transition-colors p-1.5 rounded-lg hover:bg-white/10">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Quick Edit Chips (only shown when itinerary exists and no messages from user yet) */}
                        {aiItinerary && messages.filter(m => m.role === 'user').length === 0 && (
                            <div className="px-4 pt-3 pb-1">
                                <p className="text-[9px] text-[#9C9690] uppercase tracking-widest font-medium mb-2">Quick Edits</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {QUICK_EDITS.map(q => (
                                        <button
                                            key={q.label}
                                            onClick={() => handleSend(q.prompt)}
                                            className="px-2.5 py-1 rounded-xl bg-[#F4F1EB] border border-[#E8E4DC] text-[10px] text-[#5A554A] hover:border-[#B89A6A] hover:text-[#1C1916] transition-all font-medium tracking-wide"
                                        >
                                            {q.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                            {messages.map((m, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {m.role === 'assistant' && (
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#B89A6A] to-[#A8876A] flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Wand2 size={12} className="text-white" />
                                        </div>
                                    )}
                                    <div className={`max-w-[82%] text-xs leading-relaxed px-3.5 py-2.5 rounded-2xl
                                        ${m.role === 'user'
                                            ? 'bg-[#1C1916] text-[#FDFCFA] rounded-tr-sm'
                                            : m.type === 'success'
                                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-tl-sm'
                                                : m.type === 'system'
                                                    ? 'bg-[#F4F1EB] border border-[#E8E4DC] text-[#9C9690] italic rounded-tl-sm'
                                                    : 'bg-[#F4F1EB] border border-[#E8E4DC] text-[#1C1916] rounded-tl-sm'
                                        }`}
                                    >
                                        {m.role === 'assistant' && <FormattedMessage text={m.text} />}
                                        {m.role === 'user' && m.text}

                                        {/* Inline Hotel Cards */}
                                        {m.type === 'hotel_suggestions' && m.hotelData && (
                                            <div className="mt-2 space-y-2">
                                                {m.hotelData.map((h, j) => (
                                                    <ChatHotelCard key={j} hotel={h} onSelect={onSelectHotel} />
                                                ))}
                                            </div>
                                        )}

                                        {/* Inline Flight Cards */}
                                        {m.type === 'flight_suggestions' && m.flightData && (
                                            <div className="mt-2 space-y-2">
                                                {m.flightData.map((f, j) => (
                                                    <ChatFlightCard key={j} flight={f} symbol={journeySymbol} onSelect={onSelectFlight} />
                                                ))}
                                            </div>
                                        )}

                                        {/* Inline Event Cards */}
                                        {m.type === 'event_suggestions' && m.eventData && (
                                            <div className="mt-2 space-y-2">
                                                {m.eventData.map((e, j) => (
                                                    <ChatEventCard key={j} event={e} symbol={journeySymbol} onToggle={onToggleEvent} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                            {loading && (
                                <div className="flex gap-2.5 justify-start">
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#B89A6A] to-[#A8876A] flex items-center justify-center flex-shrink-0">
                                        <Wand2 size={12} className="text-white" />
                                    </div>
                                    <div className="bg-[#F4F1EB] border border-[#E8E4DC] px-4 py-2.5 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#B89A6A] animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#B89A6A] animate-bounce" style={{ animationDelay: '120ms' }} />
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#B89A6A] animate-bounce" style={{ animationDelay: '240ms' }} />
                                    </div>
                                </div>
                            )}
                            <div ref={scrollRef} />
                        </div>

                        {/* Input */}
                        <div className="p-3 bg-white border-t border-[#E8E4DC] flex items-center gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !loading && handleSend()}
                                placeholder={aiItinerary ? 'Edit itinerary or ask anything...' : 'Ask about your destination...'}
                                className="flex-1 bg-transparent text-[#1C1916] text-xs outline-none placeholder-[#9C9690] px-2 font-medium"
                            />
                            <button
                                onClick={() => handleSend()}
                                disabled={loading || !input.trim()}
                                className="bg-gradient-to-br from-[#1C1916] to-[#2E3C3A] hover:from-[#2E3C3A] hover:to-[#1C1916] text-[#FDFCFA] p-2.5 rounded-xl transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Send size={14} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* FAB Trigger */}
            <motion.button
                onClick={handleOpen}
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.95 }}
                className="relative w-14 h-14 bg-gradient-to-br from-[#1C1916] to-[#2E3C3A] rounded-2xl shadow-[0_8px_24px_rgba(28,25,22,0.35)] text-[#FDFCFA] flex items-center justify-center border border-[#B89A6A]/30"
            >
                <AnimatePresence mode="wait">
                    {isOpen
                        ? <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><X size={22} /></motion.div>
                        : <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}><MessageSquare size={22} /></motion.div>
                    }
                </AnimatePresence>
                {unread > 0 && !isOpen && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#B89A6A] rounded-full text-[10px] text-white font-bold flex items-center justify-center shadow"
                    >
                        {unread}
                    </motion.div>
                )}
                {/* Subtle ping ring */}
                {!isOpen && (
                    <span className="absolute inset-0 rounded-2xl ring-2 ring-[#B89A6A]/30 animate-ping opacity-30" />
                )}
            </motion.button>
        </div>
    );
};

export default ChatBot;