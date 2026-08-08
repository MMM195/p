// ===== เมนูมือถือ / แท็บเล็ตแนวตั้ง (hamburger toggle) =====
const navToggle = document.getElementById('navToggle');
const navLinksEl = document.querySelector('.navlinks');

if (navToggle && navLinksEl) {
  function setNavOpen(open) {
    navLinksEl.classList.toggle('open', open);
    navToggle.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  navToggle.addEventListener('click', () => {
    setNavOpen(!navLinksEl.classList.contains('open'));
  });

  // ปิดเมนูอัตโนมัติเมื่อกดลิงก์ในเมนู
  navLinksEl.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => setNavOpen(false));
  });

  // ปิดเมนูถ้าขยายหน้าจอกลับมาใหญ่กว่าจุดตัดมือถือ/แท็บเล็ต
  window.addEventListener('resize', () => {
    if (window.innerWidth > 860) setNavOpen(false);
  });
}