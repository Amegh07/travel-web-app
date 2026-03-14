# TO-DO List

## Flight Cancellation Handling
1. **Immediate Notification:** Send alerts (push/SMS/email or in-app modal) to the user detailing the canceled flight.
2. **Auto-Update the Itinerary:** Mark the flight as `Canceled` in the UI (e.g., in `ItineraryMap.jsx`) and flag downstream bookings.
3. **Immediate Alternatives:** Automatically fetch and display alternative flights; enable one-click rebooking if supported.
4. **Refund & Compensation:** Clearly display refund policies and provide paths for refunds or airline credit.
5. **Smart Itinerary Rescheduling (AI Rescue):** Use AI to automatically reschedule planned activities around the new flight times.

## Implementation Steps
- [ ] Add webhooks from flight API providers to listen for `flight_status_changed`.
- [ ] Update database schemas with a `status` field for flights (`scheduled`, `delayed`, `canceled`).
- [ ] Update frontend UI components to reflect flight status dynamically.
