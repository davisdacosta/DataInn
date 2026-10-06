const settingsRepository = require('../db/siteSettingsRepository');
const { AppError } = require('../utils/errors');

const NETWORKS = ['MTN', 'Telecel', 'AirtelTigo'];
const SPEED_RATINGS = ['quick', 'within_6_hours', 'delayed'];
const NOTICE_FIELDS = ['delivery', 'airtime', 'wrongNumber', 'mtnVerification'];

function validateText(value, field, maxLength = 500) {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new AppError(400, 'invalid_site_setting', `Enter valid text for ${field} (maximum ${maxLength} characters).`);
  }
  return value.trim();
}

function validate(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    throw new AppError(400, 'invalid_site_settings', 'The storefront settings are invalid.');
  }

  const networks = {};
  for (const network of NETWORKS) {
    if (typeof settings.networks?.[network] !== 'boolean') {
      throw new AppError(400, 'invalid_network_status', `Choose whether ${network} is available.`);
    }
    networks[network] = settings.networks[network];
  }

  if (!SPEED_RATINGS.includes(settings.mtnSpeed?.rating)) {
    throw new AppError(400, 'invalid_speed_rating', 'Choose a valid MTN speed rating.');
  }

  const notices = {};
  for (const field of NOTICE_FIELDS) {
    notices[field] = validateText(settings.notices?.[field], field);
  }

  return {
    networks,
    mtnSpeed: {
      rating: settings.mtnSpeed.rating,
      message: validateText(settings.mtnSpeed.message, 'MTN speed estimate'),
    },
    notices,
  };
}

async function getPublicSettings() {
  const settings = await settingsRepository.get();
  return {
    networks: settings.networks,
    mtnSpeed: settings.mtnSpeed,
    notices: settings.notices,
  };
}

async function update(settings) {
  return settingsRepository.update(validate(settings));
}

async function isNetworkEnabled(network) {
  const settings = await settingsRepository.get();
  return settings.networks[network] !== false;
}

module.exports = { getPublicSettings, getAdminSettings: settingsRepository.get, update, isNetworkEnabled };
