(function () {
  function getReference() {
    return new URLSearchParams(window.location.search).get('ref');
  }

  function getReason() {
    return new URLSearchParams(window.location.search).get('reason');
  }

  window.DataInnResult = { getReference, getReason };
})();
