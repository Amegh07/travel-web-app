import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import Amadeus from 'amadeus';

dotenv.config();

const results = [];

function log(name, status, detail = '') {
  const line = `[${status}] ${name}${detail ? ' -- ' + detail : ''}`;
  process.stdout.write(line + '\n');
  results.push({ name, status, detail });
}

async function checkGroqKey(label, key) {
  if (!key || key.startsWith('your_')) { log(label, 'SKIP', 'Key not set'); return; }
  try {
    const groq = new Groq({ apiKey: key });
    const res = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: 'Reply with OK' }],
      max_tokens: 5,
    });
    log(label, 'PASS', `Reply: "${res.choices?.[0]?.message?.content?.trim()}"`);
  } catch (err) { log(label, 'FAIL', err.message?.split('\n')[0]); }
}

async function checkAmadeus(label, id, secret) {
  if (!id || !secret) { log(label, 'SKIP', 'Credentials not set'); return; }
  try {
    const amadeus = new Amadeus({ clientId: id, clientSecret: secret });
    const res = await amadeus.referenceData.locations.get({ keyword: 'London', subType: 'CITY,AIRPORT' });
    log(label, 'PASS', `Got ${res.data?.length} location(s)`);
  } catch (err) { log(label, 'FAIL', err.description?.[0]?.detail || err.message?.split('\n')[0]); }
}

async function checkUnsplash(label, key) {
  if (!key || key.startsWith('your_')) { log(label, 'SKIP', 'Key not set'); return; }
  try {
    const res = await fetch(`https://api.unsplash.com/photos/random?query=travel&count=1`, {
      headers: { Authorization: `Client-ID ${key}` },
    });
    if (res.ok) { log(label, 'PASS', `HTTP ${res.status}`); }
    else { const b = await res.json().catch(() => ({})); log(label, 'FAIL', b.errors?.[0] || `HTTP ${res.status}`); }
  } catch (err) { log(label, 'FAIL', err.message); }
}

async function checkTicketmaster(label, key) {
  if (!key || key.startsWith('your_')) { log(label, 'SKIP', 'Key not set'); return; }
  try {
    const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?apikey=${key}&city=London&size=1`);
    const data = await res.json();
    if (res.ok && !data.fault) {
      log(label, 'PASS', `Got ${data._embedded?.events?.length ?? 0} event(s)`);
    } else {
      log(label, 'FAIL', data.fault?.faultstring || data.errors?.[0]?.detail || `HTTP ${res.status}`);
    }
  } catch (err) { log(label, 'FAIL', err.message); }
}

async function checkGemini(key) {
  if (!key || key === 'your_gemini_key') { log('Gemini (Backup AI)', 'SKIP', 'Placeholder key'); return; }
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    if (res.ok) { log('Gemini (Backup AI)', 'PASS', 'Reachable'); }
    else { const b = await res.json().catch(() => ({})); log('Gemini (Backup AI)', 'FAIL', b.error?.message || `HTTP ${res.status}`); }
  } catch (err) { log('Gemini (Backup AI)', 'FAIL', err.message); }
}

async function checkHuggingFace(key) {
  if (!key || key === 'your_hf_key') { log('HuggingFace (Legacy)', 'SKIP', 'Placeholder key'); return; }
  try {
    const res = await fetch('https://huggingface.co/api/whoami-v2', { headers: { Authorization: `Bearer ${key}` } });
    if (res.ok) { const u = await res.json(); log('HuggingFace (Legacy)', 'PASS', `User: ${u.name}`); }
    else { log('HuggingFace (Legacy)', 'FAIL', `HTTP ${res.status}`); }
  } catch (err) { log('HuggingFace (Legacy)', 'FAIL', err.message); }
}

process.stdout.write('\n=== TRAVEX API HEALTH CHECK ===\n\n');

await checkGroqKey('Groq Key A (Architect)',      process.env.GROQ_KEY_A);
await checkGroqKey('Groq Key B (Transfer)',       process.env.GROQ_KEY_B);
await checkGroqKey('Groq Key C (Concierge)',      process.env.GROQ_KEY_C);
await checkGroqKey('Groq Key D (Guide)',          process.env.GROQ_KEY_D);
await checkGroqKey('Groq Key E (CFO/Backup)',     process.env.GROQ_KEY_E);
await checkGroqKey('Groq Key FALLBACK',           process.env.GROQ_KEY_FALLBACK);

await checkAmadeus('Amadeus Pair 1 (Flights)',    process.env.AMA_ID_1,  process.env.AMA_SEC_1);
await checkAmadeus('Amadeus Pair 2 (Hotels)',     process.env.AMA_ID_2,  process.env.AMA_SEC_2);

await checkUnsplash('Unsplash Server Key',        process.env.UNSPLASH_ACCESS_KEY);
await checkUnsplash('Unsplash VITE Key',          process.env.VITE_UNSPLASH_ACCESS_KEY);

await checkTicketmaster('Ticketmaster API Key',   process.env.TICKETMASTER_API_KEY);
await checkTicketmaster('Ticketmaster Alt Key',   process.env.TICKETMASTER_KEY);

await checkGemini(process.env.GEMINI_API_KEY);
await checkHuggingFace(process.env.HUGGINGFACE_API_KEY);

const passed  = results.filter(r => r.status === 'PASS').length;
const failed  = results.filter(r => r.status === 'FAIL').length;
const skipped = results.filter(r => r.status === 'SKIP').length;

process.stdout.write(`\n=== SUMMARY: ${passed} PASSED | ${failed} FAILED | ${skipped} SKIPPED ===\n\n`);

if (failed > 0) {
  process.stdout.write('FAILED APIs:\n');
  results.filter(r => r.status === 'FAIL').forEach(r => process.stdout.write(`  - ${r.name}: ${r.detail}\n`));
  process.stdout.write('\n');
}
if (skipped > 0) {
  process.stdout.write('SKIPPED (placeholder keys):\n');
  results.filter(r => r.status === 'SKIP').forEach(r => process.stdout.write(`  - ${r.name}\n`));
  process.stdout.write('\n');
}
