"""
Health AI - Machine Learning Model Training Script

This script trains two ML models:
1. RandomForestClassifier for health risk prediction from checkup data
2. TF-IDF + SVC for symptom-based disease classification

Run this script to generate the .pkl model files required by main.py
"""

import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import SVC
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    classification_report
)


# =============================================================================
# PART 1: Health Checkup Model (RandomForest)
# =============================================================================

def generate_checkup_dummy_data(n_samples: int = 2000) -> pd.DataFrame:
    """
    Generate dummy full-body checkup data for training with enhanced clinical tags.
    
    Features: bmi, fasting_sugar, cholesterol (matching React form inputs)
    Target: risk_tag
    
    In production, replace this with pd.read_csv('your_data.csv')
    """
    np.random.seed(42)
    
    # Create specific combinations that map to your clinical tags
    base_data = [
        # Healthy: Optimal Vitals
        {'bmi': 22.0, 'fasting_sugar': 90, 'cholesterol': 170, 'risk_tag': 'Healthy: Optimal Vitals'},
        {'bmi': 19.0, 'fasting_sugar': 85, 'cholesterol': 160, 'risk_tag': 'Healthy: Optimal Vitals'},
        {'bmi': 24.0, 'fasting_sugar': 95, 'cholesterol': 180, 'risk_tag': 'Healthy: Optimal Vitals'},
        {'bmi': 23.0, 'fasting_sugar': 90, 'cholesterol': 175, 'risk_tag': 'Healthy: Optimal Vitals'},
        
        # Severe Risk: Advanced Metabolic Syndrome
        {'bmi': 32.0, 'fasting_sugar': 150, 'cholesterol': 240, 'risk_tag': 'Severe Risk: Advanced Metabolic Syndrome'},
        {'bmi': 35.0, 'fasting_sugar': 180, 'cholesterol': 260, 'risk_tag': 'Severe Risk: Advanced Metabolic Syndrome'},
        
        # Moderate Risk: Pre-diabetes & Borderline Lipids
        {'bmi': 28.5, 'fasting_sugar': 115, 'cholesterol': 210, 'risk_tag': 'Moderate Risk: Pre-diabetes & Borderline Lipids'},
        
        # High Risk: Isolated Hyperglycemia (Diabetes)
        {'bmi': 22.5, 'fasting_sugar': 160, 'cholesterol': 180, 'risk_tag': 'High Risk: Isolated Hyperglycemia (Diabetes)'},
        
        # Moderate Risk: Underweight & Potential Malnutrition
        {'bmi': 17.5, 'fasting_sugar': 80, 'cholesterol': 150, 'risk_tag': 'Moderate Risk: Underweight & Potential Malnutrition'},
        
        # Moderate Risk: Obesity & Dyslipidemia
        {'bmi': 30.0, 'fasting_sugar': 95, 'cholesterol': 250, 'risk_tag': 'Moderate Risk: Obesity & Dyslipidemia'},
        
        # High Risk: Severe Hypercholesterolemia
        {'bmi': 23.0, 'fasting_sugar': 90, 'cholesterol': 280, 'risk_tag': 'High Risk: Severe Hypercholesterolemia'},
    ]
    
    # Generate variations around these base patterns
    data = []
    for base in base_data:
        # Create 5-10 variations of each pattern
        for _ in range(np.random.randint(5, 10)):
            variation = {
                'bmi': base['bmi'] + np.random.normal(0, 0.5),
                'fasting_sugar': base['fasting_sugar'] + np.random.normal(0, 5),
                'cholesterol': base['cholesterol'] + np.random.normal(0, 8),
                'risk_tag': base['risk_tag']
            }
            data.append(variation)
    
    df = pd.DataFrame(data)
    return df


def train_checkup_model(csv_path: str = None) -> RandomForestClassifier:
    """
    Train RandomForestClassifier on checkup data.
    
    Args:
        csv_path: Optional path to real CSV data. If None, uses dummy data.
    
    Returns:
        Trained RandomForestClassifier model
    """
    print("=" * 60)
    print("Training Health Checkup Model (RandomForest)")
    print("=" * 60)
    
    # Load data
    if csv_path:
        print(f"Loading data from: {csv_path}")
        df = pd.read_csv(csv_path)
    else:
        print("Generating dummy checkup data...")
        df = generate_checkup_dummy_data(n_samples=3000)
    
    # Prepare features and target
    feature_cols = ['bmi', 'fasting_sugar', 'cholesterol']
    X = df[feature_cols]
    y = df['risk_tag']
    
    print(f"\nDataset size: {len(X)} samples")
    print(f"Features: {feature_cols}")
    print(f"Classes: {list(y.unique())}")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Train RandomForest
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    
    print("\n--- Model Evaluation ---")
    print(f"Accuracy:  {accuracy_score(y_test, y_pred):.4f}")
    print(f"F1-Score:  {f1_score(y_test, y_pred, average='weighted'):.4f}")
    print(f"Precision: {precision_score(y_test, y_pred, average='weighted'):.4f}")
    print(f"Recall:    {recall_score(y_test, y_pred, average='weighted'):.4f}")
    
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # Save model
    joblib.dump(model, 'checkup_model.pkl')
    print("\n✓ Model saved as 'checkup_model.pkl'")
    
    return model


# =============================================================================
# PART 2: Symptom Checker Model (TF-IDF + SVC)
# =============================================================================

def generate_symptom_dummy_data() -> tuple:
    """
    Generate dummy symptom text data for training.
    
    Returns:
        Tuple of (texts, labels)
    
    In production, replace this with loading from a real dataset.
    """
    symptoms_data = {
        'Malaria': [
            'high fever chills sweating headache body aches',
            'fever with shaking chills and muscle pain',
            'recurrent fever episodes with sweating',
            'headache fever nausea vomiting',
            'periodic fever with chills and fatigue'
        ],
        'Dengue': [
            'high fever severe headache joint pain rash',
            'fever with muscle pain and skin rash',
            'dengue symptoms fever body pain',
            'high temperature with joint and muscle pain',
            'fever headache pain behind eyes rash'
        ],
        'Typhoid': [
            'persistent fever headache abdominal pain constipation',
            'high fever with stomach pain and weakness',
            'typhoid fever rose spots abdominal discomfort',
            'sustained fever headache loss of appetite',
            'fever with intestinal pain and constipation'
        ],
        'Migraine': [
            'severe throbbing headache nausea light sensitivity',
            'one-sided headache with vomiting and light sensitivity',
            'migraine attack severe headache nausea',
            'pulsating headache with aura and nausea',
            'intense headache sensitivity to light and sound'
        ],
        'Diabetes': [
            'frequent urination increased thirst weight loss',
            'excessive thirst hunger fatigue blurred vision',
            'diabetes symptoms thirst urination hunger',
            'constant thirst frequent bathroom trips weight loss',
            'increased hunger thirst fatigue blurry vision'
        ],
        'Hypertension': [
            'high blood pressure headaches chest pain',
            'elevated BP with headaches and nosebleeds',
            'hypertension symptoms chest pain shortness of breath',
            'high BP headaches vision problems',
            'blood pressure issues with chest discomfort'
        ],
        'Asthma': [
            'wheezing shortness of breath chest tightness cough',
            'difficulty breathing with whistling sound',
            'asthma attack wheezing coughing breathlessness',
            'breathing problems chest tightness nighttime cough',
            'shortness of breath with wheezing and cough'
        ],
        'Common Cold': [
            'runny nose sore throat cough congestion',
            'cold symptoms stuffy nose sneezing',
            'sore throat runny nose mild cough',
            'nasal congestion sore throat sneezing',
            'head cold stuffy nose mild sore throat'
        ]
    }
    
    texts = []
    labels = []
    
    for disease, examples in symptoms_data.items():
        texts.extend(examples)
        labels.extend([disease] * len(examples))
    
    return texts, labels


def train_symptom_model(csv_path: str = None) -> tuple:
    """
    Train TF-IDF vectorizer + SVC classifier on symptom text data.
    
    Args:
        csv_path: Optional path to real CSV data. If None, uses dummy data.
    
    Returns:
        Tuple of (trained_pipeline, tfidf_vectorizer)
    """
    print("\n" + "=" * 60)
    print("Training Symptom Checker Model (TF-IDF + SVC)")
    print("=" * 60)
    
    # Load data
    if csv_path:
        print(f"Loading data from: {csv_path}")
        df = pd.read_csv(csv_path)
        texts = df['Symptoms'].tolist()
        labels = df['Disease'].tolist()
    else:
        print("Generating dummy symptom data...")
        texts, labels = generate_symptom_dummy_data()
    
    print(f"\nDataset size: {len(texts)} samples")
    print(f"Disease classes: {list(set(labels))}")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.2, random_state=42, stratify=labels
    )
    
    # Create TF-IDF vectorizer
    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        max_features=200,
        stop_words='english'
    )
    
    X_train_tfidf = vectorizer.fit_transform(X_train)
    X_test_tfidf = vectorizer.transform(X_test)
    
    # Train SVC classifier
    classifier = SVC(
        kernel='linear',
        C=1.0,
        random_state=42,
        probability=True
    )
    classifier.fit(X_train_tfidf, y_train)
    
    # Evaluate
    y_pred = classifier.predict(X_test_tfidf)
    
    print("\n--- Model Evaluation ---")
    print(f"Accuracy:  {accuracy_score(y_test, y_pred):.4f}")
    print(f"F1-Score:  {f1_score(y_test, y_pred, average='weighted'):.4f}")
    print(f"Precision: {precision_score(y_test, y_pred, average='weighted'):.4f}")
    print(f"Recall:    {recall_score(y_test, y_pred, average='weighted'):.4f}")
    
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # Save models
    joblib.dump(vectorizer, 'tfidf_vectorizer.pkl')
    joblib.dump(classifier, 'symptom_model.pkl')
    
    print("\n✓ Models saved as:")
    print("  - 'tfidf_vectorizer.pkl'")
    print("  - 'symptom_model.pkl'")
    
    return vectorizer, classifier


# =============================================================================
# MAIN EXECUTION
# =============================================================================

if __name__ == '__main__':
    """
    Main entry point. Trains both models.
    
    To use real data:
        python train_models.py path/to/checkup_data.csv path/to/symptom_data.csv
    """
    import sys
    
    # Parse optional CSV arguments
    checkup_csv = sys.argv[1] if len(sys.argv) > 1 else None
    symptom_csv = sys.argv[2] if len(sys.argv) > 2 else None
    
    print("\n" + "#" * 60)
    print("# Health AI - ML Model Training")
    print("#" * 60)
    
    # Train checkup model
    train_checkup_model(checkup_csv)
    
    # Train symptom model
    train_symptom_model(symptom_csv)
    
    print("\n" + "#" * 60)
    print("# All models trained successfully!")
    print("#" * 60)
