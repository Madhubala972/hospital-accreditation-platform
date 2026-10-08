const mongoose = require('mongoose');

const EventItemSchema = new mongoose.Schema({
  activity: { type: String, required: true, trim: true },
  timestamp: { type: Date, default: Date.now },
  resource: { type: String, default: 'Clinical Staff' },
  status: { type: String, enum: ['COMPLETED', 'SKIPPED', 'DELAYED', 'IN_PROGRESS'], default: 'COMPLETED' },
  durationMinutes: { type: Number, default: 15 },
  evidenceId: { type: String, default: null },
  digitalSignature: { type: String, default: null }
}, { _id: false });

const PatientPathwaySchema = new mongoose.Schema({
  caseId: { type: String, required: true, trim: true },
  department: { 
    type: String, 
    required: true, 
    enum: ['ICU', 'Emergency', 'Surgery', 'Cardiology', 'General Ward'],
    trim: true 
  },
  events: [EventItemSchema],
  timestamp: { type: Date, default: Date.now },
  isCompliant: { type: Boolean, default: true },
  deviations: [{ type: String }],
  admissionDiagnosis: { type: String, default: 'Routine Observation' },
  // Evidence & Provenance integration
  evidenceId: { type: String, default: null },
  dataSource: { type: String, default: 'EHR_EVENT_STREAM' },
  verificationStatus: { type: String, enum: ['VERIFIED', 'FLAGGED', 'PENDING'], default: 'VERIFIED' },
  integrityHash: { type: String, default: null }
}, {
  timestamps: true
});

// Index required by architecture specification
PatientPathwaySchema.index({ department: 1, timestamp: -1 });
PatientPathwaySchema.index({ caseId: 1 });
PatientPathwaySchema.index({ evidenceId: 1 });

module.exports = mongoose.model('PatientPathway', PatientPathwaySchema);
