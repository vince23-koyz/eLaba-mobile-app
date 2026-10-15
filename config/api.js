// implemented to avoid hard-coding URLs
import axios from 'axios';

// switch between different backend origins here

// const DEFAULT_BASE_ORIGIN = 'http://localhost:5000';        // iOS simulator / local
//const DEFAULT_BASE_ORIGIN = 'http://10.0.2.2:5000';         // Android emulator
const DEFAULT_BASE_ORIGIN = 'https://api.elaba.tech';      // Hostinger VPS

// Fallback origins used for recovery when primary origin is unreachable (dev only)
export const FALLBACK_ORIGINS = [ 
  'http://10.0.2.2:5000',
  'http://localhost:5000',
];

let BASE_ORIGIN = DEFAULT_BASE_ORIGIN;

export const API_CONFIG = {
  get BASE_ORIGIN() {
    return BASE_ORIGIN;
  },
  get BASE_URL() {
    return `${BASE_ORIGIN}/api`;
  },
  TIMEOUT: 15000,
};

// Shared Axios instance used across services
export const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
});

export function setBaseOrigin(origin) {
  if (typeof origin !== 'string' || !origin) return;
  BASE_ORIGIN = origin.replace(/\/$/, '');
  api.defaults.baseURL = `${BASE_ORIGIN}/api`;
}

export const API_ENDPOINTS = {
  AUTH: {
    OTP_SEND: '/otp/send',
    OTP_VERIFY: '/otp/verify',
    RESET_PASSWORD: '/otp/reset-password',
    REGISTER_CUSTOMER: '/customers',
  },
  CUSTOMERS: {
    BASE: '/customers',
    CHANGE_PASSWORD: '/customers/change-password',
    FORGOT_PASSWORD: '/customers/forgot-password',
    VERIFY_OTP: '/customers/verify-otp',
    BY_ID: (id) => `/customers/${id}`,
    PROFILE_PICTURE: (id) => `/customers/${id}/profile-picture`,
  },
  NOTIFICATIONS: {
    LIST: '/notifications',
    UPDATE_DEVICE_TOKEN: '/notifications/update-device-token',
    DEACTIVATE_DEVICE_TOKEN: '/notifications/deactivate-device-token',
    DELETE_DEVICE_TOKEN: '/notifications/delete-device-token',
    READ_ALL: '/notifications/read-all',
    READ: (notificationId) => `/notifications/${notificationId}/read`,
    SEND: '/notifications/send-notification',
  },
  BOOKINGS: {
    BASE: '/bookings',
    RESCHEDULE: (id) => `/bookings/${id}/reschedule`,
  },
  PAYMENTS: {
    BASE: '/payments',
    MODE: '/payments/mode',
    GCASH: {
      CREATE: '/payments/gcash/create',
      STATUS: (paymentIntentId) => `/payments/gcash/status/${paymentIntentId}`,
    },
    REFUND_STATUS: (bookingId, customerId) => `/payments/refunds/booking/${bookingId}/status?customer_id=${customerId}`,
  },
  MESSAGES: {
    MARK_READ: '/messages/mark-read',
  },
  DELIVERY: {
    BASE: '/delivery',
    BY_ID: (id) => `/delivery/${id}`,
    STATUS: (id) => `/delivery/${id}/status`,
  },
  // If you later add REST endpoints for messages/chat, add them here.
};

export const SOCKET_URL = API_CONFIG.BASE_ORIGIN;

export default API_CONFIG;