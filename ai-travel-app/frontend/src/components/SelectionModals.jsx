import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import FlightCard from './FlightCard';
import HotelCard from './HotelCard';
import EventCard from './EventCard';

export const FlightModal = React.memo(({ isOpen, onClose, flights, selectedId, onSelect, pax = 1, arrivalDate = new Date() }) => {
    const [sort, setSort] = useState('cheap');
    const sortedFlights = useMemo(() => {
        if (!flights) return [];
        return [...flights].sort((a, b) => {
            if (sort === 'cheap') {
                const priceA = parseFloat(a?.price?.total || "0");
                const priceB = parseFloat(b?.price?.total || "0");
                return priceA - priceB;
            } else {
                const durA = a?.itineraries?.[0]?.duration || "";
                const durB = b?.itineraries?.[0]?.duration || "";
                return durA.localeCompare(durB);
            }
        });
    }, [flights, sort]);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1C1916]/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-3xl bg-[#FDFCFA] border border-[#E8E4DC] rounded-[2rem] shadow-[0_16px_48px_rgba(28,25,22,0.1)] overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-[#E8E4DC] flex justify-between items-center bg-[#F4F1EB]">
                    <div><h2 className="serif-text text-3xl font-light text-[#1C1916] tracking-tight">All Flights</h2><p className="text-[#9C9690] text-sm tracking-wide uppercase text-[10px]">{(flights || []).length} options</p></div>
                    <button onClick={onClose} className="p-2 hover:bg-[#E8E4DC] rounded-full text-[#1C1916] transition-colors"><X size={20} /></button>
                </div>
                <div className="p-4 flex gap-3 border-b border-[#E8E4DC] bg-[#FDFCFA] overflow-x-auto">
                    {['cheap', 'fast'].map(type => (
                        <button key={type} onClick={() => setSort(type)} className={`px-4 py-2 rounded-xl text-[10px] tracking-widest uppercase font-medium border transition-all ${sort === type ? 'bg-[#1C1916] text-[#FDFCFA] border-[#1C1916]' : 'text-[#9C9690] border-[#E8E4DC] hover:border-[#1C1916]/30 bg-[#F4F1EB]'}`}>{type === 'cheap' ? 'Cheapest' : 'Fastest'}</button>
                    ))}
                </div>
                <div className="overflow-y-auto p-6 space-y-4">{sortedFlights.map((f, i) => <FlightCard key={f?.id || i} flight={f} isSelected={selectedId === f?.id} onSelect={(fl) => { onSelect(fl); onClose(); }} showBook={true} pax={pax} arrivalDate={arrivalDate} />)}</div>
            </div>
        </div>
    );
});

export const HotelModal = React.memo(({ isOpen, onClose, hotels, selectedId, onSelect, nights }) => {
    const [sort, setSort] = useState('price_asc');
    const [minStars, setMinStars] = useState(0);

    const filtered = useMemo(() => {
        let list = [...(hotels || [])];
        if (minStars > 0) {
            list = list.filter(h => parseFloat(h?.rating || 0) >= minStars);
        }

        const getPrice = (h) => {
            if (typeof h?.price === 'string') return parseFloat(h.price.replace(/[^0-9.]/g, '')) || 0;
            if (typeof h?.price === 'number') return h.price;
            return 0;
        };

        if (sort === 'price_asc') list.sort((a, b) => getPrice(a) - getPrice(b));
        else if (sort === 'price_desc') list.sort((a, b) => getPrice(b) - getPrice(a));
        else if (sort === 'distance') list.sort((a, b) => parseFloat(a?.distance || '99') - parseFloat(b?.distance || '99'));
        return list;
    }, [hotels, sort, minStars]);

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1C1916]/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-5xl bg-[#FDFCFA] border border-[#E8E4DC] rounded-[2rem] shadow-[0_16px_48px_rgba(28,25,22,0.1)] overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-[#E8E4DC] flex justify-between items-center bg-[#F4F1EB]">
                    <div>
                        <h2 className="serif-text text-3xl font-light text-[#1C1916] tracking-tight">Select Stay</h2>
                        <p className="text-[#9C9690] text-[10px] tracking-widest uppercase mt-1">{filtered.length} of {(hotels || []).length} options</p>
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
                        ? filtered.map((h, i) => <HotelCard key={h?.id || i} hotel={h} nights={nights} isSelected={selectedId === h?.id} onSelect={(ht) => { onSelect(ht); onClose(); }} showBook={true} />)
                        : <div className="col-span-3 text-center text-[#9C9690] py-16 serif-text text-xl">No hotels match your filters.</div>
                    }
                </div>
            </div>
        </div>
    );
});

export const EventModal = React.memo(({ isOpen, onClose, events, addedEvents, onToggle }) => {
    const [filter, setFilter] = useState('all');
    const categories = ['all', ...new Set((events || []).map(e => e?.category || 'Other'))];
    const filteredEvents = filter === 'all' ? (events || []) : (events || []).filter(e => (e?.category || 'Other') === filter);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1C1916]/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-4xl bg-[#FDFCFA] border border-[#E8E4DC] rounded-[2rem] shadow-[0_16px_48px_rgba(28,25,22,0.1)] overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-[#E8E4DC] flex justify-between items-center bg-[#F4F1EB]">
                    <div><h2 className="serif-text text-3xl font-light text-[#1C1916] tracking-tight">Local Experiences</h2><p className="text-[#9C9690] text-[10px] tracking-widest uppercase mt-1">{(events || []).length} experiences found</p></div>
                    <button onClick={onClose} className="p-2 hover:bg-[#E8E4DC] rounded-full text-[#1C1916] transition-colors"><X size={20} /></button>
                </div>
                <div className="p-4 flex gap-2 border-b border-[#E8E4DC] bg-[#FDFCFA] overflow-x-auto">
                    {categories.slice(0, 5).map(cat => (
                        <button key={cat} onClick={() => setFilter(cat)} className={`px-4 py-1.5 rounded-xl text-[10px] tracking-widest uppercase font-medium border transition-all ${filter === cat ? 'bg-[#B89A6A] text-[#FDFCFA] border-[#B89A6A]' : 'text-[#9C9690] border-[#E8E4DC] bg-[#F4F1EB] hover:border-[#1C1916]/20'}`}>{cat}</button>
                    ))}
                </div>
                <div className="overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredEvents.map((ev, i) => <EventCard key={ev?.id || i} event={ev} isAdded={(addedEvents || []).some(e => e?.id === ev?.id)} onToggle={onToggle} />)}
                    {filteredEvents.length === 0 && <div className="col-span-1 md:col-span-2 text-center text-[#9C9690] py-12 serif-text text-xl">No experiences found.</div>}
                </div>
            </div>
        </div>
    );
});
