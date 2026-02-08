import React, { useState } from 'react';
import { MapPin, Calendar, Wallet, Search, Sparkles, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import CityAutocomplete from './CityAutocomplete';

const SearchForm = ({ onSearch, isLoading }) => {
  const [tripType, setTripType] = useState('round');
  const [fromCity, setFromCity] = useState(null);
  const [toCity, setToCity] = useState(null);
  const [departDate, setDepartDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [budget, setBudget] = useState(2000);
  const [currency, setCurrency] = useState('INR');
  const [interests, setInterests] = useState([]);

  const INTEREST_TAGS = [
    'Culture', 'Food', 'Nature', 'Adventure', 'Nightlife', 'Shopping', 'Relaxation'
  ];

  const toggleInterest = (tag) => {
    setInterests(prev => prev.includes(tag) ? prev.filter(i => i !== tag) : [...prev, tag]);
  };

  const handleSearchClick = () => {
    if (!fromCity || !toCity || !departDate) {
      alert("Please fill in the required fields (From, To, Departure).");
      return;
    }
    
    onSearch({ 
        fromCity, 
        toCity, 
        departDate, 
        returnDate, 
        budget, 
        currency, 
        interests, 
        tripType 
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl shadow-black/50 relative overflow-hidden"
    >
      {/* Decorative Top Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50 blur-sm" />

      {/* 1. Trip Type Toggle */}
      <div className="flex justify-center mb-10">
        <div className="bg-slate-950/50 p-1.5 rounded-full flex border border-white/5">
          <button 
            onClick={() => setTripType('one-way')}
            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${tripType === 'one-way' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            One Way
          </button>
          <button 
            onClick={() => setTripType('round')}
            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 ${tripType === 'round' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <Globe size={14} /> Round Trip
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* 2. Cities Section */}
        <div className="lg:col-span-5 space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 ml-4 tracking-wider uppercase">From City</label>
              <div className="relative group">
                <MapPin className="absolute left-4 top-4 text-slate-500 group-focus-within:text-blue-400 transition-colors z-10" size={20} />
                <CityAutocomplete 
                  onSelect={setFromCity}
                  placeholder="e.g. Delhi"
                  initialValue={fromCity ? fromCity.name : ''}
                  className="pl-12 bg-slate-950/50 text-white border-white/10 focus:ring-blue-500/50" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 ml-4 tracking-wider uppercase">To City</label>
              <div className="relative group">
                <MapPin className="absolute left-4 top-4 text-slate-500 group-focus-within:text-purple-400 transition-colors z-10" size={20} />
                <CityAutocomplete 
                  onSelect={setToCity}
                  placeholder="Destination"
                  initialValue={toCity ? toCity.name : ''}
                  className="pl-12 bg-slate-950/50 text-white border-white/10 focus:ring-purple-500/50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Dates Section */}
        <div className="lg:col-span-4 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 ml-2 tracking-wider uppercase">Departure</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                </div>
                <input 
                  type="date" 
                  value={departDate}
                  onChange={(e) => setDepartDate(e.target.value)}
                  className="w-full bg-slate-950/50 text-white border border-white/10 rounded-2xl py-3.5 pl-10 pr-3 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all placeholder-slate-600 appearance-none min-h-[52px]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 ml-2 tracking-wider uppercase">Return</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="text-slate-500 group-focus-within:text-purple-400 transition-colors" size={18} />
                </div>
                <input 
                  type="date" 
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  disabled={tripType === 'one-way'}
                  className="w-full bg-slate-950/50 text-white border border-white/10 rounded-2xl py-3.5 pl-10 pr-3 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all placeholder-slate-600 disabled:opacity-30 disabled:cursor-not-allowed appearance-none min-h-[52px]"
                />
              </div>
            </div>
          </div>

          {/* 4. Budget Section */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 ml-2 tracking-wider uppercase">Total Budget</label>
            <div className="flex gap-2">
              <select 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-slate-950/50 text-white font-bold border border-white/10 rounded-2xl px-3 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none text-center min-w-[80px]"
              >
                <option value="INR">INR ₹</option>
                <option value="USD">USD $</option>
                <option value="EUR">EUR €</option>
              </select>
              <div className="relative flex-1 group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Wallet className="text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={18} />
                </div>
                <input 
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full bg-slate-950/50 text-white font-bold border border-white/10 rounded-2xl py-3.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                  placeholder="2000"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 5. Interests Section */}
        <div className="lg:col-span-3 space-y-2">
          <label className="text-xs font-bold text-slate-400 ml-2 tracking-wider uppercase flex items-center gap-2">
            Trip Vibe <Sparkles size={12} className="text-yellow-400" />
          </label>
          <div className="bg-slate-950/30 rounded-2xl p-4 border border-white/5 h-[170px] overflow-y-auto custom-scrollbar">
            <div className="flex flex-wrap gap-2">
              {INTEREST_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleInterest(tag)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                    interests.includes(tag)
                      ? 'bg-slate-700 text-white border-slate-500 shadow-md transform scale-105'
                      : 'bg-transparent text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Big Search Button */}
      <motion.button 
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSearchClick}
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-5 rounded-2xl shadow-lg shadow-blue-900/40 transition-all flex items-center justify-center gap-3 text-lg group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        {isLoading ? (
            <span className="flex items-center gap-2">Thinking...</span>
        ) : (
            <>
                <Search size={24} className="group-hover:scale-110 transition-transform" /> 
                SEARCH TRIPS
            </>
        )}
      </motion.button>

    </motion.div>
  );
};

export default SearchForm;