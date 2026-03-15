import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Camera, Utensils, Moon, Sun, Map, ArrowRight, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Activity type icon — warm palette
const ActivityIcon = ({ type }) => {
    const t = (type || '').toLowerCase();
    if (t.includes('food') || t.includes('lunch') || t.includes('dinner') || t.includes('meal'))
        return <Utensils size={13} className="text-[#B89A6A]" />;
    if (t.includes('transit') || t.includes('drive') || t.includes('travel') || t.includes('logistics'))
        return <Navigation size={13} className="text-[#2E3C3A]" />;
    if (t.includes('night') || t.includes('party'))
        return <Moon size={13} className="text-[#9C9690]" />;
    if (t.includes('sight') || t.includes('visit') || t.includes('museum'))
        return <Camera size={13} className="text-[#B89A6A]" />;
    return <Sun size={13} className="text-[#B89A6A]" />;
};

const CalendarSVG = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const ItineraryTimeline = ({ plan, currency = 'INR' }) => {
    const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
    const navigate = useNavigate();
    const [itinerary, setItinerary] = useState(plan);
    const [selectedFoodAct, setSelectedFoodAct] = useState(null);

    // Always sync when parent AI updates (chatbot edit, regen)
    useEffect(() => { setItinerary(plan); }, [plan]);

    if (!itinerary?.daily_plan) return null;

    return (
        <div className="w-full space-y-6 animate-fade-in">

            {/* Header */}
            <div className="flex justify-between items-end pb-4 border-b border-[#E8E4DC]">
                <div>
                    <h2 className="serif-text text-3xl font-light text-[#1C1916] tracking-tight">
                        {itinerary.trip_name || 'Your Itinerary'}
                    </h2>
                    <p className="text-[#9C9690] text-[10px] tracking-widest uppercase font-medium mt-1.5">
                        {itinerary.daily_plan.length}-Day Curated Journey
                    </p>
                </div>
            </div>

            {/* Timeline */}
            <div className="relative ml-3">
                {/* Vertical rail */}
                <div className="absolute top-2 bottom-2 left-0 w-px bg-gradient-to-b from-[#B89A6A]/40 via-[#E8E4DC] to-transparent" />

                <div className="space-y-10">
                    {itinerary.daily_plan.map((day, dayIndex) => (
                        <div key={dayIndex} className="relative pl-8">
                            {/* Day dot */}
                            <div className="absolute -left-[5px] top-1 w-[11px] h-[11px] rounded-full bg-[#B89A6A] border-2 border-[#F4F1EB] shadow-sm" />

                            {/* Day header */}
                            <div className="flex items-start justify-between mb-5 gap-4">
                                <div
                                    onClick={() => navigate(`/itinerary/demo_trip_123/day/${day.day}`)}
                                    className="cursor-pointer group"
                                >
                                    <h3 className="serif-text text-2xl font-light text-[#1C1916] tracking-tight group-hover:text-[#B89A6A] transition-colors flex items-center gap-2">
                                        Day {day.day}
                                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
                                    </h3>
                                    <div className="flex items-center gap-2 text-[10px] tracking-widest uppercase text-[#9C9690] mt-1.5 font-medium">
                                        <CalendarSVG />
                                        <span>{day.date || 'Date TBD'}</span>
                                        <span className="text-[#E8E4DC]">·</span>
                                        <span className="text-[#B89A6A] normal-case tracking-wide font-semibold text-[11px]">{day.theme}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={(e) => { e.stopPropagation(); navigate(`/itinerary/demo_trip_123/day/${day.day}`); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F4F1EB] border border-[#E8E4DC] text-[#1C1916] text-[10px] font-medium tracking-widest uppercase hover:border-[#B89A6A]/50 hover:text-[#B89A6A] transition-all shrink-0"
                                >
                                    <Map size={12} /> View Map
                                </button>
                            </div>

                            {/* Activities */}
                            <div className="space-y-3">
                                <AnimatePresence>
                                    {day.activities.map((act, actIndex) => {
                                        const isTransit = (act.type || '').toLowerCase().includes('logistics') || (act.activity || '').toLowerCase().includes('transit');
                                        return (
                                            <motion.div
                                                key={actIndex}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                                                transition={{ delay: actIndex * 0.04 }}
                                                className={`relative bg-[#FDFCFA] border rounded-2xl p-4 flex gap-3 transition-all group
                                                    ${isTransit
                                                        ? 'border-[#E8E4DC] bg-[#F4F1EB]/60'
                                                        : 'border-[#E8E4DC] hover:border-[#B89A6A]/40 hover:shadow-[0_4px_12px_rgba(184,154,106,0.08)]'
                                                    }`}
                                            >
                                                {/* Time badge */}
                                                <div className="flex-shrink-0 pt-0.5">
                                                    <div className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg text-center min-w-[52px]
                                                        ${isTransit
                                                            ? 'bg-[#E8E4DC] text-[#9C9690]'
                                                            : 'bg-[#1C1916] text-[#B89A6A]'
                                                        }`}>
                                                        {typeof act.time === 'string' ? act.time.substring(0, 5) : act.time}
                                                    </div>
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start gap-2 mb-1.5">
                                                        <ActivityIcon type={act.type} />
                                                        <h4 className={`text-sm font-semibold leading-tight
                                                            ${isTransit ? 'text-[#9C9690]' : 'text-[#1C1916]'}`}>
                                                            {act.activity}
                                                        </h4>
                                                    </div>

                                                    {act.description && !isTransit && (
                                                        <p className="text-[#9C9690] text-xs leading-relaxed mt-1">
                                                            {act.description}
                                                        </p>
                                                    )}

                                                    {/* Cost chip & Extras */}
                                                    <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                                                        {(act.cost_estimate > 0) && (
                                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#F4F1EB] border border-[#E8E4DC] rounded-lg">
                                                                <span className="text-[9px] text-[#9C9690] font-medium uppercase tracking-widest">Est.</span>
                                                                <span className="text-[11px] font-mono text-[#1C1916] font-bold">{currencySymbol}{act.cost_estimate}</span>
                                                            </div>
                                                        )}
                                                        {act.type === 'food' && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setSelectedFoodAct(act); }}
                                                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#B89A6A]/10 text-[#B89A6A] hover:bg-[#B89A6A]/20 border border-[#B89A6A]/30 rounded-lg transition-colors"
                                                            >
                                                                <span className="text-[9px] font-medium uppercase tracking-widest">View Places</span>
                                                                <Info size={11} />
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Transit instruction */}
                                                    {act.transit_instruction && (
                                                        <div className="mt-3 flex items-start gap-2.5 p-3 rounded-xl bg-[#F4F1EB] border-l-2 border-[#B89A6A]/40 border border-[#E8E4DC]">
                                                            <MapPin size={13} className="text-[#B89A6A] mt-0.5 flex-shrink-0" />
                                                            <div>
                                                                <p className="text-[9px] text-[#B89A6A] font-semibold uppercase tracking-widest mb-0.5">Getting There</p>
                                                                <p className="text-[#5A554A] text-xs leading-relaxed">{act.transit_instruction}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>

                            {/* Day cost summary */}
                            {day.activities.some(a => a.cost_estimate > 0) && (
                                <div className="mt-4 flex items-center justify-end gap-2">
                                    <span className="text-[9px] text-[#9C9690] uppercase tracking-widest">Day {day.day} total</span>
                                    <span className="text-xs font-mono font-bold text-[#1C1916] bg-[#F4F1EB] border border-[#E8E4DC] px-2.5 py-1 rounded-lg">
                                        {currencySymbol}{day.activities.reduce((s, a) => s + Math.max(0, parseFloat(a.cost_estimate || 0)), 0)}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* FOOD PLACES MODAL */}
            <AnimatePresence>
                {selectedFoodAct && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1916]/40 backdrop-blur-sm"
                        onClick={() => setSelectedFoodAct(null)}
                    >
                        <motion.div 
                            initial={{ y: 20, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.95 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#FDFCFA] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-[#E8E4DC]"
                        >
                            <div className="p-6 border-b border-[#E8E4DC] relative">
                                <button onClick={() => setSelectedFoodAct(null)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-[#F4F1EB] text-[#9C9690] transition-colors">
                                    <X size={18} />
                                </button>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-full bg-[#B89A6A]/10 flex items-center justify-center text-[#B89A6A]">
                                        <Utensils size={18} />
                                    </div>
                                    <div>
                                        <h3 className="serif-text text-xl text-[#1C1916] font-light">Nearby Dining</h3>
                                        <p className="text-xs text-[#9C9690]">Recommended options near this location</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 bg-[#F4F1EB]">
                                <p className="text-sm text-[#5A554A] mb-4">
                                    Based on the itinerary for <span className="font-semibold text-[#1C1916]">"{selectedFoodAct.activity}"</span>, here are top-rated local spots in the immediate vicinity:
                                </p>
                                <div className="space-y-3">
                                    {/* Mock items for now. Ideally this would fetch from an API like Yelp or Google Places based on act.latitude/longitude */}
                                    <div className="p-4 bg-[#FDFCFA] rounded-2xl border border-[#E8E4DC] flex justify-between items-center group hover:border-[#B89A6A]/40 transition-colors">
                                        <div>
                                            <h4 className="font-medium text-[#1C1916] text-sm">Local Authentic Kitchen</h4>
                                            <p className="text-xs text-[#9C9690] mt-0.5">4.8 ★ · Traditional · ₹₹</p>
                                        </div>
                                        <button className="text-[10px] text-[#B89A6A] font-medium tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">Map</button>
                                    </div>
                                    <div className="p-4 bg-[#FDFCFA] rounded-2xl border border-[#E8E4DC] flex justify-between items-center group hover:border-[#B89A6A]/40 transition-colors">
                                        <div>
                                            <h4 className="font-medium text-[#1C1916] text-sm">Bistro & Cafe</h4>
                                            <p className="text-xs text-[#9C9690] mt-0.5">4.5 ★ · Casual Dining · ₹</p>
                                        </div>
                                        <button className="text-[10px] text-[#B89A6A] font-medium tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">Map</button>
                                    </div>
                                    <div className="p-4 bg-[#FDFCFA] rounded-2xl border border-[#E8E4DC] flex justify-between items-center group hover:border-[#B89A6A]/40 transition-colors">
                                        <div>
                                            <h4 className="font-medium text-[#1C1916] text-sm">Fine Dining Sunset View</h4>
                                            <p className="text-xs text-[#9C9690] mt-0.5">4.9 ★ · Premium · ₹₹₹</p>
                                        </div>
                                        <button className="text-[10px] text-[#B89A6A] font-medium tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">Map</button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ItineraryTimeline;