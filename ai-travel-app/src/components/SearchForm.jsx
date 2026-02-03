import { useState } from 'react';
import { motion } from 'framer-motion';
import CityAutocomplete from './CityAutocomplete';
import { Calendar, MapPin, AlertCircle, ArrowRightLeft, ArrowRight, Loader2 } from 'lucide-react';

const SearchForm = ({ onSearch, isLoading }) => {
  const [tripType, setTripType] = useState('round-trip'); 
  const [formErrors, setFormErrors] = useState({});
  
  const currencies = [
    { code: 'USD', symbol: '$' },
    { code: 'INR', symbol: '₹' },
    { code: 'EUR', symbol: '€' },
    { code: 'GBP', symbol: '£' },
  ];

  const [formData, setFormData] = useState({
    fromCity: '',
    toCity: '',
    departureDate: '',
    returnDate: '',
    budget: '',
    currency: 'USD', 
    interests: []
  });

  const interestOptions = [
    { id: 'culture', label: 'Culture', icon: '📷' },
    { id: 'food', label: 'Food', icon: '🍴' },
    { id: 'nature', label: 'Nature', icon: '🌴' },
    { id: 'adventure', label: 'Adventure', icon: '⚡' },
    { id: 'nightlife', label: 'Nightlife', icon: '🌙' },
    { id: 'shopping', label: 'Shopping', icon: '🛍️' }
  ];

  const handleInterestToggle = (id) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(id) 
        ? prev.interests.filter(i => i !== id)
        : [...prev.interests, id]
    }));
  };

  const cleanCityInput = (input) => {
    if (!input) return "";
    const match = input.match(/\(([A-Z]{3})\)/);
    if (match) return match[1];
    return input;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    const curr = currencies.find(c => c.code === formData.currency) || currencies[0];
    const cleanData = {
      ...formData,
      tripType,
      fromCity: cleanCityInput(formData.fromCity),
      toCity: cleanCityInput(formData.toCity),
      returnDate: tripType === 'one-way' ? null : formData.returnDate,
      budget: `${curr.code} ${formData.budget}`
    };
    onSearch(cleanData);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.fromCity?.trim()) errors.fromCity = 'Please select a departure city';
    if (!formData.toCity?.trim()) errors.toCity = 'Please select a destination city';
    if (!formData.departureDate) errors.departureDate = 'Please select a departure date';
    if (tripType === 'round-trip' && !formData.returnDate) {
      errors.returnDate = 'Please select a return date';
    }
    if (!formData.budget || parseInt(formData.budget) < 100) errors.budget = 'Budget must be at least 100';
    return errors;
  };

  const currentSymbol = currencies.find(c => c.code === formData.currency)?.symbol || '$';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="backdrop-blur-xl bg-white/80 rounded-3xl shadow-2xl p-8 max-w-4xl mx-auto -mt-24 relative z-10 border border-white/40 border-t-white/60"
    >
      {/* TRIP TYPE TOGGLE */}
      <div className="flex justify-center mb-6">
        <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
          <button type="button" onClick={() => setTripType('one-way')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${tripType === 'one-way' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>
            <ArrowRight size={16} /> One Way
          </button>
          <button type="button" onClick={() => setTripType('round-trip')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${tripType === 'round-trip' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>
            <ArrowRightLeft size={16} /> Round Trip
          </button>
        </div>
      </div>

      {Object.keys(formErrors).length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3 text-red-700">
          <AlertCircle size={20} />
          <ul>{Object.values(formErrors).map((err, i) => <li key={i}>{err}</li>)}</ul>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* LOCATIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CityAutocomplete label="From City" value={formData.fromCity} onSelect={(city) => setFormData({...formData, fromCity: city})} icon={MapPin} />
          <CityAutocomplete label="Destination City" value={formData.toCity} onSelect={(city) => setFormData({...formData, toCity: city})} icon={MapPin} />
        </div>

        {/* DATES - FIX: Added text-gray-900 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 ml-1">Departure</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <input type="date"
                className="w-full pl-12 pr-4 py-3 backdrop-blur-sm bg-white/60 border border-white/40 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 text-gray-900" 
                value={formData.departureDate} onChange={(e) => setFormData({...formData, departureDate: e.target.value})} 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className={`block text-sm font-semibold ml-1 ${tripType === 'one-way' ? 'text-gray-400' : 'text-gray-700'}`}>
              Return {tripType === 'one-way' && '(Optional)'}
            </label>
            <div className="relative">
              <Calendar className={`absolute left-4 top-3.5 h-5 w-5 ${tripType === 'one-way' ? 'text-gray-300' : 'text-gray-400'}`} />
              <input type="date"
                disabled={tripType === 'one-way'}
                className={`w-full pl-12 pr-4 py-3 backdrop-blur-sm border border-white/40 rounded-xl outline-none transition-all text-gray-900 
                  ${tripType === 'one-way' ? 'bg-gray-100/50 text-gray-400 cursor-not-allowed' : 'bg-white/60 focus:ring-2 focus:ring-blue-400'}`}
                value={formData.returnDate} onChange={(e) => setFormData({...formData, returnDate: e.target.value})} 
              />
            </div>
          </div>
        </div>

        {/* BUDGET - FIX: Added text-gray-900 */}
        <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 ml-1">Total Budget</label>
            <div className="flex gap-2">
              <select 
                value={formData.currency} 
                onChange={(e) => setFormData({...formData, currency: e.target.value})}
                className="w-1/4 pl-4 py-3 bg-white/60 border border-white/40 rounded-xl outline-none text-gray-900"
              >
                {currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
              <div className="relative flex-1">
                <div className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 font-bold flex items-center justify-center">{currentSymbol}</div>
                <input type="number" min="100" placeholder="2000"
                  className="w-full pl-10 pr-4 py-3 bg-white/60 border border-white/40 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 placeholder-gray-500"
                  value={formData.budget} onChange={(e) => setFormData({...formData, budget: e.target.value})} 
                />
              </div>
            </div>
        </div>

        {/* INTERESTS */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700 ml-1">Interests</label>
          <div className="flex flex-wrap gap-3">
            {interestOptions.map((i) => (
              <button key={i.id} type="button" onClick={() => handleInterestToggle(i.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border transition-all ${formData.interests.includes(i.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/40 text-gray-700 border-white/60 hover:bg-white/60'}`}>
                <span>{i.icon}</span>{i.label}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-lg font-bold py-4 rounded-xl shadow-xl transition-all flex items-center justify-center">
          {isLoading ? <span className="flex items-center gap-2"><Loader2 className="animate-spin" /> Planning Trip...</span> : "SEARCH TRIPS"}
        </button>
      </form>
    </motion.div>
  );
};

export default SearchForm;