const mongoose = require('mongoose');

const AccreditationStandardSchema = new mongoose.Schema({
  standardCode: { type: String, required: true, unique: true, trim: true }, // e.g. "NABH-COP.6", "JCI-IPSG.3"
  standardName: { type: String, required: true, trim: true }, // e.g. "Medication Safety & High-Risk Verification"
  department: { 
    type: String, 
    required: true, 
    enum: ['ICU', 'Emergency', 'Surgery', 'Cardiology', 'General Ward', 'Hospital-Wide'] 
  },
  requirement: { type: String, required: true }, // Description of compliance mandate
  category: { 
    type: String, 
    enum: ['Patient Safety', 'Clinical Care', 'Infection Control', 'Facility & Staffing', 'Governance'],
    default: 'Patient Safety'
  },
  threshold: { type: Number, required: true }, // Numerical target boundary
  operator: { type: String, enum: ['>=', '<=', '>', '<', '=='], default: '>=' },
  metricTargetField: { type: String, required: true }, // Field in HospitalMetric e.g. "pathwayConformance"
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'HIGH' },
  ruleDescription: { type: String, required: true },
  regulatoryBody: { type: String, default: 'NABH 5th Edition' }
}, {
  timestamps: true
});

AccreditationStandardSchema.index({ department: 1 });

module.exports = mongoose.model('AccreditationStandard', AccreditationStandardSchema);
