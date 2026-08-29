/**
 * Cliente mínimo de la App Store Connect API.
 *
 * Firma el JWT con la clave .p8 usando solo lo que trae Node, sin dependencias:
 * la API pide ES256, que es ECDSA P-256 con la firma en formato crudo (r||s), y
 * eso es exactamente lo que da `dsaEncoding: 'ieee-p1363'`.
 *
 * Uso:  node scripts/asc.mjs GET /v1/bundleIds
 *       node scripts/asc.mjs POST /v1/bundleIds '{"data":{...}}'
 *
 * Necesita ASC_KEY_ID y ASC_ISSUER_ID en el entorno, y la clave en
 * ~/.appstoreconnect/private_keys/AuthKey_<KEYID>.p8
 */
import { createSign, sign as firmar } from 'node:crypto';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const KEY_ID = process.env.ASC_KEY_ID;
const ISSUER = process.env.ASC_ISSUER_ID;
if (!KEY_ID || !ISSUER) {
  console.error('Faltan ASC_KEY_ID y ASC_ISSUER_ID.');
  process.exit(1);
}

const base64url = (b) => Buffer.from(b).toString('base64url');

export function token() {
  const clave = readFileSync(
    path.join(os.homedir(), '.appstoreconnect', 'private_keys', `AuthKey_${KEY_ID}.p8`),
  );
  const ahora = Math.floor(Date.now() / 1000);
  const encabezado = base64url(JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' }));
  const cuerpo = base64url(
    JSON.stringify({ iss: ISSUER, iat: ahora, exp: ahora + 1200, aud: 'appstoreconnect-v1' }),
  );
  const firma = firmar('sha256', Buffer.from(`${encabezado}.${cuerpo}`), {
    key: clave,
    dsaEncoding: 'ieee-p1363',
  });
  return `${encabezado}.${cuerpo}.${firma.toString('base64url')}`;
}

export async function asc(metodo, ruta, cuerpo) {
  const r = await fetch(`https://api.appstoreconnect.apple.com${ruta}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = await r.text();
  return { estado: r.status, datos: texto ? JSON.parse(texto) : null };
}

if (process.argv[2]) {
  const [, , metodo, ruta, cuerpo] = process.argv;
  const r = await asc(metodo, ruta, cuerpo ? JSON.parse(cuerpo) : undefined);
  console.log(r.estado);
  console.log(JSON.stringify(r.datos, null, 2));
}
