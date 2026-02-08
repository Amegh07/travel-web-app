import { useState, useEffect, useRef } from 'react';
import { MapPin, Plane, Loader2, Search } from 'lucide-react';
import { searchCities } from '../services/api';

const CityAutocomplete = ({ placeholder, onSelect, initialValue = '', className }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (initialValue) setQuery(initialValue);
  }, [initialValue]);

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search API Call
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 2) return;
      setLoading(true);
      try {
        const data = await searchCities(query);
        setResults(data || []);
      } catch (error) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const handleInputChange = (e) => {
    const text = e.target.value;
    setQuery(text);
    setIsOpen(true);
    // ✅ SAFETY CHECK: Only call onSelect if it exists
    if (onSelect) {
        onSelect({ name: text, iataCode: text }); 
    }
  };

  const handleSelect = (city) => {
    setQuery(city.name);
    // ✅ SAFETY CHECK
    if (onSelect) {
        onSelect(city);
    }
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="w-full relative">
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={`w-full bg-transparent outline-none text-white placeholder-slate-400 font-semibold ${className}`}
        autoComplete="off"
      />

      {isOpen && query.length > 1 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar backdrop-blur-xl">
          {loading ? (
            <div className="p-4 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Searching...
            </div>
          ) : (
            <>
              {/* Option 1: Use what I typed */}
              <button
                onClick={() => handleSelect({ name: query, iataCode: query })}
                className="w-full text-left p-3 hover:bg-blue-600/20 transition-colors flex items-center gap-3 border-b border-white/5 bg-slate-800/50"
              >
                <div className="bg-emerald-500/20 p-2 rounded-full">
                    <Search size={14} className="text-emerald-400" />
                </div>
                <div>
                    <div className="font-bold text-white text-sm">{query}</div>
                    <div className="text-xs text-emerald-400">Search this location</div>
                </div>
              </button>

              {/* Option 2: API Results */}
              {results.map((city, index) => (
                <button
                  key={index}
                  onClick={() => handleSelect(city)}
                  className="w-full text-left p-3 hover:bg-white/10 transition-colors flex items-center gap-3 border-b border-white/5"
                >
                  <div className="bg-white/10 p-2 rounded-full">
                    {city.subType === 'AIRPORT' ? <Plane size={14} className="text-blue-400" /> : <MapPin size={14} className="text-gray-400" />}
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">{city.name}</div>
                    <div className="text-xs text-slate-400 flex gap-2">
                      <span>{city.address?.countryName}</span>
                      {city.iataCode && <span className="bg-white/10 px-1 rounded text-white">{city.iataCode}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CityAutocomplete;