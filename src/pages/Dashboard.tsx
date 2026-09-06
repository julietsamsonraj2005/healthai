import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getCheckups, getSymptomLogs } from "@/api/services";
import { Checkup, SymptomLog } from "@/types/models";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Activity,
  Stethoscope,
  MessageSquareText,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Shield,
  Heart,
  Brain,
  Target,
  FileText,
  BarChart3,
  Clock,
  Thermometer,
  Apple,
  Dumbbell,
  ClipboardList,
  Home,
  RefreshCw,
  TrendingDown,
  Users,
  Calendar,
  Zap,
  Award
} from "lucide-react";
import AppLayout from "@/components/AppLayout";

// Clinical color constants
const CLINICAL_COLORS = {
  excellent: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  good: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  moderate: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  poor: "bg-red-500/15 text-red-400 border-red-500/30",
};

const RISK_COLORS = {
  low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  high: "bg-red-500/15 text-red-400 border-red-500/30",
};

const TRIAGE_COLORS = {
  "self-care": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "consult-doctor": "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "urgent": "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "emergency": "bg-red-500/15 text-red-400 border-red-500/30",
};

export default function Dashboard() {
  const { user } = useAuth();
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

  const getHealthScoreCategory = (score: number) => {
    if (score >= 90) return { category: "Excellent", color: CLINICAL_COLORS.excellent, Icon: Award };
    if (score >= 75) return { category: "Good", color: CLINICAL_COLORS.good, Icon: Heart };
    if (score >= 60) return { category: "Moderate", color: CLINICAL_COLORS.moderate, Icon: AlertTriangle };
    return { category: "Poor", color: CLINICAL_COLORS.poor, Icon: AlertTriangle };
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [checkupsData, symptomsData] = await Promise.all([
        getCheckups(),
        getSymptomLogs()
      ]);
      
      setCheckups(checkupsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setSymptoms(symptomsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const latestCheckup = checkups[0];
  const latestSymptom = symptoms[0];
  const totalAssessments = checkups.length;
  const totalSymptoms = symptoms.length;
  
  // Calculate overall health metrics
  const overallHealthScore = latestCheckup ? calculateHealthScore(latestCheckup) : 0;
  const healthScoreInfo = getHealthScoreCategory(overallHealthScore);
  
  // Risk analysis
  const highRiskCount = latestCheckup?.aiPredictions.filter(p => p.riskLevel === 'high').length || 0;
  const mediumRiskCount = latestCheckup?.aiPredictions.filter(p => p.riskLevel === 'medium').length || 0;
  const totalRisks = latestCheckup?.aiPredictions.length || 0;
  
  // Symptom urgency analysis
  const emergencySymptoms = symptoms.filter(s => s.triageAdvice.level === 'emergency').length;
  const urgentSymptoms = symptoms.filter(s => s.triageAdvice.level === 'urgent').length;
  const recentSymptoms = symptoms.filter(s => {
    const symptomDate = new Date(s.date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return symptomDate > weekAgo;
  }).length;

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-muted animate-pulse rounded"></div>
            <div className="h-8 w-48 bg-muted animate-pulse rounded"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-muted animate-pulse rounded-lg h-32"></div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        {/* Professional Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
              <Heart className="h-8 w-8 text-primary" />
              Clinical Health Dashboard
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Comprehensive health overview powered by Clinical Rules Engine & Clinical Triage Engine
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Stethoscope className="h-3 w-3" />
                {totalAssessments} Clinical Assessments
              </span>
              <span className="flex items-center gap-1">
                <MessageSquareText className="h-3 w-3" />
                {totalSymptoms} Symptom Analyses
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Last updated: {new Date().toLocaleDateString()}
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

        {/* Clinical Health Score Card */}
        {latestCheckup && (
          <Card className="border-l-4 border-l-primary shadow-lg">
            <CardHeader>
              <CardTitle className="font-display text-xl flex items-center gap-2">
                <healthScoreInfo.Icon className="h-6 w-6 text-primary" />
                Clinical Health Score
              </CardTitle>
              <CardDescription>
                Overall health assessment based on latest clinical biomarkers and BMI analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-5xl font-bold text-primary">{overallHealthScore}</div>
                  <div className="text-sm text-muted-foreground">out of 100</div>
                  <Badge className={`mt-2 ${healthScoreInfo.color}`}>
                    {healthScoreInfo.category} Health
                  </Badge>
                </div>
                <div className="flex-1">
                  <Progress value={overallHealthScore} className="h-3" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>Poor (0-59)</span>
                    <span>Moderate (60-74)</span>
                    <span>Good (75-89)</span>
                    <span>Excellent (90-100)</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="text-center">
                  <div className="text-lg font-semibold">{latestCheckup.bmiData.score}</div>
                  <div className="text-xs text-muted-foreground">BMI</div>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {latestCheckup.bmiData.category}
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">{latestCheckup.bloodReport.fastingSugar}</div>
                  <div className="text-xs text-muted-foreground">Fasting Sugar</div>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {latestCheckup.bloodReport.fastingSugar > 125 ? "High" : latestCheckup.bloodReport.fastingSugar > 100 ? "Elevated" : "Normal"}
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">{latestCheckup.bloodReport.ldl}</div>
                  <div className="text-xs text-muted-foreground">LDL Cholesterol</div>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {latestCheckup.bloodReport.ldl > 160 ? "High" : latestCheckup.bloodReport.ldl > 130 ? "Borderline" : "Optimal"}
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">{totalRisks}</div>
                  <div className="text-xs text-muted-foreground">Risk Factors</div>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {highRiskCount > 0 ? "High Priority" : mediumRiskCount > 0 ? "Moderate" : "Low"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button variant="outline" className="h-auto p-5 justify-start border-primary/20 hover:border-primary/40 hover:bg-primary/5" asChild>
            <Link to="/checkup" className="flex items-center gap-4">
              <div className="rounded-lg gradient-primary p-2.5 text-primary-foreground">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-foreground">Clinical Assessment</div>
                <div className="text-sm text-muted-foreground">Rules Engine Analysis</div>
              </div>
              <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground" />
            </Link>
          </Button>
          <Button variant="outline" className="h-auto p-5 justify-start border-primary/20 hover:border-primary/40 hover:bg-primary/5" asChild>
            <Link to="/symptoms" className="flex items-center gap-4">
              <div className="rounded-lg gradient-primary p-2.5 text-primary-foreground">
                <MessageSquareText className="h-5 w-5" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-foreground">Symptom Triage</div>
                <div className="text-sm text-muted-foreground">Triage Engine Analysis</div>
              </div>
              <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground" />
            </Link>
          </Button>
          <Button variant="outline" className="h-auto p-5 justify-start border-primary/20 hover:border-primary/40 hover:bg-primary/5" asChild>
            <Link to="/analytics" className="flex items-center gap-4">
              <div className="rounded-lg gradient-primary p-2.5 text-primary-foreground">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-foreground">Analytics</div>
                <div className="text-sm text-muted-foreground">Trends & Insights</div>
              </div>
              <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground" />
            </Link>
          </Button>
          <Button variant="outline" className="h-auto p-5 justify-start border-primary/20 hover:border-primary/40 hover:bg-primary/5" asChild>
            <Link to="/history" className="flex items-center gap-4">
              <div className="rounded-lg gradient-primary p-2.5 text-primary-foreground">
                <FileText className="h-5 w-5" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-foreground">Clinical History</div>
                <div className="text-sm text-muted-foreground">Complete Records</div>
              </div>
              <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground" />
            </Link>
          </Button>
        </div>

        {/* Risk Assessment & Symptom Analysis */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Clinical Risk Assessment */}
          {latestCheckup && latestCheckup.aiPredictions.length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Clinical Risk Assessment
                </CardTitle>
                <CardDescription>
                  Rules Engine analysis from {latestCheckup.date}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {latestCheckup.aiPredictions.map((prediction, index) => (
                  <div key={index} className="flex items-start gap-3 rounded-lg border border-border p-3">
                    <Badge className={`${RISK_COLORS[prediction.riskLevel]} shrink-0 uppercase text-xs font-bold`}>
                      {prediction.riskLevel}
                    </Badge>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{prediction.riskTag}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{prediction.description}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60" 
                            style={{ width: `${prediction.confidence * 100}%` }} 
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{Math.round(prediction.confidence * 100)}% confidence</span>
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/checkup">
                    View Full Clinical Assessment <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Recent Symptom Analysis */}
          {symptoms.length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Symptom Triage Analysis
                </CardTitle>
                <CardDescription>
                  Clinical Triage Engine evaluations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Urgency Summary */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-red-500/10 p-2">
                    <div className="text-lg font-bold text-red-400">{emergencySymptoms}</div>
                    <div className="text-xs text-muted-foreground">Emergency</div>
                  </div>
                  <div className="rounded-lg bg-orange-500/10 p-2">
                    <div className="text-lg font-bold text-orange-400">{urgentSymptoms}</div>
                    <div className="text-xs text-muted-foreground">Urgent</div>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 p-2">
                    <div className="text-lg font-bold text-emerald-400">{recentSymptoms}</div>
                    <div className="text-xs text-muted-foreground">This Week</div>
                  </div>
                </div>

                <Separator />

                {/* Recent Symptoms */}
                <div className="space-y-3">
                  {symptoms.slice(0, 3).map((symptom) => (
                    <div key={symptom.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{symptom.predictedIllness}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {symptom.date} · {symptom.extractedSymptoms.length} symptoms
                        </p>
                      </div>
                      <Badge className={`${TRIAGE_COLORS[symptom.triageAdvice.level]} capitalize ml-3`}>
                        {symptom.triageAdvice.level.replace("-", " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
                
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/symptoms">
                    Open Symptom Triage <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Professional Medical Disclaimer */}
        <Alert className="border-amber-500/30 bg-amber-500/5">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <AlertDescription className="text-sm">
            <strong>Professional Medical Disclaimer:</strong> This Health AI Dashboard provides clinical insights powered by our Clinical Rules Engine and Clinical Triage Engine for educational purposes only. 
            All health assessments, risk predictions, and triage recommendations should not replace professional medical advice, diagnosis, or treatment. 
            Always consult qualified healthcare providers for medical decisions and emergency care.
          </AlertDescription>
        </Alert>
      </div>
    </AppLayout>
  );
}
