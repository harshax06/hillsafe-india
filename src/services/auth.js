// --- Auth Service -------------------------------------------------------------
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

WebBrowser.maybeCompleteAuthSession();

// -- Sign in with Google via Supabase -----------------------------------------
export async function signInWithGoogle() {
  try {
    const redirectUrl = AuthSession.makeRedirectUri({ useProxy: true });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options:  { redirectTo: redirectUrl, skipBrowserRedirect: true },
    });

    if (error) throw error;

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

    if (result.type === 'success') {
      const { url } = result;
      await supabase.auth.exchangeCodeForSession(url);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await saveUserLocally(session.user);
        return { user: session.user, error: null };
      }
    }
    return { user: null, error: 'Sign in cancelled' };
  } catch (e) {
    return { user: null, error: e.message };
  }
}

// -- Sign out ------------------------------------------------------------------
export async function signOut() {
  await supabase.auth.signOut();
  await AsyncStorage.multiRemove(['hs_user', 'hs_user_id']);
}

// -- Get current session -------------------------------------------------------
export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    await saveUserLocally(session.user);
    return session.user;
  }
  // Fallback to locally saved user
  const saved = await AsyncStorage.getItem('hs_user');
  return saved ? JSON.parse(saved) : null;
}

// -- Save user locally ---------------------------------------------------------
async function saveUserLocally(user) {
  await AsyncStorage.setItem('hs_user', JSON.stringify(user));
  await AsyncStorage.setItem('hs_user_id', user.id);
  await AsyncStorage.setItem('hs_username', user.user_metadata?.full_name || 'HillSafe User');
}
