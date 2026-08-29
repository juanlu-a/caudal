/**
 * Le asigna el build recién subido al grupo de TestFlight que corresponde y le
 * escribe el «qué probar».
 *
 * Apple tarda unos minutos en procesar el build, así que primero hay que
 * esperarlo: hasta que no está VALID no se puede asignar a nadie.
 *
 * Variables: ASC_KEY_ID, ASC_ISSUER_ID, GRUPO y, opcionalmente, RAMA.
 */
import { asc } from './asc.mjs';

const BUNDLE_ID = 'com.juanabreu.caudal';
const GRUPO = process.env.GRUPO ?? 'Interno';
const RAMA = process.env.RAMA ?? '';

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function fallar(mensaje, respuesta) {
  console.error(mensaje, respuesta ? JSON.stringify(respuesta).slice(0, 400) : '');
  process.exit(1);
}

const apps = await asc('GET', '/v1/apps?limit=200');
const app = apps.datos?.data?.find((a) => a.attributes.bundleId === BUNDLE_ID);
if (!app) fallar('No se encontró la app', apps.datos);

// El build recién subido tarda en aparecer y después en procesarse.
let build = null;
for (let intento = 1; intento <= 40; intento++) {
  const r = await asc('GET', `/v1/builds?filter[app]=${app.id}&limit=1&sort=-uploadedDate`);
  const ultimo = r.datos?.data?.[0];

  if (ultimo?.attributes.processingState === 'VALID') {
    build = ultimo;
    break;
  }
  console.log(
    `esperando a Apple (${intento}/40): ${ultimo?.attributes.processingState ?? 'todavía no aparece'}`,
  );
  await dormir(30_000);
}
if (!build) fallar('El build no llegó a estar listo en 20 minutos.');

console.log(`build ${build.attributes.version} listo`);

const grupos = await asc('GET', `/v1/apps/${app.id}/betaGroups?limit=50`);
const grupo = grupos.datos?.data?.find((g) => g.attributes.name === GRUPO);
if (!grupo) fallar(`No existe el grupo «${GRUPO}»`, grupos.datos);

const asignado = await asc('POST', `/v1/betaGroups/${grupo.id}/relationships/builds`, {
  data: [{ type: 'builds', id: build.id }],
});
if (asignado.estado >= 300) fallar('No se pudo asignar el build al grupo', asignado.datos);

const queProbar = RAMA && RAMA !== 'main' ? `Build de la rama ${RAMA}.` : 'Build de main.';
const texto = await asc('POST', '/v1/betaBuildLocalizations', {
  data: {
    type: 'betaBuildLocalizations',
    attributes: { locale: 'es-MX', whatsNew: queProbar },
    relationships: { build: { data: { type: 'builds', id: build.id } } },
  },
});
if (texto.estado >= 300 && texto.estado !== 409) {
  console.warn('No se pudo escribir el «qué probar»:', JSON.stringify(texto.datos).slice(0, 200));
}

console.log(`build ${build.attributes.version} repartido a «${GRUPO}»`);
