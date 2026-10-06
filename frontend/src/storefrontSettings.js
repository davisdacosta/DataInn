export const NETWORK_NAMES = ['MTN', 'Telecel', 'AirtelTigo'];

export const SPEED_RATINGS = {
  quick: {
    label: '30 minutes–1 hour',
    className: 'speed-quick',
    description: 'Most orders arrive within 30 minutes to 1 hour.',
  },
  within_6_hours: {
    label: 'Within 6 Hours',
    className: 'speed-moderate',
    description: 'Expected within 6 hours — many orders arrive much sooner',
  },
  delayed: {
    label: '7+ hours',
    className: 'speed-delayed',
    description: 'Delivery may take 7 hours or longer.',
  },
};

export const DEFAULT_STOREFRONT_SETTINGS = {
  networks: { MTN: true, Telecel: true, AirtelTigo: false },
  mtnSpeed: {
    rating: 'within_6_hours',
    message: SPEED_RATINGS.within_6_hours.description,
  },
  notices: {
    delivery: 'Delivery times may vary.',
    airtime: 'Phone must not owe airtime.',
    wrongNumber: 'No refunds for wrong numbers.',
    mtnVerification: 'A number ordering MTN data through us for the first time may show “Awaiting Verification” for a one-time check before it delivers — normally up to a week, sometimes a couple of weeks (future orders to that same number go through normally).',
  },
};
