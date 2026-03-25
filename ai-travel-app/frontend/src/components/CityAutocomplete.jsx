import { useState, useEffect, useRef } from 'react';
import { Plane, Loader2, Navigation } from 'lucide-react';
import { searchCities } from '../services/api';

const CityAutocomplete = ({ placeholder, onSelect, className }) => {
  const [query, setQuery] = useState('');
  const [bestMatch, setBestMatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Smart Search Logic
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 2) {
        setBestMatch(null);
        return;
      }
      setLoading(true);
      try {
        const data = await searchCities(query);

        // 🧠 SMART FILTER: Pick ONLY the best result
        // Priority 1: An official Airport (e.g., COK)
        // Priority 2: A major City with an IATA code (e.g., TYO)
        // Fallback: If no API result, we will use the raw text later

        const airport = data.find(item => item.type === 'AIRPORT');
        const city = data.find(item => item.type === 'CITY');

        // Set only ONE result
        setBestMatch(airport || city || null);

      } catch {
        setBestMatch(null);
      } finally {
        setLoading(false);
      }
    }, 400); // Wait 400ms after typing stops
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item) => {
    // If we have an API match, use it. Otherwise, use raw text.
    const selection = item || { name: query, iataCode: query, isCustom: true };

    setQuery(selection.name);
    if (onSelect) onSelect(selection);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="w-full relative">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={`w-full p-4 bg-transparent outline-none text-lg font-semibold placeholder-slate-500 ${className}`}
      />

      {isOpen && query.length > 1 && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-slate-900/95 border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl">

          {loading ? (
            <div className="p-4 text-center text-slate-500 flex justify-center gap-2">
              <Loader2 className="animate-spin" size={16} /> Finding best match...
            </div>
          ) : bestMatch ? (
            /* ✅ CASE 1: API FOUND A MATCH (e.g., Kochi -> COK) */
            /* We show ONLY this option. The raw text option is hidden. */
            <button
              onClick={() => handleSelect(bestMatch)}
              className="w-full text-left p-4 hover:bg-blue-600 flex items-center gap-3 group transition-colors"
            >
              <div className="bg-blue-500/20 p-2 rounded-full group-hover:bg-white/20 text-blue-400 group-hover:text-white">
                <Plane size={18} />
              </div>
              <div>
                <div className="font-bold text-white text-lg">{bestMatch.name}</div>
                <div className="text-xs text-slate-400 group-hover:text-blue-200 flex items-center gap-2">
                  {bestMatch.address?.countryName}
                  <span className="bg-white/10 px-1.5 py-0.5 rounded text-white font-mono font-bold tracking-wider">
                    {bestMatch.iataCode}
                  </span>
                </div>
              </div>
            </button>
          ) : (
            /* ✅ CASE 2: NO API MATCH (e.g., Alangad) */
            /* We show the "Custom Location" option automatically */
            <button
              onClick={() => handleSelect(null)}
              className="w-full text-left p-4 hover:bg-emerald-600 flex items-center gap-3 group transition-colors"
            >
              <div className="bg-emerald-500/20 p-2 rounded-full group-hover:bg-white/20 text-emerald-400 group-hover:text-white">
                <Navigation size={18} />
              </div>
              <div>
                <div className="font-bold text-white text-lg">Use &quot;{query}&quot;</div>
                <div className="text-xs text-emerald-500/80 group-hover:text-emerald-200">
                  Search for this specific location
                </div>
              </div>
            </button>
          )}

        </div>
      )}
    </div>
  );
};

export default CityAutocomplete;