import { useState, useRef, useEffect } from 'react';
import { Search, Loader2, AlertCircle, Plane } from 'lucide-react';

const CityAutocomplete = ({ label, onSelect, initialValue = '', error }) => {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef(null);

  // SEARCH LOGIC (With 600ms Debounce to save your API)
  const handleChange = (text) => {
    setQuery(text);

    // Clear old timer
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    // Wait 600ms (Safe for API limits)
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setIsOpen(true);
      try {
        const res = await fetch(`http://localhost:5000/api/city-search?keyword=${text}`);
        const data = await res.json();
        setResults(data || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 600);
  };

  const handleSelect = (city) => {
    // Stop any pending searches
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    setQuery(`${city.name} (${city.iataCode})`);
    setIsOpen(false);
    onSelect(city);
  };

  return (
    <div className="relative space-y-2">
      <label className="block text-sm font-semibold text-blue-300">{label}</label>

      <div className="relative z-20"> {/* Input is Z-20 */}
        <div className="absolute left-4 top-3.5 text-gray-400">
          <Search size={18} />
        </div>

        <input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder="Type city (e.g. Kochi)"
          className={`w-full pl-11 pr-4 py-3 rounded-xl border outline-none text-slate-900 ${
            error
              ? 'border-red-300 bg-red-50'
              : 'border-gray-200 bg-gray-50 focus:ring-2 focus:ring-blue-400'
          }`}
        />

        {loading && (
          <div className="absolute right-4 top-3.5 animate-spin text-blue-500">
            <Loader2 size={18} />
          </div>
        )}
      </div>

      {/* 🛡️ THE FIX: INVISIBLE WALL & DROPDOWN */}
      {isOpen && (
        <>
          {/* 1. INVISIBLE WALL (Z-30): Detects "Outside Clicks" */}
          <div 
            className="fixed inset-0 z-30 bg-transparent cursor-default"
            onClick={() => setIsOpen(false)}
          />

          {/* 2. THE DROPDOWN (Z-40): Sits ABOVE the wall */}
          {results.length > 0 ? (
            <div className="absolute z-40 w-full bg-white border rounded-xl shadow-xl max-h-60 overflow-y-auto mt-1">
              {results.map((city, i) => (
                <button
                  key={`${city.iataCode}-${i}`}
                  type="button"
                  onClick={() => handleSelect(city)}
                  className="w-full px-4 py-3 text-left hover:bg-blue-50 flex justify-between items-center text-slate-800 border-b border-gray-100 last:border-0 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Plane size={14} className="text-gray-400"/>
                    <div>
                      <p className="font-semibold">{city.name}</p>
                      <p className="text-xs text-gray-500">{city.city}, {city.country}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {city.iataCode}
                  </span>
                </button>
              ))}
            </div>
          ) : (
             // No results message (Also Z-40)
             !loading && (
               <div className="absolute z-40 w-full bg-white border rounded-xl shadow-xl p-4 text-center text-slate-500 text-sm mt-1">
                 No cities found.
               </div>
             )
          )}
        </>
      )}
    </div>
  );
};

export default CityAutocomplete;