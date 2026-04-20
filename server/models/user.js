const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, default: 'Guest' },
    username: { type: String }, // Satisfy implicit requirement
    age: Number,
    selfAssessment: String,
    longTermMemory: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    totalScore: { type: Number, default: 0 },
    stats: {
        totalAttempts: { type: Number, default: 0 },
        bestScore: { type: Number, default: 0 }
    },
    skillLevel: {
        type: String,
        default: 'Beginner'
    },
    testAttempts: {
        type: Number,
        default: 0
    },
    attempts: [{
        level: String,
        score: Number,
        accuracy: Number,
        reactionTime: Number,
        date: { type: Date, default: Date.now }
    }],
    gamesPlayed: [
        {
            level: Number,
            timeTaken: Number,
            isCorrect: Boolean,
            accuracy: Number,
            date: { type: Date, default: Date.now }
        }
    ]
});

module.exports = mongoose.model('User', UserSchema);