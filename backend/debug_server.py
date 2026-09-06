from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import numpy as np

app = FastAPI()

print("Loading models...")
try:
    checkup_model = joblib.load('checkup_model.pkl')
    print("Checkup model loaded successfully")
except Exception as e:
    print(f"Error loading checkup model: {e}")
    checkup_model = None

class CheckupData(BaseModel):
    bmi: float
    fasting_sugar: float
    cholesterol: float

@app.post("/api/analyze-checkup")
def analyze_checkup(data: CheckupData):
    try:
        print(f"Received request: {data}")
        
        if checkup_model is None:
            return {"error": "Model not loaded"}
        
        features = np.array([[data.bmi, data.fasting_sugar, data.cholesterol]])
        print(f"Features: {features}")
        
        prediction = checkup_model.predict(features)[0]
        print(f"Prediction: {prediction}")
        
        result = {
            "prediction": str(prediction),
            "prevention_plan": {
                "diet": "Test diet",
                "exercise": "Test exercise", 
                "triage": "Test triage"
            }
        }
        
        print(f"Returning: {result}")
        return result
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        print(traceback.format_exc())
        return {"error": str(e)}

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": checkup_model is not None}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
