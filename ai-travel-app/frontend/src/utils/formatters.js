export const formatDuration = (ptString) => ptString ? ptString.replace("PT", "").toLowerCase() : "";
export const getAirlineLogo = (code) => code ? `https://pics.avs.io/200/200/${code}.png` : '';
export const getAirlineLogoFallback = () => `https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=100&q=60`;

export const getHotelImage = (hotel) => {
    if (hotel.image) return hotel.image;
    const query = encodeURIComponent((hotel.name || 'luxury hotel') + ' hotel');
    return `https://source.unsplash.com/800x500/?${query}`;
};

export const getEventImage = (event) => {
    if (event.image) return event.image;
    const seed = String(event.id || event.title || 'event').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 800;
    return `https://picsum.photos/seed/${seed}/800/500`;
};

export const calculateNights = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    return Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)));
};

export const openDirectionsToAirport = (originName) => {
    if (!originName) return;
    const query = encodeURIComponent(`${originName} Airport`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
};
