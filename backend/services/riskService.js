const RiskScore = require('../models/RiskScore');
const HospitalMetric = require('../models/HospitalMetric');
const PatientPathway = require('../models/PatientPathway');
const Benchmark = require('../models/Benchmark');
const Alert = require('../models/Alert');
const pyService = require('./pyServiceConnector');
const complianceService = require('./complianceService');

const riskService = {
  /**
   * Calculates department risk ONCE, stores it in MongoDB, creates alerts if needed, and returns the persisted record.
   */
  async calculateAndStoreDepartmentRisk(department) {
    const targetDept = department || 'ICU';
    
    // 1. Fetch latest metric
    const latestMetric = await HospitalMetric.findOne({ department: targetDept }).sort({ timestamp: -1 }).lean();
    if (!latestMetric) {
      console.warn(`[RiskService] No metrics found for ${targetDept}, using fallback baseline.`);
    }

    const defaultMetric = {
      occupancyRate: 75,
      avgWaitingTime: 30,
      infectionRate: 1.5,
      staffingLevel: 0.33,
      incidentCount: 2,
      pathwayConformance: 85
    };
    const activeMetric = latestMetric || defaultMetric;

    // 2. Fetch historical metrics for anomaly detection
    const historicalMetrics = await HospitalMetric.find({ department: targetDept })
      .sort({ timestamp: -1 })
      .limit(30)
      .lean();

    // 3. Fetch patient traces for conformance and process mining
    const traces = await PatientPathway.find({ department: targetDept })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    // 4. Run Python analytics (ML risk, Anomaly, Conformance)
    let mlResult = { mlRiskScore: 35.0, category: 'LOW', contributingFactors: [] };
    let anomalyResult = { isAnomalous: false, anomalyScore: 10.0, detectedAnomalies: [] };
    let conformanceResult = { conformanceRate: activeMetric.pathwayConformance, deviations: [], evidence: [] };

    try {
      mlResult = await pyService.predictRisk(activeMetric);
    } catch (err) {
      console.warn(`[RiskService] ML Risk prediction error: ${err.message}`);
      mlResult.mlRiskScore = Math.min(100, Math.max(10, (activeMetric.occupancyRate * 0.4) + (activeMetric.infectionRate * 10)));
    }

    try {
      anomalyResult = await pyService.detectAnomalies(activeMetric, historicalMetrics);
    } catch (err) {
      console.warn(`[RiskService] Anomaly detection error: ${err.message}`);
    }

    try {
      if (traces.length > 0) {
        conformanceResult = await pyService.checkConformance(traces, targetDept);
      }
    } catch (err) {
      console.warn(`[RiskService] Conformance check error: ${err.message}`);
    }

    // 5. Evaluate Compliance Standards
    const compEval = await complianceService.evaluateDepartmentCompliance(targetDept);
    const complianceGap = Math.max(0, 100 - compEval.overallComplianceRate);

    // 6. Benchmark Gap analysis
    const benchmarks = await Benchmark.find({ department: { $in: [targetDept, 'Hospital-Wide'] } }).lean();
    let benchmarkGapSum = 0;
    let benchmarkCount = 0;
    benchmarks.forEach(bm => {
      if (activeMetric[bm.metric] !== undefined) {
        const val = activeMetric[bm.metric];
        if (bm.thresholdMax && val > bm.thresholdMax) {
          benchmarkGapSum += ((val - bm.thresholdMax) / bm.thresholdMax) * 100;
          benchmarkCount++;
        } else if (bm.thresholdMin && val < bm.thresholdMin) {
          benchmarkGapSum += ((bm.thresholdMin - val) / bm.thresholdMin) * 100;
          benchmarkCount++;
        }
      }
    });
    const avgBenchmarkGap = benchmarkCount > 0 ? Math.min(100, benchmarkGapSum / benchmarkCount) : 0;

    // 7. Calculate Process Deviation Score
    const processDeviationScore = Math.max(0, 100 - conformanceResult.conformanceRate);

    // 8. Synthesize Unified Risk Score:
    // Decision Support Weights: ML Risk (30%), Compliance Gap (25%), Process Deviation (20%), Anomaly (15%), Benchmark Gap (10%)
    const weightedScore = (
      (mlResult.mlRiskScore * 0.30) +
      (complianceGap * 0.25) +
      (processDeviationScore * 0.20) +
      (anomalyResult.anomalyScore * 0.15) +
      (avgBenchmarkGap * 0.10)
    );

    const finalScore = Number(Math.min(100, Math.max(0, weightedScore)).toFixed(1));

    let finalCategory = 'LOW';
    if (finalScore >= 75) finalCategory = 'CRITICAL';
    else if (finalScore >= 55) finalCategory = 'HIGH';
    else if (finalScore >= 35) finalCategory = 'MEDIUM';

    // Combine contributing factors
    const factors = [...(mlResult.contributingFactors || [])];
    if (complianceGap > 15) {
      factors.push(`Accreditation compliance deficit: ${compEval.nonCompliantCount} standard(s) violated`);
    }
    if (processDeviationScore > 15) {
      factors.push(`Clinical pathway non-conformance rate is ${conformanceResult.conformanceRate}%`);
    }
    if (anomalyResult.isAnomalous) {
      anomalyResult.detectedAnomalies.forEach(a => factors.push(a.description));
    }

    const allEvidence = [
      ...compEval.evidenceSummary,
      ...conformanceResult.evidence
    ];

    // Mark previous risk score as SUPERSEDED
    await RiskScore.updateMany({ department: targetDept, status: 'CURRENT' }, { $set: { status: 'SUPERSEDED' } });

    // Store new RiskScore
    const newRiskRecord = await RiskScore.create({
      department: targetDept,
      score: finalScore,
      category: finalCategory,
      components: {
        mlRisk: Number(mlResult.mlRiskScore.toFixed(1)),
        complianceGap: Number(complianceGap.toFixed(1)),
        processDeviation: Number(processDeviationScore.toFixed(1)),
        anomalyScore: Number(anomalyResult.anomalyScore.toFixed(1)),
        benchmarkGap: Number(avgBenchmarkGap.toFixed(1))
      },
      contributingFactors: Array.from(new Set(factors)),
      evidenceSummary: Array.from(new Set(allEvidence)),
      calculatedAt: new Date(),
      dataVersion: '2.0-Live',
      status: 'CURRENT'
    });

    // 9. Generate Alerts if severe conditions exist
    if (finalCategory === 'HIGH' || finalCategory === 'CRITICAL' || compEval.nonCompliantCount > 0 || anomalyResult.isAnomalous) {
      // Check if an open alert with same reason already exists to avoid spamming
      const alertTitle = `${targetDept} Risk Escalation [${finalCategory}]`;
      const existingAlert = await Alert.findOne({
        department: targetDept,
        title: alertTitle,
        status: 'OPEN'
      });

      if (!existingAlert) {
        await Alert.create({
          title: alertTitle,
          department: targetDept,
          severity: finalCategory === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
          reason: factors[0] || 'Operational risk indicators exceeded tolerance threshold',
          evidence: allEvidence.slice(0, 5),
          status: 'OPEN',
          source: anomalyResult.isAnomalous ? 'ANOMALY_DETECTOR' : 'COMPLIANCE_ENGINE'
        });
      }
    }

    return newRiskRecord;
  },

  /**
   * Reads stored risk score without recomputing on every GET request (Section 16).
   */
  async getStoredDepartmentRisk(department) {
    const query = (department && department !== 'Hospital-Wide') ? { department, status: 'CURRENT' } : { status: 'CURRENT' };
    let stored = await RiskScore.find(query).sort({ calculatedAt: -1 }).lean();
    
    // If nothing exists in database yet, calculate once for each department
    if (!stored || stored.length === 0) {
      const depts = department && department !== 'Hospital-Wide' ? [department] : ['ICU', 'Emergency', 'Surgery', 'Cardiology', 'General Ward'];
      const calculated = [];
      for (const d of depts) {
        const res = await this.calculateAndStoreDepartmentRisk(d);
        calculated.push(res);
      }
      return calculated;
    }

    return stored;
  }
};

module.exports = riskService;
