// Reset Password Rate Limiter
// Client-side localStorage tracking for UX feedback.
// Supabase's built-in server-side rate limiting is the actual abuse prevention layer.

const STORAGE_KEY = 'dafolle_reset_attempts';
export const MAX_ATTEMPTS = 3;            // Max reset links per window
export const WINDOW_MS = 60 * 60 * 1000;  // 1 hour rolling window
export const COOLDOWN_MS = 60 * 1000;     // 60s cooldown between sends

/**
 * Get all attempts for a specific email within the active time window.
 */
export function getRecentAttempts(email) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw);
    const now = Date.now();
    return all.filter(
      (a) => a.email === email.toLowerCase() && now - a.timestamp < WINDOW_MS
    );
  } catch {
    return [];
  }
}

/**
 * Record a new reset attempt for the given email.
 * Call this AFTER a successful Supabase reset call.
 */
export function recordAttempt(email) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    // Prune expired entries to prevent localStorage bloat
    const valid = all.filter((a) => now - a.timestamp < WINDOW_MS);
    valid.push({ email: email.toLowerCase(), timestamp: now });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
  } catch {
    // localStorage unavailable (incognito, full, etc.) — fail silently
  }
}

/**
 * Check whether a reset link can be sent for the given email.
 * Returns a status object the UI can use directly.
 */
export function canSendReset(email) {
  const attempts = getRecentAttempts(email);

  // Hard limit reached
  if (attempts.length >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      reason: 'limit',
      remaining: 0,
      waitSeconds: 0,
      attempts,
    };
  }

  // Per-send cooldown (matches Supabase's default 60s per-email limit)
  if (attempts.length > 0) {
    const lastAttempt = attempts[attempts.length - 1];
    const elapsed = Date.now() - lastAttempt.timestamp;
    if (elapsed < COOLDOWN_MS) {
      const waitSeconds = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
      return {
        allowed: false,
        reason: 'cooldown',
        remaining: MAX_ATTEMPTS - attempts.length,
        waitSeconds,
        attempts,
      };
    }
  }

  return {
    allowed: true,
    reason: null,
    remaining: MAX_ATTEMPTS - attempts.length,
    waitSeconds: 0,
    attempts,
  };
}
