const mongoose = require('mongoose');

const AccreditationEvidenceSchema = new mongoose.Schema({
  evidenceId: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true,
    index: true 
  }, // e.g. "EV-1042", "EV-ICU-001"
  department: { 
    type: String, 
    required: true, 
    enum: ['ICU', 'Emergency', 'Surgery', 'Cardiology', 'General Ward', 'Hospital-Wide'],
    index: true 
  },
  standardCode: { 
    type: String, 
    required: true, 
    trim: true,
    index: true 
  }, // e.g. "NABH-COP.6", "NABH-IC.1"
  evidenceType: { 
    type: String, 
    required: true, 
    enum: ['METRIC', 'PATHWAY_TRACE', 'INCIDENT', 'DOCUMENT', 'AUDIT_OBSERVATION', 'CLINICAL_VERIFICATION'],
    default: 'METRIC'
  },
  sourceType: { 
    type: String, 
    required: true 
  }, // e.g. "HospitalMetric", "PatientPathway", "StaffAuditLog", "Alert"
  sourceId: { 
    type: String, 
    required: true 
  },
  title: { 
    type: String, 
    required: true, 
    trim: true 
  },
  description: { 
    type: String, 
    default: '' 
  },
  dataPayload: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true 
  },
  originalHash: { 
    type: String, 
    required: false,
    default: 'PENDING_AUDITOR_SEAL' 
  }, // SHA-256 computed upon auditor cryptographic sealing
  currentHash: { 
    type: String, 
    required: false,
    default: 'PENDING_AUDITOR_SEAL' 
  }, // SHA-256 recomputed for verification
  previousHash: { 
    type: String, 
    required: false,
    default: 'GENESIS_HASH_00000000000000000000000000000000'
  }, // Hash of preceding evidence in the chain
  chainIndex: {
    type: Number,
    required: false,
    default: 0
  },
  isCryptographicallySealed: {
    type: Boolean,
    default: false,
    index: true
  },
  verifiedBy: {
    type: String,
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  auditorNotes: {
    type: String,
    default: ''
  },
  recordedBy: { 
    type: String, 
    required: true,
    default: 'System Conformance Engine'
  },
  recordedAt: { 
    type: Date, 
    default: Date.now 
  },
  integrityStatus: { 
    type: String, 
    enum: ['PENDING_AUDITOR_REVIEW', 'VERIFIED', 'FLAGGED'], 
    default: 'PENDING_AUDITOR_REVIEW',
    index: true 
  },
  verificationNotes: { 
    type: String, 
    default: 'Awaiting manual auditor review and cryptographic sealing.' 
  },
  version: { 
    type: Number, 
    default: 1 
  }
}, {
  timestamps: true
});

AccreditationEvidenceSchema.index({ department: 1, recordedAt: -1 });
AccreditationEvidenceSchema.index({ standardCode: 1, integrityStatus: 1 });
AccreditationEvidenceSchema.index({ chainIndex: 1 });

module.exports = mongoose.model('AccreditationEvidence', AccreditationEvidenceSchema);
