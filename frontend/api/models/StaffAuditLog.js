const mongoose = require('mongoose');

const StaffAuditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  userRole: { type: String, required: true },
  department: { type: String, default: 'Hospital-Wide' },
  eventType: { 
    type: String, 
    required: true,
    enum: [
      'SIGN_IN', 
      'SIGN_OUT', 
      'METRIC_SUBMISSION', 
      'CLINICAL_TRACE_LOG', 
      'INCIDENT_LOGGED',
      'CAPA_ADVANCE', 
      'RISK_EVALUATION', 
      'DEAN_APPROVAL_ACTION', 
      'ALERT_ACKNOWLEDGEMENT',
      'STANDARDS_UPDATE',
      'EVIDENCE_CREATED',
      'EVIDENCE_UPDATED',
      'EVIDENCE_VERIFIED',
      'EVIDENCE_INTEGRITY_FAILURE',
      'CAPA_VERIFICATION'
    ] 
  },
  actionTitle: { type: String, required: true },
  actionDetails: { type: String, required: true },
  evidenceId: { type: String, default: null },
  recordHash: { type: String, default: null },
  previousHash: { type: String, default: null },
  ipAddress: { type: String, default: '127.0.0.1 (Hospital Intranet Terminal)' },
  deviceInfo: { type: String, default: 'Hospital Clinical Workstation' },
  status: { 
    type: String, 
    enum: ['SUCCESS', 'WARNING', 'SECURITY_FLAGGED'], 
    default: 'SUCCESS' 
  },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true
});

StaffAuditLogSchema.index({ timestamp: -1 });
StaffAuditLogSchema.index({ userRole: 1, eventType: 1 });
StaffAuditLogSchema.index({ evidenceId: 1 });

module.exports = mongoose.model('StaffAuditLog', StaffAuditLogSchema);
