const VALIDITY_BY_NETWORK = Object.freeze({
  MTN: '90 days',
  Telecel: 'Non-expiry',
  AirtelTigo: '60 days',
});

function getPlanValidity(network, fallback) {
  return VALIDITY_BY_NETWORK[network] || fallback;
}

module.exports = { getPlanValidity };