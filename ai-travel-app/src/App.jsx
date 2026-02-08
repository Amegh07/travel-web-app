import { useState, useEffect } from 'react';
import SearchForm from './components/SearchForm';
import ResultsPage from './pages/ResultsPage';

const App = () => {
  const [searchData, setSearchData] = useState(() => {
    try {
      const saved = sessionStorage.getItem('travex_search');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    if (searchData) {
      sessionStorage.setItem('travex_search', JSON.stringify(searchData));
    } else {
      sessionStorage.removeItem('travex_search');
    }
  }, [searchData]);

  const handleSearch = (data) => {
    console.log('✈️ Setting search data:', data);
    setSearchData(data);
  };

  const handleBack = () => {
    setSearchData(null);
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden font-sans text-gray-100">
      
      <div 
        className="absolute inset-0 z-0 opacity-50"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <div className="relative z-10">
        {!searchData ? (
          <div className="min-h-screen flex flex-col items-center justify-center p-4">
            
            <div className="mb-8">
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 filter drop-shadow-lg">
                TRAVEX
              </h1>
            </div>

            <div className="w-full max-w-4xl">
              <SearchForm onSearch={handleSearch} />
            </div>

          </div>
        ) : (
          <ResultsPage 
            searchData={searchData} 
            onBack={handleBack} 
          />
        )}
      </div>
    </div>
  );
};

// THIS LINE WAS MISSING - ADD IT:
export default App;