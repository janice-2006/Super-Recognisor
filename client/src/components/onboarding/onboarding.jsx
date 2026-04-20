import React, { useState } from 'react';

const Onboarding = ({ onComplete }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        fullName: '',
        age: '',
        testFrequency: '',
        skillLevel: '',
        motivation: ''
    });

    const nextStep = () => setStep(step + 1);

    return (
        <div className="hero-container">
            <div className="glass-card">
                <div className="progress-bar-container">
                    <div className="progress-fill" style={{ width: `${(step / 5) * 100}%` }}></div>
                </div>

                {step === 1 && (
                    <div>
                        <h1>What's your name?</h1>
                        <input type="text" placeholder="Enter full name" value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
                        <button className="btn-primary" onClick={nextStep} disabled={!formData.fullName}>Next</button>
                    </div>
                )}

                {step === 2 && (
                    <div>
                        <h1>How old are you?</h1>
                        <input type="number" placeholder="Enter age" value={formData.age}
                            onChange={(e) => setFormData({ ...formData, age: e.target.value })} />
                        <button className="btn-primary" onClick={nextStep} disabled={!formData.age}>Next</button>
                    </div>
                )}

                {step === 3 && (
                    <div>
                        <h1>Recognition Frequency</h1>
                        <p>How often do you practice face recognition?</p>
                        <select className="custom-select" onChange={(e) => setFormData({ ...formData, testFrequency: e.target.value })}>
                            <option value="">Select an option</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="rarely">Rarely</option>
                        </select>
                        <button className="btn-primary" onClick={nextStep} style={{ marginTop: '15px' }}>Next</button>
                    </div>
                )}

                {step === 4 && (
                    <div>
                        <h1>Current Skill Level</h1>
                        <p>How would you rate your ability to remember strangers?</p>
                        <button className="btn-outline" onClick={() => { setFormData({ ...formData, skillLevel: 'Pro' }); nextStep(); }}>Elite (Super Recogniser)</button>
                        <button className="btn-outline" onClick={() => { setFormData({ ...formData, skillLevel: 'Average' }); nextStep(); }}>Average</button>
                    </div>
                )}

                {step === 5 && (
                    <div>
                        <h1>Final Step!</h1>
                        <p>Why do you want to join the Arena?</p>
                        <input type="text" placeholder="Your goal..." onChange={(e) => setFormData({ ...formData, motivation: e.target.value })} />
                        <button className="btn-primary" onClick={() => onComplete(formData)}>Enter the Arena</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Onboarding;