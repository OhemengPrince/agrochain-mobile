import { GoogleSignin } from '@react-native-google-signin/google-signin';

// The "Web" OAuth client from Google Cloud Console — required by
// GoogleSignin even on native platforms because the backend verifies the ID
// token's audience against this client id. Android/iOS-specific client ids
// (once created) get added here too once available.
const WEB_CLIENT_ID = '786947919564-djvun73vnscr8odt1goc5bq5qaus2m2m.apps.googleusercontent.com';

let configured = false;

function ensureConfigured(): void {
  if (configured) return;
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  configured = true;
}

export interface GoogleSignInResult {
  idToken: string;
  email: string;
  fullName: string | null;
  profilePhotoUrl: string | null;
}

// Returns null if the user cancelled the picker — not an error.
export async function signInWithGoogle(): Promise<GoogleSignInResult | null> {
  ensureConfigured();
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  if (response.type === 'cancelled') return null;

  const { idToken, user } = response.data;
  if (!idToken) {
    throw new Error('Google did not return an ID token — check webClientId configuration.');
  }
  return {
    idToken,
    email: user.email,
    fullName: user.name,
    profilePhotoUrl: user.photo,
  };
}
