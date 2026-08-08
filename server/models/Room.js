const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  number: { type: String, required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },        // เช่น 'วิวเมือง', 'ริมแม่น้ำ'
  category_label: { type: String, required: true },   // ข้อความแสดงผล เช่น 'Queen City View'
  scene_class: { type: String, default: '' },
  image: { type: String, default: '' },
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  capacity: { type: Number, required: true },
  beds: { type: Number, required: true, default: 1 },
  quantity: { type: Number, default: null },
  available: { type: Boolean, default: true },
});

module.exports = mongoose.model('Room', roomSchema);
