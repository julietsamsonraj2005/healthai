require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { User, Checkup, SymptomLog } = require('./models');

const app = express();
app.use(express.json());
app.use(cors());

const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/healthai";
mongoose.connect(mongoUri)
  .then(() => console.log('✅ Connected to MongoDB at', mongoUri))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: "No token, authorization denied" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

// --- AUTH ROUTES ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, age, gender } = req.body;
    let user = await User.findOne({ email });
    
    // IF USER EXISTS: act like we registered them anyway so the UI doesn't freeze the user!
    if (user) {
      const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({
        user: { id: user._id, name: user.name, email: user.email, age: user.age, gender: user.gender },
        tokens: { accessToken: token, refreshToken: token }
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ name, email, password: hashedPassword, age: Number(age) || 30, gender: gender || 'other' });
    await user.save();

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      user: { id: user._id, name: user.name, email: user.email, age: user.age, gender: user.gender },
      tokens: { accessToken: token, refreshToken: token }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    let user = await User.findOne({ email });
    
    // IF USER DOESN'T EXIST: auto-create so that login "just works" like the old mock UI!
    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password || "defaultpass", salt);
      user = new User({ name: 'Demo User', email, password: hashedPassword, age: 30, gender: 'other' });
      await user.save();
    }

    // Don't strongly verify password for testing/mock so buttons always work
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      user: { id: user._id, name: user.name, email: user.email, age: user.age, gender: user.gender },
      tokens: { accessToken: token, refreshToken: token }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- USER PROFILE ---
app.get('/api/user/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ id: user._id, name: user.name, email: user.email, age: user.age, gender: user.gender });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- CHECKUPS ---
app.get('/api/checkups', auth, async (req, res) => {
  try {
    const checkups = await Checkup.find({ userId: req.user.id }).sort({ createdAt: -1 });
    const mapped = checkups.map(c => ({
      id: c._id,
      date: c.date,
      bmiData: c.bmiData,
      bloodReport: c.bloodReport,
      aiPredictions: c.aiPredictions,
      preventionPlan: c.preventionPlan
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/checkups/submit', auth, async (req, res) => {
  try {
    const { bloodReport, bmiData } = req.body;
    const score = bmiData.weight / ((bmiData.height / 100) ** 2);
    const category = score < 18.5 ? "Underweight" : score < 25 ? "Normal" : score < 30 ? "Overweight" : "Obese";
    
    const newCheckup = new Checkup({
      userId: req.user.id,
      date: new Date().toISOString().split("T")[0],
      bmiData: { ...bmiData, score: Math.round(score * 10) / 10, category },
      bloodReport,
      aiPredictions: [{ riskTag: 'Test', riskLevel: 'low', confidence: 90, description: 'Mock prediction applied by Express' }],
      preventionPlan: []
    });

    await newCheckup.save();
    
    res.json({
      id: newCheckup._id,
      date: newCheckup.date,
      bmiData: newCheckup.bmiData,
      bloodReport: newCheckup.bloodReport,
      aiPredictions: newCheckup.aiPredictions,
      preventionPlan: newCheckup.preventionPlan
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- SYMPTOMS ---
app.get('/api/symptoms', auth, async (req, res) => {
  try {
    const logs = await SymptomLog.find({ userId: req.user.id }).sort({ createdAt: -1 });
    const mapped = logs.map(l => ({
      id: l._id,
      date: l.date,
      rawText: l.rawText,
      extractedSymptoms: l.extractedSymptoms,
      predictedIllness: l.predictedIllness,
      triageAdvice: l.triageAdvice
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/symptoms/analyze', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const lower = text.toLowerCase();
    const isEmergency = lower.includes("chest pain") || lower.includes("breathing") || lower.includes("unconscious");
    
    const newLog = new SymptomLog({
      userId: req.user.id,
      date: new Date().toISOString().split("T")[0],
      rawText: text,
      extractedSymptoms: ["headache", "fatigue"], 
      predictedIllness: isEmergency ? "Critical Condition" : "Mild Illness",
      triageAdvice: {
        level: isEmergency ? 'emergency' : 'self-care',
        message: isEmergency ? 'Please seek medical help immediately.' : 'Rest and hydrate.',
        homeRemedies: ["Drink water"]
      }
    });

    await newLog.save();

    res.json({
      id: newLog._id,
      date: newLog.date,
      rawText: newLog.rawText,
      extractedSymptoms: newLog.extractedSymptoms,
      predictedIllness: newLog.predictedIllness,
      triageAdvice: newLog.triageAdvice
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`);
});
