import React from 'react';
import { Music, Utensils, Moon, Camera, CheckCircle, Heart, Ticket } from 'lucide-react';
import { getEventImage } from '../utils/formatters';

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

export default React.memo(EventCard);
