import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

const client = new Groq({ apiKey: process.env.GROQ_KEY_A });

async function test() {
    try {
        console.log("Fetching available models on Groq...");
        const res = await client.models.list();
        console.log("MODELS:", res.data.filter(m => m.id.includes("deepseek")).map(m => m.id));
    } catch (e) {
        console.error("ERROR:", e.message);
    }
}
test();
