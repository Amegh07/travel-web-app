/**
 * KeyManager: Handles API Key Rotation to prevent Rate Limiting.
 * Strategy: Random Selection (Stateless & Robust)
 */

class KeyManager {
  constructor() {
    this.groqKeys = this._loadGroqKeys();
    this.amadeusKeys = this._loadAmadeusKeys();
  }

  // --- INTERNAL LOADERS ---

  _loadGroqKeys() {
    const raw = import.meta.env.VITE_GROQ_API_KEYS || "";
    // Split by comma, trim whitespace, and filter out empty strings
    const keys = raw.split(',').map(k => k.trim()).filter(k => k.length > 0);
    
    if (keys.length === 0) console.warn("⚠️ No Groq Keys found in .env");
    return keys;
  }

  _loadAmadeusKeys() {
    const keys = [];
    let i = 1;
    // Loop through numbered variables until we don't find one
    while (import.meta.env[`VITE_AMADEUS_CLIENT_ID_${i}`]) {
      keys.push({
        clientId: import.meta.env[`VITE_AMADEUS_CLIENT_ID_${i}`],
        clientSecret: import.meta.env[`VITE_AMADEUS_CLIENT_SECRET_${i}`]
      });
      i++;
    }

    if (keys.length === 0) console.warn("⚠️ No Amadeus Key Pairs found in .env");
    return keys;
  }

  // --- PUBLIC GETTERS ---

  /**
   * Returns a random Groq API Key from the pool.
   */
  getGroqKey() {
    if (this.groqKeys.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * this.groqKeys.length);
    return this.groqKeys[randomIndex];
  }

  /**
   * Returns a random Amadeus Client/Secret pair.
   */
  getAmadeusPair() {
    if (this.amadeusKeys.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * this.amadeusKeys.length);
    return this.amadeusKeys[randomIndex];
  }
}

// Export a singleton instance
export const keyManager = new KeyManager();