/**
 * 🛡️ API UTILITIES: Retry Logic, Rate Limiting, and Error Handling
 */

// ==========================================
// 🔄 RETRY CONFIGURATION
// ==========================================
const RetryConfig = {
  MAX_RETRIES: 3,
  BASE_DELAY: 1000,         // 1 second
  MAX_DELAY: 30000,          // 30 seconds
  EXPONENTIAL_BASE: 2,
  RETRYABLE_STATUS_CODES: [429, 500, 502, 503, 504], // Rate limit, server errors, gateway errors
};

// ==========================================
// ⏳ RATE LIMITER: Token Bucket Strategy
// ==========================================
class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  canMakeRequest() {
    const now = Date.now();
    // Remove old requests outside the window
    this.requests = this.requests.filter(timestamp => now - timestamp < this.windowMs);

    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    return false;
  }

  getRetryAfter() {
    if (this.requests.length === 0) return 0;
    const oldestRequest = this.requests[0];
    const retryAfter = Math.max(0, this.windowMs - (Date.now() - oldestRequest));
    return Math.ceil(retryAfter / 1000); // Return in seconds
  }

  reset() {
    this.requests = [];
  }
}

// ==========================================
// 📊 REQUEST QUEUE: Prevent Concurrent Overload
// ==========================================
class RequestQueue {
  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent;
    this.queue = [];
    this.active = 0;
  }

  async execute(fn) {
    while (this.active >= this.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
    }
  }
}

// ==========================================
// 🔄 RETRY WITH EXPONENTIAL BACKOFF
// ==========================================
export async function retryWithBackoff(
  apiCall,
  maxRetries = RetryConfig.MAX_RETRIES,
  baseDelay = RetryConfig.BASE_DELAY,
  options = {}
) {
  let lastError;
  const { operationName = "API Call", rateLimiter = null, requestQueue = null } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check rate limiter before making request
      if (rateLimiter && !rateLimiter.canMakeRequest()) {
        const waitTime = rateLimiter.getRetryAfter();
        console.warn(
          `⏳ [${operationName}] Rate limited. Waiting ${waitTime}s before retry...`
        );
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        continue;
      }

      // Execute through queue if provided
      if (requestQueue) {
        return await requestQueue.execute(apiCall);
      } else {
        return await apiCall();
      }
    } catch (error) {
      lastError = error;
      const statusCode = error.status || error.statusCode;
      const isRetryable =
        RetryConfig.RETRYABLE_STATUS_CODES.includes(statusCode) ||
        error.code === "ECONNREFUSED" ||
        error.code === "ETIMEDOUT";

      if (!isRetryable || attempt === maxRetries) {
        console.error(
          `❌ [${operationName}] Failed after ${attempt + 1} attempt(s): ${error.message}`
        );
        throw error;
      }

      // Calculate exponential backoff with jitter
      const delay =
        Math.min(
          baseDelay * Math.pow(RetryConfig.EXPONENTIAL_BASE, attempt),
          RetryConfig.MAX_DELAY
        ) + Math.random() * 1000; // Add jitter (0-1s)

      console.warn(
        `⚠️ [${operationName}] Attempt ${attempt + 1}/${maxRetries} failed (${statusCode}). Retrying in ${Math.round(delay)}ms...`
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error(`${operationName} failed after ${maxRetries} retries`);
}

// ==========================================
// 🎯 AMADEUS-SPECIFIC WRAPPER
// ==========================================
export async function makeAmadeusRequest(
  client,
  apiMethod,
  params,
  operationName = "Amadeus Request"
) {
  return retryWithBackoff(
    () => apiMethod.call(client, params),
    RetryConfig.MAX_RETRIES,
    RetryConfig.BASE_DELAY,
    { operationName }
  );
}

// ==========================================
// 📍 CACHED CITY RESOLVER (to reduce API calls)
// ==========================================
class CityCache {
  constructor(ttl = 3600000) { // 1 hour default
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(keyword, data) {
    this.cache.set(keyword.toLowerCase(), {
      data,
      timestamp: Date.now(),
    });
  }

  get(keyword) {
    const entry = this.cache.get(keyword.toLowerCase());
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(keyword.toLowerCase());
      return null;
    }

    return entry.data;
  }

  clear() {
    this.cache.clear();
  }
}

// ==========================================
// 🛡️ GRACEFUL FALLBACK (when API fails)
// ==========================================
export function createCityFallback(keyword) {
  const cleanKeyword = keyword.charAt(0).toUpperCase() + keyword.slice(1);
  const pseudoIata = keyword.substring(0, 3).toUpperCase();

  return {
    name: cleanKeyword,
    iataCode: pseudoIata,
    address: { countryName: "Global" },
    subType: "CITY",
    isApproximation: true,
  };
}

// ==========================================
// 🏨 HOTEL CACHE (to reduce API calls + improve performance)
// ==========================================
class HotelCache {
  constructor(ttl = 1800000) { // 30 minutes default (hotels change more frequently)
    this.cache = new Map();
    this.ttl = ttl;
  }

  // Create cache key from search parameters
  createKey(destination, checkIn, checkOut, adults, currency) {
    return `${destination.toLowerCase()}|${checkIn}|${checkOut}|${adults}|${currency}`.toLowerCase();
  }

  set(destination, checkIn, checkOut, adults, currency, data) {
    const key = this.createKey(destination, checkIn, checkOut, adults, currency);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get(destination, checkIn, checkOut, adults, currency) {
    const key = this.createKey(destination, checkIn, checkOut, adults, currency);
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear() {
    this.cache.clear();
  }
}

// ==========================================
// 🛡️ GRACEFUL HOTEL FALLBACK
// ==========================================
export function createHotelFallbacks(count = 6, destination = "City", pricePerNight = 2000, currency = "INR") {
  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
  const hotelNames = [
    "The Grand Plaza",
    "Riverside Resort",
    "Heritage Heights",
    "Sunset Paradise",
    "Royal Comfort Inn",
    "Marina Bay Suites"
  ];

  return Array.from({ length: count }).map((_, i) => ({
    id: `fallback_hotel_${i + 1}`,
    name: hotelNames[i] || `Hotel ${i + 1}`,
    image: `https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80`,
    rating: (3.8 + (Math.random() * 1.2)).toFixed(1),
    price: `${currencySymbol}${Math.floor(pricePerNight + (Math.random() * 1000 - 500))}/night`,
    distance: `${(Math.random() * 5 + 0.5).toFixed(1)} KM from center`,
    isApproximation: true,
    isEstimated: true
  }));
}

// ==========================================
// 📤 ERROR FORMATTER (better logging)
// ==========================================
export function formatApiError(error, operationName = "API") {
  const statusCode = error.status || error.statusCode || "unknown";
  const message = error.message || String(error);

  if (error.response?.body) {
    try {
      const body = JSON.parse(error.response.body);
      if (body.errors && Array.isArray(body.errors)) {
        const errorDetails = body.errors
          .map(e => `${e.title}: ${e.detail}`)
          .join("; ");
        return {
          statusCode,
          message: errorDetails,
          operationName,
        };
      }
    } catch (e) {
      // Not JSON, continue with default formatting
    }
  }

  return {
    statusCode,
    message,
    operationName,
  };
}

// ==========================================
// 🌐 EXPORTED INSTANCES
// ==========================================
export const cityCacheManager = new CityCache();
export const hotelCacheManager = new HotelCache();
export const amadeusRateLimiter = new RateLimiter(30, 60000); // 30 requests per 60s
export const amadeusRequestQueue = new RequestQueue(3); // Max 3 concurrent Amadeus requests
