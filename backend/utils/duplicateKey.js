// Consistent handling for MongoDB E11000 duplicate-key errors across every
// route — turns the raw driver error into a friendly message naming the
// field (and its value) that collided.
function isDuplicateKeyError(err) {
  return !!err && err.code === 11000;
}

function fieldLabel(field) {
  return field
    .replace(/Id$/, ' ID')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function duplicateKeyMessage(err) {
  const field = err?.keyValue ? Object.keys(err.keyValue)[0] : null;
  if (!field) return 'A record with these details already exists.';
  const value = err.keyValue[field];
  return `${fieldLabel(field)} "${value}" is already in use.`;
}

module.exports = { isDuplicateKeyError, duplicateKeyMessage, fieldLabel };
