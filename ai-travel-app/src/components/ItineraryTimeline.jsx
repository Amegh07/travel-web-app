import React, { useState, useEffect } from 'react';
import { 
  Clock, MapPin, Navigation, Camera, Utensils, Moon, 
  Sun, Music, Edit2, Save, X, Plus, Trash2, Check 
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

const ItineraryTimeline = ({ plan }) => {
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
        const newPlan = { ...itinerary };
        newPlan.daily_plan[dayIndex].activities[actIndex][field] = value;
        setItinerary(newPlan);
    };

    // 2. Delete an activity
    const handleDelete = (dayIndex, actIndex) => {
        const newPlan = { ...itinerary };
        newPlan.daily_plan[dayIndex].activities.splice(actIndex, 1);
        setItinerary(newPlan);
    };

    // 3. Add a new empty activity
    const handleAdd = (dayIndex) => {
        const newPlan = { ...itinerary };
        newPlan.daily_plan[dayIndex].activities.push({
            time: "12:00",
            activity: "New Activity",
            description: "Add details here...",
            type: "sightseeing"
        });
        setItinerary(newPlan);
    };

    // 4. Save (Just exits edit mode for now, but could push to API)
    const handleSave = () => {
        setIsEditing(false);
        // Here you would typically trigger an onSave(itinerary) prop to update the parent
    };

    return (
        <div className="w-full space-y-8 animate-fade-in relative">
            
            {/* HEADER & CONTROLS */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white">Your Itinerary</h2>
                    <p className="text-slate-400 text-sm">
                        {isEditing ? "Customize your plan below" : "AI Recommended Trip"}
                    </p>
                </div>
                <button 
                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all ${
                        isEditing 
                        ? 'bg-emerald-500 text-black hover:bg-emerald-400' 
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                >
                    {isEditing ? <><Save size={16}/> Save Changes</> : <><Edit2 size={16}/> Edit Plan</>}
                </button>
            </div>

            {/* TIMELINE DAYS */}
            <div className="relative border-l border-white/10 ml-4 space-y-12">
                {itinerary.daily_plan.map((day, dayIndex) => (
                    <div key={dayIndex} className="relative pl-8">
                        {/* Day Marker */}
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-cyan-500 border-4 border-[#020617] shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div>
                        
                        {/* Day Header */}
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-white">Day {day.day}</h3>
                            <div className="text-slate-400 text-sm flex items-center gap-2">
                                <CalendarIcon /> {day.date || "Date TBD"} • <span className="text-cyan-400 font-bold uppercase tracking-wider text-[10px] border border-cyan-500/30 px-2 py-0.5 rounded-full">{day.theme}</span>
                            </div>
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
                                            relative bg-white/5 border border-white/5 rounded-xl p-4 flex gap-4 transition-all
                                            ${isEditing ? 'hover:border-white/20 hover:bg-white/10' : ''}
                                        `}
                                    >
                                        {/* Time Column */}
                                        <div className="flex-shrink-0 w-16 pt-1">
                                            {isEditing ? (
                                                <input 
                                                    type="text" 
                                                    value={act.time}
                                                    onChange={(e) => handleUpdate(dayIndex, actIndex, 'time', e.target.value)}
                                                    className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-center font-mono text-cyan-400 focus:outline-none focus:border-cyan-500"
                                                />
                                            ) : (
                                                <div className="text-xs font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2 py-1 rounded text-center">
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
                                                            className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-sm font-bold text-white focus:outline-none focus:border-cyan-500 mb-1"
                                                            placeholder="Activity Name"
                                                        />
                                                    ) : (
                                                        <h4 className="text-white font-bold text-sm flex items-center gap-2">
                                                            <ActivityIcon type={act.type} /> {act.activity}
                                                        </h4>
                                                    )}
                                                    
                                                    {isEditing ? (
                                                        <textarea 
                                                            value={act.description || ""}
                                                            onChange={(e) => handleUpdate(dayIndex, actIndex, 'description', e.target.value)}
                                                            className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-slate-400 focus:outline-none focus:border-cyan-500 resize-none h-16"
                                                            placeholder="Description..."
                                                        />
                                                    ) : (
                                                        <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                                                            {act.description}
                                                        </p>
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

                                            {/* Cost Tag */}
                                            {!isEditing && act.cost_estimate > 0 && (
                                                <div className="mt-3 flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                                                    <DollarSign size={10} /> Est. ${act.cost_estimate}
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
                                    className="w-full py-3 border-2 border-dashed border-white/10 rounded-xl text-slate-500 text-sm font-bold hover:border-cyan-500/50 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all flex items-center justify-center gap-2"
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

const DollarSign = ({size}) => (
     <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
);

export default ItineraryTimeline;