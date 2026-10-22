const pyService = require('../services/pyServiceConnector');
const HospitalMetric = require('../models/HospitalMetric');
const RiskScore = require('../models/RiskScore');

exports.runSimulation = async (req, res) => {
  try {
    const params = req.body || {};
    // Simulation runs in memory and does NOT alter persistent database
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
    let storedRisk = null;

    if (department && department !== 'Hospital-Wide') {
      const storedMetric = await HospitalMetric.findOne({ department }).sort({ timestamp: -1 }).lean();
      storedRisk = await RiskScore.findOne({ department, status: 'CURRENT' }).sort({ calculatedAt: -1 }).lean();
      
      if (!baseMetrics && storedMetric) {
        baseMetrics = {
          occupancyRate: storedMetric.occupancyRate,
          avgWaitingTime: storedMetric.avgWaitingTime,
          infectionRate: storedMetric.infectionRate,
          staffingLevel: storedMetric.staffingLevel,
          incidentCount: storedMetric.incidentCount,
          pathwayConformance: storedMetric.pathwayConformance
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
    
    // Enrich with CAPA readiness data
    const currentScore = storedRisk ? storedRisk.score : (cfResult.baseline?.riskScore || 75);
    const projectedScore = cfResult.scenario?.projectedRiskScore || 52;
    const predictedDelta = Number((currentScore - projectedScore).toFixed(1));
    const predictedImprovement = currentScore > 0 ? Number(((predictedDelta / currentScore) * 100).toFixed(1)) : 0;

    const enriched = {
      ...cfResult,
      department: department || 'ICU',
      simulationId: `SIM-${Date.now().toString().slice(-6)}`,
      accreditationTarget: {
        currentDepartmentRisk: currentScore,
        projectedDepartmentRisk: projectedScore,
        predictedImprovementPercentage: predictedImprovement > 0 ? predictedImprovement : 0,
        proposedCapaSummary: `Apply counterfactual intervention (${JSON.stringify(interventions)}) to reduce risk from ${currentScore} to ${projectedScore} (predicted ${predictedImprovement}% improvement).`
      }
    };

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
