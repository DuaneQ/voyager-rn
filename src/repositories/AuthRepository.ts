import { LoginRequest, RegisterRequest, ForgotPasswordRequest, ResendVerificationRequest, UserProfile, AuthTokens } from '../types/auth';

export interface AuthRepository {
  login(req: LoginRequest): Promise<{ user: UserProfile; tokens?: AuthTokens }>;
  register(req: RegisterRequest): Promise<{ user: UserProfile }>;
  forgotPassword(req: ForgotPasswordRequest): Promise<void>;
  resendVerification(req: ResendVerificationRequest): Promise<void>;
  getCurrentUser(): Promise<UserProfile | null>;
}
