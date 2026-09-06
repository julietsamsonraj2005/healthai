from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
import joblib
import numpy as np
import re
from datetime import datetime, timedelta
from typing import Literal
import bcrypt
import jwt
from pymongo import MongoClient

app = FastAPI()

# In-memory storage for demonstration (in production, use a database)
checkup_storage = []
symptom_storage = []

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
import os
try:
    from pymongo import MongoClient
    MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
    DB_NAME = 'healthai'
    COLLECTION_NAME = 'prevention_protocols'
    USERS_COLLECTION = 'users'
    
    client = MongoClient(MONGODB_URI)
    db = client[DB_NAME]
    prevention_collection = db[COLLECTION_NAME]
    users_collection = db[USERS_COLLECTION]
    print("✅ Connected to MongoDB successfully")
    mongodb_connected = True
except Exception as e:
    print(f"⚠️ MongoDB connection failed: {e}")
    prevention_collection = None
    users_collection = None
    mongodb_connected = False

# JWT Secret
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-here-change-in-production')
JWT_ALGORITHM = 'HS256'

# Pydantic Models for Authentication
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., pattern=r'^[^@]+@[^@]+\.[^@]+$')
    password: str = Field(..., min_length=6)
    age: int = Field(..., ge=1, le=120)
    gender: Literal["male", "female", "other"]

class UserLogin(BaseModel):
    email: str = Field(..., pattern=r'^[^@]+@[^@]+\.[^@]+$')
    password: str = Field(..., min_length=1)

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    age: int
    gender: str
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# ── Authentication Endpoints ──
@app.post("/api/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user: UserRegister):
    """Register a new user with secure password hashing"""
    try:
        if users_collection is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database connection not available"
            )
        
        # Check if user already exists
        existing_user = users_collection.find_one({"email": user.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password securely
        hashed_password = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Create user document
        user_doc = {
            "full_name": user.name,
            "email": user.email,
            "password": hashed_password,
            "age": user.age,
            "gender": user.gender,
            "created_at": datetime.utcnow()
        }
        
        # Insert into database
        result = users_collection.insert_one(user_doc)
        
        # Return user without password
        response_user = {
            "id": str(result.inserted_id),
            "name": user.name,
            "email": user.email,
            "age": user.age,
            "gender": user.gender,
            "created_at": user_doc["created_at"]
        }
        
        print(f"✅ User registered: {user.email}")
        return response_user
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed due to server error"
        )

@app.post("/api/login", response_model=TokenResponse)
def login_user(user: UserLogin):
    """Authenticate user and return JWT token"""
    try:
        if users_collection is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database connection not available"
            )
        
        # Find user by email
        db_user = users_collection.find_one({"email": user.email})
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Verify password
        if not bcrypt.checkpw(user.password.encode('utf-8'), db_user["password"].encode('utf-8')):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Generate JWT token
        token_data = {
            "sub": db_user["email"],
            "user_id": str(db_user["_id"]),
            "exp": datetime.utcnow() + timedelta(hours=24)
        }
        
        try:
            access_token = jwt.encode(token_data, JWT_SECRET, algorithm=JWT_ALGORITHM)
        except Exception as jwt_error:
            print(f"❌ JWT encoding error: {jwt_error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Token generation failed"
            )
        
        # Return token and user info with proper field validation
        response_user = {
            "id": str(db_user["_id"]),
            "name": db_user.get("full_name", db_user.get("name", "Unknown User")),
            "email": db_user["email"],
            "age": db_user.get("age", 0),
            "gender": db_user.get("gender", "other"),
            "created_at": db_user.get("created_at", db_user.get("createdAt", datetime.utcnow()))
        }
        
        print(f"✅ User logged in: {user.email}")
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": response_user
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed due to server error"
        )

# ── Get User Profile ──
@app.get("/api/user/profile", response_model=UserResponse)
def get_user_profile():
    """Get current user profile (protected endpoint)"""
    try:
        # This would need JWT middleware in production
        # For now, return mock user data
        return {
            "id": "mock_user_id",
            "name": "John Doe",
            "email": "john.doe@example.com",
            "age": 30,
            "gender": "male",
            "created_at": datetime.utcnow()
        }
    except Exception as e:
        print(f"❌ Profile error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load user profile"
        )

# 1. Load the pre-trained models (The "Brains")
print("Loading saved AI models...")
try:
    checkup_model = joblib.load('checkup_model.pkl')
    vectorizer = joblib.load('tfidf_vectorizer.pkl')
    symptom_model = joblib.load('symptom_model.pkl')
    print("✅ All models loaded successfully")
except Exception as e:
    print(f"❌ Error loading models: {e}")
    checkup_model = None
    vectorizer = None
    symptom_model = None

class CheckupData(BaseModel):
    height: float  # in cm
    weight: float  # in kg
    bmi: float
    hemoglobin: float
    fasting_sugar: float
    total_cholesterol: float
    hdl: float
    ldl: float
    triglycerides: float
    creatinine: float
    tsh: float

class SymptomData(BaseModel):
    text: str

# This replaces your ChatMessage.js schema
class ChatMessageModel(BaseModel):
    user_id: str
    type: Literal['coach', 'symptom'] = 'symptom'
    role: Literal['user', 'assistant']
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

@app.post("/api/analyze-checkup")
def analyze_checkup(data: CheckupData):
    try:
        risks = []
        prevention_plans = []
        
        # Clinical Evaluation Logic - Task 1
        
        # 1. Fasting Sugar Evaluation
        if data.fasting_sugar > 125:
            confidence = min(95, 75 + (data.fasting_sugar - 125) * 2)
            risks.append({
                "condition": "Type 2 Diabetes Mellitus",
                "risk_level": "high risk",
                "confidence": f"{confidence:.0f}% confidence",
                "description": f"Fasting blood glucose of {data.fasting_sugar} mg/dL indicates diabetic range (>125 mg/dL). Immediate medical evaluation and comprehensive diabetes management required."
            })
            prevention_plans.append({
                "title": "Diabetes Management Protocol",
                "diet": [
                    "Eliminate refined sugars and simple carbohydrates completely",
                    "Adopt low-glycemic index foods (non-starchy vegetables, legumes, whole grains)",
                    "Control portion sizes - aim for 45-60g carbohydrates per meal",
                    "Increase fiber intake to 25-35g daily through vegetables and whole grains"
                ],
                "exercise": [
                    "150 minutes moderate-intensity aerobic exercise weekly (brisk walking, cycling)",
                    "Resistance training 2-3 times per week to improve insulin sensitivity",
                    "Post-meal walking for 10-15 minutes to reduce glucose spikes"
                ],
                "monitoring": [
                    "Daily fasting blood glucose monitoring",
                    "HbA1c test every 3 months",
                    "Quarterly kidney function tests (eGFR, microalbumin)",
                    "Annual comprehensive eye examination and foot examination"
                ]
            })
        elif data.fasting_sugar >= 100:
            confidence = min(85, 60 + (data.fasting_sugar - 100) * 3)
            risks.append({
                "condition": "Pre-Diabetes",
                "risk_level": "medium risk",
                "confidence": f"{confidence:.0f}% confidence",
                "description": f"Fasting blood glucose of {data.fasting_sugar} mg/dL indicates pre-diabetic range (100-125 mg/dL). Lifestyle intervention can prevent progression to diabetes."
            })
            prevention_plans.append({
                "title": "Pre-Diabetes Reversal Protocol",
                "diet": [
                    "Reduce refined carbohydrate intake by 50%",
                    "Replace white grains with whole grains and legumes",
                    "Limit added sugars to <25g per day",
                    "Increase vegetable intake to 5+ servings daily"
                ],
                "exercise": [
                    "30 minutes moderate exercise 5 days per week",
                    "Weekly strength training sessions",
                    "Daily walking goal of 8,000-10,000 steps"
                ],
                "monitoring": [
                    "Quarterly fasting glucose testing",
                    "HbA1c test every 6 months",
                    "Monthly weight and waist circumference tracking",
                    "Annual lipid panel and blood pressure monitoring"
                ]
            })
        
        # 2. LDL Cholesterol Evaluation
        if data.ldl > 160:
            confidence = min(95, 70 + (data.ldl - 160) * 1.5)
            risks.append({
                "condition": "Elevated LDL Cholesterol",
                "risk_level": "high risk",
                "confidence": f"{confidence:.0f}% confidence",
                "description": f"LDL cholesterol of {data.ldl} mg/dL is in high-risk range (>160 mg/dL). Significantly increased cardiovascular disease risk requiring immediate intervention."
            })
            prevention_plans.append({
                "title": "Intensive Lipid Management Protocol",
                "diet": [
                    "Eliminate trans fats and limit saturated fats to <7% of daily calories",
                    "Add 2-3 servings of fatty fish weekly (omega-3 fatty acids)",
                    "Consume 5-10g soluble fiber daily (oats, beans, apples, citrus)",
                    "Include plant sterols/stanols (2g daily) through fortified foods"
                ],
                "exercise": [
                    "Daily moderate-intensity cardiovascular exercise (45-60 minutes)",
                    "High-intensity interval training 2-3 times weekly",
                    "Aerobic exercise targeting 500-1000 kcal expenditure per session"
                ],
                "monitoring": [
                    "Lipid panel every 4-6 weeks until target LDL <100 mg/dL achieved",
                    "Quarterly lipid monitoring after stabilization",
                    "Annual coronary calcium score for cardiovascular risk assessment",
                    "Regular blood pressure monitoring (weekly initially)"
                ]
            })
        elif data.ldl >= 130:
            confidence = min(80, 55 + (data.ldl - 130) * 2)
            risks.append({
                "condition": "Borderline High LDL Cholesterol",
                "risk_level": "medium risk",
                "confidence": f"{confidence:.0f}% confidence",
                "description": f"LDL cholesterol of {data.ldl} mg/dL is in borderline high range (130-159 mg/dL). Moderate cardiovascular risk requiring lifestyle modification."
            })
            prevention_plans.append({
                "title": "Lipid Optimization Protocol",
                "diet": [
                    "Reduce saturated fat intake to <10% of daily calories",
                    "Increase dietary fiber to 25-30g daily",
                    "Limit dietary cholesterol to <200mg per day",
                    "Incorporate heart-healthy fats (avocado, nuts, olive oil)"
                ],
                "exercise": [
                    "30-45 minutes moderate cardiovascular exercise 5 days weekly",
                    "Regular aerobic activity targeting 300-500 kcal per session",
                    "Include resistance training 2 times weekly"
                ],
                "monitoring": [
                    "Lipid panel every 3 months",
                    "Annual cardiovascular risk assessment",
                    "Quarterly blood pressure checks",
                    "Bi-annual weight and BMI monitoring"
                ]
            })
        
        # 3. Triglycerides Evaluation
        if data.triglycerides > 200:
            confidence = min(90, 65 + (data.triglycerides - 200) * 1.2)
            risks.append({
                "condition": "Hypertriglyceridemia",
                "risk_level": "high risk",
                "confidence": f"{confidence:.0f}% confidence",
                "description": f"Triglycerides of {data.triglycerides} mg/dL indicate high-risk range (>200 mg/dL). Associated with increased pancreatitis and cardiovascular disease risk."
            })
            prevention_plans.append({
                "title": "Triglyceride Management Protocol",
                "diet": [
                    "Eliminate alcohol completely or limit to <1 drink per day",
                    "Reduce simple carbohydrate and sugar intake dramatically",
                    "Limit fructose to <15g daily (avoid sugary beverages, processed foods)",
                    "Increase omega-3 fatty acids (fish oil 2-4g EPA/DHA daily)"
                ],
                "exercise": [
                    "Daily aerobic exercise (45-60 minutes moderate intensity)",
                    "Weight management program targeting 5-10% body weight reduction",
                    "Regular physical activity to improve triglyceride clearance"
                ],
                "monitoring": [
                    "Triglyceride panel every 6-8 weeks until <150 mg/dL",
                    "Quarterly liver function tests (AST, ALT)",
                    "Fasting glucose and HbA1c every 3 months",
                    "Pancreatic enzymes if symptomatic or levels >500 mg/dL"
                ]
            })
        elif data.triglycerides >= 150:
            confidence = min(75, 50 + (data.triglycerides - 150) * 2.5)
            risks.append({
                "condition": "Borderline High Triglycerides",
                "risk_level": "medium risk",
                "confidence": f"{confidence:.0f}% confidence",
                "description": f"Triglycerides of {data.triglycerides} mg/dL are in borderline high range (150-199 mg/dL). Moderate cardiovascular risk requiring dietary intervention."
            })
            prevention_plans.append({
                "title": "Triglyceride Optimization Protocol",
                "diet": [
                    "Reduce added sugar intake to <25g daily",
                    "Limit refined carbohydrates and processed foods",
                    "Increase fiber intake to 25g+ daily",
                    "Include omega-3 rich foods 2-3 times weekly"
                ],
                "exercise": [
                    "30-45 minutes moderate exercise 5 days weekly",
                    "Regular aerobic activity to improve lipid metabolism",
                    "Weight management if BMI >25"
                ],
                "monitoring": [
                    "Triglyceride panel every 3 months",
                    "Annual comprehensive lipid panel",
                    "Quarterly weight and BMI tracking",
                    "Fasting glucose monitoring every 6 months"
                ]
            })
        
        # 4. BMI Evaluation
        if data.bmi > 30:
            confidence = min(95, 70 + (data.bmi - 30) * 3)
            risks.append({
                "condition": "Obesity",
                "risk_level": "high risk",
                "confidence": f"{confidence:.0f}% confidence",
                "description": f"BMI of {data.bmi} indicates obesity (>30). Significantly increased risk of diabetes, cardiovascular disease, hypertension, and certain cancers."
            })
            prevention_plans.append({
                "title": "Comprehensive Weight Management Protocol",
                "diet": [
                    "Create caloric deficit of 500-750 calories daily for 1-2 lbs weekly weight loss",
                    "Focus on high-protein foods (25-30% of calories) for satiety",
                    "Fill half plate with non-starchy vegetables at each meal",
                    "Eliminate liquid calories and limit processed foods"
                ],
                "exercise": [
                    "Start with low-impact cardio (swimming, elliptical) 30 minutes daily",
                    "Progress to 300 minutes moderate exercise weekly as fitness improves",
                    "Include strength training 2-3 times weekly to preserve lean mass",
                    "Aim for 8,000-10,000 steps daily baseline"
                ],
                "monitoring": [
                    "Weekly weight tracking with same scale, same time, same conditions",
                    "Monthly body measurements (waist, hips, body composition if available)",
                    "Quarterly blood pressure and basic metabolic panel",
                    "Annual comprehensive health screening including sleep apnea assessment"
                ]
            })
        elif data.bmi >= 25:
            confidence = min(70, 45 + (data.bmi - 25) * 5)
            risks.append({
                "condition": "Overweight",
                "risk_level": "medium risk",
                "confidence": f"{confidence:.0f}% confidence",
                "description": f"BMI of {data.bmi} indicates overweight (25-29.9). Increased risk of metabolic syndrome, type 2 diabetes, and cardiovascular disease."
            })
            prevention_plans.append({
                "title": "Weight Optimization Protocol",
                "diet": [
                    "Create modest caloric deficit of 300-500 calories daily",
                    "Increase protein intake to 25% of total calories",
                    "Practice portion control and mindful eating techniques",
                    "Replace calorie-dense foods with nutrient-dense alternatives"
                ],
                "exercise": [
                    "150-200 minutes moderate exercise weekly",
                    "Daily walking goal of 7,000-8,000 steps",
                    "Include strength training 2 times weekly",
                    "Add flexibility and balance exercises"
                ],
                "monitoring": [
                    "Bi-weekly weight tracking",
                    "Monthly waist circumference measurement",
                    "Quarterly blood pressure checks",
                    "Annual lipid panel and glucose testing"
                ]
            })
        
        # 5. TSH Evaluation
        if data.tsh > 4.0:
            confidence = min(85, 60 + (data.tsh - 4.0) * 10)
            risks.append({
                "condition": "Hypothyroidism Risk",
                "risk_level": "medium risk",
                "confidence": f"{confidence:.0f}% confidence",
                "description": f"TSH of {data.tsh} mIU/L is above normal range (>4.0), suggesting possible hypothyroidism. May cause fatigue, weight gain, and metabolic slowing."
            })
            prevention_plans.append({
                "title": "Thyroid Health Optimization Protocol",
                "diet": [
                    "Ensure adequate iodine intake (150mcg daily) through iodized salt or seafood",
                    "Include selenium-rich foods (Brazil nuts 1-2 daily, fish, eggs)",
                    "Avoid excessive soy and cruciferous vegetables if not cooked",
                    "Maintain adequate iron and zinc levels for thyroid hormone synthesis"
                ],
                "exercise": [
                    "Moderate exercise 30 minutes daily (avoid overexertion initially)",
                    "Focus on energy-conserving activities until thyroid function optimized",
                    "Include yoga or gentle stretching for stress management"
                ],
                "monitoring": [
                    "Repeat TSH testing in 6-8 weeks",
                    "Monitor free T4 and T3 levels if TSH remains elevated",
                    "Track symptoms: fatigue, weight changes, temperature intolerance",
                    "Annual thyroid function tests once stabilized"
                ]
            })
        elif data.tsh < 0.4:
            confidence = min(85, 60 + (0.4 - data.tsh) * 15)
            risks.append({
                "condition": "Hyperthyroidism Risk",
                "risk_level": "high risk",
                "confidence": f"{confidence:.0f}% confidence",
                "description": f"TSH of {data.tsh} mIU/L is below normal range (<0.4), suggesting possible hyperthyroidism. May cause anxiety, weight loss, and cardiac complications."
            })
            prevention_plans.append({
                "title": "Hyperthyroidism Management Protocol",
                "diet": [
                    "Avoid iodine-rich foods and supplements",
                    "Increase calcium and vitamin D intake for bone protection",
                    "Eat smaller, more frequent meals to maintain weight",
                    "Limit caffeine and other stimulants"
                ],
                "exercise": [
                    "Low-impact exercise only (walking, gentle yoga)",
                    "Avoid strenuous activity that increases heart rate",
                    "Focus on stress reduction techniques"
                ],
                "monitoring": [
                    "Immediate endocrinology consultation required",
                    "Weekly TSH monitoring initially",
                    "Cardiac evaluation including ECG and heart rate monitoring",
                    "Bone density testing if condition persists >6 months"
                ]
            })
        
        # 6. HDL Cholesterol Evaluation (Low HDL is a risk)
        if data.hdl < 40:
            confidence = min(80, 50 + (40 - data.hdl) * 2)
            risks.append({
                "condition": "Low HDL Cholesterol",
                "risk_level": "medium risk",
                "confidence": f"{confidence:.0f}% confidence",
                "description": f"HDL cholesterol of {data.hdl} mg/dL is below optimal range (<40 mg/dL). Low HDL is an independent cardiovascular risk factor."
            })
            prevention_plans.append({
                "title": "HDL Enhancement Protocol",
                "diet": [
                    "Increase monounsaturated fats (olive oil, avocados, nuts)",
                    "Include fatty fish 2-3 times weekly for omega-3 fatty acids",
                    "Add soluble fiber (oats, beans, apples) to improve HDL",
                    "Avoid trans fats completely and limit refined carbohydrates"
                ],
                "exercise": [
                    "Aerobic exercise 45-60 minutes 5 days weekly",
                    "High-intensity interval training 1-2 times weekly",
                    "Consistent exercise regimen - HDL responds to regular activity"
                ],
                "monitoring": [
                    "HDL measurement every 3 months",
                    "Complete lipid panel quarterly",
                    "Track exercise adherence and intensity",
                    "Annual cardiovascular risk assessment"
                ]
            })
        
        # 7. Blood Pressure Evaluation (estimated from BMI and other factors)
        # Note: This is an estimation since actual BP isn't measured
        if data.bmi > 30:
            estimated_bp_risk = "high" if data.bmi > 35 else "medium"
            risks.append({
                "condition": "Hypertension Risk",
                "risk_level": f"{estimated_bp_risk} risk",
                "confidence": "65% confidence",
                "description": f"Based on BMI of {data.bmi} and metabolic profile, elevated blood pressure risk is present. Regular monitoring recommended."
            })
            prevention_plans.append({
                "title": "Blood Pressure Management Protocol",
                "diet": [
                    "DASH diet approach: limit sodium to <1500mg daily",
                    "Increase potassium-rich foods (bananas, sweet potatoes, spinach)",
                    "Limit processed foods and read nutrition labels for sodium content",
                    "Maintain healthy weight and limit alcohol intake"
                ],
                "exercise": [
                    "30 minutes moderate activity most days of the week",
                    "Include aerobic exercise and strength training",
                    "Stress management through meditation or yoga"
                ],
                "monitoring": [
                    "Home blood pressure monitoring twice daily",
                    "Quarterly professional blood pressure checks",
                    "Annual cardiac risk assessment",
                    "Regular kidney function tests"
                ]
            })
        
        # 8. Hemoglobin Evaluation
        if data.hemoglobin < 12:
            confidence = min(75, 50 + (12 - data.hemoglobin) * 10)
            risks.append({
                "condition": "Anemia Risk",
                "risk_level": "medium risk",
                "confidence": f"{confidence:.0f}% confidence",
                "description": f"Hemoglobin of {data.hemoglobin} g/dL is below normal range (<12 g/dL). May indicate iron deficiency or other underlying conditions."
            })
            prevention_plans.append({
                "title": "Anemia Management Protocol",
                "diet": [
                    "Increase iron-rich foods (red meat, poultry, fish, legumes)",
                    "Consume vitamin C-rich foods with iron sources for better absorption",
                    "Include folate-rich foods (leafy greens, citrus fruits)",
                    "Ensure adequate vitamin B12 intake (animal products or supplements)"
                ],
                "exercise": [
                    "Start with light exercise as energy levels improve",
                    "Gradually increase intensity as anemia resolves",
                    "Avoid overexertion until hemoglobin normalizes"
                ],
                "monitoring": [
                    "Repeat hemoglobin test in 4-6 weeks",
                    "Iron studies (ferritin, transferrin saturation) if iron deficiency suspected",
                    "Vitamin B12 and folate levels if indicated",
                    "Quarterly monitoring until values normalize"
                ]
            })
        
        # 9. Creatinine Evaluation (Kidney Function)
        if data.creatinine > 1.3:
            confidence = min(85, 60 + (data.creatinine - 1.3) * 20)
            risks.append({
                "condition": "Reduced Kidney Function",
                "risk_level": "high risk",
                "confidence": f"{confidence:.0f}% confidence",
                "description": f"Creatinine of {data.creatinine} mg/dL is elevated (>1.3 mg/dL), suggesting possible reduced kidney function. Requires immediate medical evaluation."
            })
            prevention_plans.append({
                "title": "Kidney Health Protection Protocol",
                "diet": [
                    "Limit sodium intake to <2000mg daily",
                    "Control protein intake (0.8g/kg body weight for moderate impairment)",
                    "Limit potassium and phosphorus if levels are elevated",
                    "Stay well-hydrated with 2-3 liters water daily unless contraindicated"
                ],
                "exercise": [
                    "Moderate exercise 30 minutes most days",
                    "Avoid excessive strenuous activity that may stress kidneys",
                    "Stay hydrated during and after exercise"
                ],
                "monitoring": [
                    "Quarterly creatinine and eGFR measurements",
                    "Urine protein testing quarterly",
                    "Blood pressure monitoring twice weekly",
                    "Annual comprehensive kidney function panel"
                ]
            })
        
        # 10. Total Cholesterol to HDL Ratio Evaluation
        cholesterol_ratio = data.total_cholesterol / data.hdl if data.hdl > 0 else 0
        if cholesterol_ratio > 5.0:
            risks.append({
                "condition": "Adverse Cholesterol Ratio",
                "risk_level": "high risk",
                "confidence": "80% confidence",
                "description": f"Total cholesterol to HDL ratio of {cholesterol_ratio:.1f} is elevated (>5.0), indicating high cardiovascular risk independent of individual values."
            })
            prevention_plans.append({
                "title": "Cholesterol Ratio Optimization Protocol",
                "diet": [
                    "Aggressively increase HDL-boosting foods (olive oil, nuts, fatty fish)",
                    "Eliminate trans fats and minimize saturated fats",
                    "Increase soluble fiber to 30g+ daily",
                    "Plant sterol supplementation (2g daily)"
                ],
                "exercise": [
                    "Daily aerobic exercise 45-60 minutes",
                    "High-intensity interval training 3 times weekly",
                    "Consistent exercise regimen for HDL improvement"
                ],
                "monitoring": [
                    "Complete lipid panel every 6 weeks",
                    "Calculate and track cholesterol ratio quarterly",
                    "Cardiovascular risk assessment every 6 months",
                    "Inflammatory markers (hs-CRP) annually"
                ]
            })
        
        # Task 4: Perfect Health Fallback
        if not risks:
            risks.append({
                "condition": "Optimal Vitals",
                "risk_level": "low risk",
                "confidence": "95% confidence",
                "description": f"All 11 health markers are within optimal ranges: BMI {data.bmi} (healthy), fasting glucose {data.fasting_sugar} mg/dL (normal), LDL {data.ldl} mg/dL (optimal), HDL {data.hdl} mg/dL (protective), triglycerides {data.triglycerides} mg/dL (normal), TSH {data.tsh} mIU/L (normal), hemoglobin {data.hemoglobin} g/dL (optimal), creatinine {data.creatinine} mg/dL (normal), total cholesterol {data.total_cholesterol} mg/dL (acceptable). Continue current lifestyle habits."
            })
            prevention_plans.append({
                "title": "Health Maintenance & Prevention Protocol",
                "diet": [
                    "Maintain balanced macronutrient distribution (45-65% carbs, 20-35% fats, 10-35% protein)",
                    "Continue 5-7 servings of fruits and vegetables daily",
                    "Practice portion control and mindful eating",
                    "Limit processed foods and maintain adequate hydration (2-3 liters daily)"
                ],
                "exercise": [
                    "Maintain current routine: 150 minutes moderate aerobic activity weekly",
                    "Continue strength training 2-3 times weekly",
                    "Include flexibility and balance exercises regularly",
                    "Aim for 7,000-10,000 steps daily baseline"
                ],
                "monitoring": [
                    "Annual comprehensive health screening",
                    "Quarterly blood pressure and weight monitoring",
                    "Bi-annual lipid panel and glucose testing",
                    "Regular preventive care and vaccinations"
                ]
            })
        
        # Task 5: Return the Schema
        result = {
            "risks": risks,
            "prevention_plans": prevention_plans
        }
        
        print(f"Clinical Rules Engine Analysis: {len(risks)} risks identified, {len(prevention_plans)} prevention plans generated")
        return result
        
    except Exception as e:
        print(f"Error in clinical rules engine: {e}")
        import traceback
        print(traceback.format_exc())
        return {
            "risks": [{"condition": "Processing Error", "risk_level": "system error", "confidence": "0%", "description": "Unable to process health data due to a technical error"}],
            "prevention_plans": [{"title": "System Error", "diet": ["Please try again later"], "exercise": ["Please try again later"], "monitoring": ["Please try again later"]}]
        }

@app.post("/api/check-symptoms")
def check_symptoms(data: SymptomData):
    try:
        # Clinical Triage and Recommendation Engine
        original_text = data.text.lower()
        
        # Enhanced Medical Keyword Extraction with Clinical Terminology
        clinical_keywords = {
            # Emergency Symptoms (Red Flag)
            'chest pain': 'Chest Pain',
            'chest tightness': 'Chest Pain',
            'chest pressure': 'Chest Pain',
            'heart attack': 'Chest Pain',
            'shortness of breath': 'Shortness of Breath',
            'difficulty breathing': 'Shortness of Breath',
            'can\'t breathe': 'Shortness of Breath',
            'breathing trouble': 'Shortness of Breath',
            'severe headache': 'Severe Headache',
            'worst headache': 'Severe Headache',
            'thunderclap headache': 'Severe Headache',
            'sudden headache': 'Severe Headache',
            'stroke symptoms': 'Stroke Symptoms',
            'facial droop': 'Stroke Symptoms',
            'slurred speech': 'Stroke Symptoms',
            'weakness on one side': 'Stroke Symptoms',
            'numbness on one side': 'Stroke Symptoms',
            'loss of consciousness': 'Loss of Consciousness',
            'fainting': 'Loss of Consciousness',
            'passed out': 'Loss of Consciousness',
            'unresponsive': 'Loss of Consciousness',
            'severe bleeding': 'Severe Bleeding',
            'uncontrollable bleeding': 'Severe Bleeding',
            'major injury': 'Severe Bleeding',
            
            # Urgent Symptoms (Orange Flag)
            'high fever': 'High Fever',
            'very high fever': 'High Fever',
            'fever above 103': 'High Fever',
            'persistent vomiting': 'Persistent Vomiting',
            'can\'t keep fluids down': 'Persistent Vomiting',
            'dehydration': 'Dehydration',
            'severe dehydration': 'Dehydration',
            'confusion': 'Confusion',
            'disoriented': 'Confusion',
            'severe pain': 'Severe Pain',
            'excruciating pain': 'Severe Pain',
            'unbearable pain': 'Severe Pain',
            'broken bone': 'Suspected Fracture',
            'fracture': 'Suspected Fracture',
            'major burn': 'Major Burn',
            'second degree burn': 'Major Burn',
            'third degree burn': 'Major Burn',
            'allergic reaction': 'Severe Allergic Reaction',
            'anaphylaxis': 'Severe Allergic Reaction',
            'swollen tongue': 'Severe Allergic Reaction',
            'difficulty swallowing': 'Severe Allergic Reaction',
            
            # Moderate Symptoms (Yellow Flag)
            'fever': 'Fever',
            'temperature': 'Fever',
            'chills': 'Fever',
            'shaking': 'Fever',
            'headache': 'Headache',
            'migraine': 'Migraine',
            'headache with nausea': 'Migraine',
            'sensitivity to light': 'Migraine',
            'cough': 'Cough',
            'persistent cough': 'Persistent Cough',
            'cough with phlegm': 'Productive Cough',
            'dry cough': 'Dry Cough',
            'sore throat': 'Sore Throat',
            'throat pain': 'Sore Throat',
            'difficulty swallowing': 'Sore Throat',
            'nausea': 'Nausea',
            'vomiting': 'Vomiting',
            'stomach pain': 'Abdominal Pain',
            'abdominal pain': 'Abdominal Pain',
            'belly pain': 'Abdominal Pain',
            'diarrhea': 'Diarrhea',
            'loose stools': 'Diarrhea',
            'frequent bowel movements': 'Diarrhea',
            'constipation': 'Constipation',
            'can\'t have bowel movement': 'Constipation',
            'back pain': 'Back Pain',
            'lower back pain': 'Lower Back Pain',
            'upper back pain': 'Upper Back Pain',
            'joint pain': 'Joint Pain',
            'joint swelling': 'Joint Swelling',
            'stiff joints': 'Joint Stiffness',
            'muscle pain': 'Muscle Pain',
            'muscle aches': 'Muscle Pain',
            'body aches': 'Body Aches',
            'fatigue': 'Fatigue',
            'extreme tiredness': 'Fatigue',
            'exhaustion': 'Fatigue',
            'dizziness': 'Dizziness',
            'lightheaded': 'Dizziness',
            'vertigo': 'Vertigo',
            'rash': 'Skin Rash',
            'skin rash': 'Skin Rash',
            'itchy skin': 'Itching',
            'hives': 'Hives',
            'swelling': 'Swelling',
            'edema': 'Swelling',
            'urinary pain': 'Urinary Pain',
            'painful urination': 'Urinary Pain',
            'burning urination': 'Urinary Pain',
            'frequent urination': 'Frequent Urination',
            'eye pain': 'Eye Pain',
            'red eye': 'Red Eye',
            'vision changes': 'Vision Changes',
            'blurred vision': 'Vision Changes',
            'ear pain': 'Ear Pain',
            'ear discharge': 'Ear Discharge',
            'hearing loss': 'Hearing Loss',
            'nasal congestion': 'Nasal Congestion',
            'stuffy nose': 'Nasal Congestion',
            'runny nose': 'Runny Nose',
            'sinus pressure': 'Sinus Pressure',
            
            # Low-Risk Symptoms (Green Flag)
            'mild headache': 'Mild Headache',
            'tension headache': 'Mild Headache',
            'mild pain': 'Mild Pain',
            'minor pain': 'Mild Pain',
            'slight fever': 'Low-Grade Fever',
            'low-grade fever': 'Low-Grade Fever',
            'mild cough': 'Mild Cough',
            'occasional cough': 'Mild Cough',
            'mild nausea': 'Mild Nausea',
            'slight nausea': 'Mild Nausea',
            'mild fatigue': 'Mild Fatigue',
            'tired': 'Mild Fatigue',
            'dry skin': 'Dry Skin',
            'mild itching': 'Mild Itching'
        }
        
        # Extract symptoms using clinical keyword matching
        extracted_symptoms = []
        for keyword, symptom in clinical_keywords.items():
            if keyword in original_text:
                if symptom not in extracted_symptoms:
                    extracted_symptoms.append(symptom)
        
        # If no clinical symptoms found, provide guidance
        if not extracted_symptoms:
            return {
                "original_description": data.text,
                "extracted_symptoms": ["No Specific Medical Symptoms Detected"],
                "prediction": "Needs Clarification",
                "triage_advice": {
                    "level": "needs clarification",
                    "summary": "I couldn't identify specific medical symptoms in your description. Please describe your physical symptoms more clearly.",
                    "recommended_actions": [
                        "Describe specific symptoms (e.g., 'sharp pain in chest', 'severe headache')",
                        "Include duration and severity (e.g., 'for 3 days', 'mild/moderate/severe')",
                        "Mention affected body areas (e.g., 'left side of head', 'lower back')",
                        "Note any accompanying symptoms (e.g., 'with fever', 'with nausea')"
                    ]
                }
            }
        
        # Clinical Triage Assessment
        emergency_symptoms = ['Chest Pain', 'Shortness of Breath', 'Severe Headache', 'Stroke Symptoms', 'Loss of Consciousness', 'Severe Bleeding']
        urgent_symptoms = ['High Fever', 'Persistent Vomiting', 'Dehydration', 'Confusion', 'Severe Pain', 'Suspected Fracture', 'Major Burn', 'Severe Allergic Reaction']
        moderate_symptoms = ['Fever', 'Migraine', 'Persistent Cough', 'Sore Throat', 'Abdominal Pain', 'Diarrhea', 'Back Pain', 'Joint Pain', 'Muscle Pain', 'Fatigue', 'Dizziness', 'Skin Rash', 'Swelling', 'Urinary Pain', 'Vision Changes', 'Ear Pain', 'Nasal Congestion']
        
        # Determine triage level and confidence
        triage_level = "self-care"
        confidence = 70
        prediction = "Mild Condition"
        
        if any(symptom in extracted_symptoms for symptom in emergency_symptoms):
            triage_level = "emergency medical care"
            confidence = 95
            prediction = "Emergency Medical Condition"
        elif any(symptom in extracted_symptoms for symptom in urgent_symptoms):
            triage_level = "urgent medical care"
            confidence = 85
            prediction = "Urgent Medical Condition"
        elif any(symptom in extracted_symptoms for symptom in moderate_symptoms):
            triage_level = "medical consultation recommended"
            confidence = 75
            prediction = "Moderate Medical Condition"
        else:
            triage_level = "self-care recommended"
            confidence = 65
            prediction = "Mild Condition"
        
        # Dynamic confidence adjustment based on symptom count and specificity
        if len(extracted_symptoms) > 3:
            confidence = min(95, confidence + 10)
        elif len(extracted_symptoms) == 1:
            confidence = max(60, confidence - 5)
        
        # Generate personalized prevention protocols based on triage level
        if triage_level == "emergency medical care":
            triage_advice = {
                "level": "emergency medical care",
                "summary": "Your symptoms indicate a potentially life-threatening condition requiring immediate emergency medical attention. Do not delay seeking care.",
                "recommended_actions": [
                    "Call emergency services (911) immediately or go to nearest emergency department",
                    "Do not drive yourself - have someone else take you or call ambulance",
                    "If possible, have medical information and medication list ready",
                    "Follow any specific emergency instructions given by emergency dispatcher",
                    "Do not eat or drink anything unless specifically advised by medical personnel"
                ]
            }
        elif triage_level == "urgent medical care":
            triage_advice = {
                "level": "urgent medical care",
                "summary": "Your symptoms require prompt medical evaluation within 24 hours to prevent complications and ensure proper treatment.",
                "recommended_actions": [
                    "Seek urgent care or emergency department within 24 hours",
                    "Contact your primary care physician for immediate appointment",
                    "Monitor symptoms closely and seek emergency care if they worsen",
                    "Document symptom onset, duration, and any changes for medical provider",
                    "Follow up with primary care provider after urgent care visit"
                ]
            }
        elif triage_level == "medical consultation recommended":
            triage_advice = {
                "level": "medical consultation recommended",
                "summary": "Your symptoms warrant medical evaluation for proper diagnosis and treatment. Schedule a consultation with your healthcare provider.",
                "recommended_actions": [
                    "Schedule appointment with primary care physician within 3-5 days",
                    "Keep symptom diary noting severity, duration, and triggers",
                    "Try over-the-counter treatments only if appropriate and monitor response",
                    "Rest and maintain hydration while awaiting medical evaluation",
                    "Seek urgent care if symptoms significantly worsen or new severe symptoms develop"
                ]
            }
        else:  # self-care recommended
            triage_advice = {
                "level": "self-care recommended",
                "summary": "Your symptoms appear to be mild and can often be managed with self-care measures. Monitor closely and seek medical attention if symptoms worsen or persist.",
                "recommended_actions": [
                    "Rest and increase fluid intake (water, clear broths)",
                    "Use over-the-counter medications as appropriate for symptom relief",
                    "Monitor symptoms daily and track any changes",
                    "Practice good hygiene to prevent spreading to others",
                    "Seek medical attention if symptoms worsen, persist beyond 7-10 days, or if you develop high fever"
                ]
            }
        
        # Add condition-specific prevention protocols
        prevention_protocols = []
        
        for symptom in extracted_symptoms:
            if symptom == "Chest Pain":
                prevention_protocols.append({
                    "condition": "Cardiac Health Monitoring",
                    "immediate_actions": [
                        "Stop all physical activity immediately and rest",
                        "Loosen tight clothing and sit upright",
                        "Chew aspirin if available and not allergic (325mg)",
                        "Call emergency services immediately"
                    ],
                    "follow_up_care": [
                        "Complete cardiac evaluation including ECG and cardiac enzymes",
                        "Stress testing and echocardiogram as ordered",
                        "Cardiology follow-up within 1 week of discharge",
                        "Medication adjustment and lifestyle modification program"
                    ],
                    "prevention_strategies": [
                        "Heart-healthy diet low in saturated fats and sodium",
                        "Regular cardiovascular exercise as medically cleared",
                        "Stress management techniques and smoking cessation",
                        "Regular blood pressure and cholesterol monitoring"
                    ]
                })
            elif symptom == "Severe Headache":
                prevention_protocols.append({
                    "condition": "Neurological Evaluation",
                    "immediate_actions": [
                        "Rest in dark, quiet room immediately",
                        "Avoid bright lights and loud noises",
                        "Document headache onset and characteristics",
                        "Seek emergency care if worst headache of life"
                    ],
                    "follow_up_care": [
                        "Neurological examination and imaging if indicated",
                        "MRI or CT scan based on clinical findings",
                        "Neurology follow-up for chronic headache management",
                        "Preventive medication evaluation if recurrent"
                    ],
                    "prevention_strategies": [
                        "Identify and avoid personal headache triggers",
                        "Maintain regular sleep schedule and stress management",
                        "Stay hydrated and maintain regular meal times",
                        "Consider preventive medications for frequent migraines"
                    ]
                })
            elif symptom == "Fever" or symptom == "High Fever":
                prevention_protocols.append({
                    "condition": "Fever Management",
                    "immediate_actions": [
                        "Monitor temperature every 4 hours",
                        "Use fever-reducing medications (acetaminophen, ibuprofen)",
                        "Stay hydrated with water, electrolyte solutions",
                        "Rest and avoid strenuous activity"
                    ],
                    "follow_up_care": [
                        "Medical evaluation if fever persists >3 days",
                        "Blood tests to identify infection source",
                        "Cultures if bacterial infection suspected",
                        "Follow up until fever resolves completely"
                    ],
                    "prevention_strategies": [
                        "Practice good hand hygiene and respiratory etiquette",
                        "Stay up-to-date on vaccinations including flu shot",
                        "Avoid close contact with sick individuals",
                        "Maintain strong immune system through nutrition and sleep"
                    ]
                })
            elif symptom == "Cough" or symptom == "Persistent Cough":
                prevention_protocols.append({
                    "condition": "Respiratory Health",
                    "immediate_actions": [
                        "Stay hydrated to thin mucus secretions",
                        "Use humidifier or steam inhalation",
                        "Avoid irritants like smoke and strong odors",
                        "Rest voice and avoid excessive talking"
                    ],
                    "follow_up_care": [
                        "Medical evaluation if cough persists >2 weeks",
                        "Chest X-ray if chronic cough or shortness of breath",
                        "Pulmonary function tests if indicated",
                        "Treatment of underlying cause (asthma, GERD, infection)"
                    ],
                    "prevention_strategies": [
                        "Avoid smoking and secondhand smoke exposure",
                        "Practice respiratory hygiene and hand washing",
                        "Get recommended vaccinations (flu, pneumonia)",
                        "Use air purifiers and maintain good indoor air quality"
                    ]
                })
        
        # Add prevention protocols to triage advice
        if prevention_protocols:
            triage_advice["prevention_protocols"] = prevention_protocols
        
        result = {
            "original_description": data.text,
            "extracted_symptoms": extracted_symptoms,
            "prediction": prediction,
            "triage_advice": triage_advice
        }
        
        print(f"Clinical Triage Analysis: {len(extracted_symptoms)} symptoms extracted, triage level: {triage_level}, confidence: {confidence}%")
        return result
        
    except Exception as e:
        print(f"Error in clinical triage engine: {e}")
        import traceback
        print(traceback.format_exc())
        return {
            "original_description": data.text,
            "extracted_symptoms": ["Processing Error"],
            "prediction": "System Error",
            "triage_advice": {
                "level": "system error",
                "summary": "Unable to process symptoms due to a technical error. Please try again or contact support.",
                "recommended_actions": ["Please try again later", "Contact support if issue persists", "Seek medical attention if symptoms are severe"]
            }
        }

# ── Get Checkups Endpoint ──
@app.get("/api/checkups")
def get_checkups():
    """Get all checkup records"""
    try:
        # Mock data for demonstration
        mock_checkups = [
            {
                "id": "checkup_1",
                "date": "2026-03-25",
                "bmiData": {
                    "height": 170,
                    "weight": 70,
                    "score": 24.2,
                    "category": "Normal"
                },
                "bloodReport": {
                    "hemoglobin": 14.5,
                    "fastingSugar": 95,
                    "totalCholesterol": 180,
                    "hdl": 50,
                    "ldl": 100,
                    "triglycerides": 150,
                    "creatinine": 1.0,
                    "tsh": 2.5
                },
                "aiPredictions": [
                    {
                        "riskTag": "Cardiovascular Health",
                        "riskLevel": "low",
                        "confidence": 0.85,
                        "description": "Your cardiovascular indicators are within normal ranges."
                    },
                    {
                        "riskTag": "Metabolic Health",
                        "riskLevel": "low", 
                        "confidence": 0.90,
                        "description": "Your metabolic markers are optimal."
                    }
                ],
                "preventionPlan": [
                    {
                        "conditionTag": "General Health",
                        "title": "Maintenance Plan",
                        "dietSteps": ["Balanced diet", "Limit processed foods", "Increase fiber intake"],
                        "exerciseSteps": ["30 minutes moderate exercise daily", "Strength training 2x/week"],
                        "monitoringSteps": ["Annual health checkups", "Blood pressure monitoring"],
                        "medicalDisclaimer": "This plan is generated by Health AI for educational purposes only. Consult your physician before making any changes to your diet or exercise routine."
                    }
                ]
            },
            {
                "id": "checkup_2", 
                "date": "2026-02-15",
                "bmiData": {
                    "height": 170,
                    "weight": 72,
                    "score": 25.0,
                    "category": "Normal"
                },
                "bloodReport": {
                    "hemoglobin": 14.2,
                    "fastingSugar": 98,
                    "totalCholesterol": 185,
                    "hdl": 48,
                    "ldl": 105,
                    "triglycerides": 160,
                    "creatinine": 1.1,
                    "tsh": 2.8
                },
                "aiPredictions": [
                    {
                        "riskTag": "Cardiovascular Health",
                        "riskLevel": "low",
                        "confidence": 0.80,
                        "description": "Your cardiovascular indicators are within normal ranges."
                    }
                ],
                "preventionPlan": [
                    {
                        "conditionTag": "General Health",
                        "title": "Maintenance Plan", 
                        "dietSteps": ["Balanced diet", "Limit processed foods"],
                        "exerciseSteps": ["30 minutes moderate exercise daily"],
                        "monitoringSteps": ["Annual health checkups"],
                        "medicalDisclaimer": "This plan is generated by Health AI for educational purposes only. Consult your physician before making any changes to your diet or exercise routine."
                    }
                ]
            }
        ]
        
        # Combine mock data with stored data
        all_checkups = mock_checkups + checkup_storage
        
        # Sort by date (newest first)
        all_checkups.sort(key=lambda x: x.get('date', ''), reverse=True)
        
        return all_checkups
    except Exception as e:
        print(f"Error in get_checkups: {e}")
        return []

# ── Get Symptom Logs Endpoint ──
@app.get("/api/symptom-logs")
def get_symptom_logs():
    """Get all symptom log records"""
    try:
        # Mock data for demonstration
        mock_symptoms = [
            {
                "id": "symptom_1",
                "date": "2026-03-20",
                "rawText": "I have severe chest pain and shortness of breath",
                "extractedSymptoms": ["Chest Pain", "Shortness of Breath"],
                "predictedIllness": "Emergency Medical Condition",
                "triageAdvice": {
                    "level": "emergency medical care",
                    "message": "Your symptoms indicate a potentially life-threatening condition requiring immediate emergency medical care.",
                    "homeRemedies": ["Call emergency services immediately", "Chew aspirin if available and not allergic", "Stop all physical activity and rest"]
                }
            },
            {
                "id": "symptom_2",
                "date": "2026-03-18", 
                "rawText": "I have high fever with chills and headache",
                "extractedSymptoms": ["High Fever", "Headache", "Fever", "Chills"],
                "predictedIllness": "Urgent Medical Condition",
                "triageAdvice": {
                    "level": "urgent medical care",
                    "message": "Your symptoms require prompt medical evaluation within 24 hours to prevent complications.",
                    "homeRemedies": ["Monitor temperature every 4 hours", "Use fever-reducing medications", "Stay hydrated", "Rest and avoid strenuous activity"]
                }
            },
            {
                "id": "symptom_3",
                "date": "2026-03-15",
                "rawText": "I have mild headache and feel tired",
                "extractedSymptoms": ["Headache", "Mild Headache", "Mild Fatigue"],
                "predictedIllness": "Mild Condition",
                "triageAdvice": {
                    "level": "self-care recommended",
                    "message": "Your symptoms appear to be mild and can often be managed with self-care measures.",
                    "homeRemedies": ["Rest in quiet environment", "Stay hydrated", "Over-the-counter pain relief if needed", "Monitor symptoms"]
                }
            }
        ]
        
        # Combine mock data with stored data
        all_symptoms = mock_symptoms + symptom_storage
        
        # Sort by date (newest first)
        all_symptoms.sort(key=lambda x: x.get('date', ''), reverse=True)
        
        return all_symptoms
    except Exception as e:
        print(f"Error in get_symptom_logs: {e}")
        return []

# ── Save New Data Endpoints ──
@app.post("/api/save-checkup")
def save_checkup_to_history(checkup_data: dict):
    """Save a new checkup to history"""
    try:
        # Add timestamp if not present
        if 'date' not in checkup_data:
            checkup_data['date'] = datetime.utcnow().strftime('%Y-%m-%d')
        
        # Add to in-memory storage
        checkup_storage.append(checkup_data)
        
        print(f"✅ Checkup saved to history: {checkup_data.get('id', 'unknown')}")
        print(f"📊 Total checkups in storage: {len(checkup_storage)}")
        
        return {"success": True, "message": "Checkup saved to history"}
    except Exception as e:
        print(f"Error saving checkup: {e}")
        return {"success": False, "error": str(e)}

@app.post("/api/save-symptom")
def save_symptom_to_history(symptom_data: dict):
    """Save a new symptom log to history"""
    try:
        # Add timestamp if not present
        if 'date' not in symptom_data:
            symptom_data['date'] = datetime.utcnow().strftime('%Y-%m-%d')
        
        # Add to in-memory storage
        symptom_storage.append(symptom_data)
        
        print(f"✅ Symptom saved to history: {symptom_data.get('id', 'unknown')}")
        print(f"📊 Total symptoms in storage: {len(symptom_storage)}")
        
        return {"success": True, "message": "Symptom saved to history"}
    except Exception as e:
        print(f"Error saving symptom: {e}")
        return {"success": False, "error": str(e)}

# ── Health Check Endpoint ──
@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# ── Run Server ──
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
