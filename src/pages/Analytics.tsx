import { useEffect, useState, useRef } from "react";
import { getCheckups, getSymptomLogs } from "@/api/services";
import { Checkup, SymptomLog } from "@/types/models";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area, AreaChart,
  ComposedChart
} from "recharts";
import { 
  Download, TrendingUp, Activity, FileText, BarChart3, AlertTriangle, 
  Heart, Brain, Thermometer, Droplets, Shield, Target, Calendar,
  Clock, ChevronUp, ChevronDown, Minus, Stethoscope
} from "lucide-react";
import AppLayout from "@/components/AppLayout";

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

const TRIAGE_COLORS = {
  "emergency medical care": CLINICAL_COLORS.emergency,
  "urgent medical care": CLINICAL_COLORS.urgent,
  "medical consultation recommended": CLINICAL_COLORS.moderate,
  "self-care recommended": CLINICAL_COLORS.low,
};

const PIE_COLORS = [CHART_COLORS.destructive, CHART_COLORS.warning, CHART_COLORS.success];

export default function Analytics() {
  const [checkups, setCheckups] = useState<Checkup[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomLog[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCheckups().then(setCheckups);
    getSymptomLogs().then(setSymptoms);
  }, []);

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

  // Enhanced clinical trend analysis
  const clinicalTrends = [...checkups].reverse().map((c, index) => ({
    date: new Date(c.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    healthScore: calculateHealthScore(c),
    bmi: c.bmiData.score,
    fastingSugar: c.bloodReport.fastingSugar,
    ldl: c.bloodReport.ldl,
    hdl: c.bloodReport.hdl,
    triglycerides: c.bloodReport.triglycerides,
    riskCount: c.aiPredictions.length,
    highRiskCount: c.aiPredictions.filter(r => r.riskLevel === "high").length,
  }));

  // Clinical biomarker analysis with medical ranges
  const biomarkerAnalysis = checkups[0] ? [
    {
      name: "Fasting Sugar",
      value: checkups[0].bloodReport.fastingSugar,
      unit: "mg/dL",
      status: checkups[0].bloodReport.fastingSugar > 125 ? "high" : 
              checkups[0].bloodReport.fastingSugar > 100 ? "borderline" : "normal",
      range: "Normal: <100, Pre-diabetes: 100-125, Diabetes: >125",
      icon: Droplets,
      color: checkups[0].bloodReport.fastingSugar > 125 ? CLINICAL_COLORS.high :
             checkups[0].bloodReport.fastingSugar > 100 ? CLINICAL_COLORS.borderline : CLINICAL_COLORS.normal
    },
    {
      name: "LDL Cholesterol",
      value: checkups[0].bloodReport.ldl,
      unit: "mg/dL",
      status: checkups[0].bloodReport.ldl > 160 ? "high" : 
              checkups[0].bloodReport.ldl > 130 ? "borderline" : "normal",
      range: "Optimal: <130, Borderline: 130-159, High: >160",
      icon: Heart,
      color: checkups[0].bloodReport.ldl > 160 ? CLINICAL_COLORS.high :
             checkups[0].bloodReport.ldl > 130 ? CLINICAL_COLORS.borderline : CLINICAL_COLORS.normal
    },
    {
      name: "HDL Cholesterol",
      value: checkups[0].bloodReport.hdl,
      unit: "mg/dL",
      status: checkups[0].bloodReport.hdl < 40 ? "low" : "normal",
      range: "Low: <40, Normal: ≥40",
      icon: Shield,
      color: checkups[0].bloodReport.hdl < 40 ? CLINICAL_COLORS.borderline : CLINICAL_COLORS.normal
    },
    {
      name: "Triglycerides",
      value: checkups[0].bloodReport.triglycerides,
      unit: "mg/dL",
      status: checkups[0].bloodReport.triglycerides > 200 ? "high" : 
              checkups[0].bloodReport.triglycerides > 150 ? "borderline" : "normal",
      range: "Normal: <150, Borderline: 150-199, High: >200",
      icon: Activity,
      color: checkups[0].bloodReport.triglycerides > 200 ? CLINICAL_COLORS.high :
             checkups[0].bloodReport.triglycerides > 150 ? CLINICAL_COLORS.borderline : CLINICAL_COLORS.normal
    },
    {
      name: "Hemoglobin",
      value: checkups[0].bloodReport.hemoglobin,
      unit: "g/dL",
      status: checkups[0].bloodReport.hemoglobin < 12 ? "low" : "normal",
      range: "Low: <12, Normal: 12-16",
      icon: Droplets,
      color: checkups[0].bloodReport.hemoglobin < 12 ? CLINICAL_COLORS.borderline : CLINICAL_COLORS.normal
    },
    {
      name: "Creatinine",
      value: checkups[0].bloodReport.creatinine,
      unit: "mg/dL",
      status: checkups[0].bloodReport.creatinine > 1.3 ? "high" : "normal",
      range: "Normal: ≤1.3, High: >1.3",
      icon: Activity,
      color: checkups[0].bloodReport.creatinine > 1.3 ? CLINICAL_COLORS.high : CLINICAL_COLORS.normal
    },
    {
      name: "TSH",
      value: checkups[0].bloodReport.tsh,
      unit: "mIU/L",
      status: checkups[0].bloodReport.tsh > 4.0 ? "high" : 
              checkups[0].bloodReport.tsh < 0.4 ? "low" : "normal",
      range: "Low: <0.4, Normal: 0.4-4.0, High: >4.0",
      icon: Brain,
      color: checkups[0].bloodReport.tsh > 4.0 || checkups[0].bloodReport.tsh < 0.4 ? CLINICAL_COLORS.borderline : CLINICAL_COLORS.normal
    }
  ] : [];

  // Health progress tracking
  const healthProgress = (() => {
    if (checkups.length < 2) return null;
    
    const latest = calculateHealthScore(checkups[0]);
    const previous = calculateHealthScore(checkups[1]);
    const change = latest - previous;
    
    return {
      current: latest,
      previous,
      change,
      trend: change > 5 ? "improving" : change < -5 ? "declining" : "stable",
      percentage: Math.round((change / previous) * 100)
    };
  })();

  const getTrendIcon = (trend: string) => {
    switch(trend) {
      case "improving": return <ChevronUp className="h-4 w-4 text-success" />;
      case "declining": return <ChevronDown className="h-4 w-4 text-destructive" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Prepare chart data
  const bmiTrend = [...checkups].reverse().map((c) => ({
    date: new Date(c.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    bmi: c.bmiData.score,
    weight: c.bmiData.weight,
  }));

  const bloodTrend = [...checkups].reverse().map((c) => ({
    date: new Date(c.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    sugar: c.bloodReport.fastingSugar,
    cholesterol: c.bloodReport.totalCholesterol,
    hemoglobin: c.bloodReport.hemoglobin,
  }));

  const lipidData = checkups[0]
    ? [
        { name: "HDL", value: checkups[0].bloodReport.hdl, fill: CHART_COLORS.success },
        { name: "LDL", value: checkups[0].bloodReport.ldl, fill: CHART_COLORS.destructive },
        { name: "Triglycerides", value: checkups[0].bloodReport.triglycerides, fill: CHART_COLORS.warning },
      ]
    : [];

  const riskDistribution = (() => {
    const allRisks = checkups.flatMap((c) => c.aiPredictions);
    const high = allRisks.filter((r) => r.riskLevel === "high").length;
    const medium = allRisks.filter((r) => r.riskLevel === "medium").length;
    const low = allRisks.filter((r) => r.riskLevel === "low").length;
    return [
      { name: "High", value: high },
      { name: "Medium", value: medium },
      { name: "Low", value: low },
    ].filter((d) => d.value > 0);
  })();

  const triageDistribution = (() => {
    const counts: Record<string, number> = {};
    symptoms.forEach((s) => {
      const level = s.triageAdvice.level;
      counts[level] = (counts[level] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace("-", " "), value }));
  })();

  const radarData = checkups[0]
    ? [
        { metric: "Hemoglobin", value: Math.min((checkups[0].bloodReport.hemoglobin / 17) * 100, 100), fullMark: 100 },
        { metric: "Sugar", value: Math.min((checkups[0].bloodReport.fastingSugar / 200) * 100, 100), fullMark: 100 },
        { metric: "Cholesterol", value: Math.min((checkups[0].bloodReport.totalCholesterol / 300) * 100, 100), fullMark: 100 },
        { metric: "HDL", value: Math.min((checkups[0].bloodReport.hdl / 80) * 100, 100), fullMark: 100 },
        { metric: "Creatinine", value: Math.min((checkups[0].bloodReport.creatinine / 1.5) * 100, 100), fullMark: 100 },
        { metric: "TSH", value: Math.min((checkups[0].bloodReport.tsh / 5) * 100, 100), fullMark: 100 },
      ]
    : [];

  const handleExportReport = () => {
    const latest = checkups[0];
    if (!latest) return;

    const report = [
      "═══════════════════════════════════════════════════════════════",
      "           HEALTH AI - PROFESSIONAL CLINICAL ANALYTICS REPORT",
      "═══════════════════════════════════════════════════════════════",
      `Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      `Analysis Period: ${checkups.length} checkups, ${symptoms.length} symptom logs`,
      "",
      "─── CLINICAL HEALTH SCORE ───",
      `Current Health Score: ${healthProgress ? healthProgress.current : "N/A"}/100`,
      healthProgress ? `Trend: ${healthProgress.trend} (${healthProgress.percentage}% from previous)` : "",
      "",
      "─── LATEST CLINICAL ASSESSMENT ───",
      `Date: ${latest.date}`,
      `BMI: ${latest.bmiData.score} (${latest.bmiData.category})`,
      "",
      "Biomarker Analysis:",
      ...biomarkerAnalysis.map(b => 
        `  ${b.name}: ${b.value} ${b.unit} (${b.status.toUpperCase()}) - ${b.range}`
      ),
      "",
      "─── CLINICAL RISK ASSESSMENT ───",
      `Total Risks Identified: ${latest.aiPredictions.length}`,
      ...latest.aiPredictions.map(
        (p) => `  [${p.riskLevel.toUpperCase()}] ${p.riskTag} (${Math.round(p.confidence * 100)}% confidence)\n    ${p.description}`
      ),
      "",
      "─── PERSONALIZED PREVENTION PROTOCOLS ───",
      ...latest.preventionPlan.map((plan) =>
        [
          `\n  ▸ ${plan.title}`,
          `    Diet: ${plan.dietSteps.join("; ")}`,
          `    Exercise: ${plan.exerciseSteps.join("; ")}`,
          `    Monitoring: ${plan.monitoringSteps.join("; ")}`,
        ].join("\n")
      ),
      "",
      "─── SYMPTOM TRIAGE HISTORY ───",
      ...symptoms.map(
        (s) =>
          `  ${s.date} — ${s.predictedIllness}\n    Triage: ${s.triageAdvice.level.replace("-", " ")} | Symptoms: ${s.extractedSymptoms.join(", ")}`
      ),
      "",
      "─── CLINICAL INSIGHTS ───",
      healthProgress ? 
        `Health trend is ${healthProgress.trend} with ${Math.abs(healthProgress.percentage)}% change from previous assessment.` : 
        "Insufficient data for trend analysis.",
      "",
      `Top clinical concerns: ${latest.aiPredictions.slice(0, 3).map(r => r.riskTag).join(", ")}`,
      "",
      "═══════════════════════════════════════════════════════════════",
      "MEDICAL DISCLAIMER: This report is generated by Health AI's Clinical",
      "Rules Engine and Clinical Triage Engine for educational purposes only.",
      "It is NOT a substitute for professional medical diagnosis or treatment.",
      "Always consult qualified healthcare providers for medical decisions.",
      "═══════════════════════════════════════════════════════════════",
    ].join("\n");

    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `HealthAI_Clinical_Report_${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div ref={reportRef} className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        {/* Professional Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-2">
              <Stethoscope className="h-8 w-8 text-primary" />
              Clinical Analytics Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Professional health insights powered by Clinical Rules Engine and Clinical Triage Engine
            </p>
          </div>
          <Button onClick={handleExportReport} className="gradient-primary text-primary-foreground gap-2">
            <Download className="h-4 w-4" />
            Export Clinical Report
          </Button>
        </div>

        {/* Clinical Overview Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-card border-l-4 border-l-primary">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Heart className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Health Score</p>
                  <p className="text-2xl font-display font-bold text-foreground">
                    {healthProgress ? healthProgress.current : "N/A"}/100
                  </p>
                  {healthProgress && (
                    <div className="flex items-center gap-1 mt-1">
                      {getTrendIcon(healthProgress.trend)}
                      <span className="text-xs text-muted-foreground">
                        {healthProgress.trend} ({healthProgress.percentage}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-l-4 border-l-info">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-info" />
                <div>
                  <p className="text-sm text-muted-foreground">Clinical Assessments</p>
                  <p className="text-2xl font-display font-bold text-foreground">{checkups.length}</p>
                  <p className="text-xs text-muted-foreground">{symptoms.length} symptom logs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-l-4 border-l-warning">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Risks</p>
                  <p className="text-2xl font-display font-bold text-foreground">
                    {checkups[0]?.aiPredictions.length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {riskDistribution.find(r => r.name === "High")?.value || 0} high priority
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-l-4 border-l-success">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm text-muted-foreground">Prevention Plans</p>
                  <p className="text-2xl font-display font-bold text-foreground">
                    {checkups[0]?.preventionPlan.length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Active protocols</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Clinical Biomarker Analysis */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Clinical Biomarker Analysis
            </CardTitle>
            <CardDescription>
              Latest biomarker values with clinical reference ranges and status indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {biomarkerAnalysis.map((biomarker) => {
                const Icon = biomarker.icon;
                const progressValue = biomarker.status === "high" ? 100 : 
                                   biomarker.status === "borderline" ? 70 : 
                                   biomarker.status === "low" ? 30 : 50;
                
                return (
                  <div key={biomarker.name} className="border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Icon className="h-4 w-4" style={{ color: biomarker.color }} />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{biomarker.name}</h4>
                        <p className="text-xs text-muted-foreground">{biomarker.range}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{biomarker.value}</p>
                        <p className="text-xs text-muted-foreground">{biomarker.unit}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium capitalize" style={{ color: biomarker.color }}>
                          {biomarker.status}
                        </span>
                      </div>
                      <Progress value={progressValue} className="h-2" 
                        style={{ 
                          "--progress-background": biomarker.color 
                        } as React.CSSProperties} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Health Trends */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Clinical Health Trends
              </CardTitle>
              <CardDescription>
                Health score progression and key biomarker trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={clinicalTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 20%, 90%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke={CHART_COLORS.muted} />
                  <YAxis yAxisId="score" orientation="left" tick={{ fontSize: 12 }} stroke={CHART_COLORS.muted} domain={[0, 100]} />
                  <YAxis yAxisId="bmi" orientation="right" tick={{ fontSize: 12 }} stroke={CHART_COLORS.muted} domain={[15, 35]} />
                  <Tooltip contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(210,20%,90%)" }} />
                  <Legend />
                  <Area yAxisId="score" type="monotone" dataKey="healthScore" 
                    stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.2} 
                    strokeWidth={2} name="Health Score" />
                  <Line yAxisId="bmi" type="monotone" dataKey="bmi" 
                    stroke={CHART_COLORS.warning} strokeWidth={2} dot={{ r: 3 }} name="BMI" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Risk Distribution Analysis
              </CardTitle>
              <CardDescription>
                Clinical risk assessment breakdown and top priority conditions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={riskDistribution} cx="50%" cy="50%" 
                      innerRadius={40} outerRadius={80} paddingAngle={2} dataKey="value" 
                      label={({ name, value }) => `${name}: ${value}`}>
                      {riskDistribution.map((entry, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Top Clinical Concerns</h4>
                  {checkups[0]?.aiPredictions.slice(0, 3).map((risk, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded border">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{risk.riskTag}</p>
                        <p className="text-xs text-muted-foreground">{risk.description.substring(0, 60)}...</p>
                      </div>
                      <Badge variant="outline" className={
                        risk.riskLevel === "high" ? "border-destructive text-destructive" :
                        risk.riskLevel === "medium" ? "border-warning text-warning" :
                        "border-success text-success"
                      }>
                        {Math.round(risk.confidence * 100)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lipid Breakdown & Risk Distribution */}
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Lipid Profile</CardTitle>
              <CardDescription>Latest HDL, LDL & Triglycerides</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={lipidData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 20%, 90%)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke={CHART_COLORS.muted} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke={CHART_COLORS.muted} width={90} />
                  <Tooltip contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(210,20%,90%)" }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
                    {lipidData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Risk Distribution</CardTitle>
              <CardDescription>AI risk predictions by severity</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {riskDistribution.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Health Radar</CardTitle>
              <CardDescription>Latest biomarker overview (% of max)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(210, 20%, 88%)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} stroke={CHART_COLORS.muted} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                  <Radar name="Biomarkers" dataKey="value" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Symptom Triage Analytics */}
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="shadow-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Symptom Triage Analytics
              </CardTitle>
              <CardDescription>
                Distribution of symptom triage levels and recent emergency/urgent cases
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={triageDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 20%, 90%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke={CHART_COLORS.muted} />
                    <YAxis tick={{ fontSize: 12 }} stroke={CHART_COLORS.muted} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(210,20%,90%)" }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40} name="Count" fill={CHART_COLORS.info} />
                  </BarChart>
                </ResponsiveContainer>
                
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Recent Emergency/Urgent Cases</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {symptoms.filter(s => s.triageAdvice.level === "emergency" || s.triageAdvice.level === "urgent").slice(-5).map((symptom) => (
                      <div key={symptom.id} className="flex items-center justify-between p-2 rounded border">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{symptom.predictedIllness}</p>
                          <p className="text-xs text-muted-foreground">{symptom.date}</p>
                        </div>
                        <Badge variant="outline" className={
                          symptom.triageAdvice.level === "emergency" ? 
                          "bg-destructive/10 text-destructive border-destructive/20" :
                          "bg-warning/10 text-warning border-warning/20"
                        }>
                          {symptom.triageAdvice.level.replace("-", " ")}
                        </Badge>
                      </div>
                    ))}
                    {symptoms.filter(s => s.triageAdvice.level === "emergency" || s.triageAdvice.level === "urgent").length === 0 && (
                      <p className="text-xs text-muted-foreground">No emergency/urgent symptoms recorded</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Target className="h-5 w-5" />
                Prevention Adherence
              </CardTitle>
              <CardDescription>
                Active prevention protocols and step breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {checkups[0]?.preventionPlan.length > 0 ? (
                  checkups[0].preventionPlan.map((plan, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <h5 className="font-medium text-sm mb-2">{plan.title}</h5>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Diet Steps</span>
                          <span>{plan.dietSteps.length}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>Exercise Steps</span>
                          <span>{plan.exerciseSteps.length}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>Monitoring Steps</span>
                          <span>{plan.monitoringSteps.length}</span>
                        </div>
                        <div className="flex justify-between text-xs font-medium pt-1 border-t">
                          <span>Total Steps</span>
                          <span>{plan.dietSteps.length + plan.exerciseSteps.length + plan.monitoringSteps.length}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No prevention plans available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Clinical Insights and Recommendations */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Clinical Insights & Recommendations
            </CardTitle>
            <CardDescription>
              AI-powered insights based on your clinical data patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold">Health Pattern Analysis</h4>
                {healthProgress ? (
                  <Alert>
                    <TrendingUp className={`h-4 w-4 ${
                      healthProgress.trend === "improving" ? "text-success" :
                      healthProgress.trend === "declining" ? "text-destructive" : "text-muted-foreground"
                    }`} />
                    <AlertDescription>
                      Your overall health score is {healthProgress.trend} ({healthProgress.percentage}% change from previous assessment). 
                      {healthProgress.trend === "improving" && " Continue following your current prevention protocols."}
                      {healthProgress.trend === "declining" && " Consider reviewing your prevention plans and consulting with your healthcare provider."}
                      {healthProgress.trend === "stable" && " Maintain your current health routine and monitoring schedule."}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <p className="text-sm text-muted-foreground">Insufficient data for trend analysis. Complete more checkups to see health trends.</p>
                )}
                
                <div className="space-y-2">
                  <h5 className="font-medium text-sm">Key Biomarker Trends</h5>
                  <div className="space-y-1">
                    {clinicalTrends.length > 1 && (
                      <>
                        <div className="flex justify-between text-xs">
                          <span>Fasting Sugar Trend</span>
                          <span className={
                            clinicalTrends[0].fastingSugar < clinicalTrends[1].fastingSugar ? "text-success" :
                            clinicalTrends[0].fastingSugar > clinicalTrends[1].fastingSugar ? "text-destructive" : "text-muted-foreground"
                          }>
                            {clinicalTrends[0].fastingSugar < clinicalTrends[1].fastingSugar ? "↓ Improving" :
                             clinicalTrends[0].fastingSugar > clinicalTrends[1].fastingSugar ? "↑ Worsening" : "→ Stable"}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>LDL Cholesterol Trend</span>
                          <span className={
                            clinicalTrends[0].ldl < clinicalTrends[1].ldl ? "text-success" :
                            clinicalTrends[0].ldl > clinicalTrends[1].ldl ? "text-destructive" : "text-muted-foreground"
                          }>
                            {clinicalTrends[0].ldl < clinicalTrends[1].ldl ? "↓ Improving" :
                             clinicalTrends[0].ldl > clinicalTrends[1].ldl ? "↑ Worsening" : "→ Stable"}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold">Recommended Actions</h4>
                <div className="space-y-2">
                  {checkups[0]?.aiPredictions.slice(0, 3).map((risk, index) => (
                    <div key={index} className="border-l-2 border-l-warning pl-3">
                      <p className="text-sm font-medium">{risk.riskTag}</p>
                      <p className="text-xs text-muted-foreground">{risk.description.substring(0, 60)}...</p>
                    </div>
                  ))}
                  {(!checkups[0] || checkups[0].aiPredictions.length === 0) && (
                    <p className="text-sm text-muted-foreground">No active risks detected. Continue maintaining your current health routine.</p>
                  )}
                </div>
                
                {symptoms.filter(s => s.triageAdvice.level === "emergency" || s.triageAdvice.level === "urgent").length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription>
                      You have {symptoms.filter(s => s.triageAdvice.level === "emergency" || s.triageAdvice.level === "urgent").length} recent emergency/urgent symptom logs. 
                      If these symptoms persist or worsen, seek immediate medical attention.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional Medical Disclaimer */}
        <Alert className="border-orange-200 bg-orange-50">
          <Shield className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Professional Medical Disclaimer:</strong> This Clinical Analytics Dashboard is powered by Health AI's Clinical Rules Engine and Clinical Triage Engine. 
            The analysis, insights, and recommendations provided are for educational and informational purposes only. 
            This is NOT a substitute for professional medical advice, diagnosis, or treatment. 
            Always consult qualified healthcare providers for medical decisions and never disregard professional medical advice.
          </AlertDescription>
        </Alert>
      </div>
    </AppLayout>
  );
}
