import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { runAgent, AgentRole, keyManager } from './smartRouter.js';

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
app.use(express.json());

// 📝 DEBUGGER
app.use((req, res, next) => {
    console.log(`\n📥 [${req.method}] ${req.url}`);
    next();
});

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

        const extractedData = JSON.parse(result);
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

// --- ✈️ ROUTE 2: FLIGHT SEARCH ---
app.get('/api/flights', async (req, res) => {
    try {
        const { origin, destination, date, currency } = req.query;
        console.log(`✈️  Starting Flight Search: ${origin} -> ${destination} (${currency || 'default currency'})`);

        const originData = await resolveCityData(origin);
        const destData = await resolveCityData(destination);

        const amadeus = keyManager.getAmadeusClient("FLIGHTS");
        const response = await amadeus.shopping.flightOffersSearch.get({
            originLocationCode: originData.iata,
            destinationLocationCode: destData.iata,
            departureDate: date,
            adults: '1',
            max: '5',
            ...(currency && { currencyCode: currency }) // Amadeus native currency conversion
        });
        res.json({ type: 'multi_modal', results: response.data, journey: { originHub: originData.iata, destHub: destData.iata } });
    } catch { res.json({ type: 'none', results: [] }); }
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
            const variation = (hash % 40) - 20; // +/- 20%
            return Math.floor(base * (1 + (variation / 100)));
        };

        // Build final hotel list candidates
        const topCandidates = topHotels
            .filter(h => Object.keys(offersMap).length === 0 || offersMap[h.hotelId] !== undefined)
            .sort((a, b) => (offersMap[a.hotelId] || 9999) - (offersMap[b.hotelId] || 9999))
            .slice(0, 6);

        // 🤖 Ask AI for Pricing on hotels missing real data
        let aiEstimatedPrices = {};
        const hotelsNeedingEstimates = topCandidates.filter(h => !offersMap[h.hotelId]);

        if (hotelsNeedingEstimates.length > 0) {
            console.log(`   🤖 Asking AI to estimate nightly prices for ${hotelsNeedingEstimates.length} hotels in ${targetCity}...`);
            const hotelNames = hotelsNeedingEstimates.map(h => h.name).join(", ");
            const prompt = `You are an elite travel pricing expert. Estimate the realistic nightly cost (in ${currency}) for a standard room at these specific hotels in ${targetCity}: ${hotelNames}.
            Return strictly a JSON object mapping the exact hotel name to the estimated nightly price as a Number. Example: { "The Plaza": 450, "Hilton": 200 }`;

            try {
                const aiResponse = await runAgent(AgentRole.GUIDE, prompt, `Determine realistic market rates for ${targetCity}.`);
                const cleanJson = aiResponse.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/```json/gi, '').replace(/```/g, '').trim();
                const parsedPrices = JSON.parse(cleanJson);

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
        const { destination, dates, hotel, budget, interests, vibeLevel, tripPurpose } = req.body;
        const start = new Date(dates.arrival);
        const end = new Date(dates.departure);
        const daysCount = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;

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
        let systemPrompt = `You are Travex's Elite Travel Architect, a world-class luxury travel planner and highly logical routing engine.
        Today's date is ${currentDate}.

TRIP PARAMETERS:
- Destination: ${destName}
- Duration: ${daysCount} days (From ${arrivalDate} to ${departureDate})
- Remaining Budget: ${currency} ${availableToSpend} (Target: ${currency} ${dailyAllowance}/day)
- User Interests: ${interests?.join(', ') || 'Popular Highlights'}
- Trip Purpose: ${tripPurpose?.toUpperCase() || 'HOLIDAY'}

CRITICAL CONSTRAINTS:
1. SPATIAL CLUSTERING: Group activities geographically by day. Day 1 should be tightly clustered in one neighborhood/region, Day 2 in another. Absolutely do not bounce the user across the map in a single day.
2. PACING & ELEGANCE: Include 4-5 activities per day to give a rich, in-depth experience. The flow must be seamless. Include 'logistics' activities if transit between locations exceeds 20 minutes.
3. PREMIUM CURATION: Write descriptions with the flair of a high-end travel magazine (e.g., Condé Nast Traveler). Sell the experience. Paint a vivid picture of the atmosphere, tastes, and sights.
4. EXACTING BUDGET: The sum of 'cost_estimate' for all activities across all days MUST NOT exceed ${currency} ${availableToSpend}. Be realistic with pricing.
5. TIME OF DAY AWARENESS: Be extremely logical with the time of day. Do NOT suggest a sunset viewpoint at noon. Do NOT suggest a bright morning hike at 8 PM. Match the activity perfectly to the biological and atmospheric reality of the time.
6. OUTPUT FORMAT: You may think first, but your final output MUST end with valid JSON starting with '{' and ending with '}'. Inject tasteful emojis into themes and activities.
7. PRECISION COORDINATES: "latitude" and "longitude" must be highly accurate decimal coordinates (e.g., 48.8566, 2.3522). This is critical for the interactive map widget.
8. LOCALNESS METRIC: Assign a "localness_signal" from 0.0 (pure tourist trap) to 1.0 (deeply local hidden gem).
9. TRANSIT INSTRUCTIONS: Provide highly in-depth, specific instructions on how to reach each destination from the previous one (e.g. "Take a 10-minute Uber", "Walk 15 minutes east down the promenade", "Take the Metro Line 4 to Cité").
10. EMOJIS: Use ACTUAL emoji characters (like 🍷 or 🏛️). DO NOT use unicode escape sequences (like \\uD83E\\uDD41).

STRICT JSON FORMAT:
{ "trip_name": "Must be catchy, luxurious, and descriptive", "daily_plan": [{ "day": 1, "date": "YYYY-MM-DD", "theme": "Aspirational theme for the day", "activities": [{ "time": "HH:MM", "activity": "Specific real place or activity name", "type": "food|sightseeing|logistics", "cost_estimate": Number, "description": "Highly descriptive, evocative, and professional text selling the atmospheric experience.", "reason_for_choice": "Compelling explanation of why this specific place is unmissable.", "transit_instruction": "In-depth instruction on how to get here from the previous spot (or the hotel).", "localness_signal": 0.5, "latitude": Number, "longitude": Number }] }] }

EXAMPLE FORMAT TO COPY STRICTLY:
{
  "trip_name": "Kerala: Backwaters & Heritage Elegance",
  "daily_plan": [
    {
      "day": 1,
      "date": "2026-03-10",
      "theme": "🛶 Colonial Echoes & Golden Sunsets",
      "activities": [
        {
          "time": "10:00",
          "activity": "Fort Kochi Heritage Walk 🚶",
          "type": "sightseeing",
          "cost_estimate": 0,
          "description": "Stroll beneath ancient rain trees as you explore the cobbled streets of Fort Kochi, marveling at the iconic, cantilevered Chinese Fishing Nets silhouetted against the morning sky.",
          "reason_for_choice": "An essential, evocative introduction to Kochi’s layered maritime history.",
          "transit_instruction": "Take a 20-minute Uber from your hotel directly to the waterfront promenade.",
          "localness_signal": 0.6,
          "latitude": 9.9680,
          "longitude": 76.2410
        },
        {
          "time": "13:00",
          "activity": "Coastal Gastronomy at Kashi Art Cafe 🍤",
          "type": "food",
          "cost_estimate": 800,
          "description": "Savor incredibly fresh, locally-sourced seafood dishes served in a lush, sun-dappled courtyard that doubles as a vibrant gallery for local artists.",
          "reason_for_choice": "The beating creative heart of Fort Kochi, blending exquisite flavors with inspiring art.",
          "transit_instruction": "Enjoy a scenic 10-minute walk south past vintage Portuguese architecture.",
          "localness_signal": 0.8,
          "latitude": 9.9657,
          "longitude": 76.2415
        }
      ]
    }
  ]
}
Follow this level of specificity, professional tone, and format exactly for ${destination}.`;

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

        let aiItineraryJSON = await runAgent(AgentRole.ARCHITECT, systemPrompt, userContent);

        // 🛡️ THE DEEPSEEK CLEANER (Strips out the <think> tags and markdown)
        aiItineraryJSON = aiItineraryJSON.replace(/<think>[\s\S]*?<\/think>/g, ''); // Removes thinking block
        aiItineraryJSON = aiItineraryJSON.replace(/```json/gi, '').replace(/```/g, ''); // Removes markdown
        aiItineraryJSON = aiItineraryJSON.replace(/\\\\u/g, '\\u'); // Forces double-escaped unicode to render as real emojis
        aiItineraryJSON = aiItineraryJSON.trim(); // Cleans whitespace

        // --- 🕵️‍♂️ 6. THE INSPECTOR AGENT (LLM-as-a-Judge + Localness Enforcer) ---
        console.log(`   🕵️‍♂️ Passing Architect's plan to Logistics Inspector...`);
        let inspectorPrompt = `You are a strict Logistics Inspector. Review the following JSON itinerary generated by an AI Architect. 
Look at the times, locations, and distances between consecutive activities. If two locations are far apart, you MUST rewrite the timestamps to allow for realistic transit time in ${destination}. 
Do not change the descriptions or activities, ONLY fix the scheduling (the 'time' field). 
Ensure the final result STRICTLY matches the original JSON structure. Do NOT output any conversational text, return ONLY the corrected valid JSON.`;

        // 🌿 6.5. INJECT LOCALNESS ENFORCEMENT INTO THE INSPECTOR
        if (localLevel === 3) {
            inspectorPrompt += `\n\nCRITICAL LOCALNESS ENFORCEMENT (STRICTLY LOCAL MODE):
            - The user selected "Strictly Local" mode. If the Architect Agent included ANY major global landmark (e.g., Eiffel Tower, Times Square, Colosseum, Big Ben, Taj Mahal, Great Wall, Tokyo Tower), you MUST DELETE it and REPLACE it with a neighborhood alternative.
            - Ensure ALL activities have localness_signal > 0.7.
            - If any activity has localness_signal < 0.5, replace it with a local hidden gem and update the reason_for_choice.
            - Do NOT add any new famous landmarks. This is a HARD requirement.`;
        }

        let finalizedResult = await runAgent(AgentRole.INSPECTOR, inspectorPrompt, aiItineraryJSON);

        // 🛡️ THE DEEPSEEK CLEANER FOR INSPECTOR
        finalizedResult = finalizedResult.replace(/<think>[\s\S]*?<\/think>/g, ''); // Removes thinking block
        finalizedResult = finalizedResult.replace(/```json/gi, '').replace(/```/g, ''); // Removes markdown
        finalizedResult = finalizedResult.replace(/\\\\u/g, '\\u'); // Forces double-escaped unicode to render as real emojis
        finalizedResult = finalizedResult.trim(); // Cleans whitespace

        console.log(`   ✅ Plan successfully audited by Inspector.`);
        res.json(JSON.parse(finalizedResult));
    } catch (error) {
        console.error("Architect Error:", error);
        res.status(500).json({ error: "AI Busy" });
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
            "You are a local guide. Return strict JSON array: [{ id, title, category, description, price, date }]",
            `Find 3 generic cultural activities in ${destination} for ${date}.`
        );
        res.json(JSON.parse(result));

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

// --- CHAT & OTHERS ---
app.post('/api/mapping', async (req, res) => { res.json({ logistics: [] }); });
app.post('/api/cfo', async (req, res) => { res.json({ status: "safe" }); });
app.post('/api/chat', async (req, res) => {
    try {
        const result = await runAgent(AgentRole.ROUTER, "You are Travex. Keep answers short. Return JSON: { \"reply\": \"String\" }", `User: ${req.body.message}`);
        res.json(JSON.parse(result));
    } catch { res.json({ reply: "I'm busy." }); }
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`\n✅ Travex Server Running on http://localhost:${PORT}`);
    console.log(`   🎫 Ticketmaster: ${TICKETMASTER_KEY ? 'ACTIVE' : 'OFFLINE'}`);
});