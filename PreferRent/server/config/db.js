const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('ไม่พบ MONGODB_URI ใน .env — กรุณาตั้งค่าก่อนรัน server');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('เชื่อมต่อ MongoDB สำเร็จ');
  } catch (err) {
    console.error('เชื่อมต่อ MongoDB ไม่สำเร็จ:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
