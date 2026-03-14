import { Plane, ArrowRight } from 'lucide-react';

const FlightCard = ({ flights }) => {
  // Safety Check: If no flights, show a clean "Empty State"
  if (!flights || !Array.isArray(flights) || flights.length === 0) {
    return (
      <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 border-2 border-dashed border-gray-300 text-center">
        <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Plane className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-600">No flights found</h3>
        <p className="text-sm text-gray-400">Try changing dates or destination.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-12">
      <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
        <span className="bg-blue-100 p-2 rounded-lg"><Plane className="w-6 h-6 text-blue-600" /></span>
        Best Flights
      </h2>

      <div className="grid gap-4">
        {flights.map((flight, index) => {
          const price = flight.price?.total || "N/A";
          const currency = flight.price?.currency || "EUR";
          const itinerary = flight.itineraries?.[0];
          const segments = itinerary?.segments || [];
          const firstSegment = segments[0] || {};
          const lastSegment = segments[segments.length - 1] || {};
          const airlineCode = flight.validatingAirlineCodes?.[0] || "UN";
          const logoUrl = `https://pics.avs.io/200/200/${airlineCode}.png`; 
          let duration = itinerary?.duration || "N/A";
          duration = duration.replace("PT", "").replace("H", "h ").replace("M", "m");

          return (
            <div key={flight.id || index} className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all duration-300 relative overflow-hidden">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 w-full md:w-1/4">
                  <div className="w-12 h-12 rounded-full border border-gray-100 overflow-hidden bg-white p-1">
                    <img src={logoUrl} alt={airlineCode} className="w-full h-full object-contain" onError={(e) => {e.target.src='https://placehold.co/100x100?text=Flight'}} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{airlineCode} Airlines</p>
                  </div>
                </div>
                <div className="flex-1 w-full flex items-center justify-center gap-6 text-center">
                  <div>
                    <p className="text-2xl font-black text-gray-800">{firstSegment.departure?.iataCode}</p>
                    <p className="text-xs text-gray-400">Depart</p> 
                  </div>
                  <div className="flex flex-col items-center w-full max-w-[120px]">
                    <p className="text-xs text-gray-500 font-medium mb-1">{duration}</p>
                    <div className="w-full h-[2px] bg-gray-200 relative flex items-center justify-center">
                      <div className="w-2 h-2 bg-gray-300 rounded-full absolute left-0" />
                      <Plane className="w-4 h-4 text-blue-500 fill-current rotate-90 absolute" />
                      <div className="w-2 h-2 bg-gray-300 rounded-full absolute right-0" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-gray-800">{lastSegment.arrival?.iataCode}</p>
                    <p className="text-xs text-gray-400">Arrive</p>
                  </div>
                </div>
                <div className="w-full md:w-auto text-right pl-6 md:border-l border-gray-100 flex flex-row md:flex-col justify-between items-center md:items-end">
                  <p className="text-3xl font-black text-blue-600">{currency} {price}</p>
                  <button className="bg-gray-900 hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-gray-200 w-full md:w-auto flex items-center justify-center gap-2">
                    Select <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FlightCard;