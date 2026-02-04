import React from 'react';
import { CheckCircle2, Map, CalendarDays, ShoppingBag, Clock, MapPin } from 'lucide-react';

const TripResult = ({ itinerary, packingList, destination }) => {
  if (!itinerary && !packingList) return null;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      
      {/* 🗺️ RICH ITINERARY SECTION */}
      {itinerary && itinerary.length > 0 && (
        <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <CalendarDays className="text-blue-400" /> 
            3-Day Itinerary for {destination}
          </h2>
          <div className="space-y-4">
            {itinerary.map((day, index) => (
              <div key={index} className="bg-white/5 p-5 rounded-xl border border-white/10 hover:bg-white/10 transition group">
                {/* Header: Day & Theme */}
                <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-bold shadow-lg shadow-blue-900/50">
                    Day {day.day}
                  </span>
                  <span className="text-blue-200 font-mono text-sm tracking-wide uppercase">
                    {day.theme}
                  </span>
                </div>

                {/* Activities List */}
                <ul className="space-y-4">
                  {day.activities.map((act, i) => {
                    // 🛡️ CRASH PROOF CHECK
                    // If it is a string (Old/Simple AI response)
                    if (typeof act === 'string') {
                       return (
                        <li key={i} className="relative pl-4 border-l-2 border-white/10 hover:border-blue-500 transition-colors duration-300">
                           <div className="text-gray-100 text-sm leading-relaxed">{act}</div>
                        </li>
                       )
                    }

                    // If it is a Rich Object (New AI response)
                    if (typeof act === 'object' && act !== null) {
                      return (
                        <li key={i} className="relative pl-4 border-l-2 border-white/10 hover:border-blue-500 transition-colors duration-300">
                          <div className="flex flex-col gap-1">
                            
                            {/* Time Badge */}
                            {act.time && (
                              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-300 mb-0.5">
                                <Clock size={12} />
                                {act.time}
                              </div>
                            )}

                            {/* Description (The main text) */}
                            <div className="text-gray-100 text-sm leading-relaxed">
                              {act.description || act.activity || "Explore area"} 
                            </div>

                            {/* Location Tag */}
                            {act.location && (
                              <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                                <MapPin size={12} className="text-red-400" />
                                {act.location}
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    }
                    return null; // Safety fallback
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🎒 PACKING LIST SECTION */}
      {packingList && (
        <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <ShoppingBag className="text-green-400" />
            Smart Packing List
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Case A: Array format [{Category, Items}] */}
            {Array.isArray(packingList) ? (
              packingList.map((cat, i) => (
                <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <h3 className="text-lg font-bold text-blue-300 mb-3 border-b border-white/10 pb-2">
                    {cat.Category || cat.category || "Essentials"}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(cat.Items || cat.items || []).map((item, j) => (
                      <span key={j} className="bg-blue-900/40 text-blue-100 text-xs px-2 py-1 rounded-md flex items-center gap-1 border border-blue-500/30">
                        <CheckCircle2 size={10} /> {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              // Case B: Object format { Category: [Items] }
              Object.entries(packingList).map(([category, items], i) => (
                <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <h3 className="text-lg font-bold text-blue-300 mb-3 border-b border-white/10 pb-2">
                    {category}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(items) && items.map((item, j) => (
                      <span key={j} className="bg-blue-900/40 text-blue-100 text-xs px-2 py-1 rounded-md flex items-center gap-1 border border-blue-500/30">
                        <CheckCircle2 size={10} /> {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TripResult;