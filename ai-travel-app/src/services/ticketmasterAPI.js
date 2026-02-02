const API_KEY = import.meta.env.VITE_TICKETMASTER_API_KEY;
const BASE_URL = 'https://app.ticketmaster.com/discovery/v2/events.json';

export const searchEvents = async (city) => {
  try {
    if (!API_KEY) {
      console.warn("Ticketmaster API key is missing");
      return [];
    }

    // Ticketmaster works best with city names, but if we have an IATA code we try it
    const params = new URLSearchParams({
      apikey: API_KEY,
      city: city,
      sort: 'date,asc',
      size: 6
    });

    const response = await fetch(`${BASE_URL}?${params.toString()}`);
    const data = await response.json();
    return data._embedded ? data._embedded.events : [];
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
};