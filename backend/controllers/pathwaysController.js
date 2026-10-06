const PatientPathway = require('../models/PatientPathway');
const HospitalMetric = require('../models/HospitalMetric');
const pyService = require('../services/pyServiceConnector');
const riskService = require('../services/riskService');

exports.createTrace = async (req, res) => {
  try {
    const { caseId, department, events, admissionDiagnosis } = req.body;

    if (!caseId || !department || !events || !Array.isArray(events)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide caseId, department, and events array.'
      });
    }

    const pathway = await PatientPathway.create({
      caseId,
      department,
      events,
      admissionDiagnosis: admissionDiagnosis || 'Clinical Observation',
      timestamp: new Date()
    });

    // Run quick conformance check
    try {
      const traces = await PatientPathway.find({ department }).sort({ timestamp: -1 }).limit(50).lean();
      const confResult = await pyService.checkConformance(traces, department);
      
      // Update latest hospital metric pathway conformance
      await HospitalMetric.findOneAndUpdate(
        { department },
        { $set: { pathwayConformance: confResult.conformanceRate } },
        { sort: { timestamp: -1 } }
      );

      // Trigger risk evaluation
      await riskService.calculateAndStoreDepartmentRisk(department);
    } catch (confErr) {
      console.warn(`[PathwaysController] Background analysis warning: ${confErr.message}`);
    }

    res.status(201).json({
      status: 'success',
      message: 'Patient pathway trace saved successfully.',
      data: pathway
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getPathways = async (req, res) => {
  try {
    const { department, limit = 50 } = req.query;
    const query = (department && department !== 'Hospital-Wide') ? { department } : {};

    const traces = await PatientPathway.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .lean();

    res.json({
      status: 'success',
      count: traces.length,
      data: traces
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getProcessMining = async (req, res) => {
  try {
    const { department } = req.query;
    const targetDept = (department && department !== 'Hospital-Wide') ? department : 'ICU';

    const traces = await PatientPathway.find({ department: targetDept })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    const miningData = await pyService.analyzeProcessMining(traces);

    res.json({
      status: 'success',
      department: targetDept,
      totalTracesAnalyzed: traces.length,
      data: miningData
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getConformance = async (req, res) => {
  try {
    const { department } = req.query;
    const targetDept = (department && department !== 'Hospital-Wide') ? department : 'ICU';

    const traces = await PatientPathway.find({ department: targetDept })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    const conformanceData = await pyService.checkConformance(traces, targetDept);

    res.json({
      status: 'success',
      department: targetDept,
      data: conformanceData
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
