import { ArrowRight, PlaneTakeoff, PlaneLanding } from 'lucide-react';

const FlightCard = ({ flight }) => {
  const price = flight.price.total;
  const currency = flight.price.currency; // This will now be INR from API

  return (
    <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100 hover:shadow-md transition-all group">
      <div className="flex flex-col md:flex-row justify-between gap-6">
        
        {/* Flight Segments (Left Side) */}
        <div className="flex-1 space-y-6">
          {flight.itineraries.map((itinerary, index) => {
            const segment = itinerary.segments[0];
            const isReturn = index === 1; // Index 1 means it's the return trip

            return (
              <div key={index} className="flex items-center gap-4">
                {/* Airline Code */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${isReturn ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                  {segment.carrierCode}
                </div>

                {/* Details */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wide ${isReturn ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                      {isReturn ? 'RETURN' : 'OUTBOUND'}
                    </span>
                    <span className="text-xs text-gray-400">• {segment.duration.replace('PT', '').toLowerCase()}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-bold text-gray-800 text-lg">{segment.departure.iataCode}</p>
                      <p className="text-xs text-gray-500">{segment.departure.at.split('T')[1].slice(0,5)}</p>
                    </div>

                    {/* Flight Path Visual */}
                    <div className="flex-1 flex flex-col items-center px-2 min-w-[60px]">
                      <div className="w-full h-[1px] bg-gray-300 relative">
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-1">
                          {isReturn ? <PlaneLanding size={14} className="text-gray-400" /> : <PlaneTakeoff size={14} className="text-gray-400" />}
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">{segment.numberOfStops === 0 ? 'Direct' : `${segment.numberOfStops} Stop`}</p>
                    </div>

                    <div>
                      <p className="font-bold text-gray-800 text-lg">{segment.arrival.iataCode}</p>
                      <p className="text-xs text-gray-500">{segment.arrival.at.split('T')[1].slice(0,5)}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Price & Button (Right Side) */}
        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 gap-2 min-w-[140px]">
          <div className="text-right">
            <p className="text-xs text-gray-400 font-medium">Total Price</p>
            <p className="text-2xl font-bold text-blue-600">
              {currency} {parseFloat(price).toLocaleString('en-IN')}
            </p>
          </div>
          <button className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-xl font-medium transition-colors text-sm flex items-center gap-2 w-full justify-center shadow-lg shadow-gray-200">
            Select <ArrowRight size={14} />
          </button>
        </div>

      </div>
    </div>
  );
};

export default FlightCard;