const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Employee login
router.post('/login', async (req, res) => {
  try {
    const { empId, password } = req.body;
    const employee = await Employee.findOne({ empId });
    
    if (!employee) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, employee.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ empId: employee._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
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
    res.status(500).json({ message: error.message });
  }
});

// Get employee profile
router.get('/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
