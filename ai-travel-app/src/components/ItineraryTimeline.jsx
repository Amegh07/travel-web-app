import React from 'react';
import { Calendar, Clock, MapPin, Navigation } from 'lucide-react';

const ItineraryTimeline = ({ itinerary }) => {
  if (!itinerary) return null;

  return (
    <div className="relative border-l-2 border-blue-500/30 ml-4 space-y-8">
      {itinerary.map((day, index) => (
        <div key={index} className="relative pl-8">
          {/* Day Marker */}
          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-blue-900/50" />
          
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10 hover:border-blue-500/50 transition-all group">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-blue-400">Day {day.day}:</span> {day.theme}
            </h3>

            <div className="space-y-4 mt-4">
              {day.activities.map((act, i) => {
                // 🛡️ CRASH PROOF RENDERING LOGIC

                // 1. If it's just a simple string
                if (typeof act === 'string') {
                  return (
                    <div key={i} className="flex gap-3 text-gray-300">
                      <Navigation size={16} className="mt-1 text-blue-400 shrink-0" />
                      <p className="text-sm leading-relaxed">{act}</p>
                    </div>
                  );
                }

                // 2. If it's a Rich Object (Time, Location, Description)
                if (typeof act === 'object' && act !== null) {
                  return (
                    <div key={i} className="flex gap-3 text-gray-300">
                      <div className="flex flex-col items-center gap-1 mt-1 shrink-0">
                         {/* Time Badge */}
                        {act.time ? (
                           <div className="bg-blue-900/50 text-blue-200 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-500/30 whitespace-nowrap">
                             {act.time}
                           </div>
                        ) : (
                           <Navigation size={16} className="text-blue-400" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed text-gray-100">
                          {act.description || act.activity || "Explore"}
                        </p>
                        
                        {/* Location Tag */}
                        {act.location && (
                          <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-400">
                            <MapPin size={12} className="text-red-400" />
                            <span>{act.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ItineraryTimeline;