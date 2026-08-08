const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  room_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  check_in: { type: String, required: true },   // เก็บเป็น 'YYYY-MM-DD' เหมือนของเดิม
  check_out: { type: String, required: true },
  rooms_count: { type: Number, default: 1 },
  adults: { type: Number, default: 1 },
  total_price: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Booking', bookingSchema);
