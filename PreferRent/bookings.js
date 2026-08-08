function formatPrice(n) {
  return '฿' + Number(n).toLocaleString('th-TH');
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function calcNights(checkIn, checkOut) {
  const [inY, inM, inD] = checkIn.split('-').map(Number);
  const [outY, outM, outD] = checkOut.split('-').map(Number);
  const inUTC = Date.UTC(inY, inM - 1, inD);
  const outUTC = Date.UTC(outY, outM - 1, outD);
  return Math.round((outUTC - inUTC) / (1000 * 60 * 60 * 24));
}

function statusLabel(status) {
  if (status === 'confirmed') return { text: 'ยืนยันแล้ว', cls: 'is-confirmed' };
  if (status === 'cancelled') return { text: 'ยกเลิกแล้ว', cls: 'is-cancelled' };
  return { text: 'รอยืนยัน', cls: 'is-pending' };
}

function renderLoginPrompt() {
  const el = document.getElementById('bookingsContent');
  el.innerHTML = `
    <div class="detail-error">
      <h2>กรุณาเข้าสู่ระบบ</h2>
      <p>เข้าสู่ระบบเพื่อดูรายการจองของคุณ</p>
      <button type="button" class="search-btn" id="goLoginBtn">เข้าสู่ระบบ</button>
    </div>
  `;
  const btn = document.getElementById('goLoginBtn');
  if (btn) btn.addEventListener('click', () => openAuthModal('login'));
}

function renderEmpty() {
  document.getElementById('bookingsContent').innerHTML = `
    <div class="detail-error">
      <h2>ยังไม่มีรายการจอง</h2>
      <p>เลือกห้องพักที่ถูกใจแล้วเริ่มจองได้เลย</p>
      <a href="index.html#rooms" class="search-btn">ดูห้องพักทั้งหมด</a>
    </div>
  `;
}

function renderBookings(bookings) {
  const el = document.getElementById('bookingsContent');
  el.innerHTML = `
    <div class="bookings-list">
      ${bookings.map(b => {
        const room = b.room || {};
        const st = statusLabel(b.status);
        const nights = calcNights(b.check_in, b.check_out);
        return `
          <div class="booking-card-item">
            <div class="booking-card-main">
              <span class="room-num" style="color:var(--clay);">${room.number || ''} · ${room.category_label || ''}</span>
              <h3>${room.name || 'ห้องพัก'}</h3>
              <p class="booking-dates">${formatDate(b.check_in)} — ${formatDate(b.check_out)} (${nights} คืน)</p>
              <p class="booking-meta">${b.rooms_count || 1} ห้อง · ${b.adults} ผู้เข้าพัก</p>
            </div>
            <div class="booking-card-side">
              <span class="booking-status ${st.cls}">${st.text}</span>
              <span class="booking-price">${formatPrice(b.total_price || 0)}</span>
              ${b.status === 'pending' ? `<button type="button" class="cancel-btn" data-id="${b.id}">ยกเลิกการจอง</button>` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  el.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'กำลังยกเลิก…';
      const res = await fetch(`${API_BASE}/cancel-booking`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: btn.dataset.id })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert('ยกเลิกไม่สำเร็จ: ' + (data.error || ''));
        btn.disabled = false;
        btn.textContent = 'ยกเลิกการจอง';
        return;
      }
      loadBookings();
    });
  });
}

async function loadBookings() {
  const el = document.getElementById('bookingsContent');
  el.innerHTML = '<p class="detail-loading">กำลังโหลดรายการจอง…</p>';

  const user = await getCurrentUser();
  if (!user) {
    renderLoginPrompt();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/bookings`, { credentials: 'include' });

    if (res.status === 401) {
      renderLoginPrompt();
      return;
    }
    if (!res.ok) throw new Error('โหลดรายการจองไม่สำเร็จ');

    const data = await res.json();

    if (!data || data.length === 0) {
      renderEmpty();
      return;
    }

    renderBookings(data);
  } catch (err) {
    el.innerHTML = `<p class="detail-loading">ไม่สามารถโหลดรายการจองได้ในขณะนี้</p>`;
    console.error(err);
  }
}

loadBookings();
// รีโหลดอัตโนมัติเมื่อสถานะล็อกอินเปลี่ยน (เช่น ล็อกอินสำเร็จผ่าน modal)
window.addEventListener('authchange', loadBookings);