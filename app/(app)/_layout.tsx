import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { color, palette } from '../../src/theme';

/**
 * Tabs nativas: en iOS es un UITabBarController real, asi que en iOS 26 la barra
 * viene con Liquid Glass del sistema y se minimiza sola al scrollear.
 * No funciona en Expo Go — hay que correr el dev build.
 */
export default function AppLayout() {
  return (
    <NativeTabs
      tintColor={color.acento}
      backgroundColor={palette.fondeo}
      minimizeBehavior="onScrollDown"
      iconColor={{ default: color.textoTerciario, selected: color.acento }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'drop', selected: 'drop.fill' }} />
        <NativeTabs.Trigger.Label>Mes</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="movimientos">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'list.bullet', selected: 'list.bullet.indent' }}
        />
        <NativeTabs.Trigger.Label>Movimientos</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="cuenta">
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} />
        <NativeTabs.Trigger.Label>Cuenta</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
