from fastapi import FastAPI, UploadFile, File, Form
import face_recognition
import numpy as np
import cv2
from sklearn.ensemble import RandomForestClassifier
import pickle
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
from typing import List
from pydantic import BaseModel

app = FastAPI()

class PlotData(BaseModel):
    times: List[float]
    labels: List[str]

@app.post("/generate-plot")
async def generate_plot(data: PlotData):
    try:
        # Set the style to dark/cyberpunk
        plt.style.use('dark_background')
        fig, ax = plt.subplots(figsize=(10, 5))
        
        # Plot reaction times
        sns.lineplot(x=data.labels, y=data.times, marker='o', color='#00f2ff', ax=ax, linewidth=3, markersize=10)
        
        # Style the plot
        ax.set_title('COGNITIVE REACTION PROGRESSION', color='#ff00ff', fontsize=16, pad=25, fontweight='bold')
        ax.set_xlabel('TEST SESSION', color='rgba(255,255,255,0.7)', fontsize=12)
        ax.set_ylabel('REACTION TIME (ms)', color='rgba(255,255,255,0.7)', fontsize=12)
        ax.grid(True, alpha=0.1, linestyle='--')
        
        # Remove top/right spines
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['left'].set_color('rgba(255,255,255,0.2)')
        ax.spines['bottom'].set_color('rgba(255,255,255,0.2)')

        # Save to buffer
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', dpi=100, transparent=True)
        buf.seek(0)
        img_str = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)
        
        return {"plot_url": f"data:image/png;base64,{img_str}"}
    except Exception as e:
        return {"error": str(e)}

# 1. THE RECOGNITION TEST ENGINE
@app.post("/verify-match")
async def verify_match(
    original_file: UploadFile = File(...),
    test_file: UploadFile = File(...)
):
    try:
        # Read files
        orig_bytes = await original_file.read()
        test_bytes = await test_file.read()

        # Convert to numpy arrays with specific dtype
        nparr_orig = np.frombuffer(orig_bytes, np.uint8)
        nparr_test = np.frombuffer(test_bytes, np.uint8)

        # Use OpenCV to decode the image first (this is more stable)
        orig_img = cv2.imdecode(nparr_orig, cv2.IMREAD_COLOR)
        test_img = cv2.imdecode(nparr_test, cv2.IMREAD_COLOR)

        # Convert BGR (OpenCV default) to RGB (face_recognition default)
        orig_img_rgb = cv2.cvtColor(orig_img, cv2.COLOR_BGR2RGB)
        test_img_rgb = cv2.cvtColor(test_img, cv2.COLOR_BGR2RGB)

        # Generate encodings
        orig_encs = face_recognition.face_encodings(orig_img_rgb)
        test_encs = face_recognition.face_encodings(test_img_rgb)

        if not orig_encs or not test_encs:
            return {"match": False, "error": "Could not detect a clear face in one of the images."}

        # Compare
        results = face_recognition.compare_faces([orig_encs[0]], test_encs[0])
        return {"match": bool(results[0])}
        
    except Exception as e:
        return {"status": "error", "message": str(e)}
# 2. THE SKILL PREDICTOR
@app.post("/predict-skill")
async def predict_skill(
    accuracy: float = Form(...), 
    response_time: float = Form(...), 
    difficulty_level: int = Form(...)
):
    # This represents your ML model logic
    # In a real scenario, you'd load a trained .pkl file here
    # For now, we use a simple logic gate or a dummy classifier
    
    score = (accuracy * 0.7) - (response_time * 0.3) + (difficulty_level * 0.5)
    
    if score > 8:
        level = "Super Recogniser"
    elif score > 5:
        level = "Pro"
    else:
        level = "Novice"
        
    return {"predicted_level": level, "raw_score": score}

@app.post("/generate-challenge")
async def generate_challenge(file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Create an inverted version
    inverted_img = cv2.flip(img, 0) # Flip vertically (Inversion)
    
    # Create a darkened version
    dark_img = cv2.convertScaleAbs(img, alpha=0.5, beta=0) 
    
    # In a real app, you would save these or return them as bytes
    return {"status": "Challenges generated successfully"}