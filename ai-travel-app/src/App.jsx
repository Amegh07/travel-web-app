import { Routes, Route, useNavigate } from 'react-router-dom';
import SearchForm from './components/SearchForm';
import ResultsPage from './pages/ResultsPage';

function App() {
  const navigate = useNavigate();

  const handleSearch = (searchData) => {
    console.log("✈️ Navigating to Results with:", searchData);
    // This pushes the user to /results and passes the data
    navigate('/results', { state: searchData });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Routes>
        {/* HOME PAGE */}
        <Route path="/" element={
          <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074&auto=format&fit=crop')] bg-cover bg-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
            <div className="relative z-10 w-full max-w-4xl space-y-8 text-center">
              <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 drop-shadow-lg">
                TRAVEX
              </h1>
              <p className="text-xl text-gray-200 font-medium">
                AI-Powered Itineraries & Smart Packing Lists
              </p>
              
              {/* Pass the handleSearch function here */}
              <SearchForm onSearch={handleSearch} />
            </div>
          </div>
        } />

        {/* RESULTS PAGE */}
        <Route path="/results" element={<ResultsPage />} />
      </Routes>
    </div>
  );
}

export default App;