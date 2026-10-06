const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.getMe);
router.post('/logout', authMiddleware, authController.logout);

// Dean user approval & audit management routes
const auditLogController = require('../controllers/auditLogController');
router.get('/pending', authMiddleware, authController.getPendingUsers);
router.get('/users', authMiddleware, authController.getAllUsers);
router.post('/approve/:id', authMiddleware, authController.approveUser);
router.post('/reject/:id', authMiddleware, authController.rejectUser);
router.get('/staff-audits', authMiddleware, auditLogController.getStaffAuditLogs);

module.exports = router;

