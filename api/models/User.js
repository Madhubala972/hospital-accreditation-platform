const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['Dean', 'Auditor', 'Doctor', 'Nurse', 'Quality_Manager', 'Admin', 'Nurse_Lead', 'Staff'], 
    default: 'Doctor' 
  },
  department: { type: String, default: 'Hospital-Wide' },
  employeeId: { type: String, default: '' },
  approvalStatus: {
    type: String,
    enum: ['APPROVED', 'WAITING_APPROVAL', 'REJECTED'],
    default: 'WAITING_APPROVAL'
  },
  approvedBy: { type: String, default: null },
  approvedAt: { type: Date, default: null },
  registrationNotes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);

