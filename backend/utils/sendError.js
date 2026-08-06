// Prevents raw driver/programming error text (potential stack-trace/internal
// detail leakage) from reaching clients in production, while still surfacing
// the real message in development. Always logs server-side either way.
function sendServerError(res, err, fallback = 'Something went wrong. Please try again later.') {
  console.error(err);
  const message = process.env.NODE_ENV === 'production' ? fallback : (err?.message || fallback);
  return res.status(500).json({ message });
}

module.exports = { sendServerError };
