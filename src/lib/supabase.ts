import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import aesjs from 'aes-js';
import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';
import { AppState } from 'react-native';

import type { Database } from '../types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_KEY. Copiá .env.example a .env y completá los valores del proyecto de Supabase.',
  );
}

/**
 * Almacenamiento cifrado para la sesion.
 *
 * SecureStore no acepta valores de mas de 2048 bytes y una sesion de Supabase los
 * pasa, asi que se guarda en SecureStore solo una clave AES-256 y en AsyncStorage
 * el valor cifrado con esa clave. Es el patron que recomienda Supabase para RN.
 */
class AlmacenSeguro {
  private async _cifrar(clave: string, valor: string): Promise<string> {
    const llave = crypto.getRandomValues(new Uint8Array(32));
    const cipher = new aesjs.ModeOfOperation.ctr(llave, new aesjs.Counter(1));
    const cifrado = cipher.encrypt(aesjs.utils.utf8.toBytes(valor));

    await SecureStore.setItemAsync(clave, aesjs.utils.hex.fromBytes(llave), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return aesjs.utils.hex.fromBytes(cifrado);
  }

  private async _descifrar(clave: string, valor: string): Promise<string | null> {
    const llaveHex = await SecureStore.getItemAsync(clave);
    if (!llaveHex) return null;

    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(llaveHex),
      new aesjs.Counter(1),
    );
    return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(valor)));
  }

  async getItem(clave: string): Promise<string | null> {
    const cifrado = await AsyncStorage.getItem(clave);
    if (!cifrado) return null;
    try {
      return await this._descifrar(clave, cifrado);
    } catch {
      // Si la llave se perdio, el valor cifrado ya no sirve: se descarta y se vuelve a pedir sesion.
      await this.removeItem(clave);
      return null;
    }
  }

  async setItem(clave: string, valor: string): Promise<void> {
    const cifrado = await this._cifrar(clave, valor);
    await AsyncStorage.setItem(clave, cifrado);
  }

  async removeItem(clave: string): Promise<void> {
    await AsyncStorage.removeItem(clave);
    await SecureStore.deleteItemAsync(clave);
  }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    storage: new AlmacenSeguro(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// El refresh automatico solo corre con la app en primer plano.
AppState.addEventListener('change', (estado) => {
  if (estado === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
