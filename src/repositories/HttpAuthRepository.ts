import { AuthRepository } from './AuthRepository';
import { LoginRequest, RegisterRequest, ForgotPasswordRequest, ResendVerificationRequest, UserProfile, AuthTokens } from '../types/auth';

export interface HttpAuthRepositoryOptions {
  baseUrl: string;
}

export class HttpAuthRepository implements AuthRepository {
  constructor(private opts: HttpAuthRepositoryOptions) {}

  private async fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.opts.baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const e: any = new Error(err.message || 'Network error');
      e.code = err.code;
      throw e;
    }

    return res.json();
  }

  async login(req: LoginRequest) {
    return this.fetchJson<{ user: UserProfile; tokens?: AuthTokens }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async register(req: RegisterRequest) {
    return this.fetchJson<{ user: UserProfile }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async forgotPassword(req: ForgotPasswordRequest) {
    await this.fetchJson('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async resendVerification(req: ResendVerificationRequest) {
    await this.fetchJson('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async getCurrentUser() {
    return this.fetchJson<UserProfile | null>('/auth/me');
  }
}
