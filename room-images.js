// ===== แม็พรูปภาพตามประเภทห้อง (ใช้ร่วมกันทั้งหน้าแสดงห้องและฟอร์มแอดมิน) =====
// กติกา: วิว (scene_class) + จำนวนเตียง (beds) รวมกันเป็น 1 ใน 4 รูปนี้
// ไฟล์รูปวางไว้ที่โฟลเดอร์ images/ (ระดับเดียวกับ index.html)
const ROOM_IMAGE_MAP = {
  'scene-city:1':  'images/king-city.png',
  'scene-river:1': 'images/king-river.png',
  'scene-city:2':  'images/twin-city.png',
  'scene-river:2': 'images/twin-river.png',
};

function getRoomImage(sceneClass, beds) {
  const key = `${sceneClass}:${Number(beds)}`;
  return ROOM_IMAGE_MAP[key] || '';
}
