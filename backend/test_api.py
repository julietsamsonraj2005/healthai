import requests
import json

def test_api():
    base_url = "http://localhost:8000"
    
    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/api/health")
        print(f"Health check: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Health check failed: {e}")
        return
    
    # Test analyze-checkup endpoint
    try:
        data = {"bmi": 23, "fasting_sugar": 160, "cholesterol": 180}
        response = requests.post(f"{base_url}/api/analyze-checkup", json=data)
        print(f"Analyze checkup: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Analyze checkup failed: {e}")

if __name__ == "__main__":
    test_api()
