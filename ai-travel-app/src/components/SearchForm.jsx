import React, { useState } from 'react';
import CityAutocomplete from './CityAutocomplete';
import { Calendar, MapPin } from 'lucide-react';

const SearchForm = ({ onSearch, isLoading }) => {
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
    const curr = currencies.find(c => c.code === formData.currency) || currencies[0];
    onSearch({ ...formData, budget: `${curr.code} ${formData.budget}` });
  };

  const currentSymbol = currencies.find(c => c.code === formData.currency)?.symbol || '$';

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-4xl mx-auto -mt-24 relative z-10 border border-gray-100">
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Cities */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 ml-1">From City</label>
            <div className="relative group">
              <MapPin className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <CityAutocomplete 
                value={formData.fromCity}
                onChange={(city) => setFormData({...formData, fromCity: city})}
                placeholder="Origin City"
                className="pl-12"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 ml-1">Destination City</label>
            <div className="relative group">
              <MapPin className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <CityAutocomplete 
                value={formData.toCity}
                onChange={(city) => setFormData({...formData, toCity: city})}
                placeholder="Destination City"
                className="pl-12"
              />
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 ml-1">Departure</label>
            <div className="relative group">
              <Calendar className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <input type="date" required className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.departureDate} onChange={(e) => setFormData({...formData, departureDate: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 ml-1">Return</label>
            <div className="relative group">
              <Calendar className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <input type="date" required className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.returnDate} onChange={(e) => setFormData({...formData, returnDate: e.target.value})} />
            </div>
          </div>
        </div>

        {/* Budget & Currency */}
        <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 ml-1">Total Budget</label>
            <div className="flex gap-2">
              <div className="relative w-1/3 md:w-1/4">
                <select value={formData.currency} onChange={(e) => setFormData({...formData, currency: e.target.value})}
                  className="w-full h-full pl-4 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none appearance-none font-medium text-gray-700 cursor-pointer hover:bg-white">
                  {currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select>
              </div>
              <div className="relative flex-1 group">
                <div className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 font-bold flex items-center justify-center">{currentSymbol}</div>
                <input type="number" min="100" placeholder="2000" required className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  value={formData.budget} onChange={(e) => setFormData({...formData, budget: e.target.value})} />
              </div>
            </div>
        </div>

        {/* Interests */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700 ml-1">Interests</label>
          <div className="flex flex-wrap gap-3">
            {interestOptions.map((i) => (
              <button key={i.id} type="button" onClick={() => handleInterestToggle(i.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border transition-all ${
                  formData.interests.includes(i.id) ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-blue-50'
                }`}>
                <span>{i.icon}</span>{i.label}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold py-4 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center uppercase tracking-wide">
          {isLoading ? "Processing..." : "SEARCH"}
        </button>
      </form>
    </div>
  );
};

export default SearchForm;