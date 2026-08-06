// Escapes regex metacharacters so a string is safe to interpolate into a
// $regex query or `new RegExp()` — prevents both malformed-pattern errors
// and regex-injection/ReDoS from user- or DB-controlled values.
function escapeRegex(str) {
  return String(str == null ? '' : str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { escapeRegex };
