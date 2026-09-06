import { useState } from "react";
import { analyzeSymptoms, checkSymptomsWithAI, saveSymptomToHistory } from "@/api/services";
import { SymptomLog } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquareText, Send, AlertTriangle, AlertOctagon, CheckCircle2, Pill, Sparkles, ArrowLeft } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const triageConfig: Record<string, { color: string; icon: React.ElementType; bg: string }> = {
  "self-care": { color: "text-success", icon: CheckCircle2, bg: "bg-success/10 border-success/20" },
  "consult-doctor": { color: "text-warning", icon: AlertTriangle, bg: "bg-warning/10 border-warning/20" },
  urgent: { color: "text-destructive", icon: AlertTriangle, bg: "bg-destructive/10 border-destructive/20" },
  emergency: { color: "text-destructive-foreground", icon: AlertOctagon, bg: "bg-destructive border-destructive" },
};

export default function SymptomChecker() {
  const [text, setText] = useState("");
  const [step, setStep] = useState<"input" | "loading" | "results">("input");
  const [result, setResult] = useState<any>(null); // Using any for the new API response structure

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setStep("loading");
    try {
      // Use the new FastAPI endpoint
      const res = await checkSymptomsWithAI(text);
      
      // Validate response structure
      if (!res || !res.triage_advice || !res.extracted_symptoms) {
        throw new Error('Invalid response structure from server');
      }
      
      setResult(res);
      
      // Save the symptom to history
      try {
        const symptomLog: SymptomLog = {
          id: `symptom_${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          rawText: text,
          extractedSymptoms: res.extracted_symptoms || [],
          predictedIllness: res.prediction || 'Unknown Condition',
          triageAdvice: {
            level: res.triage_advice?.level || 'self-care',
            message: res.triage_advice?.summary || 'Analysis completed',
            homeRemedies: res.triage_advice?.recommended_actions || []
          }
        };
        
        await saveSymptomToHistory(symptomLog);
        console.log('Symptom saved to history successfully');
      } catch (saveError) {
        console.warn('Failed to save symptom to history:', saveError);
        // Don't fail the whole process if saving fails
      }
      
      setStep("results");
    } catch (error) {
      console.error("Symptom analysis error:", error);
      // Set a fallback error state instead of crashing
      setResult({
        original_description: text,
        extracted_symptoms: ["Error processing symptoms"],
        prediction: "Analysis Failed",
        triage_advice: {
          level: "system error",
          summary: "Unable to process symptoms due to a technical error. Please try again.",
          recommended_actions: ["Please try again later", "Check your internet connection", "Contact support if issue persists"]
        }
      });
      setStep("results");
    }
  };

  // Determine triage level based on triage_advice.level
  const getTriageLevel = (level: string) => {
    if (level?.includes("emergency") || level?.includes("urgent")) return "emergency";
    if (level?.includes("urgent") || level?.includes("medical")) return "urgent";
    if (level?.includes("medical") || level?.includes("consult")) return "consult-doctor";
    return "self-care";
  };

  const triage = result?.triage_advice ? triageConfig[getTriageLevel(result.triage_advice.level)] : null;
  const TriageIcon = triage?.icon || CheckCircle2;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto animate-fade-in">
        {/* Input */}
        {step === "input" && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
                <MessageSquareText className="h-8 w-8 text-primary" />
                AI Symptom Checker
              </h1>
              <p className="text-muted-foreground mt-1">Describe how you're feeling in your own words. Our NLP engine will analyze your symptoms.</p>
            </div>
            <Card className="shadow-card">
              <CardContent className="pt-6 space-y-4">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="e.g., I've been having a persistent headache for 3 days, feeling very tired, and my throat is sore. I also have a mild fever..."
                  className="min-h-[160px] resize-none text-base"
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">Be as detailed as possible for better analysis.</p>
                  <Button className="gradient-primary border-0 hover:opacity-90" onClick={handleSubmit} disabled={!text.trim()}>
                    <Send className="mr-2 h-4 w-4" /> Analyze Symptoms
                  </Button>
                </div>
              </CardContent>
            </Card>
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 flex gap-3 text-sm">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
              <p className="text-muted-foreground">
                <strong>Emergency?</strong> If you are experiencing a medical emergency, call your local emergency number (911) immediately. Do not rely on this tool.
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {step === "loading" && (
          <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
            <div className="relative">
              <div className="h-20 w-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <Sparkles className="absolute inset-0 m-auto h-8 w-8 text-primary animate-pulse-glow" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground mt-8">NLP Analysis in Progress</h2>
            <p className="text-muted-foreground mt-2 text-center max-w-md">
              Extracting symptoms via NLP keyword analysis, matching against medical knowledge base, and generating triage recommendations...
            </p>
          </div>
        )}

        {/* Results */}
        {step === "results" && result && triage && (
          <div className="space-y-6 animate-slide-up">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-primary" />
                Analysis Results
              </h1>
              <p className="text-muted-foreground mt-1">AI-Powered Symptom Analysis</p>
            </div>

            {/* Triage Banner */}
            <div className={`rounded-xl border p-6 ${triage.bg}`}>
              <div className="flex items-center gap-3 mb-3">
                <TriageIcon className={`h-7 w-7 ${getTriageLevel(result.triage_advice?.level) === "emergency" ? "text-destructive-foreground" : triage.color}`} />
                <h2 className={`font-display text-xl font-bold ${getTriageLevel(result.triage_advice?.level) === "emergency" ? "text-destructive-foreground" : triage.color}`}>
                  {result.triage_advice?.level === "self care" ? "Self-Care Recommended" :
                   result.triage_advice?.level === "medical consultation required" ? "Medical Consultation Required" :
                   result.triage_advice?.level === "urgent medical care" ? "Urgent Medical Care" :
                   result.triage_advice?.level === "medical monitoring required" ? "Medical Monitoring Required" :
                   "Monitor Symptoms"}
                </h2>
              </div>
              <p className={`text-sm ${getTriageLevel(result.triage_advice?.level) === "emergency" ? "text-destructive-foreground/90" : "text-muted-foreground"}`}>
                {result.triage_advice?.summary}
              </p>
            </div>

            {/* Your Input */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-base">Your Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground italic">"{text}"</p>
              </CardContent>
            </Card>

            {/* Extracted Symptoms */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Extracted Symptoms
                </CardTitle>
                <CardDescription>Keywords extracted via NLP analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result?.extracted_symptoms?.map((s: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-sm capitalize px-3 py-1">{s}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Predicted Illness */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display">Predicted Condition</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-foreground">{result?.prediction}</p>
              </CardContent>
            </Card>

            {/* Recommended Actions */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Pill className="h-4 w-4 text-primary" />
                  Recommended Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result?.triage_advice?.recommended_actions?.map((action: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${getTriageLevel(result.triage_advice?.level) === "emergency" ? "text-destructive" : "text-success"}`} />
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Disclaimer */}
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 flex gap-3 text-sm">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
              <p className="text-muted-foreground">
                <strong>Disclaimer:</strong> This analysis is generated by AI for educational purposes only. It is not a medical diagnosis. Always consult a qualified healthcare professional for medical advice.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setStep("input"); setResult(null); setText(""); }}>
                <ArrowLeft className="mr-2 h-4 w-4" /> New Analysis
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
