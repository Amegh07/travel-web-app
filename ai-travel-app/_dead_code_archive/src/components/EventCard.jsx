import { Calendar, MapPin, ExternalLink } from 'lucide-react';

const EventCard = ({ event }) => {
  const image = event.images.find(img => img.width > 600) || event.images[0];
  const dateObj = new Date(event.dates.start.localDate);
  const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = event.dates.start.localTime ? event.dates.start.localTime.slice(0, 5) : 'TBA';
  const venue = event._embedded?.venues?.[0]?.name || "TBA";
  const city = event._embedded?.venues?.[0]?.city?.name || "";
  const priceRange = event.priceRanges ? event.priceRanges[0] : null;
  const priceTag = priceRange ? `${priceRange.currency} ${priceRange.min}` : 'Get Tickets';

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full border border-gray-100 group">
      <div className="relative h-48 overflow-hidden">
        <img src={image?.url} alt={event.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-gray-800 shadow-sm">
          {event.classifications?.[0]?.segment?.name || 'Event'}
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">{event.name}</h3>
        <div className="space-y-2 mb-4 flex-1">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar size={16} className="mr-2 text-blue-500" />
            <span>{dateStr} • {timeStr}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <MapPin size={16} className="mr-2 text-red-500" />
            <span className="line-clamp-1">{venue}, {city}</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
          <div className="text-gray-900 font-bold text-lg">{priceTag}</div>
          <a href={event.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Book Now <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default EventCard;