import Groq from "groq-sdk";
import Amadeus from "amadeus";
import dotenv from 'dotenv';

dotenv.config();

// --- 1. MODEL CONFIGURATION ---
// Defines which brain to use for which task
const ModelConfig = {
  PLANNER:   "llama-3.3-70b-versatile", // The "Big Brain" (Architect & Mapping)
  FAST:      "llama-3.1-8b-instant",    // The "Speedy Assistant" (Guide, CFO, Router)
};

export const AgentRole = {
  ARCHITECT: "ARCHITECT", // Uses PLANNER model
  MAPPING:   "MAPPING",   // Uses PLANNER model
  GUIDE:     "GUIDE",     // Uses FAST model
  CFO:       "CFO",       // Uses FAST model
  ROUTER:    "ROUTER",    // Uses FAST model
};

// Helper to safely get keys
const getEnvVar = (key) => {
  const value = process.env[key];
  if (!value) console.warn(`⚠️ Missing Environment Variable: ${key}`);
  return value;
};

// Key definitions
const GROQ_KEYS = [
  { id: "groq-a", key: getEnvVar("GROQ_KEY_A"), roles: [AgentRole.ARCHITECT, AgentRole.MAPPING], tier: 1 },
  { id: "groq-b", key: getEnvVar("GROQ_KEY_B"), roles: [AgentRole.GUIDE, AgentRole.ROUTER], tier: 1 },
  { id: "groq-c", key: getEnvVar("GROQ_KEY_C"), roles: [AgentRole.CFO], tier: 2 },
  { id: "groq-reserve", key: getEnvVar("GROQ_KEY_D"), roles: [], tier: 3, isReserve: true },
];

const AMADEUS_KEYS = [
  { id: "ama-1", clientId: getEnvVar("AMA_ID_1"), clientSecret: getEnvVar("AMA_SEC_1"), scope: "FLIGHTS" },
  { id: "ama-2", clientId: getEnvVar("AMA_ID_2"), clientSecret: getEnvVar("AMA_SEC_2"), scope: "HOTELS" },
];

// --- 2. KEY MANAGER ---
class KeyManager {
  constructor() {
    this.keyHealth = new Map();
    GROQ_KEYS.forEach((k) => this.keyHealth.set(k.id, { errors: 0, isBlocked: false }));
  }

  getGroqClient(role) {
    // Find a key assigned to this role
    const primary = GROQ_KEYS.find((k) => k.roles.includes(role));
    
    // Fallback to reserve if primary is missing or blocked
    const keyData = (primary && !this.keyHealth.get(primary.id)?.isBlocked) 
        ? primary 
        : GROQ_KEYS.find(k => k.isReserve);
    
    if (!keyData?.key) throw new Error(`No available Groq Key for role: ${role}`);

    return { 
        client: new Groq({ apiKey: keyData.key }), 
        keyId: keyData.id 
    };
  }
  
  getAmadeusClient(scope) {
      const k = AMADEUS_KEYS.find(k => k.scope === scope) || AMADEUS_KEYS[0];
      return new Amadeus({ clientId: k.clientId, clientSecret: k.clientSecret });
  }

  reportFailure(id, err) { console.error(`Key Error ${id}:`, err.message); }
}

export const keyManager = new KeyManager();

// --- 3. PUBLIC ROUTER FUNCTION ---
export async function runAgent(role, systemPrompt, userContent) {
  const { client, keyId } = keyManager.getGroqClient(role);
  
  // Select Model based on Role
  let model = ModelConfig.FAST;
  let temp = 0.7;

  if (role === AgentRole.ARCHITECT || role === AgentRole.MAPPING) {
      model = ModelConfig.PLANNER;
      temp = 0.4; // Lower temp for precise planning
  }

  try {
    const completion = await client.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      model: model,
      temperature: temp,
      response_format: { type: "json_object" } // Force JSON for all agents
    });
    return completion.choices[0]?.message?.content;
  } catch (error) {
    console.error(`Agent Error (${keyId}):`, error.message);
    throw error;
  }
}