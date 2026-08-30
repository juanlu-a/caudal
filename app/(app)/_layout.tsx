import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { color, palette } from '../../src/theme';

/**
 * Tabs nativas: en iOS es un UITabBarController real, asi que en iOS 26 la barra
 * viene con Liquid Glass del sistema y se minimiza sola al scrollear.
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

      {/*
        El alta es una tab mas y no un modal: un sheet de iOS tapa la barra
        entera, y desde la tab del medio eso hacia desaparecer la navegacion.
      */}
      <NativeTabs.Trigger name="agregar">
        <NativeTabs.Trigger.Icon sf="plus" />
        <NativeTabs.Trigger.Label>Movimiento</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="movimientos">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'list.bullet', selected: 'list.bullet.indent' }}
        />
        <NativeTabs.Trigger.Label>Historial</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
