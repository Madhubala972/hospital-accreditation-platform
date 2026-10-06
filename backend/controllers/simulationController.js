const pyService = require('../services/pyServiceConnector');
const HospitalMetric = require('../models/HospitalMetric');

exports.runSimulation = async (req, res) => {
  try {
    const params = req.body || {};
    // Simulation runs in memory and does NOT alter persistent database (Section 12)
    const simResult = await pyService.runDigitalTwin(params);
    res.json(simResult);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.runCounterfactual = async (req, res) => {
  try {
    const { department, interventions } = req.body;
    
    // Get current baseline metric if not provided
    let baseMetrics = req.body.baseMetrics;
    if (!baseMetrics && department) {
      const stored = await HospitalMetric.findOne({ department }).sort({ timestamp: -1 }).lean();
      if (stored) {
        baseMetrics = {
          occupancyRate: stored.occupancyRate,
          avgWaitingTime: stored.avgWaitingTime,
          infectionRate: stored.infectionRate,
          staffingLevel: stored.staffingLevel,
          incidentCount: stored.incidentCount,
          pathwayConformance: stored.pathwayConformance
        };
      }
    }

    if (!baseMetrics) {
      baseMetrics = {
        occupancyRate: 85,
        avgWaitingTime: 45,
        infectionRate: 2.8,
        staffingLevel: 0.28,
        incidentCount: 4,
        pathwayConformance: 74
      };
    }

    const cfResult = await pyService.runCounterfactual(baseMetrics, interventions || {});
    res.json(cfResult);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
