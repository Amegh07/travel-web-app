import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Sparkles, Plus, Minus, Wallet, Palmtree, Utensils, Music, Camera, Moon } from 'lucide-react';

const HomePage = () => {
  const navigate = useNavigate();
  
  // State for the form
  const [tripDetails, setTripDetails] = useState({
    from: '',
    to: '',
    country: '',
    date: '',
    days: 5,
    budget: 'Comfortable',
    interests: []
  });

  const interestsList = [
    { id: 'culture', label: 'Culture', icon: <Camera size={16} /> },
    { id: 'food', label: 'Food', icon: <Utensils size={16} /> },
    { id: 'music', label: 'Music', icon: <Music size={16} /> },
    { id: 'adventure', label: 'Adventure', icon: <Palmtree size={16} /> },
    { id: 'nightlife', label: 'Nightlife', icon: <Moon size={16} /> },
  ];

  const handleInterestToggle = (id) => {
    setTripDetails(prev => ({
      ...prev,
      interests: prev.interests.includes(id) 
        ? prev.interests.filter(i => i !== id) 
        : [...prev.interests, id]
    }));
  };

  const handleSearch = () => {
    // Navigate to results with all the data
    navigate(`/results?from=${tripDetails.from}&to=${tripDetails.to}&date=${tripDetails.date}&budget=${tripDetails.budget}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center py-10 px-4">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Header Section */}
        <div className="bg-blue-600 p-8 text-white text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <Sparkles size={24} className="text-yellow-300" />
            </div>
            <h1 className="text-3xl font-bold">Plan Your Trip</h1>
          </div>
          <p className="text-blue-100">Fill in the details and let AI do the rest</p>
        </div>

        {/* Form Section */}
        <div className="p-8 space-y-8">
          
          {/* 1. Cities & Country Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600 ml-1">From City</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3.5 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="e.g., New York"
                  className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={tripDetails.from}
                  onChange={(e) => setTripDetails({...tripDetails, from: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600 ml-1">Destination City</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3.5 text-blue-500" size={18} />
                <input 
                  type="text" 
                  placeholder="e.g., Paris"
                  className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={tripDetails.to}
                  onChange={(e) => setTripDetails({...tripDetails, to: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600 ml-1">Country</label>
              <input 
                type="text" 
                placeholder="e.g., France"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={tripDetails.country}
                onChange={(e) => setTripDetails({...tripDetails, country: e.target.value})}
              />
            </div>
          </div>

          {/* 2. Date & Duration Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600 ml-1">Travel Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3.5 text-gray-400" size={18} />
                <input 
                  type="date" 
                  className="w-full pl-10 p-3 bg-blue-50 border border-blue-100 text-blue-700 font-medium rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={tripDetails.date}
                  onChange={(e) => setTripDetails({...tripDetails, date: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600 ml-1">Number of Days</label>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setTripDetails(prev => ({...prev, days: Math.max(1, prev.days - 1)}))}
                  className="p-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
                >
                  <Minus size={20} />
                </button>
                <span className="text-2xl font-bold text-gray-800 w-8 text-center">{tripDetails.days}</span>
                <button 
                  onClick={() => setTripDetails(prev => ({...prev, days: Math.min(30, prev.days + 1)}))}
                  className="p-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* 3. Budget Preference Cards */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-600 ml-1">Budget Preference</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['Budget Friendly', 'Comfortable', 'Luxury'].map((level) => (
                <button
                  key={level}
                  onClick={() => setTripDetails({...tripDetails, budget: level})}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    tripDetails.budget === level 
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                    : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet size={18} className={tripDetails.budget === level ? 'text-blue-600' : 'text-gray-400'} />
                    <span className={`font-bold ${tripDetails.budget === level ? 'text-blue-700' : 'text-gray-700'}`}>{level}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {level === 'Budget Friendly' && 'Hostels, street food, free attractions'}
                    {level === 'Comfortable' && '3-4 star hotels, local restaurants'}
                    {level === 'Luxury' && '5-star hotels, fine dining, VIP access'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Interests Tags */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-600 ml-1">Your Interests</label>
            <div className="flex flex-wrap gap-3">
              {interestsList.map((interest) => (
                <button
                  key={interest.id}
                  onClick={() => handleInterestToggle(interest.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                    tripDetails.interests.includes(interest.id)
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {interest.icon}
                  {interest.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Big Submit Button */}
          <button 
            onClick={handleSearch}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-lg font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 transform transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            ✨ Create My AI Travel Plan
          </button>

        </div>
      </div>
    </div>
  );
};

export default HomePage;