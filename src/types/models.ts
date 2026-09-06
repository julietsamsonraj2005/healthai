export interface User {
  id: string;
  name: string;
  email: string;
  age: number;
  gender: "male" | "female" | "other";
}

export interface BMIData {
  height: number; // cm
  weight: number; // kg
  score: number;
  category: "Underweight" | "Normal" | "Overweight" | "Obese";
}

export interface BloodReport {
  hemoglobin: number;
  fastingSugar: number;
  totalCholesterol: number;
  hdl: number;
  ldl: number;
  triglycerides: number;
  creatinine: number;
  tsh: number;
}

export interface AIPrediction {
  riskTag: string;
  riskLevel: "low" | "medium" | "high";
  confidence: number;
  description: string;
}

export interface PreventionProtocol {
  conditionTag: string;
  title: string;
  dietSteps: string[];
  exerciseSteps: string[];
  monitoringSteps: string[];
  medicalDisclaimer: string;
}

export interface Checkup {
  id: string;
  date: string;
  bmiData: BMIData;
  bloodReport: BloodReport;
  aiPredictions: AIPrediction[];
  preventionPlan: PreventionProtocol[];
}

export interface SymptomLog {
  id: string;
  date: string;
  rawText: string;
  extractedSymptoms: string[];
  predictedIllness: string;
  triageAdvice: {
    level: "self-care" | "consult-doctor" | "urgent" | "emergency";
    message: string;
    homeRemedies: string[];
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
