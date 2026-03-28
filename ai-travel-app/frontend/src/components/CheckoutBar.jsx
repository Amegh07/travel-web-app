import React from 'react';
import { Plane, Hotel } from 'lucide-react';

const CheckoutBar = ({ flight, hotel, currencySymbol, nights, originName, pax = 1, arrivalDate = new Date() }) => {
    if (!flight || !hotel) return null;

    const flightPrice = parseFloat(flight.price?.total || 0);
    const roomCount = Math.ceil(Math.max(1, parseInt(pax)) / 2);
    const pricePerNight = parseFloat((hotel?.price || '0').replace(/[^0-9.]/g, ''));
    const hotelPrice = pricePerNight * nights * roomCount;
    const total = flightPrice + hotelPrice;

    return (
        <div className="w-full bg-[#1C1916] text-[#FDFCFA] rounded-3xl overflow-hidden shadow-[0_16px_48px_rgba(28,25,22,0.2)] border border-[#B89A6A]/20">
            <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 flex-1">
                    <div>
                        <div className="text-[10px] text-[#9C9690] tracking-widest uppercase mb-1">Total Journey + Stay</div>
                        <div className="serif-text text-4xl font-light tracking-tight">{currencySymbol} {total.toFixed(2)}</div>
                        <div className="text-[#9C9690] text-[10px] mt-1 tracking-wide">{nights} night{nights > 1 ? 's' : ''} · {flight.validatingAirlineCodes?.[0] || 'Flight'} + {hotel.name}</div>
                    </div>
                    <div className="hidden md:block h-14 w-px bg-[#B89A6A]/20" />
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
                        <div className="text-[#9C9690] uppercase tracking-widest text-[10px]">Flight</div>
                        <div className="text-[#FDFCFA] font-medium">{currencySymbol} {flightPrice.toFixed(2)}</div>
                        <div className="text-[#9C9690] uppercase tracking-widest text-[10px]">Hotel</div>
                        <div className="text-[#FDFCFA] font-medium">{currencySymbol} {hotelPrice.toFixed(2)}</div>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full md:w-auto">
                    <button
                        onClick={() => {
                            const outbound = flight.itineraries?.[0];
                            const firstSeg = outbound?.segments?.[0];
                            const lastSeg = outbound?.segments?.[outbound.segments.length - 1];
                            const origin = firstSeg?.departure?.iataCode || '';
                            const dest = lastSeg?.arrival?.iataCode || '';
                            const dateObj = new Date(firstSeg?.departure?.at || arrivalDate);
                            const skyscannerDate = `${String(dateObj.getDate()).padStart(2, '0')}${String(dateObj.getMonth() + 1).padStart(2, '0')}${String(dateObj.getFullYear()).slice(-2)}`;
                            window.open(
                                `https://www.skyscanner.co.in/transport/flights/${origin}/${dest}/${skyscannerDate}/?adults=${pax}`,
                                '_blank'
                            );
                        }}
                        className="flex-1 md:flex-none border border-[#B89A6A] hover:bg-[#B89A6A]/10 text-[#B89A6A] px-7 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 group"
                    >
                        <Plane size={14} className="group-hover:translate-x-0.5 transition-transform" /> Book Flight
                    </button>
                    <button
                        onClick={() => window.open(`https://www.google.com/search?btnI=1&q=${encodeURIComponent(hotel.name)}+official+website+book+room`, '_blank')}
                        className="flex-1 md:flex-none bg-[#B89A6A] hover:bg-[#A8876A] text-[#1C1916] px-7 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 group shadow-[0_4px_16px_rgba(184,154,106,0.3)]"
                    >
                        <Hotel size={14} className="group-hover:scale-110 transition-transform" /> Book Hotel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default React.memo(CheckoutBar);
