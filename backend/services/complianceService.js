const AccreditationStandard = require('../models/AccreditationStandard');
const HospitalMetric = require('../models/HospitalMetric');
const PatientPathway = require('../models/PatientPathway');
const pyService = require('./pyServiceConnector');

const complianceService = {
  /**
   * Evaluates compliance for a specific department or hospital-wide.
   */
  async evaluateDepartmentCompliance(department) {
    const query = (department && department !== 'Hospital-Wide') ? { department: { $in: [department, 'Hospital-Wide'] } } : {};
    const metricQuery = (department && department !== 'Hospital-Wide') ? { department } : {};
    const pathwayQuery = (department && department !== 'Hospital-Wide') ? { department } : {};

    const [standards, latestMetric, traces] = await Promise.all([
      AccreditationStandard.find(query).lean(),
      HospitalMetric.findOne(metricQuery).sort({ timestamp: -1 }).lean(),
      PatientPathway.find(pathwayQuery).sort({ timestamp: -1 }).limit(100).lean()
    ]);
    
    let conformanceData = null;
    try {
      if (traces && traces.length > 0) {
        conformanceData = await pyService.checkConformance(traces, department || 'ICU');
      }
    } catch (err) {
      console.warn(`[ComplianceService] Conformance check skipped/failed: ${err.message}`);
    }

    const evaluatedStandards = [];
    let compliantCount = 0;
    const allEvidence = [];

    for (const std of standards) {
      const field = std.metricTargetField;
      let actualValue = null;
      let isCompliant = true;
      let gap = 0;
      let evidenceText = '';

      if (field === 'pathwayConformance' && conformanceData) {
        actualValue = conformanceData.conformanceRate;
      } else if (latestMetric && latestMetric[field] !== undefined) {
        actualValue = latestMetric[field];
      }

      if (actualValue !== null) {
        switch (std.operator) {
          case '>=':
            isCompliant = actualValue >= std.threshold;
            gap = isCompliant ? 0 : Math.max(0, std.threshold - actualValue);
            break;
          case '<=':
            isCompliant = actualValue <= std.threshold;
            gap = isCompliant ? 0 : Math.max(0, actualValue - std.threshold);
            break;
          case '>':
            isCompliant = actualValue > std.threshold;
            gap = isCompliant ? 0 : Math.max(0, std.threshold - actualValue);
            break;
          case '<':
            isCompliant = actualValue < std.threshold;
            gap = isCompliant ? 0 : Math.max(0, actualValue - std.threshold);
            break;
          default:
            isCompliant = actualValue >= std.threshold;
        }

        if (isCompliant) {
          compliantCount++;
          evidenceText = `Compliant: Department current ${std.standardName} is ${actualValue} (Target ${std.operator} ${std.threshold}).`;
        } else {
          evidenceText = `NON-COMPLIANCE: ${std.standardName} at ${actualValue} violates threshold (${std.operator} ${std.threshold}). Gap: ${gap.toFixed(1)}.`;
          allEvidence.push(evidenceText);
        }
      } else {
        evidenceText = `Pending verification: Metric '${field}' not yet recorded for ${department}.`;
      }

      // Append specific trace evidence if standard relates to pathway or medication verification
      if (std.metricTargetField === 'pathwayConformance' && conformanceData && conformanceData.evidence) {
        conformanceData.evidence.forEach(ev => allEvidence.push(ev));
      }

      evaluatedStandards.push({
        standardId: std._id,
        standardCode: std.standardCode,
        standardName: std.standardName,
        department: std.department,
        category: std.category,
        requirement: std.requirement,
        threshold: std.threshold,
        operator: std.operator,
        actualValue: actualValue !== null ? actualValue : 'N/A',
        status: actualValue === null ? 'PENDING' : (isCompliant ? 'COMPLIANT' : 'NON_COMPLIANT'),
        gap: Number(gap.toFixed(1)),
        severity: std.severity,
        evidence: evidenceText
      });
    }

    const totalEvaluated = evaluatedStandards.filter(s => s.status !== 'PENDING').length;
    const overallRate = totalEvaluated > 0 ? Number(((compliantCount / totalEvaluated) * 100).toFixed(1)) : 100.0;

    return {
      department: department || 'Hospital-Wide',
      overallComplianceRate: overallRate,
      standardsCount: standards.length,
      compliantCount,
      nonCompliantCount: totalEvaluated - compliantCount,
      standards: evaluatedStandards,
      evidenceSummary: Array.from(new Set(allEvidence)),
      evaluatedAt: new Date()
    };
  }
};

module.exports = complianceService;
