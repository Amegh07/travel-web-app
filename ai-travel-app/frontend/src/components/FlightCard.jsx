import React from 'react';
import { Plane, CheckCircle, Globe } from 'lucide-react';
import { getAirlineLogo, getAirlineLogoFallback, formatDuration } from '../utils/formatters';

const FlightCard = ({ flight, isSelected, onSelect, showBook = false, pax = 1, arrivalDate = new Date() }) => {
    const isRoundTrip = flight.itineraries?.length > 1;
    const outbound = flight.itineraries?.[0];
    const returnLeg = flight.itineraries?.[1];
    const airlineCode = flight.validatingAirlineCodes?.[0];

    return (
        <div
    onClick={() => onSelect?.(flight)}
            className={`
                relative p-6 rounded-2xl border transition-all cursor-pointer group bg-[#FDFCFA]
                ${isSelected
                    ? 'border-[#B89A6A] shadow-[0_4px_24px_rgba(184,154,106,0.15)]'
                    : 'border-[#E8E4DC] hover:border-[#B89A6A]/50 hover:shadow-[0_4px_16px_rgba(28,25,22,0.06)]'}
            `}
        >
            {isSelected && <div className="absolute top-5 right-5 text-[#B89A6A]"><CheckCircle className="w-5 h-5" /></div>}

            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#F4F1EB] rounded-xl overflow-hidden flex items-center justify-center border border-[#E8E4DC] font-bold text-[#B89A6A] text-sm">
                        {airlineCode
                            ? <img
                                src={getAirlineLogo(airlineCode)}
                                alt={airlineCode}
                                className="w-full h-full object-contain p-1"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = getAirlineLogoFallback();
                                    e.target.className = 'w-full h-full object-cover';
                                }}
                            />
                            : <Plane size={20} />
                        }
                    </div>
                    <div>
                        <div className="serif-text font-medium text-[#1C1916] text-xl tracking-tight">{airlineCode ? `${airlineCode} Airlines` : 'Unknown Airline'}</div>
                        <div className="flex items-center gap-2 text-xs text-[#9C9690] mt-1 tracking-widest uppercase">
                            <span className="bg-[#F4F1EB] px-2 py-0.5 rounded text-[#9C9690] font-medium border border-[#E8E4DC] text-[10px]">
                                {isRoundTrip ? 'Round Trip' : 'One Way'}
                            </span>
                            <span>· {flight.numberOfBookableSeats} seats</span>
                        </div>
                    </div>
                </div>
                <div className="text-right pr-8">
                    <div className="serif-text text-3xl font-light text-[#1C1916] tracking-tight">{(flight.price?.currency === 'INR' ? '₹' : flight.price?.currency === 'EUR' ? '€' : flight.price?.currency === 'GBP' ? '£' : '$')} {parseFloat(flight.price?.total || 0).toFixed(2)}</div>
                    {showBook && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
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
                            className="mt-3 text-[10px] bg-[#B89A6A] hover:bg-[#A8876A] text-[#FDFCFA] font-medium px-4 py-2 rounded-xl flex items-center gap-2 ml-auto transition-all tracking-widest uppercase"
                        >
                            <Globe size={14} /> Book Now
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-4 text-sm">
                    <Plane className="w-4 h-4 text-[#B89A6A] rotate-45" />
                    <div className="flex-1 flex justify-between items-center bg-[#F4F1EB] p-3 rounded-xl border border-[#E8E4DC]">
                        <span className="serif-text text-[#1C1916] text-lg font-light tracking-wider">{outbound?.segments[0]?.departure?.iataCode || 'DEP'}</span>
                        <div className="flex flex-col items-center w-28">
                            <div className="h-px w-full bg-gradient-to-r from-[#E8E4DC] via-[#B89A6A] to-[#E8E4DC]"></div>
                            <span className="text-[10px] text-[#9C9690] mt-1 uppercase tracking-widest">{formatDuration(outbound?.duration)}</span>
                        </div>
                        <span className="serif-text text-[#1C1916] text-lg font-light tracking-wider">{outbound?.segments[outbound.segments.length - 1]?.arrival?.iataCode || 'ARR'}</span>
                    </div>
                </div>
                {isRoundTrip && (
                    <div className="flex items-center gap-4 text-sm">
                        <Plane className="w-4 h-4 text-[#B89A6A] rotate-[225deg]" />
                        <div className="flex-1 flex justify-between items-center bg-[#F4F1EB] p-3 rounded-xl border border-[#E8E4DC]">
                            <span className="serif-text text-[#1C1916] text-lg font-light tracking-wider">{returnLeg?.segments[0]?.departure?.iataCode || 'ARR'}</span>
                            <div className="flex flex-col items-center w-28">
                                <div className="h-px w-full bg-gradient-to-r from-[#E8E4DC] via-[#B89A6A] to-[#E8E4DC]"></div>
                                <span className="text-[10px] text-[#9C9690] mt-1 uppercase tracking-widest">{formatDuration(returnLeg?.duration)}</span>
                            </div>
                            <span className="serif-text text-[#1C1916] text-lg font-light tracking-wider">{returnLeg?.segments[returnLeg.segments.length - 1]?.arrival?.iataCode || 'DEP'}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(FlightCard);
