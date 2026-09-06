import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquareText, Send, Bot, User, AlertTriangle } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Markdown } from "@/components/ui/markdown";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function SymptomCheckerChat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    // 1. Add the user's message to the chat UI
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true); // Start the typing animation

    try {
      // 2. Send the text to your Python FastAPI backend
      const response = await fetch('http://localhost:8000/api/check-symptoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text }),
      });

      if (!response.ok) throw new Error("Backend connection failed");
      
      const data = await response.json();

      // 3. Format the AI's response using the data from Python
      // (Assuming your Python backend returns 'disease' and 'advice' objects)
      const aiContent = `
# Symptom Assessment

---
## 🔬 PREDICTED CONDITION
**${data.disease}**

## 🎯 EXTRACTED SYMPTOMS
${data.extracted_symptoms ? data.extracted_symptoms.join(', ') : 'No specific keywords identified.'}

---
## 🛡️ ${data.advice_title || 'PREVENTION & ADVICE'}
${data.advice_details || 'Please consult a medical professional.'}

---
*Disclaimer: Health AI provides this prediction for educational purposes based on NLP analysis. It is not a clinical diagnosis.*
            `;

      // 4. Add the AI message to the chat UI
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiContent,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, aiMsg]);

    } catch (error) {
      console.error("Error fetching AI prediction:", error);
      // Fallback message if the Python server is off
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "⚠️ **Connection Error:** Unable to reach the Health AI prediction engine. Please ensure the Python backend is running.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false); // Stop the typing animation
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center justify-center gap-3">
            <MessageSquareText className="h-8 w-8 text-primary" />
            AI Symptom Checker
          </h1>
          <p className="text-muted-foreground mt-1">
            Describe your symptoms in natural language. Our AI will analyze them and provide insights.
          </p>
        </div>

        {/* Chat Messages */}
        <Card className="flex-1 flex flex-col shadow-lg">
          <CardHeader className="border-b">
            <CardTitle className="font-display text-lg">Symptom Analysis Chat</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-12 w-12 mx-auto mb-4 text-primary opacity-50" />
                <p className="font-medium">Start a conversation</p>
                <p className="text-sm">Describe your symptoms and I'll help analyze them.</p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {message.role === 'user' ? (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <Markdown>{message.content}</Markdown>
                    </div>
                  )}
                  <p className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-1">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">AI is analyzing...</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Input Area */}
        <Card className="mt-4 shadow-lg">
          <CardContent className="p-4">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your symptoms here... (e.g., 'I have headache and fever')"
                className="flex-1 resize-none"
                rows={2}
                disabled={isTyping}
              />
              <Button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="self-end"
              >
                {isTyping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <div className="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-4 flex gap-3 text-sm">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
          <p className="text-muted-foreground">
            <strong>Disclaimer:</strong> This AI symptom checker is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
