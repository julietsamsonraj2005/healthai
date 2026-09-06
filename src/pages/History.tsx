import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Stethoscope,
  MessageSquareText,
  Calendar,
  ChevronRight,
  ArrowLeft,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Heart,
  Apple,
  Dumbbell,
  ClipboardList,
  Thermometer,
  Home,
  Brain,
  TrendingUp,
  Target,
  Shield,
  Clock,
  FileText,
  BarChart3,
  RefreshCw
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { getCheckups, getSymptomLogs } from "@/api/services";
import type { Checkup, SymptomLog } from "@/types/models";

const CHART_COLORS = {
  primary: "hsl(172, 66%, 36%)",
  secondary: "hsl(200, 80%, 46%)",
  success: "hsl(152, 60%, 40%)",
  warning: "hsl(38, 92%, 50%)",
  destructive: "hsl(0, 72%, 51%)",
  info: "hsl(210, 80%, 56%)",
  muted: "hsl(210, 10%, 46%)",
};

const CLINICAL_COLORS = {
  optimal: CHART_COLORS.success,
  normal: CHART_COLORS.info,
  borderline: CHART_COLORS.warning,
  high: CHART_COLORS.destructive,
  emergency: "hsl(0, 84%, 60%)",
  urgent: "hsl(15, 85%, 55%)",
  moderate: "hsl(30, 85%, 50%)",
  low: CHART_COLORS.success,
};

const TRIAGE_COLORS: Record<string, string> = {
  "self-care recommended": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "medical consultation recommended": "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "urgent medical care": "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "emergency medical care": "bg-destructive/15 text-destructive border-destructive/30",
  // Legacy support
  "self-care": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "consult-doctor": "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "urgent": "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "emergency": "bg-destructive/15 text-destructive border-destructive/30",
};

const RISK_COLORS: Record<string, string> = {
  low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  high: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function History() {
  const [selectedCheckup, setSelectedCheckup] = useState<Checkup | null>(null);
  const [selectedSymptom, setSelectedSymptom] = useState<SymptomLog | null>(null);
  const [checkups, setCheckups] = useState<Checkup[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Clinical Health Score Calculation
  const calculateHealthScore = (checkup: Checkup) => {
    const { bmiData, bloodReport } = checkup;
    let score = 100;
    
    // BMI scoring (30 points)
    if (bmiData.category === "Normal") score += 0;
    else if (bmiData.category === "Overweight") score -= 10;
    else if (bmiData.category === "Obese") score -= 20;
    else score -= 5; // Underweight
    
    // Blood markers scoring (70 points)
    if (bloodReport.fastingSugar > 125) score -= 20;
    else if (bloodReport.fastingSugar > 100) score -= 10;
    
    if (bloodReport.ldl > 160) score -= 15;
    else if (bloodReport.ldl > 130) score -= 8;
    
    if (bloodReport.hdl < 40) score -= 10;
    
    if (bloodReport.triglycerides > 200) score -= 10;
    else if (bloodReport.triglycerides > 150) score -= 5;
    
    if (bloodReport.hemoglobin < 12) score -= 8;
    
    if (bloodReport.creatinine > 1.3) score -= 7;
    
    if (bloodReport.tsh > 4.0 || bloodReport.tsh < 0.4) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  };

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [checkupsData, symptomsData] = await Promise.all([
        getCheckups(),
        getSymptomLogs()
      ]);
      
      // Sort by date (newest first) to ensure latest histories appear first
      const sortedCheckups = checkupsData.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const sortedSymptoms = symptomsData.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      setCheckups(sortedCheckups);
      setSymptoms(sortedSymptoms);
    } catch (error) {
      console.error('Failed to load history data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (selectedCheckup) {
    return (
      <AppLayout>
        <CheckupDetail checkup={selectedCheckup} onBack={() => setSelectedCheckup(null)} />
      </AppLayout>
    );
  }

  if (selectedSymptom) {
    return (
      <AppLayout>
        <SymptomDetail log={selectedSymptom} onBack={() => setSelectedSymptom(null)} />
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-muted animate-pulse rounded"></div>
            <div className="h-8 w-48 bg-muted animate-pulse rounded"></div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-muted animate-pulse rounded-lg h-20"></div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              Clinical History
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Review your comprehensive clinical assessment history. Click any entry to view detailed analysis from our Clinical Rules Engine and Clinical Triage Engine.
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                {checkups.length} Clinical Assessments
              </span>
              <span className="flex items-center gap-1">
                <MessageSquareText className="h-3 w-3" />
                {symptoms.length} Symptom Analyses
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Tabs defaultValue="checkups" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="checkups" className="gap-2">
              <Stethoscope className="h-4 w-4" /> Clinical Assessments
            </TabsTrigger>
            <TabsTrigger value="symptoms" className="gap-2">
              <MessageSquareText className="h-4 w-4" /> Symptom Triage
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checkups" className="mt-4 space-y-3">
            {checkups.length === 0 ? (
              <EmptyState 
                icon={Stethoscope} 
                text="No clinical assessment records yet." 
                action="Complete a full body checkup to see your clinical assessment results here. The Clinical Rules Engine will analyze your biomarkers and provide personalized health insights."
              />
            ) : (
              checkups.map((c) => {
                const healthScore = calculateHealthScore(c);
                return (
                  <Card
                    key={c.id}
                    className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md group border-l-4 border-l-primary"
                    onClick={() => setSelectedCheckup(c)}
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Stethoscope className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">Clinical Assessment</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(c.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Target className="h-3 w-3 text-primary" />
                            <span className="text-xs font-medium text-primary">Health Score: {healthScore}/100</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1.5 flex-wrap justify-end">
                          {c.aiPredictions.slice(0, 2).map((p) => (
                            <Badge key={p.riskTag} variant="outline" className={RISK_COLORS[p.riskLevel]}>
                              {p.riskTag}
                            </Badge>
                          ))}
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="symptoms" className="mt-4 space-y-3">
            {symptoms.length === 0 ? (
              <EmptyState 
                icon={MessageSquareText} 
                text="No symptom triage records yet." 
                action="Use the symptom checker to analyze your symptoms. The Clinical Triage Engine will provide professional medical triage recommendations based on your descriptions."
              />
            ) : (
              symptoms.map((s) => (
                <Card
                  key={s.id}
                  className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md group border-l-4 border-l-info"
                  onClick={() => setSelectedSymptom(s)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-info/10 flex items-center justify-center">
                        <MessageSquareText className="h-6 w-6 text-info" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground truncate max-w-xs">{s.predictedIllness}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(s.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs text-muted-foreground">Symptoms: {s.extractedSymptoms.length}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={TRIAGE_COLORS[s.triageAdvice.level] || TRIAGE_COLORS["emergency"]}>
                        {s.triageAdvice.level.replace("-", " ")}
                      </Badge>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function EmptyState({ icon: Icon, text, action }: { icon: React.ElementType; text: string; action?: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Icon className="h-12 w-12 mb-4 opacity-40" />
        <p className="text-lg font-medium mb-2">{text}</p>
        {action && (
          <p className="text-sm opacity-70 max-w-md text-center">
            {action}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CheckupDetail({ checkup, onBack }: { checkup: Checkup; onBack: () => void }) {
  const { bmiData, bloodReport, aiPredictions, preventionPlan } = checkup;

  // Clinical Health Score Calculation
  const calculateHealthScore = (checkup: Checkup) => {
    const { bmiData, bloodReport } = checkup;
    let score = 100;
    
    // BMI scoring (30 points)
    if (bmiData.category === "Normal") score += 0;
    else if (bmiData.category === "Overweight") score -= 10;
    else if (bmiData.category === "Obese") score -= 20;
    else score -= 5; // Underweight
    
    // Blood markers scoring (70 points)
    if (bloodReport.fastingSugar > 125) score -= 20;
    else if (bloodReport.fastingSugar > 100) score -= 10;
    
    if (bloodReport.ldl > 160) score -= 15;
    else if (bloodReport.ldl > 130) score -= 8;
    
    if (bloodReport.hdl < 40) score -= 10;
    
    if (bloodReport.triglycerides > 200) score -= 10;
    else if (bloodReport.triglycerides > 150) score -= 5;
    
    if (bloodReport.hemoglobin < 12) score -= 8;
    
    if (bloodReport.creatinine > 1.3) score -= 7;
    
    if (bloodReport.tsh > 4.0 || bloodReport.tsh < 0.4) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  };

  const healthScore = calculateHealthScore(checkup);

  // Clinical biomarker status
  const getBiomarkerStatus = (value: number, ranges: { normal: [number, number], high?: number, low?: number }) => {
    if (ranges.high && value > ranges.high) return { status: "high", color: CLINICAL_COLORS.high };
    if (ranges.low && value < ranges.low) return { status: "low", color: CLINICAL_COLORS.borderline };
    if (value < ranges.normal[0] || value > ranges.normal[1]) return { status: "borderline", color: CLINICAL_COLORS.borderline };
    return { status: "normal", color: CLINICAL_COLORS.normal };
  };

  const biomarkerStatuses = {
    fastingSugar: getBiomarkerStatus(bloodReport.fastingSugar, { normal: [70, 99], high: 125 }),
    ldl: getBiomarkerStatus(bloodReport.ldl, { normal: [0, 129], high: 159 }),
    hdl: getBiomarkerStatus(bloodReport.hdl, { normal: [40, 100], low: 40 }),
    triglycerides: getBiomarkerStatus(bloodReport.triglycerides, { normal: [0, 149], high: 199 }),
    hemoglobin: getBiomarkerStatus(bloodReport.hemoglobin, { normal: [12, 16], low: 12 }),
    creatinine: getBiomarkerStatus(bloodReport.creatinine, { normal: [0, 1.3], high: 1.3 }),
    tsh: getBiomarkerStatus(bloodReport.tsh, { normal: [0.4, 4.0], low: 0.4, high: 4.0 }),
    totalCholesterol: getBiomarkerStatus(bloodReport.totalCholesterol, { normal: [0, 199], high: 239 }),
  };

  return (
    <ScrollArea className="h-[calc(100vh-5rem)]">
      <div className="space-y-6 max-w-6xl mx-auto pb-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Clinical Assessment Results</h1>
            <p className="text-sm text-muted-foreground">
              {new Date(checkup.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>

        {/* Clinical Health Score */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" /> Clinical Health Score
            </CardTitle>
            <CardDescription>Overall health assessment based on clinical biomarkers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-primary">{healthScore}</p>
                <p className="text-sm text-muted-foreground">out of 100</p>
              </div>
              <div className="flex-1">
                <Progress value={healthScore} className="h-3" />
                <p className="text-xs text-muted-foreground mt-2">
                  {healthScore >= 90 ? "Excellent health" :
                   healthScore >= 80 ? "Good health" :
                   healthScore >= 70 ? "Fair health" :
                   healthScore >= 60 ? "Poor health" : "Very poor health"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* BMI Analysis */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> BMI Analysis
            </CardTitle>
            <CardDescription>Body Mass Index assessment and categorization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Height", value: `${bmiData.height} cm`, icon: "📏" },
                { label: "Weight", value: `${bmiData.weight} kg`, icon: "⚖️" },
                { label: "BMI Score", value: bmiData.score.toFixed(1), icon: "📊" },
                { label: "Category", value: bmiData.category, icon: "🏷️" },
              ].map((item) => (
                <div key={item.label} className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-lg font-semibold text-foreground mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Clinical Biomarker Analysis */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-primary" /> Clinical Biomarker Analysis
            </CardTitle>
            <CardDescription>Comprehensive blood work analysis with clinical reference ranges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { name: "Fasting Sugar", value: bloodReport.fastingSugar, unit: "mg/dL", status: biomarkerStatuses.fastingSugar },
                { name: "LDL Cholesterol", value: bloodReport.ldl, unit: "mg/dL", status: biomarkerStatuses.ldl },
                { name: "HDL Cholesterol", value: bloodReport.hdl, unit: "mg/dL", status: biomarkerStatuses.hdl },
                { name: "Triglycerides", value: bloodReport.triglycerides, unit: "mg/dL", status: biomarkerStatuses.triglycerides },
                { name: "Total Cholesterol", value: bloodReport.totalCholesterol, unit: "mg/dL", status: biomarkerStatuses.totalCholesterol },
                { name: "Hemoglobin", value: bloodReport.hemoglobin, unit: "g/dL", status: biomarkerStatuses.hemoglobin },
                { name: "Creatinine", value: bloodReport.creatinine, unit: "mg/dL", status: biomarkerStatuses.creatinine },
                { name: "TSH", value: bloodReport.tsh, unit: "mIU/L", status: biomarkerStatuses.tsh },
              ].map((biomarker) => (
                <div key={biomarker.name} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-sm">{biomarker.name}</h4>
                    <span className="text-xs font-medium capitalize" style={{ color: biomarker.status.color }}>
                      {biomarker.status.status}
                    </span>
                  </div>
                  <p className="text-lg font-bold">{biomarker.value}</p>
                  <p className="text-xs text-muted-foreground">{biomarker.unit}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Clinical Risk Assessment */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" /> Clinical Risk Assessment
            </CardTitle>
            <CardDescription>Risk analysis powered by Clinical Rules Engine</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiPredictions.map((p) => (
              <div key={p.riskTag} className="border border-border/60 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground">{p.riskTag}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={RISK_COLORS[p.riskLevel]}>
                      {p.riskLevel} risk
                    </Badge>
                    <span className="text-xs text-muted-foreground">{Math.round(p.confidence * 100)}% confidence</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{p.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Personalized Prevention Protocols */}
        {preventionPlan.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Personalized Prevention Protocols
              </CardTitle>
              <CardDescription>Clinical recommendations generated by Clinical Rules Engine</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {preventionPlan.map((plan) => (
                <div key={plan.conditionTag} className="space-y-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Heart className="h-4 w-4 text-primary" /> {plan.title}
                  </h3>

                  <div className="grid md:grid-cols-3 gap-4">
                    <PlanSection icon={Apple} title="Diet" items={plan.dietSteps} />
                    <PlanSection icon={Dumbbell} title="Exercise" items={plan.exerciseSteps} />
                    <PlanSection icon={ClipboardList} title="Monitoring" items={plan.monitoringSteps} />
                  </div>

                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      <strong>Medical Disclaimer:</strong> {plan.medicalDisclaimer}
                    </AlertDescription>
                  </Alert>

                  <Separator />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Professional Medical Disclaimer */}
        <Alert className="border-orange-200 bg-orange-50">
          <Shield className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Professional Medical Disclaimer:</strong> This clinical assessment is generated by Health AI's Clinical Rules Engine for educational purposes only. 
            This is NOT a substitute for professional medical advice, diagnosis, or treatment. 
            Always consult qualified healthcare providers for medical decisions.
          </AlertDescription>
        </Alert>
      </div>
    </ScrollArea>
  );
}

function SymptomDetail({ log, onBack }: { log: SymptomLog; onBack: () => void }) {
  return (
    <ScrollArea className="h-[calc(100vh-5rem)]">
      <div className="space-y-6 max-w-6xl mx-auto pb-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Symptom Triage Analysis</h1>
            <p className="text-sm text-muted-foreground">
              {new Date(log.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>

        {/* Original Input */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-primary" /> Patient Description
            </CardTitle>
            <CardDescription>Original symptom description provided by patient</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 rounded-lg p-4 border-l-4 border-l-info">
              <p className="text-muted-foreground italic">"{log.rawText}"</p>
            </div>
          </CardContent>
        </Card>

        {/* Clinical Symptom Extraction */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" /> Clinical Symptom Extraction
            </CardTitle>
            <CardDescription>Symptoms identified by Clinical Triage Engine analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {log.extractedSymptoms.map((s) => (
                <Badge key={s} variant="secondary" className="capitalize text-sm">
                  {s}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {log.extractedSymptoms.length} clinical symptoms identified
            </p>
          </CardContent>
        </Card>

        {/* Clinical Prediction */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Clinical Assessment
            </CardTitle>
            <CardDescription>Medical condition assessment by Clinical Triage Engine</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-xl font-semibold text-foreground">{log.predictedIllness}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Primary diagnosis based on symptom analysis
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clinical Triage Recommendation */}
        <Card className={log.triageAdvice.level === "emergency" || log.triageAdvice.level === "emergency medical care" ? "border-destructive/50 border-l-4 border-l-destructive" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              {log.triageAdvice.level === "emergency" || log.triageAdvice.level === "emergency medical care" ? (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              ) : (
                <ShieldCheck className="h-5 w-5 text-primary" />
              )}
              Clinical Triage Recommendation
              <Badge variant="outline" className={TRIAGE_COLORS[log.triageAdvice.level] || TRIAGE_COLORS["emergency"]}>
                {log.triageAdvice.level.replace("-", " ")}
              </Badge>
            </CardTitle>
            <CardDescription>
              Medical triage level determined by Clinical Triage Engine protocols
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-muted-foreground">{log.triageAdvice.message}</p>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                <Home className="h-4 w-4 text-primary" /> Recommended Actions
              </h4>
              <div className="space-y-3">
                {log.triageAdvice.homeRemedies.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 bg-muted/20 rounded-lg p-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-sm text-foreground">{r}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Emergency Alert */}
            {(log.triageAdvice.level === "emergency" || log.triageAdvice.level === "urgent" || 
              log.triageAdvice.level === "emergency medical care" || log.triageAdvice.level === "urgent medical care") && (
              <Alert className="border-destructive/50 bg-destructive/10">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive">
                  <strong>Emergency Medical Attention Required:</strong> Your symptoms indicate a potentially serious medical condition. 
                  Seek immediate medical attention by calling emergency services or visiting the nearest emergency department.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Professional Medical Disclaimer */}
        <Alert className="border-orange-200 bg-orange-50">
          <Shield className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Professional Medical Disclaimer:</strong> This symptom triage analysis is generated by Health AI's Clinical Triage Engine for educational purposes only. 
            This is NOT a substitute for professional medical advice, diagnosis, or treatment. 
            In case of emergency symptoms, contact emergency services immediately. Always consult qualified healthcare providers for medical decisions.
          </AlertDescription>
        </Alert>
      </div>
    </ScrollArea>
  );
}

function PlanSection({ icon: Icon, title, items }: { icon: React.ElementType; title: string; items: string[] }) {
  return (
    <div className="bg-muted/30 rounded-lg p-4">
      <h4 className="font-medium text-foreground mb-2 flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </h4>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
            <span className="text-primary mt-0.5">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
