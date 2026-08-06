const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { verifyEmployeeToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiters');
const { isLocked, lockRemainingMinutes, recordFailedAttempt, resetFailedAttempts } = require('../middleware/accountLockout');

// Employee login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    const empId = String(req.body.empId || '').trim().toUpperCase();
    const employee = await Employee.findOne({ empId });

    if (!employee) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (employee.isActive === false) return res.status(403).json({ message: 'This account has been archived. Contact admin.' });

    if (isLocked(employee)) {
      return res.status(423).json({ message: `Account locked due to too many failed attempts. Try again in ${lockRemainingMinutes(employee)} minute(s).` });
    }

    const validPassword = await bcrypt.compare(password, employee.password);
    if (!validPassword) {
      await recordFailedAttempt(employee);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    await resetFailedAttempts(employee);

    if (employee.status !== 'active') {
      return res.status(403).json({ message: 'Your account is not active. Contact admin.' });
    }

    const token = jwt.sign(
      { id: employee._id, role: 'employee', empId: employee.empId, tokenVersion: employee.tokenVersion || 0 },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );
    res.json({
      token,
      employee: {
        name: employee.name,
        empId: employee.empId,
        designation: employee.designation,
        department: employee.department,
        courses: employee.courses,
      }
    });
  } catch (error) {
    res.sendServerError(error);
  }
});

// Get employee profile — an employee may only ever fetch their own record.
router.get('/:id', verifyEmployeeToken, async (req, res) => {
  try {
    if (req.params.id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: you may only view your own profile.' });
    }
    const employee = await Employee.findById(req.params.id).select('-password');
    if (!employee) return res.status(404).json({ message: 'Employee not found.' });
    res.json(employee);
  } catch (error) {
    res.sendServerError(error);
  }
});

module.exports = router;
