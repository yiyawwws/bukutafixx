require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const uploadRoutes    = require('./routes/uploads');
const authRoutes      = require('./routes/auth');
const userRoutes      = require('./routes/users');
const bookRoutes      = require('./routes/books');
const cartRoutes      = require('./routes/cart');
const orderRoutes     = require('./routes/orders');
const reviewRoutes    = require('./routes/reviews');
const categoryRoutes  = require('./routes/categories');
const dashboardRoutes = require('./routes/dashboard');
const chatRoutes      = require('./routes/chats');
const payRoutes       = require('./routes/pay');
const disputeRoutes   = require('./routes/dispute');
const escrowRoutes      = require('./routes/escrow');
const withdrawalRoutes  = require('./routes/withdrawal');
const ComplaintController = require('./controllers/ComplaintController');

const { authLimiter, apiLimiter } = require('./middleware/rateLimiter');
const cron = require('node-cron');
const { EscrowTransactionModel, SellerWalletModel } = require('./models/EscrowWalletModel');

// ─── Auto-Release Escrow Cron ──────────────────────────────
// Runs every hour. Finds escrow records past auto_release_at and releases them.
cron.schedule('0 * * * *', async () => {
  console.log('[Cron] Running escrow auto-release check...');
  try {
    const expired = await EscrowTransactionModel.findExpiredHeld();
    if (expired.length === 0) {
      console.log('[Cron] No expired escrow found.');
      return;
    }
    console.log(`[Cron] Found ${expired.length} escrow(s) to auto-release.`);
    const pool = require('./config/database');
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const escrow of expired) {
        const released = await EscrowTransactionModel.release(connection, escrow.id);
        if (released) {
          await SellerWalletModel.createIfNotExists(connection, escrow.seller_id);
          await SellerWalletModel.credit(connection, escrow.seller_id, parseFloat(escrow.amount));
          // Mark order as delivered
          await connection.query(
            `UPDATE orders SET delivery_status = 'delivered' WHERE id = ? AND delivery_status != 'delivered'`,
            [escrow.order_id]
          );
          console.log(`[Cron] Auto-released escrow #${escrow.id} → seller #${escrow.seller_id} (+${escrow.amount})`);
        }
      }
      await connection.commit();
      console.log('[Cron] Auto-release complete.');
    } catch (err) {
      await connection.rollback();
      console.error('[Cron] Auto-release transaction error:', err.message);
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('[Cron] Auto-release check failed:', err.message);
  }
});



const app = express();

// ─── CORS ─────────────────────────────────────────────────
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  'http://localhost:5173,http://localhost:3000,http://192.168.1.13:5173'
).split(',').map((o) => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' tidak diizinkan`));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Security Headers ─────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// ─── Static Files (uploads) ───────────────────────────────
// Public: avatars dan cover buku boleh publik
app.use('/uploads/avatars', express.static(path.join(__dirname, '../uploads/avatars')));
app.use('/uploads/books',   express.static(path.join(__dirname, '../uploads/books')));
// KTM: PRIVATE — diakses via /api/uploads/ktms/:filename dengan JWT

// ─── Request Logger ───────────────────────────────────────
app.use((req, _res, next) => {
  const ts = new Date().toISOString();
  const ip = req.ip || req.socket?.remoteAddress || '-';
  console.log(`${ts} [${req.method}] ${req.path} — ${ip}`);
  next();
});

// ─── Rate Limiting ────────────────────────────────────────
app.use('/api/auth/login', authLimiter);      // proteksi brute force login
app.use('/api/auth/register', authLimiter);   // proteksi brute force register
app.use('/api', apiLimiter);                  // proteksi umum

// ─── Routes ───────────────────────────────────────────────
app.use('/api/uploads',    uploadRoutes);
app.use('/api/auth',       authRoutes);
app.use('/api/users',      userRoutes);
app.use('/api/books',      bookRoutes);
const reviewOrdersRoute = require('./routes/reviewOrders');
app.use('/api/reviews',    reviewOrdersRoute); // GET/POST /api/reviews/order/:orderId
app.use('/api/books',      reviewRoutes);  // GET/POST /api/books/:book_id/reviews
app.use('/api/cart',       cartRoutes);
app.use('/api/orders',     orderRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/dashboard',  dashboardRoutes);
app.use('/api/chats',      chatRoutes);    // chat internal (tetap ada)
app.use('/api/pay',        payRoutes);     // pembayaran manual
app.use('/api/dispute',    disputeRoutes);
app.use('/api/escrow',     escrowRoutes);
app.use('/api/withdrawal', withdrawalRoutes);

// ─── GET /api/complaints (Admin only) ─────────────────────
const { verifyToken } = require('./middleware/auth');
app.get('/api/complaints', verifyToken, ComplaintController.getAllComplaints);

// ─── Health Check ─────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Bukuta API is running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// ─── 404 Handler ─────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route tidak ditemukan' });
});

// ─── Global Error Handler ─────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(`[Global Error] ${req.method} ${req.path}`);
  console.error('Error:', err.message);
  if (process.env.NODE_ENV !== 'production') {
    console.error('Stack:', err.stack);
  }

  // Jangan expose detail error di production
  const message = process.env.NODE_ENV === 'production'
    ? 'Terjadi kesalahan pada server'
    : err.message;

  res.status(err.status || 500).json({ success: false, message });
});

// ─── HTTP Server + Socket.IO ──────────────────────────────
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,  // Hanya izinkan origin yang sama dengan REST API
    credentials: true,
    methods: ['GET', 'POST'],
  },
  // Batasi ukuran pesan Socket.IO
  maxHttpBufferSize: 1e6, // 1 MB
});

const pool = require('./config/database');

// ─── Socket.IO Auth Middleware ─────────────────────────────
io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.user?.id;
  console.log(`🔌 User connected: ${socket.id} (userId: ${userId})`);

  // Join personal room untuk notifikasi
  if (userId) {
    socket.join(`user_${userId}`);
  }

  // Join specific chat room
  socket.on('join_chat', (chatId) => {
    const safeId = parseInt(chatId);
    if (!isNaN(safeId)) {
      socket.join(`chat_${safeId}`);
      console.log(`Socket ${socket.id} joined chat_${safeId}`);
    }
  });

  // Handle send message — dengan validasi JWT (sudah via middleware di atas)
  socket.on('send_message', async (data) => {
    try {
      const { chat_id, receiver_id, text } = data;
      const sender_id = socket.user.id; // dari JWT, bukan dari client

      if (!chat_id || !text || typeof text !== 'string' || text.trim().length === 0) {
        return socket.emit('error', { message: 'Data pesan tidak valid' });
      }

      const safeText = text.trim().slice(0, 2000); // batasi 2000 karakter

      // Verifikasi bahwa user adalah bagian dari chat ini
      const [chatAuth] = await pool.query(
        'SELECT id FROM chats WHERE id = ? AND (buyer_id = ? OR seller_id = ?)',
        [chat_id, sender_id, sender_id]
      );
      if (chatAuth.length === 0) {
        return socket.emit('error', { message: 'Akses chat ditolak' });
      }

      const [result] = await pool.query(
        'INSERT INTO messages (chat_id, sender_id, text) VALUES (?, ?, ?)',
        [chat_id, sender_id, safeText]
      );

      const [newMsg] = await pool.query('SELECT * FROM messages WHERE id = ?', [result.insertId]);
      const message = newMsg[0];

      io.to(`chat_${chat_id}`).emit('receive_message', message);

      if (receiver_id) {
        io.to(`user_${receiver_id}`).emit('new_chat_notification', message);
      }
    } catch (err) {
      console.error('[Socket send_message error]', err.message);
      socket.emit('error', { message: 'Gagal mengirim pesan' });
    }
  });

  socket.on('typing', ({ chat_id, }) => {
    const safeId = parseInt(chat_id);
    if (!isNaN(safeId)) {
      socket.to(`chat_${safeId}`).emit('typing', socket.user.id);
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔴 User disconnected: ${socket.id} (userId: ${userId})`);
  });
});

// ─── Start Server ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`🚀 Bukuta API running on http://${HOST}:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 Allowed Origins: ${allowedOrigins.join(', ')}`);
});

module.exports = { app, server };
