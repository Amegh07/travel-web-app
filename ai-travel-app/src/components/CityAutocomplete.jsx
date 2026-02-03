import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { searchCities } from '../services/amadeusAPI';

const CityAutocomplete = ({ label, onSelect, value, icon: Icon }) => {
  // Ensure query is always a string to prevent [object Object]
  const [query, setQuery] = useState(typeof value === 'string' ? value : '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Sync internal state with parent value, ensuring it's a string
  useEffect(() => {
    if (typeof value === 'string') {
      setQuery(value);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = async (text) => {
    setQuery(text);
    // Only search if user typed 2+ characters
    if (text.length > 1) {
      setLoading(true);
      setIsOpen(true);
      try {
        const cities = await searchCities(text);
        setResults(cities || []);
      } catch (error) {
        console.error("Search failed:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    } else {
      setResults([]);
      setIsOpen(false);
    }
  };

  const handleSelect = (city) => {
    // 🛑 CRITICAL FIX: Extract the text string immediately
    const displayValue = `${city.name} (${city.iataCode})`;
    
    // Update local input text
    setQuery(displayValue);
    
    // Close dropdown
    setIsOpen(false);
    
    // Send ONLY the string to the parent form
    onSelect(displayValue); 
  };

  return (
    <div className="space-y-2 relative" ref={wrapperRef}>
      <label className="block text-sm font-semibold text-gray-700 ml-1">{label}</label>
      <div className="relative">
        <div className="absolute left-4 top-3.5 text-gray-400">
          {Icon ? <Icon size={20} /> : <Search size={20} />}
        </div>
        
        <input
          type="text"
          className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-white/40 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 placeholder-gray-500"
          placeholder="Type a city (e.g. New York)"
          value={query} // This must be a string
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => query.length > 1 && setIsOpen(true)}
        />

        {loading && (
          <div className="absolute right-4 top-3.5 animate-spin text-blue-500">
            <Loader2 size={20} />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto">
          {results.map((city, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(city)}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 flex items-center justify-between group"
            >
              <div>
                <p className="font-bold text-gray-800">{city.name}</p>
                <p className="text-xs text-gray-500">{city.country}</p>
              </div>
              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono font-bold group-hover:bg-blue-200 group-hover:text-blue-800 transition-colors">
                {city.iataCode}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CityAutocomplete;