// Canonical enum whitelists shared between express-validator chains
// (validators/fields.js) and Mongoose schema `enum` definitions, so both
// layers can never drift apart.
module.exports = {
  GENDER: ['Male', 'Female', 'Other'],
  TIME_SESSION: ['Morning', 'Evening'],
  STUDENT_STATUS: ['pending', 'approved', 'rejected', 'suspended'],
  TEACHER_STATUS: ['pending', 'approved', 'rejected'],
  STAFF_STATUS: ['active', 'inactive'], // HOD, ExaminationStaff, FinanceStaff
  ADMISSION_STATUS: ['pending', 'approved', 'rejected'],
  EMPLOYEE_STATUS: ['active', 'inactive'],
};
