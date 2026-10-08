const mongoose = require('mongoose');

const CapaPlanSchema = new mongoose.Schema({
  problem: { type: String, required: true, trim: true },
  department: { 
    type: String, 
    required: true, 
    enum: ['ICU', 'Emergency', 'Surgery', 'Cardiology', 'General Ward', 'Hospital-Wide'] 
  },
  action: { type: String, required: true },
  responsiblePerson: { type: String, required: true, trim: true },
  deadline: { type: Date, required: true },
  status: { 
    type: String, 
    required: true, 
    enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'],
    default: 'OPEN' 
  },
  alertId: { type: mongoose.Schema.Types.ObjectId, ref: 'Alert', default: null },
  standardCode: { type: String, default: null },
  priority: { 
    type: String, 
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], 
    default: 'HIGH' 
  },
  rootCauseAnalysis: { type: String, default: '' },
  
  // Closed-loop verification & simulation parameters (Section 12 & 14)
  predictedImpact: { type: Number, default: 0 }, // e.g. 30.8 (%)
  actualImpact: { type: Number, default: 0 }, // e.g. 28.2 (%)
  predictionAccuracy: { type: Number, default: 0 }, // e.g. 91.6 (%)
  verificationStatus: { 
    type: String, 
    enum: ['PENDING_VERIFICATION', 'VERIFIED_EFFECTIVE', 'VERIFICATION_FAILED'],
    default: 'PENDING_VERIFICATION' 
  },
  supportingEvidenceIds: [{ type: String }],
  simulationId: { type: String, default: null },

  beforeMetrics: {
    riskScore: { type: Number, default: 0 },
    complianceRate: { type: Number, default: 0 },
    occupancyRate: { type: Number, default: 0 },
    infectionRate: { type: Number, default: 0 },
    recordedAt: { type: Date, default: Date.now }
  },
  afterMetrics: {
    riskScore: { type: Number, default: null },
    complianceRate: { type: Number, default: null },
    occupancyRate: { type: Number, default: null },
    infectionRate: { type: Number, default: null },
    recordedAt: { type: Date, default: null }
  },
  improvementPercentage: { type: Number, default: null },
  verificationNotes: { type: String, default: '' },
  completedAt: { type: Date, default: null }
}, {
  timestamps: true
});

// Index required by architecture specification
CapaPlanSchema.index({ department: 1, status: 1 });
CapaPlanSchema.index({ status: 1, deadline: 1 });
CapaPlanSchema.index({ verificationStatus: 1 });

module.exports = mongoose.model('CapaPlan', CapaPlanSchema);
