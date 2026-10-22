const StaffAuditLog = require('../models/StaffAuditLog');

/**
 * Helper to log any staff work or authentication activity
 */
exports.logStaffActivity = async ({
  userId = null,
  userName,
  userEmail,
  userRole,
  department = 'Hospital-Wide',
  eventType,
  actionTitle,
  actionDetails,
  ipAddress = '127.0.0.1 (Clinical Intranet)',
  status = 'SUCCESS'
}) => {
  try {
    await StaffAuditLog.create({
      userId,
      userName: userName || 'Clinical Staff',
      userEmail: userEmail || 'staff@hospital.org',
      userRole: userRole || 'Staff',
      department: department || 'Hospital-Wide',
      eventType,
      actionTitle,
      actionDetails,
      ipAddress,
      status,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('[StaffAuditLog Error]', err.message);
  }
};

/**
 * Retrieves staff signin/signout and work audits (STRICTLY DEAN ACCESS ONLY)
 */
exports.getStaffAuditLogs = async (req, res) => {
  try {
    // Strict Dean / Admin Role Guard
    const userRole = req.user?.role;
    if (userRole !== 'Dean' && userRole !== 'Admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Access Denied: Staff Work Audits and Sign-In/Sign-Out Activity Logs are restricted exclusively to Dean Dr. Arthur Vance.'
      });
    }

    const { eventType, role, department, limit = 100 } = req.query;
    const query = {};
    if (eventType) query.eventType = eventType;
    if (role) query.userRole = role;
    if (department && department !== 'Hospital-Wide') query.department = department;

    const logs = await StaffAuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .lean();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const stats = {
      totalAudits: await StaffAuditLog.countDocuments(),
      todaySignIns: await StaffAuditLog.countDocuments({ eventType: 'SIGN_IN', timestamp: { $gte: todayStart } }),
      todayWorkActions: await StaffAuditLog.countDocuments({ 
        eventType: { $in: ['METRIC_SUBMISSION', 'CLINICAL_TRACE_LOG', 'CAPA_ADVANCE', 'RISK_EVALUATION'] },
        timestamp: { $gte: todayStart } 
      }),
      activeStaffSessions: await StaffAuditLog.distinct('userEmail', { eventType: 'SIGN_IN', timestamp: { $gte: todayStart } })
    };

    res.json({
      status: 'success',
      governanceScope: 'Dean Exclusive Executive Audit Record',
      stats,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

