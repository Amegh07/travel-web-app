import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { generateItinerary, generatePackingList } from '../services/geminiAPI';
import ItineraryTimeline from '../components/ItineraryTimeline';
import PackingList from '../components/PackingList';
import FlightCard from '../components/FlightCard';
import { MapPin, Calendar, ArrowLeft } from 'lucide-react';

const ResultsPage = () => {
  const location = useLocation();
  const [itinerary, setItinerary] = useState([]);
  const [packingList, setPackingList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 1. SAFEGUARD: Ensure we have data
  const searchData = location.state?.searchData;

  useEffect(() => {
    const fetchData = async () => {
      if (!searchData) return;

      try {
        setLoading(true);
        
        // 2. CALCULATE DAYS
        const start = new Date(searchData.departureDate);
        const end = new Date(searchData.returnDate);
        const diffTime = Math.abs(end - start);
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // 3. CRITICAL FIX: Explicitly use 'toCity' for the AI Plan
        console.log(`Generating plan for: ${searchData.toCity} (Budget: ${searchData.budget})`);

        const [itineraryData, packingData] = await Promise.all([
          generateItinerary(searchData.toCity, days, searchData.budget, searchData.interests),
          generatePackingList(searchData.toCity, days, searchData.interests)
        ]);

        setItinerary(itineraryData);
        setPackingList(packingData);
      } catch (err) {
        console.error("Error fetching plan:", err);
        setError("Failed to generate your plan. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchData]);

  if (!searchData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">No search data found</h2>
        <Link to="/" className="text-blue-600 hover:underline">Return Home</Link>
      </div>
    );
  }

  // Destructure for easy use
  const { fromCity, toCity, departureDate, returnDate, budget } = searchData;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* HEADER */}
      <div className="bg-blue-600 text-white pt-12 pb-24 px-4 shadow-lg relative">
        <div className="max-w-6xl mx-auto">
          <Link to="/" className="inline-flex items-center text-blue-100 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Search
          </Link>
          <h1 className="text-4xl font-extrabold mb-2 uppercase tracking-wide">
            Trip to {toCity}
          </h1>
          <div className="flex flex-wrap gap-4 text-blue-100 text-sm md:text-base font-medium">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              From: {fromCity}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {departureDate} to {returnDate}
            </div>
            <div className="px-3 py-1 bg-blue-500/30 rounded-full border border-blue-400/50">
              Budget: {budget}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-16 space-y-8">
        {/* LOADING STATE */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-700">AI is crafting your {toCity} itinerary...</h2>
            <p className="text-gray-500 mt-2">Checking flights, hotels, and hidden gems.</p>
          </div>
        )}

        {/* ERROR STATE */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl text-center">
            {error}
          </div>
        )}

        {/* RESULTS */}
        {!loading && !error && (
          <>
            {/* 1. FLIGHT ESTIMATE (From -> To) */}
            <section>
               <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                 ✈️ Flight Estimate
               </h2>
               <FlightCard from={fromCity} to={toCity} date={departureDate} />
            </section>

            {/* 2. ITINERARY (For To City) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">📅 Daily Itinerary</h2>
                <ItineraryTimeline days={itinerary} />
              </div>

              {/* 3. PACKING LIST (For To City) */}
              <div className="lg:col-span-1">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">🧳 Packing List</h2>
                <PackingList items={packingList} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResultsPage;