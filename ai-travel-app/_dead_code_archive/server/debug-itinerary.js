import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api/itinerary';

const payload = {
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
};

async function testItinerary() {
    console.log("Testing /api/itinerary...");
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log(`Status: ${response.status}`);
        const text = await response.text();
        console.log(`Response: ${text}`);
    } catch (e) {
        console.error("Fetch Error:", e.message);
    }
}
testItinerary();
