const mongoose = require('mongoose');

const BenchmarkSchema = new mongoose.Schema({
  metric: { type: String, required: true, trim: true }, // e.g., "occupancyRate", "infectionRate", "avgWaitingTime", "pathwayConformance"
  metricLabel: { type: String, required: true },
  peerValue: { type: Number, required: true },
  unit: { type: String, default: '%' },
  sourceName: { type: String, required: true, default: 'National Healthcare Quality Benchmark (NABH/CDC Verified Cohort)' },
  datasetVersion: { type: String, required: true, default: '2025.Q4-Verified' },
  department: { 
    type: String, 
    required: true, 
    enum: ['ICU', 'Emergency', 'Surgery', 'Cardiology', 'General Ward', 'Hospital-Wide'] 
  },
  thresholdMin: { type: Number, default: null },
  thresholdMax: { type: Number, default: null },
  isSampleDemo: { type: Boolean, default: false },
  retrievedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

BenchmarkSchema.index({ department: 1, metric: 1 });

module.exports = mongoose.model('Benchmark', BenchmarkSchema);
