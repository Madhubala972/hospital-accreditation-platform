const dashboardService = require('../services/dashboardService');
const AccreditationStandard = require('../models/AccreditationStandard');
const RiskScore = require('../models/RiskScore');
const CapaPlan = require('../models/CapaPlan');
const Alert = require('../models/Alert');
const HospitalMetric = require('../models/HospitalMetric');

/**
 * Helper to extract unique everyday audit dates and summaries
 */
async function getDailyAuditDatesSummary() {
  const metrics = await HospitalMetric.find()
    .sort({ timestamp: -1 })
    .select('department timestamp occupancyRate avgWaitingTime infectionRate staffingLevel incidentCount pathwayConformance notes recordedBy')
    .lean();

  const groups = {};

  metrics.forEach(m => {
    const dStr = new Date(m.timestamp).toISOString().split('T')[0];
    if (!groups[dStr]) {
      groups[dStr] = {
        date: dStr,
        timestamp: m.timestamp,
        metrics: [],
        shiftNotes: m.notes || '',
        recordedBy: m.recordedBy || 'Shift Supervisor'
      };
    }
    groups[dStr].metrics.push(m);
  });

  const datesList = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));
  
  return datesList.map((dStr, idx) => {
    const group = groups[dStr];
    const count = group.metrics.length;
    const avgConformance = count > 0 
      ? Number((group.metrics.reduce((acc, curr) => acc + (curr.pathwayConformance || 0), 0) / count).toFixed(1))
      : 88.0;
    const avgOccupancy = count > 0 
      ? Number((group.metrics.reduce((acc, curr) => acc + (curr.occupancyRate || 0), 0) / count).toFixed(1))
      : 75.0;
    const totalIncidents = group.metrics.reduce((acc, curr) => acc + (curr.incidentCount || 0), 0);
    const avgInfection = count > 0 
      ? Number((group.metrics.reduce((acc, curr) => acc + (curr.infectionRate || 0), 0) / count).toFixed(2))
      : 1.2;

    const parsedDate = new Date(dStr + 'T12:00:00');
    let relativeLabel = `Day -${idx} Audit`;
    if (idx === 0) relativeLabel = 'Today (Latest Shift)';
    else if (idx === 1) relativeLabel = 'Yesterday (Shift Audit)';

    return {
      date: dStr,
      timestamp: group.timestamp,
      formattedDate: parsedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
      relativeLabel,
      departmentsLogged: count,
      complianceIndex: avgConformance,
      averageOccupancyRate: avgOccupancy,
      totalIncidents,
      averageInfectionRate: avgInfection,
      shiftNotes: group.shiftNotes || `Operational shift audit records for ${count} clinical departments.`,
      recordedBy: group.recordedBy,
      auditStatus: avgConformance >= 85 ? 'ACCREDITATION_READY' : 'CONDITIONAL_REVIEW_REQUIRED'
    };
  });
}

/**
 * Returns available daily audit dates
 */
exports.getAvailableDates = async (req, res) => {
  try {
    const dates = await getDailyAuditDatesSummary();
    res.json({
      status: 'success',
      count: dates.length,
      data: dates
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Returns everyday archive of audit reports
 */
exports.getDailyArchive = async (req, res) => {
  try {
    const dailyArchives = await getDailyAuditDatesSummary();
    res.json({
      status: 'success',
      totalDays: dailyArchives.length,
      data: dailyArchives
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Generates or retrieves the Executive Audit Report for a specific day or latest
 */
exports.getExecutiveReport = async (req, res) => {
  try {
    const { department, date } = req.query;
    
    // Resolve target date if specified
    let targetDate = date ? new Date(date) : new Date();
    if (isNaN(targetDate.getTime())) {
      targetDate = new Date();
    }

    const dateStr = targetDate.toISOString().split('T')[0];
    const cleanDateFormatted = targetDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Reads stored results for that date snapshot concurrently in parallel (sub-millisecond generation)
    const [summary, riskScores, standards, capas, alerts, dayMetricSample] = await Promise.all([
      dashboardService.getDashboardSummary(department, dateStr),
      RiskScore.find({ status: 'CURRENT' }).lean(),
      AccreditationStandard.find().lean(),
      CapaPlan.find().sort({ createdAt: -1 }).limit(10).lean(),
      Alert.find({ status: 'OPEN' }).sort({ createdAt: -1 }).limit(10).lean(),
      HospitalMetric.findOne({
        timestamp: {
          $gte: new Date(dateStr + 'T00:00:00.000Z'),
          $lte: new Date(dateStr + 'T23:59:59.999Z')
        }
      }).lean()
    ]);

    const scopeLabel = department && department !== 'Hospital-Wide' ? department : 'Hospital-Wide Clinical Units';
    const auditIdNum = Math.abs(dateStr.replace(/-/g, '') % 9000 + 1000);
    const reportId = `AUDIT-${dateStr.replace(/-/g, '')}-${(department || 'ALL').substring(0, 3).toUpperCase()}-${auditIdNum}`;

    const report = {
      reportTitle: 'Executive Accreditation & Daily Quality Audit Report',
      reportId,
      auditDate: dateStr,
      auditDateFormatted: cleanDateFormatted,
      generatedAt: new Date(),
      auditScope: scopeLabel,
      shiftNote: dayMetricSample?.notes || `Official daily accreditation quality log for ${cleanDateFormatted}.`,
      shiftAuditor: dayMetricSample?.recordedBy || 'Lead Quality Inspector',
      accreditationStandardFramework: 'NABH 5th Edition / JCI Quality & Patient Safety',
      executiveSummary: summary.kpis,
      departmentAssessments: summary.departments,
      riskProfiles: riskScores.map(r => ({
        department: r.department,
        riskScore: r.score,
        riskCategory: r.category,
        components: r.components,
        contributingFactors: r.contributingFactors,
        evidenceCount: r.evidenceSummary?.length || 0
      })),
      standardsCoverage: {
        totalConfigured: standards.length,
        categories: [...new Set(standards.map(s => s.category))]
      },
      correctiveActionsStatus: {
        total: capas.length,
        completedWithVerification: capas.filter(c => c.status === 'COMPLETED').length,
        activeItems: capas.map(c => ({
          problem: c.problem,
          department: c.department,
          status: c.status,
          responsiblePerson: c.responsiblePerson,
          deadline: c.deadline,
          improvementPercentage: c.improvementPercentage
        }))
      },
      openAlerts: alerts.map(a => ({
        severity: a.severity,
        title: a.title,
        department: a.department,
        reason: a.reason,
        createdAt: a.createdAt
      })),
      governanceCertification: {
        status: summary.kpis.hospitalComplianceIndex >= 85 ? 'ACCREDITATION_READY' : 'CONDITIONAL_REVIEW_REQUIRED',
        complianceRate: summary.kpis.hospitalComplianceIndex,
        recommendation: summary.kpis.hospitalComplianceIndex >= 85
          ? `Hospital operational metrics on ${cleanDateFormatted} satisfy baseline NABH/JCI accreditation compliance thresholds (${summary.kpis.hospitalComplianceIndex}%). Continue closed-loop CAPA monitoring.`
          : `Elevated operational risk detected on ${cleanDateFormatted} (${summary.kpis.hospitalComplianceIndex}% compliance). Immediate CAPA execution required before external audit submission.`
      }
    };

    res.json({
      status: 'success',
      data: report
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
