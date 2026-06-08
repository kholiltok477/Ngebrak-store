(() => {
  const state = {
    username: null,
    password: null
  };

  const els = {
    form: null,
    username: null,
    password: null,
    toast: null
  };

  window.addEventListener('DOMContentLoaded', init);

  function init() {
    mapEls();
    bind();
  }

  function mapEls() {
    els.form = document.getElementById('loginForm');
    els.username = document.getElementById('username');
    els.password = document.getElementById('password');
    els.toast = document.getElementById('loginToast');
  }

  function bind() {
    els.form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = (els.username?.value || '').trim();
      const password = els.password?.value || '';

      state.username = username;
      state.password = password;

      if (!username || !password) {
        showToast('Username dan password wajib diisi.');
        return;
      }

      const result = await apiCall('/api/login', 'POST', { username, password });
      if (!result?.success) {
        showToast(result?.message || 'Login gagal.');
        return;
      }

      // Blueprint: simpan user ke localStorage key 'ngebrakUser'
      localStorage.setItem('ngebrakUser', JSON.stringify(result.user));
      window.location.href = '/app.html';
    });
  }

  function showToast(message) {
    if (!els.toast) {
      alert(message);
      return;
    }
    els.toast.textContent = message;
    els.toast.classList.add('show');
    window.setTimeout(() => els.toast.classList.remove('show'), 2500);
  }

  async function apiCall(url, method, payload) {
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return (await res.json()) || { success: false, message: 'Koneksi gagal.' };
    } catch (err) {
      console.error(err);
      return { success: false, message: 'Koneksi gagal.' };
    }
  }
})();

