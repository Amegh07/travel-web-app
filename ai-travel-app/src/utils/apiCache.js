// ai-travel-app/src/utils/apiCache.js

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class ApiCache {
  constructor() {
    this.cache = new Map();
  }

  getKey(endpoint, params) {
    return `${endpoint}:${JSON.stringify(params)}`;
  }

  get(endpoint, params) {
    const key = this.getKey(endpoint, params);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`📦 Cache hit for ${endpoint}`);
      return cached.data;
    }
    
    return null;
  }

  set(endpoint, params, data) {
    const key = this.getKey(endpoint, params);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear() {
    this.cache.clear();
  }
}

export const apiCache = new ApiCache();