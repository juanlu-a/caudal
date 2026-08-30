import { useNavigation, useRouter } from 'expo-router';
import { useEffect } from 'react';

/**
 * Placeholder de la tab del medio. El trigger esta `disabled`, asi que el tap
 * nunca la selecciona ni muestra esta pantalla: solo llega como `tabPress`
 * y abre el modal de alta sobre la tab actual.
 */
export default function Agregar() {
  const navigation = useNavigation();
  const router = useRouter();

  useEffect(() => {
    return navigation.addListener('tabPress' as never, () => {
      router.push('/nuevo');
    });
  }, [navigation, router]);

  return null;
}
