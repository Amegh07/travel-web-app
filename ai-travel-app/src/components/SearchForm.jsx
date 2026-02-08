import React, { useState } from 'react';
// ✅ ALL ICONS IMPORTED (Including Wallet)
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

  // ✅ FEATURE: Trip Vibe Tags
  const INTEREST_TAGS = ['Culture', 'Food', 'Nature', 'Adventure', 'Nightlife', 'Shopping'];

  const toggleInterest = (tag) => {
    setInterests(prev => prev.includes(tag) ? prev.filter(i => i !== tag) : [...prev, tag]);
  };

  const handleSearchClick = () => {
    if (!fromCity || !toCity || !departDate) {
      alert("Please select cities and date.");
      return;
    }
    
    // ✅ SENDING ALL DATA
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
      className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden"
    >
      {/* Decorative Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50 blur-sm" />

      {/* ✅ FEATURE: Trip Type Toggle */}
      <div className="flex justify-center mb-10">
        <div className="bg-slate-950/50 p-1.5 rounded-full flex border border-white/5">
          <button 
            onClick={() => setTripType('one-way')} 
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${tripType === 'one-way' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            One Way
          </button>
          <button 
            onClick={() => setTripType('round')} 
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${tripType === 'round' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <Globe size={14} /> Round Trip
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="space-y-4">
            {/* ✅ FEATURE: City Inputs */}
            <div className="relative group">
                <MapPin className="absolute left-4 top-4 text-slate-500 group-focus-within:text-blue-400 transition-colors z-10" size={20} />
                <CityAutocomplete 
                    onSelect={setFromCity} 
                    placeholder="From City" 
                    className="pl-12 bg-slate-950/50 text-white border-white/10 focus:ring-blue-500/50" 
                />
            </div>
            <div className="relative group">
                <MapPin className="absolute left-4 top-4 text-purple-500 group-focus-within:text-purple-400 transition-colors z-10" size={20} />
                <CityAutocomplete 
                    onSelect={setToCity} 
                    placeholder="To City" 
                    className="pl-12 bg-slate-950/50 text-white border-white/10 focus:ring-purple-500/50" 
                />
            </div>
        </div>
        
        <div className="space-y-4">
            {/* ✅ FEATURE: Date Inputs */}
            <div className="flex gap-4">
                <div className="relative flex-1 group">
                    <Calendar className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-blue-400 z-10" size={18} />
                    <input 
                        type="date" 
                        value={departDate} 
                        onChange={(e) => setDepartDate(e.target.value)} 
                        className="w-full bg-slate-950/50 text-white pl-10 p-3 rounded-2xl border border-white/10 focus:ring-2 focus:ring-blue-500/50 outline-none appearance-none" 
                    />
                </div>
                <div className="relative flex-1 group">
                    <Calendar className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-purple-400 z-10" size={18} />
                    <input 
                        type="date" 
                        value={returnDate} 
                        onChange={(e) => setReturnDate(e.target.value)} 
                        disabled={tripType === 'one-way'} 
                        className="w-full bg-slate-950/50 text-white pl-10 p-3 rounded-2xl border border-white/10 focus:ring-2 focus:ring-purple-500/50 outline-none appearance-none disabled:opacity-50" 
                    />
                </div>
            </div>
            
            {/* ✅ FEATURE: Budget & Wallet */}
            <div className="flex gap-2">
                <select 
                    value={currency} 
                    onChange={(e) => setCurrency(e.target.value)} 
                    className="bg-slate-950/50 text-white font-bold p-3 rounded-2xl border border-white/10 outline-none text-center appearance-none"
                >
                    <option value="INR">INR ₹</option>
                    <option value="USD">USD $</option>
                    <option value="EUR">EUR €</option>
                </select>
                <div className="relative flex-1 group">
                    <Wallet className="absolute left-3 top-3.5 text-emerald-400 z-10" size={18} />
                    <input 
                        type="number" 
                        value={budget} 
                        onChange={(e) => setBudget(e.target.value)} 
                        className="w-full pl-10 bg-slate-950/50 text-white font-bold p-3 rounded-2xl border border-white/10 focus:ring-2 focus:ring-emerald-500/50 outline-none" 
                        placeholder="Budget"
                    />
                </div>
            </div>
        </div>
      </div>

      {/* ✅ FEATURE: Trip Vibe (Interests) */}
      <div className="mb-8">
        <label className="text-xs font-bold text-slate-400 ml-2 tracking-wider uppercase mb-3 block flex items-center gap-2">
            <Sparkles size={12} className="text-yellow-400"/> Trip Vibe
        </label>
        <div className="flex flex-wrap gap-2">
            {INTEREST_TAGS.map(tag => (
                <button 
                    key={tag} 
                    onClick={() => toggleInterest(tag)} 
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                        interests.includes(tag) 
                        ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/20' 
                        : 'bg-slate-800/50 text-slate-400 border-white/5 hover:border-white/10 hover:text-white'
                    }`}
                >
                    {tag}
                </button>
            ))}
        </div>
      </div>

      <button 
        onClick={handleSearchClick} 
        disabled={isLoading} 
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-900/40 transition-all flex justify-center items-center gap-2 group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        {isLoading ? (
            <span className="flex items-center gap-2">Processing...</span>
        ) : (
            <>
                <Search size={20} className="group-hover:scale-110 transition-transform"/> 
                SEARCH TRIPS
            </>
        )}
      </button>
    </motion.div>
  );
};

export default SearchForm;