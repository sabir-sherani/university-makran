// Reusable express-validator field chains shared across every write route.
// Each builder returns a configured chain; pass { optional: true } to make
// the field validate-if-present instead of required.
const { body } = require('express-validator');

const REGISTRATION_NO_REGEX = /^UOM-\d{4}-\d{4}$/; // e.g. UOM-2024-0001
const CNIC_REGEX = /^\d{5}-\d{7}-\d{1}$/;           // e.g. 12345-1234567-1
const PHONE_REGEX = /^03\d{9}$/;                    // normalized: 03XXXXXXXXX (11 digits)
const NAME_REGEX = /^[A-Za-z][A-Za-z .-]*$/; // letters, spaces, dots, hyphens (must start with a letter)
const PASSWORD_CONTENT_REGEX = /(?=.*[A-Za-z])(?=.*\d)/; // at least one letter + one digit

const MIN_AGE_YEARS = 15;
const MAX_AGE_YEARS = 60;
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/** Normalizes any accepted Pakistani mobile format to canonical 03XXXXXXXXX (11 digits, no separators). */
function normalizePhone(raw) {
  let v = String(raw == null ? '' : raw).replace(/[\s-]/g, '');
  if (v.startsWith('+92')) v = '0' + v.slice(3);
  else if (v.startsWith('0092')) v = '0' + v.slice(4);
  else if (/^92\d{10}$/.test(v)) v = '0' + v.slice(2);
  return v;
}

function baseChain(field, optional) {
  const chain = body(field);
  return optional
    ? chain.optional({ checkFalsy: true })
    : chain.exists({ checkFalsy: true }).withMessage(`${field} is required.`);
}

function registrationNo(field = 'registrationNo', { optional = false } = {}) {
  return baseChain(field, optional)
    .trim()
    .customSanitizer((v) => (typeof v === 'string' ? v.toUpperCase() : v))
    .matches(REGISTRATION_NO_REGEX)
    .withMessage(`${field} must be in the format UOM-YYYY-NNNN (e.g. UOM-2024-0001).`);
}

// Canonical PREFIX-XXXX id formats for staff/teacher ids. Each allows 2-20
// trailing alphanumerics/hyphens so both "TCH-001" and "TCH-CS-001" style
// values are accepted, while still rejecting arbitrary free text.
function prefixedIdRegex(prefix) {
  return new RegExp(`^${prefix}-[A-Z0-9-]{2,20}$`);
}

const TEACHER_ID_REGEX = prefixedIdRegex('TCH');
const HOD_ID_REGEX = prefixedIdRegex('HOD');
const EXAM_ID_REGEX = prefixedIdRegex('EXAM');
const FINANCE_ID_REGEX = prefixedIdRegex('FIN');
const EMP_ID_REGEX = prefixedIdRegex('EMP');

/** Builds a validator for a canonical PREFIX-XXXX id: uppercases, trims, and enforces the format. */
function prefixedId(field, prefix, { optional = false } = {}) {
  return baseChain(field, optional)
    .trim()
    .customSanitizer((v) => (typeof v === 'string' ? v.toUpperCase() : v))
    .matches(prefixedIdRegex(prefix))
    .withMessage(`${field} must be in the format ${prefix}-XXXX (e.g. ${prefix}-001).`);
}

function teacherId(field = 'teacherId', opts = {}) { return prefixedId(field, 'TCH', opts); }
function hodId(field = 'hodId', opts = {}) { return prefixedId(field, 'HOD', opts); }
function examId(field = 'examId', opts = {}) { return prefixedId(field, 'EXAM', opts); }
function financeId(field = 'financeId', opts = {}) { return prefixedId(field, 'FIN', opts); }
function empId(field = 'empId', opts = {}) { return prefixedId(field, 'EMP', opts); }

function cnic(field = 'cnic', { optional = false } = {}) {
  return baseChain(field, optional)
    .trim()
    .matches(CNIC_REGEX)
    .withMessage(`${field} must be in the format 12345-1234567-1.`);
}

function phone(field = 'phone', { optional = false } = {}) {
  return baseChain(field, optional)
    .trim()
    .customSanitizer(normalizePhone)
    .matches(PHONE_REGEX)
    .withMessage(`${field} must be a valid Pakistani mobile number (03XX-XXXXXXX or +923XXXXXXXXX).`);
}

/** For fullName / fatherName style fields. */
function personName(field, { optional = false } = {}) {
  return baseChain(field, optional)
    .trim()
    .isLength({ min: 3, max: 60 })
    .withMessage(`${field} must be between 3 and 60 characters.`)
    .matches(NAME_REGEX)
    .withMessage(`${field} may only contain letters, spaces, dots, and hyphens.`);
}

/**
 * ISO date, must be in the past, age must fall between 15 and 60 years.
 * Pass { toDate: false } to keep the field as a validated ISO string
 * (use this for schemas where the underlying field type is String).
 */
function dateOfBirth(field = 'dateOfBirth', { optional = false, toDate = true } = {}) {
  let chain = baseChain(field, optional)
    .isISO8601()
    .withMessage(`${field} must be a valid date (YYYY-MM-DD).`)
    .custom((value) => {
      const d = new Date(value);
      const now = new Date();
      if (d >= now) throw new Error(`${field} must be a date in the past.`);
      const age = (now - d) / MS_PER_YEAR;
      if (age < MIN_AGE_YEARS || age > MAX_AGE_YEARS) {
        throw new Error(`Age must be between ${MIN_AGE_YEARS} and ${MAX_AGE_YEARS} years.`);
      }
      return true;
    });
  if (toDate) chain = chain.toDate();
  return chain;
}

function email(field = 'email', { optional = false } = {}) {
  return baseChain(field, optional)
    .trim()
    .isEmail()
    .withMessage(`${field} must be a valid email address.`)
    .customSanitizer((v) => String(v).toLowerCase());
}

/** Min 8 chars, at least one letter and one number. */
function password(field = 'password', { optional = false } = {}) {
  return baseChain(field, optional)
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long.')
    .matches(PASSWORD_CONTENT_REGEX)
    .withMessage('Password must contain at least one letter and one number.');
}

function enumField(field, allowed, { optional = false } = {}) {
  return baseChain(field, optional)
    .trim()
    .isIn(allowed)
    .withMessage(`${field} must be one of: ${allowed.join(', ')}.`);
}

function requiredString(field, { min = 1, max = 200 } = {}) {
  return baseChain(field, false)
    .isString()
    .withMessage(`${field} must be text.`)
    .trim()
    .isLength({ min, max })
    .withMessage(`${field} must be between ${min} and ${max} characters.`);
}

function optionalString(field, { max = 500 } = {}) {
  return baseChain(field, true)
    .isString()
    .withMessage(`${field} must be text.`)
    .trim()
    .isLength({ max })
    .withMessage(`${field} must be at most ${max} characters.`);
}

function mongoId(field, { optional = false } = {}) {
  return baseChain(field, optional)
    .isMongoId()
    .withMessage(`${field} must be a valid id.`);
}

function nonEmptyArray(field, { optional = false } = {}) {
  const chain = body(field);
  return (optional ? chain.optional({ checkFalsy: true }) : chain.exists({ checkFalsy: true }).withMessage(`${field} is required.`))
    .isArray({ min: 1 })
    .withMessage(`${field} must be a non-empty array.`);
}

function numberInRange(field, { min, max, optional = true } = {}) {
  return baseChain(field, optional)
    .isFloat({ min, max })
    .withMessage(`${field} must be a number${min != null ? ` >= ${min}` : ''}${max != null ? ` and <= ${max}` : ''}.`)
    .toFloat();
}

module.exports = {
  registrationNo,
  cnic,
  phone,
  personName,
  dateOfBirth,
  email,
  password,
  enumField,
  requiredString,
  optionalString,
  mongoId,
  numberInRange,
  nonEmptyArray,
  normalizePhone,
  prefixedId,
  teacherId,
  hodId,
  examId,
  financeId,
  empId,
  REGISTRATION_NO_REGEX,
  CNIC_REGEX,
  PHONE_REGEX,
  NAME_REGEX,
  PASSWORD_CONTENT_REGEX,
  TEACHER_ID_REGEX,
  HOD_ID_REGEX,
  EXAM_ID_REGEX,
  FINANCE_ID_REGEX,
  EMP_ID_REGEX,
  MIN_AGE_YEARS,
  MAX_AGE_YEARS,
};
