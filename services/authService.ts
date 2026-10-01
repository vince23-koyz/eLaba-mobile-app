import { api, API_ENDPOINTS } from '../config/api';

export type ApiResponse<T = any> = {
  success?: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
};

export async function requestOtp(phone_number: string): Promise<ApiResponse> {
  const { data } = await api.post(API_ENDPOINTS.AUTH.OTP_SEND, { phone_number });
  return data;
}

export async function verifyOtp(phone_number: string, otp_code: string): Promise<ApiResponse> {
  const { data } = await api.post(API_ENDPOINTS.AUTH.OTP_VERIFY, { phone_number, otp_code });
  return data;
}

export async function resetPassword(phone_number: string, new_password: string): Promise<ApiResponse> {
  const { data } = await api.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, { phone_number, new_password });
  return data;
}

export interface RegisterCustomerPayload {
  first_name: string;
  last_name: string;
  username: string;
  street?: string;
  zone?: string;
  barangay?: string;
  city?: string;
  phone_number: string;
  password: string;
}

export async function registerCustomer(payload: RegisterCustomerPayload): Promise<ApiResponse> {
  const { data } = await api.post(API_ENDPOINTS.AUTH.REGISTER_CUSTOMER, payload);
  return data;
}

export const AuthService = {
  requestOtp,
  verifyOtp,
  resetPassword,
  registerCustomer,
};
