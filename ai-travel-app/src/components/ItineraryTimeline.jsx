import React from 'react';
import { Clock, MapPin, Coffee, Camera, Navigation } from 'lucide-react';

const ItineraryTimeline = ({ plan }) => {
  if (!plan || !plan.daily_plan) return <div className="text-slate-500">No plan generated yet.</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 p-6 rounded-3xl border border-white/10">
        <h2 className="text-2xl font-bold text-white mb-1">{plan.trip_name}</h2>
        <div className="text-sm text-purple-200 uppercase tracking-wider font-bold">AI Architect Design</div>
      </div>

      {/* Days Loop */}
      <div className="space-y-12">
        {plan.daily_plan.map((day, i) => (
          <div key={i} className="relative pl-8 border-l border-white/10">
            {/* Day Marker */}
            <div className="absolute -left-3 top-0 w-6 h-6 bg-cyan-500 rounded-full border-4 border-[#020617] shadow-lg shadow-cyan-500/50"></div>
            
            <h3 className="text-xl font-bold text-white mb-2">Day {day.day}: {day.theme}</h3>
            <p className="text-slate-400 text-sm mb-6">{day.date}</p>

            {/* Activities */}
            <div className="space-y-4">
              {day.activities.map((act, j) => (
                <div key={j} className="bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/5 transition-colors flex gap-4 group">
                  <div className="text-slate-400 font-mono text-xs pt-1 w-12">{act.time}</div>
                  <div className="flex-1">
                    <div className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {act.activity}
                    </div>
                    
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      {act.type === 'food' && <span className="flex items-center gap-1 text-orange-400"><Coffee size={12}/> Food</span>}
                      {act.type === 'sightseeing' && <span className="flex items-center gap-1 text-purple-400"><Camera size={12}/> Sightseeing</span>}
                      {act.type === 'logistics' && <span className="flex items-center gap-1 text-blue-400"><Navigation size={12}/> Logistics</span>}
                      
                      {act.cost_estimate > 0 && (
                        <span className="text-emerald-400 font-mono ml-auto">Est. ${act.cost_estimate}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ItineraryTimeline;