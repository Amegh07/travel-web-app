import Groq from "groq-sdk";
import Amadeus from "amadeus";
import dotenv from 'dotenv';

dotenv.config();

// ==========================================
// 🧠 SOTA MODEL CONFIGURATION (Updated)
// ==========================================
const ModelConfig = {
  // 🏆 THE BIG BRAIN: Llama 3.3 70B (DeepSeek was decommissioned by Groq)
  REASONING: "llama-3.3-70b-versatile",

  // ⚡ THE FAST BRAIN: Llama 3.1 8B (Best for sub-second NLP extraction and chat)
  FAST: "llama-3.1-8b-instant",

  // ⚖️ THE GENERALIST: Llama 3.3 70B (Excellent for creative descriptions and vibe checking)
  GENERAL: "llama-3.3-70b-versatile"
};

// ==========================================
// 🎯 AGENT ROLE MAPPING
// ==========================================
export const AgentRole = {
  // Key A: Heavy Creative & Routing
  ARCHITECT: "ARCHITECT",   // 👉 Routes to: REASONING
  MAPPING: "MAPPING",     // 👉 Routes to: REASONING

  // Key B: Conversational UI
  GUIDE: "GUIDE",       // 👉 Routes to: GENERAL
  ROUTER: "ROUTER",      // 👉 Routes to: FAST

  // Key C: Budget Constraints
  CFO: "CFO",         // 👉 Routes to: FAST

  // Key D: Magic Search (FAST for 0.2s speed)
  EXTRACTION: "EXTRACTION",  // 👉 Routes to: FAST

  // Key E: Logistics Auditor (UPGRADED for math validation)
  INSPECTOR: "INSPECTOR"    // 👉 Routes to: REASONING
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
  { id: "groq-d", key: getEnvVar("GROQ_KEY_D"), roles: [AgentRole.EXTRACTION], tier: 1 },
  { id: "groq-e", key: getEnvVar("GROQ_KEY_E"), roles: [AgentRole.INSPECTOR], tier: 1 },
];

const AMADEUS_KEYS = [
  { id: "ama-1", clientId: getEnvVar("AMA_ID_1"), clientSecret: getEnvVar("AMA_SEC_1"), scope: "FLIGHTS" },
  // AMA_ID_2 has a server-side issue (500 errors). Using AMA_ID_1 for Hotels too (byGeocode bypass)
  { id: "ama-hotels", clientId: getEnvVar("AMA_ID_1"), clientSecret: getEnvVar("AMA_SEC_1"), scope: "HOTELS" },
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

// --- 3. PUBLIC ROUTER FUNCTION (WITH 429 FALLBACK) ---
export async function runAgent(role, systemPrompt, userContent) {
  const { client, keyId } = keyManager.getGroqClient(role);

  // 🔀 DYNAMIC MODEL ROUTER
  let model = ModelConfig.FAST;
  let temp = 0.7;
  let maxTokens = 1500; // Default for fast agents

  // 1. Heavy Auditing & Planning (DeepSeek-R1)
  if (role === AgentRole.ARCHITECT || role === AgentRole.MAPPING || role === AgentRole.INSPECTOR) {
    model = ModelConfig.REASONING;
    temp = 0.1;
    maxTokens = 4096; // Heavy agents need more output room
  }
  // 2. Creative Guidance (Llama 3.3 70B)
  else if (role === AgentRole.GUIDE) {
    model = ModelConfig.GENERAL;
    temp = 0.6;
    maxTokens = 2048;
  }
  // 3. Extraction & CFO & Router (Llama 3.1 8B — defaults above)

  console.log(`🚀 Booting Agent: [${role}] using Key [${keyId}] on Model [${model}]`);

  // 🛡️ HELPER: Make the API call with timeout
  const callGroq = async (mdl, tp, tokens) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s hard timeout

    try {
      const completion = await client.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        model: mdl,
        temperature: tp,
        max_tokens: tokens,
        response_format: { type: "json_object" }
      }, { signal: controller.signal });

      return completion.choices[0]?.message?.content;
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    // PRIMARY ATTEMPT: Use the assigned model
    return await callGroq(model, temp, maxTokens);
  } catch (error) {
    // 🛡️ SMART 429 FALLBACK: If rate-limited on heavy model, silently retry on FAST
    if (error.status === 429 && model !== ModelConfig.FAST) {
      console.warn(`⚠️ 429 Rate Limit on [${model}]. Falling back to [${ModelConfig.FAST}]...`);
      try {
        return await callGroq(ModelConfig.FAST, 0.5, 1500);
      } catch (fallbackError) {
        console.error(`❌ Fallback also failed (${keyId}):`, fallbackError.message);
        throw fallbackError;
      }
    }
    console.error(`Agent Error (${keyId}):`, error.message);
    throw error;
  }
}

// ==========================================
// 🌊 STREAMING AGENT EXECUTION
// ==========================================
export async function* runAgentStream(role, systemPrompt, userContent) {
  const { client, keyId } = keyManager.getGroqClient(role);

  let model = ModelConfig.FAST;
  let temp = 0.7;
  let maxTokens = 1500;

  if (role === AgentRole.ARCHITECT || role === AgentRole.MAPPING || role === AgentRole.INSPECTOR) {
    model = ModelConfig.REASONING;
    temp = 0.1;
    maxTokens = 4096;
  } else if (role === AgentRole.GUIDE) {
    model = ModelConfig.GENERAL;
    temp = 0.6;
    maxTokens = 2048;
  }

  console.log(`🌊 Booting Streaming Agent: [${role}] using Key [${keyId}] on Model [${model}]`);

  const stream = await client.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent }
    ],
    model: model,
    temperature: temp,
    max_tokens: maxTokens,
    stream: true,
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || "";
    if (text) yield text;
  }
}