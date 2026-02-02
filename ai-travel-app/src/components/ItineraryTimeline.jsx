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
      
      // Pass the new budget and interests variables here!
      const plan = await generateItinerary(destination, 3, budget, interests);
      
      if (plan.length > 0) {
        setItinerary(plan);
        setExpandedDay(0); // Expand first day by default
      } else {
        setItinerary([
          { day: 1, theme: "Arrival & Exploration", activities: ["Check into hotel", `Walk around ${destination} City Center`, "Dinner at a local restaurant"] },
          { day: 2, theme: "Culture & History", activities: ["Visit the main museum", "Guided city tour", "Sunset view"] },
          { day: 3, theme: "Relaxation", activities: ["Local park visit", "Souvenir shopping", "Departure"] }
        ]);
        setExpandedDay(0);
      }
      setLoading(false);
    };

    fetchItinerary();
  }, [destination, budget, interests]); // Re-run if these change

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
          <p className="text-gray-600 text-sm">
            Custom plan for {destination} {interests ? `focusing on ${interests}` : ''}
          </p>
        </div>
      </div>

      {loading ? (
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex flex-col items-center justify-center py-12 text-gray-400"
        >
          <Loader2 size={40} className="text-blue-500 mb-4" />
          <p>Gemini is curating your experience...</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {itinerary.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <motion.button
                onClick={() => setExpandedDay(expandedDay === index ? null : index)}
                whileHover={{ x: 4 }}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50/50 to-transparent rounded-xl hover:bg-blue-100/30 transition-all group border border-white/40"
              >
                <div className="flex items-center gap-4 text-left">
                  <motion.div
                    animate={{ 
                      boxShadow: expandedDay === index ? '0 0 20px rgba(59, 130, 246, 0.3)' : '0 0 0px rgba(59, 130, 246, 0)'
                    }}
                    className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-lg shadow-lg"
                  >
                    {item.day}
                  </motion.div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{item.theme}</h3>
                    <p className="text-sm text-gray-600">{item.activities.length} activities planned</p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: expandedDay === index ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown size={20} className="text-blue-600" />
                </motion.div>
              </motion.button>

              <AnimatePresence>
                {expandedDay === index && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-2 bg-blue-50/40 rounded-b-xl border-t border-blue-200/30 space-y-3">
                      {item.activities.map((activity, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-start gap-3 group/activity cursor-pointer p-2 rounded-lg hover:bg-white/50 transition-all"
                          whileHover={{ x: 4 }}
                        >
                          <motion.div
                            className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center"
                            whileHover={{ scale: 1.2 }}
                          >
                            {i === 0 ? (
                              <Clock size={14} className="text-blue-600" />
                            ) : i === 1 ? (
                              <MapPin size={14} className="text-blue-600" />
                            ) : (
                              <Sparkles size={14} className="text-blue-600" />
                            )}
                          </motion.div>
                          <span className="text-gray-700 text-sm font-medium group-hover/activity:text-blue-600 transition-colors">
                            {activity}
                          </span>
                        </motion.div>
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