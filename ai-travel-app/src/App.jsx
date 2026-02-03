import { useState, useEffect } from 'react';
import SearchForm from './components/SearchForm';
import ResultsPage from './pages/ResultsPage';

const App = () => {
  // 1. Initialize state from Session Storage (Clears when tab closes)
  const [searchData, setSearchData] = useState(() => {
    try {
      const saved = sessionStorage.getItem('travex_search');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // 2. Sync state to Session Storage
  useEffect(() => {
    if (searchData) {
      sessionStorage.setItem('travex_search', JSON.stringify(searchData));
    } else {
      sessionStorage.removeItem('travex_search');
    }
  }, [searchData]);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden font-sans text-gray-100">
      
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 opacity-50"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Content Layer */}
      <div className="relative z-10">
        {!searchData ? (
          <div className="min-h-screen flex flex-col items-center justify-center p-4">
            
            {/* Logo */}
            <div className="mb-8">
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 filter drop-shadow-lg">
                TRAVEX
              </h1>
            </div>

            {/* Search Form */}
            <div className="w-full max-w-4xl">
              <SearchForm onSearch={(data) => setSearchData(data)} />
            </div>

          </div>
        ) : (
          /* Results View */
          <ResultsPage 
            searchData={searchData} 
            onBack={() => setSearchData(null)} 
          />
        )}
      </div>
    </div>
  );
};

export default App;