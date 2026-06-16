// In-memory rate limiter for emergency creation.
// Prevents accidental or abusive triggers: max 3 per user per 15 minutes.
// Single-instance safe. Replace with Redis-backed limiter for multi-instance deployments.

const WINDOW_MS  = 15 * 60 * 1000; // 15 minutes
const MAX_HITS   = 3;

const store = new Map(); // userId → [timestamp, ...]

export const emergencyCreateRateLimit = (req, res, next) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const now       = Date.now();
  const cutoff    = now - WINDOW_MS;
  const history   = (store.get(userId) || []).filter(ts => ts > cutoff);

  if (history.length >= MAX_HITS) {
    const retryAfter = Math.ceil((history[0] + WINDOW_MS - now) / 1000);
    return res.status(429).json({
      success: false,
      message: `Too many emergency requests. Please wait ${retryAfter} seconds before trying again.`,
      retry_after_seconds: retryAfter,
    });
  }

  history.push(now);
  store.set(userId, history);
  next();
};
