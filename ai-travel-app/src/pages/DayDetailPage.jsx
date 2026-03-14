import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Navigation, Info, Utensils, Share, Printer, Plus, Edit2, ShieldAlert, CheckCircle2, Ticket, Camera } from 'lucide-react';
import { motion } from 'framer-motion';

const DayDetailPage = () => {
    const { tripId: _tripId, dayNumber: _dayNumber } = useParams();
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState('full'); // 'summary' | 'full' | 'printable'
    const [dayData, setDayData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadMapData = async () => {
            try {
                const cache = sessionStorage.getItem('travex_results_cache');
                if (cache) {
                    const parsed = JSON.parse(cache);
                    const plan = parsed.aiItinerary;
                    if (plan && plan.daily_plan) {
                        const foundDay = plan.daily_plan.find(d => d.day.toString() === _dayNumber?.toString());
                        if (foundDay) {
                            const searchDataStr = sessionStorage.getItem('travex_search');
                            const searchData = searchDataStr ? JSON.parse(searchDataStr) : {};
                            const currencyMatch = searchData.currency === 'EUR' ? '€' : searchData.currency === 'GBP' ? '£' : searchData.currency === 'INR' ? '₹' : '$';
                            
                            const mappedData = {
                                tripId: _tripId,
                                dayNumber: _dayNumber,
                                date: foundDay.date || "Date TBD",
                                meta: {
                                    header: `Day ${_dayNumber} — ${foundDay.theme || "Exploration"}`,
                                    totalEstCost: { amount: foundDay.activities.reduce((sum, a) => sum + Math.max(0, parseFloat(a.cost_estimate || 0)), 0), currency: currencyMatch },
                                    lastUpdated: new Date().toISOString()
                                },
                                items: foundDay.activities.map((act, i) => {
                                    let start = act.time;
                                    let end = act.time;
                                    if (act.time && act.time.includes('-')) {
                                        const pts = act.time.split('-');
                                        start = pts[0].trim();
                                        end = pts[1].trim();
                                    }
                                    const isFood = (act.type || "").toLowerCase().includes("food") || (act.type || "").toLowerCase().includes("meal") || (act.type || "").toLowerCase().includes("lunch") || (act.type || "").toLowerCase().includes("dinner");
                                    return {
                                        id: `item_${i}`,
                                        type: isFood ? "meal" : "attraction",
                                        title: act.activity,
                                        time: { start, end, durationMins: 60, timeZone: "Local" },
                                        location: { name: act.activity, address: act.location || "", geo: null },
                                        logistics: {
                                            transitNotes: act.transit_instruction || null,
                                            accessibility: null,
                                            weatherContingency: null
                                        },
                                        booking: {
                                            status: "exploratory",
                                            provider: "Local Provider",
                                            estCost: { amount: parseFloat(act.cost_estimate || 0), currency: currencyMatch },
                                            link: null,
                                            cancellationPolicy: null
                                        },
                                        mealDetails: isFood ? {
                                            cuisine: "Local Cuisine",
                                            suggestedDishes: [],
                                            priceBand: "$$",
                                            dietaryTags: []
                                        } : null,
                                        alternatives: null,
                                        description: act.description,
                                        reason_for_choice: act.reason_for_choice
                                    };
                                })
                            };
                            setDayData(mappedData);
                            return;
                        }
                    }
                }
                setError('Could not find day details. Please generate a plan on the results page first.');
            } catch (e) {
                console.error(e);
                setError('Failed to load day details.');
            }
        };
        loadMapData();
    }, [_dayNumber, _tripId]);

    // View Modes Array
    const modes = [
        { id: 'summary', label: 'Summary' },
        { id: 'full', label: 'Full Detail' },
        { id: 'printable', label: 'Printable' }
    ];

    if (error) return <div className="min-h-screen bg-[#F4F1EB] p-8 flex items-center justify-center serif-text text-xl text-[#9C9690]">{error}</div>;
    if (!dayData) return <div className="min-h-screen bg-[#F4F1EB] p-8 flex items-center justify-center serif-text text-xl text-[#9C9690]">Loading itinerary...</div>;

    const data = dayData;
    const printableClass = viewMode === 'printable' ? 'grayscale max-w-4xl mx-auto shadow-none border-0' : '';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className={`min-h-screen bg-[#F4F1EB] font-sans text-[#1C1916] selection:bg-[#B89A6A]/20 ${printableClass}`}
        >

            {/* STICKY HEADER */}
            <header className="sticky top-0 z-40 bg-[#F4F1EB]/80 backdrop-blur-xl border-b border-[#E8E4DC]">
                <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-[#E8E4DC] transition-colors text-[#9C9690] hover:text-[#1C1916] group">
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div>
                            <h1 className="serif-text text-2xl font-light tracking-tight">{data.meta.header}</h1>
                            <div className="text-[10px] uppercase font-medium tracking-widest text-[#9C9690] mt-1 flex items-center gap-3">
                                <span>{data.date}</span>
                                <span className="text-[#E8E4DC]">•</span>
                                <span>Est. Cost: {data.meta.totalEstCost.currency}{data.meta.totalEstCost.amount.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* TOOLBAR */}
                    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 md:pb-0">
                        <div className="bg-[#FDFCFA] rounded-full p-1 border border-[#E8E4DC] flex">
                            {modes.map(m => (
                                <button key={m.id} onClick={() => setViewMode(m.id)} className={`px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-bold transition-colors ${viewMode === m.id ? 'bg-[#1C1916] text-[#FDFCFA]' : 'text-[#9C9690] hover:text-[#1C1916]'}`}>
                                    {m.label}
                                </button>
                            ))}
                        </div>
                        <button className="bg-[#FDFCFA] p-2 rounded-full border border-[#E8E4DC] text-[#1C1916] hover:bg-[#E8E4DC] transition-colors">
                            <Share className="w-4 h-4" />
                        </button>
                        <button className="bg-[#FDFCFA] p-2 rounded-full border border-[#E8E4DC] text-[#1C1916] hover:bg-[#E8E4DC] transition-colors" onClick={() => window.print()}>
                            <Printer className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                    {/* LEFT COLUMN: TIMELINE */}
                    <div className="lg:col-span-7 space-y-8">

                        {/* Buffer Toggle */}
                        {viewMode !== 'printable' && (
                            <div className="flex items-center justify-between p-4 bg-[#FDFCFA] rounded-2xl border border-[#E8E4DC]">
                                <span className="text-xs font-bold uppercase tracking-widest">Adjust Schedule</span>
                                <button className="flex items-center gap-2 text-xs font-bold text-[#B89A6A] hover:text-[#1C1916] transition-colors">
                                    <Plus size={14} /> Add 15m Buffer Between Items
                                </button>
                            </div>
                        )}

                        <div className="relative border-l border-[#E8E4DC] ml-4 space-y-12">
                            {data.items.map((item) => (
                                <div key={item.id} className="relative pl-8">
                                    {/* Timeline Node */}
                                    <div className="absolute -left-[7px] top-1.5 w-3.5 h-3.5 rounded-full bg-[#1C1916] ring-4 ring-[#F4F1EB]"></div>

                                    <div className="bg-[#FDFCFA] border border-[#E8E4DC] rounded-3xl p-6 transition-all hover:shadow-[0_12px_24px_rgba(28,25,22,0.03)] hover:border-[#1C1916]">

                                        {/* HEADER */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="flex items-center gap-2 text-[#9C9690] font-mono text-xs uppercase font-bold mb-2 tracking-wider">
                                                    <Clock size={12} /> {item.time.start} {item.time.end !== item.time.start ? `- ${item.time.end}` : ''} <span className="font-normal border border-[#E8E4DC] px-1.5 py-0.5 rounded-md bg-[#F4F1EB] lowercase">{item.time.durationMins}m</span>
                                                </div>
                                                <h3 className="serif-text text-xl font-medium tracking-tight flex items-center gap-2">
                                                    {item.type === 'attraction' ? <Camera className="text-[#B89A6A]" size={20} /> : <Utensils className="text-[#B89A6A]" size={20} />}
                                                    {item.title}
                                                </h3>
                                            </div>
                                            {viewMode !== 'printable' && (
                                                <button className="text-[#9C9690] hover:text-[#1C1916] transition-colors p-2"><Edit2 size={16} /></button>
                                            )}
                                        </div>

                                        {viewMode !== 'summary' && (
                                            <div className="space-y-5">
                                            
                                                {/* DESCRIPTION */}
                                                {item.description && (
                                                    <div className="p-4 bg-[#F4F1EB] rounded-2xl border border-[#E8E4DC] text-sm text-[#5A554A] leading-relaxed">
                                                        {item.description}
                                                    </div>
                                                )}

                                                {/* LOCAL PICK REASON */}
                                                {item.reason_for_choice && (
                                                    <div className="p-4 bg-[#FDFCFA] rounded-2xl text-xs space-y-2 border border-[#E8E4DC]">
                                                        <span className="font-bold uppercase tracking-widest text-[#B89A6A] block mb-1 flex items-center gap-1.5"><Info size={12} /> Why Locals Love It</span>
                                                        <p className="text-[#5A554A] italic">{item.reason_for_choice}</p>
                                                    </div>
                                                )}

                                                {/* LOCATION & TRANSIT */}
                                                <div className="flex gap-4 p-4 bg-[#F4F1EB] rounded-2xl">
                                                    <Navigation size={18} className="text-[#B89A6A] shrink-0 mt-0.5" />
                                                    <div className="text-sm">
                                                        <p className="font-medium">{item.location.name}</p>
                                                        {item.location.address && <p className="text-[#9C9690] text-xs mt-1">{item.location.address}</p>}
                                                        {item.logistics?.transitNotes && (
                                                            <div className="mt-3 text-xs border-t border-[#E8E4DC] pt-3 text-[#5A554A]">
                                                                <span className="font-bold uppercase tracking-widest text-[#B89A6A] block mb-1">Transit Notes</span>
                                                                {item.logistics.transitNotes}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* MEAL SPECIFICS */}
                                                {item.mealDetails && item.mealDetails.cuisine && (
                                                    <div className="p-4 border border-[#E8E4DC] rounded-2xl text-xs space-y-2">
                                                        <p><span className="font-bold uppercase tracking-widest text-[#9C9690] mr-2">Cuisine</span> {item.mealDetails.cuisine}</p>
                                                        {item.mealDetails.suggestedDishes?.length > 0 && <p><span className="font-bold uppercase tracking-widest text-[#9C9690] mr-2">Suggested</span> {item.mealDetails.suggestedDishes.join(', ')}</p>}
                                                        <div className="flex gap-2 mt-2">
                                                            {item.mealDetails.dietaryTags.map(tag => (
                                                                <span key={tag} className="px-2 py-1 bg-[#1C1916] text-[#FDFCFA] rounded text-[10px] uppercase font-bold tracking-widest">{tag.replace('_', ' ')}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* EXTRAS */}
                                                {item.logistics?.accessibility && (
                                                    <p className="text-xs text-[#9C9690] flex items-center gap-1.5">
                                                        <Info size={12} /> Accessibility: {item.logistics.accessibility.join(', ').replace(/_/g, ' ')}
                                                    </p>
                                                )}

                                            </div>
                                        )}

                                        {/* POST-BOOKING / ACTIONS */}
                                        {viewMode !== 'printable' && (
                                            <div className="mt-6 pt-5 border-t border-[#E8E4DC] flex flex-wrap items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    {item.booking.status === 'exploratory' ? (
                                                        <span className="flex items-center gap-1.5 text-xs font-bold text-[#B89A6A] bg-[#B89A6A]/10 px-3 py-1.5 rounded-full uppercase tracking-widest">
                                                            <ShieldAlert size={14} /> Exploratory
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full uppercase tracking-widest">
                                                            <CheckCircle2 size={14} /> Reserved
                                                        </span>
                                                    )}
                                                    <span className="text-xs font-bold font-mono px-2 py-1 bg-[#F4F1EB] rounded border border-[#E8E4DC] text-[#5A554A]">
                                                        {item.booking.estCost ? `${item.booking.estCost.currency}${item.booking.estCost.amount}` : item.mealDetails?.priceBand}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {item.alternatives && (
                                                        <button className="text-[10px] uppercase tracking-widest font-bold text-[#9C9690] hover:text-[#1C1916] transition-colors px-3 py-2 border border-[#E8E4DC] rounded-xl hover:bg-[#F4F1EB]">
                                                            Explore Alternatives
                                                        </button>
                                                    )}

                                                    {/* DYNAMIC CTA */}
                                                    {item.booking.status === 'exploratory' ? (
                                                        <button
                                                            onClick={() => window.open(item.booking.link || `https://www.google.com/search?q=book+${encodeURIComponent(item.title)}`, '_blank')}
                                                            className="text-[10px] uppercase tracking-widest font-bold text-[#FDFCFA] bg-[#1C1916] hover:bg-[#2E3C3A] transition-colors px-4 py-2 rounded-xl flex items-center gap-2"
                                                        >
                                                            <Ticket size={14} /> Secure your spot
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => alert(`Showing confirmation for ${item.title}: ${item.booking.confirmationNumber}`)}
                                                            className="text-[10px] uppercase tracking-widest font-bold text-[#1C1916] bg-[#FDFCFA] transition-colors px-4 py-2 border border-[#1C1916] rounded-xl flex items-center gap-2 hover:bg-[#F4F1EB]"
                                                        >
                                                            <Ticket size={14} /> View Confirmation
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: MAP / BOOKING */}
                    {viewMode !== 'printable' && (
                        <div className="lg:col-span-5 relative hidden lg:block">
                            <div className="sticky top-32 space-y-6">
                                {/* INTERACTIVE MAP */}
                                <div className="w-full h-80 rounded-3xl border border-[#E8E4DC] overflow-hidden shadow-[0_8px_32px_rgba(28,25,22,0.08)] mb-6 relative z-0 bg-[#E8E4DC]">
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        style={{ border: 0 }}
                                        loading="lazy"
                                        allowFullScreen
                                        referrerPolicy="no-referrer-when-downgrade"
                                        src={`https://maps.google.com/maps?q=${encodeURIComponent((data.items[0]?.location?.name || "") + " " + (data.items[0]?.location?.address || "") + " " + data.meta.header)}&hl=en&z=14&output=embed`}
                                    ></iframe>
                                </div>

                                {/* DAY SUMMARY WIDGET */}
                                <div className="bg-[#FDFCFA] rounded-3xl border border-[#E8E4DC] p-6 shadow-sm">
                                    <h3 className="serif-text text-xl mb-4">Day Summary</h3>
                                    <ul className="space-y-4 text-sm">
                                        <li className="flex justify-between border-b border-[#F4F1EB] pb-2">
                                            <span className="text-[#9C9690] uppercase tracking-widest text-[10px] font-bold">Total Events</span>
                                            <span className="font-mono">{data.items.length}</span>
                                        </li>
                                        <li className="flex justify-between border-b border-[#F4F1EB] pb-2">
                                            <span className="text-[#9C9690] uppercase tracking-widest text-[10px] font-bold">Focus</span>
                                            <span className="font-mono text-[#B89A6A]">{data.meta.header.split('—')[1]?.trim() || "Mix of Activities"}</span>
                                        </li>
                                        <li className="flex justify-between pb-2">
                                            <span className="text-[#9C9690] uppercase tracking-widest text-[10px] font-bold">Est Cost</span>
                                            <span className="font-mono font-bold">{data.meta.totalEstCost.currency}{data.meta.totalEstCost.amount.toFixed(2)}</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default DayDetailPage;
