import axios from 'axios';

const TECHNICAL_MESSAGES = [
  /^network error$/i,
  /^request failed with status code \d+$/i,
  /^timeout of \d+ms exceeded$/i,
  /^econnaborted$/i,
  /^etimedout$/i,
];

const isMeaningful = (value: unknown): value is string => {
  if (typeof value !== 'string' || !value.trim()) return false;
  return !TECHNICAL_MESSAGES.some(pattern => pattern.test(value.trim()));
};

const backendMessage = (error: unknown): string | null => {
  if (!axios.isAxiosError(error)) return null;

  const data = error.response?.data;
  if (typeof data === 'string' && isMeaningful(data)) return data.trim();
  if (data && typeof data === 'object') {
    const body = data as Record<string, unknown>;
    const message = body.message || body.error;
    if (isMeaningful(message)) return message.trim();
  }
  return null;
};

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = error.message.toLowerCase();
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || message.includes('timeout')) {
      return 'Request timed out. Please check your connection and try again.';
    }

    if (!error.response) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }

    if (error.response.status >= 500) {
      return 'Server error. Please try again later.';
    }

    const responseMessage = backendMessage(error);
    if (responseMessage) return responseMessage;

    if (error.response.status === 401) {
      return 'Your session has expired. Please log in again.';
    }
    if (error.response.status === 403) {
      return 'You do not have permission to perform this action.';
    }
    if (error.response.status === 404) {
      return 'The requested data could not be found.';
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message === 'network error' || message.includes('network request failed')) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }
    if (message.includes('timeout') || message === 'etimedout') {
      return 'Request timed out. Please check your connection and try again.';
    }
    if (isMeaningful(error.message)) return error.message.trim();
  }

  return fallback;
}

export function isInvalidCredentialsError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const data = error.response?.data;
  return Boolean(
    data &&
      typeof data === 'object' &&
      (data as Record<string, unknown>).code === 'INVALID_CREDENTIALS',
  );
}
