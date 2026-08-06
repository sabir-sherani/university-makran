// Guards for the "hard delete" endpoints — a record with any real activity
// tied to it (fees, attendance, results, degrees, ...) may only be archived,
// never permanently deleted, so that history stays intact.

async function studentHasLinkedRecords(student) {
  const FeeChallan = require('../models/FeeChallan');
  const FeeRecord = require('../models/FeeRecord');
  const AssignmentSubmission = require('../models/AssignmentSubmission');
  const Attendance = require('../models/Attendance');
  const ResultSheet = require('../models/ResultSheet');

  const [challan, feeRecord, submission, attendance, resultSheet] = await Promise.all([
    FeeChallan.exists({ student: student._id }),
    FeeRecord.exists({ student: student._id }),
    AssignmentSubmission.exists({ studentId: student._id }),
    Attendance.exists({ 'records.registrationNo': student.registrationNo }),
    ResultSheet.exists({ 'entries.registrationNo': student.registrationNo }),
  ]);
  return !!(challan || feeRecord || submission || attendance || resultSheet);
}

async function teacherHasLinkedRecords(teacher) {
  const Result = require('../models/Result');
  const Assignment = require('../models/Assignment');
  const Attendance = require('../models/Attendance');
  const ResultSheet = require('../models/ResultSheet');
  const OngoingClass = require('../models/OngoingClass');

  const [result, assignment, attendance, resultSheet, ongoing] = await Promise.all([
    Result.exists({ uploadedBy: teacher._id }),
    Assignment.exists({ uploadedBy: teacher._id }),
    Attendance.exists({ teacher: teacher._id }),
    ResultSheet.exists({ teacher: teacher._id }),
    OngoingClass.exists({ teacher: teacher._id }),
  ]);
  return !!(result || assignment || attendance || resultSheet || ongoing);
}

async function hodHasLinkedRecords(hod) {
  const CorrectionRequest = require('../models/CorrectionRequest');
  const reviewed = await CorrectionRequest.exists({ reviewedBy: hod._id, reviewerRole: 'hod' });
  return !!reviewed;
}

async function examStaffHasLinkedRecords(staff) {
  const DegreeVerification = require('../models/DegreeVerification');
  const CorrectionRequest = require('../models/CorrectionRequest');

  const [degree, reviewed] = await Promise.all([
    DegreeVerification.exists({ issuedBy: staff._id }),
    CorrectionRequest.exists({ reviewedBy: staff._id, reviewerRole: 'exam' }),
  ]);
  return !!(degree || reviewed);
}

async function financeStaffHasLinkedRecords(staff) {
  const FeeChallan = require('../models/FeeChallan');
  const FeeRecord = require('../models/FeeRecord');
  const FeeStructure = require('../models/FeeStructure');

  const [challan, record, structure] = await Promise.all([
    FeeChallan.exists({ generatedBy: staff._id }),
    FeeRecord.exists({ updatedBy: staff._id }),
    FeeStructure.exists({ createdBy: staff._id }),
  ]);
  return !!(challan || record || structure);
}

module.exports = {
  studentHasLinkedRecords,
  teacherHasLinkedRecords,
  hodHasLinkedRecords,
  examStaffHasLinkedRecords,
  financeStaffHasLinkedRecords,
};
