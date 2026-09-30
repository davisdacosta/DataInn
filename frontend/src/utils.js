export function formatMoney(amount, currency = 'GHS') {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

export function formatPhone(value = '') {
  const digits = String(value).replace(/\D/g, '');
  return digits.length === 10 ? `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}` : value;
}

export function normalizePath(pathname) {
  const path = pathname.replace(/\/$/, '') || '/';
  const aliases = {
    '/index.html': '/',
    '/buy.html': '/buy',
    '/track.html': '/track',
    '/success.html': '/success',
    '/failed.html': '/failed',
    '/privacy.html': '/privacy',
    '/terms.html': '/terms',
  };
  return aliases[path] || path;
}