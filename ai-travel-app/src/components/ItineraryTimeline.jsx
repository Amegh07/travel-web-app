import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Camera, Utensils, Moon,
    Sun, Edit2, Save, Plus, Trash2,
    Leaf, AlertTriangle, Quote, Shield, Map, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ActivityIcon = ({ type }) => {
    const t = (type || "").toLowerCase();
    if (t.includes('food') || t.includes('lunch') || t.includes('dinner')) return <Utensils size={14} className="text-orange-400" />;
    if (t.includes('sight') || t.includes('visit')) return <Camera size={14} className="text-cyan-400" />;
    if (t.includes('travel') || t.includes('drive')) return <Navigation size={14} className="text-blue-400" />;
    if (t.includes('night') || t.includes('party')) return <Moon size={14} className="text-purple-400" />;
    return <Sun size={14} className="text-yellow-400" />;
};

const ItineraryTimeline = ({ plan, currency = 'INR', onOpenMap }) => {
    const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
    const navigate = useNavigate();
    // Local state to manage edits
    const [itinerary, setItinerary] = useState(plan);
    const [isEditing, setIsEditing] = useState(false);

    // Sync state if parent plan changes (e.g. AI regenerates)
    useEffect(() => {
        setItinerary(plan);
    }, [plan]);

    if (!itinerary || !itinerary.daily_plan) return null;

    // --- HANDLERS ---

    // 1. Update text fields
    const handleUpdate = (dayIndex, actIndex, field, value) => {
        setItinerary(prev => ({
            ...prev,
            daily_plan: prev.daily_plan.map((day, di) =>
                di !== dayIndex ? day : {
                    ...day,
                    activities: day.activities.map((act, ai) =>
                        ai !== actIndex ? act : { ...act, [field]: value }
                    )
                }
            )
        }));
    };

    // 2. Delete an activity
    const handleDelete = (dayIndex, actIndex) => {
        setItinerary(prev => ({
            ...prev,
            daily_plan: prev.daily_plan.map((day, di) =>
                di !== dayIndex ? day : {
                    ...day,
                    activities: day.activities.filter((_, ai) => ai !== actIndex)
                }
            )
        }));
    };

    // 3. Add a new empty activity
    const handleAdd = (dayIndex) => {
        setItinerary(prev => ({
            ...prev,
            daily_plan: prev.daily_plan.map((day, di) =>
                di !== dayIndex ? day : {
                    ...day,
                    activities: [...day.activities, {
                        time: "12:00",
                        activity: "New Activity",
                        description: "Add details here...",
                        type: "sightseeing"
                    }]
                }
            )
        }));
    };

    // 4. Save (Just exits edit mode for now, but could push to API)
    const handleSave = () => {
        setIsEditing(false);
        // Here you would typically trigger an onSave(itinerary) prop to update the parent
    };

    return (
        <div className="w-full space-y-8 animate-fade-in relative">

            {/* HEADER & CONTROLS */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="serif-text text-3xl font-light text-[#1C1916] tracking-tight">Your Itinerary</h2>
                    <p className="text-[#9C9690] text-[10px] tracking-widest uppercase font-medium mt-1">
                        {isEditing ? "Customize your plan below" : "AI Recommended Trip"}
                    </p>
                </div>
                <button
                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] tracking-widest uppercase font-medium transition-all ${isEditing
                        ? 'bg-[#1C1916] text-[#FDFCFA]'
                        : 'bg-[#F4F1EB] border border-[#E8E4DC] text-[#1C1916] hover:border-[#B89A6A]/50'
                        }`}
                >
                    {isEditing ? <><Save size={14} /> Save Changes</> : <><Edit2 size={14} /> Edit Plan</>}
                </button>
            </div>

            {/* TIMELINE DAYS */}
            <div className="relative border-l-2 border-slate-200 ml-4 space-y-12">
                {itinerary.daily_plan.map((day, dayIndex) => (
                    <div key={dayIndex} className="relative pl-8">
                        {/* Day Marker */}
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-[#f5f5f7] shadow-sm"></div>

                        {/* Day Header */}
                        <div className="mb-6 flex justify-between items-start">
                            <div
                                onClick={() => navigate(`/itinerary/demo_trip_123/day/${day.day}`)}
                                className="cursor-pointer group"
                            >
                                <h3 className="serif-text text-2xl font-light text-[#1C1916] tracking-tight flex items-center gap-2 group-hover:text-[#B89A6A] transition-colors">
                                    Day {day.day} <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity -ml-1" />
                                </h3>
                                <div className="text-[#9C9690] text-[10px] tracking-widest uppercase flex items-center gap-2 mt-1.5 font-medium">
                                    <CalendarIcon /> {day.date || "Date TBD"} <span className="text-[#E8E4DC]">•</span> <span className="text-[#B89A6A]">{day.theme}</span>
                                </div>
                            </div>

                            <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/itinerary/demo_trip_123/day/${day.day}`); }}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all shadow-sm shrink-0 cursor-pointer"
                            >
                                <Map size={14} className="text-blue-500" />
                                View Map
                            </button>
                        </div>

                        {/* Activities List */}
                        <div className="space-y-4">
                            <AnimatePresence>
                                {day.activities.map((act, actIndex) => (
                                    <motion.div
                                        key={actIndex}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                                        className={`
                                            relative bg-white/80 backdrop-blur-md border border-slate-200 rounded-3xl p-5 flex gap-4 transition-all shadow-sm
                                            ${isEditing ? 'hover:border-blue-300 hover:bg-white' : ''}
                                        `}
                                    >
                                        {/* Time Column */}
                                        <div className="flex-shrink-0 w-16 pt-1">
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={act.time}
                                                    onChange={(e) => handleUpdate(dayIndex, actIndex, 'time', e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-center font-mono text-blue-600 focus:outline-none focus:border-blue-500"
                                                />
                                            ) : (
                                                <div className="text-xs font-mono text-blue-700 font-bold bg-blue-50 border border-blue-100 px-2 py-1 rounded-lg text-center shadow-inner">
                                                    {act.time}
                                                </div>
                                            )}
                                        </div>

                                        {/* Content Column */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1">
                                                    {isEditing ? (
                                                        <input
                                                            type="text"
                                                            value={act.activity}
                                                            onChange={(e) => handleUpdate(dayIndex, actIndex, 'activity', e.target.value)}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 mb-2"
                                                            placeholder="Activity Name"
                                                        />
                                                    ) : (
                                                        <h4 className="text-slate-900 font-bold text-sm flex items-center gap-2">
                                                            <ActivityIcon type={act.type} /> {act.activity}
                                                            {/* 🌿 Local Pick Badge */}
                                                            {!isEditing && act.localness_signal >= 0.7 && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                                                                    <Leaf size={10} /> Local Pick
                                                                </span>
                                                            )}
                                                            {/* ⚠️ Exception Badge */}
                                                            {!isEditing && act.is_exception && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[9px] font-bold text-amber-400 uppercase tracking-wider">
                                                                    <Shield size={10} /> Popular Exception
                                                                </span>
                                                            )}
                                                        </h4>
                                                    )}

                                                    {isEditing ? (
                                                        <textarea
                                                            value={act.description || ""}
                                                            onChange={(e) => handleUpdate(dayIndex, actIndex, 'description', e.target.value)}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 focus:outline-none focus:border-blue-500 resize-none h-20 shadow-inner"
                                                            placeholder="Description..."
                                                        />
                                                    ) : (
                                                        <p className="text-slate-600 text-xs mt-1.5 leading-relaxed">
                                                            {act.description}
                                                        </p>
                                                    )}

                                                    {/* 🌿 "Why Locals Love It" Premium Quote Block */}
                                                    {!isEditing && act.reason_for_choice && act.localness_signal >= 0.5 && (
                                                        <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100 shadow-sm">
                                                            <Quote size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                                            <p className="text-emerald-700 text-[11px] leading-relaxed italic font-medium">
                                                                {act.reason_for_choice}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Delete Button (Only in Edit Mode) */}
                                                {isEditing && (
                                                    <button
                                                        onClick={() => handleDelete(dayIndex, actIndex)}
                                                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Remove Activity"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>

                                            {/* 🚨 Transit Warning */}
                                            {!isEditing && act.transit_warning && (
                                                <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 shadow-sm">
                                                    <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                                                    <span className="text-red-700 text-[11px] font-bold">
                                                        Logistics Warning: Estimated transit {act.transit_details?.estimated_transit || 'unknown'} ({act.transit_details?.distance_km || '?'} km)
                                                    </span>
                                                </div>
                                            )}

                                            {/* Cost Tag + Localness Score */}
                                            {!isEditing && (act.cost_estimate > 0 || act.localness_signal !== undefined) && (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {act.cost_estimate > 0 && (
                                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-sm text-[10px] text-slate-500 font-mono font-bold">
                                                            <span className="text-emerald-600">Est.</span> <span className="text-slate-900">{currencySymbol}{act.cost_estimate}</span>
                                                        </div>
                                                    )}
                                                    {act.localness_signal !== undefined && (
                                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shadow-sm text-[10px] font-mono font-bold ${act.localness_signal >= 0.7
                                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                            : act.localness_signal >= 0.4
                                                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                                                : 'bg-red-50 border-red-200 text-red-700'
                                                            }`}>
                                                            <Leaf size={10} /> Local: {Math.round(act.localness_signal * 100)}%
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* 🚕 Transit Instruction Block */}
                                            {!isEditing && act.transit_instruction && (
                                                <div className="mt-4 flex items-start gap-3 p-4 rounded-2xl bg-blue-50/50 border border-blue-100 shadow-sm relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-400 rounded-l-2xl"></div>
                                                    <div className="p-2 bg-white rounded-xl shrink-0 mt-0.5 shadow-sm border border-blue-100">
                                                        <MapPin size={16} className="text-blue-500" />
                                                    </div>
                                                    <p className="text-slate-600 text-xs leading-relaxed font-medium">
                                                        <span className="text-blue-700 font-bold block mb-1">Transit Guidance</span>
                                                        {act.transit_instruction}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {/* Add Activity Button (Only in Edit Mode) */}
                            {isEditing && (
                                <button
                                    onClick={() => handleAdd(dayIndex)}
                                    className="cursor-pointer w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 text-sm font-bold hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus size={16} /> Add Activity to Day {day.day}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Simple Icon Helper
const CalendarIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
);

export default ItineraryTimeline;