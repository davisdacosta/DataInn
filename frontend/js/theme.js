(function () {
  const STORAGE_KEY = 'datainn-theme';

  function applyTheme(theme) {
    if (theme === 'dark' || theme === 'light') {
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  function currentEffectiveTheme() {
    const explicit = document.documentElement.getAttribute('data-theme');
    if (explicit) return explicit;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function wireToggle(btn) {
    btn.addEventListener('click', () => {
      const next = currentEffectiveTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // localStorage unavailable (private mode) — theme just won't persist.
      }
      btn.setAttribute('aria-pressed', String(next === 'dark'));
    });
    btn.setAttribute('aria-pressed', String(currentEffectiveTheme() === 'dark'));
  }

  document.querySelectorAll('[data-theme-toggle]').forEach(wireToggle);
})();
