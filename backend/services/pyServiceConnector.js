const axios = require('axios');

const CLOUD_FALLBACK_URL = 'https://cn-ai-service.onrender.com';
const LOCAL_FALLBACK_URL = 'http://127.0.0.1:5001';

let configuredUrl = process.env.PY_SERVICE_URL || CLOUD_FALLBACK_URL;
if (configuredUrl && !configuredUrl.startsWith('http://') && !configuredUrl.startsWith('https://')) {
  configuredUrl = `https://${configuredUrl}`;
}

let currentActiveUrl = configuredUrl;
let lastHealthyState = {
  online: true,
  engine: 'Python Flask / PM4Py / SimPy / scikit-learn',
  service: 'hospital-ai-service',
  status: 'healthy',
  version: '1.0.0',
  lastSeen: Date.now()
};

const getCandidateUrls = () => {
  return [
    currentActiveUrl,
    configuredUrl,
    CLOUD_FALLBACK_URL,
    LOCAL_FALLBACK_URL
  ].filter((val, idx, self) => Boolean(val) && self.indexOf(val) === idx);
};

const pyService = {
  async checkHealth() {
    const urlsToTry = getCandidateUrls();

    for (const url of urlsToTry) {
      try {
        const client = axios.create({
          baseURL: url,
          timeout: 12000,
          headers: { 'Content-Type': 'application/json' }
        });
        const res = await client.get('/health');
        if (res.data && (res.data.status === 'healthy' || res.status === 200)) {
          currentActiveUrl = url;
          lastHealthyState = {
            online: true,
            activeUrl: url,
            ...res.data,
            lastSeen: Date.now()
          };
          return lastHealthyState;
        }
      } catch (err) {
        // try next candidate endpoint
      }
    }

    // Grace period: If verified healthy in the last 120s, preserve online status while wake-up finishes
    const elapsed = Date.now() - (lastHealthyState.lastSeen || 0);
    if (elapsed < 120000) {
      return {
        ...lastHealthyState,
        online: true,
        warming: true
      };
    }

    return {
      online: false,
      error: 'Python AI service unreachable'
    };
  },

  async _requestWithFallback(method, path, data = null) {
    const urlsToTry = getCandidateUrls();
    let lastError = null;

    for (const url of urlsToTry) {
      try {
        const client = axios.create({
          baseURL: url,
          timeout: 25000,
          headers: { 'Content-Type': 'application/json' }
        });
        const res = method === 'post' 
          ? await client.post(path, data) 
          : await client.get(path);
          
        currentActiveUrl = url;
        lastHealthyState.lastSeen = Date.now();
        lastHealthyState.online = true;
        return res;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error(`Request to ${path} failed across all endpoints.`);
  },

  async predictRisk(metrics) {
    try {
      const res = await this._requestWithFallback('post', '/predict-risk', metrics);
      return res.data.data;
    } catch (error) {
      throw new Error(`Python AI Service (predict-risk) failed: ${error.response?.data?.message || error.message}`);
    }
  },

  async detectAnomalies(currentMetric, historicalMetrics = []) {
    try {
      const res = await this._requestWithFallback('post', '/detect-anomalies', {
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
      const res = await this._requestWithFallback('post', '/process-mining', { traces });
      return res.data.data;
    } catch (error) {
      throw new Error(`Python AI Service (process-mining) failed: ${error.response?.data?.message || error.message}`);
    }
  },

  async checkConformance(traces, department, referencePathway = null) {
    try {
      const res = await this._requestWithFallback('post', '/check-conformance', {
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
      const res = await this._requestWithFallback('post', '/simulate-digital-twin', params);
      return res.data;
    } catch (error) {
      throw new Error(`Python AI Service (simulate-digital-twin) failed: ${error.response?.data?.message || error.message}`);
    }
  },

  async runCounterfactual(baseMetrics, interventions) {
    try {
      const res = await this._requestWithFallback('post', '/counterfactual', {
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
