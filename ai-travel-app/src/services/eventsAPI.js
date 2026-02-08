// ai-travel-app/src/services/eventsAPI.js

const API_KEY = import.meta.env.VITE_TICKETMASTER_API_KEY;

export const fetchEvents = async (city, date) => {
  if (!API_KEY) {
    console.warn("Ticketmaster API key missing");
    return [];
  }

  try {
    // Format date for Ticketmaster (YYYY-MM-DD)
    const startDate = date ? `${date}T00:00:00Z` : '';
    
    const params = new URLSearchParams({
      apikey: API_KEY,
      city: city.split('(')[0].trim(),
      startDateTime: startDate,
      sort: 'date,asc',
      size: '6'
    });

    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?  ${params.toString()}`
    );

    if (!response.ok) throw new Error(`Events API error: ${response.status}`);

    const data = await response.json();
    
    if (!data._embedded?.events) return [];

    return data._embedded.events.map(event => ({
      id: event.id,
      name: event.name,
      date: event.dates?.start?.localDate,
      time: event.dates?.start?.localTime,
      venue: event._embedded?.venues?.[0]?.name,
      image: event.images?.[0]?.url,
      url: event.url,
      category: event.classifications?.[0]?.segment?.name
    }));

  } catch (error) {
    console.error("Fetch events error:", error);
    return [];
  }
};