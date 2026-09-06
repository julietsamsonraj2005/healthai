const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true }
}, { timestamps: true });

// Checkup Schema
const checkupSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  bmiData: {
    height: Number,
    weight: Number,
    score: Number,
    category: String
  },
  bloodReport: {
    hemoglobin: Number,
    fastingSugar: Number,
    totalCholesterol: Number,
    hdl: Number,
    ldl: Number,
    triglycerides: Number,
    creatinine: Number,
    tsh: Number
  },
  aiPredictions: [{
    riskTag: String,
    riskLevel: { type: String, enum: ['low', 'medium', 'high'] },
    confidence: Number,
    description: String
  }],
  preventionPlan: [{
    conditionTag: String,
    title: String,
    dietSteps: [String],
    exerciseSteps: [String],
    monitoringSteps: [String],
    medicalDisclaimer: String
  }]
}, { timestamps: true });

// SymptomLog Schema
const symptomLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  rawText: { type: String, required: true },
  extractedSymptoms: [String],
  predictedIllness: String,
  triageAdvice: {
    level: { type: String, enum: ['self-care', 'consult-doctor', 'urgent', 'emergency'] },
    message: String,
    homeRemedies: [String]
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Checkup = mongoose.model('Checkup', checkupSchema);
const SymptomLog = mongoose.model('SymptomLog', symptomLogSchema);

module.exports = { User, Checkup, SymptomLog };
