/**
 * Le asigna el build recién subido al grupo de TestFlight que corresponde y le
 * escribe el «qué probar».
 *
 * Apple tarda unos minutos en procesar el build, así que primero hay que
 * esperarlo: hasta que no está VALID no se puede asignar a nadie.
 *
 * Variables: ASC_KEY_ID, ASC_ISSUER_ID, GRUPO, BUILD y, opcionalmente, RAMA.
 *
 * BUILD es el número que se acaba de subir. Hay que esperar por ese y no por
 * «el último»: Apple tarda unos minutos en registrarlo, y mientras tanto el
 * último sigue siendo el anterior — así se repartía un build viejo cantando
 * éxito.
 */
import { asc } from './asc.mjs';

const BUNDLE_ID = 'com.juanabreu.caudal';
const GRUPO = process.env.GRUPO ?? 'Interno';
const ESPERADO = process.env.BUILD;
const RAMA = process.env.RAMA ?? '';

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function fallar(mensaje, respuesta) {
  console.error(mensaje, respuesta ? JSON.stringify(respuesta).slice(0, 400) : '');
  process.exit(1);
}

const apps = await asc('GET', '/v1/apps?limit=200');
const app = apps.datos?.data?.find((a) => a.attributes.bundleId === BUNDLE_ID);
if (!app) fallar('No se encontró la app', apps.datos);

if (!ESPERADO) fallar('Falta BUILD: sin él no se sabe cuál se acaba de subir.');

// Primero aparecer, después procesarse. Las dos cosas tardan.
let build = null;
for (let intento = 1; intento <= 60; intento++) {
  const r = await asc(
    'GET',
    `/v1/builds?filter[app]=${app.id}&filter[version]=${ESPERADO}&limit=1`,
  );
  const nuestro = r.datos?.data?.[0];

  if (nuestro?.attributes.processingState === 'VALID') {
    build = nuestro;
    break;
  }
  if (nuestro?.attributes.processingState === 'INVALID') {
    fallar(`Apple rechazó el build ${ESPERADO}. Suele avisar el motivo por mail.`);
  }
  console.log(
    `esperando el build ${ESPERADO} (${intento}/60): ${nuestro?.attributes.processingState ?? 'todavía no aparece'}`,
  );
  await dormir(30_000);
}
if (!build) fallar(`El build ${ESPERADO} no estuvo listo en 30 minutos.`);

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
