import Groq from "groq-sdk";
import Amadeus from "amadeus";
import dotenv from 'dotenv';

dotenv.config();

// --- 1. CONFIGURATION & ROLES ---
export const AgentRole = {
  ARCHITECT: "ARCHITECT",
  TRANSFER: "TRANSFER",
  CONCIERGE: "CONCIERGE",
  GUIDE: "GUIDE",
  CFO: "CFO",
};

const getEnvVar = (key) => {
  const value = process.env[key];
  if (!value) console.warn(`⚠️ Missing Key: ${key}`);
  return value;
};

// ... [Keep Key Arrays & KeyManager Class exactly as before] ...
// (I am skipping the KeyManager code block here to save space, 
// KEEP the KeyManager class you already pasted!)

const GROQ_KEYS = [
  { id: "groq-a", key: getEnvVar("GROQ_KEY_A"), roles: [AgentRole.ARCHITECT], tier: 1 },
  { id: "groq-b", key: getEnvVar("GROQ_KEY_B"), roles: [AgentRole.TRANSFER], tier: 1 },
  { id: "groq-c", key: getEnvVar("GROQ_KEY_C"), roles: [AgentRole.CONCIERGE], tier: 2 },
  { id: "groq-d", key: getEnvVar("GROQ_KEY_D"), roles: [AgentRole.GUIDE], tier: 2 },
  { id: "groq-e", key: getEnvVar("GROQ_KEY_E"), roles: [AgentRole.CFO], tier: 3, isReserve: true },
];

const AMADEUS_KEYS = [
  { id: "ama-1", clientId: getEnvVar("AMA_ID_1"), clientSecret: getEnvVar("AMA_SEC_1"), scope: "FLIGHTS" },
  { id: "ama-2", clientId: getEnvVar("AMA_ID_2"), clientSecret: getEnvVar("AMA_SEC_2"), scope: "HOTELS" },
];

class KeyManager {
  constructor() {
    this.keyHealth = new Map();
    this.MAX_ERRORS = 3;
    GROQ_KEYS.forEach((k) => this.keyHealth.set(k.id, { errors: 0, isBlocked: false }));
  }

  getGroqClient(role) {
    const primary = GROQ_KEYS.find((k) => k.roles.includes(role));
    // Simple logic for brevity - using primary or reserve
    const keyData = (primary && !this.keyHealth.get(primary.id).isBlocked) 
        ? primary 
        : GROQ_KEYS.find(k => k.isReserve);
    
    return { 
        client: new Groq({ apiKey: keyData.key }), 
        keyId: keyData.id 
    };
  }
  
  getAmadeusClient(scope) {
      const k = AMADEUS_KEYS.find(k => k.scope === scope) || AMADEUS_KEYS[0];
      return new Amadeus({ clientId: k.clientId, clientSecret: k.clientSecret });
  }

  reportSuccess(id) { /* ... keep existing ... */ }
  reportFailure(id, err) { /* ... keep existing ... */ }
}

export const keyManager = new KeyManager();

// --- 3. PUBLIC ROUTER FUNCTION (WITH LOGGING) ---
export async function runAgent(role, systemPrompt, userContent) {
  const { client, keyId } = keyManager.getGroqClient(role);
  
  // 🔥 MODEL SELECTION LOGIC
  const model = role === AgentRole.ARCHITECT ? "llama-3.1-70b-versatile" : "llama-3.1-8b-instant";
  const temp = role === AgentRole.TRANSFER ? 0.0 : 0.7;

  // 📝 TERMINAL LOG: SHOW AGENT ACTIVITY
  console.log(`\n🤖 [AGENT START] Role: ${role}`);
  console.log(`🔑 Key ID: ${keyId}`);
  console.log(`🧠 Model: \x1b[36m${model}\x1b[0m`); // Cyan color for model name

  try {
    const startTime = Date.now();
    const completion = await client.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      model: model,
      temperature: temp,
      response_format: { type: role === AgentRole.ARCHITECT ? "text" : "json_object" }
    });

    const duration = Date.now() - startTime;
    console.log(`✅ [AGENT DONE] Took ${duration}ms`);
    
    keyManager.reportSuccess(keyId);
    return completion.choices[0]?.message?.content;

  } catch (error) {
    console.error(`💥 [AGENT FAIL] Error on ${keyId}:`, error.message);
    keyManager.reportFailure(keyId, error);
    throw error;
  }
}