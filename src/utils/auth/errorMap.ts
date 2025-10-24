// Map backend error codes from the PWA to friendly messages
const map: Record<string, string> = {
  INVALID_CREDENTIALS: 'Email or password is incorrect.',
  EMAIL_NOT_VERIFIED: 'Your email is not verified. Please verify or resend verification email.',
  USER_EXISTS: 'An account with this email already exists.',
  RATE_LIMITED: 'Too many attempts. Please wait and try again later.',
  NETWORK_ERROR: 'Network error. Check your connection and try again.',
};

export const mapAuthError = (code?: string, fallback?: string) => {
  if (!code) return fallback || 'An unexpected error occurred.';
  return map[code] || fallback || 'An unexpected error occurred.';
};
