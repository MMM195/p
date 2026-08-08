// ===== รีวิวจากผู้เข้าพัก =====

const REVIEW_MONTHS_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

function formatReviewDate(d) {
  const date = new Date(d);
  const month = REVIEW_MONTHS_TH[date.getMonth()];
  const buddhistYear = date.getFullYear() + 543;
  return `เขียนรีวิวเดือน${month} ${buddhistYear}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function renderReviews(reviews) {
  const list = document.getElementById('reviewsList');
  if (!list) return;

  if (!reviews.length) {
    list.innerHTML = '<p class="review-empty">ยังไม่มีรีวิว เป็นคนแรกที่รีวิวที่พักนี้สิครับ</p>';
    return;
  }

  list.innerHTML = reviews.map(r => `
    <div class="review-card">
      <p class="testi-quote">"${escapeHtml(r.content)}"</p>
      <p class="testi-name">${escapeHtml(r.full_name)}</p>
      <p class="testi-role">${formatReviewDate(r.created_at)}</p>
    </div>
  `).join('');
}

async function loadReviews() {
  const list = document.getElementById('reviewsList');
  if (!list) return;
  list.innerHTML = '<p class="detail-loading">กำลังโหลดรีวิว…</p>';

  try {
    const res = await fetch(`${API_BASE}/reviews`, { credentials: 'include' });
    if (!res.ok) throw new Error('โหลดรีวิวไม่สำเร็จ');
    const data = await res.json();
    renderReviews(data);
  } catch (err) {
    list.innerHTML = '<p class="detail-loading">ไม่สามารถโหลดรีวิวได้ในขณะนี้</p>';
    console.error(err);
  }
}

async function renderReviewForm() {
  const wrap = document.getElementById('reviewFormWrap');
  if (!wrap) return;

  const user = await getCurrentUser();

  if (!user) {
    wrap.innerHTML = `
      <p class="review-login-hint">เข้าสู่ระบบเพื่อเขียนรีวิวประสบการณ์การเข้าพักของคุณ</p>
      <button type="button" class="search-btn" id="reviewLoginBtn">เข้าสู่ระบบ</button>
    `;
    document.getElementById('reviewLoginBtn').addEventListener('click', () => openAuthModal('login'));
    return;
  }

  wrap.innerHTML = `
    <form id="reviewForm" class="review-form">
      <textarea id="reviewContent" class="review-textarea" placeholder="เล่าประสบการณ์การเข้าพักของคุณ…" required maxlength="500" rows="4"></textarea>
      <p class="auth-error" id="reviewError"></p>
      <button type="submit" class="search-btn">ส่งรีวิว</button>
    </form>
  `;

  const form = document.getElementById('reviewForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('reviewError');
    errorEl.textContent = '';

    const content = document.getElementById('reviewContent').value.trim();
    if (!content) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'กำลังส่ง…';

    const res = await fetch(`${API_BASE}/create-review`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    const data = await res.json().catch(() => ({}));

    submitBtn.disabled = false;
    submitBtn.textContent = 'ส่งรีวิว';

    if (!res.ok) {
      errorEl.textContent = data.error || 'ส่งรีวิวไม่สำเร็จ';
      return;
    }

    form.reset();
    loadReviews();
  });
}

loadReviews();
renderReviewForm();
// รีเรนเดอร์ฟอร์มเขียนรีวิวเมื่อสถานะล็อกอินเปลี่ยน (login/logout ผ่าน modal)
window.addEventListener('authchange', renderReviewForm);