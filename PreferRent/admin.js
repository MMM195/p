function adminFormatPrice(n) {
  return '฿' + Number(n).toLocaleString('th-TH');
}

function adminFormatDate(d) {
  return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function adminCalcNights(checkIn, checkOut) {
  const [inY, inM, inD] = checkIn.split('-').map(Number);
  const [outY, outM, outD] = checkOut.split('-').map(Number);
  const inUTC = Date.UTC(inY, inM - 1, inD);
  const outUTC = Date.UTC(outY, outM - 1, outD);
  return Math.round((outUTC - inUTC) / (1000 * 60 * 60 * 24));
}

function adminStatusLabel(status) {
  if (status === 'confirmed') return { text: 'ยืนยันแล้ว', cls: 'is-confirmed' };
  if (status === 'cancelled') return { text: 'ยกเลิกแล้ว', cls: 'is-cancelled' };
  return { text: 'รอยืนยัน', cls: 'is-pending' };
}

let currentStatus = 'pending';

function renderLoginPrompt() {
  document.getElementById('adminContent').innerHTML = `
    <div class="detail-error">
      <h2>กรุณาเข้าสู่ระบบ</h2>
      <p>เข้าสู่ระบบด้วยบัญชีแอดมินเพื่อจัดการการจอง</p>
      <button type="button" class="search-btn" id="goLoginBtn">เข้าสู่ระบบ</button>
    </div>
  `;
  const btn = document.getElementById('goLoginBtn');
  if (btn) btn.addEventListener('click', () => openAuthModal('login'));
}

function renderNotAdmin() {
  document.getElementById('adminContent').innerHTML = `
    <div class="detail-error">
      <h2>ไม่มีสิทธิ์เข้าถึงส่วนนี้</h2>
      <p>บัญชีของคุณไม่ใช่แอดมิน กรุณาติดต่อผู้ดูแลระบบหากคิดว่านี่เป็นข้อผิดพลาด</p>
      <a href="index.html" class="search-btn">กลับหน้าแรก</a>
    </div>
  `;
  document.getElementById('adminTabs').style.display = 'none';
  const sectionTabs = document.getElementById('adminSectionTabs');
  if (sectionTabs) sectionTabs.style.display = 'none';
  const roomsSection = document.getElementById('roomsSection');
  if (roomsSection) roomsSection.style.display = 'none';
}

function renderEmpty() {
  document.getElementById('adminContent').innerHTML = `
    <div class="detail-error">
      <h2>ไม่มีรายการในหมวดนี้</h2>
      <p>ลองเปลี่ยนไปดูแท็บอื่น</p>
    </div>
  `;
}

function renderAdminBookings(bookings) {
  const el = document.getElementById('adminContent');
  el.innerHTML = `
    <div class="bookings-list">
      ${bookings.map(b => {
        const room = b.room || {};
        const user = b.user || {};
        const st = adminStatusLabel(b.status);
        const nights = adminCalcNights(b.check_in, b.check_out);
        let actions = '';
        if (b.status === 'pending') {
          actions = `
            <div class="admin-actions">
              <button type="button" class="confirm-btn" data-id="${b.id}" data-status="confirmed">ยืนยันรับลูกค้า</button>
              <button type="button" class="cancel-btn" data-id="${b.id}" data-status="cancelled">ปฏิเสธ</button>
            </div>
          `;
        } else if (b.status === 'confirmed') {
          actions = `
            <div class="admin-actions">
              <button type="button" class="cancel-btn" data-id="${b.id}" data-status="cancelled">ยกเลิกการจอง</button>
            </div>
          `;
        }
        return `
          <div class="booking-card-item admin-item">
            <div class="booking-card-main">
              <p class="admin-user">${user.name || ''} <span>· ${user.email || ''}</span></p>
              <span class="room-num" style="color:var(--clay);">${room.number || ''} · ${room.category_label || ''}</span>
              <h3>${room.name || 'ห้องพัก'}</h3>
              <p class="booking-dates">${adminFormatDate(b.check_in)} — ${adminFormatDate(b.check_out)} (${nights} คืน)</p>
              <p class="booking-meta">${b.rooms_count || 1} ห้อง · ${b.adults} ผู้เข้าพัก · จองเมื่อ ${adminFormatDate(b.created_at)}</p>
            </div>
            <div class="booking-card-side">
              <span class="booking-status ${st.cls}">${st.text}</span>
              <span class="booking-price">${adminFormatPrice(b.total_price || 0)}</span>
              ${actions}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  el.querySelectorAll('.confirm-btn, .cancel-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const newStatus = btn.dataset.status;
      const id = btn.dataset.id;
      const group = btn.closest('.admin-actions');
      group.querySelectorAll('button').forEach(b => b.disabled = true);
      btn.textContent = 'กำลังอัปเดต…';

      const res = await fetch(`${API_BASE}/update-booking-status`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert('อัปเดตไม่สำเร็จ: ' + (data.error || ''));
        group.querySelectorAll('button').forEach(b => b.disabled = false);
        loadAdminBookings();
        return;
      }
      loadAdminBookings();
    });
  });
}

async function loadAdminBookings() {
  const el = document.getElementById('adminContent');
  el.innerHTML = '<p class="detail-loading">กำลังโหลดรายการจอง…</p>';

  const query = currentStatus ? `?status=${encodeURIComponent(currentStatus)}` : '';
  const res = await fetch(`${API_BASE}/admin-bookings${query}`, { credentials: 'include' });

  if (res.status === 401) {
    renderLoginPrompt();
    return;
  }
  if (res.status === 403) {
    renderNotAdmin();
    return;
  }
  if (!res.ok) {
    el.innerHTML = `<p class="detail-loading">ไม่สามารถโหลดรายการจองได้ในขณะนี้</p>`;
    return;
  }

  const data = await res.json();
  if (!data || data.length === 0) {
    renderEmpty();
    return;
  }
  renderAdminBookings(data);
}

document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentStatus = tab.dataset.status;
    loadAdminBookings();
  });
});

// =====================================================================
// จัดการห้องพัก (เพิ่ม / แก้ไข / ลบ)
// =====================================================================

let roomsLoadedOnce = false;

document.querySelectorAll('.admin-section-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-section-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const section = tab.dataset.section;
    document.getElementById('bookingsSection').style.display = section === 'bookings' ? '' : 'none';
    document.getElementById('roomsSection').style.display = section === 'rooms' ? '' : 'none';

    if (section === 'rooms' && !roomsLoadedOnce) {
      roomsLoadedOnce = true;
      loadRoomsAdmin();
    }
  });
});

function renderRoomsAdmin(rooms) {
  const el = document.getElementById('roomsAdminContent');

  if (!rooms.length) {
    el.innerHTML = '<p class="detail-loading">ยังไม่มีห้องพักในระบบ กด "เพิ่มห้องพักใหม่" เพื่อเริ่มต้น</p>';
    return;
  }

  el.innerHTML = `
    <div class="admin-rooms-list">
      ${rooms.map(r => `
        <div class="booking-card-item admin-item admin-room-item">
          <div class="booking-card-main">
            <span class="room-num" style="color:var(--clay);">${r.number} · ${r.category_label}</span>
            <h3>${r.name}</h3>
            <p class="booking-meta">${r.beds} เตียง · รองรับ ${r.capacity} ท่าน · ${r.quantity != null ? `เหลือ ${r.quantity} ห้อง` : 'ไม่จำกัดจำนวน'}</p>
          </div>
          <div class="booking-card-side">
            <span class="booking-status ${r.available ? 'is-confirmed' : 'is-cancelled'}">${r.available ? 'เปิดให้จอง' : 'ปิดชั่วคราว'}</span>
            <span class="booking-price">${adminFormatPrice(r.price)}</span>
            <div class="admin-actions">
              <button type="button" class="confirm-btn edit-room-btn" data-id="${r.id}">แก้ไข</button>
              <button type="button" class="cancel-btn delete-room-btn" data-id="${r.id}">ลบ</button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  el.querySelectorAll('.edit-room-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const room = rooms.find(r => r.id === btn.dataset.id);
      if (room) openRoomForm(room);
    });
  });

  el.querySelectorAll('.delete-room-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('ยืนยันลบห้องพักนี้? การลบไม่สามารถย้อนกลับได้')) return;
      btn.disabled = true;
      btn.textContent = 'กำลังลบ…';

      const res = await fetch(`${API_BASE}/delete-room`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: btn.dataset.id })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert('ลบไม่สำเร็จ: ' + (data.error || ''));
        btn.disabled = false;
        btn.textContent = 'ลบ';
        return;
      }
      loadRoomsAdmin();
    });
  });
}

async function loadRoomsAdmin() {
  const el = document.getElementById('roomsAdminContent');
  el.innerHTML = '<p class="detail-loading">กำลังโหลดห้องพัก…</p>';

  const res = await fetch(`${API_BASE}/rooms`, { credentials: 'include' });
  if (!res.ok) {
    el.innerHTML = '<p class="detail-loading">ไม่สามารถโหลดข้อมูลห้องพักได้ในขณะนี้</p>';
    return;
  }

  const rooms = await res.json();
  renderRoomsAdmin(rooms);
}

const roomFormOverlay = document.getElementById('roomFormOverlay');
const roomForm = document.getElementById('roomForm');
const roomFormError = document.getElementById('roomFormError');
const roomFormTitle = document.getElementById('roomFormTitle');
const roomFormSubmit = document.getElementById('roomFormSubmit');

function updateRoomImagePreview() {
  const sceneClass = document.getElementById('roomSceneClass').value.trim();
  const beds = Number(document.getElementById('roomBeds').value);
  if (!sceneClass || !beds) return;

  const image = getRoomImage(sceneClass, beds);
  if (image) {
    document.getElementById('roomImage').value = image;
  }

  const preview = document.getElementById('roomImagePreview');
  if (preview) {
    preview.src = image || '';
    preview.style.display = image ? '' : 'none';
  }
}

['roomSceneClass', 'roomBeds'].forEach((fieldId) => {
  const field = document.getElementById(fieldId);
  if (field) field.addEventListener('change', updateRoomImagePreview);
});

function openRoomForm(room) {
  roomFormError.textContent = '';
  roomForm.reset();

  if (room) {
    roomFormTitle.textContent = `แก้ไขห้องพัก · ${room.number}`;
    document.getElementById('roomFormId').value = room.id;
    document.getElementById('roomNumber').value = room.number;
    document.getElementById('roomName').value = room.name;
    document.getElementById('roomCategory').value = room.category;
    document.getElementById('roomCategoryLabel').value = room.category_label;
    document.getElementById('roomPrice').value = room.price;
    document.getElementById('roomCapacity').value = room.capacity;
    document.getElementById('roomBeds').value = room.beds;
    document.getElementById('roomQuantity').value = room.quantity != null ? room.quantity : '';
    document.getElementById('roomImage').value = room.image || '';
    document.getElementById('roomSceneClass').value = room.scene_class || '';
    document.getElementById('roomDescription').value = room.description || '';
    document.getElementById('roomAvailable').checked = !!room.available;
  } else {
    roomFormTitle.textContent = 'เพิ่มห้องพักใหม่';
    document.getElementById('roomFormId').value = '';
    document.getElementById('roomAvailable').checked = true;
  }

  updateRoomImagePreview();
  roomFormOverlay.classList.add('open');
}

function closeRoomForm() {
  roomFormOverlay.classList.remove('open');
}

document.getElementById('addRoomBtn').addEventListener('click', () => openRoomForm(null));
document.getElementById('roomFormClose').addEventListener('click', closeRoomForm);
roomFormOverlay.addEventListener('click', (e) => {
  if (e.target === roomFormOverlay) closeRoomForm();
});

roomForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  roomFormError.textContent = '';

  const id = document.getElementById('roomFormId').value;
  const payload = {
    number: document.getElementById('roomNumber').value.trim(),
    name: document.getElementById('roomName').value.trim(),
    category: document.getElementById('roomCategory').value.trim(),
    category_label: document.getElementById('roomCategoryLabel').value.trim(),
    price: Number(document.getElementById('roomPrice').value),
    capacity: Number(document.getElementById('roomCapacity').value),
    beds: Number(document.getElementById('roomBeds').value),
    quantity: document.getElementById('roomQuantity').value === '' ? null : Number(document.getElementById('roomQuantity').value),
    image: document.getElementById('roomImage').value.trim(),
    scene_class: document.getElementById('roomSceneClass').value.trim(),
    description: document.getElementById('roomDescription').value.trim(),
    available: document.getElementById('roomAvailable').checked,
  };

  if (id) payload.id = id;

  const endpoint = id ? 'update-room' : 'create-room';

  roomFormSubmit.disabled = true;
  roomFormSubmit.textContent = 'กำลังบันทึก…';

  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));

  roomFormSubmit.disabled = false;
  roomFormSubmit.textContent = 'บันทึกห้องพัก';

  if (!res.ok) {
    roomFormError.textContent = data.error || 'บันทึกไม่สำเร็จ กรุณาลองใหม่';
    return;
  }

  closeRoomForm();
  loadRoomsAdmin();
});

async function initAdminPage() {
  const user = await getCurrentUser();
  if (!user) {
    renderLoginPrompt();
    return;
  }
  if (!user.is_admin) {
    renderNotAdmin();
    return;
  }
  loadAdminBookings();
}

initAdminPage();
// รีโหลดอัตโนมัติเมื่อสถานะล็อกอินเปลี่ยน (เช่น ล็อกอินสำเร็จผ่าน modal)
window.addEventListener('authchange', initAdminPage);