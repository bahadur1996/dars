import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

// SecureStore (Keychain / Keystore) on phones; localStorage on the web build, where SecureStore is unavailable.
export const secureStorage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key)
      } catch {
        return null
      }
    }
    return SecureStore.getItemAsync(key)
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value)
      } catch {
        /* ignore */
      }
      return
    }
    await SecureStore.setItemAsync(key, value)
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key)
      } catch {
        /* ignore */
      }
      return
    }
    await SecureStore.deleteItemAsync(key)
  },
}
