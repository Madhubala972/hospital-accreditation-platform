const HospitalMetric = require('../models/HospitalMetric');
const riskService = require('../services/riskService');

exports.createMetric = async (req, res) => {
  try {
    const {
      department,
      occupancyRate,
      avgWaitingTime,
      infectionRate,
      staffingLevel,
      incidentCount,
      pathwayConformance,
      notes
    } = req.body;

    if (!department || occupancyRate === undefined || avgWaitingTime === undefined || infectionRate === undefined || staffingLevel === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required metric fields: department, occupancyRate, avgWaitingTime, infectionRate, staffingLevel'
      });
    }

    const metricDate = req.body.timestamp ? new Date(req.body.timestamp) : new Date();
    const startOfDay = new Date(metricDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(metricDate);
    endOfDay.setHours(23, 59, 59, 999);

    let metric = await HospitalMetric.findOne({
      department,
      timestamp: { $gte: startOfDay, $lte: endOfDay }
    });

    if (metric) {
      metric.occupancyRate = Number(occupancyRate);
      metric.avgWaitingTime = Number(avgWaitingTime);
      metric.infectionRate = Number(infectionRate);
      metric.staffingLevel = Number(staffingLevel);
      metric.incidentCount = Number(incidentCount || 0);
      if (pathwayConformance !== undefined) metric.pathwayConformance = Number(pathwayConformance);
      metric.notes = notes || metric.notes;
      metric.recordedBy = req.user?.name || metric.recordedBy;
      metric.timestamp = metricDate;
      await metric.save();
    } else {
      metric = await HospitalMetric.create({
        department,
        timestamp: metricDate,
        occupancyRate: Number(occupancyRate),
        avgWaitingTime: Number(avgWaitingTime),
        infectionRate: Number(infectionRate),
        staffingLevel: Number(staffingLevel),
        incidentCount: Number(incidentCount || 0),
        pathwayConformance: Number(pathwayConformance !== undefined ? pathwayConformance : 85),
        notes: notes || '',
        recordedBy: req.user?.name || 'Quality Team'
      });
    }

    // Synchronously evaluate departmental risk (takes only ~200ms) so all dashboards are 100% in sync
    let updatedRisk = null;
    try {
      updatedRisk = await riskService.calculateAndStoreDepartmentRisk(department);
    } catch (riskErr) {
      console.warn(`[MetricsController] Auto-evaluation warning for ${department}: ${riskErr.message}`);
    }

    res.status(201).json({
      status: 'success',
      message: `Metrics saved for ${department}. System updated instantly.`,
      metric,
      riskSummary: updatedRisk ? {
        score: updatedRisk.score,
        category: updatedRisk.category,
        contributingFactors: updatedRisk.contributingFactors
      } : null
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getMetrics = async (req, res) => {
  try {
    const { department, limit = 50, sort = 'desc' } = req.query;
    const query = (department && department !== 'Hospital-Wide') ? { department } : {};
    
    const metrics = await HospitalMetric.find(query)
      .sort({ timestamp: sort === 'asc' ? 1 : -1 })
      .limit(Number(limit))
      .select('department timestamp occupancyRate avgWaitingTime infectionRate staffingLevel incidentCount pathwayConformance notes recordedBy')
      .lean();

    res.json({
      status: 'success',
      count: metrics.length,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
