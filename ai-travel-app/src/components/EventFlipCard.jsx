import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Ticket, Clock, ExternalLink } from 'lucide-react';

const EventFlipCard = ({ event }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    return (
        <div className="h-[320px] w-full cursor-pointer perspective-1000" onClick={() => setIsFlipped(!isFlipped)}>
            <motion.div
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6 }}
                style={{ transformStyle: "preserve-3d" }}
                className="relative w-full h-full"
            >
                {/* --- FRONT SIDE --- */}
                <div 
                    className="absolute inset-0 backface-hidden bg-[#0b0f19] border border-white/10 p-6 rounded-3xl flex flex-col justify-between overflow-hidden group"
                    style={{ backfaceVisibility: 'hidden' }}
                >
                    {/* Background Image Layer */}
                    {event.image && (
                        <div className="absolute inset-0 z-0">
                             <img src={event.image} alt={event.title} className="w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-700"/>
                             <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-[#0b0f19]/50 to-transparent"/>
                        </div>
                    )}
                    
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div>
                            <span className="text-xs font-bold text-pink-400 uppercase tracking-widest bg-black/60 px-2 py-1 rounded-full">{event.category}</span>
                            <h3 className="mt-4 text-2xl font-black text-white leading-tight drop-shadow-lg">{event.title}</h3>
                            <p className="mt-2 text-sm text-slate-200 flex items-center gap-1 drop-shadow-md"><MapPin size={12}/> {event.location}</p>
                        </div>
                        <div className="text-xs text-white/70">Click to flip ↻</div>
                    </div>
                </div>

                {/* --- BACK SIDE (The Fix) --- */}
                <div 
                    className="absolute inset-0 backface-hidden bg-pink-900/95 border border-pink-500/30 p-6 rounded-3xl flex flex-col justify-between backdrop-blur-xl" 
                    style={{ 
                        transform: "rotateY(180deg)", // <--- THIS FIXES THE MIRROR TEXT
                        backfaceVisibility: 'hidden' 
                    }}
                >
                    <div>
                        <h4 className="font-bold text-white mb-4">Event Details</h4>
                        <p className="text-sm text-pink-100 mb-6 leading-relaxed">{event.description}</p>
                        <div className="flex justify-between font-bold text-white text-sm">
                            <span>{event.date}</span>
                            <span>{event.price}</span>
                        </div>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); window.open(event.url, '_blank'); }}
                        className="w-full py-3 bg-white text-pink-900 hover:bg-pink-100 rounded-xl font-bold text-xs transition-colors shadow-lg flex items-center justify-center gap-2"
                    >
                        Buy Tickets <ExternalLink size={12}/>
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default EventFlipCard;