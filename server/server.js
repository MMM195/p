require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const connectDB = require('./config/db');
const apiRoutes = require('./routes/api');

const app = express();
app.set('trust proxy', 1);
app.set('etag', false);
const isProd = process.env.NODE_ENV === 'production';

// รองรับหลาย origin คั่นด้วยลูกน้ำใน .env เช่น FRONTEND_ORIGIN=https://a.com,https://b.com
const allowedOrigins = (process.env.FRONTEND_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
  credentials: true,
}));

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'change-me',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: {
    httpOnly: true,
    secure: isProd,                       // ต้องเป็น true เมื่อรันบน https จริง
    sameSite: isProd ? 'none' : 'lax',    // 'none' จำเป็นถ้า frontend/backend คนละโดเมนบน https
    maxAge: 1000 * 60 * 60 * 24 * 7,      // 7 วัน
  },
}));

// คง path เดิมไว้ทั้งหมด (เช่น /api/rooms.php) เพื่อให้ frontend เดิมเรียกได้โดยไม่ต้องแก้ endpoint
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.json({ ok: true, message: 'PreferRent API (Node.js + MongoDB) กำลังทำงาน' });
});

// error handler กลาง — ครอบคลุม error ที่หลุดมาจาก route ต่างๆ
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' });
});

const PORT = process.env.PORT || 4000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`PreferRent API รันที่ http://localhost:${PORT}`);
  });
});
