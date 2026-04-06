import os
from fastapi.testclient import TestClient

# Ensure config reads correctly
from app.main import app
from app.config import get_settings

settings = get_settings()
print(f"Manual Source ID loaded: {settings.manual_source_id}")
if not settings.manual_source_id:
    raise RuntimeError("Missing MANUAL_SOURCE_ID")

client = TestClient(app)

def run_tests():
    print("Testing /api/v1/inspire/import")
    
    headers = {"X-API-Key": settings.internal_api_key}
    
    payload = {
        "urls": [
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ", # Standard YouTube
            "https://paulgraham.com/greatwork.html"       # Standard Article
        ],
        "x_text": "This is a dummy X thread manually typed in the UI.\nIt is certainly longer than 20 characters.",
        "note": "Testing through Fastapi TestClient"
    }

    print("Submitting Payload Phase 3 Step 1: Mixed Content")
    response = client.post("/api/v1/inspire/import", json=payload, headers=headers)
    print("Status:", response.status_code)
    try:
        data = response.json()
        print("Response JSON:")
        import json
        print(json.dumps(data, indent=2))
    except Exception as e:
        print("Failed to decypher JSON", str(e))
        print("Raw text:", response.text)

if __name__ == "__main__":
    run_tests()
