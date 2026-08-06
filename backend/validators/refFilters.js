// "Active record" filters for the canonical lookup collections — shared by
// resolveRef() calls on write routes and by the /api/lookups read endpoints,
// so both agree on what counts as a selectable/valid record.
module.exports = {
  DEPARTMENT_ACTIVE: { suspended: { $ne: true }, deletedAt: null },
  PROGRAM_ACTIVE: { deletedAt: null },
  SESSION_ACTIVE: { isActive: true },
  SEMESTER_ACTIVE: { isActive: true },
  DESIGNATION_ACTIVE: { isActive: true },
};
