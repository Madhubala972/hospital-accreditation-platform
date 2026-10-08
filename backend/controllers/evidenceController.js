const AccreditationEvidence = require('../models/AccreditationEvidence');
const StaffAuditLog = require('../models/StaffAuditLog');
const evidenceIntegrityService = require('../services/evidenceIntegrityService');

exports.createEvidence = async (req, res) => {
  try {
    const { 
      evidenceId, 
      department, 
      standardCode, 
      evidenceType, 
      sourceType, 
      sourceId, 
      title, 
      description, 
      dataPayload, 
      recordedBy 
    } = req.body;

    if (!department || !standardCode || !sourceType || !sourceId || !dataPayload) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing mandatory evidence fields: department, standardCode, sourceType, sourceId, and dataPayload are required.'
      });
    }

    const evidence = await evidenceIntegrityService.recordEvidence({
      evidenceId,
      department,
      standardCode,
      evidenceType: evidenceType || 'METRIC',
      sourceType,
      sourceId,
      title: title || `${department} ${standardCode} Evidence Record`,
      description: description || '',
      dataPayload,
      recordedBy: recordedBy || 'Clinical Staff Auditor'
    });

    // Write audit log entry
    await StaffAuditLog.create({
      userName: recordedBy || 'System Auditor',
      userEmail: req.user?.email || 'auditor@hospital.org',
      userRole: req.user?.role || 'Auditor',
      department: department,
      eventType: 'EVIDENCE_CREATED',
      actionTitle: `Accreditation Evidence Record Created: ${evidence.evidenceId}`,
      actionDetails: `Created evidence ${evidence.evidenceId} for ${standardCode} in ${department}. Hash: ${evidence.currentHash.substring(0, 16)}...`,
      evidenceId: evidence.evidenceId,
      recordHash: evidence.currentHash,
      previousHash: evidence.previousHash,
      status: 'SUCCESS'
    });

    res.status(201).json({
      status: 'success',
      message: 'Evidence cryptographically recorded in hash chain.',
      data: evidence
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getEvidenceList = async (req, res) => {
  try {
    const { department, standardCode, evidenceType, integrityStatus, limit = 100 } = req.query;
    const query = {};

    if (department && department !== 'Hospital-Wide') query.department = department;
    if (standardCode) query.standardCode = standardCode;
    if (evidenceType) query.evidenceType = evidenceType;
    if (integrityStatus) query.integrityStatus = integrityStatus;

    const evidenceList = await AccreditationEvidence.find(query)
      .sort({ chainIndex: -1, recordedAt: -1 })
      .limit(Number(limit))
      .lean();

    const totalCount = await AccreditationEvidence.countDocuments(query);
    const pendingCount = await AccreditationEvidence.countDocuments({ ...query, isCryptographicallySealed: false });
    const verifiedCount = await AccreditationEvidence.countDocuments({ ...query, integrityStatus: 'VERIFIED', isCryptographicallySealed: true });
    const flaggedCount = await AccreditationEvidence.countDocuments({ ...query, integrityStatus: 'FLAGGED' });
    const sealedCount = await AccreditationEvidence.countDocuments({ ...query, isCryptographicallySealed: true });

    res.json({
      status: 'success',
      totalCount,
      pendingCount,
      verifiedCount,
      flaggedCount,
      sealedCount,
      integrityRate: sealedCount > 0 ? Number(((verifiedCount / sealedCount) * 100).toFixed(1)) : 100.0,
      data: evidenceList
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getEvidenceIntegrity = async (req, res) => {
  try {
    const { department } = req.query;
    const report = await evidenceIntegrityService.verifyChainIntegrity(department);
    res.json({
      status: 'success',
      data: report
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getEvidenceById = async (req, res) => {
  try {
    const { id } = req.params;
    const evidence = await AccreditationEvidence.findOne({
      $or: [{ evidenceId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
    }).lean();

    if (!evidence) {
      return res.status(404).json({ status: 'error', message: `Evidence record ${id} not found.` });
    }

    res.json({
      status: 'success',
      data: evidence
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.verifyEvidenceById = async (req, res) => {
  try {
    const { id } = req.params;
    const verification = await evidenceIntegrityService.verifyIndividualEvidence(id);
    res.json({
      status: 'success',
      data: verification
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.manualVerifyEvidence = async (req, res) => {
  try {
    const { id } = req.params;
    const { auditorNotes, auditorName, integrityStatus } = req.body;
    
    const activeAuditor = auditorName || req.user?.name || 'Elena Rostova (Lead Quality Auditor)';

    const sealedEvidence = await evidenceIntegrityService.sealEvidenceWithAuditorSignoff(id, {
      auditorName: activeAuditor,
      auditorNotes,
      integrityStatus: integrityStatus || 'VERIFIED'
    });

    // Write Staff Audit Log
    await StaffAuditLog.create({
      userName: activeAuditor,
      userEmail: req.user?.email || 'elena.rostova@hospital.org',
      userRole: 'Auditor',
      department: sealedEvidence.department,
      eventType: 'EVIDENCE_VERIFIED',
      actionTitle: `Evidence Block #${sealedEvidence.chainIndex} Sealed by Auditor: ${sealedEvidence.evidenceId}`,
      actionDetails: `Auditor ${activeAuditor} manually reviewed and sealed ${sealedEvidence.evidenceId} for standard ${sealedEvidence.standardCode}. Hash: ${sealedEvidence.currentHash.substring(0, 16)}... Notes: ${auditorNotes || 'Verified authentic.'}`,
      evidenceId: sealedEvidence.evidenceId,
      recordHash: sealedEvidence.currentHash,
      previousHash: sealedEvidence.previousHash,
      status: 'SUCCESS'
    });

    res.json({
      status: 'success',
      message: `Evidence ${sealedEvidence.evidenceId} has been manually verified and cryptographically sealed into Block #${sealedEvidence.chainIndex}.`,
      data: sealedEvidence
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getEvidenceHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const evidence = await AccreditationEvidence.findOne({ evidenceId: id }).lean();
    if (!evidence) {
      return res.status(404).json({ status: 'error', message: `Evidence record ${id} not found.` });
    }

    // Retrieve corresponding audit logs for this evidence ID
    const auditLogs = await StaffAuditLog.find({ evidenceId: id }).sort({ timestamp: -1 }).lean();

    res.json({
      status: 'success',
      evidenceId: id,
      currentRecord: evidence,
      auditHistory: auditLogs
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
