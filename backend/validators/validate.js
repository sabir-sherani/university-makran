const { validationResult } = require('express-validator');

// Runs after a route's validator chains; short-circuits with a 400 and a
// field-by-field errors object if any chain failed, otherwise calls next().
module.exports = function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = {};
  result.array({ onlyFirstError: true }).forEach((err) => {
    const field = err.path || err.param || 'form';
    if (!errors[field]) errors[field] = err.msg;
  });

  return res.status(400).json({ message: 'Validation failed.', errors });
};
