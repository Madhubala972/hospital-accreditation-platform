import sys
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS

from risk_prediction import predict_risk, get_risk_model
from anomaly_detection import detect_anomalies
from process_mining import analyze_process_mining
from conformance_checker import check_trace_conformance
from digital_twin import run_digital_twin_simulation

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Pre-load ML model at startup to ensure fast responses
try:
    get_risk_model()
    logger.info("ML Risk Prediction model initialized and cached successfully.")
except Exception as e:
    logger.error(f"Error pre-loading risk model: {e}")

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "service": "hospital-ai-service",
        "version": "1.0.0",
        "engine": "Python Flask / PM4Py / SimPy / scikit-learn"
    }), 200

@app.route("/predict-risk", methods=["POST"])
def route_predict_risk():
    try:
        data = request.get_json(force=True) or {}
        result = predict_risk(data)
        return jsonify({"status": "success", "data": result}), 200
    except Exception as e:
        logger.error(f"Error predicting risk: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route("/detect-anomalies", methods=["POST"])
def route_detect_anomalies():
    try:
        data = request.get_json(force=True) or {}
        current_metric = data.get("currentMetric", {})
        historical_metrics = data.get("historicalMetrics", [])
        result = detect_anomalies(current_metric, historical_metrics)
        return jsonify({"status": "success", "data": result}), 200
    except Exception as e:
        logger.error(f"Error detecting anomalies: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route("/process-mining", methods=["POST"])
def route_process_mining():
    try:
        data = request.get_json(force=True) or {}
        traces = data.get("traces", [])
        result = analyze_process_mining(traces)
        return jsonify({"status": "success", "data": result}), 200
    except Exception as e:
        logger.error(f"Error running process mining: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route("/check-conformance", methods=["POST"])
def route_check_conformance():
    try:
        data = request.get_json(force=True) or {}
        traces = data.get("traces", [])
        department = data.get("department", "ICU")
        reference_pathway = data.get("referencePathway", None)
        result = check_trace_conformance(traces, department, reference_pathway)
        return jsonify({"status": "success", "data": result}), 200
    except Exception as e:
        logger.error(f"Error checking conformance: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route("/simulate-digital-twin", methods=["POST"])
def route_digital_twin():
    try:
        params = request.get_json(force=True) or {}
        result = run_digital_twin_simulation(params)
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error running digital twin: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route("/counterfactual", methods=["POST"])
def route_counterfactual():
    try:
        data = request.get_json(force=True) or {}
        base_metrics = data.get("baseMetrics", {})
        interventions = data.get("interventions", {})
        
        # Calculate baseline risk
        base_risk = predict_risk(base_metrics)
        
        # Apply hypothetical modifications
        scenario_metrics = dict(base_metrics)
        for k, v in interventions.items():
            if k in scenario_metrics and v is not None:
                scenario_metrics[k] = float(v)
                
        # Calculate simulated outcome
        scenario_risk = predict_risk(scenario_metrics)
        
        risk_diff = round(scenario_risk['mlRiskScore'] - base_risk['mlRiskScore'], 1)
        improvement_pct = round((abs(risk_diff) / max(0.1, base_risk['mlRiskScore'])) * 100.0, 1) if risk_diff < 0 else 0.0
        
        return jsonify({
            "status": "success",
            "isScenarioEstimate": True,
            "disclaimer": "Scenario estimate based on decision-support model; not proven clinical causality.",
            "baseline": {
                "metrics": base_metrics,
                "riskScore": base_risk['mlRiskScore'],
                "riskCategory": base_risk['category'],
                "contributingFactors": base_risk['contributingFactors']
            },
            "scenario": {
                "appliedInterventions": interventions,
                "projectedMetrics": scenario_metrics,
                "projectedRiskScore": scenario_risk['mlRiskScore'],
                "projectedRiskCategory": scenario_risk['category'],
                "projectedContributingFactors": scenario_risk['contributingFactors']
            },
            "impact": {
                "scoreDelta": risk_diff,
                "riskReduced": bool(risk_diff < 0),
                "estimatedImprovementPercentage": improvement_pct
            }
        }), 200
    except Exception as e:
        logger.error(f"Error computing counterfactual: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 400

if __name__ == "__main__":
    port = 5001
    logger.info(f"Starting Hospital Accreditation AI Flask Service on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
