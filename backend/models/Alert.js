const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  department: { 
    type: String, 
    required: true, 
    enum: ['ICU', 'Emergency', 'Surgery', 'Cardiology', 'General Ward', 'Hospital-Wide'] 
  },
  severity: { 
    type: String, 
    required: true, 
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  reason: { type: String, required: true },
  evidence: [{ type: String }],
  status: { 
    type: String, 
    required: true, 
    enum: ['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'CAPA_CREATED'],
    default: 'OPEN'
  },
  source: { 
    type: String, 
    enum: ['COMPLIANCE_ENGINE', 'ANOMALY_DETECTOR', 'PROCESS_MINING', 'ML_RISK'],
    default: 'COMPLIANCE_ENGINE'
  },
  standardCode: { type: String, default: null },
  capaId: { type: mongoose.Schema.Types.ObjectId, ref: 'CapaPlan', default: null },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date, default: null }
}, {
  timestamps: true
});

// Index required by architecture specification
AlertSchema.index({ department: 1, status: 1 });
AlertSchema.index({ severity: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', AlertSchema);
