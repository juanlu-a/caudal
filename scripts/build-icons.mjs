/**
 * Genera los iconos y el splash a partir del isotipo del manual de marca.
 * No hay rasterizador de SVG en el sistema, asi que se hace con sharp.
 *
 * Uso: node scripts/build-icons.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ASSETS = path.join(ROOT, 'assets');

const FONDEO = '#071B2F';
const ESPUMA = '#F2F7FA';
const VERDE = '#33D69F';

/** Los dos trazos del isotipo, tal cual el manual: grilla 120, grosor 14, puntas redondas. */
function isotipo({ cauce = ESPUMA, corriente = VERDE, lado = 1024, escala = 0.56 } = {}) {
  const tamano = Math.round(lado * escala);
  const offset = Math.round((lado - tamano) / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 ${lado} ${lado}">
  <g transform="translate(${offset},${offset}) scale(${tamano / 120})">
    <path d="M91.1 38.2 A38 38 0 1 0 81.8 91.1" fill="none" stroke="${cauce}" stroke-width="14" stroke-linecap="round"/>
    <path d="M66 78 C78 68, 92 50, 108 26" fill="none" stroke="${corriente}" stroke-width="14" stroke-linecap="round"/>
  </g>
</svg>`;
}

async function png(svg, destino, lado, fondo) {
  let imagen = sharp(Buffer.from(svg));
  if (fondo) imagen = imagen.flatten({ background: fondo });
  await imagen.resize(lado, lado).png().toFile(path.join(ASSETS, destino));
  console.log(`  ${destino}  ${lado}×${lado}`);
}

await mkdir(ASSETS, { recursive: true });

// Icono de iOS: sin transparencia, fondo Fondeo.
await png(isotipo({ lado: 1024 }), 'icon.png', 1024, FONDEO);
// Android: primer plano transparente, el fondo lo pone app.config.
await png(isotipo({ lado: 1024, escala: 0.42 }), 'android-icon-foreground.png', 1024);
await png(
  isotipo({ lado: 1024, escala: 0.42, cauce: ESPUMA, corriente: ESPUMA }),
  'android-icon-monochrome.png',
  1024,
);
// Splash: el isotipo solo, transparente, sobre el fondo del config.
await png(isotipo({ lado: 512, escala: 0.8 }), 'splash-icon.png', 512);
await png(isotipo({ lado: 96, escala: 0.7 }), 'favicon.png', 96, FONDEO);

// El SVG queda versionado para poder reusarlo en piezas de marca.
await writeFile(path.join(ASSETS, 'isotipo.svg'), isotipo({ lado: 120, escala: 1 }));
console.log('  isotipo.svg');
