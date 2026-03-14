import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import SearchForm from './components/SearchForm';
import ResultsPage from './pages/ResultsPage';
import DayDetailPage from './pages/DayDetailPage';

const MainApp = () => {
  const [searchData, setSearchData] = useState(() => {
    try {
      const saved = sessionStorage.getItem('travex_search');
      return saved ? JSON.parse(saved) : null;
    } catch {
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
    sessionStorage.removeItem('travex_results_cache');
    setSearchData(data);
  };

  const handleBack = () => {
    sessionStorage.removeItem('travex_results_cache');
    setSearchData(null);
  };

  return (
    <div className="min-h-screen bg-[#F4F1EB] relative overflow-hidden font-sans text-[#1C1916]">

      <div
        className="absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1600&q=80")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <div className="relative z-10">
        <Routes>
          <Route path="/" element={
            !searchData ? (
              <div className="min-h-screen flex flex-col items-center justify-center p-4">

                <div className="mb-12">
                  <h1 className="serif-text text-6xl md:text-8xl font-light text-[#1C1916] tracking-[0.2em] uppercase">
                    Travex
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
            )
          } />

          <Route path="/itinerary/:tripId/day/:dayNumber" element={<DayDetailPage />} />
        </Routes>
      </div>
    </div>
  );
};

export default MainApp;