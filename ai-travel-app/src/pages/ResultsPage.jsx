import { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Plane, Hotel, Calendar, Loader2, Globe, ChevronDown, Music } from 'lucide-react';
import { fetchFlights, fetchHotels } from '../services/amadeusAPI';
import ItineraryTimeline from '../components/ItineraryTimeline';
import PackingList from '../components/PackingList';

const ResultsPage = ({ searchData, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [rawFlights, setRawFlights] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [events, setEvents] = useState([]);
  const [countryInfo, setCountryInfo] = useState(null);
  
  // 🖼️ Background Image State
  const [bgImage, setBgImage] = useState("");

  const [currency, setCurrency] = useState("USD");
  const [rates, setRates] = useState({});
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const CURRENCIES = ["USD", "EUR", "GBP", "INR", "JPY", "AUD", "AED"];

  const tripDays = useMemo(() => {
    if (!searchData.departureDate || !searchData.returnDate) return 3;
    const diff = Math.abs(new Date(searchData.returnDate) - new Date(searchData.departureDate));
    return Math.ceil(diff / 86400000) + 1;
  }, [searchData]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Background Image from Unsplash
        const unsplashKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
        if (unsplashKey) {
          fetch(`https://api.unsplash.com/search/photos?query=${searchData.toCity} travel&orientation=landscape&per_page=1&client_id=${unsplashKey}`)
            .then(res => res.json())
            .then(data => {
              if (data.results?.[0]?.urls?.regular) {
                setBgImage(data.results[0].urls.regular);
              }
            })
            .catch(err => console.error("Unsplash Error:", err));
        }

        // 2. Fetch Rates
        fetch(`http://localhost:5000/api/rates`).then(res => res.json()).then(setRates);

        // 3. Fetch Flights
        const flightResults = await fetchFlights(searchData.fromCity, searchData.toCity, searchData.departureDate, searchData.returnDate);
        setRawFlights(flightResults);

        // 4. Fetch Country & Events
        if (flightResults.length > 0) {
           const destCode = flightResults[0].destCountryCode;
           if (destCode) fetch(`http://localhost:5000/api/country-info?code=${destCode}`).then(r => r.json()).then(setCountryInfo);
           fetch(`http://localhost:5000/api/events?keyword=${searchData.toCity}`).then(r => r.json()).then(setEvents);
        }

        // 5. Fetch Hotels
        const hotelResults = await fetchHotels(searchData.toCity);
        setHotels(hotelResults);

      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    };
    loadData();
  }, [searchData]);

  const convertPrice = (amount) => {
    if (!amount) return "Check";
    const rate = rates[currency] || 1;
    return (parseFloat(amount) * rate).toFixed(0);
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white bg-slate-900">
      <Loader2 size={48} className="animate-spin text-blue-500 mb-4" />
      <h2 className="text-2xl font-bold">Planning your trip to {searchData.toCity}...</h2>
    </div>
  );

  return (
    <div className="min-h-screen relative text-white">
      
      {/* 🌍 DYNAMIC BACKGROUND LAYER */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: bgImage ? `url(${bgImage})` : 'none',
          backgroundColor: '#0f172a', // Fallback color (slate-900)
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed' // Parallax effect
        }}
      >
        {/* Dark Overlay for readability */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"></div>
      </div>

      {/* 📦 CONTENT LAYER (Z-Index 10 puts it above background) */}
      <div className="relative z-10 p-4 md:p-8 pb-20">
        <div className="max-w-6xl mx-auto mb-8">
          <button onClick={onBack} className="flex items-center gap-2 text-white/80 hover:text-white mb-6">
            <ArrowLeft size={20} /> Back
          </button>
          
          <div className="flex flex-wrap justify-between items-end gap-6">
            <div>
              <h1 className="text-5xl font-black uppercase mb-2 drop-shadow-lg">{searchData.toCity}</h1>
              <div className="flex gap-4 text-sm items-center">
                 <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full flex gap-2 items-center border border-white/20">
                   <Calendar size={14} /> {searchData.departureDate} - {searchData.returnDate}
                 </span>
                 
                 <div className="relative">
                  <button onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)} className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full flex gap-2 items-center hover:bg-white/20 border border-white/20 transition-colors">
                    <Globe size={14} /> {currency} <ChevronDown size={12} />
                  </button>
                  {showCurrencyDropdown && (
                    <div className="absolute top-full left-0 mt-2 bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden z-50 w-32 shadow-xl">
                      {CURRENCIES.map(c => <button key={c} onClick={() => { setCurrency(c); setShowCurrencyDropdown(false); }} className="block w-full text-left px-4 py-2 hover:bg-white/10">{c}</button>)}
                    </div>
                  )}
                 </div>
              </div>
            </div>

            {countryInfo && (
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 flex items-center gap-4 shadow-lg">
                <img src={countryInfo.flags?.png} alt="Flag" className="w-12 h-8 object-cover rounded shadow-sm" />
                <div>
                  <p className="font-bold text-lg">{countryInfo.name?.common}</p>
                  <p className="text-xs text-white/80">Pop: {(countryInfo.population / 1000000).toFixed(1)}M</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
              {/* ✈️ FLIGHTS */}
              <section>
                <h2 className="text-2xl font-bold flex gap-2 mb-4 items-center drop-shadow-md"><Plane className="text-blue-400"/> Flights</h2>
                <div className="space-y-4">
                  {rawFlights.slice(0, 3).map((flight, idx) => (
                    <div key={idx} className="bg-black/40 backdrop-blur-md p-5 rounded-2xl border border-white/10 flex flex-col md:flex-row gap-4 justify-between hover:bg-black/50 transition-all shadow-lg">
                      <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 bg-white rounded-lg p-1 flex items-center justify-center shrink-0">
                          <img 
                            src={flight.airlineLogo} 
                            alt={flight.airlineName} 
                            className="w-full h-full object-contain"
                            onError={(e) => { e.target.style.display='none'; e.target.parentElement.innerHTML='✈️'; }} 
                          />
                        </div>
                        <div>
                          <p className="font-bold text-lg">{flight.airlineName}</p>
                          <p className="text-sm text-white/60">{flight.itineraries[0].duration.replace('PT','').toLowerCase()} • Direct</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-emerald-400">{currency} {convertPrice(flight.price.total)}</p>
                        <button className="bg-white text-slate-900 px-6 py-2 rounded-lg font-bold text-sm mt-2 hover:bg-blue-50 transition-colors">Book Now</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 🏨 HOTELS */}
              <section>
                <h2 className="text-2xl font-bold flex gap-2 mb-4 items-center drop-shadow-md"><Hotel className="text-purple-400"/> Hotels</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {hotels.slice(0, 4).map((hotel, idx) => (
                    <div key={idx} className="bg-black/40 backdrop-blur-md rounded-2xl overflow-hidden border border-white/10 group hover:border-purple-500/50 transition-all shadow-lg">
                      <div className="h-40 overflow-hidden">
                        <img src={hotel.media?.[0]?.uri} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onError={e => e.target.src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80"}/>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold truncate text-lg">{hotel.name}</h3>
                        <div className="flex justify-between items-center mt-3">
                           <span className="text-emerald-400 font-bold text-lg">{currency} {convertPrice(hotel.price?.total || 120)}</span>
                           <button className="text-xs bg-purple-500/20 text-purple-200 px-3 py-1 rounded-lg hover:bg-purple-500 hover:text-white transition-colors">View</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-6">
             {events.length > 0 && (
               <div className="bg-gradient-to-br from-pink-900/60 to-purple-900/60 backdrop-blur-md border border-white/20 p-6 rounded-2xl shadow-xl">
                  <h3 className="font-bold text-xl flex items-center gap-2 mb-4"><Music className="text-pink-400"/> Events</h3>
                  <div className="space-y-3">
                    {events.map((e, i) => (
                      <a key={i} href={e.url} target="_blank" className="block bg-black/30 p-3 rounded-xl hover:bg-black/50 border border-white/10 transition-colors">
                        <p className="font-bold text-sm truncate">{e.name}</p>
                        <p className="text-xs text-white/60 mt-1">{e.dates?.start?.localDate}</p>
                      </a>
                    ))}
                  </div>
               </div>
             )}

             <ItineraryTimeline destination={searchData.toCity} days={tripDays} startDate={searchData.departureDate} endDate={searchData.returnDate} budget={searchData.budget} interests={searchData.interests} />
             <PackingList destination={searchData.toCity} days={tripDays} interests={searchData.interests} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;