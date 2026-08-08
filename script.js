const nav = document.getElementById('mainnav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
});

// ===== ฟิลเตอร์วันที่: ห้ามเลือกวันที่ในอดีต =====
(function setupSearchDateLimits() {
  const checkInInput = document.getElementById('searchCheckIn');
  const checkOutInput = document.getElementById('searchCheckOut');
  if (!checkInInput || !checkOutInput) return;

  const today = new Date().toISOString().split('T')[0];
  checkInInput.setAttribute('min', today);
  checkOutInput.setAttribute('min', today);

  checkInInput.addEventListener('change', () => {
    // วันออกต้องไม่ก่อนวันเข้าพักที่เลือก
    checkOutInput.setAttribute('min', checkInInput.value || today);
    if (checkOutInput.value && checkOutInput.value < checkInInput.value) {
      checkOutInput.value = checkInInput.value;
    }
  });
})();

// ===== ห้องพัก: โหลดจาก PHP API (MySQL) =====
let allRooms = [];
const roomsGrid = document.getElementById('rooms-grid');
const roomTypeFilter = document.getElementById('roomTypeFilter');
const searchBtn = document.querySelector('.booking-card .search-btn');

function formatPrice(n) {
  return '฿' + Number(n).toLocaleString('th-TH');
}

function buildRoomLink(room) {
  const params = new URLSearchParams();
  params.set('id', room.id);

  const checkIn = document.getElementById('searchCheckIn');
  const checkOut = document.getElementById('searchCheckOut');
  if (checkIn && checkIn.value) params.set('checkin', checkIn.value);
  if (checkOut && checkOut.value) params.set('checkout', checkOut.value);
  if (typeof guestState !== 'undefined') {
    params.set('adults', guestState.adults);
  }

  return `room.html?${params.toString()}`;
}

function renderRooms(rooms) {
  if (!roomsGrid) return;

  if (!rooms.length) {
    roomsGrid.innerHTML = '<p class="rooms-empty" style="grid-column:1/-1; text-align:center;">ไม่พบห้องพักตามเงื่อนไขที่เลือก ลองเปลี่ยนตัวกรองดูนะครับ</p>';
    return;
  }

  roomsGrid.innerHTML = rooms.map(room => `
    <div class="room-card ${room.available ? '' : 'is-full'}">
      ${room.available ? '' : '<span class="room-badge">เต็มแล้ว</span>'}
      <div class="scene ${room.sceneClass || ''}">
        ${room.image ? `<img src="${room.image}" alt="${room.name}" loading="lazy" onerror="this.remove()">` : ''}
      </div>
      <div class="room-content">
        <span class="room-num">${room.number} · ${room.categoryLabel}</span>
        <h3>${room.name}</h3>
        <p class="desc">${room.description || ''}</p>
        ${room.quantity != null ? `<p class="qty-note">เหลือ ${room.quantity} ห้อง</p>` : ''}
        <div class="room-price">
          <span class="amt">${formatPrice(room.price)} <span>/คืน</span></span>
          <a href="${buildRoomLink(room)}" class="view-btn">${room.available ? 'ดูห้อง' : 'แจ้งเตือนเมื่อว่าง'}</a>
        </div>
      </div>
    </div>
  `).join('');
}

function applyFilter() {
  const selectedCategory = roomTypeFilter ? roomTypeFilter.value : 'ทั้งหมด';

  let filtered = allRooms;
  if (selectedCategory && selectedCategory !== 'ทั้งหมด') {
    filtered = filtered.filter(r => r.category === selectedCategory);
  }

  const wantBeds = guestState.beds;
  const wantAdults = guestState.adults;
  filtered = filtered.filter(r => r.beds === wantBeds && r.capacity >= wantAdults);

  renderRooms(filtered);
}

async function loadRooms() {
  if (!roomsGrid) return;
  try {
    const res = await fetch(`${API_BASE}/rooms`, { credentials: 'include' });
    if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ');
    const data = await res.json();

    allRooms = data.map(r => ({
      ...r,
      categoryLabel: r.category_label,
      sceneClass: r.scene_class,
      image: r.image || getRoomImage(r.scene_class, r.beds)
    }));

    renderRooms(allRooms);
  } catch (err) {
    roomsGrid.innerHTML = '<p class="rooms-empty" style="grid-column:1/-1; text-align:center;">ไม่สามารถโหลดข้อมูลห้องพักได้ในขณะนี้</p>';
    console.error(err);
  }
}

if (searchBtn) {
  searchBtn.addEventListener('click', (e) => {
    e.preventDefault();
    applyFilter();
    document.getElementById('rooms').scrollIntoView({ behavior: 'smooth' });
  });
}

loadRooms();

const guestField = document.getElementById('guestField');
const guestTrigger = document.getElementById('guestTrigger');
const guestSummary = document.getElementById('guestSummary');

const guestState = { beds: 1, adults: 1 };
const guestLimits = {
  beds: { min: 1, max: 2 }
};

// จำนวนผู้เข้าพักที่เลือกได้ ขึ้นกับจำนวนเตียงที่เลือกไว้
// เตียง 1: เลือกคนได้ 1-3 | เตียง 2: เลือกคนได้ 2-4
function getAdultsLimits() {
  return guestState.beds === 1 ? { min: 1, max: 3 } : { min: 2, max: 4 };
}

function getLimits(target) {
  return target === 'adults' ? getAdultsLimits() : guestLimits.beds;
}

function updateGuestUI() {
  // ปรับจำนวนคนให้อยู่ในช่วงที่ยอมรับได้เสมอ เผื่อเปลี่ยนจำนวนเตียงแล้วค่าเดิมหลุดช่วง
  const adultsLimits = getAdultsLimits();
  if (guestState.adults > adultsLimits.max) guestState.adults = adultsLimits.max;
  if (guestState.adults < adultsLimits.min) guestState.adults = adultsLimits.min;

  document.getElementById('bedsValue').textContent = guestState.beds;
  document.getElementById('adultsValue').textContent = guestState.adults;

  document.querySelectorAll('.step-btn').forEach(btn => {
    const target = btn.dataset.target;
    const action = btn.dataset.action;
    const { min, max } = getLimits(target);
    if (action === 'minus') btn.disabled = guestState[target] <= min;
    if (action === 'plus') btn.disabled = guestState[target] >= max;
  });

  const summary = `${guestState.adults} คน · ${guestState.beds} เตียง`;
  guestSummary.textContent = summary;
}

if (guestField && guestTrigger) {
  guestTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    guestField.classList.toggle('open');
  });

  document.querySelectorAll('.step-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = btn.dataset.target;
      const action = btn.dataset.action;
      const { min, max } = getLimits(target);
      if (action === 'plus' && guestState[target] < max) guestState[target]++;
      if (action === 'minus' && guestState[target] > min) guestState[target]--;
      updateGuestUI();
    });
  });

  document.addEventListener('click', (e) => {
    if (!guestField.contains(e.target)) {
      guestField.classList.remove('open');
    }
  });

  updateGuestUI();
}