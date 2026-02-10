import requests
import os
from dotenv import load_dotenv

# Load the .env from the root
load_dotenv()

def test_amadeus():
    print("-" * 30)
    print("✈️ AMADEUS ROOT DIAGNOSTIC")
    print("-" * 30)

    key = os.getenv("VITE_AMADEUS_FLIGHT_KEY")
    secret = os.getenv("VITE_AMADEUS_FLIGHT_SECRET")

    if not key or not secret:
        print("❌ ERROR: Amadeus keys not found in root .env!")
        return

    url = "https://test.api.amadeus.com/v1/security/oauth2/token"
    data = {
        "grant_type": "client_credentials",
        "client_id": key,
        "client_secret": secret
    }

    try:
        res = requests.post(url, data=data, timeout=10)
        if res.status_code == 200:
            print("✅ SUCCESS: Amadeus keys are valid!")
            print(f"🔑 Token: {res.json()['access_token'][:15]}...")
        else:
            print(f"❌ FAILED: Status {res.status_code}")
            print(f"📝 Reason: {res.json().get('error_description')}")
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")

if __name__ == "__main__":
    test_amadeus()