import { AgentRole, runAgent } from './smartRouter.js';

const req = {
  body: {
    destination: "Paris",
    dates: { arrival: "2026-05-10", departure: "2026-05-13" },
    hotel: { name: "Le Marais Boutique" },
    daysCount: 3,
    interests: ["Art", "Food"],
    availableToSpend: 1500,
    currency: "USD",
    dailyAllowance: 500,
    isSurvivalMode: false,
    localLevel: 2
  }
};

async function testEndpointLocally() {
  try {
    const { destination, dates, hotel, daysCount, interests, availableToSpend, currency, dailyAllowance, isSurvivalMode, localLevel } = req.body;

    const destName = typeof destination === 'object' ? destination.name : destination;
    const arrivalDate = dates?.arrival || new Date().toISOString().split('T')[0];
    const departureDate = dates?.departure || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
    const totalRemaining = availableToSpend || 2000;

    console.log(`   🌍 AI Architect Booting... Destination: ${destName} | Days: ${daysCount} | Budget: ${currency} ${totalRemaining}`);
    console.log(`   🌿 Localness Level: ${localLevel} (${localLevel === 1 ? 'First-Timer' : localLevel === 2 ? 'Explorer' : 'Strictly Local'})`);

    const currentDate = new Date().toISOString().split('T')[0];
    let systemPrompt = `You are Travex's Elite Travel Architect, a world-class luxury travel planner and highly logical routing engine.
        Today's date is ${currentDate}.

TRIP PARAMETERS:
- Destination: ${destName}
- Duration: ${daysCount} days (From ${arrivalDate} to ${departureDate})
- Remaining Budget: ${currency} ${availableToSpend} (Target: ${currency} ${dailyAllowance}/day)
- User Interests: ${interests?.join(', ') || 'Popular Highlights'}

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

STRICT JSON FORMAT:
{ "trip_name": "Must be catchy, luxurious, and descriptive", "daily_plan": [{ "day": 1, "date": "YYYY-MM-DD", "theme": "Aspirational theme for the day", "activities": [{ "time": "HH:MM", "activity": "Specific real place or activity name", "type": "food|sightseeing|logistics", "cost_estimate": Number, "description": "Highly descriptive, evocative, and professional text selling the atmospheric experience.", "reason_for_choice": "Compelling explanation of why this specific place is unmissable.", "transit_instruction": "In-depth instruction on how to get here from the previous spot (or the hotel).", "localness_signal": 0.5, "latitude": Number, "longitude": Number }] }] }

CRITICAL CONSTRAINTS:
1. You MUST return ONLY valid JSON. No markdown, no conversational text.
2. Limit travel distance between activities to less than 15km.
3. Inject appropriate emojis into the 'theme' and 'activity' strings.
4. "reason_for_choice": Include a brief, evocative sentence explaining why this place is special.
5. "localness_signal": A number from 0.0 (pure tourist trap) to 1.0 (deeply local hidden gem).
6. "latitude" and "longitude": Extremely precise decimal coordinates (e.g. 48.8566, 2.3522). This is required for the interactive map widget.

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

    if (isSurvivalMode) {
      systemPrompt += `\n\n🚨 SURVIVAL MODE ACTIVE: The daily budget is critically low.
            - You MUST prioritize FREE activities, public parks, walking tours, and cheap local street food.
            - Avoid all expensive restaurants, paid museums, or premium tours.
            - Keep the daily cost as close to ${currency} ${dailyAllowance} as humanly possible.`;
    }

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

    const userContent = `Plan a ${daysCount}-day trip to ${destination}. Stay: ${hotel?.name || 'Local Hotel'}. Arrival: ${dates?.arrival}. Interests: ${interests?.join(', ')}.${localLevel >= 2 ? ' The user wants to LIVE LIKE A LOCAL — avoid tourist traps!' : ''}`;

    console.log("WAITING FOR ARCHITECT...");
    let aiItineraryJSON = await runAgent(AgentRole.ARCHITECT, systemPrompt, userContent);

    console.log("CLEANING ARCHITECT OUTPUT...");
    aiItineraryJSON = aiItineraryJSON.replace(/<think>[\s\S]*?<\/think>/g, '');
    aiItineraryJSON = aiItineraryJSON.replace(/```json/g, '').replace(/```/g, '');
    aiItineraryJSON = aiItineraryJSON.trim();

    console.log(`   🕵️‍♂️ Passing Architect's plan to Logistics Inspector...`);
    let inspectorPrompt = `You are a strict Logistics Inspector. Review the following JSON itinerary generated by an AI Architect. 
Look at the times, locations, and distances between consecutive activities. If two locations are far apart, you MUST rewrite the timestamps to allow for realistic transit time in ${destination}. 
Do not change the descriptions or activities, ONLY fix the scheduling (the 'time' field). 
Ensure the final result STRICTLY matches the original JSON structure. Do NOT output any conversational text, return ONLY the corrected valid JSON.`;

    if (localLevel === 3) {
      inspectorPrompt += `\n\nCRITICAL LOCALNESS ENFORCEMENT (STRICTLY LOCAL MODE):
            - The user selected "Strictly Local" mode. If the Architect Agent included ANY major global landmark (e.g., Eiffel Tower, Times Square, Colosseum, Big Ben, Taj Mahal, Great Wall, Tokyo Tower), you MUST DELETE it and REPLACE it with a neighborhood alternative.
            - Ensure ALL activities have localness_signal > 0.7.
            - If any activity has localness_signal < 0.5, replace it with a local hidden gem and update the reason_for_choice.
            - Do NOT add any new famous landmarks. This is a HARD requirement.`;
    }

    console.log("WAITING FOR INSPECTOR...");
    let finalizedResult = await runAgent(AgentRole.INSPECTOR, inspectorPrompt, aiItineraryJSON);

    console.log("CLEANING INSPECTOR OUTPUT...");
    finalizedResult = finalizedResult.replace(/<think>[\s\S]*?<\/think>/g, '');
    finalizedResult = finalizedResult.replace(/```json/g, '').replace(/```/g, '');
    finalizedResult = finalizedResult.trim();

    console.log("PARSING JSON...");
    const output = JSON.parse(finalizedResult);
    console.log("SUCCESS!", output.trip_name);

  } catch (error) {
    console.error("!!! CRASH CAUGHT !!!");
    console.error(error.stack || error);
  }
}

testEndpointLocally();
