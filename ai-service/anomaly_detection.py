import numpy as np
from sklearn.ensemble import IsolationForest

def detect_anomalies(current_metric, historical_metrics=None):
    """
    Detects if current metric point deviates significantly from historical baseline or clinical bounds.
    """
    features_keys = ['occupancyRate', 'avgWaitingTime', 'infectionRate', 'staffingLevel', 'incidentCount', 'pathwayConformance']
    
    current_vec = [float(current_metric.get(k, 0)) for k in features_keys]
    
    anomalies = []
    anomaly_score = 0.0
    
    if historical_metrics and len(historical_metrics) >= 5:
        data_matrix = []
        for m in historical_metrics:
            data_matrix.append([float(m.get(k, 0)) for k in features_keys])
            
        X_hist = np.array(data_matrix)
        
        # Isolation Forest check
        iso = IsolationForest(contamination=0.1, random_state=42)
        iso.fit(X_hist)
        
        pred = iso.predict([current_vec])[0] # -1 for anomaly, 1 for normal
        decision_val = iso.decision_function([current_vec])[0]
        
        # Means and stds
        means = np.mean(X_hist, axis=0)
        stds = np.std(X_hist, axis=0) + 1e-6
        
        z_scores = (np.array(current_vec) - means) / stds
        
        for idx, key in enumerate(features_keys):
            z = z_scores[idx]
            if abs(z) > 2.0:
                direction = "higher" if z > 0 else "lower"
                anomalies.append({
                    "metric": key,
                    "currentValue": current_vec[idx],
                    "historicalMean": round(float(means[idx]), 2),
                    "zScore": round(float(z), 2),
                    "description": f"{key} is significantly {direction} than departmental baseline (Z={z:.1f})"
                })
                
        is_anomalous = bool(pred == -1 or len(anomalies) > 0)
        anomaly_score = round(float(np.clip((1.0 - decision_val) * 50.0, 0, 100)), 1)
    else:
        # Rule-based fallback when insufficient history
        is_anomalous = False
        if current_vec[0] > 95.0: # Occupancy > 95
            anomalies.append({"metric": "occupancyRate", "currentValue": current_vec[0], "description": "Bed capacity critical bottleneck (>95%)"})
            is_anomalous = True
        if current_vec[2] > 4.5: # Infection > 4.5%
            anomalies.append({"metric": "infectionRate", "currentValue": current_vec[2], "description": "Severe spike in departmental healthcare-associated infection rate"})
            is_anomalous = True
        if current_vec[3] < 0.18: # Staffing < 0.18
            anomalies.append({"metric": "staffingLevel", "currentValue": current_vec[3], "description": "Critical nurse-to-patient understaffing detected"})
            is_anomalous = True
        if current_vec[5] < 70.0: # Conformance < 70%
            anomalies.append({"metric": "pathwayConformance", "currentValue": current_vec[5], "description": "Severe pathway protocol breakdown (<70%)"})
            is_anomalous = True
            
        anomaly_score = 75.0 if is_anomalous else 10.0

    return {
        "isAnomalous": is_anomalous,
        "anomalyScore": anomaly_score,
        "detectedAnomalies": anomalies
    }
