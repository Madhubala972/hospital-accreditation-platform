const RiskScore = require('../models/RiskScore');
const HospitalMetric = require('../models/HospitalMetric');
const PatientPathway = require('../models/PatientPathway');
const Benchmark = require('../models/Benchmark');
const Alert = require('../models/Alert');
const AccreditationEvidence = require('../models/AccreditationEvidence');
const pyService = require('./pyServiceConnector');
const complianceService = require('./complianceService');

const riskService = {
  /**
   * Calculates department risk ONCE, stores it in MongoDB, creates alerts if needed, and returns the persisted record.
   * Evidence-Aware Risk Model: Standard -> Evidence -> Process Deviation -> Risk
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

    // 4. Fetch evidence records for target department
    const evidenceRecords = await AccreditationEvidence.find({
      department: { $in: [targetDept, 'Hospital-Wide'] }
    }).sort({ recordedAt: -1 }).limit(100).lean();

    // 5. Run Python analytics (ML risk, Anomaly, Conformance)
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

    // 6. Evaluate Compliance Standards & Evidence Integrity
    const compEval = await complianceService.evaluateDepartmentCompliance(targetDept);
    const complianceGap = Math.max(0, 100 - compEval.overallComplianceRate);

    // 7. Calculate Evidence Metrics
    const totalDeptEvidence = evidenceRecords.length;
    const verifiedDeptEvidence = evidenceRecords.filter(e => e.integrityStatus === 'VERIFIED').length;
    const flaggedDeptEvidence = evidenceRecords.filter(e => e.integrityStatus === 'FLAGGED').length;

    const evidenceIntegrityScore = totalDeptEvidence > 0
      ? Number(((verifiedDeptEvidence / totalDeptEvidence) * 100).toFixed(1))
      : 100.0;

    const evidenceConfidenceScore = totalDeptEvidence >= 5
      ? Number((evidenceIntegrityScore * 0.95 + 5).toFixed(1))
      : Number((totalDeptEvidence * 15 + 25).toFixed(1));

    // 8. Benchmark Gap analysis
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

    // 9. Calculate Process Deviation Score
    const processDeviationScore = Math.max(0, 100 - conformanceResult.conformanceRate);

    // 10. Synthesize Unified Evidence-Aware Risk Score:
    // Weights: ML Risk (25%), Compliance Gap (25%), Process Deviation (20%), Anomaly (15%), Benchmark Gap (10%), Evidence Deficit / Flagged Penalty (5%)
    const evidenceDeficitScore = Math.max(0, 100 - evidenceIntegrityScore) * 0.5 + Math.max(0, 100 - evidenceConfidenceScore) * 0.5;

    const weightedScore = (
      (mlResult.mlRiskScore * 0.25) +
      (complianceGap * 0.25) +
      (processDeviationScore * 0.20) +
      (anomalyResult.anomalyScore * 0.15) +
      (avgBenchmarkGap * 0.10) +
      (evidenceDeficitScore * 0.05)
    );

    const finalScore = Number(Math.min(100, Math.max(0, weightedScore)).toFixed(1));

    let finalCategory = 'LOW';
    if (finalScore >= 75) finalCategory = 'CRITICAL';
    else if (finalScore >= 55) finalCategory = 'HIGH';
    else if (finalScore >= 35) finalCategory = 'MEDIUM';

    // 11. Combine contributing factors with evidence references
    const factors = [...(mlResult.contributingFactors || [])];
    const evidenceReferences = [];

    // Link top evidence record for this department
    const topEvidence = evidenceRecords[0];
    const topEvidenceId = topEvidence ? topEvidence.evidenceId : `EV-${targetDept.substring(0, 3)}-001`;

    if (complianceGap > 15) {
      const compFactor = `Accreditation compliance deficit: ${compEval.nonCompliantCount} standard(s) violated [Evidence: ${topEvidenceId}]`;
      factors.push(compFactor);
      evidenceReferences.push({
        factor: compFactor,
        evidenceId: topEvidenceId,
        standardCode: compEval.standards.find(s => s.status === 'NON_COMPLIANT')?.standardCode || 'NABH-COP.6',
        riskContribution: 22
      });
    }

    if (processDeviationScore > 15) {
      const procFactor = `Clinical pathway non-conformance rate is ${conformanceResult.conformanceRate}% (Skipped steps detected) [Evidence: ${topEvidenceId}]`;
      factors.push(procFactor);
      evidenceReferences.push({
        factor: procFactor,
        evidenceId: topEvidenceId,
        standardCode: 'NABH-COP.6',
        riskContribution: 18
      });
    }

    if (activeMetric.occupancyRate > 85) {
      const occFactor = `High bed occupancy (${activeMetric.occupancyRate}%) exceeds normal operational buffer`;
      factors.push(occFactor);
      evidenceReferences.push({
        factor: occFactor,
        evidenceId: topEvidenceId,
        standardCode: 'NABH-PS.2',
        riskContribution: 14
      });
    }

    if (anomalyResult.isAnomalous) {
      anomalyResult.detectedAnomalies.forEach(a => {
        factors.push(a.description);
        evidenceReferences.push({
          factor: a.description,
          evidenceId: topEvidenceId,
          standardCode: 'NABH-IC.1',
          riskContribution: 15
        });
      });
    }

    if (flaggedDeptEvidence > 0) {
      const flagFactor = `CRITICAL: ${flaggedDeptEvidence} evidence record(s) failed SHA-256 cryptographic verification`;
      factors.unshift(flagFactor);
      evidenceReferences.push({
        factor: flagFactor,
        evidenceId: topEvidenceId,
        standardCode: 'NABH-GOV.1',
        riskContribution: 25
      });
    }

    const allEvidence = [
      ...compEval.evidenceSummary,
      ...conformanceResult.evidence,
      `Evidence Integrity: ${evidenceIntegrityScore}% (${verifiedDeptEvidence}/${totalDeptEvidence} verified records)`,
      `Evidence Confidence Index: ${evidenceConfidenceScore}%`
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
        benchmarkGap: Number(avgBenchmarkGap.toFixed(1)),
        evidenceConfidence: evidenceConfidenceScore,
        evidenceIntegrity: evidenceIntegrityScore
      },
      contributingFactors: Array.from(new Set(factors)),
      evidenceSummary: Array.from(new Set(allEvidence)),
      evidenceReferences,
      calculatedAt: new Date(),
      dataVersion: '2.0-Evidence-Aware',
      status: 'CURRENT'
    });

    // 12. Generate Alerts if severe conditions exist
    if (finalCategory === 'HIGH' || finalCategory === 'CRITICAL' || compEval.nonCompliantCount > 0 || anomalyResult.isAnomalous || flaggedDeptEvidence > 0) {
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
          source: flaggedDeptEvidence > 0 ? 'COMPLIANCE_ENGINE' : (anomalyResult.isAnomalous ? 'ANOMALY_DETECTOR' : 'COMPLIANCE_ENGINE'),
          standardCode: compEval.standards.find(s => s.status === 'NON_COMPLIANT')?.standardCode || 'NABH-COP.6'
        });
      }
    }

    return newRiskRecord;
  },

  /**
   * Reads stored risk score without recomputing on every GET request.
   */
  async getStoredDepartmentRisk(department) {
    const query = (department && department !== 'Hospital-Wide') ? { department, status: 'CURRENT' } : { status: 'CURRENT' };
    let stored = await RiskScore.find(query).sort({ calculatedAt: -1 }).lean();
    
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
