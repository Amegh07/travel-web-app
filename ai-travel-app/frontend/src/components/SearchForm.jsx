import { useState } from 'react';
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
  const [pax, setPax] = useState(1); // 👥 Passenger count
  const [vibeLevel, setVibeLevel] = useState(1);
  const [tripPurpose, setTripPurpose] = useState('holiday');
  const [groupType, setGroupType] = useState('friends'); // 👨‍👩‍👧 Group dynamics
  const [dietaryRestriction, setDietaryRestriction] = useState('none'); // 🥗 Dietary needs

  // ✅ FEATURE: Trip Vibe Tags
  const INTEREST_TAGS = ['Culture', 'Food', 'Nature', 'Adventure', 'Nightlife', 'Shopping'];

  const toggleInterest = (tag) => {
    setInterests(prev => prev.includes(tag) ? prev.filter(i => i !== tag) : [...prev, tag]);
  };

  const [formError, setFormError] = useState(null);

  const handleSearchClick = () => {
    const parsedBudget = parseFloat(budget);
    if (!fromCity || !toCity || !departDate) {
      setFormError("Please select cities and a departure date.");
      return;
    }
    if (isNaN(parsedBudget) || parsedBudget <= 0) {
      setFormError("Please enter a valid budget greater than 0.");
      return;
    }
    setFormError(null);

    // ✅ SENDING ALL DATA
    onSearch({
      fromCity,
      toCity,
      departDate,
      returnDate,
      budget,
      currency,
      interests,
      vibeLevel,
      tripPurpose,
      tripType,
      pax,
      groupType,
      dietaryRestriction
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#FDFCFA]/90 backdrop-blur-3xl border border-[#E8E4DC] p-10 md:p-14 rounded-3xl shadow-[0_16px_48px_rgba(28,25,22,0.08)] relative overflow-hidden"
    >
      {/* Decorative Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-[#B89A6A] to-transparent opacity-30 blur-md" />

      {/* ✅ FEATURE: Trip Type Toggle */}
      <div className="flex justify-center mb-10">
        <div className="bg-[#F4F1EB] p-1.5 rounded-full flex border border-[#E8E4DC]">
          <button
            onClick={() => setTripType('one-way')}
            className={`px-6 py-2.5 rounded-full text-[10px] tracking-widest uppercase font-medium transition-all ${tripType === 'one-way' ? 'bg-[#1C1916] text-[#FDFCFA] shadow-md' : 'text-[#9C9690] hover:text-[#1C1916]'}`}
          >
            One Way
          </button>
          <button
            onClick={() => setTripType('round')}
            className={`px-6 py-2.5 rounded-full text-[10px] tracking-widest uppercase font-medium transition-all flex items-center gap-2 ${tripType === 'round' ? 'bg-[#1C1916] text-[#FDFCFA] shadow-md' : 'text-[#9C9690] hover:text-[#1C1916]'}`}
          >
            <Globe size={14} /> Round Trip
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div className="space-y-4">
          {/* ✅ FEATURE: City Inputs */}
          <div className="relative group">
            <MapPin className="absolute left-4 top-[18px] text-[#9C9690] group-focus-within:text-[#B89A6A] transition-colors z-10" size={18} />
            <CityAutocomplete
              onSelect={setFromCity}
              placeholder="From City"
              className="pl-12 bg-[#F4F1EB] text-[#1C1916] border border-[#E8E4DC] focus:ring-[#B89A6A]/30 focus:border-[#B89A6A] rounded-2xl"
            />
          </div>
          <div className="relative group">
            <MapPin className="absolute left-4 top-[18px] text-[#9C9690] group-focus-within:text-[#B89A6A] transition-colors z-10" size={18} />
            <CityAutocomplete
              onSelect={setToCity}
              placeholder="To City"
              className="pl-12 bg-[#F4F1EB] text-[#1C1916] border border-[#E8E4DC] focus:ring-[#B89A6A]/30 focus:border-[#B89A6A] rounded-2xl"
            />
          </div>
        </div>

        <div className="space-y-4">
          {/* ✅ FEATURE: Date Inputs */}
          <div className="flex gap-4">
            <div className="relative flex-1 group">
              <Calendar className="absolute left-4 top-4 text-[#9C9690] group-focus-within:text-[#B89A6A] z-10" size={18} />
              <input
                type="date"
                value={departDate}
                onChange={(e) => setDepartDate(e.target.value)}
                className="w-full bg-[#F4F1EB] text-[#1C1916] pl-12 p-4 rounded-2xl border border-[#E8E4DC] focus:ring-2 focus:ring-[#B89A6A]/30 outline-none appearance-none font-medium text-sm transition-all"
              />
            </div>
            <div className="relative flex-1 group">
              <Calendar className="absolute left-4 top-4 text-[#9C9690] group-focus-within:text-[#B89A6A] z-10" size={18} />
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                disabled={tripType === 'one-way'}
                className="w-full bg-[#F4F1EB] text-[#1C1916] pl-12 p-4 rounded-2xl border border-[#E8E4DC] focus:ring-2 focus:ring-[#B89A6A]/30 outline-none appearance-none font-medium text-sm disabled:opacity-50 transition-all"
              />
            </div>
          </div>

          {/* ✅ FEATURE: Budget & Wallet */}
          <div className="flex gap-4">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-[#F4F1EB] text-[#1C1916] font-medium p-4 rounded-2xl border border-[#E8E4DC] focus:ring-2 focus:ring-[#B89A6A]/30 outline-none text-center appearance-none tracking-widest text-xs uppercase transition-all"
            >
              <option value="INR">INR ₹</option>
              <option value="USD">USD $</option>
              <option value="EUR">EUR €</option>
            </select>
            <div className="relative flex-1 group">
              <Wallet className="absolute left-4 top-4 text-[#9C9690] group-focus-within:text-[#B89A6A] z-10 transition-colors" size={18} />
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full pl-12 bg-[#F4F1EB] text-[#1C1916] font-medium font-sans text-sm p-4 rounded-2xl border border-[#E8E4DC] focus:ring-2 focus:ring-[#B89A6A]/30 outline-none transition-all"
                placeholder="Budget"
              />
            </div>
            {/* 👥 TRAVELERS INPUT */}
            <div className="relative group">
              <span className="absolute left-4 top-[17px] text-[#9C9690] group-focus-within:text-[#B89A6A] z-10 transition-colors text-base select-none">👥</span>
              <input
                type="number"
                min="1"
                max="10"
                value={pax}
                onChange={(e) => setPax(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 pl-10 pr-2 bg-[#F4F1EB] text-[#1C1916] font-medium font-sans text-sm p-4 rounded-2xl border border-[#E8E4DC] focus:ring-2 focus:ring-[#B89A6A]/30 outline-none transition-all text-center"
                title="Number of travelers"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ✅ FEATURE: Trip Vibe (Interests) */}
      <div className="mb-10">
        <label className="text-[10px] font-medium text-[#9C9690] ml-2 tracking-widest uppercase mb-4 flex items-center gap-2">
          <Sparkles size={14} className="text-[#B89A6A]" /> Trip Vibe
        </label>
        <div className="flex flex-wrap gap-3 mb-6">
          {INTEREST_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => toggleInterest(tag)}
              className={`px-5 py-2.5 rounded-xl text-xs font-medium tracking-wide transition-all border ${interests.includes(tag)
                  ? 'bg-[#1C1916] text-[#FDFCFA] border-[#1C1916] shadow-md'
                  : 'bg-[#F4F1EB] text-[#9C9690] border-[#E8E4DC] hover:border-[#B89A6A]/50 hover:text-[#1C1916]'
                }`}
            >
              {tag}
            </button>
          ))}
        </div>
        
        {/* Trip Purpose */}
          <div>
            <label className="text-[10px] font-medium text-[#9C9690] ml-2 tracking-widest uppercase mb-3 flex items-center gap-2">
              Trip Purpose
            </label>
            <div className="flex bg-[#F4F1EB] p-1.5 rounded-2xl border border-[#E8E4DC]">
              <button
                onClick={() => setTripPurpose('holiday')}
                className={`flex-1 py-2 rounded-xl text-xs tracking-wide uppercase font-medium transition-all ${tripPurpose === 'holiday' ? 'bg-[#1C1916] text-[#FDFCFA] shadow-md' : 'text-[#9C9690] hover:text-[#1C1916]'}`}
              >
                Holiday
              </button>
              <button
                onClick={() => setTripPurpose('business')}
                className={`flex-1 py-2 rounded-xl text-xs tracking-wide uppercase font-medium transition-all ${tripPurpose === 'business' ? 'bg-[#1C1916] text-[#FDFCFA] shadow-md' : 'text-[#9C9690] hover:text-[#1C1916]'}`}
              >
                Business
              </button>
            </div>
          </div>

        {/* Group Type */}
        <div className="mt-6">
          <label className="text-[10px] font-medium text-[#9C9690] ml-2 tracking-widest uppercase mb-3 flex items-center gap-2">
            Group Type
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'solo', label: '🧳 Solo' },
              { id: 'couple', label: '💑 Couple' },
              { id: 'family', label: '👨‍👩‍👧 Family' },
              { id: 'friends', label: '🎉 Friends' },
              { id: 'seniors', label: '🧓 Seniors' },
            ].map(g => (
              <button
                key={g.id}
                onClick={() => setGroupType(g.id)}
                className={`px-4 py-2 rounded-xl text-xs font-medium tracking-wide transition-all border ${
                  groupType === g.id
                    ? 'bg-[#1C1916] text-[#FDFCFA] border-[#1C1916] shadow-md'
                    : 'bg-[#F4F1EB] text-[#9C9690] border-[#E8E4DC] hover:border-[#B89A6A]/50 hover:text-[#1C1916]'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dietary Restriction */}
        <div className="mt-6">
          <label className="text-[10px] font-medium text-[#9C9690] ml-2 tracking-widest uppercase mb-3 flex items-center gap-2">
            Dietary Preferences
          </label>
          <select
            value={dietaryRestriction}
            onChange={(e) => setDietaryRestriction(e.target.value)}
            className="w-full bg-[#F4F1EB] text-[#1C1916] text-sm font-medium px-4 py-3 rounded-xl border border-[#E8E4DC] focus:border-[#B89A6A] focus:outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="none">No Restrictions</option>
            <option value="vegetarian">Vegetarian</option>
            <option value="vegan">Vegan</option>
            <option value="halal">Halal</option>
            <option value="gluten-free">Gluten-Free</option>
            <option value="pescatarian">Pescatarian</option>
          </select>
        </div>
      </div>
      {formError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium tracking-wide">
          {formError}
        </div>
      )}

      <button
        onClick={handleSearchClick}
        disabled={isLoading}
        className="w-full bg-[#B89A6A] hover:bg-[#A8876A] text-[#FDFCFA] font-medium tracking-widest uppercase text-xs py-5 rounded-2xl shadow-[0_8px_24px_rgba(184,154,106,0.2)] transition-all flex justify-center items-center gap-2 group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FDFCFA]/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        {isLoading ? (
          <span className="flex items-center gap-2">Curating...</span>
        ) : (
          <>
            <Search size={18} className="group-hover:scale-110 transition-transform" />
            SEARCH TRIPS
          </>
        )}
      </button>
    </motion.div>
  );
};

export default SearchForm;