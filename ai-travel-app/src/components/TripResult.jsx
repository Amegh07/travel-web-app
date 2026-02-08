import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Clock, ArrowLeft, Download, Share2, Calendar } from 'lucide-react';

const TripResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // 1. GET DATA FROM NAVIGATION STATE
  const { itinerary, tripDetails } = location.state || {};
  
  // 2. IMAGE STATE
  const [bgImage, setBgImage] = useState("https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop");

  // 3. FETCH DESTINATION IMAGE ON LOAD
  useEffect(() => {
    if (!itinerary || !tripDetails) {
      // Redirect if no data (user accessed page directly)
      navigate('/'); 
      return;
    }

    // Fetch a nice background image for the destination
    const fetchImage = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/destination-image?query=${tripDetails.destination}`);
        const data = await res.json();
        if (data.url) setBgImage(data.url);
      } catch (e) {
        console.error("Image fetch failed", e);
      }
    };

    fetchImage();
  }, [tripDetails, navigate, itinerary]);

  if (!itinerary) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* --- HERO SECTION --- */}
      <div className="relative h-[40vh] w-full overflow-hidden">
        <img 
          src={bgImage} 
          alt={tripDetails?.destination} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        
        <div className="absolute bottom-0 left-0 p-8 text-white w-full max-w-6xl mx-auto">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 text-sm hover:text-blue-300 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Search
          </button>
          <h1 className="text-5xl font-black tracking-tight mb-2 uppercase">
            {tripDetails?.destination}
          </h1>
          <div className="flex items-center gap-4 text-gray-300 font-medium">
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {tripDetails?.dates}</span>
            <span>•</span>
            <span className="capitalize">{tripDetails?.budget} Budget</span>
          </div>
        </div>
      </div>

      {/* --- ITINERARY CONTENT --- */}
      <div className="max-w-5xl mx-auto px-4 py-12 -mt-10 relative z-10">
        
        {/* Action Bar */}
        <div className="flex justify-end gap-3 mb-8">
          <button className="bg-white px-4 py-2 rounded-lg shadow-sm font-semibold text-gray-700 flex items-center gap-2 hover:bg-gray-50 transition-colors">
            <Share2 className="w-4 h-4" /> Share
          </button>
          <button className="bg-blue-600 px-4 py-2 rounded-lg shadow-lg shadow-blue-500/30 font-semibold text-white flex items-center gap-2 hover:bg-blue-700 transition-colors">
            <Download className="w-4 h-4" /> Save PDF
          </button>
        </div>

        {/* TIMELINE */}
        <div className="space-y-8">
          {itinerary.map((day, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              
              {/* Day Header */}
              <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
                <h2 className="text-2xl font-bold">Day {day.day}</h2>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                  {day.theme}
                </span>
              </div>

              {/* Activities List */}
              <div className="p-6 space-y-6">
                {day.activities.map((activity, actIndex) => (
                  <div key={actIndex} className="flex gap-4 group">
                    {/* Time Column */}
                    <div className="w-24 flex-shrink-0 flex flex-col items-end pt-1">
                      <span className="font-bold text-gray-800">{activity.time}</span>
                      <div className="h-full w-0.5 bg-gray-100 mt-2 group-last:hidden mx-auto translate-x-3"></div>
                    </div>

                    {/* Icon & Content */}
                    <div className="flex-1 pb-6 border-b border-gray-50 last:border-0 last:pb-0">
                      <h3 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
                        {activity.location}
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.location + " " + tripDetails.destination)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gray-300 hover:text-blue-500 transition-colors"
                        >
                          <MapPin className="w-4 h-4" />
                        </a>
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {activity.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default TripResult;