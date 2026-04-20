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

   Final result:
   <img width="931" height="433" alt="image" src="https://github.com/user-attachments/assets/680aedca-bf76-4822-9ec5-965c3dc6bb30" />
   <img width="769" height="589" alt="image" src="https://github.com/user-attachments/assets/1ce1ef24-a6a3-4bee-8151-e6629b84a891" />
<img width="1600" height="696" alt="image" src="https://github.com/user-attachments/assets/c104be3f-1952-4456-903d-c5d9191909d2" />
<img width="1600" height="696" alt="image" src="https://github.com/user-attachments/assets/b02d0d46-fcf4-45ab-8f12-d30cc03d3f5d" />
<img width="1600" height="700" alt="image" src="https://github.com/user-attachments/assets/06cd23aa-128c-4e33-b5f9-08dfb077c0cc" />
<img width="1102" height="820" alt="image" src="https://github.com/user-attachments/assets/6c8227c2-1659-471d-94b3-61b2d7071968" />



