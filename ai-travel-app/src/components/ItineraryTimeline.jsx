import { useEffect, useState } from 'react';
import { Clock, MapPin, Sparkles, Loader2 } from 'lucide-react';
import { generateItinerary } from '../services/geminiAPI';

const ItineraryTimeline = ({ destination, budget, interests }) => {
  const [itinerary, setItinerary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItinerary = async () => {
      if (!destination) return;
      setLoading(true);
      
      // Pass the new budget and interests variables here!
      const plan = await generateItinerary(destination, 3, budget, interests);
      
      if (plan.length > 0) {
        setItinerary(plan);
      } else {
        setItinerary([
          { day: 1, theme: "Arrival & Exploration", activities: ["Check into hotel", `Walk around ${destination} City Center`, "Dinner at a local restaurant"] },
          { day: 2, theme: "Culture & History", activities: ["Visit the main museum", "Guided city tour", "Sunset view"] },
          { day: 3, theme: "Relaxation", activities: ["Local park visit", "Souvenir shopping", "Departure"] }
        ]);
      }
      setLoading(false);
    };

    fetchItinerary();
  }, [destination, budget, interests]); // Re-run if these change

  return (
    <section className="bg-white rounded-3xl p-8 border border-blue-100 shadow-sm">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-blue-600 p-2 rounded-xl text-white">
          <Sparkles size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Suggested Itinerary</h2>
          <p className="text-gray-500 text-sm">
            Custom {budget} plan for {destination} {interests ? `focusing on ${interests}` : ''}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <Loader2 size={40} className="animate-spin text-blue-500 mb-4" />
          <p>Gemini is curating your {interests} experience...</p>
        </div>
      ) : (
        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-blue-200 before:to-transparent">
          {itinerary.map((item, index) => (
            <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              
              {/* Icon/Dot */}
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-100 text-blue-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                <span className="font-bold text-sm">{item.day}</span>
              </div>
              
              {/* Content Card */}
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-gray-50 p-6 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-800 text-lg">{item.theme}</h3>
                  <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">Day {item.day}</span>
                </div>
                
                <ul className="space-y-3">
                  {item.activities.map((activity, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-600 text-sm">
                      <div className="mt-1 min-w-[16px] text-blue-400">
                        {i === 0 ? <Clock size={14} /> : i === 1 ? <MapPin size={14} /> : <Sparkles size={14} />}
                      </div>
                      {activity}
                    </li>
                  ))}
                </ul>
              </div>
              
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default ItineraryTimeline;