const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'hospital_accreditation_jwt_secret_2026';

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // For local dev convenience or demo access, default to demo user if no token
    req.user = {
      id: 'demo-user-id',
      name: 'Dr. Sarah Jenkins',
      email: 'quality.lead@hospital.org',
      role: 'Quality_Manager',
      department: 'Hospital-Wide'
    };
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ status: 'error', message: 'Invalid or expired authentication token.' });
  }
};

module.exports = { authMiddleware, JWT_SECRET };
