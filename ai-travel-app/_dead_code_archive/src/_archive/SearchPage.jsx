import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchForm from '../components/SearchForm';
import AmbientBackground from '../components/AmbientBackground';

const SearchPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (searchData) => {
    setIsLoading(true);
    navigate('/results', { state: { searchData } });
    // Let ResultsPage handle loading state
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <AmbientBackground variant="search" />
      
      {/* Header */}
      <div className="relative pt-20 pb-40 px-4 text-center z-20">
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold bg-gradient-to-r from-blue-700 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-6 tracking-tight">
            TRAVEX
          </h1>
          <p className="text-lg md:text-xl text-gray-700 max-w-2xl mx-auto font-medium">
            Plan your perfect round trip with AI-powered precision
          </p>
      </div>

      {/* Search Form */}
      <div className="relative z-30 px-4 pb-20">
        <SearchForm onSearch={handleSearch} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default SearchPage;