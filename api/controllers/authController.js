const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, department, employeeId, registrationNotes } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ status: 'error', message: 'Name, email, and password are required.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ status: 'error', message: 'An account with this email address already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userRole = role || 'Doctor';
    
    // Dean or Admin role registered through direct admin setup is auto-approved, 
    // doctors, nurses, auditors registering online are placed in WAITING_APPROVAL state
    const isAutoApproved = false; // All self-service registrations require Dean authorization

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: userRole,
      department: department || 'General Ward',
      employeeId: employeeId || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      approvalStatus: isAutoApproved ? 'APPROVED' : 'WAITING_APPROVAL',
      registrationNotes: registrationNotes || `New registration for ${userRole} in ${department || 'General Ward'}`
    });

    res.status(201).json({
      status: 'success',
      approvalStatus: user.approvalStatus,
      message: 'Registration submitted successfully! Your account is in a WAITING STATE pending review and approval by the Dean. Once approved, you will be able to sign in.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        employeeId: user.employeeId,
        approvalStatus: user.approvalStatus,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ status: 'error', message: 'Please provide email and password.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials. No user found with this email.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ status: 'error', message: 'Invalid password. Please check your credentials.' });
    }

    // Check Dean Approval Status
    if (user.approvalStatus === 'WAITING_APPROVAL') {
      return res.status(403).json({
        status: 'WAITING_APPROVAL',
        message: 'Account Pending Dean Approval: Your registration is currently awaiting verification by the Dean. You will be able to access the hospital system once approved.',
        user: {
          name: user.name,
          role: user.role,
          email: user.email,
          approvalStatus: 'WAITING_APPROVAL'
        }
      });
    }

    if (user.approvalStatus === 'REJECTED') {
      return res.status(403).json({
        status: 'REJECTED',
        message: 'Registration Declined: Your registration request was declined by the Dean\'s Office. Please contact administration for assistance.'
      });
    }

    const token = jwt.sign(
      { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        department: user.department,
        approvalStatus: user.approvalStatus
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Record Sign-In Work Audit for Dean
    const { logStaffActivity } = require('./auditLogController');
    await logStaffActivity({
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      department: user.department,
      eventType: 'SIGN_IN',
      actionTitle: `${user.role} Signed In to System`,
      actionDetails: `${user.name} authenticated and established active session for ${user.department}.`,
      ipAddress: req.ip || '127.0.0.1 (Intranet)'
    });

    res.json({
      status: 'success',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        employeeId: user.employeeId,
        approvalStatus: user.approvalStatus
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    if (req.user.id === 'demo-user-id') {
      return res.json({ status: 'success', user: req.user });
    }
    const user = await User.findById(req.user.id).select('-passwordHash').lean();
    if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });
    res.json({ status: 'success', user });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const { logStaffActivity } = require('./auditLogController');
    if (req.user) {
      await logStaffActivity({
        userId: req.user.id !== 'demo-user-id' ? req.user.id : null,
        userName: req.user.name || 'Clinical Staff',
        userEmail: req.user.email || 'staff@hospital.org',
        userRole: req.user.role || 'Staff',
        department: req.user.department || 'Hospital-Wide',
        eventType: 'SIGN_OUT',
        actionTitle: `${req.user.role || 'Staff'} Signed Out of Session`,
        actionDetails: `${req.user.name || 'Staff'} concluded session and signed out.`,
        ipAddress: req.ip || '127.0.0.1 (Intranet)'
      });
    }
    res.json({ status: 'success', message: 'Signed out successfully.' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Returns pending registrations awaiting Dean approval
 */
exports.getPendingUsers = async (req, res) => {
  try {
    const pendingUsers = await User.find({ approvalStatus: 'WAITING_APPROVAL' })
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      status: 'success',
      count: pendingUsers.length,
      data: pendingUsers
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Returns all users list for Dean Management
 */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      status: 'success',
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Dean approves a pending user registration
 */
exports.approveUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    user.approvalStatus = 'APPROVED';
    user.approvedBy = req.user?.name || 'Dean Dr. Arthur Vance';
    user.approvedAt = new Date();
    await user.save();

    res.json({
      status: 'success',
      message: `User ${user.name} (${user.role}) has been approved by the Dean. They can now sign in normally.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        approvalStatus: user.approvalStatus,
        approvedBy: user.approvedBy,
        approvedAt: user.approvedAt
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Dean rejects a pending user registration
 */
exports.rejectUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    user.approvalStatus = 'REJECTED';
    await user.save();

    res.json({
      status: 'success',
      message: `Registration for ${user.name} has been declined.`,
      user: {
        id: user._id,
        name: user.name,
        approvalStatus: user.approvalStatus
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

