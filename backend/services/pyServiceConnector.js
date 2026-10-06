const axios = require('axios');

const PY_SERVICE_URL = process.env.PY_SERVICE_URL || 'http://127.0.0.1:5001';

const pyClient = axios.create({
  baseURL: PY_SERVICE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

const pyService = {
  async checkHealth() {
    try {
      const res = await pyClient.get('/health');
      return { online: true, ...res.data };
    } catch (error) {
      return { online: false, error: error.message };
    }
  },

  async predictRisk(metrics) {
    try {
      const res = await pyClient.post('/predict-risk', metrics);
      return res.data.data;
    } catch (error) {
      throw new Error(`Python AI Service (predict-risk) failed: ${error.response?.data?.message || error.message}`);
    }
  },

  async detectAnomalies(currentMetric, historicalMetrics = []) {
    try {
      const res = await pyClient.post('/detect-anomalies', {
        currentMetric,
        historicalMetrics
      });
      return res.data.data;
    } catch (error) {
      throw new Error(`Python AI Service (detect-anomalies) failed: ${error.response?.data?.message || error.message}`);
    }
  },

  async analyzeProcessMining(traces) {
    try {
      const res = await pyClient.post('/process-mining', { traces });
      return res.data.data;
    } catch (error) {
      throw new Error(`Python AI Service (process-mining) failed: ${error.response?.data?.message || error.message}`);
    }
  },

  async checkConformance(traces, department, referencePathway = null) {
    try {
      const res = await pyClient.post('/check-conformance', {
        traces,
        department,
        referencePathway
      });
      return res.data.data;
    } catch (error) {
      throw new Error(`Python AI Service (check-conformance) failed: ${error.response?.data?.message || error.message}`);
    }
  },

  async runDigitalTwin(params) {
    try {
      const res = await pyClient.post('/simulate-digital-twin', params);
      return res.data;
    } catch (error) {
      throw new Error(`Python AI Service (simulate-digital-twin) failed: ${error.response?.data?.message || error.message}`);
    }
  },

  async runCounterfactual(baseMetrics, interventions) {
    try {
      const res = await pyClient.post('/counterfactual', {
        baseMetrics,
        interventions
      });
      return res.data;
    } catch (error) {
      throw new Error(`Python AI Service (counterfactual) failed: ${error.response?.data?.message || error.message}`);
    }
  }
};

module.exports = pyService;
