/**
 * Cliente de la App Store Connect API.
 *
 * Firma el JWT con lo que trae Node y nada más: la API pide ES256, que es ECDSA
 * P-256 con la firma en formato crudo (r||s), y eso es lo que devuelve
 * `dsaEncoding: 'ieee-p1363'`. Un token por request y con vida corta, como pide
 * Apple.
 *
 * Configuración sólo por entorno:
 *   ASC_KEY_ID      Key ID de la clave
 *   ASC_ISSUER_ID   Issuer ID del equipo
 *   ASC_KEY_PATH    ruta al .p8 (si falta, se busca en las carpetas de siempre)
 *
 * Como comando:  node scripts/asc.mjs GET /v1/apps
 *                node scripts/asc.mjs POST /v1/bundleIds '{"data":{...}}'
 */
import { sign } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = 'https://api.appstoreconnect.apple.com';

function rutaDeLaClave() {
  if (process.env.ASC_KEY_PATH) return process.env.ASC_KEY_PATH;

  const id = process.env.ASC_KEY_ID;
  const candidatas = ['.private_keys', 'private_keys', '.appstoreconnect/private_keys'].map((d) =>
    path.join(os.homedir(), d, `AuthKey_${id}.p8`),
  );
  const encontrada = candidatas.find((c) => existsSync(c));
  if (!encontrada) {
    throw new Error(
      `No se encontró la clave AuthKey_${id}.p8. Poné su ruta en ASC_KEY_PATH o dejala en ~/.private_keys/`,
    );
  }
  return encontrada;
}

const base64url = (b) => Buffer.from(b).toString('base64url');

/** Vale 15 minutos: Apple rechaza tokens con vida más larga. */
export function token() {
  const keyId = process.env.ASC_KEY_ID;
  const issuer = process.env.ASC_ISSUER_ID;
  if (!keyId || !issuer) throw new Error('Faltan ASC_KEY_ID y ASC_ISSUER_ID.');

  const ahora = Math.floor(Date.now() / 1000);
  const encabezado = base64url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }));
  const cuerpo = base64url(
    JSON.stringify({ iss: issuer, iat: ahora, exp: ahora + 15 * 60, aud: 'appstoreconnect-v1' }),
  );

  const firma = sign('sha256', Buffer.from(`${encabezado}.${cuerpo}`), {
    key: readFileSync(rutaDeLaClave()),
    dsaEncoding: 'ieee-p1363',
  });
  return `${encabezado}.${cuerpo}.${firma.toString('base64url')}`;
}

export async function asc(metodo, ruta, cuerpo) {
  const r = await fetch(ruta.startsWith('http') ? ruta : BASE + ruta, {
    method: metodo,
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });

  const texto = await r.text();
  let datos = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = { crudo: texto };
  }
  return { estado: r.status, ok: r.ok, datos };
}

/** El primer error que devolvió Apple, para poder mostrarlo sin volcar todo. */
export function motivo(respuesta) {
  const e = respuesta?.datos?.errors?.[0];
  if (!e) return JSON.stringify(respuesta?.datos ?? '').slice(0, 300);
  return `${e.status} ${e.code}: ${e.detail ?? e.title}`;
}

if (process.argv[2]) {
  const [, , metodo, ruta, cuerpo] = process.argv;
  const r = await asc(metodo, ruta, cuerpo ? JSON.parse(cuerpo) : undefined);
  console.log(r.estado);
  console.log(JSON.stringify(r.datos, null, 2));
}
