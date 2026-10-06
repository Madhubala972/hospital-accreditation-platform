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
      'CAPA_ADVANCE', 
      'RISK_EVALUATION', 
      'DEAN_APPROVAL_ACTION', 
      'ALERT_ACKNOWLEDGEMENT',
      'STANDARDS_UPDATE'
    ] 
  },
  actionTitle: { type: String, required: true },
  actionDetails: { type: String, required: true },
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

module.exports = mongoose.model('StaffAuditLog', StaffAuditLogSchema);

