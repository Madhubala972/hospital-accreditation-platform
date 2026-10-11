const axios = require('axios');

let rawPyUrl = process.env.PY_SERVICE_URL || 'http://127.0.0.1:5001';
if (rawPyUrl && !rawPyUrl.startsWith('http://') && !rawPyUrl.startsWith('https://')) {
  rawPyUrl = `https://${rawPyUrl}`;
}
const PY_SERVICE_URL = rawPyUrl;
const CLOUD_FALLBACK_URL = 'https://cn-ai-service.onrender.com';

const pyClient = axios.create({
  baseURL: PY_SERVICE_URL,
  timeout: 45000,
  headers: { 'Content-Type': 'application/json' }
});

const fallbackClient = axios.create({
  baseURL: CLOUD_FALLBACK_URL,
  timeout: 45000,
  headers: { 'Content-Type': 'application/json' }
});

// Cache for quick responses and grace period during momentary cold boots
let cachedStatus = { online: false, lastCheck: 0, data: null };

const pyService = {
  async getClient() {
    return pyClient;
  },

  async checkHealth() {
    const now = Date.now();
    // Cache for 3 seconds to avoid spamming the microservice
    if (now - cachedStatus.lastCheck < 3000 && cachedStatus.online) {
      return { online: true, ...cachedStatus.data };
    }

    // Try primary PY_SERVICE_URL
    try {
      const res = await pyClient.get('/health', { timeout: 20000 });
      cachedStatus = { online: true, lastCheck: now, data: res.data };
      return { online: true, ...res.data };
    } catch (primaryError) {
      // If primary is localhost and failed, try cloud fallback if not already using it
      if (PY_SERVICE_URL.includes('127.0.0.1') || PY_SERVICE_URL.includes('localhost')) {
        try {
          const fbRes = await fallbackClient.get('/health', { timeout: 20000 });
          cachedStatus = { online: true, lastCheck: now, data: fbRes.data };
          return { online: true, ...fbRes.data, fallback: true };
        } catch (fbError) {
          // both failed
        }
      }

      // If it was online less than 45 seconds ago, give a grace period while waking
      if (cachedStatus.online && (now - cachedStatus.lastCheck < 45000)) {
        return { online: true, ...cachedStatus.data, warming: true };
      }

      cachedStatus = { online: false, lastCheck: now, data: null };
      return { online: false, error: primaryError.message };
    }
  },

  async executeWithFallback(requestFn) {
    try {
      return await requestFn(pyClient);
    } catch (primaryError) {
      if ((PY_SERVICE_URL.includes('127.0.0.1') || PY_SERVICE_URL.includes('localhost')) && primaryError.code === 'ECONNREFUSED') {
        return await requestFn(fallbackClient);
      }
      throw primaryError;
    }
  },

  async predictRisk(metrics) {
    try {
      const res = await this.executeWithFallback(client => client.post('/predict-risk', metrics));
      return res.data.data;
    } catch (error) {
      throw new Error(`Python AI Service (predict-risk) failed: ${error.response?.data?.message || error.message}`);
    }
  },

  async detectAnomalies(currentMetric, historicalMetrics = []) {
    try {
      const res = await this.executeWithFallback(client => client.post('/detect-anomalies', {
        currentMetric,
        historicalMetrics
      }));
      return res.data.data;
    } catch (error) {
      throw new Error(`Python AI Service (detect-anomalies) failed: ${error.response?.data?.message || error.message}`);
    }
  },

  async analyzeProcessMining(traces) {
    try {
      const res = await this.executeWithFallback(client => client.post('/process-mining', { traces }));
      return res.data.data;
    } catch (error) {
      throw new Error(`Python AI Service (process-mining) failed: ${error.response?.data?.message || error.message}`);
    }
  },

  async checkConformance(traces, department, referencePathway = null) {
    try {
      const res = await this.executeWithFallback(client => client.post('/check-conformance', {
        traces,
        department,
        referencePathway
      }));
      return res.data.data;
    } catch (error) {
      throw new Error(`Python AI Service (check-conformance) failed: ${error.response?.data?.message || error.message}`);
    }
  },

  async runDigitalTwin(params) {
    try {
      const res = await this.executeWithFallback(client => client.post('/simulate-digital-twin', params));
      return res.data;
    } catch (error) {
      throw new Error(`Python AI Service (simulate-digital-twin) failed: ${error.response?.data?.message || error.message}`);
    }
  },

  async runCounterfactual(baseMetrics, interventions) {
    try {
      const res = await this.executeWithFallback(client => client.post('/counterfactual', {
        baseMetrics,
        interventions
      }));
      return res.data;
    } catch (error) {
      throw new Error(`Python AI Service (counterfactual) failed: ${error.response?.data?.message || error.message}`);
    }
  }
};

module.exports = pyService;
