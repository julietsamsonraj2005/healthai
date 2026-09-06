import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Shield, Brain, Activity, ArrowRight, Stethoscope, MessageSquareText, AlertTriangle } from "lucide-react";

const features = [
  { icon: Brain, title: "AI Risk Prediction", desc: "Advanced machine learning models analyze your health data to predict potential risks before they become critical." },
  { icon: MessageSquareText, title: "NLP Symptom Analysis", desc: "Describe how you feel in plain language. Our NLP engine extracts symptoms and provides triage guidance." },
  { icon: Stethoscope, title: "Full Body Checkup", desc: "Submit your lab results for comprehensive AI-powered analysis with actionable prevention plans." },
  { icon: Shield, title: "Prevention Plans", desc: "Receive personalized diet, exercise, and monitoring protocols tailored to your risk profile." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute bottom-10 right-20 h-96 w-96 rounded-full bg-info/20 blur-3xl" />
        </div>
        <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <Heart className="h-8 w-8 text-primary" fill="currentColor" />
            <span className="font-display text-2xl font-bold text-primary-foreground">Health AI</span>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button className="gradient-primary border-0 hover:opacity-90" asChild>
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </nav>
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-4 py-1.5 text-sm text-primary mb-6">
            <Activity className="h-4 w-4" />
            <span>AI-Powered Predictive Health</span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold text-primary-foreground leading-tight mb-6">
            Your Health,{" "}
            <span className="text-primary">Predicted</span>
            <br />& Protected
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/70 max-w-2xl mx-auto mb-10">
            Harness the power of artificial intelligence to analyze your health data, predict risks, and receive personalized prevention plans — all in one platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="gradient-primary border-0 text-lg px-8 py-6 hover:opacity-90" asChild>
              <Link to="/register">
                Start Free Analysis <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Intelligent Health Analysis
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Four powerful tools working together to give you a complete picture of your health.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {features.map((f, i) => (
            <div key={i} className="group rounded-xl border border-border bg-card p-8 shadow-card hover:shadow-elevated transition-all duration-300">
              <div className="flex items-start gap-5">
                <div className="rounded-lg gradient-primary p-3 text-primary-foreground shrink-0 group-hover:scale-110 transition-transform">
                  <f.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-semibold text-foreground mb-2">{f.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-6 flex gap-4">
          <AlertTriangle className="h-6 w-6 text-warning shrink-0 mt-0.5" />
          <div>
            <h4 className="font-display font-semibold text-foreground mb-1">Academic Project Disclaimer</h4>
            <p className="text-sm text-muted-foreground">
              Health AI is a B.Sc Computer Science academic project developed for educational purposes only. 
              It is <strong>not</strong> a substitute for professional medical advice, diagnosis, or treatment. 
              Always consult a qualified healthcare provider for medical concerns.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Heart className="h-5 w-5 text-primary" />
            <span className="font-display font-semibold">Health AI</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 Health AI — Academic Research Project. For educational use only.</p>
        </div>
      </footer>
    </div>
  );
}
