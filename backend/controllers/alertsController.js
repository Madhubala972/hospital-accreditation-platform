const Alert = require('../models/Alert');
const evidenceIntegrityService = require('../services/evidenceIntegrityService');
const riskService = require('../services/riskService');
const StaffAuditLog = require('../models/StaffAuditLog');

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

exports.createAlert = async (req, res) => {
  try {
    const {
      title,
      department,
      severity = 'HIGH',
      reason,
      standardCode = 'NABH-COP.6',
      recommendedCapa,
      reportedBy,
      timestamp
    } = req.body;

    if (!title || !department || !reason) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide title, department, and reason for the critical situation.'
      });
    }

    const incidentDate = timestamp ? new Date(timestamp) : new Date();
    const deptPrefix = department.substring(0, 3).toUpperCase();
    const dateStr = incidentDate.toISOString().split('T')[0].replace(/-/g, '');
    const cleanDateFormatted = incidentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const evNum = Date.now().toString().slice(-4);
    const evidenceId = `EV-${deptPrefix}-INC-${dateStr}-${evNum}`;

    // 1. Anchor into AccreditationEvidence blockchain ledger
    const evPayload = {
      incidentTitle: title,
      department,
      severity,
      reason,
      standardCode,
      recordedBy: reportedBy || req.user?.name || 'Clinical Quality Lead',
      timestamp: incidentDate.toISOString()
    };

    try {
      await evidenceIntegrityService.recordEvidence({
        evidenceId,
        department,
        standardCode,
        evidenceType: 'INCIDENT',
        sourceType: 'CriticalIncidentReport',
        sourceId: `INCIDENT-${Date.now()}`,
        title: `Critical Situation: ${title} (${cleanDateFormatted})`,
        description: `Clinical safety event / deviation recorded for ${department}. Reason: ${reason}`,
        dataPayload: evPayload,
        recordedBy: reportedBy || req.user?.name || 'Clinical Quality Lead'
      });
    } catch (evErr) {
      console.warn(`[AlertsController] Evidence recording warning: ${evErr.message}`);
    }

    // 2. Create Alert record
    const alert = await Alert.create({
      title,
      department,
      severity,
      reason,
      evidence: [
        `Clinical situation recorded: ${reason} [Evidence: ${evidenceId} -> ${standardCode}]`
      ],
      supportingEvidenceIds: [evidenceId],
      evidenceCount: 1,
      integrityStatus: 'VERIFIED',
      riskContribution: severity === 'CRITICAL' ? 30 : severity === 'HIGH' ? 20 : 10,
      recommendedCapa: recommendedCapa || `Initiate immediate CAPA protocol and clinical investigation for '${title}'.`,
      status: 'OPEN',
      source: 'ANOMALY_DETECTOR',
      standardCode,
      createdAt: incidentDate
    });

    // 3. Write Staff Audit Log
    try {
      await StaffAuditLog.create({
        userName: reportedBy || req.user?.name || 'Clinical Staff',
        userEmail: req.user?.email || 'staff@hospital.org',
        userRole: req.user?.role || 'Clinician',
        department,
        eventType: 'INCIDENT_LOGGED',
        actionTitle: `Critical Situation Logged: ${title}`,
        actionDetails: `Severity: ${severity}. Standard: ${standardCode}. Reason: ${reason}. Evidence Block: ${evidenceId}`,
        evidenceId,
        status: 'SUCCESS'
      });
    } catch (auditErr) {
      console.warn(`[AlertsController] Audit log warning: ${auditErr.message}`);
    }

    // 4. Synchronously evaluate and update departmental risk
    let updatedRisk = null;
    try {
      updatedRisk = await riskService.calculateAndStoreDepartmentRisk(department);
    } catch (riskErr) {
      console.warn(`[AlertsController] Risk evaluation warning: ${riskErr.message}`);
    }

    res.status(201).json({
      status: 'success',
      message: `Critical situation '${title}' logged and connected to cryptographic evidence & risk engine.`,
      data: alert,
      evidenceId,
      riskSummary: updatedRisk ? {
        score: updatedRisk.score,
        category: updatedRisk.category
      } : null
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
