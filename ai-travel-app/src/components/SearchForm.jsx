import { useState } from 'react';
import { motion } from 'framer-motion';
import CityAutocomplete from './CityAutocomplete';
import { Calendar, MapPin, AlertCircle, Sparkles } from 'lucide-react';

const SearchForm = ({ onSearch, isLoading }) => {
  const [formErrors, setFormErrors] = useState({});
  const currencies = [
    { code: 'USD', symbol: '$' },
    { code: 'INR', symbol: '₹' },
    { code: 'EUR', symbol: '€' },
    { code: 'GBP', symbol: '£' },
    { code: 'AUD', symbol: 'A$' },
    { code: 'CAD', symbol: 'C$' },
    { code: 'JPY', symbol: '¥' },
    { code: 'AED', symbol: 'dh' }
  ];

  // ✅ IMPROVED: Comprehensive Currency Detection
  const getInitialCurrency = () => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Asia
      if (tz.includes('India') || tz.includes('Kolkata') || tz.includes('Calcutta')) return 'INR';
      if (tz.includes('Tokyo') || tz.includes('Japan')) return 'JPY';
      if (tz.includes('Dubai') || tz.includes('Abu_Dhabi') || tz.includes('Asia/Muscat')) return 'AED';
      
      // Europe
      if (tz.includes('London') || tz.includes('Belfast')) return 'GBP';
      if (tz.includes('Europe') || tz.includes('Paris') || tz.includes('Berlin') || tz.includes('Rome') || tz.includes('Madrid')) return 'EUR';
      
      // Oceania
      if (tz.includes('Australia') || tz.includes('Sydney') || tz.includes('Melbourne')) return 'AUD';
      
      // Americas
      if (tz.includes('Canada') || tz.includes('Toronto') || tz.includes('Vancouver')) return 'CAD';
      
      // Default to USD for USA and everyone else
      return 'USD';
    } catch (error) {
      console.error(error);
      return 'USD';
    }
  };

  const [formData, setFormData] = useState({
    fromCity: '',
    toCity: '',
    departureDate: '',
    returnDate: '',
    budget: '',
    currency: getInitialCurrency(), 
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validateForm();
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    const curr = currencies.find(c => c.code === formData.currency) || currencies[0];
    onSearch({ ...formData, budget: `${curr.code} ${formData.budget}` });
  };

  const validateForm = () => {
    const errors = {};
    
    // Just check if city is not empty - CityAutocomplete handles the format
    if (!formData.fromCity?.trim()) {
      errors.fromCity = 'Please select a departure city';
    }
    if (!formData.toCity?.trim()) {
      errors.toCity = 'Please select a destination city';
    }
    if (formData.fromCity?.trim() && formData.toCity?.trim() && formData.fromCity.toLowerCase() === formData.toCity.toLowerCase()) {
      errors.toCity = 'Departure and destination must be different';
    }
    if (!formData.departureDate) {
      errors.departureDate = 'Please select a departure date';
    }
    if (!formData.returnDate) {
      errors.returnDate = 'Please select a return date';
    }
    if (formData.departureDate && formData.returnDate) {
      const departure = new Date(formData.departureDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (departure < today) {
        errors.departureDate = 'Departure date cannot be in the past';
      }
      
      const returnDate = new Date(formData.returnDate);
      if (returnDate <= departure) {
        errors.returnDate = 'Return date must be after departure date';
      }
    }
    if (!formData.budget || parseInt(formData.budget) < 100) {
      errors.budget = 'Budget must be at least 100';
    }
    
    return errors;
  };

  const currentSymbol = currencies.find(c => c.code === formData.currency)?.symbol || '$';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="backdrop-blur-xl bg-white/80 rounded-3xl shadow-2xl p-8 max-w-4xl mx-auto -mt-24 relative z-10 border border-white/40 border-t-white/60"
      style={{
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
      }}
    >
      {Object.keys(formErrors).length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-gradient-to-r from-red-50 to-red-50/50 border border-red-200/50 rounded-xl flex gap-3 backdrop-blur-sm"
        >
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900 mb-2">Please fix the following errors:</p>
            <ul className="text-sm text-red-700 space-y-1">
              {Object.entries(formErrors).map(([field, message]) => (
                <li key={field}>• {message}</li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Cities */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-2"
          >
            <div className="relative group">
              <MapPin className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <CityAutocomplete 
                label="From City"
                value={formData.fromCity}
                onSelect={(city) => {
                  setFormData({...formData, fromCity: city});
                  if (formErrors.fromCity) {
                    const newErrors = {...formErrors};
                    delete newErrors.fromCity;
                    setFormErrors(newErrors);
                  }
                }}
                icon={MapPin}
              />
              {!formErrors.fromCity && formData.fromCity && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute right-4 top-3.5">
                  <Sparkles size={18} className="text-blue-500" />
                </motion.div>
              )}
            </div>
            {formErrors.fromCity && <p className="text-xs text-red-600 ml-1">{formErrors.fromCity}</p>}
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-2"
          >
            <div className="relative group">
              <MapPin className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <CityAutocomplete 
                label="Destination City"
                value={formData.toCity}
                onSelect={(city) => {
                  setFormData({...formData, toCity: city});
                  if (formErrors.toCity) {
                    const newErrors = {...formErrors};
                    delete newErrors.toCity;
                    setFormErrors(newErrors);
                  }
                }}
                icon={MapPin}
              />
              {!formErrors.toCity && formData.toCity && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute right-4 top-3.5">
                  <Sparkles size={18} className="text-blue-500" />
                </motion.div>
              )}
            </div>
            {formErrors.toCity && <p className="text-xs text-red-600 ml-1">{formErrors.toCity}</p>}
          </motion.div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <label className="block text-sm font-semibold text-gray-700 ml-1">Departure</label>
            <div className="relative group">
              <Calendar className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input type="date"
                className={`w-full pl-12 pr-4 py-3 backdrop-blur-sm bg-white/60 border rounded-xl outline-none focus:ring-2 focus:ring-offset-0 transition-all ${formErrors.departureDate ? 'border-red-300 focus:ring-red-400' : 'border-white/40 focus:ring-blue-400'}`}
                value={formData.departureDate} onChange={(e) => {
                  setFormData({...formData, departureDate: e.target.value});
                  if (formErrors.departureDate) {
                    const newErrors = {...formErrors};
                    delete newErrors.departureDate;
                    setFormErrors(newErrors);
                  }
                }} />
            </div>
            {formErrors.departureDate && <p className="text-xs text-red-600 ml-1">{formErrors.departureDate}</p>}
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="space-y-2"
          >
            <label className="block text-sm font-semibold text-gray-700 ml-1">Return</label>
            <div className="relative group">
              <Calendar className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input type="date"
                className={`w-full pl-12 pr-4 py-3 backdrop-blur-sm bg-white/60 border rounded-xl outline-none focus:ring-2 focus:ring-offset-0 transition-all ${formErrors.returnDate ? 'border-red-300 focus:ring-red-400' : 'border-white/40 focus:ring-blue-400'}`}
                value={formData.returnDate} onChange={(e) => {
                  setFormData({...formData, returnDate: e.target.value});
                  if (formErrors.returnDate) {
                    const newErrors = {...formErrors};
                    delete newErrors.returnDate;
                    setFormErrors(newErrors);
                  }
                }} />
            </div>
            {formErrors.returnDate && <p className="text-xs text-red-600 ml-1">{formErrors.returnDate}</p>}
          </motion.div>
        </div>

        {/* Budget & Currency */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
            <label className="block text-sm font-semibold text-gray-700 ml-1">Total Budget</label>
            <div className="flex gap-2">
              <div className="relative w-1/3 md:w-1/4">
                <select value={formData.currency} onChange={(e) => setFormData({...formData, currency: e.target.value})}
                  className="w-full h-full pl-4 pr-8 py-3 backdrop-blur-sm bg-white/60 border border-white/40 rounded-xl outline-none appearance-none font-medium text-gray-700 cursor-pointer hover:bg-white/80 focus:ring-2 focus:ring-blue-400 transition-all">
                  {currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select>
              </div>
              <div className="relative flex-1 group">
                <div className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 font-bold flex items-center justify-center group-focus-within:text-blue-500 transition-colors">{currentSymbol}</div>
                <input type="number" min="100" placeholder="2000"
                  className={`w-full pl-10 pr-4 py-3 backdrop-blur-sm bg-white/60 border rounded-xl outline-none focus:ring-2 focus:ring-offset-0 font-medium transition-all ${formErrors.budget ? 'border-red-300 focus:ring-red-400' : 'border-white/40 focus:ring-blue-400'}`}
                  value={formData.budget} onChange={(e) => {
                    setFormData({...formData, budget: e.target.value});
                    if (formErrors.budget) {
                      const newErrors = {...formErrors};
                      delete newErrors.budget;
                      setFormErrors(newErrors);
                    }
                  }} />
              </div>
            </div>
            {formErrors.budget && <p className="text-xs text-red-600 ml-1">{formErrors.budget}</p>}
        </motion.div>

        {/* Interests */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="space-y-3"
        >
          <label className="block text-sm font-semibold text-gray-700 ml-1">Interests</label>
          <div className="flex flex-wrap gap-3">
            {interestOptions.map((i, idx) => (
              <motion.button 
                key={i.id} 
                type="button" 
                onClick={() => handleInterestToggle(i.id)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 + idx * 0.05 }}
                whileHover={{ scale: 1.05, translateY: -2 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border transition-all ${
                  formData.interests.includes(i.id) 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white border-blue-600 shadow-lg' 
                    : 'bg-white/40 backdrop-blur-sm text-gray-700 border-white/60 hover:bg-white/60'
                }`}>
                <span>{i.icon}</span>{i.label}
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.button 
          type="submit" 
          disabled={isLoading} 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02, translateY: -2 }}
          whileTap={{ scale: 0.98 }}
          className="relative w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white text-lg font-bold py-4 rounded-xl shadow-xl transition-all flex items-center justify-center uppercase tracking-wider overflow-hidden group"
        >
          {isLoading ? (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              <span className="relative flex items-center gap-2">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }} className="inline-block">⚡</motion.div>
                Processing...
              </span>
            </>
          ) : (
            <span className="relative">SEARCH TRIPS</span>
          )}
        </motion.button>
      </form>
    </motion.div>
  );
};

export default SearchForm;