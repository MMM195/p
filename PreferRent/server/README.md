# PreferRent Server (Node.js + Express + MongoDB)

โปรเจกต์นี้แทนที่ backend เดิมที่เป็น PHP + MySQL ทั้งหมด โดย **endpoint ทุกตัวใช้ชื่อเดิม**
(เช่น `/api/rooms.php`, `/api/login.php`) เพื่อให้ไฟล์ frontend เดิม (`script.js`, `room-detail.js`,
`bookings.js`, `auth.js`, `admin.js`) เรียกใช้ได้โดยแทบไม่ต้องแก้โค้ดฝั่ง frontend เลย
สิ่งเดียวที่ต้องแก้คือค่า `API_BASE` ให้ชี้มาที่ URL ของ server ตัวนี้แทนของเดิม

## 1) เตรียมฐานข้อมูล MongoDB Atlas (ฟรี)

1. สมัครที่ https://www.mongodb.com/cloud/atlas/register
2. สร้าง Cluster แบบฟรี (M0)
3. ไปที่ **Database Access** → สร้าง user + password สำหรับเชื่อมต่อ
4. ไปที่ **Network Access** → เพิ่ม IP `0.0.0.0/0` (อนุญาตทุกที่ ใช้ตอนพัฒนา/โปรเจกต์เรียน) หรือใส่ IP ของโฮสต์จริงภายหลัง
5. กด **Connect** → **Drivers** → คัดลอก connection string เช่น
   `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/preferrent?retryWrites=true&w=majority`

## 2) ติดตั้งและตั้งค่าโปรเจกต์

```bash
cd server
npm install
cp .env.example .env
```

แก้ไฟล์ `.env`:
- `MONGODB_URI` — ใส่ connection string จากขั้นตอนที่ 1
- `SESSION_SECRET` — ใส่ข้อความสุ่มยาวๆ อะไรก็ได้
- `FRONTEND_ORIGIN` — URL ของหน้าเว็บ (ตอนทดสอบในเครื่องมักเป็น `http://127.0.0.1:5500`)

## 3) ใส่ข้อมูลตั้งต้น (ห้องพัก 12 ห้อง + บัญชีแอดมิน)

```bash
npm run seed
```

จะได้ห้องพัก 12 ห้อง (Queen/King × วิวเมือง/ริมแม่น้ำ) และบัญชีแอดมิน
`admin@preferrent.com` / `changeme123` — **เปลี่ยนรหัสผ่านทันทีหลัง login ครั้งแรก**

> ถ้ามีข้อมูลห้องพัก/รีวิวเดิมใน MySQL ที่อยากย้ายมาแบบเป๊ะๆ ส่งไฟล์ export (.sql หรือ .csv)
> มาให้ได้ ผมจะเขียนสคริปต์แปลงข้อมูลให้แทนการ seed ใหม่

## 4) รัน server

```bash
npm run dev     # โหมดพัฒนา (auto-reload ด้วย nodemon)
# หรือ
npm start       # โหมดปกติ
```

server จะรันที่ `http://localhost:4000` (หรือพอร์ตที่ตั้งใน `.env`)

## 5) แก้ฝั่ง frontend ให้ชี้มาที่ server ใหม่

หาไฟล์ที่ประกาศ `API_BASE` (มักอยู่ใน `auth.js` หรือไฟล์ config แยก) แล้วแก้เป็น:

```js
const API_BASE = 'http://localhost:4000/api'; // ตอนพัฒนา
// const API_BASE = 'https://your-deployed-server.onrender.com/api'; // ตอน deploy จริง
```

ไฟล์ frontend อื่นๆ ไม่ต้องแก้ เพราะ endpoint path เหมือนเดิมทุกตัว

## หมายเหตุสำคัญเรื่องรหัสผ่านผู้ใช้เดิม

ถ้าจะย้ายบัญชีผู้ใช้เดิมจาก MySQL (ตาราง `users`) มาที่ MongoDB โดยตรง — รหัสผ่านที่เข้ารหัสด้วย
PHP `password_hash()` เป็น bcrypt (`$2y$...`) ยังใช้ตรวจสอบผ่าน `bcryptjs` ในโปรเจกต์นี้ได้ปกติ
ไม่ต้องให้ผู้ใช้ตั้งรหัสผ่านใหม่ — แค่ import ค่า `password_hash` เดิมเข้าไปที่ field `password_hash`
ของ MongoDB ตรงๆ ได้เลย

## Deploy ขึ้นจริง

แนะนำ **Render** หรือ **Railway** (รองรับ Node.js ฟรีในระดับเริ่มต้น):
1. push โค้ดโฟลเดอร์ `server` นี้ขึ้น GitHub
2. เชื่อม repo กับ Render/Railway → ตั้งค่า Environment Variables ให้ตรงกับ `.env`
3. ตั้ง Build Command: `npm install`, Start Command: `npm start`
4. เมื่อ deploy เสร็จ จะได้ URL เช่น `https://preferrent-server.onrender.com`
   → เอาไปใส่ใน `API_BASE` ของ frontend
5. อย่าลืมตั้ง `NODE_ENV=production` และ `FRONTEND_ORIGIN` ให้ตรงกับโดเมนจริงที่ frontend รันอยู่
   (จำเป็นสำหรับให้ cookie ของ session ทำงานข้ามโดเมนได้)

## โครงสร้างโปรเจกต์

```
server/
├── config/db.js              # เชื่อมต่อ MongoDB
├── middleware/auth.js        # requireAuth / requireAdmin
├── models/                   # Mongoose schema: User, Room, Booking, Review
├── routes/api.js             # endpoint ทั้งหมด (ชื่อ path เดิมจาก PHP)
├── seed.js                   # ใส่ข้อมูลห้องพัก + แอดมินตั้งต้น
├── server.js                 # จุดเริ่มต้นของแอป
├── .env.example
└── package.json
```
