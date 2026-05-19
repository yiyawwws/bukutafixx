const rateLimit = require('express-rate-limit');

// ─── Auth Rate Limiter ─────────────────────────────────────
// Batasi percobaan login/register: max 15 request per 15 menit per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan. Silakan coba lagi setelah 15 menit.'
  },
  skip: (req) => process.env.NODE_ENV === 'test',
});

// ─── General API Rate Limiter ──────────────────────────────
// Batasi request umum: max 200 request per menit per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak request. Silakan coba lagi sebentar.'
  },
  skip: (req) => process.env.NODE_ENV === 'test',
});

module.exports = { authLimiter, apiLimiter };
