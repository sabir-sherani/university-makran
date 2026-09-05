// Formats an axios error into a single display string, appending field-level
// validation detail when the API returned it — the express-validator
// `validate` middleware's { message, errors: {field: msg} } shape, or a
// plain { message, errors: [msg, ...] } array shape.
export default function formatApiError(err, fallback) {
  const data = err.response?.data;
  if (!data) return fallback;
  let detail = '';
  if (Array.isArray(data.errors)) detail = data.errors.join(' · ');
  else if (data.errors && typeof data.errors === 'object') detail = Object.values(data.errors).join(' · ');
  return detail ? `${data.message} ${detail}` : (data.message || fallback);
}
