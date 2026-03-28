import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { runAgent, runAgentStream, AgentRole, keyManager } from './smartRouter.js';
import { saveTripData } from './tripStore.js';

// Load secrets
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const TICKETMASTER_KEY = process.env.TICKETMASTER_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

if (!TICKETMASTER_KEY) {
    console.warn("⚠️ WARNING: TICKETMASTER_KEY is missing. Real event processing is disabled.");
}

// --- MIDDLEWARE ---
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '500kb' }));

// 📝 DEBUGGER
app.use((req, res, next) => {
    console.log(`\n📥 [${req.method}] ${req.url}`);
    next();
});

// --- 🛠️ HELPER: SAFE JSON PARSE ---
function extractJSON(raw) {
    if (!raw) return null;
    const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    // Fix #2: Use a non-greedy scan so we match the FIRST complete JSON object,
    // not the last closing brace (greedy [\s\S]* would overshoot when AI adds trailing text)
    const match = cleaned.match(/[\{\[][\s\S]*?[\}\]](?=[^\{\[\]\}]*$)/s)
               || cleaned.match(/[\{\[][\s\S]*[\}\]]/);
    if (!match) throw new Error("No JSON block found.");
    try {
        return JSON.parse(match[0]);
    } catch {
        // Last resort: find the balanced JSON block manually
        let start = -1, depth = 0;
        for (let i = 0; i < cleaned.length; i++) {
            if (cleaned[i] === '{' || cleaned[i] === '[') { if (depth === 0) start = i; depth++; }
            else if (cleaned[i] === '}' || cleaned[i] === ']') {
                depth--;
                if (depth === 0 && start !== -1) {
                    try { return JSON.parse(cleaned.slice(start, i + 1)); } catch { start = -1; }
                }
            }
        }
        throw new Error("Invalid JSON structure in AI response.");
    }
}

// ==================================================
// 🪄 MAGIC SEARCH: ZERO-SHOT NLP EXTRACTION
// ==================================================
app.post('/api/extract-intent', async (req, res) => {
    try {
        const { query, userLocation } = req.body;
        console.log(`🪄 Magic Search Triggered: "${query}"`);

        const today = new Date();
        const defaultDate = new Date(today);
        defaultDate.setDate(defaultDate.getDate() + 30);
        const defaultDateStr = defaultDate.toISOString().split('T')[0];

        const systemPrompt = `You are a world-class Natural Language Processing engine for a travel app called Travex.
Your job is to extract travel entities from the user's raw input and output a STRICT JSON object.

RULES & SMART DEFAULTS:
1. "destination": The primary city/place they want to visit. REQUIRED — extract from context.
2. "origin": Where they are flying from. If not mentioned, default to "${userLocation || 'Kochi, India'}".
3. "dates": The start date in YYYY-MM-DD format. If not mentioned, default to "${defaultDateStr}" (30 days from now).
4. "duration": Number of days. If not mentioned, use geographic logic:
   - Same country as origin → 3 days
   - Same continent but different country → 5 days
   - Different continent → 7 days
5. "budget": Total budget as a number. If not mentioned, default to 15000 for INR destinations, 500 for USD destinations.
6. "currency": "INR", "USD", or "EUR". Infer from origin/destination. Default "INR" if origin is India.
7. "vibe": Extract mood keywords like "party", "culture", "relaxing", "adventure", "food". If not clear, default to "Popular Highlights".
8. "interests": Array of interest tags from: ["Culture", "Food", "Nature", "Adventure", "Nightlife", "Shopping"]. Infer from context.

OUTPUT FORMAT (strict JSON, nothing else):
{
    "destination": "String (city name only)",
    "origin": "String (city name only)",
    "dates": "YYYY-MM-DD",
    "duration": Number,
    "budget": Number,
    "currency": "INR|USD|EUR",
    "vibe": "String",
    "interests": ["Array of strings"],
    "missing_entities_guessed": ["List of fields you had to guess/default"]
}`;

        const result = await runAgent(
            AgentRole.EXTRACTION,
            systemPrompt,
            `User Input: "${query}"`
        );

        const extractedData = extractJSON(result);
        console.log("✅ Extracted Entities:", extractedData);
        res.json(extractedData);

    } catch (error) {
        console.error("🪄 Extraction Error:", error);
        // Failsafe: return sensible defaults so the app never crashes
        const fallbackDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        res.json({
            destination: req.body.query || "Paris",
            origin: req.body.userLocation || "Kochi",
            dates: fallbackDate,
            duration: 3,
            budget: 15000,
            currency: "INR",
            vibe: "Popular Highlights",
            interests: ["Culture", "Food"],
            missing_entities_guessed: ["all"]
        });
    }
});

// --- 🛠️ HELPER: RESOLVE CITY DATA (IATA + GEOCODE) ---
async function resolveCityData(keyword) {
    if (!keyword) return { iata: "LON", geo: { latitude: 51.5074, longitude: -0.1278 } }; // Fallback to London
    try {
        console.log(`   🔎 Resolving City Data for: "${keyword}"...`);
        const client = keyManager.getAmadeusClient("FLIGHTS");
        const response = await client.referenceData.locations.get({
            keyword,
            subType: 'CITY,AIRPORT'
        });

        const data = response.data?.[0];
        return {
            iata: data?.iataCode || keyword.substring(0, 3).toUpperCase(),
            geo: data?.geoCode || null // Grabs the Latitude/Longitude!
        };
    } catch {
        return { iata: keyword.substring(0, 3).toUpperCase(), geo: null };
    }
}

// --- 🛠️ HELPER: BUILD HOTEL LIST (shared by /api/hotels and /api/search-all) ---
function buildHotelResults(topHotels, offersMap, nights, currency, budget, unsplashImages = []) {
    const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
    const totalBudget    = parseFloat(budget || 5000);
    const dailyBudget    = totalBudget / nights;

    let estimatedPrice;
    if      (currency === 'USD') estimatedPrice = dailyBudget >= 800 ? 350 : dailyBudget >= 300 ? 180 : 90;
    else if (currency === 'EUR') estimatedPrice = dailyBudget >= 800 ? 300 : dailyBudget >= 300 ? 150 : 80;
    else                         estimatedPrice = dailyBudget >= 60000 ? 15000 : dailyBudget >= 20000 ? 6000 : dailyBudget >= 8000 ? 3000 : 1500;

    const randomizePrice = (base, id) => {
        const safeId = String(id || 'FB_HTL_' + Math.random());
        const hash = Array.from(safeId).reduce((a, c) => a + c.charCodeAt(0), 0);
        return Math.floor(base * (1 + ((hash % 40) - 20) / 100));
    };

    return topHotels.slice(0, 6).map((h, i) => {
        const realTotal   = offersMap[h.hotelId];
        let   pricePerNight = realTotal ? (realTotal / nights) : randomizePrice(estimatedPrice, h.hotelId);
        if (currency === 'INR' && pricePerNight < 1000) pricePerNight = randomizePrice(1000, h.hotelId + '_floor');
        if (currency === 'USD' && pricePerNight < 50)   pricePerNight = randomizePrice(50,   h.hotelId + '_floor');
        if (currency === 'EUR' && pricePerNight < 50)   pricePerNight = randomizePrice(50,   h.hotelId + '_floor');
        // Fix #4: replaced Math.random() with the deterministic randomizePrice helper
        // so hotel prices are stable across page reloads and don't break CheckoutBar totals
        
        let imageUrl = `https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80`;
        if (unsplashImages && unsplashImages.length > 0) {
            imageUrl = unsplashImages[i % unsplashImages.length];
        }

        return {
            id:          h.hotelId,
            name:        h.name,
            image:       imageUrl,
            rating:      h.rating || '4.0',
            price:       `${currencySymbol}${Math.floor(pricePerNight)}/night`,
            isRealPrice: !!realTotal,
            distance:    `${h.distance?.value?.toFixed(1) || '1'} ${h.distance?.unit || 'KM'} from center`
        };
    });
}

// --- 🛠️ HELPER: UNSPLASH FETCH ---
async function fetchUnsplashImages(query, count = 1) {
    if (!UNSPLASH_ACCESS_KEY) return [];
    try {
        const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&count=${count}&client_id=${UNSPLASH_ACCESS_KEY}`;
        const res = await fetch(url);
        if (!res.ok) {
            console.log(`   ⚠️ Unsplash error for "${query}": ${res.status} ${res.statusText}`);
            return [];
        }
        const data = await res.json();
        return Array.isArray(data) ? data.map(img => img.urls.regular) : [data.urls.regular];
    } catch (e) {
        console.error("   ❌ Unsplash fetch failed:", e.message);
        return [];
    }
}

// --- 🛠️ HELPER: TICKETMASTER FETCH ---
async function fetchTicketmasterEvents(city, _date) {
    if (!TICKETMASTER_KEY) return null;
    try {
        console.log(`   🎫 Checking Ticketmaster for ${city}...`);

        const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${TICKETMASTER_KEY}&city=${encodeURIComponent(city)}&sort=date,asc&size=5`;

        const response = await fetch(url);
        const data = await response.json();

        if (!data._embedded || !data._embedded.events) {
            console.log("   ⚠️ No Ticketmaster events found. Switching to AI.");
            return null;
        }

        console.log(`   ✅ Found ${data._embedded.events.length} real events!`);

        return data._embedded.events.map(ev => ({
            id: ev.id,
            title: ev.name,
            category: ev.classifications?.[0]?.segment?.name || "Entertainment",
            description: ev._embedded?.venues?.[0]?.name || "Venue TBD",
            date: ev.dates?.start?.localDate,
            price: ev.priceRanges ? `${ev.priceRanges[0].min} ${ev.priceRanges[0].currency}` : "Check Link",
            image: ev.images?.find(img => img.ratio === "16_9" && img.width > 600)?.url || ev.images?.[0]?.url,
            url: ev.url
        }));

    } catch (error) {
        console.error("   ❌ Ticketmaster Error:", error.message);
        return null;
    }
}

// ==================================================
// 🚨 PRIORITY ROUTE: CITY SEARCH
// ==================================================
app.get('/api/city-search', async (req, res) => {
    const { keyword } = req.query;
    try {
        if (!keyword || keyword.length < 2) return res.json([]);
        const client = keyManager.getAmadeusClient("FLIGHTS");
        const response = await client.referenceData.locations.get({ keyword, subType: 'CITY,AIRPORT' });
        res.json(response.data);
    } catch (error) { 
        console.error("City Search Error:", error.message || error);
        
        // No mock data: If Amadeus is rate limited, aggressively fallback to whatever 
        // string the user explicitly typed so they can still proceed without seeing 
        // synthetic options or experiencing a crash.
        const cleanKeyword = keyword.charAt(0).toUpperCase() + keyword.slice(1);
        const pseudoIata = keyword.substring(0, 3).toUpperCase();
        res.json([{ 
            name: cleanKeyword, 
            iataCode: pseudoIata, 
            address: { countryName: "Global" } 
        }]);
    }
});

// --- ✈️ ROUTE 2: FLIGHT SEARCH (One-Way + Round Trip) ---
app.get('/api/flights', async (req, res) => {
    try {
        const { origin, destination, date, returnDate, tripType, currency, adults } = req.query;
        const numTravelers = Math.max(1, parseInt(adults) || 1);
        console.log(`✈️  Flight Search: ${origin} -> ${destination} | type: ${tripType || 'one-way'} | return: ${returnDate || 'N/A'} | pax: ${numTravelers}`);

        const originData = await resolveCityData(origin);
        const destData   = await resolveCityData(destination);
        const amadeus    = keyManager.getAmadeusClient("FLIGHTS");

        const params = {
            originLocationCode:      originData.iata,
            destinationLocationCode: destData.iata,
            departureDate:           date,
            adults:                  String(numTravelers),
            max:                     '10',
            ...(currency && { currencyCode: currency }),
            // Only add returnDate if it's a round trip AND returnDate exists
            ...(tripType === 'round' && returnDate && { returnDate })
        };

        const response = await amadeus.shopping.flightOffersSearch.get(params);
        res.json({
            type:    tripType === 'round' ? 'round_trip' : 'one_way',
            results: response.data,
            journey: { originHub: originData.iata, destHub: destData.iata }
        });
    } catch (err) {
        console.error('Flight search error:', err.message);
        res.json({ type: 'none', results: [] });
    }
});

// --- 🏨 ROUTE 3: HOTEL SEARCH (TWO-STEP: GEOCODE + REAL PRICING) ---
app.get('/api/hotels', async (req, res) => {
    const targetCity  = req.query.destination || req.query.cityCode;
    const totalBudget = parseFloat(req.query.budget) || 5000;
    const currency    = req.query.currency || 'INR';
    const checkIn     = req.query.checkIn;
    const checkOut    = req.query.checkOut;
    const numTravelers = Math.max(1, parseInt(req.query.adults) || 1);
    const roomCount    = Math.ceil(numTravelers / 2);

    const nights = (checkIn && checkOut)
        ? Math.max(1, Math.ceil(Math.abs(new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)))
        : 1;

    try {
        const cityData = await resolveCityData(targetCity);
        if (!cityData.geo) throw new Error('Could not resolve Geocode for city.');

        const amadeus = keyManager.getAmadeusClient('HOTELS');
        const geoResponse = await amadeus.referenceData.locations.hotels.byGeocode.get({
            latitude: cityData.geo.latitude, longitude: cityData.geo.longitude,
            radius: 10, radiusUnit: 'KM'
        });

        const topHotels = [...geoResponse.data]
            .sort((a, b) => (a.distance?.value || 99) - (b.distance?.value || 99))
            .slice(0, 20);
        const hotelIds = topHotels.map(h => h.hotelId).join(',');

        let offersMap = {};
        if (checkIn && checkOut && hotelIds) {
            try {
                const offersResponse = await amadeus.shopping.hotelOffersSearch.get({
                    hotelIds, checkInDate: checkIn, checkOutDate: checkOut,
                    adults: String(numTravelers), roomQuantity: String(roomCount),
                    currencyCode: currency, bestRateOnly: true
                });
                offersResponse.data.forEach(offer => {
                    const price = offer.offers?.[0]?.price?.total;
                    if (price) offersMap[offer.hotel.hotelId] = parseFloat(price);
                });
            } catch { /* use estimates */ }
        }

        res.json(buildHotelResults(topHotels, offersMap, nights, currency, totalBudget));
    } catch (error) {
        console.error('Hotel API Error:', error.message);
        res.json([]);
    }
});

// --- 🔓 ROUTE 4: AI ARCHITECT (WITH CFO ENGINE + LIVE LIKE A LOCAL) ---
app.post('/api/itinerary', async (req, res) => {
    try {
        const { destination, dates, hotel, budget, interests, vibeLevel, tripPurpose, flight, pax, groupType = 'friends', dietaryRestriction = 'none' } = req.body;
        const numTravelers = Math.max(1, parseInt(pax) || 1);
        const start = new Date(dates?.arrival);
        const end = new Date(dates?.departure);
        if (isNaN(start) || isNaN(end)) {
            return res.status(400).json({ error: 'Invalid dates provided in request' });
        }
        const daysCount = Math.max(1, Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1);

        // ✈️ Extract Flight Times for better scheduling
        let flightArrivalStr = "flexible/unknown time";
        let flightDepartureStr = "flexible/unknown time";
        let flightDurationHours = 0;
        if (flight?.itineraries?.length > 0) {
            // Outbound arrival (last segment of first itinerary)
            const outBound = flight.itineraries[0].segments;
            const arrivalTime = outBound?.[outBound.length - 1]?.arrival?.at;
            const outboundDepTime = outBound?.[0]?.departure?.at;
            if (arrivalTime) flightArrivalStr = new Date(arrivalTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            
            if (arrivalTime && outboundDepTime) {
                flightDurationHours = (new Date(arrivalTime) - new Date(outboundDepTime)) / (1000 * 60 * 60);
            }

            // Inbound departure (first segment of second itinerary, if roundtrip)
            if (flight.itineraries.length > 1) {
                const inBound = flight.itineraries[1].segments;
                const departureTime = inBound?.[0]?.departure?.at;
                if (departureTime) flightDepartureStr = new Date(departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            }
        }

        // 💰 1. CFO ENGINE EXTRACTION (Defaulting to INR)
        const dailyAllowance = budget?.dailyAllowance || 0;
        const totalRemaining = budget?.remaining || 2000;
        const currency = budget?.currency || "INR";

        // 🌿 1.5. LIVE LIKE A LOCAL ENGINE
        const localLevel = vibeLevel || 1; // 1=First-Timer, 2=Explorer, 3=Strictly Local

        // 🚨 2. SURVIVAL MODE LOGIC
        const survivalThreshold = currency === 'INR' ? 1500 : currency === 'EUR' ? 18 : 20;
        const isSurvivalMode = dailyAllowance < survivalThreshold;

        // 🗺️ MAP UI SAFEGUARDS
        const destName = typeof destination === 'object' ? destination.name : destination;
        const arrivalDate = dates?.arrival || new Date().toISOString().split('T')[0];
        const departureDate = dates?.departure || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
        const availableToSpend = totalRemaining;

        console.log(`   📅 Planning ${daysCount} Days for ${destName}`);
        console.log(`   💰 CFO Config: ${currency} ${dailyAllowance}/day | Survival Mode: ${isSurvivalMode}`);
        console.log(`   🌿 Localness Level: ${localLevel} (${localLevel === 1 ? 'First-Timer' : localLevel === 2 ? 'Explorer' : 'Strictly Local'})`);

        // 🧠 3. SYSTEM PROMPT ARCHITECTURE
        const currentDate = new Date().toISOString().split('T')[0];
        let systemPrompt = `You are **Travex's Elite Travel Architect** — a world-class luxury travel planner and a rigorously logical routing engine.
        Your sole output must be a valid JSON object conforming exactly to the schema below.

      ═══════════════════════════════════════════════════════════════════════════
      🧭 TRIP CONTEXT
      ═══════════════════════════════════════════════════════════════════════════
      - Destination: ${destName}
      - Duration: ${daysCount} days (From ${arrivalDate} to ${departureDate})
      - Remaining Budget: ${currency} ${availableToSpend} (Target: ${currency} ${dailyAllowance}/day)
      - User Interests: ${interests?.join(', ') || 'Popular Highlights'}
      - Trip Purpose: ${tripPurpose?.toUpperCase() || 'HOLIDAY'}
      - Selected Hotel (Basecamp): ${hotel?.name ? `${hotel.name}` : 'Unknown (Choose centrally)'}
      - Hotel Coordinates: ${hotel?.location?.geo ? `${hotel.location.geo.lat}, ${hotel.location.geo.lng}` : 'N/A'}
      - Day 1 Landing Time: ${flightArrivalStr}
      - Final Day Departure Time: ${flightDepartureStr}

      ═══════════════════════════════════════════════════════════════════════════
      🔒 HARD CONSTRAINTS (VIOLATION = INVALID TRIP)
      ═══════════════════════════════════════════════════════════════════════════
      1. **CRITICAL TOKEN CONSTRAINTS (MINIMALISM)** – Output string length must be surgically minimized: 
         - 'description': Strictly MAX 12 words.
         - 'reason_for_choice': Strictly MAX 10 words. 
         - 'dressCodeDetails' (if any): Use only 1-2 words (e.g., 'Casual', 'Formal').
         - Formatting: Do not use extra whitespace in the JSON. Return a compact block.
      2. **Spatial Clustering** – Each day’s activities must reside in a single neighborhood or compact zone. Do not bounce the user across the map in a single day.
      3. **Pacing & Elegance** – Include 4-5 activities per day. You MUST explicitly schedule Breakfast (08:00-09:30), Lunch, and Dinner. Do not exceed 6 activities to conserve tokens. Fill the day efficiently.
      4. **Explicit Interest Matching (CRITICAL)** – You MUST incorporate the user's explicit interests (${interests?.join(', ') || 'Popular Highlights'}) directly into your choices. This is a HARD constraint.
      5. **Premium Description** – Every 'description' must be vivid and sensory-rich, but strictly obey the 12-word limit.
      5. **Budget Approximate** – Aim for the sum of all 'cost_estimate' fields to be near ${currency} ${availableToSpend}. Do not worry about exact math. Be realistic with pricing.
      6. **Time-of-Day Intelligence (CRITICAL — THINK BEFORE YOU SCHEDULE)** – You MUST apply real-world common sense to EVERY activity's time slot. Violating this makes the itinerary useless.
         MANDATORY TIME RULES (non-negotiable):
         - **Museums, Art Galleries, Biennales, Heritage Sites, Temples, Monuments** → ONLY schedule between 08:00–18:00. They are CLOSED at night. NEVER put these after 19:00.
         - **Sunrise & Early Morning Views (golden hour, misty valleys, hilltop treks)** → ONLY schedule between 05:30–07:30. Pointless any other time.
         - **Sunset Viewpoints, Waterfront Sundowners, Rooftop Bars with views** → ONLY schedule between 17:30–19:30, within 60 minutes of local sunset. Scheduling a "sunset view" at 10am is INVALID.
         - **Beaches** → Best from 07:00–11:00 (cool, uncrowded) or 16:00–18:30 (golden light). NEVER schedule beaches at midday (11:00–15:00) in tropical/hot destinations — it is physically unpleasant.
         - **Local Markets & Street Food Bazaars** → Morning markets: 06:00–11:00. Evening markets/night bazaars: 18:00–22:00. Daytime (12:00–16:00) markets are almost always closed or dead.
         - **Fine Dining & Sit-Down Restaurants** → Lunch: 12:00–14:30. Dinner: 19:00–22:00. NEVER schedule a "dinner" at 15:00 or a "lunch" at 21:00.
         - **Bars, Pubs, Nightclubs, Live Music Venues** → ONLY schedule between 20:00–23:59. These are night-only venues.
         - **Cafes & Breakfast spots** → ONLY schedule between 07:00–10:30.
         - **Adventure Activities (kayaking, trekking, cycling tours)** → Schedule in the cool part of the day: 07:00–11:00 or 15:30–18:00. NEVER at noon in summer/tropical climates.
         - **Shopping Districts & Malls** → Open from 10:00–21:00. Do not schedule before 10:00.
         - **Religious Sites & Places of Worship** → Respect prayer times. Avoid Friday afternoon for mosques. Early morning (06:00–09:00) visits to temples/churches are often the most authentic.
         LOGIC TEST: Before placing any activity, ask yourself — "Is this place realistically open and enjoyable at this exact time?" If the answer is no, move it to the correct time window.
      6. **Output Format** – Your final output MUST end with valid JSON. Inject tasteful emojis into themes and activities.
      7. **Localness Metric** – Assign a "localness_signal" from 0.0 (pure tourist trap) to 1.0 (deeply local hidden gem).
      8. **Transit Instructions** – Provide highly specific, realistic transit instructions (e.g., "Take a 10-minute Uber", "Walk 15 minutes east down the tree-lined promenade").
      10. **Emojis** – Use ACTUAL emoji characters (like 🍷 or 🏛️). DO NOT use unicode escape sequences.
      11. **Real Establishments Only** – NEVER use generic names like "Local Restaurant" or "Local Cafe". You MUST provide the exact, real-world name of a specific establishment that exists on Google Maps (e.g., "Pujol", "Cafe de Flore").
      12. **Mandatory Basecamp** – The user's basecamp is ${hotel?.name || 'the selected hotel'}. Day 1 MUST include an explicit arrival at this hotel. The geographic clustering of every day MUST revolve logically around this specific hotel's location. All daily itineraries must logically terminate near this location.
      13. **Flight Schedule Alignment** – Day 1 activities MUST begin AFTER the ${flightArrivalStr} arrival (factor in transit to hotel). The Final Day activities MUST conclude well BEFORE the ${flightDepartureStr} departure flight to allow for airport transit.
      14. **Transit Buffers (NON-NEGOTIABLE)** — After EVERY activity, you MUST insert a minimum 30-minute gap before the next activity starts. If Activity A ends at 14:00, Activity B cannot start before 14:30. No exceptions. If the activity has a transit_instruction, the gap must be at least as long as the transit time mentioned.
      15. **Luggage & Early Check-In Logic** — Standard hotel check-in is 14:00. If the flight arrival time (${flightArrivalStr}) is before 14:00, the VERY FIRST activity on Day 1 MUST be: "Drop luggage at ${hotel?.name || 'hotel'} concierge" (and DO NOT schedule a second "Check-in" activity later that day). If arriving after 14:00, the first activity should simply be "Check-in at ${hotel?.name || 'hotel'}".
      16. **Geographic Clustering (STRICT)** — Cluster daily activities geographically (within a ~3 to 5 km radius) of ${destName}. State the general district in the day theme. Cross-city travel is only permitted once per day for a major transition, such as returning to the hotel or a specific dinner reservation.
      17. **Transit-Aware Scheduling (NON-NEGOTIABLE)** — Every activity MUST include a "transitToNext" object that calculates how the traveler physically moves to the NEXT activity. Specify the transport method (e.g., "Walk", "Subway", "Taxi") and the realistic travel time in minutes. For the last activity of each day, use method: "Return to hotel" and estimate the time back.
          CHRONOLOGICAL SYNC: The 'time' of any activity MUST equal the 'time' of the previous activity PLUS its logical duration PLUS the 'transitToNext.estimatedMinutes'.
      18. **DYNAMIC PACING & FATIGUE** — You must pace the itinerary to prevent traveler burnout. 
          1. Define 'High-Energy' activities as steep hikes, long museum tours (>2 hours), or intense physical sports. Cap these at 2 per FULL day. 
          2. For every FULL travel day (excluding arrival/departure days where time is limited), you must schedule a 'Rest/Cafe Block' in the mid-afternoon. 
          3. Scale this rest block based on the group: 30-45 minutes for Solo/Couples, and 60-90 minutes for Families/Seniors.
      18. **Native Transit Only (LAST MILE RULE)** — CRITICAL TRANSIT RULE: Suggest the most practical, budget-appropriate native transit. Do not suggest expensive tourist-novelty transit (like horse carriages) for logistical point-A-to-point-B travel.

      REQUIRED JSON SCHEMA: {"trip_name":"Catchy trip title","daily_plan":[{"day":1,"date":"YYYY-MM-DD","theme":"🎨 Day theme","activities":[{"time":"HH:MM","activity":"Real place name 🗺️","type":"food|sightseeing|logistics","cost_estimate":0,"description":"Two vivid sentences describing the experience.","reason_for_choice":"Why this place is unmissable.","transit_instruction":"Specific transit instruction.","transitToNext":{"method":"Walk / Subway / Taxi","estimatedMinutes":15},"dressCodeRequired":true,"dressCodeDetails":"e.g., Shoulders covered, or null if none","localness_signal":0.5}]}]}
      Follow this schema exactly for ALL ${daysCount} days. Output RAW JSON ONLY — no Markdown, no code blocks. Start exactly with { and end exactly with }.`;

        // 👥 4a. INJECT GROUP / PAX CONTEXT
        if (numTravelers > 1) {
            systemPrompt += `\n\nCRITICAL LOGISTICS — GROUP TRAVEL:
        - This trip is for a GROUP of ${numTravelers} travelers.
        - The total provided budget of ${currency} ${totalRemaining} MUST cover ALL ${numTravelers} people combined.
        - When recommending restaurants, always specify a table for ${numTravelers}.
        - When recommending transport, prefer ${numTravelers > 3 ? 'an SUV/minivan' : 'a standard taxi or rideshare'} to fit the whole group.
        - All \`cost_estimate\` fields should reflect the TOTAL group cost (not per-person).
        - Mention group-friendly venues (e.g., large tables, group booking available) where relevant.`;
        }

        // 🧑‍🤝‍🧑 4b. GROUP DYNAMICS ENGINE
        const groupDynamicsMap = {
            solo:    'a SOLO traveler. Emphasize self-guided activities, quiet cafes, independent exploration, and personal safety tips.',
            couple:  'a COUPLE. Emphasize romantic settings, intimate restaurants, scenic walks, and experiences built for two.',
            family:  'a FAMILY with children. Include major landmarks but explicitly suggest accessibility-friendly adaptations (e.g., "Take the elevator to the 2nd floor instead of the stairs") and reduce the daily walking pace by 30%.',
            friends: 'a GROUP OF FRIENDS. Emphasize social experiences — group dining, nightlife options, adventure activities, and experiences that work well for groups of 3 or more.',
            seniors: 'SENIOR TRAVELERS. Include major landmarks but explicitly suggest accessibility-friendly adaptations (e.g., "Take the elevator") and reduce the daily walking pace by 30%.',
        };
        const groupContext = groupDynamicsMap[groupType] || groupDynamicsMap['friends'];
        systemPrompt += `\n\nGROUP DYNAMICS CONSTRAINT (NON-NEGOTIABLE):
        - The current travel party is ${groupContext}
        - Every activity in every day MUST be appropriate and realistic for this group.
        - If the group is a Family or Seniors, explicitly call out any access or mobility considerations in the activity description.`;

        // 🥗 4c. DIETARY RESTRICTION ENGINE
        if (dietaryRestriction && dietaryRestriction !== 'none') {
            const dietaryMap = {
                vegetarian: 'VEGETARIAN — strictly no meat or seafood. Every restaurant suggested must be vegetarian-friendly or have a strong vegetarian menu. Flag it explicitly.',
                vegan: 'VEGAN — strictly no meat, seafood, dairy, eggs, or honey. Every restaurant MUST have explicit vegan options. Note alternatives for typical tourist dishes.',
                halal: 'HALAL — strictly no pork or alcohol. Restaurants must be halal-certified or clearly halal-suitable. Avoid suggesting bars or venues where alcohol is central.',
                'gluten-free': 'GLUTEN-FREE — all food suggestions must be safe for a gluten intolerance/celiac. Call out where naturally gluten-free options exist at each venue.',
                pescatarian: 'PESCATARIAN — no meat (beef, chicken, lamb, pork), but seafood and fish are permitted. Suggest restaurants with strong seafood menus.',
            };
            const dietaryContext = dietaryMap[dietaryRestriction] || `dietary requirement: ${dietaryRestriction}`;
            systemPrompt += `\n\n🥗 DIETARY CONSTRAINT (NON-NEGOTIABLE — APPLIES TO EVERY FOOD ACTIVITY):
        - The traveler is ${dietaryContext}
        - EVERY restaurant and food suggestion MUST comply with this restriction. Non-compliant suggestions are invalid.
        - Always mention the dietary-friendly option available at the venue in the activity description.`;
        }


        systemPrompt += `\n\nCREATIVE ARCHITECT FOCUS:
        - Your goal is to find amazing hidden gems in ${destination}.
        - Constraint: Stay *approximately* near ${currency} ${totalRemaining}.
        - Focus: Detailed descriptions and geographical clustering.
        - Provide realistic \`cost_estimate\` numbers in ${currency} for EVERY activity.
        - Format: Strict JSON only.`;

        // 🥗 4c. DIETARY RESTRICTION ENGINE
        if (dietaryRestriction && dietaryRestriction !== 'none') {
            systemPrompt += `\n\nDIETARY CONSTRAINT (NON-NEGOTIABLE):
        - The user has a ${dietaryRestriction} requirement.
        - Prioritize ${dietaryRestriction} restaurants. If unavailable in the specific geographic cluster, select highly-rated general restaurants that explicitly offer strong ${dietaryRestriction} menus.`;
        }

        // 🛬 4c. JET LAG / LONG-HAUL RECOVERY ENGINE
        const outboundDepTime = flight?.itineraries?.[0]?.segments?.[0]?.departure?.at;
        const isOvernight = outboundDepTime ? (new Date(outboundDepTime).getHours() >= 18) : false;
        
        if (flightDurationHours > 7 && isOvernight) {
            systemPrompt += `\n\nJET LAG DELUSION CONSTRAINT (NON-NEGOTIABLE):
        - The user is arriving after an overnight long-haul flight.
        - Day 1 MUST be designated as a 'Recovery Day'.
        - Keep all Day 1 activities extremely light, close to the hotel, and highly flexible (e.g., leisurely parks, a casual local dinner, no early morning pre-booked tours).`;
        }

        // 🚨 5. INJECT SURVIVAL MODE
        if (isSurvivalMode) {
            systemPrompt += `\n\n🚨 SURVIVAL MODE ACTIVE: The daily budget is critically low.
            - You MUST prioritize FREE activities, public parks, walking tours, and cheap local street food.
            - Avoid all expensive restaurants, paid museums, or premium tours.
            - Keep the daily cost as close to ${currency} ${dailyAllowance} as humanly possible.`;
        }

        // 🌿 5.5. INJECT "LIVE LIKE A LOCAL" CONSTRAINTS
        if (localLevel === 2) {
            systemPrompt += `\n\n🌿 EXPLORER MODE (Live Like a Local — Level 2):
            - Include a MIX of 1-2 famous landmarks AND mostly neighborhood hidden gems.
            - Prefer local restaurants over tourist-oriented ones. Suggest places where locals actually eat.
            - For each activity, explain in "reason_for_choice" why a local would recommend it.
            - Aim for localness_signal values averaging 0.5-0.7 across the trip.
            - Include at least one "local secret" per day that tourists rarely find.`;
        } else if (localLevel === 3) {
            systemPrompt += `\n\n🌿🌿🌿 STRICTLY LOCAL MODE (Live Like a Local — Level 3 — MAXIMUM):
            - DO NOT suggest ANY attraction that would appear in the "Top 15 things to do" on TripAdvisor for ${destination}.
            - ZERO major landmarks. ZERO tourist buses. ZERO chain restaurants.
            - ONLY suggest places with minimal tourist foot traffic, heavily frequented by residents.
            - Prefer: neighborhood markets, community-run bars, underground art galleries, street food stalls, small live music venues, artisan workshops, local parks and residential viewpoints.
            - Prefer places with local-language signage or menus that are outside the main tourist cluster.
            - Keep budget per-day 20-40% lower than standard: prioritize cheap local meals and public transport / walking.
            - ALL localness_signal values MUST be above 0.7.
            - For each activity, write the "reason_for_choice" as if a local friend is explaining why they love this place (e.g., "Why locals go here: It's the only bakery in the 11th arrondissement that still uses a traditional wood-fired oven").
            - If you MUST include something remotely famous, mark it with "is_exception": true and minimize time spent there.`;
        }

        // 💼 5.7. INJECT "BUSINESS TRIP" CONSTRAINTS
        if (tripPurpose === 'business') {
            systemPrompt += `\n\n💼 BUSINESS TRIP (Strict Rules):
            - The user is traveling for BUSINESS, not leisure. Priority is extreme efficiency, high-end professional environments, and minimal exhaustion.
            - Do NOT suggest all-day sightseeing, exhaustive theme parks, or heavy tourist clusters during the day (9 AM - 5 PM).
            - Assume the user has meetings during the day. Therefore, "activities" should be focused on:
              * High-end/quiet "Power Breakfast" or "Power Lunch" venues near business districts.
              * Sleek, impressive places for client dinners in the evening.
              * Brief, highly curated "unwind" activities in the evening (e.g., a high-end jazz bar, an exclusive evening view, a luxury spa).
            - Keep transit instructions focused on fast, reliable transport (e.g., "Take an Uber Black", "10-minute walk from the financial district").
            - The "Reason for choice" must reflect a professional angle (e.g., "Perfect ambiance for a quiet client meeting", "An elegant way to unwind after a conference").`;
        }

        const userContent = `Plan a ${daysCount}-day ${tripPurpose || 'holiday'} trip to ${destination}. Stay: ${hotel?.name || 'Local Hotel'}. Arrival: ${dates?.arrival}. Interests: ${interests?.join(', ')}.${localLevel >= 2 ? ' The user wants to LIVE LIKE A LOCAL — avoid tourist traps!' : ''}`;


        // 🔥 ENABLE PROGRESSIVE STREAMING (SSE)
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders(); 

        const controller = new AbortController();
        res.on('close', () => {
            if (isStreamingNow) {
                console.log("   ⚠️ Client disconnected mid-stream. Aborting LLM.");
                controller.abort();
            }
        });
        let isStreamingNow = false;

        console.log(`   🌊 Streaming Architect's plan to client...`);

        // --- ZOD SCHEMA FOR VALIDATION ---
        const { z } = await import('zod');
        const ActivitySchema = z.object({
            time: z.string(),
            activity: z.string(),
            type: z.string(), // food, sightseeing, logistics
            cost_estimate: z.number(),
            description: z.string(),
            reason_for_choice: z.string(),
            transit_instruction: z.string().optional().nullable(),
            transitToNext: z.object({
                method: z.string(),
                estimatedMinutes: z.number()
            }).optional().nullable(),
            dressCodeRequired: z.boolean().optional().nullable(),
            dressCodeDetails: z.string().optional().nullable(),
            localness_signal: z.number().optional().nullable()
        });
        const DaySchema = z.object({
            day: z.number(),
            date: z.string(),
            theme: z.string(),
            activities: z.array(ActivitySchema)
        });
        const ItinerarySchema = z.object({
            trip_name: z.string(),
            daily_plan: z.array(DaySchema)
        });

        const MAX_RETRIES = 2;
        let attempt = 0;
        let isComplete = false;
        let currentSystemPrompt = systemPrompt;

        while (attempt < MAX_RETRIES && !isComplete && !controller.signal.aborted) {
            attempt++;
            try {
                if (attempt === 1) {
                    res.write(`data: ${JSON.stringify({ status: "Waking up Travel Architect..." })}\n\n`);
                } else {
                    res.write(`data: ${JSON.stringify({ status: "Validating & rebuilding itinerary..." })}\n\n`);
                    res.write(`data: ${JSON.stringify({ retry: true })}\n\n`);
                }
                
                isStreamingNow = true;
                const stream = runAgentStream(AgentRole.ARCHITECT, currentSystemPrompt, userContent, controller.signal);

                let isFirstChunk = true;
                let fullResponseBuffer = "";

                for await (const chunk of stream) {
                    if (isFirstChunk) {
                        isFirstChunk = false;
                        res.write(`data: ${JSON.stringify({ status: `Generating Itinerary...${attempt > 1 ? ' (Retry)' : ''}` })}\n\n`);
                    }
                    fullResponseBuffer += chunk;
                    res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
                }

                isStreamingNow = false;

                // Stop execution if the client forcefully disconnected mid-stream
                if (controller.signal.aborted) {
                    return;
                }

                // --- VALIDATION PHASE ---
                try {
                    // 1. Clean markdown code blocks & Try to parse JSON
                    const parsedJson = extractJSON(fullResponseBuffer);
                    // 2. Validate with Zod
                    ItinerarySchema.parse(parsedJson);
                    
                    // If we reach here, it's valid!
                    isComplete = true;
                    res.write(`data: [DONE]\n\n`);
                    res.end();

                } catch (validationErr) {
                    console.log(`   🚨 Validation failed on attempt ${attempt}:`, validationErr.message);
                    if (attempt >= MAX_RETRIES) {
                        console.log("   ❌ Max retries reached. Returning what we have.");
                        res.write(`data: [DONE]\n\n`);
                        res.end();
                        return; // Exit loop
                    }

                    // Feed the precise error back to the LLM
                    currentSystemPrompt += `\n\n🚨 CRITICAL ERROR IN PREVIOUS ATTEMPT 🚨\nYou hallucinated an invalid format. Fix the following error exactly: ${validationErr.message}\nMake sure your output strictly matches the required JSON Schema with all required brackets and commas closing correctly.`;
                }

            } catch (streamErr) {
                isStreamingNow = false;
                if (streamErr.constructor?.name === 'APIUserAbortError' || streamErr.name === 'AbortError') {
                console.log("   🌊 Stream aborted by client [ARCHITECT].");
                    res.end();
                    return;
                }
                console.error("Stream Generator Error:", streamErr);
                if (attempt >= MAX_RETRIES) {
                    res.write(`data: ${JSON.stringify({ error: "AI temporarily unavailable" })}\n\n`);
                    res.write(`data: [DONE]\n\n`);
                    res.end();
                } else {
                    currentSystemPrompt += `\n\n🚨 CRITICAL ERROR 🚨\nYour output broke mid-stream. Please ensure your JSON is shorter, strictly formatted, and fully complete.`;
                }
            }
        }

    } catch (error) {
        console.error("Architect Setup Error:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "AI Busy" });
        } else {
            res.write(`data: ${JSON.stringify({ error: "Server crashing" })}\n\n`);
            res.end();
        }
    }
});

// --- 🎫 ROUTE 7: EVENTS (HYBRID: Ticketmaster -> AI) ---
app.post('/api/events', async (req, res) => {
    try {
        const { destination, date } = req.body;

        let finalEvents = [];

        // 1. Try Ticketmaster First
        const realEvents = await fetchTicketmasterEvents(destination, date);
        if (realEvents && Array.isArray(realEvents)) {
            finalEvents.push(...realEvents);
        }

        // 2. Always fetch Local Experiences via AI to supplement
        try {
            console.log("   🤖 Augmenting events with AI Local Experiences...");
            const result = await runAgent(AgentRole.GUIDE,
                `You are a local guide. Return a JSON object in this EXACT format:
{ "events": [{ "id": "evt_UNIQUE_ALPHANUMERIC", "title": "Event Name", "category": "Music", "description": "Description", "price": "Free", "date": "2026-04-01" }] }.
CRITICAL: Each event MUST have a completely unique 'id' string (e.g. evt_a1b2, evt_c3d4, evt_e5f6). NEVER repeat the same id. Return ONLY valid JSON.`,
                `Find 3 generic cultural activities in ${destination} for ${date}.`
            );
            const parsed = extractJSON(result);
            let aiEvents = Array.isArray(parsed) ? parsed : (parsed?.events || parsed?.activities || []);
            aiEvents = aiEvents.map((e, i) => ({ ...e, id: (e.id && String(e.id).length > 3) ? String(e.id) : `ai_evt_${Date.now()}_${i}` }));
            finalEvents.push(...aiEvents);
        } catch (e) {
            console.error("   ❌ AI Event generation failed:", e.message);
        }

        return res.json(finalEvents.slice(0, 6));

    } catch (error) { 
        console.error("Events Error:", error);
        res.status(500).json({ error: "Failed to fetch events" }); 
    }
});

// ==================================================
// 📦 ROUTE: SEARCH ALL (Batch: Flights + Hotels + Events)
// ==================================================
app.post('/api/search-all', async (req, res) => {
    try {
        const { searchData } = req.body;
        const {
            fromCity,
            toCity,
            departDate,
            returnDate,
            tripType  = 'round',
            budget,
            currency  = 'INR',
            interests = [],
            vibeLevel = 1,
            pax       = 1,
            duration
        } = searchData || {};
        const numTravelers = Math.max(1, parseInt(pax) || 1);
        const roomCount = Math.ceil(numTravelers / 2);

        const originName = typeof fromCity === 'object' ? (fromCity.name || fromCity.code) : fromCity;
        const destName   = typeof toCity   === 'object' ? (toCity.name   || toCity.code)   : toCity;
        const originCode = typeof fromCity === 'object' ? (fromCity.code || fromCity.name)  : fromCity;
        const destCode   = typeof toCity   === 'object' ? (toCity.code   || toCity.name)    : toCity;

        const checkIn  = departDate;
        // For one-way: use depart date + 3 days just for hotel/itinerary duration purposes
        const checkOut = (tripType === 'round' && returnDate)
            ? returnDate
            : (() => {
                const d = new Date(departDate);
                const nights = parseInt(duration) || 5;
                d.setDate(d.getDate() + nights);
                return d.toISOString().split('T')[0];
            })();

        const isRoundTrip = tripType === 'round' && !!returnDate;

        console.log(`\n📦 /api/search-all | ${tripType} | ${originName} → ${destName} | ${checkIn}${isRoundTrip ? ' → ' + checkOut : ''}`);

        const [flightResult, hotelResult, eventResult, heroImages, hotelImages] = await Promise.allSettled([

            // 1. FLIGHTS — pass returnDate only for round trips
            (async () => {
                const client = keyManager.getAmadeusClient("FLIGHTS");
            // Fix #1: extract string from city object before passing as Amadeus keyword
            const originKeyword = typeof fromCity === 'object' ? (fromCity.code || fromCity.name || '') : (fromCity || '');
            const destKeyword   = typeof toCity   === 'object' ? (toCity.code   || toCity.name   || '') : (toCity   || '');
            const [origin, dest] = await Promise.all([
                client.referenceData.locations.get({ keyword: originKeyword, subType: 'CITY,AIRPORT' }),
                client.referenceData.locations.get({ keyword: destKeyword,   subType: 'CITY,AIRPORT' })
            ]);
                const originLocCode = origin.data[0]?.iataCode || 'JFK';
                const destLocCode = dest.data[0]?.iataCode || 'LHR';

                const response = await client.shopping.flightOffersSearch.get({
                    originLocationCode: originLocCode,
                    destinationLocationCode: destLocCode,
                    departureDate: checkIn,
                    returnDate: isRoundTrip ? checkOut : undefined,
                    adults: numTravelers,
                    max: 10,
                    currencyCode: currency
                });

                if (!response.data || response.data.length === 0) {
                    return { type: 'fallback', results: [], journey: { from: originLocCode, to: destLocCode } };
                }
                return { type: 'real', results: response.data, journey: { from: originLocCode, to: destLocCode } };
            })(),

            // 2. HOTELS
            (async () => {
                const client = keyManager.getAmadeusClient("HOTELS");
                const dest = await client.referenceData.locations.get({ keyword: destName, subType: 'CITY,AIRPORT' });
                const destLocCode = dest.data[0]?.iataCode || 'LHR';

                let hotelsByCity = { data: [] };
                try {
                    hotelsByCity = await client.referenceData.locations.hotels.byCity.get({ cityCode: destLocCode });
                } catch (hotelErr) {
                    console.error("   🏨 Amadeus SDK Error:", hotelErr.message || hotelErr);
                }

                if (!hotelsByCity.data || hotelsByCity.data.length === 0) return { topHotels: [], offersMap: {}, nights: 3 };
                const topHotels = hotelsByCity.data.slice(0, 8);

                let offersMap = {};
                if (checkIn && checkOut) {
                    try {
                        const hotelIds = topHotels.map(h => h.hotelId).join(',');
                        const offers = await client.shopping.hotelOffersSearch.get({
                            hotelIds,
                            adults: numTravelers,
                            roomQuantity: roomCount,
                            checkInDate: checkIn,
                            checkOutDate: checkOut,
                            currency: currency,
                        });
                        offers.data?.forEach(offer => {
                            const cheapest = offer.offers?.sort((a, b) => parseFloat(a.price.total) - parseFloat(b.price.total))[0];
                            if (cheapest) offersMap[offer.hotel.hotelId] = parseFloat(cheapest.price.total) * roomCount;
                        });
                    } catch { /* use estimates */ }
                }

                const nights = Math.max(1, Math.ceil(Math.abs(new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));
                return { topHotels, offersMap, nights };
            })(),

            // 3. EVENTS
            (async () => {
                let finalEvents = [];
                
                const realEvents = await fetchTicketmasterEvents(destName, checkIn);
                if (realEvents && Array.isArray(realEvents)) {
                    finalEvents.push(...realEvents);
                }

                try {
                    const result = await runAgent(
                        AgentRole.GUIDE,
                        `You are a local guide. Return a JSON object in this EXACT format:
{ "events": [{ "id": "evt_UNIQUE_ALPHANUMERIC", "title": "Event Name", "category": "Music", "description": "Description", "price": "Free", "date": "2026-04-01" }] }.
CRITICAL: Each event MUST have a completely unique 'id' string (e.g. evt_a1b2, evt_c3d4, evt_e5f6). NEVER repeat the same id. Return ONLY valid JSON.`,
                        `Find 4 interesting cultural activities or events in ${destName} around ${checkIn}. Crucially, align these events with the user's specific interests if provided: ${interests.length > 0 ? interests.join(', ') : 'popular local highlights'}. The user selected a pacing vibe level of ${vibeLevel} / 3.`
                    );
                    const parsed = extractJSON(result);
                    let aiEvents = Array.isArray(parsed) ? parsed : (parsed?.events || parsed?.activities || []);
                    aiEvents = aiEvents.map((e, i) => ({ ...e, id: (e.id && String(e.id).length > 3) ? String(e.id) : `ai_evt_${Date.now()}_${i}` }));
                    finalEvents.push(...aiEvents);
                } catch (e) {
                    console.error("   ❌ AI Event generation failed:", e.message);
                }
                
                return finalEvents.slice(0, 6);
            })(),

            // 4. UNSPLASH HERO IMAGE
            fetchUnsplashImages(`${destName} landmark`, 1),
            
            // 5. UNSPLASH HOTEL IMAGES
            fetchUnsplashImages(`${destName} hotel room luxury`, 8)
        ]);

        const transportData = flightResult.status === 'fulfilled' ? flightResult.value : { type: 'none', results: [] };
        const eventData     = eventResult.status  === 'fulfilled' ? eventResult.value  : [];
        
        let hotelData = [];
        if (hotelResult.status === 'fulfilled') {
            const h = hotelResult.value;
            const hotelImgs = hotelImages.status === 'fulfilled' ? hotelImages.value : [];
            hotelData = buildHotelResults(h.topHotels, h.offersMap, h.nights, currency, budget, hotelImgs);
        }

        const fallbackHero = `https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1600&q=80`;
        const heroImage = (heroImages.status === 'fulfilled' && heroImages.value.length > 0) ? heroImages.value[0] : fallbackHero;

        console.log(`   ✅ Done: ${transportData.results?.length || 0} flights, ${hotelData.length} hotels, ${eventData.length} events`);
        res.json({ transportData, hotelData, eventData, heroImage });

    } catch (error) {
        console.error('❌ /api/search-all Error:', error.message);
        res.json({ transportData: { type: 'none', results: [] }, hotelData: [], eventData: [], heroImage: null });
    }
});



// ==================================================
// 🤖 ROUTE: MODIFY ITINERARY (Chatbot Edit Engine)
// ==================================================
app.post('/api/modify-itinerary', async (req, res) => {
    try {
        const { prompt, currentItinerary, context } = req.body;

        if (!prompt || !currentItinerary) {
            return res.status(400).json({ error: 'Missing prompt or currentItinerary' });
        }

        console.log(`\n🤖 /api/modify-itinerary triggered`);
        console.log(`   📝 User request: "${prompt}"`);

        const systemPrompt = `You are Travex's Elite Itinerary Editor. The user wants to modify their existing travel itinerary.
${context?.currentDay ? `\n📍 CURRENT VIEW: The user is currently looking at Day ${context.currentDay}. Most modifications should likely apply to this day unless stated otherwise.` : ''}

YOUR RULES:
1. Apply ONLY the change the user requested. If they are looking at Day ${context?.currentDay || 'X'}, focus the change there.
2. Preserve all other days and activities exactly as-is.
3. Keep the same JSON structure as the input — do not add or remove fields.
4. Maintain realistic cost estimates in the same currency.
5. Return ONLY the updated itinerary JSON — no preamble, no explanation, no markdown.
6. Keep all emojis, localness_signal values, latitude/longitude, and transit instructions.
7. CRITICAL: Avoid duplicates. Do not suggest an activity that already exists on another day of the trip.

OUTPUT: Return the full updated itinerary JSON starting with { and ending with }.`;

        // Fix #3: Strip verbose fields before sending to avoid token overflow on long trips.
        // (reason_for_choice + localness_signal alone add ~2000 tokens for a 7-day trip)
        const stripped = {
            ...currentItinerary,
            daily_plan: (currentItinerary.daily_plan || []).map(day => ({
                ...day,
                activities: (day.activities || []).map(({ reason_for_choice, localness_signal, dressCodeDetails, ...rest }) => rest)
            }))
        };

        const userContent = `User's edit request: "${prompt}"

Current itinerary to modify:
${JSON.stringify(stripped, null, 0)}`;

        const result = await runAgent(AgentRole.ARCHITECT, systemPrompt, userContent);

        const updatedItinerary = extractJSON(result);

        console.log(`   ✅ Itinerary modified successfully.`);

        res.json({
            updatedItinerary,
            message: `Done! I've applied your change: "${prompt}". Scroll up to see the updated plan.`
        });

    } catch (error) {
        console.error('❌ /api/modify-itinerary Error:', error.message);
        res.status(500).json({
            error: 'Failed to modify itinerary',
            updatedItinerary: null
        });
    }
});
// --- CHAT & OTHERS ---
app.post('/api/intent', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Missing message' });

        const systemPrompt = `You are an intent classifier for a travel app. Analyze the user's message and categorize it into exactly ONE of these buckets: "edit_itinerary", "search_hotel", "search_flight", "search_event", or "general_chat".
        
Return ONLY a JSON object matching this schema:
{
  "intent": "the_bucket",
  "parameters": {
    "maxPrice": null, // Number if they mention a budget
    "wantsCheap": false, // Boolean if they say cheap/affordable
    "wantsDirect": false // Boolean if they want a direct flight
  }
}
Do not add any extra markdown or conversation.`;

        const result = await runAgent(AgentRole.ROUTER, systemPrompt, `User message: "${message}"`);
        const parsed = extractJSON(result);

        // Sanitize the intent strictly to protect the frontend matchers
        const rawIntent = parsed.intent || 'general_chat';
        const cleanIntent = String(rawIntent).trim().toLowerCase().replace(/[^a-z_]/g, '');

        res.json({ 
            intent: cleanIntent,
            parameters: parsed.parameters || {}
        });
    } catch (error) {
        console.error("❌ /api/intent Error:", error.message);
        res.json({ intent: 'general_chat', parameters: {} });
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message, context, history = [] } = req.body;
        const systemPrompt = `You are Travex, an AI Travel Concierge.
You have the ability to render interactive UI components directly into the chat window (Generative UI).
${context?.currentDay ? `\n📍 DAY CONTEXT: The user is currently viewing the details for Day ${context.currentDay}. Please keep this in mind for context. If they ask about "today" or "this day", they mean Day ${context.currentDay}.` : ''}

When the user asks you to find a flight, DO NOT reply with a plain text list of flights. 
Instead, return a JSON payload with a "type" of "flight_component" and the flight details in "data".

Return strictly this JSON format:
{
  "reply": "Here is a great flight I found for you:", // A very short conversational intro
  "type": "flight_component", // Only include this if they asked for a flight! Otherwise, omit it or set to "text"
  "data": { // Only include if type is flight_component
    "airline": "Emirates (Mocked)",
    "price": "450",
    "origin": "JFK",
    "destination": "CDG",
    "departureTime": "18:30",
    "arrivalTime": "07:45",
    "duration": "7h 15m",
    "stops": 0
  }
}

If they ask something else, just return normal JSON: { "reply": "Your helpful text response" }`;

        // Fix #15: use Chat/Guide role instead of Router to prevent token cutoff and improve conversational quality
        const result = await runAgent(AgentRole.GUIDE, systemPrompt, `User: ${message}`, history);
        try {
            res.json(extractJSON(result));
        } catch (jsonErr) {
            console.warn("⚠️ AI Chat Format Issue, falling back to raw text:", jsonErr.message);
            res.json({ reply: result.replace(/<\/?[^>]+(>|$)/g, "").trim() });
        }
    } catch (error) {
        console.error("❌ /api/chat Error:", error.message);
        res.json({ reply: "I'm busy. (AI Connection Error)" });
    }
});

saveTripData(app);

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`\n✅ Travex Server Running on http://localhost:${PORT}`);
    console.log(`   🎫 Ticketmaster: ${TICKETMASTER_KEY ? 'ACTIVE' : 'OFFLINE'}`);
});