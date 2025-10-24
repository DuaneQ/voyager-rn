import { Platform } from 'react-native';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';

/**
 * Cross-platform Google Sign-In helper.
 * - On web uses signInWithPopup
 * - On native uses @react-native-google-signin/google-signin to obtain idToken and signs in with credential
 */
export default async function signInWithGoogle(auth: any): Promise<any> {
  if (Platform.OS === 'web') {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  }

  // Mobile path
  // dynamic require so this module can be imported even when the native package isn't installed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GoogleSignin } = require('@react-native-google-signin/google-signin');
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const userInfo = await GoogleSignin.signIn();
  const idToken = userInfo?.idToken;
  if (!idToken) throw new Error('No idToken from Google Signin');
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential as any);
}
