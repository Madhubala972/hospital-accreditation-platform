const mongoose = require('mongoose');

const HospitalMetricSchema = new mongoose.Schema({
  department: { 
    type: String, 
    required: true, 
    enum: ['ICU', 'Emergency', 'Surgery', 'Cardiology', 'General Ward', 'Hospital-Wide'],
    trim: true 
  },
  timestamp: { type: Date, default: Date.now, required: true },
  occupancyRate: { type: Number, required: true, min: 0, max: 100 },
  avgWaitingTime: { type: Number, required: true, min: 0 }, // in minutes
  infectionRate: { type: Number, required: true, min: 0, max: 100 }, // in percent
  staffingLevel: { type: Number, required: true, min: 0 }, // nurse-to-patient ratio (e.g. 0.33)
  incidentCount: { type: Number, required: true, min: 0, default: 0 }, // adverse events
  pathwayConformance: { type: Number, required: true, min: 0, max: 100 }, // in percent
  notes: { type: String, default: '' },
  recordedBy: { type: String, default: 'System' },
  // Evidence & Provenance integration
  evidenceId: { type: String, default: null },
  dataSource: { type: String, default: 'CLINICAL_TELEMETRY' },
  verificationStatus: { type: String, enum: ['VERIFIED', 'FLAGGED', 'PENDING'], default: 'VERIFIED' },
  integrityHash: { type: String, default: null }
}, {
  timestamps: true
});

// Compound index as required by architecture specification
HospitalMetricSchema.index({ department: 1, timestamp: -1 });
HospitalMetricSchema.index({ evidenceId: 1 });

module.exports = mongoose.model('HospitalMetric', HospitalMetricSchema);
