const API_BASE = "http://localhost:5000/api";

export const searchCities = async (keyword) => {
  try { return await (await fetch(`${API_BASE}/city-search?keyword=${encodeURIComponent(keyword)}`)).json(); } catch (e) { return []; }
};

export const fetchFlights = async (originName, destName, date) => {
  try { return await (await fetch(`${API_BASE}/flights?origin=${encodeURIComponent(originName)}&destination=${encodeURIComponent(destName)}&date=${date}`)).json(); } catch (e) { return { results: [], type: 'none' }; }
};

export const fetchHotels = async (cityCode) => {
  try { return await (await fetch(`${API_BASE}/hotels?cityCode=${encodeURIComponent(cityCode)}`)).json(); } catch (e) { return []; }
};

export const fetchEvents = async (destination, date) => {
  try { return await (await fetch(`${API_BASE}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ destination, date }) })).json(); } catch (e) { return []; }
};

export const generateItinerary = async (destination, days, budget, interests) => {
  try { return await (await fetch(`${API_BASE}/itinerary`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ destination, days, budget, interests }) })).json(); } catch (e) { return []; }
};

export const chatWithAI = async (message) => {
  try { return await (await fetch(`${API_BASE}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) })).json(); } catch (e) { return { reply: "Offline" }; }
};