const mongoose = require('mongoose');

const RiskScoreSchema = new mongoose.Schema({
  department: { 
    type: String, 
    required: true, 
    enum: ['ICU', 'Emergency', 'Surgery', 'Cardiology', 'General Ward', 'Hospital-Wide'] 
  },
  score: { type: Number, required: true, min: 0, max: 100 },
  category: { 
    type: String, 
    required: true, 
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] 
  },
  components: {
    mlRisk: { type: Number, default: 0 },
    complianceGap: { type: Number, default: 0 },
    processDeviation: { type: Number, default: 0 },
    anomalyScore: { type: Number, default: 0 },
    benchmarkGap: { type: Number, default: 0 },
    evidenceConfidence: { type: Number, default: 100 },
    evidenceIntegrity: { type: Number, default: 100 }
  },
  contributingFactors: [{ type: String }],
  evidenceSummary: [{ type: String }],
  evidenceReferences: [{
    factor: { type: String },
    evidenceId: { type: String },
    standardCode: { type: String },
    riskContribution: { type: Number, default: 0 }
  }],
  calculatedAt: { type: Date, default: Date.now },
  dataVersion: { type: String, default: '2.0-Evidence-Aware' },
  status: { type: String, enum: ['CURRENT', 'SUPERSEDED'], default: 'CURRENT' }
}, {
  timestamps: true
});

RiskScoreSchema.index({ department: 1, calculatedAt: -1 });

module.exports = mongoose.model('RiskScore', RiskScoreSchema);
