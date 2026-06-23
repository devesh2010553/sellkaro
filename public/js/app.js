// ============================================================
// SHARED APP LOGIC - included on every page
// ============================================================

const API_BASE = '/api';

// ---------- Toast notifications ----------
function showToast(message, type = 'info') {
  let stack = document.getElementById('toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'toast-stack';
    document.body.appendChild(stack);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  stack.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
}

// ---------- Auth token helper ----------
async function getAuthToken(forceRefresh = false) {
  const user = firebase.auth().currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}

// ---------- API call wrapper ----------
async function apiCall(path, { method = 'GET', body, isFormData = false, auth: needsAuth = false } = {}) {
  const headers = {};
  let payload = body;

  if (needsAuth) {
    const token = await getAuthToken();
    if (!token) throw new Error('Please log in to continue.');
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (body && !isFormData) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: payload });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data;
}

// ---------- Header / Footer injection ----------
function renderHeader(activePage = '') {
  const el = document.getElementById('site-header');
  if (!el) return;
  el.innerHTML = `
    <div class="nav-bar" id="nav-bar">
      <a href="/index.html" class="brand">SellKaro<span class="dot">.</span></a>
      <button class="nav-toggle" id="nav-toggle" aria-label="Toggle menu">&#9776;</button>
      <nav class="nav-links">
        <a href="/browse.html" class="${activePage === 'browse' ? 'active' : ''}">Browse</a>
        <a href="/sell.html" class="${activePage === 'sell' ? 'active' : ''}">Sell an item</a>
        <a href="/testimonials.html" class="${activePage === 'testimonials' ? 'active' : ''}">Testimonials</a>
        <a href="/terms.html" class="${activePage === 'terms' ? 'active' : ''}">Terms</a>
        <a href="/feedback.html" class="${activePage === 'feedback' ? 'active' : ''}">Feedback</a>
        <a href="/dashboard.html" class="${activePage === 'dashboard' ? 'active' : ''}">My account</a>
      </nav>
      <div class="nav-actions" id="nav-actions"></div>
    </div>
  `;
  document.getElementById('nav-toggle').addEventListener('click', () => {
    document.getElementById('nav-bar').classList.toggle('menu-open');
  });
}

function renderFooter() {
  const el = document.getElementById('site-footer');
  if (!el) return;
  const year = new Date().getFullYear();
  el.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div>
          <h4 style="font-family: var(--font-display); font-size: 1.2rem; color: #fff;">SellKaro.</h4>
          <p class="text-sm" style="max-width: 320px; color: var(--paper-dim);">
            Sell your old car, bike, or anything else fast - at a fair price, with every listing personally checked before it goes live.
          </p>
        </div>
        <div>
          <h4>Explore</h4>
          <a href="/browse.html">Browse listings</a>
          <a href="/sell.html">Post a free ad</a>
          <a href="/testimonials.html">Testimonials</a>
        </div>
        <div>
          <h4>Company</h4>
          <a href="/about.html">About us</a>
          <a href="/terms.html">Terms &amp; commission</a>
          <a href="/feedback.html">Send feedback</a>
        </div>
        <div>
          <h4>Account</h4>
          <a href="/dashboard.html">My dashboard</a>
          <a href="/dashboard.html#messages">My messages</a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>&copy; ${year} SellKaro. All rights reserved.</span>
        <span>A 5% commission applies on successful sales. <a href="/terms.html" style="text-decoration:underline;">Read terms</a></span>
      </div>
    </div>
  `;
}

// ---------- Auth state -> nav actions ----------
let currentMongoUser = null;

function renderNavActions(firebaseUser) {
  const el = document.getElementById('nav-actions');
  if (!el) return;

  if (firebaseUser) {
    el.innerHTML = `
      <span class="text-sm" style="color:var(--paper-dim); margin-right:4px;">Hi, ${(currentMongoUser && currentMongoUser.name) ? currentMongoUser.name.split(' ')[0] : 'there'}</span>
      <a href="/sell.html" class="btn btn-primary btn-sm">+ Post ad</a>
      <button id="logout-btn" class="btn btn-outline btn-sm">Log out</button>
    `;
    document.getElementById('logout-btn').addEventListener('click', async () => {
      await firebase.auth().signOut();
      showToast('Logged out.', 'success');
      setTimeout(() => window.location.href = '/index.html', 600);
    });
  } else {
    el.innerHTML = `
      <a href="/login.html" class="btn btn-outline btn-sm">Log in</a>
      <a href="/signup.html" class="btn btn-primary btn-sm">Sign up</a>
    `;
  }
}

function initAuthWatcher() {
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      try {
        await user.reload();
        const data = await apiCall('/auth/me', { auth: true });
        currentMongoUser = data.user;
      } catch (e) {
        currentMongoUser = null;
      }
    } else {
      currentMongoUser = null;
    }
    renderNavActions(user);
    document.dispatchEvent(new CustomEvent('authready', { detail: { firebaseUser: user, mongoUser: currentMongoUser } }));
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function formatPrice(n) {
  if (n == null) return '-';
  return '\u20b9' + Number(n).toLocaleString('en-IN');
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

document.addEventListener('DOMContentLoaded', () => {
  renderFooter();
  initAuthWatcher();
});
