import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { runAgent, runAgentStream, AgentRole, keyManager } from './smartRouter.js';

// Load secrets
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const TICKETMASTER_KEY = process.env.TICKETMASTER_KEY;

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
    const match = cleaned.match(/[\{\[][\s\S]*[\}\]]/);
    if (!match) throw new Error("No JSON block found strictly matching { or [.");
    try {
        return JSON.parse(match[0]);
    } catch (err) {
        throw new Error("Invalid JSON structure: " + err.message);
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
    try {
        const { keyword } = req.query;
        if (!keyword || keyword.length < 2) return res.json([]);
        const client = keyManager.getAmadeusClient("FLIGHTS");
        const response = await client.referenceData.locations.get({ keyword, subType: 'CITY,AIRPORT' });
        res.json(response.data);
    } catch { res.json([]); }
});

// --- ✈️ ROUTE 2: FLIGHT SEARCH (One-Way + Round Trip) ---
app.get('/api/flights', async (req, res) => {
    try {
        const { origin, destination, date, returnDate, tripType, currency } = req.query;
        console.log(`✈️  Flight Search: ${origin} -> ${destination} | type: ${tripType || 'one-way'} | return: ${returnDate || 'N/A'}`);

        const originData = await resolveCityData(origin);
        const destData   = await resolveCityData(destination);
        const amadeus    = keyManager.getAmadeusClient("FLIGHTS");

        const params = {
            originLocationCode:      originData.iata,
            destinationLocationCode: destData.iata,
            departureDate:           date,
            adults:                  '1',
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
    const targetCity = req.query.destination || req.query.cityCode;
    const totalBudget = parseFloat(req.query.budget) || 5000;
    const currency = req.query.currency || 'INR';
    const checkIn = req.query.checkIn;
    const checkOut = req.query.checkOut;
    const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';

    // Calculate nights to fix "expensive" total stay bug
    let nights = 1;
    if (checkIn && checkOut) {
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        if (!isNaN(start) && !isNaN(end)) {
            nights = Math.max(1, Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)));
        }
    }

    try {
        console.log(`🏨 Searching Hotels for: ${targetCity} | ${checkIn} → ${checkOut} | ${nights} nights | ${currency}`);

        // STEP 1: Get hotel IDs via byGeocode
        const cityData = await resolveCityData(targetCity);
        if (!cityData.geo) throw new Error("Could not resolve Geocode for city.");

        const amadeus = keyManager.getAmadeusClient("HOTELS");
        const geoResponse = await amadeus.referenceData.locations.hotels.byGeocode.get({
            latitude: cityData.geo.latitude,
            longitude: cityData.geo.longitude,
            radius: 10,
            radiusUnit: 'KM',
        });

        // Sort by distance and take the 20 closest to search for pricing
        const sorted = [...geoResponse.data].sort((a, b) =>
            (a.distance?.value || 99) - (b.distance?.value || 99)
        );
        const topHotels = sorted.slice(0, 20);
        const hotelIds = topHotels.map(h => h.hotelId).join(',');

        // STEP 2: Fetch real prices if dates are available
        let offersMap = {};
        if (checkIn && checkOut && hotelIds) {
            try {
                console.log(`   💰 Fetching real prices for ${topHotels.length} hotels...`);
                const offersResponse = await amadeus.shopping.hotelOffersSearch.get({
                    hotelIds,
                    checkInDate: checkIn,
                    checkOutDate: checkOut,
                    adults: '1',
                    currencyCode: currency,
                    bestRateOnly: true
                });
                // Build a map of hotelId → lowest price
                offersResponse.data.forEach(offer => {
                    const price = offer.offers?.[0]?.price?.total;
                    if (price) offersMap[offer.hotel.hotelId] = parseFloat(price);
                });
                console.log(`   ✅ Got real prices for ${Object.keys(offersMap).length} hotels.`);
            } catch {
                console.log(`   ⚠️ hotelOffersSearch failed (test env limitation), using estimated prices.`);
            }
        }

        // Fallback estimated price per night if real pricing unavailable
        const dailyBudget = totalBudget / nights;
        let estimatedPrice;

        // Ensure baseline hotel prices are far more realistic (not 30/night)
        if (currency === 'USD') {
            estimatedPrice = dailyBudget >= 800 ? 350 : dailyBudget >= 300 ? 180 : 90;
        } else if (currency === 'EUR') {
            estimatedPrice = dailyBudget >= 800 ? 300 : dailyBudget >= 300 ? 150 : 80;
        } else {
            // INR
            estimatedPrice = dailyBudget >= 60000 ? 15000 : dailyBudget >= 20000 ? 6000 : dailyBudget >= 8000 ? 3000 : 1500;
        }

        // Add slight pseudo-random variation based on hotel ID so they don't all cost exactly the same
        const randomizePrice = (base, idString) => {
            const hash = Array.from(idString).reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const variation = ((hash % 40) - 20) / 100; // Gives -0.20 to +0.20
            return Math.floor(base * (1 + variation));
        };

        // Build final hotel list candidates
        const topCandidates = topHotels
            .sort((a, b) => (offersMap[a.hotelId] || 9999) - (offersMap[b.hotelId] || 9999))
            .slice(0, 6);

        // 🤖 Ask AI for Pricing on hotels missing real data
        let aiEstimatedPrices = {};
        const hotelsNeedingEstimates = topCandidates.filter(h => !offersMap[h.hotelId]);

        if (hotelsNeedingEstimates.length > 0) {
            console.log(`   🤖 Asking AI to estimate nightly prices for ${hotelsNeedingEstimates.length} hotels in ${targetCity}...`);
            const sanitize = (str) => str.replace(/[^\w\s,\-']/g, '').slice(0, 100);
            const hotelNames = hotelsNeedingEstimates.map(h => sanitize(h.name)).join(", ");
            const prompt = `You are an elite travel pricing expert. Estimate the realistic nightly cost (in ${currency}) for a standard room at these specific hotels in ${targetCity}: ${hotelNames}.
            Return strictly a JSON object mapping the exact hotel name to the estimated nightly price as a Number. Example: { "The Plaza": 450, "Hilton": 200 }`;

            try {
                const aiResponse = await runAgent(AgentRole.GUIDE, prompt, `Determine realistic market rates for ${targetCity}.`);
                const parsedPrices = extractJSON(aiResponse);

                hotelsNeedingEstimates.forEach(h => {
                    if (parsedPrices[h.name]) {
                        aiEstimatedPrices[h.hotelId] = parsedPrices[h.name];
                    }
                });
                console.log(`   ✅ AI provided estimates for ${Object.keys(aiEstimatedPrices).length} hotels.`);
            } catch (aiErr) {
                console.log("   ⚠️ AI estimation failed, falling back to math calculation.", aiErr.message);
            }
        }

        const hotels = topCandidates.map(h => {
            const realPriceTotal = offersMap[h.hotelId];
            let pricePerNight = realPriceTotal ? (realPriceTotal / nights) : (aiEstimatedPrices[h.hotelId] || randomizePrice(estimatedPrice, h.hotelId));

            // Final safety net to prevent absurdly low prices
            if (currency === 'INR' && pricePerNight < 1000) pricePerNight = 1000 + (Math.random() * 500);
            if (currency === 'USD' && pricePerNight < 50) pricePerNight = 50 + (Math.random() * 20);
            if (currency === 'EUR' && pricePerNight < 50) pricePerNight = 50 + (Math.random() * 20);

            return {
                id: h.hotelId,
                name: h.name,
                image: `https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80`,
                rating: h.rating || '3.5',
                price: `${currencySymbol}${Math.floor(pricePerNight)}/night`,
                isRealPrice: !!realPriceTotal || !!aiEstimatedPrices[h.hotelId],
                distance: `${h.distance?.value?.toFixed(1) || "1"} ${h.distance?.unit || "KM"} from center`
            };
        });

        console.log(`   ✅ Returning ${hotels.length} hotels (${Object.keys(offersMap).length} with real pricing).`);
        res.json(hotels);

    } catch (error) {
        console.log(`   ⚠️ Hotel API Error:`, error.message);
        res.json([]);
    }
});

// --- 🔓 ROUTE 4: AI ARCHITECT (WITH CFO ENGINE + LIVE LIKE A LOCAL) ---
app.post('/api/itinerary', async (req, res) => {
    try {
        const { destination, dates, hotel, budget, interests, vibeLevel, tripPurpose, flight } = req.body;
        const start = new Date(dates?.arrival);
        const end = new Date(dates?.departure);
        if (isNaN(start) || isNaN(end)) {
            return res.status(400).json({ error: 'Invalid dates provided in request' });
        }
        const daysCount = Math.max(1, Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1);

        // ✈️ Extract Flight Times for better scheduling
        let flightArrivalStr = "flexible/unknown time";
        let flightDepartureStr = "flexible/unknown time";
        if (flight?.itineraries?.length > 0) {
            // Outbound arrival (last segment of first itinerary)
            const outBound = flight.itineraries[0].segments;
            const arrivalTime = outBound?.[outBound.length - 1]?.arrival?.at;
            if (arrivalTime) flightArrivalStr = new Date(arrivalTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            
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
      1. **Spatial Clustering** – Each day’s activities must reside in a single neighborhood or compact zone. Do not bounce the user across the map in a single day.
      2. **Pacing & Elegance** – Include EXACTLY 4-5 activities per day. You must fill the entire day from morning to evening.
      3. **Premium Description** – Every 'description' must be 2 vivid, sensory-rich sentences. Be evocative but concise.
      4. **Budget Exactitude** – Sum of all 'cost_estimate' fields MUST NOT exceed ${currency} ${availableToSpend}. Be realistic with pricing.
      5. **Time-of-Day Authenticity** – Match the activity perfectly to the biological and atmospheric reality of the time.
      6. **Output Format** – Your final output MUST end with valid JSON. Inject tasteful emojis into themes and activities.
      7. **Precision Coordinates** – "latitude" and "longitude" must be highly accurate decimal coordinates (e.g., 48.8566, 2.3522). This is critical for the interactive map widget.
      8. **Localness Metric** – Assign a "localness_signal" from 0.0 (pure tourist trap) to 1.0 (deeply local hidden gem).
      9. **Transit Instructions** – Provide highly specific, realistic transit instructions (e.g., "Take a 10-minute Uber", "Walk 15 minutes east down the tree-lined promenade").
      10. **Emojis** – Use ACTUAL emoji characters (like 🍷 or 🏛️). DO NOT use unicode escape sequences.
      11. **Real Establishments Only** – NEVER use generic names like "Local Restaurant" or "Local Cafe". You MUST provide the exact, real-world name of a specific establishment that exists on Google Maps (e.g., "Pujol", "Cafe de Flore").
      12. **Mandatory Basecamp** – You MUST incorporate the "Selected Hotel" above. Day 1 MUST include an explicit "Check-in at [Hotel Name]" activity. The geographic clustering of every day MUST revolve logically around this specific hotel's location.
      13. **Flight Schedule Alignment** – Day 1 activities MUST begin AFTER the ${flightArrivalStr} arrival (factor in transit/hotel check-in). The Final Day activities MUST conclude well BEFORE the ${flightDepartureStr} departure flight to allow for airport transit.

      REQUIRED JSON SCHEMA: {"trip_name":"Catchy trip title","daily_plan":[{"day":1,"date":"YYYY-MM-DD","theme":"🎨 Day theme","activities":[{"time":"HH:MM","activity":"Real place name 🗺️","type":"food|sightseeing|logistics","cost_estimate":0,"description":"Two vivid sentences describing the experience.","reason_for_choice":"Why this place is unmissable.","transit_instruction":"Specific transit instruction.","localness_signal":0.5,"latitude":0.0,"longitude":0.0}]}]}
      Follow this schema exactly for ALL ${daysCount} days. Output RAW JSON ONLY — no Markdown, no code blocks. Start exactly with { and end exactly with }.`;

        // 📊 4. INJECT CFO RULES
        systemPrompt += `\n\nFINANCIAL CONSTRAINTS (CFO ENGINE):
        - The user has a STRICT remaining budget of ${currency} ${totalRemaining} for the entire trip (excluding flights/hotels).
        - The average daily allowance is ${currency} ${dailyAllowance}.
        - DO NOT exceed the total remaining budget.
        - Provide realistic \`cost_estimate\` numbers in ${currency} for EVERY activity.
        - Distribute the budget contextually (e.g., Day 1 might use 10% of the budget, Day 3 might use 40% for an adventure). Use your discretion to make the math work without going over ${currency} ${totalRemaining}.`;

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
            localness_signal: z.number().optional().nullable(),
            latitude: z.number().optional().nullable(),
            longitude: z.number().optional().nullable()
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

        // 1. Try Ticketmaster First
        const realEvents = await fetchTicketmasterEvents(destination, date);
        if (realEvents) {
            return res.json(realEvents);
        }

        // 2. Fallback to AI if no real events found
        console.log("   🤖 Ticketmaster empty. Asking AI Guide...");
        const result = await runAgent(AgentRole.GUIDE,
            `You are a local guide. Return a JSON object in this format exactly:
{ "events": [{ "id": "1", "title": "Event Name", "category": "Music", "description": "Description", "price": "Free", "date": "2026-04-01" }] }. Return ONLY valid JSON.`,
            `Find 3 generic cultural activities in ${destination} for ${date}.`
        );
        const parsed = extractJSON(result);
        // Handle both array and object responses
        const events = Array.isArray(parsed) ? parsed : (parsed.events || parsed.activities || []);
        res.json(events);

    } catch { res.json([]); }
});

// --- 🛑 ROUTE 8: FLIGHT WEBHOOKS (CANCELLATION LISTENER) ---
app.post('/api/webhooks/flights', async (req, res) => {
    try {
        const { eventType, flightId, newStatus, reason } = req.body;

        console.log(`\n🚨 [WEBHOOK RECEIVED] Flight Status Update`);
        console.log(`   Flight ID: ${flightId}`);
        console.log(`   Event Type: ${eventType}`);
        console.log(`   New Status: ${newStatus} (${reason || 'No reason provided'})`);

        if (newStatus === 'CANCELED') {
            console.log(`   ⚠️ ACTION REQUIRED: Flight ${flightId} was canceled. Need to trigger UI update and AI Re-routing.`);
            // In a real DB, you'd find the user with this flight and mark it canceled.
            // For now, we simulate success response to the provider.
        }

        res.status(200).json({ received: true, message: "Webhook processed" });
    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).json({ error: "Failed to process webhook" });
    }
});
// ============================================================
// PASTE BOTH OF THESE ROUTES INTO server/index.js
// Place them BEFORE the existing --- CHAT & OTHERS --- section
// ============================================================


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
            interests = []
        } = searchData || {};

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
                d.setDate(d.getDate() + 3);
                return d.toISOString().split('T')[0];
            })();

        const isRoundTrip = tripType === 'round' && !!returnDate;

        console.log(`\n📦 /api/search-all | ${tripType} | ${originName} → ${destName} | ${checkIn}${isRoundTrip ? ' → ' + checkOut : ''}`);

        const [flightResult, hotelResult, eventResult] = await Promise.allSettled([

            // 1. FLIGHTS — pass returnDate only for round trips
            (async () => {
                const originData = await resolveCityData(originCode);
                const destData   = await resolveCityData(destCode);
                const amadeus    = keyManager.getAmadeusClient("FLIGHTS");

                const params = {
                    originLocationCode:      originData.iata,
                    destinationLocationCode: destData.iata,
                    departureDate:           checkIn,
                    adults:                  '1',
                    max:                     '10',
                    ...(currency && { currencyCode: currency }),
                    ...(isRoundTrip && { returnDate: checkOut })
                };

                const response = await amadeus.shopping.flightOffersSearch.get(params);
                return {
                    type:    isRoundTrip ? 'round_trip' : 'one_way',
                    results: response.data,
                    journey: { originHub: originData.iata, destHub: destData.iata }
                };
            })(),

            // 2. HOTELS
            (async () => {
                const cityData = await resolveCityData(destName);
                if (!cityData.geo) return [];

                const amadeus = keyManager.getAmadeusClient("HOTELS");
                const geoResponse = await amadeus.referenceData.locations.hotels.byGeocode.get({
                    latitude:   cityData.geo.latitude,
                    longitude:  cityData.geo.longitude,
                    radius:     10,
                    radiusUnit: 'KM',
                });

                const sorted    = [...geoResponse.data].sort((a, b) => (a.distance?.value || 99) - (b.distance?.value || 99));
                const topHotels = sorted.slice(0, 20);
                const hotelIds  = topHotels.map(h => h.hotelId).join(',');

                let offersMap = {};
                if (checkIn && checkOut && hotelIds) {
                    try {
                        const offersResponse = await amadeus.shopping.hotelOffersSearch.get({
                            hotelIds,
                            checkInDate:  checkIn,
                            checkOutDate: checkOut,
                            adults:       '1',
                            currencyCode: currency,
                            bestRateOnly: true
                        });
                        offersResponse.data.forEach(offer => {
                            const price = offer.offers?.[0]?.price?.total;
                            if (price) offersMap[offer.hotel.hotelId] = parseFloat(price);
                        });
                    } catch {
                        console.log('   ⚠️ Hotel pricing unavailable, using estimates.');
                    }
                }

                const nights     = Math.max(1, Math.ceil(Math.abs(new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));
                const totalBudget = parseFloat(budget || 5000);
                const dailyBudget = totalBudget / nights;
                const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';

                let estimatedPrice;
                if (currency === 'USD')      estimatedPrice = dailyBudget >= 800 ? 350 : dailyBudget >= 300 ? 180 : 90;
                else if (currency === 'EUR') estimatedPrice = dailyBudget >= 800 ? 300 : dailyBudget >= 300 ? 150 : 80;
                else                         estimatedPrice = dailyBudget >= 60000 ? 15000 : dailyBudget >= 20000 ? 6000 : dailyBudget >= 8000 ? 3000 : 1500;

                const randomizePrice = (base, id) => {
                    const hash = Array.from(id).reduce((a, c) => a + c.charCodeAt(0), 0);
                    return Math.floor(base * (1 + ((hash % 40) - 20) / 100));
                };

                return topHotels.slice(0, 6).map(h => {
                    const realTotal   = offersMap[h.hotelId];
                    let pricePerNight = realTotal ? (realTotal / nights) : randomizePrice(estimatedPrice, h.hotelId);

                    if (currency === 'INR' && pricePerNight < 1000) pricePerNight = 1000 + Math.random() * 500;
                    if (currency === 'USD' && pricePerNight < 50)   pricePerNight = 50   + Math.random() * 20;
                    if (currency === 'EUR' && pricePerNight < 50)   pricePerNight = 50   + Math.random() * 20;

                    return {
                        id:          h.hotelId,
                        name:        h.name,
                        image:       `https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80`,
                        rating:      h.rating || '4.0',
                        price:       `${currencySymbol}${Math.floor(pricePerNight)}/night`,
                        isRealPrice: !!realTotal,
                        distance:    `${h.distance?.value?.toFixed(1) || "1"} ${h.distance?.unit || "KM"} from center`
                    };
                });
            })(),

            // 3. EVENTS
            (async () => {
                const realEvents = await fetchTicketmasterEvents(destName, checkIn);
                if (realEvents) return realEvents;

                const result = await runAgent(
                    AgentRole.GUIDE,
                    `You are a local guide. Return a JSON object: { "events": [{ "id": "1", "title": "Event Name", "category": "Music", "description": "Description", "price": "Free", "date": "2026-04-01" }] }. Return ONLY valid JSON.`,
                    `Find 4 interesting cultural activities or events in ${destName} around ${checkIn}.`
                );
                const parsed = extractJSON(result);
                return Array.isArray(parsed) ? parsed : (parsed.events || parsed.activities || []);
            })()
        ]);

        const transportData = flightResult.status === 'fulfilled' ? flightResult.value : { type: 'none', results: [] };
        const hotelData     = hotelResult.status  === 'fulfilled' ? hotelResult.value  : [];
        const eventData     = eventResult.status  === 'fulfilled' ? eventResult.value  : [];
        const heroImage     = `https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1600&q=80`;

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

        const userContent = `User's edit request: "${prompt}"

Current itinerary to modify:
${JSON.stringify(currentItinerary, null, 2)}`;

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
app.post('/api/mapping', async (req, res) => { res.json({ logistics: [] }); });
app.post('/api/cfo', async (req, res) => { res.json({ status: "safe" }); });
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

        const result = await runAgent(AgentRole.ROUTER, systemPrompt, `User: ${message}`, history);
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

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`\n✅ Travex Server Running on http://localhost:${PORT}`);
    console.log(`   🎫 Ticketmaster: ${TICKETMASTER_KEY ? 'ACTIVE' : 'OFFLINE'}`);
});