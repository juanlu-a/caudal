/**
 * Deja un build subido listo para sus testers.
 *
 * Uso:
 *   node scripts/testflight-distribute.mjs --build-number 202608301230 \
 *        --group Equipo --internal --notes "de qué se trata"
 *
 * Hace, en orden: espera a que Apple lo procese, declara la exención de
 * criptografía si hace falta, escribe el «qué probar», se asegura de que el
 * grupo exista, le deja ese build como único, y si el grupo es externo lo manda
 * a Beta App Review.
 */
import { asc, motivo } from './asc.mjs';

const BUNDLE_ID = process.env.BUNDLE_ID ?? 'com.juanabreu.caudal';
const LOCALE = 'es-MX';

function opciones(argv) {
  const o = { internal: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--internal') o.internal = true;
    else if (a === '--build-number') o.build = argv[++i];
    else if (a === '--group') o.group = argv[++i];
    else if (a === '--notes') o.notes = argv[++i];
  }
  if (!o.build) fallar('Falta --build-number');
  if (!o.group) fallar('Falta --group');
  return o;
}

function fallar(mensaje) {
  console.error(`✗ ${mensaje}`);
  process.exit(1);
}

const aviso = (mensaje) => console.log(`  aviso: ${mensaje}`);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const { build: numero, group: nombreGrupo, internal: esInterno, notes } = opciones(
  process.argv.slice(2),
);

// ------------------------------------------------------------------ la app

const apps = await asc('GET', `/v1/apps?filter[bundleId]=${encodeURIComponent(BUNDLE_ID)}`);
const app = apps.datos?.data?.[0];
if (!app) fallar(`No se encontró la app ${BUNDLE_ID}: ${motivo(apps)}`);

// --------------------------------------------------- esperar a que procese

// Apple tarda entre cinco y veinte minutos: primero en registrarlo y después en
// procesarlo. Se espera por el número que se subió y no por «el último», que
// mientras tanto sigue siendo el anterior.
let build = null;
for (let intento = 1; intento <= 60; intento++) {
  const r = await asc(
    'GET',
    `/v1/builds?filter[app]=${app.id}&filter[version]=${encodeURIComponent(numero)}&limit=1`,
  );
  const nuestro = r.datos?.data?.[0];
  const estado = nuestro?.attributes.processingState;

  if (estado === 'VALID') {
    build = nuestro;
    break;
  }
  if (estado === 'INVALID') fallar(`Apple rechazó el build ${numero}. Suele avisar por mail.`);

  console.log(`  esperando el build ${numero} (${intento}/60): ${estado ?? 'todavía no aparece'}`);
  await dormir(30_000);
}
if (!build) fallar(`El build ${numero} no estuvo listo en 30 minutos.`);
console.log(`✓ build ${numero} procesado`);

// ------------------------------------------------------------ criptografía

if (build.attributes.usesNonExemptEncryption === null) {
  const r = await asc('PATCH', `/v1/builds/${build.id}`, {
    data: { type: 'builds', id: build.id, attributes: { usesNonExemptEncryption: false } },
  });
  if (r.ok) console.log('✓ declarada la exención de criptografía');
  else aviso(`no se pudo declarar la exención: ${motivo(r)}`);
}

// -------------------------------------------------------------- qué probar

const queProbar = notes?.trim() || `Build ${numero}.`;
const locs = await asc('GET', `/v1/builds/${build.id}/betaBuildLocalizations`);
const existente = locs.datos?.data?.find((l) => l.attributes.locale === LOCALE);

const guardado = existente
  ? await asc('PATCH', `/v1/betaBuildLocalizations/${existente.id}`, {
      data: {
        type: 'betaBuildLocalizations',
        id: existente.id,
        attributes: { whatsNew: queProbar },
      },
    })
  : await asc('POST', '/v1/betaBuildLocalizations', {
      data: {
        type: 'betaBuildLocalizations',
        attributes: { locale: LOCALE, whatsNew: queProbar },
        relationships: { build: { data: { type: 'builds', id: build.id } } },
      },
    });
if (!guardado.ok) aviso(`no se pudo escribir el «qué probar»: ${motivo(guardado)}`);

// ------------------------------------------------------------------ grupo

const grupos = await asc('GET', `/v1/betaGroups?filter[app]=${app.id}&limit=200`);
let grupo = grupos.datos?.data?.find((g) => g.attributes.name === nombreGrupo);

if (!grupo) {
  const atributos = esInterno
    ? // false a propósito: con true los testers ven todos los builds, y esto no
      // se puede cambiar después — habría que rehacer el grupo.
      { name: nombreGrupo, isInternalGroup: true, hasAccessToAllBuilds: false }
    : {
        name: nombreGrupo,
        publicLinkEnabled: true,
        publicLinkLimitEnabled: true,
        publicLinkLimit: 200,
      };

  const creado = await asc('POST', '/v1/betaGroups', {
    data: {
      type: 'betaGroups',
      attributes: atributos,
      relationships: { app: { data: { type: 'apps', id: app.id } } },
    },
  });
  if (!creado.ok) fallar(`no se pudo crear el grupo «${nombreGrupo}»: ${motivo(creado)}`);
  grupo = creado.datos.data;
  console.log(`✓ grupo «${nombreGrupo}» creado`);
}

const asignado = await asc('POST', `/v1/betaGroups/${grupo.id}/relationships/builds`, {
  data: [{ type: 'builds', id: build.id }],
});
if (!asignado.ok) fallar(`no se pudo asignar el build al grupo: ${motivo(asignado)}`);
console.log(`✓ build ${numero} asignado a «${nombreGrupo}»`);

// ------------------------------------------------- dejar uno solo a la vista

const delGrupo = await asc(
  'GET',
  `/v1/betaGroups/${grupo.id}/builds?limit=200&include=betaAppReviewSubmission`,
);
const revisiones = Object.fromEntries(
  (delGrupo.datos?.included ?? [])
    .filter((x) => x.type === 'betaAppReviewSubmissions')
    .map((x) => [x.id, x.attributes.betaReviewState]),
);

const SE_CONSERVAN = ['APPROVED', 'WAITING_FOR_REVIEW', 'IN_REVIEW'];

/**
 * En qué estado de revisión está un build del grupo. Sale del include, y si por
 * lo que sea no vino, se pregunta: quitar del grupo externo el único build que
 * la gente puede instalar es peor que una llamada de más.
 */
async function estadoDeRevision(b) {
  const delInclude = revisiones[b.relationships?.betaAppReviewSubmission?.data?.id];
  if (delInclude) return delInclude;

  const r = await asc('GET', `/v1/builds/${b.id}/betaAppReviewSubmission`);
  if (!r.ok) {
    aviso(`no se pudo ver la revisión del build ${b.attributes.version}: se deja en el grupo`);
    return 'APPROVED';
  }
  return r.datos?.data?.attributes?.betaReviewState ?? null;
}

const otros = (delGrupo.datos?.data ?? []).filter((b) => b.id !== build.id);
const aQuitar = [];
for (const b of otros) {
  // En el externo se conservan el último aprobado —para que el link no quede
  // vacío mientras el nuevo espera— y los que están en revisión.
  if (!esInterno && SE_CONSERVAN.includes(await estadoDeRevision(b))) continue;
  aQuitar.push(b);
}

if (aQuitar.length) {
  const r = await asc('DELETE', `/v1/betaGroups/${grupo.id}/relationships/builds`, {
    data: aQuitar.map((b) => ({ type: 'builds', id: b.id })),
  });
  if (r.ok) console.log(`✓ quitados ${aQuitar.length} builds viejos del grupo`);
  else aviso(`no se pudieron quitar los builds viejos: ${motivo(r)}`);
}

// --------------------------------------------------------------- revisión

if (!esInterno) {
  const enviado = await asc('POST', '/v1/betaAppReviewSubmissions', {
    data: {
      type: 'betaAppReviewSubmissions',
      relationships: { build: { data: { type: 'builds', id: build.id } } },
    },
  });

  const codigo = enviado.datos?.errors?.[0]?.code ?? '';
  if (enviado.ok) console.log('✓ enviado a Beta App Review');
  else if (enviado.estado === 409) aviso('ya estaba enviado a revisión');
  else if (codigo.includes('ANOTHER_BUILD_IN_REVIEW'))
    // Apple admite un build por versión en revisión a la vez: el que ya está
    // sirve igual, porque aprueba la versión entera.
    aviso('ya hay otro build de esta versión en revisión');
  else fallar(`no se pudo enviar a revisión: ${motivo(enviado)}`);
}

console.log(`\nListo: build ${numero} en «${nombreGrupo}».`);
