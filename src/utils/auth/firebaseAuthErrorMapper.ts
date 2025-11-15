/**
 * Map Firebase Auth errors (REST API messages and Web SDK codes) to
 * friendly UI messages. Returns an object with `code` and `message`.
 *
 * Usage:
 *   const friendly = mapAuthError(error);
 *   showAlert('error', friendly.message);
 */

export interface FriendlyAuthError {
  code?: string;
  message: string;
}

const restCodeMap: Record<string, string> = {
  // Sign-in / sign-up errors (REST API messages)
  EMAIL_NOT_FOUND: 'No account found for that email address.',
  INVALID_PASSWORD: 'Wrong password. Please try again.',
  USER_DISABLED: 'This account has been disabled.',
  EMAIL_EXISTS: 'An account already exists with that email address.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  WEAK_PASSWORD: 'Password should be at least 6 characters.',
  TOKEN_EXPIRED: 'Session has expired. Please sign in again.',
  INVALID_ID_TOKEN: 'Invalid authentication token. Please sign in again.',
  // OOB (sendOobCode) responses
  EXPIRED_OOB_CODE: 'This verification/reset link has expired.',
  INVALID_OOB_CODE: 'This verification/reset link is invalid.',
};

const webCodeMap: Record<string, string> = {
  // Web SDK style codes
  'auth/email-already-in-use': 'An account already exists for that email. Please sign in instead.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/user-not-found': 'No account found for that email address.',
  'auth/wrong-password': 'Wrong password. Please try again.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/popup-closed-by-user': 'Sign-in popup closed before completion.',
  'auth/cancelled-popup-request': 'Popup request cancelled. Please try again.',
};

export function mapAuthError(err: any): FriendlyAuthError {
  // Normalize input
  if (!err) return { message: 'An unknown error occurred.' };

  // If it's a Firebase Web SDK error with .code
  if (typeof err.code === 'string') {
    const mapped = webCodeMap[err.code];
    if (mapped) return { code: err.code, message: mapped };
    // Fall back to err.message
    return { code: err.code, message: err.message || 'Authentication error.' };
  }

  // If it's an Error with message text (REST API often returns codes like 'EMAIL_NOT_FOUND')
  if (typeof err.message === 'string') {
    const msg = err.message;

    // Email not verified common human message
    if (msg.toLowerCase().includes('email not verified')) {
      return { message: 'Your email has not been verified. Please check your inbox or spam folder.' };
    }

    // Try to match REST uppercase codes
    const upper = msg.toUpperCase().trim();
    if (restCodeMap[upper]) {
      return { code: upper, message: restCodeMap[upper] };
    }

    // Some REST messages include the code within JSON-like string, try to extract
    const match = msg.match(/[A-Z_]{3,}/);
    if (match && restCodeMap[match[0]]) {
      return { code: match[0], message: restCodeMap[match[0]] };
    }

    // Default to returning the original message (safest fallback)
    return { message: msg };
  }

  // If it is a string directly
  if (typeof err === 'string') {
    const upper = err.toUpperCase().trim();
    if (restCodeMap[upper]) return { code: upper, message: restCodeMap[upper] };
    return { message: err };
  }

  // Unknown shape
  return { message: 'An unknown authentication error occurred.' };
}

export default mapAuthError;
