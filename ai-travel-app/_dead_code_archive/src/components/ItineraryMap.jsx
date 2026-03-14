import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom colored markers for different activity types
const createIcon = (color) => new L.DivIcon({
    className: 'custom-marker',
    html: `<div style="
    background: ${color};
    width: 28px;
    height: 28px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    position: relative;
    top: -14px;
    left: -14px;
  "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
});

const ICONS = {
    food: createIcon('#f59e0b'),          // Amber
    sightseeing: createIcon('#3b82f6'),   // Blue
    logistics: createIcon('#6b7280'),     // Gray
    nightlife: createIcon('#a855f7'),     // Purple
    shopping: createIcon('#ec4899'),      // Pink
    default: createIcon('#10b981'),       // Emerald
};

const ItineraryMap = ({ itinerary, selectedDay }) => {
    // Extract all activities with valid coordinates
    const markers = useMemo(() => {
        if (!itinerary?.daily_plan) return [];

        const days = selectedDay !== undefined
            ? [itinerary.daily_plan[selectedDay]].filter(Boolean)
            : itinerary.daily_plan;

        return days.flatMap((day, dayIdx) =>
            (day.activities || [])
                .filter(act => act.latitude && act.longitude)
                .map((act, actIdx) => ({
                    id: `${dayIdx}-${actIdx}`,
                    lat: parseFloat(act.latitude),
                    lng: parseFloat(act.longitude),
                    name: act.activity,
                    time: act.time,
                    type: act.type,
                    day: day.day,
                    description: act.description,
                    cost: act.cost_estimate,
                }))
        );
    }, [itinerary, selectedDay]);

    // Route polyline connecting all markers
    const route = useMemo(() => markers.map(m => [m.lat, m.lng]), [markers]);

    // Calculate center of map
    const center = useMemo(() => {
        if (markers.length === 0) return [10.0, 76.3]; // Default: Kerala
        const avgLat = markers.reduce((sum, m) => sum + m.lat, 0) / markers.length;
        const avgLng = markers.reduce((sum, m) => sum + m.lng, 0) / markers.length;
        return [avgLat, avgLng];
    }, [markers]);

    if (markers.length === 0) return null;

    return (
        <div className="bg-white/80 backdrop-blur-md shadow-sm border border-slate-200 rounded-[2.5rem] p-6 overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-emerald-100 border border-emerald-200 rounded-xl shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-emerald-600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900">Trip Map</h2>
                <div className="flex gap-3 ml-auto text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Food</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Sightseeing</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Other</span>
                </div>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-inner" style={{ height: '400px' }}>
                <MapContainer
                    center={center}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    />

                    {/* Route Polyline */}
                    {route.length > 1 && (
                        <Polyline
                            positions={route}
                            pathOptions={{
                                color: '#3b82f6', // bright blue for light mode
                                weight: 3,
                                opacity: 0.8,
                                dashArray: '8, 8',
                            }}
                        />
                    )}

                    {/* Activity Markers */}
                    {markers.map((m) => (
                        <Marker
                            key={m.id}
                            position={[m.lat, m.lng]}
                            icon={ICONS[m.type] || ICONS.default}
                        >
                            <Popup>
                                <div style={{ minWidth: '180px', fontFamily: 'system-ui' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                                        {m.name}
                                    </div>
                                    <div style={{ color: '#666', fontSize: '11px', marginBottom: '4px' }}>
                                        Day {m.day} · {m.time}
                                    </div>
                                    {m.description && (
                                        <div style={{ fontSize: '11px', color: '#888', lineHeight: '1.4' }}>
                                            {m.description.slice(0, 100)}...
                                        </div>
                                    )}
                                    {m.cost > 0 && (
                                        <div style={{ marginTop: '4px', fontWeight: 'bold', color: '#10b981', fontSize: '12px' }}>
                                            Est. ₹{m.cost}
                                        </div>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
};

export default ItineraryMap;
