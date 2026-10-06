const Alert = require('../models/Alert');

exports.getAlerts = async (req, res) => {
  try {
    const { department, status, severity, limit = 50 } = req.query;
    const query = {};
    if (department && department !== 'Hospital-Wide') query.department = department;
    if (status) query.status = status;
    if (severity) query.severity = severity;

    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    res.json({
      status: 'success',
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.updateAlertStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'CAPA_CREATED'].includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Invalid status value.' });
    }

    const alert = await Alert.findByIdAndUpdate(
      id,
      { 
        status,
        ...(status === 'RESOLVED' ? { resolvedAt: new Date() } : {})
      },
      { new: true }
    );

    if (!alert) return res.status(404).json({ status: 'error', message: 'Alert not found' });

    res.json({
      status: 'success',
      data: alert
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
