// สคริปต์ใส่ข้อมูลตั้งต้น: ห้องพัก 12 ห้อง + บัญชีแอดมิน 1 บัญชี
// รันด้วยคำสั่ง: npm run seed
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const Room = require('./models/Room');
const User = require('./models/User');

const categories = [
  { key: 'queen-city',      category: 'วิวเมือง',  category_label: 'Queen City View',      beds: 1, capacity: 2, price: 1800, scene_class: 'scene-city' },
  { key: 'queen-river',     category: 'ริมแม่น้ำ', category_label: 'Queen Riverside View',  beds: 1, capacity: 2, price: 2200, scene_class: 'scene-river' },
  { key: 'king-city',       category: 'วิวเมือง',  category_label: 'King City View',        beds: 2, capacity: 3, price: 2300, scene_class: 'scene-city' },
  { key: 'king-river',      category: 'ริมแม่น้ำ', category_label: 'King Riverside View',   beds: 2, capacity: 3, price: 2700, scene_class: 'scene-river' },
];

async function seed() {
  await connectDB();

  await Room.deleteMany({});
  console.log('ล้างข้อมูลห้องพักเดิมแล้ว');

  const rooms = [];
  let roomNumber = 101;

  for (const cat of categories) {
    for (let i = 0; i < 3; i += 1) {
      rooms.push({
        number: String(roomNumber),
        name: `${cat.category_label} ${roomNumber}`,
        category: cat.category,
        category_label: cat.category_label,
        scene_class: cat.scene_class,
        image: '',
        description: `ห้องพัก ${cat.category_label} วิว${cat.category} บรรยากาศสบาย พร้อมสิ่งอำนวยความสะดวกครบครัน`,
        price: cat.price,
        capacity: cat.capacity,
        beds: cat.beds,
        quantity: 1,
        available: true,
      });
      roomNumber += 1;
    }
  }

  await Room.insertMany(rooms);
  console.log(`ใส่ข้อมูลห้องพักทั้งหมด ${rooms.length} ห้องเรียบร้อย`);

  // สร้างบัญชีแอดมินตัวอย่าง (เปลี่ยนอีเมล/รหัสผ่านก่อนใช้งานจริง!)
  const adminEmail = 'admin@preferrent.com';
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('admin2000', 10);
    await User.create({
      full_name: 'PreferRent Admin',
      email: adminEmail,
      password_hash: passwordHash,
      is_admin: true,
    });
    console.log(`สร้างบัญชีแอดมิน: ${adminEmail} / รหัสผ่าน: admin2000`);
  } else {
    console.log('มีบัญชีแอดมินอยู่แล้ว ข้ามการสร้างใหม่');
  }

  console.log('ใส่ข้อมูลตั้งต้นเสร็จสมบูรณ์');
  process.exit(0);
}

seed().catch((err) => {
  console.error('เกิดข้อผิดพลาดระหว่าง seed:', err);
  process.exit(1);
});
