import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Loader2, AlertCircle } from 'lucide-react';
import { generateItinerary } from '../services/api';

const ItineraryTimeline = ({ destination, days, budget, interests }) => {
  const [itinerary, setItinerary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchItinerary = async () => {
      setLoading(true); setError(false);
      try {
        const data = await generateItinerary(destination, days, budget, interests);
        let cleanData = Array.isArray(data) ? data : (data.itinerary || []);
        if (!cleanData.length) throw new Error("Empty data");
        setItinerary(cleanData);
      } catch (err) { setError(true); } 
      finally { setLoading(false); }
    };
    if (destination) fetchItinerary();
  }, [destination]);

  if (loading) return <div className="bg-white/5 p-8 rounded-2xl animate-pulse flex flex-col items-center"><Loader2 className="animate-spin text-blue-400 mb-2" /></div>;
  if (error) return <div className="bg-red-500/10 p-6 rounded-2xl text-red-200 flex gap-3"><AlertCircle /> Error generating itinerary.</div>;

  return (
    <div className="bg-slate-900/60 p-6 rounded-[2rem] border border-white/10 backdrop-blur-md shadow-xl">
      <h2 className="text-2xl font-bold text-white mb-6 flex justify-between items-center">Your Plan <Calendar className="text-blue-500"/></h2>
      <div className="relative border-l-2 border-white/10 ml-3 space-y-8 pl-8 pb-4">
        {itinerary.map((day, idx) => (
          <div key={idx} className="relative">
            <div className="absolute -left-[41px] top-0 bg-slate-900 border-2 border-blue-500 w-6 h-6 rounded-full flex items-center justify-center z-10"><div className="w-2 h-2 bg-blue-400 rounded-full" /></div>
            <div className="bg-black/20 p-5 rounded-2xl border border-white/5">
              <h3 className="text-lg font-bold text-blue-200 mb-1">Day {day?.day || idx + 1}</h3>
              <div className="text-white font-medium mb-4">{day?.theme}</div>
              <div className="space-y-4">
                {(day?.activities || []).map((act, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="bg-white/5 p-2 rounded-lg mt-1"><Clock size={14} className="text-slate-400"/></div>
                    <div><div className="text-slate-400 text-xs font-bold">{act?.time}</div><div className="text-slate-200">{act?.description}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default ItineraryTimeline;