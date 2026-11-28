import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform, TurboModuleRegistry } from 'react-native';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export interface GoogleAuthResult {
  ok: boolean;
  cancelled?: boolean;
  session?: Session | null;
  error?: string;
}

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');

let googleConfigured = false;

function getGoogleClientIds() {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? '';
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ?? '';
  return {
    webClientId: webClientId.includes('your-web-client-id') ? '' : webClientId,
    iosClientId: iosClientId.includes('your-ios-client-id') ? '' : iosClientId,
  };
}

function isNativeGoogleSigninAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  try {
    // Non-enforcing check prevents TurboModuleRegistry.getEnforcing RedBox errors in Expo Go.
    return TurboModuleRegistry.get('RNGoogleSignin') != null;
  } catch {
    return false;
  }
}

function loadNativeGoogleSignin(): GoogleSigninModule | null {
  if (!isNativeGoogleSigninAvailable()) return null;
  try {
    // Dynamically required only when the native module is present in the binary.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-google-signin/google-signin') as GoogleSigninModule;
  } catch {
    return null;
  }
}

export function configureGoogleSignIn(): boolean {
  if (googleConfigured || Platform.OS === 'web') return googleConfigured;

  const { webClientId, iosClientId } = getGoogleClientIds();
  if (!webClientId) return false;

  const mod = loadNativeGoogleSignin();
  if (!mod) return false;

  try {
    mod.GoogleSignin.configure({
      webClientId,
      ...(iosClientId ? { iosClientId } : {}),
    });
    googleConfigured = true;
    return true;
  } catch {
    return false;
  }
}

async function signInWithGoogleBrowserOAuth(): Promise<GoogleAuthResult> {
  const redirectTo = Linking.createURL('/auth/callback');

  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, session: null };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data?.url) {
    return { ok: false, error: error?.message ?? 'Could not start Google OAuth flow.' };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { ok: false, cancelled: true };
  }

  if (result.type === 'success' && result.url) {
    const parsed = Linking.parse(result.url);
    const code = parsed.queryParams?.code;
    if (typeof code === 'string') {
      const { data: sessionData, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        return { ok: false, error: exchangeError.message };
      }
      return { ok: true, session: sessionData.session };
    }

    const oauthError = parsed.queryParams?.error_description || parsed.queryParams?.error;
    if (typeof oauthError === 'string') {
      return { ok: false, error: oauthError };
    }
  }

  return { ok: false, error: 'Google Sign-In did not complete. Check Supabase Redirect URLs.' };
}

export async function signInWithGoogleNative(): Promise<GoogleAuthResult> {
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      error:
        'Supabase is not configured. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.',
    };
  }

  // Use browser OAuth on Web and when running inside Expo Go (where RNGoogleSignin is not linked).
  if (Platform.OS === 'web' || !isNativeGoogleSigninAvailable()) {
    return signInWithGoogleBrowserOAuth();
  }

  const { webClientId } = getGoogleClientIds();
  if (!webClientId) {
    return {
      ok: false,
      error:
        'Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env. Add your Google Cloud Web OAuth Client ID first.',
    };
  }

  const mod = loadNativeGoogleSignin();
  if (!mod) {
    return signInWithGoogleBrowserOAuth();
  }

  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = mod;

  try {
    configureGoogleSignIn();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      return { ok: false, cancelled: true };
    }

    const idToken = response.data.idToken;
    if (!idToken) {
      return {
        ok: false,
        error:
          'Google Sign-In did not return an ID token. Verify EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is a Web OAuth Client ID.',
      };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, session: data.session };
  } catch (error) {
    if (isErrorWithCode(error)) {
      switch (error.code) {
        case statusCodes.SIGN_IN_CANCELLED:
          return { ok: false, cancelled: true };
        case statusCodes.IN_PROGRESS:
          return { ok: false, error: 'Google Sign-In is already in progress.' };
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          return {
            ok: false,
            error: 'Google Play Services is unavailable or outdated on this device.',
          };
        default:
          return {
            ok: false,
            error: error.message || `Google Sign-In failed (${error.code}).`,
          };
      }
    }

    const message =
      error instanceof Error ? error.message : 'Unexpected error during Google Sign-In.';
    return { ok: false, error: message };
  }
}

export async function signOutFromGoogle(): Promise<void> {
  if (!isNativeGoogleSigninAvailable()) return;
  const mod = loadNativeGoogleSignin();
  if (!mod) return;
  try {
    await mod.GoogleSignin.signOut();
  } catch {
    // Ignore when the user signed in via email/password or browser OAuth.
  }
}
