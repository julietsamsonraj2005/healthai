import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { submitCheckup, submitCheckupAnalysis, saveCheckupToHistory } from "@/api/services";
import { Checkup, BloodReport } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, ArrowLeft, Stethoscope, CheckCircle2, AlertTriangle, Utensils, Dumbbell, ClipboardList } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const riskColors: Record<string, string> = {
  low: "bg-success/10 text-success border-success/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  high: "bg-destructive/10 text-destructive border-destructive/20",
};

const initialBlood: BloodReport = { hemoglobin: 13.5, fastingSugar: 110, totalCholesterol: 200, hdl: 45, ldl: 130, triglycerides: 160, creatinine: 1.0, tsh: 3.0 };

export default function CheckupPage() {
  const [step, setStep] = useState<"form-body" | "form-blood" | "loading" | "results">("form-body");
  const [height, setHeight] = useState("175");
  const [weight, setWeight] = useState("82");
  const [blood, setBlood] = useState<BloodReport>(initialBlood);
  const [result, setResult] = useState<Checkup | null>(null);
  const [fastApiResult, setFastApiResult] = useState<{ risks: any[]; prevention_plans: any[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setStep("loading");
    setError(null); // Clear previous errors
    
    try {
      // Validate form inputs
      if (!height || !weight || Number(height) <= 0 || Number(weight) <= 0) {
        throw new Error('Please enter valid height and weight values');
      }
      
      // Validate blood report values
      if (!blood.hemoglobin || !blood.fastingSugar || !blood.totalCholesterol) {
        throw new Error('Please complete all required blood report fields');
      }
      
      // Use the new FastAPI endpoint
      const fastApiResponse = await submitCheckupAnalysis({ bloodReport: blood, bmiData: { height: Number(height), weight: Number(weight) } });
      
      // Validate response structure
      if (!fastApiResponse || !fastApiResponse.risks || !fastApiResponse.prevention_plans) {
        throw new Error('Invalid response structure from server');
      }
      
      setFastApiResult(fastApiResponse);
      
      // Calculate BMI for display
      const heightInMeters = Number(height) / 100;
      const bmiScore = Number(weight) / (heightInMeters * heightInMeters);
      const bmiRounded = Math.round(bmiScore * 10) / 10;
      
      // Determine BMI category
      let bmiCategory: "Underweight" | "Normal" | "Overweight" | "Obese" = "Normal";
      if (bmiScore < 18.5) bmiCategory = "Underweight";
      else if (bmiScore < 25) bmiCategory = "Normal";
      else if (bmiScore < 30) bmiCategory = "Overweight";
      else bmiCategory = "Obese";
      
      // Create a mock Checkup object for UI compatibility with error handling
      const mockCheckup: Checkup = {
        id: "fastapi_" + Date.now(),
        date: new Date().toISOString().split('T')[0],
        bmiData: {
          height: Number(height),
          weight: Number(weight),
          score: bmiRounded,
          category: bmiCategory
        },
        bloodReport: blood,
        aiPredictions: [],
        preventionPlan: []
      };
      
      // Safely map risks with error handling
      try {
        if (Array.isArray(fastApiResponse.risks)) {
          mockCheckup.aiPredictions = fastApiResponse.risks.map((risk: any, index: number) => ({
            riskTag: risk?.condition || 'Unknown Risk',
            riskLevel: risk?.risk_level?.split(' ')[0] as "high" | "medium" | "low" || "medium",
            confidence: risk?.confidence ? parseFloat(risk.confidence.replace('%', '')) / 100 : 0.5,
            description: risk?.description || 'No description available'
          }));
        }
      } catch (error) {
        console.error('Error mapping risks:', error);
        mockCheckup.aiPredictions = [{
          riskTag: 'Analysis Error',
          riskLevel: 'medium' as const,
          confidence: 0.5,
          description: 'Unable to process risk analysis'
        }];
      }
      
      // Safely map prevention plans with error handling
      try {
        if (Array.isArray(fastApiResponse.prevention_plans)) {
          mockCheckup.preventionPlan = fastApiResponse.prevention_plans.map((plan: any) => ({
            conditionTag: plan?.title || 'Prevention Plan',
            title: plan?.title || 'Health Plan',
            dietSteps: Array.isArray(plan?.diet) ? plan.diet : ['No diet steps available'],
            exerciseSteps: Array.isArray(plan?.exercise) ? plan.exercise : ['No exercise steps available'],
            monitoringSteps: Array.isArray(plan?.monitoring) ? plan.monitoring : ['No monitoring steps available'],
            medicalDisclaimer: "This plan is generated by AI for educational purposes only. Consult your physician before making any changes to your diet or exercise routine."
          }));
        }
      } catch (error) {
        console.error('Error mapping prevention plans:', error);
        mockCheckup.preventionPlan = [{
          conditionTag: 'Health Plan',
          title: 'General Health Advice',
          dietSteps: ['Maintain balanced diet'],
          exerciseSteps: ['Exercise regularly'],
          monitoringSteps: ['Regular health checkups'],
          medicalDisclaimer: "This plan is generated by AI for educational purposes only. Consult your physician before making any changes to your diet or exercise routine."
        }];
      }
      
      setResult(mockCheckup);
      
      // Save the checkup to history
      try {
        await saveCheckupToHistory(mockCheckup);
        console.log('Checkup saved to history successfully');
      } catch (saveError) {
        console.warn('Failed to save checkup to history:', saveError);
        // Don't fail the whole process if saving fails
      }
      
      setStep("results");
    } catch (error) {
      console.error("Failed to submit checkup:", error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      setStep("form-blood"); // Go back to form on error
    }
  };

  const updateBlood = (key: keyof BloodReport, val: string) => setBlood({ ...blood, [key]: Number(val) });

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto animate-fade-in">
        {/* Form Step 1 - Body Metrics */}
        {step === "form-body" && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
                <Stethoscope className="h-8 w-8 text-primary" />
                Full Body Checkup Analysis
              </h1>
              <p className="text-muted-foreground mt-1">Step 1 of 2 — Enter your body measurements</p>
            </div>
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display">Body Measurements</CardTitle>
                <CardDescription>Enter your height and weight for BMI calculation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input id="height" type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input id="weight" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
                  </div>
                </div>
                <Button className="gradient-primary border-0 hover:opacity-90" onClick={() => setStep("form-blood")}>
                  Next: Blood Report <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Form Step 2 - Blood Report */}
        {step === "form-blood" && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
                <Stethoscope className="h-8 w-8 text-primary" />
                Full Body Checkup Analysis
              </h1>
              <p className="text-muted-foreground mt-1">Step 2 of 2 — Enter your blood report values</p>
            </div>
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display">Blood Report</CardTitle>
                <CardDescription>Enter values from your latest blood test</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  {([
                    ["hemoglobin", "Hemoglobin (g/dL)"],
                    ["fastingSugar", "Fasting Sugar (mg/dL)"],
                    ["totalCholesterol", "Total Cholesterol (mg/dL)"],
                    ["hdl", "HDL Cholesterol (mg/dL)"],
                    ["ldl", "LDL Cholesterol (mg/dL)"],
                    ["triglycerides", "Triglycerides (mg/dL)"],
                    ["creatinine", "Creatinine (mg/dL)"],
                    ["tsh", "TSH (mIU/L)"],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={key}>{label}</Label>
                      <Input id={key} type="number" step="0.1" value={blood[key]} onChange={(e) => updateBlood(key, e.target.value)} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("form-body")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button className="gradient-primary border-0 hover:opacity-90 flex-1" onClick={handleSubmit}>
                    Analyze with AI <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="space-y-6 animate-fade-in">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="font-medium text-destructive">Analysis Failed</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setError(null)}>
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {step === "loading" && (
          <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
            <div className="relative">
              <div className="h-20 w-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <Stethoscope className="absolute inset-0 m-auto h-8 w-8 text-primary animate-pulse-glow" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground mt-8">AI Analysis in Progress</h2>
            <p className="text-muted-foreground mt-2 text-center max-w-md">
              Our AI model is analyzing your health data, calculating risk scores, and generating personalized prevention plans...
            </p>
          </div>
        )}

        {/* Results */}
        {step === "results" && result && (
          <div className="space-y-8 animate-slide-up">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-success" />
                Analysis Complete
              </h1>
              <p className="text-muted-foreground mt-1">Date: {result.date}</p>
            </div>

            {/* BMI Card */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display">BMI Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-5xl font-display font-bold text-foreground">{result.bmiData.score}</p>
                    <Badge className={riskColors[result.bmiData.category === "Normal" ? "low" : result.bmiData.category === "Overweight" ? "medium" : "high"] + " mt-2"}>
                      {result.bmiData.category}
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                      <div className="bg-info h-full" style={{ width: "25%" }} />
                      <div className="bg-success h-full" style={{ width: "25%" }} />
                      <div className="bg-warning h-full" style={{ width: "25%" }} />
                      <div className="bg-destructive h-full" style={{ width: "25%" }} />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Underweight</span><span>Normal</span><span>Overweight</span><span>Obese</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">Height: {result.bmiData.height} cm · Weight: {result.bmiData.weight} kg</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk Predictions */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" /> AI Risk Predictions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result?.aiPredictions?.map((p, i) => (
                  <div key={i} className="rounded-lg border border-border p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={riskColors[p.riskLevel] + " uppercase text-xs font-bold"}>
                        {p.riskLevel} risk
                      </Badge>
                      <h4 className="font-display text-lg font-semibold text-foreground">{p.riskTag}</h4>
                      <Badge variant="outline" className="ml-auto">
                        {Math.round(p.confidence * 100)}% confidence
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{p.description}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full gradient-primary" style={{ width: `${p.confidence * 100}%` }} />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">{Math.round(p.confidence * 100)}%</span>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p>No risk predictions available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Prevention Plans */}
            {result?.preventionPlan?.map((plan, i) => (
              <Card key={i} className="shadow-card border-primary/20">
                <CardHeader className="gradient-primary rounded-t-lg">
                  <CardTitle className="font-display text-primary-foreground">{plan.title}</CardTitle>
                  <CardDescription className="text-primary-foreground/70">Prevention protocol for {plan.conditionTag}</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Diet Column */}
                    <div className="space-y-3">
                      <h4 className="font-display font-semibold text-foreground flex items-center gap-2">
                        <Utensils className="h-4 w-4 text-primary" /> Dietary Adjustments
                      </h4>
                      <ul className="space-y-2">
                        {plan.dietSteps?.map((s, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                            {s}
                          </li>
                        )) || (
                          <li className="text-sm text-muted-foreground italic">No diet steps available</li>
                        )}
                      </ul>
                    </div>
                    
                    {/* Exercise Column */}
                    <div className="space-y-3">
                      <h4 className="font-display font-semibold text-foreground flex items-center gap-2">
                        <Dumbbell className="h-4 w-4 text-primary" /> Physical Activity
                      </h4>
                      <ul className="space-y-2">
                        {plan.exerciseSteps?.map((s, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                            {s}
                          </li>
                        )) || (
                          <li className="text-sm text-muted-foreground italic">No exercise steps available</li>
                        )}
                      </ul>
                    </div>
                    
                    {/* Monitoring Column */}
                    <div className="space-y-3">
                      <h4 className="font-display font-semibold text-foreground flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-primary" /> Monitoring Steps
                      </h4>
                      <ul className="space-y-2">
                        {plan.monitoringSteps?.map((s, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 text-info shrink-0 mt-0.5" />
                            {s}
                          </li>
                        )) || (
                          <li className="text-sm text-muted-foreground italic">No monitoring steps available</li>
                        )}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 flex gap-3 mt-6">
                    <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                    <p className="text-sm text-muted-foreground">{plan.medicalDisclaimer}</p>
                  </div>
                </CardContent>
              </Card>
            )) || (
              <Card className="shadow-card">
                <CardContent className="text-center py-8">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No prevention plans available</p>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
              </Button>
              <Button className="gradient-primary border-0 hover:opacity-90" onClick={() => { setStep("form-body"); setResult(null); setFastApiResult(null); }}>
                New Analysis
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
