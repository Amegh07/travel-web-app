import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { searchCities } from '../services/amadeusAPI';

const CityAutocomplete = ({ label, value, onSelect, icon: Icon }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);

  // Close dropdown if clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync internal state if parent value changes
  useEffect(() => {
    if (value) setQuery(value);
  }, [value]);

  // Handle typing with Debounce (wait 500ms before API call)
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length >= 2 && isOpen) {
        setLoading(true);
        try {
          const cities = await searchCities(query);
          setResults(cities || []);
        } catch (error) {
          console.error("Search failed", error);
          setResults([]);
        } finally {
          setLoading(false);
        }
      } else if (query.length < 2) {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query, isOpen]);

  const handleSelect = (city) => {
    const displayName = `${city.name} (${city.code})`;
    setQuery(displayName);
    onSelect(displayName); // Send full formatted name
    setIsOpen(false);
  };

  return (
    <div className="space-y-2 relative" ref={wrapperRef}>
      <label className="text-sm font-semibold text-gray-600 ml-1">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-3.5 text-gray-400">
          {Icon ? <Icon size={18} /> : <MapPin size={18} />}
        </div>
        
        <input 
          type="text" 
          placeholder="Type a city or airport (e.g. New York, JFK)"
          className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase placeholder:normal-case"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />

        {loading && (
          <div className="absolute right-3 top-3.5 text-blue-500 animate-spin">
            <Loader2 size={18} />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full bg-white mt-1 rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto">
          {results.map((city, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(city)}
              className="w-full text-left p-3 hover:bg-blue-50 transition-colors flex items-center justify-between group border-b border-gray-50 last:border-0"
            >
              <div>
                <p className="font-bold text-gray-800 text-sm">{city.name}</p>
                <p className="text-xs text-gray-500">{city.city}, {city.country}</p>
              </div>
              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold group-hover:bg-blue-200 group-hover:text-blue-700">
                {city.code}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CityAutocomplete;