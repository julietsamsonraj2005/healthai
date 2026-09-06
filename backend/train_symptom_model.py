import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, classification_report
from sklearn.pipeline import Pipeline
import joblib
import warnings
warnings.filterwarnings('ignore')

DISEASE_TAGS = [
    'disease_viral_fever',
    'disease_common_cold',
    'disease_migraine',
    'disease_food_poisoning',
    'disease_asthma',
    'disease_acid_reflux',
    'disease_muscle_strain',
    'disease_allergies',
    'disease_eye_infection',
    'disease_skin_rash'
]

SAMPLE_SYMPTOMS = {
    'disease_viral_fever': [
        'I have fever and feel weak',
        'high temperature with body aches',
        'feeling hot and tired',
        'fever with chills and fatigue',
        'elevated body temperature and weakness',
        'I think I have viral fever',
        'running fever since yesterday',
        'feeling feverish with headache'
    ],
    'disease_common_cold': [
        'runny nose and sneezing',
        'cold and congested',
        'stuffy nose and cough',
        'I have a cold',
        'running nose and sore throat',
        'nasal congestion and sneezing',
        'feeling cold with cough',
        'head cold symptoms'
    ],
    'disease_migraine': [
        'severe headache and nausea',
        'migraine with sensitivity to light',
        'headache on one side',
        'pulsating headache',
        'I have a migraine',
        'severe headache with vomiting',
        'headache and light sensitivity',
        'throbbing headache'
    ],
    'disease_food_poisoning': [
        'vomiting and diarrhea',
        'stomach upset after eating',
        'food poisoning symptoms',
        'nausea and stomach pain',
        'stomach cramps and vomiting',
        'feeling sick after food',
        'diarrhea and nausea',
        'stomach virus'
    ],
    'disease_asthma': [
        'difficulty breathing and wheezing',
        'shortness of breath',
        'asthma attack symptoms',
        'breathing problem and chest tightness',
        'wheezing and coughing',
        'trouble breathing',
        'asthma flare up',
        'breathing difficulty'
    ],
    'disease_acid_reflux': [
        'heartburn and acid reflux',
        'burning in chest after eating',
        'acid reflux symptoms',
        'stomach acid coming up',
        'chest burning and indigestion',
        'gerd symptoms',
        'acid in throat',
        'heartburn and nausea'
    ],
    'disease_muscle_strain': [
        'muscle pain and strain',
        'back pain from lifting',
        'sore muscles',
        'muscle strain in leg',
        'pulled muscle',
        'muscle ache after exercise',
        'body pain and stiffness',
        'strained neck'
    ],
    'disease_allergies': [
        'allergy symptoms itching',
        'allergic reaction and hives',
        'seasonal allergies',
        'sneezing and itchy eyes',
        'allergy to dust',
        'skin allergy and rash',
        'allergic rhinitis',
        'eyes watering and itching'
    ],
    'disease_eye_infection': [
        'eye infection and redness',
        'itchy eyes with discharge',
        'pink eye symptoms',
        'eye pain and swelling',
        'conjunctivitis',
        'eyes are red and watery',
        'eye irritation and blur',
        'infected eye'
    ],
    'disease_skin_rash': [
        'skin rash and itching',
        'red patches on skin',
        'skin irritation',
        'rashes on body',
        'allergic skin reaction',
        'eczema symptoms',
        'dermatitis rash',
        'itchy skin bumps'
    ]
}

def generate_dummy_dataset() -> tuple:
    texts = []
    labels = []
    
    for disease, symptoms in SAMPLE_SYMPTOMS.items():
        for symptom in symptoms:
            texts.append(symptom)
            labels.append(disease)
    
    return texts, labels

def train_model(csv_path: str = None):
    print("=" * 60)
    print("HEALTH AI - NLP Symptom Checker Model Training")
    print("=" * 60)
    
    if csv_path:
        print(f"\nLoading dataset from: {csv_path}")
        import pandas as pd
        df = pd.read_csv(csv_path)
        texts = df['symptom_text'].tolist()
        labels = df['disease_tag'].tolist()
    else:
        print("\nGenerating dummy text dataset for training...")
        texts, labels = generate_dummy_dataset()
    
    print(f"Total samples: {len(texts)}")
    print(f"Number of disease classes: {len(set(labels))}")
    
    print("\nClass distribution:")
    from collections import Counter
    for label, count in Counter(labels).most_common():
        print(f"  {label}: {count}")
    
    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.2, random_state=42, stratify=labels
    )
    
    print("\n" + "-" * 40)
    print("Building TF-IDF + SVC Pipeline")
    print("-" * 40)
    
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=500,
            min_df=1,
            stop_words='english'
        )),
        ('classifier', SVC(
            kernel='linear',
            C=1.0,
            random_state=42,
            probability=True
        ))
    ])
    
    print("Training the model...")
    pipeline.fit(X_train, y_train)
    
    print("\n" + "-" * 40)
    print("Model Evaluation on Test Set")
    print("-" * 40)
    
    y_pred = pipeline.predict(X_test)
    
    accuracy = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average='weighted')
    precision = precision_score(y_test, y_pred, average='weighted')
    recall = recall_score(y_test, y_pred, average='weighted')
    
    print(f"\nAccuracy:  {accuracy:.4f}")
    print(f"F1-Score:  {f1:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    
    print("\nDetailed Classification Report:")
    unique_labels = sorted(set(y_test))
    print(classification_report(y_test, y_pred, labels=unique_labels))
    
    print("\nSaving models...")
    joblib.dump(pipeline, 'symptom_model.pkl')
    joblib.dump(pipeline.named_steps['tfidf'], 'tfidf_vectorizer.pkl')
    
    print(f"\n{'=' * 60}")
    print("Models saved successfully:")
    print("  - symptom_model.pkl")
    print("  - tfidf_vectorizer.pkl")
    print(f"{'=' * 60}")
    
    test_samples = [
        "I have fever and feeling very weak",
        "runny nose and sore throat",
        "severe headache with nausea"
    ]
    
    print("\n" + "-" * 40)
    print("Sample Predictions")
    print("-" * 40)
    for sample in test_samples:
        pred = pipeline.predict([sample])[0]
        print(f"Input: '{sample}'")
        print(f"Prediction: {pred}\n")
    
    return pipeline

if __name__ == '__main__':
    import sys
    csv_path = sys.argv[1] if len(sys.argv) > 1 else None
    train_model(csv_path)
