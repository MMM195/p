const User = require('../models/User');

// เทียบเท่ากับ `if (empty($_SESSION['user_id']))` ในไฟล์ PHP เดิม
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ' });
  }
  next();
}

// เทียบเท่ากับการเช็ค is_admin ใน admin-bookings.php / update-booking-status.php
async function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ' });
  }
  const me = await User.findById(req.session.userId).select('is_admin');
  if (!me || !me.is_admin) {
    return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึงส่วนนี้' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
