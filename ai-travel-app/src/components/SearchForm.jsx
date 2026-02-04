import { useState } from 'react';
import { Calendar, Wallet, Search, Sparkles, PenTool } from 'lucide-react';
import CityAutocomplete from './CityAutocomplete';

const SearchForm = ({ onSearch }) => {
  const [tripType, setTripType] = useState('round');
  const [fromCity, setFromCity] = useState(null);
  const [toCity, setToCity] = useState(null);
  const [departDate, setDepartDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [budget, setBudget] = useState(2000);
  const [currency, setCurrency] = useState('USD');
  const [interests, setInterests] = useState([]);
  const [customInterest, setCustomInterest] = useState(''); // 🆕 New State

  const INTEREST_TAGS = [
    { id: 'culture', label: '🏛️ Culture' },
    { id: 'food', label: '🍴 Food' },
    { id: 'nature', label: '🌴 Nature' },
    { id: 'adventure', label: '⚡ Adventure' },
    { id: 'nightlife', label: '🌙 Nightlife' },
    { id: 'shopping', label: '🛍️ Shopping' }
  ];

  const toggleInterest = (id) => {
    setInterests(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSearch = () => {
    if (!fromCity || !toCity) {
      alert("Please select both 'From' and 'To' cities.");
      return;
    }
    if (!departDate) {
      alert("Please select a departure date.");
      return;
    }

    const searchPayload = {
      fromCity: fromCity.iataCode,
      toCity: toCity.iataCode,
      destinationName: toCity.name, // Send name for AI
      departureDate: departDate,
      returnDate: returnDate,
      budget,
      currency,
      interests,
      customInterest, // 🆕 Sending custom text
      tripType
    };

    console.log("🚀 Sending Search:", searchPayload);
    if (onSearch) onSearch(searchPayload);
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 md:p-8 rounded-3xl shadow-2xl max-w-4xl mx-auto text-white">
      
      {/* TABS */}
      <div className="flex justify-center mb-8">
        <div className="bg-white/10 p-1 rounded-full flex">
          <button 
            onClick={() => setTripType('one-way')}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${tripType === 'one-way' ? 'bg-white text-blue-900 shadow-lg' : 'hover:bg-white/10 text-white'}`}
          >
            One Way
          </button>
          <button 
            onClick={() => setTripType('round')}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${tripType === 'round' ? 'bg-white text-blue-900 shadow-lg' : 'hover:bg-white/10 text-white'}`}
          >
            <span className="text-xs">⇄</span> Round Trip
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* CITIES */}
        <div className="space-y-6">
          <CityAutocomplete 
            label="From City" 
            onSelect={setFromCity} 
            initialValue={fromCity ? `${fromCity.name} (${fromCity.iataCode})` : ''}
          />
          <CityAutocomplete 
            label="Destination City" 
            onSelect={setToCity} 
            initialValue={toCity ? `${toCity.name} (${toCity.iataCode})` : ''}
          />
        </div>

        {/* DATES */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2 text-blue-200">Departure</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                  type="date" 
                  className="w-full bg-slate-800 p-3 pl-10 rounded-xl text-white border border-slate-600 focus:border-blue-500 outline-none"
                  onChange={(e) => setDepartDate(e.target.value)}
                  value={departDate}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-blue-200">Return</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                  type="date" 
                  className="w-full bg-slate-800 p-3 pl-10 rounded-xl text-white border border-slate-600 focus:border-blue-500 outline-none disabled:opacity-50"
                  disabled={tripType === 'one-way'}
                  onChange={(e) => setReturnDate(e.target.value)}
                  value={returnDate}
                />
              </div>
            </div>
          </div>

          {/* BUDGET */}
          <div>
            <label className="block text-sm font-bold mb-2 text-blue-200">Total Budget</label>
            <div className="flex gap-2">
              <select 
                className="bg-slate-800 p-3 rounded-xl border border-slate-600 text-white font-bold outline-none"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="USD">USD</option>
                <option value="INR">INR</option>
                <option value="EUR">EUR</option>
              </select>
              <div className="relative flex-1">
                <Wallet className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                  type="number" 
                  className="w-full bg-slate-800 p-3 pl-10 rounded-xl text-white border border-slate-600 focus:border-blue-500 outline-none"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* INTERESTS */}
      <div className="mb-8">
        <label className="block text-sm font-bold mb-3 text-blue-200">Trip Vibe & Interests</label>
        
        {/* Pills */}
        <div className="flex flex-wrap gap-3 mb-4">
          {INTEREST_TAGS.map((tag) => (
            <button
              key={tag.id}
              onClick={() => toggleInterest(tag.id)}
              className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${
                interests.includes(tag.id) 
                  ? 'bg-blue-500 border-blue-400 text-white shadow-lg scale-105' 
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>

        {/* 🆕 Custom Interest Input */}
        <div className="relative">
          <Sparkles className="absolute left-3 top-3.5 text-yellow-400" size={18} />
          <input 
            type="text" 
            placeholder="Anything specific? (e.g. Anime, Vegan Food, History, Hidden Gems)..." 
            className="w-full bg-white/5 p-3 pl-10 rounded-xl text-white border border-white/10 focus:border-blue-500 outline-none placeholder-white/30"
            value={customInterest}
            onChange={(e) => setCustomInterest(e.target.value)}
          />
        </div>
      </div>

      {/* SUBMIT BUTTON */}
      <button 
        onClick={handleSearch}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-xl shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center gap-2 text-lg"
      >
        <Search size={24} /> SEARCH TRIPS
      </button>

    </div>
  );
};

export default SearchForm;