const AccreditationStandard = require('../models/AccreditationStandard');
const HospitalMetric = require('../models/HospitalMetric');
const PatientPathway = require('../models/PatientPathway');
const AccreditationEvidence = require('../models/AccreditationEvidence');
const pyService = require('./pyServiceConnector');

const complianceService = {
  /**
   * Evaluates compliance for a specific department or hospital-wide with full evidence verification.
   * Standard -> Required Evidence -> Evidence Integrity -> Metric/Process Evidence -> Threshold -> Compliance -> Evidence Confidence
   */
  async evaluateDepartmentCompliance(department) {
    const query = (department && department !== 'Hospital-Wide') ? { department: { $in: [department, 'Hospital-Wide'] } } : {};
    const metricQuery = (department && department !== 'Hospital-Wide') ? { department } : {};
    const pathwayQuery = (department && department !== 'Hospital-Wide') ? { department } : {};
    const evidenceQuery = (department && department !== 'Hospital-Wide') ? { department: { $in: [department, 'Hospital-Wide'] } } : {};

    const [standards, latestMetric, traces, evidenceRecords] = await Promise.all([
      AccreditationStandard.find(query).lean(),
      HospitalMetric.findOne(metricQuery).sort({ timestamp: -1 }).lean(),
      PatientPathway.find(pathwayQuery).sort({ timestamp: -1 }).limit(100).lean(),
      AccreditationEvidence.find(evidenceQuery).sort({ recordedAt: -1 }).limit(200).lean()
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
    let totalEvidenceInDept = 0;
    let totalVerifiedEvidenceInDept = 0;

    for (const std of standards) {
      const field = std.metricTargetField;
      let actualValue = null;
      let isCompliant = true;
      let gap = 0;
      let evidenceText = '';

      // Find matching evidence records for this specific standard
      const matchingEvidence = evidenceRecords.filter(e => 
        e.standardCode === std.standardCode || 
        (e.department === std.department && e.evidenceType === 'METRIC')
      );
      
      const evidenceCount = matchingEvidence.length;
      const verifiedEvidenceCount = matchingEvidence.filter(e => e.integrityStatus === 'VERIFIED').length;
      const flaggedEvidenceCount = matchingEvidence.filter(e => e.integrityStatus === 'FLAGGED').length;
      
      totalEvidenceInDept += evidenceCount;
      totalVerifiedEvidenceInDept += verifiedEvidenceCount;

      const integrityStatus = flaggedEvidenceCount > 0 
        ? 'FLAGGED' 
        : (verifiedEvidenceCount > 0 ? 'VERIFIED' : 'PENDING');

      // Evidence confidence formula: based on sample volume and hash verification
      let evidenceConfidence = 100.0;
      if (evidenceCount === 0) {
        evidenceConfidence = 70.0; // Baseline estimated confidence
      } else {
        const verifiedRatio = verifiedEvidenceCount / evidenceCount;
        evidenceConfidence = Number((verifiedRatio * 100).toFixed(1));
      }

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

        const evIdCitation = matchingEvidence.length > 0 ? ` [Evidence: ${matchingEvidence[0].evidenceId}]` : '';

        if (isCompliant) {
          compliantCount++;
          evidenceText = `Compliant: Department current ${std.standardName} is ${actualValue} (Target ${std.operator} ${std.threshold}).${evIdCitation}`;
        } else {
          evidenceText = `NON-COMPLIANCE: ${std.standardName} at ${actualValue} violates threshold (${std.operator} ${std.threshold}). Gap: ${gap.toFixed(1)}.${evIdCitation}`;
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
        evidenceCount,
        verifiedEvidenceCount,
        integrityStatus,
        evidenceConfidence,
        evidenceRequirements: std.evidenceRequirements || 'Mandatory trace validation',
        requiredEvidenceTypes: std.requiredEvidenceTypes || ['METRIC', 'PATHWAY_TRACE'],
        evidence: evidenceText,
        supportingEvidence: matchingEvidence.slice(0, 3).map(e => ({
          evidenceId: e.evidenceId,
          title: e.title,
          currentHash: e.currentHash,
          integrityStatus: e.integrityStatus,
          recordedAt: e.recordedAt
        }))
      });
    }

    const totalEvaluated = evaluatedStandards.filter(s => s.status !== 'PENDING').length;
    const overallRate = totalEvaluated > 0 ? Number(((compliantCount / totalEvaluated) * 100).toFixed(1)) : 100.0;
    const overallIntegrityRate = totalEvidenceInDept > 0 
      ? Number(((totalVerifiedEvidenceInDept / totalEvidenceInDept) * 100).toFixed(1)) 
      : 100.0;

    return {
      department: department || 'Hospital-Wide',
      overallComplianceRate: overallRate,
      standardsCount: standards.length,
      compliantCount,
      nonCompliantCount: totalEvaluated - compliantCount,
      totalEvidenceCount: totalEvidenceInDept,
      verifiedEvidenceCount: totalVerifiedEvidenceInDept,
      overallEvidenceIntegrityRate: overallIntegrityRate,
      standards: evaluatedStandards,
      evidenceSummary: Array.from(new Set(allEvidence)),
      evaluatedAt: new Date()
    };
  }
};

module.exports = complianceService;
