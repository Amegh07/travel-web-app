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
  const [pax, setPax] = useState(1);
  const [vibeLevel, setVibeLevel] = useState(1);
  const [tripPurpose, setTripPurpose] = useState('holiday');
  const [groupType, setGroupType] = useState('solo'); // starts consistent with pax=1
  const [dietaryRestriction, setDietaryRestriction] = useState('none');
  const [customDietary, setCustomDietary] = useState('');

  // ✅ FEATURE: Trip Vibe Tags
  const INTEREST_TAGS = ['Culture', 'Food', 'Nature', 'Adventure', 'Nightlife', 'Shopping'];

  const toggleInterest = (tag) => {
    setInterests(prev => prev.includes(tag) ? prev.filter(i => i !== tag) : [...prev, tag]);
  };

  // Two-way sync: selecting a group type enforces a matching pax count
  const handleGroupTypeChange = (id) => {
    setGroupType(id);
    if (id === 'solo')   setPax(1);
    if (id === 'couple') setPax(2);  // covers both Couple (holiday) and Duo (business)
    // all other ids (family, friends, seniors, group) allow free pax editing
  };

  // Two-way sync: changing pax promotes the group type automatically
  const handlePaxChange = (raw) => {
    const val = Math.max(1, Math.min(10, parseInt(raw) || 1));
    setPax(val);
    if (val === 1) { setGroupType('solo'); return; }
    if (val === 2) {
      // only snap to couple/duo if currently stuck on solo
      setGroupType(prev => prev === 'solo' ? 'couple' : prev);
      return;
    }
    // 3+: if on a single/pair lock, promote to the nearest multi-person group
    setGroupType(prev => (prev === 'solo' || prev === 'couple') 
      ? (tripPurpose === 'business' ? 'friends' : 'friends') 
      : prev
    );
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

    // Fix #3: Validate departure date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(departDate) < today) {
      setFormError("Departure date cannot be in the past.");
      return;
    }

    // Fix #3: Validate return date is after departure date for round trips
    if (tripType === 'round' && returnDate && returnDate <= departDate) {
      setFormError("Return date must be after your departure date.");
      return;
    }

    // Validate custom dietary: reject empty freetext when custom is chosen
    if (dietaryRestriction === 'custom' && !customDietary.trim()) {
      setFormError("Please describe your dietary requirement, or select 'No Restrictions'.");
      return;
    }

    setFormError(null);

    // ✅ SENDING ALL DATA
    onSearch({
      fromCity,
      toCity,
      departDate,
      returnDate,
      budget: parsedBudget,
      currency,
      interests,
      vibeLevel,
      tripPurpose,
      tripType,
      pax,
      groupType,
      // Send custom text if 'custom' is selected and user typed something; fallback to dropdown value
      dietaryRestriction: dietaryRestriction === 'custom'
        ? (customDietary.trim() || 'none')
        : dietaryRestriction
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
          onClick={() => { setTripType('one-way'); setReturnDate(''); }}
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
                onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                className="w-full pl-12 bg-[#F4F1EB] text-[#1C1916] font-medium font-sans text-sm p-4 rounded-2xl border border-[#E8E4DC] focus:ring-2 focus:ring-[#B89A6A]/30 outline-none transition-all"
                placeholder="Budget"
              />
            </div>
            <div className="relative group">
              <span className="absolute left-4 top-[17px] text-[#9C9690] group-focus-within:text-[#B89A6A] z-10 transition-colors text-base select-none">👥</span>
              <input
                type="number"
                min="1"
                max="10"
                value={pax}
                onChange={(e) => handlePaxChange(e.target.value)}
                // Only Solo is locked — Couple allows upgrading to 3+ via pax
                disabled={groupType === 'solo'}
                className={`w-20 pl-10 pr-2 bg-[#F4F1EB] text-[#1C1916] font-medium font-sans text-sm p-4 rounded-2xl border border-[#E8E4DC] focus:ring-2 focus:ring-[#B89A6A]/30 outline-none transition-all text-center ${groupType === 'solo' ? 'opacity-60 cursor-not-allowed' : ''}`}
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
                onClick={() => { setTripPurpose('holiday'); setGroupType(pax === 1 ? 'solo' : pax === 2 ? 'couple' : 'friends'); }}
                className={`flex-1 py-2 rounded-xl text-xs tracking-wide uppercase font-medium transition-all ${tripPurpose === 'holiday' ? 'bg-[#1C1916] text-[#FDFCFA] shadow-md' : 'text-[#9C9690] hover:text-[#1C1916]'}`}
              >
                Holiday
              </button>
              <button
                onClick={() => { setTripPurpose('business'); setGroupType(pax === 1 ? 'solo' : pax === 2 ? 'couple' : 'friends'); }}
                className={`flex-1 py-2 rounded-xl text-xs tracking-wide uppercase font-medium transition-all ${tripPurpose === 'business' ? 'bg-[#1C1916] text-[#FDFCFA] shadow-md' : 'text-[#9C9690] hover:text-[#1C1916]'}`}
              >
                Business
              </button>
            </div>
          </div>

        {/* Group Type — options change based on Trip Purpose */}
        <div className="mt-6">
          <label className="text-[10px] font-medium text-[#9C9690] ml-2 tracking-widest uppercase mb-3 flex items-center gap-2">
            {tripPurpose === 'business' ? 'Travel Party' : 'Group Type'}
          </label>
          <div className="flex flex-wrap gap-2">
            {(tripPurpose === 'business'
              ? [
                  { id: 'solo',    label: '🧳 Solo' },
                  { id: 'couple',  label: '🤝 Duo' },
                  { id: 'friends', label: '👔 Small Team' },
                  { id: 'group',   label: '🏢 Department' },
                ]
              : [
                  { id: 'solo',    label: '🧳 Solo' },
                  { id: 'couple',  label: '💑 Couple' },
                  { id: 'family',  label: '👨‍👩‍👧 Family' },
                  { id: 'friends', label: '🎉 Friends' },
                  { id: 'seniors', label: '🧓 Seniors' },
                ]
            ).map(g => (
              <button
                key={g.id}
                onClick={() => handleGroupTypeChange(g.id)}
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
            onChange={(e) => {
              setDietaryRestriction(e.target.value);
              // Clear custom text when switching away from custom
              if (e.target.value !== 'custom') setCustomDietary('');
            }}
            className="w-full bg-[#F4F1EB] text-[#1C1916] text-sm font-medium px-4 py-3 rounded-xl border border-[#E8E4DC] focus:border-[#B89A6A] focus:outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="none">No Restrictions</option>
            <option value="vegetarian">Vegetarian</option>
            <option value="vegan">Vegan</option>
            <option value="halal">Halal</option>
            <option value="gluten-free">Gluten-Free</option>
            <option value="pescatarian">Pescatarian</option>
            <option value="custom">✨ Custom (type below)…</option>
          </select>
          {/* Freetext input — only visible when Custom is selected */}
          {dietaryRestriction === 'custom' && (
            <input
              type="text"
              value={customDietary}
              onChange={(e) => setCustomDietary(e.target.value)}
              placeholder="e.g. No nuts, Kosher, Jain, Raw food only…"
              maxLength={100}
              className="w-full mt-2 bg-[#F4F1EB] text-[#1C1916] text-sm font-medium px-4 py-3 rounded-xl border border-[#B89A6A]/50 focus:border-[#B89A6A] focus:outline-none transition-all"
            />
          )}
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