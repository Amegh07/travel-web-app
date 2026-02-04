import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ItineraryTimeline from '../components/ItineraryTimeline';
import TripResult from '../components/TripResult';
import { Plane, Loader2, Map as MapIcon, ShoppingBag } from 'lucide-react';

const ResultsPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  
  // Data States
  const [flights, setFlights] = useState([]);
  const [itinerary, setItinerary] = useState(null);
  const [packingList, setPackingList] = useState(null);
  const [bgImage, setBgImage] = useState(null); // 🆕 State for background image
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('itinerary');

  useEffect(() => {
    if (!state) {
      navigate('/');
      return;
    }

    const loadData = async () => {
      try {
        console.log("🔄 Fetching Trip Data for:", state.destinationName);
        
        // 🆕 1. Fetch Background Image (Fire and forget, don't block loading)
        fetch(`http://localhost:5000/api/destination-image?query=${state.destinationName}`)
          .then(res => res.json())
          .then(data => {
             if (data.url) setBgImage(data.url);
          })
          .catch(err => console.warn("🖼️ Image fetch failed", err));

        // 2. Fetch Itinerary
        const itinRes = await fetch('http://localhost:5000/api/itinerary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            destination: state.destinationName,
            interests: state.interests,
            customInterest: state.customInterest
          })
        });
        const itinData = await itinRes.json();
        setItinerary(itinData);

        // 3. Fetch Packing List
        const packRes = await fetch('http://localhost:5000/api/packing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            destination: state.destinationName,
            interests: state.interests,
            customInterest: state.customInterest
          })
        });
        const packData = await packRes.json();
        setPackingList(packData);

        // 4. Fetch Flights (Optional)
        fetch(`http://localhost:5000/api/flights?origin=${state.fromCity}&destination=${state.toCity}&date=${state.departureDate}`)
          .then(res => res.json())
          .then(data => setFlights(data))
          .catch(err => console.warn("✈️ Flight fetch failed", err));

      } catch (error) {
        console.error("❌ Error loading trip data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [state, navigate]);

  if (!state) return null;

  // 🆕 Dynamic Background Style
  const mainContainerStyle = bgImage ? {
    backgroundImage: `linear-gradient(to bottom, rgba(2, 6, 23, 0.85), rgba(2, 6, 23, 0.95)), url(${bgImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed', // Creates a cool parallax effect
  } : { backgroundColor: '#020617' }; // Fallback dark color

  return (
    // Apply the style here
    <div style={mainContainerStyle} className="min-h-screen text-white font-sans selection:bg-blue-500/30 transition-all duration-1000 ease-in-out">
      
      {/* HEADER */}
      <div className="border-b border-white/10 sticky top-0 z-50 backdrop-blur-xl bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent shadow-sm">
              Trip to {state.destinationName}
            </h1>
            <p className="text-sm text-gray-300 flex items-center gap-2 font-medium">
              {state.fromCity} ➝ {state.toCity} • {state.departureDate}
            </p>
          </div>
          <button 
            onClick={() => navigate('/')} 
            className="text-sm bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition font-bold backdrop-blur-md"
          >
            New Search
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        
        {/* LOADING STATE */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
            <Loader2 size={48} className="text-blue-500 animate-spin" />
            <p className="text-lg text-gray-200 font-bold animate-pulse">Building your perfect itinerary...</p>
            <p className="text-sm text-gray-400">Checking flights • Curating spots • Packing bags</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up">
            
            {/* LEFT SIDEBAR */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-2 flex flex-col gap-1 shadow-xl">
                <button 
                  onClick={() => setActiveTab('itinerary')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${activeTab === 'itinerary' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-white/5 text-gray-300'}`}
                >
                  <MapIcon size={20} /> Day Plan
                </button>
                <button 
                  onClick={() => setActiveTab('packing')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${activeTab === 'packing' ? 'bg-green-600 text-white shadow-lg' : 'hover:bg-white/5 text-gray-300'}`}
                >
                  <ShoppingBag size={20} /> Packing List
                </button>
                <button 
                  onClick={() => setActiveTab('flights')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${activeTab === 'flights' ? 'bg-purple-600 text-white shadow-lg' : 'hover:bg-white/5 text-gray-300'}`}
                >
                  <Plane size={20} /> Flights ({flights.length})
                </button>
              </div>

              {/* Budget Summary Card */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-xl">
                <h3 className="text-blue-300 text-xs font-black uppercase tracking-wider mb-2">Estimated Budget</h3>
                <div className="text-4xl font-black text-white">{state.currency} {state.budget}</div>
                <div className="mt-4 flex gap-2 flex-wrap">
                  {state.interests.map((tag, i) => (
                    <span key={i} className="text-xs bg-white/20 px-2 py-1 rounded-md text-gray-100 font-medium">{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="lg:col-span-2">
              
              {/* 🗺️ ITINERARY TAB */}
              {activeTab === 'itinerary' && (
                <div className="animate-fade-in">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 drop-shadow-md">
                    <MapIcon className="text-blue-400"/> Your Itinerary
                  </h2>
                  {itinerary ? (
                    <ItineraryTimeline itinerary={itinerary} />
                  ) : (
                    <div className="text-gray-400 text-center py-10">No itinerary generated.</div>
                  )}
                </div>
              )}

              {/* 🎒 PACKING TAB */}
              {activeTab === 'packing' && (
                <div className="animate-fade-in">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 drop-shadow-md">
                    <ShoppingBag className="text-green-400"/> Smart Packing
                  </h2>
                  <TripResult packingList={packingList} destination={state.destinationName} />
                </div>
              )}

              {/* ✈️ FLIGHTS TAB */}
              {activeTab === 'flights' && (
                <div className="animate-fade-in space-y-4">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 drop-shadow-md">
                    <Plane className="text-purple-400"/> Available Flights
                  </h2>
                  {flights.length > 0 ? (
                    flights.map((flight, i) => (
                      <div key={i} className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-xl flex justify-between items-center hover:bg-white/20 transition shadow-lg">
                        <div className="flex items-center gap-4">
                          <img src={flight.airlineLogo} alt="logo" className="w-10 h-10 rounded-full bg-white p-1" />
                          <div>
                            <div className="font-bold text-lg text-white">{flight.price.total} {flight.price.currency}</div>
                            <div className="text-sm text-gray-300">{flight.itineraries[0].duration.replace('PT', '').toLowerCase()}</div>
                          </div>
                        </div>
                        <button className="bg-white text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-50 transition">
                          Select
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-400 text-center py-10 bg-white/5 rounded-xl border border-white/10 border-dashed backdrop-blur-sm">
                      No flights found for these dates.
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsPage;