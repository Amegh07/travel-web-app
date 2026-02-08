// ai-travel-app/src/components/ItineraryTimeline.jsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, MapPin, Sparkles, Loader2, ChevronDown, Calendar } from 'lucide-react';
import { generateItinerary } from '../services/geminiAPI';

const ItineraryTimeline = ({ destination, days, budget, interests }) => {
  const [itinerary, setItinerary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchItinerary = async () => {
      if (!destination) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const plan = await generateItinerary(destination, days || 3, budget, interests);
        
        if (plan && Array.isArray(plan) && plan.length > 0) {
          setItinerary(plan);
          setExpandedDay(0); // Expand first day by default
        } else {
          throw new Error("Invalid itinerary data");
        }
      } catch (err) {
        console.error("Itinerary Error:", err);
        setError("Could not generate itinerary");
        // Set fallback
        setItinerary([
          { day: 1, theme: "Explore " + destination, activities: ["Visit main attractions", "Try local food", "Evening walk"] }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchItinerary();
  }, [destination, days, budget, interests]);

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Sparkles size={20} className="text-white" />
          </div>
          <h2 className="text-xl font-bold">AI Itinerary</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <Loader2 size={32} className="text-blue-500 mb-3 animate-spin" />
          <p className="text-sm">Creating your perfect plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-lg">
          <Calendar size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Your Itinerary</h2>
          <p className="text-sm text-gray-400">{destination} • {itinerary.length} days</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 p-3 rounded-lg mb-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {itinerary.map((day, index) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="border border-gray-800 rounded-xl overflow-hidden"
          >
            {/* Day Header - Always visible */}
            <button
              onClick={() => setExpandedDay(expandedDay === index ? -1 : index)}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-750 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-sm">
                  {day.day}
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-white">{day.theme || `Day ${day.day}`}</h3>
                  <p className="text-xs text-gray-400">{day.activities?.length || 0} activities</p>
                </div>
              </div>
              <ChevronDown 
                size={20} 
                className={`text-gray-400 transition-transform ${expandedDay === index ? 'rotate-180' : ''}`} 
              />
            </button>

            {/* Expandable Activities */}
            <AnimatePresence>
              {expandedDay === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 bg-black/30 space-y-3">
                    {day.activities?.map((activity, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Clock size={14} className="text-blue-400" />
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {typeof activity === 'string' ? activity : activity.name || activity.description || JSON.stringify(activity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ItineraryTimeline;