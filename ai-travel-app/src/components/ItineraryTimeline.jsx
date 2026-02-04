import React, { useEffect, useState } from 'react';
import { generateItinerary } from '../services/geminiAPI';
import { MapPin, Calendar, Clock, Loader2, Info } from 'lucide-react';
import { motion } from 'framer-motion';

const ItineraryTimeline = ({ destination, days, budget, interests }) => {
  const [itinerary, setItinerary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchItinerary = async () => {
      setLoading(true);
      setError(false);
      try {
        const data = await generateItinerary(destination, days, budget, interests);
        if (isMounted) {
          if (data && data.length > 0) {
            setItinerary(data);
          } else {
            setError(true);
          }
        }
      } catch (err) {
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (destination) {
      fetchItinerary();
    }

    return () => { isMounted = false; };
  }, [destination, days, budget, interests]);

  if (loading) {
    return (
      <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 text-center min-h-[300px] flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-blue-400 w-10 h-10 mb-4" />
        <h3 className="text-xl font-bold text-white">AI Suggested Itinerary</h3>
        <p className="text-white/50 text-sm mt-2">Curating a custom plan for {days} days...</p>
      </div>
    );
  }

  if (error || itinerary.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 text-center">
        <Info className="text-white/50 w-10 h-10 mx-auto mb-2" />
        <h3 className="text-xl font-bold text-white">Itinerary Unavailable</h3>
        <p className="text-white/50 text-sm">We couldn't generate a plan right now. Try refreshing.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
      <div className="flex items-center gap-2 mb-6">
        <div className="bg-blue-500/20 p-2 rounded-lg">
          <Calendar className="text-blue-400 w-5 h-5" />
        </div>
        <h3 className="text-xl font-bold text-white">AI Suggested Itinerary</h3>
      </div>

      <div className="space-y-8 relative pl-4 border-l-2 border-white/10">
        {itinerary.map((dayPlan, index) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative"
          >
            <span className="absolute -left-[25px] top-0 bg-blue-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-black">
              {dayPlan.day}
            </span>
            
            <h4 className="text-lg font-bold text-blue-200 mb-2">{dayPlan.theme || `Day ${dayPlan.day}`}</h4>
            
            <div className="space-y-3">
              {dayPlan.activities && dayPlan.activities.map((activity, actIndex) => (
                <div key={actIndex} className="bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex gap-3">
                    <Clock className="w-4 h-4 text-white/40 mt-1 shrink-0" />
                    <p className="text-sm text-white/80">{activity}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ItineraryTimeline;