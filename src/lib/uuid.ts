import 'react-native-get-random-values';

const HEX: string[] = [];
for (let i = 0; i < 256; i++) HEX.push((i + 0x100).toString(16).slice(1));

/**
 * UUID v4. Hermes no trae `crypto.randomUUID`, pero
 * `react-native-get-random-values` sí instala `crypto.getRandomValues`.
 */
export function uuid(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; // versión 4
  b[8] = (b[8] & 0x3f) | 0x80; // variante RFC 4122

  return (
    HEX[b[0]] + HEX[b[1]] + HEX[b[2]] + HEX[b[3]] +
    '-' + HEX[b[4]] + HEX[b[5]] +
    '-' + HEX[b[6]] + HEX[b[7]] +
    '-' + HEX[b[8]] + HEX[b[9]] +
    '-' + HEX[b[10]] + HEX[b[11]] + HEX[b[12]] + HEX[b[13]] + HEX[b[14]] + HEX[b[15]]
  );
}
