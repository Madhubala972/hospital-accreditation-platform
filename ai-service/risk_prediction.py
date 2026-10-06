import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

MODEL_PATH = os.path.join(os.path.dirname(__file__), "risk_model.joblib")
_CACHED_PIPELINE = None

def _create_and_train_baseline_model():
    """Train a baseline random forest risk estimator on domain synthetic distributions."""
    np.random.seed(42)
    n_samples = 2000
    
    # Features:
    # 1. occupancyRate (40% - 100%)
    # 2. avgWaitingTime (minutes: 5 - 180)
    # 3. infectionRate (percent: 0.1% - 8.0%)
    # 4. staffingLevel (ratio: 0.1 - 0.6 nurse/patient)
    # 5. incidentCount (monthly count: 0 - 20)
    # 6. pathwayConformance (percent: 40% - 100%)
    
    occupancy = np.random.uniform(40, 100, n_samples)
    wait_time = np.random.uniform(5, 180, n_samples)
    infection = np.random.uniform(0.1, 8.0, n_samples)
    staffing = np.random.uniform(0.1, 0.6, n_samples)
    incidents = np.random.poisson(3, n_samples)
    conformance = np.random.uniform(40, 100, n_samples)
    
    X = np.column_stack([occupancy, wait_time, infection, staffing, incidents, conformance])
    
    # Non-linear clinical risk formula:
    risk = (
        (occupancy / 100.0) * 25.0 +
        (np.clip(wait_time, 0, 120) / 120.0) * 20.0 +
        (np.clip(infection, 0, 5.0) / 5.0) * 25.0 +
        ((1.0 - np.clip(staffing, 0.1, 0.5) / 0.5)) * 15.0 +
        (np.clip(incidents, 0, 10) / 10.0) * 15.0 +
        ((1.0 - (conformance / 100.0))) * 25.0
    )
    # Scale to 0-100 range with realistic noise
    risk = np.clip(risk + np.random.normal(0, 3, n_samples), 0, 100)
    
    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('rf', RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42))
    ])
    pipeline.fit(X, risk)
    
    joblib.dump(pipeline, MODEL_PATH)
    return pipeline

def get_risk_model():
    """Load model once and cache in memory (Section 15/16)."""
    global _CACHED_PIPELINE
    if _CACHED_PIPELINE is not None:
        return _CACHED_PIPELINE
    
    if os.path.exists(MODEL_PATH):
        try:
            _CACHED_PIPELINE = joblib.load(MODEL_PATH)
            return _CACHED_PIPELINE
        except Exception:
            pass
    
    _CACHED_PIPELINE = _create_and_train_baseline_model()
    return _CACHED_PIPELINE

def predict_risk(metrics_dict):
    """
    Given a dictionary of hospital metrics, predicts operational risk score and contributing factors.
    Expected keys: occupancyRate, avgWaitingTime, infectionRate, staffingLevel, incidentCount, pathwayConformance
    """
    model = get_risk_model()
    
    occupancy = float(metrics_dict.get('occupancyRate', 75.0))
    wait_time = float(metrics_dict.get('avgWaitingTime', 30.0))
    infection = float(metrics_dict.get('infectionRate', 1.5))
    staffing = float(metrics_dict.get('staffingLevel', 0.33))
    incidents = float(metrics_dict.get('incidentCount', 2))
    conformance = float(metrics_dict.get('pathwayConformance', 85.0))
    
    features = np.array([[occupancy, wait_time, infection, staffing, incidents, conformance]])
    predicted_score = float(model.predict(features)[0])
    predicted_score = round(np.clip(predicted_score, 0, 100), 1)
    
    # Categorize
    if predicted_score < 30:
        category = "LOW"
    elif predicted_score < 60:
        category = "MEDIUM"
    elif predicted_score < 80:
        category = "HIGH"
    else:
        category = "CRITICAL"
        
    # Analyze contributing factors based on thresholds and deviations
    contributing_factors = []
    if occupancy > 85.0:
        contributing_factors.append(f"High bed occupancy rate ({occupancy:.1f}%) straining capacity")
    if wait_time > 45.0:
        contributing_factors.append(f"Average waiting time elevated ({wait_time:.1f} mins)")
    if infection > 3.0:
        contributing_factors.append(f"Infection rate above safety threshold ({infection:.2f}%)")
    if staffing < 0.25:
        contributing_factors.append(f"Staffing level below recommended ratio ({staffing:.2f} nurse/patient)")
    if incidents > 5:
        contributing_factors.append(f"Incident count high ({int(incidents)} reported events)")
    if conformance < 80.0:
        contributing_factors.append(f"Pathway protocol conformance deficit ({conformance:.1f}%)")
        
    if not contributing_factors:
        contributing_factors.append("Operational indicators are within normal variance thresholds")
        
    return {
        "mlRiskScore": predicted_score,
        "category": category,
        "contributingFactors": contributing_factors,
        "inputMetrics": {
            "occupancyRate": occupancy,
            "avgWaitingTime": wait_time,
            "infectionRate": infection,
            "staffingLevel": staffing,
            "incidentCount": incidents,
            "pathwayConformance": conformance
        }
    }
