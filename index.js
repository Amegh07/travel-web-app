import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Amadeus from 'amadeus';
import fetch from 'node-fetch';

const app = express();
const PORT = 5000;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true }));
app.use(express.json());

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET
});

const HF_MODELS = [
  "Qwen/Qwen2.5-7B-Instruct",
  "stabilityai/StableBeluga2", 
  "tiiuae/falcon-7b-instruct"
];

function cleanAndParseJSON(text) {
  try { return JSON.parse(text); } catch (e) {
    const match = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (match) { try { return JSON.parse(match[0]); } catch (e2) { return null; } }
    return null;
  }
}

async function generateWithHF(prompt) {
  for (const model of HF_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`?? Requesting from ${model}...`);
        const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 1500, temperature: 0.7, return_full_text: false, wait_for_model: true } })
        });
        if (response.status === 503) { await new Promise(r => setTimeout(r, 5000)); continue; }
        if (!response.ok) throw new Error(`HF Status: ${response.status}`);
        const data = await response.json();
        let text = Array.isArray(data) && data[0]?.generated_text ? data[0].generated_text : data?.generated_text;
        if (!text) continue;
        const cleanJson = cleanAndParseJSON(text);
        if (cleanJson) return cleanJson;
      } catch (e) { console.warn(`? ${model} failed:`, e.message); break; }
    }
  }
  return null;
}

const imageCache = new Map();
async function getHotelImage(hotelName) {
  if (imageCache.has(hotelName)) return imageCache.get(hotelName);
  try {
    const res = await fetch(`https://api.unsplash.com/search/photos?page=1&per_page=1&query=${encodeURIComponent(hotelName + " hotel interior")}&client_id=${process.env.UNSPLASH_ACCESS_KEY}`);
    const data = await res.json();
    if (data.results?.[0]) { imageCache.set(hotelName, data.results[0].urls.regular); return data.results[0].urls.regular; }
  } catch (e) {}
  return "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80";
}

app.get('/api/city-search', async (req, res) => {
  try { const r = await amadeus.referenceData.locations.get({ keyword: req.query.keyword, subType: Amadeus.location.city }); res.json(r.data); } catch (e) { res.json([]); }
});

app.get('/api/flights', async (req, res) => {
  try {
    const { origin, destination, date, returnDate } = req.query;
    const p = { originLocationCode: origin, destinationLocationCode: destination, departureDate: date, adults: '1', max: '5' };
    if (returnDate) p.returnDate = returnDate;
    const r = await amadeus.shopping.flightOffersSearch.get(p);
    res.json(r.data);
  } catch (e) { res.json([]); }
});

app.get('/api/hotels', async (req, res) => {
  try {
    const r = await amadeus.referenceData.locations.hotels.byCity.get({ cityCode: req.query.cityCode, radius: 10, radiusUnit: 'KM' });
    const h = await Promise.all(r.data.slice(0, 6).map(async (x) => ({ ...x, media: [{ uri: await getHotelImage(x.name) }] })));
    res.json(h);
  } catch (e) { res.json([]); }
});

app.post('/api/itinerary', async (req, res) => {
  const { destination, duration, budget, interests } = req.body;
  const prompt = `Role: Expert Guide. Task: Create ${duration}-day itinerary for ${destination}. Budget: ${budget}. Interests: ${interests}. Return JSON array only: [{"day": 1, "theme": "x", "activities": ["09:00 AM - x"]}]`;
  const data = await generateWithHF(prompt);
  res.json(data || [{ day: 1, theme: "Explore", activities: ["09:00 AM - City Tour", "01:00 PM - Local Lunch"] }]);
});

app.post('/api/packing', async (req, res) => {
  const data = await generateWithHF(`Packing list for ${req.body.days} days in ${req.body.destination}. Return JSON: {"Clothes": ["x"], "Tech": ["x"]}`);
  res.json(data || {});
});

app.listen(PORT, () => console.log(`?? Backend running on http://localhost:${PORT}`));
