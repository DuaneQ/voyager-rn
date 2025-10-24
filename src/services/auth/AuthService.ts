import { AuthRepository } from '../../repositories/AuthRepository';
import { LoginRequest, RegisterRequest, ForgotPasswordRequest, ResendVerificationRequest, UserProfile, AuthTokens } from '../../types/auth';

export interface AuthService {
  login(req: LoginRequest): Promise<{ user: UserProfile; tokens?: AuthTokens }>;
  register(req: RegisterRequest): Promise<{ user: UserProfile }>;
  forgotPassword(req: ForgotPasswordRequest): Promise<void>;
  resendVerification(req: ResendVerificationRequest): Promise<void>;
  getCurrentUser(): Promise<UserProfile | null>;
}

export class DefaultAuthService implements AuthService {
  constructor(private repo: AuthRepository) {}

  async login(req: LoginRequest) {
    return this.repo.login(req);
  }

  async register(req: RegisterRequest) {
    return this.repo.register(req);
  }

  async forgotPassword(req: ForgotPasswordRequest) {
    return this.repo.forgotPassword(req);
  }

  async resendVerification(req: ResendVerificationRequest) {
    return this.repo.resendVerification(req);
  }

  async getCurrentUser() {
    return this.repo.getCurrentUser();
  }
}
