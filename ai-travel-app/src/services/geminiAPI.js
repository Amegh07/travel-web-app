// Hugging Face only AI module
// - Uses HF Inference API with fallback across several open models
// - Set HF API key in import.meta.env.VITE_HF_API_KEY

// ---------------------
// Hugging Face model fallbacks (recommended order)
// ---------------------
const HUGGINGFACE_MODELS = [
  "mistralai/Mistral-7B-Instruct-v0.3",
  "tiiuae/falcon-7b-instruct",
  "tiiuae/Falcon3-7B-Instruct",
  "meta-llama/Llama-2-13b-chat-hf"
];

// ---------------------
// Retry / backoff config
// ---------------------
const CONFIG = {
  maxRetries: 2,
  initialDelay: 1000,
  maxDelay: 5000,
  hfApiUrlBase: "https://api-inference.huggingface.co/models"
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async (fn, retries = CONFIG.maxRetries) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      const delay = Math.min(CONFIG.initialDelay * Math.pow(2, i), CONFIG.maxDelay);
      await wait(delay);
    }
  }
};

// ---------------------
// Low-level HF call for a single model
// ---------------------
async function callHuggingFaceModel(modelId, prompt) {
  const url = `${CONFIG.hfApiUrlBase}/${encodeURIComponent(modelId)}`;
  const headers = {
    "Authorization": `Bearer ${import.meta.env.VITE_HF_API_KEY}`,
    "Content-Type": "application/json"
  };

  // Standard inference payload - HF will adapt depending on model
  const body = {
    inputs: prompt,
    parameters: {
      max_new_tokens: 512,
      temperature: 0.7,
      top_p: 0.8
    }
  };

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  const text = await resp.text();

  // Try parse JSON (HF sometimes returns JSON even for errors)
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }

  if (!resp.ok) {
    // If HF returns error JSON like { "error": "..." }
    const errMsg = (data && data.error) ? data.error : `Status ${resp.status} - ${text}`;
    throw new Error(`HF inference error for ${modelId}: ${errMsg}`);
  }

  // Extract generated text in common shapes:
  //  - { "generated_text": "..." }
  //  - [ { "generated_text": "..." } ]
  //  - { "choices": [ { "text": "..." } ] } (some Spaces/wrappers)
  //  - plain string
  let out = "";

  if (typeof data === "string") {
    out = data;
  } else if (Array.isArray(data) && data[0]?.generated_text) {
    out = data[0].generated_text;
  } else if (data?.generated_text) {
    out = data.generated_text;
  } else if (data?.choices && Array.isArray(data.choices) && data.choices[0]?.text) {
    out = data.choices[0].text;
  } else if (data?.error) {
    throw new Error(`HF model returned error: ${data.error}`);
  } else {
    // As a last resort, try to stringify the whole response
    out = typeof data === "object" ? JSON.stringify(data) : String(data);
  }

  if (!out || out.trim().length < 5) {
    throw new Error(`HF model ${modelId} returned empty response`);
  }

  return out;
}

// ---------------------
// Top-level: try HF models in order with fallback
// ---------------------
export async function callAI(prompt) {
  // iterate across HUGGINGFACE_MODELS
  for (let i = 0; i < HUGGINGFACE_MODELS.length; i++) {
    const modelId = HUGGINGFACE_MODELS[i];
    console.log(`🔁 Trying Hugging Face model: ${modelId}`);

    try {
      // withRetry will retry transient network issues
      const out = await withRetry(() => callHuggingFaceModel(modelId, prompt));
      console.log(`✅ Success with ${modelId}`);
      return out;
    } catch (err) {
      console.warn(`❌ Model ${modelId} failed: ${err.message}`);
      // try next model
      await wait(300);
    }
  }

  throw new Error("All Hugging Face models failed");
}

// ---------------------
// Your exported travel helpers (same API your app expects)
// ---------------------
export async function generateItinerary(destination, duration, preferences) {
  const prompt = `
Create a detailed travel itinerary for ${destination} for ${duration} days.

Traveler preferences: ${preferences}

Please provide:
1. Day-by-day schedule with timings
2. Must-visit attractions
3. Restaurant recommendations
4. Accommodation suggestions
5. Transportation tips
6. Estimated daily budget
7. Cultural notes and tips
8. Packing suggestions

Format the response clearly.
  `;
  return callAI(prompt);
}

export async function generatePackingList(destination, duration, season) {
  const prompt = `Create a comprehensive packing list for a ${duration}-day trip to ${destination} during ${season}. Include clothing, toiletries, electronics, documents, and any special items.`;
  return callAI(prompt);
}

export async function generateTravelTips(destination, travelerType) {
  const prompt = `Provide essential travel tips for ${destination} for a ${travelerType} traveler. Include safety, etiquette, money-saving tips, and local insights.`;
  return callAI(prompt);
}

export async function generateBudget(destination, duration, budgetType) {
  const prompt = `Create a detailed budget breakdown for a ${duration}-day trip to ${destination} for a ${budgetType} traveler. Include accommodation, food, transportation, activities, and misc costs.`;
  return callAI(prompt);
}

// ---------------------
// Health-check & debug
// ---------------------
export async function checkAPIs() {
  try {
    const test = await callAI('Say "OK"');
    return {
      huggingface: {
        status: test.includes("OK") ? "working" : "unexpected",
        sample: test.substring(0, 120)
      }
    };
  } catch (e) {
    return {
      huggingface: {
        status: "failed",
        error: e.message
      }
    };
  }
}

export function listAvailableModels() {
  console.log("📋 Hugging Face model fallback order:");
  HUGGINGFACE_MODELS.forEach(m => console.log(" •", m));
}
