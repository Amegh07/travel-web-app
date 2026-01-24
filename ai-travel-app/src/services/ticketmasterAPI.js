import axios from 'axios';

const API_KEY = import.meta.env.VITE_TICKETMASTER_API_KEY;
const BASE_URL = 'https://app.ticketmaster.com/discovery/v2/events.json';

export const searchEvents = async (city) => {
  try {
    // Ticketmaster works best with city names, but if we have an IATA code we try it
    const response = await axios.get(BASE_URL, {
      params: {
        apikey: API_KEY,
        city: city, 
        sort: 'date,asc',
        size: 6
      }
    });
    return response.data._embedded ? response.data._embedded.events : [];
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
};