import React from 'react';
import { CheckCircle, Star, MapPin, Camera, Navigation } from 'lucide-react';
import { getHotelImage } from '../utils/formatters';

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

export default React.memo(HotelCard);
