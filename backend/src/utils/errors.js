/**
 * An error we can safely convert into a customer-facing JSON response.
 * `message` is shown to the customer; `technicalDetail` is logged only.
 */
class AppError extends Error {
  constructor(httpStatus, code, customerMessage, technicalDetail) {
    super(customerMessage);
    this.httpStatus = httpStatus;
    this.code = code;
    this.customerMessage = customerMessage;
    this.technicalDetail = technicalDetail;
    this.isAppError = true;
  }
}

// One generic fallback so we never leak a raw provider string to a customer.
const GENERIC_MESSAGE = "We're temporarily unable to process this request. Please try again shortly.";

// Maps every documented DataSika error code to an HTTP status and a
// customer-safe message. Source of truth: DataSika Developer API docs.
const DATASIKA_ERROR_MAP = {
  idempotency_key_header_required: { httpStatus: 502, message: GENERIC_MESSAGE },
  invalid_api_key: { httpStatus: 502, message: GENERIC_MESSAGE },
  service_not_enabled_for_key: { httpStatus: 503, message: 'Data bundles are not available right now. Please try again later.' },
  insufficient_balance: { httpStatus: 503, message: GENERIC_MESSAGE },
  spend_cap_exceeded: { httpStatus: 503, message: GENERIC_MESSAGE },
  rate_limited: { httpStatus: 503, message: 'We are handling a lot of orders right now. Please try again in a moment.' },
  product_id_required: { httpStatus: 502, message: GENERIC_MESSAGE },
  invalid_recipient: { httpStatus: 400, message: 'Enter a valid 10-digit Ghanaian phone number.' },
  product_unavailable: { httpStatus: 409, message: 'This bundle just became unavailable. Please choose another bundle.' },
  use_express_endpoint: { httpStatus: 502, message: GENERIC_MESSAGE },
  use_flexa_endpoint: { httpStatus: 502, message: GENERIC_MESSAGE },
  dispatch_failed: { httpStatus: 502, message: "We couldn't complete the data delivery. If you were charged, you will be refunded automatically." },
  system_offline: { httpStatus: 503, message: 'Data bundle delivery is temporarily under maintenance. Please try again shortly.' },
  duplicate_in_flight: { httpStatus: 409, message: 'This order is already being processed.' },
  invalid_idempotency_key: { httpStatus: 502, message: GENERIC_MESSAGE },
  request_in_progress: { httpStatus: 409, message: 'This order is already being processed. Please wait a moment.' },
  key_expired: { httpStatus: 503, message: GENERIC_MESSAGE },
  key_revoked: { httpStatus: 503, message: GENERIC_MESSAGE },
  key_suspended: { httpStatus: 503, message: GENERIC_MESSAGE },
  key_inactive: { httpStatus: 503, message: GENERIC_MESSAGE },
  ip_not_allowed: { httpStatus: 503, message: GENERIC_MESSAGE },
  api_temporarily_disabled: { httpStatus: 503, message: 'Data bundle delivery is temporarily unavailable. Please try again shortly.' },
  api_access_disabled: { httpStatus: 503, message: GENERIC_MESSAGE },
  network_not_allowed_for_key: { httpStatus: 503, message: GENERIC_MESSAGE },
  number_not_eligible: { httpStatus: 422, message: "We couldn't deliver to this number right now — it may be a new or recently re-registered SIM. You have not been charged for delivery; please try again in a few minutes or use a different number." },
  invalid_amount: { httpStatus: 502, message: GENERIC_MESSAGE },
  purchase_failed: { httpStatus: 502, message: "We couldn't complete this order. You have not been charged for delivery — please try again." },
  order_not_found: { httpStatus: 404, message: 'We could not find that order.' },
  order_id_required: { httpStatus: 502, message: GENERIC_MESSAGE },
  service_unavailable: { httpStatus: 503, message: 'This service is switched off right now. Please check back shortly.' },
};

/**
 * Turn a DataSika error code (or an unrecognised one) into an AppError
 * that is safe to send straight to a customer.
 */
function fromDatasikaErrorCode(code, technicalDetail) {
  const mapped = DATASIKA_ERROR_MAP[code] || { httpStatus: 502, message: GENERIC_MESSAGE };
  return new AppError(mapped.httpStatus, code || 'datasika_error', mapped.message, technicalDetail);
}

module.exports = { AppError, fromDatasikaErrorCode, DATASIKA_ERROR_MAP, GENERIC_MESSAGE };
