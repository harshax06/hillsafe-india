import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle() {
  return { user: null, error: 'Google Sign-In available in next update' };
}

export async function signOut() {
  await supabase.auth.signOut();
  await AsyncStorage.multiRemove(['hs_user', 'hs_user_id']);
}

export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    await AsyncStorage.setItem('hs_user', JSON.stringify(session.user));
    await AsyncStorage.setItem('hs_user_id', session.user.id);
    return session.user;
  }
  const saved = await AsyncStorage.getItem('hs_user');
  return saved ? JSON.parse(saved) : null;
}
