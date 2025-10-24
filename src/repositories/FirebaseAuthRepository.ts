import { AuthRepository } from './AuthRepository';
import { LoginRequest, RegisterRequest, ForgotPasswordRequest, ResendVerificationRequest, UserProfile, AuthTokens } from '../types/auth';
import { auth, db } from '../config/firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export class FirebaseAuthRepository implements AuthRepository {
  async login(req: LoginRequest) {
    const cred = await signInWithEmailAndPassword(auth, req.email, req.password);
    const uid = cred.user.uid;
    const userDoc = await getDoc(doc(db, 'users', uid));
    const user: UserProfile = userDoc.exists() ? ({ id: uid, ...(userDoc.data() as any) }) : { id: uid, email: cred.user.email || '', emailVerified: cred.user.emailVerified };
    // tokens management: Firebase handles ID tokens; we can expose the ID token as accessToken
    const idToken = await cred.user.getIdToken();
    return { user, tokens: { accessToken: idToken } };
  }

  async register(req: RegisterRequest) {
    const cred = await createUserWithEmailAndPassword(auth, req.email, req.password);
    // write basic profile in users collection to mirror PWA
    const profile: Partial<UserProfile> = { email: req.email, displayName: req.displayName, emailVerified: false };
    await setDoc(doc(db, 'users', cred.user.uid), profile);
    // send verification email
    await sendEmailVerification(cred.user);
    const user: UserProfile = { id: cred.user.uid, email: req.email, displayName: req.displayName, emailVerified: cred.user.emailVerified };
    return { user };
  }

  async forgotPassword(req: ForgotPasswordRequest) {
    await sendPasswordResetEmail(auth, req.email);
  }

  async resendVerification(req: ResendVerificationRequest) {
    // Mirror PWA behavior: send verification email to currently-signed in user
    // PWA's ResendEmail component calls sendEmailVerification(auth.currentUser) when currentUser exists
    const current = auth.currentUser;
    if (current) {
      await sendEmailVerification(current);
      return;
    }

    const e: any = new Error('User not signed in');
    e.code = 'NOT_SIGNED_IN';
    throw e;
  }

  async getCurrentUser() {
    const current = auth.currentUser;
    if (!current) return null;
    const uid = current.uid;
    const userDoc = await getDoc(doc(db, 'users', uid));
    const user: UserProfile = userDoc.exists() ? ({ id: uid, ...(userDoc.data() as any) }) : { id: uid, email: current.email || '', emailVerified: current.emailVerified };
    return user;
  }
}
