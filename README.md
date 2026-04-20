# 🧠 Super Recogniser

Super Recogniser is an advanced, full-stack cognitive testing platform designed to evaluate and train human facial recognition capabilities. Inspired by the neurological phenomenon of "Super Recognisers" (individuals with exceptional facial mapping skills), this application provides adaptive cognitive challenges, dynamic neural plotting, and secure user management.

## 🚀 Key Features

- **Progressive Cognitive Challenges**: Test your facial recall abilities across three distinct difficulty tiers (Standard, Inversion, and Extreme).
- **Machine Learning Analysis**: A dedicated Python/FastAPI ML engine uses the `face_recognition` and OpenCV libraries to verify biometric matches and predict user skill levels.
- **Neural Progression Tracking**: Visualizes user performance over time using dynamically generated Seaborn/Matplotlib charts.
- **Global Arena Leaderboard**: Compete globally with a ranking system based on accuracy, reaction time, and difficulty modifiers.
- **Dynamic Cyberpunk UI**: A highly responsive, premium React frontend featuring custom neon cursor trails, floating particles, glassmorphism, and 3D animations.
- **Secure Authentication**: Traditional JWT/MongoDB authentication combined seamlessly with Google OAuth2.0 integration.

## 🛠️ Technology Stack

- **Frontend**: React.js, Vite, Chart.js, HTML5/CSS3 (Vanilla Animations)
- **Backend (API Base)**: Node.js, Express, MongoDB Atlas, Mongoose, Passport.js
- **Machine Learning Service**: Python, FastAPI, OpenCV, face_recognition, scikit-learn, Seaborn & Matplotlib

## ⚙️ Architecture

The platform runs on a microservice-inspired architecture:
1. **The Client (Port 5173)**: Handles state management, UI rendering, user interaction, and captures testing performance using React.
2. **The Server (Port 5000)**: Manages database interactions, leaderboard sorting, user onboarding, session tokens, and acts as a bridge for complex ML operations.
3. **The ML Service (Port 8000)**: A focused Python service that handles heavy visual processing, biometric comparisons, and returning dynamically generated assessment payload graphs.
