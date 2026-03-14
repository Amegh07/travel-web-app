import { useEffect, useState } from 'react';
import { getAmadeusToken, fetchFlights } from '../services/amadeusAPI';

const DebugStatus = () => {
  const [status, setStatus] = useState({
    amadeusKey: 'Loading...',
    token: 'Fetching...',
    flightApi: 'Waiting...'
  });
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const runDiagnostics = async () => {
      // 1. Check Environment Variable
      const hasKey = !!import.meta.env.VITE_AMADEUS_CLIENT_ID;
      setStatus(prev => ({ 
        ...prev, 
        amadeusKey: hasKey ? '✅ Loaded' : '❌ Missing' 
      }));

      if (!hasKey) return;

      // 2. Check Token Generation
      try {
        const token = await getAmadeusToken();
        setStatus(prev => ({ 
          ...prev, 
          token: token ? '✅ Active' : '❌ Failed' 
        }));

        if (!token) return;

        // 3. Test Flight API
        setStatus(prev => ({ ...prev, flightApi: 'Testing...' }));
        
        // Use a date 30 days in the future for a realistic search
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        const dateStr = futureDate.toISOString().split('T')[0];

        const results = await fetchFlights('NYC', 'PAR', dateStr);
        // fetchFlights returns an array on success (or handled error), so we check if it's an array
        setStatus(prev => ({ 
          ...prev, 
          flightApi: Array.isArray(results) ? '✅ Connection OK' : '❌ Error' 
        }));

      } catch (e) {
        console.error("Debug Check Failed", e);
        setStatus(prev => ({ ...prev, flightApi: '❌ Exception' }));
      }
    };

    runDiagnostics();
  }, []);

  if (!isOpen) return (
    <button 
      onClick={() => setIsOpen(true)}
      className="fixed bottom-4 right-4 z-50 bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
      title="Show Debug Status"
    >
      🐞
    </button>
  );

  return (
    <div className="fixed bottom-4 right-4 z-50 w-64 bg-gray-900/95 backdrop-blur text-white rounded-lg shadow-xl border border-gray-700 overflow-hidden font-mono text-xs">
      <div className="bg-gray-800 px-4 py-2 flex justify-between items-center border-b border-gray-700">
        <span className="font-bold text-blue-400">🔌 Connection Test</span>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">✕</button>
      </div>
      
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Amadeus Key</span>
          <span className="font-medium">{status.amadeusKey}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Token Status</span>
          <span className="font-medium">{status.token}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Flight API</span>
          <span className="font-medium">{status.flightApi}</span>
        </div>
      </div>
    </div>
  );
};

export default DebugStatus;