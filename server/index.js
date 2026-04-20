const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const FormData = require('form-data');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { OAuth2Client } = require('google-auth-library');
const session = require('express-session');
const User = require('./models/user.js');

// Load environment variables
dotenv.config();

const app = express();

// 1. MIDDLEWARE
app.use(express.json());
app.use(cors({
    origin: true,  // Allow all origins dynamically
    credentials: true
}));
app.use(fileUpload());

// Session middleware (required for Passport)
app.use(session({
    secret: process.env.JWT_SECRET || 'super-recogniser-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport serialization
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log(`[GOOGLE AUTH] Login attempt for: ${profile.emails[0].value}`);

        // Check if user already exists
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
            console.log(`[GOOGLE AUTH] Existing user found: ${user.email}`);
            return done(null, user);
        }

        // Create new user from Google profile
        user = new User({
            email: profile.emails[0].value,
            username: profile.displayName || 'Guest',
            password: `google_${profile.id}`,  // Placeholder (not used for Google auth)
            name: profile.displayName || 'Guest',
            totalScore: 0,
            gamesPlayed: []
        });

        await user.save();
        console.log(`[GOOGLE AUTH] New user created: ${user.email}`);
        return done(null, user);
    } catch (err) {
        console.error('[GOOGLE AUTH] Error:', err);
        return done(err, null);
    }
}));

// Health check
app.get('/api/health', async (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
    res.json({ server: 'Online', database: dbStatus, time: new Date().toISOString() });
});

// 2. DATABASE CONNECTION (MongoDB Atlas)
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB Atlas Cluster"))
    .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// 3. GOOGLE AUTH ROUTES

// --- Token-based Google Sign-In (used by the React frontend) ---
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.post('/auth/google/token', async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ message: 'No credential token provided' });
        }

        // Verify the Google ID token
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const email = payload.email;
        const name = payload.name || 'Guest';

        console.log(`[GOOGLE AUTH] Token verified for: ${email}`);

        // Check if user already exists
        let user = await User.findOne({ email });
        let isNewUser = false;

        if (!user) {
            // Create new user from Google profile
            user = new User({
                email,
                username: name,
                password: `google_${payload.sub}`,
                name,
                totalScore: 0,
                gamesPlayed: []
            });
            await user.save();
            isNewUser = true;
            console.log(`[GOOGLE AUTH] New user created: ${email}`);
        } else {
            console.log(`[GOOGLE AUTH] Existing user found: ${email}`);
        }

        res.json({
            message: 'Google authentication successful',
            isNewUser,
            user: {
                email: user.email,
                name: user.name,
                age: user.age,
                selfAssessment: user.selfAssessment,
                longTermMemory: user.longTermMemory,
                totalScore: user.totalScore,
                gamesPlayed: user.gamesPlayed
            }
        });
    } catch (err) {
        console.error('[GOOGLE AUTH] Token verification error:', err.message);
        res.status(401).json({ message: 'Invalid Google credential: ' + err.message });
    }
});

// --- Legacy redirect-based OAuth (kept for compatibility) ---
app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        const userData = {
            email: req.user.email,
            name: req.user.name,
            age: req.user.age,
            selfAssessment: req.user.selfAssessment,
            longTermMemory: req.user.longTermMemory,
            totalScore: req.user.totalScore,
            gamesPlayed: req.user.gamesPlayed
        };
        const frontendURL = `http://localhost:5173`;
        const encodedUser = encodeURIComponent(JSON.stringify(userData));
        res.redirect(`${frontendURL}?googleAuth=success&user=${encodedUser}`);
    }
);

// 4. THE BRIDGE ROUTE (Connects React -> Node -> Python)
app.post('/api/verify-recognition', async (req, res) => {
    try {
        if (!req.files || !req.files.original || !req.files.test) {
            return res.status(400).json({ message: "Please upload both images." });
        }

        const form = new FormData();
        form.append('original_file', req.files.original.data, 'original.jpg');
        form.append('test_file', req.files.test.data, 'test.jpg');

        const response = await axios.post('http://127.0.0.1:8000/verify-match', form, {
            headers: { ...form.getHeaders() }
        });

        res.json(response.data);
    } catch (error) {
        console.error("ML Service Error:", error.message);
        res.status(500).json({
            message: "The Python ML service is unreachable. Make sure Uvicorn is running."
        });
    }
});

// 5. AUTHENTICATION ROUTES
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    console.log(`[AUTH] Register Attempt: ${email}`);

    if (!email || !password) {
        return res.status(400).json({ message: "Email and Password are required fields." });
    }

    try {
        const existing = await User.findOne({ email });
        if (existing) {
            console.warn(`[AUTH] Registration failed: ${email} already exists.`);
            return res.status(400).json({ message: "This email is already registered. Please Login." });
        }

        const newUser = new User({
            email,
            username: "Guest",
            password,
            name: "Guest",
            totalScore: 0,
            gamesPlayed: []
        });

        await newUser.save();
        console.log(`[AUTH] User created successfully: ${email}`);
        res.status(201).json({ message: "User registered successfully", user: newUser });
    } catch (err) {
        console.error(`[AUTH] Registration Error:`, err);
        res.status(400).json({ message: "Database Error: " + err.message });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log(`[AUTH] Login Attempt: ${email}`);

    try {
        const user = await User.findOne({ email, password });
        if (user) {
            console.log(`[AUTH] Login success: ${email}`);
            res.json({
                message: "Login successful",
                user: {
                    email: user.email,
                    name: user.name,
                    age: user.age,
                    selfAssessment: user.selfAssessment,
                    longTermMemory: user.longTermMemory,
                    totalScore: user.totalScore,
                    gamesPlayed: user.gamesPlayed
                }
            });
        } else {
            console.warn(`[AUTH] Login failed: Invalid credentials for ${email}`);
            res.status(401).json({ message: "Invalid email or password. Please try again." });
        }
    } catch (err) {
        console.error(`[AUTH] Login Error:`, err);
        res.status(500).json({ message: "Server Login Error: " + err.message });
    }
});

// 6. ONBOARDING ROUTE
app.post('/api/user/onboarding', async (req, res) => {
    const { email, name, age, selfAssessment, longTermMemory } = req.body;
    try {
        const user = await User.findOneAndUpdate(
            { email },
            { name, username: name, age, selfAssessment, longTermMemory },
            { new: true }
        );
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json({ message: "Onboarding complete", user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/score/submit', async (req, res) => {
    const { email, level, timeTaken, correctMatches, accuracy } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        const isCorrect = correctMatches > 0;
        user.gamesPlayed.push({ level, timeTaken, isCorrect, accuracy, date: new Date() });

        // PRECISION SCORING: 10 pts per match * level
        // Level 1: 10pts/match | Level 2: 20pts/match | Level 3: 30pts/match
        const pointsEarned = Math.round((correctMatches || 0) * (level || 1) * 10);
        user.totalScore += pointsEarned;

        await user.save();
        res.json({
            message: "Score saved!",
            pointsEarned: pointsEarned,
            currentScore: user.totalScore
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/leaderboard', async (req, res) => {
    const topPlayers = await User.find().sort({ totalScore: -1 }).limit(10).select('name username totalScore');
    res.json(topPlayers);
});

// 7. SERVER START
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Node.js Server running on port ${PORT}`);
    console.log(`🧠 Expecting Python Brain at http://127.0.0.1:8000`);
    console.log(`🔑 Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? 'CONFIGURED' : 'NOT SET'}`);
});