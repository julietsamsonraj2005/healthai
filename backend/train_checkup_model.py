import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, classification_report
from sklearn.pipeline import Pipeline
import joblib
import warnings
warnings.filterwarnings('ignore')

FEATURE_COLUMNS = [
    'height', 'weight', 'bmi',
    'hemoglobin', 'fasting_sugar', 'total_cholesterol',
    'hdl', 'ldl', 'triglycerides', 'creatinine', 'tsh'
]

DISEASE_LABELS = [
    'healthy',
    'diabetes_risk',
    'heart_disease_risk',
    'thyroid_disorder',
    'kidney_issue',
    'anemia',
    'metabolic_syndrome'
]

def generate_dummy_dataset(n_samples: int = 2000) -> pd.DataFrame:
    np.random.seed(42)
    
    data = {
        'height': np.random.uniform(150, 190, n_samples),
        'weight': np.random.uniform(45, 120, n_samples),
        'hemoglobin': np.random.uniform(10, 17, n_samples),
        'fasting_sugar': np.random.uniform(70, 200, n_samples),
        'total_cholesterol': np.random.uniform(120, 280, n_samples),
        'hdl': np.random.uniform(30, 80, n_samples),
        'ldl': np.random.uniform(50, 180, n_samples),
        'triglycerides': np.random.uniform(50, 300, n_samples),
        'creatinine': np.random.uniform(0.5, 2.5, n_samples),
        'tsh': np.random.uniform(0.5, 10, n_samples),
    }
    
    df = pd.DataFrame(data)
    df['bmi'] = df['weight'] / ((df['height'] / 100) ** 2)
    df = df[FEATURE_COLUMNS]
    
    labels = []
    for idx in range(n_samples):
        row = df.iloc[idx]
        score = 0
        
        if row['fasting_sugar'] > 126:
            score += 2
        elif row['fasting_sugar'] > 100:
            score += 1
            
        if row['total_cholesterol'] > 240:
            score += 2
        elif row['total_cholesterol'] > 200:
            score += 1
            
        if row['ldl'] > 160:
            score += 2
        elif row['ldl'] > 100:
            score += 1
            
        if row['hdl'] < 40:
            score += 2
        elif row['hdl'] < 50:
            score += 1
            
        if row['triglycerides'] > 200:
            score += 2
        elif row['triglycerides'] > 150:
            score += 1
            
        if row['tsh'] > 5.5:
            score += 1
        elif row['tsh'] < 0.4:
            score += 1
            
        if row['creatinine'] > 1.5:
            score += 2
        elif row['creatinine'] > 1.2:
            score += 1
            
        if row['hemoglobin'] < 12:
            score += 2
        elif row['hemoglobin'] < 13.5:
            score += 1
            
        if row['bmi'] > 30:
            score += 2
        elif row['bmi'] > 25:
            score += 1
            
        if score >= 8:
            labels.append('metabolic_syndrome')
        elif score >= 6:
            labels.append('heart_disease_risk')
        elif score >= 4:
            labels.append('diabetes_risk')
        elif score >= 3:
            labels.append('thyroid_disorder')
        elif score >= 2:
            labels.append('kidney_issue')
        elif score >= 1:
            labels.append('anemia')
        else:
            labels.append('healthy')
    
    df['label'] = labels
    return df

def train_model(csv_path: str = None):
    print("=" * 60)
    print("HEALTH AI - Quantitative Health Prediction Model Training")
    print("=" * 60)
    
    if csv_path:
        print(f"\nLoading dataset from: {csv_path}")
        df = pd.read_csv(csv_path)
    else:
        print("\nGenerating dummy dataset for training...")
        df = generate_dummy_dataset(n_samples=3000)
        print(f"Generated {len(df)} samples")
    
    X = df[FEATURE_COLUMNS]
    y = df['label']
    
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    
    print(f"\nClass distribution:")
    for label in label_encoder.classes_:
        count = (y == label).sum()
        print(f"  {label}: {count}")
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    
    print("\n" + "-" * 40)
    print("Phase 1: Hyperparameter Tuning with GridSearchCV")
    print("-" * 40)
    
    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('classifier', RandomForestClassifier(random_state=42, n_jobs=-1))
    ])
    
    param_grid = {
        'classifier__n_estimators': [100, 200],
        'classifier__max_depth': [10, 20, None],
        'classifier__min_samples_split': [2, 5],
        'classifier__min_samples_leaf': [1, 2],
    }
    
    print("Running GridSearchCV (this may take a few minutes)...")
    grid_search = GridSearchCV(
        pipeline, param_grid, cv=5, scoring='f1_weighted', n_jobs=-1, verbose=1
    )
    grid_search.fit(X_train, y_train)
    
    print(f"\nBest parameters: {grid_search.best_params_}")
    print(f"Best CV F1-score: {grid_search.best_score_:.4f}")
    
    best_model = grid_search.best_estimator_
    
    print("\n" + "-" * 40)
    print("Phase 2: Model Evaluation on Test Set")
    print("-" * 40)
    
    y_pred = best_model.predict(X_test)
    
    accuracy = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average='weighted')
    precision = precision_score(y_test, y_pred, average='weighted')
    recall = recall_score(y_test, y_pred, average='weighted')
    
    print(f"\nAccuracy:  {accuracy:.4f}")
    print(f"F1-Score:  {f1:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    
    print("\nDetailed Classification Report:")
    print(classification_report(
        y_test, y_pred, 
        target_names=label_encoder.classes_
    ))
    
    model_data = {
        'model': best_model,
        'label_encoder': label_encoder,
        'feature_columns': FEATURE_COLUMNS,
        'disease_labels': list(label_encoder.classes_)
    }
    
    output_path = 'checkup_model.pkl'
    joblib.dump(model_data, output_path)
    print(f"\n{'=' * 60}")
    print(f"Model saved successfully as: {output_path}")
    print(f"{'=' * 60}")
    
    return best_model, label_encoder

if __name__ == '__main__':
    import sys
    csv_path = sys.argv[1] if len(sys.argv) > 1 else None
    train_model(csv_path)
