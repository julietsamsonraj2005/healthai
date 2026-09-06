import { User, Checkup, SymptomLog, AuthTokens, BloodReport, BMIData } from "@/types/models";

const API_BASE_URL = "http://localhost:8000/api";

const getHeaders = (auth = true) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth) {
    // If there is an old invalid mock token, Node.js will gracefully reject it, but we can try to intercept it if we want.
    // For now we just send whatever is in localstorage.
    const token = localStorage.getItem("healthai_token");
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

// ── Auth ──
export async function loginUser(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: getHeaders(false),
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Login failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Store token
    localStorage.setItem("healthai_token", data.access_token);
    
    return {
      user: {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        age: data.user.age,
        gender: data.user.gender as "male" | "female" | "other",
      },
      tokens: {
        accessToken: data.access_token,
        refreshToken: data.access_token, // Using same token for simplicity
      },
    };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export async function registerUser(name: string, email: string, password: string, age: number, gender: string): Promise<{ user: User; tokens: AuthTokens }> {
  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: "POST",
      headers: getHeaders(false),
      body: JSON.stringify({ name, email, password, age, gender }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Registration failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Store token (backend should return token on registration too)
    if (data.access_token) {
      localStorage.setItem("healthai_token", data.access_token);
    }
    
    return {
      user: {
        id: data.id,
        name: data.name,
        email: data.email,
        age: data.age,
        gender: data.gender as "male" | "female" | "other",
      },
      tokens: {
        accessToken: data.access_token || "mock_token",
        refreshToken: data.access_token || "mock_token",
      },
    };
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

// ── Checkups ──
export async function getCheckups(): Promise<Checkup[]> {
  try {
    const response = await fetch('http://localhost:8000/api/checkups', { 
      headers: {
        'Content-Type': 'application/json',
      }
    });
    if (!response.ok) {
      console.warn('Failed to fetch checkups from backend, falling back to empty array');
      return []; // Graceful fallback
    }
    const rawData = await response.json();
    
    // Transform raw data to match Checkup interface
    const transformedData: Checkup[] = rawData.map((item: any) => ({
      id: item.id || 'unknown',
      date: item.date || new Date().toISOString().split('T')[0],
      bmiData: {
        height: item.bmiData?.height || 0,
        weight: item.bmiData?.weight || 0,
        score: item.bmiData?.score || 0,
        category: item.bmiData?.category || 'Normal'
      },
      bloodReport: {
        hemoglobin: item.bloodReport?.hemoglobin || 0,
        fastingSugar: item.bloodReport?.fastingSugar || 0,
        totalCholesterol: item.bloodReport?.totalCholesterol || 0,
        hdl: item.bloodReport?.hdl || 0,
        ldl: item.bloodReport?.ldl || 0,
        triglycerides: item.bloodReport?.triglycerides || 0,
        creatinine: item.bloodReport?.creatinine || 0,
        tsh: item.bloodReport?.tsh || 0
      },
      aiPredictions: (item.aiPredictions || []).map((pred: any) => ({
        riskTag: pred.riskTag || 'Unknown Risk',
        riskLevel: pred.riskLevel || 'low',
        confidence: pred.confidence || 0.5,
        description: pred.description || 'No description available'
      })),
      preventionPlan: (item.preventionPlan || []).map((plan: any) => ({
        conditionTag: plan.conditionTag || 'Health Plan',
        title: plan.title || 'Health Management',
        dietSteps: Array.isArray(plan.dietSteps) ? plan.dietSteps : [],
        exerciseSteps: Array.isArray(plan.exerciseSteps) ? plan.exerciseSteps : [],
        monitoringSteps: Array.isArray(plan.monitoringSteps) ? plan.monitoringSteps : [],
        medicalDisclaimer: plan.medicalDisclaimer || 'This plan is generated for educational purposes. Consult your physician.'
      }))
    }));
    
    return transformedData || [];
  } catch (error) {
    console.error('Error fetching checkups:', error);
    return []; // Graceful fallback
  }
}

export async function submitCheckup(bloodReport: BloodReport, bmiData: Omit<BMIData, "score" | "category">): Promise<Checkup> {
  const response = await fetch(`${API_BASE_URL}/checkups/submit`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ bloodReport, bmiData }),
  });
  if (!response.ok) throw new Error("Failed to submit checkup");
  return response.json();
}

// ── FastAPI Integration ──
export const submitCheckupAnalysis = async (checkupData: { bloodReport: BloodReport; bmiData: Omit<BMIData, "score" | "category"> }) => {
  try {
    // Calculate BMI from height and weight
    const heightInMeters = Number(checkupData.bmiData.height) / 100;
    const bmi = Number(checkupData.bmiData.weight) / (heightInMeters * heightInMeters);
    
    // Validate required fields
    if (!checkupData.bmiData.height || !checkupData.bmiData.weight) {
      throw new Error('Height and weight are required');
    }
    
    // Point directly to your Python FastAPI backend
    const response = await fetch('http://localhost:8000/api/analyze-checkup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Send the complete payload with all fields parsed as numbers
      body: JSON.stringify({
        height: Number(checkupData.bmiData.height) || 0,
        weight: Number(checkupData.bmiData.weight) || 0,
        bmi: Math.round(bmi * 10) / 10, // Round to 1 decimal place
        hemoglobin: Number(checkupData.bloodReport.hemoglobin) || 14.0,
        fasting_sugar: Number(checkupData.bloodReport.fastingSugar) || 95,
        total_cholesterol: Number(checkupData.bloodReport.totalCholesterol) || 180,
        hdl: Number(checkupData.bloodReport.hdl) || 50,
        ldl: Number(checkupData.bloodReport.ldl) || 100,
        triglycerides: Number(checkupData.bloodReport.triglycerides) || 150,
        creatinine: Number(checkupData.bloodReport.creatinine) || 1.0,
        tsh: Number(checkupData.bloodReport.tsh) || 2.5
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`Failed to analyze checkup: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data || !data.risks || !data.prevention_plans) {
      throw new Error('Invalid response structure from server');
    }
    
    return data; 
    
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

// ── Symptoms ──
export async function getSymptomLogs(): Promise<SymptomLog[]> {
  try {
    const response = await fetch('http://localhost:8000/api/symptom-logs', { 
      headers: {
        'Content-Type': 'application/json',
      }
    });
    if (!response.ok) {
      console.warn('Failed to fetch symptom logs from backend, falling back to empty array');
      return []; // Graceful fallback
    }
    const rawData = await response.json();
    
    // Transform raw data to match SymptomLog interface
    const transformedData: SymptomLog[] = rawData.map((item: any) => ({
      id: item.id || 'unknown',
      date: item.date || new Date().toISOString().split('T')[0],
      rawText: item.rawText || 'No description available',
      extractedSymptoms: Array.isArray(item.extractedSymptoms) ? item.extractedSymptoms : [],
      predictedIllness: item.predictedIllness || 'Unknown Condition',
      triageAdvice: {
        level: item.triageAdvice?.level || 'self-care',
        message: item.triageAdvice?.message || 'Analysis completed',
        homeRemedies: Array.isArray(item.triageAdvice?.homeRemedies) ? item.triageAdvice.homeRemedies : []
      }
    }));
    
    return transformedData || [];
  } catch (error) {
    console.error('Error fetching symptom logs:', error);
    return []; // Graceful fallback
  }
}

export async function analyzeSymptoms(rawText: string): Promise<SymptomLog> {
  const response = await fetch(`${API_BASE_URL}/symptoms/analyze`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ text: rawText }),
  });
  if (!response.ok) throw new Error("Analysis failed");
  return response.json();
}

// ── FastAPI Integration ──
export const checkSymptomsWithAI = async (symptomText: string) => {
  try {
    const response = await fetch('http://localhost:8000/api/check-symptoms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: symptomText }),
    });

    if (!response.ok) {
      throw new Error('Failed to analyze symptoms');
    }

    const data = await response.json();
    return data; 
    
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

// ── Save New Data to Backend ──
export async function saveCheckupToHistory(checkupData: Checkup): Promise<Checkup> {
  try {
    const response = await fetch('http://localhost:8000/api/save-checkup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkupData),
    });

    if (!response.ok) {
      throw new Error('Failed to save checkup to history');
    }

    return response.json();
  } catch (error) {
    console.error('Error saving checkup to history:', error);
    throw error;
  }
}

export async function saveSymptomToHistory(symptomData: SymptomLog): Promise<SymptomLog> {
  try {
    const response = await fetch('http://localhost:8000/api/save-symptom', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(symptomData),
    });

    if (!response.ok) {
      throw new Error('Failed to save symptom to history');
    }

    return response.json();
  } catch (error) {
    console.error('Error saving symptom to history:', error);
    throw error;
  }
}

// ── User ──
export async function getUserProfile(): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/user/profile`, { headers: getHeaders() });
  if (!response.ok) throw new Error("Failed to load user profile");
  return response.json();
}
