import requests
import os
from dotenv import load_dotenv

# Load your Travex .env file
load_dotenv()

def test_agent(agent_name, env_key):
    api_key = os.getenv(env_key)
    print(f"🤖 Testing {agent_name} Agent ({env_key})...")
    
    if not api_key:
        print(f"   ❌ ERROR: {env_key} is missing in your .env file!\n")
        return

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    data = {
        "model": "llama-3.1-8b-instant",
        "messages": [{"role": "user", "content": f"You are the {agent_name}. Confirm you are online."}]
    }

    try:
        res = requests.post(url, json=data, headers=headers, timeout=10)
        if res.status_code == 200:
            print(f"   ✅ SUCCESS: {agent_name} is active.")
            print(f"   🤖 Response: {res.json()['choices'][0]['message']['content'][:60]}...\n")
        else:
            print(f"   ❌ FAILED: Status {res.status_code}. Check if this key is valid in Groq Console.\n")
    except Exception as e:
        print(f"   ❌ CONNECTION ERROR: {str(e)}\n")

# Run the suite
print("-" * 40)
print("🚀 TRAVEX MULTI-AGENT DIAGNOSTIC")
print("-" * 40)

test_agent("Main Concierge", "VITE_GROQ_API_KEY")
test_agent("Itinerary Architect", "VITE_GROQ_ARCHITECT_KEY")
test_agent("Budget CFO", "VITE_GROQ_CFO_KEY")
test_agent("Local Guide", "VITE_GROQ_GUIDE_KEY")

print("-" * 40)