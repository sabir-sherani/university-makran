const jwt = require('jsonwebtoken');

// Lazy require()s (not at module top) to sidestep any require-order/circular
// issues between models and middleware — cost is negligible since Node caches.
const ROLE_CONFIG = {
  student: { model: () => require('../models/Student'), activeStatuses: ['approved'], label: 'Student' },
  teacher: { model: () => require('../models/Teacher'), activeStatuses: ['approved'], label: 'Teacher' },
  admin:   { model: () => require('../models/Admin'), activeStatuses: null, label: 'Admin' },
  hod:     { model: () => require('../models/HOD'), activeStatuses: ['active'], label: 'HOD', freshFields: ['department'] },
  exam:    { model: () => require('../models/ExaminationStaff'), activeStatuses: ['active'], label: 'Examination Section' },
  finance: { model: () => require('../models/FinanceStaff'), activeStatuses: ['active'], label: 'Finance Staff' },
  employee:{ model: () => require('../models/Employee'), activeStatuses: ['active'], label: 'Employee' },
};

function makeVerifier(role) {
  const { model, activeStatuses, label, freshFields = [] } = ROLE_CONFIG[role];

  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: No token provided.' });
    }
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role !== role) return res.status(403).json({ message: `Forbidden: ${label} access only.` });

      // Re-check the account on every request rather than trusting the JWT
      // payload for anything beyond identity/role:
      //  - tokenVersion must still match, so a password reset or an admin
      //    suspending/deactivating the account immediately kills old tokens
      //    instead of waiting out the token's expiry.
      //  - status must still be in the "active" set for this role, so a
      //    student/teacher/staff account suspended mid-session is cut off
      //    right away rather than keeping access until their token expires.
      const user = await model().findById(decoded.id).select(['tokenVersion', 'status', 'isActive', ...freshFields].join(' '));
      if (!user) return res.status(401).json({ message: 'Unauthorized: Account no longer exists.' });

      if ((decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
        return res.status(401).json({ message: 'Unauthorized: Session has been invalidated. Please log in again.' });
      }
      if (user.isActive === false) {
        return res.status(403).json({ message: 'Forbidden: This account has been archived.' });
      }
      if (activeStatuses && !activeStatuses.includes(user.status)) {
        return res.status(403).json({ message: 'Forbidden: Your account is not currently active.' });
      }

      // Attach fresh, DB-sourced values (e.g. a HOD's department) on top of
      // the JWT payload so routes never act on a stale claim from a token
      // issued before an admin changed that field.
      req.user = { ...decoded };
      for (const field of freshFields) req.user[field] = user[field];

      next();
    } catch {
      return res.status(401).json({ message: 'Unauthorized: Invalid or expired token.' });
    }
  };
}

const verifyStudentToken = makeVerifier('student');
const verifyTeacherToken = makeVerifier('teacher');
const verifyAdminToken   = makeVerifier('admin');
const verifyHODToken     = makeVerifier('hod');
const verifyExamToken    = makeVerifier('exam');
const verifyFinanceToken = makeVerifier('finance');
const verifyEmployeeToken = makeVerifier('employee');

module.exports = {
  verifyStudentToken,
  verifyTeacherToken,
  verifyAdminToken,
  verifyHODToken,
  verifyExamToken,
  verifyFinanceToken,
  verifyEmployeeToken,
};
