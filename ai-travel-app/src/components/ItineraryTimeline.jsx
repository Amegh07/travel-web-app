import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, MapPin, Sparkles, Loader2, ChevronDown } from 'lucide-react';
import { generateItinerary } from '../services/geminiAPI';

const ItineraryTimeline = ({ destination, budget, interests }) => {
  const [itinerary, setItinerary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState(null);

  useEffect(() => {
    const fetchItinerary = async () => {
      if (!destination) return;
      setLoading(true);
      try {
        const plan = await generateItinerary(destination, 3, budget, interests);
        if (plan && plan.length > 0) {
          setItinerary(plan);
          setExpandedDay(0);
        } else {
          // Fallback handled in API, but double check here
          setItinerary([
            { day: 1, theme: "Arrival", activities: ["Check in", "Relax", "Dinner"] },
            { day: 2, theme: "Explore", activities: ["City Tour", "Museum", "Park"] },
            { day: 3, theme: "Departure", activities: ["Shopping", "Airport"] }
          ]);
          setExpandedDay(0);
        }
      } catch (err) {
        console.error("Itinerary Error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchItinerary();
  }, [destination, budget, interests]);

  // SAFE RENDERING HELPER
  const renderActivityText = (activity) => {
    if (typeof activity === 'string') return activity;
    if (typeof activity === 'object' && activity !== null) {
      return activity.name || activity.text || activity.description || "Activity details";
    }
    return "Activity";
  };

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="backdrop-blur-xl bg-white/60 rounded-3xl p-8 border border-white/40 shadow-xl"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-gradient-to-br from-blue-600 to-blue-500 p-2.5 rounded-xl text-white shadow-lg">
          <Sparkles size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Suggested Itinerary</h2>
          <p className="text-gray-600 text-sm">Custom plan for your trip</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <Loader2 size={40} className="text-blue-500 mb-4 animate-spin" />
          <p>Gemini is curating your experience...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {itinerary.map((item, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <button
                onClick={() => setExpandedDay(expandedDay === index ? null : index)}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50/50 to-transparent rounded-xl hover:bg-blue-100/30 transition-all group border border-white/40"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-lg shadow-lg">
                    {item.day}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{item.theme}</h3>
                    <p className="text-sm text-gray-600">{item.activities?.length || 0} activities planned</p>
                  </div>
                </div>
                <ChevronDown size={20} className={`text-blue-600 transition-transform duration-300 ${expandedDay === index ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {expandedDay === index && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-2 bg-blue-50/40 rounded-b-xl border-t border-blue-200/30 space-y-3">
                      {item.activities?.map((activity, i) => (
                        <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/50 transition-all">
                          <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <Clock size={14} className="text-blue-600" />
                          </div>
                          <span className="text-gray-700 text-sm font-medium">
                            {/* THIS LINE PREVENTS THE CRASH */}
                            {renderActivityText(activity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </motion.section>
  );
};

export default ItineraryTimeline;