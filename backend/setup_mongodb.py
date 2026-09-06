"""
MongoDB Setup Script for HealthAI Prevention Protocols

This script sets up the MongoDB database with prevention protocols for various diseases.
Run this once to populate your MongoDB with the necessary data.
"""

from pymongo import MongoClient
import os
from datetime import datetime

# MongoDB connection - adjust as needed
# For local MongoDB: "mongodb://localhost:27017"
# For MongoDB Atlas: get connection string from your Atlas dashboard
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
DB_NAME = 'healthai'
COLLECTION_NAME = 'prevention_protocols'

def setup_prevention_protocols():
    """Set up prevention protocols for various diseases"""
    
    # Connect to MongoDB
    client = MongoClient(MONGODB_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]
    
    # Clear existing data (optional - remove if you want to keep existing data)
    collection.delete_many({})
    
    # Enhanced prevention protocols for specific clinical conditions
    prevention_protocols = [
        {
            'condition_tag': 'Healthy: Optimal Vitals',
            'title': 'Optimal Health Maintenance',
            'condition': "Your metabolic markers are within excellent clinical ranges.",
            'diet_steps': [
                'Maintain a balanced macronutrient intake',
                'Ensure 2-3 liters of water daily',
                'Continue current eating patterns',
                'Include variety in food choices',
                'Maintain portion control'
            ],
            'exercise_steps': [
                'Maintain current routine: 150 mins of moderate aerobic activity weekly',
                'Continue strength training 2-3 times per week',
                'Include flexibility and balance exercises',
                'Stay active throughout the day',
                'Get adequate recovery and sleep'
            ],
            'monitoring_steps': [
                'No action required',
                'Schedule a routine checkup next year',
                'Continue current health monitoring',
                'Maintain healthy lifestyle habits',
                'Regular dental and vision checkups'
            ],
            'medical_disclaimer': 'Your health metrics are optimal. Continue your current healthy lifestyle.',
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        },
        {
            'condition_tag': 'Moderate Risk: Pre-diabetes & Borderline Lipids',
            'title': 'Pre-diabetes and Cholesterol Management',
            'condition': "Early signs of insulin resistance and elevated cholesterol detected.",
            'diet_steps': [
                'Swap refined carbs for complex carbs (oats, quinoa)',
                'Increase soluble fiber to lower LDL cholesterol',
                'Stop sugary drinks and eliminate added sugars',
                'Choose lean proteins and healthy fats',
                'Eat smaller, more frequent meals'
            ],
            'exercise_steps': [
                'Aim for 30-45 minutes of brisk walking 5 days a week',
                'Include resistance training to improve insulin sensitivity',
                'Add interval training for cardiovascular health',
                'Practice stress-reducing activities like yoga',
                'Monitor blood sugar response to exercise'
            ],
            'monitoring_steps': [
                'Monitor diet strictly',
                'Re-test HbA1c and Lipid Profile in 3-6 months',
                'Track fasting blood glucose weekly',
                'Monitor weight and waist circumference',
                'Regular blood pressure checks'
            ],
            'medical_disclaimer': 'Pre-diabetes can be reversed with lifestyle changes. Work closely with your healthcare provider.',
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        },
        {
            'condition_tag': 'High Risk: Isolated Hyperglycemia (Diabetes)',
            'title': 'Diabetes Management Plan',
            'condition': "Fasting blood sugar is dangerously high despite normal BMI and cholesterol.",
            'diet_steps': [
                'Strict low-glycemic index diet',
                'Count carbohydrates meticulously',
                'Prioritize lean proteins and non-starchy vegetables',
                'Eliminate refined sugars and processed foods',
                'Time meals to prevent blood sugar spikes'
            ],
            'exercise_steps': [
                'Engage in post-meal walking (15 mins) to help blunt glucose spikes',
                'Include both aerobic and resistance training',
                'Monitor blood sugar before and after exercise',
                'Choose low-impact activities to prevent injury',
                'Exercise at consistent times daily'
            ],
            'monitoring_steps': [
                'Schedule an appointment with an endocrinologist this week',
                'Confirm Type 2 Diabetes diagnosis',
                'Daily blood glucose monitoring',
                'Regular HbA1c testing every 3 months',
                'Monitor for diabetes complications'
            ],
            'medical_disclaimer': 'Diabetes requires immediate medical attention and comprehensive management.',
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        },
        {
            'condition_tag': 'High Risk: Severe Hypercholesterolemia',
            'title': 'Severe Cholesterol Management',
            'condition': "Cholesterol levels are critically high, posing cardiovascular risks, despite normal blood sugar.",
            'diet_steps': [
                'Eliminate trans fats completely',
                'Severely restrict saturated fats (red meat, butter)',
                'Increase Omega-3 fatty acids (salmon, walnuts, flaxseeds)',
                'Add plant sterols and stanols',
                'Increase soluble fiber from oats, beans, and citrus'
            ],
            'exercise_steps': [
                'Daily moderate cardio (cycling, swimming) to help elevate HDL',
                'Include high-intensity interval training 2-3 times per week',
                'Add resistance training to improve overall lipid profile',
                'Maintain consistent exercise routine',
                'Monitor heart rate during exercise'
            ],
            'monitoring_steps': [
                'Consult a cardiologist or primary physician immediately',
                'Consider statin therapy evaluation',
                'Full lipid panel every 3 months',
                'Regular cardiovascular risk assessments',
                'Monitor for signs of heart disease'
            ],
            'medical_disclaimer': 'Severe hypercholesterolemia requires immediate medical intervention and possibly medication.',
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        },
        {
            'condition_tag': 'Moderate Risk: Obesity & Dyslipidemia',
            'title': 'Obesity and Cholesterol Management',
            'condition': "High BMI combined with elevated cholesterol puts excess strain on the cardiovascular system.",
            'diet_steps': [
                'Implement a caloric deficit of 300-500 calories per day',
                'Focus on volume eating (high fiber, low calorie density)',
                'Choose nutrient-dense, low-calorie foods',
                'Practice mindful eating and portion control',
                'Limit liquid calories and processed foods'
            ],
            'exercise_steps': [
                'Begin with low-impact exercises (swimming, elliptical) to protect joints',
                'Gradually increase exercise duration and intensity',
                'Include both cardio and strength training',
                'Aim for 300 minutes of moderate exercise per week',
                'Add daily walking and NEAT (non-exercise activity thermogenesis)'
            ],
            'monitoring_steps': [
                'Consult a nutritionist for a sustainable weight loss plan',
                'Monitor blood pressure regularly',
                'Track weight weekly and body measurements monthly',
                'Regular lipid panel testing',
                'Monitor for joint pain and other obesity-related issues'
            ],
            'medical_disclaimer': 'Weight loss should be gradual and supervised by healthcare professionals.',
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        },
        {
            'condition_tag': 'Moderate Risk: Underweight & Potential Malnutrition',
            'title': 'Weight Gain and Nutrition Plan',
            'condition': "BMI is below optimal levels, which can impact immune function and bone density.",
            'diet_steps': [
                'Increase caloric intake with nutrient-dense foods',
                'Focus on avocados, nuts, whole milk, lean meats',
                'Eat smaller, frequent meals (6-8 per day)',
                'Add healthy fats to each meal',
                'Include protein-rich snacks between meals'
            ],
            'exercise_steps': [
                'Focus on resistance and strength training to build muscle mass',
                'Limit heavy cardio that burns excessive calories',
                'Include compound exercises (squats, deadlifts, bench press)',
                'Progressive overload to stimulate muscle growth',
                'Ensure adequate rest and recovery between sessions'
            ],
            'monitoring_steps': [
                'Consider a full panel blood test for vitamin/mineral deficiencies',
                'Consult a dietitian for personalized nutrition plan',
                'Monitor weight gain progress weekly',
                'Track strength gains and muscle development',
                'Regular checkups to monitor overall health'
            ],
            'medical_disclaimer': 'Underweight status requires medical evaluation to rule out underlying conditions.',
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        },
        {
            'condition_tag': 'Severe Risk: Advanced Metabolic Syndrome',
            'title': 'Critical Metabolic Syndrome Intervention',
            'condition': "Critical danger: High BMI, High Sugar, and High Cholesterol observed simultaneously.",
            'diet_steps': [
                'Immediate dietary overhaul required',
                'Zero processed sugars and refined carbohydrates',
                'Extremely low sodium intake',
                'Plant-heavy meals with minimal processing',
                'Strict portion control and meal timing'
            ],
            'exercise_steps': [
                'Requires medical clearance before beginning any physical exertion',
                'Start with gentle walking under medical supervision',
                'Gradually increase intensity as tolerated',
                'Monitor heart rate and blood pressure during activity',
                'Include stress management and breathing exercises'
            ],
            'monitoring_steps': [
                'URGENT: Schedule a comprehensive medical evaluation immediately',
                'Comprehensive cardiovascular risk assessment',
                'Regular monitoring of all metabolic markers',
                'Possible medication management for multiple conditions',
                'Frequent follow-ups with healthcare team'
            ],
            'medical_disclaimer': 'Advanced metabolic syndrome is a medical emergency requiring immediate comprehensive care.',
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
    ]
    
    # Insert all protocols
    result = collection.insert_many(prevention_protocols)
    
    print(f"✅ Successfully inserted {len(result.inserted_ids)} prevention protocols")
    print(f"Database: {DB_NAME}")
    print(f"Collection: {COLLECTION_NAME}")
    
    # Display sample data
    print("\n📋 Sample prevention protocols:")
    for protocol in collection.find().limit(3):
        print(f"- {protocol['condition_tag']}: {protocol['title']}")
    
    client.close()

if __name__ == '__main__':
    try:
        setup_prevention_protocols()
        print("\n🎉 MongoDB setup completed successfully!")
    except Exception as e:
        print(f"❌ Error setting up MongoDB: {e}")
        print("\n💡 Make sure MongoDB is running and accessible.")
        print("   For local MongoDB: ensure mongod service is running")
        print("   For MongoDB Atlas: check your connection string")
