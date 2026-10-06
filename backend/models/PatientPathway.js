const mongoose = require('mongoose');

const EventItemSchema = new mongoose.Schema({
  activity: { type: String, required: true, trim: true },
  timestamp: { type: Date, default: Date.now },
  resource: { type: String, default: 'Clinical Staff' },
  status: { type: String, enum: ['COMPLETED', 'SKIPPED', 'DELAYED', 'IN_PROGRESS'], default: 'COMPLETED' },
  durationMinutes: { type: Number, default: 15 }
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
  admissionDiagnosis: { type: String, default: 'Routine Observation' }
}, {
  timestamps: true
});

// Index required by architecture specification
PatientPathwaySchema.index({ department: 1, timestamp: -1 });
PatientPathwaySchema.index({ caseId: 1 });

module.exports = mongoose.model('PatientPathway', PatientPathwaySchema);
