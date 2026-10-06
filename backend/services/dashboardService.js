const RiskScore = require('../models/RiskScore');
const HospitalMetric = require('../models/HospitalMetric');
const Alert = require('../models/Alert');
const CapaPlan = require('../models/CapaPlan');
const AccreditationStandard = require('../models/AccreditationStandard');

const dashboardService = {
  /**
   * Fast, compact summary endpoint for the Executive Overview dashboard.
   * Reads ONLY stored collections using lean queries (Section 15 & 16).
   */
  async getDashboardSummary(department, targetDate) {
    const isFiltered = department && department !== 'Hospital-Wide';
    const deptQuery = isFiltered ? { department } : {};
    
    // Support targetDate snapshot
    let dateFilter = null;
    let endOfDay = new Date();
    if (targetDate) {
      const parsedDate = new Date(targetDate);
      if (!isNaN(parsedDate.getTime())) {
        endOfDay = new Date(parsedDate);
        endOfDay.setHours(23, 59, 59, 999);
        dateFilter = { $lte: endOfDay };
      }
    }

    const alertQuery = isFiltered 
      ? { department, ...(dateFilter ? { createdAt: dateFilter } : {}) } 
      : { ...(dateFilter ? { createdAt: dateFilter } : {}) };
    const capaQuery = isFiltered ? { department } : {};

    // 1. Fetch risk scores and metric queries in parallel
    const departments = isFiltered ? [department] : ['ICU', 'Emergency', 'Surgery', 'Cardiology', 'General Ward'];

    const [
      riskScores,
      latestMetricsRaw,
      openAlerts,
      alertCountCritical,
      alertCountHigh,
      alertCountMedium,
      alertCountLow,
      alertCountTotal,
      totalCapa,
      completedCapa,
      inProgressCapa,
      openCapa,
      totalStandards
    ] = await Promise.all([
      RiskScore.find({ ...deptQuery, status: 'CURRENT' }).sort({ calculatedAt: -1 }).lean(),
      Promise.all(departments.map(d => {
        const metricQuery = { department: d };
        if (dateFilter) metricQuery.timestamp = dateFilter;
        return HospitalMetric.findOne(metricQuery)
          .sort({ timestamp: -1 })
          .select('department timestamp occupancyRate avgWaitingTime infectionRate staffingLevel incidentCount pathwayConformance notes recordedBy')
          .lean();
      })),
      Alert.find(alertQuery).sort({ createdAt: -1 }).limit(10).select('title department severity reason evidence createdAt').lean(),
      Alert.countDocuments({ ...alertQuery, severity: 'CRITICAL' }),
      Alert.countDocuments({ ...alertQuery, severity: 'HIGH' }),
      Alert.countDocuments({ ...alertQuery, severity: 'MEDIUM' }),
      Alert.countDocuments({ ...alertQuery, severity: 'LOW' }),
      Alert.countDocuments(alertQuery),
      CapaPlan.countDocuments(capaQuery),
      CapaPlan.countDocuments({ ...capaQuery, status: 'COMPLETED' }),
      CapaPlan.countDocuments({ ...capaQuery, status: { $in: ['ASSIGNED', 'IN_PROGRESS'] } }),
      CapaPlan.countDocuments({ ...capaQuery, status: 'OPEN' }),
      AccreditationStandard.countDocuments(isFiltered ? { department: { $in: [department, 'Hospital-Wide'] } } : {})
    ]);

    const latestMetrics = latestMetricsRaw.filter(Boolean);

    const alertCountsBySeverity = {
      CRITICAL: alertCountCritical,
      HIGH: alertCountHigh,
      MEDIUM: alertCountMedium,
      LOW: alertCountLow,
      TOTAL_OPEN: alertCountTotal
    };

    // Compute aggregated KPIs
    const avgRisk = riskScores.length > 0 
      ? Number((riskScores.reduce((acc, curr) => acc + curr.score, 0) / riskScores.length).toFixed(1))
      : 25.0;

    const avgOccupancy = latestMetrics.length > 0
      ? Number((latestMetrics.reduce((acc, curr) => acc + curr.occupancyRate, 0) / latestMetrics.length).toFixed(1))
      : 75.0;

    const avgConformance = latestMetrics.length > 0
      ? Number((latestMetrics.reduce((acc, curr) => acc + curr.pathwayConformance, 0) / latestMetrics.length).toFixed(1))
      : 88.0;

    const highestRiskDept = riskScores.length > 0
      ? riskScores.slice().sort((a, b) => b.score - a.score)[0]
      : { department: 'ICU', score: 45, category: 'MEDIUM' };

    // Format department cards
    const departmentCards = departments.map(d => {
      const metric = latestMetrics.find(m => m.department === d) || {};
      const risk = riskScores.find(r => r.department === d) || { score: 20, category: 'LOW', components: {} };
      return {
        department: d,
        riskScore: risk.score || 20,
        riskCategory: risk.category || 'LOW',
        occupancyRate: metric.occupancyRate || 70,
        avgWaitingTime: metric.avgWaitingTime || 25,
        infectionRate: metric.infectionRate || 1.2,
        staffingLevel: metric.staffingLevel || 0.33,
        pathwayConformance: metric.pathwayConformance || 90,
        incidentCount: metric.incidentCount || 0,
        contributingFactors: risk.contributingFactors || [],
        calculatedAt: risk.calculatedAt || new Date()
      };
    });

    return {
      selectedDepartment: department || 'Hospital-Wide',
      generatedAt: new Date(),
      kpis: {
        hospitalComplianceIndex: avgConformance,
        averageRiskScore: avgRisk,
        highestRiskDepartment: highestRiskDept.department,
        highestRiskScore: highestRiskDept.score,
        highestRiskCategory: highestRiskDept.category,
        averageOccupancyRate: avgOccupancy,
        totalOpenAlerts: alertCountsBySeverity.TOTAL_OPEN,
        criticalAlerts: alertCountsBySeverity.CRITICAL,
        totalStandardsConfigured: totalStandards,
        capaCompletionRate: totalCapa > 0 ? Number(((completedCapa / totalCapa) * 100).toFixed(1)) : 100
      },
      capaSummary: {
        total: totalCapa,
        completed: completedCapa,
        inProgress: inProgressCapa,
        open: openCapa
      },
      alertCountsBySeverity,
      recentAlerts: openAlerts,
      departments: departmentCards
    };
  }
};

module.exports = dashboardService;
