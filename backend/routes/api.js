const express = require('express');
const router = express.Router();

const metricsController = require('../controllers/metricsController');
const pathwaysController = require('../controllers/pathwaysController');
const complianceController = require('../controllers/complianceController');
const evidenceController = require('../controllers/evidenceController');
const riskController = require('../controllers/riskController');
const alertsController = require('../controllers/alertsController');
const capaController = require('../controllers/capaController');
const simulationController = require('../controllers/simulationController');
const benchmarkController = require('../controllers/benchmarkController');
const reportsController = require('../controllers/reportsController');
const copilotController = require('../controllers/copilotController');
const auditLogController = require('../controllers/auditLogController');
const { authMiddleware } = require('../middleware/auth');
const dashboardService = require('../services/dashboardService');
const pyService = require('../services/pyServiceConnector');
const mongoose = require('mongoose');

// System Health & Connectivity
router.get('/system/status', async (req, res) => {
  const pyHealth = await pyService.checkHealth();
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.json({
    status: 'success',
    backend: 'online',
    mongoDB: mongoStatus,
    pythonAIService: pyHealth.online ? 'online' : 'offline',
    pythonDetails: pyHealth
  });
});

// Dashboard Summary
router.get('/dashboard/summary', async (req, res) => {
  try {
    const { department } = req.query;
    const summary = await dashboardService.getDashboardSummary(department);
    res.json({ status: 'success', data: summary });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Evidence & Cryptographic Provenance APIs (Section 8)
router.post('/evidence', evidenceController.createEvidence);
router.get('/evidence', evidenceController.getEvidenceList);
router.get('/evidence/integrity', evidenceController.getEvidenceIntegrity);
router.get('/evidence/:id', evidenceController.getEvidenceById);
router.get('/evidence/:id/verify', evidenceController.verifyEvidenceById);
router.get('/evidence/:id/history', evidenceController.getEvidenceHistory);
router.post('/evidence/:id/manual-verify', evidenceController.manualVerifyEvidence);

// Metrics Endpoints
router.post('/metrics', metricsController.createMetric);
router.get('/metrics', metricsController.getMetrics);

// Pathways & Process Mining Endpoints
router.post('/pathways/traces', pathwaysController.createTrace);
router.get('/pathways', pathwaysController.getPathways);
router.get('/pathways/mining', pathwaysController.getProcessMining);
router.get('/pathways/conformance', pathwaysController.getConformance);

// Compliance Endpoints
router.get('/compliance', complianceController.getComplianceEvaluation);
router.get('/compliance/standards', complianceController.getStandards);
router.post('/compliance/standards', complianceController.createStandard);

// Risk Endpoints
router.get('/risk', riskController.getRiskScores);
router.post('/risk/evaluate', riskController.evaluateRisk);

// Alerts Endpoints
router.get('/alerts', alertsController.getAlerts);
router.post('/alerts', alertsController.createAlert);
router.patch('/alerts/:id/status', alertsController.updateAlertStatus);

// CAPA Endpoints
router.post('/capa', capaController.createCapa);
router.patch('/capa/:id', capaController.updateCapaStatus);
router.get('/capa/kanban', capaController.getKanban);
router.get('/capa', capaController.getAllCapa);

// Simulation & Counterfactual
router.post('/simulation', simulationController.runSimulation);
router.post('/counterfactual', simulationController.runCounterfactual);

// Benchmarks
router.get('/benchmarks', benchmarkController.getBenchmarks);

// Executive Everyday Reports & Archives
router.get('/reports/dates', reportsController.getAvailableDates);
router.get('/reports/daily-archive', reportsController.getDailyArchive);
router.get('/reports/executive-summary', reportsController.getExecutiveReport);

// AI Copilot Explainer
router.post('/copilot', copilotController.askCopilot);

// Dean Exclusive Staff Sign-In/Out & Work Activity Audits
router.get('/dean/staff-audits', authMiddleware, auditLogController.getStaffAuditLogs);

module.exports = router;
