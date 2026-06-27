import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';
const rateLimitEnabled = process.env.RATE_LIMIT === 'true';

/** General API limit — disabled in local dev unless RATE_LIMIT=true */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10_000 : 500,
  skip: () => isDev && !rateLimitEnabled,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.' },
});

/** Stricter limit for login/register — brute-force protection in production */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1_000 : 30,
  skip: () => isDev && !rateLimitEnabled,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts. Please try again later.' },
});
