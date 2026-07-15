const jwt = require('jsonwebtoken');

function makeVerifier(role, label) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: No token provided.' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role !== role) return res.status(403).json({ message: `Forbidden: ${label} access only.` });
      req.user = decoded;
      next();
    } catch {
      return res.status(401).json({ message: 'Unauthorized: Invalid or expired token.' });
    }
  };
}

const verifyStudentToken    = makeVerifier('student',  'Student');
const verifyTeacherToken    = makeVerifier('teacher',  'Teacher');
const verifyAdminToken      = makeVerifier('admin',    'Admin');
const verifyHODToken        = makeVerifier('hod',      'HOD');
const verifyExamToken       = makeVerifier('exam',     'Examination Section');
const verifyFinanceToken    = makeVerifier('finance',  'Finance Staff');

module.exports = {
  verifyStudentToken,
  verifyTeacherToken,
  verifyAdminToken,
  verifyHODToken,
  verifyExamToken,
  verifyFinanceToken,
};
