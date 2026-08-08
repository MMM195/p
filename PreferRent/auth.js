// ===== ระบบสมาชิก (PHP + MySQL, ใช้ PHP session แทน Supabase Auth) =====
const API_BASE = 'http://localhost:4000/api';

const authWidget = document.getElementById('authWidget');
const authModalOverlay = document.getElementById('authModalOverlay');
const authModalClose = document.getElementById('authModalClose');
const authTabs = document.querySelectorAll('.auth-tab');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginError = document.getElementById('loginError');
const signupError = document.getElementById('signupError');
const signupSuccess = document.getElementById('signupSuccess');

function openAuthModal(tab) {
  if (!authModalOverlay) return;
  authModalOverlay.classList.add('open');
  switchAuthTab(tab || 'login');
}

function closeAuthModal() {
  if (!authModalOverlay) return;
  authModalOverlay.classList.remove('open');
  if (loginError) loginError.textContent = '';
  if (signupError) signupError.textContent = '';
  if (signupSuccess) signupSuccess.textContent = '';
}

function switchAuthTab(tab) {
  authTabs.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  if (loginForm) loginForm.style.display = tab === 'login' ? 'flex' : 'none';
  if (signupForm) signupForm.style.display = tab === 'signup' ? 'flex' : 'none';
}

function bindAuthTrigger() {
  const trigger = document.getElementById('authTrigger');
  if (trigger) {
    trigger.addEventListener('click', () => openAuthModal('login'));
  }
}
bindAuthTrigger();

if (authModalClose) {
  authModalClose.addEventListener('click', closeAuthModal);
}
if (authModalOverlay) {
  authModalOverlay.addEventListener('click', (e) => {
    if (e.target === authModalOverlay) closeAuthModal();
  });
}
authTabs.forEach(btn => {
  btn.addEventListener('click', () => switchAuthTab(btn.dataset.tab));
});

function renderAuthWidget(user) {
  if (!authWidget) return;

  if (user) {
    const name = user.full_name || user.email;
    const adminLink = user.is_admin
      ? `<a href="admin.html" class="admin-link">แผงแอดมิน</a>`
      : '';
    authWidget.innerHTML = `
      <div class="user-chip">
        ${adminLink}
        <span class="user-name">${name}</span>
        <button type="button" class="logout-btn" id="logoutBtn">ออกจากระบบ</button>
      </div>
    `;
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await fetch(`${API_BASE}/logout`, { method: 'POST', credentials: 'include' });
        window.dispatchEvent(new Event('authchange'));
        refreshAuthWidget();
      });
    }
  } else {
    authWidget.innerHTML = `<button type="button" class="nav-cta" id="authTrigger">เข้าสู่ระบบ</button>`;
    bindAuthTrigger();
  }
}

// ใช้ร่วมกันได้จากไฟล์อื่น (script.js, room-detail.js, bookings.js) เพราะ auth.js โหลดก่อนเสมอ
async function getCurrentUser() {
  try {
    const res = await fetch(`${API_BASE}/session`, { credentials: 'include', cache: 'no-store' });
    const data = await res.json();
    return data.user || null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function refreshAuthWidget() {
  const user = await getCurrentUser();
  renderAuthWidget(user);
}

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      loginError.textContent = data.error || 'เข้าสู่ระบบไม่สำเร็จ: อีเมลหรือรหัสผ่านไม่ถูกต้อง';
      return;
    }
    closeAuthModal();
    loginForm.reset();
    window.dispatchEvent(new Event('authchange'));
    refreshAuthWidget();
  });
}

if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    signupError.textContent = '';
    signupSuccess.textContent = '';

    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const passwordConfirm = document.getElementById('signupPasswordConfirm').value;

    if (password.length < 6) {
      signupError.textContent = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
      return;
    }

    if (password !== passwordConfirm) {
      signupError.textContent = 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน';
      return;
    }

    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: name, email, password })
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      signupError.textContent = 'สมัครสมาชิกไม่สำเร็จ: ' + (data.error || '');
      return;
    }

    signupSuccess.textContent = 'สมัครสำเร็จ! เข้าสู่ระบบให้อัตโนมัติแล้ว';
    signupForm.reset();
    window.dispatchEvent(new Event('authchange'));
    setTimeout(() => { closeAuthModal(); refreshAuthWidget(); }, 900);
  });
}

// เช็คสถานะล็อกอินตอนโหลดหน้า
refreshAuthWidget();