# 🏨 Hotel Search Improvements

## Overview
Enhanced the hotel search endpoint (`/api/hotels`) with the same resilience features as city search, plus hotel-specific optimizations.

---

## ✨ New Features

### 1. **Hotel Search Caching** (30-minute TTL)
```javascript
// Same search parameters = instant cache hit
GET /api/hotels?destination=Paris&checkIn=2026-06-01&checkOut=2026-06-05&adults=2&currency=USD
→ ✅ Returns cached results instantly
```

**Cache Key:** `destination|checkIn|checkOut|adults|currency`

### 2. **Graceful Hotel Fallbacks**
When Amadeus API fails, instead of returning empty array `[]`, now returns realistic hotel suggestions:

```javascript
// Before: res.json([])
// After:
[
  {
    "id": "fallback_hotel_1",
    "name": "The Grand Plaza",
    "rating": "4.2",
    "price": "₹2,450/night",
    "distance": "1.2 KM from center",
    "isApproximation": true,  // ← Frontend can show warning
    "isEstimated": true
  },
  // ... 5 more hotels
]
```

### 3. **Smart Price Estimation**
Fallback prices are based on actual budget:
```javascript
totalBudget: 50,000 INR, nights: 5
→ dailyBudget: 10,000 INR/day
→ estimated hotelPrice: 5,000 INR/night ✓
```

### 4. **Intelligent Cache Expiry**
- Hotels cache: **30 minutes** (more frequent changes than cities)
- Prevents stale hotel data while reducing API calls

---

## 🔧 Updated Implementation

### New Utility: `hotelCacheManager`
```javascript
// Usage in endpoint
const cached = hotelCacheManager.get(
  targetCity,      // "Paris"
  checkIn,         // "2026-06-01"
  checkOut,        // "2026-06-05"
  numTravelers,    // 2
  currency         // "USD"
);

if (cached) return res.json(cached);
```

### New Fallback Function: `createHotelFallbacks()`
```javascript
const fallbacks = createHotelFallbacks(
  6,                           // count
  "Paris",                     // destination
  5000,                        // price per night
  "INR"                        // currency
);

res.json(fallbacks); // Array of 6 realistic hotels
```

---

## 📊 Improved Hotel Search Flow

### Before:
```
Request → Geocode lookup → Hotel search → Offers lookup → Build results → Return
              ❌ Fail        ❌ Fail
```

### After:
```
Request → Check cache → Hit? Return ✅
           Miss? Continue
         → Geocode (retry 3x) → Hotel search (retry 3x) → Offers (retry 2x)
           ❌ Fail at any step → Graceful fallback ✅ → Cache results → Return
```

---

## 🎯 API Response Examples

### Scenario 1: Cache Hit
```bash
GET /api/hotels?destination=Paris&checkIn=2026-06-01&checkOut=2026-06-05&adults=2
```

**Logs:**
```
✅ Using cached hotel results for "Paris"
```

**Response:** Instant, cached results

---

### Scenario 2: Successful API Call (New Search)
```bash
GET /api/hotels?destination=Tokyo&checkIn=2026-07-01&checkOut=2026-07-07&adults=3
```

**Logs:**
```
🏨 Hotel Search: Tokyo | adults: 3 | nights: 6
   🔎 Resolving City Data for: "Tokyo"...
   ✅ Using cached city data for "tokyo"
   🔄 Geocoding hotels near Tokyo...
   ✅ Found 20 hotels
   💰 Fetching real pricing for 20 hotels...
```

**Response:** Real hotel data, cached for 30 minutes

---

### Scenario 3: API Fails (429/500 Errors)
```bash
GET /api/hotels?destination=Barcelona&checkIn=2026-08-01&checkOut=2026-08-08&adults=4&budget=60000&currency=INR
```

**Logs:**
```
❌ Hotel Search Error [429]: Too many requests
   💰 Calculating fallback prices...
   budget: 60000 INR | nights: 7 | dailyBudget: ~8,571 INR/day
   → Estimated hotel price: 4,000 INR/night
   📋 Returning 6 graceful fallback hotels
```

**Response:**
```json
[
  {
    "id": "fallback_hotel_1",
    "name": "The Grand Plaza",
    "image": "https://...",
    "rating": "4.1",
    "price": "₹4,200/night",
    "distance": "2.3 KM from center",
    "isApproximation": true,
    "isEstimated": true
  },
  // ... 5 more
]
```

Frontend detects `isApproximation: true` and shows warning: ⚠️ "These are estimated hotels"

---

## 🔄 Retry Strategy for Hotels

### Geocoding Lookup:
- **Max Retries:** 3
- **Base Delay:** 1 second
- **Backoff:** Exponential (1s → 2s → 4s)

### Offers Search:
- **Max Retries:** 2 (faster, less critical)
- **Base Delay:** 1 second
- **Backoff:** Exponential

---

## 💾 Cache Configuration

### Hotel Cache Manager
```javascript
class HotelCache {
  constructor(ttl = 1800000) {  // 30 minutes
    // Creates dynamic cache keys from search parameters
  }

  createKey(destination, checkIn, checkOut, adults, currency) {
    return `${destination}|${checkIn}|${checkOut}|${adults}|${currency}`;
  }

  set(destination, checkIn, checkOut, adults, currency, data) {
    // Automatically handles expiry
  }

  get(destination, checkIn, checkOut, adults, currency) {
    // Returns null if expired
  }
}
```

---

## 📈 Performance Improvements

| Metric | Before | After |
|--------|--------|-------|
| Cache TTL | None | 30 min |
| Empty Array on Error | Yes ❌ | No ✅ |
| Fallback Hotels | 0 | 6 |
| Retry Attempts | 0 | 3-2 |
| Rate Limit Handling | Immediate Fail | Auto-retry |

---

## 🧪 Testing

### Test Cache
```bash
# First request - from API
curl "http://localhost:5000/api/hotels?destination=Paris&checkIn=2026-06-01&checkOut=2026-06-05&adults=2"

# Second request - from cache (should be instant)
curl "http://localhost:5000/api/hotels?destination=Paris&checkIn=2026-06-01&checkOut=2026-06-05&adults=2"
```

Logs should show:
```
✅ Using cached hotel results for "Paris"
```

### Test Fallback
Stop Amadeus API or run this to trigger rate limit:
```bash
for i in {1..20}; do
  curl "http://localhost:5000/api/hotels?destination=London&checkIn=2026-06-01&checkOut=2026-06-05&adults=2" &
done
```

Response should have graceful fallback hotels with `isApproximation: true`

---

## 🎯 Frontend Integration

### Detect Approximated Hotels
```javascript
const response = await fetch('/api/hotels?...');
const hotels = await response.json();

if (hotels[0]?.isApproximation) {
  console.warn('⚠️ These are estimated hotels - real prices may vary');
  // Show warning banner to user
}
```

### Handle Estimated Prices
```javascript
const priceText = hotel.price;  // "₹4,200/night"
const isEstimated = hotel.isEstimated;

if (isEstimated) {
  return `${priceText} (estimated)`;
} else {
  return `${priceText} (confirmed)`;
}
```

---

## 📝 Configuration

All hotel settings are in `apiUtils.js`:

```javascript
// Hotel cache - 30 minutes TTL (hotels change frequently)
export const hotelCacheManager = new HotelCache(1800000);

// Shared with cities - 30 requests per 60 seconds
export const amadeusRateLimiter = new RateLimiter(30, 60000);

// Max 3 concurrent Amadeus requests
export const amadeusRequestQueue = new RequestQueue(3);
```

To change hotel cache TTL:
```javascript
export const hotelCacheManager = new HotelCache(
  3600000  // 1 hour instead of 30 min
);
```

---

## 🆘 Troubleshooting

### Hotels returning empty array
- **Fix:** Update to latest code (added fallback)
- **Check:** `/api/health` endpoint

### Cache not working
- **Check:** Same destination, checkIn, checkOut, adults, currency
- **Cache Key:** Must match exactly
- **TTL:** 30 minutes - try waiting if expired

### Fallback hotels showing always
- **Cause:** Amadeus API may be experiencing issues
- **Check:** `/api/health` → APIs status
- **Solution:** Usually resolves after Amadeus service recovery

---

## 🚀 Summary

Hotel search now has:
- ✅ **Smart caching** (30 min TTL)
- ✅ **Automatic retry** (3x geocoding, 2x offers)
- ✅ **Graceful fallbacks** (6 estimated hotels)
- ✅ **Rate limiting** (shared with flights/cities)
- ✅ **Better logging** (clear error messages)
- ✅ **Budget-aware pricing** (fallback prices match budget)

Users get a seamless hotel search experience even when APIs fail! 🎉

