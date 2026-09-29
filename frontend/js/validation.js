(function () {
  function isValidGhPhone(value) {
    return /^0\d{9}$/.test(String(value || '').trim());
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  window.DataInnValidation = { isValidGhPhone, isValidEmail };
})();
