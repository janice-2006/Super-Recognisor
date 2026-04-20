import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import './App.css';
import mainLogo from './assets/logo - main.png';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Detect if we are running on localhost or a network IP to allow multi-device testing
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : `http://${window.location.hostname}:5000`;

function App() {
  const [view, setView] = useState('login'); // 'login', 'onboarding', 'dashboard', 'game', 'results'
  const [user, setUser] = useState(null); 
  const [onboardingData, setOnboardingData] = useState({ name: '', age: '', selfAssessment: '', longTermMemory: '' });
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [gameLevel, setGameLevel] = useState(1);
  const [leaderboard, setLeaderboard] = useState([]);
  const [pythonPlot, setPythonPlot] = useState(null);
  const [showPlots, setShowPlots] = useState(false);
  const [trails, setTrails] = useState([]);
  const [lastGameResult, setLastGameResult] = useState(null);
  
  // Auth states
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [showPass, setShowPass] = useState(false);

  const resetSession = () => {
    setUser(null);
    setOnboardingData({ name: '', age: '', selfAssessment: '', longTermMemory: '' });
    setOnboardingStep(1);
    setPythonPlot(null);
    setShowPlots(false);
  };

  useEffect(() => {
    resetSession(); // Ensure fresh start
  }, []);

  // Neon Cursor Trail Logic
  useEffect(() => {
    const handleMouseMove = (e) => {
      const newParticles = Array.from({ length: 3 }).map(() => ({
        id: Math.random(),
        x: e.clientX,
        y: e.clientY,
        color: `hsl(${Math.random() * 60 + 180}, 100%, 60%)`,
        size: Math.random() * 8 + 4
      }));
      setTrails((prev) => [...prev, ...newParticles].slice(-40));
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const getPerformanceInsight = (accuracy) => {
    if (accuracy < 30) {
      return "There are chances you might have Prosopagnosia. Prosopagnosia, also known as face blindness, is a cognitive disorder of face perception in which the ability to recognize familiar faces, including one’s own face, is impaired. It is not related to memory loss or vision issues, but rather a specific neural gap in facial processing.";
    } else if (accuracy < 70) {
      return "Solid recognition skills. To improve, try focusing on distinct facial landmarks like nose shape, distance between eyes, and hairline patterns. Your neural mapping is developing well - keep training to reach Super Recogniser status.";
    } else {
      return "Exceptional facial encoding detected! You exhibit traits of a 'Super Recogniser' - individuals with significantly better than average face recognition ability. Your brain processes micro-features with remarkable precision.";
    }
  };

  const fetchDashboardData = async (email, userOverride = null) => {
    try {
      const lbRes = await fetch(`${API_BASE_URL}/api/leaderboard`);
      const lbData = await lbRes.json();
      setLeaderboard(lbData);
    } catch (err) {
      console.error("Dashboard synchronization error:", err);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    const email = e.target.elements.email.value.trim();
    const password = e.target.elements.password.value.trim();
    const endpoint = authMode === 'login' ? '/login' : '/register';

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const contentType = res.headers.get("content-type");
      let data;
      
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error("Non-JSON Response:", text);
        alert(`Authentication Error (Status ${res.status}): The server returned a non-JSON response. Check server logs.`);
        return;
      }

      if (res.ok) {
        resetSession();
        setUser(data.user);
        
        if (data.user.name && data.user.name !== 'Guest') {
          setOnboardingData({
            name: data.user.name,
            age: data.user.age || '',
            selfAssessment: data.user.selfAssessment || '',
            longTermMemory: data.user.longTermMemory || ''
          });
        }

        if (authMode === 'signup') {
          setView('onboarding');
        } else {
          fetchDashboardData(email, data.user);
          setView('dashboard');
        }
      } else {
        console.error("Auth Failure Data:", data);
        const detailedError = data.message || data.error || JSON.stringify(data);
        alert(`Authentication Error (Status ${res.status}): ${detailedError}`);
      }
    } catch (err) {
      console.error("Auth Fetch Error:", err);
      alert(`Critical Connection Failure: ${err.message}. Check if backend server is running on port 5000.`);
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/google/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential })
      });

      const data = await res.json();

      if (res.ok) {
        resetSession();
        setUser(data.user);

        if (data.user.name && data.user.name !== 'Guest') {
          setOnboardingData({
            name: data.user.name,
            age: data.user.age || '',
            selfAssessment: data.user.selfAssessment || '',
            longTermMemory: data.user.longTermMemory || ''
          });
        }

        if (data.isNewUser) {
          setView('onboarding');
        } else {
          fetchDashboardData(data.user.email, data.user);
          setView('dashboard');
        }
      } else {
        alert(`Google Sign-In Error: ${data.message || 'Authentication failed'}`);
      }
    } catch (err) {
      console.error('Google Sign-In Error:', err);
      alert(`Connection error: ${err.message}. Make sure the backend server is running.`);
    }
  };

  const submitOnboarding = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, ...onboardingData })
      });
      const data = await res.json();
      setUser(data.user);
      fetchDashboardData(user.email);
      setView('dashboard');
    } catch (err) {
      setUser(prev => ({ ...prev, name: onboardingData.name }));
      setView('dashboard');
    }
  };

  const handleTestComplete = async (scoreObj) => {
    const { correct, totalTargets, duration } = scoreObj;
    const accuracy = Math.round((correct / totalTargets) * 100);
    const insight = getPerformanceInsight(accuracy);
    
    setLastGameResult({
      score: 0,
      accuracy,
      correct,
      totalTargets,
      insight
    });
    setView('results');

    try {
      const res = await fetch(`${API_BASE_URL}/api/score/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: user.email, 
          level: gameLevel, 
          timeTaken: duration, 
          correctMatches: correct,
          accuracy: accuracy
        })
      });
      const data = await res.json();
      
      const newGame = { timeTaken: duration, accuracy, date: new Date().toISOString(), isCorrect: correct > 0 };
      const updatedUser = { ...user, totalScore: data.currentScore, gamesPlayed: [...user.gamesPlayed, newGame] };
      
      setLastGameResult(prev => ({ ...prev, score: data.pointsEarned }));
      setUser(updatedUser);
      fetchDashboardData(user.email, updatedUser);
    } catch (err) {
      console.error("Score submission failed");
    }
  };

  return (
    <div className="app-container">
      {/* Neon Cursor Trail Particles */}
      {trails.map((p) => (
        <div key={p.id} className="neon-trail-particle" style={{ left: p.x, top: p.y, width: p.size, height: p.size, backgroundColor: p.color, boxShadow: `0 0 10px ${p.color}` }} />
      ))}

      {/* Floating Feedback Widget — always visible, never overlaps content */}
      <FeedbackWidget />

      <div className="main-container">
        {view === 'login' && (
          <div className="glass-card">
             <div className="logo-container">
               <img src={mainLogo} alt="Face Wireframe" className="main-logo" />
             </div>
             <h1>Super Recogniser</h1>
             <form onSubmit={handleAuth} className="login-form">
               <input type="email" name="email" placeholder="Email Address" className="onboarding-input" required autoComplete="email" />
               <div style={{position: 'relative', width: '100%'}}>
                 <input type={showPass ? "text" : "password"} name="password" placeholder="Password" className="onboarding-input" required autoComplete="current-password" />
                 <span className="pass-toggle" onClick={() => setShowPass(!showPass)}>
                   {showPass ? "HIDE" : "SHOW"}
                 </span>
               </div>
               <button type="submit" className="btn-primary">{authMode === 'login' ? 'LOGIN' : 'SIGN UP'}</button>
             </form>
             
             <p className="auth-toggle-text" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
               {authMode === 'login' ? "Need an account? Sign Up" : "Already have an account? Login"}
             </p>

             <div className="separator">OR</div>
             <div className="google-login-wrapper">
               <GoogleLogin
                 onSuccess={handleGoogleLogin}
                 onError={() => alert('Google Sign-In failed. Please try again.')}
                 theme="filled_black"
                 size="large"
                 width="320"
                 text="continue_with"
                 shape="pill"
               />
             </div>
          </div>
        )}

        {view === 'onboarding' && (
          <div className="glass-card">
            {onboardingStep === 1 && (
              <>
                <h2 className="onboarding-question">What is your name?</h2>
                <input type="text" className="onboarding-input" value={onboardingData.name} onChange={(e) => setOnboardingData({...onboardingData, name: e.target.value})} />
                <button className="btn-primary" style={{marginTop: '40px'}} onClick={() => onboardingData.name && setOnboardingStep(2)}>NEXT</button>
              </>
            )}
            {onboardingStep === 2 && (
              <>
                <h2 className="onboarding-question">How old are you?</h2>
                <input type="number" className="onboarding-input" value={onboardingData.age} onChange={(e) => setOnboardingData({...onboardingData, age: e.target.value})} />
                <button className="btn-primary" style={{marginTop: '40px'}} onClick={() => setOnboardingStep(3)}>NEXT</button>
              </>
            )}
            {onboardingStep === 3 && (
              <>
                <h2 className="onboarding-question">How well do you think you are good in recognizing people?</h2>
                <input type="text" className="onboarding-input" value={onboardingData.selfAssessment} placeholder="e.g. Excellent, Average..." onChange={(e) => setOnboardingData({...onboardingData, selfAssessment: e.target.value})} />
                <button className="btn-primary" style={{marginTop: '40px'}} onClick={() => setOnboardingStep(4)}>NEXT</button>
              </>
            )}
            {onboardingStep === 4 && (
              <>
                <h2 className="onboarding-question">Are you able to remember faces of people who you met once, more than 6 years ago?</h2>
                <div style={{display: 'flex', gap: '20px', marginTop: '40px'}}>
                  <button className="btn-primary" onClick={() => { setOnboardingData({...onboardingData, longTermMemory: 'Yes'}); setOnboardingStep(5); }}>YES</button>
                  <button className="btn-primary" style={{background: '#444'}} onClick={() => { setOnboardingData({...onboardingData, longTermMemory: 'No'}); setOnboardingStep(5); }}>NO</button>
                </div>
              </>
            )}
            {onboardingStep === 5 && (
              <>
                <h2 className="onboarding-question">Shall we proceed, {onboardingData.name}?</h2>
                <button className="btn-primary" style={{marginTop: '40px'}} onClick={submitOnboarding}>ENGAGE SYSTEM</button>
              </>
            )}
          </div>
        )}

        {view === 'dashboard' && (
          <div className="dashboard-wrapper">
            <h1 className="dashboard-title">Welcome, <span style={{color: '#ff00ff'}}>{(user?.name && user.name !== 'Guest') ? user.name : (user?.username || 'Guest')}</span></h1>
            <div className="dashboard-grid">
              <div className="glass-card wide-card" style={{padding: '30px'}}>
                <h3 style={{marginBottom: '20px', color: '#00f2ff'}}>PERFORMANCE INSIGHTS</h3>
                <div style={{display: 'flex', gap: '20px'}}>
                  <button className="btn-secondary" onClick={() => setShowPlots(!showPlots)}>
                    {showPlots ? "HIDE INSIGHTS" : "GENERATE NEURAL PLOT"}
                  </button>
                  <button className="btn-secondary" onClick={() => { setOnboardingStep(1); setView('onboarding'); }}>
                    EDIT PROFILE SURVEY
                  </button>
                </div>
                {showPlots && (
                  <div className="analytics-container">
                    {user?.gamesPlayed?.length > 0 ? (
                      <div className="chart-wrapper">
                         <PerformanceChart data={user.gamesPlayed} />
                         <div className="insight-box">
                            <h4 style={{color: '#00f2ff', marginBottom: '10px'}}>NEURAL SUMMARY</h4>
                            <p style={{fontSize: '0.9rem', opacity: 0.8}}>{getPerformanceInsight(user.gamesPlayed[user.gamesPlayed.length-1].accuracy)}</p>
                         </div>
                      </div>
                    ) : (
                      <p style={{textAlign: 'center', padding: '40px', opacity: 0.5}}>Complete a session to generate neural patterns.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="level-cards">
                {[1, 2, 3].map(lvl => (
                  <div key={lvl} className="level-card" onClick={() => { setGameLevel(lvl); setView('game'); }}>
                    <h2 style={{fontSize: '2rem', marginBottom: '10px'}}>LVL {lvl}</h2>
                    <p style={{color: '#888'}}>
                      {lvl === 1 ? 'Standard (10)' : lvl === 2 ? 'Inversion (20)' : 'Extreme (35)'}
                    </p>
                  </div>
                ))}
              </div>

              <div className="glass-card wide-card scoreboard-card">
                <h3 className="section-title">GLOBAL ARENA LEADERBOARD</h3>
                <div className="scoreboard-table">
                  <div className="table-header">
                    <span>RANK</span>
                    <span>PLAYER</span>
                    <span>COGNITIVE SCORE</span>
                  </div>
                  {leaderboard.map((lb, i) => (
                    <div key={i} className={`table-row rank-${i + 1}`}>
                      <span className="rank-col">#{i + 1}</span>
                      <span className="player-col">
                        <div className="player-avatar" style={{background: `hsl(((lb.name && lb.name !== 'Guest' ? lb.name : (lb.username || "Anonymous")).length) * 40, 70%, 50%)`}}>
                          {(lb.name && lb.name !== 'Guest' ? lb.name : (lb.username || "?"))[0].toUpperCase()}
                        </div>
                        {lb.name && lb.name !== 'Guest' ? lb.name : (lb.username || "Anonymous")}
                      </span>
                      <span className="score-col">{Math.round(lb.totalScore).toLocaleString()} PTS</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => setView('login')} className="btn-primary" style={{marginTop:'40px', maxWidth: '200px', background: '#333'}}>LOGOUT</button>
          </div>
        )}

        {view === 'game' && (
          <GameLevel level={gameLevel} onComplete={handleTestComplete} onCancel={() => setView('dashboard')} />
        )}

        {view === 'results' && lastGameResult && (
          <div className="glass-card" style={{textAlign: 'center', minWidth: '500px'}}>
            <h1 style={{fontSize: '3rem', color: '#00f2ff', marginBottom: '10px'}}>ANALYSIS COMPLETE</h1>
            <div style={{margin: '40px 0'}}>
              <h2 style={{fontSize: '4rem', color: '#ff00ff'}}>+{lastGameResult.score}</h2>
              <p style={{fontSize: '1.2rem', color: '#888'}}>TOTAL POINTS EARNED</p>
            </div>
            
            <div style={{display: 'flex', justifyContent: 'center', gap: '40px', marginBottom: '40px'}}>
              <div>
                <h3 style={{fontSize: '2rem'}}>{lastGameResult.accuracy}%</h3>
                <p style={{color: '#888'}}>ACCURACY</p>
              </div>
              <div>
                <h3 style={{fontSize: '2rem'}}>{lastGameResult.correct}/{lastGameResult.totalTargets}</h3>
                <p style={{color: '#888'}}>SUBJECTS SAVED</p>
              </div>
            </div>

            <div className="glass-card" style={{background: 'rgba(255,0,255,0.05)', border: '1px dashed #ff00ff55', padding: '20px', marginBottom: '40px'}}>
              <h4 style={{color: '#ff00ff', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.8rem', marginBottom: '10px'}}>NEURAL INSIGHT</h4>
              <p style={{fontSize: '1.3rem', fontStyle: 'italic'}}>{lastGameResult.insight}</p>
            </div>

            <button className="btn-primary" onClick={() => setView('dashboard')}>
              RETURN TO ARENA
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const GameLevel = ({ level, onComplete, onCancel }) => {
  const [gameState, setGameState] = useState('loading'); // loading -> memorizing -> hidden -> recall -> results
  const [seenImages, setSeenImages] = useState([]);
  const [mcqPool, setMcqPool] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [startTime, setStartTime] = useState(null);

  const levelConfigs = {
    1: { count: 10, delay: 2000 },
    2: { count: 20, delay: 1300 },
    3: { count: 35, delay: 300 }
  };
  const config = levelConfigs[level];

  useEffect(() => {
    const fetchGameData = async () => {
      try {
        // Fetch a large batch of UNIQUE real people from randomuser.me
        // This gives us thousands of unique identities - no repetition possible
        const totalNeeded = config.count + 15; // seen + extra distractors buffer
        const res = await fetch(`https://randomuser.me/api/?results=${totalNeeded}&inc=picture,login&noinfo`);
        const data = await res.json();
        
        // Deduplicate by UUID - guaranteed unique real photos
        const seenIds = new Set();
        const allFaces = data.results
          .filter(r => {
            if (seenIds.has(r.login.uuid)) return false;
            seenIds.add(r.login.uuid);
            return true;
          })
          .map(r => ({
            url: r.picture.large,  // full 128px high-quality photo
            id: r.login.uuid       // cryptographically unique ID from the API
          }));
        
        // Split into two completely separate, non-overlapping groups
        const memorizingSet = allFaces.slice(0, config.count);   // faces to memorize
        const districtors   = allFaces.slice(config.count);      // NEVER seen faces
        
        // Verify no overlap (defensive check)
        const seenUuids = new Set(memorizingSet.map(f => f.id));
        const cleanDistractors = districtors.filter(f => !seenUuids.has(f.id));
        
        setSeenImages(memorizingSet);
        
        // MCQ pool: 5 faces the user DID see + 5 faces they NEVER saw
        // This guarantees no duplication in the test grid
        const seenInMcq = [...memorizingSet]
          .sort(() => Math.random() - 0.5)
          .slice(0, 5);
        const distractorsInMcq = cleanDistractors.slice(0, 5);
        
        // Final check: ensure all 10 MCQ items have distinct IDs
        const mcqIds = new Set();
        const finalMcq = [...seenInMcq, ...distractorsInMcq]
          .filter(f => {
            if (mcqIds.has(f.id)) return false;
            mcqIds.add(f.id);
            return true;
          })
          .sort(() => Math.random() - 0.5);
        
        setMcqPool(finalMcq);
        setGameState('memorizing');
      } catch (err) {
        console.error("API Error - could not load game images:", err);
      }
    };
    fetchGameData();
  }, [level]);

  useEffect(() => {
    if (gameState === 'memorizing') {
      if (currentIndex < seenImages.length) {
        const timer = setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
        }, config.delay);
        return () => clearTimeout(timer);
      } else {
        setGameState('hidden');
        setTimeout(() => {
          setGameState('recall');
          setStartTime(Date.now());
        }, 1000);
      }
    }
  }, [gameState, currentIndex, seenImages.length]);

  const toggleSelection = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFinalSubmit = () => {
    const targetsInPool = mcqPool.filter(img => seenImages.some(seen => seen.id === img.id));
    let correctCount = 0;
    selectedIds.forEach(id => {
      if (seenImages.some(seen => seen.id === id)) correctCount++;
    });

    const duration = Date.now() - startTime;
    const accuracy = (correctCount / targetsInPool.length) * 100;
    
    let insight = "Exemplary performance! You are a Super Recogniser.";
    if (accuracy < 50) insight = "Your neural mapping needs more training. You could do better.";
    else if (accuracy < 80) insight = "Solid performance. Sharp focus, keep it up!";

    setGameState('results');
    onComplete({ correct: correctCount, totalTargets: targetsInPool.length, duration, insight });
  };

  return (
    <div className="glass-card game-card">
      {gameState === 'loading' && <h3 className="blink">PREPARING COGNITIVE SEQUENCE...</h3>}

      {gameState === 'memorizing' && currentIndex < seenImages.length && (
        <div className="slideshow-container">
          <h3 style={{color: '#ff00ff', marginBottom: '20px'}}>MEMORIZE SUBJECT {currentIndex + 1} / {config.count}</h3>
          <img src={seenImages[currentIndex].url} className="mem-img" alt="Subject" />
        </div>
      )}

      {gameState === 'hidden' && <div className="slideshow-container"><h2 className="blink">PREPARING RECALL PHASE...</h2></div>}

      {gameState === 'recall' && (
        <div style={{textAlign: 'center'}}>
          <h2 style={{color: '#00f2ff', marginBottom: '30px'}}>IDENTIFY SEEN SUBJECTS</h2>
          <div className="mcq-grid">
            {mcqPool.map((img, i) => (
              <div key={i} className="mcq-item" onClick={() => toggleSelection(img.id)}>
                <input type="checkbox" className="top-left-checkbox" checked={selectedIds.has(img.id)} readOnly />
                <img src={img.url} className={`mcq-img ${selectedIds.has(img.id) ? 'selected-neon' : ''}`} alt="Subject" />
              </div>
            ))}
          </div>
          <button className="btn-primary" style={{marginTop: '50px', maxWidth: '300px'}} onClick={handleFinalSubmit}>SUBMIT FOR ANALYSIS</button>
        </div>
      )}

      {gameState === 'results' && (
        <div style={{textAlign: 'center', padding: '40px'}}>
          <h2 style={{fontSize: '3rem', color: '#00f2ff'}}>ANALYSIS COMPLETE</h2>
          <p style={{fontSize: '1.5rem', margin: '20px 0'}}>Insights found. Returning to dashboard...</p>
        </div>
      )}

      <button onClick={onCancel} className="btn-secondary" style={{marginTop: '20px'}}>ABORT</button>
    </div>
  );
};

const PerformanceChart = ({ data }) => {
  const chartData = useMemo(() => {
    return {
      labels: data.map((_, i) => `S${i + 1}`),
      datasets: [
        {
          label: 'Accuracy %',
          data: data.map(g => g.accuracy || 0),
          fill: true,
          backgroundColor: 'rgba(0, 242, 255, 0.1)',
          borderColor: '#00f2ff',
          pointBackgroundColor: '#00f2ff',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#00f2ff',
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 6,
        },
      ],
    };
  }, [data]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(5, 7, 10, 0.9)',
        titleColor: '#00f2ff',
        bodyColor: '#fff',
        borderColor: '#00f2ff',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context) => ` Accuracy: ${context.parsed.y}%`
        }
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          callback: (value) => value + '%'
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        },
      },
    },
  };

  return (
    <div style={{ height: '350px', width: '100%' }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

// ─── Feedback Widget ────────────────────────────────────────────────────────
const FeedbackWidget = () => {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const panelRef = useRef(null);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSubmit = () => {
    if (rating === 0) return;
    // Log feedback (can wire to backend later)
    console.log('[FEEDBACK]', { rating, comment });
    setSubmitted(true);
    setTimeout(() => {
      setOpen(false);
      setSubmitted(false);
      setRating(0);
      setComment('');
    }, 2500);
  };

  return (
    <div className="feedback-widget" ref={panelRef}>
      {/* Slide-out panel */}
      <div className={`feedback-panel ${open ? 'feedback-panel--open' : ''}`}>
        {submitted ? (
          <div className="feedback-success">
            <span className="feedback-success-icon">✓</span>
            <p>Thanks for your feedback!</p>
          </div>
        ) : (
          <>
            <h4 className="feedback-title">Rate Your Experience</h4>
            <div className="feedback-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  id={`feedback-star-${star}`}
                  className={`feedback-star ${(hover || rating) >= star ? 'feedback-star--active' : ''}`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >
                  ★
                </button>
              ))}
            </div>
            <p className="feedback-rating-label">
              {rating === 0 ? 'Select a rating' : ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][rating]}
            </p>
            <textarea
              id="feedback-comment"
              className="feedback-textarea"
              placeholder="Any comments? (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
            <button
              id="feedback-submit"
              className="feedback-submit-btn"
              onClick={handleSubmit}
              disabled={rating === 0}
            >
              SUBMIT FEEDBACK
            </button>
          </>
        )}
      </div>

      {/* Fixed tab trigger */}
      <button
        id="feedback-toggle"
        className={`feedback-tab ${open ? 'feedback-tab--active' : ''}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Open feedback"
      >
        <span className="feedback-tab-icon">{open ? '✕' : '💬'}</span>
        <span className="feedback-tab-label">Feedback</span>
      </button>
    </div>
  );
};

export default App;