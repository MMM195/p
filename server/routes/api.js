const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const User = require('../models/User');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function serializeRoom(room) {
  return {
    id: room._id.toString(),
    number: room.number,
    name: room.name,
    category: room.category,
    category_label: room.category_label,
    scene_class: room.scene_class,
    image: room.image,
    description: room.description,
    price: room.price,
    capacity: room.capacity,
    beds: room.beds,
    quantity: room.quantity,
    available: room.available,
  };
}

// =====================================================================
// ROOMS
// =====================================================================

router.get('/rooms', async (req, res) => {
  const rooms = await Room.find().sort({ number: 1 });
  res.json(rooms.map(serializeRoom));
});

router.get('/room', async (req, res) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'ไม่พบรหัสห้องพัก' });
  }
  if (!mongoose.isValidObjectId(id)) {
    return res.status(404).json({ error: 'ไม่พบห้องพักนี้' });
  }

  const room = await Room.findById(id);
  if (!room) {
    return res.status(404).json({ error: 'ไม่พบห้องพักนี้' });
  }

  res.json(serializeRoom(room));
});

router.post('/create-room', requireAdmin, async (req, res) => {
  const {
    number, name, category, category_label: categoryLabel,
    scene_class: sceneClass, image, description,
  } = req.body || {};
  const price = Number(req.body?.price);
  const capacity = Number(req.body?.capacity);
  const beds = Number(req.body?.beds) || 1;
  const quantity = req.body?.quantity != null && req.body.quantity !== ''
    ? Number(req.body.quantity)
    : null;
  const available = req.body?.available !== undefined ? !!req.body.available : true;

  if (!number || !name || !category || !categoryLabel || !price || !capacity) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลห้องพักให้ครบถ้วน (เลขห้อง ชื่อ ประเภท ราคา จำนวนผู้เข้าพัก)' });
  }

  const room = await Room.create({
    number, name, category,
    category_label: categoryLabel,
    scene_class: sceneClass || '',
    image: image || '',
    description: description || '',
    price, capacity, beds, quantity, available,
  });

  res.json(serializeRoom(room));
});

router.post('/update-room', requireAdmin, async (req, res) => {
  const { id } = req.body || {};
  if (!id || !mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'ไม่พบรหัสห้องพัก' });
  }

  const allowedFields = [
    'number', 'name', 'category', 'image', 'description',
    'price', 'capacity', 'beds', 'quantity', 'available',
  ];
  const update = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) update[field] = req.body[field];
  }
  if (req.body.category_label !== undefined) update.category_label = req.body.category_label;
  if (req.body.scene_class !== undefined) update.scene_class = req.body.scene_class;

  const room = await Room.findByIdAndUpdate(id, update, { new: true });
  if (!room) {
    return res.status(404).json({ error: 'ไม่พบห้องพักนี้' });
  }

  res.json(serializeRoom(room));
});

router.post('/delete-room', requireAdmin, async (req, res) => {
  const { id } = req.body || {};
  if (!id || !mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'ไม่พบรหัสห้องพัก' });
  }

  const room = await Room.findByIdAndDelete(id);
  if (!room) {
    return res.status(404).json({ error: 'ไม่พบห้องพักนี้' });
  }

  res.json({ ok: true });
});

router.post('/create-booking', requireAuth, async (req, res) => {
  const { room_id: roomId, check_in: checkIn, check_out: checkOut } = req.body || {};
  const roomsCount = Math.max(1, parseInt(req.body?.rooms_count, 10) || 1);
  const adults = Math.max(1, parseInt(req.body?.adults, 10) || 1);

  if (!roomId || !checkIn || !checkOut) {
    return res.status(400).json({ error: 'ข้อมูลการจองไม่ครบถ้วน' });
  }

  const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
  if (nights <= 0) {
    return res.status(400).json({ error: 'วันออกต้องหลังวันเข้าพัก' });
  }

  if (!mongoose.isValidObjectId(roomId)) {
    return res.status(404).json({ error: 'ไม่พบห้องพักนี้' });
  }
  const room = await Room.findById(roomId);
  if (!room) {
    return res.status(404).json({ error: 'ไม่พบห้องพักนี้' });
  }

  const totalPrice = room.price * roomsCount * nights;

  const booking = await Booking.create({
    user_id: req.session.userId,
    room_id: roomId,
    check_in: checkIn,
    check_out: checkOut,
    rooms_count: roomsCount,
    adults,
    total_price: totalPrice,
    status: 'pending',
  });

  res.json({
    id: booking._id.toString(),
    total_price: totalPrice,
    nights,
  });
});

router.get('/bookings', requireAuth, async (req, res) => {
  const bookings = await Booking.find({ user_id: req.session.userId })
    .sort({ created_at: -1 })
    .populate('room_id');

  const result = bookings.map((b) => ({
    id: b._id.toString(),
    check_in: b.check_in,
    check_out: b.check_out,
    rooms_count: b.rooms_count,
    adults: b.adults,
    total_price: b.total_price,
    status: b.status,
    created_at: b.created_at,
    room: b.room_id ? {
      name: b.room_id.name,
      number: b.room_id.number,
      category_label: b.room_id.category_label,
      price: b.room_id.price,
    } : null,
  }));

  res.json(result);
});

router.post('/cancel-booking', requireAuth, async (req, res) => {
  const { id } = req.body || {};
  if (!id || !mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'ไม่พบรหัสการจอง' });
  }

  const booking = await Booking.findOneAndUpdate(
    { _id: id, user_id: req.session.userId },
    { status: 'cancelled' }
  );

  if (!booking) {
    return res.status(404).json({ error: 'ไม่พบรายการจองนี้ หรือคุณไม่มีสิทธิ์ยกเลิก' });
  }

  res.json({ ok: true });
});

// =====================================================================
// ADMIN
// =====================================================================

router.get('/admin-bookings', requireAdmin, async (req, res) => {
  const { status } = req.query;
  const allowed = ['pending', 'confirmed', 'cancelled'];

  const filter = {};
  if (status && allowed.includes(status)) {
    filter.status = status;
  }

  const bookings = await Booking.find(filter)
    .sort({ created_at: -1 })
    .populate('room_id')
    .populate('user_id');

  const result = bookings.map((b) => ({
    id: b._id.toString(),
    check_in: b.check_in,
    check_out: b.check_out,
    rooms_count: b.rooms_count,
    adults: b.adults,
    total_price: b.total_price,
    status: b.status,
    created_at: b.created_at,
    user: b.user_id ? {
      name: b.user_id.full_name,
      email: b.user_id.email,
    } : null,
    room: b.room_id ? {
      name: b.room_id.name,
      number: b.room_id.number,
      category_label: b.room_id.category_label,
    } : null,
  }));

  res.json(result);
});

router.post('/update-booking-status', requireAdmin, async (req, res) => {
  const { id, status } = req.body || {};
  const allowed = ['pending', 'confirmed', 'cancelled'];

  if (!id || !allowed.includes(status) || !mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง' });
  }

  const booking = await Booking.findByIdAndUpdate(id, { status });
  if (!booking) {
    return res.status(404).json({ error: 'ไม่พบรายการจองนี้' });
  }

  res.json({ ok: true });
});

// =====================================================================
// AUTH
// =====================================================================

router.post('/register', async (req, res) => {
  const fullName = (req.body?.full_name || '').trim();
  const email = (req.body?.email || '').trim().toLowerCase();
  const password = req.body?.password || '';

  if (!fullName || !email || password.length < 6) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน (รหัสผ่านอย่างน้อย 6 ตัวอักษร)' });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ error: 'อีเมลนี้ถูกใช้สมัครแล้ว' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ full_name: fullName, email, password_hash: passwordHash });

  req.session.userId = user._id.toString();

  res.json({ id: user._id.toString(), full_name: user.full_name, email: user.email });
});

router.post('/login', async (req, res) => {
  const email = (req.body?.email || '').trim().toLowerCase();
  const password = req.body?.password || '';

  const user = await User.findOne({ email });
  const ok = user && await bcrypt.compare(password, user.password_hash);

  if (!ok) {
    return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
  }

  req.session.userId = user._id.toString();

req.session.save((err) => {
  if (err) {
    console.error('Session save error:', err);
    return res.status(500).json({
      error: 'ไม่สามารถสร้าง session ได้'
    });
  }

  res.json({
    id: user._id.toString(),
    full_name: user.full_name,
    email: user.email,
    is_admin: !!user.is_admin,
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

router.get('/session', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.json({ user: null });
  }

  const user = await User.findById(req.session.userId).select('full_name email is_admin');
  if (!user) {
    return res.json({ user: null });
  }

  res.json({
    user: {
      id: user._id.toString(),
      full_name: user.full_name,
      email: user.email,
      is_admin: !!user.is_admin,
    },
  });
});

// =====================================================================
// REVIEWS
// =====================================================================

router.get('/reviews', async (req, res) => {
  const reviews = await Review.find()
    .sort({ created_at: -1 })
    .limit(30)
    .populate('user_id');

  const result = reviews.map((r) => ({
    id: r._id.toString(),
    content: r.content,
    created_at: r.created_at,
    full_name: r.user_id ? r.user_id.full_name : null,
  }));

  res.json(result);
});

router.post('/create-review', requireAuth, async (req, res) => {
  const content = (req.body?.content || '').trim();

  if (!content) {
    return res.status(400).json({ error: 'กรุณากรอกความคิดเห็น' });
  }
  if (content.length > 500) {
    return res.status(400).json({ error: 'รีวิวยาวเกินไป (ไม่เกิน 500 ตัวอักษร)' });
  }

  const review = await Review.create({ user_id: req.session.userId, content });
  res.json({ id: review._id.toString() });
});

module.exports = router;
