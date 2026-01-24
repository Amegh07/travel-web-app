import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchForm from '../components/SearchForm'; // ✅ This must be here

const SearchPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (searchData) => {
    setIsLoading(true);
    // Navigate to results and pass the form data
    navigate('/results', { state: { searchData } });
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Blue Header */}
      <div className="bg-blue-600 pb-40 pt-20 px-4 text-center shadow-lg">
        <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tight uppercase">
          TRAVEX
        </h1>
        <p className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto font-medium">
          Plan your perfect round trip with AI-powered precision
        </p>
      </div>

      {/* The Search Form */}
      <SearchForm onSearch={handleSearch} isLoading={isLoading} />
    </div>
  );
};

export default SearchPage;