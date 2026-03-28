import Groq from "groq-sdk";
import Amadeus from "amadeus";
import dotenv from 'dotenv';

dotenv.config();

// ==========================================
// 🧠 SOTA MODEL CONFIGURATION (Updated)
// ==========================================
const ModelConfig = {
  // 🏆 Best for complex JSON itinerary plans
  REASONING: "llama-3.3-70b-versatile",

  // ⚡ Best for fast chat, NLP extraction, routing
  FAST: "llama-3.1-8b-instant",

  // 🧠 Generalist fallback
  GENERAL: "llama-3.1-8b-instant"
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
  INSPECTOR: "INSPECTOR",   // 👉 Routes to: REASONING

  // Special Status: Rate Limit Bypass
  FALLBACK: "FALLBACK"
};

// Helper to safely get keys
const getEnvVar = (key) => {
  const value = process.env[key];
  if (!value) console.warn(`⚠️ Missing Environment Variable: ${key}`);
  return value;
};

// Key definitions
const GROQ_KEYS = [
  { id: "groq-a", key: getEnvVar("GROQ_KEY_A"), roles: [AgentRole.ARCHITECT, AgentRole.MAPPING] },
  { id: "groq-b", key: getEnvVar("GROQ_KEY_B"), roles: [AgentRole.GUIDE, AgentRole.ROUTER, AgentRole.EXTRACTION] },
  { id: "groq-c", key: getEnvVar("GROQ_KEY_C"), roles: [AgentRole.CFO] },
  { id: "groq-e", key: getEnvVar("GROQ_KEY_E"), roles: [AgentRole.INSPECTOR] },
  { id: "groq-fallback", key: getEnvVar("GROQ_KEY_FALLBACK"), roles: [AgentRole.FALLBACK] },
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
      : GROQ_KEYS.find(k => k.key && !this.keyHealth.get(k.id)?.isBlocked);

    if (!keyData?.key) throw new Error(`No available Groq Key for role: ${role}`);

    return {
      client: new Groq({ apiKey: keyData.key, timeout: 300000 }), // 5-minute timeout for heavy reasoning tasks
      keyId: keyData.id
    };
  }

  getAmadeusClient(scope) {
    const k = AMADEUS_KEYS.find(k => k.scope === scope) || AMADEUS_KEYS[0];
    return new Amadeus({ clientId: k.clientId, clientSecret: k.clientSecret });
  }

  reportFailure(id, err) {
    console.error(`Key Error ${id}:`, err.message);
    const health = this.keyHealth.get(id);
    if (health) {
      health.errors += 1;
      if (err.status === 429 || health.errors >= 3) {
        health.isBlocked = true;
        setTimeout(() => { health.isBlocked = false; health.errors = 0; }, 60000);
      }
    }
  }
}

export const keyManager = new KeyManager();

// --- 🛠️ HELPER: AGENT CONFIGURATION ---
function getAgentConfig(role) {
  if (role === AgentRole.ARCHITECT || role === AgentRole.MAPPING || role === AgentRole.INSPECTOR || role === AgentRole.EXTRACTION) {
    return { model: ModelConfig.REASONING, temp: 0.1, maxTokens: 32768 };
  }
  if (role === AgentRole.GUIDE) {
    return { model: ModelConfig.GENERAL, temp: 0.6, maxTokens: 2048 };
  }
  return { model: ModelConfig.FAST, temp: 0.7, maxTokens: 1500 };
}

// --- 3. PUBLIC ROUTER FUNCTION (WITH 429 FALLBACK) ---
export async function runAgent(role, systemPrompt, userContent, history = []) {
  const { client, keyId } = keyManager.getGroqClient(role);
  const { model, temp, maxTokens } = getAgentConfig(role);

  console.log(`🚀 Booting Agent: [${role}] using Key [${keyId}] on Model [${model}]`);

  // Build message array: system + up to last 10 history turns + current user message
  const historyMessages = (Array.isArray(history) ? history : [])
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-10) // Limit to last 10 messages to avoid token overflow
    .map(m => ({ role: m.role, content: m.text || '' }));

  // 🛡️ HELPER: Make the API call with timeout
  const callGroq = async (mdl, tp, tokens) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s hard timeout

    try {
      const completion = await client.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          ...historyMessages,
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
    // 🛡️ SMART 429 FALLBACK: If rate-limited on heavy model
    if (error.status === 429) {
      const fallbackKey = process.env.GROQ_KEY_FALLBACK;
      const fallbackModel = fallbackKey ? model : ModelConfig.FAST;
      console.warn(`⚠️ 429 Rate Limit on [${model}]. Falling back with ${fallbackKey ? 'NEW KEY' : 'DOWNGRADE'} to [${fallbackModel}]...`);
      try {
        if (fallbackKey) {
          const fallbackClient = new (await import('groq-sdk')).default({ apiKey: fallbackKey, timeout: 300000 });
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 20000); // 20s hard timeout
          try {
            const completion = await fallbackClient.chat.completions.create({
              messages: [{ role: "system", content: systemPrompt }, ...historyMessages, { role: "user", content: userContent }],
              model: fallbackModel, temperature: temp, max_tokens: maxTokens, response_format: { type: "json_object" }
            }, { signal: controller.signal });
            return completion.choices[0]?.message?.content;
          } finally { clearTimeout(timeout); }
        } else {
          return await callGroq(ModelConfig.FAST, 0.5, 1500);
        }
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
export async function* runAgentStream(role, systemPrompt, userContent, signal = null) {
  const { client, keyId } = keyManager.getGroqClient(role);
  const { model, temp, maxTokens } = getAgentConfig(role);

  console.log(`🌊 Booting Streaming Agent: [${role}] using Key [${keyId}] on Model [${model}]`);

  const streamOptions = {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent }
    ],
    model: model,
    temperature: temp,
    max_tokens: maxTokens,
    stream: true,
    ...(role === AgentRole.ARCHITECT || role === AgentRole.MAPPING || role === AgentRole.INSPECTOR ? { response_format: { type: "json_object" } } : {})
  };

  try {
    const stream = await client.chat.completions.create(streamOptions, { signal });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      if (text) yield text;
    }
  } catch (error) {
    if (error.name === 'AbortError' || error.constructor.name === 'APIUserAbortError') {
      console.log(`🌊 Stream aborted by client [${role}].`);
      return;
    }
    if (error.status === 429) {
      console.warn(`⚠️ Streaming 429 Rate Limit on [${model}] with Key [${keyId}]. Attempting fallback...`);
      try {
        // Try to use the dedicated fallback key (separate Groq account)
        const fallbackKey = process.env.GROQ_KEY_FALLBACK;
        const fallbackClient = fallbackKey
          ? new (await import('groq-sdk')).default({ apiKey: fallbackKey, timeout: 300000 })
          : keyManager.getGroqClient(AgentRole.CFO).client;
          
        // If they provided a fresh fallback key, maintain the requested high-power model.
        // Otherwise, defensively downgrade to 8B to survive the aggressive rate limit.
        const fallbackModel = fallbackKey ? model : ModelConfig.FAST;
        
        console.warn(`♻️ Using ${fallbackKey ? 'dedicated fallback key (new account)' : 'downgraded 8B model'} → [${fallbackModel}]`);
        
        const fallbackTokens = fallbackModel === ModelConfig.REASONING ? 32768 : 8192;
        const fallbackOptions = { ...streamOptions, model: fallbackModel, max_tokens: fallbackTokens };
        const fallbackStream = await fallbackClient.chat.completions.create(fallbackOptions, { signal });

        for await (const chunk of fallbackStream) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) yield text;
        }
        return;
      } catch (fallbackError) {
        console.error(`❌ Streaming Fallback also failed (${keyId}):`, fallbackError.message);
        throw fallbackError;
      }
    }
    console.error(`Streaming Agent Error (${keyId}):`, error.message);
    throw error;
  }
}