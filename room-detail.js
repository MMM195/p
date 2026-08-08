function formatPrice(n) {
  return '฿' + Number(n).toLocaleString('th-TH');
}

function renderNotFound(root) {
  root.innerHTML = `
    <div class="detail-error">
      <h2>ไม่พบห้องพักนี้</h2>
      <p>ห้องที่คุณกำลังมองหาอาจถูกลบหรือลิงก์ไม่ถูกต้อง</p>
      <a href="index.html#rooms" class="search-btn">กลับไปดูห้องพักทั้งหมด</a>
    </div>
  `;
}

let currentRoom = null;

function renderRoom(room) {
  currentRoom = room;
  const root = document.getElementById('detail-root');
  document.title = `${room.name} — PreferRent`;

  root.innerHTML = `
    <a href="index.html#rooms" class="back-link">← ห้องพักทั้งหมด</a>

    <div class="detail-grid">
      <div class="detail-image">
        ${room.image ? `<img src="${room.image}" alt="${room.name}" onerror="this.parentElement.classList.add('${room.sceneClass || ''}')">` : `<div class="${room.sceneClass || ''}" style="width:100%;height:100%;"></div>`}
        ${room.available ? '' : '<span class="room-badge">เต็มแล้ว</span>'}
      </div>

      <div class="detail-info">
        <span class="room-num" style="color:var(--clay);">${room.number} · ${room.categoryLabel}</span>
        <h1>${room.name}</h1>
        <p class="detail-desc">${room.description || ''}</p>

        <div class="detail-facts">
          <div class="fact">
            <span class="fact-label">ราคา</span>
            <span class="fact-value">${formatPrice(room.price)} <small>/คืน</small></span>
          </div>
          <div class="fact">
            <span class="fact-label">รองรับ</span>
            <span class="fact-value">${room.capacity} ท่าน</span>
          </div>
          ${room.quantity != null ? `
          <div class="fact">
            <span class="fact-label">ห้องว่าง</span>
            <span class="fact-value">${room.quantity} ห้อง</span>
          </div>` : ''}
          <div class="fact">
            <span class="fact-label">สถานะ</span>
            <span class="fact-value">${room.available ? 'ว่าง' : 'เต็ม'}</span>
          </div>
        </div>

        ${room.available ? renderBookingForm(room) : `
          <button type="button" class="search-btn detail-cta" disabled>แจ้งเตือนเมื่อว่าง</button>
        `}
        <p class="booking-msg" id="bookingMsg"></p>
      </div>
    </div>
  `;

  bindBookingForm(room);
}

function renderBookingForm(room) {
  const params = new URLSearchParams(window.location.search);
  const today = new Date().toISOString().split('T')[0];

  const prefCheckIn = params.get('checkin') || '';
  const prefCheckOut = params.get('checkout') || '';

  const minAdults = (room.beds >= 2) ? 2 : 1;
  const prefAdultsRaw = parseInt(params.get('adults'), 10) || minAdults;
  const prefAdults = Math.max(prefAdultsRaw, minAdults);

  return `
    <form id="bookingForm" class="booking-form">
      <div class="booking-form-row">
        <label>วันเข้าพัก
          <input type="date" id="bkCheckIn" min="${today}" value="${prefCheckIn}" required>
        </label>
        <label>วันออก
          <input type="date" id="bkCheckOut" min="${today}" value="${prefCheckOut}" required>
        </label>
      </div>
      <div class="booking-form-row">
        <label>จำนวนผู้เข้าพัก
          <input type="number" id="bkAdults" min="${minAdults}" max="${room.capacity}" value="${prefAdults}" required>
        </label>
      </div>
      ${minAdults > 1 ? `<p class="field-hint">ห้องเตียงคู่ต้องจองอย่างน้อย ${minAdults} ท่าน</p>` : ''}
      <p class="price-summary" id="priceSummary"></p>
      <button type="submit" class="search-btn detail-cta" id="bookingSubmitBtn">จองห้องนี้</button>
    </form>
  `;
}

function calcNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const [inY, inM, inD] = checkIn.split('-').map(Number);
  const [outY, outM, outD] = checkOut.split('-').map(Number);
  const inUTC = Date.UTC(inY, inM - 1, inD);
  const outUTC = Date.UTC(outY, outM - 1, outD);
  const diffDays = Math.round((outUTC - inUTC) / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

function updatePriceSummary(room) {
  const summary = document.getElementById('priceSummary');
  if (!summary) return;

  const checkIn = document.getElementById('bkCheckIn').value;
  const checkOut = document.getElementById('bkCheckOut').value;
  const nights = calcNights(checkIn, checkOut);

  if (nights <= 0) {
    summary.textContent = '';
    return;
  }

  const total = room.price * nights;
  summary.textContent = nights === 1
    ? `1 คืน = ${formatPrice(total)}`
    : `${nights} คืน = ${formatPrice(total)}`;
}

function bindBookingForm(room) {
  const form = document.getElementById('bookingForm');
  const msg = document.getElementById('bookingMsg');
  if (!form) return;

  const checkInInput = document.getElementById('bkCheckIn');
  const checkOutInput = document.getElementById('bkCheckOut');

  ['bkCheckIn', 'bkCheckOut'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => updatePriceSummary(room));
  });

  // วันออกต้องไม่ก่อนวันเข้าพักที่เลือก (และห้ามเลือกวันในอดีตอยู่แล้วจาก attribute min)
  checkInInput.addEventListener('change', () => {
    checkOutInput.setAttribute('min', checkInInput.value || checkOutInput.min);
    if (checkOutInput.value && checkOutInput.value < checkInInput.value) {
      checkOutInput.value = checkInInput.value;
    }
    updatePriceSummary(room);
  });

  updatePriceSummary(room);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    msg.className = 'booking-msg';

    const checkIn = document.getElementById('bkCheckIn').value;
    const checkOut = document.getElementById('bkCheckOut').value;
    const adults = parseInt(document.getElementById('bkAdults').value, 10);
    const nights = calcNights(checkIn, checkOut);

    const minAdults = (room.beds >= 2) ? 2 : 1;
    if (adults < minAdults) {
      msg.textContent = `ห้องนี้ต้องจองอย่างน้อย ${minAdults} ท่าน`;
      msg.classList.add('is-error');
      return;
    }

    if (nights <= 0) {
      msg.textContent = 'กรุณาเลือกวันเข้าพัก/วันออกให้ถูกต้อง (วันออกต้องหลังวันเข้าพัก)';
      msg.classList.add('is-error');
      return;
    }

    const submitBtn = document.getElementById('bookingSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'กำลังบันทึกการจอง…';

    const res = await fetch(`${API_BASE}/create-booking`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: room.id,
        check_in: checkIn,
        check_out: checkOut,
        adults: adults
      })
    });
    const data = await res.json().catch(() => ({}));

    submitBtn.disabled = false;
    submitBtn.textContent = 'จองห้องนี้';

    if (res.status === 401) {
      msg.textContent = 'กรุณาเข้าสู่ระบบก่อนทำการจอง';
      msg.classList.add('is-error');
      if (typeof openAuthModal === 'function') openAuthModal('login');
      return;
    }

    if (!res.ok) {
      msg.textContent = 'จองไม่สำเร็จ: ' + (data.error || '');
      msg.classList.add('is-error');
      console.error(data);
      return;
    }

    msg.textContent = '';
    form.reset();
    showBookingSuccessModal(data);
  });
}

function showBookingSuccessModal(data) {
  const overlay = document.getElementById('bookingSuccessOverlay');
  const text = document.getElementById('bookingSuccessText');
  const okBtn = document.getElementById('bookingSuccessOk');
  if (!overlay) return;

  if (text && data && data.nights && data.total_price != null) {
    text.textContent = `รวม ${data.nights} คืน ยอดประมาณ ${formatPrice(data.total_price)} — ดูสถานะได้ที่ "การจองของฉัน"`;
  }

  overlay.classList.add('open');

  const closeModal = () => overlay.classList.remove('open');

  if (okBtn) {
    okBtn.onclick = closeModal;
  }
  overlay.onclick = (e) => {
    if (e.target === overlay) closeModal();
  };
}

async function init() {
  const root = document.getElementById('detail-root');
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    renderNotFound(root);
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/room?id=${encodeURIComponent(id)}`, { credentials: 'include' });

    if (!res.ok) {
      renderNotFound(root);
      return;
    }

    const room = await res.json();
    room.categoryLabel = room.category_label;
    room.sceneClass = room.scene_class;
    room.image = room.image || getRoomImage(room.scene_class, room.beds);

    renderRoom(room);
  } catch (err) {
    root.innerHTML = '<p class="detail-loading">ไม่สามารถโหลดข้อมูลห้องพักได้ในขณะนี้</p>';
    console.error(err);
  }
}

init();