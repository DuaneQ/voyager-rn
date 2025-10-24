// Domain types for Auth
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  emailVerified: boolean;
  // Add other fields from PWA as needed
  [k: string]: any;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error';

export interface AuthState {
  user: UserProfile | null;
  tokens: AuthTokens | null;
  status: AuthStatus;
  error?: string | null;
}
